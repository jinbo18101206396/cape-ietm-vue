<template>
  <a-modal
    :visible="visible"
    title="编辑条件内容"
    width="900px"
    :footer="null"
    :maskClosable="false"
    :destroyOnClose="true"
    @cancel="handleCancel"
  >
    <div class="para-editor-container">
      <!-- UEditor 编辑器容器 -->
      <div :id="editorId" style="width: 100%; height: 400px;"></div>
    </div>

    <!-- 底部按钮 -->
    <div class="modal-footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk" :loading="saving">
        <a-icon type="check"/>
        确定
      </a-button>
    </div>
  </a-modal>
</template>

<script>
/**
 * closeRqmts 条件内容编辑对话框
 *
 * @description 使用UEditor富文本编辑器编辑条件内容（支持粗体、斜体、下划线、上下标等）
 * @author IETM Team
 * @date 2026-11-14
 */
export default {
  name: 'CloseRqmtsParaEditor',

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
      saving: false,
      // 【v1.1优化】使用动态ID避免UEditor容器冲突
      editorId: `closeRqmtsUEditor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  },

  watch: {
    visible(val) {
      if (val) {
        // 对话框打开时初始化编辑器
        this.$nextTick(() => {
          this.initEditor()
        })
      } else {
        // 对话框关闭时销毁编辑器
        this.destroyEditor()
      }
    }
  },

  methods: {
    /**
     * 初始化UEditor编辑器
     */
    initEditor() {
      // 如果编辑器已存在，先销毁
      if (this.editor) {
        this.editor.destroy()
      }

      // 检查UEditor是否加载
      if (typeof UE === 'undefined') {
        this.$message.error('UEditor未加载，请刷新页面重试')
        console.error('UEditor is not loaded')
        return
      }

      try {
        // 参照FigureDesigner的UEditor配置
        this.editor = UE.getEditor(this.editorId, {
          // 工具栏配置（简化版，适合条件编辑）
          toolbars: [[
            'bold', 'italic', 'underline', 'strikethrough',        // 基本格式
            '|', 'subscript', 'superscript',                       // 上下标
            '|', 'undo', 'redo',                                   // 撤销重做
            '|', 'removeformat',                                   // 清除格式
            '|', 'inserttable', 'deletetable',                     // 表格
            '|', 'insertorderedlist', 'insertunorderedlist'        // 列表
          ]],
          autoHeightEnabled: false,
          initialFrameHeight: 400,
          initialFrameWidth: '100%',
          enableAutoSave: false,
          elementPathEnabled: false,
          wordCount: false,
          // 【v1.1优化】禁用不需要的功能
          imageActionName: '',          // 禁用图片上传
          scrawlActionName: '',         // 禁用涂鸦
          snapscreenActionName: '',     // 禁用截图
          catcherActionName: '',        // 禁用抓取
          videoActionName: '',          // 禁用视频
          fileActionName: ''            // 禁用附件
        })

        // 编辑器准备完成后设置内容
        this.editor.ready(() => {
          // 去除<para>标签后设置内容
          const htmlContent = this.initialContent
            .replace(/<\/?para>/gi, '')
            .trim()
          this.editor.setContent(htmlContent)

          // 聚焦到编辑器
          this.editor.focus()
        })
      } catch (error) {
        console.error('初始化UEditor失败:', error)
        this.$message.error('初始化编辑器失败: ' + error.message)
      }
    },

    /**
     * 销毁编辑器
     */
    destroyEditor() {
      if (this.editor) {
        try {
          this.editor.destroy()
        } catch (error) {
          console.warn('销毁UEditor失败:', error)
        }
        this.editor = null
      }
    },

    /**
     * 确定按钮处理
     */
    handleOk() {
      if (!this.editor) {
        this.$message.warning('编辑器未初始化')
        return
      }

      this.saving = true

      try {
        // 获取编辑器内容
        const htmlContent = this.editor.getContent()

        // 验证内容
        if (!htmlContent || htmlContent.trim() === '') {
          this.$message.warning('条件内容不能为空')
          this.saving = false
          return
        }

        // 构建返回数据
        const result = {
          html: htmlContent,
          xml: `<para>${htmlContent}</para>`
        }

        // 向父组件返回数据
        this.$emit('ok', result)

        this.saving = false

      } catch (error) {
        console.error('获取编辑器内容失败:', error)
        this.$message.error('保存失败: ' + error.message)
        this.saving = false
      }
    },

    /**
     * 取消按钮处理
     */
    handleCancel() {
      this.$emit('cancel')
    }
  },

  beforeDestroy() {
    // 组件销毁前清理编辑器
    this.destroyEditor()
  }
}
</script>

<style lang="less" scoped>
.para-editor-container {
  margin-bottom: 16px;

  // UEditor样式覆盖
  /deep/ .edui-default {
    line-height: normal;
  }

  /deep/ .edui-editor {
    border: 1px solid #d9d9d9;
    border-radius: 4px;

    &:hover {
      border-color: #40a9ff;
    }
  }

  /deep/ .edui-editor-iframeholder {
    background-color: #fff;
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
