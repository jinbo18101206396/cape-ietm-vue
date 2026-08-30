<template>
  <div class="data-module-list-container">
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
            <a-select-option value="dmcCode">
              DMC编码
            </a-select-option>
            <a-select-option value="techName">
              技术名称
            </a-select-option>
            <a-select-option value="infoName">
              信息名称
            </a-select-option>
            <a-select-option value="dmType_dictText">
              DM类型
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

    <!-- 数据表格 -->
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :loading="loading"
      :pagination="false"
      :scroll="{ y: scrollY, x: 'max-content' }"
      :locale="{ emptyText: '暂无数据模块' }"
      row-key="id"
      size="small"
      bordered
    >
      <!-- 状态图标列 -->
      <template slot="statusIcon" slot-scope="text, record">
        <a-tooltip v-if="record" :title="getStatusTooltip(record.checkoutStatus)">
          <a-icon
            :type="getCheckoutIconType(record)"
            :style="{
              fontSize: '18px',
              color: getCheckoutIconColor(record)
            }"
          />
        </a-tooltip>
      </template>

      <!-- DMC编码列（蓝色显示，可点击） -->
      <template slot="dmcCode" slot-scope="text, record">
        <span
          style="color: #1890ff; cursor: pointer;"
          @click="handleDmcClick(record)"
        >
          {{ text }}
        </span>
      </template>

      <!-- 版本列（蓝色标签显示 issueNo-inWork） -->
      <template slot="versionInfo" slot-scope="text, record">
        <a-tag color="blue">{{ record.issueNo }}-{{ record.inWork }}</a-tag>
      </template>
    </a-table>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { getAction, postAction } from '@/api/manage'
import debounce from 'lodash.debounce'

