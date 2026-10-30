<template>
  <div class="table-designer">
    <!-- 北区域：工具栏和表格属性 -->
    <div class="table-toolbar" v-if="showSaveBtn">
      <div class="toolbar-header">
        <span class="toolbar-title">◤表格◢</span>
        <a-tooltip
          title="使用UEditor工具栏编辑表格内容。支持30个表格编辑按钮。表格结构将自动转换为S1000D40标准XML格式保存。"
          placement="bottomLeft"
        >
          <a-icon type="info-circle" style="color: #1890ff; margin-right: 12px; cursor: help; font-size: 14px;" />
        </a-tooltip>
      </div>

      <!-- 表格标题、ID和保存按钮在同一行 -->
      <div class="toolbar-controls">
        <label class="control-item">标题：<input type="text" v-model="tableTitle" class="table-input" placeholder="表格标题（可选）"/></label>
        <label class="control-item">ID：<input type="text" v-model="tableId" class="table-input" placeholder="表格ID（可选）"/></label>
        <a-button type="primary" icon="save" @click="handleSave" :loading="saving" class="save-btn">保存</a-button>
      </div>
    </div>

    <!-- 中区域：UEditor编辑器 -->
    <div ref="editorContainer" class="ueditor-container" :style="{ height: editorHeight }">
      <textarea :id="ueditorInstanceId" ref="textarea"></textarea>
    </div>

    <!-- 对话框组件（复用） -->
    <ietm-interref-dialog ref="interrefDialog" :visible.sync="interrefDialogVisible" :node-list="nodeList" @insert="insertInterref" />
    <ietm-dm-ref-dialog ref="dmrefDialog" :visible.sync="dmrefDialogVisible" @insert="insertDmRef" />
    <ietm-symbol-dialog ref="symbolDialog" :visible.sync="symbolDialogVisible" @insert="insertSymbol" />
  </div>
</template>

<script>
import { htmlToTableXml, xmlToTableHtml } from '../utils/tableConverter'
import { getUEditorConfig, loadUEditor } from '../utils/ueditorConfig'
import IetmInterrefDialog from './IetmInterrefDialog'
import IetmDmRefDialog from './IetmDmRefDialog'
import IetmSymbolDialog from './IetmSymbolDialog'

