<template>
  <a-modal
    :title="title"
    :width="1200"
    :visible="visible"
    @ok="handleOk"
    @cancel="handleCancel"
    :confirmLoading="confirmLoading">
    <a-spin :spinning="loading">
      <!-- 查询条件 -->
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="24">
            <a-col :xl="6" :lg="6" :md="12" :sm="24">
              <a-form-item label="编码">
                <a-input v-model="queryParam.infoCode" placeholder="请输入编码" @pressEnter="loadData"></a-input>
              </a-form-item>
            </a-col>
            <a-col :xl="8" :lg="8" :md="12" :sm="24">
              <a-form-item label="数据模块类型">
                <a-select v-model="queryParam.dmtypeName" placeholder="请选择数据模块类型" allowClear show-search>
                  <a-select-option v-for="item in getDmtypeNameOptions()" :key="item" :value="item">
                    {{ item }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xl="10" :lg="10" :md="24" :sm="24">
              <span class="table-page-search-submitButtons">
                <a-button type="primary" @click="loadData" icon="search">查询</a-button>
                <a-button @click="handleReset" icon="reload" style="margin-left: 8px">重置</a-button>
              </span>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <!-- 表格 -->
      <div style="margin-top: 16px;">
        <a-alert message="提示：请勾选需要导入的标准信息码" type="info" show-icon style="margin-bottom: 16px"/>

        <a-table
          ref="table"
          size="middle"
          bordered
          rowKey="id"
          :columns="columns"
          :dataSource="dataSource"
          :pagination="ipagination"
          :loading="loading"
          :rowSelection="{selectedRowKeys: selectedRowKeys, onChange: onSelectChange}"
          @change="handleTableChange">

          <span slot="serial" slot-scope="text, record, index">
            {{ (ipagination.current - 1) * ipagination.pageSize + index + 1 }}
          </span>

          <span slot="code" slot-scope="text, record">
            {{ record.infoCode }}
          </span>
        </a-table>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'

export default {
  name: 'TemplateImportModal',
  props: {
    // 接收父组件传递的项目ID
    projectId: {
      type: String,
      default: ''
    },
    // 接收父组件传递的数据模块类型选项
    dmtypeOptions: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      title: '从标准模板导入',
      visible: false,
      loading: false,
      confirmLoading: false,
      queryParam: {},
      dataSource: [],
      selectedRowKeys: [],
      selectedRows: [],
      ipagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showTotal: (total, range) => {
          return range[0] + '-' + range[1] + ' 共' + total + '条'
        },
        showQuickJumper: true,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '30', '50', '100']
      },
      columns: [
        {
          title: '序号',
          dataIndex: '',
          key: 'rowIndex',
          width: 60,
          align: 'center',
          scopedSlots: { customRender: 'serial' }
        },
        {
          title: '编码',
          align: 'center',
          dataIndex: 'infoCode',
          width: 150,
          scopedSlots: { customRender: 'code' }
        },
        {
          title: '数据模块类型',
          align: 'center',
          dataIndex: 'dmtypeName',
          width: 150
        },
        {
          title: '描述',
          align: 'center',
          dataIndex: 'description'
        },
        {
          title: '备注',
          align: 'center',
          dataIndex: 'remark'
        }
      ],
      url: {
        list: '/standardinformationcode/ietmStandardInformationCode/list',
        importFromTemplate: '/projectinformationcode/ietmProjectInformationCode/importFromTemplate'
      }
    }
  },
  methods: {
    show() {
      this.visible = true
      this.selectedRowKeys = []
      this.selectedRows = []
      this.queryParam = {}
      this.loadData()
    },
    close() {
      this.visible = false
      this.selectedRowKeys = []
      this.selectedRows = []
    },
    // 从父组件传递的 dmtypeOptions 中提取名称用于下拉选项
    getDmtypeNameOptions() {
      const dmtypeSet = new Set()
      this.dmtypeOptions.forEach(item => {
        if (item.dmtypeName) {
          dmtypeSet.add(item.dmtypeName)
        }
      })
      return Array.from(dmtypeSet).sort()
    },
    loadData(arg) {
      if (arg === 1) {
        this.ipagination.current = 1
      }

      const params = Object.assign({}, this.queryParam, {
        pageNo: this.ipagination.current,
        pageSize: this.ipagination.pageSize
      })

      this.loading = true
      getAction(this.url.list, params).then(res => {
        if (res.success) {
          this.dataSource = res.result.records || []
          this.ipagination.total = res.result.total || 0
        }
      }).finally(() => {
        this.loading = false
      })
    },
    handleTableChange(pagination) {
      this.ipagination = pagination
      this.loadData()
    },
    handleReset() {
      this.queryParam = {}
      this.loadData(1)
    },
    onSelectChange(selectedRowKeys, selectedRows) {
      this.selectedRowKeys = selectedRowKeys
      this.selectedRows = selectedRows
    },
    handleOk() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请至少选择一条数据！')
        return
      }

      // 获取当前项目ID（从props或其他来源）
      const projectId = this.projectId || this.$route.query.projectId || this.$route.params.projectId || ''

      if (!projectId) {
        this.$message.error('未找到项目信息，请确认已选择项目！')
        return
      }

      this.confirmLoading = true
      const params = {
        projectId: projectId,
        templateIds: this.selectedRowKeys
      }

      postAction(this.url.importFromTemplate, params).then(res => {
        if (res.success) {
          this.$message.success(res.message || '导入成功！')
          this.$emit('ok')
          this.close()
        } else {
          this.$message.error(res.message || '导入失败！')
        }
      }).finally(() => {
        this.confirmLoading = false
      })
    },
    handleCancel() {
      this.close()
    }
  }
}
</script>

<style scoped>
.table-page-search-wrapper {
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 4px;
}
.table-page-search-wrapper .ant-form-item {
  margin-bottom: 0;
}
.table-page-search-wrapper .ant-input,
.table-page-search-wrapper .ant-select {
  width: 100%;
}
</style>
