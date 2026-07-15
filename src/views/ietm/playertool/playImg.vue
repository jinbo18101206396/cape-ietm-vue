<template>
  <j-modal
    :title="title"
    :width="width"
    :visible="visible"
    switchFullscreen
    @cancel="handleCancel">
    <template slot="footer">
      <a-button @click="handleCancel">关闭</a-button>
    </template>
  <div>
    <div style="height: 100%;width: 100%; display: flex;justify-content: center;align-items: center">
    <img :src="imgUrl" preview style="max-width: 90%;max-height: 80%">
    </div>
  </div>
  </j-modal>
</template>

<script>
// 引入 video.js 的样式
import { mapGetters } from 'vuex'
export default {
  name:'playImg',
  components: {
  },
  props: {
    model: {
      type: Object,
      required: false
    },
  },
  data() {
    return {
      title:'图片',
      width:1400,
      visible: false,
      fileContent: "",
      imgUrl:"",
    };
  },
  methods: {
    handleCancel () {
      this.close()
    },
    show(){
      if(this.model === undefined ){
        this.$message.warning('请选择一个ICN！')
        return
      }
      if(this.model.ietmAttachment  === undefined || this.model.ietmAttachment.fileKey  === undefined){
        this.$message.warning('选择的数据无可浏览文件！')
        return
      }
     this.imgUrl= window._CONFIG['videoDomainURL'] + "/" + this.model.ietmAttachment.fileKey + "?isEncryption=true"

      this.visible=true
    },
    close () {
      this.visible = false;
    },
    ...mapGetters(['userInfo']),
  }
};
</script>

<style>
/* 可以在这里添加自定义样式 */

</style>
