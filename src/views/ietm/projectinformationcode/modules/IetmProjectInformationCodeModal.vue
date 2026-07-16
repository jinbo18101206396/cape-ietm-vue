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
    <ietm-project-information-code-form ref="realForm" @ok="submitCallback" :disabled="disableSubmit"></ietm-project-information-code-form>
  </j-modal>
</template>

<script>

  import IetmProjectInformationCodeForm from './IetmProjectInformationCodeForm'
  export default {
    name: 'IetmProjectInformationCodeModal',
    components: {
      IetmProjectInformationCodeForm
    },
    props: {
      dmtypeOptions: {
        type: Array,
        default: () => []
      }
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
        this.$nextTick(()=>{
          this.$refs.realForm.add();
          this.$refs.realForm.setDmtypeOptions(this.dmtypeOptions);
        })
      },
      edit (record) {
        this.visible=true
        this.$nextTick(()=>{
          this.$refs.realForm.edit(record);
          this.$refs.realForm.setDmtypeOptions(this.dmtypeOptions);
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