<template>
  <j-modal
    :width="modalWidth"
    :visible="visible"
    :title="title"
    switchFullscreen
    wrapClassName="j-role-select-modal"
    @ok="handleSubmit"
    @cancel="close"
    style="top:50px"
    cancelText="关闭"
  >
    <a-card :bordered="false">
      <a-form-model>
        <a-form-model-item label="角色编码" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-row type="flex" :gutter="8">
            <a-col :span="18">
              <a-input-search
                :style="{width:'100%'}"
                placeholder="请输入角色编码"
                v-model="queryParam.roleCode"
                @search="onSearch"
              ></a-input-search>
            </a-col>
            <a-col :span="6">
              <a-button @click="searchReset" icon="redo">重置</a-button>
            </a-col>
          </a-row>
        </a-form-model-item>
      </a-form-model>

      <!--角色列表-->
      <a-table
        ref="table"
        :scroll="scrollTrigger"
        size="middle"
        rowKey="id"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="ipagination"
        :rowSelection="{selectedRowKeys: selectedRowKeys, onChange: onSelectChange, type: getType}"
        :loading="loading"
        @change="handleTableChange">
      </a-table>
    </a-card>
  </j-modal>
</template>

<script>
import { pushIfNotExist, filterObj } from '@/utils/util'
import { getAction } from '@/api/manage'

export default {
  name: 'JSelectRoleModal',
  components: {},
  props: {
    modalWidth: {
      type: Number,
      default: 800
    },
    multi: {
      type: Boolean,
      default: true
    },
    roleIds: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      queryParam: {
        roleCode: ''
      },
      columns: [
        {
          title: '角色编码',
          align: 'center',
          dataIndex: 'roleCode',
          width: 150
        },
        {
          title: '角色名称',
          align: 'center',
          dataIndex: 'roleName',
          width: 200
        },
        {
          title: '描述',
          align: 'center',
          dataIndex: 'description'
        }
      ],
      scrollTrigger: {},
      dataSource: [],
      selectionRows: [],
      selectedRowKeys: [],
      selectRoleRows: [],
      selectRoleIds: [],
      title: '选择角色',
      ipagination: {
        current: 1,
        pageSize: 10,
        pageSizeOptions: ['10', '20', '30'],
        showTotal: (total, range) => {
          return range[0] + '-' + range[1] + ' 共' + total + '条'
        },
        showQuickJumper: true,
        showSizeChanger: true,
        total: 0
      },
      isorter: {
        column: 'createTime',
        order: 'desc'
      },
      visible: false,
      form: this.$form.createForm(this),
      loading: false,
      labelCol: {
        xs: { span: 24 },
        sm: { span: 4 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 20 }
      },
      url: {
        list: '/sys/role/list'
      }
    }
  },
  computed: {
    // 计算属性判断是否是多选
    getType() {
      return this.multi ? 'checkbox' : 'radio'
    }
  },
  methods: {
    show() {
      this.visible = true
      this.loadData()

      // 初始化已选择的角色
      if (this.roleIds) {
        this.selectRoleIds = this.roleIds.split(',')
        this.selectedRowKeys = [...this.selectRoleIds]
      } else {
        this.selectRoleIds = []
        this.selectedRowKeys = []
      }
    },

    close() {
      this.visible = false
      this.searchReset()
      this.selectRoleRows = []
      this.selectRoleIds = []
      this.selectedRowKeys = []
    },

    handleSubmit() {
      if (this.selectRoleRows.length === 0) {
        this.$message.warning('请至少选择一个角色!')
        return
      }
      this.$emit('ok', this.selectRoleRows, this.selectRoleIds)
      this.close()
    },

    // 搜索
    onSearch() {
      this.loadData(1)
    },

    // 重置
    searchReset() {
      this.queryParam.roleCode = ''
      this.loadData(1)
    },

    // 加载数据
    loadData(arg) {
      if (arg === 1) {
        this.ipagination.current = 1
      }

      let params = this.getQueryParams()
      this.loading = true

      getAction(this.url.list, params).then((res) => {
        if (res.success) {
          this.dataSource = res.result.records || res.result
          this.ipagination.total = res.result.total || res.result.length
        } else {
          this.$message.warning(res.message)
        }
      }).finally(() => {
        this.loading = false
      })
    },

    // 获取查询参数
    getQueryParams() {
      let param = Object.assign({}, this.queryParam, this.isorter)
      param.pageNo = this.ipagination.current
      param.pageSize = this.ipagination.pageSize
      return filterObj(param)
    },

    // 分页、排序、筛选变化时触发
    handleTableChange(pagination, filters, sorter) {
      if (Object.keys(sorter).length > 0) {
        this.isorter.column = sorter.field
        this.isorter.order = sorter.order === 'ascend' ? 'asc' : 'desc'
      }
      this.ipagination = pagination
      this.loadData()
    },

    // 表格选择变化
    onSelectChange(selectedRowKeys, selectionRows) {
      this.selectedRowKeys = selectedRowKeys
      this.selectionRows = selectionRows
      this.selectRoleRows = selectionRows
      this.selectRoleIds = selectedRowKeys
    }
  }
}
</script>

<style lang="less" scoped>
.j-role-select-modal {
  /deep/ .ant-modal-body {
    padding: 10px;
  }
}
</style>
