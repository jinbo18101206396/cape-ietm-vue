<template>
  <a-modal
    title="校验结果"
    :width="900"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <!-- 校验摘要 -->
      <a-result
        :status="validationResult.valid ? 'success' : 'error'"
        :title="validationResult.valid ? '校验通过' : '校验失败'"
      >
        <template #extra>
          <a-statistic-group>
            <a-statistic title="错误" :value="validationResult.errorCount || 0" :value-style="{ color: '#cf1322' }">
              <template #prefix><a-icon type="close-circle" /></template>
            </a-statistic>
            <a-statistic title="警告" :value="validationResult.warningCount || 0" :value-style="{ color: '#faad14' }">
              <template #prefix><a-icon type="warning" /></template>
            </a-statistic>
            <a-statistic title="提示" :value="validationResult.infoCount || 0" :value-style="{ color: '#1890ff' }">
              <template #prefix><a-icon type="info-circle" /></template>
            </a-statistic>
          </a-statistic-group>
        </template>
      </a-result>

      <!-- 错误列表 -->
      <div v-if="validationResult.errors && validationResult.errors.length > 0" style="margin-top: 24px;">
        <a-divider>错误详情</a-divider>
        <a-list
          :dataSource="validationResult.errors"
          :pagination="{ pageSize: 10 }"
        >
          <a-list-item slot="renderItem" slot-scope="item">
            <a-list-item-meta>
              <div slot="title">
                <a-tag :color="getLevelColor(item.level)">{{ item.level }}</a-tag>
                <span style="margin-left: 8px;">{{ item.message }}</span>
              </div>
              <div slot="description">
                <p v-if="item.lineNumber">位置：第{{ item.lineNumber }}行，第{{ item.columnNumber }}列</p>
                <p v-if="item.suggestion" style="color: #52c41a;">
                  <a-icon type="bulb" /> 建议：{{ item.suggestion }}
                </p>
              </div>
            </a-list-item-meta>
          </a-list-item>
        </a-list>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { postAction } from '@/api/manage'

export default {
  name: 'DmValidationModal',
  data() {
    return {
      visible: false,
      loading: false,
      validationResult: {
        valid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        errors: []
      }
    }
  },
  methods: {
    show(dmId) {
      this.visible = true
      this.validate(dmId)
    },
    validate(dmId) {
      this.loading = true
      postAction('/ietm/datamodule/validate', { id: dmId }).then(res => {
        if (res.success) {
          this.validationResult = res.result
        } else {
          this.$message.error(res.message || '校验失败')
        }
      }).finally(() => {
        this.loading = false
      })
    },
    getLevelColor(level) {
      if (level === 'ERROR') return 'red'
      if (level === 'WARNING') return 'orange'
      return 'blue'
    },
    handleCancel() {
      this.visible = false
    }
  }
}
</script>
