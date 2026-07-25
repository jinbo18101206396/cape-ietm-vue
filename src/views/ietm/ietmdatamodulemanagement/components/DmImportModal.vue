<template>
  <a-modal
    title="导入数据模块"
    :width="800"
    :visible="visible"
    :confirmLoading="uploading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-spin :spinning="uploading">
      <!-- 导入类型选择 -->
      <a-radio-group v-model="importType" style="margin-bottom: 24px">
        <a-radio value="xml">导入XML文件</a-radio>
        <a-radio value="zip">导入ZIP压缩包（批量）</a-radio>
      </a-radio-group>

      <!-- 项目选择 -->
      <a-form-model :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <a-form-model-item label="目标项目" required>
          <a-select v-model="projectId" placeholder="请选择目标项目">
            <a-select-option v-for="item in projectList" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-model-item>

        <!-- 文件上传 -->
        <a-form-model-item label="选择文件" required>
          <a-upload-dragger
            :multiple="importType === 'zip'"
            :file-list="fileList"
            :before-upload="beforeUpload"
            :remove="handleRemove"
            :accept="importType === 'xml' ? '.xml' : '.zip'"
          >
            <p class="ant-upload-drag-icon">
              <a-icon type="inbox" />
            </p>
            <p class="ant-upload-text">
              点击或拖拽文件到此区域上传
            </p>
            <p class="ant-upload-hint">
              {{ importType === 'xml' ? '支持单个XML文件上传' : '支持ZIP压缩包批量导入' }}
            </p>
          </a-upload-dragger>
        </a-form-model-item>

        <!-- 导入选项 -->
        <a-form-model-item label="导入选项">
          <a-checkbox-group v-model="importOptions">
            <a-checkbox value="skipDuplicate">跳过重复的DMC</a-checkbox>
            <a-checkbox value="autoGenerate">自动生成缺失字段</a-checkbox>
            <a-checkbox value="validateContent">校验XML内容</a-checkbox>
          </a-checkbox-group>
        </a-form-model-item>

        <!-- 进度条 -->
        <a-form-model-item label="导入进度" v-if="uploading">
          <a-progress :percent="uploadProgress" :status="uploadStatus" />
          <p style="margin-top: 8px; color: #999;">{{ uploadStatusText }}</p>
        </a-form-model-item>
      </a-form-model>

      <!-- 导入结果 -->
      <div v-if="importResult" style="margin-top: 24px;">
        <a-divider>导入结果</a-divider>
        <a-result
          :status="importResult.success ? 'success' : 'warning'"
          :title="importResult.message"
        >
          <template #extra>
            <a-statistic-group>
              <a-statistic title="总计" :value="importResult.total" suffix="条">
                <template #prefix><a-icon type="file-text" /></template>
              </a-statistic>
              <a-statistic title="成功" :value="importResult.successCount" suffix="条" :value-style="{ color: '#3f8600' }">
                <template #prefix><a-icon type="check-circle" /></template>
              </a-statistic>
              <a-statistic title="失败" :value="importResult.failCount" suffix="条" :value-style="{ color: '#cf1322' }">
                <template #prefix><a-icon type="close-circle" /></template>
              </a-statistic>
            </a-statistic-group>
          </template>
        </a-result>

        <!-- 错误详情 -->
        <div v-if="importResult.errors && importResult.errors.length > 0">
          <a-collapse>
            <a-collapse-panel header="查看错误详情" key="1">
              <a-list
                size="small"
                :dataSource="importResult.errors"
              >
                <a-list-item slot="renderItem" slot-scope="item">
                  <a-list-item-meta>
                    <span slot="title">
                      <a-icon type="close-circle" style="color: red;" />
                      {{ item.file || item.dmc }}
                    </span>
                    <span slot="description" style="color: red;">
                      {{ item.error }}
                    </span>
                  </a-list-item-meta>
                </a-list-item>
              </a-list>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { postAction } from '@/api/manage'

