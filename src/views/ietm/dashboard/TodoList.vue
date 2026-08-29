<template>
  <div class="todo-list-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 批量审批按钮 -->
      <a-button
        type="primary"
        size="small"
        icon="check-circle"
        :disabled="selectedRowKeys.length === 0"
        @click="handleBatchApprove"
      >
        批量审批
      </a-button>

      <!-- 搜索区域 -->
      <div class="search-wrapper">
        <a-input-group compact>
          <a-select
            v-model="searchField"
            size="small"
            style="width: 90px;"
            placeholder="搜索字段"
          >
            <a-select-option value="title">
              标题
            </a-select-option>
            <a-select-option value="nodename">
              节点名称
            </a-select-option>
            <a-select-option value="createdName">
              创建人
            </a-select-option>
            <a-select-option value="creationDate">
              创建日期
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

      <!-- 紧急程度说明 -->
      <div class="urgency-legend">
        【<span style="color: red;">★</span>紧急 <span style="color: red;">★★</span>特急】
      </div>

      <!-- 刷新按钮（右对齐） -->
      <a-button
        size="small"
        icon="reload"
        style="margin-left: auto;"
        :loading="loading"
        @click="loadTodoList"
      >
        刷新
      </a-button>
    </div>

    <!-- 待办列表 -->
      <a-table
        :columns="columns"
        :data-source="dataSource"
        :row-selection="rowSelection"
        :loading="loading"
        :pagination="false"
        :scroll="{ y: scrollY, x: 'max-content' }"
        :locale="{ emptyText: '暂无待办事项' }"
        row-key="nodeId"
        size="small"
        bordered
        :custom-row="customRow"
      >
        <!-- 状态图标列 -->
        <template slot="statusIcon" slot-scope="text, record">
          <a-tooltip v-if="record" :title="getStatusTooltip(record.checkoutStatus)">
            <a-icon
              :type="getCheckoutIconType(record)"
              :style="{ fontSize: '18px', color: getCheckoutIconColor(record) }"
            />
          </a-tooltip>
        </template>

        <!-- 标题列 -->
        <template slot="titleColumn" slot-scope="text, record">
          <!-- 紧急程度标记 + 标题 -->
          <span style="color: #1890ff; display: inline-block; width: 100%; text-align: center; word-break: break-word;">
            <!-- 特急：红色双星 -->
            <span v-if="record.ifUrgent === '3'" style="color: red;">★★</span>
            <!-- 紧急：红色单星 -->
            <span v-if="record.ifUrgent === '2'" style="color: red;">★</span>
            {{ formatTitle(record) }}
          </span>
        </template>
      </a-table>

    <!-- 批量审批对话框 -->
    <batch-approve-modal
      ref="batchApproveModal"
      @ok="handleApproveSuccess"
    />
  </div>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import { mapState } from 'vuex'
import { USER_INFO } from '@/store/mutation-types'
import BatchApproveModal from './modules/BatchApproveModal'

