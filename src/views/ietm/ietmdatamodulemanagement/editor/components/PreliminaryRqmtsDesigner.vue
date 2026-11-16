<template>
  <a-spin :spinning="loading">
  <div class="preliminary-rqmts-designer">

    <!-- 顶部标题栏 -->
    <div class="designer-header">
      <span class="header-title">准备工作</span>
      <a-button v-if="showSaveBtn" type="primary" @click="handleSave"
        :loading="saving" :disabled="readonly">
        <a-icon type="save"/>保存
      </a-button>
    </div>

    <!-- 手风琴面板 -->
    <a-collapse v-model="activePanels" class="designer-collapse" :bordered="false">

      <!-- ═══ 面板1：产品数据 ═══ -->
      <a-collapse-panel key="1">
        <template slot="header">产品数据</template>
        <a-tabs v-model="productActiveTab">

          <!-- Tab1：任务 -->
          <a-tab-pane key="tasks" tab="任务">
            <div class="toolbar">
              <a-button size="small" @click="addTask" :disabled="readonly"><a-icon type="plus"/>增加</a-button>
              <a-button size="small" @click="deleteTask" :disabled="readonly || selectedTaskIndex === null"><a-icon type="delete"/>删除</a-button>
              <a-button size="small" @click="moveTaskUp" :disabled="readonly || selectedTaskIndex === null || selectedTaskIndex === 0"><a-icon type="arrow-up"/>上移</a-button>
              <a-button size="small" @click="moveTaskDown" :disabled="readonly || selectedTaskIndex === null || selectedTaskIndex === productionData.tasks.length - 1"><a-icon type="arrow-down"/>下移</a-button>
            </div>
            <a-table :columns="taskColumns" :data-source="productionData.tasks"
              :row-selection="taskRowSelection" :pagination="false" size="small" bordered
              :row-key="(r, i) => i">
              <template slot="taskWorkarea"  slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.tasks[index].workarea"  size="small"/><span v-else>{{ text }}</span></template>
              <template slot="taskStartup"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.tasks[index].startup"   size="small"/><span v-else>{{ text }}</span></template>
              <template slot="taskProcedure" slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.tasks[index].procedure" size="small"/><span v-else>{{ text }}</span></template>
              <template slot="taskCloseup"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.tasks[index].closeup"   size="small"/><span v-else>{{ text }}</span></template>
              <template slot="taskUom"       slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.tasks[index].uom"       size="small"/><span v-else>{{ text }}</span></template>
              <template slot="taskId"        slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.tasks[index].id"        size="small"/><span v-else>{{ text }}</span></template>
            </a-table>
          </a-tab-pane>

          <!-- Tab2：区域 -->
          <a-tab-pane key="zones" tab="区域">
            <div class="toolbar">
              <a-button size="small" @click="addZone"       :disabled="readonly"><a-icon type="plus"/>增加</a-button>
              <a-button size="small" @click="deleteZone"    :disabled="readonly || selectedZoneIndex === null"><a-icon type="delete"/>删除</a-button>
              <a-button size="small" @click="moveZoneUp"    :disabled="readonly || selectedZoneIndex === null || selectedZoneIndex === 0"><a-icon type="arrow-up"/>上移</a-button>
              <a-button size="small" @click="moveZoneDown"  :disabled="readonly || selectedZoneIndex === null || selectedZoneIndex === productionData.zones.length - 1"><a-icon type="arrow-down"/>下移</a-button>
              <a-button size="small" @click="showZoneOrAccessBatchDialog('zones')" :disabled="readonly"><a-icon type="bars"/>批量生成</a-button>
            </div>
            <a-table :columns="zoneColumns" :data-source="productionData.zones"
              :row-selection="zoneRowSelection" :pagination="false" size="small" bordered
              :row-key="(r, i) => i">
              <template slot="zoneId"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.zones[index].id"   size="small"/><span v-else>{{ text }}</span></template>
              <template slot="zoneNo"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.zones[index].no"   size="small"/><span v-else>{{ text }}</span></template>
              <template slot="zoneName" slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.zones[index].name" size="small"/><span v-else>{{ text }}</span></template>
              <template slot="zoneDmRef" slot-scope="text, record, index">
                <div class="ref-cell">
                  <a-input :value="record.dmref" size="small" :disabled="true" placeholder="点击选择DM引用" style="flex:1"/>
                  <a-button size="small" icon="select" :disabled="readonly" @click="openZoneOrAccessDmRef(index, 'zones')"/>
                  <a-button v-if="record.dmref" size="small" icon="close" :disabled="readonly" @click="clearZoneOrAccessRef(index, 'dm', 'zones')"/>
                </div>
              </template>
              <template slot="zonePmRef" slot-scope="text, record, index">
                <div class="ref-cell">
                  <a-input :value="record.pmref" size="small" :disabled="true" placeholder="点击选择PM引用" style="flex:1"/>
                  <a-button size="small" icon="select" :disabled="readonly" @click="openZoneOrAccessPmRef(index, 'zones')"/>
                  <a-button v-if="record.pmref" size="small" icon="close" :disabled="readonly" @click="clearZoneOrAccessRef(index, 'pm', 'zones')"/>
                </div>
              </template>
            </a-table>
          </a-tab-pane>

          <!-- Tab3：口盖 -->
          <a-tab-pane key="accesses" tab="口盖">
            <div class="toolbar">
              <a-button size="small" @click="addAccess"      :disabled="readonly"><a-icon type="plus"/>增加</a-button>
              <a-button size="small" @click="deleteAccess"   :disabled="readonly || selectedAccessIndex === null"><a-icon type="delete"/>删除</a-button>
              <a-button size="small" @click="moveAccessUp"   :disabled="readonly || selectedAccessIndex === null || selectedAccessIndex === 0"><a-icon type="arrow-up"/>上移</a-button>
              <a-button size="small" @click="moveAccessDown" :disabled="readonly || selectedAccessIndex === null || selectedAccessIndex === productionData.accesses.length - 1"><a-icon type="arrow-down"/>下移</a-button>
              <a-button size="small" @click="showZoneOrAccessBatchDialog('accesses')" :disabled="readonly"><a-icon type="bars"/>批量生成</a-button>
            </div>
            <a-table :columns="accessColumns" :data-source="productionData.accesses"
              :row-selection="accessRowSelection" :pagination="false" size="small" bordered
              :row-key="(r, i) => i">
              <template slot="accessId"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.accesses[index].id"   size="small"/><span v-else>{{ text }}</span></template>
              <template slot="accessNo"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.accesses[index].no"   size="small"/><span v-else>{{ text }}</span></template>
              <template slot="accessName" slot-scope="text, record, index"><a-input v-if="!readonly" v-model="productionData.accesses[index].name" size="small"/><span v-else>{{ text }}</span></template>
              <template slot="accessDmRef" slot-scope="text, record, index">
                <div class="ref-cell">
                  <a-input :value="record.dmref" size="small" :disabled="true" placeholder="点击选择DM引用" style="flex:1"/>
                  <a-button size="small" icon="select" :disabled="readonly" @click="openZoneOrAccessDmRef(index, 'accesses')"/>
                  <a-button v-if="record.dmref" size="small" icon="close" :disabled="readonly" @click="clearZoneOrAccessRef(index, 'dm', 'accesses')"/>
                </div>
              </template>
              <template slot="accessPmRef" slot-scope="text, record, index">
                <div class="ref-cell">
                  <a-input :value="record.pmref" size="small" :disabled="true" placeholder="点击选择PM引用" style="flex:1"/>
                  <a-button size="small" icon="select" :disabled="readonly" @click="openZoneOrAccessPmRef(index, 'accesses')"/>
                  <a-button v-if="record.pmref" size="small" icon="close" :disabled="readonly" @click="clearZoneOrAccessRef(index, 'pm', 'accesses')"/>
                </div>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </a-collapse-panel>

      <!-- ═══ 面板2：必要条件 ═══ -->
      <a-collapse-panel key="2">
        <template slot="header">
          <span style="color:red;margin-right:2px">*</span><span>必要条件</span>
          <span v-if="reqCondCount > 0" style="color:#888;font-size:12px">({{ reqCondCount }})</span>
        </template>
        <req-cond-group-designer ref="reqCondDesigner" :ifedit="ifedit" @change="onReqCondChange"/>
      </a-collapse-panel>

      <!-- ═══ 面板3：人员需求 ═══ -->
      <a-collapse-panel key="3">
        <template slot="header">
          <span>人员需求</span>
          <span v-if="reqPersonCount > 0" style="color:#888;font-size:12px">({{ reqPersonCount }})</span>
        </template>
        <div class="panel-radio-group">
          <a-radio-group v-model="reqPersonsType" @change="onPersonsTypeChange" :disabled="readonly">
            <a-radio :value="0">无人员需求</a-radio>
            <a-radio :value="1">人员需求列表</a-radio>
          </a-radio-group>
        </div>
        <div class="toolbar">
          <a-button size="small" @click="addPerson"       :disabled="readonly || reqPersonsType === 0"><a-icon type="plus"/>增加</a-button>
          <a-button size="small" @click="deletePerson"    :disabled="readonly || reqPersonsType === 0 || selectedPersonIndex === null"><a-icon type="delete"/>删除</a-button>
          <a-button size="small" @click="movePersonUp"    :disabled="readonly || reqPersonsType === 0 || selectedPersonIndex === null || selectedPersonIndex === 0"><a-icon type="arrow-up"/>上移</a-button>
          <a-button size="small" @click="movePersonDown"  :disabled="readonly || reqPersonsType === 0 || selectedPersonIndex === null || selectedPersonIndex === persons.length - 1"><a-icon type="arrow-down"/>下移</a-button>
        </div>
        <a-table :columns="personColumns" :data-source="persons"
          :row-selection="personRowSelection" :pagination="false" size="small" bordered
          :row-key="(r, i) => i">
          <template slot="personElemname" slot-scope="text, record, index">
            <a-select v-if="!readonly" v-model="persons[index].elemname" size="small" style="width:100%">
              <a-select-option value="personnel">personnel</a-select-option>
              <a-select-option value="person">person</a-select-option>
            </a-select>
            <span v-else>{{ text }}</span>
          </template>
          <template slot="personTrade"      slot-scope="text, record, index"><a-input v-if="!readonly" v-model="persons[index].trade"          size="small"/><span v-else>{{ text }}</span></template>
          <template slot="personSkillLevel" slot-scope="text, record, index">
            <a-select v-if="!readonly" v-model="persons[index].skillLevelCode" size="small" style="width:100%" show-search>
              <a-select-option v-for="opt in skillLevelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
            </a-select>
            <span v-else>{{ text }}</span>
          </template>
          <template slot="personQty"  slot-scope="text, record, index"><a-input v-if="!readonly" v-model="persons[index].personqty"      size="small"/><span v-else>{{ text }}</span></template>
          <template slot="personTime" slot-scope="text, record, index"><a-input v-if="!readonly" v-model="persons[index].estimatedTime"   size="small"/><span v-else>{{ text }}</span></template>
          <template slot="personUom"  slot-scope="text, record, index"><a-input v-if="!readonly" v-model="persons[index].unitOfMeasure"   size="small"/><span v-else>{{ text }}</span></template>
          <template slot="personNote" slot-scope="text, record, index"><a-input v-if="!readonly" v-model="persons[index].note"            size="small"/><span v-else>{{ text }}</span></template>
        </a-table>
      </a-collapse-panel>

      <!-- ═══ 面板4：设备需求 ═══ -->
      <a-collapse-panel key="4">
        <template slot="header">
          <span style="color:red;margin-right:2px">*</span><span>设备需求</span>
          <span v-if="reqEquipCount > 0" style="color:#888;font-size:12px">({{ reqEquipCount }})</span>
        </template>
        <div class="panel-radio-group">
          <a-radio-group v-model="reqEquipsType" @change="onEquipsTypeChange" :disabled="readonly">
            <a-radio :value="0">无设备需求</a-radio>
            <a-radio :value="1">设备需求列表</a-radio>
          </a-radio-group>
        </div>
        <div class="toolbar">
          <a-button size="small" @click="addEquip"       :disabled="readonly || reqEquipsType === 0"><a-icon type="plus"/>增加</a-button>
          <a-button size="small" @click="deleteEquip"    :disabled="readonly || reqEquipsType === 0 || selectedEquipIndex === null"><a-icon type="delete"/>删除</a-button>
          <a-button size="small" @click="moveEquipUp"    :disabled="readonly || reqEquipsType === 0 || selectedEquipIndex === null || selectedEquipIndex === 0"><a-icon type="arrow-up"/>上移</a-button>
          <a-button size="small" @click="moveEquipDown"  :disabled="readonly || reqEquipsType === 0 || selectedEquipIndex === null || selectedEquipIndex === equips.length - 1"><a-icon type="arrow-down"/>下移</a-button>
        </div>
        <a-table :columns="visibleEquipColumns" :data-source="equips"
          :row-selection="equipRowSelection" :pagination="false" size="small" bordered
          :row-key="(r, i) => i">
          <template slot="equipName"    slot-scope="text, record, index"><a-input v-if="!readonly" v-model="equips[index].name"            size="small"/><span v-else>{{ text }}</span></template>
          <template slot="equipManuf"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="equips[index].manufacturerCode" size="small"/><span v-else>{{ text }}</span></template>
          <template slot="equipPart"    slot-scope="text, record, index"><a-input v-if="!readonly" v-model="equips[index].partNumber"       size="small"/><span v-else>{{ text }}</span></template>
          <template slot="equipQty"     slot-scope="text, record, index"><a-input v-if="!readonly" v-model="equips[index].reqQuantity"      size="small"/><span v-else>{{ text }}</span></template>
          <template slot="equipUom"     slot-scope="text, record, index"><a-input v-if="!readonly" v-model="equips[index].unitOfMeasure"    size="small"/><span v-else>{{ text }}</span></template>
          <template slot="equipRemarks" slot-scope="text, record, index"><a-input v-if="!readonly" v-model="equips[index].remarks"          size="small"/><span v-else>{{ text }}</span></template>
        </a-table>
      </a-collapse-panel>

      <!-- ═══ 面板5：耗材需求 ═══ -->
      <a-collapse-panel key="5">
        <template slot="header">
          <span style="color:red;margin-right:2px">*</span><span>耗材需求</span>
          <span v-if="reqSupplyCount > 0" style="color:#888;font-size:12px">({{ reqSupplyCount }})</span>
        </template>
        <div class="panel-radio-group">
          <a-radio-group v-model="reqSuppliesType" @change="onSuppliesTypeChange" :disabled="readonly">
            <a-radio :value="0">无耗材需求</a-radio>
            <a-radio :value="1">耗材需求列表</a-radio>
          </a-radio-group>
        </div>
        <div class="toolbar">
          <a-button size="small" @click="addSupply"       :disabled="readonly || reqSuppliesType === 0"><a-icon type="plus"/>增加</a-button>
          <a-button size="small" @click="deleteSupply"    :disabled="readonly || reqSuppliesType === 0 || selectedSupplyIndex === null"><a-icon type="delete"/>删除</a-button>
          <a-button size="small" @click="moveSupplyUp"    :disabled="readonly || reqSuppliesType === 0 || selectedSupplyIndex === null || selectedSupplyIndex === 0"><a-icon type="arrow-up"/>上移</a-button>
          <a-button size="small" @click="moveSupplyDown"  :disabled="readonly || reqSuppliesType === 0 || selectedSupplyIndex === null || selectedSupplyIndex === supplies.length - 1"><a-icon type="arrow-down"/>下移</a-button>
        </div>
        <a-table :columns="visibleSupplyColumns" :data-source="supplies"
          :row-selection="supplyRowSelection" :pagination="false" size="small" bordered
          :row-key="(r, i) => i">
          <template slot="supplyName"    slot-scope="text, record, index"><a-input v-if="!readonly" v-model="supplies[index].name"            size="small"/><span v-else>{{ text }}</span></template>
          <template slot="supplyManuf"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="supplies[index].manufacturerCode" size="small"/><span v-else>{{ text }}</span></template>
          <template slot="supplyPart"    slot-scope="text, record, index"><a-input v-if="!readonly" v-model="supplies[index].partNumber"       size="small"/><span v-else>{{ text }}</span></template>
          <template slot="supplyQty"     slot-scope="text, record, index"><a-input v-if="!readonly" v-model="supplies[index].reqQuantity"      size="small"/><span v-else>{{ text }}</span></template>
          <template slot="supplyUom"     slot-scope="text, record, index"><a-input v-if="!readonly" v-model="supplies[index].unitOfMeasure"    size="small"/><span v-else>{{ text }}</span></template>
          <template slot="supplyRemarks" slot-scope="text, record, index"><a-input v-if="!readonly" v-model="supplies[index].remarks"          size="small"/><span v-else>{{ text }}</span></template>
        </a-table>
      </a-collapse-panel>

      <!-- ═══ 面板6：备件需求 ═══ -->
      <a-collapse-panel key="6">
        <template slot="header">
          <span style="color:red;margin-right:2px">*</span><span>备件需求</span>
          <span v-if="reqSpareCount > 0" style="color:#888;font-size:12px">({{ reqSpareCount }})</span>
        </template>
        <div class="panel-radio-group">
          <a-radio-group v-model="reqSparesType" @change="onSparesTypeChange" :disabled="readonly">
            <a-radio :value="0">无备件需求</a-radio>
            <a-radio :value="1">备件需求列表</a-radio>
          </a-radio-group>
        </div>
        <div class="toolbar">
          <a-button size="small" @click="addSpare"       :disabled="readonly || reqSparesType === 0"><a-icon type="plus"/>增加</a-button>
          <a-button size="small" @click="deleteSpare"    :disabled="readonly || reqSparesType === 0 || selectedSpareIndex === null"><a-icon type="delete"/>删除</a-button>
          <a-button size="small" @click="moveSpareUp"    :disabled="readonly || reqSparesType === 0 || selectedSpareIndex === null || selectedSpareIndex === 0"><a-icon type="arrow-up"/>上移</a-button>
          <a-button size="small" @click="moveSpareDown"  :disabled="readonly || reqSparesType === 0 || selectedSpareIndex === null || selectedSpareIndex === spares.length - 1"><a-icon type="arrow-down"/>下移</a-button>
        </div>
        <a-table :columns="visibleSpareColumns" :data-source="spares"
          :row-selection="spareRowSelection" :pagination="false" size="small" bordered
          :row-key="(r, i) => i">
          <template slot="spareName"    slot-scope="text, record, index"><a-input v-if="!readonly" v-model="spares[index].name"            size="small"/><span v-else>{{ text }}</span></template>
          <template slot="spareManuf"   slot-scope="text, record, index"><a-input v-if="!readonly" v-model="spares[index].manufacturerCode" size="small"/><span v-else>{{ text }}</span></template>
          <template slot="sparePart"    slot-scope="text, record, index"><a-input v-if="!readonly" v-model="spares[index].partNumber"       size="small"/><span v-else>{{ text }}</span></template>
          <template slot="spareQty"     slot-scope="text, record, index"><a-input v-if="!readonly" v-model="spares[index].reqQuantity"      size="small"/><span v-else>{{ text }}</span></template>
          <template slot="spareUom"     slot-scope="text, record, index"><a-input v-if="!readonly" v-model="spares[index].unitOfMeasure"    size="small"/><span v-else>{{ text }}</span></template>
          <template slot="spareRemarks" slot-scope="text, record, index"><a-input v-if="!readonly" v-model="spares[index].remarks"          size="small"/><span v-else>{{ text }}</span></template>
        </a-table>
      </a-collapse-panel>

      <!-- ═══ 面板7：安全条件 ═══ -->
      <a-collapse-panel key="7">
        <template slot="header">
          <span style="color:red;margin-right:2px">*</span><span>安全条件</span>
          <span v-if="reqSafetyCount > 0" style="color:#888;font-size:12px">({{ reqSafetyCount }})</span>
        </template>
        <div class="panel-radio-group">
          <a-radio-group v-model="reqSafetyType" @change="onSafetyTypeChange" :disabled="readonly">
            <a-radio :value="0">无安全条件</a-radio>
            <a-radio :value="1">安全条件列表</a-radio>
          </a-radio-group>
        </div>
        <div class="toolbar">
          <a-button size="small" @click="addSafety"       :disabled="readonly || reqSafetyType === 0"><a-icon type="plus"/>增加</a-button>
          <a-button size="small" @click="deleteSafety"    :disabled="readonly || reqSafetyType === 0 || selectedSafetyIndex === null"><a-icon type="delete"/>删除</a-button>
          <a-button size="small" @click="moveSafetyUp"    :disabled="readonly || reqSafetyType === 0 || selectedSafetyIndex === null || selectedSafetyIndex === 0"><a-icon type="arrow-up"/>上移</a-button>
          <a-button size="small" @click="moveSafetyDown"  :disabled="readonly || reqSafetyType === 0 || selectedSafetyIndex === null || selectedSafetyIndex === safetyItems.length - 1"><a-icon type="arrow-down"/>下移</a-button>
        </div>
        <a-table :columns="safetyColumns" :data-source="safetyItems"
          :row-selection="safetyRowSelection" :pagination="false" size="small" bordered
          :row-key="(r, i) => i">
          <template slot="safetyType" slot-scope="text, record, index">
            <a-select v-if="!readonly" v-model="safetyItems[index].type" size="small" style="width:100%">
              <a-select-option value="warning">警告</a-select-option>
              <a-select-option value="caution">注意</a-select-option>
              <a-select-option value="note">提示</a-select-option>
            </a-select>
            <span v-else>{{ {warning:'警告',caution:'注意',note:'提示'}[text] || text }}</span>
          </template>
          <template slot="safetyContent" slot-scope="text, record, index">
            <a-input v-if="!readonly" v-model="safetyItems[index].content" size="small"/>
            <span v-else>{{ text }}</span>
          </template>
        </a-table>
      </a-collapse-panel>
    </a-collapse>

    <!-- 区域/口盖 DM 引用对话框 -->
    <ietm-dm-ref-dialog :visible.sync="zoneAccessDmRefDialogVisible" @insert="onZoneOrAccessDmRefInsert"/>

    <!-- 区域/口盖 PM 引用对话框 -->
    <ietm-pm-ref-dialog :visible="zoneAccessPmRefDialogVisible"
      @ok="onZoneOrAccessPmRefOk" @cancel="zoneAccessPmRefDialogVisible = false"/>

    <!-- 区域/口盖批量生成对话框 -->
    <a-modal v-model="zoneBatchDialogVisible" :title="zoneBatchTitle" @ok="handleZoneBatchOk">
      <a-textarea v-model="zoneBatchText"
        placeholder="每行一条，格式：编号 名称（空格分隔）&#10;例：Z001 左侧舱门&#10;    Z002 右侧舱门"
        :rows="8"/>
    </a-modal>
  </div>
  </a-spin>
