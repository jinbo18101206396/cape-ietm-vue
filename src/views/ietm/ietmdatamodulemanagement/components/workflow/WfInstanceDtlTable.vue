<template>
  <div class="wf-instance-dtl-table">
    <!-- 空状态提示 -->
    <div v-if="!instanceId && !loading" class="empty-tip">
      <a-empty description="暂无流程节点" />
    </div>

    <!-- 节点表（还原旧 dgwfInstanceDtl：单表 + 内联处理情况列） -->
    <a-table
      v-else
      :columns="columns"
      :data-source="dataSource"
      :row-key="record => record.id"
      :row-selection="rowSelection"
      :row-class-name="rowClassName"
      :pagination="false"
      :loading="loading"
      :scroll="{ x: 1200 }"
      size="small"
      bordered
      @row-dblclick="handleRowDblClick"
    >
      <!-- 处理人（编辑态用 JSelectUserByDep） -->
      <template #useridname="text, record">
        <!-- 🔧 新增节点：显示当前用户，不可修改 -->
        <span v-if="isEditing(record) && record._isNew" class="new-node-user">
          {{ record.useridname || '当前用户' }}
        </span>
        <!-- 编辑已有节点：正常选择器 -->
        <j-select-user-by-dep
          v-else-if="isEditing(record)"
          :value="record.userid"
          :multi="true"
          placeholder="选择处理人"
          @change="v => onUseridChange(record, v)"
          @back="info => onUseridBack(record, info)"
        />
        <span v-else>{{ record.useridname || record.useridAlias || '-' }}</span>
      </template>

      <!-- 节点名称（编辑态用 a-input） -->
      <template #nodename="text, record">
        <a-input
          v-if="isEditing(record)"
          v-model="record.nodename"
          size="small"
          placeholder="请输入节点名称（最多50字）"
          :maxLength="50"
        />
        <span v-else>{{ record.nodename }}</span>
      </template>

      <!-- 顺序号（编辑态用 a-input-number） -->
      <template #seqno="text, record">
        <a-input-number
          v-if="isEditing(record)"
          v-model="record.seqno"
          :min="0"
          size="small"
          style="width: 60px"
        />
        <span v-else>{{ record.seqno }}</span>
      </template>

      <!-- 阶段（从主表 stagenames 提取） -->
      <!-- 🔴 B1修复: 编辑态支持阶段选择（对齐旧系统 Line 704-733） -->
      <template #stagename="text, record">
        <a-select
          v-if="isEditing(record) && existStage && isStageLeader"
          v-model="record.stagename"
          size="small"
          style="width: 100px"
        >
          <a-select-option
            v-for="option in getStageOptions()"
            :key="option.value"
            :value="option.value"
          >{{ option.text }}</a-select-option>
        </a-select>
        <span v-else>{{ formatStagename(text) }}</span>
      </template>

      <!-- 处理方式（编辑态用 a-select，否则字典文本） -->
      <template #nodetype="text, record">
        <a-select
          v-if="isEditing(record)"
          v-model="record.nodetype"
          size="small"
          style="width: 100px"
        >
          <a-select-option value="0">创建节点</a-select-option>
          <a-select-option value="1">审核节点</a-select-option>
          <a-select-option value="2">签批节点</a-select-option>
        </a-select>
        <span v-else>{{ getNodetypeText(text) }}</span>
      </template>

      <!-- 操作列（编辑模式：编辑/删除 或 保存/取消） -->
      <template #action="text, record">
        <template v-if="isEditing(record)">
          <a @click="commitRow(record)">确定</a>
          <a-divider type="vertical" />
          <a @click="cancelRow(record)">取消</a>
        </template>
        <template v-else>
          <a :class="{ 'link-disabled': !canRowEdit(record) }" @click="startEditRow(record)">编辑</a>
          <a-divider type="vertical" />
          <a :class="{ 'link-disabled': !canRowEdit(record) }" @click="deleteRow(record)">删除</a>
        </template>
      </template>

      <!-- 可跳转节点 -->
      <template #ifgetback="text">
        {{ formatGetback(text) }}
      </template>

      <!-- 已处理 -->
      <template #ifexec="text">
        {{ getIfexecText(text) }}
      </template>

      <!-- 处理情况（内联执行历史，还原旧 formateexec） -->
      <template #exec="text, record">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="exec-cell" v-html="renderExec(record.id)"></div>
      </template>

      <!-- 文件（附件下载链接，还原旧 filename 列） -->
      <template #filename="text, record">
        <span v-if="fileLinks(record.id).length === 0">-</span>
        <template v-else>
          <a
            v-for="f in fileLinks(record.id)"
            :key="f.id"
            class="file-link"
            :title="f.filename"
            @click="downloadAttachment(f.id, f.filename)"
          >{{ f.filename }}</a>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script>
