<template>
  <a-modal
    title="ICN引用关系"
    :width="900"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <a-tabs default-active-key="1">
        <!-- 引用其他ICN -->
        <a-tab-pane key="1" tab="引用其他ICN">
          <a-alert
            message="该ICN引用了以下其他ICN"
            type="info"
            show-icon
            style="margin-bottom: 16px;"
          />
          <a-table
            :columns="referenceColumns"
            :data-source="referencedList"
            :pagination="false"
            :loading="loading"
            size="small"
            rowKey="id"
          >
            <template #action="text, record">
              <a @click="viewDetail(record)">查看详情</a>
            </template>
          </a-table>
          <a-empty v-if="referencedList.length === 0" description="暂无引用关系" />
        </a-tab-pane>

        <!-- 被其他ICN引用 -->
        <a-tab-pane key="2" tab="被其他ICN引用">
          <a-alert
            message="以下ICN引用了该ICN"
            type="warning"
            show-icon
            style="margin-bottom: 16px;"
          />
          <a-table
            :columns="referenceColumns"
            :data-source="referencingList"
            :pagination="false"
            :loading="loading"
            size="small"
            rowKey="id"
          >
            <template #action="text, record">
              <a @click="viewDetail(record)">查看详情</a>
            </template>
          </a-table>
          <a-empty v-if="referencingList.length === 0" description="暂无引用关系" />
        </a-tab-pane>
      </a-tabs>
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
      referencedList: [],  // 该ICN引用的其他ICN
      referencingList: [], // 引用该ICN的其他ICN
      referenceColumns: [
        {
          title: '序号',
          width: 60,
          customRender: (text, record, index) => index + 1
        },
        {
          title: 'ICN编码',
          dataIndex: 'icn',
          width: 200
        },
        {
          title: '文件名称',
          dataIndex: 'fileName',
          ellipsis: true
        },
        {
          title: '版本号',
          dataIndex: 'issueNo',
          width: 100
        },
        {
          title: '操作',
          width: 100,
          scopedSlots: { customRender: 'action' }
        }
      ]
    }
  },
  methods: {
    show(record) {
      this.visible = true
      this.currentIcnId = record.id
      this.currentIcnCode = record.icn
      this.loadReferenceData()
    },

    loadReferenceData() {
      this.loading = true

      // 同时加载引用和被引用数据
      Promise.all([
        getAction('/icnmanage/ietmIcnManage/getReferencedList', { icnId: this.currentIcnId }),
        getAction('/icnmanage/ietmIcnManage/getReferencingList', { icnId: this.currentIcnId })
      ])
        .then(([referencedRes, referencingRes]) => {
          if (referencedRes.success) {
            this.referencedList = referencedRes.result || []
          }
          if (referencingRes.success) {
            this.referencingList = referencingRes.result || []
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

    viewDetail(record) {
      // 触发查看详情事件
      this.$emit('view-detail', record)
    },

    handleCancel() {
      this.visible = false
      this.referencedList = []
      this.referencingList = []
    }
  }
}
</script>