</template>
<script>
import { preliminaryRqmts2object, object2preliminaryRqmts } from '../utils/preliminaryRqmtsConverter'
import ReqCondGroupDesigner from './ReqCondGroupDesigner'
import IetmDmRefDialog      from './IetmDmRefDialog'
import IetmPmRefDialog      from './IetmPmRefDialog'

/**
 * preliminaryRqmts（准备工作）主设计器
 *
 * 职责：
 *   - 7 个手风琴面板（产品数据 / 必要条件 / 人员 / 设备 / 耗材 / 备件 / 安全）
 *   - 产品数据 3 个 Tab（任务 / 区域 / 口盖），区域/口盖支持 DM/PM 引用与批量生成
 *   - 必要条件面板由 ReqCondGroupDesigner 子组件承载
 *   - 保存时调用 object2preliminaryRqmts 生成 XML，替换 CodeMirror 源码
 *
 * @author IETM Team
 * @date   2026-11-15
 * @version 2.0
 */
export default {
  name: 'PreliminaryRqmtsDesigner',

  components: {
    ReqCondGroupDesigner,
    IetmDmRefDialog,
    IetmPmRefDialog
  },

  props: {
    /** XML 中 <preliminaryRqmts> 起始行号（0-based） */
    lineno: {
      type: Number,
      required: true,
      validator: v => v >= 0
    },
    /** CodeMirror 编辑器实例 */
    editor: {
      type: Object,
      required: true
    },
    /** 语言环境（en/cn） */
    locale: {
      type: String,
      default: 'en',
      validator: v => ['en', 'cn'].includes(v)
    },
    /** 当前节点ID */
    cmnodeid: {
      type: String,
      default: ''
    },
    /** 是否可编辑（'0'=只读，'1'=可编辑） */
    ifedit: {
      type: String,
      default: '1',
      validator: v => ['0', '1'].includes(v)
    },
    /** 是否显示保存按钮（'0'=隐藏，'1'=显示） */
    save: {
      type: String,
      default: '1',
      validator: v => ['0', '1'].includes(v)
    }
  },

  data() {
    return {
      // 基础状态
      endline: -1,
      loading: false,
      saving: false,
      isDirty: false,

      // 区域/口盖引用对话框
      zoneAccessDmRefDialogVisible: false,
      zoneAccessPmRefDialogVisible: false,
      editingZoneOrAccessIndex: null,
      editingZoneOrAccessTab: null,    // 'zones' | 'accesses'

      // 区域/口盖批量生成
      zoneBatchDialogVisible: false,
      zoneBatchTitle: '批量生成【区域】',
      zoneBatchText: '',
      zoneBatchType: 'zones',           // 'zones' | 'accesses'

      // 面板激活状态（手风琴，默认展开必要条件）
      activePanels: ['2'],
      productActiveTab: 'tasks',

      // 数据模型
      productionData: { tasks: [], zones: [], accesses: [] },
      reqPersonsType: 0,
      persons: [],
      reqEquipsType: 0,
      equips: [],
      reqSuppliesType: 0,
      supplies: [],
      reqSparesType: 0,
      spares: [],
      reqSafetyType: 0,
      safetyItems: [],

      // 选中行索引（8套）
      selectedTaskIndex: null,
      selectedZoneIndex: null,
      selectedAccessIndex: null,
      selectedPersonIndex: null,
      selectedEquipIndex: null,
      selectedSupplyIndex: null,
      selectedSpareIndex: null,
      selectedSafetyIndex: null,

      // 技术等级下拉选项（sk01~sk99），提前生成避免每次渲染重算
      skillLevelOptions: (() => {
        const opts = []
        for (let i = 1; i < 100; i++) {
          const v = i < 10 ? `sk0${i}` : `sk${i}`
          opts.push({ value: v, label: v })
        }
        return opts
      })(),

      // ── 表格列定义 ──
      taskColumns: [
        { title: '工作区域',    dataIndex: 'workarea',  width: 120, scopedSlots: { customRender: 'taskWorkarea'  } },
        { title: '任务准备时间', dataIndex: 'startup',   width: 120, scopedSlots: { customRender: 'taskStartup'   } },
        { title: '任务处理时间', dataIndex: 'procedure', width: 120, scopedSlots: { customRender: 'taskProcedure' } },
        { title: '任务收尾时间', dataIndex: 'closeup',   width: 120, scopedSlots: { customRender: 'taskCloseup'   } },
        { title: '时间单位',    dataIndex: 'uom',       width: 80,  scopedSlots: { customRender: 'taskUom'       } },
        { title: '任务id',     dataIndex: 'id',        width: 80,  scopedSlots: { customRender: 'taskId'        } }
      ],

      zoneColumns: [
        { title: 'id',       dataIndex: 'id',    width: 100, scopedSlots: { customRender: 'zoneId'    } },
        { title: '区域编号', dataIndex: 'no',    width: 140, scopedSlots: { customRender: 'zoneNo'    } },
        { title: '区域名称', dataIndex: 'name',  width: 200, scopedSlots: { customRender: 'zoneName'  } },
        { title: 'DM引用',  dataIndex: 'dmref', scopedSlots: { customRender: 'zoneDmRef' } },
        { title: 'PM引用',  dataIndex: 'pmref', scopedSlots: { customRender: 'zonePmRef' } }
      ],

      accessColumns: [
        { title: 'id',       dataIndex: 'id',    width: 100, scopedSlots: { customRender: 'accessId'    } },
        { title: '口盖编号', dataIndex: 'no',    width: 140, scopedSlots: { customRender: 'accessNo'    } },
        { title: '口盖名称', dataIndex: 'name',  width: 200, scopedSlots: { customRender: 'accessName'  } },
        { title: 'DM引用',  dataIndex: 'dmref', scopedSlots: { customRender: 'accessDmRef' } },
        { title: 'PM引用',  dataIndex: 'pmref', scopedSlots: { customRender: 'accessPmRef' } }
      ],

      personColumns: [
        { title: '使用标签',  dataIndex: 'elemname',       width: 130, scopedSlots: { customRender: 'personElemname'  } },
        { title: '专业',      dataIndex: 'trade',          width: 200, scopedSlots: { customRender: 'personTrade'     } },
        { title: '技术等级',  dataIndex: 'skillLevelCode', width: 130, scopedSlots: { customRender: 'personSkillLevel' } },
        { title: '人数',      dataIndex: 'personqty',      width: 60,  scopedSlots: { customRender: 'personQty'       } },
        { title: '工时',      dataIndex: 'estimatedTime',  width: 80,  scopedSlots: { customRender: 'personTime'      } },
        { title: '工时单位',  dataIndex: 'unitOfMeasure',  width: 80,  scopedSlots: { customRender: 'personUom'       } },
        { title: '备注',      dataIndex: 'note',           width: 160, scopedSlots: { customRender: 'personNote'      } }
      ],

      equipColumns: [
        { title: '设施/设备名称', dataIndex: 'name',             width: 200, scopedSlots: { customRender: 'equipName'    } },
        { title: '厂商码',        dataIndex: 'manufacturerCode',  width: 120, _hidden: false, scopedSlots: { customRender: 'equipManuf'   } },
        { title: '部件码',        dataIndex: 'partNumber',        width: 120, _hidden: false, scopedSlots: { customRender: 'equipPart'    } },
        { title: '数量',          dataIndex: 'reqQuantity',       width: 60,  scopedSlots: { customRender: 'equipQty'     } },
        { title: '单位',          dataIndex: 'unitOfMeasure',     width: 60,  scopedSlots: { customRender: 'equipUom'     } },
        { title: '备注',          dataIndex: 'remarks',           width: 160, scopedSlots: { customRender: 'equipRemarks' } }
      ],

      supplyColumns: [
        { title: '耗材名称', dataIndex: 'name',              width: 200, scopedSlots: { customRender: 'supplyName'    } },
        { title: '厂商码',   dataIndex: 'manufacturerCode',  width: 120, _hidden: false, scopedSlots: { customRender: 'supplyManuf'   } },
        { title: '部件码',   dataIndex: 'partNumber',        width: 120, _hidden: false, scopedSlots: { customRender: 'supplyPart'    } },
        { title: '数量',     dataIndex: 'reqQuantity',       width: 100, scopedSlots: { customRender: 'supplyQty'     } },
        { title: '单位',     dataIndex: 'unitOfMeasure',     width: 80,  scopedSlots: { customRender: 'supplyUom'     } },
        { title: '备注',     dataIndex: 'remarks',           width: 160, scopedSlots: { customRender: 'supplyRemarks' } }
      ],

      spareColumns: [
        { title: '备件名称', dataIndex: 'name',              width: 200, scopedSlots: { customRender: 'spareName'    } },
        { title: '厂商码',   dataIndex: 'manufacturerCode',  width: 120, _hidden: false, scopedSlots: { customRender: 'spareManuf'   } },
        { title: '部件码',   dataIndex: 'partNumber',        width: 120, _hidden: false, scopedSlots: { customRender: 'sparePart'    } },
        { title: '数量',     dataIndex: 'reqQuantity',       width: 100, scopedSlots: { customRender: 'spareQty'     } },
        { title: '单位',     dataIndex: 'unitOfMeasure',     width: 80,  scopedSlots: { customRender: 'spareUom'     } },
        { title: '备注',     dataIndex: 'remarks',           width: 160, scopedSlots: { customRender: 'spareRemarks' } }
      ],

      safetyColumns: [
        { title: '类型', dataIndex: 'type',    width: 120, scopedSlots: { customRender: 'safetyType'    } },
        { title: '内容', dataIndex: 'content', scopedSlots: { customRender: 'safetyContent' } }
      ]
    }
  },

  computed: {
    readonly() {
      return this.ifedit === '0'
    },

    showSaveBtn() {
      return this.save === '1'
    },

    // ── 各面板行数计数（用于 header 插槽显示） ──
    reqCondCount()   { return this.$refs.reqCondDesigner ? this.$refs.reqCondDesigner.getCount() : 0 },
    reqPersonCount() { return this.persons.length },
    reqEquipCount()  { return this.equips.length },
    reqSupplyCount() { return this.supplies.length },
    reqSpareCount()  { return this.spares.length },
    reqSafetyCount() { return this.safetyItems.length },

    // ── 动态列配置：过滤 _hidden 列（由 applyColumnVisibility 控制） ──
    visibleEquipColumns()  { return this.equipColumns.filter(c  => !c._hidden) },
    visibleSupplyColumns() { return this.supplyColumns.filter(c => !c._hidden) },
    visibleSpareColumns()  { return this.spareColumns.filter(c  => !c._hidden) },

    // ── rowSelection（8套） ──
    taskRowSelection()    { return { ...this._mkRowSel('selectedTaskIndex'), columnWidth: 50 } },
    zoneRowSelection()    { return { ...this._mkRowSel('selectedZoneIndex'), columnWidth: 50 } },
    accessRowSelection()  { return { ...this._mkRowSel('selectedAccessIndex'), columnWidth: 50 } },
    personRowSelection()  { return { ...this._mkRowSel('selectedPersonIndex'), columnWidth: 50 } },
    equipRowSelection()   { return { ...this._mkRowSel('selectedEquipIndex'), columnWidth: 50 } },
    supplyRowSelection()  { return { ...this._mkRowSel('selectedSupplyIndex'), columnWidth: 50 } },
    spareRowSelection()   { return { ...this._mkRowSel('selectedSpareIndex'), columnWidth: 50 } },
    safetyRowSelection()  { return { ...this._mkRowSel('selectedSafetyIndex'), columnWidth: 50 } }
  },

  inject: {
    getLocaleName: {
      default: () => (name) => name
    },
    toEnXml: {
      default: () => (xml) => {
        console.warn('toEnXml未注入，使用默认实现（不转换）')
        return xml
      }
    },
    toCnXml: {
      default: () => (xml) => {
        console.warn('toCnXml未注入，使用默认实现（不转换）')
        return xml
      }
    },
    formateXml: {
      default: () => (xml, indent) => {
        console.warn('formateXml未注入，使用默认实现（不格式化）')
        return xml
      }
    },
    // 通过函数传递 designerSett，确保始终是最新值（DmContentEditor provide 中提供）
    getDesignerSett: {
      default: () => () => ({})
    }
  },

  watch: {
    productionData: { deep: true, handler() { this.isDirty = true } },
    persons:        { deep: true, handler() { this.isDirty = true } },
    equips:         { deep: true, handler() { this.isDirty = true } },
    supplies:       { deep: true, handler() { this.isDirty = true } },
    spares:         { deep: true, handler() { this.isDirty = true } },
    safetyItems:    { deep: true, handler() { this.isDirty = true } }
  },

  mounted() {
    if (!this.toEnXml || !this.toCnXml || !this.formateXml) {
      console.error('依赖注入失败：缺少必要的XML转换函数')
      this.$message.error('初始化失败，缺少必要的转换函数，请联系管理员')
      return
    }
    this.loadContent()
  },

  beforeDestroy() {
    if (this.isDirty) {
      console.warn('您有未保存的修改，离开后将丢失。建议先保存。')
    }
    this.clearAllData()
  },

  methods: {
    // ══════════════════════════════════════════════════════
    // 数据加载
    // ══════════════════════════════════════════════════════

    async loadContent() {
      if (!this.editor || this.lineno === null) return
      this.loading = true

      try {
        // 1. 读取 XML 内容（含 lineno 自动修正）
        let preliminaryRqmtsXml = await this.getPreliminaryRqmtsXml()

        // 2. 中文转英文（若需要）
        if (this.locale === 'cn') {
          preliminaryRqmtsXml = this.toEnXml(preliminaryRqmtsXml)
        }

        // 3. XML预处理：移除标签间空白（需求文档 §3.4）
        preliminaryRqmtsXml = preliminaryRqmtsXml.replace(/>(\s*)</g, '><')

        // 4. 检测空标签（旧系统兼容）
        const isEmpty = /^<preliminaryRqmts[^>]*>\s*<\/preliminaryRqmts>$/i.test(preliminaryRqmtsXml.trim())
        if (isEmpty) {
          this.initEmptyData()
          this.isDirty = false
          return
        }

        // 5. 解析 XML → Object
        const preliminaryRqmtsObj = await preliminaryRqmts2object(null, preliminaryRqmtsXml)

        // 6. 填充数据到各面板
        this.fillData(preliminaryRqmtsObj)

        // 7. 通知子组件加载必要条件（需等 DOM 更新完成后再调用 ref）
        await this.$nextTick()
        if (this.$refs.reqCondDesigner && preliminaryRqmtsObj.reqCondGroupXml) {
          await this.$refs.reqCondDesigner.loadFromXml(preliminaryRqmtsObj.reqCondGroupXml)
        }

        // 8. 应用动态列配置（designsett.proced 控制北约码等4列显隐）
        this.applyColumnVisibility()

        // 加载完成后重置dirty标记
        this.isDirty = false
      } catch (error) {
        console.error('加载preliminaryRqmts失败:', error)
        this.$message.error('加载失败: ' + error.message)
        this.initEmptyData()
      } finally {
        this.loading = false
      }
    },

    async getPreliminaryRqmtsXml() {
      let startLine = this.lineno

      // lineno 自动修正（需求文档 §3.2）：如果当前行不含 <preliminaryRqmts，向下最多查20行
      const curLine = this.editor.getLine(startLine) || ''
      if (!curLine.includes('<preliminaryRqmts')) {
        for (let i = startLine + 1; i < Math.min(startLine + 20, this.editor.lineCount()); i++) {
          if ((this.editor.getLine(i) || '').includes('<preliminaryRqmts')) {
            startLine = i
            break
          }
        }
      }

      let preliminaryRqmtsXml = this.editor.getLine(startLine)
      const isSingleLine = preliminaryRqmtsXml.includes('<preliminaryRqmts') &&
                           preliminaryRqmtsXml.includes('</preliminaryRqmts>')

      if (isSingleLine) {
        this.endline = startLine
        return preliminaryRqmtsXml
      }

      // 多行：查找结束行
      this.endline = -1
      for (let i = startLine + 1; i < this.editor.lineCount(); i++) {
        if (this.editor.getLine(i).includes('</preliminaryRqmts>')) {
          this.endline = i
          break
        }
      }
      if (this.endline === -1) {
        throw new Error('找不到</preliminaryRqmts>结束标签')
      }
      return this.editor.getRange(
        { line: startLine, ch: 0 },
        { line: this.endline, ch: this.editor.getLine(this.endline).length }
      )
    },

    initEmptyData() {
      this.productionData = { tasks: [], zones: [], accesses: [] }
      this.reqPersonsType = 0; this.persons = []
      this.reqEquipsType  = 0; this.equips  = []
      this.reqSuppliesType = 0; this.supplies = []
      this.reqSparesType   = 0; this.spares  = []
      this.reqSafetyType   = 0; this.safetyItems = []
    },

    fillData(obj) {
      // 产品数据
      this.productionData = obj.productionData || { tasks: [], zones: [], accesses: [] }
      // 人员需求
      this.reqPersonsType = obj.reqPersons && obj.reqPersons.hasPersons ? 1 : 0
      this.persons = obj.reqPersons ? obj.reqPersons.persons : []
      // 设备需求
      this.reqEquipsType = obj.reqEquips && obj.reqEquips.hasItems ? 1 : 0
      this.equips = obj.reqEquips ? obj.reqEquips.items : []
      // 耗材需求
      this.reqSuppliesType = obj.reqSupplies && obj.reqSupplies.hasItems ? 1 : 0
      this.supplies = obj.reqSupplies ? obj.reqSupplies.items : []
      // 备件需求
      this.reqSparesType = obj.reqSpares && obj.reqSpares.hasItems ? 1 : 0
      this.spares = obj.reqSpares ? obj.reqSpares.items : []
      // 安全条件
      this.reqSafetyType = obj.reqSafety && obj.reqSafety.hasSafety ? 1 : 0
      this.safetyItems = obj.reqSafety ? obj.reqSafety.safetyItems : []
    },

    clearAllData() {
      this.productionData = { tasks: [], zones: [], accesses: [] }
      this.persons = []; this.equips = []; this.supplies = []
      this.spares = []; this.safetyItems = []
    },

    // ══════════════════════════════════════════════════════
    // 保存功能
    // ══════════════════════════════════════════════════════

    async handleSave() {
      if (this.saving) return

      // 备份当前XML，失败时恢复
      let backupXml = null

      try {
        this.saving = true

        // 保存前备份原XML
        if (this.endline !== -1) {
          backupXml = this.editor.getRange(
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        } else {
          backupXml = this.editor.getLine(this.lineno)
        }

        // 1. 数据校验
        if (!this.validateData()) {
          return
        }

        // 2. 获取必要条件XML
        const reqCondGroupXml = this.$refs.reqCondDesigner
          ? await this.$refs.reqCondDesigner.getSaveXml()
          : '<reqCondGroup><noConds></noConds></reqCondGroup>'

        // 3. 构建数据对象
        const preliminaryRqmtsObj = {
          productionData: this.productionData,
          reqCondGroupXml: reqCondGroupXml,
          reqPersons:  { hasPersons: this.reqPersonsType === 1, persons:  this.persons  },
          reqEquips:   { hasItems:   this.reqEquipsType  === 1, items:    this.equips   },
          reqSupplies: { hasItems:   this.reqSuppliesType === 1, items:   this.supplies },
          reqSpares:   { hasItems:   this.reqSparesType   === 1, items:   this.spares   },
          reqSafety:   { hasSafety:  this.reqSafetyType   === 1, safetyItems: this.safetyItems }
        }

        // 4. 转换为 XML
        let preliminaryRqmtsXml = await object2preliminaryRqmts(null, preliminaryRqmtsObj)

        // 5. 格式化 XML（添加缩进），去掉尾部多余换行避免产生空行
        const indent = this.editor.getLine(this.lineno).indexOf('<')
        preliminaryRqmtsXml = this.formateXml(preliminaryRqmtsXml, indent).replace(/\n$/, '')

        // 6. 转为中文（若需要）
        if (this.locale === 'cn') {
          preliminaryRqmtsXml = this.toCnXml(preliminaryRqmtsXml)
        }

        // 7. 替换源码编辑器内容
        if (this.endline === -1) {
          this.editor.replaceRange(preliminaryRqmtsXml, { line: this.lineno, ch: 0 })
        } else {
          this.editor.replaceRange(
            preliminaryRqmtsXml,
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        }

        // 8. 触发父组件保存
        this.$emit('save')

        this.$message.success('保存成功')
        this.isDirty = false

        // 9. 重新加载设计视图
        setTimeout(() => { this.loadContent() }, 500)

      } catch (error) {
        console.error('保存preliminaryRqmts失败:', error)
        this.$message.error('保存失败: ' + error.message)

        // 保存失败时恢复原XML
        if (backupXml) {
          try {
            if (this.endline === -1) {
              this.editor.replaceRange(backupXml, { line: this.lineno, ch: 0 })
            } else {
              this.editor.replaceRange(
                backupXml,
                { line: this.lineno, ch: 0 },
                { line: this.endline, ch: this.editor.getLine(this.endline).length }
              )
            }
            this.$message.info('已恢复原内容')
          } catch (restoreError) {
            console.error('恢复原XML失败:', restoreError)
            this.$message.error('恢复失败，请手动撤销（Ctrl+Z）')
          }
        }
      } finally {
        this.saving = false
      }
    },

    validateData() {
      // 必要条件（必填）
      if (this.$refs.reqCondDesigner) {
        if (!this.$refs.reqCondDesigner.validate()) {
          return false
        }
      }
      // 设备需求（必填）
      if (this.reqEquipsType === 1 && this.equips.length === 0) {
        this.$message.warning('请至少添加一条设备需求，或选择"无设备需求"')
        return false
      }
      // 耗材需求（必填）
      if (this.reqSuppliesType === 1 && this.supplies.length === 0) {
        this.$message.warning('请至少添加一条耗材需求，或选择"无耗材需求"')
        return false
      }
      // 备件需求（必填）
      if (this.reqSparesType === 1 && this.spares.length === 0) {
        this.$message.warning('请至少添加一条备件需求，或选择"无备件需求"')
        return false
      }
      // 安全条件（必填）
      if (this.reqSafetyType === 1 && this.safetyItems.length === 0) {
        this.$message.warning('请至少添加一条安全条件，或选择"无安全条件"')
        return false
      }
      return true
    },

    // ══════════════════════════════════════════════════════
    // 通用CRUD：通过工厂方法减少重复代码
    // ══════════════════════════════════════════════════════

    /** 生成 rowSelection 计算属性的统一实现 */
    _mkRowSel(stateKey) {
      return {
        type: 'radio',
        columnWidth: 50,
        selectedRowKeys: this[stateKey] !== null ? [this[stateKey]] : [],
        onChange: (keys) => {
          this[stateKey] = keys[0] !== undefined ? keys[0] : null
        }
      }
    },

    /** 通用添加行 */
    _addRow(listName, defaultObj, stateKey) {
      this[listName].push({ ...defaultObj })
      this[stateKey] = this[listName].length - 1
    },

    /** 通用删除行 */
    _deleteRow(listName, stateKey, label) {
      if (this[stateKey] === null) {
        this.$message.warning('请选择一行数据')
        return
      }
      this.$confirm({
        title: '确认',
        content: `确认要删除该行${label}？`,
        onOk: () => {
          this[listName].splice(this[stateKey], 1)
          this[stateKey] = null
        }
      })
    },

    /** 通用上移 */
    _moveUp(listName, stateKey) {
      if (this[stateKey] === null || this[stateKey] === 0) {
        this.$message.warning('顶行无法上移')
        return
      }
      const list = this[listName]
      const i = this[stateKey]
      const temp = list[i]
      this.$set(list, i, list[i - 1])
      this.$set(list, i - 1, temp)
      this[stateKey]--
    },

    /** 通用下移 */
    _moveDown(listName, stateKey) {
      const list = this[listName]
      if (this[stateKey] === null || this[stateKey] === list.length - 1) {
        this.$message.warning('底行无法下移')
        return
      }
      const i = this[stateKey]
      const temp = list[i]
      this.$set(list, i, list[i + 1])
      this.$set(list, i + 1, temp)
      this[stateKey]++
    },

    /** 通用单选类型切换（切换到"无XX需求"时确认清空） */
    _onTypeChange(e, listName, stateKey, typeKey, label) {
      if (e.target.value === 0 && this[listName].length > 0) {
        this.$confirm({
          title: '确认',
          content: `切换到"无${label}"将清空所有已添加的${label}，确定要继续吗？`,
          onOk: () => {
            this[listName] = []
            this[stateKey] = null
          },
          onCancel: () => {
            this[typeKey] = 1
          }
        })
      }
    },

    // ── 任务 ──
    addTask() {
      this.productionData.tasks.push({ workarea: '', startup: '', procedure: '', closeup: '', uom: '', id: '' })
      this.selectedTaskIndex = this.productionData.tasks.length - 1
    },
    deleteTask() {
      if (this.selectedTaskIndex === null) { this.$message.warning('请选择一行数据'); return }
      this.$confirm({
        title: '确认', content: '确认要删除该行任务？',
        onOk: () => { this.productionData.tasks.splice(this.selectedTaskIndex, 1); this.selectedTaskIndex = null }
      })
    },
    moveTaskUp() {
      if (this.selectedTaskIndex === null || this.selectedTaskIndex === 0) { this.$message.warning('顶行无法上移'); return }
      const list = this.productionData.tasks
      const i = this.selectedTaskIndex
      const temp = list[i]; this.$set(list, i, list[i - 1]); this.$set(list, i - 1, temp)
      this.selectedTaskIndex--
    },
    moveTaskDown() {
      if (this.selectedTaskIndex === null || this.selectedTaskIndex === this.productionData.tasks.length - 1) { this.$message.warning('底行无法下移'); return }
      const list = this.productionData.tasks
      const i = this.selectedTaskIndex
      const temp = list[i]; this.$set(list, i, list[i + 1]); this.$set(list, i + 1, temp)
      this.selectedTaskIndex++
    },

    // ── 区域 ──
    addZone() {
      this.productionData.zones.push({ id: '', no: '', name: '', dmref: '', pmref: '', dm: [], pm: [] })
      this.selectedZoneIndex = this.productionData.zones.length - 1
    },
    deleteZone() {
      if (this.selectedZoneIndex === null) { this.$message.warning('请选择一行数据'); return }
      this.$confirm({
        title: '确认', content: '确认要删除该区域？',
        onOk: () => { this.productionData.zones.splice(this.selectedZoneIndex, 1); this.selectedZoneIndex = null }
      })
    },
    moveZoneUp() {
      if (this.selectedZoneIndex === null || this.selectedZoneIndex === 0) { this.$message.warning('顶行无法上移'); return }
      const list = this.productionData.zones
      const i = this.selectedZoneIndex
      const temp = list[i]; this.$set(list, i, list[i - 1]); this.$set(list, i - 1, temp)
      this.selectedZoneIndex--
    },
    moveZoneDown() {
      if (this.selectedZoneIndex === null || this.selectedZoneIndex === this.productionData.zones.length - 1) { this.$message.warning('底行无法下移'); return }
      const list = this.productionData.zones
      const i = this.selectedZoneIndex
      const temp = list[i]; this.$set(list, i, list[i + 1]); this.$set(list, i + 1, temp)
      this.selectedZoneIndex++
    },

    // ── 口盖 ──
    addAccess() {
      this.productionData.accesses.push({ id: '', no: '', name: '', dmref: '', pmref: '', dm: [], pm: [] })
      this.selectedAccessIndex = this.productionData.accesses.length - 1
    },
    deleteAccess() {
      if (this.selectedAccessIndex === null) { this.$message.warning('请选择一行数据'); return }
      this.$confirm({
        title: '确认', content: '确认要删除该口盖？',
        onOk: () => { this.productionData.accesses.splice(this.selectedAccessIndex, 1); this.selectedAccessIndex = null }
      })
    },
    moveAccessUp() {
      if (this.selectedAccessIndex === null || this.selectedAccessIndex === 0) { this.$message.warning('顶行无法上移'); return }
      const list = this.productionData.accesses
      const i = this.selectedAccessIndex
      const temp = list[i]; this.$set(list, i, list[i - 1]); this.$set(list, i - 1, temp)
      this.selectedAccessIndex--
    },
    moveAccessDown() {
      if (this.selectedAccessIndex === null || this.selectedAccessIndex === this.productionData.accesses.length - 1) { this.$message.warning('底行无法下移'); return }
      const list = this.productionData.accesses
      const i = this.selectedAccessIndex
      const temp = list[i]; this.$set(list, i, list[i + 1]); this.$set(list, i + 1, temp)
      this.selectedAccessIndex++
    },

    // ── 人员 ──
    onPersonsTypeChange(e) { this._onTypeChange(e, 'persons', 'selectedPersonIndex', 'reqPersonsType', '人员') },
    addPerson()   { this._addRow('persons', { elemname: 'personnel', trade: '', skillLevelCode: '', personqty: '', estimatedTime: '', unitOfMeasure: '', note: '' }, 'selectedPersonIndex') },
    deletePerson() { this._deleteRow('persons', 'selectedPersonIndex', '人员需求') },
    movePersonUp()   { this._moveUp('persons', 'selectedPersonIndex') },
    movePersonDown() { this._moveDown('persons', 'selectedPersonIndex') },

    // ── 设备 ──
    onEquipsTypeChange(e) { this._onTypeChange(e, 'equips', 'selectedEquipIndex', 'reqEquipsType', '设备') },
    addEquip()   { this._addRow('equips', { name: '', manufacturerCode: '', partNumber: '', reqQuantity: '', unitOfMeasure: '', remarks: '' }, 'selectedEquipIndex') },
    deleteEquip() { this._deleteRow('equips', 'selectedEquipIndex', '设备需求') },
    moveEquipUp()   { this._moveUp('equips', 'selectedEquipIndex') },
    moveEquipDown() { this._moveDown('equips', 'selectedEquipIndex') },

    // ── 耗材 ──
    onSuppliesTypeChange(e) { this._onTypeChange(e, 'supplies', 'selectedSupplyIndex', 'reqSuppliesType', '耗材') },
    addSupply()   { this._addRow('supplies', { name: '', manufacturerCode: '', partNumber: '', reqQuantity: '', unitOfMeasure: '', remarks: '' }, 'selectedSupplyIndex') },
    deleteSupply() { this._deleteRow('supplies', 'selectedSupplyIndex', '耗材需求') },
    moveSupplyUp()   { this._moveUp('supplies', 'selectedSupplyIndex') },
    moveSupplyDown() { this._moveDown('supplies', 'selectedSupplyIndex') },

    // ── 备件 ──
    onSparesTypeChange(e) { this._onTypeChange(e, 'spares', 'selectedSpareIndex', 'reqSparesType', '备件') },
    addSpare()   { this._addRow('spares', { name: '', manufacturerCode: '', partNumber: '', reqQuantity: '', unitOfMeasure: '', remarks: '' }, 'selectedSpareIndex') },
    deleteSpare() { this._deleteRow('spares', 'selectedSpareIndex', '备件需求') },
    moveSpareUp()   { this._moveUp('spares', 'selectedSpareIndex') },
    moveSpareDown() { this._moveDown('spares', 'selectedSpareIndex') },

    // ── 安全条件 ──
    onSafetyTypeChange(e) { this._onTypeChange(e, 'safetyItems', 'selectedSafetyIndex', 'reqSafetyType', '安全条件') },
    addSafety()   { this._addRow('safetyItems', { type: 'warning', content: '' }, 'selectedSafetyIndex') },
    deleteSafety() { this._deleteRow('safetyItems', 'selectedSafetyIndex', '安全条件') },
    moveSafetyUp()   { this._moveUp('safetyItems', 'selectedSafetyIndex') },
    moveSafetyDown() { this._moveDown('safetyItems', 'selectedSafetyIndex') },

    // ══════════════════════════════════════════════════════
    // 区域/口盖 批量生成
    // ══════════════════════════════════════════════════════

    showZoneOrAccessBatchDialog(type) {
      this.zoneBatchType  = type
      this.zoneBatchTitle = `批量生成【${type === 'zones' ? '区域' : '口盖'}】`
      this.zoneBatchText  = ''
      this.zoneBatchDialogVisible = true
    },

    handleZoneBatchOk() {
      const list = this.zoneBatchType === 'zones'
        ? this.productionData.zones
        : this.productionData.accesses
      const lines = this.zoneBatchText.split('\n').filter(l => l.trim() !== '')
      if (lines.length === 0) {
        this.$message.warning('文本为空，不能生成')
        return
      }
      lines.forEach(line => {
        const parts = line.replace(/\t/g, ' ').replace(/ {2,}/g, ' ').trim().split(' ')
        if (parts.length >= 2) {
          list.push({ id: '', no: parts[0], name: parts.slice(1).join(' '), dmref: '', pmref: '', dm: [], pm: [] })
        }
      })
      this.zoneBatchDialogVisible = false
      this.$message.success(`成功添加 ${lines.length} 条`)
    },

    // ══════════════════════════════════════════════════════
    // 区域/口盖 DM/PM 引用选择
    // ══════════════════════════════════════════════════════

    openZoneOrAccessDmRef(index, tab) {
      this.editingZoneOrAccessIndex = index
      this.editingZoneOrAccessTab    = tab
      this.zoneAccessDmRefDialogVisible = true
    },

    onZoneOrAccessDmRefInsert(dmRefXml) {
      const list = this.editingZoneOrAccessTab === 'zones'
        ? this.productionData.zones
        : this.productionData.accesses
      const item = list[this.editingZoneOrAccessIndex]
      if (!item) {
        this.zoneAccessDmRefDialogVisible = false
        return
      }
      try {
        const dmc = this._parseDmc(dmRefXml)
        if (!item.dm) item.dm = []
        item.dm.push({ dmc, xml: dmRefXml })
        item.dmref = item.dm.map(d => d.dmc).join(';')
        this.$message.success('DM引用添加成功')
      } catch (e) {
        this.$message.error('解析DM引用失败: ' + e.message)
      }
      this.zoneAccessDmRefDialogVisible = false
    },

    openZoneOrAccessPmRef(index, tab) {
      this.editingZoneOrAccessIndex = index
      this.editingZoneOrAccessTab    = tab
      this.zoneAccessPmRefDialogVisible = true
    },

    onZoneOrAccessPmRefOk(pmData) {
      const list = this.editingZoneOrAccessTab === 'zones'
        ? this.productionData.zones
        : this.productionData.accesses
      const item = list[this.editingZoneOrAccessIndex]
      if (!item) {
        this.zoneAccessPmRefDialogVisible = false
        return
      }
      if (!item.pm) item.pm = []
      item.pm.push({ pmc: pmData.pmc, xml: pmData.xml || '' })
      item.pmref = item.pm.map(p => p.pmc).join(';')
      this.zoneAccessPmRefDialogVisible = false
      this.$message.success('PM引用添加成功')
    },

    clearZoneOrAccessRef(index, type, tab) {
      const list = tab === 'zones' ? this.productionData.zones : this.productionData.accesses
      const item = list[index]
      if (!item) return
      if (type === 'dm') { item.dm = []; item.dmref = '' }
      else               { item.pm = []; item.pmref = '' }
    },

    /** 从 dmRef XML 字符串提取 DMC */
    _parseDmc(dmRefXml) {
      if (!dmRefXml) return ''
      try {
        const parser = new DOMParser()
        let xml = dmRefXml
        if (xml.includes('xlink:') && !xml.includes('xmlns:xlink')) {
          xml = xml.replace('<dmRef', '<dmRef xmlns:xlink="http://www.w3.org/1999/xlink"')
        }
        const doc  = parser.parseFromString(xml, 'text/xml')
        const code = doc.querySelector('dmCode')
        if (!code) return ''
        const f    = a => code.getAttribute(a) || ''
        const lang = doc.querySelector('language')
        const li   = lang ? (lang.getAttribute('languageIsoCode') || 'zh') : 'zh'
        const ci   = lang ? (lang.getAttribute('countryIsoCode')  || 'CN') : 'CN'
        return `DMC-${f('modelIdentCode')}-${f('systemDiffCode')}-${f('systemCode')}-${f('subSystemCode')}${f('subSubSystemCode')}-${f('assyCode')}${f('disassyCode')}-${f('disassyCodeVariant')}${f('infoCode')}${f('infoCodeVariant')}-${f('itemLocationCode')}_${li}-${ci}`
      } catch (e) {
        console.error('解析DMC失败:', e)
        return ''
      }
    },

    // ══════════════════════════════════════════════════════
    // 动态列配置（designsett.proced 控制北约码等4列显隐）
    // ══════════════════════════════════════════════════════

    applyColumnVisibility() {
      const procedSett = (this.getDesignerSett().proced) || {}
      const configCols = ['natoStockNumber', 'manufacturerCode', 'partNumber', 'serialNumber']

      configCols.forEach(colKey => {
        const hidden = procedSett[colKey + '_checked'] === 'false'
        const title  = procedSett[colKey + '_title']
        ;['equipColumns', 'supplyColumns', 'spareColumns'].forEach(colsDef => {
          const col = this[colsDef].find(c => c.dataIndex === colKey)
          if (!col) return
          this.$set(col, '_hidden', hidden)
          if (!hidden && title) this.$set(col, 'title', title)
        })
      })
    },

    // ══════════════════════════════════════════════════════
    // 必要条件回调
    // ══════════════════════════════════════════════════════

    onReqCondChange() {
      this.isDirty = true
    }
  }
}
</script>

<style lang="less" scoped>
.preliminary-rqmts-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  .designer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: whitesmoke;
    border-bottom: 1px solid #d9d9d9;

    .header-title {
      font-size: 14pt;
      font-weight: bolder;
      color: #2d75cd;
      font-family: 'Microsoft YaHei';
    }
  }

  .designer-collapse {
    flex: 1;
    overflow: auto;
    padding: 16px;
    background: #fff;

    /deep/ .ant-collapse-item {
      margin-bottom: 8px;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      overflow: hidden;
    }

    /deep/ .ant-collapse-header {
      background: #fafafa;
      font-weight: 500;
    }

    .panel-radio-group {
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .toolbar {
      margin-bottom: 8px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .ref-cell {
      display: flex;
      gap: 4px;
      align-items: center;
    }
  }
}
</style>
