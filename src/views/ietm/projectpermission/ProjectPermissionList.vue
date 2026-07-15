<template>
  <a-row type="flex" :gutter="16">
    <a-col :md="24">
      <div style="text-align: center;background-color: #ffffff;padding: 10px;border-bottom: 1px solid #d0d0d0;">
        【授权类型】
        <a-radio-group v-model="permissionType" @change="permissionTypeChange">
          <a-radio :value="0">不限制</a-radio>
          <a-radio :value="1">项目按用户授权</a-radio>
          <a-radio :value="2">构型按用户授权</a-radio>
        </a-radio-group>
      </div>
    </a-col>
    <a-col :md="5" :sm="24">
      <a-card v-if="leftDataSource.length > 0" :loading="cardLoading" :bordered="false" style="height: 100%;">
        <a-select v-if="permissionType == 2" v-model="selectedProjectId" @change="queryLeftData" style="width:200px;">
          <template v-for="(item, index) of projectSource">
            <a-select-option :value="item.id">{{item.title}}</a-select-option>
          </template>
        </a-select>
        <a-spin :spinning="loading">
          <a-tree
            showLine
            checkStrictly
            :expandedKeys.sync="expandedKeys"
            :selectedKeys="selectedKeys"
            :dropdownStyle="{maxHeight:'200px',overflow:'auto'}"
            :treeData="leftDataSource"
            @select="handleTreeSelect"
          />
        </a-spin>
      </a-card>
      <a-card v-else :bordered="false" style="height: 100%;">
        <div class="no-data"><a-icon type="frown-o"/>暂无数据</div>
      </a-card>
    </a-col>
    <a-col :md="24-5" :sm="24">
      <permission-user-right ref="userRight" :target-id="currentTargetId" :permission-type="permissionType"></permission-user-right>
    </a-col>
  </a-row>
</template>

<script>
  import {getAction} from '@/api/manage'
  import PermissionUserRight from './modules/PermissionUserRight'

  export default {
    name: 'ProjectPermissionList',
    components: { PermissionUserRight  },
    data() {
      return {
        description: '项目授权页面',
        currentTargetId: '',
        selectedProjectId: '',
        cardLoading: true,
        loading: false,
        permissionType: 1, //授权类型
        leftDataSource: [],
        projectSource: [], //项目数据
        selectedKeys: [],
        expandedKeys: [],
        //-----------------
        url:{
          projectListUrl: '/projectpermission/projectPermission/listProject',
          projectGxListUrl: '/projectconfigurationmanagement/ietmProjectConfigurationManagement/getTreeList',
        }
      }
    },
    created() {
      this.queryLeftData()
    },
    methods: {
      queryLeftData() {
        this.loading = true;
        const url = this.permissionType==1 ? this.url.projectListUrl : this.url.projectGxListUrl;
        if(this.permissionType == 1 && this.projectSource.length > 0){
          this.leftDataSource = this.projectSource;
          this.loading = false;
          return;
        }
        const params = {};
        if(this.selectedProjectId){
          params.projectId = this.selectedProjectId;
        }
        getAction(url, params).then(res => {
          if(res.success){
            this.leftDataSource = res.result;
            if(this.permissionType==1){ //保存项目列表数据
              this.projectSource = res.result;
            }else{
              this.expandedKeys = this.getExpandKeysByLevel(this.leftDataSource, 2, 1);
            }
          }else{
            this.$message.error(res.message);
          }
        }).finally(() => {
          this.loading = false
          this.cardLoading = false
        })
      },
      handleTreeSelect(selectedKeys, event) {
        if (selectedKeys.length > 0) {
          if(this.selectedKeys[0] !== selectedKeys[0]){
            this.selectedKeys = [selectedKeys[0]]
            this.currentTargetId = event.node.dataRef.id
            // this.loadRightData(this.currentTargetId);
          }
        }else{
          this.selectedKeys = []
          this.currentTargetId = '';
          this.loadRightData("");
        }
      },
      loadRightData(targetId){
        this.$refs.userRight.loadData(1, targetId);;
      },
      //授权类型改变
      permissionTypeChange(){
        if(this.permissionType == 0){
          this.leftDataSource = [];
        } else if(this.permissionType === 1){ //项目按用户授权
          //查找项目列表
          this.queryLeftData();
        }else if(this.permissionType === 2){ //构型按用户授权
          if(this.projectSource.length > 0){
            this.selectedProjectId = this.projectSource[0].id;
            //查找项目构型列表
            this.queryLeftData();
          }
        }
        this.currentTargetId = '';
      },
      //树节点默认展开层级
      getExpandKeysByLevel(treeData, maxLevel, currentLevel = 1){
        let keys = [];
        if(currentLevel > maxLevel) return keys;
        treeData.forEach(node => {
          keys.push(node.key);
          if(node.children && node.children.length > 0){
            keys = keys.concat(
              this.getExpandKeysByLevel(node.children, maxLevel, currentLevel + 1)
            );
          }
        })
        return keys;
      }

    }
  }
</script>
<style scoped>
  @import '~@assets/less/common.less';
  .no-data {
    color: rgba(0, 0, 0, .25);
    text-align: center;
    line-height: 64px;
    font-size: 16px;

  i {
    font-size: 24px;
    margin-right: 16px;
    position: relative;
    top: 3px;
  }
  }
</style>