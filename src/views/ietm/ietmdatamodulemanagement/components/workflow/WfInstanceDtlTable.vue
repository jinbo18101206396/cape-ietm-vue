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
      :scroll="{ x: 'max-content' }"
      size="small"
      bordered
      @row-dblclick="handleRowDblClick"
    >
      <!-- 处理人（编辑态用 JSelectUserByDep） -->
      <template #useridname="text, record">
        <!-- 🔴 问题3修复：处理人列禁止编辑，始终显示为文本 -->
        <span>{{ record.useridname || record.useridAlias || '-' }}</span>
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

      <!-- 处理方式（编辑态用 a-select，否则字典文本） -->
      <template #nodetype="text, record">
        <a-select
          v-if="isEditing(record)"
          v-model="record.nodetype"
          size="small"
          style="width: 130px"
        >
          <a-select-option value="0">所有人必完成</a-select-option>
          <a-select-option value="1">只1人完成</a-select-option>
        </a-select>
        <span v-else>{{ getNodetypeText(text) }}</span>
      </template>

      <!-- 🔴 问题2修复：阶段（编辑态用 a-select） -->
      <!-- 🔴 问题6.3修复：编辑态也显示阶段文本 -->
      <template #stagename="text, record">
        <a-select
          v-if="isEditing(record) && existStage"
          v-model="record.stagename"
          :disabled="!record._isNew"
          size="small"
          style="width: 100%"
        >
          <a-select-option v-for="opt in getStageOptionsForEdit(record)" :key="opt.value" :value="opt.value">
            {{ opt.text }}
          </a-select-option>
        </a-select>
        <span v-else>{{ formatStagename(text) }}</span>
      </template>

      <!-- 🔴 问题5.2修复：可跳转节点（编辑态用 a-select 多选，使用特殊标记） -->
      <template #ifgetback="text, record">
        <a-select
          v-if="isEditing(record)"
          :value="parseIfgetback(record.ifgetback)"
          size="small"
          mode="multiple"
          style="width: 100%"
          placeholder="选择可跳转节点"
          @change="onIfgetbackChange(record, $event)"
        >
          <a-select-option value="__UNLIMITED__">《不限制》</a-select-option>
          <a-select-option value="__NO_JUMP__">《不可跳转》</a-select-option>
          <!-- 🔴 修复问题4：移除《创建》选项，动态节点列表已包含创建节点 -->
          <a-select-option v-for="node in getJumpableNodes(record)" :key="node.id" :value="node.id">
            {{ node.nodename }}
          </a-select-option>
        </a-select>
        <span v-else>{{ formatGetback(text) }}</span>
      </template>

      <!-- 操作列（编辑模式：确定/取消 或 编辑；🔴 问题3修复：去除行内删除按钮，与旧系统一致） -->
      <template #action="text, record">
        <template v-if="isEditing(record)">
          <a @click="commitRow(record)">确定</a>
          <a-divider type="vertical" />
          <a @click="cancelRow(record)">取消</a>
        </template>
        <template v-else>
          <a :class="{ 'link-disabled': !canRowEdit(record) }" @click="startEditRow(record)">编辑</a>
        </template>
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
    // 🔴 问题1修复后：当前用户是否有阶段权限（任何节点处理人）
    isStageLeader: {
      type: Boolean,
      default: false
    },
    // 🔴 问题2修复：当前用户是否是阶段第一处理人（严格限制）
    isStageFirstLeader: {
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
        // 序号
        {
          title: '序号',
          key: 'index',
          width: 60,
          align: 'center',
          customRender: (text, record, index) => index + 1
        },
        // 处理人
        {
          title: '处理人',
          dataIndex: 'useridname',
          key: 'useridname',
          width: 130,
          align: 'center',
          ellipsis: true,
          scopedSlots: { customRender: 'useridname' }
        },
        // 节点名称
        {
          title: '节点名称',
          dataIndex: 'nodename',
          key: 'nodename',
          width: 140,
          align: 'center',
          ellipsis: true,
          scopedSlots: { customRender: 'nodename' }
        },
        // 顺序号
        {
          title: '顺序号',
          dataIndex: 'seqno',
          key: 'seqno',
          width: 70,
          align: 'center',
          scopedSlots: { customRender: 'seqno' }
        }
      ]

      // 🔴 问题2修复：隐藏阶段列（根据用户要求始终隐藏）
      // if (this.existStage) {
      //   cols.push({
      //     title: '阶段',
      //     dataIndex: 'stagename',
      //     key: 'stagename',
      //     width: 80,
      //     align: 'center',
      //     scopedSlots: { customRender: 'stagename' }
      //   })
      // }

      // 继续添加后续列
      cols.push(
        // 处理方式
        {
          title: '处理方式',
          dataIndex: 'nodetype',
          key: 'nodetype',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'nodetype' }
        },
        // 可跳转节点
        {
          title: '可跳转节点',
          dataIndex: 'ifgetback',
          key: 'ifgetback',
          width: 200,  // 🔴 问题1修复：加宽列宽从130到200，保证下拉选项内容显示完整
          align: 'center',
          ellipsis: true,
          scopedSlots: { customRender: 'ifgetback' }
        },
        // 状态
        {
          title: '状态',
          dataIndex: 'ifexec',
          key: 'ifexec',
          width: 80,
          align: 'center',
          scopedSlots: { customRender: 'ifexec' }
        },
        // 处理情况（🔴 问题1修复：内容左对齐，表头居中）
        {
          title: '处理情况',
          dataIndex: 'exec',
          key: 'exec',
          minWidth: 300,
          align: 'left',
          scopedSlots: { customRender: 'exec' }
        },
        // 操作列
        {
          title: '操作',
          key: 'action',
          width: 110,
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      )

      return cols
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
  mounted() {
    // P2-UI-01修复：绑定附件下载事件
    this.bindDownloadEvents()
  },
  updated() {
    // P2-UI-01修复：数据更新后重新绑定附件下载事件
    this.$nextTick(() => {
      this.bindDownloadEvents()
    })
  },
  beforeDestroy() {
    // 清理事件监听器
    if (this.$el) {
      this.$el.removeEventListener('click', this.handleDownloadClick)
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
    // 🔴 问题6.1修复：放宽双击权限 - 除了全局canEditNodes，节点处理人也能双击编辑自己的节点
    handleRowDblClick(record) {
      // 优先检查：节点必须可编辑（未处理或退回）
      if (!this.canRowEdit(record)) return

      // 权限检查：canEditNodes=true（创建人/待办人）OR 节点处理人
      const isNodeHandler = this.isCurrentUserHandler(record)
      if (!this.canEditNodes && !isNodeHandler) return

      this.startEditRow(record)
    },

    // 🔴 问题6.1修复：判断当前用户是否是节点的处理人
    isCurrentUserHandler(record) {
      if (!record.userid) return false
      const userInfo = this.$store.getters.userInfo
      if (!userInfo) return false

      const currentUserId = userInfo.id
      const currentUsername = userInfo.username

      // userid可能是逗号分隔的多人，需要逐个匹配
      const userids = record.userid.split(',').map(u => u.trim()).filter(u => u)
      return userids.some(uid => uid === currentUserId || uid === currentUsername)
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
        ? Math.max(...this.dataSource.map(r => Number(r.seqno) || 0)) + 10
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
        userid: currentUserId, // 🔧 自动填充当前用户ID
        useridname: currentUsername, // 🔧 自动填充当前用户名
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

    // 🔴 问题5.2修复：可跳转节点变更处理
    onIfgetbackChange(record, value) {
      if (!Array.isArray(value) || value.length === 0) {
        record.ifgetback = ''
        return
      }

      // 特殊值处理
      const UNLIMITED = '__UNLIMITED__'
      const NO_JUMP = '__NO_JUMP__'

      // 🔴 问题4修复：智能切换逻辑，允许从《不限制》切换到其他选项
      // 判断用户的操作意图：
      // 1. 如果当前是《不限制》(ifgetback='')，用户又选了其他节点 → 自动取消《不限制》，保留其他节点
      // 2. 如果当前是具体节点，用户又选了《不限制》 → 自动取消其他节点，只保留《不限制》

      const hasUnlimited = value.includes(UNLIMITED)
      const hasNoJump = value.includes(NO_JUMP)
      const hasNodes = value.some(v => v !== UNLIMITED && v !== NO_JUMP)

      // 场景1：同时包含《不限制》和其他节点
      if (hasUnlimited && hasNodes) {
        // 判断之前的状态
        if (record.ifgetback === '') {
          // 之前是《不限制》，用户新选了节点 → 取消《不限制》，保留节点
          const nodeIds = value.filter(v => v !== UNLIMITED && v !== NO_JUMP)
          record.ifgetback = nodeIds.join(',')
        } else {
          // 之前是节点，用户新选了《不限制》 → 取消所有节点，只保留《不限制》
          record.ifgetback = ''
        }
        return
      }

      // 场景2：同时包含《不可跳转》和其他节点
      if (hasNoJump && hasNodes) {
        // 判断之前的状态
        if (record.ifgetback === '-1') {
          // 之前是《不可跳转》，用户新选了节点 → 取消《不可跳转》，保留节点
          const nodeIds = value.filter(v => v !== UNLIMITED && v !== NO_JUMP)
          record.ifgetback = nodeIds.join(',')
        } else {
          // 之前是节点，用户新选了《不可跳转》 → 取消所有节点，只保留《不可跳转》
          record.ifgetback = '-1'
        }
        return
      }

      // 场景3：同时包含《不限制》和《不可跳转》
      if (hasUnlimited && hasNoJump) {
        // 判断之前的状态，保留用户最新选择的那个
        if (record.ifgetback === '') {
          // 之前是《不限制》，用户新选了《不可跳转》
          record.ifgetback = '-1'
        } else {
          // 之前是《不可跳转》或其他，用户新选了《不限制》
          record.ifgetback = ''
        }
        return
      }

      // 场景4：只选了《不限制》
      if (hasUnlimited && !hasNodes && !hasNoJump) {
        record.ifgetback = ''
        return
      }

      // 场景5：只选了《不可跳转》
      if (hasNoJump && !hasNodes && !hasUnlimited) {
        record.ifgetback = '-1'
        return
      }

      // 场景6：只选了具体节点
      if (hasNodes && !hasUnlimited && !hasNoJump) {
        const nodeIds = value.filter(v => v !== UNLIMITED && v !== NO_JUMP)
        record.ifgetback = nodeIds.join(',')
        return
      }

      // 默认：清空
      record.ifgetback = ''
    },

    // 🔴 问题5.2修复：解析ifgetback字符串为数组（供a-select多选显示）
    parseIfgetback(value) {
      const UNLIMITED = '__UNLIMITED__'
      const NO_JUMP = '__NO_JUMP__'

      // 空字符串或null表示"不限制"
      if (!value || value === '') {
        return [UNLIMITED]
      }
      // "-1"表示"不可跳转"
      if (value === '-1') {
        return [NO_JUMP]
      }
      // 其他情况：逗号分隔的节点ID列表
      return value.split(',').map(v => v.trim()).filter(v => v)
    },

    // 🔴 问题2修复：获取可跳转的节点列表（排除当前编辑节点自身）
    getJumpableNodes(record) {
      return this.dataSource.filter(n => n.id !== record.id && !n._isNew)
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
      // 🔴 问题2修复：改用isStageFirstLeader，只限制阶段第一处理人不能跨阶段删除
      // 🔴 缺陷5修复：使用parseStagename做类型安全的比较
      if (this.existStage && this.isStageFirstLeader && this.currentUserStage != null) {
        const currentStageNum = this.parseStagename(this.currentUserStage, null)
        const recordStageNum = this.parseStagename(record.stagename, null)

        // 登录人是本阶段第一个节点的处理人，不能删除其它阶段的节点
        if (currentStageNum != null && recordStageNum != null && recordStageNum !== currentStageNum) {
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

      // 🔴 修复问题2：创建节点没有执行记录时，生成默认处理情况
      if (!list || list.length === 0) {
        // 查找对应的节点记录
        const node = this.dataSource.find(n => n.id === dtlid)
        if (node && (node.seqno === 0 || node.seqno === '0') && node.ifexec === 'Y') {
          // 这是已执行的创建节点，生成默认处理情况（对齐旧系统）
          const who = this.escapeHtml(node.useridname || node.userid || '系统')
          const time = node.createTime ? moment(node.createTime).format('YYYY-MM-DD HH:mm:ss') : ''
          return `【${who}】于【${time}】通过，意见为:【编制】`
        }
        return ''
      }

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

      // P2-UI-01修复：渲染附件链接（使用data属性存储下载信息）
      const files = this.fileLinks(dtlid)
      if (files.length > 0) {
        const fileHtml = files.map(f => {
          // 使用data属性存储ID和文件名，避免XSS风险
          const escapedFilename = this.escapeHtml(f.filename)
          return `<a class="file-link wf-download-link"
                     href="javascript:void(0)"
                     data-file-id="${this.escapeHtml(f.id)}"
                     data-filename="${escapedFilename}"
                     title="点击下载：${escapedFilename}">${escapedFilename}</a>`
        }).join(' ')
        parts.push('<br/>📎 附件：' + fileHtml)
      }

      return parts.join('<br/>')
    },

    // P2-UI-01修复：绑定附件下载事件（使用事件委托）
    bindDownloadEvents() {
      // 移除旧监听器（避免重复绑定）
      this.$el.removeEventListener('click', this.handleDownloadClick)
      // 使用事件委托绑定点击事件
      this.$el.addEventListener('click', this.handleDownloadClick)
    },

    handleDownloadClick(e) {
      const target = e.target
      if (target.classList.contains('wf-download-link')) {
        e.preventDefault()
        e.stopPropagation()
        const fileId = target.getAttribute('data-file-id')
        const filename = target.getAttribute('data-filename')
        if (fileId && filename) {
          this.downloadAttachment(fileId, filename)
        }
      }
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
    // 🔴 缺陷3修复：统一stagename解析方法（处理空/文本/数字三种格式）
    // 对齐旧系统 formatestage 明确检查空值的逻辑
    parseStagename(stagename, fallback = null) {
      // 快速返回：null、undefined、空字符串
      if (stagename == null || stagename === '') return fallback

      // 尝试解析为数字索引
      const num = parseInt(stagename)
      if (!isNaN(num)) return num

      // 如果是文本名称，尝试从stagenames中查找索引（向后兼容）
      if (this.instance && this.instance.stagenames) {
        const stages = this.instance.stagenames.split(',')
        const index = stages.indexOf(stagename)
        if (index >= 0) return index
      }

      // 无法解析，返回fallback
      return fallback
    },

    // 处理结果（还原旧 formateIfpass：含退回次数前缀）
    getIfpassText(ifpass, ifjump) {
      const jump = (ifjump != null && ifjump !== '') ? '[第' + ifjump + '次退回]' : ''
      const map = { '1': '通过', '2': '发表不同意见', '3': '流程跳转', '4': '追加意见', '5': '拿回', '9': '流程终止' }
      return jump + (map[ifpass] || '')
    },
    // 🔴 问题6.2修复：格式化阶段名（增强容错性）
    // 🔴 缺陷4修复：加强空值防御，统一使用parseStagename
    formatStagename(stagename) {
      // ✅ 空值快速返回
      if (stagename == null || stagename === '') return ''

      // ✅ 统一使用parseStagename解析索引（处理文本名称兼容）
      const index = this.parseStagename(stagename, null)

      // 有合法索引且有stagenames配置：返回阶段名称
      if (index != null && this.instance && this.instance.stagenames) {
        const stages = this.instance.stagenames.split(',')
        if (index >= 0 && index < stages.length) {
          return stages[index]
        }
      }

      // fallback: 不分阶段模式直接返回原值
      if (!this.existStage) return String(stagename)

      // 分阶段但无stagenames数据：尝试从stageExecutionStatus解析
      if (this.stageExecutionStatus && this.stageExecutionStatus.length > 0) {
        const stageInfo = this.stageExecutionStatus.find(s => String(s.stage) === String(stagename))
        if (stageInfo && stageInfo.stagename) {
          return stageInfo.stagename
        }
      }

      // 最终fallback: 有索引返回"阶段N"，否则返回原值
      return index != null ? `阶段${index}` : String(stagename)
    },

    // 🔴 问题5.1修复: 获取阶段选项（对齐旧系统 Line 704-733）
    // 🔴 问题1修复: 配合WorkflowInfoPanel的currentUserStage修复，现在任何节点处理人都能获取阶段选项
    // 🔴 缺陷2修复: 严格校验currentUserStage，防止空字符串通过检查
    // 🔧 优化3：简化逻辑，提升可读性
    getStageOptions() {
      if (!this.existStage || !this.instance || !this.instance.stagenames) return []

      // ✅ 严格校验：拦截null、undefined、空字符串
      if (!this.isStageLeader ||
          this.currentUserStage == null ||
          this.currentUserStage === '') {
        return []
      }

      const stages = this.instance.stagenames.split(',')
      const currentStage = parseInt(this.currentUserStage)

      // ✅ 校验索引合法性（对齐旧系统 formatestage 的空值检查）
      if (isNaN(currentStage) || currentStage < 0 || currentStage >= stages.length) {
        console.error('[getStageOptions] Invalid currentUserStage:', this.currentUserStage, 'Expected numeric index in [0,', stages.length - 1, ']')
        return []
      }

      // 检查下阶段是否有节点（对齐旧系统 insertstage=stageuser[stageno+1]）
      const hasNextStageNodes = this.dataSource.some(node => {
        const nodeStage = parseInt(node.stagename)
        return !isNaN(nodeStage) && nodeStage > currentStage
      })

      // 构建选项：当前阶段 + 下阶段（如果下阶段无节点且存在）
      // ⚠️ 修复：确保value为字符串类型，与数据库存储一致
      const options = [
        { value: currentStage.toString(), text: stages[currentStage] || String(currentStage) }
      ]

      if (!hasNextStageNodes && currentStage + 1 < stages.length) {
        options.push({
          value: (currentStage + 1).toString(),  // ✅ 确保字符串类型
          text: stages[currentStage + 1] || String(currentStage + 1)
        })
      }

      return options
    },

    // 🔴 问题6.3修复：编辑态阶段选项（确保至少显示当前值）
    getStageOptionsForEdit(record) {
      // 优先使用权限内的选项（新节点可选择阶段）
      const privilegedOptions = this.getStageOptions()
      if (privilegedOptions.length > 0) return privilegedOptions

      // fallback：非阶段领导或无权限时，至少显示当前节点的阶段
      if (!this.instance || !this.instance.stagenames) {
        // 无stagenames数据：返回兜底选项
        const num = parseInt(record.stagename)
        return [{
          value: record.stagename,
          text: !isNaN(num) ? `阶段${num}` : record.stagename
        }]
      }

      // 有stagenames数据：返回当前阶段选项
      const stages = this.instance.stagenames.split(',')
      const index = parseInt(record.stagename)
      if (!isNaN(index) && index >= 0 && index < stages.length) {
        return [{
          value: record.stagename,
          text: stages[index]
        }]
      }

      // 最终fallback
      return [{
        value: record.stagename,
        text: record.stagename
      }]
    },

    getNodetypeText(nodetype) {
      // 🔴 修复问题1：对齐旧系统，nodetype表示"处理方式"而非"节点类型"
      // 旧系统: '0'=所有人必完成, '1'=只1人完成
      const map = { '0': '所有人必完成', '1': '只1人完成' }
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
/* ═══════════════════════════════════════════════════════════════
   流程节点表格 - 紧凑清晰布局
   ═══════════════════════════════════════════════════════════════ */

.wf-instance-dtl-table {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.empty-tip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

/* ═══ 表格容器 ═══ */
::v-deep .ant-table-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

::v-deep .ant-spin-nested-loading {
  height: 100%;
  display: flex;
  flex-direction: column;
}

::v-deep .ant-spin-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

::v-deep .ant-table {
  height: 100%;
  display: flex;
  flex-direction: column;
}

::v-deep .ant-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

::v-deep .ant-table-header {
  flex-shrink: 0;
  overflow: hidden;
}

::v-deep .ant-table-body {
  flex: 1;
  overflow: auto !important;
}

/* ═══ 表格边框 ═══ */
::v-deep .ant-table-bordered .ant-table-container {
  border: 1px solid #d9d9d9;
}

::v-deep .ant-table-bordered .ant-table-content {
  border-right: 0;
}

/* 确保最后一行有下边框 */
::v-deep .ant-table-tbody > tr:last-child > td {
  border-bottom: 1px solid #d9d9d9 !important;
}

/* ═══ 表头样式 - 紧凑清晰 ═══ */
::v-deep .ant-table-thead > tr > th {
  padding: 10px 12px;
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  font-weight: 600;
  font-size: 13px;
  color: #262626;
  border-right: 1px solid #d9d9d9;
  border-bottom: 2px solid #d9d9d9;
  white-space: nowrap;
  text-align: center;
}

/* 固定列样式 */
::v-deep .ant-table-thead > tr > th.ant-table-cell-fix-left,
::v-deep .ant-table-tbody > tr > td.ant-table-cell-fix-left {
  background: #fafafa;
  z-index: 3;
}

::v-deep .ant-table-thead > tr > th.ant-table-cell-fix-left::after,
::v-deep .ant-table-tbody > tr > td.ant-table-cell-fix-left::after {
  box-shadow: inset -10px 0 8px -8px rgba(0, 0, 0, 0.1);
}

::v-deep .ant-table-thead > tr > th.ant-table-cell-fix-right,
::v-deep .ant-table-tbody > tr > td.ant-table-cell-fix-right {
  background: #fafafa;
  z-index: 3;
}

::v-deep .ant-table-thead > tr > th.ant-table-cell-fix-right::after,
::v-deep .ant-table-tbody > tr > td.ant-table-cell-fix-right::after {
  box-shadow: inset 10px 0 8px -8px rgba(0, 0, 0, 0.1);
}

/* ═══ 单元格样式 - 紧凑 ═══ */
::v-deep .ant-table-tbody > tr > td {
  padding: 8px 12px;
  font-size: 13px;
  color: #262626;
  border-right: 1px solid #d9d9d9;
  border-bottom: 1px solid #d9d9d9;
  vertical-align: middle;
}

/* ═══ 行样式 - 清晰区分 ═══ */

/* 普通行 */
::v-deep .ant-table-tbody > tr:not(.wf-row-done):not(.wf-row-todo) > td {
  background: #ffffff;
}

/* 已处理行 */
::v-deep .wf-row-done > td {
  background: #e6f7ff !important;
}

::v-deep .wf-row-done > td.ant-table-cell-fix-left {
  background: #bae7ff !important;
}

::v-deep .wf-row-done > td:nth-child(2) {
  border-left: 3px solid #1890ff;
  position: relative;
  padding-left: 24px;
}

::v-deep .wf-row-done > td:nth-child(2)::before {
  content: '✓';
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  color: #52c41a;
  font-weight: bold;
  font-size: 16px;
}

/* 待办行 */
::v-deep .wf-row-todo > td {
  background: #fffbe6 !important;
  font-weight: 500;
}

::v-deep .wf-row-todo > td.ant-table-cell-fix-left {
  background: #fff1b8 !important;
}

::v-deep .wf-row-todo > td:nth-child(2) {
  border-left: 3px solid #faad14;
}

/* ═══ 悬停效果 ═══ */
::v-deep .ant-table-tbody > tr:hover:not(.wf-row-done):not(.wf-row-todo) > td {
  background: #fafafa !important;
  cursor: pointer;
}

::v-deep .wf-row-done:hover > td {
  background: #91d5ff !important;
  cursor: pointer;
}

::v-deep .wf-row-done:hover > td.ant-table-cell-fix-left {
  background: #69c0ff !important;
}

::v-deep .wf-row-todo:hover > td {
  background: #ffe58f !important;
  cursor: pointer;
}

::v-deep .wf-row-todo:hover > td.ant-table-cell-fix-left {
  background: #ffd666 !important;
}

/* ═══ 内容样式 ═══ */

/* 处理情况列 */
.exec-cell {
  font-size: 12px;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
  color: #595959;
}

/* 文件链接 */
.file-link {
  display: inline-block;
  color: #1890ff;
  cursor: pointer;
  margin: 2px 4px 2px 0;
  padding: 2px 8px;
  font-size: 12px;
  background: #e6f7ff;
  border-radius: 2px;
  border: 1px solid #91d5ff;
  transition: all 0.2s;
}

.file-link:hover {
  color: #fff;
  background: #1890ff;
  border-color: #1890ff;
}

.link-disabled {
  color: #bfbfbf !important;
  cursor: not-allowed;
  pointer-events: none;
  opacity: 0.5;
}

.new-node-user {
  color: #1890ff;
  font-weight: 500;
}

/* ═══ 单选框 ═══ */
::v-deep .ant-table-selection-column {
  width: 50px !important;
  padding: 8px 12px !important;
}

/* ═══ 操作链接 ═══ */
::v-deep .ant-table-tbody > tr > td a {
  color: #1890ff;
  font-size: 13px;
  font-weight: 500;
}

::v-deep .ant-table-tbody > tr > td a:hover {
  color: #40a9ff;
}

::v-deep .ant-divider-vertical {
  margin: 0 6px;
  background: #d9d9d9;
  height: 12px;
}

/* ═══ 表单控件 ═══ */
::v-deep .ant-input,
::v-deep .ant-input-number,
::v-deep .ant-select-selection {
  font-size: 13px;
}

/* ═══ 空状态 ═══ */
::v-deep .ant-table-placeholder {
  padding: 40px 16px;
  background: #fafafa;
}

::v-deep .ant-empty-description {
  color: #8c8c8c;
  font-size: 13px;
}

/* ═══ 滚动条 ═══ */
::v-deep .ant-table-body::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::v-deep .ant-table-body::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 4px;
}

::v-deep .ant-table-body::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

::v-deep .ant-table-body::-webkit-scrollbar-track {
  background: #f5f5f5;
}
</style>
