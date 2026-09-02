<template>
  <div class="ietm-ddn-export-container">
    <!-- 表单区域 -->
    <a-card title="DDN基本信息" :bordered="false" class="form-card" size="small">
      <a-form-model
        ref="ddnForm"
        :model="formData"
        class="compact-inline-form"
      >
        <!-- 第一行：型号、密级、商业密级、警告 -->
        <div class="form-row">
          <a-form-model-item
            label="型号"
            prop="modelic"
            :rules="[{ required: true, message: '型号不能为空' }]"
            class="form-item-quarter"
          >
            <a-input
              v-model="formData.modelic"
              placeholder="从项目获取"
              size="small"
              :max-length="50"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item
            label="密级"
            prop="security"
            :rules="[{ required: true, message: '请选择密级' }]"
            class="form-item-quarter"
          >
            <j-dict-select-tag
              type="list"
              v-model="formData.security"
              dictCode="security"
              placeholder="请选择"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item
            label="商业密级"
            prop="commercialSecurity"
            class="form-item-quarter"
          >
            <a-select v-model="formData.commercialSecurity" placeholder="请选择" size="small" allow-clear style="width: 100%">
              <a-select-option
                v-for="opt in (commercialSecurityOptions.length > 0 ? commercialSecurityOptions : fallbackCommercialOptions)"
                :key="opt.value"
                :value="opt.value">
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-model-item>

          <a-form-model-item
            label="警告"
            prop="caveat"
            class="form-item-quarter"
          >
            <a-select v-model="formData.caveat" placeholder="请选择" size="small" allow-clear style="width: 100%">
              <a-select-option
                v-for="opt in (caveatOptions.length > 0 ? caveatOptions : fallbackCaveatOptions)"
                :key="opt.value"
                :value="opt.value">
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-model-item>
        </div>

        <!-- 第二行：导出单位、接收单位、发布日期、年份 -->
        <div class="form-row">
          <a-form-model-item
            label="导出单位"
            prop="sender"
            :rules="[{ required: true, message: '请输入导出单位' }]"
            class="form-item-quarter"
          >
            <a-input
              v-model="formData.sender"
              placeholder="从项目获取"
              size="small"
              :max-length="50"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item
            label="接收单位"
            prop="receiver"
            class="form-item-quarter"
          >
            <a-input
              v-model="formData.receiver"
              placeholder="默认00000"
              size="small"
              :max-length="50"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item
            label="发布日期"
            prop="issueDate"
            :rules="[{ required: true, message: '请选择日期' }]"
            class="form-item-quarter"
          >
            <a-date-picker
              v-model="formData.issueDate"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              placeholder="请选择日期"
              size="small"
              style="width: 100%"
              @change="onDateChange"
            />
          </a-form-model-item>

          <a-form-model-item
            label="年份"
            prop="year"
            class="form-item-quarter"
          >
            <a-input v-model="formData.year" size="small" disabled style="width: 100%" />
          </a-form-model-item>
        </div>
      </a-form-model>
    </a-card>

    <!-- DM列表区域 -->
    <a-card
      title="数据模块列表"
      :bordered="false"
      class="table-card"
    >
      <div class="table-operator">
        <div class="toolbar-left">
          <a-space :size="8">
            <a-button type="primary" icon="plus" @click="handleAddDm">
              添加DM
            </a-button>
            <a-button
              icon="delete"
              @click="handleDeleteDm"
              :disabled="selectedRowKeys.length === 0"
            >
              删除
            </a-button>
            <a-button
              icon="eye"
              @click="handlePreviewDm"
              :disabled="selectedRowKeys.length !== 1"
            >
              浏览
            </a-button>
          </a-space>
        </div>
        <div class="toolbar-right">
          <a-space :size="12">
            <div class="export-options">
              <span class="options-label">导出选项：</span>
              <a-checkbox-group v-model="exportOptions" class="options-group">
                <a-checkbox value="includeRefIcn">引用ICN</a-checkbox>
                <a-checkbox value="includeRefDm">引用DM</a-checkbox>
                <a-checkbox value="includeDmResource">DM资源</a-checkbox>
              </a-checkbox-group>
            </div>
            <a-button
              type="primary"
              icon="cloud-download"
              @click="handleGenerateDdn"
              :loading="generating"
            >
              生成数据包
            </a-button>
          </a-space>
        </div>
      </div>

      <!-- 表格内容 -->
      <div>
        <a-alert
          v-if="dmList.length === 0"
          message='暂无数据模块，请点击"添加DM"按钮选择'
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 16px;"
        />
        <a-table
          v-else
          ref="dmTable"
          :columns="columns"
          :data-source="dmList"
          :row-key="record => record.id"
          :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
          :pagination="paginationConfig"
          :loading="tableLoading"
          bordered
          size="middle"
        >
          <span slot="serial" slot-scope="text, record, index">
            {{ (paginationConfig.current - 1) * paginationConfig.pageSize + index + 1 }}
          </span>
          <span slot="dmcCode" slot-scope="text, record">
            <a @click="handleViewDmcDetail(record)" style="color: #1890ff; font-family: 'Consolas', monospace; cursor: pointer;">
              {{ text }}
            </a>
          </span>
          <span slot="issueDate" slot-scope="text">
            {{ text ? text.substring(0, 10) : '-' }}
          </span>
        </a-table>
      </div>
    </a-card>

    <!-- DM选择弹窗 -->
    <a-modal
      title="选择数据模块"
      :visible="dmSelectVisible"
      :width="1100"
      :mask="false"
      :maskClosable="false"
      :destroyOnClose="true"
      @cancel="handleDmSelectCancel"
      @ok="handleDmSelectConfirm">

      <div class="dm-select-body">
        <!-- 西区：构型树 -->
        <div class="dm-select-west">
          <config-tree @select="onTreeSelect"/>
        </div>

        <!-- 中区：双页签 -->
        <div class="dm-select-center">
          <a-tabs v-model="selectActiveTab" size="small">
            <!-- 页签1：引用最新版 -->
            <a-tab-pane key="latest" tab="引用最新版">
              <!-- 搜索栏 -->
              <div class="dm-select-search">
                <a-input v-model="selectQuery.dmc" placeholder="DMC" size="small" allow-clear @pressEnter="searchLatestDm"/>
                <a-input v-model="selectQuery.techName" placeholder="技术名称" size="small" allow-clear @pressEnter="searchLatestDm"/>
                <a-input v-model="selectQuery.infoName" placeholder="信息名称" size="small" allow-clear @pressEnter="searchLatestDm"/>
                <a-input v-model="selectQuery.dmTypeName" placeholder="DM类型" size="small" allow-clear @pressEnter="searchLatestDm"/>
                <a-button type="primary" size="small" icon="search" @click="searchLatestDm">查询</a-button>
                <a-button size="small" icon="delete" @click="clearLatestSearch">清空</a-button>
              </div>
              <!-- DM列表 -->
              <a-table
                :columns="selectColumns"
                :data-source="selectLatestList"
                :row-selection="selectLatestRowSelection"
                :pagination="selectLatestPagination"
                :loading="selectLatestLoading"
                :scroll="{ x: 950, y: 300 }"
                :customRow="rowRecord => ({ on: { click: () => onLatestRowClick(rowRecord) } })"
                bordered
                row-key="id"
                size="small"
                @change="onSelectLatestTableChange"/>
            </a-tab-pane>

            <!-- 页签2：引用指定版本 -->
            <a-tab-pane key="version" tab="引用指定版本">
              <!-- 搜索栏 -->
              <div class="dm-select-search">
                <a-input v-model="selectQueryVersion.dmc" placeholder="DMC" size="small" allow-clear @pressEnter="searchVersionDm"/>
                <a-input v-model="selectQueryVersion.techName" placeholder="技术名称" size="small" allow-clear @pressEnter="searchVersionDm"/>
                <a-input v-model="selectQueryVersion.infoName" placeholder="信息名称" size="small" allow-clear @pressEnter="searchVersionDm"/>
                <a-input v-model="selectQueryVersion.dmTypeName" placeholder="DM类型" size="small" allow-clear @pressEnter="searchVersionDm"/>
                <a-button type="primary" size="small" icon="search" @click="searchVersionDm">查询</a-button>
                <a-button size="small" icon="delete" @click="clearVersionSearch">清空</a-button>
              </div>
              <!-- DM列表 -->
              <a-table
                :columns="selectColumnsVersion"
                :data-source="selectVersionList"
                :row-selection="selectVersionRowSelection"
                :pagination="selectVersionPagination"
                :loading="selectVersionLoading"
                :scroll="{ x: 950, y: 300 }"
                :customRow="rowRecord => ({ on: { click: () => onVersionRowClick(rowRecord) } })"
                bordered
                row-key="id"
                size="small"
                @change="onSelectVersionTableChange"/>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>
    </a-modal>

    <!-- DM详情弹窗 -->
    <dm-edit-prop-modal ref="editPropModal" />
  </div>
