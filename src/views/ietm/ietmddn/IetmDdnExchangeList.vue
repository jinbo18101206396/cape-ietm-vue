<template>
  <a-card :bordered="false">
    <!-- 查询区域 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline" @keyup.enter.native="searchQuery">
        <a-row :gutter="24">
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="DDN编码">
              <a-input placeholder="请输入DDN编码" v-model="queryParam.ddnCode"></a-input>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="DDN类型">
              <a-select placeholder="请选择DDN类型" v-model="queryParam.ddnType" allowClear>
                <a-select-option value="DM">DM</a-select-option>
                <a-select-option value="ICN">ICN</a-select-option>
                <a-select-option value="PM">PM</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="导入导出">
              <a-select placeholder="请选择导入导出标识" v-model="queryParam.impexp" allowClear>
                <a-select-option value="e">导出</a-select-option>
                <a-select-option value="i">导入</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <span style="float: left;overflow: hidden;" class="table-page-search-submitButtons">
              <a-button type="primary" @click="searchQuery" icon="search">查询</a-button>
              <a-button type="primary" @click="searchReset" icon="reload" style="margin-left: 8px">重置</a-button>
            </span>
          </a-col>
        </a-row>
      </a-form>
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
        class="j-table-force-nowrap"
        @change="handleTableChange">

        <span slot="action" slot-scope="text, record">
          <a @click="handleViewContent(record)">查看内容</a>
        </span>

        <span slot="impexp" slot-scope="text">
          <a-tag v-if="text === 'e'" color="green">导出</a-tag>
          <a-tag v-else-if="text === 'i'" color="blue">导入</a-tag>
        </span>

        <span slot="ddnType" slot-scope="text">
          <a-tag v-if="text === 'DM'" color="cyan">DM</a-tag>
          <a-tag v-else-if="text === 'ICN'" color="orange">ICN</a-tag>
          <a-tag v-else-if="text === 'PM'" color="purple">PM</a-tag>
        </span>

      </a-table>
    </div>

    <!-- 表单区域 -->
    <ietm-ddn-exchange-modal ref="modalForm" @ok="modalFormOk"></ietm-ddn-exchange-modal>

    <!-- 内容查看对话框 -->
    <ietm-ddn-content-modal ref="contentModal"></ietm-ddn-content-modal>
  </a-card>
</template>

<script>
import '@/assets/less/TableExpand.less'
import { mixinDevice } from '@/utils/mixin'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import IetmDdnExchangeModal from './modules/IetmDdnExchangeModal'
import IetmDdnContentModal from './modules/IetmDdnContentModal'
import { getAction } from '@/api/manage'

export default {
  name: 'IetmDdnExchangeList',
  mixins: [JeecgListMixin, mixinDevice],
  components: {
    IetmDdnExchangeModal,
    IetmDdnContentModal
  },
  data() {
    return {
      description: '数据交换记录管理页面',
      // 表头
      columns: [
        {
          title: '#',
          dataIndex: '',
          key: 'rowIndex',
          width: 60,
          align: 'center',
          customRender: function(t, r, index) {
            return parseInt(index) + 1
          }
        },
        {
          title: 'DDN编码',
          align: 'center',
          dataIndex: 'ddnCode',
          width: 200
        },
        {
          title: 'DDN类型',
          align: 'center',
          dataIndex: 'ddnType',
          width: 100,
          scopedSlots: { customRender: 'ddnType' }
        },
        {
          title: '导入导出',
          align: 'center',
          dataIndex: 'impexp',
          width: 100,
          scopedSlots: { customRender: 'impexp' }
        },
        {
          title: '型号代码',
          align: 'center',
          dataIndex: 'modelIdentCode',
          width: 120
        },
        {
          title: '发送方',
          align: 'center',
          dataIndex: 'senderIdent',
          width: 100
        },
        {
          title: '接收方',
          align: 'center',
          dataIndex: 'receiverIdent',
          width: 100
        },
        {
          title: 'DM数量',
          align: 'center',
          dataIndex: 'dmCount',
          width: 80
        },
        {
          title: 'ICN数量',
          align: 'center',
          dataIndex: 'icnCount',
          width: 80
        },
        {
          title: '创建时间',
          align: 'center',
          dataIndex: 'createTime',
          width: 150
        },
        {
          title: '操作',
          dataIndex: 'action',
          align: 'center',
          width: 120,
          scopedSlots: { customRender: 'action' }
        }
      ],
      url: {
        list: '/ietmddn/ietmDdnExchange/list',
        delete: '/ietmddn/ietmDdnExchange/delete',
        deleteBatch: '/ietmddn/ietmDdnExchange/deleteBatch',
        exportXlsUrl: '/ietmddn/ietmDdnExchange/exportXls',
        importExcelUrl: 'ietmddn/ietmDdnExchange/importExcel'
      },
      currentProjectId: ''
    }
  },
  created() {
    this.initCurrentProject()
  },
  methods: {
    // 初始化当前项目
    initCurrentProject() {
      getAction('/ietmproject/ietmProject/getCurrentProject').then(res => {
        if (res.success && res.result) {
          this.currentProjectId = res.result.projectId
          this.queryParam.projectId = res.result.projectId
          this.loadData()
        } else {
          this.$message.warning('请先选择项目')
        }
      })
    },
    // 重写loadData，添加项目校验
    loadData(arg) {
      if (!this.currentProjectId) {
        console.log('项目未选择，不加载数据')
        return
      }
      // 调用mixin中的loadData
      this.ipagination.current = arg || 1
      this.loading = true
      let params = this.getQueryParams()
      this.getQueryField()
      this.url.list && this.$http.get(this.url.list, { params: params }).then((res) => {
        if (res.success) {
          this.dataSource = res.result.records || res.result
          this.ipagination.total = res.result.total || 0
        }
        if (res.code === 510) {
          this.$message.warning(res.message)
        }
        this.loading = false
      })
    },
    // 重写searchReset，保留projectId
    searchReset() {
      let projectId = this.queryParam.projectId
      this.queryParam = { projectId: projectId }
      this.loadData(1)
    },
    // 查看DDN内容
    handleViewContent(record) {
      this.$refs.contentModal.show(record.id)
    }
  }
}
</script>

<style scoped>
@import '~@assets/less/common.less';
</style>
