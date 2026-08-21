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
    <icn-info-form ref="realForm" @ok="submitCallback" :tips="tips" :disabled="disableSubmit"></icn-info-form>
  </j-modal>
</template>

<script>

  import IcnInfoForm from './IcnInfoForm.vue'
  export default {
    name: 'IcnInfoModal',
    components: {
      IcnInfoForm
    },
    data () {
      return {
        title:'',
        tips:'',
        width:800,
        visible: false,
        disableSubmit: false
      }
    },
    methods: {
      add (icnModel) {
        this.visible=true
        this.$nextTick(()=>{
          this.$refs.realForm.add(icnModel);
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