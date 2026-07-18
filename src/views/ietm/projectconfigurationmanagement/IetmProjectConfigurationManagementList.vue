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
    <div class="table-operator">
      <!-- ❌ 隐藏新增按钮 -->
      <!-- <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button> -->

      <!-- ✅ 从模板导入按钮 -->
      <a-button type="primary" icon="download" @click="handleTemplateImport">从模板导入</a-button>

      <!-- ✅ 从Excel导入按钮 -->
      <a-button type="primary" icon="file-excel" @click="handleExcelImport">从Excel导入</a-button>

      <!-- ❌ 隐藏导出按钮 -->
      <!-- <a-button type="primary" icon="download" @click="handleExportXls('项目管理-项目构型管理')">导出</a-button> -->

      <!-- ❌ 隐藏导入按钮 -->
      <!-- <a-upload name="file" :showUploadList="false" :multiple="false" :headers="tokenHeader" :action="importExcelUrl" @change="handleImportExcel">
        <a-button type="primary" icon="import">导入</a-button>
      </a-upload> -->

      <a-button type="primary" icon="sync" @click="handleBatchGeneratePaths">批量生成路径</a-button>

      <!-- ❌ 隐藏高级查询 -->
      <!-- <j-super-query :fieldList="superFieldList" ref="superQueryModal" @handleSuperQuery="handleSuperQuery"></j-super-query> -->

      <span style="margin-left: 16px; line-height: 32px; vertical-align: middle;">【编码规则：A-00-0-0-00-00-A】</span>
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
          <!-- ✅ 根节点（pid='0'）不显示编辑按钮 -->
          <a v-if="record.pid !== '0'" @click="handleEdit(record)">编辑</a>
          <!-- 根节点只显示"添加下级" -->
          <span v-else style="color: #999;">根节点</span>

          <a-divider type="vertical" />
          <a-dropdown>
            <a class="ant-dropdown-link">更多 <a-icon type="down" /></a>
            <a-menu slot="overlay">
              <!-- ✅ 新增：添加平级按钮（根节点不显示） -->
              <a-menu-item v-if="record.pid !== '0'">
                <a @click="handleAddSibling(record)">添加平级</a>
              </a-menu-item>

              <a-menu-item>
                <a @click="handleAddChild(record)">添加下级</a>
              </a-menu-item>

              <!-- ✅ 根节点（pid='0'）不显示删除按钮 -->
              <a-menu-item v-if="record.pid !== '0'">
                <a-popconfirm title="确定删除吗?" @confirm="() => handleDeleteNode(record.id)" placement="topLeft">
                  <a>删除</a>
                </a-popconfirm>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>

      </a-table>
    </div>

    <ietmProjectConfigurationManagement-modal ref="modalForm" @ok="modalFormOk"></ietmProjectConfigurationManagement-modal>
    <template-import-modal ref="templateImportModal" @ok="modalFormOk"></template-import-modal>
    <excel-import-modal ref="excelImportModal" :projectId="currentProjectId" @ok="modalFormOk"></excel-import-modal>
  </a-card>
</template>

