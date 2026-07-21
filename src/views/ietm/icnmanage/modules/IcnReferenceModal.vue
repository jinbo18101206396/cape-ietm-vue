<template>
  <a-modal
    title="ICN引用关系"
    :width="1100"
    :visible="visible"
    :footer="null"
    :destroyOnClose="true"
    @cancel="handleCancel"
    class="icn-reference-modal"
  >
    <a-spin :spinning="loading">
      <!-- 当前ICN信息展示 -->
      <div class="icn-info-section">
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="ICN编码">
            <strong>{{ currentIcnCode }}</strong>
          </a-descriptions-item>
          <a-descriptions-item label="文件名称">
            {{ currentFileName || '-' }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- 统计信息 -->
      <div class="statistics-section">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-card size="small" class="stat-card">
              <a-statistic
                title="引用其他ICN"
                :value="referencedList.length"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix>
                  <a-icon type="arrow-right" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="12">
            <a-card size="small" class="stat-card">
              <a-statistic
                title="被其他ICN引用"
                :value="referencingList.length"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix>
                  <a-icon type="arrow-left" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 引用关系标签页 -->
      <div class="tabs-section">
        <a-tabs default-active-key="1" type="card">
          <!-- Tab1: 引用其他ICN -->
          <a-tab-pane key="1" tab="引用其他ICN">
            <div class="tab-content">
              <a-alert
                message="该ICN引用了以下其他ICN"
                type="info"
                show-icon
                style="margin-bottom: 12px;"
              />
              <a-table
                :columns="referenceColumns"
                :data-source="referencedList"
                :pagination="paginationConfig"
                :loading="loading"
                size="middle"
                rowKey="id"
                :scroll="{ x: 800 }"
              >
                <template #icn="text">
                  <span class="icn-code">{{ text }}</span>
                </template>
                <template #fileName="text">
                  <a-tooltip :title="text">
                    <span>{{ text || '-' }}</span>
                  </a-tooltip>
                </template>
                <template #action="text, record">
                  <a-button
                    type="link"
                    size="small"
                    @click="viewDetail(record)"
                  >
                    查看详情
                  </a-button>
                </template>
              </a-table>
              <a-empty
                v-if="referencedList.length === 0"
                description="暂无引用关系"
                :image="simpleImage"
              />
            </div>
          </a-tab-pane>

          <!-- Tab2: 被其他ICN引用 -->
          <a-tab-pane key="2" tab="被其他ICN引用">
            <div class="tab-content">
              <a-alert
                message="以下ICN引用了该ICN"
                type="success"
                show-icon
                style="margin-bottom: 12px;"
              />
              <a-table
                :columns="referenceColumns"
                :data-source="referencingList"
                :pagination="paginationConfig"
                :loading="loading"
                size="middle"
                rowKey="id"
                :scroll="{ x: 800 }"
              >
                <template #icn="text">
                  <span class="icn-code">{{ text }}</span>
                </template>
                <template #fileName="text">
                  <a-tooltip :title="text">
                    <span>{{ text || '-' }}</span>
                  </a-tooltip>
                </template>
                <template #action="text, record">
                  <a-button
                    type="link"
                    size="small"
                    @click="viewDetail(record)"
                  >
                    查看详情
                  </a-button>
                </template>
              </a-table>
              <a-empty
                v-if="referencingList.length === 0"
                description="暂无引用关系"
                :image="simpleImage"
              />
            </div>
          </a-tab-pane>

          <!-- Tab3: 被DM引用 -->
          <a-tab-pane key="3" tab="被DM引用">
            <div class="tab-content">
              <a-alert
                message="以下DM模块引用了该ICN"
                type="warning"
                show-icon
                style="margin-bottom: 12px;"
              />
              <a-table
                :columns="dmReferenceColumns"
                :data-source="dmReferenceList"
                :pagination="paginationConfig"
                :loading="loading"
                size="middle"
                rowKey="id"
                :scroll="{ x: 800 }"
              >
                <template #dmCode="text">
                  <span class="dm-code">{{ text }}</span>
                </template>
                <template #dmTitle="text">
                  <a-tooltip :title="text">
                    <span>{{ text || '-' }}</span>
                  </a-tooltip>
                </template>
                <template #action="text, record">
                  <a-button
                    type="link"
                    size="small"
                    @click="viewDmDetail(record)"
                  >
                    查看详情
                  </a-button>
                </template>
              </a-table>
              <a-empty
                v-if="dmReferenceList.length === 0"
                description="暂无DM引用"
                :image="simpleImage"
              />
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'
import { Empty } from 'ant-design-vue'

export default {
  name: 'IcnReferenceModal',
  data() {
    return {
      visible: false,
      loading: false,
      currentIcnId: '',
      currentIcnCode: '',
      currentFileName: '',
      referencedList: [],  // 该ICN引用的其他ICN
      referencingList: [], // 引用该ICN的其他ICN
      dmReferenceList: [], // 引用该ICN的DM列表
      simpleImage: Empty.PRESENTED_IMAGE_SIMPLE,

      // 表格分页配置
      paginationConfig: {
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: (total) => `共 ${total} 条记录`
      },

      // ICN引用表格列
      referenceColumns: [
        {
          title: '序号',
          width: 70,
          align: 'center',
          customRender: (text, record, index) => index + 1
        },
        {
          title: 'ICN编码',
          dataIndex: 'icn',
          width: 200,
          scopedSlots: { customRender: 'icn' }
        },
        {
          title: '文件名称',
          dataIndex: 'fileName',
          ellipsis: true,
          scopedSlots: { customRender: 'fileName' }
        },
        {
          title: '版本号',
          dataIndex: 'issueNo',
          width: 100,
          align: 'center'
        },
        {
          title: '创建时间',
          dataIndex: 'createTime',
          width: 160,
          align: 'center'
        },
        {
          title: '操作',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      ],

      // DM引用表格列
      dmReferenceColumns: [
        {
          title: '序号',
          width: 70,
          align: 'center',
          customRender: (text, record, index) => index + 1
        },
        {
          title: 'DM编码',
          dataIndex: 'dmCode',
          width: 180,
          scopedSlots: { customRender: 'dmCode' }
        },
        {
          title: 'DM标题',
          dataIndex: 'dmTitle',
          ellipsis: true,
          scopedSlots: { customRender: 'dmTitle' }
        },
        {
          title: '信息名称',
          dataIndex: 'infoName',
          width: 150,
          ellipsis: true
        },
        {
          title: 'DM类型',
          dataIndex: 'dmType',
          width: 120,
          align: 'center'
        },
        {
          title: '版本',
          dataIndex: 'issueNo',
          width: 100,
          align: 'center'
        },
        {
          title: '操作',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      ]
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

      // 同时加载三种引用数据
      Promise.all([
        getAction('/icnmanage/ietmIcnManage/getReferencedList', { icnId: this.currentIcnId }),
        getAction('/icnmanage/ietmIcnManage/getReferencingList', { icnId: this.currentIcnId }),
        getAction('/icnmanage/ietmIcnManage/getReferencedByDmList', { icnId: this.currentIcnId })
      ])
        .then(([referencedRes, referencingRes, dmRes]) => {
          // 处理ICN引用数据
          if (referencedRes.success) {
            this.referencedList = referencedRes.result || []
          }

          // 处理被ICN引用数据
          if (referencingRes.success) {
            this.referencingList = referencingRes.result || []
          }

          // 处理DM引用数据
          if (dmRes.success) {
            this.dmReferenceList = dmRes.result || []
          }
        })
        .catch(err => {
          console.error('加载引用关系失败', err)
          this.$message.error('加载引用关系失败')
        })
        .finally(() => {
          this.loading = false
        })
    },

    /**
     * 查看ICN详情
     */
    viewDetail(record) {
      this.$emit('view-detail', record)
    },

    /**
     * 查看DM详情
     */
    viewDmDetail(record) {
      this.$emit('view-dm-detail', record)
    },

    /**
     * 关闭弹窗
     */
    handleCancel() {
      this.visible = false
      this.currentIcnId = ''
      this.currentIcnCode = ''
      this.currentFileName = ''
      this.referencedList = []
      this.referencingList = []
      this.dmReferenceList = []
    }
  }
}
</script>

<style lang="less" scoped>
.icn-reference-modal {
  // ICN信息区域
  .icn-info-section {
    margin-bottom: 16px;

    ::v-deep .ant-descriptions-bordered .ant-descriptions-item-label {
      width: 120px;
      font-weight: 500;
      background-color: #fafafa;
    }

    ::v-deep .ant-descriptions-bordered .ant-descriptions-item-content {
      background-color: #ffffff;
    }
  }

  // 统计信息区域
  .statistics-section {
    margin-bottom: 20px;

    .stat-card {
      text-align: center;

      ::v-deep .ant-statistic-title {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.65);
      }

      ::v-deep .ant-statistic-content {
        font-size: 24px;
        font-weight: 600;
      }

      ::v-deep .anticon {
        margin-right: 4px;
      }
    }
  }

  // 标签页区域
  .tabs-section {
    ::v-deep .ant-tabs-nav {
      margin-bottom: 16px;
    }

    ::v-deep .ant-tabs-tab {
      padding: 8px 16px;
      font-size: 14px;

      &:hover {
        color: #1890ff;
      }
    }

    .tab-content {
      min-height: 300px;
    }
  }

  // 表格样式
  ::v-deep .ant-table {
    .icn-code {
      color: #1890ff;
      font-weight: 500;
    }

    .dm-code {
      color: #fa8c16;
      font-weight: 500;
    }

    thead th {
      background-color: #fafafa;
      font-weight: 600;
      white-space: nowrap;
    }

    tbody tr {
      &:hover {
        background-color: #f5f7fa;
      }
    }
  }

  // Empty组件样式
  ::v-deep .ant-empty {
    padding: 40px 0;
  }
}
</style>
