<template>
  <div class="levelledpara-designer">
    <!-- 工具栏 -->
    <div class="levelledpara-toolbar" v-if="showSaveBtn">
      <div class="toolbar-header">
        <span class="toolbar-title">◤层级段落◢</span>
        <div class="toolbar-actions">
          <a-button type="primary" icon="save" @click="handleSave" :loading="saving" size="small">保存</a-button>
        </div>
      </div>
      <div class="toolbar-controls">
        <a-button icon="plus" @click="handleAddNode" :disabled="readonly || !selectedNode" size="small">添加下级</a-button>
        <a-button icon="delete" @click="handleDeleteNode" :disabled="readonly || !selectedNode" size="small">删除</a-button>
      </div>
    </div>

    <!-- 主容器：左侧TreeGrid + 右侧Tabs -->
    <div class="levelledpara-main">
      <div class="main-layout">
        <!-- 左侧：TreeGrid 树形表格 -->
        <div class="left-treegrid">
          <a-table
            :columns="treeColumns"
            :data-source="treeData"
            :pagination="false"
            :show-header="true"
            :row-key="record => record.key"
            :custom-row="customRowHandler"
            size="small"
            bordered
          >
            <template slot="lparano" slot-scope="text, record">
              <span class="tree-node-title">
                <span class="node-level">{{ text }}</span>
              </span>
            </template>
            <template slot="title" slot-scope="text, record">
              <span class="tree-node-content">{{ getDisplayTitle(text) }}</span>
            </template>
          </a-table>
        </div>

        <!-- 右侧：Tab 切换内容编辑器 -->
        <div class="right-tabs">
          <a-tabs v-model="activeTab" size="small" type="card">
            <!-- 标题编辑 -->
            <a-tab-pane key="title" tab="标题">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="edit" size="small" @click="openTitleEditor" :disabled="!selectedNode || readonly">编辑标题</a-button>
                </div>
                <div class="title-display">
                  <a-input
                    v-model="currentTitle"
                    placeholder="当前层级段落标题"
                    :disabled="!selectedNode || readonly"
                    @change="handleTitleChange"
                  />
                </div>
              </div>
            </a-tab-pane>

            <!-- 警告 -->
            <a-tab-pane key="warning" :tab="`警告(${getItemCount('warning')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="eye" size="small" @click="viewItem('warning')" :disabled="!canViewItem('warning')">查看</a-button>
                  <a-button icon="plus" size="small" @click="addItem('warning')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('warning')" :disabled="!canEditItem('warning')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('warning')" :disabled="!canDeleteItem('warning')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('warning')" :disabled="!canMoveItemUp('warning')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('warning')" :disabled="!canMoveItemDown('warning')">下移</a-button>
                  <a-button icon="bars" size="small" @click="batchGenerate('warning')" :disabled="!selectedNode || readonly">批量生成</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('warning')"
                  :data-source="getContentData('warning')"
                  :pagination="false"
                  :row-selection="getRowSelection('warning')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>

            <!-- 注意 -->
            <a-tab-pane key="caution" :tab="`注意(${getItemCount('caution')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="eye" size="small" @click="viewItem('caution')" :disabled="!canViewItem('caution')">查看</a-button>
                  <a-button icon="plus" size="small" @click="addItem('caution')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('caution')" :disabled="!canEditItem('caution')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('caution')" :disabled="!canDeleteItem('caution')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('caution')" :disabled="!canMoveItemUp('caution')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('caution')" :disabled="!canMoveItemDown('caution')">下移</a-button>
                  <a-button icon="bars" size="small" @click="batchGenerate('caution')" :disabled="!selectedNode || readonly">批量生成</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('caution')"
                  :data-source="getContentData('caution')"
                  :pagination="false"
                  :row-selection="getRowSelection('caution')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>

            <!-- 段落 -->
            <a-tab-pane key="para" :tab="`段落(${getItemCount('para')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="eye" size="small" @click="viewItem('para')" :disabled="!canViewItem('para')">查看</a-button>
                  <a-button icon="plus" size="small" @click="addItem('para')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('para')" :disabled="!canEditItem('para')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('para')" :disabled="!canDeleteItem('para')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('para')" :disabled="!canMoveItemUp('para')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('para')" :disabled="!canMoveItemDown('para')">下移</a-button>
                  <a-button icon="bars" size="small" @click="batchGenerate('para')" :disabled="!selectedNode || readonly">批量生成</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('para')"
                  :data-source="getContentData('para')"
                  :pagination="false"
                  :row-selection="getRowSelection('para')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>

            <!-- 注 -->
            <a-tab-pane key="note" :tab="`注(${getItemCount('note')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="eye" size="small" @click="viewItem('note')" :disabled="!canViewItem('note')">查看</a-button>
                  <a-button icon="plus" size="small" @click="addItem('note')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('note')" :disabled="!canEditItem('note')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('note')" :disabled="!canDeleteItem('note')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('note')" :disabled="!canMoveItemUp('note')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('note')" :disabled="!canMoveItemDown('note')">下移</a-button>
                  <a-button icon="bars" size="small" @click="batchGenerate('note')" :disabled="!selectedNode || readonly">批量生成</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('note')"
                  :data-source="getContentData('note')"
                  :pagination="false"
                  :row-selection="getRowSelection('note')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>

            <!-- 插图 -->
            <a-tab-pane key="figure" :tab="`插图(${getItemCount('figure')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="eye" size="small" @click="viewItem('figure')" :disabled="!canViewItem('figure')">查看</a-button>
                  <a-button icon="plus" size="small" @click="addItem('figure')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('figure')" :disabled="!canEditItem('figure')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('figure')" :disabled="!canDeleteItem('figure')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('figure')" :disabled="!canMoveItemUp('figure')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('figure')" :disabled="!canMoveItemDown('figure')">下移</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('figure')"
                  :data-source="getContentData('figure')"
                  :pagination="false"
                  :row-selection="getRowSelection('figure')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>

            <!-- 多媒体 -->
            <a-tab-pane key="multimedia" :tab="`多媒体(${getItemCount('multimedia')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="eye" size="small" @click="viewItem('multimedia')" :disabled="!canViewItem('multimedia')">查看</a-button>
                  <a-button icon="plus" size="small" @click="addItem('multimedia')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('multimedia')" :disabled="!canEditItem('multimedia')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('multimedia')" :disabled="!canDeleteItem('multimedia')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('multimedia')" :disabled="!canMoveItemUp('multimedia')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('multimedia')" :disabled="!canMoveItemDown('multimedia')">下移</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('multimedia')"
                  :data-source="getContentData('multimedia')"
                  :pagination="false"
                  :row-selection="getRowSelection('multimedia')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>

            <!-- 表格 -->
            <a-tab-pane key="table" :tab="`表格(${getItemCount('table')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="eye" size="small" @click="viewItem('table')" :disabled="!canViewItem('table')">查看</a-button>
                  <a-button icon="plus" size="small" @click="addItem('table')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('table')" :disabled="!canEditItem('table')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('table')" :disabled="!canDeleteItem('table')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('table')" :disabled="!canMoveItemUp('table')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('table')" :disabled="!canMoveItemDown('table')">下移</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('table')"
                  :data-source="getContentData('table')"
                  :pagination="false"
                  :row-selection="getRowSelection('table')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>
    </div>

    <!-- 内容编辑对话框 -->
    <a-modal
      v-model="contentEditorVisible"
      :title="contentEditorTitle"
      :width="800"
      :footer="null"
      :maskClosable="false"
    >
      <div ref="contentEditorWrapper" class="content-editor-wrapper">
        <textarea :id="contentEditorId" ref="contentEditorTextarea"></textarea>
      </div>
      <div class="modal-footer" style="margin-top: 12px; text-align: right;">
        <a-button @click="closeContentEditor">取消</a-button>
        <a-button type="primary" @click="saveContentEditor" :loading="contentEditorSaving">确定</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { parseXmlToTree, treeToXml, validateTree, regenerateIds, findNodeById, createEmptyNode } from '../utils/levelledParaConverter'
