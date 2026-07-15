<template>
  <a-spin :spinning="confirmLoading">
    <j-form-container :disabled="formDisabled">
      <a-form-model ref="form" :model="model" :rules="validatorRules" slot="detail">
        <a-row>
          <a-col :span="12">
            <a-form-model-item label="密级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="security">
              <j-dict-select-tag type="list" v-model="model.security" dictCode="security" placeholder="请选择密级" />
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
              <j-dict-select-tag type="list" v-model="model.icnType" dictCode="security" placeholder="请选择分类" />
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
            <a-form-model-item label="创作单位" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="originatorName">
              <j-popup
                v-model="model.originatorName"
                field="originatorName"
                org-fields="company_code,company_name"
                dest-fields="originator,originatorName"
                code="ietm_project_company"
                :multi="false"
                :param="params_originator"
                @input="popupCallback"
              />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="责任单位" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="rpcName">
              <j-popup
                v-model="model.rpcName"
                field="rpcName"
                org-fields="company_agent_code,company_name"
                dest-fields="rpc,rpcName"
                code="ietm_project_company"
                :multi="false"
                :param="params_rpc"
                @input="popupCallback"
              />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="实体文件" :labelCol="labelCol" :wrapperCol="wrapperCol">
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
        <a-row>
          <a-col :span="24">
            <span style="color: red">【文件类型】	.bmp.jpg.jpeg.png.gif.tif.tiff.cgm.svg.swf.mp3.mp4.webm.ogg.wrl.smg</span>
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
  name: 'IetmIcnManageForm',
  components: {},
  props: {
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
        originatorName: [
          { required: true, message: '请选择创作单位!' }
        ],
        rpcName: [
          { required: true, message: '请选择责任单位!' }
        ],
        security: [
          { required: true, message: '请输入密级!' }
        ]
      },
      url: {
        add: '/icnmanage/ietmIcnManage/fileAdd',
        edit: '/icnmanage/ietmIcnManage/edit',
        queryById: '/icnmanage/ietmIcnManage/queryById',
        getProject:'/icnmanage/ietmIcnManage/getProject'
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

    add(cmnodeId) {
      this.model.variantCode = 'A' ;
      this.model.issueNo = '001';
      getAction(this.url.getProject, { cmnodeId:cmnodeId }).then(res => {
        if (res.success) {
          this.projectId = res.result.id;
          this.model.security =  res.result.security;
          this.model.uniqueId = res.result.uniqueId;
          this.model.sns = res.result.sns;
          this.model.cmnodeId = cmnodeId
          this.params_originator = { 'type': '1','pid': this.projectId}
          this.params_rpc = { 'type': '2','pid': this.projectId }
          this.cmnodeId = cmnodeId
          this.modelDefault = JSON.parse(JSON.stringify(this.model))
          this.edit(this.modelDefault)
        } else {
          this.$error({title: '查询项目信息失败！', content: res.message})
        }
      })
    },
    edit(record) {
      // if (!this.projectId){
      //   getAction(this.url.getProject, { cmnodeId:record.cmnodeId }).then(res => {
      //     if (res.success) {
      //       //回显附件
      //       this.fileList=[{
      //         uid:record.ietmAttachment.fileKey,
      //         name:record.ietmAttachment.fileName,
      //         status:'done',
      //         // url:window._CONFIG['videoDomainURL'] + "/" + record.ietmAttachment.fileKey + "?isEncryption=true"
      //       }]
      //       this.projectId = res.result.id;
      //       this.params_originator = { 'type': '1','pid': this.projectId}
      //       this.params_rpc = { 'type': '2','pid': this.projectId }
      //       this.model = Object.assign({}, record)
      //       this.visible = true
      //     } else {
      //       this.$error({title: '查询项目信息失败！', content: res.message})
      //     }
      //   })
      // }else {
      //   this.params_originator = { 'type': '1','pid': this.projectId}
      //   this.params_rpc = { 'type': '2','pid': this.projectId }
      //   this.model = Object.assign({}, record)
      //   this.visible = true
      // }
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
      const that = this
      // 触发表单验证
      this.$refs.form.validate(valid => {
        if (valid) {
          that.confirmLoading = true
          let httpurl = ''
          let method = ''
          if (!this.model.id) {
            httpurl += this.url.add
            method = 'post'
          } else {
            httpurl += this.url.edit
            method = 'put'
          }
          postAction(httpurl + '?security=' + parseInt(this.model.security)
            + '&cmnodeId=' + this.model.cmnodeId
            + '&uniqueId=' + this.model.uniqueId
            + '&sns=' + this.model.sns
            +  (!this.model.icnType ?  "" :'&icnType=' + this.model.icnType )
            + '&variantCode=' + this.model.variantCode
            + '&issueNo=' + this.model.issueNo
            + '&originator=' + this.model.originator
            + '&originatorName=' + this.model.originatorName
            + '&rpc=' + this.model.rpc
            + '&rpcName=' + this.model.rpcName
            , formData).then((res) => {
            if (res.success) {
              this.fileList = []
              this.$message.success('文件上传成功')
              that.$emit('ok')
            } else {
              this.$message.error(res.message)
            }
          })
        }

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