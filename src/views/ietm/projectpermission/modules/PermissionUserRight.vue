<template>
  <a-card class="j-address-list-right-card-box" :loading="cardLoading" :bordered="false">
    <div class="table-page-search-wrapper">
      <a-form-model layout="inline" :model="queryParam">
        <a-row :gutter="10">
          <a-col :md="6" :sm="12">
            <a-form-model-item label="姓名" prop="realname" style="margin-left:8px">
              <a-input placeholder="请输入姓名查询" v-model="queryParam.realname"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :md="6" :sm="12">
            <a-form-model-item label="用户名" prop="username" style="margin-left:8px">
              <a-input placeholder="请输入用户名查询" v-model="queryParam.username"></a-input>
            </a-form-model-item>
          </a-col>

          <span style="float: left;overflow: hidden;" class="table-page-search-submitButtons">
            <a-col :md="6" :sm="24">
              <a-button type="primary" @click="searchQuery" icon="search" style="margin-left: 18px">查询</a-button>
              <a-button type="primary" @click="searchReset" icon="reload" style="margin-left: 8px">重置</a-button>
              <a-button type="primary" @click="handleSelectUser" icon="plus" style="margin-left: 8px">选择用户</a-button>
            </a-col>
          </span>
        </a-row>
      </a-form-model>
    </div>
    <!-- 操作按钮区域 -->
    <div class="table-operator">
      <a-dropdown v-if="selectedRowKeys.length > 0">
        <a-menu slot="overlay">
          <a-menu-item key="1" @click="batchDel"><a-icon type="delete"/>删除</a-menu-item>
        </a-menu>
        <a-button style="margin-left: 8px"> 批量操作 <a-icon type="down" /></a-button>
      </a-dropdown>
    </div>

    <a-table
      ref="table"
      size="middle"
      rowKey="id"
      class="j-table-force-nowrap"
      :scroll="{x:true}"
      bordered
      :pagination="ipagination"
      :columns="columns"
      :dataSource="dataSource"
      :loading="loading"
      :rowSelection="{selectedRowKeys: selectedRowKeys, onChange: onSelectChange}"
      @change="handleTableChange">
    </a-table>

    <j-select-user-by-dep-modal
      ref="selectModal"
      :modal-width="1250"
      :multi="true"
      @ok="selectedUserOK"/>

  </a-card>
</template>

<script>
  import { getAction, deleteAction, postAction } from '@/api/manage'
  import { JeecgListMixin } from '@/mixins/JeecgListMixin'

  import JSelectUserByDepModal from '@/components/jeecgbiz/modal/JSelectUserByDepModal'

  export default {
    name: 'PermissionUserRight',
    mixins: [JeecgListMixin],
    components: {JSelectUserByDepModal},
    props: ['targetId','permissionType'],
    data() {
      return {
        description: '用户信息',
        cardLoading: true,
        userIds: '',
        disableMixinCreated: true,
        columns: [
          {
            title: '序号',
            key: 'rowIndex',
            dataIndex: '',
            width: 60,
            align: 'center',
            customRender: (t, r, i) => parseInt(i) + 1
          },
          {
            title: '姓名',
            width: '20%',
            align: 'center',
            dataIndex: 'realname'
          },
          {
            title: '用户名',
            width: '20%',
            align: 'center',
            dataIndex: 'username'
          },
          {
            title: '部门',
            width: '25%',
            align: 'center',
            dataIndex: 'departName'
          },
          // {
          //   title: '手机号',
          //   width: '12%',
          //   align: 'center',
          //   dataIndex: 'phone'
          // },
        ],
        url: {
          list: '/projectpermission/projectPermission/listUserByTargetId',
          add: '/projectpermission/projectPermission/addUserByTargetId',
          deleteBatch: '/projectpermission/projectPermission/deleteUserByTargetId',
        }
      }
    },
    watch:{
      targetId:{
        handler() {
          this.loadData(1)
        },
      }
    },
    created() {

    },
    methods: {
      loadData(pageNum) {
        this.loading = true
        if (pageNum === 1) {
            this.ipagination.current = 1
        }
        var params = {targetId: this.targetId, ...this.getQueryParams()}
        //加载数据 若传入参数1则加载第一页的内容
        getAction(this.url.list, params).then((res) => {
          if (res.success) {
            this.dataSource = res.result.records
            this.ipagination.total = res.result.total
          }
        }).finally(() => {
          this.loading = false
          this.cardLoading = false
        })
      },
      batchDel(){
        console.log('batchDel....');
        if (this.selectedRowKeys.length <= 0) {
          this.$message.warning('请选择一条记录！');
          return;
        } else {

          var ids = "";
          for (var a = 0; a < this.selectedRowKeys.length; a++) {
            ids += this.selectedRowKeys[a] + ",";
          }
          var that = this;
          this.$confirm({
            title: "确认删除",
            content: "是否删除选中数据?",
            onOk: function () {
              that.loading = true;
              const params = {userIds: ids, targetId: that.targetId};
              deleteAction(that.url.deleteBatch, params).then((res) => {
                if (res.success) {
                  //重新计算分页问题
                  that.reCalculatePage(that.selectedRowKeys.length)
                  that.$message.success(res.message);
                  that.loadData();
                  that.onClearSelected();
                } else {
                  that.$message.warning(res.message);
                }
              }).finally(() => {
                that.loading = false;
              });
            }
          });
        }
      },
      searchQuery() {
        this.loadData(1)
      },
      searchReset() {
        this.queryParam = {}
        this.loadData(1)
      },

      handleTableChange(pagination, filters, sorter) {
        if (Object.keys(sorter).length > 0) {
          this.isorter.column = sorter.field
          this.isorter.order = 'ascend' === sorter.order ? 'asc' : 'desc'
        }
        this.ipagination = pagination
        this.loadData(null, this.value)
      },

      handleSelectUser(){
        if(!this.targetId){
          this.$message.warn("请先选择被授权的对象！");
          return;
        }
        this.$refs.selectModal.showModal()
      },
      selectedUserOK(rows){
        const userIds = rows.map(row => row.id);
        if(!userIds.length > 0){
          this.$message.warn("未选择任何用户！");
          return;
        }
        console.log('permissionType:', this.permissionType);
        const params = {permissionType: this.permissionType, targetId: this.targetId, userIds: userIds.join(",")};
        postAction(this.url.add, params).then((res) => {
          if(res.success){
            this.$message.success("授权成功！");
            this.searchReset();
          }else{
            this.$message.error(res.message);
          }
        })
      },

    }
  }
</script>
<style>
  .j-address-list-right-card-box .ant-table-placeholder {
    min-height: 46px;
  }
</style>
<style scoped>
  .j-address-list-right-card-box {
    height: 100%;
    min-height: 300px;
  }
</style>