import { getUEditorConfig, loadUEditor } from '../utils/ueditorConfig'

export default {
  name: 'LevelledParaDesigner',

  props: {
    lineno: { type: Number, required: true },
    editor: { type: Object, required: true },
    locale: { type: String, default: 'en' },
    cmnodeid: { type: String, required: true },
    ifedit: { type: String, default: '1' },
    save: { type: String, default: '1' }
  },

  inject: {
    getLocaleName: { default: () => (name) => name },
    toEnXml: { default: () => (xml) => xml },
    toCnXml: { default: () => (xml) => xml },
    formateXml: { default: () => (xml, indent) => xml }
  },

  data() {
    return {
      rawTreeData: [],
      treeData: [],
      selectedKeys: [],
      selectedNode: null,

      activeTab: 'title',
      currentTitle: '',

      treeColumns: [
        {
          title: '层级',
          dataIndex: 'lparano',
          key: 'lparano',
          width: 120,
          scopedSlots: { customRender: 'lparano' }
        },
        {
          title: '标题',
          dataIndex: 'title',
          key: 'title',
          scopedSlots: { customRender: 'title' }
        }
      ],

      selectedRowKeys: {},

      contentEditorVisible: false,
      contentEditorTitle: '',
      contentEditorType: '',
      contentEditorIndex: -1,
      contentEditor: null,
      contentEditorReady: false,
      contentEditorId: `content_editor_${Date.now()}`,
      contentEditorSaving: false,

      endline: -1,
      saving: false
    }
  },

  computed: {
    readonly() { return this.ifedit === '0' },
    showSaveBtn() { return this.save === '1' }
  },

  mounted() {
    this.loadContent()
  },

  beforeDestroy() {
    if (this.contentEditor) {
      try {
        this.contentEditor.destroy()
      } catch (e) {
        console.warn('[LevelledPara] ContentEditor destroy error:', e)
      }
    }
  },

  methods: {
    async loadContent() {
      try {
        let levelledParaXml = this.editor.getLine(this.lineno)
        if (!levelledParaXml || levelledParaXml.trim() === '') {
          throw new Error(`第 ${this.lineno + 1} 行为空`)
        }

        const isSingleLine = levelledParaXml.includes('<levelledPara') && levelledParaXml.includes('</levelledPara>')

        if (!isSingleLine) {
          this.endline = -1
          const lineCountValue = this.editor.lineCount()
          for (let i = this.lineno + 1; i < lineCountValue; i++) {
            const line = this.editor.getLine(i)
            if (line.includes('</levelledPara>')) {
              this.endline = i
              break
            }
          }
          if (this.endline === -1) {
            throw new Error(`未找到 </levelledPara> 结束标签`)
          }

          levelledParaXml = this.editor.getRange(
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        } else {
          this.endline = this.lineno
        }

        if (this.locale === 'cn') {
          levelledParaXml = this.toEnXml(levelledParaXml)
        }

        this.rawTreeData = parseXmlToTree(levelledParaXml)
        this.treeData = this.convertToAntTreeData(this.rawTreeData)

        if (this.rawTreeData && this.rawTreeData.length > 0) {
          const firstNode = this.rawTreeData[0]
          this.selectedKeys = [firstNode.id]
          this.selectedNode = firstNode
          this.currentTitle = firstNode.title || ''
          this.activeTab = 'title'
        }

      } catch (error) {
        console.error('加载失败:', error)
        this.$message.error('加载失败: ' + error.message)
      }
    },

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

    getDisplayTitle(title) {
      return title || '<span style="color: #999;">无标题</span>'
    },

    customRowHandler(record) {
      return {
        on: {
          click: () => {
            this.selectedKeys = [record.key]
            this.selectedNode = findNodeById(this.rawTreeData, record.key)
            if (this.selectedNode) {
              this.currentTitle = this.selectedNode.title || ''
              Object.keys(this.selectedRowKeys).forEach(key => {
                this.$set(this.selectedRowKeys, key, [])
              })
            }
          }
        },
        style: {
          cursor: 'pointer',
          background: this.selectedKeys.includes(record.key) ? '#e6f7ff' : 'transparent'
        }
      }
    },

    // ==================== Tab 内容数据 ====================

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
          key: 'content'
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

    // ==================== 权限判断 ====================

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

    // ==================== 内容操作 ====================

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

    // ==================== 标题编辑 ====================

    handleTitleChange() {
      if (this.selectedNode) {
        this.selectedNode.title = this.currentTitle
        this.treeData = this.convertToAntTreeData(this.rawTreeData)
      }
    },

    openTitleEditor() {
      this.openContentEditor('title', 0, 'edit')
    },

    // ==================== 编辑器 ====================

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
            data[index].content = content
          } else {
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

    // ==================== 节点操作 ====================

    handleAddNode() {
      if (!this.selectedNode) {
        this.$message.warning('请选择一个层级段落节点')
        return
      }

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

      if (!this.selectedNode.children) {
        this.selectedNode.children = []
      }
      this.selectedNode.children.push(newNode)

      this.rawTreeData = regenerateIds(this.rawTreeData)
      this.treeData = this.convertToAntTreeData(this.rawTreeData)

      this.selectedKeys = [newNode.id]
      this.selectedNode = newNode
      this.currentTitle = newNode.title

      this.$message.success('层级段落添加成功')
    },

    handleDeleteNode() {
      if (!this.selectedNode) return

      if (this.selectedNode.id === 'root' || this.selectedNode.id === '0') {
        this.$message.warning('请选择一个除根节点的层级段落')
        return
      }

      if (this.selectedNode.children && this.selectedNode.children.length > 0) {
        this.$message.warning('当前层级段落还有下级层级段落，不能删除')
        return
      }

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

    // ==================== 保存 ====================

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

    // ==================== 工具 ====================

    getParentId(nodeId) {
      if (!nodeId || typeof nodeId !== 'string') return ''
      const parts = nodeId.split('.')
      if (parts.length <= 1) return ''
      parts.pop()
      return parts.join('.')
    }
  }
}
</script>

<style scoped lang="less">
.levelledpara-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f0f2f5;
}

.levelledpara-toolbar {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 8px 12px;

  .toolbar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .toolbar-title {
      font-size: 14px;
      font-weight: 600;
      color: #1890ff;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;
    }
  }

  .toolbar-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.levelledpara-main {
  flex: 1;
  overflow: hidden;

  .main-layout {
    display: flex;
    height: 100%;
    gap: 8px;
    padding: 8px;
  }
}

.left-treegrid {
  width: 350px;
  background: #fff;
  border-radius: 4px;
  overflow: auto;

  ::v-deep .ant-table {
    font-size: 12px;
    margin-bottom: 0;
  }

  ::v-deep .ant-table-thead > tr > th {
    padding: 8px 4px;
    background: #fafafa;
  }

  ::v-deep .ant-table-tbody > tr > td {
    padding: 6px 4px;
  }

  .tree-node-title {
    display: flex;
    align-items: center;
    gap: 6px;

    .node-level {
      font-weight: 600;
      color: #1890ff;
      min-width: 40px;
    }
  }

  .tree-node-content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.right-tabs {
  flex: 1;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;

  ::v-deep .ant-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;

    .ant-tabs-content {
      flex: 1;
      overflow: hidden;
    }
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    height: 100%;

    .tab-toolbar {
      padding: 8px 12px;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      align-items: center;
    }

    .title-display {
      padding: 12px;
      flex: 1;
      overflow: auto;

      ::v-deep .ant-input {
        min-height: 100px;
      }
    }

    ::v-deep .ant-table {
      font-size: 12px;
      margin-bottom: 0;
    }

    ::v-deep .ant-table-thead > tr > th {
      padding: 8px 4px;
      background: #fafafa;
    }

    ::v-deep .ant-table-tbody > tr > td {
      padding: 6px 4px;
    }
  }
}

.content-editor-wrapper {
  height: 400px;
  overflow: hidden;

  textarea {
    display: none !important;
  }

  ::v-deep .edui-default {
    font-size: 12px;
  }
}
</style>