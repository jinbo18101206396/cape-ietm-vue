<template>
  <j-modal
    :title="title"
    :width="width"
    :height="120"
    :visible="visible"
    switchFullscreen
    @cancel="handleCancel">
    <template slot="footer">
      <a-button @click="handleCancel">关闭</a-button>
    </template>
  <div>
    <div style="height: 100%;margin: 30px">
      <video-player class="video-player vjs-custom-audio"
                    v-show="visible"
                    ref="videoPlayer"
                    :playsInline="true"
                    :options="playerOptions"
                    @play="onPlay"
      >
      </video-player>
    </div>
  </div>
  </j-modal>
</template>

<script>
import { videoPlayer } from 'vue-video-player';
// 引入 video.js 的样式
import 'video.js/dist/video-js.css';
import { mapGetters } from 'vuex'
export default {
  name:'playAudio',
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
      title:'音频',
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
        poster: '/yinping.webp', // 视频封面
        aspectRatio: '16:9', // 视频比例
        playbackRates: [0.7, 1.0, 1.5, 2.0] // 播放速度选项
      },
    };
  },
  methods: {
    onPlay(){
      const player = this.$refs.videoPlayer.player;
      const poster = player.el().querySelector(".vjs-poster");
      if (poster) poster.style.display = "block";
    },

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
          type: "audio/mp3",
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
  width: 100% !important;
  height: 100% !important;
}
/* 封面：不裁剪、不变形、沾满窗口 */
.vjs-custom-audio .vjs-poster {
  width: 100% !important;
  height: 96% !important;
  background-color: #000 !important;
  background-size: contain !important; /* 不裁剪 */
  background-repeat: no-repeat !important;
  background-position: center center !important;
  z-index: 1 !important;
  display: block !important;
}
</style>
