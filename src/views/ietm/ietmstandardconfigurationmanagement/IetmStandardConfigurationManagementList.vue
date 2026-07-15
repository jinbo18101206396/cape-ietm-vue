<template>
  <a-card :bordered="false">
    <!-- 查询区域 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline" @keyup.enter.native="searchQuery">
        <a-row :gutter="24">
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="标准版本">
              <j-dict-select-tag  v-model="queryParam.standard"  dictCode="standard_type" @change="handleStandardChange"/>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="装备类型">
              <j-dict-select-tag v-model="queryParam.equipmentType"  dictCode="equipment_type" @change="handleEquipmentTypeChange"/>
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
      <a-button
        @click="handleAddSibling"
        type="primary"
        icon="plus"
        style="margin-left: 8px"
        :disabled="!canAddSibling">
        添加平级节点
      </a-button>
      <span style="margin-left: 16px; line-height: 32px; vertical-align: middle;">【编码规则:A-00-0-0-00-00-A】</span>
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
        rowKey="id"
        class="j-table-force-nowrap"
        :scroll="{x:true,y:scrollY}"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="false"
        :loading="loading"
        :expandedRowKeys="expandedRowKeys"
        @change="handleTableChange"
        @expand="handleExpand"
        v-bind="tableProps">

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
          <a v-if="record.pid !== '0'" @click="handleEdit(record)">编辑</a>
          <span v-else style="color: #ccc;">编辑</span>

          <a-divider type="vertical" />
          <a-dropdown>
            <a class="ant-dropdown-link">更多 <a-icon type="down" /></a>
            <a-menu slot="overlay">
              <a-menu-item>
                <a @click="handleAddChild(record)">添加下级</a>
              </a-menu-item>
              <a-menu-item v-if="record.pid !== '0'">
                <a-popconfirm title="确定删除吗?" @confirm="() => handleDeleteNode(record.id)" placement="topLeft">
                  <a>删除</a>
                </a-popconfirm>
              </a-menu-item>
              <a-menu-item v-else disabled>
                <span style="color: #ccc;">删除</span>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>

      </a-table>
    </div>

    <ietmStandardConfigurationManagement-modal ref="modalForm" :standard="queryParam.standard" :equipment-type="queryParam.equipmentType" @ok="modalFormOk"></ietmStandardConfigurationManagement-modal>
  </a-card>
</template>