export default {
  name: 'DataModuleList',
  data() {
    return {
      // 搜索字段
      searchField: 'dmcCode',
      searchValue: '',

      // 签出状态请求序列号（防止竞态条件）
      checkoutRequestSeq: 0,
      checkoutLoading: false,

      // 表格列配置
      columns: [
        {
          title: '状态',
          dataIndex: 'checkoutStatus',
          key: 'checkoutStatus',
          width: 60,
          align: 'center',
          scopedSlots: { customRender: 'statusIcon' }
        },
        {
          title: 'DMC编码',
          dataIndex: 'dmcCode',
          key: 'dmcCode',
          width: 350,
          align: 'center',
          scopedSlots: { customRender: 'dmcCode' }
        },
        {
          title: '技术名称',
          dataIndex: 'techName',
          key: 'techName',
          width: 120,
          align: 'center'
        },
        {
          title: '信息名称',
          dataIndex: 'infoName',
          key: 'infoName',
          width: 120,
          align: 'center'
        },
        {
          title: 'DM类型',
          dataIndex: 'dmType_dictText',
          key: 'dmType_dictText',
          width: 90,
          align: 'center'
        },
        {
          title: '版本',
          dataIndex: 'versionInfo',
          key: 'versionInfo',
          width: 90,
          align: 'center',
          scopedSlots: { customRender: 'versionInfo' }
        }
      ],

      // 数据源
      dataSource: [],
      allData: [], // 完整数据（未过滤）
      loading: false,

      // 滚动高度
      scrollY: 0
    }
  },

  computed: {
    ...mapState({
      currentProject: state => state.project.currentProject
    })
  },

  watch: {
    // 监听当前项目变化，立即加载数据
    currentProject: {
      handler(newVal, oldVal) {
        if (newVal && newVal.projectId) {
          // 只在项目ID真正变化时才重新加载（避免重复加载）
          if (!oldVal || oldVal.projectId !== newVal.projectId) {
            this.loadDataList()
          }
        } else if (oldVal && oldVal.projectId && !newVal) {
          // 从有项目变为无项目（关闭项目），清空列表
          this.allData = []
          this.dataSource = []
          this.searchValue = ''
        }
      },
      immediate: true
    }
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
    // 清理数据，防止内存泄漏
    this.dataSource = []
    this.allData = []
    this.searchValue = ''
    this.searchField = 'dmcCode'
  },

  methods: {
    /**
     * 获取当前用户名
     */
    getCurrentUsername() {
      const username = this.$store.state.user.username
      if (!username) {
        console.error('❌ Store中无用户信息')
        this.$message.error('用户状态异常，请刷新页面')
      }
      return username || ''
    },

    /**
     * 设置默认签出状态（容错处理）
     */
    setDefaultCheckoutStatus() {
      this.allData = this.allData.map(item => ({
        ...item,
        checkoutUser: null,
        checkoutTime: null,
        checkoutStatus: 'CHECKED_IN'
      }))
    },

    calcScrollHeight() {
      this.$nextTick(() => {
        const container = this.$el
        if (container) {
          // 计算可用高度：容器高度减去工具栏高度和表头高度
          const containerHeight = container.clientHeight
          // 减去工具栏(约40px)、表头(约41px)和padding
          this.scrollY = containerHeight - 40 - 41 - 24
        }
      })
    },

    /**
     * 加载数据列表
     */
    async loadDataList() {
      if (!this.currentProject || !this.currentProject.projectId) {
        this.dataSource = []
        this.allData = []
        return
      }

      this.loading = true
      try {
        // 构建查询参数
        const params = {
          projectId: this.currentProject.projectId,
          pageNo: 1,
          pageSize: 10000 // 使用足够大的分页限制，避免数据截断
        }

        // 调用后端接口查询列表
        const url = '/ietm/datamodule/list'
        const response = await getAction(url, params)

        if (response.success && response.result && response.result.records) {
          // 保存完整数据
          this.allData = response.result.records

          // 加载签出状态
          await this.loadCheckoutStatus()

          // 应用搜索过滤
          this.applySearchFilter()
        } else {
          this.dataSource = []
          this.allData = []
        }
      } catch (error) {
        console.error('加载数据模块列表失败:', error)
        this.$message.error('加载数据失败')
        this.dataSource = []
        this.allData = []
      } finally {
        this.loading = false
      }
    },

    /**
     * 应用搜索过滤（本地过滤）
     */
    applySearchFilter() {
      if (!this.searchValue || !this.searchValue.trim()) {
        // 无搜索条件，显示所有数据
        this.dataSource = this.allData
        return
      }

      const keyword = this.searchValue.trim().toLowerCase()
      const field = this.searchField

      // 根据搜索字段过滤
      this.dataSource = this.allData.filter(item => {
        const value = item[field]
        if (!value) {
          return false
        }
        // 模糊匹配（不区分大小写）
        return String(value).toLowerCase().includes(keyword)
      })
    },

    /**
     * 批量加载签出状态（对齐 TodoList 逻辑 + 防止竞态条件）
     */
    async loadCheckoutStatus() {
      if (!this.allData || this.allData.length === 0) {
        return
      }

      // ✅ P0-1修复：请求序列号，防止竞态条件
      const currentSeq = ++this.checkoutRequestSeq
      this.checkoutLoading = true

      try {
        // 收集所有DM的ID
        const dmIds = this.allData.map(item => item.id).filter(id => id)

        if (dmIds.length === 0) {
          console.warn('⚠️ 没有有效的DM ID')
          this.checkoutLoading = false
          return
        }

        // 调用批量查询签出状态接口
        const url = '/ietm/datamodule/batchCheckoutStatus'
        const response = await postAction(url, dmIds)

        // ✅ P0-1修复：检查是否是最新请求
        if (currentSeq !== this.checkoutRequestSeq) {
          return
        }

        if (response.success && response.result) {
          const statusMap = response.result || {}

          // 获取当前用户名（如果为空，getCurrentUsername内部会显示错误提示）
          const currentUsername = this.getCurrentUsername()
          if (!currentUsername) {
            // 无用户名时设置默认状态
            this.setDefaultCheckoutStatus()
            return
          }

          // 使用map创建新数组，触发Vue响应式更新（与 TodoList 一致）
          this.allData = this.allData.map(item => {
            const statusInfo = statusMap[item.id]

            if (statusInfo && statusInfo.checkoutUser) {
              // 有签出用户
              if (statusInfo.checkoutUser === currentUsername) {
                // 自己签出
                return {
                  ...item,
                  checkoutUser: statusInfo.checkoutUser,
                  checkoutTime: statusInfo.checkoutTime,
                  checkoutStatus: 'CHECKED_OUT_BY_ME'
                }
              } else {
                // 他人签出
                return {
                  ...item,
                  checkoutUser: statusInfo.checkoutUser,
                  checkoutTime: statusInfo.checkoutTime,
                  checkoutStatus: 'CHECKED_OUT_BY_OTHER'
                }
              }
            } else {
              // 无签出用户，已签入
              return {
                ...item,
                checkoutUser: null,
                checkoutTime: null,
                checkoutStatus: 'CHECKED_IN'
              }
            }
          })
        } else {
          console.warn('查询签出状态失败：', response.message || '未知错误')
          this.setDefaultCheckoutStatus()
        }
      } catch (error) {
        console.error('加载签出状态失败:', error)
        // 容错处理：出错时使用默认状态，不阻塞UI
        if (currentSeq === this.checkoutRequestSeq) {
          this.setDefaultCheckoutStatus()
        }
      } finally {
        // ✅ P0-1修复：只有最新请求才更新loading状态
        if (currentSeq === this.checkoutRequestSeq) {
          this.checkoutLoading = false
        }
      }
    },

    /**
     * 获取签出状态图标类型（对齐我的待办）
     */
    getCheckoutIconType(record) {
      // 自己签出：绿色勾选
      if (record.checkoutStatus === 'CHECKED_OUT_BY_ME') {
        return 'check-circle'
      }

      // 他人签出：红色锁
      if (record.checkoutStatus === 'CHECKED_OUT_BY_OTHER') {
        return 'lock'
      }

      // 已签入/未签出：灰色锁
      return 'lock'
    },

    /**
     * 获取签出状态图标颜色（对齐我的待办）
     */
    getCheckoutIconColor(record) {
      // 自己签出：绿色
      if (record.checkoutStatus === 'CHECKED_OUT_BY_ME') {
        return '#52c41a'
      }

      // 他人签出：红色
      if (record.checkoutStatus === 'CHECKED_OUT_BY_OTHER') {
        return '#ff4d4f'
      }

      // 已签入/未签出：灰色
      return '#d9d9d9'
    },

    /**
     * 获取状态提示文本（对齐我的待办）
     */
    getStatusTooltip(status) {
      // 自己签出
      if (status === 'CHECKED_OUT_BY_ME') {
        return '您已签出（可编辑）'
      }

      // 他人签出
      if (status === 'CHECKED_OUT_BY_OTHER') {
        return '他人已签出'
      }

      // 已签入/未签出
      return '已签入，可签出'
    },

    /**
     * 处理DMC编码点击事件（打开DM内容编辑器）
     */
    handleDmcClick(record) {
      if (!record) {
        this.$message.warning('无法获取DM信息')
        return
      }

      // 检查DM的ID是否存在
      if (!record.id) {
        this.$message.warning('无法获取DM ID')
        return
      }

      // 判断模式：
      // 1. 如果是当前用户签出（CHECKED_OUT_BY_ME）且流程未结束，则为编辑模式
      // 2. 其他情况为浏览模式
      const isMyCheckOut = record.checkoutStatus === 'CHECKED_OUT_BY_ME'
      // 添加字段存在性检查，避免DM记录没有status字段时误判
      const isFinished = record.status && (record.status === '2' || record.status === '9')
      const mode = isMyCheckOut && !isFinished ? 'edit' : 'browse'

      // 在系统Tab页签中打开DM编辑器
      this.$router.push({
        path: `/ietm/dm-content-editor/${record.id}`,
        query: {
          mode: mode,
          dmc: record.dmcCode || ''
        }
      })
    },

    /**
     * 处理搜索
     */
    handleSearch() {
      // 应用本地搜索过滤
      this.applySearchFilter()
    },

    /**
     * 处理刷新
     */
    handleRefresh() {
      this.searchValue = ''
      this.searchField = 'dmcCode'
      this.loadDataList()
    }
  }
}
</script>

