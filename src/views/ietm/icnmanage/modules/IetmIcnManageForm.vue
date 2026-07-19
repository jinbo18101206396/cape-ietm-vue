<template>
  <a-form-model ref="form" :model="model" :rules="validatorRules" :label-col="labelCol" :wrapper-col="wrapperCol">
    <a-row :gutter="16">
      <!-- SNS编码 -->
      <a-col :span="12">
        <a-form-model-item label="SNS编码" prop="sns">
          <a-input v-model="model.sns" placeholder="自动生成" disabled />
        </a-form-model-item>
      </a-col>

      <!-- 唯一识别码 -->
      <a-col :span="12">
        <a-form-model-item label="唯一识别码" prop="uniqueId">
          <a-input v-model="model.uniqueId" placeholder="自动生成" disabled />
        </a-form-model-item>
      </a-col>

      <!-- 变量码 -->
      <a-col :span="12">
        <a-form-model-item label="变量码" prop="variantCode">
          <a-input v-model="model.variantCode" placeholder="请输入变量码（A-Z）" :maxLength="1" />
        </a-form-model-item>
      </a-col>

      <!-- 版本号 -->
      <a-col :span="12">
        <a-form-model-item label="版本号" prop="issueNo">
          <a-input v-model="model.issueNo" placeholder="请输入版本号" :maxLength="3" />
        </a-form-model-item>
      </a-col>

      <!-- 密级 -->
      <a-col :span="12">
        <a-form-model-item label="密级" prop="security">
          <a-select v-model="model.security" placeholder="请选择密级">
            <a-select-option :value="1">公开</a-select-option>
            <a-select-option :value="2">内部</a-select-option>
            <a-select-option :value="3">秘密</a-select-option>
            <a-select-option :value="4">机密</a-select-option>
          </a-select>
        </a-form-model-item>
      </a-col>

      <!-- ICN分类 -->
      <a-col :span="12">
        <a-form-model-item label="ICN分类" prop="icnType">
          <a-input v-model="model.icnType" placeholder="请输入ICN分类" />
        </a-form-model-item>
      </a-col>

      <!-- 创作单位 -->
      <a-col :span="24">
        <a-form-model-item label="创作单位" prop="originatorName">
          <a-select
            v-model="model.originator"
            placeholder="请选择创作单位"
            show-search
            option-filter-prop="children"
            @change="handleOriginatorChange"
          >
            <a-select-option v-for="item in originatorList" :key="item.companyCode" :value="item.companyCode">
              {{ item.companyName }}
            </a-select-option>
          </a-select>
        </a-form-model-item>
      </a-col>

      <!-- 责任单位 -->
      <a-col :span="24">
        <a-form-model-item label="责任单位" prop="rpcName">
          <a-select
            v-model="model.rpc"
            placeholder="请选择责任单位"
            show-search
            option-filter-prop="children"
            @change="handleRpcChange"
          >
            <a-select-option v-for="item in rpcList" :key="item.companyCode" :value="item.companyCode">
              {{ item.companyName }}
            </a-select-option>
          </a-select>
        </a-form-model-item>
      </a-col>

      <!-- 文件上传（仅新增时显示） -->
      <a-col :span="24" v-if="!model.id">
        <a-form-model-item label="实体文件" prop="files">
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
          <div class="upload-tips">支持格式：图片(.bmp .jpg .jpeg .png .gif .tif .tiff .cgm .svg)、动画(.swf)、音视频(.mp3 .mp4 .webm .ogg)、3D(.wrl .smg)</div>
        </a-form-model-item>
      </a-col>
    </a-row>
  </a-form-model>
</template>

<script>
import { getAction, postAction, httpAction } from '@/api/manage'

