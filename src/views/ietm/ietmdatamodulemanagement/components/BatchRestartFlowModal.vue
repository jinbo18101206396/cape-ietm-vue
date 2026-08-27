<template>
  <a-modal
    title="批量重新启动流程"
    :width="1400"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    :maskClosable="false"
    :destroyOnClose="true"
    :bodyStyle="{ padding: 0 }"
  >
    <a-spin :spinning="confirmLoading" tip="正在加载，请稍候...">
      <div class="batch-flow-modal-content">
        <!-- 顶部信息栏 -->
        <div class="info-banner">
          <a-row :gutter="16">
            <a-col :span="8">
              <div class="info-item">
                <a-icon type="file-text" class="info-icon" />
                <span class="info-label">选中数量：</span>
                <span class="info-value">{{ selectedDmCount }} 条</span>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="info-item">
                <a-icon type="calendar" class="info-icon" />
                <span class="info-label">创建时间：</span>
                <span class="info-value">{{ openDate }}</span>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="info-item">
                <a-icon type="user" class="info-icon" />
                <span class="info-label">创建人：</span>
                <span class="info-value">{{ currentUserName }}</span>
              </div>
            </a-col>
          </a-row>
        </div>

        <!-- 配置区域 -->
        <div class="config-section">
          <div class="section-header">
            <div class="section-title">
              <a-icon type="setting" class="title-icon" />
              <span>流程配置</span>
            </div>
          </div>

          <div class="config-content">
            <a-form-model ref="form" :model="model" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
              <a-row :gutter="24">
                <!-- 紧急级别 -->
                <a-col :span="12">
                  <a-form-model-item label="紧急级别" required>
                    <a-select v-model="model.ifurgent" placeholder="请选择紧急级别" size="default">
                      <a-select-option value="1">
                        <a-badge status="default" text="一般" />
                      </a-select-option>
                      <a-select-option value="2">
                        <a-badge status="warning" text="紧急" />
                      </a-select-option>
                      <a-select-option value="3">
                        <a-badge status="error" text="特急" />
                      </a-select-option>
                    </a-select>
                  </a-form-model-item>
                </a-col>
              </a-row>
              <a-row :gutter="24">
                <a-col :span="24">
                  <a-form-model-item label="重启原因" required :label-col="{ span: 3 }" :wrapper-col="{ span: 21 }">
                    <a-textarea
                      v-model="model.reason"
                      placeholder="请输入重启原因"
                      :rows="3"
                      :maxLength="200"
                    />
                  </a-form-model-item>
                </a-col>
              </a-row>
            </a-form-model>
          </div>
        </div>

        <!-- 节点配置区域 -->
        <div class="nodes-section">
          <div class="section-header">
            <div class="section-title">
              <a-icon type="apartment" class="title-icon" />
              <span>节点配置</span>
              <span class="node-count">({{ model.nodes.length }} 个节点)</span>
            </div>
            <div class="section-actions">
              <a-space :size="8">
                <a-tooltip title="手动添加新的流程节点">
                  <a-button size="small" icon="plus" type="dashed" @click="handleAddNode">
                    添加节点
                  </a-button>
                </a-tooltip>
                <a-tooltip :title="selectedNodeKeys.length === 0 ? '请先选中要删除的节点' : `删除选中的${selectedNodeKeys.length}个节点`">
                  <a-button
                    size="small"
                    icon="delete"
                    type="danger"
                    :disabled="selectedNodeKeys.length === 0"
                    @click="handleDeleteSelectedNodes"
                  >
                    批量删除
                  </a-button>
                </a-tooltip>
                <a-divider type="vertical" />
                <a-tooltip title="检查流程节点配置是否正确">
                  <a-button size="small" icon="check-circle" @click="handleCheckNodes">
                    检查配置
                  </a-button>
                </a-tooltip>
              </a-space>
            </div>
          </div>

          <div class="nodes-content">
            <a-table
              :columns="nodeColumns"
              :data-source="model.nodes"
              :pagination="false"
              :row-selection="{
                selectedRowKeys: selectedNodeKeys,
                onChange: onNodeSelectionChange,
                getCheckboxProps: record => ({
                  props: {
                    disabled: record.seqno === 0
                  }
                })
              }"
              :scroll="{ x: 900, y: 400 }"
              bordered
              size="small"
              rowKey="_clientId"
              :rowClassName="getNodeRowClassName"
            >
              <template slot="seqno" slot-scope="text, record">
                <a-input-number
                  v-model="record.seqno"
                  :min="record.seqno === 0 ? 0 : 1"
                  :max="9999"
                  :disabled="record.seqno === 0"
                  style="width: 100%"
                />
              </template>

              <template slot="nodename" slot-scope="text, record">
                <a-input v-model="record.nodename" placeholder="请输入节点名称" />
              </template>

              <template slot="nodetype" slot-scope="text, record">
                <a-select
                  v-model="record.nodetype"
                  placeholder="请选择"
                  style="width: 100%"
                  :disabled="record.seqno === 0"
                >
                  <a-select-option v-for="item in nodetypeOptions" :key="item.value" :value="item.value">
                    {{ item.text }}
                  </a-select-option>
                </a-select>
              </template>

              <template slot="useridname" slot-scope="text, record">
                <a-input
                  :value="record.useridname"
                  placeholder="点击选择处理人"
                  :disabled="record.seqno === 0"
                  readonly
                  style="cursor: pointer;"
                  @click="() => handleSelectUser(record)"
                >
                  <a-icon slot="suffix" type="team" style="color: #1890ff;" />
                </a-input>
              </template>

              <template slot="ifgetback" slot-scope="text, record">
                <a-select
                  :value="parseIfgetback(record.ifgetback)"
                  placeholder="请选择"
                  mode="multiple"
                  style="width: 100%"
                  @change="onIfgetbackChange(record, $event)"
                >
                  <a-select-option value="__UNLIMITED__">《不限制》</a-select-option>
                  <a-select-option value="__NO_JUMP__">《不可跳转》</a-select-option>
                  <a-select-option
                    v-for="option in getJumpableNodes(record)"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-select-option>
                </a-select>
              </template>

              <template slot="action" slot-scope="text, record, index">
                <a-tooltip v-if="record.seqno === 0" title="创建节点不可删除">
                  <span style="color: #ccc; cursor: not-allowed;">删除</span>
                </a-tooltip>
                <a
                  v-else
                  @click="handleDeleteNode(index)"
                  style="color: #1890ff;"
                >
                  删除
                </a>
              </template>
            </a-table>
          </div>
        </div>
      </div>
    </a-spin>

    <!-- 用户选择器弹窗（P0-1：处理人改为选择器，避免自由文本填错/伪造姓名） -->
    <user-selector ref="userSelector" />
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import { generateUUID } from '@/utils/util'
import UserSelector from './UserSelector.vue'

