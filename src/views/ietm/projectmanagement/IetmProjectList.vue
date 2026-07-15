<template>
  <a-card :bordered="false">
    <!-- 查询区域 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline" @keyup.enter.native="searchQuery">
        <a-row :gutter="24">
          <a-col :md="6" :sm="8">
            <a-form-item label="项目名称">
              <a-input placeholder="请输入项目名称" v-model="queryParam.name"></a-input>
            </a-form-item>
          </a-col>
          <a-col :md="6" :sm="8">
            <a-form-item label="装备编码">
              <a-input placeholder="请输入装备编码" v-model="queryParam.equipmentCode"></a-input>
            </a-form-item>
          </a-col>
          <a-col :md="6" :sm="8">
            <a-form-item label="状态">
              <j-dict-select-tag placeholder="请选择状态" v-model="queryParam.status"
                                dictCode="project_status" type="list"/>
            </a-form-item>
          </a-col>
          <a-col :md="6" :sm="8">
            <span style="float: left;overflow: hidden;" class="table-page-search-submitButtons">
              <a-button type="primary" @click="searchQuery" icon="search">查询</a-button>
              <a-button type="primary" @click="searchReset" icon="reload"
                        style="margin-left: 8px">重置</a-button>
            </span>
          </a-col>
        </a-row>
      </a-form>
    </div>
    <!-- 查询区域-END -->

    <!-- 操作按钮区域 -->
    <div class="table-operator">
      <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button>
      <a-button @click="handleChangeStatus" type="primary" icon="check-circle"
                :disabled="selectedRowKeys.length !== 1">改变状态</a-button>
      <a-button @click="handleCopyProject" type="primary" icon="copy"
                :disabled="selectedRowKeys.length !== 1">复制项目</a-button>
      <a-button type="primary" icon="download" @click="handleExportXls('手册管理-手册项目管理列表')">导出</a-button>
      <a-upload name="file" :showUploadList="false" :multiple="false" :headers="tokenHeader" :action="importExcelUrl" @change="handleImportExcel">
        <a-button type="primary" icon="import">导入</a-button>
      </a-upload>
      <a-dropdown v-if="selectedRowKeys.length > 0">
        <a-menu slot="overlay">
          <a-menu-item key="1" @click="batchDel"><a-icon type="delete"/>删除</a-menu-item>
        </a-menu>
        <a-button style="margin-left: 8px"> 批量操作 <a-icon type="down" /></a-button>
      </a-dropdown>
    </div>

    <!-- table区域-begin -->
    <div>
      <div class="ant-alert ant-alert-info" style="margin-bottom: 16px;">
        <i class="anticon anticon-info-circle ant-alert-icon"></i> 已选择 <a style="font-weight: 600">{{ selectedRowKeys.length }}</a>项
        <a style="margin-left: 24px" @click="onClearSelected">清空</a>
      </div>

      <a-table
        ref="table"
        size="middle"
        bordered
        rowKey="id"
        class="j-table-force-nowrap"
        :scroll="{x:true}"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="ipagination"
        :loading="loading"
        :rowSelection="{selectedRowKeys: selectedRowKeys, onChange: onSelectChange}"
        @change="handleTableChange">

        <template slot="projectNameSlot" slot-scope="text, record">
          <a @click="handleDetail(record)">{{ text }}</a>
        </template>
        <template slot="htmlSlot" slot-scope="text">
          <div v-html="text"></div>
        </template>
        <template slot="imgSlot" slot-scope="text,record">
          <span v-if="!text" style="font-size: 12px;font-style: italic;">无图片</span>
          <img v-else :src="getImgView(text)" :preview="record.id" height="25px" alt="" style="max-width:80px;font-size: 12px;font-style: italic;"/>
        </template>
        <template slot="fileSlot" slot-scope="text">
          <span v-if="!text" style="font-size: 12px;font-style: italic;">无文件</span>
          <a-button
            v-else
            :ghost="true"
            type="primary"
            icon="download"
            size="small"
            @click="downloadFile(text)">
            下载
          </a-button>
        </template>

        <span slot="action" slot-scope="text, record">
          <a @click="handleEdit(record)">编辑</a>

          <a-divider type="vertical" />
          <a-dropdown>
            <a class="ant-dropdown-link">更多 <a-icon type="down" /></a>
            <a-menu slot="overlay">
              <a-menu-item>
                <a @click="handleDetail(record)">详情</a>
              </a-menu-item>
              <a-menu-item>
                <a-popconfirm title="确定删除吗?" @confirm="() => handleDelete(record.id)">
                  <a>删除</a>
                </a-popconfirm>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>

      </a-table>
    </div>

    <ietm-project-modal ref="modalForm" @ok="modalFormOk"/>
    <ietm-copy-project-modal ref="copyProjectModal" @ok="modalFormOk"/>
  </a-card>
</template>

