<template>
  <a-modal
    :visible="visible"
    title="测试对话框"
    @cancel="$emit('cancel')"
  >
    <p>如果你能看到这个对话框，说明异步组件加载正常！</p>
    <template #footer>
      <a-button @click="$emit('cancel')">关闭</a-button>
    </template>
  </a-modal>
</template>

<script>
export default {
  name: 'TestDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  }
}
</script>
