<template>
  <a-modal
    title="选择数据模块"
    :width="1200"
    :visible="visible"
    :confirm-loading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-row :gutter="16">
      <!-- 左侧：构型树 -->
      <a-col :span="6">
        <div style="border: 1px solid #d9d9d9; padding: 8px; height: 500px; overflow-y: auto;">
          <a-tree
            :tree-data="treeData"
            :load-data="onLoadData"
            @select="handleNodeSelect"
          >
            <template slot="title" slot-scope="{ title }">
              <span>{{ title }}</span>
            </template>
          </a-tree>
        </div>
      </a-col>

      <!-- 右侧：双Tab表格 -->
      <a-col :span="18">
        <a-tabs v-model="activeTab" @change="handleTabChange">
          <!-- Tab1: 引用最新版 -->
          <a-tab-pane key="latest" tab="引用最新版">
            <a-form-model layout="inline" style="margin-bottom: 12px;">
              <a-form-model-item label="DMC">
                <a-input v-model="searchForm.dmc" placeholder="DMC编码" style="width: 150px;" @pressEnter="handleSearch" />
              </a-form-model-item>
              <a-form-model-item label="技术名称">
                <a-input v-model="searchForm.techName" placeholder="技术名称" style="width: 120px;" @pressEnter="handleSearch" />
              </a-form-model-item>
              <a-form-model-item>
                <a-button type="primary" @click="handleSearch">查询</a-button>
                <a-button style="margin-left: 8px;" @click="handleReset">重置</a-button>
              </a-form-model-item>
            </a-form-model>

            <a-table
              ref="latestTable"
              :columns="columns"
              :data-source="latestDmList"
              :row-key="record => record.id"
              :row-selection="{ selectedRowKeys: selectedLatestKeys, onChange: onLatestSelectChange }"
              :pagination="latestPagination"
              :loading="latestLoading"
              @change="handleLatestTableChange"
              bordered
              size="small"
            >
              <span slot="serial" slot-scope="text, record, index">
                {{ (latestPagination.current - 1) * latestPagination.pageSize + index + 1 }}
              </span>
            </a-table>
          </a-tab-pane>

          <!-- Tab2: 引用指定版本 -->
          <a-tab-pane key="history" tab="引用指定版本">
            <a-form-model layout="inline" style="margin-bottom: 12px;">
              <a-form-model-item label="DMC">
                <a-input v-model="searchForm.dmc" placeholder="DMC编码" style="width: 150px;" @pressEnter="handleSearch" />
              </a-form-model-item>
              <a-form-model-item>
                <a-button type="primary" @click="handleSearch">查询</a-button>
                <a-button style="margin-left: 8px;" @click="handleReset">重置</a-button>
              </a-form-model-item>
            </a-form-model>

            <a-table
              ref="historyTable"
              :columns="columns"
              :data-source="historyDmList"
              :row-key="record => record.id"
              :row-selection="{ selectedRowKeys: selectedHistoryKeys, onChange: onHistorySelectChange }"
              :pagination="historyPagination"
              :loading="historyLoading"
              @change="handleHistoryTableChange"
              bordered
              size="small"
            >
              <span slot="serial" slot-scope="text, record, index">
                {{ (historyPagination.current - 1) * historyPagination.pageSize + index + 1 }}
              </span>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </a-col>
    </a-row>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'DmSelectModal',
  data() {
    return {
      visible: false,
      confirmLoading: false,
      projectId: '',
      activeTab: 'latest',
      currentNodeId: '',

      treeData: [],

      searchForm: {
        dmc: '',
        techName: '',
        infoName: ''
      },

      latestDmList: [],
      selectedLatestKeys: [],
      latestLoading: false,
      latestPagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: total => `共 ${total} 条`
      },

      historyDmList: [],
      selectedHistoryKeys: [],
      historyLoading: false,
      historyPagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: total => `共 ${total} 条`
      },

      columns: [
        { title: '序号', dataIndex: 'serial', key: 'serial', width: 50, scopedSlots: { customRender: 'serial' } },
        { title: 'DMC', dataIndex: 'dmcCode', key: 'dmcCode', width: 280, ellipsis: true },
        { title: '技术名称', dataIndex: 'techName', key: 'techName', width: 120, ellipsis: true },
        { title: '信息名称', dataIndex: 'infoName', key: 'infoName', width: 120, ellipsis: true },
        { title: 'DM类型', dataIndex: 'dmTypeName', key: 'dmTypeName', width: 100 },
        { title: '版本号', dataIndex: 'issueNo', key: 'issueNo', width: 80 }
      ]
    }
  },
  methods: {
    show(projectId) {
      this.visible = true
      this.projectId = projectId
      this.resetSelection()
      this.loadTree()
    },

    loadTree() {
      // TODO: 加载构型树数据
      // 简化版：使用模拟数据
      this.treeData = [
        {
          title: '项目根节点',
          key: 'root',
          children: []
        }
      ]
      this.currentNodeId = 'root'
      this.handleSearch()
    },

    onLoadData(treeNode) {
      return new Promise(resolve => {
        // TODO: 异步加载子节点
        resolve()
      })
    },

    handleNodeSelect(selectedKeys, info) {
      if (selectedKeys.length > 0) {
        this.currentNodeId = selectedKeys[0]
        this.handleSearch()
      }
    },

    handleSearch() {
      if (this.activeTab === 'latest') {
        this.loadLatestDmList()
      } else {
        this.loadHistoryDmList()
      }
    },

    handleReset() {
      this.searchForm = { dmc: '', techName: '', infoName: '' }
      this.handleSearch()
    },

    handleTabChange() {
      this.handleSearch()
    },

    loadLatestDmList() {
      if (!this.currentNodeId) {
        return
      }
      this.latestLoading = true
      const params = {
        projectId: this.projectId,
        cmNodeId: this.currentNodeId,
        isLatest: '1',
        pageNo: this.latestPagination.current,
        pageSize: this.latestPagination.pageSize,
        ...this.searchForm
      }
      getAction('/ietm/dataModule/list', params)
        .then(res => {
          if (res.success) {
            this.latestDmList = res.result.records || []
            this.latestPagination.total = res.result.total || 0
          }
        })
        .finally(() => {
          this.latestLoading = false
        })
    },

    loadHistoryDmList() {
      if (!this.currentNodeId) {
        return
      }
      this.historyLoading = true
      const params = {
        projectId: this.projectId,
        cmNodeId: this.currentNodeId,
        pageNo: this.historyPagination.current,
        pageSize: this.historyPagination.pageSize,
        ...this.searchForm
      }
      getAction('/ietm/dataModule/list', params)
        .then(res => {
          if (res.success) {
            this.historyDmList = res.result.records || []
            this.historyPagination.total = res.result.total || 0
          }
        })
        .finally(() => {
          this.historyLoading = false
        })
    },

    handleLatestTableChange(pagination) {
      this.latestPagination.current = pagination.current
      this.latestPagination.pageSize = pagination.pageSize
      this.loadLatestDmList()
    },

    handleHistoryTableChange(pagination) {
      this.historyPagination.current = pagination.current
      this.historyPagination.pageSize = pagination.pageSize
      this.loadHistoryDmList()
    },

    onLatestSelectChange(selectedRowKeys) {
      this.selectedLatestKeys = selectedRowKeys
    },

    onHistorySelectChange(selectedRowKeys) {
      this.selectedHistoryKeys = selectedRowKeys
    },

    handleOk() {
      const latestSelected = this.latestDmList.filter(dm => this.selectedLatestKeys.includes(dm.id))
      const historySelected = this.historyDmList.filter(dm => this.selectedHistoryKeys.includes(dm.id))
      const allSelected = [...latestSelected, ...historySelected]

      if (allSelected.length === 0) {
        this.$message.warning('请至少选择一个DM')
        return
      }

      this.$emit('ok', allSelected)
      this.handleCancel()
    },

    handleCancel() {
      this.visible = false
      this.resetSelection()
    },

    resetSelection() {
      this.selectedLatestKeys = []
      this.selectedHistoryKeys = []
      this.latestDmList = []
      this.historyDmList = []
      this.searchForm = { dmc: '', techName: '', infoName: '' }
    }
  }
}
</script>
