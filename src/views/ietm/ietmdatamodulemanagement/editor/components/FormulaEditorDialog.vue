<!--
  公式编辑器对话框组件
  用于Para设计视图的公式编辑功能
  集成KityFormula编辑器

  @author Claude
  @since 2026-10-13
-->

<template>
  <a-modal
    title="插入公式"
    :visible="visible"
    :width="800"
    :mask="false"
    :maskClosable="false"
    :destroyOnClose="true"
    @cancel="handleCancel">

    <!-- 加载提示 -->
    <div v-if="loading" class="formula-loading">
      <a-spin/>
      <span>正在加载公式编辑器...</span>
    </div>

    <!-- 编辑器容器 -->
    <div v-else class="formula-editor-wrapper">
      <!-- KityFormula编辑器容器 -->
      <div id="kfEditorContainer" class="kf-editor"></div>

      <!-- 公式预览 -->
      <div class="formula-preview">
        <div class="preview-title">LaTeX代码：</div>
        <div class="preview-content">
          <input
            v-model="currentLatex"
            type="text"
            class="latex-input"
            placeholder="公式的LaTeX代码将显示在这里"
            readonly/>
        </div>
      </div>
    </div>

    <template slot="footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button v-if="!loading" type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script>
/**
 * 公式编辑器对话框组件
 *
 * 功能：
 * 1. 加载KityFormula编辑器
 * 2. 支持编辑和新建公式
 * 3. 生成Base64图片和LaTeX代码
 * 4. 回调回显公式内容
 *
 * 使用示例：
 * <formula-editor-dialog ref="formulaDialog" @confirm="handleFormulaConfirm" />
 * this.$refs.formulaDialog.open(formulaHtml);  // 编辑已有公式
 * this.$refs.formulaDialog.open();              // 新建公式
 */
