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
        :description="errorMessage || '预览加载失败'"
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
      errorMessage: '', // 🆕 存储详细错误信息
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
      this.errorMessage = '' // 🆕 重置错误信息
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

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [图符预览] loadPreview 调用, id =', id)
      }

      getAction(`/icnmanage/ietmIcnManage/preview/${id}`)
        .then(res => {
          if (seq !== this.reqSeq) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ [图符预览] 请求已过期，丢弃响应')
            }
            return
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [图符预览] 后端响应:', res)
          }

          if (!res.success || !res.result) {
            this.loadError = true
            this.errorMessage = res.message || '预览加载失败'
            this.loading = false

            if (process.env.NODE_ENV === 'development') {
              console.error('❌ [图符预览] 接口返回失败:', res.message)
            }
            return
          }
          const vo = res.result

          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [图符预览] previewType =', vo.previewType, ', fileUrl =', vo.fileUrl)
          }

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
          console.error('❌ [图符预览] 请求异常:', err)
          this.loadError = true
          this.errorMessage = '网络请求失败: ' + (err.message || '未知错误')
          this.loading = false
        })
    },

    // 图片用 fetch 携带 token 拿 Blob URL（viewFile 需鉴权，img 标签无法带 header）
    // 模式完全对齐 IcnViewerModal.loadBlobUrl
    loadBlobUrl(fileUrl, seq) {
      if (!fileUrl) {
        this.loadError = true
        this.errorMessage = '文件URL为空'
        this.loading = false
        return
      }
      const token = Vue.ls.get(ACCESS_TOKEN)
      const baseUrl = window._CONFIG['domianURL'] || ''

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [图符预览] loadBlobUrl, fileUrl =', fileUrl)
        console.log('🔍 [图符预览] token存在:', !!token)
      }

      fetch(baseUrl + fileUrl, {
        method: 'GET',
        headers: { 'X-Access-Token': token || '' }
      })
        .then(response => {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [图符预览] fetch响应, status =', response.status, ', content-type =', response.headers.get('content-type'))
          }

          // 🆕 检查是否返回JSON错误（后端token验证失败时返回JSON而不是标准401）
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            // 返回的是JSON错误响应，需要解析错误信息
            return response.json().then(json => {
              throw new Error(json.message || 'HTTP ' + response.status)
            })
          }

          if (!response.ok) {
            throw new Error('HTTP ' + response.status)
          }
          return response.blob()
        })
        .then(blob => {
          // 请求已过期（用户已切到别的行/组件已销毁）：丢弃，不占用 blobUrl，避免泄漏与错图
          if (seq !== this.reqSeq) return

          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [图符预览] blob加载成功, size =', blob.size, 'bytes')
          }

          // 🆕 检查Blob大小，0字节说明后端返回空内容
          if (blob.size === 0) {
            console.error('❌ [图符预览] blob大小为0，后端返回空文件')
            this.loadError = true
            this.errorMessage = '图片文件为空或不存在'
            return
          }

          this.blobUrl = URL.createObjectURL(blob)
        })
        .catch(err => {
          if (seq !== this.reqSeq) return
          console.error('❌ [图符预览] blob加载失败:', err)
          this.loadError = true
          this.errorMessage = '文件加载失败: ' + (err.message || '未知错误')
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
