<template>
  <div ref="editorContainer" class="monaco-editor-container" :style="{ height: height + 'px' }"></div>
</template>

<script>
import * as monaco from 'monaco-editor'

// 手动配置Monaco Editor的worker路径
self.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return '/monaco-editor/min/vs/language/json/json.worker.js'
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return '/monaco-editor/min/vs/language/css/css.worker.js'
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return '/monaco-editor/min/vs/language/html/html.worker.js'
    }
    if (label === 'typescript' || label === 'javascript') {
      return '/monaco-editor/min/vs/language/typescript/ts.worker.js'
    }
    return '/monaco-editor/min/vs/editor/editor.worker.js'
  }
}

export default {
  name: 'MonacoEditor',
  props: {
    value: {
      type: String,
      default: ''
    },
    language: {
      type: String,
      default: 'xml'
    },
    theme: {
      type: String,
      default: 'vs'
    },
    options: {
      type: Object,
      default: () => ({})
    },
    height: {
      type: Number,
      default: 500
    },
    readOnly: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      editor: null,
      internalValue: ''
    }
  },
  watch: {
    value(newVal) {
      if (this.editor && newVal !== this.internalValue) {
        this.editor.setValue(newVal || '')
        this.internalValue = newVal
      }
    },
    language(newVal) {
      if (this.editor) {
        monaco.editor.setModelLanguage(this.editor.getModel(), newVal)
      }
    },
    theme(newVal) {
      if (this.editor) {
        monaco.editor.setTheme(newVal)
      }
    },
    readOnly(newVal) {
      if (this.editor) {
        this.editor.updateOptions({ readOnly: newVal })
      }
    }
  },
  mounted() {
    this.initEditor()
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.dispose()
    }
  },
  methods: {
    initEditor() {
      const defaultOptions = {
        automaticLayout: true,
        fontSize: 14,
        minimap: {
          enabled: true
        },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        readOnly: this.readOnly,
        formatOnPaste: true,
        formatOnType: true
      }

      const editorOptions = {
        ...defaultOptions,
        ...this.options,
        value: this.value || '',
        language: this.language,
        theme: this.theme
      }

      this.editor = monaco.editor.create(this.$refs.editorContainer, editorOptions)
      this.internalValue = this.value || ''

      // 监听内容变化
      this.editor.onDidChangeModelContent(() => {
        const value = this.editor.getValue()
        this.internalValue = value
        this.$emit('input', value)
        this.$emit('change', value)
      })

      // 监听焦点事件
      this.editor.onDidFocusEditorText(() => {
        this.$emit('focus')
      })

      this.editor.onDidBlurEditorText(() => {
        this.$emit('blur')
      })
    },

    // 获取编辑器实例
    getEditor() {
      return this.editor
    },

    // 获取值
    getValue() {
      return this.editor ? this.editor.getValue() : ''
    },

    // 设置值
    setValue(value) {
      if (this.editor) {
        this.editor.setValue(value || '')
      }
    },

    // 格式化代码
    format() {
      if (this.editor) {
        this.editor.getAction('editor.action.formatDocument').run()
      }
    },

    // 撤销
    undo() {
      if (this.editor) {
        this.editor.trigger('source', 'undo')
      }
    },

    // 重做
    redo() {
      if (this.editor) {
        this.editor.trigger('source', 'redo')
      }
    },

    // 全选
    selectAll() {
      if (this.editor) {
        this.editor.setSelection(this.editor.getModel().getFullModelRange())
      }
    },

    // 聚焦
    focus() {
      if (this.editor) {
        this.editor.focus()
      }
    }
  }
}
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;
}
</style>