<script>

  import { JeecgListMixin } from '@/mixins/JeecgListMixin'
  import IetmProjectModal from './modules/IetmProjectModal'
  import IetmCopyProjectModal from './modules/IetmCopyProjectModal'
  import { putAction } from '@/api/manage'
  import '@/assets/less/TableExpand.less'

  export default {
    name: "IetmProjectList",
    mixins:[JeecgListMixin],
    components: {
      IetmProjectModal,
      IetmCopyProjectModal
    },
    data () {
      return {
        description: '手册管理-手册项目管理列表管理页面',
        // 表头
        columns: [
          {
            title: '序号',
            dataIndex: '',
            key:'rowIndex',
            width:60,
            align:"center",
            customRender:function (t,r,index) {
              return parseInt(index)+1;
            }
          },
          {
            title:'项目名称',
            align:"center",
            dataIndex: 'name',
            width: 200,
            scopedSlots: { customRender: 'projectNameSlot' }
          },
          {
            title:'项目描述',
            align:"center",
            dataIndex: 'description',
            width: 180,
            ellipsis: true
          },
          {
            title:'IETM标准',
            align:"center",
            dataIndex: 'ietmStandard',
            width: 120
          },
          {
            title:'装备编码',
            align:"center",
            dataIndex: 'equipmentCode',
            width: 120
          },
          {
            title:'业务规则模板',
            align:"center",
            dataIndex: 'businessRuleTemp',
            width: 150,
            ellipsis: true
          },
          {
            title:'编码规则',
            align:"center",
            dataIndex: 'codeRule',
            width: 150
          },
          {
            title:'状态',
            align:"center",
            dataIndex: 'status',
            width: 80,
            customRender: function(text) {
              return text === 1 ? '有效' : '无效';
            }
          },
          {
            title:'创建人',
            align:"center",
            dataIndex: 'createBy',
            width: 100
          },
          {
            title:'密级',
            align:"center",
            dataIndex: 'security_dictText',
            width: 80
          },
          {
            title: '操作',
            dataIndex: 'action',
            align:"center",
            fixed:"right",
            width:200,
            scopedSlots: { customRender: 'action' },
          }
        ],
        url: {
          list: "/ietmproject/ietmProject/list",
          delete: "/ietmproject/ietmProject/delete",
          deleteBatch: "/ietmproject/ietmProject/deleteBatch",
          exportXlsUrl: "/ietmproject/ietmProject/exportXls",
          importExcelUrl: "ietmproject/ietmProject/importExcel",
          changeStatus: "/ietmproject/ietmProject/changeStatus",

        },
        dictOptions:{},
        superFieldList:[],
      }
    },
    created() {
      this.getSuperFieldList();
    },
    computed: {
      importExcelUrl: function(){
        return `${window._CONFIG['domianURL']}/${this.url.importExcelUrl}`;
      }
    },
    methods: {
      initDictConfig(){
      },
      getSuperFieldList(){
        let fieldList=[];
        fieldList.push({type:'string',value:'name',text:'名称',dictCode:''})
        fieldList.push({type:'string',value:'description',text:'描述',dictCode:''})
        fieldList.push({type:'string',value:'codeRule',text:'编码规则',dictCode:''})
        fieldList.push({type:'string',value:'businessRuleTemp',text:'业务规则模板',dictCode:''})
        fieldList.push({type:'string',value:'organization',text:'组织',dictCode:''})
        fieldList.push({type:'string',value:'equipmentCode',text:'装备编码',dictCode:''})
        fieldList.push({type:'int',value:'status',text:'状态',dictCode:''})
        fieldList.push({type:'int',value:'security',text:'密级',dictCode:'security'})
        this.superFieldList = fieldList
      },
      // 改变状态
      handleChangeStatus() {
        if (this.selectedRowKeys.length !== 1) {
          this.$message.warning('请选择一条记录！');
          return;
        }
        let that = this;
        let id = this.selectedRowKeys[0];
        let record = this.dataSource.find(item => item.id === id);
        let newStatus = record.status === 1 ? 0 : 1;
        let statusText = newStatus === 1 ? '有效' : '无效';

        this.$confirm({
          title: '确认',
          content: `确定将项目状态改为"${statusText}"吗？`,
          onOk() {
            return putAction(that.url.changeStatus, {
              id: id,
              status: newStatus
            }).then((res) => {
              if (res.success) {
                that.$message.success('状态修改成功！');
                that.loadData();
              } else {
                that.$message.error(res.message || '状态修改失败！');
                return Promise.reject();
              }
            }).catch((err) => {
              that.$message.error('状态修改失败！');
              return Promise.reject();
            });
          }
        });
      },
      // 复制项目
      handleCopyProject() {
        if (this.selectedRowKeys.length !== 1) {
          this.$message.warning('请选择一条记录！');
          return;
        }
        let record = this.dataSource.find(item => item.id === this.selectedRowKeys[0]);
        this.$refs.copyProjectModal.show(this.selectedRowKeys[0], record ? record.name : '');
      }
    }
  }
</script>
<style scoped>
  @import '~@assets/less/common.less';
</style>