<template>
  <a-modal
    title="引用DM"
    :visible="visible"
    :width="1100"
    :mask="false"
    :maskClosable="false"
    :destroyOnClose="true"
    wrapClassName="dm-ref-dialog"
    @cancel="handleClose">

    <div class="dm-ref-body">
      <!-- 西区：构型树（复用列表页 ConfigTree，自带"显示子节点"及当前项目加载）-->
      <div class="dm-ref-west">
        <config-tree @select="onTreeSelect"/>
      </div>

      <!-- 中区：双页签 -->
      <div class="dm-ref-center">
        <a-tabs v-model="activeTab" size="small" class="dm-ref-tabs">
          <!-- 页签1：引用最新版 -->
          <a-tab-pane key="latest" tab="引用最新版">
            <!-- 搜索栏 -->
            <div class="dm-ref-search">
              <a-input v-model="query.dmc" placeholder="DMC" size="small" allow-clear class="search-dmc" @pressEnter="searchData"/>
              <a-input v-model="query.techName" placeholder="技术名称" size="small" allow-clear class="search-field" @pressEnter="searchData"/>
              <a-input v-model="query.infoName" placeholder="信息名称" size="small" allow-clear class="search-field" @pressEnter="searchData"/>
              <a-input v-model="query.dmTypeName" placeholder="DM类型" size="small" allow-clear class="search-field" @pressEnter="searchData"/>
              <a-button type="primary" size="small" icon="search" @click="searchData">查询</a-button>
              <a-button size="small" icon="delete" @click="clearData">清空</a-button>
            </div>
            <!-- DM列表 -->
            <a-table
              class="dm-ref-table"
              :columns="columnsLatest"
              :data-source="latestList"
              :row-selection="latestRowSelection"
              :pagination="latestPagination"
              :loading="latestLoading"
              :custom-row="latestCustomRow"
              :row-class-name="rowClassName"
              :scroll="{ x: 820, y: 240 }"
              :bordered="true"
              row-key="id"
              size="small"
              @change="onLatestTableChange"/>
            <!-- 引用选项区 -->
            <div class="dm-ref-option">
              <a-radio-group v-model="refRadio" :disabled="!currentRowId" @change="onRefRadioChange">
                <a-radio :value="0">整体引用</a-radio>
                <a-radio :value="1">内部引用</a-radio>
              </a-radio-group>
              <a-select
                class="dm-ref-combo"
                size="small"
                placeholder="选择内部片段"
                :disabled="refRadio !== 1 || !currentRowId"
                :value="currentFragment"
                @change="onFragmentChange">
                <!-- 空态：已选行但该DM无带id可引用元素时给出明确提示，避免误判为故障 -->
                <div slot="notFoundContent">
                  {{ fragmentsLoading ? '加载中…' : '该DM无可引用片段（元素未设id）' }}
                </div>
                <a-select-opt-group v-for="grp in fragmentGroups" :key="grp.group" :label="grp.group">
                  <a-select-option v-for="frag in grp.items" :key="frag" :value="frag">{{ frag }}</a-select-option>
                </a-select-opt-group>
              </a-select>
              <a-tooltip title="DM引用默认不包括版本号和日期，双击某行DM可切换为包括版本号和日期（该行字体变为红色）">
                <span class="dm-ref-tip">
                  <a-icon type="info-circle" /> 双击行可切换“含版本号/日期”（<b>红色</b>标记）
                </span>
              </a-tooltip>
            </div>
          </a-tab-pane>
          <!-- 页签2：引用指定版本 -->
          <a-tab-pane key="version" tab="引用指定版本">
            <a-table
              class="dm-ref-table"
              :columns="columnsVersion"
              :data-source="versionList"
              :row-selection="versionRowSelection"
              :pagination="versionPagination"
              :loading="versionLoading"
              :scroll="{ x: 820, y: 300 }"
              row-key="id"
              size="small"
              @change="onVersionTableChange"/>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>

    <template slot="footer">
      <a-button @click="handleClose">关闭</a-button>
      <a-button type="primary" :loading="confirming" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>
<script>
import { getAction, postAction } from '@/api/manage'
import ConfigTree from '../../components/ConfigTree'

// getRef 返回的元素类型 → 中文分组名（§14.5.2③）
const GROUP_MAP = {
  para: '段落',
  figure: '插图',
  multimediaObject: '多媒体',
  multimedia: '多媒体',
  table: '表格'
}

