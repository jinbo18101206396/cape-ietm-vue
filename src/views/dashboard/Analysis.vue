<template>
  <div class="dashboard-container">
    <a-row :gutter="12" style="margin-bottom: 12px;">
      <a-col :xl="12" :lg="12" :md="24" :sm="24" :xs="24">
        <a-card class="dashboard-card">
          <div slot="title">
            <a-icon type="folder" style="margin-right: 8px;" />
            手册项目
          </div>
          <project-list class="card-content-fixed-five"></project-list>
        </a-card>
      </a-col>
      <a-col :xl="12" :lg="12" :md="24" :sm="24" :xs="24">
        <a-card class="dashboard-card">
          <div slot="title">
            <a-icon type="check-circle" style="margin-right: 8px;" />
            我的待办
          </div>
          <todo-list class="card-content-fixed-five"></todo-list>
        </a-card>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :xl="12" :lg="12" :md="24" :sm="24" :xs="24">
        <a-card class="dashboard-card">
          <div slot="title">
            <a-icon type="database" style="margin-right: 8px;" />
            数据模块
          </div>
          <data-module-list class="card-content-fixed-six"></data-module-list>
        </a-card>
      </a-col>
      <a-col :xl="12" :lg="12" :md="24" :sm="24" :xs="24">
        <a-card class="dashboard-card">
          <div slot="title">
            <a-icon type="file-text" style="margin-right: 8px;" />
            项目实体
          </div>
          <icn-list class="card-content-fixed-six"></icn-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import '@/assets/less/TableExpand.less'
import { mixinDevice } from '@/utils/mixin'
import { deleteAction, getAction } from '@api/manage'
import ProjectList from '@views/ietm/dashboard/ProjectList.vue'
import TodoList from '@views/ietm/dashboard/TodoList.vue'
import DataModuleList from '@views/ietm/dashboard/DataModuleList.vue'
import IcnList from '@views/ietm/dashboard/IcnList.vue'

export default {
  name: 'Analysis',
  mixins: [mixinDevice],
  components: {
    ProjectList,
    TodoList,
    DataModuleList,
    IcnList
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

.dashboard-container {
  background: #f0f2f5;
  min-height: calc(100vh - 130px);
}

.dashboard-card {
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid #e8e8e8;
  background: #FFFFFF;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

// 动态高度：根据视口计算
.card-content-fixed {
  height: calc((100vh - 250px) / 2);
  min-height: 350px;
  max-height: 500px;
  overflow: auto;
}

// 固定五行高度：用于手册项目和我的待办
.card-content-fixed-five {
  height: 342px;  /* 表头41px + 6行数据(6 × 49px) + 上边框1px + 底部余量2px */
  overflow: auto;
}

// 固定六行高度：用于数据模块和项目实体
.card-content-fixed-six {
  height: 391px;  /* 表头41px + 7行数据(7 × 49px) + 上边框1px + 底部余量2px */
  overflow: auto;
}

/deep/ .ant-card-head {
  min-height: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: 1px solid #e8e8e8;
  background: #FBF9F5;
  border-radius: 4px 4px 0 0;

  .ant-card-head-title {
    padding: 12px 0;
    font-size: 16px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.85);
  }
}

/deep/ .ant-card-body {
  padding: 0;
}

/deep/ .ant-table-thead > tr > th {
  padding: 12px 16px !important;
  border-right: none !important;
  height: auto !important;
  background: #fafafa !important;
  border-bottom: 1px solid #e8e8e8 !important;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

/deep/ .ant-table-tbody .ant-table-row td {
  padding: 12px 16px !important;
  border-right: none !important;
  border-bottom: 1px solid #e8e8e8 !important;
  color: rgba(0, 0, 0, 0.65);
  vertical-align: middle;
}

/deep/ .ant-table-tbody .ant-table-row:hover td {
  background: #e6f7ff !important;
}

/deep/ .ant-table-bordered .ant-table-thead > tr > th,
/deep/ .ant-table-bordered .ant-table-tbody > tr > td {
  border-left: none !important;
  border-right: none !important;
}

/deep/ .ant-table {
  border: none !important;
  border-top: 1px solid #e8e8e8 !important;
  border-radius: 0 0 4px 4px;
}

/deep/ .ant-table-bordered {
  border-collapse: collapse !important;
}

/deep/ .ant-table-header {
  margin-bottom: 0 !important;
  padding-bottom: 0 !important;
}

/deep/ .ant-table-placeholder {
  border-bottom: none !important;
}

// 响应式优化：小屏幕时卡片间距调整
@media (max-width: 768px) {
  .card-content-fixed {
    height: 400px;
    min-height: 350px;
    max-height: 450px;
  }
}

</style>