export default {
  name: 'DmImportModal',
  data() {
    return {
      visible: false,
      uploading: false,
      importType: 'xml',
      projectId: undefined,
      projectList: [],
      fileList: [],
      importOptions: ['skipDuplicate', 'validateContent'],
      uploadProgress: 0,
      uploadStatus: 'active',
      uploadStatusText: '',
      importResult: null
    }
  },
  methods: {
    // 显示弹窗
    show(projectId) {
      this.visible = true
      this.projectId = projectId
      this.reset()
      this.loadProjects()
    },

    // 重置表单
    reset() {
      this.fileList = []
      this.uploadProgress = 0
      this.uploadStatus = 'active'
      this.uploadStatusText = ''
      this.importResult = null
    },

    // 加载项目列表
    loadProjects() {
      // TODO: 调用API获取项目列表
      this.projectList = [
        { value: '1', label: '项目A' },
        { value: '2', label: '项目B' }
      ]
    },

    // 文件上传前检查
    beforeUpload(file) {
      // 检查文件类型
      if (this.importType === 'xml') {
        if (!file.name.endsWith('.xml')) {
          this.$message.error('只能上传XML文件')
          return false
        }
      } else {
        if (!file.name.endsWith('.zip')) {
          this.$message.error('只能上传ZIP文件')
          return false
        }
      }

      // 检查文件大小（限制50MB）
      const isLt50M = file.size / 1024 / 1024 < 50
      if (!isLt50M) {
        this.$message.error('文件大小不能超过50MB')
        return false
      }

      // 添加到文件列表
      this.fileList = [file]
      return false // 阻止自动上传
    },

    // 移除文件
    handleRemove(file) {
      const index = this.fileList.indexOf(file)
      if (index > -1) {
        this.fileList.splice(index, 1)
      }
    },

    // 确定上传
    handleOk() {
      // 校验
      if (!this.projectId) {
        this.$message.warning('请选择目标项目')
        return
      }
      if (this.fileList.length === 0) {
        this.$message.warning('请选择要上传的文件')
        return
      }

      // 开始上传
      this.uploadFile()
    },

    // 上传文件
    uploadFile() {
      this.uploading = true
      this.uploadProgress = 0
      this.uploadStatus = 'active'
      this.uploadStatusText = '正在上传文件...'

      const formData = new FormData()
      formData.append('file', this.fileList[0])
      formData.append('projectId', this.projectId)
      formData.append('options', JSON.stringify(this.importOptions))

      const url = this.importType === 'xml' ? '/ietm/datamodule/importXml' : '/ietm/datamodule/importZip'

      // 模拟进度
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10
        }
      }, 500)

      postAction(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => {
        clearInterval(progressInterval)
        this.uploadProgress = 100

        if (res.success) {
          this.uploadStatus = 'success'
          this.uploadStatusText = '导入完成'
          this.importResult = {
            success: true,
            message: '导入成功',
            total: res.result.total || 0,
            successCount: res.result.success || 0,
            failCount: res.result.fail || 0,
            errors: res.result.failMessages || []
          }
          this.$message.success('导入成功')
          this.$emit('ok')
        } else {
          this.uploadStatus = 'exception'
          this.uploadStatusText = '导入失败'
          this.importResult = {
            success: false,
            message: res.message || '导入失败',
            total: 0,
            successCount: 0,
            failCount: 0,
            errors: [{ error: res.message }]
          }
          this.$message.error(res.message || '导入失败')
        }
      }).catch(err => {
        clearInterval(progressInterval)
        this.uploadProgress = 100
        this.uploadStatus = 'exception'
        this.uploadStatusText = '导入失败'
        this.importResult = {
          success: false,
          message: '导入失败',
          total: 0,
          successCount: 0,
          failCount: 0,
          errors: [{ error: err.message || '网络错误' }]
        }
        this.$message.error('导入失败：' + (err.message || '网络错误'))
      }).finally(() => {
        this.uploading = false
      })
    },

    // 取消
    handleCancel() {
      if (this.uploading) {
        this.$confirm({
          title: '确认取消',
          content: '文件正在上传，确定要取消吗？',
          onOk: () => {
            this.visible = false
            this.reset()
          }
        })
      } else {
        this.visible = false
        this.reset()
      }
    }
  }
}
</script>

<style scoped>
.ant-statistic-group {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
}
</style>
