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
    <ietm-standard-information-code-form ref="realForm" @ok="submitCallback"
                                         :disabled="disableSubmit"></ietm-standard-information-code-form>
  </j-modal>
</template>

<script>

import IetmStandardInformationCodeForm from './IetmStandardInformationCodeForm'

export default {
  name: 'IetmStandardInformationCodeModal',
  components: {
    IetmStandardInformationCodeForm
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
    add(standard) {
      this.visible = true
      this.$nextTick(() => {
        this.$refs.realForm.add(standard)
      })
    },
    edit(record) {
      console.log('Modal.edit 接收到的 record:', record)
      this.visible = true
      this.$nextTick(() => {
        this.$refs.realForm.edit(record)
      })
    },
    close() {
      this.$emit('close')
      this.visible = false
    },
    handleOk() {
      console.log('Modal handleOk called, refs.realForm:', this.$refs.realForm)
      this.$refs.realForm.submitForm()
    },
    submitCallback() {
      this.$emit('ok')
      this.visible = false
    },
    handleCancel() {
      this.close()
    }
  }
}
</script>