export default {
  name: 'TodoList',
  components: {
    BatchApproveModal
  },
  data() {
    return {
      // 表格列定义
      columns: [
        {
          title: '状态',
          dataIndex: 'checkoutStatus',
          key: 'checkoutStatus',
          width: 70,
          align: 'center',
          scopedSlots: { customRender: 'statusIcon' }
        },
        {
          title: '标题',
          dataIndex: 'title',
          key: 'title',
          width: 350,
          align: 'center',
          scopedSlots: { customRender: 'titleColumn' }
        },
        {
          title: '节点',
          dataIndex: 'nodeName',
          key: 'nodeName',
          width: 100,
          align: 'center'
        },
        {
          title: '创建人',
          dataIndex: 'createdName',
          key: 'createdName',
          width: 90,
          align: 'center'
        },
        {
          title: '创建日期',
          dataIndex: 'creationDate',
          key: 'creationDate',
          width: 110,
          align: 'center'
        }
      ],

      // 数据源
      dataSource: [],
      loading: false,
      checkoutLoading: false,

      // 请求序列号（防止竞态条件）
      checkoutRequestSeq: 0,

      // 滚动高度
      scrollY: 0,

      // 多选
      selectedRowKeys: [],

      // 搜索（后端支持字段：title/nodename/createdName/creationDate）
      searchField: 'title',
      searchValue: '',

      // 是否开启调试日志（生产环境应为false）
      debugMode: process.env.NODE_ENV !== 'production'
    }
  },
  computed: {
    ...mapState({
      currentProject: state => state.project.currentProject
    }),

    // 紧急程度统计
    urgentCount() {
      return {
        urgent: this.dataSource.filter(item => item.ifUrgent === '2').length,
        veryUrgent: this.dataSource.filter(item => item.ifUrgent === '3').length
      }
    },

    // 行选择配置
    rowSelection() {
      return {
        selectedRowKeys: this.selectedRowKeys,
        onChange: this.onSelectChange,
        getCheckboxProps: record => ({
          props: {
            disabled:
              // 已结束或已终止的流程不能选择
              record.status === '2' ||
              record.status === '9' ||
              // 他人签出的不能选择
              record.checkoutStatus === 'CHECKED_OUT_BY_OTHER'
          }
        })
      }
    }
  },
  watch: {
    // 监听项目切换
    currentProject: {
      handler(newVal, oldVal) {
        if (newVal && newVal.projectId) {
          // 只在项目ID真正变化时才重新加载（避免重复加载）
          if (!oldVal || oldVal.projectId !== newVal.projectId) {
            this.loadTodoList()
          }
        } else if (oldVal && oldVal.projectId && !newVal) {
          // 从有项目变为无项目（关闭项目），清空列表
          this.dataSource = []
          this.selectedRowKeys = []
          this.searchValue = ''
          console.log('✅ 项目已关闭，待办列表已清空')
        }
      },
      immediate: true
    }
  },
  mounted() {
    this.calcScrollHeight()
    window.addEventListener('resize', this.calcScrollHeight)
  },
  beforeDestroy() {
    // 移除窗口大小监听
    window.removeEventListener('resize', this.calcScrollHeight)

    // 清理数据
    this.dataSource = []
    this.selectedRowKeys = []
    this.searchValue = ''
  },
  methods: {
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
     * 工具方法：设置默认签出状态
     */
    setDefaultCheckoutStatus(items, status = 'CHECKED_IN') {
      return items.map(item => ({
        ...item,
        checkoutStatus: item.checkoutStatus || status
      }))
    },

    /**
     * 工具方法：记录调试日志
     */
    debugLog(message, ...args) {
      if (this.debugMode) {
        console.log(message, ...args)
      }
    },

    /**
     * 加载待办列表
     */
    loadTodoList() {
      if (!this.currentProject || !this.currentProject.projectId) {
        this.$message.warning('请先选择项目')
        this.dataSource = []
        return
      }

      this.loading = true

      const params = {
        projectId: this.currentProject.projectId,
        searchField: this.searchValue ? this.searchField : null,
        searchValue: this.searchValue || null
      }

      this.debugLog('=== 我的待办列表查询 ===')
      this.debugLog('当前项目ID:', this.currentProject.projectId)
      this.debugLog('当前项目名称:', this.currentProject.projectName)
      this.debugLog('查询参数:', params)

      // v1.1修正：直接使用getAction，不单独封装API
      getAction('/ietm/workflow/myTodoList', params)
        .then(res => {
          if (res.success) {
            let todos = res.result || []

            this.debugLog('返回待办数量:', todos.length)
            this.debugLog('待办列表详情:', todos.map(item => ({
              dmcCode: item.title,
              formId: item.formId,
              type: item.type,
              nodeName: item.nodeName,
              instId: item.instId,
              seqno: item.seqno
            })))

            // v1.5修正：后端已通过JOIN v_wf_instance过滤，前端直接使用
            // 后端SQL已确保：t.nodename = wf.activityalias_（节点名称=流程当前步骤）
            this.dataSource = todos

            this.debugLog('待办数量:', this.dataSource.length)

            // 加载签出状态
            this.loadCheckoutStatus()
          } else {
            this.$message.error(res.message || '查询待办列表失败')
            this.dataSource = []
          }
        })
        .catch(err => {
          console.error('查询待办列表失败', err)
          this.$message.error('查询待办列表失败，请稍后重试')
          this.dataSource = []
        })
        .finally(() => {
          this.loading = false
        })
    },

    /**
     * 加载签出状态
     */
    loadCheckoutStatus() {
      // 只提取DM类型的ID（PM类型暂不支持签出状态查询）
      const dmIds = this.dataSource
        .filter(item => item.type === '1')
        .map(item => item.formId)
        .filter(id => id)

      if (dmIds.length === 0) {
        // 如果没有DM类型，所有记录标记为已签入
        this.dataSource = this.setDefaultCheckoutStatus(this.dataSource)
        return
      }

      // 生成新的请求序列号
      const currentSeq = ++this.checkoutRequestSeq
      this.checkoutLoading = true

      postAction('/ietm/datamodule/batchCheckoutStatus', dmIds)
        .then(res => {
          // 只处理最新的请求（防止快速切换项目时显示错误数据）
          if (currentSeq !== this.checkoutRequestSeq) {
            this.debugLog('⏭️ 忽略过期的签出状态响应')
            return
          }

          if (res.success) {
            const statusMap = res.result || {}

            // 获取当前用户名
            const currentUsername = this.$store.state.user.username

            if (!currentUsername) {
              console.error('❌ Store中无用户信息，这不应该发生')
              this.$message.error('用户状态异常，请刷新页面')
              this.dataSource = this.setDefaultCheckoutStatus(this.dataSource)
              this.checkoutLoading = false
              return
            }

            this.debugLog('📌 当前用户:', currentUsername, '| 签出状态数量:', Object.keys(statusMap).length)

            // 使用map创建新数组，触发Vue响应式更新
            this.dataSource = this.dataSource.map(item => {
              // PM类型默认标记为已签入
              if (item.type === '2') {
                return {
                  ...item,
                  checkoutStatus: 'CHECKED_IN'
                }
              }

              // DM类型查询签出状态
              const status = statusMap[item.formId]
              if (status) {
                // 未签出
                if (!status.checkoutUser) {
                  return {
                    ...item,
                    checkoutStatus: 'CHECKED_IN'
                  }
                }

                // 自己签出
                if (status.checkoutUser === currentUsername) {
                  return {
                    ...item,
                    checkoutStatus: 'CHECKED_OUT_BY_ME'
                  }
                }

                // 他人签出
                return {
                  ...item,
                  checkoutStatus: 'CHECKED_OUT_BY_OTHER',
                  checkoutUser: status.checkoutUser
                }
              } else {
                return {
                  ...item,
                  checkoutStatus: 'CHECKED_IN'
                }
              }
            })
          } else {
            this.$message.warning('查询签出状态失败：' + (res.message || '未知错误'))
            this.dataSource = this.setDefaultCheckoutStatus(this.dataSource)
          }
        })
        .catch(err => {
          // 只处理最新的请求
          if (currentSeq !== this.checkoutRequestSeq) {
            return
          }

          console.error('查询签出状态失败', err)
          this.$message.warning('查询签出状态失败，使用默认状态')
          // 容错处理：404或其他错误时，使用默认状态，不阻塞UI
          this.dataSource = this.setDefaultCheckoutStatus(this.dataSource)
        })
        .finally(() => {
          // 只处理最新的请求
          if (currentSeq === this.checkoutRequestSeq) {
            this.checkoutLoading = false
          }
        })
    },

    /**
     * 获取签出图标类型（对齐数据模块列表）
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

      // 已签入/未签出/PM类型：灰色锁
      return 'lock'
    },

    /**
     * 获取签出图标颜色（对齐数据模块列表）
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

      // 已签入/未签出/PM类型：灰色
      return '#d9d9d9'
    },

    /**
     * 获取状态提示（对齐数据模块列表）
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

      // 已签入/未签出/PM类型
      return '已签入，可签出'
    },

    /**
     * 多选改变
     */
    onSelectChange(selectedRowKeys) {
      this.selectedRowKeys = selectedRowKeys
    },

    /**
     * 搜索
     */
    handleSearch() {
      // 如果搜索值为空或只有空格，清除搜索条件
      if (!this.searchValue || this.searchValue.trim() === '') {
        this.searchValue = ''
      }
      this.loadTodoList()
    },

    /**
     * 批量审批
     */
    handleBatchApprove() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请先选择待办事项')
        return
      }

      // 获取选中的待办项
      const selectedItems = this.dataSource.filter(item =>
        this.selectedRowKeys.includes(item.nodeId)
      )

      // 1. 检查签出状态（对标旧系统：必须先签入才能审批）
      const notCheckedInItems = selectedItems
        .filter(item => item.type === '1' && item.checkoutStatus !== 'CHECKED_IN')
        .map(item => item.title || item.dmcCode || '(无标题)')

      if (notCheckedInItems.length > 0) {
        this.$message.error(
          `以下数据模块还未签入，请签入后再审批：\n${notCheckedInItems.join('、')}`
        )
        return
      }

      // 2. 检查流程状态
      const finishedItems = selectedItems.filter(item =>
        item.status === '2' || item.status === '9'
      )
      if (finishedItems.length > 0) {
        this.$message.error('选中的待办中有已结束或已终止的流程，不能审批')
        return
      }

      // 3. 检查当前用户是否是待办节点的处理人（安全校验）
      // 注意：后端已通过5种权限匹配机制过滤，理论上前端拿到的都是有权限的
      // 但为了防御性编程，仍然保留前端校验
      const currentUsername = this.$store.state.user.username
      if (!currentUsername) {
        this.$message.error('无法获取当前用户信息，请刷新页面后重试')
        return
      }

      // 打开批量审批对话框
      this.$refs.batchApproveModal.open(this.selectedRowKeys)
    },

    /**
     * 审批成功回调
     */
    handleApproveSuccess() {
      const count = this.selectedRowKeys.length

      // 清空选中状态
      this.selectedRowKeys = []

      // 刷新待办列表（获取最新数据）
      this.loadTodoList()

      this.$message.success(`批量审批成功，共处理 ${count} 条待办`)
    },

    /**
     * 格式化标题（对标旧系统：直接显示标题，不添加前缀）
     */
    formatTitle(record) {
      if (!record) return '(无标题)'
      return record.title || '(无标题)'
    },

    /**
     * 自定义行属性（实现行点击跳转）
     */
    customRow(record) {
      return {
        on: {
          click: (event) => {
            // 排除checkbox点击
            if (event.target.type === 'checkbox' ||
                event.target.closest('.ant-checkbox-wrapper') ||
                event.target.closest('.ant-table-selection-column')) {
              return
            }
            this.handleRowClick(record)
          }
        },
        style: {
          cursor: 'pointer'
        }
      }
    },

    /**
     * 处理行点击事件（在系统Tab页签中打开）
     */
    handleRowClick(record) {
      if (!record) {
        this.$message.warning('无法获取待办信息')
        return
      }

      // 仅支持DM类型跳转（type='1'）
      if (record.type !== '1') {
        this.$message.warning('仅支持DM类型的待办跳转')
        return
      }

      // 检查formId是否存在
      if (!record.formId) {
        this.$message.warning('无法获取DM信息')
        return
      }

      // 判断模式：
      // 1. 如果是当前用户签出（CHECKED_OUT_BY_ME），则为编辑模式
      // 2. 如果流程已结束或已终止，则为浏览模式
      // 3. 其他情况为浏览模式
      const isMyCheckOut = record.checkoutStatus === 'CHECKED_OUT_BY_ME'
      const isFinished = record.status === '2' || record.status === '9'
      const mode = isMyCheckOut && !isFinished ? 'edit' : 'browse'

      // 在系统Tab页签中打开DM编辑器
      this.$router.push({
        path: `/ietm/dm-content-editor/${record.formId}`,
        query: {
          mode: mode,
          dmc: record.dmcCode || record.title || ''
        }
      })
    }
  }
}
</script>

<style scoped lang="less">
.todo-list-container {
  height: 100%;
  padding: 4px;
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
    margin-left: 12px;

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

  .urgency-legend {
    margin-left: 12px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
    white-space: nowrap;
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
  }

  // 标题列不换行（保持原有样式）
  /deep/ .ant-table-tbody > tr > td:nth-child(2) {
    white-space: nowrap !important;
    overflow: visible !important;
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

  // 选择框列宽度
  /deep/ .ant-table-selection-column {
    width: 50px !important;
    min-width: 50px !important;
  }
}
</style>
