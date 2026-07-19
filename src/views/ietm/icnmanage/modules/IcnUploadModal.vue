<template>
  <a-modal
    :title="title"
    :width="700"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-spin :spinning="confirmLoading">
      <icn-upload-form ref="uploadForm" :upload-type="uploadType" :record="currentRecord" />
    </a-spin>
  </a-modal>
</template>

<script>
import IcnUploadForm from './IcnUploadForm'

export default {
  name: 'IcnUploadModal',
  components: {
    IcnUploadForm
  },
  data() {
    return {
      title: '文件上传',
      visible: false,
      confirmLoading: false,
      uploadType: '', // related | diff | new
      currentRecord: null
    }
  },
  methods: {
    // 相关文件上传
    showRelated(record) {
      this.title = '相关文件上传'
      this.uploadType = 'related'
      this.currentRecord = record
      this.visible = true
    },
    // 差异上传
    showDiff(record) {
      this.title = '差异上传'
      this.uploadType = 'diff'
      this.currentRecord = record
      this.visible = true
      this.$nextTick(() => {
        this.$refs.uploadForm.initDiffForm(record)
      })
    },
    // 新版上传
    showNew(record) {
      this.title = '新版上传'
      this.uploadType = 'new'
      this.currentRecord = record
      this.visible = true
    },
    handleOk() {
      this.$refs.uploadForm.handleSubmit((fileList, extraParams) => {
        this.confirmLoading = true
        this.$refs.uploadForm.submitUpload(fileList, extraParams)
          .then(() => {
            this.$message.success('上传成功')
            this.confirmLoading = false
            this.visible = false
            this.$emit('ok')
          })
          .catch((err) => {
            this.$message.error(err.message || '上传失败')
            this.confirmLoading = false
          })
      })
    },
    handleCancel() {
      this.visible = false
      this.$refs.uploadForm.reset()
    }
  }
}
</script>