<style lang="less" scoped>
.data-module-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 4px;
  background: transparent;

  .toolbar {
    display: flex;
    align-items: center;
    margin-top: 8px;
    margin-bottom: 8px;
    padding: 0 4px;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    flex-shrink: 0;
    gap: 8px;

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
    padding: 12px 16px !important;
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
    padding: 12px 16px !important;
    word-break: keep-all;
    white-space: nowrap;
    font-size: 14px !important;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
    text-align: center;
  }

  // 状态列居中
  /deep/ .ant-table-tbody > tr > td:first-child,
  /deep/ .ant-table-thead > tr > th:first-child {
    text-align: center;
  }

  // 表头容器
  /deep/ .ant-table-header {
    overflow: hidden !important;
    margin-bottom: 0 !important;
  }

  // 表体容器：隐藏纵向滚动条但保持滚动功能，显示横向滚动条
  /deep/ .ant-table-body {
    overflow-y: scroll !important;
    overflow-x: auto !important;

    // 隐藏纵向滚动条（兼容多种浏览器）
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

  // 边框样式
  /deep/ .ant-table-bordered {
    border: 1px solid #e8e8e8;

    .ant-table-thead > tr > th,
    .ant-table-tbody > tr > td {
      border-right: 1px solid #e8e8e8;
    }
  }

  // 空数据提示
  /deep/ .ant-table-placeholder {
    padding: 40px 0;
    border-bottom: 0;
  }
}
</style>