// C-003修复：定义节点类型常量，避免magic number
const NODE_TYPE = {
  CREATE: '0', // 创建节点（所有人必须完成）
  NORMAL: '1' // 普通节点（只1人完成）
}

export default {
  name: 'BatchRestartFlowModal',
  components: { UserSelector },
  data() {
    return {
      visible: false,
      confirmLoading: false,
      selectedRecords: [],
      openDate: '', // P2-5：打开弹窗时间（创建时间）
      selectedNodeKeys: [], // 节点表格选中的行（对齐 BatchStartFlowModal 批量删除）
      currentSelectingNode: null, // P0-1：当前正在选择处理人的节点
      // ✅ P2-26修复：提取节点类型映射
      nodetypeOptions: [
        { text: '所有人必须完成', value: '0' },
        { text: '只1人完成', value: '1' }
      ],
      model: {
        batchId: '',
        reason: '',
        dataList: [],
        ifurgent: '1',
        nodes: [
          {
            _clientId: generateUUID(), // ✅ P2-30修复：客户端临时行标识，与可编辑的seqno解耦
            seqno: 0,
            nodename: '创建节点',
            nodetype: '0',
            userid: '',
            useridname: '',
            stagename: '',
            ifgetback: '' // 后端格式：''=不限制, '-1'=不可跳转, '1,2'=节点seqno列表
          }
        ]
      },
      nodeColumns: [
        {
          title: '处理人',
          dataIndex: 'useridname',
          width: 180,
          scopedSlots: { customRender: 'useridname' }
        },
        {
          title: '节点名称',
          dataIndex: 'nodename',
          width: 160,
          scopedSlots: { customRender: 'nodename' }
        },
        {
          title: '顺序号',
          dataIndex: 'seqno',
          width: 80,
          align: 'center',
          scopedSlots: { customRender: 'seqno' }
        },
        {
          title: '处理方式',
          dataIndex: 'nodetype',
          width: 140,
          scopedSlots: { customRender: 'nodetype' }
        },
        {
          title: '可跳转节点',
          dataIndex: 'ifgetback',
          width: 150,
          scopedSlots: { customRender: 'ifgetback' }
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: 80,
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      ]
    }
  },
  computed: {
    selectedDmCount() {
      return this.selectedRecords.length
    },
    // P2-5：当前用户名（对标 BatchStartFlowModal）
    currentUserName() {
      const userInfo = this.$store.getters.userInfo
      return (userInfo && (userInfo.realname || userInfo.username)) || '系统用户'
    }
  },
  methods: {
    // 节点行样式类名（对齐 BatchStartFlowModal）
    getNodeRowClassName(record, index) {
      if (record.seqno === 0) {
        return 'create-node-row'
      }
      return index % 2 === 0 ? 'even-row' : 'odd-row'
    },

    // 打开弹窗
    show(selectedRecords) {
      this.visible = true
      this.selectedRecords = selectedRecords
      this.selectedNodeKeys = []
      this.model.batchId = generateUUID()

      // P2-5：记录打开弹窗时间
      this.openDate = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })

      // ⚠️ 自动填充重启原因（对标旧系统：fullissueno+'版重新启动流程'）
      if (selectedRecords.length === 1 && selectedRecords[0]) {
        const record = selectedRecords[0]
        const fullissueno = record.fullissueno || `${record.issueNo}-${record.inWork}`
        this.model.reason = `${fullissueno}版重新启动流程`
      } else {
        this.model.reason = ''
      }

      // 构建dataList（dmId + oldInstanceId）
      this.model.dataList = selectedRecords.map(record => ({
        dmId: record.id,
        oldInstanceId: record.workflowInstanceId || ''
      }))

      // 获取当前登录用户信息
      const currentUser = this.$store.getters.userInfo || {}

      // 重置节点配置为默认单创建节点（作为回填失败/无旧实例时的兜底）
      // C-003修复：使用常量替代magic number
      // 对标BatchStartFlowModal：ifgetback统一用后端格式字符串
      this.model.nodes = [this.buildDefaultCreateNode(currentUser)]

      // 回填旧流程实例的原有节点（对标旧系统：重启=在原流程节点基础上重来）
      // 仅单DM重启时回填；有oldInstanceId才拉取，失败则保留上面的兜底创建节点
      const oldInstanceId = this.model.dataList.length === 1 ? this.model.dataList[0].oldInstanceId : ''

      // P1-7修复(2026-08-27)：空旧实例ID时阻断操作，关闭弹窗
      // 原问题：warning提示后不关闭弹窗，用户误以为可以手动配置节点后提交，实际后端会拒绝
      if (this.model.dataList.length === 1 && (!oldInstanceId || oldInstanceId.trim() === '')) {
        this.$message.error('该DM没有已结束的流程实例，无法重启流程')
        this.handleCancel()  // 关闭弹窗
        return
      }

      if (oldInstanceId) {
        this.loadInstanceNodes(oldInstanceId, currentUser)
      }
    },

    // 构建默认"创建"节点（兜底）
    buildDefaultCreateNode(currentUser) {
      const user = currentUser || this.$store.getters.userInfo || {}
      return {
        _clientId: generateUUID(),
        seqno: 0,
        nodename: '创建',
        nodetype: NODE_TYPE.CREATE,
        userid: user.username || '',
        useridname: user.realname || '',
        stagename: '',
        ifgetback: ''
      }
    },

    // 回填旧流程实例节点：调后端 /ietm/workflow/dtl/list?instid= 拉取该实例节点
    // 失败或返回空时保留兜底的单创建节点，不阻断弹窗使用
    //
    // P1-8修复(2026-08-27)：节点顺序号处理逻辑说明
    // - 第1次启动：用户配置0,10,20,30,40 → 存储0,10,20,30,40
    // - 第1次重启：读取0,10,20,30,40 → 前端显示100,110,120,130,140（+100） → 提交时直接使用显示值 → 后端不加偏移 → 存储100,110,120,130,140
    // - 第2次重启：读取100,110,120,130,140 → 前端显示200,210,220,230,240（+100） → 提交时直接使用显示值 → 后端不加偏移 → 存储200,210,220,230,240
    // 用户看到的值 = 数据库最终存储的值，前端+100是为了区分不同批次的历史节点
    loadInstanceNodes(instid, currentUser) {
      this.confirmLoading = true
      getAction('/ietm/workflow/dtl/list', { instid })
        .then(res => {
          if (res.success && Array.isArray(res.result) && res.result.length > 0) {
            const sorted = res.result.slice().sort((a, b) => (a.seqno || 0) - (b.seqno || 0))
            this.model.nodes = sorted.map(node => ({
              _clientId: generateUUID(),
              // 前端显示时+100，让用户看到最终存储的值（提交时会-100还原，然后后端再+100）
              seqno: (node.seqno || 0) + 100,
              nodename: node.nodename || '',
              nodetype: node.nodetype || NODE_TYPE.CREATE,
              userid: node.userid || '',
              useridname: node.useridname || '',
              stagename: node.stagename || '',
              // P1-2修复：旧实例的 ifgetback 引用的是旧 seqno，重启后seqno会+100，
              // 重置为空（不限制），要求用户重新配置，避免错误的跳转关系
              ifgetback: ''
            }))
            // 兜底：确保第一个节点是创建节点
            if (this.model.nodes.length > 0 && this.model.nodes[0].nodetype !== NODE_TYPE.CREATE) {
              this.model.nodes.unshift(this.buildDefaultCreateNode(currentUser))
            }
          }
        })
        .catch(err => {
          console.error('回填旧流程节点失败', err)
        })
        .finally(() => {
          this.confirmLoading = false
        })
    },

    // 添加节点
    // C-003修复：使用常量替代magic number
    handleAddNode() {
      const maxSeqno = Math.max(...this.model.nodes.map(n => n.seqno))
      this.model.nodes.push({
        _clientId: generateUUID(),
        seqno: maxSeqno + 10,
        nodename: '',
        nodetype: NODE_TYPE.NORMAL,
        userid: '',
        useridname: '',
        stagename: '',
        ifgetback: ''
      })
    },

    // P0-1：打开用户选择器（对标 BatchStartFlowModal.handleSelectUser）
    handleSelectUser(record) {
      if (record.seqno === 0) {
        this.$message.warning('创建节点的处理人不可修改')
        return
      }
      this.currentSelectingNode = record
      this.$refs.userSelector.show(
        (result) => {
          record.userid = result.userid
          record.useridname = result.useridname
        },
        { userid: record.userid, useridname: record.useridname }
      )
    },

    // P1-4：手动检查节点配置（对标 BatchStartFlowModal.handleCheckNodes）
    handleCheckNodes() {
      const errors = this.validateForm()
      if (errors.length > 0) {
        this.$message.error(errors[0])
      } else {
        this.$message.success('流程检查正确。')
      }
    },

    // 获取可跳转节点列表
    // 对标旧系统 IncludeInstanceAdd.jsp:465-478 及 BatchStartFlowModal：
    // 返回除当前节点外的所有节点（含前序/创建节点），而非仅后续节点
    // P0-2：seqno可编辑后用_clientId判定"自己"，避免seqno临时重复导致误过滤
    // 方案C修复：改用_clientId作为value，对齐后端雪花ID数据契约
    getJumpableNodes(currentNode) {
      return this.model.nodes
        .filter(node => node._clientId !== currentNode._clientId)
        .map(node => ({
          value: node._clientId, // 使用稳定的_clientId，后端会映射到真实节点ID
          label: `${node.seqno === 0 ? '创建节点' : node.seqno} - ${node.nodename}`
        }))
    },

    // 可跳转节点变更处理（互斥性）
    // 对标 BatchStartFlowModal.onIfgetbackChange
    onIfgetbackChange(record, selectedValues) {
      if (!selectedValues || selectedValues.length === 0) {
        // 清空选择，默认《不限制》
        record.ifgetback = ''
        return
      }

      const UNLIMITED = '__UNLIMITED__'
      const NO_JUMP = '__NO_JUMP__'

      // 两个特殊选项互斥：按当前值判断用户想切到哪个
      if (selectedValues.includes(UNLIMITED) && selectedValues.includes(NO_JUMP)) {
        record.ifgetback = (record.ifgetback === '' || record.ifgetback == null) ? '-1' : ''
        return
      }

      // 《不限制》与具体节点互斥
      if (selectedValues.includes(UNLIMITED)) {
        if (selectedValues.length === 1) {
          record.ifgetback = ''
        } else {
          const nodeIds = selectedValues.filter(v => v !== UNLIMITED && v !== NO_JUMP)
          record.ifgetback = nodeIds.join(',')
        }
        return
      }

      // 《不可跳转》与具体节点互斥
      if (selectedValues.includes(NO_JUMP)) {
        if (selectedValues.length === 1) {
          record.ifgetback = '-1'
        } else {
          const nodeIds = selectedValues.filter(v => v !== UNLIMITED && v !== NO_JUMP)
          record.ifgetback = nodeIds.join(',')
        }
        return
      }

      // 仅具体节点
      record.ifgetback = selectedValues.filter(v => v !== UNLIMITED && v !== NO_JUMP).join(',')
    },

    // 解析ifgetback（后端格式 → UI多选数组）
    // 对标 BatchStartFlowModal.parseIfgetback
    parseIfgetback(value) {
      if (!value || value === '') return ['__UNLIMITED__']
      if (value === '-1') return ['__NO_JUMP__']
      if (value === '__NO_JUMP__') return ['__NO_JUMP__']
      if (value === '__UNLIMITED__') return ['__UNLIMITED__']
      return value.split(',').map(v => v.trim()).filter(v => v)
    },

    // 可跳转节点互斥性校验
    // 对标需求§7.2.3 及 BatchStartFlowModal.validateJumpRules
    validateJumpRules(ifgetback, rowNum) {
      if (ifgetback == null || ifgetback === '') return null
      const arr = Array.isArray(ifgetback)
        ? ifgetback
        : ifgetback.split(',').map(v => v.trim())
      if ((arr.includes('') || arr.includes('__UNLIMITED__')) && arr.length > 1) {
        return `不能保存第 ${rowNum} 行，当可跳转节点选择《不限制》时，不能再选择其它节点.`
      }
      if ((arr.includes('-1') || arr.includes('__NO_JUMP__')) && arr.length > 1) {
        return `不能保存第 ${rowNum} 行，当可跳转节点选择《不可跳转》时，不能再选择其它节点.`
      }
      return null
    },

    // 删除节点
    // 对标 BatchStartFlowModal：创建节点(seqno=0)不可删除，否则无法重建导致表单卡死
    handleDeleteNode(index) {
      const node = this.model.nodes[index]
      if (node && node.seqno === 0) {
        this.$message.warning('创建节点不可删除')
        return
      }
      if (this.model.nodes.length > 1) {
        this.model.nodes.splice(index, 1)
      }
    },

    // 批量删除选中节点（对齐 BatchStartFlowModal.handleDeleteSelectedNodes）
    handleDeleteSelectedNodes() {
      if (this.selectedNodeKeys.length === 0) {
        this.$message.warning('请选择要删除的节点')
        return
      }
      this.$confirm({
        title: '确认删除',
        content: '删除的数据不能恢复，您确定要删除当前所选的数据？',
        onOk: () => {
          // 创建节点(seqno=0)不可删除
          this.model.nodes = this.model.nodes.filter(
            node => !this.selectedNodeKeys.includes(node._clientId) || node.seqno === 0
          )
          this.selectedNodeKeys = []
          this.$message.success('已删除选中节点')
        }
      })
    },

    // 节点表格选择变化
    onNodeSelectionChange(selectedRowKeys) {
      this.selectedNodeKeys = selectedRowKeys
    },

    // 自动调整创建节点的seqno为最小值
    // Bug修复：用户删除/调整节点后，创建节点可能不再是最小seqno，导致后端校验失败
    // 解决方案：提交前自动调整创建节点seqno为所有节点中的最小值
    adjustCreateNodeSeqno() {
      if (!this.model.nodes || this.model.nodes.length === 0) {
        return
      }

      // 1. 找到创建节点
      const createNode = this.model.nodes.find(n => n.nodetype === NODE_TYPE.CREATE)
      if (!createNode) {
        console.warn('[批量重启] 未找到创建节点')
        return
      }

      // 2. 计算所有节点中的最小seqno
      const minSeqno = Math.min(...this.model.nodes.map(n => n.seqno))

      // 3. 如果创建节点的seqno不是最小值，自动调整
      if (createNode.seqno !== minSeqno) {
        console.log(`[批量重启] 自动调整创建节点seqno: ${createNode.seqno} → ${minSeqno}`)
        createNode.seqno = minSeqno
      }
    },

    // 提交
    handleOk() {
      // 前端表单验证
      const errors = this.validateForm()
      if (errors.length > 0) {
        this.$message.warning(errors[0])
        return
      }

      // ✅ Bug修复：自动调整创建节点的seqno为最小值
      // 问题：用户删除/调整节点后，创建节点可能不再是最小seqno，导致后端校验失败
      // 解决：提交前自动调整创建节点seqno为所有节点中的最小值
      this.adjustCreateNodeSeqno()

      // UX优化：批量操作超过50条时二次确认
      const dmCount = this.selectedRecords.length
      if (dmCount > 50) {
        this.$confirm({
          title: '批量操作确认',
          content: `您选择了 ${dmCount} 条DM进行重启流程操作，处理可能需要较长时间（预计${Math.ceil(dmCount / 10)}秒），是否继续？`,
          okText: '继续',
          cancelText: '取消',
          onOk: () => {
            this.doSubmit()
          }
        })
        return
      }

      // 少于50条直接提交
      this.doSubmit()
    },

    // 提交重启流程请求
    doSubmit() {
      this.confirmLoading = true

      // 防御性转换：ifgetback统一为后端格式（''/-1/_clientId列表）
      // 方案C：_clientId会被后端resolveFrontendIfgetback映射为真实节点ID
      const params = {
        batchId: this.model.batchId,
        reason: this.model.reason,
        dataList: this.model.dataList,
        nodes: this.model.nodes.map(node => {
          let ifgetback = node.ifgetback
          if (Array.isArray(ifgetback)) {
            // 兼容历史数组数据
            ifgetback = ifgetback
              .map(v => (v === '__UNLIMITED__' ? '' : v === '__NO_JUMP__' ? '-1' : v))
              .filter(v => v !== '')
              .join(',')
          } else if (ifgetback === '__UNLIMITED__') {
            ifgetback = ''
          } else if (ifgetback === '__NO_JUMP__') {
            ifgetback = '-1'
          }
          // 方案C：保留_clientId供后端映射为真实节点ID
          // 方案A：前端显示值即最终存储值，直接提交，后端不加偏移
          return {
            seqno: node.seqno,  // 直接使用显示值（前端已+100，后端不再加）
            nodename: node.nodename,
            nodetype: node.nodetype,
            userid: node.userid,
            useridname: node.useridname,
            stagename: node.stagename || '',
            ifgetback: ifgetback || '',
            _clientId: node._clientId // 前端稳定标识，后端用于映射
          }
        }),
        ifurgent: this.model.ifurgent,
        stagenames: this.model.stagenames || ''  // 添加stagenames字段
      }

      // 接口路径需与后端 WfInstanceController 一致：类级 @RequestMapping("/ietm/workflow") + 方法级 @PostMapping("/batchRestartFlow")
      postAction('/ietm/workflow/batchRestartFlow', params)
        .then(res => {
          if (res.success) {
            this.$message.success(res.message || '批量重启成功')
            this.handleCancel()
            this.$emit('ok')
          } else {
            this.$message.error(res.message || '批量重启失败')
          }
        })
        .catch(err => {
          console.error('批量重启失败', err)
          // 区分错误类型
          if (err.response) {
            const status = err.response.status
            if (status === 400) {
              this.$message.error('请求参数错误：' + (err.response.data.message || ''))
            } else if (status === 401) {
              this.$message.error('登录已过期，请重新登录')
              // P1-3修复：401自动跳转登录页
              setTimeout(() => {
                this.$router.push('/user/login')
              }, 1500)
            } else if (status === 403) {
              this.$message.error('无权限执行此操作，请联系管理员')
            } else if (status === 404) {
              this.$message.error('接口不存在，请联系管理员')
            } else if (status === 500) {
              this.$message.error('服务器错误：' + (err.response.data.message || ''))
            } else if (status === 502 || status === 503) {
              this.$message.error('服务暂时不可用，请稍后重试')
            } else {
              this.$message.error('操作失败：' + (err.message || '未知错误'))
            }
          } else if (err.request) {
            this.$message.error('网络错误，请检查网络连接')
          } else {
            this.$message.error('操作失败：' + (err.message || '未知错误'))
          }
        })
        .finally(() => {
          this.confirmLoading = false
        })
    },

    // 前端表单验证
    validateForm() {
      const errors = []

      // 验证重启原因
      if (!this.model.reason || !this.model.reason.trim()) {
        errors.push('请输入重启原因')
        return errors
      }

      if (this.model.reason.length > 200) {
        errors.push('重启原因不能超过200个字符')
        return errors
      }

      // 验证紧急级别
      if (!this.model.ifurgent) {
        errors.push('请选择紧急级别')
        return errors
      }

      // 验证节点配置
      if (this.model.nodes.length === 0) {
        errors.push('请至少配置一个节点')
        return errors
      }

      let hasCreateNode = false
      const seqnoSet = new Set()

      for (const node of this.model.nodes) {
        // 验证必填字段
        if (!node.nodename || !node.nodename.trim()) {
          errors.push('节点名称不能为空')
          break
        }
        if (!node.nodetype) {
          errors.push('处理方式不能为空')
          break
        }
        if (!node.userid || !node.userid.trim()) {
          errors.push('处理人ID不能为空')
          break
        }
        if (!node.useridname || !node.useridname.trim()) {
          errors.push('处理人姓名不能为空')
          break
        }

        // 验证seqno重复
        if (seqnoSet.has(node.seqno)) {
          errors.push(`节点顺序号重复：${node.seqno}`)
          break
        }
        seqnoSet.add(node.seqno)

        // 可跳转节点互斥校验（需求§7.2.3）
        const jumpError = this.validateJumpRules(node.ifgetback, node.seqno)
        if (jumpError) {
          errors.push(jumpError)
          break
        }

        // 检查创建节点
        // C-003修复：使用常量替代magic number
        if (node.nodetype === NODE_TYPE.CREATE) {
          hasCreateNode = true
          // 重启流程时，创建节点的seqno可能不是最小值（例如第2次重启时创建节点seqno=200）
          // 只需确保有创建节点即可，不校验seqno大小
        }
      }

      if (!hasCreateNode && errors.length === 0) {
        errors.push('必须包含创建节点（处理方式=所有人必须完成）')
      }

      return errors
    },

    // 取消
    handleCancel() {
      this.visible = false
      this.selectedRecords = []
      this.model.reason = ''
      this.model.dataList = []
    }
  }
}
</script>

