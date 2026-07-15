<template>
  <a-spin :spinning="confirmLoading">
    <j-form-container :disabled="formDisabled">
      <a-form-model ref="form" :model="model" :rules="validatorRules" slot="detail">
        <a-row>
          <a-col :span="12">
            <a-form-model-item label="密级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="security">
              <j-dict-select-tag type="list" v-model="model.security"  dictCode="security" placeholder="请选择密级" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="信息码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="infoCode">
              <j-dict-select-tag type="list" v-model="model.infoCode" placeholder="请选择信息码" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="SNS" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="SNS">
              <a-input v-model="model.SNS"  placeholder="请输入路径"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="DM类型" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="dmtypeName">
              <j-dict-select-tag type="list" v-model="model.dmtypeName" placeholder="请选择DM类型" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="信息变量码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="infoCodeVar">
              <a-input v-model="model.infoCodeVar" placeholder="请输入信息变量码"  ></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="位置码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="positionCode">
              <j-dict-select-tag type="list" v-model="model.positionCode" placeholder="请选择位置码" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="学习码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="learningCode">
              <a-input v-model="model.learningCode" placeholder="请输入学习码"  ></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="学习事件码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="learningEventCode">
              <a-input v-model="model.learningEventCode" placeholder="请输入学习事件码"  ></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="创作单位" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="createUnit">
              <j-dict-select-tag type="list" v-model="model.createUnit" placeholder="请选择创作单位" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="责任单位" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="responsibleUnit">
              <j-dict-select-tag type="list" v-model="model.responsibleUnit" placeholder="请选择责任单位" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="技术名称" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="techName">
              <a-input v-model="model.techName" placeholder="请输入技术名称"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="信息名称" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="infoName">
              <a-input v-model="model.infoName" placeholder="请输入信息名称"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="生产者" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="producer">
              <a-input v-model="model.producer" placeholder="请输入生产者"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="扩展代码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="extendCode">
              <a-input v-model="model.extendCode" placeholder="请输入扩展代码"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="语言" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="lang">
              <j-dict-select-tag type="list" v-model="model.lang" placeholder="请选择语言" />
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item label="国家" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="country">
              <j-dict-select-tag type="list" v-model="model.country" placeholder="请选择国家" />
            </a-form-model-item>
          </a-col>
        </a-row>
      </a-form-model>
    </j-form-container>
  </a-spin>
</template>

<script>

  import { httpAction, getAction } from '@/api/manage'
  import { validateDuplicateValue } from '@/utils/util'

  export default {
    name: 'IetmDataModuleForm',
    components: {
    },
    props: {
      //表单禁用
      disabled: {
        type: Boolean,
        default: false,
        required: false
      }
    },
    data () {
      return {
        model:{
         },
        labelCol: {
          xs: { span: 24 },
          sm: { span: 5 },
        },
        wrapperCol: {
          xs: { span: 24 },
          sm: { span: 16 },
        },
        confirmLoading: false,
        validatorRules: {
        },
        url: {
          add: "/itemprojectdatamodule/ietmDataModule/add",
          edit: "/itemprojectdatamodule/ietmDataModule/edit",
          queryById: "/itemprojectdatamodule/ietmDataModule/queryById"
        }
      }
    },
    computed: {
      formDisabled(){
        return this.disabled
      },
    },
    created () {
       //备份model原始值
      this.modelDefault = JSON.parse(JSON.stringify(this.model));
    },
    methods: {
      add () {
        this.edit(this.modelDefault);
      },
      edit (record) {
        this.model = Object.assign({}, record);
        this.visible = true;
      },
      submitForm () {
        const that = this;
        // 触发表单验证
        this.$refs.form.validate(valid => {
          if (valid) {
            that.confirmLoading = true;
            let httpurl = '';
            let method = '';
            if(!this.model.id){
              httpurl+=this.url.add;
              method = 'post';
            }else{
              httpurl+=this.url.edit;
               method = 'put';
            }
            httpAction(httpurl,this.model,method).then((res)=>{
              if(res.success){
                that.$message.success(res.message);
                that.$emit('ok');
              }else{
                that.$message.warning(res.message);
              }
            }).finally(() => {
              that.confirmLoading = false;
            })
          }
        })
      },
    }
  }
</script>