<template>
  <a-modal
    :visible="visible"
    title="编辑条件内容"
    :width="800"
    :footer="null"
    :maskClosable="false"
    :destroyOnClose="true"
    @cancel="handleCancel"
  >
    <div ref="editorWrapper" class="content-editor-wrapper">
      <textarea :id="editorId" ref="editorTextarea"></textarea>
    </div>
    <div class="modal-footer" style="margin-top: 12px; text-align: right;">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk" :loading="saving">确定</a-button>
    </div>
  </a-modal>
</template>

<script>
import { loadUEditor, getUEditorConfig } from '../utils/ueditorConfig'

/**
 * closeRqmts 条件内容编辑对话框
 *
 * @description 使用UEditor富文本编辑器编辑条件内容（与LevelledParaDesigner保持一致）
 * @author IETM Team
 * @date 2026-11-14
 */
export default {
  name: 'CloseRqmtsParaEditorSimple',

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    initialContent: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      editor: null,
      editorReady: false,
      saving: false,
      editorId: `closeRqmts-para-editor-${Date.now()}`
    }
  },

  watch: {
    visible: {
      immediate: true,
      handler(val) {
        if (val) {
          this.$nextTick(() => {
            this.initEditor()
          })
        } else {
          this.destroyEditor()
        }
      }
    }
  },

  beforeDestroy() {
    this.destroyEditor()
  },

  methods: {
    async initEditor() {
      try {
        await loadUEditor()

        const config = getUEditorConfig({
          readonly: false,
          toolbars: [[
            'source', '|', 'undo', 'redo', '|', 'removeformat', 'selectall', 'cleardoc', '|',
            'date', 'time', 'spechars', 'searchreplace', '|',
            'bold', 'superscript', 'subscript', '|',
            'insertorderedlist', 'insertunorderedlist', '|',
            'deflist', 'insertnextrow', 'insertrow', 'deleterow', '|',
            'interrefbutton', 'dmrefbutton', 'symbolbutton', '|',
            'kityformula'
          ]]
        })

        this.editor = window.UE.getEditor(this.editorId, config)
        this.editor.key = this.editorId

        this.editor.ready(() => {
          this.editorReady = true
          // 移除 <para> 标签后设置内容
          const content = this.initialContent
            ? this.initialContent.replace(/<\/?para>/gi, '').trim()
            : ''
          this.editor.setContent(content)
        })
      } catch (error) {
        console.error('UEditor初始化失败:', error)
        this.$message.error('编辑器初始化失败')
      }
    },

    destroyEditor() {
      if (this.editor) {
        try {
          this.editor.destroy()
          this.editor = null
          this.editorReady = false
        } catch (error) {
          console.error('销毁编辑器失败:', error)
        }
      }
    },

    handleOk() {
      if (!this.editor || !this.editorReady) {
        this.$message.warning('编辑器未就绪，请稍候')
        return
      }

      // 获取编辑器内容
      const content = this.editor.getContent()

      // 验证内容
      if (!content || content.trim() === '') {
        this.$message.warning('条件内容不能为空')
        return
      }

      this.saving = true

      // 构建返回数据
      const result = {
        html: content,
        xml: `<para>${content}</para>`
      }

      // 延迟一点，让用户看到loading状态
      setTimeout(() => {
        this.saving = false
        this.$emit('ok', result)
        this.localVisible = false
      }, 200)
    },

    handleCancel() {
      this.$emit('cancel')
    }
  }
}
</script>

<style lang="less" scoped>
.content-editor-wrapper {
  min-height: 400px;

  /deep/ .edui-default {
    line-height: normal;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
