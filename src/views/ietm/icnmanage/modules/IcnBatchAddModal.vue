<template>
  <a-modal
    title="批量新增ICN"
    :width="1000"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    :bodyStyle="{ paddingBottom: '8px' }"
  >
    <a-spin :spinning="confirmLoading">
      <!-- 进度条显示 -->
      <div v-if="showProgress" style="margin-bottom: 16px;">
        <a-alert
          message="正在批量上传ICN文件..."
          :description="`已完成 ${progress.current} / ${progress.total} 个文件`"
          type="info"
          show-icon
        />
        <a-progress
          :percent="progressPercent"
          :status="progress.status"
          style="margin-top: 8px;"
        />
      </div>

      <!-- 表单区域 -->
      <div style="background: #fafafa; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
        <a-form-model ref="form" :model="model" :label-col="{ span: 7 }" :wrapper-col="{ span: 17 }">
          <a-row :gutter="24">
            <!-- 第一行：SNS和唯一识别码初值 -->
            <a-col :span="12">
              <a-form-model-item label="SNS编码">
                <a-input v-model="model.sns" disabled placeholder="自动生成" />
              </a-form-model-item>
            </a-col>

            <a-col :span="12">
              <a-form-model-item label="唯一识别码初值">
                <a-input :value="currentUniqueId" disabled />
              </a-form-model-item>
            </a-col>

            <!-- 第二行：变量码和版本号 -->
            <a-col :span="12">
              <a-form-model-item label="变量码">
                <a-input value="A" disabled />
              </a-form-model-item>
            </a-col>

            <a-col :span="12">
              <a-form-model-item label="版本号">
                <a-input value="001" disabled />
              </a-form-model-item>
            </a-col>

            <!-- 第三行：密级和ICN分类 -->
            <a-col :span="12">
              <a-form-model-item label="密级" required>
                <a-select v-model="model.security" placeholder="请选择密级">
                  <a-select-option :value="1">公开</a-select-option>
                  <a-select-option :value="2">内部</a-select-option>
                  <a-select-option :value="3">秘密</a-select-option>
                  <a-select-option :value="4">机密</a-select-option>
                </a-select>
              </a-form-model-item>
            </a-col>

            <a-col :span="12">
              <a-form-model-item label="ICN分类">
                <a-input v-model="model.icnType" placeholder="请输入ICN分类（可选）" />
              </a-form-model-item>
            </a-col>

            <!-- 第四行：创作单位和责任单位 -->
            <a-col :span="12">
              <a-form-model-item label="创作单位" required>
                <a-select
                  v-model="model.originator"
                  placeholder="请选择创作单位"
                  show-search
                  option-filter-prop="children"
                  @change="handleOriginatorChange"
                >
                  <a-select-option v-for="item in originatorList" :key="`originator-${item.companyCode}`" :value="item.companyCode">
                    {{ item.companyName }}
                  </a-select-option>
                </a-select>
              </a-form-model-item>
            </a-col>

            <a-col :span="12">
              <a-form-model-item label="责任单位" required>
                <a-select
                  v-model="model.rpc"
                  placeholder="请选择责任单位"
                  show-search
                  option-filter-prop="children"
                  @change="handleRpcChange"
                >
                  <a-select-option v-for="item in rpcList" :key="`rpc-${item.companyCode}`" :value="item.companyCode">
                    {{ item.companyName }}
                  </a-select-option>
                </a-select>
              </a-form-model-item>
            </a-col>
          </a-row>
        </a-form-model>
      </div>

      <!-- 文件列表区域 -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-weight: 500; font-size: 14px; color: rgba(0, 0, 0, 0.85);">
            <a-icon type="paper-clip" style="margin-right: 4px;" />
            文件列表
            <span v-if="fileList.length > 0" style="color: #1890ff; margin-left: 8px;">
              (共 {{ fileList.length }} 个文件)
            </span>
          </div>
          <a-space>
            <a-upload
              :file-list="[]"
              :before-upload="beforeUpload"
              accept=".bmp,.jpg,.jpeg,.png,.gif,.tif,.tiff,.cgm,.svg,.swf,.mp3,.mp4,.webm,.ogg,.wrl,.smg"
              multiple
              :show-upload-list="false"
            >
              <a-button type="primary" icon="upload" size="small">
                选择文件
              </a-button>
            </a-upload>

            <a-button icon="arrow-up" :disabled="!canMoveUp" @click="moveUp" size="small">
              上移
            </a-button>

            <a-button icon="arrow-down" :disabled="!canMoveDown" @click="moveDown" size="small">
              下移
            </a-button>
          </a-space>
        </div>

        <a-table
          :columns="fileColumns"
          :data-source="fileList"
          :pagination="false"
          :row-selection="{
            type: 'radio',
            selectedRowKeys: selectedFileKeys,
            onChange: onFileSelectChange,
            columnWidth: 50,
            fixed: true
          }"
          row-key="id"
          size="small"
          :scroll="{ x: 'max-content', y: 280 }"
          bordered
        >
          <template #uniqueId="text, record, index">
            <a-input-number
              v-model="record.uniqueId"
              :min="currentUniqueIdNum"
              :max="99999"
              :formatter="value => formatUniqueId(value)"
              :parser="value => value.replace(/^0+/, '')"
              style="width: 100%;"
              size="small"
              @change="validateUniqueIds"
            />
          </template>

          <template #fileSize="text">
            {{ formatFileSize(text) }}
          </template>

          <template #action="text, record">
            <a @click="removeFile(record)" style="color: #ff4d4f;">删除</a>
          </template>
        </a-table>

        <div v-if="fileList.length > 0" style="margin-top: 8px; color: #999; font-size: 12px;">
          <a-icon type="info-circle" style="margin-right: 4px;" />
          支持格式：bmp, jpg, png, gif, tif, cgm, svg, mp3, mp4, wrl, smg 等
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { postAction, getAction, httpAction, uploadAction } from '@/api/manage'

