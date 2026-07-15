<template>
  <a-card :bordered="false">
    <!-- 查询区域 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline" @keyup.enter.native="searchQuery">
        <a-row :gutter="24">
        </a-row>
      </a-form>
    </div>
    <!-- 查询区域-END -->

    <!-- 操作按钮区域 -->
    <div class="table-operator" v-if="!formDisabled" style="margin-top: 20px;">
      <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button>
      <!-- 高级查询区域 -->
      <a-dropdown v-if="selectedRowKeys.length > 0">
        <a-menu slot="overlay">
          <a-menu-item key="1" @click="batchDel">
            <a-icon type="delete"/>
            删除
          </a-menu-item>
        </a-menu>
        <a-button style="margin-left: 8px"> 批量操作
          <a-icon type="down"/>
        </a-button>
      </a-dropdown>
    </div>

    <!-- table区域-begin -->
    <div>
      <a-table
        ref="table"
        size="middle"
        :scroll="{x:true}"
        bordered
        rowKey="id"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="ipagination"
        :loading="loading"
        :rowSelection="{selectedRowKeys: selectedRowKeys, onChange: onSelectChange}"
        class="j-table-force-nowrap"
        @change="handleTableChange">


        <span v-if="!formDisabled" slot="action" slot-scope="text, record,index">
          <a @click="handleEdit(index,record)">编辑</a>

          <a-divider type="vertical"/>
          <a-popconfirm title="确定删除吗?" @confirm="() => handleDelete(index,record.id)">
                  <a>删除</a>
                </a-popconfirm>
        </span>

      </a-table>
    </div>

    <ietm-project-company-modal ref="modalForm" @ok="modalFormOk" @editOk="editModalFormOk" :type="type"
                                :pid="pid"></ietm-project-company-modal>
  </a-card>
</template>

<script>

import '@/assets/less/TableExpand.less'
import {mixinDevice} from '@/utils/mixin'
import {JeecgListMixin} from '@/mixins/JeecgListMixin'
import IetmProjectCompanyModal from './modules/IetmProjectCompanyModal'
import {deleteAction, getAction} from "@api/manage";