export default {
  name: 'IetmDmRefDialog',
  components: { ConfigTree },
  data() {
    return {
      visible: false,
      confirming: false,
      activeTab: 'latest',

      // 当前树节点
      cmNode: null,

      // 搜索条件（仅页签1）
      query: { dmc: '', techName: '', infoName: '', dmTypeName: '' },

      // 页签1：最新版
      latestList: [],
      latestLoading: false,
      latestCheckedKeys: [],
      latestPagination: { current: 1, pageSize: 10, total: 0, showTotal: t => `共 ${t} 条` },

      // 页签2：指定版本
      versionList: [],
      versionLoading: false,
      versionCheckedKeys: [],
      versionPagination: { current: 1, pageSize: 10, total: 0, showTotal: t => `共 ${t} 条` },

      // "含版本"的DM id（弹窗生命周期内持久，§14.5.7⑧）
      hasissueIds: [],
      // 当前选中行id（页签1，用于加载片段/引用选项）
      currentRowId: '',
      // 引用模式：0整体(默认) / 1内部
      refRadio: 0,
      // {dmId: 片段id}
      innerrefMap: {},
      // 片段下拉分组
      fragmentGroups: [],
      // 片段加载中（控制下拉空态文案：加载中 vs 无可引用片段）
      fragmentsLoading: false
    }
  },
  computed: {
    columnsLatest() {
      return [
        {
          title: 'DMC',
          dataIndex: 'dmcCode',
          width: 300,
          ellipsis: true,
          customRender: (v, row) => this.hasissueIds.includes(row.id) ? v : this.stripVersion(v)
        },
        { title: '技术名称', dataIndex: 'techName', width: 130, ellipsis: true },
        { title: '信息名称', dataIndex: 'infoName', width: 130, ellipsis: true },
        {
          title: 'DM类型',
          dataIndex: 'dmTypeName',
          width: 90,
          ellipsis: true,
          // DM类型显示与搜索/后端一致：优先 dmTypeName（ietm_dm_type.type_name，搜索框即按此过滤），
          // 字典 dmType_dictText 仅作兜底，避免"搜描述类却显描述性DM"的自相矛盾。
          customRender: (v, row) => row.dmTypeName || row.dmType_dictText || '-'
        },
        {
          title: '版本类型',
          dataIndex: 'issueType',
          width: 90,
          align: 'center',
          // 直接显示数据库中的 issueType 字段
          customRender: (v, row) => {
            return row.issueType || '-'
          }
        },
        {
          title: '版本号',
          width: 80,
          align: 'center',
          customRender: (v, row) => this.hasissueIds.includes(row.id) ? `${row.issueNo}-${row.inWork}` : ''
        },
        {
          title: '版本日期',
          dataIndex: 'issueDate',
          width: 100,
          align: 'center',
          customRender: (v, row) => this.hasissueIds.includes(row.id) ? this.fmtDate(v) : ''
        }
      ]
    },
    columnsVersion() {
      return [
        { title: 'DMC', dataIndex: 'dmcCode', width: 300, ellipsis: true },
        { title: '技术名称', dataIndex: 'techName', width: 130, ellipsis: true },
        { title: '信息名称', dataIndex: 'infoName', width: 130, ellipsis: true },
        {
          title: 'DM类型',
          dataIndex: 'dmTypeName',
          width: 90,
          ellipsis: true,
          // 与页签1、搜索、后端一致：优先 dmTypeName，字典兜底
          customRender: (v, row) => row.dmTypeName || row.dmType_dictText || '-'
        },
        {
          title: '版本类型',
          dataIndex: 'issueType',
          width: 90,
          align: 'center',
          // 直接显示数据库中的 issueType 字段
          customRender: (v, row) => {
            return row.issueType || '-'
          }
        },
        {
          title: '版本号',
          width: 80,
          align: 'center',
          customRender: (v, row) => `${row.issueNo}-${row.inWork}`
        },
        {
          title: '版本日期',
          dataIndex: 'issueDate',
          width: 100,
          align: 'center',
          customRender: v => this.fmtDate(v)
        }
      ]
    },
    latestRowSelection() {
      return {
        selectedRowKeys: this.latestCheckedKeys,
        onChange: this.onLatestSelectChange
      }
    },
    versionRowSelection() {
      return {
        selectedRowKeys: this.versionCheckedKeys,
        onChange: this.onVersionSelectChange
      }
    },
    currentFragment() {
      return this.currentRowId ? (this.innerrefMap[this.currentRowId] || undefined) : undefined
    }
  },
  methods: {
    // 打开弹窗：重置会话内所有状态（含版本标记不跨open保留）
    show() {
      this.visible = true
      this.confirming = false
      this.activeTab = 'latest'
      this.cmNode = null
      this.query = { dmc: '', techName: '', infoName: '', dmTypeName: '' }
      this.latestList = []
      this.versionList = []
      this.latestCheckedKeys = []
      this.versionCheckedKeys = []
      this.latestPagination = { ...this.latestPagination, current: 1, total: 0 }
      this.versionPagination = { ...this.versionPagination, current: 1, total: 0 }
      this.hasissueIds = []
      this.currentRowId = ''
      this.refRadio = 0
      this.innerrefMap = {}
      this.fragmentGroups = []
      this.fragmentsLoading = false
    },
    handleClose() { this.visible = false },

    // ── 树选择联动 ────────────────────────────────────────────────
    onTreeSelect(node) {
      this.cmNode = node
      this.latestPagination.current = 1
      this.versionPagination.current = 1
      // 切换节点清空旧勾选（§14.5.2②），但 hasissueIds 保留
      this.latestCheckedKeys = []
      this.versionCheckedKeys = []
      this.currentRowId = ''
      this.fragmentGroups = []
      this.loadLatest()
      this.loadVersion()
    },

    // ── 列表查询 ──────────────────────────────────────────────────
    buildBaseParams() {
      if (!this.cmNode) return null
      return {
        cmNodeId: this.cmNode.cmNodeId || this.cmNode.nodeId,
        cmNodePath: this.cmNode.nodePath,
        includeChildren: !!this.cmNode.showChildren
      }
    },
    loadLatest() {
      const base = this.buildBaseParams()
      if (!base) return
      this.latestLoading = true
      const params = {
        ...base,
        onlyIssued: false,
        pageNo: this.latestPagination.current,
        pageSize: this.latestPagination.pageSize,
        dmc: this.query.dmc || undefined,
        techName: this.query.techName || undefined,
        infoName: this.query.infoName || undefined,
        dmTypeName: this.query.dmTypeName || undefined
      }
      getAction('/ietm/datamodule/listForDialog', params).then(res => {
        if (res.success) {
          this.latestList = res.result.records || []
          this.latestPagination.total = res.result.total || 0
        } else {
          this.$message.warning(res.message || '查询失败')
        }
      }).catch(err => {
        this.$message.error('查询失败：' + (err.message || '网络错误'))
      }).finally(() => { this.latestLoading = false })
    },
    loadVersion() {
      const base = this.buildBaseParams()
      if (!base) return
      this.versionLoading = true
      const params = {
        ...base,
        onlyIssued: true,
        pageNo: this.versionPagination.current,
        pageSize: this.versionPagination.pageSize
      }
      getAction('/ietm/datamodule/listForDialog', params).then(res => {
        if (res.success) {
          this.versionList = res.result.records || []
          this.versionPagination.total = res.result.total || 0
        } else {
          this.$message.warning(res.message || '查询失败')
        }
      }).catch(err => {
        this.$message.error('查询失败：' + (err.message || '网络错误'))
      }).finally(() => { this.versionLoading = false })
    },
    onLatestSelectChange(keys) { this.latestCheckedKeys = keys },
    onVersionSelectChange(keys) { this.versionCheckedKeys = keys },
    onLatestTableChange(pg) { this.latestPagination.current = pg.current; this.latestPagination.pageSize = pg.pageSize; this.loadLatest() },
    onVersionTableChange(pg) { this.versionPagination.current = pg.current; this.versionPagination.pageSize = pg.pageSize; this.loadVersion() },
    searchData() { this.latestPagination.current = 1; this.latestCheckedKeys = []; this.loadLatest() },
    clearData() { this.query = { dmc: '', techName: '', infoName: '', dmTypeName: '' }; this.searchData() },

    // ── 行交互（页签1）────────────────────────────────────────────
    latestCustomRow(record) {
      return {
        on: {
          click: () => this.onRowClick(record),
          dblclick: () => this.onRowDblClick(record)
        }
      }
    },
    rowClassName(record) {
      return this.hasissueIds.includes(record.id) ? 'dm-ref-row--hasver' : ''
    },
    // 单击行：启用引用选项 + 加载内部片段
    onRowClick(record) {
      this.currentRowId = record.id
      this.fragmentGroups = []
      this.fragmentsLoading = true
      getAction(`/ietm/dm-content/getRef/${record.id}`).then(res => {
        if (res.success && res.result && res.result.refs) {
          this.fragmentGroups = this.groupFragments(res.result.refs)
        }
      }).catch(err => {
        this.$message.error('加载片段失败：' + (err.message || '网络错误'))
      }).finally(() => { this.fragmentsLoading = false })
    },
    // 双击行：切换"含版本"状态（§14.5.3②）
    onRowDblClick(record) {
      const idx = this.hasissueIds.indexOf(record.id)
      if (idx > -1) this.hasissueIds.splice(idx, 1)
      else this.hasissueIds.push(record.id)
      // 触发列 customRender 重算
      this.latestList = [...this.latestList]
    },
    // 片段列表按类型分组填充
    groupFragments(refs) {
      const map = {}
      refs.forEach(item => {
        const arr = item.split('%%%')
        if (arr.length < 2) return
        const type = arr[0]
        const fragId = arr[1]
        const group = GROUP_MAP[type] || type
        if (!map[group]) map[group] = []
        map[group].push(fragId)
      })
      return Object.keys(map).map(g => ({ group: g, items: map[g] }))
    },
    // 引用模式切换
    onRefRadioChange() {
      if (this.refRadio === 0 && this.currentRowId) {
        this.$delete(this.innerrefMap, this.currentRowId)
      }
    },
    // 选中片段写回当前行
    onFragmentChange(val) {
      if (this.currentRowId) this.$set(this.innerrefMap, this.currentRowId, val)
    },

    // ── 确定 ──────────────────────────────────────────────────────
    handleConfirm() {
      // 汇总两页签勾选（按id去重）
      const items = []
      const seen = {}
      this.latestCheckedKeys.forEach(id => {
        if (seen[id]) return
        seen[id] = true
        items.push({
          dmId: id,
          includeVersion: this.hasissueIds.includes(id),
          referredFragment: this.innerrefMap[id] || null
        })
      })
      this.versionCheckedKeys.forEach(id => {
        if (seen[id]) return
        seen[id] = true
        // 指定版本恒含版本，不支持内部引用
        items.push({ dmId: id, includeVersion: true, referredFragment: null })
      })
      if (items.length === 0) { this.$message.warning('请勾选DM。'); return }

      this.confirming = true
      postAction('/ietm/dm-content/buildDmRef', items).then(res => {
        // flag==="success" 即视为成功（关闭弹窗）；xml 为空属数据问题，给出警告但仍关闭。
        // 旧写法 `res.result.xml`（truthy）在 xml="" 时误走 error 分支导致弹窗无法关闭。
        if (res.success && res.result && res.result.flag === 'success') {
          if (res.result.xml) {
            this.$emit('insert', res.result.xml)
          } else {
            this.$message.warning('生成的dmRef XML为空，请检查目标DM内容是否含有效dmCode。')
          }
          this.visible = false
        } else {
          this.$message.error(res.message || '生成dmRef失败')
        }
      }).catch(err => {
        this.$message.error('生成dmRef失败：' + (err.message || '网络错误'))
      }).finally(() => { this.confirming = false })
    },

    // ── 工具 ──────────────────────────────────────────────────────
    // 去掉 DMC 的版本块（对标老系统 getDmc 格式：DMC-{body}_{issueNo}-{inWork}_{lang}-{country}）
    // 三个下划线段：[主体, 版本块(issueNo-inWork), 语言块]，去掉中间版本块后重接。
    stripVersion(dmc) {
      if (!dmc) return dmc
      const us = dmc.split('_')
      if (us.length < 3) return dmc
      return us[0] + '_' + us.slice(2).join('_')
    },
    fmtDate(v) {
      if (!v) return ''
      if (typeof v === 'string') return v.length >= 10 ? v.substring(0, 10) : v
      const d = new Date(v)
      if (isNaN(d.getTime())) return ''
      const p = n => (n < 10 ? '0' + n : '' + n)
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    }
  }
}
</script>
<style lang="less" scoped>
.dm-ref-body {
  display: flex;
  height: 480px;
}
.dm-ref-west {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e8e8e8;
  padding-right: 12px;
  margin-right: 12px;
  overflow: hidden;
}
.dm-ref-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.dm-ref-tabs {
  /deep/ .ant-tabs-tabpane { overflow: visible; }
}
.dm-ref-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  .search-dmc { flex: 2; min-width: 0; }
  .search-field { flex: 1; min-width: 0; }
}
.dm-ref-table {
  /deep/ .ant-table-thead > tr > th {
    background: #fafafa;
    font-weight: 600;
    padding: 6px 8px;
  }
  /deep/ .ant-table-tbody > tr > td { padding: 6px 8px; }
}
.dm-ref-option {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 8px 12px;
  background: #f5f7fa;
  border: 1px solid #eef0f3;
  border-radius: 4px;

  .dm-ref-combo { width: 180px; }
  .dm-ref-tip {
    color: #888;
    font-size: 12px;
    margin-left: auto;
    cursor: help;
  }
  .dm-ref-tip b { color: red; }
}
</style>
<style lang="less">
/* 含版本行：红色粗体（非 scoped，作用到 a-table 内部行）*/
.dm-ref-dialog .dm-ref-row--hasver td {
  color: red;
  font-weight: bold;
}
</style>
