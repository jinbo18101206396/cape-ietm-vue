<template>
  <div style="display: flex;height: calc(100vh - 130px);flex-direction: column;">
    <div style="height: 50%">
      <a-row style="height: 100%">
        <a-col :span="12" style="height: 100%">
          <a-card title="手册项目" style="height: 100%; display: flex; flex-direction: column;">
            <project-list style="flex: 1; min-height: 0;"></project-list>
          </a-card>
        </a-col>
        <a-col :span="12" style="height: 100%">
          <a-card title="我的待办" style="height: 100%">
          </a-card>
        </a-col>
      </a-row>
    </div>
    <div style="height: 50%">
      <a-row style="height: 100%">
        <a-col :span="12" style="height: 100%">
          <a-card title="数据模块列表" style="height: 100%">
          </a-card>
        </a-col>
        <a-col :span="12" style="height: 100%">
          <a-card title="数据实体ICN列表" style="height: 100%">
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script>
import '@/assets/less/TableExpand.less'
import { mixinDevice } from '@/utils/mixin'
import { deleteAction, getAction } from '@api/manage'
import ProjectList from '@views/ietm/dashboard/ProjectList.vue'

export default {
  name: 'Analysis',
  mixins: [mixinDevice],
  components: {
    ProjectList
  },
  props: {
  },
  watch: {
  },
  data() {
    return {
      description: '首页',
    }
  },
  created() {
  },
  computed: {
  },
  methods: {
  }
}
</script>
<style lang="less" scoped>
@import '~@assets/less/common.less';
/deep/ .ant-card-head {
  min-height: 35px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  .ant-card-head-title {
    padding: 0 0;
  }
}

/deep/ .ant-card-body {
  padding: 0;
  flex: 1;
  overflow: hidden;
}

/deep/ .ant-table-thead > tr > th {
  padding: 20px 5px !important;
  border-right: 1px solid #e8e8e8 !important;
  height: 60px !important;
}

/deep/ .ant-table-tbody .ant-table-row td {
  padding: 10px 5px !important;
  border-right: 1px solid #e8e8e8 !important;
}

/deep/ .ant-table-bordered .ant-table-thead > tr > th,
/deep/ .ant-table-bordered .ant-table-tbody > tr > td {
  border: 1px solid #e8e8e8 !important;
}

/deep/ .ant-table {
  border: 1px solid #e8e8e8 !important;
}

/deep/ .ant-table-bordered {
  border-collapse: collapse !important;
}

/deep/ .ant-table-header {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}

</style>
