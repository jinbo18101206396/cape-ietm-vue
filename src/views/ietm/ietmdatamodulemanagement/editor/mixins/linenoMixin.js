// editor/mixins/linenoMixin.js
// 行号换算公式汇总（§8.2 CONFIRMED）

export default {
  methods: {
    /**
     * 逻辑行号 → 编辑器行号（0-indexed）。
     * 公式：editorLine = lineno + linenoOffset - 2
     */
    logicToEditorLine(lineno, linenoOffset) {
      return Math.max(0, lineno + linenoOffset - 2)
    },
    /**
     * 编辑器行号（0-indexed）→ 逻辑行号。
     */
    editorToLogicLine(editorLine, linenoOffset) {
      return editorLine - linenoOffset + 2
    },
    /**
     * 校验错误定位（§17.4）：0-indexed = lineno - 1 + linenoOffset - 1。
     */
    validateLinenoToEditorLine(lineno, linenoOffset) {
      return Math.max(0, lineno - 1 + linenoOffset - 1)
    }
  }
}