</template>

<script>
import { getAction, postAction, downloadFile } from '@/api/manage'
import ConfigTree from '../ietmdatamodulemanagement/components/ConfigTree'
import JDictSelectTag from '@/components/dict/JDictSelectTag'
import DmEditPropModal from '../ietmdatamodulemanagement/components/DmEditPropModal'
import { mapState } from 'vuex'

// 常量配置
const CONSTANTS = {
  // 会话存储
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24小时

  // 默认值
  DEFAULT_RECEIVER: '00000',

  // 分页配置
  PAGE_SIZE_DEFAULT: 10,
  PAGE_SIZE_OPTIONS: ['10', '20', '50'],

  // 表格列宽
  COLUMN_WIDTH: {
    SERIAL: 55,
    DMC_CODE: 260,
    TECH_NAME: 130,
    INFO_NAME: 130,
    DM_TYPE: 100,
    DM_TYPE_SMALL: 90,
    VERSION_NO: 85,
    VERSION_TYPE: 85,
    VERSION_TYPE_SMALL: 90,
    VERSION_DATE: 95,
    VERSION_DATE_SMALL: 100,
    VERSION_NO_SMALL: 80,
    DMC_LONG: 300
  },

  // 弹窗配置
  MODAL_WIDTH: 1100,
  SELECT_TABLE_SCROLL: { x: 950, y: 300 },

  // 输入限制
  INPUT_MAX_LENGTH: 50,

  // 商业密级和警告范围
  SECURITY: {
    COMMERCIAL_START: 51,
    COMMERCIAL_COUNT: 49,
    CAVEAT_START: 51,
    CAVEAT_COUNT: 49
  },

  // 日期格式
  DATE_DISPLAY_LENGTH: 10
}

