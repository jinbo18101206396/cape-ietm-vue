<template>
  <a-modal
    title="导入ICN数据"
    :width="600"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-alert
      message="导入说明"
      type="info"
      show-icon
      style="margin-bottom: 16px;"
    >
      <template #description>
        <div>1. 请先下载Excel模板，按照模板格式填写数据</div>
        <div>2. 支持批量导入ICN基础信息</div>
        <div>3. 文件大小不超过10MB</div>
        <div>4. 支持的格式：.xls, .xlsx</div>
      </template>
    </a-alert>

    <a-space direction="vertical" style="width: 100%;" :size="16">
      <!-- 下载模板 -->
      <a-button type="dashed" icon="download" block @click="downloadTemplate">
        下载Excel模板
      </a-button>

      <!-- 文件上传 -->
      <a-upload
        :file-list="fileList"
        :before-upload="beforeUpload"
        :remove="handleRemove"
        accept=".xls,.xlsx"
      >
        <a-button icon="upload" block>
          选择Excel文件
        </a-button>
      </a-upload>

      <!-- 上传提示 -->
      <div v-if="fileList.length > 0" style="color: #52c41a;">
        <a-icon type="check-circle" /> 已选择文件：{{ fileList[0].name }}
      </div>
    </a-space>
  </a-modal>
</template>

<script>
import { postAction } from '@/api/manage'

export default {
  name: 'IcnImportModal',
  data() {
    return {
      visible: false,
      confirmLoading: false,
      fileList: []
    }
  },
  methods: {
    show() {
      this.visible = true
      this.fileList = []
    },

    beforeUpload(file) {
      // 检查文件类型
      const isExcel = file.type === 'application/vnd.ms-excel' ||
                     file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      if (!isExcel) {
        this.$message.error('只能上传 Excel 文件!')
        return false
      }

      // 检查文件大小（10MB）
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        this.$message.error('文件大小不能超过 10MB!')
        return false
      }

      this.fileList = [file]
      return false // 阻止自动上传
    },

    handleRemove() {
      this.fileList = []
    },

    handleOk() {
      if (this.fileList.length === 0) {
        this.$message.warning('请先选择要导入的Excel文件')
        return
      }

      this.confirmLoading = true

      const formData = new FormData()
      formData.append('file', this.fileList[0])

      // 使用原生fetch或axios上传文件
      const token = this.$store.getters.token
      fetch(`${window._CONFIG['domianURL']}/icnmanage/ietmIcnManage/importExcel`, {
        method: 'POST',
        headers: {
          'X-Access-Token': token
        },
        body: formData
      })
        .then(response => response.json())
        .then(res => {
          if (res.success) {
            this.$message.success(res.message || '导入成功')
            this.handleCancel()
            this.$emit('ok')
          } else {
            this.$message.error(res.message || '导入失败')
          }
        })
        .catch(err => {
          console.error('导入异常', err)
          this.$message.error('导入失败')
        })
        .finally(() => {
          this.confirmLoading = false
        })
    },

    handleCancel() {
      this.visible = false
      this.fileList = []
    },

    downloadTemplate() {
      // 下载模板文件
      const url = `${window._CONFIG['domianURL']}/icnmanage/ietmIcnManage/exportTemplate`
      window.open(url, '_blank')
    }
  }
}
</script>
