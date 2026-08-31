<template>
  <a-modal
    title="ICN引用关系"
    :width="1000"
    :visible="visible"
    :footer="null"
    :destroyOnClose="true"
    @cancel="handleCancel"
    class="icn-reference-modal"
    :bodyStyle="{ padding: '24px' }"
  >
    <a-spin :spinning="loading">
      <!-- 当前ICN信息展示 -->
      <div class="icn-info-section">
        <a-descriptions :column="3" bordered size="middle">
          <a-descriptions-item label="ICN编码" :span="1">
            <span class="icn-code">{{ currentIcnCode }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="文件名称" :span="2">
            {{ currentFileName || '-' }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- DM引用列表 -->
      <div class="dm-reference-section">
        <div class="section-header">
          <div class="header-left">
            <a-icon type="file-text" class="header-icon" />
            <span class="header-title">引用该ICN的DM模块</span>
            <a-tag v-if="dmReferenceList.length > 0" color="blue" style="margin-left: 12px;">
              {{ dmReferenceList.length }} 条
            </a-tag>
          </div>
        </div>

        <a-table
          :columns="dmReferenceColumns"
          :data-source="dmReferenceList"
          :pagination="paginationConfig"
          :loading="loading"
          :locale="{ emptyText: '暂无DM引用此ICN' }"
          size="middle"
          bordered
          rowKey="id"
          class="dm-table"
        >
          <template #dmCode="text, record">
            <a
              class="dm-code-link"
              href="javascript:void(0);"
              role="link"
              tabindex="0"
              :title="text"
              @click="handleOpenDmDetail(record)"
              @keyup.enter="handleOpenDmDetail(record)">
              {{ text }}
            </a>
          </template>
        </a-table>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'IcnReferenceModal',
  data() {
    return {
      visible: false,
      loading: false,
      currentIcnId: '',
      currentIcnCode: '',
      currentFileName: '',
      dmReferenceList: [], // 引用该ICN的DM列表

      // 表格分页配置（与ICN实体列表保持一致）
      paginationConfig: {
        current: 1,
        pageSize: 10,
        pageSizeOptions: ['10', '20', '30'],
        showTotal: (total, range) => {
          return range[0] + "-" + range[1] + " 共" + total + "条"
        },
        showQuickJumper: true,
        showSizeChanger: true,
        onChange: (page, pageSize) => {
          this.paginationConfig.current = page
          this.paginationConfig.pageSize = pageSize
        },
        onShowSizeChange: (current, size) => {
          this.paginationConfig.current = 1
          this.paginationConfig.pageSize = size
        }
      },

      // DM引用表格列
      dmReferenceColumns: [
        {
          title: '序号',
          width: 70,
          align: 'center',
          customRender: (text, record, index) => {
            return (this.paginationConfig.current - 1) * this.paginationConfig.pageSize + index + 1
          }
        },
        {
          title: 'DM编码',
          dataIndex: 'dmCode',
          align: 'center',
          ellipsis: true,
          scopedSlots: { customRender: 'dmCode' }
        },
        {
          title: '引用时间',
          dataIndex: 'createTime',
          width: 180,
          align: 'center',
          customRender: (text) => {
            return text ? text.substring(0, 16).replace('T', ' ') : '-'
          }
        }
      ]
    }
  },
  computed: {
    /**
     * 当前登录用户名
     */
    currentUser() {
      return (this.$store.getters.userInfo && this.$store.getters.userInfo.username) || ''
    }
  },
  methods: {
    /**
     * 显示弹窗
     * @param {Object|String} recordOrId - ICN记录对象或ID字符串
     */
    show(recordOrId) {
      console.log('=== IcnReferenceModal.show ===')
      console.log('传入的参数:', recordOrId)
      console.log('参数类型:', typeof recordOrId)

      this.visible = true

      // 兼容两种调用方式：传对象或传ID
      let record = recordOrId
      if (typeof recordOrId === 'string') {
        // 如果传入的是ID字符串，构造一个简单对象
        console.warn('⚠️ 传入的是ID字符串，推荐传递完整的record对象')
        record = { id: recordOrId }
      }

      this.currentIcnId = record.id

      // 优先使用传入的record数据
      this.currentIcnCode = record.icn || ''
      this.currentFileName = ''

      // 尝试从不同的数据结构中获取文件名
      if (record.ietmAttachment && record.ietmAttachment.fileName) {
        this.currentFileName = record.ietmAttachment.fileName
      } else if (record.fileName) {
        // 如果record直接有fileName字段（从引用列表点击过来的情况）
        this.currentFileName = record.fileName
      } else if (!record.icn || !this.currentFileName) {
        // 如果ICN编码或文件名都没有，从后端重新查询
        console.log('需要从后端查询ICN详情')
        this.loadCurrentIcnInfo()
      }

      console.log('最终设置的值:')
      console.log('currentIcnId:', this.currentIcnId)
      console.log('currentIcnCode:', this.currentIcnCode)
      console.log('currentFileName:', this.currentFileName)

      this.loadReferenceData()
    },

    /**
     * 加载当前ICN的详细信息
     */
    loadCurrentIcnInfo() {
      getAction('/icnmanage/ietmIcnManage/queryByIdWithAttachment', { id: this.currentIcnId })
        .then(res => {
          if (res.success && res.result) {
            this.currentIcnCode = res.result.icn || this.currentIcnCode
            // 从附件信息中获取文件名
            if (res.result.ietmAttachment && res.result.ietmAttachment.fileName) {
              this.currentFileName = res.result.ietmAttachment.fileName
            } else if (res.result.fileName) {
              this.currentFileName = res.result.fileName
            }
            console.log('从后端查询到的数据:')
            console.log('icn:', res.result.icn)
            console.log('ietmAttachment:', res.result.ietmAttachment)
          }
        })
        .catch(err => {
          console.error('加载ICN详情失败', err)
        })
    },

    /**
     * 加载引用关系数据
     */
    loadReferenceData() {
      this.loading = true

      // 只加载DM引用数据
      getAction('/icnmanage/ietmIcnManage/getReferencedByDmList', { icnId: this.currentIcnId })
        .then(res => {
          if (res.success) {
            this.dmReferenceList = res.result || []
          }
        })
        .catch(err => {
          console.error('加载DM引用关系失败', err)
          this.$message.error('加载DM引用关系失败')
        })
        .finally(() => {
          this.loading = false
        })
    },

    /**
     * 关闭弹窗
     */
    handleCancel() {
      this.visible = false
      this.currentIcnId = ''
      this.currentIcnCode = ''
      this.currentFileName = ''
      this.dmReferenceList = []
    },

    /**
     * 打开DM详情页
     * @param {Object} record - DM引用记录
     */
    handleOpenDmDetail(record) {
      if (!record.dmId) {
        this.$message.warning('无法获取DM信息')
        return
      }

      // 判断模式：如果是当前用户签出，则为编辑模式；否则为浏览模式
      const isMyCheckOut = record.checkoutUser &&
                          record.checkoutUser.trim() !== '' &&
                          record.checkoutUser === this.currentUser
      const mode = isMyCheckOut ? 'edit' : 'browse'

      // 在系统Tab页签中打开编辑器
      this.$router.push({
        path: `/ietm/dm-content-editor/${record.dmId}`,
        query: {
          mode: mode,
          dmc: record.dmCode || ''
        }
      }).catch(err => {
        // 忽略导航重复错误
        if (err.name !== 'NavigationDuplicated') {
          console.error('打开DM详情失败:', err)
          this.$message.error('打开DM详情失败，请稍后重试')
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
.icn-reference-modal {
  // ICN信息区域（使用Descriptions组件，统一样式）
  .icn-info-section {
    margin-bottom: 16px;

    // ICN编码高亮
    .icn-code {
      color: #1890ff;
      font-weight: 500;
    }
  }

  // DM引用区域
  .dm-reference-section {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #fafafa;
      border: 1px solid #e8e8e8;
      border-bottom: none;
      margin-bottom: 0;

      .header-left {
        display: flex;
        align-items: center;

        .header-icon {
          font-size: 16px;
          color: #1890ff;
          margin-right: 8px;
        }

        .header-title {
          font-size: 14px;
          font-weight: 500;
          color: #262626;
        }
      }
    }

    // 表格样式（与ICN实体列表保持一致）
    .dm-table {
      ::v-deep .ant-table {
        // 表头样式
        .ant-table-thead > tr > th {
          background: #fafafa;
          font-weight: 500;
          color: #262626;
          padding: 12px 8px;
        }

        // 表体样式
        .ant-table-tbody > tr > td {
          padding: 10px 8px;
        }

        // hover效果
        .ant-table-tbody > tr:hover {
          background: #e6f7ff;
        }

        // DM编码链接样式
        .dm-code-link {
          color: #1890ff;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          &:hover,
          &:focus {
            color: #40a9ff;
            text-decoration: underline;
            outline: 2px solid #91d5ff;
            outline-offset: 2px;
          }

          &:active {
            color: #096dd9;
          }
        }
      }
    }
  }

  // Loading优化
  ::v-deep .ant-spin {
    .ant-spin-dot {
      font-size: 32px;
    }

    .ant-spin-text {
      padding-top: 12px;
      color: #8c8c8c;
      font-size: 14px;
    }
  }

  // Tag优化
  ::v-deep .ant-tag {
    border-radius: 4px;
    font-size: 12px;
    padding: 2px 10px;
    font-weight: 500;
  }
}

// 弹窗整体优化
::v-deep .ant-modal {
  .ant-modal-header {
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid #e1e4e8;
    padding: 16px 24px;

    .ant-modal-title {
      font-size: 16px;
      font-weight: 600;
      color: #262626;
    }
  }

  .ant-modal-body {
    padding: 24px;
  }

  .ant-modal-close {
    top: 16px;
    right: 16px;

    .ant-modal-close-x {
      width: 48px;
      height: 48px;
      line-height: 48px;
      font-size: 16px;
      color: #8c8c8c;
      transition: all 0.2s ease;

      &:hover {
        color: #262626;
        transform: rotate(90deg);
      }
    }
  }
}
</style>
