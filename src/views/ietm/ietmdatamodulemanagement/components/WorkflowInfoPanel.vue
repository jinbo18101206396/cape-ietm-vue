<template>
  <div class="workflow-info-panel">
    <!-- 工具栏 - 左对齐均匀分布 -->
    <div class="wf-toolbar">
      <div class="toolbar-left">
        <span class="wf-title">{{ legend }}</span>
      </div>

      <div class="toolbar-center">
        <a-button-group size="small">
          <a-button icon="reload" @click="refreshAll">刷新</a-button>

          <template v-if="canEditNodes">
            <a-button icon="plus" @click="handleInsertNode">新增</a-button>
            <a-button icon="delete" :disabled="!canDeleteSelectedNode" @click="handleDeleteNode">删除</a-button>
            <a-button icon="save" :disabled="!canSaveNodes" @click="handleSaveNodes">保存</a-button>
          </template>
        </a-button-group>

        <a-button-group v-if="hasGetbackNode || hasAddOpinionableNode" size="small">
          <a-button v-if="hasGetbackNode" icon="rollback" :disabled="!canTakeBackSelected" @click="handleTakeBack">拿回</a-button>
          <a-button v-if="hasAddOpinionableNode" icon="edit" @click="showAddOpinionModal">追加意见</a-button>
        </a-button-group>
      </div>

      <div v-if="instance" class="toolbar-right">
        <span class="urgent-label">紧急：</span>
        <a-select
          :value="urgent"
          size="small"
          style="width: 90px"
          :disabled="instOver"
          @change="handleUrgentChange"
        >
          <a-select-option value="1">一般</a-select-option>
          <a-select-option value="2">★紧急</a-select-option>
          <a-select-option value="3">★★特急</a-select-option>
        </a-select>
      </div>
    </div>

    <!-- 节点列表 -->
    <div class="wf-table">
      <wf-instance-dtl-table
        ref="dtlTable"
        :instance-id="instanceId"
        :instance="instance"
        :todo-dtl-id="todoDtlId"
        :readonly="readonly"
        :can-edit-nodes="canEditNodes"
        :stage-users="stageUsers"
        :stage-execution-status="stageExecutionStatus"
        :current-user-stage="currentUserStage"
        :is-stage-leader="isStageLeader"
        :is-stage-first-leader="isStageFirstLeader"
        @select="handleNodeSelect"
        @nodes-loaded="handleNodesLoaded"
        @before-insert-node="(e) => $emit('before-insert-node', e)"
        @before-delete-node="(e) => $emit('before-delete-node', e)"
        @before-save-node="(e) => $emit('before-save-node', e)"
      />
    </div>

    <!-- 处理表单 - 紧凑布局 -->
    <div class="wf-form" v-if="showExecForm">
      <div class="form-header">
        <span class="form-title">{{ execLegend }}</span>
        <a-tag v-if="isLastTodo" color="red" size="small">
          <a-icon type="warning" /> 最后节点
        </a-tag>
      </div>

      <div class="form-content">
        <div class="form-row">
          <span class="form-label">处理方式</span>
          <a-radio-group v-model="form.ifpass" size="small" @change="onIfpassChange">
            <a-radio value="1">通过</a-radio>
            <a-radio value="2">发表不同意见</a-radio>
            <a-radio value="9" v-if="isCreator">流程终止</a-radio>
            <a-radio value="3">跳转</a-radio>
          </a-radio-group>
          <a-select
            v-if="form.ifpass === '3'"
            :value="form.targetDtlid"
            size="small"
            style="width: 140px"
            placeholder="选择节点"
            @change="v => form.targetDtlid = v"
          >
            <a-select-option v-for="n in jumpTargets" :key="n.id" :value="n.id">
              {{ n.nodename }}
            </a-select-option>
          </a-select>
        </div>

        <div class="form-row">
          <span class="form-label">处理意见</span>
          <a-textarea
            v-model="form.opinion"
            placeholder="请填写处理意见（最多500字）"
            :rows="2"
            :maxLength="500"
            show-count
            size="small"
          />
          <div class="form-actions">
            <!-- 🔴 问题11修复：临时隐藏附件按钮 -->
            <a-upload
              v-if="false"
              :file-list="fileList"
              :before-upload="beforeUpload"
              @remove="handleFileRemove"
            >
              <a-button size="small" icon="paper-clip">附件</a-button>
            </a-upload>
            <a-button
              type="primary"
              size="small"
              :loading="submitting"
              @click="handleSubmit"
            >
              提交
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 追加意见弹窗 -->
    <a-modal
      v-model="addOpinionModalVisible"
      title="追加意见"
      :width="600"
      @ok="handleAddOpinionSubmit"
      @cancel="handleAddOpinionCancel"
    >
      <a-form-model layout="vertical">
        <a-form-model-item label="选中节点">
          <a-input
            :value="selectedNode ? selectedNode.nodename : '未选中'"
            disabled
          />
        </a-form-model-item>
        <a-form-model-item label="追加意见">
          <a-textarea
            v-model="addOpinionText"
            placeholder="请填写追加意见（最多500字）"
            :rows="4"
            :maxLength="500"
            show-count
          />
        </a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>

