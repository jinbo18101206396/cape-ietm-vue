<template>
  <a-card :bordered="false">
    <div class="container">
      <div class="left-content">
        <div>
          <span>
            【编码规则：A-00-0-0-00-00-A】
          </span>
          <div>
            <a-checkbox>显示子节点的DM</a-checkbox>
          </div>
          <!-- 操作按钮区域 -->
          <div class="table-operator">
            <a-tooltip title="复制所选节点下的DM(不包括子节点的DM)">
              <a-button icon="copy" @click="handleAdd">复制</a-button>
            </a-tooltip>
            <a-tooltip title="将复制节点下的DM粘贴到所选节点下">
              <a-button icon="snippets" @click="handleAdd">粘贴</a-button>
            </a-tooltip>
            <a-tooltip title="计算所有DM的引用信息">
              <a-button icon="calculator" @click="handleAdd">计算</a-button>
            </a-tooltip>
          </div>
        </div>
        <a-divider />
        <a-tree
          :autoExpandParent="autoExpandParent"
          :checkStrictly="true"
          :dropdownStyle="{maxHeight:'200px',overflow:'auto'}"
          :expandedKeys="iExpandedKeys"
          :selectedKeys="selectedKeys"
          :treeData="treeData"
          @expand="onExpand"
          @select="onSelect"
        />
      </div>
      <div class="right-content">
        <div class="table-operator">
          <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button>
          <a-button @click="handleAdd" type="primary" icon="copy">复制</a-button>
          <a-button @click="handleAdd" type="primary" icon="snippets">粘贴</a-button>
          <a-dropdown v-if="selectedRowKeys.length > 0">
            <a-menu slot="overlay">
              <a-menu-item key="1" @click="batchDel">
                <a-icon type="delete" />
                删除
              </a-menu-item>
            </a-menu>
            <a-button style="margin-left: 8px"> 批量操作
              <a-icon type="down" />
            </a-button>
          </a-dropdown>
          <a-button @click="handleAdd" type="primary" icon="upload">签出</a-button>
          <a-button @click="handleAdd" type="primary" icon="download">签入</a-button>
          <a-button @click="handleAdd" type="primary" icon="undo">取消签出</a-button>
          <a-button @click="handleAdd" type="primary" icon="ordered-list">历史版本</a-button>
          <a-button @click="handleAdd" type="primary" icon="read">浏览</a-button>
          <a-button @click="handleAdd" type="primary" icon="read">启动</a-button>
          <a-button @click="handleAdd" type="primary" icon="read">发布后启动</a-button>
          <a-button @click="handleAdd" type="primary" icon="desktop">预览</a-button>
          <a-button @click="handleAdd" type="primary" icon="check">校验</a-button>
          <a-button @click="handleAdd" type="primary" icon="link">引用信息</a-button>
          <a-button @click="handleAdd" type="primary" icon="printer">发布</a-button>
        </div>
        <!-- table区域-begin -->
        <div style="background-color: white;margin-left: 10px">
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
          </a-table>

        </div>
      </div>
    </div>
    <ietm-data-module-modal ref="modalForm" @ok="modalFormOk"></ietm-data-module-modal>
  </a-card>
</template>

<script>

import '@/assets/less/TableExpand.less'
import { mixinDevice } from '@/utils/mixin'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import IetmDataModuleModal from './modules/IetmDataModuleModal'
import { getAction, httpAction } from '@api/manage'
import { filterObj } from '@/utils/util'