export default {
  name: 'IetmDdnExport',
  components: {
    ConfigTree,
    JDictSelectTag,
    DmEditPropModal
  },
  data() {
    return {
      formData: {
        modelic: '',
        security: '',
        commercialSecurity: '',
        caveat: '',
        sender: '',
        receiver: '00000',
        issueDate: '',
        year: ''
      },
      exportOptions: ['includeRefIcn', 'includeRefDm', 'includeDmResource'],
      dmList: [],
      selectedRowKeys: [],
      tableLoading: false,
      generating: false,
      paginationConfig: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: (total) => `共 ${total} 条`,
        size: 'small'
      },
      columns: [
        {
          title: '序号',
          dataIndex: 'serial',
          key: 'serial',
          width: 55,
          align: 'center',
          scopedSlots: { customRender: 'serial' }
        },
        {
          title: 'DMC编码',
          dataIndex: 'dmcCode',
          key: 'dmcCode',
          width: 260,
          align: 'center',
          ellipsis: true,
          scopedSlots: { customRender: 'dmcCode' }
        },
        {
          title: '技术名称',
          dataIndex: 'techName',
          key: 'techName',
          width: 130,
          align: 'center',
          ellipsis: true
        },
        {
          title: '信息名称',
          dataIndex: 'infoName',
          key: 'infoName',
          width: 130,
          align: 'center',
          ellipsis: true
        },
        {
          title: 'DM类型',
          dataIndex: 'dmTypeName',
          key: 'dmTypeName',
          width: 100,
          align: 'center',
          ellipsis: true
        },
        {
          title: '版本号',
          key: 'fullIssueNo',
          width: 85,
          align: 'center',
          customRender: (text, record) => {
            if (record.issueNo && record.inWork) {
              return `${record.issueNo}-${record.inWork}`
            }
            return '-'
          }
        },
        {
          title: '版本类型',
          dataIndex: 'issueType',
          key: 'issueType',
          width: 85,
          align: 'center'
        },
        {
          title: '版本日期',
          dataIndex: 'issueDate',
          key: 'issueDate',
          width: 95,
          align: 'center',
          scopedSlots: { customRender: 'issueDate' }
        }
      ],

      // DM选择弹窗
      dmSelectVisible: false,
      selectActiveTab: 'latest',
      selectCmNode: null,

      // Tab配置对象（重构P1-1：统一管理两个Tab的配置）
      selectTabConfig: {
        latest: {
          key: 'latest',
          label: '引用最新版',
          onlyIssued: false,                    // 核心差异：最新版
          queryKey: 'selectQuery',               // 搜索条件对象
          dataKey: 'selectLatestList',           // 数据列表
          selectedKeysKey: 'selectLatestKeys',   // 选中项
          loadingKey: 'selectLatestLoading',     // 加载状态
          paginationKey: 'selectLatestPagination' // 分页配置
        },
        version: {
          key: 'version',
          label: '引用指定版本',
          onlyIssued: true,                      // 核心差异：指定版本
          queryKey: 'selectQueryVersion',
          dataKey: 'selectVersionList',
          selectedKeysKey: 'selectVersionKeys',
          loadingKey: 'selectVersionLoading',
          paginationKey: 'selectVersionPagination'
        }
      },

      selectQuery: { dmc: '', techName: '', infoName: '', dmTypeName: '' },
      selectQueryVersion: { dmc: '', techName: '', infoName: '', dmTypeName: '' },
      selectLatestList: [],
      selectLatestKeys: [],
      selectLatestLoading: false,
      selectLatestPagination: { current: 1, pageSize: 10, total: 0, showTotal: t => `共 ${t} 条` },
      selectVersionList: [],
      selectVersionKeys: [],
      selectVersionLoading: false,
      selectVersionPagination: { current: 1, pageSize: 10, total: 0, showTotal: t => `共 ${t} 条` },

      // 修复P2-8：商业密级和警告选项（从数据字典加载，暂时保留硬编码作为回退）
      commercialSecurityOptions: [],
      caveatOptions: [],
      // 统一的DM选择列配置（基础列）
      selectColumnsBase: [
        { title: 'DMC', dataIndex: 'dmcCode', width: 300, ellipsis: true },
        { title: '技术名称', dataIndex: 'techName', width: 130, ellipsis: true },
        { title: '信息名称', dataIndex: 'infoName', width: 130, ellipsis: true },
        { title: 'DM类型', dataIndex: 'dmTypeName', width: 90, ellipsis: true, customRender: (v, row) => row.dmTypeName || row.dmType_dictText || '-' },
        { title: '版本类型', dataIndex: 'issueType', width: 90, align: 'center', customRender: (v, row) => row.issueType || '-' }
      ],
      // Tab2额外的列（版本信息）
      selectColumnsVersionExtra: [
        { title: '版本号', width: 80, align: 'center', customRender: (v, row) => `${row.issueNo}-${row.inWork}` },
        { title: '版本日期', dataIndex: 'issueDate', width: 100, align: 'center', customRender: v => this.fmtDate(v) }
      ]
    }
  },
  computed: {
    ...mapState({
      currentProject: state => state.project && state.project.currentProject
    }),
    currentUser() {
      return (this.$store.getters.userInfo && this.$store.getters.userInfo.username) || 'admin'
    },
    // 修复P2-8：商业密级回退选项（computed方便缓存）
    fallbackCommercialOptions() {
      return Array.from({ length: 49 }, (_, i) => ({
        value: `cc${i + 51}`,
        label: `cc${i + 51}`
      }))
    },
    // 修复P2-8：警告回退选项
    fallbackCaveatOptions() {
      return Array.from({ length: 49 }, (_, i) => ({
        value: `cv${i + 51}`,
        label: `cv${i + 51}`
      }))
    },
    // Tab1列配置（仅基础列）
    selectColumns() {
      return this.selectColumnsBase
    },
    // Tab2列配置（基础列 + 版本信息列）
    selectColumnsVersion() {
      return [...this.selectColumnsBase, ...this.selectColumnsVersionExtra]
    },
    // Tab1行选择配置（修复P1-1 Bug：使用computed确保响应式）
    selectLatestRowSelection() {
      return {
        selectedRowKeys: this.selectLatestKeys,
        onChange: this.onSelectLatestChange
      }
    },
    // Tab2行选择配置
    selectVersionRowSelection() {
      return {
        selectedRowKeys: this.selectVersionKeys,
        onChange: this.onSelectVersionChange
      }
    }
  },
  watch: {
    currentProject: {
      handler(val) {
        if (val) {
          this.formData.modelic = val.equipmentCode || ''
          // 密级字段：保持原始类型（Integer），由字典组件自动匹配
          this.formData.security = val.security != null ? val.security : ''
          this.formData.sender = val.originator || ''
        }
      },
      immediate: true
    },
    dmList: {
      handler(val) {
        this.paginationConfig.total = val.length
      },
      immediate: true
    }
  },
  mounted() {
    // 修复P2-11：移除initFormData()调用，避免与watch的immediate:true重复初始化
    // initFormData() 的逻辑已在 watch currentProject 的 immediate: true 中执行
    // this.initFormData()

    // 初始化发布日期为当天
    this.initIssueDate()

    // 恢复会话数据
    this.restoreSessionData()

    // 修复P2-8：加载商业密级和警告选项（从数据字典）
    // this.loadDictionaryOptions()
  },
  beforeDestroy() {
    // 保存会话数据
    this.saveSessionData()
  },
  methods: {
    handleViewDmcDetail(record) {
      this.$refs.editPropModal.show(record, true) // 第二个参数 true 表示查看模式
    },

    initFormData() {
      if (this.currentProject) {
        this.formData.modelic = this.currentProject.equipmentCode || ''
        this.formData.security = this.currentProject.security || ''
        this.formData.sender = this.currentProject.originator || ''
      }
      const today = new Date()
      this.formData.issueDate = this.formatDate(today)
      this.formData.year = today.getFullYear().toString()
    },

    initIssueDate() {
      const today = new Date()
      this.formData.issueDate = this.formatDate(today)
      this.formData.year = today.getFullYear().toString()
    },

    onDateChange(date, dateString) {
      if (dateString) {
        this.formData.year = dateString.substring(0, 4)
      }
    },

    handleAddDm() {
      if (!this.currentProject) {
        this.$message.warning('请先打开项目')
        return
      }
      this.dmSelectVisible = true
      this.selectActiveTab = 'latest'
      this.selectCmNode = null
      this.selectQuery = { dmc: '', techName: '', infoName: '', dmTypeName: '' }
      this.selectQueryVersion = { dmc: '', techName: '', infoName: '', dmTypeName: '' }
      this.selectLatestList = []
      this.selectVersionList = []
      this.selectLatestKeys = []
      this.selectVersionKeys = []
      this.selectLatestPagination = { ...this.selectLatestPagination, current: 1, total: 0 }
      this.selectVersionPagination = { ...this.selectVersionPagination, current: 1, total: 0 }
    },

    // DM选择弹窗 - 树节点选择
    onTreeSelect(node) {
      this.selectCmNode = node
      this.selectLatestPagination.current = 1
      this.selectVersionPagination.current = 1
      this.selectLatestKeys = []
      this.selectVersionKeys = []
      this.loadSelectLatest()
      this.loadSelectVersion()
    },

    // DM选择弹窗 - 构建查询参数
    buildSelectBaseParams() {
      if (!this.selectCmNode) return null
      return {
        cmNodeId: this.selectCmNode.cmNodeId || this.selectCmNode.nodeId,
        cmNodePath: this.selectCmNode.nodePath,
        includeChildren: !!this.selectCmNode.showChildren
      }
    },

    // DM选择弹窗 - 加载最新版列表
    // DM选择弹窗 - 统一加载方法（重构P1-1：合并loadSelectLatest和loadSelectVersion）
    loadSelectDmList(tabKey) {
      const config = this.selectTabConfig[tabKey || this.selectActiveTab]
      const base = this.buildSelectBaseParams()
      if (!base) return

      this[config.loadingKey] = true
      const query = this[config.queryKey]
      const params = {
        ...base,
        onlyIssued: config.onlyIssued,  // 核心差异：Tab1=false, Tab2=true
        pageNo: this[config.paginationKey].current,
        pageSize: this[config.paginationKey].pageSize,
        dmc: query.dmc || undefined,
        techName: query.techName || undefined,
        infoName: query.infoName || undefined,
        dmTypeName: query.dmTypeName || undefined
      }

      getAction('/ietm/datamodule/listForDialog', params).then(res => {
        if (res.success) {
          this[config.dataKey] = res.result.records || []
          this[config.paginationKey].total = res.result.total || 0
        } else {
          this.$message.warning(res.message || '查询失败')
        }
      }).catch(err => {
        this.$message.error('查询失败：' + (err.message || '网络错误'))
      }).finally(() => {
        this[config.loadingKey] = false
      })
    },

    // 保留旧方法名作为适配器（避免一次性修改所有调用处，降低风险）
    loadSelectLatest() {
      this.loadSelectDmList('latest')
    },
    loadSelectVersion() {
      this.loadSelectDmList('version')
    },

    // DM选择弹窗 - 统一搜索方法（重构P1-1）
    searchSelectDm(tabKey) {
      const config = this.selectTabConfig[tabKey || this.selectActiveTab]
      this[config.paginationKey].current = 1
      this[config.selectedKeysKey] = []
      this.loadSelectDmList(tabKey)
    },

    // DM选择弹窗 - 统一清空搜索（重构P1-1）
    clearSelectSearch(tabKey) {
      const config = this.selectTabConfig[tabKey || this.selectActiveTab]
      this[config.queryKey] = { dmc: '', techName: '', infoName: '', dmTypeName: '' }
      this.searchSelectDm(tabKey)
    },

    // 保留旧方法名作为适配器
    searchLatestDm() {
      this.searchSelectDm('latest')
    },
    clearLatestSearch() {
      this.clearSelectSearch('latest')
    },
    searchVersionDm() {
      this.searchSelectDm('version')
    },
    clearVersionSearch() {
      this.clearSelectSearch('version')
    },

    // DM选择弹窗 - 统一选择变更（重构P1-1）
    onSelectChange(keys, tabKey) {
      const config = this.selectTabConfig[tabKey || this.selectActiveTab]
      this[config.selectedKeysKey] = keys
    },

    // DM选择弹窗 - 统一行点击（重构P1-1）
    onSelectRowClick(record, tabKey) {
      const config = this.selectTabConfig[tabKey || this.selectActiveTab]
      const selectedKeys = this[config.selectedKeysKey]
      const index = selectedKeys.indexOf(record.id)
      if (index > -1) {
        // 已选中，取消选中
        selectedKeys.splice(index, 1)
      } else {
        // 未选中，添加选中
        selectedKeys.push(record.id)
      }
    },

    // DM选择弹窗 - 统一翻页（重构P1-1）
    onSelectTableChange(pagination, tabKey) {
      const config = this.selectTabConfig[tabKey || this.selectActiveTab]
      this[config.paginationKey].current = pagination.current
      this[config.paginationKey].pageSize = pagination.pageSize
      this.loadSelectDmList(tabKey)
    },

    // 保留旧方法名作为适配器（修复：使用splice保持响应式引用）
    onSelectLatestChange(keys) {
      this.selectLatestKeys.splice(0, this.selectLatestKeys.length, ...keys)
    },
    onSelectVersionChange(keys) {
      this.selectVersionKeys.splice(0, this.selectVersionKeys.length, ...keys)
    },
    onLatestRowClick(record) {
      this.onSelectRowClick(record, 'latest')
    },
    onVersionRowClick(record) {
      this.onSelectRowClick(record, 'version')
    },
    onSelectLatestTableChange(pg) {
      this.onSelectTableChange(pg, 'latest')
    },
    onSelectVersionTableChange(pg) {
      this.onSelectTableChange(pg, 'version')
    },

    // DM选择弹窗 - 辅助方法（重构P1-1：为模板提供动态数据访问）
    getTabColumns(tabKey) {
      return tabKey === 'latest' ? this.selectColumns : this.selectColumnsVersion
    },
    getTabData(tabKey) {
      const config = this.selectTabConfig[tabKey]
      return this[config.dataKey]
    },
    getTabSelection(tabKey) {
      const config = this.selectTabConfig[tabKey]
      return {
        selectedRowKeys: this[config.selectedKeysKey],
        onChange: (keys) => this.onSelectChange(keys, tabKey)
      }
    },
    getTabPagination(tabKey) {
      const config = this.selectTabConfig[tabKey]
      return this[config.paginationKey]
    },
    getTabLoading(tabKey) {
      const config = this.selectTabConfig[tabKey]
      return this[config.loadingKey]
    },
    getTabQuery(tabKey) {
      const config = this.selectTabConfig[tabKey]
      return this[config.queryKey]
    },
    getTabSelectedKeys(tabKey) {
      const config = this.selectTabConfig[tabKey]
      return this[config.selectedKeysKey]
    },

    // DM选择弹窗 - 取消（修复P1-12：清空选中状态）
    handleDmSelectCancel() {
      this.dmSelectVisible = false
      this.selectLatestKeys = []
      this.selectVersionKeys = []
    },

    // DM选择弹窗 - 确定
    handleDmSelectConfirm() {
      // 合并两个页签的选中项
      const selectedIds = [...new Set([...this.selectLatestKeys, ...this.selectVersionKeys])]
      if (selectedIds.length === 0) {
        this.$message.warning('请选择数据模块')
        return
      }

      // 从两个列表中提取选中的DM记录
      const selectedDms = []
      const existingIds = this.dmList.map(dm => dm.id)

      selectedIds.forEach(id => {
        // 先在最新版列表中查找
        let dm = this.selectLatestList.find(d => d.id === id)
        if (!dm) {
          // 再在指定版本列表中查找
          dm = this.selectVersionList.find(d => d.id === id)
        }
        if (dm && !existingIds.includes(dm.id)) {
          selectedDms.push(dm)
        }
      })

      if (selectedDms.length === 0) {
        this.$message.info('所选数据模块已在列表中')
        this.dmSelectVisible = false
        return
      }

      this.dmList.push(...selectedDms)
      this.$message.success(`成功添加 ${selectedDms.length} 个数据模块`)
      this.dmSelectVisible = false
      // 保存会话数据
      this.saveSessionData()
    },

    handleDeleteDm() {
      if (this.selectedRowKeys.length === 0) {
        return
      }
      const that = this
      this.$confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${this.selectedRowKeys.length} 个数据模块吗？`,
        onOk() {
          that.dmList = that.dmList.filter(dm => !that.selectedRowKeys.includes(dm.id))
          that.selectedRowKeys = []
          that.$message.success('删除成功')
          // 保存会话数据
          that.saveSessionData()
        }
      })
    },

    handlePreviewDm() {
      if (this.selectedRowKeys.length !== 1) {
        this.$message.warning('请选择一条记录')
        return
      }

      // 获取选中的DM数据
      const data = this.dmList.find(item => item.id === this.selectedRowKeys[0])

      if (!data || !data.id) {
        this.$message.error('无法获取DM信息，请重新选择')
        return
      }

      // 判断模式：如果是当前用户签出，则为编辑模式；否则为浏览模式
      const isMyCheckOut = data.checkoutUser && data.checkoutUser === this.currentUser
      const mode = isMyCheckOut ? 'edit' : 'browse'

      // 在系统Tab页签中打开编辑器（西区=导航树，中区=编辑器，东区=属性和元素区）
      this.$router.push({
        path: `/ietm/dm-content-editor/${data.id}`,
        query: {
          mode: mode,
          dmc: data.dmcCode || ''
        }
      })
    },

    handleGenerateDdn() {
      if (this.dmList.length === 0) {
        this.$message.error('数据模块列表为空，无法导出')
        return
      }

      this.$refs.ddnForm.validate(valid => {
        if (!valid) {
          this.$message.warning('请完善必填项')
          return
        }

        const params = {
          dmIds: this.dmList.map(dm => dm.id),
          modelic: this.formData.modelic,
          security: this.formData.security,
          commercialSecurity: this.formData.commercialSecurity,
          caveat: this.formData.caveat,
          sender: this.formData.sender,
          receiver: this.formData.receiver,
          issueDate: this.formData.issueDate,
          includeRefIcn: this.exportOptions.includes('includeRefIcn'),
          includeRefDm: this.exportOptions.includes('includeRefDm'),
          includeDmResource: this.exportOptions.includes('includeDmResource')
        }

        this.generating = true
        postAction('/ietm/ddn/generate', params)
          .then(res => {
            if (res.success) {
              this.$message.success(`DDN数据包生成成功：${res.result.ddnCode}`)

              // 如果有错误DM，显示警告通知
              if (res.result.errorDmList && res.result.errorDmList.length > 0) {
                this.$notification.warning({
                  message: '部分DM导出失败',
                  description: `以下 ${res.result.errorDmList.length} 个DM无法导出（无内容或不存在）：\n${res.result.errorDmList.join('\n')}`,
                  duration: 8
                })
              }

              this.$notification.success({
                message: '导出完成',
                description: `共导出 ${res.result.dmCount} 个DM，${res.result.icnCount} 个ICN`,
                duration: 3
              })

              // 修复BUG：使用downloadFile方法携带Token下载，而非window.open直接跳转
              // window.open会导致401错误（无Token）
              const fileName = res.result.fileName || `${res.result.ddnCode}.zip`
              downloadFile(res.result.downloadUrl, fileName)
                .catch(err => {
                  console.error('下载DDN数据包失败', err)
                  this.$message.error('下载失败：' + (err.message || '未知错误'))
                })
            } else {
              this.$message.error(res.message || '生成失败')
            }
          })
          .catch(err => {
            console.error('生成DDN失败', err)
            this.$message.error('生成失败：' + (err.message || '未知错误'))
          })
          .finally(() => {
            this.generating = false
          })
      })
    },

    onSelectChange(selectedRowKeys) {
      this.selectedRowKeys = selectedRowKeys
    },

    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    fmtDate(v) {
      if (!v) return ''
      if (typeof v === 'string') return v.length >= 10 ? v.substring(0, 10) : v
      const d = new Date(v)
      if (isNaN(d.getTime())) return ''
      const p = n => (n < 10 ? '0' + n : '' + n)
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    },

    // 保存会话数据到 sessionStorage（绑定项目ID）
    saveSessionData() {
      try {
        if (!this.currentProject || !this.currentProject.projectId) {
          return
        }
        const sessionKey = `ietm_ddn_export_${this.currentProject.projectId}`
        const sessionData = {
          projectId: this.currentProject.projectId,
          dmList: this.dmList,
          exportOptions: this.exportOptions,
          timestamp: Date.now()
        }
        sessionStorage.setItem(sessionKey, JSON.stringify(sessionData))
      } catch (e) {
        console.warn('保存DDN导出会话数据失败', e)
      }
    },

    // 从 sessionStorage 恢复会话数据（校验项目ID和时效性）
    restoreSessionData() {
      try {
        if (!this.currentProject || !this.currentProject.projectId) {
          return
        }
        const sessionKey = `ietm_ddn_export_${this.currentProject.projectId}`
        const savedData = sessionStorage.getItem(sessionKey)
        if (savedData) {
          const sessionData = JSON.parse(savedData)
          // 校验项目ID一致性
          if (sessionData.projectId !== this.currentProject.projectId) {
            sessionStorage.removeItem(sessionKey)
            return
          }
          // 校验时效性（24小时）
          const ONE_DAY = 24 * 60 * 60 * 1000
          if (Date.now() - sessionData.timestamp > ONE_DAY) {
            sessionStorage.removeItem(sessionKey)
            return
          }
          this.dmList = sessionData.dmList || []
          this.exportOptions = sessionData.exportOptions || ['includeRefIcn', 'includeRefDm', 'includeDmResource']
        }
      } catch (e) {
        console.warn('恢复DDN导出会话数据失败', e)
        if (this.currentProject && this.currentProject.projectId) {
          const sessionKey = `ietm_ddn_export_${this.currentProject.projectId}`
          sessionStorage.removeItem(sessionKey)
        }
      }
    }
  }
}
</script>

<style scoped>
.ietm-ddn-export-container {
  padding: 0;
  background-color: #f0f2f5;
  min-height: calc(100vh - 64px);
}

/* ========== 表单卡片 ========== */
.form-card {
  margin-bottom: 16px;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.form-card >>> .ant-card-head {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  padding: 8px 16px;
  min-height: 40px;
}

.form-card >>> .ant-card-head-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  padding: 4px 0;
}

.form-card >>> .ant-card-body {
  padding: 16px 24px;
}

/* 紧凑行内表单布局 */
.compact-inline-form {
  width: 100%;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-item-quarter {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  margin-bottom: 0 !important;
}

.form-item-quarter >>> .ant-form-item-label {
  flex: 0 0 90px;
  padding-right: 8px;
  line-height: 28px;
  text-align: right;
  white-space: nowrap;
}

.form-item-quarter >>> .ant-form-item-label > label {
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  font-size: 13px;
  height: 28px;
  display: inline-flex;
  align-items: center;
}

.form-item-quarter >>> .ant-form-item-label > label::after {
  content: '：';
  margin-left: 2px;
}

.form-item-quarter >>> .ant-form-item-control-wrapper {
  flex: 1;
  min-width: 0;
}

.form-item-quarter >>> .ant-form-item-control {
  line-height: 28px;
}

.form-card >>> .ant-input-sm,
.form-card >>> .ant-calendar-picker-input,
.form-card >>> .ant-select-sm {
  height: 28px;
  line-height: 28px;
  font-size: 13px;
}

.form-card >>> .ant-select-selection--single {
  height: 28px;
}

.form-card >>> .ant-select-selection__rendered {
  line-height: 26px;
}

/* ========== 表格卡片 ========== */
.table-card {
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ========== 工具栏 ========== */
.table-operator {
  margin-bottom: 16px;
}

.toolbar-left {
  display: inline-block;
}

.toolbar-right {
  float: right;
  display: inline-block;
}

/* 导出选项 */
.export-options {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background-color: #f5f5f5;
  border-radius: 2px;
  border: 1px solid #d9d9d9;
}

.options-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  font-weight: 500;
  white-space: nowrap;
}

.options-group {
  display: flex;
  gap: 12px;
}

.options-group >>> .ant-checkbox-wrapper {
  margin-right: 0;
  font-size: 13px;
}

.options-group >>> .ant-checkbox-wrapper + .ant-checkbox-wrapper {
  margin-left: 0;
}

/* ========== DM选择弹窗 ========== */
.dm-select-body {
  display: flex;
  height: 480px;
}

.dm-select-west {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e8e8e8;
  padding-right: 12px;
  margin-right: 12px;
  overflow: hidden;
}

.dm-select-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.dm-select-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.dm-select-search .ant-input {
  flex: 1;
  min-width: 0;
}

.dm-select-center >>> .ant-table-tbody > tr {
  cursor: pointer;
}

.dm-select-center >>> .ant-table-tbody > tr:hover {
  background-color: #e6f7ff !important;
}

/* ========== 响应式优化 ========== */
@media (max-width: 1440px) {
  .export-options {
    padding: 4px 10px;
  }

  .options-group {
    gap: 10px;
  }
}
</style>