export default {
  name: 'TableDesigner',
  components: {
    IetmInterrefDialog,
    IetmDmRefDialog,
    IetmSymbolDialog
  },

  props: {
    // 基础参数
    lineno: { type: Number, required: true },
    pflag: { type: String, default: '' },
    ifedit: { type: String, default: '1' },
    simple: { type: String, default: '0' },
    save: { type: String, default: '1' },

    // Parent接口（14个）
    editor: { type: Object, required: true },
    locale: { type: String, default: 'en' },
    cmnodeid: { type: String, required: true },
    projectParameters: { type: String, required: true },
    uniqueid: { type: String, required: true },
    dmCode: { type: String, required: true },
    nodeList: { type: Array, default: () => [] },

    // 格式化函数
    formateXml: { type: Function, default: (xml, indent) => xml }
  },

  data() {
    return {
      ueditor: null,
      ueditorReady: false,
      tableTitle: '',
      tableId: '',
      endline: -1,
      originalIndent: 0,  // 保存表格原始缩进
      saving: false,
      ueditorInstanceId: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      editorHeight: '400px',
      interrefDialogVisible: false,
      dmrefDialogVisible: false,
      symbolDialogVisible: false
    }
  },

  computed: {
    readonly() { return this.ifedit === '0' },
    showSaveBtn() { return this.save === '1' }
  },

  watch: {
    // 监听editor变化（Parent通知）
    editor: {
      handler() {
        if (this.editor && !this.ueditorReady) {
          this.$nextTick(() => {
            this.initUEditor()
          })
        }
      },
      immediate: true
    }
  },

  mounted() {
    // 初始化编辑器高度
    this.adjustEditorHeight()
    window.addEventListener('resize', this.adjustEditorHeight)
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.adjustEditorHeight)
    if (this.ueditor) {
      try {
        this.ueditor.destroy()
      } catch (e) {
        // UEditor销毁失败，继续
      }
    }

    // 🔧 修复P0-LAYOUT: 清理样式污染
    this._cleanupViewStyles()
  },

  methods: {
    // 🔧 修复P0-LAYOUT: 清理设计视图样式污染
    _cleanupViewStyles() {
      try {
        const selectors = [
          { method: 'closest', selector: '.design-view-container' },
          { method: 'closest', selector: '.view-tabs' },
          { method: 'closest', selector: '.ant-tabs-content' },
          { method: 'closest', selector: '.ant-tabs-tabpane' }
        ]

        selectors.forEach(({ method, selector }) => {
          const el = this.$el[method](selector)
          if (el) {
            const savedClass = el.className
            el.style.cssText = ''
            el.className = savedClass
          }
        })
      } catch (error) {
        // 清理样式污染失败，继续
      }
    },

    /**
     * 调整编辑器高度
     */
    adjustEditorHeight() {
      const container = this.$refs.editorContainer
      if (container) {
        const toolbarHeight = this.showSaveBtn ? 120 : 0
        const viewportHeight = window.innerHeight
        const containerOffset = container.getBoundingClientRect().top
        this.editorHeight = `${Math.max(300, viewportHeight - containerOffset - 20)}px`
      }
    },

    /**
     * 初始化UEditor
     */
    async initUEditor() {
      try {
        // 第1步：确保UEditor库已加载
        if (!window.UE) {
          await loadUEditor()
        }

        // 第2步：获取UEditor基础配置
        const config = getUEditorConfig({ locale: this.locale })

        // 第3步：为表格特化配置 - 覆盖工具栏为30个表格专用按钮
        config.toolbars = this.getTableToolbars()
        config.autoHeightEnabled = false
        config.autoFloatEnabled = false
        config.initialContent = '<table><tr><td></td></tr></table>'

        // 第4步：创建编辑器实例
        this.ueditor = UE.getEditor(this.ueditorInstanceId, config)

        // 第5步：绑定事件
        this.ueditor.addListener('ready', () => {
          this.ueditorReady = true
          // 从源码加载表格内容
          this.setcontent()
          // 注册自定义按钮
          this.registerCustomButtons()
        })

        this.ueditor.addListener('contentChange', () => {
          // 实时同步到源码（可选）
        })
      } catch (error) {
        console.error('UEditor初始化失败:', error)
        this.$message.error('表格编辑器初始化失败：' + error.message)
      }
    },

    /**
     * 获取表格专用工具栏配置（30个按钮）
     */
    getTableToolbars() {
      return [
        [
          // 源代码（1个）
          'source', '|',

          // 撤销/重做（2个）
          'undo', 'redo', '|',

          // 格式清除（3个）
          'removeformat', 'selectall', 'cleardoc', '|',

          // 特殊输入（3个）
          'date', 'time', 'spechars', '|',

          // 列表（2个）
          'insertorderedlist', 'insertunorderedlist', '|',

          // 文本格式（3个）
          'bold', 'superscript', 'subscript', '|',

          // 表格基础（2个）
          'inserttable', 'deletetable', '|',

          // 行操作（4个：前插入行、后插入行、删除行、设为表头、设为表尾）
          'insertrow', 'insertrownext', 'deleterow', 'setheadrow', 'setfootrow', '|',

          // 列操作（2个：前插入列、删除列）
          'insertcol', 'deletecol', '|',

          // 单元格合并（3个）
          'mergecells', 'mergeright', 'mergedown', '|',

          // 单元格拆分（3个）
          'splittocells', 'splittorows', 'splittocols'
        ]
      ]
    },

    /**
     * 注册自定义按钮：后插入行、设为表头、设为表尾
     */
    registerCustomButtons() {
      if (!window.UE) return

      try {
        // 自定义按钮1：后插入行 - 在表格当前行后插入新行
        UE.registerUI('insertrownext', (editor, uiName) => {
          const btn = new UE.ui.Button({
            name: uiName,
            title: '后插入行'
          })
          btn.onclick = function() {
            const range = editor.selection.getRange()
            let tr = range.startContainer

            // 处理文本节点：向上查找最近的TR
            while (tr && tr.tagName !== 'TR') {
              tr = tr.parentNode
            }

            if (!tr || tr.tagName !== 'TR') {
              console.warn('请先选中表格中的一行')
              return
            }

            // 在当前行之后插入新行
            const newRow = tr.parentNode.insertRow(tr.rowIndex + 1)
            const cellCount = tr.cells.length
            for (let i = 0; i < cellCount; i++) {
              newRow.insertCell(i)
            }

            editor.fireEvent('contentChange')
          }
          return btn
        })

        // 自定义按钮2：设置为表头
        UE.registerUI('setheadrow', (editor, uiName) => {
          const btn = new UE.ui.Button({
            name: uiName,
            title: '该行置为表头'
          })
          btn.onclick = function() {
            const range = editor.selection.getRange()
            let tr = range.startContainer

            // 处理文本节点：向上查找最近的TR
            while (tr && tr.tagName !== 'TR') {
              tr = tr.parentNode
            }

            if (!tr || tr.tagName !== 'TR') {
              console.warn('请先选中表格中的一行')
              return
            }

            // 移除表尾标记，添加表头标记
            $(tr).removeClass('tfoot').addClass('thead').css('background-color', '#ADD8E6')

            // 更新所有单元格为 <th>
            $(tr).find('td').each(function() {
              const $td = $(this)
              const $th = $('<th>').html($td.html()).attr('class', $td.attr('class'))
              $td.replaceWith($th)
            })

            editor.fireEvent('contentChange')
          }
          return btn
        })

        // 自定义按钮3：设置为表尾
        UE.registerUI('setfootrow', (editor, uiName) => {
          const btn = new UE.ui.Button({
            name: uiName,
            title: '该行置为表尾'
          })
          btn.onclick = function() {
            const range = editor.selection.getRange()
            let tr = range.startContainer

            // 处理文本节点：向上查找最近的TR
            while (tr && tr.tagName !== 'TR') {
              tr = tr.parentNode
            }

            if (!tr || tr.tagName !== 'TR') {
              console.warn('请先选中表格中的一行')
              return
            }

            // 移除表头标记，添加表尾标记
            $(tr).removeClass('thead').addClass('tfoot').css('background-color', '#98FB98')

            // 更新所有单元格为 <th>（表尾也使用 th）
            $(tr).find('td').each(function() {
              const $td = $(this)
              const $th = $('<th>').html($td.html()).attr('class', $td.attr('class'))
              $td.replaceWith($th)
            })

            editor.fireEvent('contentChange')
          }
          return btn
        })
      } catch (error) {
        console.warn('自定义按钮注册失败:', error)
      }
    },

    /**
     * 从源码加载表格内容
     */
    async setcontent() {
      if (!this.ueditorReady || !this.ueditor) return

      try {
        // 第1步：查找源码中的表格并记录原始缩进
        const line = this.editor.getLine(this.lineno)
        if (!line || !line.includes('<table')) {
          this.$message.warning('当前行不是表格')
          return
        }

        // 记录原始缩进（在替换前保存）
        const indentMatch = line.match(/^(\s*)/)
        this.originalIndent = indentMatch ? indentMatch[1].length : 0
        console.log('[TableDesigner] setcontent - 记录原始缩进:', this.originalIndent)

        // 第2步：查找表格范围
        let startLine = this.lineno
        let endLine = this.lineno

        // 向上查找<table
        while (startLine >= 0 && !this.editor.getLine(startLine).includes('<table')) {
          startLine--
        }

        // 向下查找</table>
        const totalLines = this.editor.lineCount()
        while (endLine < totalLines && !this.editor.getLine(endLine).includes('</table>')) {
          endLine++
        }

        // 第3步：提取XML
        let xml = this.editor.getRange(
          { line: startLine, ch: 0 },
          { line: endLine, ch: this.editor.getLine(endLine).length }
        )

        // 第4步：检测空表格（修正：问题4）
        if (/^<table[^>]*>\s*<\/table>$/.test(xml.trim())) {
          xml = `<table>
<tgroup cols="1">
<colspec colname="col1"/>
<tbody>
<row>
<entry colname="col1"><para></para></entry>
</row>
</tbody>
</tgroup>
</table>`
          this.tableTitle = ''
          this.tableId = ''
          this.ueditor.setContent('<table><tr><td></td></tr></table>')
          this.endline = endLine
          return
        }

        // 第5步：XML → HTML转换
        const { html, tableTitle, tableId } = await xmlToTableHtml(xml, this.locale)

        // 第6步：设置编辑器内容
        this.ueditor.setContent(html)
        this.tableTitle = tableTitle
        this.tableId = tableId
        this.endline = endLine
      } catch (error) {
        console.error('加载表格失败:', error)
        this.$message.error('加载表格失败：' + error.message)
      }
    },

    /**
     * 保存表格
     */
    async handleSave() {
      if (this.saving) return
      this.saving = true

      try {
        // 第1步：验证编辑器
        if (!this.ueditor) {
          throw new Error('编辑器未初始化')
        }

        // 第2步：获取HTML内容
        const html = this.ueditor.getContent()
        if (!html || html.trim() === '' || html.trim() === '<table></table>') {
          this.$message.warning('表格内容不能为空')
          return
        }

        // 第3步：HTML → XML转换
        let xml = await htmlToTableXml(html, this.tableTitle, this.tableId, this.locale)

        // 第4步：使用加载时记录的原始缩进格式化XML
        console.log('[TableDesigner] handleSave - 格式化前XML前100字符:', xml.substring(0, 100))
        console.log('[TableDesigner] handleSave - 使用原始缩进:', this.originalIndent)
        xml = this.formateXml(xml, this.originalIndent)
        console.log('[TableDesigner] handleSave - 格式化后XML前200字符:', xml.substring(0, 200))
        console.log('[TableDesigner] handleSave - 格式化后第一行:', JSON.stringify(xml.split('\n')[0]))
        console.log('[TableDesigner] handleSave - 第一行长度:', xml.split('\n')[0].length)

        // 🔧 移除formatXml添加的末尾换行符，避免在</table>下方生成空行
        // Bug根因：formatXml每行都加\n，导致最后一行</table>后面有\n，replaceRange时会在下一行生成空行
        // 解决方案：与ParaDesigner和FigureDesigner保持一致，移除末尾换行符
        if (xml.endsWith('\n')) {
          xml = xml.replace(/\n+$/, '')
          console.log('[TableDesigner] handleSave - 已移除末尾换行符')
        }

        // 第6步：替换源码中的表格
        if (this.endline >= this.lineno) {
          this.editor.replaceRange(
            xml,
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        } else {
          this.editor.replaceRange(
            xml,
            { line: this.lineno, ch: 0 },
            { line: this.lineno, ch: this.editor.getLine(this.lineno).length }
          )
        }

        // 刷新编辑器显示
        this.editor.refresh()

        this.$message.success('表格已保存')

        // 第7步：触发父组件保存事件（自动返回源码视图）
        this.$emit('save')

        // 第8步：触发父组件刷新事件
        this.$nextTick(() => {
          this.$emit('refresh', this.lineno)
        })
      } catch (error) {
        console.error('保存失败:', error)
        this.$message.error('保存失败：' + error.message)
      } finally {
        this.saving = false
      }
    },

    // 对话框方法（复用ParaDesigner的逻辑）
    insertInterref(item) {
      if (this.ueditor) {
        const content = `[INTERREF: ${item.id}]`
        this.ueditor.execCommand('inserttext', content)
      }
      this.interrefDialogVisible = false
    },

    insertDmRef(item) {
      if (this.ueditor) {
        const content = `[DMREF: ${item.dmCode}]`
        this.ueditor.execCommand('inserttext', content)
      }
      this.dmrefDialogVisible = false
    },

    insertSymbol(item) {
      if (this.ueditor) {
        const content = `[SYMBOL: ${item.symbolId}]`
        this.ueditor.execCommand('inserttext', content)
      }
      this.symbolDialogVisible = false
    }
  }
}
</script>

