<template>
  <a-modal
    :title="title"
    :width="900"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-spin :spinning="confirmLoading">
      <icn-manage-form ref="realForm" />
    </a-spin>
  </a-modal>
</template>

<script>
import IcnManageForm from './IetmIcnManageForm'

export default {
  name: 'IetmIcnManageModal',
  components: {
    IcnManageForm
  },
  data() {
    return {
      title: '操作',
      visible: false,
      confirmLoading: false,
      disableSubmit: false
    }
  },
  methods: {
    add(cmnodeId) {
      this.visible = true
      this.$nextTick(() => {
        this.$refs.realForm.add(cmnodeId)
      })
    },
    edit(record) {
      this.visible = true
      this.$nextTick(() => {
        this.$refs.realForm.edit(record)
      })
    },
    close() {
      this.$emit('close')
      this.visible = false
      this.$refs.realForm.reset()
    },
    handleOk() {
      this.$refs.realForm.handleSubmit((formData, fileList) => {
        this.confirmLoading = true
        this.$refs.realForm.submitForm(formData, fileList)
          .then(() => {
            this.$message.success('操作成功')
            this.confirmLoading = false
            this.visible = false
            this.$emit('ok')
          })
          .catch((err) => {
            this.$message.error(err.message || '操作失败')
            this.confirmLoading = false
          })
      })
    },
    handleCancel() {
      this.close()
    }
  }
}
</script>
