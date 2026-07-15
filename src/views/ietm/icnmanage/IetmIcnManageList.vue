<template>
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
            <a-tooltip title="计算所有DM的引用信息" >
              <a-button icon="calculator" @click="">计算</a-button>
            </a-tooltip>
            <a-tooltip title="删除预览时形成的文件缓存" >
              <a-button icon="delete" @click="">清除</a-button>
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
      <a-card>
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
      <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button>
      <a-button @click="" type="primary" icon="plus">批量新增</a-button>
      <a-button @click="relatedFilesAdd" type="primary" icon="upload">相关文件上传</a-button>
      <a-button @click="diffFilesAdd" type="primary" icon="upload">差异上传</a-button>
      <a-button @click="newFilesAdd" type="primary" icon="upload">新版上传</a-button>
      <a-button @click="deleteIcn" type="primary" icon="delete">删除</a-button>
      <a-button @click="viewFile" type="primary" icon="eye">浏览</a-button>
      <a-button @click="" type="primary" icon="paper-clip">引用</a-button>
      <a-button @click="" type="primary" icon="cloud-download">下载</a-button>
      <a-upload name="file" :showUploadList="false" :multiple="false" :headers="tokenHeader"  :action="importExcelUrl" @change="handleImportExcel">
        <a-button type="primary" icon="import">导入</a-button>
      </a-upload>
      <!-- 高级查询区域 -->
      <j-super-query :fieldList="superFieldList" ref="superQueryModal" @handleSuperQuery="handleSuperQuery"></j-super-query>
<!--      <a-dropdown v-if="selectedRowKeys.length > 0">-->
<!--        <a-menu slot="overlay">-->
<!--          <a-menu-item key="1" @click="batchDel"><a-icon type="delete"/>删除</a-menu-item>-->
<!--        </a-menu>-->
<!--        <a-button style="margin-left: 8px"> 批量操作 <a-icon type="down" /></a-button>-->
<!--      </a-dropdown>-->
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
        :rowSelection="{selectedRowKeys: selectedRowKeys, onChange: onSelectChange ,type:'radio'}"
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
          <a @click="handleIcnInfo(record)">
            {{ record.icn}}</a>
        </span>

      </a-table>

    </div>
      </a-card>
    </div>
    <icn-info-modal ref="infoForm" @ok="modalFormOk"></icn-info-modal>
    <ietm-icn-manage-modal ref="modalForm" @ok="modalFormOk"></ietm-icn-manage-modal>
    <icn-upload-modal ref="uploadForm" @ok="modalFormOk"></icn-upload-modal>
    <play-video ref="videoRef" :model=this.selectionRows[0]></play-video>
    <play-audio ref="audioRef" :model=this.selectionRows[0]></play-audio>
    <play-img  ref="imgRef" :model=this.selectionRows[0]></play-img>
  </div>
