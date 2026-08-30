<template>
  <div class="icn-list-container">
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
            <a-select-option value="icn">
              ICN编号
            </a-select-option>
            <a-select-option value="fileName">
              文件名称
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
      :locale="{ emptyText: '暂无实体ICN数据' }"
      row-key="id"
      size="small"
      bordered
    >
      <!-- ICN编号列（蓝色可点击） -->
      <template slot="icnCode" slot-scope="text, record">
        <span
          style="color: #1890ff; cursor: pointer;"
          @click="handleIcnClick(record)"
        >
          {{ text }}
        </span>
      </template>

      <span slot="fileSize" slot-scope="text, record">
        {{ formatFileSize(record.ietmAttachment) }}
      </span>
    </a-table>

    <!-- 浏览预览弹窗 -->
    <icn-viewer-modal ref="viewerModal" />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { getAction } from '@/api/manage'
import IcnViewerModal from '@/views/ietm/icnmanage/modules/IcnViewerModal'
import debounce from 'lodash.debounce'

export default {
  name: 'IcnList',

  components: {
    IcnViewerModal
  },

  data() {
    return {
      // 搜索字段
      searchField: 'icn',
      searchValue: '',

      // 表格列配置
      columns: [
        {
          title: '序号',
          dataIndex: 'index',
          width: 80,
          align: 'center',
          customRender: (text, record, index) => {
            return index + 1
          }
        },
        {
          title: 'ICN编号',
          dataIndex: 'icn',
          key: 'icn',
          width: 350,
          align: 'center',
          ellipsis: true,
          scopedSlots: { customRender: 'icnCode' }
        },
        {
          title: '文件名称',
          key: 'fileName',
          align: 'center',
          ellipsis: true,
          customRender: (text, record) => {
            return (record.ietmAttachment && record.ietmAttachment.fileName) || '-'
          }
        },
        {
          title: '文件大小',
          key: 'fileSize',
          width: 120,
          align: 'center',
          scopedSlots: { customRender: 'fileSize' }
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
            this.loadData()
          }
        } else if (oldVal && oldVal.projectId && !newVal) {
          // 从有项目变为无项目（关闭项目），清空列表
          this.allData = []
          this.dataSource = []
          this.searchValue = ''
          console.log('✅ 项目已关闭，实体ICN列表已清空')
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
    this.searchField = 'icn'
  },

  methods: {
    /**
     * 计算表格滚动高度
     */
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
     * 加载ICN列表数据
     */
    async loadData() {
      if (!this.currentProject || !this.currentProject.projectId) {
        this.dataSource = []
        this.allData = []
        return
      }

      if (!this.currentProject.cmRootNodeId) {
        this.$message.warning('当前项目未配置图符根节点')
        this.dataSource = []
        this.allData = []
        return
      }

      this.loading = true
      try {
        const response = await getAction('/icnmanage/ietmIcnManage/listWithAttachments', {
          cmNodeId: this.currentProject.cmRootNodeId,
          includeChildren: '1'
        })

        if (response.success && response.result) {
          // 保存完整数据
          this.allData = response.result

          // 应用搜索过滤
          this.applySearchFilter()
        } else {
          this.dataSource = []
          this.allData = []
        }
      } catch (error) {
        console.error('加载实体ICN列表失败:', error)
        this.$message.error('加载数据失败')
        this.dataSource = []
        this.allData = []
      } finally {
        this.loading = false
      }
    },

    /**
     * 应用搜索过滤
     */
    applySearchFilter() {
      if (!this.searchValue || !this.searchField) {
        this.dataSource = this.allData
        return
      }

      const keyword = this.searchValue.toLowerCase()
      this.dataSource = this.allData.filter(item => {
        if (this.searchField === 'icn') {
          return item.icn && item.icn.toLowerCase().includes(keyword)
        } else if (this.searchField === 'fileName') {
          const fileName = (item.ietmAttachment && item.ietmAttachment.fileName) || ''
          return fileName.toLowerCase().includes(keyword)
        }
        return false
      })
    },

    /**
     * 处理搜索
     */
    handleSearch() {
      this.applySearchFilter()
    },

    /**
     * 处理刷新
     */
    handleRefresh() {
      this.searchValue = ''
      this.searchField = 'icn'
      this.loadData()
    },

    /**
     * 处理ICN编号点击
     */
    handleIcnClick(record) {
      if (!record || !record.id) {
        this.$message.warning('无效的ICN记录')
        return
      }

      // 使用预览模态框
      this.$refs.viewerModal.show(record.id)
    },

    /**
     * 格式化文件大小
     */
    formatFileSize(attachment) {
      if (!attachment || !attachment.fileSize) {
        return '-'
      }

      const bytes = parseInt(attachment.fileSize)
      if (isNaN(bytes)) return '-'

      const kb = bytes / 1024
      if (kb < 1024) {
        return kb.toFixed(2) + ' KB'
      }

      const mb = kb / 1024
      return mb.toFixed(2) + ' MB'
    }
  }
}
</script>

<style lang="less" scoped>
.icn-list-container {
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
