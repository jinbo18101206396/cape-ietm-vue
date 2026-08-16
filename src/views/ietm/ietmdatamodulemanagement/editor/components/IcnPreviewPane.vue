<template>
  <div class="icn-preview-pane">
    <div class="preview-box">
      <!-- 加载中 -->
      <div v-if="loading" class="preview-center">
        <a-spin tip="预览加载中..."/>
      </div>

      <!-- 图片（含svg/tif）：blob URL 携带token，避免鉴权失效 -->
      <img
        v-else-if="previewType === 'IMAGE' && blobUrl"
        :src="blobUrl"
        class="preview-img"
        @error="onLoadError"/>

      <!-- CGM：专用查看器 iframe（路径对齐 IcnViewerModal） -->
      <iframe
        v-else-if="previewType === 'CGM' && cgmUrl"
        :src="cgmUrl"
        class="preview-frame"
        frameborder="0"/>

      <!-- 加载失败 -->
      <a-empty
        v-else-if="loadError"
        description="预览加载失败"
        :image-style="{ height: '60px' }"/>

      <!-- 未选择 / 其他格式不支持预览 -->
      <a-empty
        v-else
        :description="icnId ? '该格式不支持预览' : '选择文件后显示预览'"
        :image-style="{ height: '60px' }"/>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import { getAction } from '@/api/manage'
import { ACCESS_TOKEN } from '@/store/mutation-types'

export default {
  name: 'IcnPreviewPane',
  props: {
    icnId: { type: String, default: '' }
  },
  data() {
    return {
      loading: false,
      loadError: false,
      previewType: '',
      blobUrl: null,
      cgmUrl: '',
      reqSeq: 0
    }
  },
  watch: {
    icnId(val) {
      this.reset()
      if (val) this.loadPreview(val)
    }
  },
  beforeDestroy() {
    this.reqSeq++
    this.revokeBlob()
  },
  methods: {
    reset() {
      this.revokeBlob()
      this.loading = false
      this.loadError = false
      this.previewType = ''
      this.cgmUrl = ''
    },

    revokeBlob() {
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl)
        this.blobUrl = null
      }
    },

    loadPreview(id) {
      // 快速切换行时，旧请求可能后于新请求返回。用序号丢弃过期响应，
      // 避免预览错图 + Blob URL 泄漏。
      const seq = ++this.reqSeq
      this.loading = true
      getAction(`/icnmanage/ietmIcnManage/preview/${id}`)
        .then(res => {
          if (seq !== this.reqSeq) return
          if (!res.success || !res.result) {
            this.loadError = true
            this.loading = false
            return
          }
          const vo = res.result
          this.previewType = vo.previewType
          if (vo.previewType === 'IMAGE') {
            this.loadBlobUrl(vo.fileUrl, seq) // loading 在 loadBlobUrl 的 finally 里置 false
          } else if (vo.previewType === 'CGM') {
            const baseUrl = process.env.VUE_APP_API_BASE_URL || window._CONFIG['domianURL'] || ''
            this.cgmUrl = `${baseUrl}/viewer/cgm.html?file=${encodeURIComponent(vo.fileUrl)}`
            this.loading = false
          } else {
            this.loading = false
          }
        })
        .catch(err => {
          if (seq !== this.reqSeq) return
          console.error('preview error:', err)
          this.loadError = true
          this.loading = false
        })
    },

    // 图片用 fetch 携带 token 拿 Blob URL（viewFile 需鉴权，img 标签无法带 header）
    // 模式完全对齐 IcnViewerModal.loadBlobUrl
    loadBlobUrl(fileUrl, seq) {
      if (!fileUrl) {
        this.loadError = true
        this.loading = false
        return
      }
      const token = Vue.ls.get(ACCESS_TOKEN)
      const baseUrl = window._CONFIG['domianURL'] || ''
      fetch(baseUrl + fileUrl, {
        method: 'GET',
        headers: { 'X-Access-Token': token || '' }
      })
        .then(response => {
          if (!response.ok) throw new Error('HTTP ' + response.status)
          return response.blob()
        })
        .then(blob => {
          // 请求已过期（用户已切到别的行/组件已销毁）：丢弃，不占用 blobUrl，避免泄漏与错图
          if (seq !== this.reqSeq) return
          this.blobUrl = URL.createObjectURL(blob)
        })
        .catch(err => {
          if (seq !== this.reqSeq) return
          console.error('blob load error:', err)
          this.loadError = true
        })
        .finally(() => {
          if (seq !== this.reqSeq) return
          this.loading = false
        })
    },

    onLoadError() {
      this.loadError = true
    }
  }
}
</script>

<style lang="less" scoped>
.icn-preview-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.preview-box {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  background: #fafafa;
  overflow: hidden;
}

.preview-center {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-frame {
  width: 100%;
  height: 100%;
}
</style>
