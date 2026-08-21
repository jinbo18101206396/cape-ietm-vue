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
    <ietm-icn-manage-form ref="realForm" @ok="submitCallback" :disabled="disableSubmit"></ietm-icn-manage-form>
  </j-modal>
</template>

<script>

  import IetmIcnManageForm from './IetmIcnManageForm'
  export default {
    name: 'IetmIcnManageModal',
    components: {
      IetmIcnManageForm
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
      add (cmnodeId) {
        this.visible=true
        this.$nextTick(()=>{
          this.$refs.realForm.add(cmnodeId);
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