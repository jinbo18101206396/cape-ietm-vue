<template>
  <a-form-model ref="form" :model="model" :label-col="labelCol" :wrapper-col="wrapperCol">
    <a-row :gutter="16">
      <!-- 上传类型提示 -->
      <a-col :span="24">
        <a-alert :message="uploadTypeText" type="info" show-icon style="margin-bottom: 16px;" />
      </a-col>

      <!-- 实体基本信息 -->
      <a-col :span="24">
        <a-divider orientation="left">实体信息</a-divider>
      </a-col>

      <a-col :span="12">
        <a-form-model-item label="密级">
          <a-input v-model="model.securityText" disabled />
        </a-form-model-item>
      </a-col>

      <a-col :span="12">
        <a-form-model-item label="安全等级">
          <a-input v-model="model.securityClassification" disabled />
        </a-form-model-item>
      </a-col>

      <a-col :span="12">
        <a-form-model-item label="SNS">
          <a-input v-model="model.sns" disabled />
        </a-form-model-item>
      </a-col>

      <a-col :span="12">
        <a-form-model-item label="唯一识别码">
          <a-input v-model="model.uniqueId" disabled />
        </a-form-model-item>
      </a-col>

      <a-col :span="12">
        <a-form-model-item label="变量码">
          <a-input v-model="model.variantCode" disabled />
        </a-form-model-item>
      </a-col>

      <a-col :span="12">
        <a-form-model-item label="版本号">
          <a-input v-model="model.issueNo" disabled />
        </a-form-model-item>
      </a-col>

      <a-col :span="12">
        <a-form-model-item label="分类">
          <a-input v-model="model.icnType" disabled />
        </a-form-model-item>
      </a-col>

      <a-col :span="12">
        <a-form-model-item label="文件名称">
          <a-input v-model="model.fileName" disabled />
        </a-form-model-item>
      </a-col>

      <!-- 差异上传特有字段 -->
      <a-col :span="24" v-if="uploadType === 'diff'">
        <a-divider orientation="left">差异信息</a-divider>
      </a-col>

      <a-col :span="12" v-if="uploadType === 'diff'">
        <a-form-model-item label="新变量码">
          <a-input v-model="model.newVariantCode" disabled />
        </a-form-model-item>
      </a-col>

      <!-- 文件上传区域 -->
      <a-col :span="24">
        <a-divider orientation="left">文件上传</a-divider>
      </a-col>

      <a-col :span="24">
        <a-form-model-item label="选择文件" required>
          <a-upload
            :file-list="fileList"
            :before-upload="beforeUpload"
            :remove="handleRemove"
            accept=".bmp,.jpg,.jpeg,.png,.gif,.tif,.tiff,.cgm,.svg,.swf,.mp3,.mp4,.webm,.ogg,.wrl,.smg"
            multiple
          >
            <a-button>
              <a-icon type="upload" /> 选择文件
            </a-button>
          </a-upload>
          <div class="upload-tips">{{ uploadTips }}</div>
        </a-form-model-item>
      </a-col>
    </a-row>
  </a-form-model>
</template>

<script>
import { httpAction } from '@/api/manage'

