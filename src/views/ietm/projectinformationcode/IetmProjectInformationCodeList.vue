<template>
  <a-card :bordered="false">
    <!-- 查询区域 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline" @keyup.enter.native="searchQuery">
        <a-row :gutter="24">
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-model-item label="编码">
              <a-input v-model="queryParam.code" placeholder="请输入编码"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="数据模块类型">
              <a-select v-model="queryParam.dmtypeName" placeholder="请选择数据模块类型" allowClear>
                <a-select-option v-for="item in getDmtypeNameOptions()" :key="item" :value="item">
                  {{ item }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-button type="primary" @click="searchQuery" icon="search">查询</a-button>
            <a-button type="primary" @click="searchReset" icon="reload" style="margin-left: 8px">重置</a-button>
          </a-col>
        </a-row>
      </a-form>
    </div>
    <!-- 查询区域-END -->

    <!-- 操作按钮区域 -->
    <div class="table-operator">
      <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button>
      <a-button @click="handleImportTemplate" type="primary" icon="import">从标准模板导入</a-button>
      <a-button type="primary" icon="download" @click="handleExportXls('项目信息码管理')">导出</a-button>
      <a-upload name="file" :showUploadList="false" :multiple="false" :headers="tokenHeader" :action="importExcelUrl" @change="handleImportExcel">
        <a-button type="primary" icon="upload">导入</a-button>
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

    <ietm-project-information-code-modal ref="modalForm" @ok="modalFormOk" :dmtypeOptions="dmtypeOptions"></ietm-project-information-code-modal>
    <template-import-modal ref="templateImportModal" :projectId="currentProjectId" :dmtypeOptions="dmtypeOptions" @ok="handleTemplateImportOk"></template-import-modal>
  </a-card>
</template>

<script>

  import '@/assets/less/TableExpand.less'
  import { mixinDevice } from '@/utils/mixin'
  import { JeecgListMixin } from '@/mixins/JeecgListMixin'
  import IetmProjectInformationCodeModal from './modules/IetmProjectInformationCodeModal'
  import TemplateImportModal from './modules/TemplateImportModal'
  import {filterMultiDictText} from '@/components/dict/JDictSelectUtil'
  import { getAction } from '@/api/manage'

  export default {
    name: 'IetmProjectInformationCodeList',
    mixins:[JeecgListMixin, mixinDevice],
    components: {
      IetmProjectInformationCodeModal,
      TemplateImportModal
    },
    data () {
      return {
        description: '项目管理-项目信息码管理管理页面',
        // 数据模块类型下拉选项（从当前项目对应的IETM标准的DM类型中获取）
        dmtypeOptions: [],
        // 当前项目ID
        currentProjectId: '',
        // 当前项目的IETM标准
        currentProjectStandard: '',
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
            title:'编码',
            align:"center",
            dataIndex: 'code',
            width: 200
          },
          {
            title:'数据模块类型',
            align:"center",
            dataIndex: 'dmtypeName'
          },
          {
            title:'描述',
            align:"center",
            dataIndex: 'description'
          },
          {
            title:'备注',
            align:"center",
            dataIndex: 'remark'
          },
          {
            title:'密级',
            align:"center",
            dataIndex: 'security_dictText'
          },
          {
            title: '操作',
            dataIndex: 'action',
            align:"center",
            fixed:"right",
            width:147,
            scopedSlots: { customRender: 'action' }
          }
        ],
        url: {
          list: "/projectinformationcode/ietmProjectInformationCode/list",
          delete: "/projectinformationcode/ietmProjectInformationCode/delete",
          deleteBatch: "/projectinformationcode/ietmProjectInformationCode/deleteBatch",
          exportXlsUrl: "/projectinformationcode/ietmProjectInformationCode/exportXls",
          importExcelUrl: "projectinformationcode/ietmProjectInformationCode/importExcel",

        },
        dictOptions:{},
        superFieldList:[],
      }
    },
    created() {
    this.getSuperFieldList();
    this.initCurrentProject();
    },
    computed: {
      importExcelUrl: function(){
        return `${window._CONFIG['domianURL']}/${this.url.importExcelUrl}`;
      },
    },
    methods: {
      initDictConfig(){
      },
      getSuperFieldList(){
        let fieldList=[];
        fieldList.push({type:'string',value:'code',text:'编码',dictCode:''})
        fieldList.push({type:'popup',value:'dmtypeName',text:'数据模块类型', popup:{code:'ietm_standard_dmtype',field:'id',orgFields:'id',destFields:'dmtype_id'}})
        this.superFieldList = fieldList
      },
      // 打开模板导入对话框
      handleImportTemplate() {
        this.$refs.templateImportModal.show();
      },
      // 模板导入成功回调
      handleTemplateImportOk() {
        this.loadData();
        // 后端已经返回详细消息（如"成功导入 5 条信息码！"），前端不重复提示
      },
      // 重写新增，传入当前项目ID
      handleAdd() {
        if (!this.currentProjectId) {
          this.$message.warning('请先打开一个项目！')
          return
        }
        this.$refs.modalForm.add({ projectId: this.currentProjectId })
        this.$refs.modalForm.title = '新增'
        this.$refs.modalForm.disableSubmit = false
      },
      // 初始化当前项目信息
      initCurrentProject() {
        // 从后端接口获取当前打开的项目
        getAction('/ietmproject/ietmProject/getCurrentProject').then(res => {
          console.log('getCurrentProject接口返回:', res)
          if (res.success && res.result) {
            const currentProject = res.result
            console.log('当前项目信息:', currentProject)
            this.currentProjectId = currentProject.projectId
            this.currentProjectStandard = currentProject.ietmStandard || ''
            console.log('提取的IETM标准:', this.currentProjectStandard)
            // 设置查询参数中的项目ID，确保列表只显示当前项目的数据
            this.queryParam.projectId = currentProject.projectId

            // 如果获取到了IETM标准，立即加载DM类型下拉选项
            if (this.currentProjectStandard) {
              this.loadDmtypeOptions()
            } else {
              console.warn('当前项目未配置IETM标准')
            }

            // 加载列表数据
            this.loadData()
          } else {
            this.$message.warning('未打开任何项目，请先在首页打开项目')
            this.dataSource = []
          }
        }).catch(err => {
          console.error('获取当前项目失败:', err)
          this.$message.error('获取当前项目失败')
        })
      },
      // 加载项目标准信息
      loadProjectStandard(projectId) {
        // 查询项目信息获取ietmStandard字段
        getAction('/ietmproject/ietmProject/queryById', { id: projectId }).then(res => {
          if (res.success && res.result) {
            this.currentProjectStandard = res.result.ietmStandard || ''
            if (this.currentProjectStandard) {
              this.loadDmtypeOptions()
            } else {
              console.warn('当前项目未配置IETM标准')
            }
          }
        }).catch(err => {
          console.error('获取项目信息失败:', err)
        })
      },
      // 加载数据模块类型下拉选项（从当前项目对应的IETM标准的DM类型中获取）
      loadDmtypeOptions() {
        if (!this.currentProjectStandard) {
          this.dmtypeOptions = []
          console.warn('未获取到IETM标准，无法加载DM类型选项')
          return
        }

        console.log('开始加载DM类型选项，标准:', this.currentProjectStandard)

        getAction('/standardmanagement/ietmStandard/listIetmStandardDmtypeByMainId', {
          standard: this.currentProjectStandard,
          pageSize: 500
        }).then(res => {
          console.log('DM类型接口返回:', res)
          if (res.success) {
            const records = res.result.records || res.result || []
            console.log('DM类型记录数:', records.length, records)
            // 保存完整的记录（包含id和dmtypeName），供表单使用
            this.dmtypeOptions = records
            console.log('DM类型选项:', this.dmtypeOptions)
          } else {
            console.error('DM类型接口返回失败:', res.message)
          }
        }).catch(err => {
          console.error('获取DM类型选项失败:', err)
        })
      },
      // 获取DM类型名称列表（用于查询条件下拉框）
      getDmtypeNameOptions() {
        const dmtypeNames = this.dmtypeOptions.map(item => item.dmtypeName).filter(name => name)
        return [...new Set(dmtypeNames)].sort()
      },
      // 重写 loadData 方法，在 projectId 未设置时不执行查询
      loadData(arg) {
        // 如果 projectId 还未设置，跳过查询（等待 initCurrentProject 完成）
        if (!this.queryParam.projectId) {
          console.log('projectId 未设置，跳过查询')
          return
        }
        // 调用 mixin 的原始 loadData 方法
        JeecgListMixin.methods.loadData.call(this, arg)
      },
      // 重写重置方法，保留 projectId 查询参数
      searchReset() {
        const projectId = this.queryParam.projectId
        this.queryParam = {}
        // 重置后保留当前项目ID过滤条件
        if (projectId) {
          this.queryParam.projectId = projectId
        }
        this.loadData(1)
      }
    },
    watch: {
      // 监听数据源变化，如果还没有项目ID则从列表中提取
      dataSource: {
        handler(newVal) {
          if (!this.currentProjectId && newVal && newVal.length > 0) {
            // 从第一条数据中提取项目ID
            const firstRecord = newVal[0]
            if (firstRecord.projectId) {
              this.currentProjectId = firstRecord.projectId
              // 设置查询参数，确保后续查询只显示当前项目数据
              this.queryParam.projectId = firstRecord.projectId
              this.loadProjectStandard(firstRecord.projectId)
            }
          }
        },
        immediate: false
      }
    }
  }
</script>
<style scoped>
  @import '~@assets/less/common.less';
</style>