export default {
  name: 'FormulaEditorDialog',

  data() {
    return {
      // 对话框控制
      visible: false,
      loading: true,

      // 公式编辑器实例
      kityFormulaEditor: null,

      // 公式数据
      currentLatex: '\\placeholder',
      currentBase64: '',

      // 脚本加载标记
      scriptsLoaded: false,
      formulaChangeTimer: null
    }
  },

  computed: {
    /**
     * KityFormula库的根路径
     */
    kityFormulaPath() {
      return '/static/ueditor/kityformula-plugin'
    }
  },

  mounted() {
    // 预加载KityFormula库
    this.loadKityFormulaScripts()
  },

  methods: {
    /**
     * 加载KityFormula依赖脚本
     */
    loadKityFormulaScripts() {
      if (this.scriptsLoaded) {
        return
      }

      const scripts = [
        `${this.kityFormulaPath}/kityformula/js/jquery-1.11.0.min.js`,
        `${this.kityFormulaPath}/kityformula/js/kitygraph.all.js`,
        `${this.kityFormulaPath}/kityformula/js/kity-formula-render.all.js`,
        `${this.kityFormulaPath}/kityformula/js/kity-formula-parser.all.min.js`,
        `${this.kityFormulaPath}/kityformula/js/kityformula-editor.all.min.js`
      ]

      // 动态加载脚本
      let loadedCount = 0
      scripts.forEach(src => {
        const script = document.createElement('script')
        script.src = src
        script.onload = () => {
          loadedCount++
          if (loadedCount === scripts.length) {
            this.scriptsLoaded = true
          }
        }
        document.head.appendChild(script)
      })

      // 加载样式表
      const styles = [
        `${this.kityFormulaPath}/kityformula/assets/styles/base.css`,
        `${this.kityFormulaPath}/kityformula/assets/styles/ui.css`,
        `${this.kityFormulaPath}/kityformula/assets/styles/scrollbar.css`
      ]

      styles.forEach(href => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        document.head.appendChild(link)
      })
    },

    /**
     * 打开对话框
     * @param {String} formulaHtml - 已有的公式HTML（可选）
     */
    open(formulaHtml = null) {
      this.visible = true
      this.loading = true

      // 如果已有公式，提取LaTeX代码用于编辑
      if (formulaHtml) {
        this.extractLatexFromFormula(formulaHtml)
      }

      // 等待脚本加载完成后初始化编辑器
      this.$nextTick(() => {
        this.waitForScriptsLoaded(() => {
          this.initializeEditor()
          this.loading = false
        })
      })
    },

    /**
     * 等待脚本加载完成
     */
    waitForScriptsLoaded(callback) {
      const checkInterval = setInterval(() => {
        if (typeof window.kf !== 'undefined' && this.scriptsLoaded) {
          clearInterval(checkInterval)
          callback()
        }
      }, 100)

      // 超时保护（10秒）
      setTimeout(() => {
        clearInterval(checkInterval)
        if (typeof window.kf === 'undefined') {
          this.$message.error('公式编辑器加载失败')
          this.loading = false
        }
      }, 10000)
    },

    /**
     * 初始化KityFormula编辑器
     */
    initializeEditor() {
      const container = document.getElementById('kfEditorContainer')
      if (!container) {
        console.error('编辑器容器不存在')
        return
      }

      try {
        // 清空容器
        container.innerHTML = ''

        // 创建KityFormula工厂
        const factory = window.kf.EditorFactory.create(container, {
          render: {
            fontsize: 24  // 公式字体大小
          },
          resource: {
            path: `${this.kityFormulaPath}/kityformula/resource/`
          }
        })

        // 编辑器就绪回调
        factory.ready((kfe) => {
          this.kityFormulaEditor = kfe

          // 渲染公式（编辑已有或新建）
          this.kityFormulaEditor.execCommand(
            'render',
            this.currentLatex || '\\placeholder'
          )

          // 聚焦编辑器
          this.kityFormulaEditor.execCommand('focus')

          // 监听公式变化
          this.setupFormulaChangeListener()
        })

      } catch (error) {
        console.error('初始化公式编辑器失败', error)
        this.$message.error('初始化编辑器失败：' + error.message)
        this.loading = false
      }
    },

    /**
     * 设置公式变化监听器
     */
    setupFormulaChangeListener() {
      // 定期更新LaTeX代码显示
      const updateLatex = () => {
        if (this.kityFormulaEditor) {
          const latex = this.kityFormulaEditor.execCommand('get.source')
          this.currentLatex = latex || '\\placeholder'
        }
      }

      // 每500ms更新一次
      this.formulaChangeTimer = setInterval(updateLatex, 500)
    },

    /**
     * 从公式HTML中提取LaTeX代码
     */
    extractLatexFromFormula(formulaHtml) {
      try {
        // 正则表达式提取data-latex属性
        const match = formulaHtml.match(/data-latex="([^"]+)"/)
        if (match && match[1]) {
          // 处理HTML编码
          this.currentLatex = decodeURIComponent(match[1])
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
        }
      } catch (error) {
        console.error('提取LaTeX代码失败', error)
        this.currentLatex = '\\placeholder'
      }
    },

    /**
     * 处理确定按钮
     */
    handleConfirm() {
      if (!this.kityFormulaEditor) {
        this.$message.error('编辑器未初始化')
        return
      }

      try {
        // 获取LaTeX源代码
        const latex = this.kityFormulaEditor.execCommand('get.source')

        // 获取Base64图片数据
        this.kityFormulaEditor.execCommand('get.image.data', (data) => {
          try {
            // 验证数据
            if (!data || !data.img) {
              this.$message.error('无法生成公式图片，请重试')
              return
            }

            const base64Image = data.img

            // 生成公式HTML
            const formulaHtml = `<img class="kfformula" src="${base64Image}" data-latex="${encodeURIComponent(latex)}" />`

            // 提取图片尺寸
            const img = new Image()
            let imgWidth = 120
            let imgHeight = 40

            img.onload = () => {
              imgWidth = img.width || 120
              imgHeight = img.height || 40

              // 触发父组件的confirm事件
              this.$emit('confirm', {
                latex: latex,
                base64: base64Image,
                formulaHtml: formulaHtml,
                imageWidth: imgWidth,
                imageHeight: imgHeight
              })

              // 关闭对话框
              this.visible = false
            }

            img.onerror = () => {
              // 如果获取尺寸失败，使用默认值
              this.$emit('confirm', {
                latex: latex,
                base64: base64Image,
                formulaHtml: formulaHtml,
                imageWidth: 120,
                imageHeight: 40
              })
              this.visible = false
            }

            img.src = base64Image

          } catch (error) {
            console.error('处理公式数据失败', error)
            this.$message.error('处理公式失败：' + error.message)
          }
        })

      } catch (error) {
        console.error('获取公式信息失败', error)
        this.$message.error('获取公式信息失败：' + error.message)
      }
    },

    /**
     * 处理取消按钮
     */
    handleCancel() {
      this.visible = false
      this.$emit('cancel')
      this.cleanup()
    },

    /**
     * 清理资源
     */
    cleanup() {
      if (this.formulaChangeTimer) {
        clearInterval(this.formulaChangeTimer)
        this.formulaChangeTimer = null
      }

      this.currentLatex = '\\placeholder'
      this.currentBase64 = ''
      this.kityFormulaEditor = null
    }
  },

  beforeDestroy() {
    this.cleanup()
  }
}
</script>

<style scoped lang="less">
.formula-editor-wrapper {
  .formula-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
    font-size: 16px;
    color: #666;

    span {
      margin-left: 10px;
    }
  }

  .kf-editor {
    width: 100%;
    height: 350px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 20px;
    background: #fff;
    overflow: hidden;
  }

  .formula-preview {
    .preview-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #333;
    }

    .preview-content {
      .latex-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
        font-size: 12px;
        background: #f5f5f5;
        color: #333;

        &:focus {
          outline: none;
          border-color: #1890ff;
          background: #fff;
        }
      }
    }
  }
}
</style>