export default {
  name: 'IcnBatchAddModal',
  data() {
    return {
      visible: false,
      confirmLoading: false,
      cmnodeId: '',
      cmnodeName: '',
      currentUniqueId: '00001',
      currentUniqueIdNum: 1,
      showProgress: false,
      progress: {
        current: 0,
        total: 0,
        status: 'active'
      },
      model: {
        sns: '',
        security: 2,
        icnType: '',
        originator: '',
        originatorName: '',
        rpc: '',
        rpcName: ''
      },
      originatorList: [], // 创作单位列表
      rpcList: [], // 责任单位列表
      fileList: [],
      selectedFileKeys: [],
      fileIdCounter: 1,
      fileColumns: [
        {
          title: '序号',
          width: 70,
          align: 'center',
          fixed: 'left',
          customRender: (text, record, index) => index + 1
        },
        {
          title: '文件名',
          dataIndex: 'name',
          width: 300,
          ellipsis: true
        },
        {
          title: '文件大小',
          dataIndex: 'size',
          width: 120,
          align: 'center',
          scopedSlots: { customRender: 'fileSize' }
        },
        {
          title: '唯一识别码',
          dataIndex: 'uniqueId',
          width: 150,
          align: 'center',
          scopedSlots: { customRender: 'uniqueId' }
        },
        {
          title: '操作',
          width: 80,
          align: 'center',
          fixed: 'right',
          scopedSlots: { customRender: 'action' }
        }
      ]
    }
  },
  computed: {
    progressPercent() {
      if (this.progress.total === 0) return 0
      return Math.round((this.progress.current / this.progress.total) * 100)
    },
    canMoveUp() {
      if (this.selectedFileKeys.length !== 1 || this.fileList.length === 0) {
        return false
      }
      const index = this.fileList.findIndex(f => f.id === this.selectedFileKeys[0])
      return index > 0
    },
    canMoveDown() {
      if (this.selectedFileKeys.length !== 1 || this.fileList.length === 0) {
        return false
      }
      const index = this.fileList.findIndex(f => f.id === this.selectedFileKeys[0])
      return index >= 0 && index < this.fileList.length - 1
    }
  },
  methods: {
    show(cmnodeId, cmnodeName, projectInfo) {
      this.visible = true
      this.cmnodeId = cmnodeId
      this.cmnodeName = cmnodeName
      this.resetForm()

      // 设置默认唯一识别码初值
      this.currentUniqueIdNum = 1
      this.currentUniqueId = '00001'

      // 如果有项目信息，设置SNS和默认值
      if (projectInfo) {
        if (projectInfo.sns) {
          this.model.sns = projectInfo.sns
        }
        if (projectInfo.security) {
          this.model.security = projectInfo.security
        }
      }

      // 异步加载数据（不阻塞弹窗打开）
      this.loadCurrentUniqueId()
      this.loadCompanyList(projectInfo)
      this.loadProjectInfo(cmnodeId, projectInfo)
    },

    resetForm() {
      this.model = {
        sns: '',
        security: 2,
        icnType: '',
        originator: '',
        originatorName: '',
        rpc: '',
        rpcName: ''
      }
      this.fileList = []
      this.selectedFileKeys = []
      this.fileIdCounter = 1
      this.showProgress = false
      this.originatorList = []
      this.rpcList = []
    },

    // 加载单位列表
    loadCompanyList(projectInfo) {
      const projectId = projectInfo && projectInfo.projectId
      const params = { pageNo: 1, pageSize: 1000 }
      if (projectId) {
        params.pid = projectId
      }

      getAction('/ietmprojectcompany/ietmProjectCompany/list', params).then(res => {
        if (res.success && res.result && res.result.records) {
          const allCompanies = res.result.records
          // 创作单位：type=1
          this.originatorList = allCompanies.filter(item => item.type === 1)
          // 责任单位：type=2
          this.rpcList = allCompanies.filter(item => item.type === 2)

          // 自动选中项目的创作单位和责任单位
          if (projectInfo) {
            if (projectInfo.originator) {
              this.model.originator = projectInfo.originator
              this.model.originatorName = projectInfo.originatorName
            }
            if (projectInfo.rpc) {
              this.model.rpc = projectInfo.rpc
              this.model.rpcName = projectInfo.rpcName
            }
          }
        }
      }).catch(err => {
        console.error('加载单位列表失败', err)
      })
    },

    // 加载项目信息（自动生成SNS）
    loadProjectInfo(cmnodeId, projectInfo) {
      getAction('/icnmanage/ietmIcnManage/getProjectInfo', { cmnodeId }).then(res => {
        if (res.success) {
          this.model.sns = res.result.sns || ''
          if (!this.model.security && res.result.security) {
            this.model.security = res.result.security
          }
        }
      }).catch(err => {
        console.error('加载项目信息失败', err)
      })
    },

    // 创作单位选择变化
    handleOriginatorChange(value) {
      const selected = this.originatorList.find(item => item.companyCode === value)
      if (selected) {
        this.model.originator = selected.companyCode
        this.model.originatorName = selected.companyName
      }
    },

    // 责任单位选择变化
    handleRpcChange(value) {
      const selected = this.rpcList.find(item => item.companyCode === value)
      if (selected) {
        this.model.rpc = selected.companyCode
        this.model.rpcName = selected.companyName
      }
    },

    // 加载当前节点的最大唯一识别码
    loadCurrentUniqueId() {
      // 通过查询当前节点的ICN列表，获取最大的唯一识别码
      getAction('/icnmanage/ietmIcnManage/list', {
        cmnodeId: this.cmnodeId,
        pageNo: 1,
        pageSize: 1,
        column: 'uniqueId',
        order: 'desc'
      })
        .then(res => {
          if (res.success && res.result && res.result.records && res.result.records.length > 0) {
            const maxUniqueId = parseInt(res.result.records[0].uniqueId) || 0
            this.currentUniqueIdNum = maxUniqueId + 1
            this.currentUniqueId = this.formatUniqueId(this.currentUniqueIdNum)
          } else {
            // 没有记录，从1开始
            this.currentUniqueIdNum = 1
            this.currentUniqueId = '00001'
          }
        })
        .catch(() => {
          this.currentUniqueIdNum = 1
          this.currentUniqueId = '00001'
        })
    },

    // 文件上传前处理
    beforeUpload(file) {
      // 检查文件类型
      const allowedExtensions = [
        '.bmp', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff',
        '.cgm', '.svg', '.swf', '.mp3', '.mp4', '.webm', '.ogg', '.wrl', '.smg'
      ]
      const fileName = file.name.toLowerCase()
      const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext))

      if (!isAllowed) {
        this.$message.error(`不支持的文件格式！仅支持：${allowedExtensions.join(', ')}`)
        return false
      }

      // 检查文件大小（100MB）
      const isLt100M = file.size / 1024 / 1024 < 100
      if (!isLt100M) {
        this.$message.error('单个文件大小不能超过 100MB')
        return false
      }

      // 添加到文件列表
      const fileItem = {
        id: this.fileIdCounter++,
        name: file.name,
        size: file.size,
        uniqueId: this.currentUniqueIdNum + this.fileList.length,
        file: file
      }
      this.fileList.push(fileItem)

      return false // 阻止自动上传
    },

    // 格式化唯一识别码（5位补零）
    formatUniqueId(value) {
      if (!value) return '00001'
      return String(value).padStart(5, '0')
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
    },

    // 文件选择变化
    onFileSelectChange(selectedRowKeys) {
      this.selectedFileKeys = selectedRowKeys
    },

    // 上移文件
    moveUp() {
      const index = this.fileList.findIndex(f => f.id === this.selectedFileKeys[0])
      if (index > 0) {
        const temp = this.fileList[index]
        this.fileList.splice(index, 1)
        this.fileList.splice(index - 1, 0, temp)
        this.fileList = [...this.fileList] // 触发响应式更新
      }
    },

    // 下移文件
    moveDown() {
      const index = this.fileList.findIndex(f => f.id === this.selectedFileKeys[0])
      if (index >= 0 && index < this.fileList.length - 1) {
        const temp = this.fileList[index]
        this.fileList.splice(index, 1)
        this.fileList.splice(index + 1, 0, temp)
        this.fileList = [...this.fileList] // 触发响应式更新
      }
    },

    // 删除文件
    removeFile(record) {
      const index = this.fileList.findIndex(f => f.id === record.id)
      if (index > -1) {
        this.fileList.splice(index, 1)
        // 如果删除的是选中的文件，清空选中
        if (this.selectedFileKeys[0] === record.id) {
          this.selectedFileKeys = []
        }
      }
    },

    // 重新填充唯一识别码
    // 校验唯一识别码
    validateUniqueIds() {
      const uniqueIds = this.fileList.map(f => f.uniqueId)
      const duplicates = uniqueIds.filter((id, index) => uniqueIds.indexOf(id) !== index)

      if (duplicates.length > 0) {
        this.$message.warning('存在重复的唯一识别码，请检查')
        return false
      }

      for (let i = 0; i < this.fileList.length; i++) {
        if (this.fileList[i].uniqueId < this.currentUniqueIdNum) {
          this.$message.warning(`第${i + 1}行的唯一识别码小于初始值${this.currentUniqueId}`)
          return false
        }
      }

      return true
    },

    // 提交保存
    handleOk() {
      // 验证表单
      if (!this.model.security) {
        this.$message.warning('请选择密级')
        return
      }

      if (!this.model.originator) {
        this.$message.warning('请选择创作单位')
        return
      }

      if (!this.model.rpc) {
        this.$message.warning('请选择责任单位')
        return
      }

      if (this.fileList.length === 0) {
        this.$message.warning('请选择实体文件')
        return
      }

      // 校验唯一识别码
      if (!this.validateUniqueIds()) {
        return
      }

      // 开始上传
      this.confirmLoading = true
      this.showProgress = true
      this.progress = {
        current: 0,
        total: this.fileList.length,
        status: 'active'
      }

      this.uploadFiles()
    },

    // 批量上传文件
    async uploadFiles() {
      try {
        // 批量上传：循环调用单个新增接口
        this.progress.current = 0
        this.progress.total = this.fileList.length
        this.progress.status = 'active'

        let successCount = 0
        let failCount = 0
        const errors = []

        for (let i = 0; i < this.fileList.length; i++) {
          const fileItem = this.fileList[i]

          try {
            // 构建单个文件的FormData
            const formData = new FormData()

            // 添加表单字段
            formData.append('cmnodeId', this.cmnodeId)
            formData.append('sns', this.model.sns || '')
            formData.append('uniqueId', this.formatUniqueId(fileItem.uniqueId))
            formData.append('variantCode', 'A')
            formData.append('issueNo', '001')
            formData.append('security', this.model.security)
            formData.append('icnType', this.model.icnType || '')
            formData.append('originator', this.model.originator)
            formData.append('originatorName', this.model.originatorName || '')
            formData.append('rpc', this.model.rpc)
            formData.append('rpcName', this.model.rpcName || '')

            // 添加文件
            formData.append('files', fileItem.file)

            // 调用单个新增接口
            const res = await uploadAction('/icnmanage/ietmIcnManage/add', formData)

            if (res.success) {
              successCount++
            } else {
              failCount++
              errors.push(`${fileItem.name}: ${res.message || '上传失败'}`)
            }
          } catch (err) {
            failCount++
            errors.push(`${fileItem.name}: ${err.message || '上传异常'}`)
          }

          // 更新进度
          this.progress.current = i + 1
        }

        // 上传完成
        if (failCount === 0) {
          this.progress.status = 'success'
          this.$message.success(`批量上传成功，共创建 ${successCount} 条ICN记录`)

          setTimeout(() => {
            this.handleCancel()
            this.$emit('ok')
          }, 1000)
        } else if (successCount === 0) {
          this.progress.status = 'exception'
          this.$message.error('批量上传失败，所有文件都上传失败')
          console.error('上传错误详情：', errors)
        } else {
          this.progress.status = 'exception'
          this.$message.warning(`批量上传部分成功：成功 ${successCount} 个，失败 ${failCount} 个`)
          console.error('上传错误详情：', errors)
        }
      } catch (err) {
        console.error('批量上传异常', err)
        this.progress.status = 'exception'
        this.$message.error('批量上传失败：' + (err.message || '未知错误'))
      } finally {
        this.confirmLoading = false
      }
    },

    handleCancel() {
      this.visible = false
      this.showProgress = false
      this.resetForm()
    }
  }
}
</script>

<style scoped>
/* 表格优化 */
::v-deep .ant-table-small {
  font-size: 13px;
}

/* 表单项间距优化 */
::v-deep .ant-form-item {
  margin-bottom: 16px;
}

/* 表格单元格内边距 */
::v-deep .ant-table-small > .ant-table-content > .ant-table-body > table > .ant-table-tbody > tr > td,
::v-deep .ant-table-small > .ant-table-content > .ant-table-header > table > .ant-table-thead > tr > th {
  padding: 8px 8px;
}

/* 单选框列居中 */
::v-deep .ant-table-selection-column {
  text-align: center;
  padding: 8px 8px !important;
}

/* 表格边框 */
::v-deep .ant-table-bordered .ant-table-thead > tr > th,
::v-deep .ant-table-bordered .ant-table-tbody > tr > td {
  border-right: 1px solid #e8e8e8;
}

/* 表头样式 */
::v-deep .ant-table-thead > tr > th {
  background: #fafafa;
  font-weight: 600;
}

/* 输入框宽度 */
::v-deep .ant-input-number-small {
  width: 100%;
}
</style>
