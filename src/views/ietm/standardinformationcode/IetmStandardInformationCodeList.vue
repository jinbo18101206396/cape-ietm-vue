<template>
  <a-card :bordered="false">
    <!-- 查询区域和操作按钮 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline">
        <a-row :gutter="24">
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="手册标准">
              <j-dict-select-tag v-model="queryParam.standard" dictCode="standard_type" />
            </a-form-item>
          </a-col>
          <a-col :xl="18" :lg="17" :md="16" :sm="24">
            <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button>
            <a-button type="primary" icon="download" @click="handleExportXls('预制模板-信息码管理')" style="margin-left: 8px">导出</a-button>
            <a-upload name="file" :showUploadList="false" :multiple="false" :headers="tokenHeader" :action="importExcelUrl" @change="handleImportExcel">
              <a-button type="primary" icon="import" style="margin-left: 8px">导入</a-button>
            </a-upload>
            <j-super-query :fieldList="superFieldList" ref="superQueryModal" @handleSuperQuery="handleSuperQuery" style="margin-left: 8px"></j-super-query>
            <a-dropdown v-if="selectedRowKeys.length > 0" style="margin-left: 8px">
              <a-menu slot="overlay">
                <a-menu-item key="1" @click="batchDel">
                  <a-icon type="delete" />
                  删除
                </a-menu-item>
              </a-menu>
              <a-button> 批量操作
                <a-icon type="down" />
              </a-button>
            </a-dropdown>
          </a-col>
        </a-row>
      </a-form>
    </div>
    <!-- 查询区域-END -->

    <!-- table区域-begin -->
    <div>
      <div class="ant-alert ant-alert-info" style="margin-bottom: 16px;">
        <i class="anticon anticon-info-circle ant-alert-icon"></i> 已选择 <a
        style="font-weight: 600">{{ selectedRowKeys.length }}</a>项
        <a style="margin-left: 24px" @click="onClearSelected">清空</a>
      </div>

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

        <template slot="htmlSlot" slot-scope="text">
          <div v-html="text"></div>
        </template>
        <template slot="imgSlot" slot-scope="text,record">
          <span v-if="!text" style="font-size: 12px;font-style: italic;">无图片</span>
          <img v-else :src="getImgView(text)" :preview="record.id" height="25px" alt=""
               style="max-width:80px;font-size: 12px;font-style: italic;" />
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

    <ietm-standard-information-code-modal ref="modalForm" @ok="modalFormOk"></ietm-standard-information-code-modal>
  </a-card>
</template>

<script>

import '@/assets/less/TableExpand.less'
import { mixinDevice } from '@/utils/mixin'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import IetmStandardInformationCodeModal from './modules/IetmStandardInformationCodeModal'

export default {
  name: 'IetmStandardInformationCodeList',
  mixins: [JeecgListMixin, mixinDevice],
  components: {
    IetmStandardInformationCodeModal
  },
  watch: {
    'queryParam.standard': function(val, oldVal) {
      this.loadData(1)
    }
  },
  data() {
    return {
      queryParam: {
        standard: 'GJB6600'
      },
      description: '预制模板-信息码管理管理页面',
      // 表头
      columns: [
        {
          title: '序号',
          dataIndex: '',
          key: 'rowIndex',
          width: 60,
          align: 'center',
          customRender: function(t, r, index) {
            return parseInt(index) + 1
          }
        },
        {
          title: '编码',
          align: 'center',
          dataIndex: 'infoCode'
        },
        {
          title: '数据模块类型名称',
          align: 'center',
          dataIndex: 'dmtypeName'
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
        },
        {
          title: '密级',
          align: 'center',
          dataIndex: 'security_dictText'
        },
        {
          title: '操作',
          dataIndex: 'action',
          align: 'center',
          fixed: 'right',
          width: 147,
          scopedSlots: { customRender: 'action' }
        }
      ],
      url: {
        list: '/standardinformationcode/ietmStandardInformationCode/list',
        delete: '/standardinformationcode/ietmStandardInformationCode/delete',
        deleteBatch: '/standardinformationcode/ietmStandardInformationCode/deleteBatch',
        exportXlsUrl: '/standardinformationcode/ietmStandardInformationCode/exportXls',
        importExcelUrl: 'standardinformationcode/ietmStandardInformationCode/importExcel'

      },
      dictOptions: {},
      superFieldList: []
    }
  },
  created() {
    this.getSuperFieldList()
  },
  computed: {
    importExcelUrl: function() {
      return `${window._CONFIG['domianURL']}/${this.url.importExcelUrl}`
    }
  },
  methods: {
    initDictConfig() {
    },
    handleAdd: function(title) {
      if (this.queryParam.standard != '' && this.queryParam.standard != undefined) {
        this.$refs.modalForm.add(this.queryParam.standard)
        this.$refs.modalForm.title = '新增' + (title && typeof title == 'string' ? '【' + title + '】' : '')
        this.$refs.modalForm.disableSubmit = false
      } else {
        this.$message.warning('请选择手册标准！')
      }
    },
    handleEdit: function(record) {
      // 补充 standard 字段，确保编辑时能正确加载 DM 类型选项
      const recordWithStandard = {
        ...record,
        standard: record.standard || this.queryParam.standard
      }
      this.$refs.modalForm.edit(recordWithStandard)
      this.$refs.modalForm.title = '编辑'
      this.$refs.modalForm.disableSubmit = false
    },
    getSuperFieldList() {
      let fieldList = []
      fieldList.push({ type: 'string', value: 'infoCode', text: '编码', dictCode: '' })
      fieldList.push({ type: 'string', value: 'dmtypeName', text: '数据模块名称', dictCode: '' })
      fieldList.push({ type: 'string', value: 'description', text: '描述', dictCode: '' })
      fieldList.push({ type: 'string', value: 'remark', text: '备注', dictCode: '' })
      fieldList.push({ type: 'int', value: 'security', text: '密级', dictCode: 'security' })
      this.superFieldList = fieldList
    }
  }
}
</script>
<style scoped>
@import '~@assets/less/common.less';
</style>