<script>

  import { getAction, deleteAction, postAction } from '@/api/manage'
  import { JeecgListMixin } from '@/mixins/JeecgListMixin'
  import IetmStandardConfigurationManagementModal from './modules/IetmStandardConfigurationManagementModal'
  import {filterMultiDictText} from '@/components/dict/JDictSelectUtil'
  import { filterObj } from '@/utils/util';

  export default {
    name: "IetmStandardConfigurationManagementList",
    mixins:[JeecgListMixin],
    components: {
      IetmStandardConfigurationManagementModal
    },
    data () {
      return {
        scrollY: 0,
        queryParam:{
          standard:"GJB6600",
          equipmentType:'1',
          pid:'0'
        },
        /* 排序参数 */
        isorter: {
          column: 'seq,code',
          order: 'asc',
        },
        description: '预制模板-构型管理管理页面',
        // 表头
        columns: [
          {
            title:'编码',
            align:"center",
            width: 150,
            dataIndex: 'code'
          },
          {
            title:'标题',
            align:"center",
            width: 350,
            dataIndex: 'title'
          },
          {
            title:'序号',
            align:"center",
            width: 50,
            dataIndex: 'seq'
          },

          {
            title:'路径',
            align:"center",
            width: 200,
            dataIndex: 'way'
          },
          {
            title:'密级',
            align:"center",
            width: 100,
            dataIndex: 'security_dictText'
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
          list: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/rootList",
          childList: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/childList",
          getChildListBatch: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/getChildListBatch",
          add: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/add",
          edit: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/edit",
          delete: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/delete",
          deleteBatch: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/deleteBatch",
          exportXlsUrl: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/exportXls",
          importExcelUrl: "ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/importExcel",
        },
        expandedRowKeys:[],
        hasChildrenField:"hasChild",
        pidField:"pid",
        dictOptions: {},
        loadParent: false,
        superFieldList:[],
        isFirstLoad: true, // 标记是否首次加载
      }
    },
    created() {
      this.getSuperFieldList();
    },
    mounted() {
      this.setScrollY()
      //窗口变化时重新计算
      window.addEventListener('resize',this.setScrollY)
      // 延迟加载数据，确保数据字典组件已完全初始化
      this.$nextTick(() => {
        this.loadData(1);
      })
    },
    beforeDestroy() {
      window.removeEventListener('resize',this.setScrollY)
    },
    computed: {
      importExcelUrl(){
        return `${window._CONFIG['domianURL']}/${this.url.importExcelUrl}`;
      },
      tableProps() {
        let _this = this
        return {
          // 列表项是否可选择
          rowSelection: {
            selectedRowKeys: _this.selectedRowKeys,
            onChange: (selectedRowKeys) => _this.selectedRowKeys = selectedRowKeys
          }
        }
      },
      // 计算是否可以添加平级节点
      canAddSibling() {
        // 必须有且只有一个选中节点
        if(this.selectedRowKeys.length !== 1) {
          return false
        }
        // 找到选中的节点
        let selectedNode = this.findNodeById(this.dataSource, this.selectedRowKeys[0])
        // 如果是根节点(pid='0')，不能添加平级节点
        if(selectedNode && selectedNode.pid === '0') {
          return false
        }
        return true
      }
    },
    methods: {
      setScrollY(){
        this.scrollY = window.innerHeight - 450
      },
      loadData(arg, autoExpand){
        if(arg==1){
          this.ipagination.current=1
        }
        this.loading = true
        let params = this.getQueryParams()
      //  params.hasQuery = 'true'
        getAction(this.url.list,params).then(res=>{
          if(res.success){
            let result = res.result
            if(Number(result.total)>0){
              this.ipagination.total = Number(result.total)
              this.dataSource = this.getDataByResult(res.result.records)

              // 首次加载时自动展开所有根节点，或者手动指定 autoExpand=true
              if((this.isFirstLoad || autoExpand === true) && this.dataSource.length > 0){
                this.isFirstLoad = false
                this.autoExpandRootNodes(this.dataSource)
              }

              return this.loadDataByExpandedRows(this.dataSource)
            }else{
              // 数据为空时，自动创建根节点
              console.log('检测到数据为空，准备自动创建根节点')
              this.autoCreateRootNode()
            }
          }else{
            this.$message.warning(res.message)
          }
        }).finally(()=>{
          this.loading = false
        })
      },
      // 根据已展开的行查询数据（用于保存后刷新时异步加载子级的数据）
      loadDataByExpandedRows(dataList) {
        if (this.expandedRowKeys.length > 0) {
          return getAction(this.url.getChildListBatch,{ parentIds: this.expandedRowKeys.join(','),
            isorterColumn: 'seq,code', isorterOrder: 'asc', }).then(res=>{
            if (res.success && res.result.records.length>0) {
              //已展开的数据批量子节点
              let records = res.result.records
              const listMap = new Map();
              for (let item of records) {
                let pid = item[this.pidField];
                if (this.expandedRowKeys.join(',').includes(pid)) {
                 let mapList = listMap.get(pid);
                  if (mapList == null) {
                    mapList = [];
                  }
                  mapList.push(item);
                  listMap.set(pid, mapList);
                }
              }
              let childrenMap = listMap;
              let fn = (list) => {
                if(list) {
                  list.forEach(data => {
                    if (this.expandedRowKeys.includes(data.id)) {
                      data.children = this.getDataByResult(childrenMap.get(data.id))
                      fn(data.children)
                    }
                  })
                }
              }
              fn(dataList)
            }
          })
        } else {
          return Promise.resolve()
        }
      },
      getQueryParams(arg) {
        //获取查询条件
        let sqp = {}
        let param = {}
        if(this.superQueryParams){
          sqp['superQueryParams']=encodeURI(this.superQueryParams)
          sqp['superQueryMatchType'] = this.superQueryMatchType
        }
        param = Object.assign(sqp, this.queryParam, this.isorter ,this.filters);
        if(JSON.stringify(this.queryParam) === "{}" || arg){
          param.hasQuery = 'false'
        }else{
          param.hasQuery = 'true'
        }
        param.field = this.getQueryField();
        param.pageNo = this.ipagination.current;
        param.pageSize = this.ipagination.pageSize;
        return filterObj(param);
      },
      searchReset() {
        //重置
        this.expandedRowKeys = []
        this.queryParam={
          standard:"GJB6600",
            equipmentType:'1',
            pid:'0'
        };
        this.loadData(1);
      },
      searchQuery() {
        this.loadData(1);
        this.selectedRowKeys = []
        this.selectionRows = []
      },
      getDataByResult(result){
        if(result){
          return result.map(item=>{
            //判断是否标记了带有子节点
            if(item[this.hasChildrenField]=='1'){
              let loadChild = { id: item.id+'_loadChild', name: 'loading...', isLoading: true }
              item.children = [loadChild]
            }
            return item
          })
        }
      },
      handleExpand(expanded, record){
        // 判断是否是展开状态
        if (expanded) {
          this.expandedRowKeys.push(record.id)
          if (record.children.length>0 && record.children[0].isLoading === true) {
            let params = this.getQueryParams();//查询条件
            params[this.pidField] = record.id
            params.hasQuery = 'false'
            params.superQueryParams=""
            getAction(this.url.childList,params).then((res)=>{
              if(res.success){
                if(res.result.records){
                  record.children = this.getDataByResult(res.result.records)
                  this.dataSource = [...this.dataSource]
                }else{
                  record.children=''
                  record.hasChildrenField='0'
                }
              }else{
                this.$message.warning(res.message)
              }
            })
          }
        }else{
          let keyIndex = this.expandedRowKeys.indexOf(record.id)
          if(keyIndex>=0){
            this.expandedRowKeys.splice(keyIndex, 1);
          }
        }
      },
      handleAddChild(record){
        // 检查层级限制（根据编码规则，最多7级）
        let currentLevel = this.getNodeLevel(record.code)
        if(currentLevel >= 7) {
          this.$message.warning('已达到最大层级（7级），不能继续添加下级节点！')
          return
        }
        this.loadParent = true
        let obj = {}
        obj[this.pidField] = record['id']
        this.$refs.modalForm.add(obj);
      },
      // 根据编码获取节点层级
      getNodeLevel(code) {
        if(!code) {
          return 0
        }
        // 编码格式：A-00-0-0-00-00-A，通过"-"分隔符统计层级
        let parts = code.split('-')
        return parts.length
      },
      // 添加平级节点
      handleAddSibling() {
        if(this.selectedRowKeys.length !== 1) {
          this.$message.warning('请选择一个节点！')
          return
        }
        // 找到选中的节点
        let selectedNode = this.findNodeById(this.dataSource, this.selectedRowKeys[0])
        if(!selectedNode) {
          this.$message.warning('未找到选中节点！')
          return
        }
        // 不能添加根节点的平级节点
        if(selectedNode.pid === '0') {
          this.$message.warning('不能添加根节点的平级节点！')
          return
        }
        // 添加平级节点，pid与选中节点相同
        this.loadParent = true
        let obj = {}
        obj[this.pidField] = selectedNode.pid
        this.$refs.modalForm.add(obj);
      },
      // 递归查找节点
      findNodeById(dataList, id) {
        if(!dataList || dataList.length === 0) {
          return null
        }
        for(let i = 0; i < dataList.length; i++) {
          let item = dataList[i]
          if(item.id === id) {
            return item
          }
          if(item.children && item.children.length > 0) {
            let found = this.findNodeById(item.children, id)
            if(found) {
              return found
            }
          }
        }
        return null
      },
      handleDeleteNode(id) {
        if(!this.url.delete){
          this.$message.error("请设置url.delete属性!")
          return
        }

        // 检查是否有子节点
        const currentNode = this.dataSource.find(item => item.id === id)
        if (currentNode && currentNode.hasChild === '1') {
          this.$message.warning("当前选中节点含有子节点,请先删除子节点")
          return
        }

        var that = this;
        deleteAction(that.url.delete, {id: id}).then((res) => {
          if (res.success) {
             that.loadData(1)
          } else {
            that.$message.warning(res.message);
          }
        });
      },
      batchDel(){
        if(this.selectedRowKeys.length<=0){
          this.$message.warning('请选择一条记录！');
          return false;
        }else{
          let ids = "";
          let that = this;
          that.selectedRowKeys.forEach(function(val) {
            ids+=val+",";
          });
          that.$confirm({
            title:"确认删除",
            content:"是否删除选中数据?",
            onOk: function(){
              that.handleDeleteNode(ids)
              that.onClearSelected();
            }
          });
        }
      },
      // 自动创建根节点
      autoCreateRootNode() {
        console.log('开始创建根节点，参数：', {
          standard: this.queryParam.standard,
          equipmentType: this.queryParam.equipmentType
        })

        let rootNode = {
          pid: '0',
          standard: this.queryParam.standard,
          equipmentType: this.queryParam.equipmentType,
          code: 'A',
          title: '《系统区分码》',
          seq: 1,
          hasChild: '0',
          security: 1  // 添加密级字段，默认为1（非密）
        }

        console.log('准备发送的根节点数据：', rootNode)

        postAction(this.url.add, rootNode).then(res => {
          console.log('创建根节点响应：', res)
          if(res.success) {
            this.$message.success('根节点自动创建成功')
            // 重新加载数据并自动展开
            this.loadData(1, true)
          } else {
            this.$message.error('根节点创建失败：' + res.message)
            this.ipagination.total = 0
            this.dataSource = []
          }
        }).catch(err => {
          console.error('创建根节点异常：', err)
          this.$message.error('创建根节点异常：' + err.message)
          this.ipagination.total = 0
          this.dataSource = []
        })
      },
      getSuperFieldList(){
        let fieldList=[];
        fieldList.push({type:'string',value:'equipmentType',text:'装备类型',dictCode:''})
        fieldList.push({type:'string',value:'code',text:'编码',dictCode:''})
        fieldList.push({type:'string',value:'title',text:'标题',dictCode:''})
        fieldList.push({type:'string',value:'seq',text:'序号',dictCode:''})
        fieldList.push({type:'string',value:'status',text:'状态',dictCode:''})
        fieldList.push({type:'int',value:'security',text:'密级',dictCode:''})
        this.superFieldList = fieldList
      },
      // 覆盖 mixin 的 searchQuery 方法，点击查询按钮时自动展开根节点
      searchQuery() {
        // 清空已展开的节点
        this.expandedRowKeys = []
        // 清空选中的行
        this.selectedRowKeys = []
        // 重新加载数据，并自动展开根节点
        this.loadData(1, true)
      },
      // 标准版本变化时触发
      handleStandardChange(value) {
        console.log('标准版本变化:', value)
        // 清空已展开的节点
        this.expandedRowKeys = []
        // 清空选中的行
        this.selectedRowKeys = []
        // 重新加载数据，并自动展开根节点
        this.loadData(1, true)
      },
      // 装备类型变化时触发
      handleEquipmentTypeChange(value) {
        console.log('装备类型变化:', value)
        // 清空已展开的节点
        this.expandedRowKeys = []
        // 清空选中的行
        this.selectedRowKeys = []
        // 重新加载数据，并自动展开根节点
        this.loadData(1, true)
      },
      // 自动展开所有根节点
      autoExpandRootNodes(dataList) {
        if(!dataList || dataList.length === 0) {
          return
        }
        // 遍历根节点，将有子节点的根节点ID添加到expandedRowKeys
        dataList.forEach(item => {
          if(item[this.hasChildrenField] === '1') {
            this.expandedRowKeys.push(item.id)
            // 异步加载子节点数据
            this.loadChildrenData(item)
          }
        })
      },
      // 加载子节点数据
      loadChildrenData(record) {
        let params = this.getQueryParams()
        params[this.pidField] = record.id
        params.hasQuery = 'false'
        params.superQueryParams = ""
        getAction(this.url.childList, params).then((res) => {
          if(res.success) {
            if(res.result.records) {
              record.children = this.getDataByResult(res.result.records)
              this.dataSource = [...this.dataSource]
            } else {
              record.children = ''
              record[this.hasChildrenField] = '0'
            }
          } else {
            this.$message.warning(res.message)
          }
        })
      }
    }
  }
</script>
<style scoped>
  @import '~@assets/less/common.less';
</style>