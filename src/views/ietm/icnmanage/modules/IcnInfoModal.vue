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

      <a-descriptions-item label="实体文件名称" :span="2">
        <div v-if="entityFiles.length > 0">
          <a-tag v-for="file in entityFiles" :key="file.id" color="blue" style="margin-bottom: 4px;">
            <a-icon type="file" />
            {{ file.fileName }}
          </a-tag>
        </div>
        <span v-else style="color: #999;">暂无实体文件</span>
      </a-descriptions-item>

      <a-descriptions-item label="相关文件名称" :span="2">
        <div v-if="relatedFiles.length > 0">
          <a-tag v-for="file in relatedFiles" :key="file.id" color="green" style="margin-bottom: 4px;">
            <a-icon type="file" />
            {{ file.fileName }}
          </a-tag>
        </div>
        <span v-else style="color: #999;">暂无相关文件</span>
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
    },
    // 实体文件列表
    entityFiles() {
      // ietmAttachment是单个对象，不是数组
      if (this.record.ietmAttachment && this.record.ietmAttachment.fileName) {
        return [this.record.ietmAttachment]
      }
      return []
    },
    // 相关文件列表
    relatedFiles() {
      // relatedIetmAttachment是单个对象，不是数组
      if (this.record.relatedIetmAttachment && this.record.relatedIetmAttachment.fileName) {
        return [this.record.relatedIetmAttachment]
      }
      return []
    }
  },
  methods: {
    show(record) {
      console.log('🔵 [DEBUG] IcnInfoModal接收到的record:', record)
      console.log('🔵 [DEBUG] record.ietmAttachment:', record.ietmAttachment)
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
