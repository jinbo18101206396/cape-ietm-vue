// LevelledParaDesigner 方法实现（临时文件，稍后合并回组件）

export const levelledParaDesignerMethods = {
  /* ==================== 树形数据相关 ==================== */

  convertToAntTreeData(nodes) {
    return nodes.map(node => ({
      key: node.id,
      title: node.title || '无标题',
      type: node.type || 'para',
      lparano: this.generateLparano(node.id),
      children: node.children && node.children.length > 0
        ? this.convertToAntTreeData(node.children)
        : undefined
    }))
  },

  generateLparano(id) {
    if (!id) return '层级'
    return '层级' + id
  },

  getAllNodeKeys(nodes, keys = []) {
    nodes.forEach(node => {
      keys.push(node.id)
      if (node.children && node.children.length > 0) {
        this.getAllNodeKeys(node.children, keys)
      }
    })
    return keys
  },

  getDisplayTitle(title) {
    if (!title) return '<span style="color: #999;">无标题</span>'
    return title
  },

  customRowHandler(record) {
    return {
      on: {
        click: () => {
          this.handleTreeNodeSelect(record)
        }
      },
      style: {
        cursor: 'pointer',
        background: this.selectedKeys.includes(record.key) ? '#e6f7ff' : 'transparent'
      }
    }
  },

  handleTreeNodeSelect(record) {
    this.selectedKeys = [record.key]
    this.selectedNode = findNodeById(this.rawTreeData, record.key)
    if (this.selectedNode) {
      this.currentTitle = this.selectedNode.title || ''
      // 清空所有 tab 的选中行
      Object.keys(this.selectedRowKeys).forEach(key => {
        this.$set(this.selectedRowKeys, key, [])
      })
    }
  },

  /* ==================== Tab 内容数据获取 ==================== */

  getItemCount(type) {
    if (!this.selectedNode || !this.selectedNode.html) return 0
    const data = this.selectedNode.html[type]
    if (!data) return 0
    try {
      const arr = JSON.parse(data)
      return Array.isArray(arr) ? arr.length : 0
    } catch {
      return 0
    }
  },

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
    const label = labelMap[type] || type
    return [
      {
        title: label,
        dataIndex: 'content',
        key: 'content',
        customRender: (text) => {
          if (!text) return ''
          // 移除HTML标签只显示纯文本
          const div = document.createElement('div')
          div.innerHTML = text
          const plainText = div.textContent || div.innerText || ''
          return plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '')
        }
      },
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 100
      }
    ]
  },

  getContentData(type) {
    if (!this.selectedNode || !this.selectedNode.html) return []
    const data = this.selectedNode.html[type]
    if (!data) return []
    try {
      const arr = JSON.parse(data)
      if (!Array.isArray(arr)) return []
      return arr.map((item, index) => ({
        key: index,
        content: item[type] || '',
        id: item.id || ''
      }))
    } catch {
      return []
    }
  },

  getRowSelection(type) {
    return {
      type: 'checkbox',
      selectedRowKeys: this.selectedRowKeys[type] || [],
      onChange: (selectedRowKeys) => {
        this.$set(this.selectedRowKeys, type, selectedRowKeys)
      }
    }
  },

  /* ==================== 内容操作权限判断 ==================== */

  canViewItem(type) {
    if (!this.selectedNode) return false
    const selected = this.selectedRowKeys[type] || []
    return selected.length === 1
  },

  canEditItem(type) {
    if (this.readonly || !this.selectedNode) return false
    const selected = this.selectedRowKeys[type] || []
    return selected.length === 1
  },

  canDeleteItem(type) {
    if (this.readonly || !this.selectedNode) return false
    const selected = this.selectedRowKeys[type] || []
    return selected.length > 0
  },

  canMoveItemUp(type) {
    if (this.readonly || !this.selectedNode) return false
    const selected = this.selectedRowKeys[type] || []
    if (selected.length !== 1) return false
    return selected[0] > 0
  },

  canMoveItemDown(type) {
    if (this.readonly || !this.selectedNode) return false
    const selected = this.selectedRowKeys[type] || []
    if (selected.length !== 1) return false
    const data = this.getContentData(type)
    return selected[0] < data.length - 1
  },

  /* ==================== 内容操作方法 ==================== */

  viewItem(type) {
    this.openContentEditor(type, this.selectedRowKeys[type][0], 'view')
  },

  addItem(type) {
    if (!this.selectedNode) {
      this.$message.warning('请先选择一个层级段落节点')
      return
    }
    this.openContentEditor(type, -1, 'add')
  },

  editItem(type) {
    if (!this.canEditItem(type)) return
    this.openContentEditor(type, this.selectedRowKeys[type][0], 'edit')
  },

  deleteItem(type) {
    if (!this.canDeleteItem(type)) return

    const selected = this.selectedRowKeys[type] || []
    this.$confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selected.length} 项吗？`,
      onOk: () => {
        if (!this.selectedNode.html) this.selectedNode.html = {}
        const data = this.getContentData(type)
        const newData = data.filter((_, index) => !selected.includes(index))
        this.selectedNode.html[type] = JSON.stringify(newData.map(item => ({
          [type]: item.content,
          id: item.id
        })))
        this.$set(this.selectedRowKeys, type, [])
        this.$message.success('删除成功')
      }
    })
  },

  moveItemUp(type) {
    if (!this.canMoveItemUp(type)) return
    const index = this.selectedRowKeys[type][0]
    const data = this.getContentData(type)
    const temp = data[index]
    data[index] = data[index - 1]
    data[index - 1] = temp
    if (!this.selectedNode.html) this.selectedNode.html = {}
    this.selectedNode.html[type] = JSON.stringify(data.map(item => ({
      [type]: item.content,
      id: item.id
    })))
    this.$set(this.selectedRowKeys, type, [index - 1])
    this.$message.success('上移成功')
  },

  moveItemDown(type) {
    if (!this.canMoveItemDown(type)) return
    const index = this.selectedRowKeys[type][0]
    const data = this.getContentData(type)
    const temp = data[index]
    data[index] = data[index + 1]
    data[index + 1] = temp
    if (!this.selectedNode.html) this.selectedNode.html = {}
    this.selectedNode.html[type] = JSON.stringify(data.map(item => ({
      [type]: item.content,
      id: item.id
    })))
    this.$set(this.selectedRowKeys, type, [index + 1])
    this.$message.success('下移成功')
  },

  batchGenerate(type) {
    this.$message.info(`批量生成 ${type} 功能待实现`)
  },

  /* ==================== 标题编辑 ==================== */

  handleTitleChange() {
    if (this.selectedNode) {
      this.selectedNode.title = this.currentTitle
      // 更新树形数据显示
      this.treeData = this.convertToAntTreeData(this.rawTreeData)
    }
  },

  openTitleEditor() {
    this.openContentEditor('title', 0, 'edit')
  },

  /* ==================== 内容编辑器 ==================== */

  async openContentEditor(type, index, mode) {
    this.contentEditorType = type
    this.contentEditorIndex = index
    const modeText = mode === 'view' ? '查看' : mode === 'edit' ? '编辑' : '添加'
    const labelMap = {
      title: '标题',
      warning: '警告',
      caution: '注意',
      para: '段落',
      note: '注',
      figure: '插图',
      multimedia: '多媒体',
      table: '表格'
    }
    this.contentEditorTitle = `${modeText}${labelMap[type] || type}`
    this.contentEditorVisible = true

    await this.$nextTick()

    try {
      await loadUEditor()

      const config = getUEditorConfig({
        readonly: mode === 'view' || this.readonly,
        simple: '0',
        toolbars: [[
          'source', '|', 'undo', 'redo', '|',
          'bold', 'italic', 'underline', 'superscript', 'subscript', '|',
          'fontsize', 'forecolor', '|',
          'insertorderedlist', 'insertunorderedlist', '|',
          'link', 'unlink', '|',
          'removeformat', 'cleardoc'
        ]]
      })

      this.contentEditor = window.UE.getEditor(this.contentEditorId, config)

      this.contentEditor.ready(() => {
        this.contentEditorReady = true
        let content = ''
        if (type === 'title') {
          content = this.currentTitle || ''
        } else if (index >= 0) {
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
      console.error('UEditor初始化失败:', error)
      this.$message.error('编辑器初始化失败')
    }
  },

  closeContentEditor() {
    if (this.contentEditor) {
      try {
        this.contentEditor.destroy()
      } catch (e) {
        console.warn('Editor destroy error:', e)
      }
      this.contentEditor = null
      this.contentEditorReady = false
    }
    this.contentEditorVisible = false
  },

  async saveContentEditor() {
    if (!this.contentEditorReady || !this.contentEditor) return

    try {
      this.contentEditorSaving = true
      const content = this.contentEditor.getContent()
      const type = this.contentEditorType
      const index = this.contentEditorIndex

      if (type === 'title') {
        this.currentTitle = content
        this.handleTitleChange()
      } else {
        if (!this.selectedNode.html) this.selectedNode.html = {}
        const data = this.getContentData(type)

        if (index >= 0) {
          // 编辑
          data[index].content = content
        } else {
          // 添加
          data.push({
            content: content,
            id: ''
          })
        }

        this.selectedNode.html[type] = JSON.stringify(data.map(item => ({
          [type]: item.content,
          id: item.id
        })))
      }

      this.$message.success('保存成功')
      this.closeContentEditor()
    } catch (error) {
      console.error('保存失败:', error)
      this.$message.error('保存失败: ' + error.message)
    } finally {
      this.contentEditorSaving = false
    }
  },

  /* ==================== 节点操作 ==================== */

  handleAddNode() {
    if (!this.selectedNode) {
      this.$message.warning('请选择一个层级段落节点')
      return
    }

    // 旧系统逻辑：添加下级
    const siblings = this.selectedNode.children || []
    let maxId = 0

    siblings.forEach(child => {
      const ids = child.id.split('.')
      const nowId = parseInt(ids[ids.length - 1])
      if (nowId > maxId) {
        maxId = nowId
      }
    })

    const newId = this.selectedNode.id + '.' + (maxId + 1)

    // 创建新节点
    const newNode = createEmptyNode('para', newId)
    newNode.title = '新层级段落'
    newNode.id = newId
    newNode.html = {
      para: '[]',
      warning: '[]',
      caution: '[]',
      note: '[]',
      figure: '[]',
      multimedia: '[]',
      table: '[]'
    }

    // 添加到树中
    if (!this.selectedNode.children) {
      this.selectedNode.children = []
    }
    this.selectedNode.children.push(newNode)

    // 更新树形数据
    this.rawTreeData = regenerateIds(this.rawTreeData)
    this.treeData = this.convertToAntTreeData(this.rawTreeData)

    // 展开父节点
    if (!this.expandedKeys.includes(this.selectedNode.id)) {
      this.expandedKeys.push(this.selectedNode.id)
    }

    // 选中新节点
    this.selectedKeys = [newNode.id]
    this.selectedNode = newNode
    this.currentTitle = newNode.title

    this.$message.success('层级段落添加成功')
  },

  handleDeleteNode() {
    if (!this.selectedNode) return

    // 旧系统逻辑1：不能删除根节点
    if (this.selectedNode.id === 'root' || this.selectedNode.id === '0') {
      this.$message.warning('请选择一个除根节点的层级段落')
      return
    }

    // 旧系统逻辑2：不能删除有子节点的节点
    if (this.selectedNode.children && this.selectedNode.children.length > 0) {
      this.$message.warning('当前层级段落还有下级层级段落，不能删除')
      return
    }

    // 旧系统逻辑3：检查是否有内容数据
    let hasContent = false
    if (this.selectedNode.html) {
      const contentTypes = ['para', 'warning', 'caution', 'note', 'figure', 'multimedia', 'table']
      for (const type of contentTypes) {
        if (this.selectedNode.html[type] && this.selectedNode.html[type] !== '[]') {
          try {
            const arr = JSON.parse(this.selectedNode.html[type])
            if (Array.isArray(arr) && arr.length > 0) {
              hasContent = true
              break
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (hasContent) {
      this.$message.warning('当前层级段落还有数据，不能删除')
      return
    }

    // 确认删除
    this.$confirm({
      title: '确认删除',
      content: `确定要删除该层级段落么？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        const parentId = this.getParentId(this.selectedNode.id)
        const parent = parentId ? findNodeById(this.rawTreeData, parentId) : null
        const siblings = parent ? parent.children : this.rawTreeData

        const index = siblings.findIndex(n => n.id === this.selectedNode.id)
        if (index > -1) {
          siblings.splice(index, 1)
        }

        this.rawTreeData = regenerateIds(this.rawTreeData)
        this.treeData = this.convertToAntTreeData(this.rawTreeData)

        this.selectedKeys = []
        this.selectedNode = null

        this.$message.success('节点删除成功')
      }
    })
  },

  /* ==================== 保存方法 ==================== */

  async handleSave() {
    if (this.saving) return

    try {
      this.saving = true

      const validation = validateTree(this.rawTreeData)
      if (!validation.valid) {
        this.$message.error('数据验证失败: ' + validation.errors.join('; '))
        return
      }

      let xml = treeToXml(this.rawTreeData)
      xml = this.formateXml(xml, 2)

      if (this.locale === 'cn') {
        xml = this.toCnXml(xml)
      }

      this.editor.replaceRange(
        xml,
        { line: this.lineno, ch: 0 },
        { line: this.endline, ch: this.editor.getLine(this.endline).length }
      )

      const newLineCount = xml.split('\n').length - 1
      this.endline = this.lineno + newLineCount

      this.$message.success('保存成功')

    } catch (error) {
      console.error('Save error:', error)
      this.$message.error('保存失败: ' + error.message)
    } finally {
      this.saving = false
    }
  },

  /* ==================== 工具方法 ==================== */

  getParentId(nodeId) {
    if (!nodeId || typeof nodeId !== 'string') return ''
    const parts = nodeId.split('.')
    if (parts.length <= 1) return ''
    parts.pop()
    return parts.join('.')
  }
}