export default {
  name: 'IcnUploadForm',
  props: {
    uploadType: {
      type: String,
      default: 'related' // related | diff | new
    },
    record: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      labelCol: { span: 6 },
      wrapperCol: { span: 18 },
      model: {
        originalIcn: '',
        originalId: '',
        newVariantCode: '',
        securityText: '',
        sns: '',
        uniqueId: '',
        variantCode: '',
        issueNo: '',
        securityClassification: '',
        icnType: '',
        fileName: ''
      },
      fileList: [],
      url: {
        relatedUpload: '/icnmanage/ietmIcnManage/uploadRelatedFiles',
        diffUpload: '/icnmanage/ietmIcnManage/uploadDiffFiles',
        newUpload: '/icnmanage/ietmIcnManage/uploadNewVersion'
      }
    }
  },
  computed: {
    uploadTypeText() {
      const typeMap = {
        related: '相关文件上传：为当前ICN添加相关文件（如wrl的interactivity文件）',
        diff: '差异上传：保留原ICN，变量码自动升级，重新上传文件',
        new: '新版上传：删除原ICN文件，重新上传新版本文件'
      }
      return typeMap[this.uploadType] || ''
    },
    uploadTips() {
      const tipsMap = {
        related: '支持多文件上传，文件将作为相关文件关联到当前ICN',
        diff: '上传文件后，系统将自动生成新的变量码并保存',
        new: '上传后将删除原ICN的所有文件，请谨慎操作'
      }
      return tipsMap[this.uploadType] || ''
    }
  },
  watch: {
    record: {
      immediate: true,
      handler(val) {
        if (val && val.id) {
          this.model.originalIcn = val.icn || this.generateIcn(val)
          this.model.originalId = val.id
          this.model.securityText = this.getSecurityText(val.security)
          this.model.sns = val.sns || ''
          this.model.uniqueId = val.uniqueId || ''
          this.model.variantCode = val.variantCode || ''
          this.model.issueNo = val.issueNo || ''
          this.model.securityClassification = val.securityClassification || ''
          this.model.icnType = val.icnType || ''
          this.model.fileName = (val.ietmAttachment && val.ietmAttachment.fileName) || ''
        }
      }
    }
  },
  methods: {
    // 获取密级文字
    getSecurityText(security) {
      const securityMap = {
        1: '公开',
        2: '内部',
        3: '秘密',
        4: '机密'
      }
      return securityMap[security] || ''
    },
    // 初始化差异上传表单
    initDiffForm(record) {
      this.model.originalIcn = record.icn || this.generateIcn(record)
      this.model.originalId = record.id
      // 计算新变量码
      this.model.newVariantCode = this.getNextVariantCode(record.variantCode)
    },
    // 生成ICN编码（用于显示）
    generateIcn(record) {
      return `ICN-${record.sns}-${record.rpc}-${record.originator}-${record.uniqueId}-${record.variantCode}-${record.issueNo}-0${record.security}`
    },
    // 获取下一个变量码
    getNextVariantCode(currentCode) {
      if (!currentCode) return 'B'
      const code = currentCode.charCodeAt(0)
      return String.fromCharCode(code + 1)
    },
    // 文件上传前处理
    beforeUpload(file) {
      // 定义允许的文件格式
      const allowedExtensions = [
        '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff',
        '.cgm', '.svg', '.swf', '.mp3', '.mp4', '.webm', '.ogg', '.wrl', '.smg'
      ]

      const fileName = file.name.toLowerCase()
      const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext))

      if (!isAllowed) {
        this.$message.error(`不支持的文件格式！仅支持：${allowedExtensions.join(' ')}`)
        return false
      }

      this.fileList = [...this.fileList, file]
      return false
    },
    // 文件移除
    handleRemove(file) {
      const index = this.fileList.indexOf(file)
      const newFileList = this.fileList.slice()
      newFileList.splice(index, 1)
      this.fileList = newFileList
    },
    // 重置表单
    reset() {
      this.model = {
        originalIcn: '',
        originalId: '',
        newVariantCode: '',
        securityText: '',
        sns: '',
        uniqueId: '',
        variantCode: '',
        issueNo: '',
        securityClassification: '',
        icnType: '',
        fileName: ''
      }
      this.fileList = []
    },
    // 表单提交验证
    handleSubmit(callback) {
      if (this.fileList.length === 0) {
        this.$message.warning('请至少选择一个文件')
        return
      }
      callback(this.fileList, {
        id: this.model.originalId,
        newVariantCode: this.model.newVariantCode
      })
    },
    // 提交上传
    submitUpload(fileList, extraParams) {
      return new Promise((resolve, reject) => {
        const form = new FormData()

        // 添加文件
        fileList.forEach(file => {
          form.append('files', file)
        })

        // 根据上传类型选择URL和添加对应参数
        let url = this.url.relatedUpload
        if (this.uploadType === 'related') {
          // 相关文件上传：需要 icnId
          form.append('icnId', extraParams.id)
        } else if (this.uploadType === 'diff') {
          // 差异上传：需要 originalIcnId, newVariantCode, newUniqueId
          url = this.url.diffUpload
          form.append('originalIcnId', extraParams.id)
          form.append('newVariantCode', extraParams.newVariantCode)
          // newUniqueId 需要从 record 获取或生成新的
          form.append('newUniqueId', this.model.uniqueId)
        } else if (this.uploadType === 'new') {
          // 新版上传：需要 icnId
          url = this.url.newUpload
          form.append('icnId', extraParams.id)
        }

        httpAction(url, form, 'post').then(res => {
          if (res.success) {
            resolve()
          } else {
            reject(new Error(res.message))
          }
        }).catch(err => {
          reject(err)
        })
      })
    }
  }
}
</script>

<style lang="less" scoped>
.upload-tips {
  color: #999;
  font-size: 12px;
  margin-top: 8px;
}
</style>
