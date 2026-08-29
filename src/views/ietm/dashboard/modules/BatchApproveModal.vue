<template>
  <a-modal
    title="批量审批"
    :visible="visible"
    :confirm-loading="confirmLoading"
    :width="560"
    ok-text="确定"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form-model
      ref="form"
      :model="form"
      :rules="rules"
      :label-col="{ span: 5 }"
      :wrapper-col="{ span: 19 }"
    >
      <!-- 审批结果 -->
      <a-form-model-item label="审批结果" prop="approved">
        <a-radio-group v-model="form.approved" button-style="solid">
          <a-radio-button :value="true">
            <a-icon type="check-circle" /> 通过
          </a-radio-button>
          <a-radio-button :value="false">
            <a-icon type="close-circle" /> 不同意
          </a-radio-button>
        </a-radio-group>
      </a-form-model-item>

      <!-- 审批意见 -->
      <a-form-model-item label="审批意见" prop="opinion">
        <a-textarea
          v-model="form.opinion"
          placeholder="请输入审批意见"
          :rows="8"
          :maxLength="1000"
          show-count
        />
      </a-form-model-item>
    </a-form-model>
  </a-modal>
</template>

<script>
import { postAction } from '@/api/manage'

export default {
  name: 'BatchApproveModal',
  data() {
    return {
      visible: false,
      confirmLoading: false,
      nodeIds: [],
      form: {
        approved: true,
        opinion: ''
      },
      rules: {
        approved: [
          { required: true, message: '请选择审批结果', trigger: 'change' }
        ],
        opinion: [
          { required: true, message: '请输入审批意见', trigger: 'blur' },
          { max: 1000, message: '审批意见最多1000字符', trigger: 'blur' }
        ]
      }
    }
  },
  methods: {
    /**
     * 打开对话框
     */
    open(nodeIds) {
      this.nodeIds = nodeIds || []
      this.visible = true
      this.form = {
        approved: true,
        opinion: ''
      }

      // 重置表单验证
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },

    /**
     * 确定
     */
    handleOk() {
      this.$refs.form.validate(valid => {
        if (valid) {
          this.submitApprove()
        }
      })
    },

    /**
     * 提交批量审批
     */
    submitApprove() {
      this.confirmLoading = true

      const params = {
        nodeIds: this.nodeIds,
        approved: this.form.approved,
        opinion: this.form.opinion
      }

      // v1.2修正：修复接口路径（添加 execute 路径段）
      postAction('/ietm/workflow/execute/batchApprove', params)
        .then(res => {
          if (res.success) {
            const result = res.result || {}
            const successCount = result.successCount || 0
            const failedCount = result.failedCount || 0

            if (failedCount > 0) {
              // 部分成功
              const errors = result.errors || []
              const errorMsg = errors.map(e => e.errorMessage).join('；')
              this.$warning({
                title: '批量审批完成',
                content: `成功${successCount}条，失败${failedCount}条。\n失败原因：${errorMsg}`
              })
            } else {
              // 全部成功
              this.$message.success(`批量审批成功（${successCount}条）`)
            }

            this.visible = false
            this.$emit('ok')
          } else {
            this.$message.error(res.message || '批量审批失败')
          }
        })
        .catch(err => {
          console.error('批量审批失败', err)
          const message = (err.response && err.response.data && err.response.data.message) || err.message || '批量审批失败'
          this.$message.error(message)
        })
        .finally(() => {
          this.confirmLoading = false
        })
    },

    /**
     * 取消
     */
    handleCancel() {
      this.visible = false
      // 重置表单数据
      this.form = {
        approved: true,
        opinion: ''
      }
      // 清除验证状态
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    }
  }
}
</script>
