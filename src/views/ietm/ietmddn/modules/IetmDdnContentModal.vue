<template>
  <a-modal
    title="查看DDN文件内容"
    :width="1000"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel">

    <a-spin :spinning="loading">
      <div v-if="ddnInfo">
        <!-- DDN基本信息 -->
        <a-descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
          <a-descriptions-item label="DDN编码">
            {{ ddnInfo.ddnCode }}
          </a-descriptions-item>
          <a-descriptions-item label="文件名">
            {{ ddnInfo.fileName }}
          </a-descriptions-item>
          <a-descriptions-item label="DDN类型">
            <a-tag v-if="ddnInfo.ddnType === 'DM'" color="cyan">DM</a-tag>
            <a-tag v-else-if="ddnInfo.ddnType === 'ICN'" color="orange">ICN</a-tag>
            <a-tag v-else-if="ddnInfo.ddnType === 'PM'" color="purple">PM</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="导入导出">
            <a-tag v-if="ddnInfo.impexp === 'e'" color="green">导出</a-tag>
            <a-tag v-else-if="ddnInfo.impexp === 'i'" color="blue">导入</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="DM数量">
            {{ ddnInfo.dmCount || 0 }}
          </a-descriptions-item>
          <a-descriptions-item label="ICN数量">
            {{ ddnInfo.icnCount || 0 }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- XML内容展示 -->
        <div style="margin-top: 16px">
          <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center">
            <span style="font-weight: bold">XML内容：</span>
            <a-space>
              <a-button size="small" icon="swap" @click="toggleFormat">
                {{ isFormatted ? '显示原始' : '格式化' }}
              </a-button>
              <a-button size="small" icon="download" @click="handleDownloadXml">
                下载XML
              </a-button>
              <a-button size="small" icon="copy" @click="handleCopy">复制内容</a-button>
              <a-button size="small" icon="fullscreen" @click="toggleFullscreen">
                {{ isFullscreen ? '退出全屏' : '全屏' }}
              </a-button>
            </a-space>
          </div>

          <!-- XML内容展示（使用CodeMirror） -->
          <div :class="['xml-viewer-wrapper', { 'fullscreen': isFullscreen }]">
            <codemirror
              v-model="displayContent"
              :options="cmOptions"
            />
          </div>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'
import { codemirror } from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/xml/xml.js'
import 'codemirror/addon/fold/foldcode.js'
import 'codemirror/addon/fold/foldgutter.js'
import 'codemirror/addon/fold/xml-fold.js'
import 'codemirror/addon/fold/foldgutter.css'
import vkbeautify from 'vkbeautify'
import 'codemirror/lib/codemirror'

export default {
  name: 'IetmDdnContentModal',
  components: {
    codemirror
  },
  data() {
    return {
      visible: false,
      loading: false,
      ddnInfo: null,
      isFormatted: false,
      isFullscreen: false,
      originalContent: '',
      formattedContent: '',
      cmOptions: {
        mode: 'xml',
        theme: 'default',
        lineNumbers: true,
        lineWrapping: true,
        readOnly: true,
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        tabSize: 2
      }
    }
  },
  computed: {
    displayContent() {
      return this.isFormatted ? this.formattedContent : this.originalContent
    }
  },
  methods: {
    show(id) {
      this.visible = true
      this.loading = true
      this.ddnInfo = null
      this.isFormatted = false
      this.isFullscreen = false

      getAction('/ietmddn/ietmDdnExchange/getDdnFileContent', { id: id }).then(res => {
        if (res.success) {
          this.ddnInfo = res.result
          this.originalContent = res.result.content || ''

          // 自动格式化XML
          try {
            this.formattedContent = vkbeautify.xml(this.originalContent)
            this.isFormatted = true  // 默认显示格式化后的内容
          } catch (e) {
            console.warn('XML格式化失败，显示原始内容', e)
            this.formattedContent = this.originalContent
          }
        } else {
          this.$message.error(res.message || '加载DDN内容失败')
          this.handleCancel()
        }
      }).catch(err => {
        console.error('加载DDN内容失败', err)
        this.$message.error('加载DDN内容失败')
        this.handleCancel()
      }).finally(() => {
        this.loading = false
      })
    },
    handleCancel() {
      this.visible = false
      this.ddnInfo = null
      this.isFormatted = false
      this.isFullscreen = false
      this.originalContent = ''
      this.formattedContent = ''
    },
    handleCopy() {
      if (!this.displayContent) {
        return
      }

      // 创建临时textarea元素
      const textarea = document.createElement('textarea')
      textarea.value = this.displayContent
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()

      try {
        document.execCommand('copy')
        this.$message.success('内容已复制到剪贴板')
      } catch (err) {
        console.error('复制失败', err)
        this.$message.error('复制失败')
      } finally {
        document.body.removeChild(textarea)
      }
    },
    toggleFormat() {
      this.isFormatted = !this.isFormatted
    },
    handleDownloadXml() {
      if (!this.ddnInfo || !this.displayContent) {
        return
      }

      // 创建Blob对象
      const blob = new Blob([this.displayContent], { type: 'application/xml' })
      const url = window.URL.createObjectURL(blob)

      // 创建下载链接
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = url
      link.download = this.ddnInfo.fileName || 'ddn.xml'

      document.body.appendChild(link)
      link.click()

      // 清理
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      this.$message.success('XML文件下载成功')
    },
    toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen
    },
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
    }
  }
}
</script>

<style scoped>
.xml-viewer-wrapper {
  position: relative;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
}

.xml-viewer-wrapper >>> .CodeMirror {
  height: 500px;
  font-size: 13px;
  font-family: 'Courier New', Consolas, Monaco, monospace;
}

.xml-viewer-wrapper.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: white;
  padding: 16px;
}

.xml-viewer-wrapper.fullscreen >>> .CodeMirror {
  height: calc(100vh - 32px);
}
</style>
