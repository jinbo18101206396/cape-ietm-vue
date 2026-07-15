<template>
  <a-spin :spinning="confirmLoading">
    <j-form-container :disabled="formDisabled">
      <a-form-model ref="form" :model="model" :rules="validatorRules" slot="detail">
        <a-row>
          <a-col :span="12">
            <a-form-model-item label="ICN" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="icn">
              <a-input v-model="model.icn" placeholder="" disabled></a-input>
            </a-form-model-item>
          </a-col>

        </a-row>
        <a-row>
          <a-col :span="12">
            <a-form-model-item label="密级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="security">
              <j-dict-select-tag type="list" v-model="model.security" dictCode="security" disabled placeholder="请选择密级" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="唯一识别码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="uniqueId">
              <a-input v-model="model.uniqueId" placeholder="请输入唯一识别码" disabled></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="SNS" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="sns">
              <a-input v-model="model.sns" placeholder="请输入SNS" disabled></a-input>
            </a-form-model-item>
          </a-col>

          <a-col :span="12">
            <a-form-model-item label="分类" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="icnType">
              <j-dict-select-tag type="list" v-model="model.icnType" dictCode="security" disabled placeholder="请选择分类" />
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
            <a-form-model-item label="实体文件" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="fileName">
              <a-input v-model="model.ietmAttachment.fileName" placeholder="" disabled></a-input>
            </a-form-model-item>
          </a-col>

          <a-col :span="12">
            <a-form-model-item label="相关文件" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="fileName">
              <a-input v-model="model.relatedIetmAttachment.fileName" placeholder="" disabled></a-input>
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
  name: 'IcnInfoForm',
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

    add(icnModel) {
      icnModel.variantCode='A'
      this.modelDefault = JSON.parse(JSON.stringify(icnModel))
      this.edit(this.modelDefault)
    },
    edit(record) {
      this.model = Object.assign({}, record)
      this.visible = true
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
      this.confirmLoading = true
      const that = this
      // 触发表单验证
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
    },
    popupCallback(value, row) {
      this.model = Object.assign(this.model, row),
        this.params_originator.type = 1
      this.params_rpc.type = 2
    }
  }
}
</script>