<template>
  <a-modal
    title="选择项目信息码"
    :width="1000"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
    :bodyStyle="{ padding: '0' }"
    wrapClassName="info-code-selector-modal"
  >
    <!-- 顶部搜索栏 -->
    <div class="selector-header">
      <div class="header-content">
        <div class="search-wrapper">
          <a-input-search
            v-model="searchText"
            placeholder="输入信息码快速搜索"
            allow-clear
            enter-button
            size="large"
            @search="handleSearch"
            @pressEnter="handleSearch"
            class="search-input"
          >
            <a-icon slot="prefix" type="search" style="color: #bfbfbf;" />
          </a-input-search>
        </div>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="selector-body">
      <a-table
        :columns="columns"
        :dataSource="dataSource"
        :pagination="pagination"
        :loading="loading"
        size="middle"
        rowKey="id"
        bordered
        @change="handleTableChange"
        :customRow="customRow"
        :locale="{
          emptyText: '暂无信息码数据',
          filterConfirm: '确定',
          filterReset: '重置'
        }"
      >
        <!-- 信息码列 -->
        <span slot="infocode" slot-scope="text">
          <span class="code-text">{{ text }}</span>
        </span>

        <!-- DM类型列 -->
        <span slot="dmtypename" slot-scope="text">
          <a-badge :status="getDmTypeStatus(text)" :text="text || '-'" />
        </span>

        <!-- 描述列 -->
        <span slot="description" slot-scope="text, record">
          <div class="description-cell">
            <a-tooltip v-if="text && text.length > 30" :title="text">
              <span class="description-text">{{ text }}</span>
            </a-tooltip>
            <span v-else class="description-text">{{ text || '-' }}</span>
          </div>
        </span>

        <!-- 操作列 -->
        <span slot="action" slot-scope="text, record">
          <a @click="handleSelect(record)" class="action-link">
            <a-icon type="check-circle" />
            选择
          </a>
        </span>
      </a-table>
    </div>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'InfoCodeSelector',
  props: {
    projectId: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      visible: false,
      loading: false,
      searchText: '',
      dataSource: [],
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total) => `共 ${total} 条记录`
      },
      columns: [
        {
          title: '信息码',
          dataIndex: 'infocode',
          align: 'center',
          scopedSlots: { customRender: 'infocode' }
        },
        {
          title: 'DM类型',
          dataIndex: 'dmtypename',
          align: 'center',
          ellipsis: true,
          scopedSlots: { customRender: 'dmtypename' }
        },
        {
          title: '描述',
          dataIndex: 'description',
          align: 'center',
          ellipsis: true,
          scopedSlots: { customRender: 'description' }
        },
        {
          title: '操作',
          key: 'action',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      ]
    }
  },
  methods: {
    show() {
      this.visible = true
      this.searchText = ''
      this.pagination.current = 1
      this.loadData()
    },
    loadData() {
      this.loading = true
      const params = {
        pageNo: this.pagination.current,
        pageSize: this.pagination.pageSize
      }

      // 添加项目ID过滤
      if (this.projectId) {
        params.projectId = this.projectId
      }

      if (this.searchText) {
        // 只搜索信息码字段（code）
        // 注意：Jeecg的QueryGenerator在传递多个不同字段时使用AND逻辑
        // 如果需要OR搜索（code或description），需要后端自定义查询逻辑
        params.code = `*${this.searchText}*`
      }

      getAction('/projectinformationcode/ietmProjectInformationCode/list', params)
        .then(res => {
          if (res.success) {
            // 后端返回的字段名是 code 和 dmtypeName，需要映射到前端表格的字段
            const records = (res.result.records || []).map(item => ({
              ...item,
              infocode: item.code,
              dmtypename: item.dmtypeName,
              dmtypeid: item.dmtypeId
            }))
            this.dataSource = records
            this.pagination.total = res.result.total || 0
          } else {
            this.$message.error(res.message || '加载信息码列表失败')
          }
        })
        .catch(err => {
          console.error('加载信息码失败', err)
          this.$message.error('加载信息码列表失败')
        })
        .finally(() => {
          this.loading = false
        })
    },
    handleSearch() {
      this.pagination.current = 1
      this.loadData()
    },
    handleTableChange(pagination) {
      this.pagination.current = pagination.current
      this.pagination.pageSize = pagination.pageSize
      this.loadData()
    },
    customRow(record) {
      return {
        on: {
          dblclick: () => {
            this.handleSelect(record)
          }
        }
      }
    },
    handleSelect(record) {
      this.$emit('select', record)
      this.visible = false
      this.searchText = ''
    },
    handleCancel() {
      this.visible = false
      this.searchText = ''
    },
    // 根据DM类型返回badge状态
    getDmTypeStatus(dmType) {
      const statusMap = {
        'descript': 'processing',
        'proced': 'success',
        'ipd': 'warning',
        'fault': 'error',
        'schedul': 'default',
        'crew': 'default'
      }
      return statusMap[dmType] || 'default'
    }
  }
}
</script>