export default {
  name: 'IetmProjectCompanyList',
  mixins: [JeecgListMixin, mixinDevice],
  components: {
    IetmProjectCompanyModal
  },
  props: {
    formDisabled: {
      type: Boolean,
      default: false,
      required: false
    },
    type: {
      type: Number,
    },
    pid: {
      type: String,
    }
  },
  watch: {
    pid(newVal) {
      if (!this.url.list) {
        this.$message.error("请设置url.list属性!")
        return
      }
      //加载数据 若传入参数1则加载第一页的内容
      this.ipagination.current = 1;
      var params = this.getQueryParams();//查询条件
      params.type = this.type
      params.pid = newVal
      this.loading = true;
      getAction(this.url.list, params).then((res) => {
        if (res.success) {
          this.dataSource = res.result.records || res.result;
          if (res.result.total) {
            this.ipagination.total = res.result.total;
          } else {
            this.ipagination.total = 0;
          }
          this.$emit('getCompany', this.dataSource);
        } else {
          this.$message.warning(res.message)
        }
      }).finally(() => {
        this.loading = false
      })
    }
  },
  data() {
    return {
      description: '手册管理-单位信息管理页面',
      // 表头
      creatCompanyColumns: [
        {
          title: '创作单位编码',
          dataIndex: 'companyCode',
          align: 'center',
          width: '30%'
        },
        {
          title: '创作单位名称',
          dataIndex: 'companyName',
          align: 'center',
          width: '30%'
        },
        {
          title: '描述',
          dataIndex: 'description',
          align: 'center',
          width: '40%'
        },
        {
          title: '操作',
          dataIndex: 'action',
          align: "center",
          fixed: "right",
          width: 147,
          scopedSlots: {customRender: 'action'}
        }
      ],
      dutyCompanyColumns: [
        {
          title: '责任单位编码',
          dataIndex: 'companyCode',
          align: 'center',
          width: '30%'
        },
        {
          title: '责任单位代码',
          dataIndex: 'companyAgentCode',
          align: 'center',
          width: '30%'
        },
        {
          title: '责任单位名称',
          dataIndex: 'companyName',
          align: 'center',
          width: '40%'
        },
        {
          title: '操作',
          dataIndex: 'action',
          align: "center",
          fixed: "right",
          width: 147,
          scopedSlots: {customRender: 'action'}
        }
      ],
      columns: [],
      url: {
        list: "/ietmprojectcompany/ietmProjectCompany/list",
        delete: "/ietmprojectcompany/ietmProjectCompany/delete",
        deleteBatch: "/ietmprojectcompany/ietmProjectCompany/deleteBatch",
        exportXlsUrl: "/ietmprojectcompany/ietmProjectCompany/exportXls",
        importExcelUrl: "ietmprojectcompany/ietmProjectCompany/importExcel",

      },
      dictOptions: {},
      superFieldList: [],
    }
  },
  created() {
    if (this.type == 1) {
      this.columns = this.creatCompanyColumns
    } else if (this.type == 2) {
      this.columns = this.dutyCompanyColumns
    }
    this.getSuperFieldList();
  },
  computed: {
    importExcelUrl: function () {
      return `${window._CONFIG['domianURL']}/${this.url.importExcelUrl}`;
    },
  },
  methods: {
    handleEdit: function (index, record) {
      this.$refs.modalForm.edit(index, record);
      this.$refs.modalForm.title = "编辑";
      this.$refs.modalForm.disableSubmit = false;
    },
    handleDelete: function (index, id) {
      if (!this.url.delete) {
        this.$message.error("请设置url.delete属性!")
        return
      }
      if (id == undefined) {
        this.dataSource.splice(index, 1); // 参数1: 起始下标, 参数2: 删除个数
        return;
      }
      var that = this;
      deleteAction(that.url.delete, {id: id}).then((res) => {
        if (res.success) {
          //重新计算分页问题
          that.reCalculatePage(1)
          that.$message.success(res.message);
          if (!that.url.list) {
            that.$message.error("请设置url.list属性!")
            return
          }
          //加载数据 若传入参数1则加载第一页的内容
          that.ipagination.current = 1;
          var params = that.getQueryParams();//查询条件
          params.type = that.type
          params.pid = that.pid
          that.loading = true;
          getAction(that.url.list, params).then((res) => {
            if (res.success) {
              that.dataSource = res.result.records || res.result;
              if (res.result.total) {
                that.ipagination.total = res.result.total;
              } else {
                that.ipagination.total = 0;
              }
            } else {
              that.$message.warning(res.message)
            }
          }).finally(() => {
            that.loading = false
          })
        } else {
          that.$message.warning(res.message);
        }
      });
    },
    modalFormOk(model) {
      this.dataSource.push(model)
      this.$emit('getCompany', this.dataSource);
      this.onClearSelected()
    },
    editModalFormOk(model, index) {
      this.dataSource.splice(index, 1, model)
      this.$emit('getCompany', this.dataSource);
      this.onClearSelected()
    },
    loadData(arg) {
      /*  if (!this.url.list) {
          this.$message.error("请设置url.list属性!")
          return
        }
        //加载数据 若传入参数1则加载第一页的内容
        if (arg === 1) {
          this.ipagination.current = 1;
        }
        var params = this.getQueryParams();//查询条件
        params.type = this.type
        params.pid = this.pid
        this.loading = true;
        getAction(this.url.list, params).then((res) => {
          if (res.success) {
            this.dataSource = res.result.records || res.result;
            if (res.result.total) {
              this.ipagination.total = res.result.total;
            } else {
              this.ipagination.total = 0;
            }
          } else {
            this.$message.warning(res.message)
          }
        }).finally(() => {
          this.loading = false
        })*/
    },
    getSuperFieldList() {
      let fieldList = [];
      fieldList.push({type: 'string', value: 'companyCode', text: '单位编码', dictCode: ''})
      fieldList.push({type: 'string', value: 'companyName', text: '单位名称', dictCode: ''})
      fieldList.push({type: 'string', value: 'companyAgentCode', text: '单位代码', dictCode: ''})
      fieldList.push({type: 'string', value: 'description', text: '描述', dictCode: ''})
      this.superFieldList = fieldList
    }
  }
}
</script>
<style scoped>
@import '~@assets/less/common.less';
</style>