<script>
import { getAction, postAction, uploadAction } from '@/api/manage'
import WfInstanceDtlTable from './workflow/WfInstanceDtlTable.vue'

export default {
  name: 'WorkflowInfoPanel',
  components: { WfInstanceDtlTable },
  props: {
    formid: {
      type: String,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    },
    // P3-2: 提交处理后自动关闭/返回（还原旧系统 closeafterexec 参数）
    closeafterexec: {
      type: [String, Boolean],
      default: false
    },
    // P3-3: 重启流程参数（还原旧系统 restartflow 参数）
    // 当流程结束后，允许编制人重新编辑节点并重启流程
    restartflow: {
      type: [String, Boolean],
      default: false
    },
    // 🔴 P0-X: DM签出用户（用于校验签出状态，对齐旧系统）
    checkoutUser: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      instance: null, // 流程实例（getByFormid 单条）
      urgent: '1', // 紧急程度（下拉绑定）
      todoNode: null, // 当前登录用户的待办节点（getTodo）
      nodes: [], // 全部节点（跳转目标候选 + 最后节点判断）
      selectedNode: null, // 当前选中的节点（追加意见/拿回作用对象）
      addOpinionText: '', // 追加意见输入
      addOpinionModalVisible: false, // 🔧 方案A：追加意见弹窗显示状态

      // 处理表单
      form: {
        ifpass: '1',
        targetDtlid: undefined,
        opinion: ''
      },
      fileList: [],
      submitting: false,

      // 🔧 优化1：缓存分阶段计算结果，避免重复计算
      _stageUsersCache: null,
      _stageStatusCache: null,
      _nodesVersion: 0 // 节点版本号，用于缓存失效
    }
  },
  computed: {
    // 当前登录用户（还原旧 currUserid / currUsername）
    currentUserId() {
      const u = this.$store.getters.userInfo
      return u ? u.id : null
    },
    currentUsername() {
      const u = this.$store.getters.userInfo
      return u ? u.username : null
    },
    instanceId() {
      return this.instance ? this.instance.id : null
    },
    // 流程是否已结束/终止（还原旧 instover）
    instOver() {
      return this.instance && (this.instance.status === '2' || this.instance.status === '9')
    },
    // ✅ P1-4: 是否分阶段（还原旧 existstage 判断，对齐旧系统 Line 226-229）
    existStage() {
      if (!this.instance || !this.instance.stagenames) return false
      const s = this.instance.stagenames
      // 只设置一个阶段时视为无阶段
      return !!(s && s.indexOf(',') > -1)
    },
    // 编制人（还原旧 createdBy）：实例创建人 == 当前登录用户（id 或用户名）
    isCreator() {
      if (!this.instance) return false
      const by = this.instance.createBy
      return !!by && (by === this.currentUserId || by === this.currentUsername)
    },
    // 是否命中待办（还原旧 getTodo 命中）
    hasTodo() {
      return !!this.todoNode
    },
    // 工具栏图例（还原旧 instlegend：【编辑流程[审批中]】）
    // 编制人或待办人可编辑，与 DM 浏览/编辑模式无关（对齐旧系统）
    legend() {
      const canEdit = (this.isCreator || this.hasTodo) && !this.instOver
      const base = canEdit ? '编辑流程' : '查看流程'
      return '【' + base + this.statusLabel + '】'
    },
    statusLabel() {
      const map = { '0': '[创建]', '1': '[审批中]', '2': '[完成]', '9': '[终止]' }
      return this.instance ? (map[this.instance.status] || '') : ''
    },
    // 是否显示 south 处理表单（还原旧 getTodo 逻辑）：命中待办且流程未结束
    // 与 DM 浏览/编辑模式无关（对齐旧系统 execform 显隐仅由 getTodo 决定）
    showExecForm() {
      return !!this.todoNode && !this.instOver
    },
    // 待办节点ID（供子表高亮）
    todoDtlId() {
      return this.todoNode ? this.todoNode.id : null
    },
    // south 图例（还原旧 execlegend：【处理人 >> 节点名】）
    execLegend() {
      if (!this.todoNode) return ''
      const who = this.todoNode.useridname || this.todoNode.useridAlias || ''
      return '【' + who + ' >> ' + (this.todoNode.nodename || '') + '】'
    },
    // 跳转目标候选（排除待办节点自身）
    // 🔴 遗漏15修复：根据ifgetback字段过滤可跳转节点（还原旧系统 Line 251-270）
    jumpTargets() {
      if (!this.todoNode) return []

      const getback = this.todoNode.ifgetback
      let candidates = this.nodes.filter(n => n.id !== this.todoNode.id)

      // 根据ifgetback过滤
      if (getback === '-1') {
        // 不可跳转
        return []
      } else if (getback && getback !== '' && getback !== null) {
        // 只能跳转到指定节点
        const allowedIds = getback.split(',').map(id => id.trim()).filter(id => id)
        candidates = candidates.filter(n =>
          allowedIds.includes(n.id) ||
          allowedIds.includes(n.id.toString()) ||
          allowedIds.includes('0') && n.seqno === 0 // 0代表创建节点
        )
      }
      // else: 不限制，返回全部候选节点

      return candidates
    },
    // 待办是否为最后一个节点（还原旧 lastnodenote）
    isLastTodo() {
      if (!this.todoNode || this.nodes.length === 0) return false
      const last = this.nodes[this.nodes.length - 1]
      return last && last.id === this.todoNode.id
    },
    // 是否允许编辑节点（还原旧 iscreator：编制人 或 待办人，且流程未结束）
    // P3-3: 支持 restartflow 参数，允许流程结束后编制人重新编辑节点
    // 与 DM 浏览/编辑模式无关（对齐旧系统 td[id^=tdNode] 显隐仅由 iscreator/getTodo 决定）
    canEditNodes() {
      // 正常情况：编制人或待办人，且流程未结束
      if ((this.isCreator || this.hasTodo) && !this.instOver) return true
      // restartflow模式：流程结束后，编制人仍可编辑节点（还原旧系统 Line 288-290, 774）
      if ((this.restartflow === '1' || this.restartflow === true) && this.isCreator) return true
      return false
    },
    // P2-3: 是否有可拿回的节点（还原旧系统拿回按钮动态显隐逻辑）
    // 检查是否存在自己已通过（ifexec=Y）且是自己处理的节点
    // 🔧 优化2：使用提取的方法简化判断
    hasGetbackNode() {
      if (this.instOver || !this.nodes || this.nodes.length === 0) return false
      return this.nodes.some(node => node.ifexec === 'Y' && this.isCurrentUserNode(node))
    },
    // 🔧 Issue-4修复: 是否有可追加意见的节点
    // 只有存在【已处理】且【非创建节点】且【处理人为自己】的节点时才显示"保存意见"按钮
    // 🔧 优化2：使用提取的方法简化判断
    hasAddOpinionableNode() {
      if (!this.instance || this.instOver) return false
      if (!this.nodes || this.nodes.length === 0) return false

      return this.nodes.some(node => {
        // 必须已处理
        if (node.ifexec !== 'Y') return false
        // 不能是创建节点
        if (node.seqno === 0 || node.seqno === '0') return false
        // 必须是自己处理的
        return this.isCurrentUserNode(node)
      })
    },
    // 🔧 Issue-3修复: 当前选中节点是否可删除（工具栏按钮禁用状态）
    canDeleteSelectedNode() {
      if (!this.selectedNode) return false
      // 已处理/跳过节点不能删
      if (this.selectedNode.ifexec === 'Y' || this.selectedNode.ifexec === 'J') return false
      // 待办节点不能删
      if (this.todoNode && this.todoNode.id === this.selectedNode.id) return false
      // 后续有已处理节点不能删
      const idx = this.nodes.findIndex(n => n.id === this.selectedNode.id)
      if (idx !== -1) {
        const hasProcessedAfter = this.nodes
          .slice(idx + 1)
          .some(n => n.ifexec === 'Y' || n.ifexec === 'J')
        if (hasProcessedAfter) return false
      }
      return true
    },
    // 🔴 问题5修复: 是否有未保存的节点编辑（工具栏"保存"按钮禁用状态）
    canSaveNodes() {
      // 检查子表是否有编辑中的行
      return this.$refs.dtlTable && this.$refs.dtlTable.hasUnsavedChanges()
    },
    // 🔧 优化2：使用提取的方法简化判断
    canTakeBackSelected() {
      if (!this.selectedNode) return false
      if (this.selectedNode.ifexec !== 'Y') return false
      return this.isCurrentUserNode(this.selectedNode)
    },

    // ═══════════════════════════════════════════════════════════════
    // 🔴 B1修复: 分阶段权限逻辑（对齐旧系统 Line 178-268）
    // 🔧 优化1：添加缓存机制，避免重复计算
    // ═══════════════════════════════════════════════════════════════

    // 各阶段的第一处理人 [{stage: '0', user: 'xxx', seqno: 1}, ...]
    // 🔴 缺陷6修复：过滤创建节点，避免空stagename污染stageUsers
    stageUsers() {
      if (!this.existStage || !this.nodes || this.nodes.length === 0) return []

      // 缓存机制：nodes 未变化时复用缓存
      if (this._stageUsersCache && this._nodesVersion === this.nodes.length) {
        return this._stageUsersCache
      }

      const users = []
      const seen = new Set()

      this.nodes.forEach(node => {
        // ✅ 跳过创建节点(seqno=0)，其stagename通常为空
        if (node.seqno === 0 || node.seqno === '0') return

        const stage = node.stagename
        if (stage != null && stage !== '' && !seen.has(stage)) {
          seen.add(stage)
          users.push({
            stage: stage,
            user: node.userid,
            seqno: node.seqno
          })
        }
      })

      // 按阶段排序
      const sorted = users.sort((a, b) => {
        const stageA = parseInt(a.stage) || 0
        const stageB = parseInt(b.stage) || 0
        return stageA - stageB
      })

      // 更新缓存
      this._stageUsersCache = sorted
      return sorted
    },

    // 各阶段的执行状态 [{stage: '0', ifexec: 'N'/'Y'}, ...]
    stageExecutionStatus() {
      if (!this.existStage || !this.nodes || this.nodes.length === 0) return []

      // 缓存机制：nodes 未变化时复用缓存
      if (this._stageStatusCache && this._nodesVersion === this.nodes.length) {
        return this._stageStatusCache
      }

      const status = []
      const stages = new Set(this.nodes.map(n => n.stagename).filter(s => s != null && s !== ''))

      stages.forEach(stage => {
        const stageNodes = this.nodes.filter(n => n.stagename === stage)
        const allExecuted = stageNodes.length > 0 && stageNodes.every(n => n.ifexec === 'Y')
        status.push({
          stage: stage,
          ifexec: allExecuted ? 'Y' : 'N'
        })
      })

      // 更新缓存
      this._stageStatusCache = status
      return status
    },

    // 当前用户所在阶段（对齐旧系统globalNowstage计算逻辑）
    // 🔴 问题1修复：改为遍历所有节点，任何节点处理人都能获得阶段
    // 🔴 缺陷1修复：过滤创建节点(seqno=0)，其stagename通常为空
    currentUserStage() {
      if (!this.existStage || !this.nodes || this.nodes.length === 0) return null

      // ✅ 遍历所有节点，找到当前用户是处理人的节点
      // 对齐旧系统 IncludeWfInstanceExec.jsp Line 234-236, Line 430
      const found = this.nodes.find(node => {
        // 跳过创建节点(seqno=0)，对齐旧系统特殊处理
        if (node.seqno === 0 || node.seqno === '0') return false

        if (!node.userid) return false
        const users = node.userid.split(',').map(u => u.trim()).filter(u => u)
        return users.includes(this.currentUserId) || users.includes(this.currentUsername)
      })

      return found ? found.stagename : null  // ✅ 返回该节点的阶段
    },

    // 当前用户是否有阶段权限（即是否是某节点的处理人）
    // 🔴 问题1修复：语义调整 - 不再限制必须是"阶段第一处理人"
    // 只要是某节点的处理人，就有阶段权限（可新增节点等）
    isStageLeader() {
      return this.currentUserStage != null
    },

    // 🔴 问题2修复：当前用户是否是阶段第一处理人（对齐旧系统stageuser检查）
    // 用于删除节点等需要严格限制为"第一处理人"的场景
    isStageFirstLeader() {
      if (!this.existStage || !this.stageUsers || this.stageUsers.length === 0) return false

      const found = this.stageUsers.find(s => {
        if (!s.user) return false
        const users = s.user.split(',').map(u => u.trim()).filter(u => u)
        return users.includes(this.currentUserId) || users.includes(this.currentUsername)
      })

      return !!found
    },

    // 当前阶段是否已结束
    isCurrentStageFinished() {
      if (!this.existStage || !this.currentUserStage) return false

      const status = this.stageExecutionStatus.find(s => s.stage === this.currentUserStage)
      return status ? status.ifexec === 'Y' : false
    }
  },
  watch: {
    formid: {
      immediate: true,
      handler(val) {
        if (val) {
          this.loadInstance()
        } else {
          this.instance = null
          this.todoNode = null
        }
      }
    }
  },
  methods: {
    // 🔧 优化2：提取处理人检查逻辑，避免重复代码
    isCurrentUserNode(node) {
      if (!node || !node.userid) return false
      const userids = node.userid.split(',').map(u => u.trim()).filter(u => u)
      return userids.includes(this.currentUserId) || userids.includes(this.currentUsername)
    },

    // P3-1: 钩子命名兼容（同时支持kebab-case和驼峰命名）
    // 旧系统使用驼峰命名（parent.beforeInsertnode），新系统使用kebab-case（@before-insert-node）
    emitCompat(kebabName, camelName, payload) {
      // 发射kebab-case事件（新系统）
      let result = this.$emit(kebabName, payload)
      // 同时检查父组件是否有旧系统的驼峰命名钩子（通过window.parent访问）
      if (typeof window.parent[camelName] === 'function') {
        const oldResult = window.parent[camelName](payload)
        // 如果旧钩子返回false，则阻止操作
        if (oldResult === false) result = false
      }
      return result
    },

    // 加载实例 + 待办（还原旧 getTodo + 主表加载）
    async loadInstance() {
      if (!this.formid) return
      console.log('[WorkflowInfoPanel] loadInstance - formid:', this.formid)
      try {
        const [instRes, todoRes] = await Promise.all([
          getAction('/ietm/workflow/instance/getByFormid', { formid: this.formid }),
          getAction('/ietm/workflow/instance/getTodo', { formid: this.formid })
        ])

        console.log('[WorkflowInfoPanel] getByFormid响应:', instRes)
        console.log('[WorkflowInfoPanel] getTodo响应:', todoRes)

        this.instance = (instRes.success && instRes.result) ? instRes.result : null
        this.urgent = this.instance ? (this.instance.ifurgent || '1') : '1'
        this.todoNode = (todoRes.success && todoRes.result) ? todoRes.result : null

        console.log('[WorkflowInfoPanel] instance已设置:', this.instance)
        console.log('[WorkflowInfoPanel] todoNode已设置:', this.todoNode)

        if (!this.todoNode) {
          console.warn('[WorkflowInfoPanel] ⚠️ todoNode为空 - 处理表单将不显示')
        }

        // 有待办时预置提交表单 instdtlid
        this.resetForm()
      } catch (e) {
        console.error('[WorkflowInfoPanel] 加载失败:', e)
        this.handleError(e, '加载流程信息')  // ✅ P1-3修复
      }
    },

    // 刷新全部（实例/待办/节点表）
    async refreshAll() {
      await this.loadInstance()
      if (this.$refs.dtlTable) {
        await this.$refs.dtlTable.refresh()
      }
      this.selectedNode = null // P1-4修复：刷新后清空选中状态
    },

    handleNodeSelect(record) {
      this.selectedNode = record
      // 🟠 遗漏9修复：切换节点时清空追加意见输入框
      this.addOpinionText = ''
    },

    handleNodesLoaded(nodes) {
      this.nodes = nodes || []
      // 🔧 优化1：节点变化时清空缓存
      this._nodesVersion = this.nodes.length
      this._stageUsersCache = null
      this._stageStatusCache = null
    },

    // 新增节点（转调子表）
    handleInsertNode() {
      this.$refs.dtlTable && this.$refs.dtlTable.insertNode()
    },

    // 删除节点（还原旧 delnode）
    // 🔧 Issue-3修复: 直接调用子表 deleteRow 方法，复用完整校验逻辑（包括后续节点已处理检查）
    handleDeleteNode() {
      if (!this.selectedNode) {
        this.$message.warning('请选择一个要删除的节点')
        return
      }

      // 🟠 I1修复：删除确认文案优化，包含警告和节点名称（对齐旧系统 Line 1020）
      this.$confirm({
        title: '提示',
        content: `删除的数据不能恢复，确定删除节点【${this.selectedNode.nodename || ''}】？`,
        onOk: () => {
          // 调用子表的 deleteRow，该方法包含完整的校验逻辑
          this.$refs.dtlTable && this.$refs.dtlTable.deleteRow(this.selectedNode)
        }
      })
    },

    // 保存节点（还原旧 savenode）
    handleSaveNodes() {
      this.$refs.dtlTable && this.$refs.dtlTable.saveAllChanges()
    },

    // 紧急程度即时更新（还原旧 ifurgent combobox）
    async handleUrgentChange(val) {
      // P3修复：流程已结束时拦截
      if (this.instOver) {
        this.$message.warning('流程已结束，不能修改紧急程度')
        this.urgent = this.instance.ifurgent  // 恢复原值
        return
      }

      this.urgent = val
      try {
        const url = `/ietm/workflow/instance/updateUrgent?id=${encodeURIComponent(this.instance.id)}&ifurgent=${encodeURIComponent(val)}`
        const res = await postAction(url)
        if (res.success) {
          this.$message.success('紧急程度已更新')
          this.instance.ifurgent = val
        } else {
          this.$message.error(res.message || '更新失败')
        }
      } catch (e) {
        this.handleError(e, '更新紧急程度')  // ✅ P1-3修复
      }
    },

    // 🔧 方案A：显示追加意见弹窗
    showAddOpinionModal() {
      if (!this.selectedNode) {
        this.$message.warning('请先选择一个节点')
        return
      }
      if (this.selectedNode.ifexec !== 'Y') {
        this.$message.warning('只能对已处理的节点追加意见')
        return
      }
      if (this.selectedNode.seqno === 0 || this.selectedNode.seqno === '0') {
        this.$message.warning('创建节点不能追加意见！')
        return
      }
      if (!this.isCurrentUserNode(this.selectedNode)) {
        this.$message.warning('请选择一个处理人为自己的节点！')
        return
      }
      this.addOpinionText = ''
      this.addOpinionModalVisible = true
    },

    // 🔧 方案A：提交追加意见
    async handleAddOpinionSubmit() {
      const opinion = (this.addOpinionText || '').trim()
      if (!opinion) {
        this.$message.warning('请填写追加意见')
        return
      }
      try {
        const url = `/ietm/workflow/execute/addOpinion?instdtlid=${encodeURIComponent(this.selectedNode.id)}&opinion=${encodeURIComponent(opinion)}`
        const res = await postAction(url)
        if (res.success) {
          this.$message.success('追加意见成功')
          this.addOpinionModalVisible = false
          this.addOpinionText = ''
          this.refreshAll()
        } else {
          this.$message.error(res.message || '追加意见失败')
        }
      } catch (e) {
        this.handleError(e, '追加意见')  // ✅ P1-3修复
      }
    },

    // 🔧 方案A：取消追加意见
    handleAddOpinionCancel() {
      this.addOpinionText = ''
      this.addOpinionModalVisible = false
    },

    // 追加意见（还原旧 saveAddopinion）：选中已处理节点
    // 🔧 方案A：此方法已被弹窗替代，保留用于兼容
    async handleAddOpinion() {
      if (!this.selectedNode) {
        this.$message.warning('请选择一个要追加意见的节点')
        return
      }
      if (this.selectedNode.ifexec !== 'Y') {
        this.$message.warning('只能对已处理的节点追加意见')
        return
      }

      // ✅ P1-3: 创建节点不能追加意见（对齐旧系统 Line 1376-1381）
      if (this.selectedNode.seqno === 0 || this.selectedNode.seqno === '0') {
        this.$message.warning('创建节点不能追加意见！')
        return
      }

      // ✅ P1-2: 检查处理人为自己（对齐旧系统 Line 1369-1373）
      // 🔧 优化2：使用提取的方法
      if (!this.isCurrentUserNode(this.selectedNode)) {
        this.$message.warning('请选择一个处理人为自己的节点！')
        return
      }

      const opinion = (this.addOpinionText || '').trim()
      if (!opinion) {
        this.$message.warning('请填写追加意见')
        return
      }
      try {
        const url = `/ietm/workflow/execute/addOpinion?instdtlid=${encodeURIComponent(this.selectedNode.id)}&opinion=${encodeURIComponent(opinion)}`
        const res = await postAction(url)
        if (res.success) {
          this.$message.success('追加意见成功')
          this.addOpinionText = ''
          this.refreshAll()
        } else {
          this.$message.error(res.message || '追加意见失败')
        }
      } catch (e) {
        this.handleError(e, '追加意见')  // ✅ P1-3修复
      }
    },

    // 拿回（还原旧 getBack）：选中自己已通过的节点
    handleTakeBack() {
      if (!this.selectedNode) {
        this.$message.warning('请选择要拿回的节点')
        return
      }

      // 🟠 遗漏10修复：检查节点是否仍存在
      const exists = this.nodes.some(n => n.id === this.selectedNode.id)
      if (!exists) {
        this.$message.error('选中的节点已被删除，请刷新后重试')
        this.selectedNode = null
        return
      }

      if (this.selectedNode.ifexec !== 'Y') {
        this.$message.warning('只能拿回已处理的节点')
        return
      }

      // P2修复：检查是否为自己处理的节点
      // 🔧 优化2：使用提取的方法
      if (!this.isCurrentUserNode(this.selectedNode)) {
        this.$message.warning('只能拿回自己处理的节点！')
        return
      }
      this.$confirm({
        title: '提示',
        content: '你已经处理完毕了，确定要拿回以重新处理？',
        onOk: async () => {
          try {
            // 🔴 修复：保存节点ID，因为refreshAll()会清空selectedNode
            const nodeId = this.selectedNode.id
            const instId = this.instance.id

            const url = `/ietm/workflow/execute/takeBack?instdtlid=${encodeURIComponent(nodeId)}`
            const res = await postAction(url)
            if (res.success) {
              this.$message.success('拿回成功')
              // 🔴 修复：等待刷新完成后再触发钩子，确保"处理情况"已清空
              await this.refreshAll()

              // P3-1: 拿回成功后钩子（兼容旧系统 parent.afterGetBackSuccess 和新系统 @after-get-back）
              const payload = {
                instdtlid: nodeId,
                instid: instId
              }
              this.emitCompat('after-get-back', 'afterGetBackSuccess', payload)
            } else {
              this.$message.error(res.message || '拿回失败')
            }
          } catch (e) {
            this.handleError(e, '拿回')  // ✅ P1-3修复
          }
        }
      })
    },
    // ── south 处理表单 ──
    onIfpassChange() {
      if (this.form.ifpass !== '3') {
        this.form.targetDtlid = undefined
      }
    },

    beforeUpload(file) {
      // 🔴 遗漏32修复：附件类型和大小校验（还原旧系统 Line 430-440）
      const allowedExts = ['doc', 'docx', 'pdf', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'zip', 'rar', '7z']
      const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase()

      if (!allowedExts.includes(ext)) {
        this.$message.error('只允许上传文档、图片、压缩包！')
        return false
      }

      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        this.$message.error('文件大小不能超过50MB！')
        return false
      }

      this.fileList = [file] // 单附件（还原旧 upfile）
      return false // 阻止自动上传，提交时随 FormData 一起发
    },

    handleFileRemove() {
      this.fileList = []
    },

    // 提交处理（还原旧 saveExecute + submitexec 的前端校验）
    handleSubmit() {
      // 🔴 新增：调试日志 - 排查404问题
      console.log('[WorkflowInfoPanel] 提交处理 - 开始')
      console.log('[WorkflowInfoPanel] instance:', this.instance)
      console.log('[WorkflowInfoPanel] todoNode:', this.todoNode)
      console.log('[WorkflowInfoPanel] formid:', this.formid)

      // 🔴 新增：校验todoNode是否存在（防止404）
      if (!this.todoNode) {
        console.error('[WorkflowInfoPanel] todoNode为null，无法提交')
        this.$message.error('未找到待办任务！请确认：1）流程已启动 2）您是当前节点的处理人 3）节点未被处理。请刷新页面后重试。')
        return
      }
      if (!this.todoNode.id) {
        console.error('[WorkflowInfoPanel] todoNode.id为空:', this.todoNode)
        this.$message.error('待办任务数据异常（缺少节点ID），请联系管理员检查数据')
        return
      }

      // 🔴 P0-X: 签出状态校验（对齐旧系统：该DM还是签出状态,请签入后再提交后续流程处理）
      if (this.checkoutUser) {
        this.$message.warning('该DM还是签出状态,请签入后再提交后续流程处理。')
        return
      }

      // P0-19: 提交前钩子 - beforeSubmit
      // 允许父组件阻止提交（返回false）
      // P3-1: 触发钩子（兼容旧系统 parent.beforeExec 和新系统 @before-submit）
      const canSubmit = this.emitCompat('before-submit', 'beforeExec') !== false
      if (!canSubmit) {
        this.$message.warning('提交前校验未通过')
        return
      }

      const { ifpass, targetDtlid, opinion } = this.form
      const op = (opinion || '').trim()

      // 校验（还原旧规则）
      if (ifpass === '2') {
        if (!op) { this.$message.warning('请发表你的不同意见'); return }
        if (op === '同意') { this.$message.warning('发表不同意见时，意见还是"同意"？'); return }
      } else if (ifpass === '3') {
        if (!targetDtlid) { this.$message.warning('请选择要跳转至的节点'); return }
        if (targetDtlid === this.todoNode.id) { this.$message.warning('要跳转至的节点正在处理，不用跳转'); return }
        if (!op) { this.$message.warning('请说明退回或跳过的原因'); return }
      } else if (ifpass === '9') {
        if (!op) { this.$message.warning('请说明流程终止的原因'); return }
      }

      // 跳转/终止需二次确认（还原旧 confirm）
      if (ifpass === '3') {
        const t = this.jumpTargets.find(n => n.id === targetDtlid)
        this.$confirm({
          title: '提示',
          content: '跳转后将不能拿回，真的确定要跳转至【' + (t ? t.nodename : '') + '】节点？',
          onOk: () => this.doSubmit()
        })
      } else if (ifpass === '9') {
        this.$confirm({
          title: '提示',
          content: '流程终止后将无法恢复，确定要终止流程？',
          onOk: () => this.doSubmit()
        })
      } else {
        this.doSubmit()
      }
    },

    async doSubmit() {
      console.log('[WorkflowInfoPanel] doSubmit - 执行提交')
      this.submitting = true
      try {
        // ✅ P0-3: 提交处理前先保存节点（对齐旧系统 Line 1267）
        if (this.$refs.dtlTable) {
          const hasChanges = this.$refs.dtlTable.hasUnsavedChanges()
          if (hasChanges) {
            try {
              await this.$refs.dtlTable.saveAllChanges()
              // 等待保存完成（避免竞态）
              await new Promise(resolve => setTimeout(resolve, 500))
            } catch (e) {
              this.$message.error('保存节点失败：' + e.message)
              this.submitting = false
              return
            }
          }
        }

        const fd = new FormData()

        // 🔴 新增：构建请求参数前再次校验
        console.log('[WorkflowInfoPanel] 构建FormData - todoNode.id:', this.todoNode.id)
        console.log('[WorkflowInfoPanel] 构建FormData - ifpass:', this.form.ifpass)

        fd.append('instdtlid', this.todoNode.id)
        fd.append('ifpass', this.form.ifpass)
        if (this.form.ifpass === '3' && this.form.targetDtlid) {
          fd.append('targetDtlid', this.form.targetDtlid)

          // ✅ P1-5: 跳转时自动添加"[第X次退回]"或"跳过"前缀（对齐旧系统 Line 1273-1289）
          const todoIdx = this.nodes.findIndex(n => n.id === this.todoNode.id)
          const targetIdx = this.nodes.findIndex(n => n.id === this.form.targetDtlid)
          const isReturn = todoIdx !== -1 && targetIdx !== -1 && todoIdx > targetIdx

          // 计算当前最大退回次数（借用ifjump字段）
          const maxIfjump = Math.max(0, ...this.nodes.map(n => parseInt(n.ifjump || 0, 10)))
          const returnNo = maxIfjump + 1

          // 构造意见前缀
          const typePrefix = isReturn ? `[第${returnNo}次退回]` : '跳过'
          const targetNode = this.nodes.find(n => n.id === this.form.targetDtlid)
          const targetName = targetNode ? targetNode.nodename : ''
          const opinionPrefix = `${typePrefix}到节点"${targetName}"`
          const userOpinion = (this.form.opinion || '').trim()
          const finalOpinion = userOpinion ? `${opinionPrefix},${userOpinion}` : opinionPrefix

          // 覆盖原意见
          fd.delete('opinion')
          fd.append('opinion', finalOpinion)
        } else if (this.form.opinion) {
          fd.append('opinion', this.form.opinion)
        }
        if (this.fileList.length > 0) fd.append('file', this.fileList[0])

        // 🔴 新增：打印FormData内容用于调试
        console.log('[WorkflowInfoPanel] 即将提交，FormData内容:')
        for (let pair of fd.entries()) {
          console.log('  ' + pair[0] + ':', pair[1])
        }
        console.log('[WorkflowInfoPanel] 请求URL: /ietm/workflow/execute/submit')

        const res = await uploadAction('/ietm/workflow/execute/submit', fd)

        console.log('[WorkflowInfoPanel] 提交响应:', res)

        if (res.success) {
          this.$message.success('成功处理！')
          this.resetForm() // P0-1修复：提交成功后清空表单和附件
          this.refreshAll()

          // P3-1: 提交成功后钩子（兼容旧系统 parent.afterSubmitSuccess 和新系统 @after-submit-success）
          const payload = {
            instid: this.instance.id,
            formid: this.formid,
            ifpass: this.form.ifpass
          }
          this.emitCompat('after-submit-success', 'afterSubmitSuccess', payload)

          // 🔴 遗漏20修复：流程结束时通知DM状态变更（还原旧系统 Line 1320-1330）
          if (this.isLastTodo && this.form.ifpass === '1') {
            // 最后节点通过，流程结束
            this.$emit('workflow-complete', {
              instid: this.instance.id,
              formid: this.formid,
              status: 'approved'
            })
          } else if (this.form.ifpass === '9') {
            // 流程终止
            this.$emit('workflow-complete', {
              instid: this.instance.id,
              formid: this.formid,
              status: 'terminated'
            })
          }

          // 通知 DmContentEditor 流程已变化
          this.$emit('workflow-change', { submitted: true })

          // P3-2: 提交处理后自动关闭/返回（还原旧系统 Line 1338-1341）
          if (this.closeafterexec === '1' || this.closeafterexec === true) {
            // 新系统无Tab概念，改为路由返回
            setTimeout(() => {
              this.$router.back()
            }, 1000) // 延迟1秒让用户看到成功提示
          }
        } else {
          this.$message.error(res.message || '处理失败')
        }
      } catch (e) {
        this.handleError(e, '提交处理')  // ✅ P1-3修复
      } finally {
        this.submitting = false
      }
    },

    resetForm() {
      this.form.ifpass = '1'
      this.form.targetDtlid = undefined
      this.form.opinion = ''
      this.fileList = []
    },

    /**
     * ✅ P1-3修复：统一错误处理，区分HTTP状态码
     * @param {Error} e - 错误对象
     * @param {String} action - 操作名称（如"更新紧急程度"）
     */
    handleError(e, action) {
      // 判断是否是HTTP错误
      if (e.response) {
        const status = e.response.status
        if (status === 403) {
          this.$message.error(`您无权限执行此操作：${action}`)
          return
        } else if (status === 401) {
          this.$message.error('登录已过期，请重新登录')
          return
        } else if (status === 404) {
          this.$message.error(`${action}失败：接口不存在`)
          return
        } else if (status >= 500) {
          this.$message.error(`${action}失败：服务器错误`)
          return
        }
      }

      // 其他错误（网络错误、业务错误等）
      this.$message.error(`${action}失败：${e.message || '未知错误'}`)
    }
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   流程信息面板 - 紧凑清晰布局
   ═══════════════════════════════════════════════════════════════ */