<style scoped>
/* ==================== 弹窗整体 ==================== */
::v-deep .info-code-selector-modal .ant-modal {
  top: 40px;
}

/* 使用系统默认的Modal标题样式 */
::v-deep .info-code-selector-modal .ant-modal-header {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  padding: 16px 24px;
}

::v-deep .info-code-selector-modal .ant-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

::v-deep .info-code-selector-modal .ant-modal-close-x {
  width: 56px;
  height: 56px;
  line-height: 56px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 16px;
}

::v-deep .info-code-selector-modal .ant-modal-close-x:hover {
  color: rgba(0, 0, 0, 0.75);
}

/* ==================== 顶部搜索栏 ==================== */
.selector-header {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  padding: 20px 24px;
}

.header-content {
  display: flex;
  align-items: center;
}

.search-wrapper {
  width: 100%;
}

.search-input {
  width: 100%;
  max-width: 600px;
}

::v-deep .search-input .ant-input-search-button {
  background: #1890ff;
  border-color: #1890ff;
  height: 40px;
}

::v-deep .search-input .ant-input-search-button:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}

::v-deep .search-input .ant-input {
  height: 40px;
  border-radius: 4px;
}

/* ==================== 表格区域 ==================== */
.selector-body {
  padding: 16px 24px 24px;
  max-height: 520px;
  overflow-y: auto;
}

/* 信息码文本 */
.code-text {
  font-family: 'Courier New', 'Consolas', monospace;
  font-weight: 600;
  font-size: 13px;
  color: #1890ff;
  letter-spacing: 0.5px;
}

/* 描述单元格 */
.description-cell {
  display: flex;
  justify-content: center;
  line-height: 1.5;
}

.description-text {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

/* 操作链接 */
.action-link {
  color: #1890ff;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s;
}

.action-link:hover {
  color: #40a9ff;
}

.action-link .anticon {
  margin-right: 4px;
}

/* 表格样式 */
::v-deep .selector-body .ant-table {
  font-size: 13px;
}

::v-deep .selector-body .ant-table-thead > tr > th {
  background: #fafafa;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  padding: 12px 16px;
  text-align: center !important;
}

::v-deep .selector-body .ant-table-tbody > tr {
  cursor: pointer;
  transition: background 0.2s ease;
}

::v-deep .selector-body .ant-table-tbody > tr > td {
  padding: 12px 16px;
  text-align: center !important;
}

::v-deep .selector-body .ant-table-tbody > tr:hover > td {
  background: #e6f7ff !important;
}

/* Badge 居中 */
::v-deep .selector-body .ant-badge-status {
  display: inline-flex;
  align-items: center;
}

::v-deep .selector-body .ant-badge-status-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

/* 分页器 */
::v-deep .selector-body .ant-pagination {
  margin: 16px 0 0;
  text-align: right;
}

::v-deep .selector-body .ant-pagination-item {
  border-radius: 4px;
}

::v-deep .selector-body .ant-pagination-item-active {
  border-color: #1890ff;
}

::v-deep .selector-body .ant-pagination-item-active a {
  color: #1890ff;
}

/* 空状态 */
::v-deep .selector-body .ant-empty {
  padding: 40px 0;
}

::v-deep .selector-body .ant-empty-description {
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}

/* 加载状态 */
::v-deep .selector-body .ant-spin-container {
  min-height: 200px;
}

/* 外层容器滚动条美化 */
.selector-body::-webkit-scrollbar {
  width: 6px;
}

.selector-body::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.selector-body::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 3px;
}

.selector-body::-webkit-scrollbar-thumb:hover {
  background: #8c8c8c;
}
</style>
