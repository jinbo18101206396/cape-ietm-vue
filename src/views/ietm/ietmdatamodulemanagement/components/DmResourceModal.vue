<template>
  <div>
    <a-drawer
      :title="title"
      :width="800"
      :visible="visible"
      :body-style="{ paddingBottom: '80px' }"
      @close="handleClose"
    >
      <div class="dm-resource-container">
        <!-- 工具栏 -->
        <div class="toolbar">
          <a-space>
            <a-button type="primary" icon="plus" @click="handleAddResource">添加资源</a-button>
            <a-button icon="reload" @click="loadResources">刷新</a-button>
          </a-space>
        </div>

        <!-- 资源列表 -->
        <a-table
          :columns="columns"
          :data-source="resources"
          :loading="loading"
          :pagination="false"
          row-key="id"
          size="small"
        >
          <span slot="filename" slot-scope="text">
            <a-icon type="paper-clip" /> {{ text }}
          </span>

          <span slot="operatetime" slot-scope="text">
            {{ text ? text.substring(0, 10) : '' }}
          </span>

          <span slot="action" slot-scope="text, record">
            <a @click="downloadFile(record)">
              <a-icon type="download" /> 下载
            </a>
          </span>
        </a-table>
      </div>
    </a-drawer>

    <!-- 添加资源对话框 -->
    <a-modal
      title="添加资源"
      :visible="resourceModalVisible"
      :confirm-loading="resourceModalLoading"
      @ok="handleResourceModalOk"
      @cancel="handleResourceModalCancel"
    >
      <a-form-model ref="resourceForm" :model="resourceForm" :rules="resourceRules" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-model-item label="资源名称" prop="resourceName">
          <a-input v-model="resourceForm.resourceName" placeholder="请输入资源名称" />
        </a-form-model-item>

        <a-form-model-item label="上传文件" prop="file">
          <a-upload
            :file-list="fileList"
            :before-upload="beforeUpload"
            :remove="handleRemoveFile"
            accept="*"
          >
            <a-button><a-icon type="upload" /> 选择文件</a-button>
          </a-upload>
        </a-form-model-item>

        <a-form-model-item label="说明" prop="comment">
          <a-textarea v-model="resourceForm.comment" :rows="4" placeholder="请输入说明" />
        </a-form-model-item>
      </a-form-model>
    </a-modal>

    <!-- 编辑资源对话框 -->
    <a-modal
      title="编辑资源说明"
      :visible="editModalVisible"
      :confirm-loading="editModalLoading"
      @ok="handleEditModalOk"
      @cancel="handleEditModalCancel"
    >
      <a-form-model ref="editForm" :model="editForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-model-item label="资源名称">
          <a-input v-model="editForm.resourceName" disabled />
        </a-form-model-item>

        <a-form-model-item label="文件名称">
          <a-input v-model="editForm.fileName" disabled />
        </a-form-model-item>

        <a-form-model-item label="说明">
          <a-textarea v-model="editForm.remark" :rows="4" placeholder="请输入说明" />
        </a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>

<script>
import { getAction, postAction, deleteAction, uploadAction } from '@/api/manage'
import { axios } from '@/utils/request'