import { getAction, postAction, deleteAction, downloadFile } from '@/api/manage'
import JSelectUserByDep from '@/components/jeecgbiz/JSelectUserByDep'
import moment from 'moment'

export default {
  name: 'WfInstanceDtlTable',
  components: { JSelectUserByDep },
  props: {
    // 是否允许编辑节点（新增/删除/保存），由面板按 (编制人||待办人) && 未结束 传入
    canEditNodes: {
      type: Boolean,
      default: false
    },
    // 流程实例ID（子表 instid）
    instanceId: {
      type: String,
      default: null
    },
    // 流程实例记录（stagenames 供阶段列格式化）
    instance: {
      type: Object,
      default: null
    },
    // 当前登录用户的待办节点ID（高亮）
    todoDtlId: {
      type: String,
      default: null
    },
    readonly: {
      type: Boolean,
      default: false
    },
    // 🔴 B1修复: 分阶段相关props
    // 各阶段的第一处理人
    stageUsers: {
      type: Array,
      default: () => []
    },
    // 各阶段的执行状态
    stageExecutionStatus: {
      type: Array,
      default: () => []
    },
    // 当前用户所在阶段
    currentUserStage: {
      type: String,
      default: null
    },
    // 当前用户是否是阶段第一人
    isStageLeader: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      dataSource: [],
      // 执行记录按 instdtlid 分组：{ dtlid: [WfExecute, ...] }
      execMap: {},
      loading: false,
      selectedRowKeys: [],
      // 正在编辑的行ID（单行编辑，还原旧 indexEditing）
      editingRowId: null,
      // 编辑前快照（取消时还原）
      editSnapshot: null
    }
  },
  computed: {
    // 是否分阶段（仅设置一个阶段视为无阶段，还原旧 existstage 判断）
    existStage() {
      const s = this.instance && this.instance.stagenames
      return !!(s && s.indexOf(',') > -1)
    },
    columns() {
      const cols = [
        // 🟠 遗漏3修复：添加序号列
        { title: '序号', key: 'index', width: 60, align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '处理人', dataIndex: 'useridname', key: 'useridname', width: 140, align: 'center', scopedSlots: { customRender: 'useridname' } },
        { title: '阶段', dataIndex: 'stagename', key: 'stagename', width: 80, align: 'center', scopedSlots: { customRender: 'stagename' } },
        { title: '节点名称', dataIndex: 'nodename', key: 'nodename', width: 130, align: 'center', ellipsis: true },
        { title: '顺序号', dataIndex: 'seqno', key: 'seqno', width: 60, align: 'center' },
        { title: '处理方式', dataIndex: 'nodetype', key: 'nodetype', width: 90, align: 'center', scopedSlots: { customRender: 'nodetype' } },
        { title: '可跳转节点', dataIndex: 'ifgetback', key: 'ifgetback', width: 110, align: 'center', scopedSlots: { customRender: 'ifgetback' } },
        { title: '已处理', dataIndex: 'ifexec', key: 'ifexec', width: 60, align: 'center', scopedSlots: { customRender: 'ifexec' } },
        { title: '处理情况', dataIndex: 'exec', key: 'exec', width: 320, align: 'left', scopedSlots: { customRender: 'exec' } },
        { title: '文件', dataIndex: 'filename', key: 'filename', width: 120, align: 'center', scopedSlots: { customRender: 'filename' } }
      ]
      // 操作列仅可编辑时显示
      if (this.canEditNodes) {
        cols.push({ title: '操作', key: 'action', width: 120, align: 'center', fixed: 'right', scopedSlots: { customRender: 'action' } })
      }
      // 节点名称/顺序号/处理方式改用编辑态插槽
      cols.forEach(c => {
        if (c.key === 'nodename') c.scopedSlots = { customRender: 'nodename' }
        if (c.key === 'seqno') c.scopedSlots = { customRender: 'seqno' }
      })
      // 阶段列仅分阶段时显示（还原旧 showColumn/hideColumn stagename）
      return this.existStage ? cols : cols.filter(c => c.key !== 'stagename')
    },
    rowSelection() {
      return {
        type: 'radio',
        selectedRowKeys: this.selectedRowKeys,
        onChange: this.onSelectChange,
        // 🟡 遗漏27修复：编辑时禁用其他行选择
        getCheckboxProps: record => ({
          disabled: !!this.editingRowId && this.editingRowId !== record.id
        })
      }
    }
  },
  watch: {
    instanceId: {
      immediate: true,
      handler(val) {
        if (val) {
          this.loadData()
        } else {
          this.dataSource = []
          this.execMap = {}
          this.selectedRowKeys = []
        }
      }
    }
  },
  methods: {
    // 加载节点（主）+ 执行历史（辅，失败不影响节点表渲染）
    async loadData() {
      if (!this.instanceId) return
      this.loading = true
      // 1) 节点列表——独立加载，是列表能否显示的关键，不与执行历史耦合
      try {
        const nodesRes = await getAction('/ietm/workflow/dtl/list', { instid: this.instanceId })
        if (nodesRes.success) {
          this.dataSource = nodesRes.result || []
          this.$emit('nodes-loaded', this.dataSource)
        } else {
          this.$message.error(nodesRes.message || '加载节点失败')
          this.dataSource = []
        }
        this.selectedRowKeys = []
        this.$emit('select', null)
      } catch (error) {
        console.error('[WfInstanceDtlTable] 加载节点失败:', error)
        this.$message.error('加载节点失败：' + error.message)
        this.dataSource = []
      } finally {
        this.loading = false
      }
      // 2) 执行历史——单独加载，失败仅置空处理情况列，不清空节点列表
      try {
        const execRes = await getAction('/ietm/workflow/execute/list', { instid: this.instanceId })
        const map = {}
        if (execRes.success && Array.isArray(execRes.result)) {
          execRes.result.forEach(e => {
            const k = e.instdtlid
            if (!map[k]) map[k] = []
            map[k].push(e)
          })
          Object.keys(map).forEach(k => {
            map[k].sort((a, b) => new Date(a.createTime) - new Date(b.createTime))
          })
        }
        this.execMap = map
      } catch (error) {
        console.warn('[WfInstanceDtlTable] 加载执行历史失败（不影响节点列表）:', error)
        this.execMap = {}
      }
    },

    refresh() {
      this.editingRowId = null
      this.editSnapshot = null
      this.loadData()
    },

    // ── 节点编辑（新增/删除/保存，还原旧工具栏）──
    isEditing(record) {
      return this.editingRowId === record.id
    },
    // 仅未处理/退回节点可编辑删除（还原旧 ifexec 限制）
    canRowEdit(record) {
      return record.ifexec === 'N' || record.ifexec === 'R'
    },

    // 🟡 I4修复：双击行编辑（对齐旧系统 Line 378-383 onClickRow）
    handleRowDblClick(record) {
      if (!this.canEditNodes) return
      if (!this.canRowEdit(record)) return
      this.startEditRow(record)
    },

    // 新增节点（面板"新增节点"按钮调用）：追加一空行进入编辑
    insertNode() {
      // P0-19: 新增节点前钩子 - beforeInsertnode
      const canInsert = this.$listeners['before-insert-node']
        ? this.$emit('before-insert-node') !== false
        : true
      if (!canInsert) {
        this.$message.warning('不允许新增节点')
        return
      }

      // 🔴 B1修复: 分阶段权限检查（对齐旧系统 Line 636-648）
      if (this.existStage && this.isStageLeader) {
        // 检查本阶段是否已结束
        const currentStageStatus = this.stageExecutionStatus.find(s => s.stage === this.currentUserStage)
        if (currentStageStatus && currentStageStatus.ifexec === 'Y') {
          this.$message.warning('本阶段已经结束不能新增节点！')
          return
        }
      }

      if (this.editingRowId) {
        this.$message.warning('请先确定或取消当前编辑的节点')
        return
      }

      // 🔧 新需求：新增节点时自动填充当前用户
      const userInfo = this.$store.getters.userInfo
      const currentUserId = userInfo ? userInfo.id : ''
      const currentUsername = userInfo ? (userInfo.realname || userInfo.username) : ''

      if (!currentUserId) {
        this.$message.error('无法获取当前用户信息')
        return
      }

      const nextSeq = this.dataSource.length > 0
        ? Math.max(...this.dataSource.map(r => Number(r.seqno) || 0)) + 1
        : 0

      // 🔴 B1修复: 设置新节点的默认阶段（对齐旧系统 Line 704-733）
      let defaultStage = ''
      if (this.existStage && this.currentUserStage != null) {
        defaultStage = this.currentUserStage
      }

      const row = {
        id: 'new_' + Date.now(),
        instid: this.instanceId,
        seqno: nextSeq,
        nodename: '',
        nodetype: '1',
        userid: currentUserId,        // 🔧 自动填充当前用户ID
        useridname: currentUsername,  // 🔧 自动填充当前用户名
        ifexec: 'N',
        // 🟠 遗漏16修复：补充新增节点的默认字段
        ifgetback: '', // 默认不限制跳转
        stagename: defaultStage, // 🔴 B1修复：分阶段时设置当前阶段
        ifjump: '0', // 默认0次跳转
        _isNew: true
      }
      this.dataSource = [...this.dataSource, row]
      this.editingRowId = row.id
      this.editSnapshot = null
    },

    // 🔧 优化4：提取阶段判断逻辑，提升可读性
    isNextStageFirstNode(record) {
      if (!this.existStage || !this.isStageLeader || this.currentUserStage == null) return false

      const recordStage = record.stagename
      const currentStage = parseInt(this.currentUserStage) || 0

      // 不是本阶段的节点
      if (recordStage === this.currentUserStage) return false

      // 查找下阶段的第一个节点
      const nextStageUser = this.stageUsers.find(s => parseInt(s.stage) === currentStage + 1)

      // 判断是否是下阶段的第一个节点
      return nextStageUser && record.seqno === nextStageUser.seqno
    },

    // 开始编辑某行
    startEditRow(record) {
      if (!this.canRowEdit(record)) {
        this.$message.warning('只能编辑未处理或退回的节点')
        return
      }

      // 🔴 B1修复: 分阶段编辑权限检查（对齐旧系统 Line 802-810）
      // 🔧 优化4：使用提取的方法简化逻辑
      if (this.existStage && this.isStageLeader && this.currentUserStage != null) {
        const recordStage = record.stagename

        // 不是本阶段的节点，且不是下阶段的第一个节点
        if (recordStage !== this.currentUserStage && !this.isNextStageFirstNode(record)) {
          this.$message.warning('不能编辑除下阶段第一个节点之外的其它阶段的节点！')
          return
        }
      }

      if (this.editingRowId && this.editingRowId !== record.id) {
        this.$message.warning('请先确定或取消当前编辑的节点')
        return
      }
      this.editSnapshot = { ...record }
      this.editingRowId = record.id
    },

    onUseridChange(record, val) {
      record.userid = val
    },
    onUseridBack(record, info) {
      // info: [{value, text}] → useridname 取 text 串
      if (Array.isArray(info)) {
        record.useridname = info.map(i => i.text).join(',')
      }
    },

    // 🟠 遗漏22修复：检查顺序号唯一性（还原旧系统 Line 1055-1070）
    // 🔧 优化5：提取为独立方法，提升可维护性
    isSeqnoDuplicate(record) {
      return this.dataSource.some(r =>
        r.id !== record.id &&
        r.seqno === record.seqno &&
        !r._isNew
      )
    },

    // 🟡 V2修复：可跳转节点互斥性校验（对齐旧系统 Line 1167-1175）
    // 🔧 优化5：提取为独立方法，提升可维护性
    validateIfgetback(ifgetback) {
      if (ifgetback == null || ifgetback === '') return { valid: true }

      const getback = ifgetback.split(',').map(g => g.trim()).filter(g => g)

      // 《不可跳转》不能与其他选项共存
      if (getback.includes('-1') && getback.length > 1) {
        return { valid: false, message: '当可跳转节点选择《不可跳转》时，不能再选择其它节点' }
      }

      // 《不限制》（空字符串）不能与其他选项共存
      if (getback.includes('') && getback.length > 1) {
        return { valid: false, message: '当可跳转节点选择《不限制》时，不能再选择其它节点' }
      }

      return { valid: true }
    },

    // 确定（保存单行，调用后端 saveNode）
    async commitRow(record) {
      // P0-19: 保存节点前钩子 - beforeSavenode
      const canSave = this.$listeners['before-save-node']
        ? this.$emit('before-save-node', record) !== false
        : true
      if (!canSave) {
        this.$message.warning('不允许保存此节点')
        return
      }

      if (!record.nodename || !record.nodename.trim()) {
        this.$message.warning('请填写节点名称')
        return
      }
      // 🟡 遗漏30修复：节点名称长度限制
      if (record.nodename.length > 50) {
        this.$message.warning('节点名称不能超过50个字符')
        return
      }
      if (!record.userid || !record.userid.trim()) {
        this.$message.warning('请选择处理人')
        return
      }

      // 🟠 遗漏22修复：检查顺序号唯一性（还原旧系统 Line 1055-1070）
      // 🔧 优化5：使用提取的方法
      const duplicate = this.dataSource.find(r => this.isSeqnoDuplicate(record) && r.seqno === record.seqno)
      if (duplicate) {
        this.$message.warning(`顺序号 ${record.seqno} 已被节点【${duplicate.nodename}】使用，请更换！`)
        return
      }

      // 🟡 V2修复：可跳转节点互斥性校验（对齐旧系统 Line 1167-1175）
      // 🔧 优化5：使用提取的方法
      const validation = this.validateIfgetback(record.ifgetback)
      if (!validation.valid) {
        this.$message.warning(validation.message)
        return
      }

      try {
        const payload = {
          id: record._isNew ? null : record.id,
          instid: this.instanceId,
          nodename: record.nodename,
          userid: record.userid,
          useridname: record.useridname,
          seqno: record.seqno,
          nodetype: record.nodetype,
          stagename: record.stagename,
          ifgetback: record.ifgetback
        }
        const res = await postAction('/ietm/workflow/dtl/saveNode', payload)
        if (res.success) {
          this.$message.success('保存成功')
          this.editingRowId = null
          this.editSnapshot = null
          this.loadData()
        } else {
          this.$message.error(res.message || '保存失败')
        }
      } catch (e) {
        this.$message.error('保存失败：' + e.message)
      }
    },

    // 取消编辑：新行移除；已有行还原快照
    cancelRow(record) {
      if (record._isNew) {
        this.dataSource = this.dataSource.filter(r => r.id !== record.id)
      } else if (this.editSnapshot) {
        Object.assign(record, this.editSnapshot)
      }
      this.editingRowId = null
      this.editSnapshot = null
    },

    // 🔧 优化6：提取后续节点检查逻辑
    hasProcessedNodesAfter(record) {
      const currentIndex = this.dataSource.findIndex(r => r.id === record.id)
      if (currentIndex === -1) return false

      return this.dataSource
        .slice(currentIndex + 1)
        .some(r => r.ifexec === 'Y' || r.ifexec === 'J')
    },

    // 删除节点（调用后端 delete，仅未处理节点）
    deleteRow(record) {
      // P0-19: 删除节点前钩子 - beforeDelnode
      const canDelete = this.$listeners['before-delete-node']
        ? this.$emit('before-delete-node', record) !== false
        : true
      if (!canDelete) {
        this.$message.warning('不允许删除此节点')
        return
      }

      if (!this.canRowEdit(record)) {
        this.$message.warning('只能删除未处理或退回的节点')
        return
      }

      // 🔴 B1修复: 分阶段删除权限检查（对齐旧系统 Line 1008-1018）
      if (this.existStage && this.isStageLeader && this.currentUserStage != null) {
        const recordStage = record.stagename
        // 登录人是本阶段第一个节点的处理人，不能删除其它阶段的节点
        if (recordStage !== this.currentUserStage) {
          this.$message.warning('不能删除其它阶段的节点！')
          return
        }
      }

      // 🔴 遗漏21修复：检查后续节点是否已处理（还原旧系统 Line 1008-1016）
      // 🔧 优化6：使用提取的方法
      if (this.hasProcessedNodesAfter(record)) {
        this.$message.warning('此节点后面还有已处理的节点，不能删除！')
        return
      }

      if (record._isNew) {
        this.dataSource = this.dataSource.filter(r => r.id !== record.id)
        if (this.editingRowId === record.id) this.editingRowId = null
        return
      }
      this.$confirm({
        title: '请确认',
        content: '删除的数据不能恢复，确定删除节点【' + record.nodename + '】？',
        onOk: async () => {
          try {
            const res = await deleteAction('/ietm/workflow/dtl/delete', { id: record.id })
            if (res.success) {
              this.$message.success('删除成功')
              this.loadData()
            } else {
              this.$message.error(res.message || '删除失败')
            }
          } catch (e) {
            this.$message.error('删除失败：' + e.message)
          }
        }
      })
    },

    onSelectChange(selectedRowKeys, selectedRows) {
      this.selectedRowKeys = selectedRowKeys
      this.$emit('select', selectedRows.length > 0 ? selectedRows[0] : null)
    },

    // 行样式：已处理绿底、待办行高亮（还原旧 tick.png / msgBg2.png）
    rowClassName(record) {
      if (this.todoDtlId && record.id === this.todoDtlId) {
        return 'wf-row-todo'
      }
      if (record.ifexec === 'Y' || record.ifexec === 'J') {
        return 'wf-row-done'
      }
      return ''
    },

    // ── 内联处理情况（还原旧 formateexec）──
    renderExec(dtlid) {
      const list = this.execMap[dtlid]
      if (!list || list.length === 0) return ''
      const parts = list.map(item => {
        const time = item.createTime ? moment(item.createTime).format('YYYY-MM-DD HH:mm:ss') : ''
        const jumpPrefix = this.jumpPrefix(item.ifjump)
        const ideas = item.opinion ? '，意见为:【' + this.escapeHtml(item.opinion) + '】' : ''
        // 优先 createName(显示名，对齐旧 CREATED_NAME)，fallback createBy(用户名)
        const who = this.escapeHtml(item.createName || item.createBy || '')
        const line = jumpPrefix + '【' + who + '】于【' + time + '】' + this.getIfpassText(item.ifpass, item.ifjump) + ideas
        // 追加意见红字
        return item.ifpass === '4'
          ? '<span style="color:red">' + line + '</span>'
          : line
      })
      return parts.join('<br/>')
    },

    // 退回前缀 '>'（还原旧 jumpstr）
    jumpPrefix(ifjump) {
      const n = parseInt(ifjump)
      if (isNaN(n) || n <= 0) return ''
      return '>'.repeat(n)
    },

    // 附件链接数据（从执行记录带出，还原旧 filename 列）
    // 🟠 D2修复：支持多文件（逗号分隔）- 对齐旧系统 Line 577-581
    fileLinks(dtlid) {
      const list = this.execMap[dtlid]
      if (!list) return []

      const links = []
      list.forEach(e => {
        if (e.filename && e.filename.trim() !== '') {
          // 支持多文件（逗号分隔）
          const files = e.filename.split(',').map(f => f.trim()).filter(f => f)
          files.forEach(f => {
            links.push({
              id: e.id,
              filename: f
            })
          })
        }
      })
      return links
    },

    downloadAttachment(id, filename) {
      downloadFile('/ietm/workflow/execute/download', filename, { id })
    },

    // ── 字典格式化 ──
    // 处理结果（还原旧 formateIfpass：含退回次数前缀）
    getIfpassText(ifpass, ifjump) {
      const jump = (ifjump != null && ifjump !== '') ? '[第' + ifjump + '次退回]' : ''
      const map = { '1': '通过', '2': '发表不同意见', '3': '流程跳转', '4': '追加意见', '5': '拿回', '9': '流程终止' }
      return jump + (map[ifpass] || '')
    },
    formatStagename(stagename) {
      if (!this.instance || !this.instance.stagenames) return stagename
      const stages = this.instance.stagenames.split(',')
      const index = parseInt(stagename)
      if (!isNaN(index) && index >= 0 && index < stages.length) return stages[index]
      return stagename
    },

    // 🔴 B1修复: 获取阶段选项（对齐旧系统 Line 704-733）
    // 🔧 优化3：简化逻辑，提升可读性
    getStageOptions() {
      if (!this.existStage || !this.instance || !this.instance.stagenames) return []
      if (!this.isStageLeader || this.currentUserStage == null) return []

      const stages = this.instance.stagenames.split(',')
      const currentStage = parseInt(this.currentUserStage) || 0

      // 检查下阶段是否有节点
      const hasNextStageNodes = this.dataSource.some(node => {
        const nodeStage = parseInt(node.stagename)
        return !isNaN(nodeStage) && nodeStage > currentStage
      })

      // 构建选项：当前阶段 + 下阶段（如果下阶段无节点且存在）
      const options = [
        { value: String(currentStage), text: stages[currentStage] || String(currentStage) }
      ]

      if (!hasNextStageNodes && currentStage + 1 < stages.length) {
        options.push({
          value: String(currentStage + 1),
          text: stages[currentStage + 1] || String(currentStage + 1)
        })
      }

      return options
    },

    getNodetypeText(nodetype) {
      const map = { '0': '创建节点', '1': '审核节点', '2': '签批节点' }
      return map[nodetype] || nodetype
    },
    getIfexecText(ifexec) {
      const map = { 'N': '未执行', 'Y': '已执行', 'J': '跳过', 'R': '退回' }
      return map[ifexec] || ifexec
    },
    // 可跳转节点（还原旧 formategetback）
    formatGetback(value) {
      if (value == null || value === '') return '《不限制》'
      if (value === '-1') return '《不可跳转》'
      if (value === '0') return '《创建》'
      let out = value
      value.split(',').forEach(m => {
        const row = this.dataSource.find(r => r.id === m)
        if (row) out = out.replace(m, row.nodename)
      })
      return out.replace('-1', '《不可跳转》')
    },
    escapeHtml(str) {
      if (str == null) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    },

    // ═══ P0-2: 批量保存节点（还原旧 savenode）═══
    hasUnsavedChanges() {
      // 检查是否有编辑中的行
      return !!this.editingRowId
    },

    async saveAllChanges() {
      // 如果没有编辑中的行，提示
      if (!this.editingRowId) {
        this.$message.info('没有需要保存的节点')
        return Promise.resolve()
      }

      // 找到编辑中的行
      const editingRow = this.dataSource.find(r => r.id === this.editingRowId)
      if (!editingRow) {
        this.$message.warning('未找到编辑中的节点')
        return Promise.reject(new Error('未找到编辑中的节点'))
      }

      // 触发钩子（对齐旧系统 parent.beforeSavenode）
      const canSave = this.$listeners['before-save-nodes']
        ? this.$emit('before-save-nodes', [editingRow]) !== false
        : true
      if (!canSave) {
        return Promise.reject(new Error('不允许保存'))
      }

      // 校验
      if (!editingRow.nodename || !editingRow.nodename.trim()) {
        this.$message.warning('请填写节点名称')
        return Promise.reject(new Error('节点名称为空'))
      }
      if (!editingRow.userid || !editingRow.userid.trim()) {
        this.$message.warning('请选择处理人')
        return Promise.reject(new Error('处理人为空'))
      }

      // 保存
      try {
        const payload = {
          id: editingRow._isNew ? null : editingRow.id,
          instid: this.instanceId,
          nodename: editingRow.nodename,
          nodetype: editingRow.nodetype,
          seqno: editingRow.seqno,
          userid: editingRow.userid,
          useridname: editingRow.useridname
        }

        const res = await postAction('/ietm/workflow/dtl/saveNode', payload)
        if (res.success) {
          this.$message.success('保存成功！')
          this.editingRowId = null
          this.editSnapshot = null
          await this.refresh()
          return Promise.resolve()
        } else {
          this.$message.error(res.message || '保存失败')
          return Promise.reject(new Error(res.message || '保存失败'))
        }
      } catch (e) {
        this.$message.error('保存失败：' + e.message)
        return Promise.reject(e)
      }
    }
  }
}
</script>

