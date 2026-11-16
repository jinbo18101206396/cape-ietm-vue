/**
 * MainProcedureDesigner 补充方法
 * 通过 mixin 方式引入主组件
 *
 * 包含：
 * 1. 内容编辑方法（addItem, editItem, deleteItem等）
 * 2. 内容数据获取方法（getContentData, getItemCount等）
 * 3. UEditor自定义按钮注册（P0遗漏项）
 * 4. 插入方法（insertInterref, insertDmRef, insertSymbol）
 * 5. 辅助方法
 *
 * @author AI Assistant
 * @date 2026-11-16
 */

import { html2para, para2html } from '../utils/paraConverter'
import { escapeXmlForAttribute } from '../utils/paraConverter'

export default {
  methods: {
    // ==================== 内容数据获取方法 ====================

    /**
     * 获取内容项数量
     */
    getItemCount(type) {
      if (!this.selectedNode || !this.selectedNode.html) return 0
      const data = this.selectedNode.html[type]
      if (!data || data === '') return 0
      try {
        const arr = JSON.parse(data)
        return Array.isArray(arr) ? arr.length : 0
      } catch (e) {
        return 0
      }
    },

    /**
     * 获取内容表格列定义
     */
    getContentColumns(type) {
      const labelMap = {
        warning: '警告',
        caution: '注意',
        para: '段落',
        note: '注',
        figure: '插图',
        multimedia: '多媒体',
        table: '表格'
      }

      const columns = [
        {
          title: labelMap[type] || type,
          dataIndex: type === 'figure' || type === 'multimedia' || type === 'table' ? 'title' : 'content',
          key: 'content',
          align: 'center',
          scopedSlots: { customRender: type === 'figure' || type === 'multimedia' || type === 'table' ? 'xmlTitle' : 'content' }
        },
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 250,
          align: 'center'
        }
      ]

      return columns
    },

    /**
     * 获取内容数据
     */
    getContentData(type) {
      if (!this.selectedNode || !this.selectedNode.html) return []

      const data = this.selectedNode.html[type]
      if (!data || data === '') return []

      try {
        const arr = JSON.parse(data)
        if (!Array.isArray(arr)) return []

        return arr.map((item, index) => {
          return {
            key: index,
            content: item.content || '',
            title: item.title || '',
            id: item.id || '',
            xml: item.xml || ''
          }
        })
      } catch (e) {
        console.error(`[getContentData] 解析${type}数据失败:`, e)
        return []
      }
    },

    /**
     * 获取行选择配置
     */
    getRowSelection(type) {
      return {
        type: 'checkbox',
        selectedRowKeys: this.selectedRowKeys[type] || [],
        onChange: (selectedRowKeys) => {
          this.$set(this.selectedRowKeys, type, selectedRowKeys)
        }
      }
    },

    // ==================== 权限判断方法 ====================

    /**
     * 是否可以编辑
     */
    canEditItem(type) {
      if (this.readonly || !this.selectedNode) return false
      const selected = this.selectedRowKeys[type] || []
      return selected.length === 1
    },

    /**
     * 是否可以删除
     */
    canDeleteItem(type) {
      if (this.readonly || !this.selectedNode) return false
      const selected = this.selectedRowKeys[type] || []
      return selected.length > 0
    },

    /**
     * 是否可以上移
     */
    canMoveItemUp(type) {
      if (this.readonly || !this.selectedNode) return false
      const selected = this.selectedRowKeys[type] || []
      if (selected.length !== 1) return false
      return selected[0] > 0
    },

    /**
     * 是否可以下移
     */
    canMoveItemDown(type) {
      if (this.readonly || !this.selectedNode) return false
      const selected = this.selectedRowKeys[type] || []
      if (selected.length !== 1) return false
      const data = this.getContentData(type)
      return selected[0] < data.length - 1
    },

    // ==================== 内容操作方法 ====================

    /**
     * 添加内容项
     */
    addItem(type) {
      if (!this.selectedNode) {
        this.$message.warning('请先选择一个步骤节点')
        return
      }

      // 根据类型打开不同的编辑器
      if (type === 'figure' || type === 'multimedia' || type === 'table') {
        this.openStructuredEditor(type, -1, 'add')
      } else {
        this.openContentEditor(type, -1, 'add')
      }
    },

    /**
     * 编辑内容项
     */
    editItem(type) {
      if (!this.canEditItem(type)) return
      const index = this.selectedRowKeys[type][0]

      if (type === 'figure' || type === 'multimedia' || type === 'table') {
        this.openStructuredEditor(type, index, 'edit')
      } else {
        this.openContentEditor(type, index, 'edit')
      }
    },

    /**
     * 删除内容项
     */
    deleteItem(type) {
      if (!this.canDeleteItem(type)) return
      const selected = this.selectedRowKeys[type] || []

      this.$confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${selected.length} 项吗？`,
        onOk: () => {
          if (!this.selectedNode.html) {
            this.selectedNode.html = {}
          }

          const data = this.selectedNode.html[type]
          if (!data || data === '') return

          try {
            const arr = JSON.parse(data)
            const newArr = arr.filter((_, index) => !selected.includes(index))
            this.selectedNode.html[type] = newArr.length > 0 ? JSON.stringify(newArr) : ''
            this.$set(this.selectedRowKeys, type, [])
            this.$message.success('删除成功')
          } catch (e) {
            console.error('[deleteItem] 删除失败:', e)
            this.$message.error('删除失败')
          }
        }
      })
    },

    /**
     * 上移内容项（P2遗漏项补充）
     */
    moveItemUp(type) {
      if (!this.canMoveItemUp(type)) return
      const index = this.selectedRowKeys[type][0]

      if (!this.selectedNode.html) return

      const data = this.selectedNode.html[type]
      if (!data || data === '') return

      try {
        const arr = JSON.parse(data)
        const temp = arr[index]
        arr[index] = arr[index - 1]
        arr[index - 1] = temp

        this.selectedNode.html[type] = JSON.stringify(arr)
        this.$set(this.selectedRowKeys, type, [index - 1])
        this.$message.success('上移成功')
      } catch (e) {
        console.error('[moveItemUp] 上移失败:', e)
        this.$message.error('上移失败')
      }
    },

    /**
     * 下移内容项（P2遗漏项补充）
     */
    moveItemDown(type) {
      if (!this.canMoveItemDown(type)) return
      const index = this.selectedRowKeys[type][0]

      if (!this.selectedNode.html) return

      const data = this.selectedNode.html[type]
      if (!data || data === '') return

      try {
        const arr = JSON.parse(data)
        const temp = arr[index]
        arr[index] = arr[index + 1]
        arr[index + 1] = temp

        this.selectedNode.html[type] = JSON.stringify(arr)
        this.$set(this.selectedRowKeys, type, [index + 1])
        this.$message.success('下移成功')
      } catch (e) {
        console.error('[moveItemDown] 下移失败:', e)
        this.$message.error('下移失败')
      }
    },

    /**
     * 批量生成内容
     */
    batchGenerateContent(type) {
      if (!this.selectedNode) {
        this.$message.warning('请先选择一个步骤节点')
        return
      }
      this.batchGenerateVisible = true
      this.batchGenerateType = type
      this.batchGenerateText = ''
    },

    /**
     * 处理批量生成内容
     */
    handleBatchGenerateContents() {
      if (!this.batchGenerateText || !this.batchGenerateText.trim()) {
        this.$message.warning('请输入批量生成的内容')
        return
      }

      const type = this.batchGenerateType

      // 1. 处理文本
      const text = this.batchGenerateText
        .trim()
        .replace(/ /g, '')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, '')
        .split(' ')
        .filter((line) => line.trim())

      if (text.length === 0) {
        this.$message.warning('没有有效的内容行')
        return
      }

      // 2. 获取现有数据
      if (!this.selectedNode.html) {
        this.selectedNode.html = {}
      }

      let arr = []
      const data = this.selectedNode.html[type]
      if (data && data !== '') {
        try {
          arr = JSON.parse(data)
        } catch (e) {
          arr = []
        }
      }

      // 3. 批量添加
      text.forEach((line, index) => {
        const itemId = `${type}-${Date.now()}-${index}`
        arr.push({
          content: `<p>${this.escapeXml(line)}</p>`,
          id: itemId
        })
      })

      this.selectedNode.html[type] = JSON.stringify(arr)
      this.batchGenerateVisible = false
      this.$message.success(`成功批量生成 ${text.length} 项`)
    },

    // ==================== UEditor内容编辑器方法 ====================

    /**
     * 打开内容编辑器（para/warning/caution/note）
     */
    async openContentEditor(type, index, mode) {
      this.contentEditorType = type
      this.contentEditorIndex = index

      const modeText = mode === 'view' ? '查看' : mode === 'edit' ? '编辑' : '添加'
      const labelMap = {
        warning: '警告',
        caution: '注意',
        para: '段落',
        note: '注'
      }
      this.contentEditorTitle = `${modeText}${labelMap[type] || type}`
      this.contentEditorVisible = true

      await this.$nextTick()

      try {
        // 导入UEditor配置和加载函数
        const { getUEditorConfig, loadUEditor } = await import('../utils/ueditorConfig')
        await loadUEditor()

        const config = getUEditorConfig({
          readonly: mode === 'view' || this.readonly,
          toolbars: [
            [
              'source',
              '|',
              'undo',
              'redo',
              '|',
              'removeformat',
              'selectall',
              'cleardoc',
              '|',
              'date',
              'time',
              'spechars',
              'searchreplace',
              '|',
              'bold',
              'superscript',
              'subscript',
              '|',
              'insertorderedlist',
              'insertunorderedlist',
              '|',
              'deflist',
              'insertnextrow',
              'insertrow',
              'deleterow',
              '|',
              'interrefbutton',
              'dmrefbutton',
              'symbolbutton',
              '|',
              'kityformula'
            ]
          ]
        })

        this.contentEditor = window.UE.getEditor(this.contentEditorId, config)

        // 设置编辑器的唯一标识（用于全局实例映射）
        this.contentEditor.key = this.contentEditorId

        this.contentEditor.ready(() => {
          this.contentEditorReady = true
          let content = ''

          if (index >= 0) {
            const data = this.getContentData(type)
            if (data[index]) {
              content = data[index].content || ''
            }
          }

          this.contentEditor.setContent(content)

          if (mode === 'view' || this.readonly) {
            this.contentEditor.setDisabled()
          }
        })
      } catch (error) {
        console.error('[openContentEditor] UEditor初始化失败:', error)
        this.$message.error('编辑器初始化失败')
      }
    },

    /**
     * 保存内容编辑器
     */
    saveContentEditor() {
      if (!this.contentEditor || !this.contentEditorReady) {
        this.$message.warning('编辑器未就绪')
        return
      }

      this.contentEditorSaving = true

      try {
        const content = this.contentEditor.getContent()
        const type = this.contentEditorType
        const index = this.contentEditorIndex

        if (!this.selectedNode.html) {
          this.selectedNode.html = {}
        }

        let arr = []
        const data = this.selectedNode.html[type]
        if (data && data !== '') {
          try {
            arr = JSON.parse(data)
          } catch (e) {
            arr = []
          }
        }

        if (index >= 0) {
          // 编辑模式：更新现有项
          arr[index].content = content
        } else {
          // 添加模式：添加新项
          const itemId = `${type}-${Date.now()}`
          arr.push({
            content: content,
            id: itemId
          })
        }

        this.selectedNode.html[type] = JSON.stringify(arr)
        this.closeContentEditor()
        this.$message.success('保存成功')
      } catch (error) {
        console.error('[saveContentEditor] 保存失败:', error)
        this.$message.error('保存失败')
      } finally {
        this.contentEditorSaving = false
      }
    },

    /**
     * 关闭内容编辑器
     */
    closeContentEditor() {
      this.contentEditorVisible = false
      if (this.contentEditor) {
        try {
          this.contentEditor.destroy()
          this.contentEditor = null
        } catch (e) {
          console.warn('[closeContentEditor] 编辑器销毁失败:', e)
        }
      }
      this.contentEditorReady = false
    },

    /**
     * 打开结构化编辑器（figure/multimedia/table）
     */
    openStructuredEditor(type, index, mode) {
      if (!this.selectedNode) {
        this.$message.warning('请先选择一个步骤节点')
        return
      }

      this.structuredEditorType = type
      this.structuredEditorIndex = index

      const modeText = mode === 'view' ? '查看' : mode === 'edit' ? '编辑' : '添加'
      const labelMap = {
        figure: '插图',
        multimedia: '多媒体',
        table: '表格'
      }
      this.structuredEditorTitle = `${modeText}${labelMap[type] || type}`

      // 准备临时编辑器实例
      // 创建一个虚拟的CodeMirror实例来承载XML
      let xmlContent = ''

      if (index >= 0 && mode === 'edit') {
        // 编辑模式：从现有数据获取XML
        const data = this.getContentData(type)
        if (data[index]) {
          xmlContent = data[index].xml || ''
        }
      } else {
        // 添加模式：创建空XML模板（使用空标签触发Designer内置的空状态初始化路径）
        if (type === 'figure') {
          xmlContent = '<figure></figure>'
        } else if (type === 'multimedia') {
          xmlContent = '<multimedia></multimedia>'
        } else if (type === 'table') {
          xmlContent = '<table></table>'
        }
      }

      // 创建临时编辑器实例（模拟CodeMirror接口）
      this.structuredEditorInstance = {
        _tempContent: xmlContent,
        _tempLines: xmlContent.split('\n'),

        getLine: function(n) {
          return this._tempLines[n] || ''
        },

        lineCount: function() {
          return this._tempLines.length
        },

        getRange: function(from, to) {
          const lines = this._tempLines.slice(from.line, to.line + 1)
          if (lines.length === 1) {
            return lines[0].substring(from.ch, to.ch)
          }
          lines[0] = lines[0].substring(from.ch)
          lines[lines.length - 1] = lines[lines.length - 1].substring(0, to.ch)
          return lines.join('\n')
        },

        replaceRange: function(replacement, from, to) {
          const lines = replacement.split('\n')
          this._tempLines.splice(from.line, to.line - from.line + 1, ...lines)
          this._tempContent = this._tempLines.join('\n')
        },

        getContent: function() {
          return this._tempContent
        },

        setContent: function(content) {
          this._tempContent = content
          this._tempLines = content.split('\n')
        }
      }

      // 设置初始内容
      this.structuredEditorLineno = 0

      this.$nextTick(() => {
        this.structuredEditorVisible = true
      })
    },

    /**
     * 保存结构化编辑器
     */
    async saveStructuredEditor() {
      this.structuredEditorSaving = true

      try {
        const type = this.structuredEditorType
        const index = this.structuredEditorIndex
        let xml = ''

        // 从设计器组件的当前内部状态生成 XML（而非从初始模板读取）
        if (type === 'figure' && this.$refs.structuredFigureDesigner) {
          xml = await this.$refs.structuredFigureDesigner.generateFigureXml()
        } else if (type === 'multimedia' && this.$refs.structuredMultimediaDesigner) {
          xml = await this.$refs.structuredMultimediaDesigner.generateMultimediaXml()
        } else if (type === 'table' && this.$refs.structuredTableDesigner) {
          xml = await this.$refs.structuredTableDesigner.getTableXml()
        }

        if (!xml || xml.trim() === '') {
          this.$message.warning('内容为空，请先填写标题和内容')
          this.structuredEditorSaving = false
          return
        }

        // 提取标题
        const titleMatch = xml.match(/<title[^>]*>(.*?)<\/title>/s)
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '无标题'

        // 提取 ID（优先使用已有 ID，新增时生成）
        const idMatch = xml.match(/id="([^"]+)"/)
        const itemId = idMatch ? idMatch[1] : `${type}-${Date.now()}`

        if (!this.selectedNode.html) {
          this.selectedNode.html = {}
        }

        let arr = []
        const data = this.selectedNode.html[type]
        if (data && data !== '') {
          try {
            arr = JSON.parse(data)
          } catch (e) {
            arr = []
          }
        }

        if (index >= 0) {
          // 编辑模式：更新现有项
          arr[index].xml = xml
          arr[index].title = title
          arr[index].id = itemId
        } else {
          // 添加模式：添加新项
          arr.push({
            xml: xml,
            title: title,
            id: itemId
          })
        }

        this.selectedNode.html[type] = JSON.stringify(arr)
        this.closeStructuredEditor()
        this.$message.success('保存成功')
      } catch (error) {
        console.error('[saveStructuredEditor] 保存失败:', error)
        this.$message.error('保存失败: ' + error.message)
      } finally {
        this.structuredEditorSaving = false
      }
    },

    /**
     * 关闭结构化编辑器
     */
    closeStructuredEditor() {
      this.structuredEditorVisible = false
      this.structuredEditorInstance = null
      this.structuredEditorLineno = 0
    },

    /**
     * 处理结构化编辑器的保存事件（子组件触发）
     */
    handleStructuredEditorSave(xml) {
      // 子组件内部已完成保存，这里只需要获取结果
      if (this.structuredEditorInstance) {
        this.structuredEditorInstance.setContent(xml)
      }
    },

    // ==================== P0遗漏项：UEditor自定义按钮注册 ====================

    /**
     * 注册UEditor自定义按钮（全局注册，只执行一次）
     */
    registerCustomButtonsGlobal() {
      if (!window.UE) return

      // 检查按钮是否已注册，避免重复注册
      if (window.UE.ui && window.UE.ui['interrefbutton']) {
        console.log('[MainProcedure] 自定义按钮已注册，跳过')
        return
      }

      // 1. 注册 deflist 按钮（定义列表）
      window.UE.registerUI(
        'deflist',
        (editor, uiName) => {
          const btn = new window.UE.ui.Button({
            name: uiName,
            title: '定义列表',
            cssRules: 'background-position: -60px -20px;',
            onclick: () => {
              // 插入2行2列的定义列表表格
              const html = `<table deflist="1" border="1" style="width:100%">
            <tbody>
              <tr><th>术语1</th><td>定义1</td></tr>
              <tr><th>术语2</th><td>定义2</td></tr>
            </tbody>
          </table>`
              editor.execCommand('inserthtml', html)
            }
          })
          return btn
        },
        23
      )

      // 2. 注册 interrefbutton 按钮（内部引用）
      window.UE.registerUI(
        'interrefbutton',
        (editor, uiName) => {
          const btn = new window.UE.ui.Button({
            name: uiName,
            title: '内部引用',
            cssRules: 'background-position: -500px -0px;',
            onclick: () => {
              // 从全局映射获取当前实例，调用对话框
              const instanceId = editor.key
              const instance =
                window.$MAINPROCEDURE_DESIGNER_INSTANCES &&
                window.$MAINPROCEDURE_DESIGNER_INSTANCES[instanceId]
              if (instance && instance.$refs.interrefDialog) {
                // 🔧 修复：仅调用对话框的 open() 方法，由对话框组件内部通过 .sync 管理 visible 状态
                instance.$refs.interrefDialog.open()
              } else {
                console.error('[interrefbutton] 无法找到组件实例或对话框ref', {
                  instanceId,
                  instance,
                  hasDialog: instance && !!instance.$refs.interrefDialog
                })
              }
            }
          })
          return btn
        },
        25
      )

      // 3. 注册 dmrefbutton 按钮（DM引用）
      window.UE.registerUI(
        'dmrefbutton',
        (editor, uiName) => {
          const btn = new window.UE.ui.Button({
            name: uiName,
            title: 'DM引用',
            cssRules: 'background-position: -300px -20px;',
            onclick: () => {
              const instanceId = editor.key
              const instance =
                window.$MAINPROCEDURE_DESIGNER_INSTANCES &&
                window.$MAINPROCEDURE_DESIGNER_INSTANCES[instanceId]
              if (instance && instance.$refs.dmrefDialog) {
                // 🔧 修复：仅调用对话框的 open() 方法，由对话框组件内部通过 .sync 管理 visible 状态
                instance.$refs.dmrefDialog.open()
              }
            }
          })
          return btn
        },
        26
      )

      // 4. 注册 symbolbutton 按钮（图符）
      window.UE.registerUI(
        'symbolbutton',
        (editor, uiName) => {
          const btn = new window.UE.ui.Button({
            name: uiName,
            title: '图符',
            cssRules: 'background-position: -60px -20px;',
            onclick: () => {
              const instanceId = editor.key
              const instance =
                window.$MAINPROCEDURE_DESIGNER_INSTANCES &&
                window.$MAINPROCEDURE_DESIGNER_INSTANCES[instanceId]
              if (instance && instance.$refs.symbolDialog) {
                // 🔧 修复：仅调用对话框的 open() 方法，由对话框组件内部通过 .sync 管理 visible 状态
                instance.$refs.symbolDialog.open()
              }
            }
          })
          return btn
        },
        27
      )

      console.log('[MainProcedure] 自定义按钮注册完成')
    },

    // ==================== P0遗漏项：插入方法 ====================

    /**
     * 插入内部引用（从对话框回调）
     * @param {string} xml - internalRef的XML字符串
     */
    insertInterref(xml) {
      if (!this.contentEditor) return

      // 使用 HTML 实体编码，避免 XML 属性双引号丢失
      const escapedXml = xml.replace(/"/g, '&quot;')
      const html = `<a href="javascript:void(0);" xml="${escapedXml}">【内部引用】</a>`
      this.contentEditor.execCommand('inserthtml', html)
      // 🔧 修复：移除手动关闭对话框的逻辑，由对话框组件内部通过 .sync 管理
    },

    /**
     * 插入DM引用（从对话框回调）
     * @param {string} xml - dmRef的XML字符串
     */
    insertDmRef(xml) {
      if (!this.contentEditor) return

      const escapedXml = xml.replace(/"/g, '&quot;')
      const html = `<a href="javascript:void(0);" xml="${escapedXml}">【DM引用】</a>`
      this.contentEditor.execCommand('inserthtml', html)
      // 🔧 修复：移除手动关闭对话框的逻辑，由对话框组件内部通过 .sync 管理
    },

    /**
     * 插入图符（从对话框回调）
     * @param {string} xml - symbol的XML字符串
     */
    async insertSymbol(xml) {
      if (!this.contentEditor) return

      // 从 symbol 标签中提取 ICN 编码，获取真实图片 URL
      const apiBaseUrl = window._CONFIG['domianURL'] || '/jeecg-boot'

      // 解码XML（可能已经过HTML实体编码）
      let decodedXml = xml
      if (xml.includes('&lt;')) {
        decodedXml = xml
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
      }

      const icnMatch = decodedXml.match(/infoEntityIdent="([^"]+)"/)

      if (!icnMatch || !icnMatch[1]) {
        console.error('[insertSymbol] 无法从symbol标签中提取ICN编码', { xml, decodedXml })
        this.$message.error('无法提取图符ICN编码')
        return
      }

      const icn = icnMatch[1]
      let imgSrc = null

      try {
        const token = localStorage.getItem('pro__Access-Token')
          ? JSON.parse(localStorage.getItem('pro__Access-Token')).value
          : ''

        const icnInfo = await fetch(
          `${apiBaseUrl}/icnmanage/ietmIcnManage/queryByIcnCode?icn=${encodeURIComponent(icn)}`,
          { headers: { 'X-Access-Token': token } }
        ).then((r) => r.json())

        if (icnInfo.success && icnInfo.result) {
          const fileKey = icnInfo.result.ietmAttachment?.fileKey
          if (fileKey) {
            imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/viewFile?fileKey=${encodeURIComponent(
              fileKey
            )}`
          } else {
            imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
          }
        } else {
          imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
        }
      } catch (e) {
        console.warn('[insertSymbol] queryByIcnCode失败，使用view fallback:', e.message)
        imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
      }

      // 使用 HTML 实体编码保存转义后的 xml
      const escapedXml = xml
        .replace(/"/g, '`') // 先替换双引号为反引号
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      const html = `<img src="${imgSrc}" xml="${escapedXml}" style="max-width: 300px; max-height: 200px; width: auto; height: auto;" />`
      this.contentEditor.execCommand('inserthtml', html)
      // 🔧 修复：移除手动关闭对话框的逻辑，由对话框组件内部通过 .sync 管理
    }
  }
}