<script>

  import { getAction, deleteAction, postAction } from '@/api/manage'
  import { JeecgListMixin } from '@/mixins/JeecgListMixin'
  import IetmProjectConfigurationManagementModal from './modules/IetmProjectConfigurationManagementModal'
  import TemplateImportModal from './modules/TemplateImportModal'
  import ExcelImportModal from './modules/ExcelImportModal'
  import {filterMultiDictText} from '@/components/dict/JDictSelectUtil'
  import { filterObj } from '@/utils/util';
  import { mapState } from 'vuex'

  export default {
    name: "IetmProjectConfigurationManagementList",
    mixins:[JeecgListMixin],
    components: {
      IetmProjectConfigurationManagementModal,
      TemplateImportModal,
      ExcelImportModal
    },
    data () {
      return {
        description: '项目管理-项目构型管理管理页面',
        scrollY: 0,
        // 禁用 JeecgListMixin 的自动加载
        disableMixinCreated: true,
        // 当前项目ID
        currentProjectId: '',
        // 当前项目信息
        currentProjectInfo: null,
        // 表头
        columns: [
          {
            title:'编码',
            align:"center",
            width: 150,
            dataIndex: 'code'
          },
          {
            title:'技术名称',
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
            dataIndex: 'path'
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
        isorter: {
          column: 'seq',
          order: 'asc',
        },
        url: {
          list: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/rootList",
          childList: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/childList",
          getChildListBatch: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/getChildListBatch",
          add: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/add",
          delete: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/delete",
          deleteBatch: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/deleteBatch",
          exportXlsUrl: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/exportXls",
          importExcelUrl: "projectconfigurationmanagement/ietmProjectConfigurationManagement/importExcel",
          checkDelete: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/checkDelete",
          batchGeneratePaths: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/batchGeneratePaths",
        },
        expandedRowKeys:[],
        hasChildrenField:"hasChild",
        pidField:"pid",
        dictOptions: {},
        loadParent: false,
        superFieldList:[],
        isLoadingData: false,  // ✅ 添加防重入锁
      }
    },
    computed: {
      ...mapState({
        currentProject: state => state.project.currentProject
      }),
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
      }
    },
    created() {
      // 初始化字典配置
      this.initDictConfig();
      // 获取高级查询字段
      this.getSuperFieldList();
      // 初始化当前项目
      this.initCurrentProject();
    },
    mounted() {
      this.setScrollY()
      //窗口变化时重新计算
      window.addEventListener('resize',this.setScrollY)
    },
    beforeDestroy() {
      window.removeEventListener('resize',this.setScrollY)
    },
    watch: {
      // 监听 Vuex 中的当前项目变化
      currentProject: {
        handler(newVal, oldVal) {
          console.log('当前项目变化:', { newVal, oldVal })
          if (newVal && newVal.projectId) {
            // 项目切换时，重新加载数据
            if (this.currentProjectId !== newVal.projectId) {
              this.currentProjectId = newVal.projectId
              this.currentProjectInfo = newVal
              this.loadData(1)
            }
          } else if (!newVal) {
            // 项目被关闭时，清空数据
            console.log('项目已关闭，清空列表')
            this.currentProjectId = ''
            this.currentProjectInfo = null
            this.dataSource = []
            this.ipagination.total = 0
          }
        },
        deep: true,
        immediate: false
      }
    },
    computed: {
      ...mapState({
        currentProject: state => state.project.currentProject
      }),
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
      }
    },
    methods: {
      setScrollY(){
        this.scrollY = window.innerHeight - 330
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
            this.currentProjectInfo = currentProject

            // 加载列表数据
            this.loadData(1)
          } else {
            // 没有打开任何项目，清空数据并提示
            console.warn('未打开任何项目')
            this.$message.warning('未打开任何项目，请先在首页打开项目')
            this.currentProjectId = ''
            this.currentProjectInfo = null
            this.dataSource = []
            this.ipagination.total = 0
          }
        }).catch(err => {
          console.error('获取当前项目失败:', err)
          this.$message.error('获取当前项目失败')
          this.currentProjectId = ''
          this.currentProjectInfo = null
          this.dataSource = []
          this.ipagination.total = 0
        })
      },
      loadData(arg){
        // ✅ 防重入保护
        if (this.isLoadingData) {
          console.warn('[防重入] loadData已在执行中，跳过本次调用')
          return
        }

        // 检查是否有当前项目信息
        if (!this.currentProjectId) {
          this.loading = false
          this.dataSource = []
          this.ipagination.total = 0
          return
        }

        if(arg==1){
          this.ipagination.current=1
        }

        // ✅ 设置锁和清空展开的行
        this.isLoadingData = true
        this.expandedRowKeys = []

        this.loading = true
        let params = this.getQueryParams()
        params.hasQuery = 'true'
        // 添加项目ID过滤条件
        params.projectId = this.currentProjectId

        getAction(this.url.list,params).then(res=>{
          if(res.success){
            let result = res.result
            if(Number(result.total)>0){
              this.ipagination.total = Number(result.total)
              // 修正根节点数据显示
              let records = res.result.records
              records.forEach(record => {
                if (record.pid === '0') {
                  // 根节点：编码和标题使用项目信息
                  record.code = this.currentProjectInfo.equipmentCode || record.code
                  record.title = this.currentProjectInfo.projectName || record.title
                }
              })

              this.dataSource = records
              // 自动展开根节点
              return this.autoExpandToLevel2(this.dataSource)
            }else{
              // 数据为空时，自动创建根节点
              this.autoCreateRootNode()
            }
          }else{
            this.$message.warning(res.message)
          }
        }).finally(()=>{
          this.loading = false
          this.isLoadingData = false  // ✅ 释放锁
        })
      },
      // 根据已展开的行查询数据（用于保存后刷新时异步加载子级的数据）
      loadDataByExpandedRows(dataList) {
        if (this.expandedRowKeys.length > 0) {
          // 添加项目ID参数
          return getAction(this.url.getChildListBatch, {
            parentIds: this.expandedRowKeys.join(','),
            projectId: this.currentProjectId
          }).then(res=>{
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
        if(arg){
          param = Object.assign(sqp, this.isorter ,this.filters);
        }else{
          param = Object.assign(sqp, this.queryParam, this.isorter ,this.filters);
        }
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
        this.queryParam = {}
        this.loadData(1);
      },
      getDataByResult(result, addPlaceholder = true){
        if(result){
          return result.map(item=>{
            //判断是否标记了带有子节点
            if(addPlaceholder && item[this.hasChildrenField]=='1'){
              let loadChild = {
                id: item.id+'_loadChild',
                code: 'loading...',
                title: '加载中...',
                isLoading: true
              }
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
            let params = this.getQueryParams(1);//查询条件
            params[this.pidField] = record.id
            params.hasQuery = 'false'
            params.superQueryParams=""
            // 添加项目ID过滤条件
            params.projectId = this.currentProjectId
            getAction(this.url.childList,params).then((res)=>{
              if(res.success){
                if(res.result.records){
                  // ✅ 不添加占位符，使用Vue.set确保响应式
                  const children = res.result.records.map(child => {
                    if(child[this.hasChildrenField] === '1') {
                      return {
                        ...child,
                        children: [{
                          id: child.id + '_loadChild',
                          code: 'loading...',
                          title: '加载中...',
                          isLoading: true
                        }]
                      }
                    }
                    return child
                  })
                  this.$set(record, 'children', children)
                }else{
                  record.children=''
                  record[this.hasChildrenField]='0'
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
      handleAdd(){
        // 检查是否有当前项目信息
        if (!this.currentProjectInfo) {
          this.$message.warning('请先打开一个项目！')
          return
        }

        // 传递当前项目信息到Modal作为根节点默认值
        let obj = {
          pid: '0',
          projectId: this.currentProjectId,
          code: this.currentProjectInfo.equipmentCode || '',
          title: this.currentProjectInfo.projectName || '',
          seq: ''
        }
        this.$refs.modalForm.add(obj);
        this.$refs.modalForm.title = "新增";
      },
      handleAddChild(record){
        // 检查层级限制（根节点=0级，最多到7级）
        let currentLevel = this.getNodeLevel(record)
        console.log('点击添加下级:', {
          record: record,
          path: record.path,
          code: record.code,
          calculatedLevel: currentLevel
        })

        if(currentLevel >= 7) {
          this.$message.warning('已达到最大层级（7级），不能继续添加下级节点！')
          return
        }
        this.loadParent = true
        let obj = {}
        obj[this.pidField] = record['id']
        obj.projectId = this.currentProjectId
        obj.parentLevel = currentLevel // 传递父节点层级
        console.log('传递给模态框的数据:', obj)
        this.$refs.modalForm.add(obj);
      },
      /**
       * 添加平级节点
       */
      handleAddSibling(record){
        // 检查是否为根节点
        if(record.pid === '0') {
          this.$message.warning('根节点不能添加平级节点！')
          return
        }

        // 检查层级限制（与当前节点同级）
        let currentLevel = this.getNodeLevel(record)
        console.log('点击添加平级:', {
          record: record,
          path: record.path,
          code: record.code,
          calculatedLevel: currentLevel
        })

        if(currentLevel >= 7) {
          this.$message.warning('已达到最大层级（7级），不能继续添加节点！')
          return
        }

        this.loadParent = true
        let obj = {}
        // ✅ 关键：使用当前节点的父节点作为新节点的父节点
        obj[this.pidField] = record.pid
        obj.projectId = this.currentProjectId
        // ✅ 传递当前节点的层级（平级节点层级相同）
        obj.parentLevel = currentLevel - 1 // 父节点层级 = 当前层级 - 1
        console.log('传递给模态框的数据（添加平级）:', obj)
        this.$refs.modalForm.add(obj);
      },
      // 根据节点的level字段或path计算层级（根节点=0级，A=1级，00=2级，以此类推）
      getNodeLevel(record) {
        // ✅ 优先使用后端返回的 level 字段
        if (record && record.level !== undefined && record.level !== null) {
          console.log('[getNodeLevel] 使用后端返回的层级:', record.level, 'path:', record.path)
          return record.level
        }

        if (!record || !record.path) {
          return 0
        }

        // ✅ path格式固定8段：装备编码-A-00-0-0-00-00-A
        // 模板（第2-8段）：A, 00, 0, 0, 00, 00, A
        // 层级 = 最后一个与模板不同的段的位置（1-7）
        const segments = record.path.split('-')
        if (segments.length !== 8) {
          console.warn('[getNodeLevel] path段数不是8，path:', record.path)
          return 0
        }

        const template = ['A', '00', '0', '0', '00', '00', 'A']
        let level = 0
        for (let i = 1; i <= 7; i++) {
          if (segments[i] !== template[i - 1]) {
            level = i
          }
        }

        console.log('[getNodeLevel] path:', record.path, '→ level:', level)
        return level
      },
      handleDeleteNode(id) {
        if(!this.url.delete){
          this.$message.error("请设置url.delete属性!")
          return
        }
        var that = this;

        // 删除前检查（是否被DM/ICN引用，是否有子节点）
        getAction(that.url.checkDelete, {id: id}).then((checkRes) => {
          if (!checkRes.success) {
            // 检查失败，显示错误信息
            that.$message.error(checkRes.message);
            return;
          }

          // 检查通过，执行删除
          deleteAction(that.url.delete, {id: id}).then((res) => {
            if (res.success) {
              that.$message.success('删除成功');
              that.loadData(1)
            } else {
              that.$message.warning(res.message);
            }
          });
        }).catch((err) => {
          that.$message.error('删除检查失败：' + (err.message || '未知错误'));
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
      getSuperFieldList(){
        let fieldList=[];
        fieldList.push({type:'string',value:'code',text:'编码',dictCode:''})
        fieldList.push({type:'string',value:'title',text:'技术名称',dictCode:''})
        fieldList.push({type:'string',value:'seq',text:'序号',dictCode:''})
        fieldList.push({type:'string',value:'path',text:'路径',dictCode:''})
        fieldList.push({type:'int',value:'security',text:'密级',dictCode:'security'})
        this.superFieldList = fieldList
      },
      // 自动展开到二级节点（使用批量加载优化性能）
      autoExpandToLevel2(dataList) {
        if(!dataList || dataList.length === 0) {
          return Promise.resolve()
        }

        // 收集所有需要展开的根节点ID
        const firstLevelIds = []
        dataList.forEach(rootNode => {
          if(rootNode[this.hasChildrenField] === '1') {
            firstLevelIds.push(rootNode.id)
          }
        })

        if(firstLevelIds.length === 0) {
          return Promise.resolve()
        }

        // 步骤1: 批量加载第一层子节点
        return getAction(this.url.getChildListBatch, {
          parentIds: firstLevelIds.join(','),
          projectId: this.currentProjectId
        }).then(res => {
          if(res.success && res.result.records && res.result.records.length > 0) {
            const firstLevelChildren = res.result.records

            // 收集第一层子节点中有子节点的ID（用于加载第二层）
            const secondLevelParentIds = []
            firstLevelChildren.forEach(child => {
              if(child[this.hasChildrenField] === '1') {
                secondLevelParentIds.push(child.id)
              }
            })

            // 步骤2: 如果有需要展开的第一层节点，批量加载第二层子节点
            const loadSecondLevelPromise = secondLevelParentIds.length > 0
              ? getAction(this.url.getChildListBatch, {
                  parentIds: secondLevelParentIds.join(','),
                  projectId: this.currentProjectId
                })
              : Promise.resolve({ success: false })

            return loadSecondLevelPromise.then(secondLevelRes => {
              // 将第一层子节点按父ID分组
              const firstLevelMap = new Map()
              firstLevelChildren.forEach(child => {
                const pid = child[this.pidField]
                if(!firstLevelMap.has(pid)) {
                  firstLevelMap.set(pid, [])
                }
                firstLevelMap.get(pid).push(child)
              })

              // 将第二层子节点按父ID分组
              const secondLevelMap = new Map()
              if(secondLevelRes.success && secondLevelRes.result.records) {
                secondLevelRes.result.records.forEach(grandChild => {
                  const pid = grandChild[this.pidField]
                  if(!secondLevelMap.has(pid)) {
                    secondLevelMap.set(pid, [])
                  }
                  secondLevelMap.get(pid).push(grandChild)
                })
              }

              // 步骤3: 构建完整的树结构
              const newDataSource = dataList.map(rootNode => {
                if(firstLevelMap.has(rootNode.id)) {
                  // 处理第一层子节点
                  const children = firstLevelMap.get(rootNode.id).map(child => {
                    const newChild = { ...child }

                    // 如果该第一层节点有第二层子节点
                    if(secondLevelMap.has(child.id)) {
                      // 设置第二层子节点
                      newChild.children = secondLevelMap.get(child.id).map(grandChild => {
                        const newGrandChild = { ...grandChild }

                        // 如果第二层节点还有子节点，添加占位符
                        if(grandChild[this.hasChildrenField] === '1') {
                          newGrandChild.children = [{
                            id: grandChild.id + '_loadChild',
                            code: 'loading...',
                            title: '加载中...',
                            isLoading: true
                          }]
                        }

                        return newGrandChild
                      })

                      // ✅ 标记该第一层节点为展开（显示第二层）
                      this.expandedRowKeys.push(child.id)
                    } else if(child[this.hasChildrenField] === '1') {
                      // 第一层节点有子节点但未加载第二层，添加占位符
                      newChild.children = [{
                        id: child.id + '_loadChild',
                        code: 'loading...',
                        title: '加载中...',
                        isLoading: true
                      }]
                    }

                    return newChild
                  })

                  // ✅ 标记根节点为展开（显示第一层）
                  this.expandedRowKeys.push(rootNode.id)

                  return {
                    ...rootNode,
                    children: children
                  }
                }
                return rootNode
              })

              // 一次性赋值，替换整个dataSource
              this.dataSource = newDataSource
            })
          }
        }).catch(err => {
          console.error('批量加载子节点失败:', err)
          return Promise.resolve()
        })
      },
      // 为展开节点加载子节点数据
      loadChildrenForExpand(record) {
        let params = this.getQueryParams()
        params[this.pidField] = record.id
        params.hasQuery = 'false'
        params.superQueryParams = ""
        // 添加项目ID参数，防止查询所有项目的数据
        params.projectId = this.currentProjectId
        return getAction(this.url.childList, params).then((res) => {
          if(res.success) {
            if(res.result.records) {
              // ✅ 处理子节点并添加占位符
              const children = res.result.records.map(child => {
                if(child[this.hasChildrenField] === '1') {
                  return {
                    ...child,
                    children: [{
                      id: child.id + '_loadChild',
                      code: 'loading...',
                      title: '加载中...',
                      isLoading: true
                    }]
                  }
                }
                return child
              })
              // ✅ 使用Vue.set避免触发完整更新
              this.$set(record, 'children', children)
            } else {
              record.children = ''
              record[this.hasChildrenField] = '0'
            }
          }
        })
      },
      // 自动创建根节点
      autoCreateRootNode() {
        if (!this.currentProjectInfo) {
          this.$message.warning('请先打开一个项目！')
          this.ipagination.total = 0
          this.dataSource = []
          return
        }

        console.log('开始创建根节点,项目信息：', this.currentProjectInfo)

        let rootNode = {
          pid: '0',
          projectId: this.currentProjectId,
          code: this.currentProjectInfo.equipmentCode || '',  // 使用完整的装备编码
          title: this.currentProjectInfo.projectName || '',  // 使用项目名称
          seq: null,  // 序号为空
          hasChild: '0',
          security: 1  // 默认密级
        }

        console.log('准备发送的根节点数据：', rootNode)

        postAction(this.url.add, rootNode).then(res => {
          console.log('创建根节点响应：', res)
          if(res.success) {
            this.$message.success('根节点自动创建成功')
            // 重新加载数据
            this.loadData(1)
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
      // 批量生成路径
      handleBatchGeneratePaths() {
        if (!this.currentProjectId) {
          this.$message.warning('请先打开一个项目！')
          return
        }

        const that = this
        this.$confirm({
          title: '批量生成路径',
          content: '此操作将为该项目下所有构型节点重新生成路径，是否继续？',
          okText: '确定',
          cancelText: '取消',
          onOk() {
            that.loading = true
            // 使用URL参数传递projectId
            postAction(that.url.batchGeneratePaths + '?projectId=' + that.currentProjectId).then(res => {
              if (res.success) {
                that.$message.success(res.message || '批量生成路径成功')
                // 刷新列表
                that.loadData(1)
              } else {
                that.$message.error(res.message || '批量生成路径失败')
              }
            }).catch(err => {
              console.error('批量生成路径异常：', err)
              that.$message.error('批量生成路径异常：' + (err.message || '未知错误'))
            }).finally(() => {
              that.loading = false
            })
          }
        })
      },

      /**
       * 从模板导入
       */
      handleTemplateImport() {
        if (!this.currentProjectId) {
          this.$message.warning('请先打开一个项目！')
          return
        }

        // 检查项目是否为空（只有根节点）
        if (this.dataSource && this.dataSource.length > 1) {
          this.$confirm({
            title: '警告',
            content: '从模板导入会覆盖现有构型数据（除根节点外），是否继续？',
            okText: '确定',
            cancelText: '取消',
            onOk: () => {
              const ietmStandard = this.currentProjectInfo ? this.currentProjectInfo.ietmStandard : ''
              this.$refs.templateImportModal.show(this.currentProjectId, ietmStandard)
            }
          })
        } else {
          const ietmStandard = this.currentProjectInfo ? this.currentProjectInfo.ietmStandard : ''
          this.$refs.templateImportModal.show(this.currentProjectId, ietmStandard)
        }
      },

      /**
       * 从Excel导入
       */
      handleExcelImport() {
        if (!this.currentProjectId) {
          this.$message.warning('请先打开一个项目！')
          return
        }

        // 打开Excel导入对话框
        this.$refs.excelImportModal.show()
      }
    }
  }

</script>
<style scoped>
  @import '~@assets/less/common.less';
</style>