export default {
  name: 'IetmIcnManageForm',
  components: {},
  data() {
    return {
      labelCol: { span: 6 },
      wrapperCol: { span: 18 },
      model: {
        cmnodeId: '',
        sns: '',
        uniqueId: '',
        variantCode: 'A',
        issueNo: '001',
        security: undefined,
        icnType: '',
        originator: '',
        originatorName: '',
        rpc: '',
        rpcName: ''
      },
      fileList: [],
      originatorList: [], // 创作单位列表
      rpcList: [], // 责任单位列表
      validatorRules: {
        variantCode: [
          { required: true, message: '请输入变量码' },
          { pattern: /^[A-Z]$/, message: '变量码必须为A-Z大写字母' }
        ],
        issueNo: [
          { required: true, message: '请输入版本号' },
          { pattern: /^\d{3}$/, message: '版本号必须为3位数字' }
        ],
        security: [
          { required: true, message: '请选择密级' }
        ],
        originatorName: [
          { required: true, message: '请选择创作单位' }
        ],
        rpcName: [
          { required: true, message: '请选择责任单位' }
        ]
      },
      url: {
        add: '/icnmanage/ietmIcnManage/add',
        edit: '/icnmanage/ietmIcnManage/edit',
        getProjectInfo: '/icnmanage/ietmIcnManage/getProjectInfo',
        companyList: '/ietmprojectcompany/ietmProjectCompany/list'
      }
    }
  },
  methods: {
    add(cmnodeId, projectInfo) {
      this.reset()
      this.model.cmnodeId = cmnodeId
      this.loadCompanyList(projectInfo)
      this.loadProjectInfo(cmnodeId, projectInfo)
    },
    edit(record) {
      this.reset()
      this.model = Object.assign({}, record)
      // 编辑模式也需要加载单位列表
      this.loadCompanyList()
    },
    reset() {
      this.model = {
        cmnodeId: '',
        sns: '',
        uniqueId: '',
        variantCode: 'A',
        issueNo: '001',
        security: undefined,
        icnType: '',
        originator: '',
        originatorName: '',
        rpc: '',
        rpcName: ''
      }
      this.fileList = []
      this.originatorList = []
      this.rpcList = []
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    // 加载单位列表
    loadCompanyList(projectInfo) {
      getAction(this.url.companyList, { pageNo: 1, pageSize: 1000 }).then(res => {
        if (res.success && res.result && res.result.records) {
          const allCompanies = res.result.records
          // 创作单位：type=1
          this.originatorList = allCompanies.filter(item => item.type === 1)
          // 责任单位：type=2
          this.rpcList = allCompanies.filter(item => item.type === 2)
        }
      })
    },
    // 加载项目信息
    loadProjectInfo(cmnodeId, projectInfo) {
      getAction(this.url.getProjectInfo, { cmnodeId }).then(res => {
        if (res.success) {
          this.model.sns = res.result.sns
          this.model.uniqueId = res.result.uniqueId
          this.model.security = res.result.security

          // 设置默认创作单位和责任单位（如果projectInfo传递了）
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
      return false // 阻止自动上传
    },
    // 文件移除
    handleRemove(file) {
      const index = this.fileList.indexOf(file)
      const newFileList = this.fileList.slice()
      newFileList.splice(index, 1)
      this.fileList = newFileList
    },
    // 表单提交验证
    handleSubmit(callback) {
      this.$refs.form.validate(valid => {
        if (valid) {
          callback(this.model, this.fileList)
        }
      })
    },
    // 提交表单
    submitForm(formData, fileList) {
      return new Promise((resolve, reject) => {
        if (formData.id) {
          // 编辑：使用JSON格式（不支持文件上传）
          const editData = { ...formData }
          httpAction(this.url.edit, editData, 'put').then(res => {
            if (res.success) {
              resolve()
            } else {
              reject(new Error(res.message))
            }
          }).catch(err => {
            reject(err)
          })
        } else {
          // 新增：使用FormData格式（支持文件上传）
          const form = new FormData()

          // 添加表单字段
          Object.keys(formData).forEach(key => {
            if (formData[key] !== undefined && formData[key] !== null) {
              form.append(key, formData[key])
            }
          })

          // 添加文件
          fileList.forEach(file => {
            form.append('files', file)
          })

          httpAction(this.url.add, form, 'post').then(res => {
            if (res.success) {
              resolve()
            } else {
              reject(new Error(res.message))
            }
          }).catch(err => {
            reject(err)
          })
        }
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

