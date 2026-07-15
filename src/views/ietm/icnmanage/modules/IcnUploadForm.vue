<template>
  <a-spin :spinning="confirmLoading">
    <j-form-container :disabled="formDisabled">
      <a-form-model ref="form" :model="model" :rules="validatorRules" slot="detail">
        <span style="font-size: 18px;">{{tips}}</span>
        <a-row>
          <a-col :span="12">
            <a-form-model-item label="密级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="security">
              <j-dict-select-tag type="list" v-model="model.security" dictCode="security" disabled placeholder="请选择密级" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="SNS" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="sns">
              <a-input v-model="model.sns" placeholder="请输入SNS" disabled></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="唯一识别码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="uniqueId">
              <a-input v-model="model.uniqueId" placeholder="请输入唯一识别码" disabled></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="变量码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="variantCode">
              <a-input v-model="model.variantCode" placeholder="请输入变量码" disabled></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="版本号" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="issueNo">
              <a-input v-model="model.issueNo" placeholder="请输入版本号" disabled></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="安全等级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="securityClassification">
              <j-dict-select-tag type="list" v-model="model.securityClassification" dictCode="security" disabled placeholder="请选择安全等级" />
            </a-form-model-item>
          </a-col>

          <a-col :span="12">
            <a-form-model-item label="分类" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="icnType">
              <j-dict-select-tag type="list" v-model="model.icnType" dictCode="security" disabled placeholder="请选择分类" />
            </a-form-model-item>
          </a-col>

          <a-col :span="12">
            <a-form-model-item label="文件名称" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="fileName">
              <a-input v-model="model.ietmAttachment.fileName" placeholder="请输入文件名称" disabled></a-input>
            </a-form-model-item>
          </a-col>


          <a-col :span="12">
            <a-form-model-item label="相关文件" :labelCol="labelCol" :wrapperCol="wrapperCol">
              <a-upload
                :before-upload="beforeUpload"
                :file-list="fileList"
                :multiple="false"
                :disabled="disabled"
                :remove="handleRemove"
              >
                <a-button style="text-align: center;">
                  <a-icon type="upload" />
                  选择文件
                </a-button>
              </a-upload>
            </a-form-model-item>
          </a-col>
        </a-row>
      </a-form-model>
    </j-form-container>
  </a-spin>
</template>

<script>

import { getAction, postAction } from '@/api/manage'
import { filterObj } from '@/utils/util'

export default {
  name: 'IcnUploadForm',
  components: {},
  props: {
    tips:{
      type: String,
      default: false,
    },
    //表单禁用
    disabled: {
      type: Boolean,
      default: false,
      required: false
    }
  },
  data() {
    return {
      type:'',
      projectId:'',
      cmnodeId: '',
      fileList: [],
      params_originator: {},
      params_rpc: {},
      model: {},
      labelCol: {
        xs: { span: 24 },
        sm: { span: 5 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 }
      },
      confirmLoading: false,
      validatorRules: {
        security: [
          { required: true, message: '请输入密级!' }
        ]
      },
      url: {
        relatedFilesAdd: '/icnmanage/ietmIcnManage/relatedFilesAdd',
        newFilesAdd: '/icnmanage/ietmIcnManage/newFilesAdd',
        diffFilesAdd: '/icnmanage/ietmIcnManage/diffFilesAdd',
        getUniqueId:'/icnmanage/ietmIcnManage/getUniqueId',
      }
    }
  },
  computed: {
    formDisabled() {
      return this.disabled
    }
  },
  created() {
    //备份model原始值
    this.modelDefault = JSON.parse(JSON.stringify(this.model))
  },
  methods: {
    handleRemove(file) {
      const index = this.fileList.indexOf(file)
      const newFileList = this.fileList.slice()
      newFileList.splice(index, 1)
      this.fileList = newFileList
    },
    beforeUpload(file) {
      this.fileList = []
      this.fileList = [...this.fileList, file]
      return false
    },

    add(icnModel,type) {
      this.type = type;
      this.modelDefault = JSON.parse(JSON.stringify(icnModel))
      this.edit(this.modelDefault)
    },
    edit(record) {
      //差异码重置成A
      if (this.type=="related"){
        record.variantCode='A'
        this.model = Object.assign({}, record)
        this.visible = true
      }
      //差异码加1, 唯一识别码加1
      if (this.type=="diff"){
        getAction(this.url.getUniqueId, { cmnodeId:record.cmnodeId }).then(res => {
          if (res.success) {
            record.uniqueId = res.result;
            record.variantCode= String.fromCharCode(record.variantCode.charCodeAt(0) + 1);
            this.model = Object.assign({}, record)
            this.visible = true
          } else {
            this.$error({title: '查询项目信息失败！', content: res.message})
          }
        })
      }
      if (this.type=="new"){
        this.model = Object.assign({}, record)
        this.visible = true
      }
    },
    submitForm() {
      const { fileList } = this
      if(fileList.length == 0) {
        this.$message.warning('请上传文件！')
        return
      }
      const formData = new FormData()
      fileList.forEach(file => {
        formData.append('files', file)
      })
      const that = this
      if (this.type=="related"){
        this.confirmLoading = true
        postAction(this.url.relatedFilesAdd + '?id=' + this.model.id, formData).then((res) => {
          if (res.success) {
            this.fileList = []
            this.$message.success('文件上传成功')
            that.$emit('ok')
          } else {
            this.$message.error(res.message)
          }
        }).finally(() => {
          this.confirmLoading = false
        })
      }
      if (this.type=="diff"){
        this.confirmLoading = true
        postAction(this.url.diffFilesAdd + '?id=' +this.model.id
          + '&uniqueId=' + this.model.uniqueId
          + '&variantCode=' + this.model.variantCode
          , formData).then((res) => {
          if (res.success) {
            this.fileList = []
            this.$message.success('文件上传成功')
            that.$emit('ok')
          } else {
            this.$message.error(res.message)
          }
        }).finally(() => {
          this.confirmLoading = false
        })
      }
      if (this.type=="new"){
        this.confirmLoading = true
        postAction(this.url.newFilesAdd + '?id=' + this.model.id, formData).then((res) => {
          if (res.success) {
            this.fileList = []
            this.$message.success('文件上传成功')
            that.$emit('ok')
          } else {
            this.$message.error(res.message)
          }
        }).finally(() => {
          this.confirmLoading = false
        })
      }
    },
    popupCallback(value, row) {
      this.model = Object.assign(this.model, row),
        this.params_originator.type = 1
      this.params_rpc.type = 2
    }
  }
}
</script>