export default {
  name: 'DmResourceModal',
  data() {
    return {
      title: 'DM资源管理',
      visible: false,
      loading: false,
      dmId: '',
      resources: [],

      // 添加资源模态框
      resourceModalVisible: false,
      resourceModalLoading: false,
      resourceForm: {
        resourceName: '',
        comment: '',
        file: null
      },
      resourceRules: {
        resourceName: [{ required: true, message: '请输入资源名称', trigger: 'blur' }],
        file: [{ required: true, message: '请上传文件', trigger: 'change' }]
      },
      fileList: [],

      // 编辑资源模态框
      editModalVisible: false,
      editModalLoading: false,
      editForm: {
        id: '',
        resourceName: '',
        fileName: '',
        remark: ''
      },

      columns: [
        { title: '#', dataIndex: '', width: 50, align: 'center',
          customRender: (t, r, index) => index + 1 },
        { title: '资源名称', dataIndex: 'resourceName', width: 150, ellipsis: true },
        { title: '文件名', dataIndex: 'fileName', width: 200, ellipsis: true,
          scopedSlots: { customRender: 'filename' } },
        { title: '文件大小', dataIndex: 'fileSize', width: 100, align: 'center',
          customRender: (text) => {
            if (!text) return '-'
            const size = parseInt(text)
            if (size < 1024) return size + ' B'
            if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
            if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(2) + ' MB'
            return (size / 1024 / 1024 / 1024).toFixed(2) + ' GB'
          }
        },
        { title: '说明', dataIndex: 'remark', width: 250, ellipsis: true },
        { title: '操作人', dataIndex: 'operator', width: 100, align: 'center' },
        { title: '操作时间', dataIndex: 'operateTime', width: 150, align: 'center',
          scopedSlots: { customRender: 'operatetime' } },
        { title: '操作', dataIndex: 'action', width: 120, align: 'center', fixed: 'right',
          scopedSlots: { customRender: 'action' } }
      ]
    }
  },
  methods: {
    show(dmId, moduleName) {
      this.dmId = dmId
      this.title = `DM资源管理 - ${moduleName || ''}`
      this.visible = true
      this.loadResources()
    },

    // 添加资源 - 从列表页直接调用
    add(dmId, moduleName) {
      this.dmId = dmId
      this.title = `添加资源 - ${moduleName || ''}`
      // 直接打开添加资源对话框，不显示Drawer
      this.resourceForm = {
        resourceName: '',
        comment: '',
        file: null
      }
      this.fileList = []
      this.resourceModalVisible = true
    },

    handleClose() {
      this.visible = false
      this.resources = []
      this.$emit('ok')
    },

    loadResources() {
      this.loading = true
      getAction('/ietm/datamodule/queryDmResources', { dmId: this.dmId })
        .then(res => {
          if (res.success) {
            this.resources = res.result || []
            // console.log('========== DM资源列表数据 ==========')
            // console.log('数据总数:', this.resources.length)
            // console.log('完整数据:', JSON.stringify(this.resources, null, 2))
            if (this.resources.length > 0) {
              // console.log('第一条资源详情:', this.resources[0])
              // console.log('关键字段值:')
              // console.log('  - resourceName:', this.resources[0].resourceName)
              // console.log('  - fileName:', this.resources[0].fileName)
              // console.log('  - fileSize:', this.resources[0].fileSize)
              // console.log('  - remark:', this.resources[0].remark)
              // console.log('  - operator:', this.resources[0].operator)
              // console.log('  - operateTime:', this.resources[0].operateTime)
              // console.log('  - filePath:', this.resources[0].filePath)
            }
            // console.log('====================================')
          } else {
            console.error('查询资源列表失败:', res.message)
          }
        })
        .catch(err => {
          console.error('查询资源列表异常:', err)
        })
        .finally(() => {
          this.loading = false
        })
    },

    handleAddResource() {
      this.resourceForm = {
        resourceName: '',
        comment: '',
        file: null
      }
      this.fileList = []
      this.resourceModalVisible = true
    },

    beforeUpload(file) {
      this.fileList = [file]
      this.resourceForm.file = file
      return false // 阻止自动上传
    },

    handleRemoveFile() {
      this.fileList = []
      this.resourceForm.file = null
    },

    handleResourceModalOk() {
      this.$refs.resourceForm.validate(valid => {
        if (!valid) {
          this.$message.warning('请完善表单信息')
          return
        }

        this.resourceModalLoading = true

        // 添加资源 - 分两步：1. 上传文件获取fileId  2. 保存资源记录
        const formData = new FormData()
        formData.append('file', this.resourceForm.file)
        formData.append('biz', 'resource')  // 指定保存到 resource 子目录

        const fileSize = this.resourceForm.file.size // 获取文件大小

        // console.log('开始上传文件:', this.resourceForm.file.name, '大小:', fileSize)

        // 第一步：上传文件
        uploadAction('/sys/common/upload', formData)
          .then(uploadRes => {
            // console.log('上传文件响应:', uploadRes)
            if (uploadRes.success) {
              const fileId = uploadRes.message // 文件路径在message字段中
              // console.log('文件上传成功，fileId:', fileId)

              // 第二步：保存资源记录 - 使用URL参数
              const params = new URLSearchParams()
              params.append('dmId', this.dmId)
              params.append('fileId', fileId)
              params.append('resourceName', this.resourceForm.resourceName)
              params.append('fileSize', fileSize)
              params.append('comment', this.resourceForm.comment || '')

              // console.log('========== 保存资源记录 ==========')
              // console.log('参数详情:', {
              //   dmId: this.dmId,
              //   fileId: fileId,
              //   resourceName: this.resourceForm.resourceName,
              //   fileSize: fileSize,
              //   comment: this.resourceForm.comment
              // })
              // console.log('URLSearchParams:', params.toString())
              // console.log('===================================')

              return axios.post('/ietm/datamodule/saveDmResource', params)
            } else {
              throw new Error(uploadRes.message || '文件上传失败')
            }
          })
          .then(res => {
            // console.log('保存资源记录响应:', res)
            if (res && res.success) {
              this.$message.success('添加成功')
              this.resourceModalVisible = false
              // 通知父组件刷新
              this.$emit('ok')
              // 如果抽屉打开，刷新列表
              if (this.visible) {
                this.loadResources()
              }
            } else {
              const errorMsg = (res && res.message) || '添加失败'
              console.error('保存资源失败:', errorMsg, res)
              this.$message.error(errorMsg)
            }
          })
          .catch(err => {
            console.error('添加资源失败 - 完整错误:', err)
            console.error('错误响应:', err.response)
            this.$message.error('添加资源失败：' + (err.message || '网络异常'))
          })
          .finally(() => {
            this.resourceModalLoading = false
          })
      })
    },

    handleResourceModalCancel() {
      this.resourceModalVisible = false
    },

    downloadFile(record) {
      if (!record.filePath) {
        this.$message.warning('文件不存在')
        return
      }

      // 不要添加 /jeecg-boot 前缀，因为 axios 的 baseURL 已经包含了
      const pathParts = record.filePath.split('/')
      const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/')
      const url = `/sys/common/static/${encodedPath}`
      const fileName = record.fileName || 'download'

      // 显示下载提示
      const hide = this.$message.loading('正在下载文件...', 0)

      // 使用 axios 以 blob 方式下载文件
      axios({
        url: url,
        method: 'GET',
        responseType: 'blob'
      }).then(response => {
        hide()

        // 判断 response 是标准 axios 响应还是已经被拦截器处理过的 Blob
        let blob
        if (response instanceof Blob) {
          // 响应已经是 Blob 对象（被拦截器处理过）
          blob = response
        } else if (response.data instanceof Blob) {
          // 标准 axios 响应，data 是 Blob
          blob = response.data
        } else if (response.data) {
          // data 存在但不是 Blob，尝试创建 Blob
          blob = new Blob([response.data])
        } else {
          // 完全没有数据
          this.$message.error('下载失败：响应数据为空')
          return
        }

        // 创建临时 URL
        const downloadUrl = window.URL.createObjectURL(blob)

        // 创建隐藏的 a 标签并触发下载
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()

        // 清理
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        this.$message.success('下载成功')
      }).catch(err => {
        hide()
        console.error('下载失败:', err)
        if (err.response && err.response.status === 404) {
          this.$message.error('文件不存在或已被删除')
        } else {
          this.$message.error('下载失败：' + (err.message || '网络异常'))
        }
      })
    },

    // 编辑资源 - 从列表页调用
    edit(record) {
      this.editForm = {
        id: record.id,
        resourceName: record.resourceName,
        fileName: record.fileName,
        remark: record.remark || ''
      }
      this.editModalVisible = true
    },

    handleEditModalOk() {
      this.editModalLoading = true
      const params = new URLSearchParams()
      params.append('id', this.editForm.id)
      params.append('comment', this.editForm.remark || '')

      axios.post('/ietm/datamodule/updateDmResource', params)
        .then(res => {
          if (res && res.success) {
            this.$message.success('编辑成功')
            this.editModalVisible = false
            this.$emit('ok')
          } else {
            this.$message.error((res && res.message) || '编辑失败')
          }
        })
        .catch(err => {
          this.$message.error('编辑失败：' + (err.message || '网络异常'))
        })
        .finally(() => {
          this.editModalLoading = false
        })
    },

    handleEditModalCancel() {
      this.editModalVisible = false
    }
  }
}
</script>

<style lang="less" scoped>
.dm-resource-container {
  .toolbar {
    margin-bottom: 16px;
  }
}
</style>
