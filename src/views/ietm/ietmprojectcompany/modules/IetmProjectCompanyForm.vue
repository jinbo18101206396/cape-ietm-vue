<template>
  <a-spin :spinning="confirmLoading">
    <j-form-container :disabled="formDisabled">
      <a-form-model ref="form" :model="model" :rules="validatorRules" slot="detail">
        <a-row>
          <a-col :span="24" v-if="type == 1">
            <a-form-model-item label="创作单位编码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="companyCode">
              <a-input v-model="model.companyCode" placeholder="请输入5位ORIG编码（数字/大写字母）" maxLength="5"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="24" v-if="type == 1">
            <a-form-model-item label="创作单位名称" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="companyName">
              <a-input v-model="model.companyName" placeholder="请输入创作单位名称"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="24" v-if="type == 1">
            <a-form-model-item label="描述" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="description">
              <a-textarea v-model="model.description" rows="4" placeholder="请输入描述"/>
            </a-form-model-item>
          </a-col>

          <a-col :span="24" v-if="type == 2">
            <a-form-model-item label="责任单位编码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="companyCode">
              <a-input v-model="model.companyCode" placeholder="请输入5位ORIG编码（数字/大写字母）" maxLength="5"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="24" v-if="type == 2">
            <a-form-model-item label="责任单位代码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="companyAgentCode">
              <a-input v-model="model.companyAgentCode" placeholder="请输入1位责任单位代码（A/B/C/D）" maxLength="1"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="24" v-if="type == 2">
            <a-form-model-item label="责任单位名称" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="companyName">
              <a-input v-model="model.companyName" placeholder="请输入责任单位名称"></a-input>
            </a-form-model-item>
          </a-col>
        </a-row>
      </a-form-model>
    </j-form-container>
  </a-spin>
</template>

<script>

import {httpAction, getAction} from '@/api/manage'
import {validateDuplicateValue} from '@/utils/util'

export default {
  name: 'IetmProjectCompanyForm',
  components: {},
  props: {
    type: {
      type: Number,
    },
    pid: {
      type: String,
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
      editFlag: false,
      editIndex: -1,
      model: {},
      labelCol: {
        xs: {span: 24},
        sm: {span: 5},
      },
      wrapperCol: {
        xs: {span: 24},
        sm: {span: 16},
      },
      confirmLoading: false,
      validatorRules: {},
      url: {
        add: "/ietmprojectcompany/ietmProjectCompany/add",
        edit: "/ietmprojectcompany/ietmProjectCompany/edit",
        queryById: "/ietmprojectcompany/ietmProjectCompany/queryById"
      }
    }
  },
  computed: {
    formDisabled() {
      return this.disabled
    },
  },
  created() {
    if (this.type == 1) {
      this.validatorRules = {
        companyCode: [
          {required: true, message: '请输入创作单位编码!'},
          {pattern: /^[0-9A-Z]{5}$/, message: '创作单位编码必须为5位数字或大写字母!'}
        ],
        companyName: [
          {required: true, message: '请输入创作单位名称!'},
        ],
      }
    } else if (this.type == 2) {
      this.validatorRules = {
        companyCode: [
          {required: true, message: '请输入责任单位编码!'},
          {pattern: /^[0-9A-Z]{5}$/, message: '责任单位编码必须为5位数字或大写字母!'}
        ],
        companyName: [
          {required: true, message: '请输入责任单位名称!'},
        ],
        companyAgentCode: [
          {required: true, message: '请输入责任单位代码!'},
          {pattern: /^[A-D]$/, message: '责任单位代码必须为A/B/C/D中的一个!'}
        ],
      }
    }
    //备份model原始值
    this.modelDefault = JSON.parse(JSON.stringify(this.model));
  },
  methods: {
    add() {
      this.editFlag = false;
      this.model = Object.assign({}, this.modelDefault);
      this.model.type = this.type
      this.model.pid = this.pid
      this.visible = true;
    },
    edit(index, record) {
      this.editIndex = index;
      this.editFlag = true;
      this.model = Object.assign({}, record);
      this.model.type = this.type
      this.model.pid = this.pid
      this.visible = true;
    },
    submitForm() {
      const that = this;
      // 触发表单验证
      this.$refs.form.validate(valid => {
        if (valid) {
          //编辑
          if (this.editFlag) {
            this.$emit('editOk', this.model, this.editIndex);
          } else {
            //新增
            this.$emit('ok', this.model);
          }
        }
      })
    },
  }
}
</script>