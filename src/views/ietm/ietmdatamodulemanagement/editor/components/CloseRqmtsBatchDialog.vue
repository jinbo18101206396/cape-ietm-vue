<template>
  <a-modal
    :visible="visible"
    title="批量生成条件"
    width="600px"
    @ok="handleOk"
    @cancel="handleCancel"
    :maskClosable="false"
  >
    <div class="batch-dialog-content">
      <div class="hint">
        <a-icon type="info-circle" style="color: #1890ff; margin-right: 8px;"/>
        请粘贴文本，每行对应一个条件（条件类型默认为"无引用"）
      </div>

      <a-textarea
        v-model="pasteText"
        :rows="12"
        placeholder="示例：&#10;检查工具是否齐全&#10;清理工作区域&#10;确认安全措施到位"
        class="batch-textarea"
      />

      <div class="batch-stats">
        <span>当前行数：<b>{{ lineCount }}</b></span>
        <span style="margin-left: 16px;">有效条件：<b style="color: #52c41a;">{{ validLineCount }}</b></span>
      </div>
    </div>

    <template slot="footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button @click="handleClear" :disabled="!pasteText">清空</a-button>
      <a-button type="primary" @click="handleOk" :disabled="validLineCount === 0">
        确定生成（{{ validLineCount }}条）
      </a-button>
    </template>
  </a-modal>
</template>

<script>
/**
 * closeRqmts 批量生成对话框
 *
 * @description 支持粘贴多行文本，每行生成一个无引用类型的条件
 * @author IETM Team
 * @date 2026-11-14
 */
export default {
  name: 'CloseRqmtsBatchDialog',

  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      pasteText: ''
    }
  },

  computed: {
    /**
     * 总行数（包括空行）
     */
    lineCount() {
      if (!this.pasteText) return 0
      return this.pasteText.split('\n').length
    },

    /**
     * 有效行数（非空行）
     */
    validLineCount() {
      if (!this.pasteText) return 0
      return this.pasteText
        .split('\n')
        .filter(line => line.trim().length > 0)
        .length
    }
  },

  watch: {
    visible(val) {
      if (!val) {
        // 对话框关闭时清空内容
        this.pasteText = ''
      }
    }
  },

  methods: {
    /**
     * 确定按钮处理
     */
    handleOk() {
      const text = this.pasteText.trim()

      if (!text) {
        this.$message.warning('文本为空，不能生成')
        return
      }

      // 按行分割，过滤空行和仅包含空白字符的行
      const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      if (lines.length === 0) {
        this.$message.warning('没有有效的文本行')
        return
      }

      // 向父组件返回有效文本数组
      this.$emit('ok', lines)

      // 提示成功
      this.$message.success(`已生成 ${lines.length} 条条件`)
    },

    /**
     * 取消按钮处理
     */
    handleCancel() {
      this.$emit('cancel')
    },

    /**
     * 清空按钮处理
     */
    handleClear() {
      this.pasteText = ''
      this.$message.info('已清空文本')
    }
  }
}
</script>

<style lang="less" scoped>
.batch-dialog-content {
  .hint {
    margin-bottom: 12px;
    padding: 8px 12px;
    background-color: #e6f7ff;
    border: 1px solid #91d5ff;
    border-radius: 4px;
    color: #0050b3;
    font-size: 13px;
    line-height: 1.5;
  }

  .batch-textarea {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;

    &::placeholder {
      color: #bfbfbf;
      font-style: italic;
    }
  }

  .batch-stats {
    margin-top: 12px;
    padding: 8px 0;
    font-size: 13px;
    color: #595959;

    b {
      font-size: 16px;
      color: #262626;
    }
  }
}
</style>
