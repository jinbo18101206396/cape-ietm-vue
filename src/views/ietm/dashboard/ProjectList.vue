<template>
  <div class="project-list-container">
    <!-- 项目列表 -->
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      :row-key="record => record.id"
      :scroll="{ y: scrollY }"
      size="small"
      bordered
    >
      <span slot="security" slot-scope="text">
        <a-tag :color="getSecurityColor(text)">
          {{ getSecurityText(text) }}
        </a-tag>
      </span>

      <span slot="action" slot-scope="text, record">
        <a-button
          v-if="!isCurrentProject(record.id)"
          type="link"
          @click="handleOpenProject(record)"
        >
          打开项目
        </a-button>
        <a-tag v-else color="red">
          <a-icon type="check-circle" /> 当前项目
        </a-tag>
      </span>
      </a-table>
  </div>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import { mixinDevice } from '@/utils/mixin'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import { mapState, mapActions } from 'vuex'

export default {
  name: 'ProjectList',
  mixins: [mixinDevice, JeecgListMixin],
  data() {
    return {
      description: '首页-手册项目列表',
      loading: false,
      dataSource: [],
      scrollY: 0,
      columns: [
        {
          title: '序号',
          dataIndex: 'index',
          width: '8%',
          align: 'center',
          customRender: (text, record, index) => index + 1
        },
        {
          title: '项目名称',
          dataIndex: 'name',
          width: '30%',
          align: 'center'
        },
        {
          title: '装备编码',
          dataIndex: 'equipmentCode',
          width: '20%',
          align: 'center'
        },
        {
          title: 'IETM标准',
          dataIndex: 'ietmStandard',
          width: '15%',
          align: 'center'
        },
        {
          title: '密级',
          dataIndex: 'security',
          width: '12%',
          align: 'center',
          scopedSlots: { customRender: 'security' }
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: '15%',
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      ],
      securityDict: {
        1: { text: '公开', color: 'green' },
        2: { text: '内部', color: 'blue' },
        3: { text: '秘密', color: 'orange' },
        4: { text: '机密', color: 'red' }
      }
    }
  },
  computed: {
    ...mapState({
      currentProject: state => state.project.currentProject
    })
  },
  created() {
    this.loadData()
    this.LoadCurrentProject()
  },
  mounted() {
    this.calcScrollHeight()
    window.addEventListener('resize', this.calcScrollHeight)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.calcScrollHeight)
  },
  methods: {
    ...mapActions(['LoadCurrentProject', 'OpenProject']),
    calcScrollHeight() {
      this.$nextTick(() => {
        const container = this.$el
        if (container) {
          // 计算可用高度：容器高度减去表头高度和上下padding
          const containerHeight = container.clientHeight
          // 减去上下padding(24px)和表头高度(约41px)
          this.scrollY = containerHeight - 24 - 41
        }
      })
    },

    getSecurityText(value) {
      return this.securityDict[value] ? this.securityDict[value].text : '未知'
    },

    getSecurityColor(value) {
      return this.securityDict[value] ? this.securityDict[value].color : 'default'
    },

    isCurrentProject(projectId) {
      return this.currentProject && this.currentProject.projectId === projectId
    },

    loadData() {
      this.loading = true
      getAction('/ietmproject/ietmProject/listData', {})
        .then(res => {
          if (res.success) {
            this.dataSource = res.result || []
          } else {
            this.$message.error(res.message || '加载项目列表失败')
          }
        })
        .catch(error => {
          console.error('加载项目列表失败:', error)
          this.$message.error('加载项目列表失败')
        })
        .finally(() => {
          this.loading = false
        })
    },

    handleOpenProject(record) {
      const that = this
      this.$confirm({
        title: '确认打开项目',
        content: `打开新的手册项目将关闭所有功能页签，是否确认打开【${record.name}】？`,
        okText: '确认',
        cancelText: '取消',
        onOk() {
          that.OpenProject(record)
            .then(result => {
              that.$message.success('项目打开成功')
              if (that.$bus) {
                that.$bus.$emit('project-changed', result)
              }
            })
            .catch(error => {
              that.$message.error(error || '打开项目失败')
            })
        }
      })
    }
  }
}
</script>

<style scoped lang="less">
.project-list-container {
  height: 100%;
  padding: 12px;
  overflow: hidden;

  /deep/ .ant-table {
    margin-bottom: 0;
    table-layout: fixed;
  }

  /deep/ .ant-table-thead > tr > th {
    padding: 8px !important;
    background: #fafafa;
    height: auto !important;
    word-break: break-word;
  }

  /deep/ .ant-table-tbody > tr > td {
    padding: 8px !important;
    word-break: break-word;
  }

  // 表头容器
  /deep/ .ant-table-header {
    overflow: hidden !important;
    margin-bottom: 0 !important;
  }

  // 表体容器：隐藏滚动条但保持滚动功能
  /deep/ .ant-table-body {
    overflow-y: scroll !important;
    overflow-x: hidden !important;

    // 隐藏滚动条（兼容多种浏览器）
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */

    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }
  }

  // 确保表头和表体宽度一致
  /deep/ .ant-table-scroll {
    .ant-table-header table,
    .ant-table-body table {
      width: 100% !important;
    }
  }
}
</style>