<style scoped>
/* 主容器 */
.batch-flow-modal-content {
  background: #f5f7fa;
}

/* 顶部信息栏 */
.info-banner {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  padding: 12px 20px;
  color: #fff;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.info-icon {
  font-size: 15px;
  margin-right: 6px;
  opacity: 0.9;
}

.info-label {
  opacity: 0.9;
  margin-right: 4px;
}

.info-value {
  font-weight: 600;
  font-size: 14px;
}

/* 配置区域 */
.config-section {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.section-header {
  padding: 12px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
}

.title-icon {
  font-size: 16px;
  margin-right: 8px;
  color: #1890ff;
}

.node-count {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
}

.section-actions {
  display: flex;
  align-items: center;
}

.config-content {
  padding: 16px 20px;
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

/* 节点配置区域 */
.nodes-section {
  background: #fff;
  margin: 12px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.nodes-content {
  padding: 12px;
}

/* 表格行样式 */
::v-deep .create-node-row {
  background-color: #e6f7ff !important;
  font-weight: 500;
}

::v-deep .create-node-row:hover td {
  background-color: #bae7ff !important;
}

::v-deep .executed-node-row {
  background-color: #f6ffed !important;
  color: rgba(0, 0, 0, 0.45);
}

::v-deep .executed-node-row:hover td {
  background-color: #d9f7be !important;
}

::v-deep .even-row {
  background-color: #fafafa;
}

::v-deep .ant-table-tbody > tr:hover:not(.ant-table-expanded-row):not(.ant-table-row-selected) > td {
  background-color: #e6f7ff;
}

/* 表格单元格内input/select样式优化 */
::v-deep .ant-table-tbody .ant-input,
::v-deep .ant-table-tbody .ant-select {
  border-radius: 2px;
}

::v-deep .ant-table-tbody .ant-input:focus,
::v-deep .ant-table-tbody .ant-select-focused .ant-select-selector {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

/* 表格优化 */
::v-deep .ant-table {
  font-size: 13px;
}

/* 确保表头和表体对齐 */
::v-deep .ant-table-thead > tr > th,
::v-deep .ant-table-tbody > tr > td {
  padding: 8px 8px !important;
}

/* 固定列宽，防止表头表体不对齐 */
::v-deep .ant-table-thead > tr > th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

::v-deep .ant-table-tbody > tr > td {
  white-space: normal;
  word-break: break-word;
}

/* 确保bordered表格的边框对齐 */
::v-deep .ant-table-bordered .ant-table-thead > tr > th,
::v-deep .ant-table-bordered .ant-table-tbody > tr > td {
  border-right: 1px solid #e8e8e8;
}

::v-deep .ant-table-thead > tr > th {
  background: #fafafa;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  padding: 12px 8px;
}

::v-deep .ant-table-tbody > tr > td {
  padding: 8px;
}

/* 删除链接样式 */
::v-deep .ant-table-tbody a[disabled] {
  color: #d9d9d9 !important;
  cursor: not-allowed !important;
  pointer-events: none;
}

/* 按钮组优化 */
::v-deep .ant-space-item .ant-btn-sm {
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
}

/* Modal底部按钮 */
::v-deep .ant-modal-footer {
  border-top: 1px solid #e8e8e8;
  padding: 12px 24px;
  background: #fafafa;
}

::v-deep .ant-modal-footer .ant-btn {
  min-width: 80px;
  height: 36px;
}

/* 紧急级别badge样式 */
::v-deep .ant-badge-status-text {
  margin-left: 4px;
  font-size: 13px;
}

/* 滚动条样式优化 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #999;
}

::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}
</style>