<style scoped>
.wf-instance-dtl-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty-tip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.exec-cell {
  font-size: 12px;
  line-height: 1.5;
  white-space: normal;
  word-break: break-all;
}

.file-link {
  display: block;
  color: #1890ff;
  cursor: pointer;
}

.file-link:hover {
  text-decoration: underline;
}

.link-disabled {
  color: #bfbfbf !important;
  cursor: not-allowed;
  pointer-events: none;
}

/* 表格样式 */
::v-deep .ant-table {
  flex: 1;
}

::v-deep .ant-table-tbody > tr > td {
  padding: 4px 8px;
  vertical-align: top;
}

::v-deep .ant-table-thead > tr > th {
  padding: 4px 8px;
  background: #f5f5f5;
  font-weight: bold;
}

/* 已处理行绿底（还原旧 tick 效果） */
::v-deep .wf-row-done > td {
  background: #f6ffed;
}

/* P2-1: 已处理节点添加绿色对勾图标（对齐旧系统样式） */
::v-deep .wf-row-done > td:first-child::before {
  content: '✓';
  color: #52c41a;
  font-weight: bold;
  font-size: 14px;
  margin-right: 6px;
}

/* 待办行高亮（还原旧 msgBg2 效果） */
::v-deep .wf-row-todo > td {
  background: #fffbe6;
}

/* 🔧 新增节点的当前用户显示样式 */
.new-node-user {
  color: #1890ff;
  font-weight: 500;
}
</style>
