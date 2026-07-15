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
    <div style="height: 100%;margin: 30px">
      <video-player class="video-player vjs-custom-skin"
                    v-show="visible"
                    ref="videoPlayer"
                    :playsInline="true"
                    :options="playerOptions">
      </video-player>
    </div>
  </div>
  </j-modal>
</template>

<script>
import { videoPlayer } from 'vue-video-player';
// 引入 video.js 的样式
import 'video.js/dist/video-js.css';
import { getFileAccessHttpUrl } from '@api/manage'
import { mapGetters } from 'vuex'
import { getAction } from '@/api/manage'
export default {
  name:'playVideo',
  components: {
    videoPlayer,
  },
  props: {
    model: {
      type: Object,
      required: false
    },
  },
  data() {
    return {
      title:'视频',
      width:1400,
      visible: false,
      fileContent: "",
      playerOptions: {
        // 必填项：指定视频源
        sources: [
        ],
        // 可选的配置项
        height: '100%', // 播放器高度
        fluid: true, // 设置成true，播放器会随页面大小而缩放
        autoplay: false, // 自动播放
        loop: false, // 循环播放
        muted: false, // 静音
        controls: true, // 显示控制条
        aspectRatio: '16:9', // 视频比例
        playbackRates: [0.7, 1.0, 1.5, 2.0] // 播放速度选项
      },
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

      const sources =[
        {
          type: "video/mp4",
        src:  window._CONFIG['videoDomainURL'] + "/" + this.model.ietmAttachment.fileKey + "?isEncryption=true"
        }
      ]
      this.playerOptions={
        ...this.playerOptions,
        sources: sources,
      }
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
.video-player {
  width: 100%; /* 让播放器宽度占满容器 */
}
.vjs-custom-skin .video-js .vjs-big-play-button {
  /* 示例：修改大播放按钮的样式 */
  background-color: rgba(0, 0, 0, 0.45) !important;
  border-radius: 6px !important;
}
</style>
