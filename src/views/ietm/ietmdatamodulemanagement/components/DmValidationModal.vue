<template>
  <a-modal
    title="校验结果"
    :width="800"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading" tip="正在校验，请稍候...">
      <div v-if="!loading">
        <!-- 校验通过 -->
        <a-result
          v-if="flag === '1'"
          status="success"
          title="校验通过"
          sub-title="未发现XSD错误"
        />

        <!-- 内容为空 -->
        <a-result
          v-else-if="flag === '0'"
          status="warning"
          title="内容为空"
          sub-title="该DM尚未填写XML内容，无法校验"
        />

        <!-- 校验失败：错误列表 -->
        <div v-else-if="flag === 'error'">
          <a-alert
            :message="`发现 ${errors.length} 个错误`"
            type="error"
            show-icon
            style="margin-bottom: 16px;"
          />
          <a-table
            :columns="columns"
            :dataSource="errors"
            :pagination="errors.length > 10 ? { pageSize: 10 } : false"
            :rowKey="(record, index) => index"
            size="small"
            bordered
          >
            <span slot="lineno" slot-scope="text">
              <a-tag v-if="text > 0" color="red">第 {{ text }} 行</a-tag>
              <span v-else>-</span>
            </span>
            <span slot="info" slot-scope="text">{{ text }}</span>
          </a-table>
        </div>
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
      flag: null,   // '0'=空内容  '1'=通过  'error'=有错误
      errors: [],   // [{lineno, info}]
      columns: [
        // §17.3 序号列（对齐 rownumbers:true）
        { title: '序号', width: 64, align: 'center', customRender: (t, r, i) => i + 1 },
        { title: '行号', dataIndex: 'lineno', width: 100, align: 'center',
          scopedSlots: { customRender: 'lineno' } },
        { title: '错误信息', dataIndex: 'info',
          scopedSlots: { customRender: 'info' } }
      ]
    }
  },
  methods: {
    show(dmId, prefetched) {
      this.flag = null
      this.errors = []
      this.visible = true
      // 发布流程已校验过：直接复用结果，避免重复请求后端（同一DM再打一次/validate）
      if (prefetched && prefetched.flag) {
        this.flag = prefetched.flag
        this.errors = prefetched.errors || []
        this.loading = false
        return
      }
      this.loading = true
      // 列表页调用：传 id，由后端从数据库读取内容校验
      postAction('/ietm/dm-content/validate', { id: dmId })
        .then(res => {
          if (res.success) {
            this.flag = res.result.flag
            this.errors = res.result.errors || []
          } else {
            this.$message.error(res.message || '校验请求失败')
            this.visible = false
          }
        })
        .catch(() => {
          this.$message.error('校验请求失败，请检查网络')
          this.visible = false
        })
        .finally(() => {
          this.loading = false
        })
    },
    handleCancel() {
      this.visible = false
    }
  }
}
</script>
