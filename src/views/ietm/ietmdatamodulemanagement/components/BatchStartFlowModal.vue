<template>
  <a-modal
    title="批量启动流程"
    :width="1400"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    :maskClosable="false"
    :destroyOnClose="true"
    :bodyStyle="{ padding: 0 }"
  >
    <a-spin :spinning="confirmLoading">
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
            <a-form-model :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
              <a-row :gutter="24">
                <!-- 选择模板 -->
                <a-col :span="12">
                  <a-form-model-item label="流程模板" required>
                    <a-select
                      v-model="model.templateId"
                      placeholder="请选择流程模板"
                      :loading="templateLoading"
                      :disabled="autoMatchedTemplate"
                      @change="handleTemplateChange"
                      allowClear
                      size="default"
                    >
                      <a-select-option v-for="tmpl in templateList" :key="tmpl.id" :value="tmpl.id">
                        <a-icon type="file-text" style="margin-right: 4px;" />
                        {{ tmpl.tmplname }}
                      </a-select-option>
                    </a-select>
                  </a-form-model-item>
                </a-col>

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
                <a-tooltip :title="!model.templateId ? '请先选择流程模板' : '加载选中模板的节点配置'">
                  <a-button
                    size="small"
                    icon="check"
                    type="primary"
                    :disabled="!model.templateId"
                    @click="handleConfirmTemplate"
                  >
                    加载模板
                  </a-button>
                </a-tooltip>
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
                    disabled: record.seqno === 0 || record.ifexec === 'Y'
                  }
                })
              }"
              :scroll="{ x: 900, y: 400 }"
              bordered
              size="small"
              rowKey="_rid"
              :rowClassName="getNodeRowClassName"
            >
          <!-- 顺序号 -->
          <template slot="seqno" slot-scope="text, record">
            <a-tooltip v-if="record.seqno === 0" title="创建节点顺序号固定为0">
              <a-input-number
                v-model="record.seqno"
                :min="0"
                :max="9999"
                :disabled="true"
                style="width: 100%"
              />
            </a-tooltip>
            <a-input-number
              v-else
              v-model="record.seqno"
              :min="1"
              :max="9999"
              style="width: 100%"
            />
          </template>

          <!-- 节点名称 -->
          <template slot="nodename" slot-scope="text, record">
            <a-tooltip v-if="isNodeNameNotEditable(record.nodename)" title="此节点名称不可编辑">
              <a-input
                v-model="record.nodename"
                placeholder="请输入节点名称"
                :disabled="true"
              />
            </a-tooltip>
            <a-input
              v-else
              v-model="record.nodename"
              placeholder="请输入节点名称"
            />
          </template>

          <!-- 节点类型 -->
          <template slot="nodetype" slot-scope="text, record">
            <a-tooltip v-if="record.seqno === 0" title="创建节点类型固定，不可修改">
              <a-select
                v-model="record.nodetype"
                placeholder="请选择"
                style="width: 100%"
                :disabled="true"
              >
                <a-select-option v-for="item in nodetypeOptions" :key="item.value" :value="item.value">
                  {{ item.text }}
                </a-select-option>
              </a-select>
            </a-tooltip>
            <a-select
              v-else
              v-model="record.nodetype"
              placeholder="请选择"
              style="width: 100%"
            >
              <a-select-option v-for="item in nodetypeOptions" :key="item.value" :value="item.value">
                {{ item.text }}
              </a-select-option>
            </a-select>
          </template>

          <!-- 处理人ID（authtype=1/2时显示）-->
          <template v-if="showUseridColumn" slot="userid" slot-scope="text, record">
            <a-select
              v-model="record.userid"
              mode="multiple"
              placeholder="请选择处理人"
              style="width: 100%"
              :disabled="record.seqno === 0"
            >
              <a-select-option v-for="user in authorizedUsers" :key="user.id" :value="user.id">
                {{ user.name }}
              </a-select-option>
            </a-select>
          </template>

          <!-- 处理人姓名（authtype非1/2时显示）-->
          <template v-if="!showUseridColumn" slot="useridname" slot-scope="text, record">
            <a-input
              v-model="record.useridname"
              placeholder="点击选择"
              :disabled="record.seqno === 0"
              @click="() => handleSelectUser(record)"
              readonly
              style="cursor: pointer;"
            >
              <a-icon slot="suffix" type="team" style="color: #1890ff;" />
            </a-input>
          </template>

          <!-- 阶段（分阶段流程时显示）-->
          <template v-if="isStageWorkflow" slot="stagename" slot-scope="text, record">
            <a-select v-model="record.stagename" placeholder="请选择阶段" style="width: 100%">
              <a-select-option v-for="(stage, idx) in stageOptions" :key="`stage_${idx}_${stage}`" :value="String(idx)">
                {{ stage }}
              </a-select-option>
            </a-select>
          </template>

          <!-- 可跳转节点 -->
          <template slot="ifgetback" slot-scope="text, record">
            <a-select
              :value="parseIfgetback(record.ifgetback)"
              mode="multiple"
              placeholder="选择可跳转节点"
              style="width: 100%"
              allowClear
              @change="onIfgetbackChange(record, $event)"
            >
              <a-select-option value="__UNLIMITED__">《不限制》</a-select-option>
              <a-select-option value="__NO_JUMP__">《不可跳转》</a-select-option>
              <!-- 🔧 修复：移除固定的《创建》选项，避免与动态生成的创建节点重复 -->
              <a-select-option v-for="node in getJumpableNodes(record)" :key="node._rid" :value="String(node.seqno)">
                {{ node.nodename }}
              </a-select-option>
            </a-select>
          </template>

        </a-table>
          </div>
        </div>
      </div>
    </a-spin>

    <!-- 用户选择器弹窗 -->
    <user-selector
      ref="userSelector"
      @ok="handleUserSelected"
    />
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import { generateUUID } from '@/utils/util'
import UserSelector from './UserSelector.vue'

