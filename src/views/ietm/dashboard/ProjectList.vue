<template>
  <div class="project-list-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 搜索区域 -->
      <div class="search-wrapper">
        <a-input-group compact>
          <a-select
            v-model="searchField"
            size="small"
            style="width: 110px;"
            placeholder="搜索字段"
            :dropdownMatchSelectWidth="false"
          >
            <a-select-option value="name">
              项目名称
            </a-select-option>
            <a-select-option value="equipmentCode">
              装备编码
            </a-select-option>
            <a-select-option value="ietmStandard">
              IETM标准
            </a-select-option>
          </a-select>
          <a-input-search
            v-model="searchValue"
            placeholder="请输入关键字"
            size="small"
            style="width: 200px;"
            allow-clear
            @search="handleSearch"
            @pressEnter="handleSearch"
          >
          </a-input-search>
        </a-input-group>
      </div>

      <!-- 刷新按钮（右对齐） -->
      <a-button
        size="small"
        icon="reload"
        style="margin-left: auto;"
        :loading="loading"
        @click="handleRefresh"
      >
      </a-button>
    </div>

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
import debounce from 'lodash.debounce'

export default {
  name: 'ProjectList',
  mixins: [mixinDevice, JeecgListMixin],
  data() {
    return {
      description: '首页-手册项目列表',
      loading: false,
      dataSource: [],
      allData: [], // 完整数据（未过滤）
      scrollY: 0,

      // 搜索条件
      searchField: 'name',
      searchValue: '',

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
    // 先加载当前项目状态（不阻塞列表加载）
    this.LoadCurrentProject().catch(err => {
      console.error('加载当前项目失败', err)
      if (process.env.NODE_ENV !== 'production') {
        this.$message.warning('加载当前项目状态失败')
      }
    })
    // 加载项目列表
    this.loadData()
  },
  mounted() {
    this.calcScrollHeight()
    // 使用防抖处理resize事件，避免频繁计算
    this.calcScrollHeightDebounced = debounce(this.calcScrollHeight, 150)
    window.addEventListener('resize', this.calcScrollHeightDebounced)
  },
  beforeDestroy() {
    if (this.calcScrollHeightDebounced) {
      window.removeEventListener('resize', this.calcScrollHeightDebounced)
      this.calcScrollHeightDebounced.cancel() // 取消待执行的防抖
    }
  },
  methods: {
    ...mapActions(['LoadCurrentProject', 'OpenProject']),

    calcScrollHeight() {
      this.$nextTick(() => {
        const container = this.$el
        if (container) {
          // 计算可用高度：容器高度减去工具栏、表头高度和padding
          const containerHeight = container.clientHeight
          // 减去工具栏(约36px)、表头(约41px)和padding(8px)
          this.scrollY = containerHeight - 36 - 41 - 8
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
            this.allData = res.result || []
            this.applySearchFilter()
          } else {
            this.allData = []
            this.dataSource = []
            this.$message.error(res.message || '加载项目列表失败')
          }
        })
        .catch(error => {
          console.error('加载项目列表失败:', error)
          this.allData = []
          this.dataSource = []
          this.$message.error('加载项目列表失败')
        })
        .finally(() => {
          this.loading = false
        })
    },

    /**
     * 应用搜索过滤（本地过滤）
     */
    applySearchFilter() {
      if (!this.searchValue || !this.searchValue.trim()) {
        this.dataSource = this.allData
        return
      }

      const keyword = this.searchValue.trim().toLowerCase()
      const field = this.searchField

      this.dataSource = this.allData.filter(item => {
        const value = item[field]
        if (!value) {
          return false
        }
        return String(value).toLowerCase().includes(keyword)
      })
    },

    handleSearch() {
      this.applySearchFilter()
    },

    /**
     * 处理刷新
     */
    handleRefresh() {
      this.searchValue = ''
      this.searchField = 'name'
      this.loadData()
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
              // 项目状态已由Vuex管理，无需事件总线
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
  padding: 4px;  // 与待办模块一致
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: transparent;

  .toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    padding: 6px 8px;
    background: #fff;
    border-radius: 2px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    flex-shrink: 0;
    gap: 8px;
  }

  .search-wrapper {
    margin-left: 0;

    /deep/ .ant-input-group-compact {
      display: flex;
    }

    /deep/ .ant-select {
      border-right: none;

      .ant-select-selection {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
    }

    /deep/ .ant-input-search {
      .ant-input {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        padding-left: 11px;
      }
    }

    /deep/ .ant-input-affix-wrapper {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }
  }

  /deep/ .ant-table-wrapper {
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    overflow: hidden;
  }

  /deep/ .ant-table {
    margin-bottom: 0;
    table-layout: fixed;
  }

  /deep/ .ant-table-thead > tr > th {
    padding: 12px 16px !important;  // 与待办模块一致
    background: #fafafa;
    border-bottom: 2px solid #e8e8e8;
    height: auto !important;
    word-break: keep-all;
    white-space: nowrap;
    font-size: 14px !important;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.85);
  }

  /deep/ .ant-table-tbody > tr {
    transition: all 0.2s;

    &:hover {
      background: #f5f5f5;
    }
  }

  /deep/ .ant-table-tbody > tr > td {
    padding: 12px 16px !important;  // 与待办模块一致
    word-break: keep-all;
    white-space: nowrap;
    font-size: 14px !important;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
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