export default {
  name: 'IetmDataModuleList',
  mixins: [JeecgListMixin, mixinDevice],
  components: {
    IetmDataModuleModal
  },
  data() {
    return {
      description: '项目管理-项目数据模块管理管理页面',
      title: '项目数据模块管理',
      projectId: '',
      autoExpandParent: true,
      iExpandedKeys: [],
      selectedKeys: [],
      isFirstLvlMenu: true,
      currentSelected: '',
      //todo
      productType: '', //选中树节点的名称
      treeData: [],
      allTreeKeys: [],
      width: 1200,
      dataSource: [],
      // 表头
      columns: [
        {
          title: '',
          dataIndex: '',
          key: 'rowIndex',
          width: 60,
          align: 'center',
          customRender: function(t, r, index) {
            return parseInt(index) + 1
          }
        },
        {
          title: '数据模块编码',
          align: 'center',
          dataIndex: 'dmc'
        },
        {
          title: '技术名称',
          align: 'center',
          dataIndex: 'techName'
        },
        {
          title: '信息名称',
          align: 'center',
          dataIndex: 'infoName'
        },
        {
          title: 'DM类型',
          align: 'center',
          dataIndex: 'dmType'
        },
        {
          title: '版本',
          align: 'center',
          dataIndex: 'version'
        },
        {
          title: '版本类型',
          align: 'center',
          dataIndex: 'versionType'
        },
        {
          title: '版本日期',
          align: 'center',
          dataIndex: 'versionDate',
          customRender: function(text) {
            return !text ? '' : (text.length > 10 ? text.substr(0, 10) : text)
          }
        },
        {
          title: '密级',
          align: 'center',
          dataIndex: 'security'
        },
        {
          title: '流程当前步骤',
          align: 'center',
          dataIndex: 'processStep'
        },
        {
          title: '流程状态',
          align: 'center',
          dataIndex: 'processStatus'
        }
      ],
      url: {
        list: '/itemprojectdatamodule/ietmDataModule/list',
        delete: '/itemprojectdatamodule/ietmDataModule/delete',
        deleteBatch: '/itemprojectdatamodule/ietmDataModule/deleteBatch',
        exportXlsUrl: '/itemprojectdatamodule/ietmDataModule/exportXls',
        importExcelUrl: 'itemprojectdatamodule/ietmDataModule/importExcel'
      },
      dictOptions: {},
      superFieldList: []
    }
  },
  created() {
  },
  mounted() {
    this.loadTree()
  },
  computed: {
    importExcelUrl: function() {
      return `${window._CONFIG['domianURL']}/${this.url.importExcelUrl}`
    }
  },
  methods: {
    show(model) {
      this.visible = true
      this.onClearSelected()
      this.model = model
      if (this.model.id && this.model.id != '') {
        let split = this.model.id.split(',')
        this.selectedRowKeys = split
      }
    },
    loadTree() {
      var that = this
      that.treeData = []
      getAction('/projectconfigurationmanagement/ietmProjectConfigurationManagement/queryTreeList').then((res) => {
        if (res.success) {
          this.allTreeKeys = []
          for (let i = 0; i < res.result.length; i++) {
            let temp = res.result[i]
            that.treeData.push(temp)
            that.setThisExpandedKeys(temp)
            that.getAllKeys(temp)
          }
          this.loading = false
        }
      })
    },
    // 展开左侧菜单树形结构并渲染右侧对应的表格
    onSelect(selectedKeys, e) {
      console.log('selected', selectedKeys, e)

      if (this.currentSelected !== selectedKeys[0]) {
        this.currentSelected = selectedKeys[0]
        let record = e.node.dataRef
        this.productType = record.name
        var parentId = record.parentid
        if (parentId === '0') {
          this.isFirstLvlMenu = true
        } else {
          this.isFirstLvlMenu = false
        }
        this.loadData()
      }
    },
    getQueryParams() {
      //获取查询条件
      let sqp = {}
      if (this.superQueryParams) {
        sqp['superQueryParams'] = encodeURI(this.superQueryParams)
        sqp['superQueryMatchType'] = this.superQueryMatchType
      }
      var param = Object.assign(sqp, this.queryParam, this.isorter, this.filters)
      param.field = this.getQueryField()
      param.pageNo = this.ipagination.current
      param.pageSize = this.ipagination.pageSize
      // 如果 type 是 螺栓、螺钉、螺桩、螺母、铆钉、镶嵌紧固件
      if (this.isFirstLvlMenu) {
        param.type = this.productType
      } else {
        // 否则
        param.subType = this.productType
      }
      // 如果当前页面存在currentStd，则作为参数传到后端
      if (this.currentStd) {
        param.currentStd = this.currentStd
      }
      return filterObj(param)
    },
    onExpand(expandedKeys) {
      this.iExpandedKeys = expandedKeys
      this.autoExpandParent = false
    },

    setThisExpandedKeys(node) {
      if (node.children && node.children.length > 0) {
        this.iExpandedKeys.push(node.key)
        for (let a = 0; a < node.children.length; a++) {
          this.setThisExpandedKeys(node.children[a])
        }
      }
    },
    getAllKeys(node) {
      // console.log('node',node);
      this.allTreeKeys.push(node.key)
      if (node.children && node.children.length > 0) {
        for (let a = 0; a < node.children.length; a++) {
          this.getAllKeys(node.children[a])
        }
      }
    },
    close() {
      this.visible = false
    },
    handleOk() {
      let id = ''
      for (var a = 0; a < this.selectedRowKeys.length; a++) {
        if (a == this.selectedRowKeys.length - 1) {
          id += this.selectedRowKeys[a]
        } else {
          id += this.selectedRowKeys[a] + ','
        }
      }
      this.model.linkProduct = id
      let that = this
      httpAction(this.url.edit, this.model, 'put').then((res) => {
        if (res.success) {
          that.$message.success(res.message)
        } else {
          that.$message.warning(res.message)
        }
      }).finally(() => {
        this.$emit('ok', this.selectionRows)
        this.close()
      })
    },
    handleCancel() {
      this.close()
    }
  }
}
</script>
<style scoped lang="less">
@import '~@assets/less/common.less';

.container {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 150px);
  width: 100%;

  .left-content {
    min-width: 450px;
    width: 20%;
    background-color: white;
  }

  .right-content {
    flex: auto;
  }
}

/deep/ .ant-tree {
  max-height: calc(100% - 90px);
  overflow-y: scroll;
  overflow-x: scroll;
}

.table-operator {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
}

.ant-divider-horizontal {
  margin: 0;
}
</style>
