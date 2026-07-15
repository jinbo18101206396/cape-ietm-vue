<template>
  <a-card :bordered="false" :body-style="{padding: '0'}">
    <!-- 操作按钮区域 -->
    <div class="table-operator" style="padding: 0; margin-bottom: 16px;">
      <template v-if="mainId">
        <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button>
        <a-button type="primary" icon="download" @click="handleExportXls('手册管理-标准管理列表（标准数据模块）')">导出</a-button>
        <a-upload
          name="file"
          :showUploadList="false"
          :multiple="false"
          :headers="tokenHeader"
          :action="importExcelUrl"
          @change="handleImportExcel">
            <a-button type="primary" icon="import">导入</a-button>
        </a-upload>
        <j-super-query :fieldList="superFieldList" ref="superQueryModal" @handleSuperQuery="handleSuperQuery"></j-super-query>
        <a-dropdown v-if="selectedRowKeys.length > 0">
          <a-menu slot="overlay">
            <a-menu-item key="1" @click="batchDel"><a-icon type="delete"/>删除</a-menu-item>
          </a-menu>
          <a-button style="margin-left: 8px"> 批量操作 <a-icon type="down" /></a-button>
        </a-dropdown>
      </template>
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
        :scroll="{x:true}"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="ipagination"
        :loading="loading"
        :rowSelection="{selectedRowKeys: selectedRowKeys, onChange: onSelectChange}"
        @change="handleTableChange">

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
          <a-popconfirm title="确定删除吗?" @confirm="() => handleDelete(record.id)">
            <a>删除</a>
          </a-popconfirm>
        </span>

      </a-table>
    </div>

    <ietmStandardDmtype-modal ref="modalForm" @ok="modalFormOk" :mainId="mainId"></ietmStandardDmtype-modal>
  </a-card>
</template>

<script>

  import { JeecgListMixin } from '@/mixins/JeecgListMixin'
  import IetmStandardDmtypeModal from './modules/IetmStandardDmtypeModal'

  export default {
    name: "IetmStandardDmtypeList",
    mixins:[JeecgListMixin],
    components: { IetmStandardDmtypeModal },
    props:{
      mainId:{
        type:String,
        default:'',
        required:false
      }
    },
    watch:{
      mainId:{
        immediate: true,
        handler(val) {
          if(!this.mainId){
            this.clearList()
          }else{
            this.queryParam['pid'] = val
            this.loadData(1);
          }
        }
      }
    },
    data () {
      return {
        description: '手册管理-标准管理左侧树管理页面',
        disableMixinCreated:true,
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
            title:'DM类型名称',
            align:"left",
            dataIndex: 'dmtypeName',
            width: 180
          },
          {
            title:'描述',
            align:"left",
            dataIndex: 'description'
          },
          {
            title:'Schema',
            align:"left",
            dataIndex: 'dtd'
          },
          {
            title:'密级',
            align:"center",
            dataIndex: 'security_dictText',
            width: 120
          },
          {
            title: '操作',
            dataIndex: 'action',
            align:"center",
            fixed:"right",
            width:147,
            scopedSlots: { customRender: 'action' },
          }
        ],
        url: {
          list: "/standardmanagement/ietmStandard/listIetmStandardDmtypeByMainId",
          delete: "/standardmanagement/ietmStandard/deleteIetmStandardDmtype",
          deleteBatch: "/standardmanagement/ietmStandard/deleteBatchIetmStandardDmtype",
          exportXlsUrl: "/standardmanagement/ietmStandard/exportIetmStandardDmtype",
          importUrl: "/standardmanagement/ietmStandard/importIetmStandardDmtype",
        },
        dictOptions:{
         security:[],
        },
        superFieldList: []
      }
    },
    created() {
      this.getSuperFieldList()
    },
    computed: {
      importExcelUrl(){
        return `${window._CONFIG['domianURL']}/${this.url.importUrl}/${this.mainId}`;
      }
    },
    methods: {
      clearList(){
        this.dataSource=[]
        this.selectedRowKeys=[]
        this.ipagination.current = 1
      },
      getSuperFieldList() {
        let fieldList = []
        fieldList.push({ type: 'string', value: 'dmtypeName', text: 'DM类型名称', dictCode: '' })
        fieldList.push({ type: 'string', value: 'dtd', text: 'DTD', dictCode: '' })
        fieldList.push({ type: 'string', value: 'description', text: '描述', dictCode: '' })
        fieldList.push({ type: 'int', value: 'security', text: '密级', dictCode: 'security' })
        this.superFieldList = fieldList
      }
    }
  }
</script>
<style scoped>
  @import '~@assets/less/common.less'
</style>
