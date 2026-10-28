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
            :customRow="customRowHandler"
            :default-expand-all-rows="allExpanded"
            size="small"
            bordered
          >
            <template slot="lparano" slot-scope="text, record">
              <span class="tree-node-title">
                <span class="node-level">{{ text }}</span>
              </span>
            </template>
            <template slot="title" slot-scope="text, record">
              <span class="tree-node-content" v-html="getDisplayTitle(text)"></span>
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
      expandedKeys: [],
      allExpanded: true,

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
    console.group('[LevelledPara.mounted] 组件初始化')
    console.log('Props:', {
      lineno: this.lineno,
      editorExists: !!this.editor,
      locale: this.locale,
      ifedit: this.ifedit,
      save: this.save
    })
    console.groupEnd()
    this.loadContent()
  },

  beforeDestroy() {
    if (this.ueditor) {
      try {
        this.ueditor.destroy()
      } catch (e) {
        console.warn('[LevelledPara] UEditor destroy error:', e)
      }
    }
  },

  methods: {
    async loadContent() {
      console.log('\n')
      console.group('[LevelledPara.loadContent] 开始加载 ========================')

      // STEP 1: 检查输入
      console.group('STEP 1: 检查输入参数')
      if (!this.editor) {
        console.error('❌ editor 为 null/undefined')
        console.groupEnd()
        console.groupEnd()
        return
      }
      if (this.lineno === null || this.lineno === undefined) {
        console.error('❌ lineno 无效:', this.lineno)
        console.groupEnd()
        console.groupEnd()
        return
      }
      console.log('✅ 输入参数有效')
      console.log('editor type:', typeof this.editor)
      console.log('editor.getLine:', typeof this.editor.getLine)
      console.log('editor.lineCount:', typeof this.editor.lineCount)
      const lineCount = this.editor.lineCount?.() || -1
      console.log('总行数:', lineCount)
      console.groupEnd()

      try {
        // STEP 2: 读取第一行
        console.group('STEP 2: 从编辑器读取第' + (this.lineno + 1) + '行')
        let levelledParaXml = this.editor.getLine(this.lineno)
        console.log('读取结果:', levelledParaXml ? '✅ 成功 (长度: ' + levelledParaXml.length + ')' : '❌ 空')
        console.log('前100字符:', levelledParaXml?.substring(0, 100) || '(空)')
        console.groupEnd()

        // 验证行内容
        if (!levelledParaXml || levelledParaXml.trim() === '') {
          throw new Error(`第 ${this.lineno + 1} 行为空`)
        }

        // STEP 3: 检查是单行还是多行
        console.group('STEP 3: 检查XML行数')
        const isSingleLine = levelledParaXml.includes('<levelledPara') && levelledParaXml.includes('</levelledPara>')
        console.log('包含开标签:', levelledParaXml.includes('<levelledPara'))
        console.log('包含闭标签:', levelledParaXml.includes('</levelledPara>'))
        console.log('是单行:', isSingleLine ? '✅' : '❌')
        console.groupEnd()

        // 处理多行情况
        if (!isSingleLine) {
          console.group('STEP 4: 搜索多行XML的结束标签')
          this.endline = -1
          const lineCountValue = this.editor.lineCount()
          for (let i = this.lineno + 1; i < lineCountValue; i++) {
            const line = this.editor.getLine(i)
            if (line.includes('</levelledPara>')) {
              this.endline = i
              console.log('✅ 在第' + (i + 1) + '行找到结束标签')
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
          console.log('✅ 合并了第' + (this.lineno + 1) + '~' + (this.endline + 1) + '行，总长度:', levelledParaXml.length)
          console.groupEnd()
        } else {
          this.endline = this.lineno
          console.log('STEP 4: 单行XML，无需搜索')
        }

        // STEP 5: 语言转换
        console.group('STEP 5: 语言转换')
        if (this.locale === 'cn') {
          console.log('中文模式，调用 toEnXml...')
          levelledParaXml = this.toEnXml(levelledParaXml)
          console.log('✅ 转换完成')
        } else {
          console.log('英文模式，无需转换')
        }
        console.groupEnd()

        // STEP 6: 解析XML
        console.group('STEP 6: 解析XML为树形结构')
        console.log('XML内容预览 (前200字符):')
        console.log(levelledParaXml.substring(0, 200))

        this.rawTreeData = parseXmlToTree(levelledParaXml)

        console.log('✅ 解析完成')
        console.log('解析得到节点数:', this.rawTreeData.length)
        if (this.rawTreeData.length > 0) {
          console.log('第一个节点:', JSON.stringify(this.rawTreeData[0]))
        }
        console.groupEnd()

        // STEP 7: 验证
        console.group('STEP 7: 验证树数据')
        const validation = validateTree(this.rawTreeData)
        if (validation.valid) {
          console.log('✅ 验证通过')
        } else {
          console.error('❌ 验证失败:', validation.errors)
        }
        console.groupEnd()

        // STEP 8: 转换为AntTree格式
        console.group('STEP 8: 转换为AntTree格式')
        this.treeData = this.convertToAntTreeData(this.rawTreeData)
        console.log('✅ 转换完成，节点数:', this.treeData.length)
        console.groupEnd()

        // STEP 9: 设置展开
        console.group('STEP 9: 设置展开的节点')
        this.expandedKeys = this.getAllNodeKeys(this.rawTreeData)
        this.allExpanded = true
        console.log('✅ 展开节点数:', this.expandedKeys.length)
        console.groupEnd()

        // STEP 10: 自动选择第一个节点
        console.group('STEP 10: 自动选择第一个节点并初始化编辑器')
        if (this.rawTreeData && this.rawTreeData.length > 0) {
          const firstNode = this.rawTreeData[0]
          console.log('第一个节点:', { id: firstNode.id, type: firstNode.type, title: firstNode.title })

          this.selectedKeys = [firstNode.id]
          this.selectedNode = firstNode
          this.currentNodeType = firstNode.type

          console.log('✅ 已选择节点')
          console.log('scheduledNextTick 回调: 调用 initUEditor()...')

          this.$nextTick(() => {
            console.log('  [nextTick] 执行 initUEditor()')
            this.initUEditor()
          })
        } else {
          console.error('❌ rawTreeData 为空或不是数组', this.rawTreeData)
        }
        console.groupEnd()

        console.log('✅ loadContent 完成')
        console.groupEnd()

      } catch (error) {
        console.group('❌ ERROR')
        console.error('错误消息:', error.message)
        console.error('堆栈:', error.stack)
        console.groupEnd()
        console.groupEnd()
        this.$message.error('加载失败: ' + error.message)
      }
    },

    convertToAntTreeData(nodes) {
      return nodes.map(node => ({
        key: node.id,
        title: node.title,
        type: node.type,
        lparano: this.generateLparano(node.id),
        scopedSlots: { title: 'custom' },
        children: node.children && node.children.length > 0
          ? this.convertToAntTreeData(node.children)
          : undefined
      }))
    },

    generateLparano(id) {
      if (!id) return '层级'
      // ID 格式：根为"0"，一级为"1"、"2"等，二级为"1.1"、"1.2"等
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

    handleNodeSelect(selectedKeys, e) {
      if (selectedKeys.length === 0) return

      const nodeId = selectedKeys[0]
      this.selectedKeys = [nodeId]
      this.selectedNode = findNodeById(this.rawTreeData, nodeId)

      if (this.selectedNode) {
        this.currentNodeType = this.selectedNode.type
        this.initUEditor()
      }
    },

    handleNodeExpand(expandedKeys) {
      this.expandedKeys = expandedKeys
      this.allExpanded = expandedKeys.length === this.getAllNodeKeys(this.rawTreeData).length
    },

    toggleExpandAll() {
      if (this.allExpanded) {
        this.expandedKeys = []
        this.allExpanded = false
      } else {
        this.expandedKeys = this.getAllNodeKeys(this.rawTreeData)
        this.allExpanded = true
      }
    },

    async initUEditor() {
      if (!this.selectedNode) return

      if (this.ueditor) {
        try {
          this.ueditor.destroy()
        } catch (e) {
          console.warn('UEditor destroy error:', e)
        }
        this.ueditor = null
        this.ueditorReady = false
      }

      await this.$nextTick()

      try {
        await loadUEditor()

        const config = getUEditorConfig({
          readonly: this.readonly,
          simple: '0',
          toolbars: [[
            'undo', 'redo', '|',
            'bold', 'italic', 'underline', '|',
            'fontsize', 'forecolor', '|',
            'insertorderedlist', 'insertunorderedlist', '|',
            'link', 'unlink', '|',
            'source'
          ]]
        })

        this.ueditor = window.UE.getEditor(this.ueditorInstanceId, config)

        this.ueditor.ready(() => {
          this.ueditorReady = true
          if (this.selectedNode && this.selectedNode.content) {
            this.ueditor.setContent(this.selectedNode.content)
          }
        })

        this.ueditor.addListener('contentChange', () => {
          if (this.ueditorReady && this.selectedNode) {
            this.selectedNode.content = this.ueditor.getContent()
          }
        })

      } catch (error) {
        console.error('UEditor初始化失败:', error)
        this.$message.error('编辑器初始化失败')
      }
    },

    handleAddNode() {
      if (!this.selectedNode) {
        this.$message.warning('请选择一个层级段落节点')
        return
      }

      // 旧系统逻辑：添加下级
      // 计算新节点的ID
      const siblings = this.selectedNode.children || []
      let maxId = 0

      // 获取当前层级下所有子节点的最大ID号
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
      this.currentNodeType = newNode.type
      this.initUEditor()

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
      if (this.selectedNode.content && this.selectedNode.content.trim()) {
        hasContent = true
      }
      // 检查 html 对象中是否有数据
      if (this.selectedNode.html) {
        const contentTypes = ['para', 'warning', 'caution', 'note', 'figure', 'multimedia', 'table']
        for (const type of contentTypes) {
          if (this.selectedNode.html[type] && this.selectedNode.html[type] !== '[]') {
            hasContent = true
            break
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

    handleMoveUp() {
      if (!this.canMoveUp) return

      const parentId = this.getParentId(this.selectedNode.id)
      const parent = parentId ? findNodeById(this.rawTreeData, parentId) : null
      const siblings = parent ? parent.children : this.rawTreeData

      const index = siblings.findIndex(n => n.id === this.selectedNode.id)
      if (index > 0) {
        const temp = siblings[index]
        siblings[index] = siblings[index - 1]
        siblings[index - 1] = temp

        this.rawTreeData = regenerateIds(this.rawTreeData)
        this.treeData = this.convertToAntTreeData(this.rawTreeData)

        const movedNode = siblings[index - 1]
        this.selectedKeys = [movedNode.id]
        this.selectedNode = movedNode
      }
    },

    handleMoveDown() {
      if (!this.canMoveDown) return

      const parentId = this.getParentId(this.selectedNode.id)
      const parent = parentId ? findNodeById(this.rawTreeData, parentId) : null
      const siblings = parent ? parent.children : this.rawTreeData

      const index = siblings.findIndex(n => n.id === this.selectedNode.id)
      if (index < siblings.length - 1) {
        const temp = siblings[index]
        siblings[index] = siblings[index + 1]
        siblings[index + 1] = temp

        this.rawTreeData = regenerateIds(this.rawTreeData)
        this.treeData = this.convertToAntTreeData(this.rawTreeData)

        const movedNode = siblings[index + 1]
        this.selectedKeys = [movedNode.id]
        this.selectedNode = movedNode
      }
    },

    handleTypeChange(newType) {
      if (!this.selectedNode) return

      this.$confirm({
        title: '确认更改类型',
        content: `确定要将节点类型从 "${this.selectedNode.type}" 更改为 "${newType}" 吗？`,
        onOk: () => {
          const newNode = createEmptyNode(newType, this.selectedNode.id)
          newNode.title = this.selectedNode.title
          newNode.children = this.selectedNode.children

          const parentId = this.getParentId(this.selectedNode.id)
          const parent = parentId ? findNodeById(this.rawTreeData, parentId) : null
          const siblings = parent ? parent.children : this.rawTreeData

          const index = siblings.findIndex(n => n.id === this.selectedNode.id)
          if (index > -1) {
            siblings[index] = newNode
          }

          this.treeData = this.convertToAntTreeData(this.rawTreeData)

          this.selectedNode = newNode
          this.selectedKeys = [newNode.id]

          this.initUEditor()

          this.$message.success('节点类型已更改')
        },
        onCancel: () => {
          this.currentNodeType = this.selectedNode.type
        }
      })
    },

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

    getParentId(nodeId) {
      if (!nodeId || typeof nodeId !== 'string') return ''
      const parts = nodeId.split('.')
      if (parts.length <= 1) return ''
      parts.pop()
      return parts.join('.')
    },

    getNodeIcon(type) {
      const iconMap = {
        para: 'file-text',
        warning: 'warning',
        caution: 'exclamation-circle',
        note: 'info-circle',
        figure: 'picture',
        multimedia: 'video-camera',
        table: 'table'
      }
      return iconMap[type] || 'file'
    },

    getNodeColor(type) {
      const colorMap = {
        para: '#1890ff',
        warning: '#faad14',
        caution: '#ff4d4f',
        note: '#52c41a',
        figure: '#722ed1',
        multimedia: '#13c2c2',
        table: '#eb2f96'
      }
      return colorMap[type] || '#666'
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
    margin-bottom: 8px;

    .toolbar-title {
      font-size: 14px;
      font-weight: 600;
      color: #1890ff;
    }
  }

  .toolbar-controls {
    display: flex;
    gap: 8px;
    align-items: center;

    .save-btn {
      margin-left: auto;
    }
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

.left-tree {
  width: 350px;
  background: #fff;
  border-radius: 4px;
  display: flex;
  flex-direction: column;

  .tree-header {
    padding: 12px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;

    .expand-icon {
      cursor: pointer;
      font-size: 16px;
      color: #1890ff;

      &:hover {
        color: #40a9ff;
      }
    }
  }

  .tree-container {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .levelledpara-tree {
    .tree-node-title {
      display: flex;
      align-items: center;
      gap: 6px;

      .node-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

.right-editor {
  flex: 1;
  background: #fff;
  border-radius: 4px;
  display: flex;
  flex-direction: column;

  .editor-header {
    padding: 12px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    align-items: center;
    font-weight: 600;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
    position: relative;

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;

      p {
        margin-top: 16px;
        font-size: 14px;
      }
    }

    .ueditor-wrapper {
      height: 100%;
      padding: 12px;
    }
  }
}
</style>
