<template>
  <j-modal
    :title="title"
    :width="width"
    :visible="visible"
    switchFullscreen
    @ok="handleOk"
    :okButtonProps="{ class:{'jee-hidden': disableSubmit} }"
    @cancel="handleCancel"
    cancelText="关闭">
    <ietm-data-module-form ref="realForm" @ok="submitCallback" :disabled="disableSubmit"></ietm-data-module-form>
  </j-modal>
</template>

<script>

  import IetmDataModuleForm from './IetmDataModuleForm'
  export default {
    name: 'IetmDataModuleModal',
    components: {
      IetmDataModuleForm
    },
    props: {
      //表单禁用
    },
    data () {
      return {
        title:'',
        width:800,
        visible: false,
        disableSubmit: false
      }
    },
    methods: {
      add () {
        this.visible=true
        // TODO 点击【新增】前需选中导航树节点，否则提示“请选择一个构型节点”
        // TODO 新增弹窗回显以下字段数值：密级、SNS、创作单位、责任单位、技术名称、语言、国家
        this.$nextTick(()=>{
          this.$refs.realForm.add();
        })
      },
      edit (record) {
        this.visible=true
        this.$nextTick(()=>{
          this.$refs.realForm.edit(record);
        })
      },
      close () {
        this.$emit('close');
        this.visible = false;
      },
      handleOk () {
        this.$refs.realForm.submitForm();
      },
      submitCallback(){
        this.$emit('ok');
        this.visible = false;
      },
      handleCancel () {
        this.close()
      }
    }
  }
</script>