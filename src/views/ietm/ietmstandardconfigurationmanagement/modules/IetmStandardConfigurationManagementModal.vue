<template>
  <j-modal
    :title="title"
    :width="width"
    :visible="visible"
    :confirmLoading="confirmLoading"
    switchFullscreen
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="关闭">
    <a-spin :spinning="confirmLoading">
      <a-form-model ref="form" :model="model" :rules="validatorRules">
        <a-form-model-item label="父级节点" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="pid">
          <j-tree-select
            ref="treeSelect"
            placeholder="请选择父级节点"
            v-model="model.pid"
            dict="ietm_standard_configuration_management,title,id"
            :condition=this.condition
            orderBy="seq,code asc"
            pidField="pid"
            pidValue="0"
            @change="pidChange"
            hasChildField="has_child"
          >
          </j-tree-select>
        </a-form-model-item>
        <a-form-model-item label="编码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="code">
          <a-input  v-model="model.code" :placeholder="codeTemp" ></a-input>
        </a-form-model-item>
        <a-form-model-item label="标题" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="title">
          <a-input v-model="model.title" :placeholder="titleTemp" ></a-input>
        </a-form-model-item>
        <a-form-model-item label="序号" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="seq">
          <a-input v-model="model.seq" placeholder="请输入序号" ></a-input>
        </a-form-model-item>
<!--        <a-form-model-item label="状态" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="status">-->
<!--          <a-input v-model="model.status" placeholder="请输入状态" ></a-input>-->
<!--        </a-form-model-item>-->
        <a-form-model-item label="密级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="security">
          <j-dict-select-tag type="list" v-model="model.security" dictCode="security" placeholder="请选择密级" />
        </a-form-model-item>

      </a-form-model>
    </a-spin>
  </j-modal>
</template>

<script>

  import { httpAction,getAction } from '@/api/manage'
  import { validateDuplicateValue } from '@/utils/util'
  import { duplicateCheck } from '@api/api'
  export default {
    name: "IetmStandardConfigurationManagementModal",
    props: {
      standard:{
        type: String,
        required: false
      },
      equipmentType:{
        type: String,
        required: false
      },
    },
    components: {
    },
    data () {
      return {
        codeTemp:"请输入编码",
        titleTemp:"请输入标题",
        codeLength:0,
        condition:"",
        title:"操作",
        width:800,
        visible: false,
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
          pid: [{required: true, message: '请选择父节点!'}],
          security: [{required: true, message: '请选择密级!'}],
          code: [
            {required: true, message: '请输入编码!'},
            {validator: this.validateCode}],
          title: [{required: true, message: '请输入标题!'}],
        },
        url: {
          add: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/add",
          edit: "/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/edit",
          getCodeTemp:"/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/getCodeTemp",
        },
        expandedRowKeys:[],
        pidField:""

      }
    },
    created () {
       //备份model原始值
       this.modelDefault = JSON.parse(JSON.stringify(this.model));
    },
    methods: {
      validateCode(rule, value, callback){
        let reg = /^[A-Z0-9]+$/
        if(value.length != this.codeLength ){
          callback("请输入"+ this.codeLength +"位编码!")
        }
        else if(!reg.test(value)) {
          callback('仅能包含数字和大写字母！')
        }else {
          callback()
        }
      },

      pidChange(e){
        getAction(this.url.getCodeTemp,{"pid":e}).then((res)=>{
          if(res.success){
            if( res.result!=-1) {
              this.codeLength = res.result
              this.codeTemp="请输入"+ this.codeLength +"位编码！"
            }else {
              //todo-1时超出编码规则禁止提交
            }
          }else{
            this.$message.warning(res.message);
          }
        }).finally(() => {

        })
      },
      add (obj) {
        this.modelDefault.pid=''
        this.edit(Object.assign(this.modelDefault , obj));
      },
      edit (record) {
        if(record.pid){
         this.pidChange(record.pid)
        }
        var conditionParam = {} ;
        conditionParam.standard=this.standard;
        conditionParam.equipment_type=this.equipmentType;
        this.condition=JSON.stringify(conditionParam);
        record.standard=this.standard;
        record.equipmentType=this.equipmentType;
        this.model = Object.assign({}, record);
        this.visible = true;
      },
      close () {
        this.$emit('close');
        this.visible = false;
        this.$refs.form.clearValidate()
      },
      handleOk () {
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
             if(this.model.id && this.model.id === this.model[this.pidField]){
              that.$message.warning("父级节点不能选择自己");
              that.confirmLoading = false;
              return;
            }
            httpAction(httpurl,this.model,method).then((res)=>{
              if(res.success){
                that.$message.success(res.message);
                this.$emit('ok');
              }else{
                that.$message.warning(res.message);
              }
            }).finally(() => {
              that.confirmLoading = false;
              that.close();
            })
          }else{
             return false
          }
        })
      },
      handleCancel () {
        this.close()
      },
      submitSuccess(formData,flag){
        if(!formData.id){
          let treeData = this.$refs.treeSelect.getCurrTreeData()
          this.expandedRowKeys=[]
          this.getExpandKeysByPid(formData[this.pidField],treeData,treeData)
          this.$emit('ok',formData,this.expandedRowKeys.reverse());
        }else{
          this.$emit('ok',formData,flag);
        }
      },
      getExpandKeysByPid(pid,arr,all){
        if(pid && arr && arr.length>0){
          for(let i=0;i<arr.length;i++){
            if(arr[i].key==pid){
              this.expandedRowKeys.push(arr[i].key)
              this.getExpandKeysByPid(arr[i]['parentId'],all,all)
            }else{
              this.getExpandKeysByPid(pid,arr[i].children,all)
            }
          }
        }
      }
    }
  }
</script>