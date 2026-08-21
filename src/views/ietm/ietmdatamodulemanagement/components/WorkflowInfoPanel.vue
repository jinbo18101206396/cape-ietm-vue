<template>
  <div class="workflow-info-panel">
    <!-- ═══ center：工具栏 + 节点表 ═══ -->
    <div class="center-region">
      <!-- 工具栏（还原旧 toolbarWfInstance） -->
      <div class="wf-toolbar">
        <span class="wf-legend">{{ legend }}</span>

        <a-button type="link" size="small" icon="reload" @click="refreshAll">刷新</a-button>

        <!-- 新增节点（还原旧"增加节点"，仅编辑态且流程未结束） -->
        <a-button
          v-if="canEditNodes"
          type="link"
          size="small"
          icon="plus"
          @click="handleInsertNode"
        >新增节点</a-button>

        <!-- 删除节点（还原旧"刪除节点"） -->
        <a-button
          v-if="canEditNodes"
          type="link"
          size="small"
          icon="delete"
          @click="handleDeleteNode"
        >删除节点</a-button>

        <!-- 保存节点（还原旧"保存节点"） -->
        <a-button
          v-if="canEditNodes"
          type="link"
          size="small"
          icon="save"
          @click="handleSaveNodes"
        >保存节点</a-button>

        <!-- 紧急程度（还原旧 ifurgent 下拉，即时 updateUrgent） -->
        <span class="wf-urgent" v-if="instance">
          <a-select
            :value="urgent"
            size="small"
            style="width: 96px"
            :disabled="instOver"
            @change="handleUrgentChange"
          >
            <a-select-option value="1">一般</a-select-option>
            <a-select-option value="2">★紧急</a-select-option>
            <a-select-option value="3">★★特急</a-select-option>
          </a-select>
        </span>

        <!-- ✅ P1-4: 阶段说明（还原旧 tdStagenote，对齐旧系统 Line 48） -->
        <span class="wf-stage-note" v-if="existStage">
          【分阶段流程规则：各阶段首位处理人可维护本阶段节点、编辑下阶段首节点、增加下阶段节点】
        </span>

        <!-- 追加意见（还原旧 tdAddopinion）：选中已处理节点可追加，流程未结束时可用 -->
        <span class="wf-addopinion" v-if="instance && !instOver">
          <a-input
            v-model="addOpinionText"
            size="small"
            placeholder="追加意见（选中已处理节点）"
            style="width: 220px"
            :maxLength="500"
          />
          <a-button type="link" size="small" icon="save" @click="handleAddOpinion">保存意见</a-button>
        </span>

        <!-- 拿回（还原旧 tdGetback）：选中自己已通过的节点，流程未结束时可用 -->
        <!-- P2-3: 动态检测是否有可拿回的节点 -->
        <a-button
          v-if="hasGetbackNode"
          type="link"
          size="small"
          icon="rollback"
          @click="handleTakeBack"
        >拿回</a-button>
      </div>

      <!-- 节点表 -->
      <div class="wf-table-wrap">
        <wf-instance-dtl-table
          ref="dtlTable"
          :instance-id="instanceId"
          :instance="instance"
          :todo-dtl-id="todoDtlId"
          :readonly="readonly"
          :can-edit-nodes="canEditNodes"
          @select="handleNodeSelect"
          @nodes-loaded="handleNodesLoaded"
          @before-insert-node="(e) => $emit('before-insert-node', e)"
          @before-delete-node="(e) => $emit('before-delete-node', e)"
          @before-save-node="(e) => $emit('before-save-node', e)"
        />
      </div>
    </div>

    <!-- ═══ south：常驻处理表单（还原旧 execform）═══ -->
    <div class="south-region" v-if="showExecForm">
      <div class="exec-legend">{{ execLegend }}</div>
      <div class="exec-body">
        <div class="exec-row">
          <a-radio-group v-model="form.ifpass" @change="onIfpassChange">
            <a-radio value="1">通过</a-radio>
            <a-radio value="2">发表不同意见</a-radio>
            <a-radio value="9">流程终止</a-radio>
            <a-radio value="3">跳转：</a-radio>
          </a-radio-group>
          <a-select
            :value="form.targetDtlid"
            size="small"
            style="width: 180px"
            placeholder="请选择要跳转的节点"
            :disabled="form.ifpass !== '3'"
            @change="v => form.targetDtlid = v"
          >
            <a-select-option
              v-for="n in jumpTargets"
              :key="n.id"
              :value="n.id"
            >{{ n.nodename }}</a-select-option>
          </a-select>
          <span v-if="isLastTodo" class="last-node-note">
            【当前处理节点是最后一个节点。提交处理后本流程将结束，并且不能修改。】
          </span>
        </div>
        <div class="exec-row">
          <span class="exec-label">意见:</span>
          <a-textarea
            v-model="form.opinion"
            :rows="1"
            :maxLength="500"
            style="width: 60%"
          />
          <a-upload
            :file-list="fileList"
            :before-upload="beforeUpload"
            @remove="handleFileRemove"
          >
            <a-button size="small" icon="upload">附件</a-button>
          </a-upload>
          <a-button
            type="primary"
            size="small"
            :loading="submitting"
            @click="handleSubmit"
          >提交处理</a-button>
        </div>
      </div>
    </div>
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

      // 处理表单
      form: {
        ifpass: '1',
        targetDtlid: undefined,
        opinion: ''
      },
      fileList: [],
      submitting: false
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
    hasGetbackNode() {
      if (this.instOver || !this.nodes || this.nodes.length === 0) return false
      const userInfo = this.$store.getters.userInfo
      const currentUserId = userInfo ? userInfo.id : ''
      const currentUsername = userInfo ? userInfo.username : ''
      return this.nodes.some(node => {
        if (node.ifexec !== 'Y') return false
        const userids = (node.userid || '').split(',')
        return userids.includes(currentUserId) || userids.includes(currentUsername)
      })
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
      try {
        const [instRes, todoRes] = await Promise.all([
          getAction('/ietm/workflow/instance/getByFormid', { formid: this.formid }),
          getAction('/ietm/workflow/instance/getTodo', { formid: this.formid })
        ])
        this.instance = (instRes.success && instRes.result) ? instRes.result : null
        this.urgent = this.instance ? (this.instance.ifurgent || '1') : '1'
        this.todoNode = (todoRes.success && todoRes.result) ? todoRes.result : null
        // 有待办时预置提交表单 instdtlid
        this.resetForm()
      } catch (e) {
        console.error('[WorkflowInfoPanel] 加载失败:', e)
        this.$message.error('加载流程信息失败：' + e.message)
      }
    },

    // 刷新全部（实例/待办/节点表）
    refreshAll() {
      this.loadInstance()
      this.$refs.dtlTable && this.$refs.dtlTable.refresh()
    },

    handleNodeSelect(record) {
      this.selectedNode = record
      // 🟠 遗漏9修复：切换节点时清空追加意见输入框
      this.addOpinionText = ''
    },

    handleNodesLoaded(nodes) {
      this.nodes = nodes || []
    },

    // 新增节点（转调子表）
    handleInsertNode() {
      this.$refs.dtlTable && this.$refs.dtlTable.insertNode()
    },

    // 删除节点（还原旧 delnode）
    handleDeleteNode() {
      if (!this.selectedNode) {
        this.$message.warning('请选择一个要删除的节点')
        return
      }
      if (this.selectedNode.ifexec === 'Y' || this.selectedNode.ifexec === 'J') {
        this.$message.warning('已处理节点不能删除！')
        return
      }
      if (this.todoNode && this.todoNode.id === this.selectedNode.id) {
        this.$message.warning('当前正在处理的节点不能删除！')
        return
      }

      // P3-1: 触发钩子（兼容旧系统 parent.beforeDeletenode 和新系统 @before-delete-node）
      const canDelete = this.emitCompat('before-delete-node', 'beforeDeletenode') !== false
      if (!canDelete) return

      this.$confirm({
        title: '提示',
        content: `删除的数据不能恢复，确定删除节点【${this.selectedNode.nodename}】？`,
        onOk: () => {
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
        this.$message.error('更新失败：' + e.message)
      }
    },
    // 追加意见（还原旧 saveAddopinion）：选中已处理节点
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
      const userid = this.selectedNode.userid || ''
      const userids = userid.split(',').map(u => u.trim()).filter(u => u)
      const isMyNode = userids.includes(this.currentUserId) || userids.includes(this.currentUsername)
      if (!isMyNode) {
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
        this.$message.error('追加意见失败：' + e.message)
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
      this.$confirm({
        title: '提示',
        content: '你已经处理完毕了，确定要拿回以重新处理？',
        onOk: async () => {
          try {
            const url = `/ietm/workflow/execute/takeBack?instdtlid=${encodeURIComponent(this.selectedNode.id)}`
            const res = await postAction(url)
            if (res.success) {
              this.$message.success('拿回成功')
              this.refreshAll()

              // P3-1: 拿回成功后钩子（兼容旧系统 parent.afterGetBackSuccess 和新系统 @after-get-back）
              const payload = {
                instdtlid: this.selectedNode.id,
                instid: this.instance.id
              }
              this.emitCompat('after-get-back', 'afterGetBackSuccess', payload)
            } else {
              this.$message.error(res.message || '拿回失败')
            }
          } catch (e) {
            this.$message.error('拿回失败：' + e.message)
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

        const res = await uploadAction('/ietm/workflow/execute/submit', fd)
        if (res.success) {
          this.$message.success('成功处理！')
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
        this.$message.error('处理失败：' + e.message)
      } finally {
        this.submitting = false
      }
    },

    resetForm() {
      this.form.ifpass = '1'
      this.form.targetDtlid = undefined
      this.form.opinion = ''
      this.fileList = []
    }
  }
}
</script>

<style scoped>
.workflow-info-panel {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

/* center：工具栏 + 节点表 */
.center-region {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wf-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.wf-legend {
  font-weight: bold;
  color: #2d75cd;
  margin-right: 8px;
}

.wf-urgent,
.wf-addopinion {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* P1-4: 阶段说明样式（还原旧 tdStagenote） */
.wf-stage-note {
  color: #666;
  font-size: 12px;
  margin-left: 12px;
  max-width: 400px;
  display: inline-block;
}

.wf-table-wrap {
  flex: 1;
  overflow: auto;
}

/* south：常驻处理表单（还原旧 execform，height:90px 量级） */
.south-region {
  border-top: 1px solid #e8e8e8;
  background: #fff;
  padding: 6px 12px;
}

.exec-legend {
  font-weight: bold;
  color: #2d75cd;
  margin-bottom: 4px;
}

.exec-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exec-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.exec-label {
  font-weight: bold;
  text-align: right;
}

.last-node-note {
  color: red;
  font-size: 12px;
}
</style>