</template>
<script>
  import '@/assets/less/TableExpand.less'
  import { mixinDevice } from '@/utils/mixin'
  import { JeecgListMixin } from '@/mixins/JeecgListMixin'
  import IetmIcnManageModal from './modules/IetmIcnManageModal'
  import { getAction, httpAction } from '@api/manage'
  import { filterObj } from '@/utils/util'

  import PlayVideo from '@views/ietm/playertool/playVideo.vue'
  import PlayAudio from '@views/ietm/playertool/playAudio.vue'
  import PlayImg from '@views/ietm/playertool/playImg.vue'
  import IcnUploadModal from '@views/ietm/icnmanage/modules/IcnUploadModal.vue'
  import IcnInfoModal from '@views/ietm/icnmanage/modules/IcnInfoModal.vue'
  export default {
    name: 'IetmIcnManageList',
    mixins:[JeecgListMixin, mixinDevice],
    components: {
      IcnUploadModal,
      PlayImg,
      PlayAudio,
      PlayVideo,
      IetmIcnManageModal,
      IcnInfoModal
    },
    data () {
      return {
        description: '项目管理-项目实体管理管理页面',
        projectId: '',
        autoExpandParent: true,
        iExpandedKeys: [],
        selectedKeys: [],
        treeSelectKey:"",
        treeData: [],
        allTreeKeys: [],
        width: 1200,
        dataSource: [],
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
            title:'ICN',
            align:"center",
            dataIndex: 'icn',
            scopedSlots: { customRender: 'action' }
          },
          {
            title:'文件名称',
            align:"center",
            dataIndex: 'ietmAttachment.fileName',
          },
          {
            title:'版本号',
            align:"center",
            dataIndex: 'issueNo'
          },
          {
            title:'密级',
            align:"center",
            dataIndex: 'security_dictText'
          },
          {
            title:'文件大小',
            align:"center",
            dataIndex: 'ietmAttachment.fileSize',
            customRender:function (t,r,index) {
              if (t)
              return t+"KB";
            }
          },
          {
            title: '创建日期',
            align: "center",
            dataIndex: 'createTime'
          },
          {
            title: '创建人',
            align: "center",
            dataIndex: 'createBy'
          },
          // {
          //   title: '操作',
          //   dataIndex: 'action',
          //   align:"center",
          //   fixed:"right",
          //   width:147,
          //   scopedSlots: { customRender: 'action' }
          // }
        ],
        url: {
          list: "/icnmanage/ietmIcnManage/list",
          delete: "/icnmanage/ietmIcnManage/delete",
          deleteBatch: "/icnmanage/ietmIcnManage/deleteBatch",
          exportXlsUrl: "/icnmanage/ietmIcnManage/exportXls",
          importExcelUrl: "icnmanage/ietmIcnManage/importExcel",

        },
        dictOptions:{},
        superFieldList:[],
      }
    },
    created() {
    this.getSuperFieldList();
    },
    mounted() {
      this.loadTree()
    },
    computed: {
      importExcelUrl: function(){
        return `${window._CONFIG['domianURL']}/${this.url.importExcelUrl}`;
      },
    },
    methods: {
      deleteIcn(){
        if (this.selectionRows.length!=1){
          this.$message.warning("请选择一条ICN数据!")
          return
        }
        this.$confirm({
          content: '是否确认删除？',
          onOk: () => {
            var icnModel = this.selectionRows[0];
            this.handleDelete(icnModel.id)
          },
        })
      },
      relatedFilesAdd(){
        if (this.selectionRows.length!=1){
          this.$message.warning("请选择一条ICN数据!")
          return
        }
        var icnModel = this.selectionRows[0];
        this.$refs.uploadForm.add(icnModel,"related");
        this.$refs.uploadForm.title = "相关文件上传";
        this.$refs.uploadForm.tips = "【相关文件】：对应实体文件的相关文件，例如wrl的interactivity文件";
        this.$refs.uploadForm.disableSubmit = false;
      },

      diffFilesAdd(){
        if (this.selectionRows.length!=1){
          this.$message.warning("请选择一条ICN数据!")
          return
        }
        this.$confirm({
          content: '差异上传时将保留原ICN文件，并将原ICN文件的差异码升级并重新上传文件，是否确认？',
          onOk: () => {
            var icnModel = this.selectionRows[0];
            this.$refs.uploadForm.add(icnModel,"diff");
            this.$refs.uploadForm.title = "差异上传";
            this.$refs.uploadForm.tips = "【差异上传】：保留原ICN文件，并将原ICN文件的差异码升级并重新上传文件";
            this.$refs.uploadForm.disableSubmit = false;
          },
        })
      },
      newFilesAdd(){
        if (this.selectionRows.length!=1){
          this.$message.warning("请选择一条ICN数据!")
          return
        }
        this.$confirm({
          content: '新版上传时将删除原ICN文件并重新上传文件，是否确认？',
          onOk: () => {
            var icnModel = this.selectionRows[0];
            this.$refs.uploadForm.add(icnModel,"new");
            this.$refs.uploadForm.title = "差异上传";
            this.$refs.uploadForm.tips = "【新版上传】：删除原ICN文件并重新上传文件";
            this.$refs.uploadForm.disableSubmit = false;
          },
        })
      },

      handleIcnInfo(record){
        this.$refs.infoForm.edit(record);
        this.$refs.infoForm.title = "详情";
        this.$refs.infoForm.disableSubmit = true;
      },

      viewFile(){
       if (this.selectionRows.length!=1){
         this.$message.warning("请选择一条需要浏览的数据!")
         return
       }
       var model = this.selectionRows[0].ietmAttachment;
       if(model.fileName.includes(".mp4")){
         this.$refs.videoRef.show()
       }
       else if(model.fileName.includes(".mp3")){
          this.$refs.audioRef.show()
        }
        else {
          this.$refs.imgRef.show()
        }
      },
      loadData(arg) {
        if (!this.url.list) {
          this.$message.error("请设置url.list属性!")
          return
        }
        if(!this.treeSelectKey){
          return
        }
        //加载数据 若传入参数1则加载第一页的内容
        if (arg === 1) {
          this.ipagination.current = 1;
        }
        var params = this.getQueryParams();//查询条件
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
        })
      },
      handleAdd(){
        if(!this.treeSelectKey || this.treeSelectKey=="0"){
          this.$message.warning('请选择除根节点之外的节点。');
          return
        }
        this.$refs.modalForm.add(this.treeSelectKey);
        this.$refs.modalForm.title = "新增";
        this.$refs.modalForm.disableSubmit = false;
      },
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
          this.selectedKeys = selectedKeys;
          this.treeSelectKey=selectedKeys[0]
          this.loadData()
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
        param.cmnodeId = this.treeSelectKey
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
      },

      initDictConfig(){
      },
      getSuperFieldList(){
        let fieldList=[];
        fieldList.push({type:'string',value:'icn',text:'ICN',dictCode:''})
        fieldList.push({type:'string',value:'fileName',text:'文件名称',dictCode:''})
        fieldList.push({type:'string',value:'versionNo',text:'版本号',dictCode:''})
        fieldList.push({type:'int',value:'security',text:'密级',dictCode:'security'})
        fieldList.push({type:'string',value:'fileSize',text:'文件大小',dictCode:''})
        this.superFieldList = fieldList
      }
    }
  }
</script>
<style scoped lang="less">
  @import '~@assets/less/common.less';
  .container{
    display: flex;
    flex-direction: row;
    height: calc(100vh - 150px);
    width: 100%;
    .left-content{
      min-width: 450px;
      width: 20%;
      background-color: white;
    }
    .right-content{
      flex: auto;
    }
  }

  /deep/ .ant-tree{
    max-height: calc(100% - 90px);
    overflow-y: scroll;
    overflow-x: scroll;
  }
  .table-operator{
    display: flex;
    flex-direction: row;
  }

  .ant-divider-horizontal {
    margin: 0;
  }
</style>