export default {
  name: 'BatchStartFlowModal',
  components: {
    UserSelector
  },
  props: {
    selectedRecords: {
      type: Array,
      default: () => [],
      // 🔧 P2优化：添加validator确保数组元素包含必需的id字段
      validator: (value) => {
        // 1. 允许空数组
        if (value.length === 0) return true

        // 2. 检查每个元素必须有id字段
        const hasId = value.every(record =>
          record && typeof record === 'object' && 'id' in record
        )

        if (!hasId) {
          console.error('[BatchStartFlowModal] selectedRecords中的记录必须包含id字段')
          return false
        }

        return true
      }
    },
    // 默认模板名称（从URL参数传入，如'DM'）
    defaultTemplate: {
      type: String,
      default: 'DM'
    },
    // 是否检查所有节点（1=全部检查，0=只检查下一节点）
    checkAllNode: {
      type: String,
      default: '1',
      // 🔧 P2优化：添加validator确保只接受合法的枚举值
      validator: (value) => {
        const validValues = ['0', '1']
        if (!validValues.includes(value)) {
          console.error(`[BatchStartFlowModal] checkAllNode必须是'0'或'1'，收到: ${value}`)
          return false
        }
        return true
      }
    },
    // 不可编辑的节点名称（逗号分隔，如'DM编写'）
    notEditNode: {
      type: String,
      default: ''
    },
    // 不可删除的节点名称（逗号分隔，如'DM编写'）
    notDelNode: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      visible: false,
      confirmLoading: false,
      templateLoading: false,
      selectedDmIds: [],
      internalSelectedRecords: [], // 内部存储完整的记录信息（不与prop冲突）
      selectedNodeKeys: [], // 节点表格选中的行
      currentSelectingNode: null, // 当前正在选择处理人的节点
      openDate: '', // 🎯 P3-1优化：打开弹窗的日期（替代currentDate computed）
      templateList: [], // 流程模板列表
      authorizedUsers: [], // 授权用户列表（authtype=1/2时使用）
      nodetypeOptions: [], // 处理方式字典选项（从WF_TEMPLATE_DTL_NODETYPE加载）
      noteditNode: '', // 不可编辑的节点名称列表
      notdelNode: '', // 不可删除的节点名称列表
      authtype: '0', // 权限类型（从系统配置读取）
      autoMatchedTemplate: false, // 是否自动匹配了模板
      timers: [], // 🔧 P1修复：存储定时器引用，用于组件销毁时清理
      model: {
        batchId: '',
        dmIds: [],
        templateId: '',
        ifurgent: '1',
        stagenames: '',
        nodes: []
      }
    }
  },
  computed: {
    selectedDmCount() {
      return this.selectedDmIds.length
    },
    // 当前用户名（从Vuex Store获取）
    currentUserName() {
      const userInfo = this.$store.getters.userInfo
      return (userInfo && (userInfo.realname || userInfo.username)) || '系统用户'
    },
    // 是否是分阶段流程
    isStageWorkflow() {
      if (!this.model.templateId) return false
      const template = this.templateList.find(t => t.id === this.model.templateId)
      return template && template.stagenames && template.stagenames.trim() !== ''
    },
    // 阶段选项（从stagenames解析）
    stageOptions() {
      if (!this.model.stagenames) return []
      return this.model.stagenames.split(',').map(s => s.trim()).filter(s => s)
    },
    // 是否显示userid列（authtype=1/2时显示）
    showUseridColumn() {
      return this.authtype === '1' || this.authtype === '2'
    },
    // 动态计算表格列（按需求文档4.1节顺序）
    nodeColumns() {
      return [
        this.userColumn,
        ...this.basicColumns,
        this.actionColumn
      ]
    },
    // 处理人列（根据authtype动态切换）
    userColumn() {
      if (this.showUseridColumn) {
        return {
          title: '处理人ID',
          dataIndex: 'userid',
          width: 180,
          scopedSlots: { customRender: 'userid' }
        }
      } else {
        return {
          title: '处理人',
          dataIndex: 'useridname',
          width: 180,
          scopedSlots: { customRender: 'useridname' }
        }
      }
    },
    // 基础列（节点名称、顺序号、处理方式）
    basicColumns() {
      return [
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
          align: 'center',
          scopedSlots: { customRender: 'nodetype' }
        }
      ]
    },
    // 操作列（可跳转节点）
    actionColumn() {
      return {
        title: '可跳转节点',
        dataIndex: 'ifgetback',
        width: 180,
        scopedSlots: { customRender: 'ifgetback' }
      }
    }
  },
  methods: {
    // 节点行样式类名
    getNodeRowClassName(record, index) {
      if (record.seqno === 0) {
        return 'create-node-row'
      }
      if (record.ifexec === 'Y') {
        return 'executed-node-row'
      }
      return index % 2 === 0 ? 'even-row' : 'odd-row'
    },

    // 打开弹窗
    show(selectedRecords) {
      this.visible = true
      this.internalSelectedRecords = selectedRecords || [] // 存储完整记录到内部变量
      this.selectedDmIds = (selectedRecords || []).map(r => r.id)
      this.model.dmIds = [...this.selectedDmIds]
      this.model.batchId = generateUUID()
      this.selectedNodeKeys = []

      // 🎯 P3-1优化：记录打开弹窗的时间
      this.openDate = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })

      // 从props初始化参数
      this.noteditNode = this.notEditNode
      this.notdelNode = this.notDelNode

      // 重置节点配置（初始化创建节点）
      this.resetNodes()

      // 加载流程模板列表，加载完成后自动匹配模板
      this.loadTemplateList()

      // 加载处理方式字典
      this.loadNodetypeDict()

      // 读取系统配置中的authtype
      this.loadAuthtype()

      // 如果authtype=1/2，加载授权用户列表
      if (this.showUseridColumn) {
        this.loadAuthorizedUsers()
      }
    },

    // 重置节点配置
    resetNodes() {
      const currentUser = this.$store.getters.userInfo
      this.model.nodes = [
        {
          _rid: generateUUID(), // 稳定行标识（rowKey/选择用），与可编辑的 seqno 解耦
          seqno: 0,
          nodename: '创建节点',
          nodetype: '0', // 默认"所有人必完成"
          userid: (currentUser && currentUser.id) || '',
          useridname: (currentUser && currentUser.realname) || '',
          stagename: this.isStageWorkflow ? '0' : '',
          ifgetback: '', // 🔧 修复：使用后端格式（空字符串 = 不限制，parseIfgetback会转换为UI格式）
          ifexec: 'Y' // 标记为已执行，不可删除
        }
      ]
    },

    /**
     * 加载Mock模板数据
     * 🔧 MOCK: 临时数据，后端就绪后删除
     * @returns {Promise<Array>} Mock模板列表
     */
    loadMockTemplates() {
      return new Promise(resolve => {
        const timer = setTimeout(() => {
          resolve([
            {
              id: 'mock_template_dm_001',
              tmplname: 'DM数据模块流程模板',
              stagenames: '编写,审核,签批'
            },
            {
              id: 'mock_template_pm_001',
              tmplname: 'PM流程模板',
              stagenames: '创建,审批,发布'
            },
            {
              id: 'mock_template_cm_001',
              tmplname: 'CM配置管理流程',
              stagenames: ''
            }
          ])
        }, 300)
        this.timers.push(timer) // 🔧 P1修复：存储定时器引用
      })
    },

    /**
     * 加载真实模板数据
     * @returns {Promise<Array>} 真实模板列表
     */
    async loadRealTemplates() {
      const res = await getAction('/ietm/workflow/template/getPubOwnWfTemplates')

      if (res.success) {
        if ((res.result || []).length === 0) {
          this.$message.warning('暂无可用的流程模板，请先在系统中配置流程模板')
        }
        return res.result || []
      } else {
        throw new Error(res.message || '加载失败')
      }
    },

    /**
     * 应用匹配到的模板
     * @param {Object} template - 匹配的模板对象
     */
    applyMatchedTemplate(template) {
      this.model.templateId = template.id
      this.autoMatchedTemplate = true

      // 自动加载模板节点
      this.loadTemplateNodes(template.id)

      // 设置分阶段标志
      if (template.stagenames) {
        this.model.stagenames = template.stagenames
      }
    },

    /**
     * 处理模板列表（自动匹配+节点加载）
     * @param {Array} templates - 模板列表
     */
    processTemplateList(templates) {
      this.templateList = templates

      // 需求文档第12章：模板自动匹配
      if (!this.defaultTemplate) return

      const matchedTemplate = this.templateList.find(
        t => t.tmplname && t.tmplname.indexOf(this.defaultTemplate) >= 0
      )

      if (matchedTemplate) {
        this.applyMatchedTemplate(matchedTemplate)
      }
    },

    /**
     * 加载模板失败错误处理
     * @param {Error} err - 错误对象
     */
    handleLoadTemplateError(err) {
      console.error('加载流程模板失败', err)
      this.$message.error('加载流程模板失败：' + err.message)
    },

    // 加载流程模板列表
    async loadTemplateList() {
      this.templateLoading = true

      try {
        // 🔧 临时Mock数据（后端接口可用后删除useMockData开关）
        const useMockData = false // 设置为false启用真实接口

        const templates = useMockData
          ? await this.loadMockTemplates()
          : await this.loadRealTemplates()

        this.processTemplateList(templates)
      } catch (err) {
        this.handleLoadTemplateError(err)
      } finally {
        this.templateLoading = false
      }
    },

    // 加载处理方式字典（WF_TEMPLATE_DTL_NODETYPE）
    loadNodetypeDict() {
      // 🔧 修复：对齐旧系统，显示处理方式而非节点类型
      // nodetype字段含义：0=所有人必须完成, 1=只1人完成
      // 旧系统JSP: "所有人必须完成""只1人完成"
      this.nodetypeOptions = [
        { text: '所有人必须完成', value: '0' },
        { text: '只1人完成', value: '1' }
      ]
    },

    /**
     * 将旧版文本型 nodetype（如"只1人完成"）标准化为数值字符串（"0"/"1"/"2"）。
     * 历史数据中 wf_template_dtl.nodetype_ 可能保存的是中文文本，加载模板时需转换。
     * 🔧 修复：对齐旧系统处理方式文本
     */
    normalizeNodetype(nodetype) {
      const textMap = {
        // 旧系统标准文本（处理方式）
        '所有人必完成': '0',
        '所有人必须完成': '0',
        '只1人完成': '1',
        '只一人完成': '1',

        // 兼容旧版本的复合文本
        '创建/所有人必完成': '0',
        '审核/只1人完成': '1',

        // 新系统错误文本（兼容，但不应出现在新数据中）
        '创建': '0',
        '创建节点': '0',
        '审核': '1',
        '审核节点': '1',
        '签批': '2',
        '签批节点': '2',
        '审批': '2'
      }
      if (nodetype && textMap[nodetype] !== undefined) {
        return textMap[nodetype]
      }
      // 已经是合法数值直接返回
      return nodetype || '0'
    },

    // 读取authtype配置
    loadAuthtype() {
      // 从localStorage或Vuex读取IETM_CONFIG
      const ietmConfig = localStorage.getItem('IETM_CONFIG')
      if (ietmConfig) {
        try {
          const config = JSON.parse(ietmConfig)
          this.authtype = config.authtype || '0'
        } catch (e) {
          console.error('解析IETM_CONFIG失败', e)
          this.authtype = '0'
        }
      }
    },

    // 加载授权用户列表（authtype=1/2时）
    loadAuthorizedUsers() {
      const currentProject = this.$store.getters.currentProject
      const projectId = currentProject && currentProject.id
      if (!projectId) {
        this.$message.warning('未选择项目')
        return
      }

      const params = {
        objtype: this.authtype === '1' ? '1' : '2', // 1=按项目，2=按角色
        objid: projectId,
        authprojectid: projectId
      }

      postAction('/ietmauth/ietmAuth/getIetmAuths', params)
        .then(res => {
          if (res.success) {
            this.authorizedUsers = (res.result || []).map(item => ({
              id: item.userid || item.id,
              name: item.username || item.name
            }))
          }
        })
        .catch(err => {
          console.error('加载授权用户失败', err)
        })
    },

    // 加载模板节点配置
    /**
     * 加载模板节点配置
     * 🎯 P2-1优化：方法拆分，提升可维护性
     * @param {String} templateId - 模板ID
     */
    loadTemplateNodes(templateId) {
      if (!templateId) return

      this.confirmLoading = true

      // 🔧 MOCK: 临时数据，后端就绪后删除
      const useMockData = false

      if (useMockData) {
        this.loadMockTemplateNodes(templateId)
      } else {
        this.loadRealTemplateNodes(templateId)
      }
    },

    /**
     * 加载Mock模板节点（开发测试用）
     * 🔧 MOCK: 临时方法，后端就绪后删除
     * @param {String} templateId - 模板ID
     */
    loadMockTemplateNodes(templateId) {
      // 根据不同模板ID返回不同的节点配置
      const mockNodesByTemplate = {
        'mock_template_dm_001': [
          { seqno: 1, nodename: 'DM编写', nodetype: '0', stagename: '编写', ifgetback: '' },
          { seqno: 2, nodename: 'DM审核', nodetype: '1', stagename: '审核', ifgetback: '1' },
          { seqno: 3, nodename: 'DM签批', nodetype: '2', stagename: '签批', ifgetback: '1,2' }
        ],
        'mock_template_pm_001': [
          { seqno: 1, nodename: 'PM创建', nodetype: '0', stagename: '创建', ifgetback: '' },
          { seqno: 2, nodename: 'PM审批', nodetype: '1', stagename: '审批', ifgetback: '1' },
          { seqno: 3, nodename: 'PM发布', nodetype: '2', stagename: '发布', ifgetback: '' }
        ],
        'mock_template_cm_001': [
          { seqno: 1, nodename: '配置管理', nodetype: '0', stagename: '', ifgetback: '' },
          { seqno: 2, nodename: '变更审核', nodetype: '1', stagename: '', ifgetback: '1' }
        ]
      }

      const mockNodes = mockNodesByTemplate[templateId] || []

      const timer = setTimeout(() => {
        this.applyTemplateNodes(mockNodes)
        this.confirmLoading = false
      }, 300)
      this.timers.push(timer)
    },

    /**
     * 加载真实模板节点（生产环境）
     * @param {String} templateId - 模板ID
     */
    loadRealTemplateNodes(templateId) {
      getAction(`/ietm/workflow/template/getTemplateDtl/${templateId}`)
        .then(res => {
          if (res.success && res.result && res.result.length > 0) {
            // 标准化节点数据格式
            const normalizedNodes = res.result.map(node => ({
              seqno: node.seqno,
              nodename: node.nodename,
              // normalizeNodetype：历史数据可能存的是中文文本，统一转为数值编码
              nodetype: this.normalizeNodetype(node.nodetype),
              stagename: node.stagename || '',
              // 🔧 修复：从模板加载的ifgetback可能是后端格式（空字符串/-1），无需转换
              // parseIfgetback只在UI显示时使用，存储时保持后端格式
              ifgetback: node.ifgetback || ''
            }))

            this.applyTemplateNodes(normalizedNodes)
          } else {
            this.$message.warning('模板无节点配置')
          }
        })
        .catch(err => {
          console.error('加载模板节点失败', err)
          this.$message.error('加载模板节点失败')
        })
        .finally(() => {
          this.confirmLoading = false
        })
    },

    /**
     * 应用模板节点到当前配置
     * 🎯 P2-1优化：提取公共逻辑，减少重复代码
     * @param {Array} templateNodes - 模板节点列表
     */
    applyTemplateNodes(templateNodes) {
      if (!templateNodes || templateNodes.length === 0) {
        this.$message.warning('模板无节点配置')
        return
      }

      // 保留创建节点，如果不存在则创建一个
      let createNode = this.model.nodes.find(n => n.seqno === 0)

      // 🐛 修复：如果创建节点不存在，创建一个默认的创建节点
      if (!createNode) {
        console.warn('批量启动流程：创建节点不存在，自动初始化')
        const currentUser = this.$store.getters.userInfo
        createNode = {
          _rid: generateUUID(),
          seqno: 0,
          nodename: '创建节点',
          nodetype: '0',
          userid: (currentUser && currentUser.id) || '',
          useridname: (currentUser && currentUser.realname) || '',
          stagename: this.isStageWorkflow ? '0' : '',
          ifgetback: '',
          ifexec: 'Y'
        }
      }

      const formattedNodes = templateNodes
        .filter(n => n.seqno !== 0) // 过滤掉创建节点（如果模板中包含）
        .map(node => ({
          _rid: generateUUID(),
          seqno: node.seqno,
          nodename: node.nodename,
          // 🔧 修复：如果模板中nodetype为空或undefined，默认设置为'0'（所有人必须完成）
          nodetype: node.nodetype || '0',
          userid: '',
          useridname: '',
          stagename: node.stagename || '',
          // 🔧 修复：对齐旧系统，加载模板时忽略模板中的ifgetback值，统一默认为''（不限制）
          // 旧系统行为：模板中的ifgetback仅作为参考，批量启动时用户需要手动配置
          ifgetback: ''
        }))

      this.model.nodes = [createNode, ...formattedNodes]
      this.$message.success('模板节点加载成功')
    },

    // 模板变化事件
    handleTemplateChange(templateId) {
      if (!templateId) {
        this.model.stagenames = ''
        return
      }

      const template = this.templateList.find(t => t.id === templateId)
      if (template) {
        // 自动填充阶段名称
        this.model.stagenames = template.stagenames || ''
      }
    },

    // 确定模板（加载模板节点配置）
    handleConfirmTemplate() {
      if (!this.model.templateId) {
        this.$message.warning('请先选择流程模板')
        return
      }

      this.loadTemplateNodes(this.model.templateId)
    },

    // 刷新节点
    // 添加节点（符合需求文档第11.4节）
    handleAddNode() {
      // 校验：须有上一行先完整填写
      if (this.model.nodes.length > 0) {
        const lastNode = this.model.nodes[this.model.nodes.length - 1]
        const validationError = this.validateNode(lastNode, this.model.nodes.length)
        if (validationError) {
          this.$message.warning('不能编辑，请确保上一条数据填写完整')
          return
        }
      }

      const maxSeqno = Math.max(...this.model.nodes.map(n => n.seqno), 0)
      const newSeqno = maxSeqno + 10

      this.model.nodes.push({
        _rid: generateUUID(),
        seqno: newSeqno,
        nodename: '',
        nodetype: '0', // 默认"所有人必完成"
        userid: '',
        useridname: '',
        stagename: this.isStageWorkflow ? '0' : '',
        ifgetback: '' // 🔧 修复：使用后端格式（空字符串 = 不限制，parseIfgetback会转换为UI格式）
      })

      this.$message.success('已添加新节点')
    },

    // 删除选中的节点（批量删除）
    handleDeleteSelectedNodes() {
      if (this.selectedNodeKeys.length === 0) {
        this.$message.warning('请选择要删除的节点')
        return
      }

      // 删除节点需要用户确认（需求文档第11.4节）
      this.$confirm({
        title: '确认删除',
        content: '删除的数据不能恢复，您确定要删除当前所选的数据？',
        onOk: () => {
          this.model.nodes = this.model.nodes.filter(
            node => !this.selectedNodeKeys.includes(node._rid) || node.seqno === 0 || node.ifexec === 'Y'
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

    // 检查流程配置（手动点击"检查流程"按钮时）
    handleCheckNodes() {
      const errors = this.checkAllNodes()
      if (errors.length > 0) {
        this.$message.error(errors[0])
      } else {
        // 需求文档第11.2节：手动检查时显示"流程检查正确。"
        this.$message.success('流程检查正确。')
      }
    },

    // 判断节点名称是否不可编辑
    isNodeNameNotEditable(nodename) {
      if (!this.noteditNode || !nodename) return false
      const notEditList = this.noteditNode.split(',').map(n => n.trim())
      return notEditList.includes(nodename)
    },

    // 打开用户选择器
    handleSelectUser(record) {
      if (record.seqno === 0) {
        this.$message.warning('创建节点的处理人不可修改')
        return
      }
      this.currentSelectingNode = record
      // 调用UserSelector的show方法，传入回调和当前值
      this.$refs.userSelector.show(
        (result) => {
          // 回调函数：接收选择结果
          record.userid = result.userid
          record.useridname = result.useridname
        },
        { userid: record.userid, useridname: record.useridname }
      )
    },

    // 用户选择完成（保留以支持emit方式）
    handleUserSelected(result) {
      if (!this.currentSelectingNode) return

      // result结构: { userid: 'xxx,dpt_yyy', useridname: 'UserA,[DeptB]' }
      this.currentSelectingNode.userid = result.userid
      this.currentSelectingNode.useridname = result.useridname
      this.currentSelectingNode = null
    },

    /**
     * 准备提交数据（组装BatchStartFlowVO格式）
     * @returns {Object} 符合后端接口的请求参数
     */
    prepareSubmitData() {
      // 🐛 修复：过滤掉undefined节点（防御性编程）
      const validNodes = this.model.nodes.filter(node => node != null)

      if (validNodes.length === 0) {
        throw new Error('节点列表为空，无法提交')
      }

      const submitData = {
        batchId: this.model.batchId,
        dmIds: this.selectedDmIds,
        nodes: validNodes.map(node => {
          const prepared = this.prepareNodeDataForSubmit(node)
          return {
            seqno: prepared.seqno,
            nodename: prepared.nodename,
            nodetype: prepared.nodetype,
            userid: prepared.userid,
            useridname: prepared.useridname || '',
            stagename: prepared.stagename || '',
            ifgetback: prepared.ifgetback || ''
          }
        }),
        ifurgent: this.model.ifurgent,
        templateId: this.model.templateId || '',
        stagenames: this.model.stagenames || ''
      }

      // 🐛 调试日志：打印提交数据
      console.log('========== 批量启动流程提交数据 ==========')
      console.log('批次ID:', submitData.batchId)
      console.log('DM数量:', submitData.dmIds.length)
      console.log('节点总数:', submitData.nodes.length)
      console.log('节点详情:')
      submitData.nodes.forEach((node, index) => {
        console.log(`  [${index}] seqno=${node.seqno}, nodename='${node.nodename}', nodetype='${node.nodetype}', userid=${node.userid}`)
      })
      console.log('==========================================')

      return submitData
    },

    /**
     * Mock模式提交处理
     * 🔧 临时Mock数据（后端接口可用后删除此方法）
     */
    handleMockSubmit() {
      const timer = setTimeout(() => {
        this.$message.success('保存成功！')
        this.$message.warning('⚠️ 当前为Mock演示模式，请稍后查看列表更新效果', 3)

        // Mock模式：通知父组件更新数据
        const firstWorkNode = this.model.nodes.find(n => n.seqno > 0)
        if (firstWorkNode) {
          this.$emit('mock-updated', {
            dmIds: this.selectedDmIds,
            workflowStep: firstWorkNode.nodename || 'DM编写',
            workflowStatus: '1',
            workflowStatus_dictText: '流转中'
          })
        }

        this.handleCancel()
        this.$emit('ok')
      }, 500)
      this.timers.push(timer) // 🔧 P1修复：存储定时器引用
    },

    /**
     * 提交成功处理
     * @param {Object} res - 后端响应对象
     */
    handleSubmitSuccess(res) {
      console.log('🔍 [启动流程调试] 后端返回:', res)
      console.log('🔍 [启动流程调试] res.success:', res.success)

      if (res.success) {
        console.log('✅ [启动流程调试] 进入成功分支，准备发射ok事件')
        this.$message.success('保存成功！')

        // ✅ 修复：先触发事件，再关闭弹窗（确保父组件能够正确接收事件）
        this.$emit('ok')
        console.log('✅ [启动流程调试] 已发射ok事件')

        // 延迟关闭弹窗，确保事件已完全处理
        this.$nextTick(() => {
          this.handleCancel()
          console.log('✅ [启动流程调试] 弹窗已关闭')
        })
      } else {
        console.log('❌ [启动流程调试] 进入失败分支，res.message:', res.message)
        this.$message.error(res.message || '批量启动失败')
        this.confirmLoading = false
      }
    },

    /**
     * 提交失败错误处理
     * @param {Error} err - 错误对象
     */
    handleSubmitError(err) {
      console.error('批量启动流程失败', err)

      if (err.response) {
        const status = err.response.status
        if (status === 400) {
          this.$message.error('请求参数错误：' + (err.response.data.message || ''))
        } else if (status === 401) {
          this.$message.error('未登录或登录已过期，请重新登录')
        } else if (status === 500) {
          this.$message.error('服务器错误：' + (err.response.data.message || ''))
        } else {
          this.$message.error('操作失败：' + (err.message || '未知错误'))
        }
      } else if (err.request) {
        this.$message.error('网络错误，请检查网络连接')
      } else {
        this.$message.error('操作失败：' + (err.message || '未知错误'))
      }

      this.confirmLoading = false
    },

    /**
     * 提交批量启动流程（根据配置选择Mock或真实API）
     * @param {Object} params - 提交参数
     */
    submitBatchFlow(params) {
      const useMockData = false // 设置为false启用真实接口

      if (useMockData) {
        this.handleMockSubmit()
        return
      }

      // 真实接口调用
      postAction('/ietm/workflow/batchStartFlow', params)
        .then(res => this.handleSubmitSuccess(res))
        .catch(err => this.handleSubmitError(err))
    },

    // 提交（符合需求文档第十二章交互细节）
    handleOk() {
      // 1. 前端表单验证（需求文档第11.2节）
      const errors = this.validateForm()
      if (errors.length > 0) {
        this.$message.error(errors[0])
        return
      }

      // 2. 防重复提交（需求文档第12章：提交时防重复点击）
      if (this.confirmLoading) {
        return
      }
      this.confirmLoading = true

      // 3. 准备提交数据
      const params = this.prepareSubmitData()

      // 4. 提交批量启动流程
      this.submitBatchFlow(params)
    },

    // 关闭弹窗
    handleCancel() {
      this.visible = false
      this.confirmLoading = false  // 修复问题2：重置loading状态
      this.model.templateId = ''
      this.model.stagenames = ''
      this.autoMatchedTemplate = false  // 修复问题1：重置自动匹配状态
      this.resetNodes()
      this.selectedNodeKeys = []
    },

    // 前端表单验证（符合需求文档第11.2节）
    validateForm() {
      const errors = []

      // 1. 验证紧急级别
      if (!this.model.ifurgent) {
        errors.push('请选择紧急级别')
        return errors
      }

      // 2. 验证节点列表不为空
      if (!this.model.nodes || this.model.nodes.length === 0) {
        errors.push('还没有流程信息，不能保存')
        return errors
      }

      // 3. checkAllnode() 全量检查
      return this.checkAllNodes()
    },

    /**
     * 基础信息校验（检查1-2：节点列表+顺序号唯一性）
     * @param {Array} nodes - 节点列表
     * @returns {Array} 错误信息数组
     */
    validateBasicNodeInfo(nodes) {
      const errors = []

      // 检查1：节点列表不为空
      if (!nodes || nodes.length === 0) {
        errors.push('还未设置流程节点。')
        return errors
      }

      // 检查2：顺序号不能重复
      const seqnoSet = new Set()
      for (const node of nodes) {
        if (seqnoSet.has(node.seqno)) {
          errors.push('有重复的顺序号。')
          return errors
        }
        seqnoSet.add(node.seqno)
      }

      return errors
    },

    /**
     * 跳转节点规则校验（检查7的子规则）
     * @param {String|Array} ifgetback - 可跳转节点
     * @param {Number} rowNum - 行号
     * @returns {String|null} 错误信息或null
     */
    validateJumpRules(ifgetback, rowNum) {
      const ifgetbackArr = Array.isArray(ifgetback)
        ? ifgetback
        : ifgetback.split(',').map(v => v.trim())

      // 规则1：《不限制》（空字符串或__UNLIMITED__）不能和其他节点同时选
      if ((ifgetbackArr.includes('') || ifgetbackArr.includes('__UNLIMITED__')) && ifgetbackArr.length > 1) {
        return `不能保存第 ${rowNum} 行，当可跳转节点选择《不限制》时，不能再选择其它节点.`
      }

      // 规则2：《不可跳转》（-1或__NO_JUMP__）不能和其他节点同时选
      if ((ifgetbackArr.includes('-1') || ifgetbackArr.includes('__NO_JUMP__')) && ifgetbackArr.length > 1) {
        return `不能保存第 ${rowNum} 行，当可跳转节点选择《不可跳转》时，不能再选择其它节点.`
      }

      return null
    },

    /**
     * 节点数据完整性校验（检查3-7）
     * @param {Array} sortedNodes - 已排序的节点列表
     * @returns {Array} 错误信息数组
     */
    validateNodeData(sortedNodes) {
      const errors = []

      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i]
        const rowNum = i + 1

        // 检查3：处理人不能为空
        if (!node.userid || node.userid.trim() === '') {
          errors.push(`不能保存，请选择第 ${rowNum} 行的处理人.`)
          return errors
        }

        // 检查4：节点名称不能为空
        if (!node.nodename || node.nodename.trim() === '') {
          errors.push(`不能保存，请填写第 ${rowNum} 行的节点名称.`)
          return errors
        }

        // 检查5：顺序号不能为空
        if (node.seqno === null || node.seqno === undefined || node.seqno === '') {
          errors.push(`不能保存，请填写第 ${rowNum} 行的顺序号.`)
          return errors
        }

        // 检查6：处理方式不能为空
        if (!node.nodetype || node.nodetype === '') {
          errors.push(`不能保存，请选择第 ${rowNum} 行的处理方式.`)
          return errors
        }

        // 检查7：跳转节点规则
        if (node.ifgetback) {
          const jumpError = this.validateJumpRules(node.ifgetback, rowNum)
          if (jumpError) {
            errors.push(jumpError)
            return errors
          }
        }
      }

      return errors
    },

    /**
     * 分阶段流程特殊规则校验（检查8）
     * @param {Array} sortedNodes - 已排序的节点列表
     * @returns {Array} 错误信息数组
     */
    validateStageWorkflow(sortedNodes) {
      const errors = []
      const stageNames = this.model.stagenames.split(',').map(s => s.trim())

      // 🔧 修复：如果所有节点的stagename都是空，跳过阶段相关校验
      // 对齐旧系统行为：模板虽然定义了stagenames，但节点未分配阶段时，视为非分阶段流程
      const hasStageNames = sortedNodes.some(n => n.stagename && n.stagename.trim() !== '')
      if (!hasStageNames) {
        // 所有节点stagename都是空，完全跳过分阶段流程的所有校验
        console.warn('模板定义了stagenames但节点未分配阶段，按非分阶段流程处理')
        return errors  // 直接返回，不进行任何阶段相关校验
      }

      // 检查8.1：阶段与顺序号不能交叉
      const stageGroups = {}
      for (const node of sortedNodes) {
        const stage = node.stagename || '0'
        if (!stageGroups[stage]) {
          stageGroups[stage] = []
        }
        stageGroups[stage].push(node.seqno)
      }

      // 检查每个阶段的seqno是否连续（简化版，检查是否有交叉）
      for (const stage in stageGroups) {
        const seqnos = stageGroups[stage]
        const minSeq = Math.min(...seqnos)
        const maxSeq = Math.max(...seqnos)
        const expectedCount = maxSeq - minSeq + 1

        // 简化判断：如果该阶段的节点数量少于范围内应有的数量，说明有交叉
        if (seqnos.length < expectedCount) {
          // 检查是否真的有交叉（其他阶段的节点在这个范围内）
          const hasIntersection = sortedNodes.some(n => {
            return n.seqno >= minSeq && n.seqno <= maxSeq && n.stagename !== stage
          })
          if (hasIntersection) {
            errors.push('流程阶段与顺序号有交叉情况，请检查。')
            return errors
          }
        }
      }

      // 检查8.2：至少需要一个"下阶段"节点
      if (stageNames.length > 1) {
        const hasNextStage = sortedNodes.some(n => n.stagename && n.stagename !== '0')
        if (!hasNextStage) {
          errors.push('必须至少有一个下阶段的节点。')
          return errors
        }
      }

      return errors
    },

    /**
     * 全量检查所有节点（对应需求文档第11.2节 checkAllnode()）
     * @returns {Array} 错误信息数组，为空表示校验通过
     */
    checkAllNodes() {
      const errors = []
      const nodes = this.model.nodes

      // 1. 基础校验（节点列表+顺序号唯一性）
      const basicErrors = this.validateBasicNodeInfo(nodes)
      if (basicErrors.length > 0) return basicErrors

      // 2. 按seqno升序排序
      const sortedNodes = [...nodes].sort((a, b) => a.seqno - b.seqno)

      // 3. 节点数据完整性校验
      const nodeDataErrors = this.validateNodeData(sortedNodes)
      if (nodeDataErrors.length > 0) return nodeDataErrors

      // 4. 分阶段流程特殊规则校验
      if (this.isStageWorkflow && this.model.stagenames) {
        const stageErrors = this.validateStageWorkflow(sortedNodes)
        if (stageErrors.length > 0) return stageErrors
      }

      // 所有检查通过
      return errors
    },

    // 单独的validrow方法（用于节点操作时的即时校验）
    validateNode(node, rowNum) {
      if (!node.userid || node.userid.trim() === '') {
        return `请选择第 ${rowNum} 行的处理人`
      }
      if (!node.nodename || node.nodename.trim() === '') {
        return `请填写第 ${rowNum} 行的节点名称`
      }
      if (node.seqno === null || node.seqno === undefined) {
        return `请填写第 ${rowNum} 行的顺序号`
      }
      if (!node.nodetype) {
        return `请选择第 ${rowNum} 行的处理方式`
      }
      return null
    },

    // 备用校验（保持向后兼容）
    /**
     * 🔧 修复1: 获取可跳转的节点列表（对齐旧系统 + WfInstanceDtlTable.vue）
     * 对标：旧系统 IncludeInstanceAdd.jsp:465-478
     * 🐛 BUG修复：
     *   1. 使用 this.model.nodes 而不是不存在的 this.nodeList
     *   2. 使用 _rid 而不是 id（新系统节点没有id字段，只有_rid）
     *   3. 返回所有其他节点（包括创建节点seqno=0），用于可跳转节点选择
     */
    getJumpableNodes(record) {
      // 🐛 修复：返回所有其他节点（排除当前节点自己）
      return this.model.nodes.filter(n => n._rid !== record._rid)
    },

    /**
     * 🔧 修复2: 可跳转节点变更处理（互斥性校验）
     * 对标：WfInstanceDtlTable.vue onIfgetbackChange
     * 🔧 修复互斥逻辑：支持所有选项之间的流畅切换
     */
    onIfgetbackChange(record, selectedValues) {
      if (!selectedValues || selectedValues.length === 0) {
        // 用户清空了所有选择，默认设为《不限制》
        record.ifgetback = ''
        return
      }

      const UNLIMITED = '__UNLIMITED__'
      const NO_JUMP = '__NO_JUMP__'

      // 🔧 特殊处理：两个特殊选项互斥
      if (selectedValues.includes(UNLIMITED) && selectedValues.includes(NO_JUMP)) {
        // 用户在两个特殊选项之间切换
        // 判断哪个是新增的：如果当前是《不限制》，说明用户想切换到《不可跳转》
        if (record.ifgetback === '' || record.ifgetback === null) {
          record.ifgetback = '-1'  // 切换到《不可跳转》
        } else {
          record.ifgetback = ''  // 切换到《不限制》
        }
        return
      }

      // 🔧 修复：特殊选项与具体节点互斥
      if (selectedValues.includes(UNLIMITED)) {
        // 用户选择了《不限制》
        if (selectedValues.length === 1) {
          // 只选了《不限制》
          record.ifgetback = ''
        } else {
          // 《不限制》+ 具体节点：自动取消《不限制》，保留具体节点
          const nodeIds = selectedValues.filter(v => v !== UNLIMITED && v !== NO_JUMP)
          record.ifgetback = nodeIds.join(',')
        }
        return
      }

      if (selectedValues.includes(NO_JUMP)) {
        // 用户选择了《不可跳转》
        if (selectedValues.length === 1) {
          // 只选了《不可跳转》
          record.ifgetback = '-1'
        } else {
          // 《不可跳转》+ 具体节点：自动取消《不可跳转》，保留具体节点
          const nodeIds = selectedValues.filter(v => v !== UNLIMITED && v !== NO_JUMP)
          record.ifgetback = nodeIds.join(',')
        }
        return
      }

      // 只有具体节点，没有特殊选项
      const nodeIds = selectedValues.filter(v => v !== UNLIMITED && v !== NO_JUMP)
      record.ifgetback = nodeIds.join(',')
    },

    /**
     * 🔧 修复3: 解析ifgetback字段（数据库→UI）
     * 对标：WfInstanceDtlTable.vue:618-628
     */
    parseIfgetback(value) {
      if (!value || value === '') return ['__UNLIMITED__']
      if (value === '-1') return ['__NO_JUMP__'] // 后端格式：-1
      if (value === '__NO_JUMP__') return ['__NO_JUMP__'] // UI格式残留（防御性）
      if (value === '__UNLIMITED__') return ['__UNLIMITED__'] // UI格式残留（防御性）

      // 其他情况：逗号分隔的节点ID列表
      return value.split(',').map(v => v.trim()).filter(v => v)
    },

    /**
     * 🔧 修复4: 提交前转换（防御性编程）
     * 正常情况下，onIfgetbackChange已将数据转换为后端格式
     * 此方法用于防御性处理可能残留的UI格式标记
     */
    prepareNodeDataForSubmit(node) {
      const prepared = { ...node }

      // 防御性转换：万一有UI格式标记残留，转换为后端格式
      if (prepared.ifgetback === '__UNLIMITED__') {
        prepared.ifgetback = ''
      } else if (prepared.ifgetback === '__NO_JUMP__') {
        prepared.ifgetback = '-1'
      }
      // 其他情况：已是后端格式（空字符串/-1/节点ID列表），保持不变

      return prepared
    },

    /**
     * 🔧 修复5: 格式化显示（非编辑态）
     * 对标：WfInstanceDtlTable.vue:616-628
     */
  },

  /**
   * 🔧 P1修复：组件销毁时清理资源
   * 解决内存泄漏风险
   */
  beforeDestroy() {
    // 1. 清理所有定时器
    if (this.timers && this.timers.length > 0) {
      this.timers.forEach(timer => clearTimeout(timer))
      this.timers = []
    }

    // 2. 重置加载状态（防止幽灵更新）
    this.visible = false
    this.confirmLoading = false
    this.templateLoading = false

    // 3. 清空数据（释放内存）
    this.model.nodes = []
    this.templateList = []
    this.selectedDmIds = []
    this.internalSelectedRecords = []

    // 🎯 P3-2优化：开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.log('[BatchStartFlowModal] 组件销毁，资源已清理')
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
