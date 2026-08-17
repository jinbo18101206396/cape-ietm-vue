<template>
  <a-modal
    :title="`DM内容预览 - ${model.dmcCode || ''}`"
    :width="modalWidth"
    :visible="visible"
    :footer="null"
    :bodyStyle="{ maxHeight: modalBodyHeight + 'px', overflowY: 'auto' }"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <!-- 加载失败状态 -->
      <a-result
        v-if="loadError"
        status="error"
        title="加载失败"
        :sub-title="errorMessage"
      >
        <template slot="extra">
          <a-button type="primary" @click="handleRetry">
            <a-icon type="reload" />
            重试
          </a-button>
          <a-button @click="handleCancel">关闭</a-button>
        </template>
      </a-result>

      <!-- 正常内容展示 -->
      <div v-else>
        <!-- 基本信息 -->
        <a-card size="small" title="基本信息" style="margin-bottom: 16px;">
        <a-descriptions size="small" :column="2" bordered>
          <a-descriptions-item label="DMC编码" :span="2">
            <a-tag color="blue" style="font-family: monospace;">{{ model.dmcCode }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="技术名称">
            {{ model.techName_dictText || model.techName || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="信息名称">
            {{ model.infoName_dictText || model.infoName || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="版本号">
            <a-tag color="blue">{{ model.issueNo }}-{{ model.inWork }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="语言/国家">
            {{ model.languageIsoCode_dictText || model.languageIsoCode || '-' }} /
            {{ model.countryIsoCode_dictText || model.countryIsoCode || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="引用类型" v-if="refInfo.refType">
            <a-tag :color="refTypeColor">
              <a-icon :type="refTypeIcon" />
              {{ refTypeText }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="引用位置" v-if="refInfo.refPosition">
            <span style="font-family: monospace; font-size: 12px;">{{ refInfo.refPosition }}</span>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 完整内容显示 -->
      <a-card size="small" style="margin-bottom: 16px;">
        <div slot="title">
          <a-icon type="file-text" />
          <span style="margin-left: 8px;">DM内容</span>
          <a-tag v-if="!model.dmContent" color="red" style="margin-left: 8px;">空内容</a-tag>
          <span v-else style="margin-left: 8px; color: #999; font-size: 12px;">
            {{ contentLengthFormatted }}
          </span>
        </div>
        <div slot="extra" v-if="model.dmContent">
          <a-button size="small" icon="copy" @click="handleCopyContent">
            复制内容
          </a-button>
        </div>

        <div v-if="model.dmContent">
          <div class="content-full" v-html="highlightedContent"></div>
        </div>
        <a-empty v-else description="该DM暂无内容">
          <span slot="description">
            <p>该DM暂无内容</p>
            <p style="color: #999; font-size: 12px; margin-top: 8px;">
              可能原因：<br/>
              • DM尚未编辑<br/>
              • 内容已被清空<br/>
              • 数据导入时未包含内容
            </p>
          </span>
        </a-empty>
      </a-card>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'DmRefContentModal',
  data() {
    return {
      visible: false,
      loading: false,
      loadError: false, // 加载失败标记
      errorMessage: '', // 错误信息
      currentDmId: null, // 当前DM ID（用于重试）
      model: {},
      refInfo: {}, // 引用信息（refType, refPosition）
      modalBodyHeight: 600, // 弹窗内容区域最大高度
      modalWidth: 900 // 弹窗宽度
    }
  },
  computed: {
    // 内容总长度
    contentLength() {
      return this.model.dmContent ? this.model.dmContent.length : 0
    },
    // 格式化的内容长度
    contentLengthFormatted() {
      const len = this.contentLength
      if (len === 0) return '0 字符'
      if (len > 1024) {
        return (len / 1024).toFixed(1) + ' KB (' + len.toLocaleString() + ' 字符)'
      }
      return len.toLocaleString() + ' 字符'
    },
    // 高亮显示的内容
    highlightedContent() {
      if (!this.model.dmContent) return ''

      let content = this.model.dmContent

      // 性能优化：超大文件（>500KB）不进行格式化和高亮
      const isTooLarge = content.length > 500 * 1024

      if (isTooLarge) {
        // 只做HTML转义，不格式化，不高亮
        content = content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')

        return '<pre class="content-pre">' + content + '</pre>' +
               '<div style="text-align:center;color:#999;padding:10px;">文件过大，已禁用格式化和高亮以提升性能</div>'
      }

      // 第0步：XML格式化（自动缩进）
      content = this.formatXml(content)

      // 第1步：HTML转义（防止XSS）
      content = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')

      // 第2步：定义需要高亮的标签
      const refTags = [
        'dmRef', 'dmlRef', 'pmRef',      // DM引用类
        'graphic', 'multimedia',          // 资源引用类
        'internalRef',                    // 内部引用
        'externalPubRef',                 // 外部出版物引用
        'dmRefIdent', 'dmCode',          // DM引用子标签
        'graphicRef', 'multimediaRef'    // 资源引用子标签
      ]

      // 第3步：正则替换，添加高亮class
      refTags.forEach(tag => {
        // 开始标签：<tag> 或 <tag attr="value">
        const openTagRegex = new RegExp(`(&lt;${tag}\\b[^&]*?&gt;)`, 'gi')
        content = content.replace(openTagRegex, '<span class="highlight-ref">$1</span>')

        // 结束标签：</tag>
        const closeTagRegex = new RegExp(`(&lt;/${tag}&gt;)`, 'gi')
        content = content.replace(closeTagRegex, '<span class="highlight-ref">$1</span>')
      })

      // 第4步：包裹在<pre>标签中
      return '<pre class="content-pre">' + content + '</pre>'
    },
    // 引用类型文本
    refTypeText() {
      const typeMap = {
        'dmRef': 'DM引用',
        'dmlRef': 'DML引用',
        'pmRef': 'PM引用',
        'graphic': '图形引用',
        'multimedia': '多媒体引用',
        'internalRef': '内部引用'
      }
      return typeMap[this.refInfo.refType] || this.refInfo.refType
    },
    // 引用类型图标
    refTypeIcon() {
      const iconMap = {
        'dmRef': 'file-text',
        'dmlRef': 'file-text',
        'pmRef': 'file-text',
        'graphic': 'picture',
        'multimedia': 'play-circle',
        'internalRef': 'link'
      }
      return iconMap[this.refInfo.refType] || 'file'
    },
    // 引用类型颜色
    refTypeColor() {
      const colorMap = {
        'dmRef': 'blue',
        'dmlRef': 'cyan',
        'pmRef': 'purple',
        'graphic': 'green',
        'multimedia': 'orange',
        'internalRef': 'geekblue'
      }
      return colorMap[this.refInfo.refType] || 'default'
    }
  },
  mounted() {
    // 初始化弹窗高度
    this.calculateModalHeight()
    // 监听窗口大小变化
    window.addEventListener('resize', this.calculateModalHeight)
  },
  beforeDestroy() {
    // 移除监听
    window.removeEventListener('resize', this.calculateModalHeight)
  },
  methods: {
    // XML格式化（添加缩进）
    formatXml(xml) {
      if (!xml) return ''

      // 移除多余的空白字符
      xml = xml.replace(/>\s*</g, '><')

      let formatted = ''
      let indent = 0
      const indentStr = '  ' // 2个空格缩进

      xml.split(/>\s*</).forEach((node, index) => {
        // 处理第一个和最后一个节点
        if (index === 0) {
          node = node.replace(/^</, '')
        }
        if (index === xml.split(/>\s*</).length - 1) {
          node = node.replace(/>$/, '')
        }

        // 结束标签，减少缩进
        if (node.match(/^\/\w/)) {
          indent--
        }

        // 添加缩进
        formatted += indentStr.repeat(Math.max(0, indent)) + '<' + node + '>\n'

        // 开始标签且不是自闭合标签，增加缩进
        if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('/')) {
          indent++
        }
      })

      return formatted.trim()
    },

    // 计算弹窗最大高度和宽度
    calculateModalHeight() {
      // 计算高度
      const windowHeight = window.innerHeight
      const modalHeaderHeight = 55 // 弹窗标题栏高度
      const modalPadding = 48 // 弹窗上下边距
      const footerHeight = 60 // 底部按钮区域高度（已去掉，预留空间）
      const reserved = 100 // 预留空间

      this.modalBodyHeight = windowHeight - modalHeaderHeight - modalPadding - footerHeight - reserved

      // 最小高度400px，最大高度800px
      if (this.modalBodyHeight < 400) {
        this.modalBodyHeight = 400
      } else if (this.modalBodyHeight > 800) {
        this.modalBodyHeight = 800
      }

      // 计算宽度：窗口宽度 - 100px边距，最大900px，最小600px
      const windowWidth = window.innerWidth
      this.modalWidth = Math.min(900, Math.max(600, windowWidth - 100))
    },

    // 显示弹窗
    show(id, refInfo = {}) {
      this.visible = true
      this.loading = true
      this.loadError = false
      this.errorMessage = ''
      this.model = {}
      this.refInfo = refInfo // 保存引用信息
      this.currentDmId = id // 保存ID用于重试

      getAction('/ietm/datamodule/queryById', { id }).then(res => {
        if (res.success) {
          this.model = res.result
        } else {
          this.loadError = true
          this.errorMessage = res.message || '加载失败'
        }
      }).catch(err => {
        this.loadError = true
        this.errorMessage = err.message || '网络请求失败，请检查网络连接'
      }).finally(() => {
        this.loading = false
      })
    },

    // 重试加载
    handleRetry() {
      if (this.currentDmId) {
        this.show(this.currentDmId, this.refInfo)
      }
    },

    // 复制内容到剪贴板
    handleCopyContent() {
      if (!this.model.dmContent) {
        this.$message.warning('没有可复制的内容')
        return
      }

      // 创建临时文本区域
      const textarea = document.createElement('textarea')
      textarea.value = this.model.dmContent
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)

      // 选择并复制
      textarea.select()
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          this.$message.success('内容已复制到剪贴板')
        } else {
          this.$message.error('复制失败，请手动复制')
        }
      } catch (err) {
        this.$message.error('复制失败：' + err.message)
      }

      // 清理
      document.body.removeChild(textarea)
    },

    // 显示完整详情（打开DmViewModal）
    handleShowDetail() {
      this.$emit('show-detail', this.model.id)
    },

    // 关闭弹窗
    handleCancel() {
      this.visible = false
      this.loadError = false
      this.errorMessage = ''
      this.currentDmId = null
      this.model = {}
      this.refInfo = {}
    }
  }
}
</script>

<style scoped>
/* 完整内容显示 */
.content-full {
  max-height: 400px; /* 动态计算的最大高度，实际由JS控制 */
  overflow-y: auto;
  background: #f5f5f5;
  border-radius: 4px;
}

.content-pre {
  padding: 16px;
  font-size: 12px;
  line-height: 1.6;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

/* 引用标签高亮 */
.content-full >>> .highlight-ref {
  background-color: #fff3cd;
  color: #856404;
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgba(255, 193, 7, 0.3);
}

/* 滚动条样式 */
.content-full::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.content-full::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 4px;
}

.content-full::-webkit-scrollbar-thumb:hover {
  background: #999;
}

.content-full::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}
</style>
