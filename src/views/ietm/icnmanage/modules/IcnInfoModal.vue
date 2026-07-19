<template>
  <a-modal
    title="ICN详情"
    :width="900"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-descriptions bordered :column="2">
      <a-descriptions-item label="ICN编码" :span="2">
        <a-tag color="blue">{{ icnCode }}</a-tag>
      </a-descriptions-item>

      <a-descriptions-item label="SNS编码">
        {{ record.sns }}
      </a-descriptions-item>

      <a-descriptions-item label="唯一识别码">
        {{ record.uniqueId }}
      </a-descriptions-item>

      <a-descriptions-item label="变量码">
        {{ record.variantCode }}
      </a-descriptions-item>

      <a-descriptions-item label="版本号">
        {{ record.issueNo }}
      </a-descriptions-item>

      <a-descriptions-item label="密级">
        <a-tag :color="getSecurityColor(record.security)">
          {{ getSecurityText(record.security) }}
        </a-tag>
      </a-descriptions-item>

      <a-descriptions-item label="ICN分类">
        {{ record.icnType }}
      </a-descriptions-item>

      <a-descriptions-item label="创作单位编码">
        {{ record.originator }}
      </a-descriptions-item>

      <a-descriptions-item label="创作单位名称">
        {{ record.originatorName }}
      </a-descriptions-item>

      <a-descriptions-item label="责任单位编码">
        {{ record.rpc }}
      </a-descriptions-item>

      <a-descriptions-item label="责任单位名称">
        {{ record.rpcName }}
      </a-descriptions-item>

      <a-descriptions-item label="构型节点ID">
        {{ record.cmnodeId }}
      </a-descriptions-item>

      <a-descriptions-item label="创建人">
        {{ record.createBy }}
      </a-descriptions-item>

      <a-descriptions-item label="创建时间">
        {{ record.createTime }}
      </a-descriptions-item>

      <a-descriptions-item label="更新时间">
        {{ record.updateTime }}
      </a-descriptions-item>

      <a-descriptions-item label="附件列表" :span="2">
        <a-list
          v-if="record.ietmAttachment && record.ietmAttachment.length > 0"
          :data-source="record.ietmAttachment"
          size="small"
        >
          <a-list-item slot="renderItem" slot-scope="item">
            <a-icon type="file" />
            <span style="margin-left: 8px;">{{ item.fileName }}</span>
            <span style="margin-left: 16px; color: #999;">{{ formatFileSize(item.fileSize) }}</span>
          </a-list-item>
        </a-list>
        <span v-else style="color: #999;">暂无附件</span>
      </a-descriptions-item>
    </a-descriptions>
  </a-modal>
</template>

<script>
export default {
  name: 'IcnInfoModal',
  data() {
    return {
      visible: false,
      record: {}
    }
  },
  computed: {
    icnCode() {
      const r = this.record
      if (!r.sns) return ''
      return `ICN-${r.sns}-${r.rpc}-${r.originator}-${r.uniqueId}-${r.variantCode}-${r.issueNo}-0${r.security}`
    }
  },
  methods: {
    show(record) {
      this.record = record
      this.visible = true
    },
    handleCancel() {
      this.visible = false
      this.record = {}
    },
    getSecurityText(security) {
      const map = {
        1: '公开',
        2: '内部',
        3: '秘密',
        4: '机密'
      }
      return map[security] || '未知'
    },
    getSecurityColor(security) {
      const colorMap = {
        1: 'green',
        2: 'blue',
        3: 'orange',
        4: 'red'
      }
      return colorMap[security] || 'default'
    },
    formatFileSize(bytes) {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }
  }
}
</script>
