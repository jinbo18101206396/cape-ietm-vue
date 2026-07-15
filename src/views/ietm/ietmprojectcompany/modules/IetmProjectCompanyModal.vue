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
    <ietm-project-company-form ref="realForm" @ok="submitCallback" @editOk="editSubmitCallback" :type="type" :pid="pid"
                               :disabled="disableSubmit"></ietm-project-company-form>
  </j-modal>
</template>

<script>

import IetmProjectCompanyForm from './IetmProjectCompanyForm'

export default {
  name: 'IetmProjectCompanyModal',
  components: {
    IetmProjectCompanyForm
  },
  props: {
    type: {
      type: Number,
    },
    pid: {
      type: String,
    }
  },
  data() {
    return {
      title: '',
      width: 800,
      visible: false,
      disableSubmit: false
    }
  },
  methods: {
    add() {
      this.visible = true
      this.$nextTick(() => {
        this.$refs.realForm.add();
      })
    },
    edit(index, record) {
      this.visible = true
      this.$nextTick(() => {
        this.$refs.realForm.edit(index, record);
      })
    },
    close() {
      this.$emit('close');
      this.visible = false;
    },
    handleOk() {
      this.$refs.realForm.submitForm();
    },
    submitCallback(model) {
      this.$emit('ok', model);
      this.visible = false;
    },
    editSubmitCallback(model, index) {
      this.$emit('editOk', model, index);
      this.visible = false;
    },
    handleCancel() {
      this.close()
    }
  }
}
</script>