.workflow-info-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

/* ═══ 工具栏：单行紧凑布局 ═══ */
.wf-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  min-height: 42px;
  gap: 16px;
}

.toolbar-left {
  flex-shrink: 0;
}

.wf-title {
  font-size: 14px;
  font-weight: 600;
  color: #1890ff;
}

.toolbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20px;
}

.toolbar-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.urgent-label {
  font-size: 12px;
  color: #595959;
  white-space: nowrap;
}

/* ═══ 表格区域 ═══ */
.wf-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

::v-deep .wf-instance-dtl-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

::v-deep .ant-table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

::v-deep .ant-spin-nested-loading,
::v-deep .ant-spin-container,
::v-deep .ant-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

::v-deep .ant-table-content {
  flex: 1;
  overflow: auto;
}

/* ═══ 处理表单：紧凑布局 ═══ */
.wf-form {
  flex-shrink: 0;
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  min-height: 32px;
}

.form-title {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.form-content {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.form-label {
  flex-shrink: 0;
  width: 70px;
  font-size: 13px;
  color: #595959;
  padding-top: 5px;
  text-align: right;
}

.form-row:first-child {
  align-items: center;
}

.form-row:first-child .form-label {
  padding-top: 0;
}

.form-row:last-child .form-label {
  padding-top: 0;
  align-self: flex-start;
  padding-top: 5px;
}

::v-deep .ant-textarea {
  flex: 1;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* ═══ 按钮组样式 ═══ */
::v-deep .ant-btn-group {
  display: flex;
  gap: 1px;
}

::v-deep .ant-btn-group > .ant-btn {
  border-radius: 4px;
  margin-right: 8px;
}

::v-deep .ant-btn-group > .ant-btn:last-child {
  margin-right: 0;
}

::v-deep .ant-btn-sm {
  height: 28px;
  padding: 0 10px;
  font-size: 13px;
}

::v-deep .ant-btn-primary {
  font-weight: 500;
}

::v-deep .ant-select-sm {
  font-size: 13px;
}

::v-deep .ant-radio-group {
  display: flex;
  gap: 8px;
}

::v-deep .ant-radio-wrapper {
  font-size: 13px;
  margin-right: 0;
}

::v-deep .ant-tag-small {
  font-size: 12px;
  padding: 0 6px;
  line-height: 20px;
}

/* ═══ 响应式布局 ═══ */
@media (max-width: 1400px) {
  .wf-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-actions {
    flex-basis: 100%;
    order: 3;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .wf-toolbar {
    padding: 6px 10px;
  }

  .form-content {
    padding: 8px 10px;
  }

  .form-row {
    flex-direction: column;
    gap: 6px;
  }

  .form-label {
    width: auto;
    text-align: left;
    padding-top: 0;
  }

  .form-actions {
    margin-left: 0;
    width: 100%;
  }
}
</style>
