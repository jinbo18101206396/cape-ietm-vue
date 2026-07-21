<template>
  <a-modal
    :title="'浏览 - ' + previewInfo.icn"
    :width="modalWidth"
    :visible="visible"
    :footer="null"
    :destroyOnClose="true"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <div class="viewer-container">
        <!-- 文件信息栏 -->
        <div class="file-info">
          <a-descriptions :column="3" size="small" bordered>
            <a-descriptions-item label="文件名">
              {{ previewInfo.fileName }}
            </a-descriptions-item>
            <a-descriptions-item label="文件类型">
              {{ previewInfo.fileExt ? previewInfo.fileExt.toUpperCase() : '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="文件大小">
              {{ formatFileSize(previewInfo.fileSize) }}
            </a-descriptions-item>
            <a-descriptions-item label="版本号">
              {{ previewInfo.issueNo || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="密级">
              {{ previewInfo.security || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">
              {{ previewInfo.createTime || '-' }}
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 预览区域 -->
        <div class="preview-area" :style="{ height: previewHeight }">
          <!-- 图片预览 -->
          <div v-if="previewInfo.previewType === 'IMAGE'" class="image-preview">
            <img :src="blobUrl" :alt="previewInfo.fileName" @load="handleImageLoad" @error="handleLoadError" />
          </div>

          <!-- 视频预览 -->
          <div v-else-if="previewInfo.previewType === 'VIDEO'" class="video-preview">
            <video :src="blobUrl" controls @error="handleLoadError">
              您的浏览器不支持视频播放
            </video>
          </div>

          <!-- 音频预览 -->
          <div v-else-if="previewInfo.previewType === 'AUDIO'" class="audio-preview">
            <audio :src="blobUrl" controls @error="handleLoadError">
              您的浏览器不支持音频播放
            </audio>
          </div>

          <!-- CGM预览 -->
          <div v-else-if="previewInfo.previewType === 'CGM'" class="cgm-preview">
            <iframe :src="getCgmViewerUrl()" frameborder="0"></iframe>
          </div>

          <!-- 3D模型预览 (VRML) -->
          <div v-else-if="previewInfo.previewType === '3D'" class="model-3d-preview">
            <VrmlViewer
              v-if="blobUrl"
              :fileUrl="blobUrl"
              @loaded="handle3DLoaded"
              @error="handle3DError"
              @retry="handleRetry"
            />
          </div>

          <!-- Flash预览 -->
          <div v-else-if="previewInfo.previewType === 'FLASH'" class="flash-preview">
            <object :data="fileUrl" type="application/x-shockwave-flash" width="100%" height="100%">
              <param name="movie" :value="fileUrl" />
              您的浏览器不支持Flash播放
            </object>
          </div>

          <!-- SMG预览 -->
          <div v-else-if="previewInfo.previewType === 'SMG'" class="smg-preview">
            <iframe :src="getSmgViewerUrl()" frameborder="0"></iframe>
          </div>

          <!-- 不支持预览的文件 -->
          <div v-else class="unsupported-preview">
            <a-result status="info" title="该文件类型不支持在线预览">
              <template #extra>
                <a-button type="primary" @click="handleDownload">
                  <a-icon type="download" />
                  下载文件
                </a-button>
              </template>
            </a-result>
          </div>

          <!-- 加载错误提示 -->
          <div v-if="loadError" class="load-error">
            <a-result status="error" title="文件加载失败" :sub-title="errorMessage">
              <template #extra>
                <a-button @click="handleRetry">重试</a-button>
                <a-button type="primary" @click="handleDownload">下载文件</a-button>
              </template>
            </a-result>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="viewer-actions">
          <a-space>
            <a-button @click="handleFullscreen" v-if="previewInfo.canPreview">
              <a-icon type="fullscreen" />
              全屏
            </a-button>
            <a-button @click="handleDownload">
              <a-icon type="download" />
              下载
            </a-button>
            <a-button @click="handleCancel">关闭</a-button>
          </a-space>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import Vue from 'vue'
import { getAction, downloadFile } from '@/api/manage'
import { ACCESS_TOKEN } from '@/store/mutation-types'
import VrmlViewer from './VrmlViewer.vue'

export default {
  name: 'IcnViewerModal',
  components: {
    VrmlViewer
  },
  data() {
    return {
      visible: false,
      loading: false,
      loadError: false,
      errorMessage: '',
      blobUrl: null,   // 用于携带token认证后的文件预览
      previewInfo: {
        icnId: '',
        icn: '',
        fileName: '',
        fileType: '',
        fileExt: '',
        fileSize: 0,
        filePath: '',
        fileUrl: '',
        previewType: '',
        canPreview: false,
        issueNo: '',
        security: null,
        createTime: ''
      },
      modalWidth: 1000,
      previewHeight: '600px'
    }
  },
  computed: {
    fileUrl() {
      if (!this.previewInfo.fileUrl) return ''
      // 使用项目配置的后端地址
      const baseUrl = process.env.VUE_APP_API_BASE_URL || window._CONFIG['domianURL']
      return baseUrl + this.previewInfo.fileUrl
    }
  },
  methods: {
    /**
     * 显示预览模态框
     */
    show(icnId) {
      this.visible = true
      this.loadError = false
      this.errorMessage = ''
      this.loadPreviewInfo(icnId)
    },

    /**
     * 加载预览信息
     */
    loadPreviewInfo(icnId) {
      this.loading = true
      getAction('/icnmanage/ietmIcnManage/preview/' + icnId)
        .then(res => {
          if (res.success) {
            this.previewInfo = res.result
            // 根据预览类型调整模态框大小
            this.adjustModalSize()
            // 图片/视频/音频/3D模型：用fetch携带token获取Blob URL，解决认证问题
            if (['IMAGE', 'VIDEO', 'AUDIO', '3D'].includes(this.previewInfo.previewType)) {
              this.loadBlobUrl()
            }
          } else {
            this.$message.error(res.message || '加载预览信息失败')
          }
        })
        .catch(err => {
          console.error('加载预览信息失败', err)
          this.$message.error('加载预览信息失败')
        })
        .finally(() => {
          this.loading = false
        })
    },

    /**
     * 用 fetch API 携带 token 获取文件 Blob URL
     * 不使用 axios 实例，避免响应拦截器对 Blob 数据的干扰
     */
    loadBlobUrl() {
      if (!this.previewInfo.fileUrl) return

      // 释放上一次的 Blob URL
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl)
        this.blobUrl = null
      }

      const token = Vue.ls.get(ACCESS_TOKEN)
      const baseUrl = window._CONFIG['domianURL'] || ''
      const fullUrl = baseUrl + this.previewInfo.fileUrl

      fetch(fullUrl, {
        method: 'GET',
        headers: {
          'X-Access-Token': token || ''
        }
      }).then(response => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status)
        }
        return response.blob()
      }).then(blob => {
        this.blobUrl = URL.createObjectURL(blob)
      }).catch(err => {
        console.error('文件预览加载失败:', err)
        console.error('文件URL:', this.previewInfo.fileUrl)
        this.loadError = true
        this.errorMessage = '文件加载失败，请检查文件是否存在或稍后重试'
      })
    },

    /**
     * 根据预览类型调整模态框大小
     */
    adjustModalSize() {
      const type = this.previewInfo.previewType
      if (type === 'VIDEO' || type === '3D') {
        this.modalWidth = 1200
        this.previewHeight = '700px'
      } else if (type === 'IMAGE') {
        this.modalWidth = 1000
        this.previewHeight = '600px'
      } else {
        this.modalWidth = 900
        this.previewHeight = '500px'
      }
    },

    /**
     * 3D模型加载成功
     */
    handle3DLoaded() {
      console.log('3D模型加载成功')
    },

    /**
     * 3D模型加载失败
     */
    handle3DError(error) {
      console.error('3D模型加载失败:', error)
      this.loadError = true
      this.errorMessage = '3D模型加载失败，请检查文件格式是否正确'
    },

    /**
     * 获取CGM查看器URL
     */
    getCgmViewerUrl() {
      // CGM查看器URL，根据实际情况配置
      const baseUrl = process.env.VUE_APP_API_BASE_URL || window._CONFIG['domianURL']
      return `${baseUrl}/viewer/cgm.html?file=${encodeURIComponent(this.previewInfo.fileUrl)}`
    },

    /**
     * 获取SMG查看器URL
     */
    getSmgViewerUrl() {
      const baseUrl = process.env.VUE_APP_API_BASE_URL || window._CONFIG['domianURL']
      return `${baseUrl}/viewer/smg.html?file=${encodeURIComponent(this.previewInfo.fileUrl)}`
    },

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
    },

    /**
     * 图片加载完成
     */
    handleImageLoad() {
      // 图片加载成功，不需要特殊处理
    },

    /**
     * 文件加载错误（img/video/audio标签的加载错误）
     */
    handleLoadError() {
      // Blob URL 加载失败（已在 loadBlobUrl 中处理）
      // 这里不需要额外处理，避免重复显示错误
    },

    /**
     * 重试加载
     */
    handleRetry() {
      this.loadError = false
      this.loadPreviewInfo(this.previewInfo.icnId)
    },

    /**
     * 全屏显示
     */
    handleFullscreen() {
      const previewArea = document.querySelector('.preview-area')
      if (previewArea) {
        if (previewArea.requestFullscreen) {
          previewArea.requestFullscreen()
        } else if (previewArea.webkitRequestFullscreen) {
          previewArea.webkitRequestFullscreen()
        } else if (previewArea.mozRequestFullScreen) {
          previewArea.mozRequestFullScreen()
        } else if (previewArea.msRequestFullscreen) {
          previewArea.msRequestFullscreen()
        }
      }
    },

    /**
     * 下载文件
     */
    handleDownload() {
      const url = '/icnmanage/ietmIcnManage/download/single/' + this.previewInfo.icnId
      downloadFile(url, this.previewInfo.fileName)
    },

    /**
     * 关闭模态框
     */
    handleCancel() {
      this.visible = false
      // 释放 Blob URL，避免内存泄漏
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl)
        this.blobUrl = null
      }
      this.loadError = false
      this.previewInfo = {
        icnId: '',
        icn: '',
        fileName: '',
        fileType: '',
        fileExt: '',
        fileSize: 0,
        filePath: '',
        fileUrl: '',
        previewType: '',
        canPreview: false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.viewer-container {
  .file-info {
    margin-bottom: 16px;
  }

  .preview-area {
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    background: #fafafa;

    // 图片预览
    .image-preview {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }

    // 视频预览
    .video-preview {
      width: 100%;
      height: 100%;
      background: #000;

      video {
        width: 100%;
        height: 100%;
      }
    }

    // 音频预览
    .audio-preview {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;

      audio {
        width: 80%;
      }
    }

    // CGM/SMG预览
    .cgm-preview,
    .smg-preview {
      width: 100%;
      height: 100%;

      iframe {
        width: 100%;
        height: 100%;
      }
    }

    // 3D模型预览
    .model-3d-preview {
      width: 100%;
      height: 100%;
      position: relative;

      .threejs-container {
        width: 100%;
        height: 100%;
      }

      .model-loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
      }
    }

    // Flash预览
    .flash-preview {
      width: 100%;
      height: 100%;
    }

    // 不支持预览
    .unsupported-preview,
    .load-error {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .viewer-actions {
    margin-top: 16px;
    text-align: right;
  }
}
</style>