<style scoped lang="less">
.table-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  min-height: 0;

  .table-toolbar {
    display: flex;
    flex-direction: column;
    padding: 4px 12px;
    background: whitesmoke;
    border-bottom: 1px solid #e8e8e8;
    flex-shrink: 0;

    .toolbar-header {
      display: flex;
      align-items: center;
      height: 36px;

      .toolbar-title {
        font-size: 11pt;
        font-weight: bold;
        color: #2d75cd;
        font-family: 'Microsoft YaHei';
      }
    }

    .toolbar-controls {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      padding: 8px 0;
      font-size: 12px;

      .control-item {
        display: flex;
        align-items: center;
        white-space: nowrap;

        .table-input {
          margin-left: 4px;
          padding: 4px 6px;
          border: 1px solid #d9d9d9;
          border-radius: 2px;
          width: 150px;
          font-size: 12px;

          &:focus {
            border-color: #40a9ff;
            outline: none;
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
          }
        }
      }

      .save-btn {
        margin-left: auto;
      }
    }
  }

  .ueditor-container {
    flex: 1;
    height: 100% !important;
    overflow: visible;
    display: flex;
    flex-direction: column;
    min-height: 0;

    textarea {
      display: none;
    }

    iframe {
      width: 100% !important;
      height: 100% !important;
      flex: 1;
      border: none;
      overflow-y: auto !important;
    }
  }
}

/* 隐藏UEditor底部栏的第一个td（元素路径） */
/deep/ .edui-editor-bottomContainer td:first-child {
  display: none !important;
}
</style>
