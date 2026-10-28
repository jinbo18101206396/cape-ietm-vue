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
    </div>

    <!-- 主容器：左侧TreeGrid + 右侧Tabs -->
    <div class="levelledpara-main">
      <div class="main-layout">
        <!-- 左侧：TreeGrid 树形表格 -->
        <div class="left-treegrid">
          <!-- 树形表格工具栏 -->
          <div class="tree-toolbar">
            <a-button icon="plus" @click="handleAddNode" :disabled="readonly || !selectedNode" size="small">添加下级</a-button>
            <a-button icon="delete" @click="handleDeleteNode" :disabled="readonly || !selectedNode" size="small">删除</a-button>
          </div>
          <!-- 树形容器 -->
          <div class="tree-table-wrapper">
            <a-tree
              :tree-data="treeData"
              :expanded-keys="expandedKeys"
              :selected-keys="selectedKeys"
              :show-icon="false"
              :replace-fields="{ title: 'title', key: 'key', children: 'children' }"
              @select="onTreeSelect"
              @expand="onTreeExpand"
            >
              <template slot="title" slot-scope="{ lparano, title }">
                <span class="tree-node-title">
                  <span class="node-level">{{ lparano }}</span>
                  <span class="node-text">{{ title }}</span>
                </span>
              </template>
            </a-tree>
          </div>
        </div>

        <!-- 右侧：标题编辑区 + Tab 切换内容编辑器 -->
        <div class="right-content">
          <!-- 标题编辑区（独立40px区域） -->
          <div class="title-edit-area" v-if="selectedNode && selectedNode.id !== '0'">
            <table class="title-table">
              <tr>
                <td class="title-label">
                  <a @click="openTitleEditor" :disabled="readonly" class="title-link">标题</a>
                </td>
                <td class="title-input">
                  <a-input
                    v-model="currentTitle"
                    placeholder="当前层级段落标题"
                    :disabled="readonly"
                    @change="handleTitleChange"
                  />
                </td>
                <td class="title-save">
                  <a-button
                    type="danger"
                    @click="handleSaveLevel"
                    :disabled="!selectedNode || readonly"
                    size="small"
                    class="save-level-btn"
                  >
                    保存层级信息
                  </a-button>
                </td>
              </tr>
            </table>
          </div>

          <!-- Tab 切换内容编辑器 -->
          <div class="right-tabs">
            <a-tabs v-model="activeTab" size="small" type="card">
              <!-- 警告 -->
            <a-tab-pane key="warning" :tab="`警告(${getItemCount('warning')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
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
                  <a-button icon="plus" size="small" @click="addItem('para')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('para')" :disabled="!canEditItem('para')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('para')" :disabled="!canDeleteItem('para')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('para')" :disabled="!canMoveItemUp('para')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('para')" :disabled="!canMoveItemDown('para')">下移</a-button>
                  <a-button icon="vertical-align-bottom" size="small" @click="mergeDownPara" :disabled="!canMergeDown('para')">向下合并</a-button>
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

            <!-- 折叠 (S1000D 4.0) -->
            <a-tab-pane key="foldout" :tab="`折叠(${getItemCount('foldout')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="plus" size="small" @click="addItem('foldout')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('foldout')" :disabled="!canEditItem('foldout')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('foldout')" :disabled="!canDeleteItem('foldout')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('foldout')" :disabled="!canMoveItemUp('foldout')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('foldout')" :disabled="!canMoveItemDown('foldout')">下移</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('foldout')"
                  :data-source="getContentData('foldout')"
                  :pagination="false"
                  :row-selection="getRowSelection('foldout')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>

            <!-- 图说 (S1000D 4.0) -->
            <a-tab-pane key="caption" :tab="`图说(${getItemCount('caption')})`">
              <div class="tab-content">
                <div class="tab-toolbar">
                  <a-button icon="plus" size="small" @click="addItem('caption')" :disabled="!selectedNode || readonly">增加</a-button>
                  <a-button icon="edit" size="small" @click="editItem('caption')" :disabled="!canEditItem('caption')">编辑</a-button>
                  <a-button icon="delete" size="small" @click="deleteItem('caption')" :disabled="!canDeleteItem('caption')">删除</a-button>
                  <a-button icon="arrow-up" size="small" @click="moveItemUp('caption')" :disabled="!canMoveItemUp('caption')">上移</a-button>
                  <a-button icon="arrow-down" size="small" @click="moveItemDown('caption')" :disabled="!canMoveItemDown('caption')">下移</a-button>
                </div>
                <a-table
                  :columns="getContentColumns('caption')"
                  :data-source="getContentData('caption')"
                  :pagination="false"
                  :row-selection="getRowSelection('caption')"
                  size="small"
                  bordered
                />
              </div>
            </a-tab-pane>
          </a-tabs>
          </div>
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

    <!-- 批量生成对话框 -->
    <a-modal
      v-model="batchGenerateVisible"
      title="批量生成"
      :width="600"
      @ok="handleBatchGenerate"
      @cancel="closeBatchGenerate"
    >
      <div class="batch-generate-content">
        <p>请在下方输入内容，每行一项：</p>
        <a-textarea
          v-model="batchGenerateText"
          :rows="10"
          placeholder="每行输入一项内容，点击确定后将自动生成多个条目"
        />
      </div>
    </a-modal>

    <!-- 对话框组件 -->
    <ietm-interref-dialog ref="interrefDialog" :visible.sync="interrefDialogVisible" :node-list="nodeList" @insert="insertInterref"/>
    <ietm-dm-ref-dialog ref="dmrefDialog" :visible.sync="dmrefDialogVisible" @insert="insertDmRef"/>
    <ietm-symbol-dialog ref="symbolDialog" :visible.sync="symbolDialogVisible" @insert="insertSymbol"/>
  </div>
</template>

<script>
// 第3阶段修复：使用新的完整转换器
import { parseXmlToTree, treeToXml, createEmptyNode, getRowhtml, createEmptyHtmlContent, validateTree } from '../utils/levelledParaConverterV2'
// 从旧转换器导入 ID 重生成工具函数（独立功能）
import { regenerateIds } from '../utils/levelledParaConverter'
import { getUEditorConfig, loadUEditor } from '../utils/ueditorConfig'
import IetmInterrefDialog from './IetmInterrefDialog'
import IetmDmRefDialog from './IetmDmRefDialog'
import IetmSymbolDialog from './IetmSymbolDialog'

export default {
  name: 'LevelledParaDesigner',
  components: {
    IetmInterrefDialog,
    IetmDmRefDialog,
    IetmSymbolDialog
  },

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
      expandedKeys: [],
      selectedKeys: [],
      selectedNode: null,

      activeTab: 'warning',
      currentTitle: '',

      selectedRowKeys: {},

      contentEditorVisible: false,
      contentEditorTitle: '',
      contentEditorType: '',
      contentEditorIndex: -1,
      contentEditor: null,
      contentEditorReady: false,
      contentEditorId: `content_editor_${Date.now()}`,
      contentEditorSaving: false,

      batchGenerateVisible: false,
      batchGenerateType: '',
      batchGenerateText: '',

      interrefDialogVisible: false,
      dmrefDialogVisible: false,
      symbolDialogVisible: false,
      nodeList: [],

      endline: -1,
      saving: false
    }
  },

  computed: {
    readonly() { return this.ifedit === '0' },
    showSaveBtn() { return this.save === '1' }
  },

  mounted() {
    // 注册全局实例映射（用于按钮回调访问 $refs 对话框）
    if (!window.$LEVELLEDPARA_DESIGNER_INSTANCES) {
      window.$LEVELLEDPARA_DESIGNER_INSTANCES = {}
    }
    window.$LEVELLEDPARA_DESIGNER_INSTANCES[this.contentEditorId] = this

    // 在组件挂载时加载UEditor并注册自定义按钮
    loadUEditor().then(() => {
      this.$nextTick(() => {
        // 注册自定义按钮（必须在组件挂载且UE加载完成后）
        this.registerCustomButtonsGlobal()
      })
    }).catch((error) => {
      console.error('UEditor脚本加载失败:', error)
      this.$message.error('富文本编辑器加载失败')
    })

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

    // 清理全局实例映射（防止内存泄漏）
    if (window.$LEVELLEDPARA_DESIGNER_INSTANCES) {
      delete window.$LEVELLEDPARA_DESIGNER_INSTANCES[this.contentEditorId]
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
          // 修复：正确匹配嵌套的 <levelledPara> 标签，通过计数开始/结束标签找到真正的结束位置
          this.endline = -1
          const lineCountValue = this.editor.lineCount()
          let depth = 1 // 已经在 this.lineno 行遇到第一个 <levelledPara>，深度为 1

          for (let i = this.lineno + 1; i < lineCountValue; i++) {
            const line = this.editor.getLine(i)

            // 统计当前行的开始标签和结束标签数量
            const openCount = (line.match(/<levelledPara[>\s]/g) || []).length
            const closeCount = (line.match(/<\/levelledPara>/g) || []).length

            depth += openCount - closeCount

            // 当深度回到 0 时，找到了匹配的结束标签
            if (depth === 0) {
              this.endline = i
              break
            }
          }

          if (this.endline === -1) {
            throw new Error(`未找到匹配的 </levelledPara> 结束标签`)
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

        // parseXmlToTree 已返回包含根节点的数组，直接使用
        this.treeData = this.convertToAntTreeData(this.rawTreeData)

        // 初始化展开所有节点
        this.expandedKeys = this.getAllNodeKeys(this.rawTreeData)

        // 自动选中第一个一级节点（根节点的第一个子节点），如果没有子节点则选中根节点
        if (this.rawTreeData.length > 0) {
          const rootNode = this.rawTreeData[0]
          if (rootNode.children && rootNode.children.length > 0) {
            const firstLevelOneNode = rootNode.children[0]
            this.selectedKeys = [firstLevelOneNode.id]
            this.selectedNode = firstLevelOneNode
            this.currentTitle = firstLevelOneNode.title || ''
            this.activeTab = 'warning'
          } else {
            // 如果根节点没有子节点，选中根节点本身以启用"添加下级"按钮
            this.selectedKeys = [rootNode.id]
            this.selectedNode = rootNode
            this.currentTitle = rootNode.title || ''
            this.activeTab = 'warning'
          }
        }

      } catch (error) {
        console.error('加载失败:', error)
        this.$message.error('加载失败: ' + error.message)
      }
    },

    getAllNodeKeys(nodes) {
      let keys = []
      const traverse = (nodeList) => {
        nodeList.forEach(node => {
          keys.push(node.id)
          if (node.children && node.children.length > 0) {
            traverse(node.children)
          }
        })
      }
      traverse(nodes)
      return keys
    },

    convertToAntTreeData(nodes) {
      return nodes.map(node => ({
        key: node.id,
        title: node.title || '无标题',
        type: node.type || 'para',
        lparano: this.generateLparano(node),
        scopedSlots: { title: 'title' },
        children: node.children && node.children.length > 0
          ? this.convertToAntTreeData(node.children)
          : undefined
      }))
    },

    generateLparano(node) {
      // 根节点显示"《层级段落》"
      if (!node.id || node.id === '0') {
        return '《层级段落》'
      }
      // 去掉"0."前缀：0.1 → 1, 0.1.1 → 1.1
      const displayId = node.id.startsWith('0.') ? node.id.substring(2) : node.id
      return '层级' + displayId
    },

    getDisplayTitle(title) {
      return title || '<span style="color: #999;">无标题</span>'
    },

    onTreeSelect(selectedKeys, e) {
      if (selectedKeys.length === 0) return

      this.selectedKeys = selectedKeys
      const nodeKey = selectedKeys[0]

      // 如果选中根节点，需要特殊处理
      if (nodeKey === '0') {
        // 🔑 Bug 修复：允许根节点成为 selectedNode，使用户可以添加一级子节点
        const rootNode = this.rawTreeData[0]
        if (rootNode) {
          this.selectedNode = rootNode
          this.currentTitle = rootNode.title || ''
        } else {
          this.selectedNode = null
          this.currentTitle = ''
        }
        return
      }

      // 从原始数据中查找节点
      this.selectedNode = this.findNodeInTree(this.rawTreeData, nodeKey)
      if (this.selectedNode) {
        this.currentTitle = this.selectedNode.title || ''
        // 清空所有内容选择
        Object.keys(this.selectedRowKeys).forEach(key => {
          this.$set(this.selectedRowKeys, key, [])
        })
      }
    },

    onTreeExpand(expandedKeys) {
      this.expandedKeys = expandedKeys
    },

    findNodeInTree(nodes, targetId) {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node
        }
        if (node.children && node.children.length > 0) {
          const found = this.findNodeInTree(node.children, targetId)
          if (found) return found
        }
      }
      return null
    },

    // ==================== Tab 内容数据 ====================

    getItemCount(type) {
      if (!this.selectedNode || !this.selectedNode.html) return 0
      const data = this.selectedNode.html[type]
      if (!data) return 0
      // 🔑 关键修复：html[type] 现在是数组对象，不是 JSON 字符串
      if (Array.isArray(data)) {
        return data.length
      }
      return 0
    },

    getContentColumns(type) {
      const labelMap = {
        warning: '警告',
        caution: '注意',
        para: '段落',
        note: '注',
        figure: '插图',
        multimedia: '多媒体',
        foldout: '折叠',    // 🔑 S1000D 符合性
        table: '表格',
        caption: '图说'     // 🔑 S1000D 符合性
      }
      const label = labelMap[type] || type
      return [
        {
          title: label,
          dataIndex: 'content',
          key: 'content',
          align: 'center'
        },
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 150,
          align: 'center'
        }
      ]
    },

    getContentData(type) {
      if (!this.selectedNode || !this.selectedNode.html) return []

      // 第3阶段修复：适配新数据结构
      // 新结构：html[type] 是 { id: string, content/xml: string }[] 数组
      const data = this.selectedNode.html[type]
      if (!Array.isArray(data)) return []

      try {
        return data.map((item, index) => {
          // 区分文本类和结构化类内容
          // 🔑 Bug 修复：添加 foldout 和 caption 到结构化类型列表
          const isStructured = type === 'figure' || type === 'multimedia' || type === 'table' || type === 'foldout' || type === 'caption'
          const contentField = isStructured ? 'xml' : 'content'

          let displayContent = item[contentField] || ''

          // 🔑 关键修复：如果 content/xml 是完整的 XML 标签，需要提取内部内容用于显示
          if (displayContent && displayContent.trim().startsWith('<')) {
            try {
              const parser = new DOMParser()
              const doc = parser.parseFromString(displayContent, 'text/xml')
              if (!doc.querySelector('parsererror')) {
                const element = doc.documentElement
                // 对于文本类型，显示内部内容（去掉外层标签）
                if (!isStructured) {
                  displayContent = element.innerHTML || element.textContent || displayContent
                }
                // 对于结构化类型，保持原样（XML）
              }
            } catch (e) {
              // 如果解析失败，保持原始值
            }
          }

          return {
            key: index,
            content: displayContent,
            id: item.id || `${type}-${Date.now()}-${index}`
          }
        })
      } catch (error) {
        console.error(`getContentData(${type}) 错误:`, error)
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

    canMergeDown(type) {
      if (this.readonly || !this.selectedNode || type !== 'para') return false
      const selected = this.selectedRowKeys[type] || []
      if (selected.length !== 1) return false
      const data = this.getContentData(type)
      return selected[0] < data.length - 1
    },

    // ==================== 内容操作 ====================

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
          if (!this.selectedNode.html) {
            this.selectedNode.html = createEmptyHtmlContent()
          }

          // 🔑 关键修复：直接操作原始数据，保留完整的 XML 格式
          this.selectedNode.html[type] = this.selectedNode.html[type]
            .filter((_, index) => !selected.includes(index))

          this.$set(this.selectedRowKeys, type, [])
          this.$message.success('删除成功')
        }
      })
    },

    moveItemUp(type) {
      if (!this.canMoveItemUp(type)) return
      const index = this.selectedRowKeys[type][0]

      if (!this.selectedNode.html) {
        this.selectedNode.html = createEmptyHtmlContent()
      }

      // 🔑 关键修复：直接在原始数据上操作，保留完整的 XML 格式
      const items = this.selectedNode.html[type]
      const temp = items[index]
      items[index] = items[index - 1]
      items[index - 1] = temp

      this.$set(this.selectedRowKeys, type, [index - 1])
      this.$message.success('上移成功')
    },

    moveItemDown(type) {
      if (!this.canMoveItemDown(type)) return
      const index = this.selectedRowKeys[type][0]

      if (!this.selectedNode.html) {
        this.selectedNode.html = createEmptyHtmlContent()
      }

      // 🔑 关键修复：直接在原始数据上操作，保留完整的 XML 格式
      const items = this.selectedNode.html[type]
      const temp = items[index]
      items[index] = items[index + 1]
      items[index + 1] = temp

      this.$set(this.selectedRowKeys, type, [index + 1])
      this.$message.success('下移成功')
    },

    batchGenerate(type) {
      this.batchGenerateVisible = true
      this.batchGenerateType = type
      this.batchGenerateText = ''
    },

    mergeDownPara() {
      if (!this.canMergeDown('para')) return

      const selected = this.selectedRowKeys['para'] || []
      const index = selected[0]

      if (!this.selectedNode.html) {
        this.selectedNode.html = createEmptyHtmlContent()
      }

      const items = this.selectedNode.html['para']
      if (index >= items.length - 1) {
        this.$message.warning('已是最后一行，无法向下合并')
        return
      }

      // 🔑 关键修复：提取内部内容、合并后重新包装成完整 XML
      const isStructured = false
      const contentField = 'content'

      // 从两个 XML 中提取纯内容
      let content1 = items[index][contentField] || ''
      let content2 = items[index + 1][contentField] || ''

      // 提取内部内容（去掉外层 <para> 标签）
      const parser = new DOMParser()
      try {
        const doc1 = parser.parseFromString(content1, 'text/xml')
        const doc2 = parser.parseFromString(content2, 'text/xml')

        if (!doc1.querySelector('parsererror') && !doc2.querySelector('parsererror')) {
          const elem1 = doc1.documentElement
          const elem2 = doc2.documentElement
          const text1 = elem1.innerHTML || elem1.textContent || ''
          const text2 = elem2.innerHTML || elem2.textContent || ''
          const mergedText = text1 + text2

          // 重新包装为完整 XML
          const mergedId = items[index].id
          items[index].content = `<para id="${mergedId}">${mergedText}</para>`
        }
      } catch (e) {
        // 如果解析失败，做简单拼接
        items[index].content = content1 + content2
      }

      // 删除下一行
      items.splice(index + 1, 1)

      this.$set(this.selectedRowKeys, 'para', [index])
      this.$message.success('向下合并成功')
    },

    handleBatchGenerate() {
      if (!this.batchGenerateText || !this.batchGenerateText.trim()) {
        this.$message.warning('请输入批量生成的内容')
        return
      }

      const type = this.batchGenerateType
      const lines = this.batchGenerateText.split('\n').filter(line => line.trim())

      if (lines.length === 0) {
        this.$message.warning('没有有效的内容行')
        return
      }

      if (!this.selectedNode.html) {
        this.selectedNode.html = createEmptyHtmlContent()
      }

      const isStructured = type === 'figure' || type === 'multimedia' || type === 'table'

      // 🔑 关键修复：直接操作原始数据，创建完整 XML 格式的项
      lines.forEach((line, idx) => {
        const itemId = `${type}-${Date.now()}-${idx}`
        let newItem

        if (isStructured) {
          // 结构化类型，content 作为纯文本
          newItem = {
            id: itemId,
            xml: `<${type}>${line.trim()}</${type}>`
          }
        } else {
          // 文本类型，包装成完整 XML
          // 🔑 关键修复：对特殊字符进行 XML 转义
          const escapedContent = this.escapeXmlContent(line.trim())
          newItem = {
            id: itemId,
            content: `<${type} id="${itemId}">${escapedContent}</${type}>`
          }
        }

        this.selectedNode.html[type].push(newItem)
      })

      this.$message.success(`成功批量生成 ${lines.length} 项`)
      this.closeBatchGenerate()
    },

    closeBatchGenerate() {
      this.batchGenerateVisible = false
      this.batchGenerateType = ''
      this.batchGenerateText = ''
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

    handleSaveLevel() {
      if (!this.selectedNode) {
        this.$message.warning('请选择一个层级段落')
        return
      }
      this.selectedNode.title = this.currentTitle
      this.treeData = this.convertToAntTreeData(this.rawTreeData)
      this.$message.success('保存层级信息成功')
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

        this.contentEditor = window.UE.getEditor(this.contentEditorId, config)

        // 设置编辑器的唯一标识（用于全局实例映射）
        this.contentEditor.key = this.contentEditorId

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
        let content = this.contentEditor.getContent()
        const type = this.contentEditorType
        const index = this.contentEditorIndex

        // 修复问题1：剥离 UEditor 返回的 HTML 标签
        // UEditor 会将纯文本包裹成 <p>111</p>，需要移除外层 <p> 标签
        content = this.stripOuterParagraphTag(content)

        if (type === 'title') {
          this.currentTitle = content
          this.handleTitleChange()
        } else {
          if (!this.selectedNode.html) {
            this.selectedNode.html = createEmptyHtmlContent()
          }

          // 🔑 防御性检查：确保 html[type] 数组存在
          if (!Array.isArray(this.selectedNode.html[type])) {
            this.selectedNode.html = createEmptyHtmlContent()
          }

          const isStructured = type === 'figure' || type === 'multimedia' || type === 'table'

          if (index >= 0) {
            // 编辑现有项：更新原始数据中的 content/xml 字段
            // 🔑 关键修复：需要重新包装成完整 XML 格式（与加载时保持一致）
            // 🔑 关键修复：添加边界检查，防止索引越界
            if (index >= this.selectedNode.html[type].length) {
              console.error(`索引越界: index=${index}, length=${this.selectedNode.html[type].length}`)
              this.$message.error('数据索引错误，无法保存')
              return
            }

            const originalItem = this.selectedNode.html[type][index]
            const itemId = originalItem.id || `${type}-${Date.now()}`

            if (isStructured) {
              // 结构化类型，保持原样（可能是 XML）
              originalItem.xml = content
            } else {
              // 文本类型，需要包装成完整 XML
              // 🔑 关键修复：对可能的特殊字符进行 XML 转义
              const escapedContent = this.escapeXmlContent(content)
              originalItem.content = `<${type} id="${itemId}">${escapedContent}</${type}>`
            }
          } else {
            // 添加新项：创建新对象并包装成完整 XML
            const newId = `${type}-${Date.now()}`
            const newItem = {
              id: newId
            }

            if (isStructured) {
              newItem.xml = content
            } else {
              // 🔑 关键修复：对特殊字符进行 XML 转义
              const escapedContent = this.escapeXmlContent(content)
              newItem.content = `<${type} id="${newId}">${escapedContent}</${type}>`
            }

            this.selectedNode.html[type].push(newItem)
          }

          // 强制 Vue 更新（因为直接修改了数组）
          this.$forceUpdate()
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

    stripOuterParagraphTag(html) {
      if (!html || !html.trim()) return ''

      // 检测并移除外层 <p> 标签
      // 🔑 关键修复：使用不区分大小写的正则，匹配 <p> 和 <p ...>
      const outerPMatch = html.match(/^<p(\s[^>]*)?>|^<P(\s[^>]*)?>/i)
      if (outerPMatch && (html.toLowerCase().endsWith('</p>'))) {
        // 移除外层 <p> 和 </p>（大小写不敏感）
        return html.substring(outerPMatch[0].length, html.length - 4)
      }

      return html
    },

    // ==================== 内容编辑 ====================

    insertInterref(xml) {
      if (!this.contentEditor) return
      // 使用 HTML 实体编码，避免 XML 属性双引号丢失
      const html = `<a href="javascript:void(0);" xml="${xml.replace(/"/g, '&quot;')}">【内部引用】</a>`
      this.contentEditor.execCommand('inserthtml', html)
    },

    insertDmRef(xml) {
      if (!this.contentEditor) return
      // 使用 HTML 实体编码，避免 XML 属性双引号丢失
      const html = `<a href="javascript:void(0);" xml="${xml.replace(/"/g, '&quot;')}">【DM引用】</a>`
      this.contentEditor.execCommand('inserthtml', html)
    },

    insertSymbol(xml) {
      if (!this.contentEditor) return
      // 图符作为 img 标签插入
      const html = `<img src="data:image/svg+xml;utf8,<svg></svg>" xml="${xml.replace(/"/g, '&quot;')}" />`
      this.contentEditor.execCommand('inserthtml', html)
    },

    // ==================== 节点操作 ====================

    handleAddNode() {
      if (!this.selectedNode) {
        this.$message.warning('请选择一个层级段落节点')
        return
      }

      const siblings = this.selectedNode.children || []
      let maxId = 0

      // 🔑 S1000D 标准：统计同级的 levelledPara 节点数量
      siblings.forEach(child => {
        // 只统计 levelledPara 类型的子节点
        if (child.type === 'levelledPara') {
          const ids = child.id.split('.')
          const nowId = parseInt(ids[ids.length - 1])
          if (nowId > maxId) {
            maxId = nowId
          }
        }
      })

      const newId = this.selectedNode.id === '0' ? `${maxId + 1}` : `${this.selectedNode.id}.${maxId + 1}`

      // 🔑 S1000D 标准：创建嵌套的 levelledPara 节点（不是 para）
      const newNode = createEmptyNode('levelledPara', newId)
      newNode.title = `层级${newId}`
      newNode.id = newId
      // ✅ createEmptyNode 已经正确初始化了 html 为空数组对象，不要覆盖它

      if (!this.selectedNode.children) {
        this.selectedNode.children = []
      }
      this.selectedNode.children.push(newNode)

      // 重新生成ID（只处理真实节点，排除根节点）
      const rootNode = this.rawTreeData[0]
      if (rootNode && rootNode.children) {
        rootNode.children = regenerateIds(rootNode.children)
      }

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
        // 🔑 S1000D 符合性：添加 foldout 和 caption
        const contentTypes = ['para', 'warning', 'caution', 'note', 'figure', 'multimedia', 'foldout', 'table', 'caption']
        for (const type of contentTypes) {
          // 🔑 关键修复：html[type] 现在是数组对象，不是 JSON 字符串
          const data = this.selectedNode.html[type]
          if (Array.isArray(data) && data.length > 0) {
            hasContent = true
            break
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
          let parent = null
          let siblings = null

          // 在整个树中查找父节点
          if (parentId) {
            parent = this.findNodeInTree(this.rawTreeData, parentId)
            siblings = parent ? parent.children : null
          } else {
            // 如果没有父ID，说明是一级节点，父节点是根节点
            const rootNode = this.rawTreeData[0]
            if (rootNode && rootNode.id === '0') {
              siblings = rootNode.children
            }
          }

          if (siblings) {
            const index = siblings.findIndex(n => n.id === this.selectedNode.id)
            if (index > -1) {
              siblings.splice(index, 1)
            }
          }

          // 重新生成ID（只处理真实节点）
          const rootNode = this.rawTreeData[0]
          if (rootNode && rootNode.children) {
            rootNode.children = regenerateIds(rootNode.children)
          }

          this.treeData = this.convertToAntTreeData(this.rawTreeData)

          this.selectedKeys = []
          this.selectedNode = null

          this.$message.success('节点删除成功')
        }
      })
    },

    // ==================== 保存 ====================

    /**
     * 关键修复：将内存中编辑的数据同步到节点的 content 字段
     * 这是保存前的必要步骤，确保 nodeToXml() 能生成正确的 XML
     */
    syncNodeToContent(node) {
      if (!node) return

      // 🔑 S1000D 标准：levelledPara 节点也需要同步标题和内容
      if (node.type === 'levelledPara') {
        // 构建 levelledPara 的 content
        const parts = []

        // 1. 添加标题（如果存在）
        if (node.title && node.title.trim()) {
          parts.push(`<title>${this.escapeXmlContent(node.title)}</title>`)
        }

        // 2. 添加直接内容（para/warning/figure 等）
        const contentTypes = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'table', 'foldout', 'caption']
        for (const type of contentTypes) {
          const items = node.html?.[type]
          if (Array.isArray(items) && items.length > 0) {
            items.forEach(item => {
              const isStructured = ['figure', 'multimedia', 'table', 'foldout', 'caption'].includes(type)
              const content = isStructured ? item.xml : item.content
              if (content) {
                parts.push(content)
              }
            })
          }
        }

        // 3. 更新 levelledPara 的 content（不包括嵌套的 levelledPara，由递归处理）
        if (parts.length > 0) {
          node.content = `<levelledPara>\n  ${parts.join('\n  ')}\n</levelledPara>`
        } else {
          node.content = '<levelledPara></levelledPara>'
        }

        // 4. 递归处理子节点（嵌套的 levelledPara 和内容节点）
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => this.syncNodeToContent(child))
        }

        return
      }

      // 构建完整的 XML 内容
      const contentTypes = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'table', 'foldout', 'caption']
      const parts = []

      // 1. 添加标题（如果存在）
      if (node.title && node.title.trim()) {
        parts.push(`<title>${this.escapeXmlContent(node.title)}</title>`)
      }

      // 2. 按 S1000D 顺序添加所有内容类型
      for (const type of contentTypes) {
        const items = node.html?.[type]
        if (Array.isArray(items) && items.length > 0) {
          items.forEach(item => {
            const isStructured = ['figure', 'multimedia', 'table', 'foldout', 'caption'].includes(type)
            const content = isStructured ? item.xml : item.content
            if (content && content.trim()) {
              parts.push(content)
            }
          })
        }
      }

      // 3. 更新 node.content 为完整的 XML
      const tagName = node.type || 'para'
      const nodeId = node.id || `${tagName}-${Date.now()}`

      if (parts.length > 0) {
        node.content = `<${tagName} id="${nodeId}">${parts.join('')}</${tagName}>`
      } else {
        // 如果没有内容，保持空标签
        node.content = `<${tagName} id="${nodeId}"></${tagName}>`
      }

      // 4. 递归同步子节点
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => this.syncNodeToContent(child))
      }
    },

    async handleSave() {
      if (this.saving) return

      try {
        this.saving = true

        // 🔑 关键修复：保存前同步编辑数据到 content 字段
        this.rawTreeData.forEach(node => this.syncNodeToContent(node))

        // 验证树形数据
        const validation = validateTree(this.rawTreeData)
        if (!validation.valid) {
          this.$message.error('数据验证失败: ' + validation.errors.join('; '))
          return
        }

        // 使用正确的 treeToXml 函数生成 XML
        let xml = treeToXml(this.rawTreeData)

        // 🔑 关键修复：继承文档基础缩进（8个空格）
        const originalLine = this.editor.getLine(this.lineno)
        const baseIndentMatch = originalLine.match(/^(\s*)/)
        const baseIndent = baseIndentMatch ? baseIndentMatch[1] : ''

        if (baseIndent) {
          // 对每一行（除第一行外）添加基础缩进
          xml = xml.split('\n')
            .map((line, index) => {
              // 第一行保持原样
              if (index === 0) return baseIndent + line
              // 空行不添加缩进
              if (!line.trim()) return ''
              // 其他行添加基础缩进
              return baseIndent + line
            })
            .join('\n')
        }

        // 去除末尾多余的换行符
        xml = xml.trimEnd()

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

        // 触发父组件的save事件，实现自动跳转到源码视图
        this.$emit('save')

      } catch (error) {
        console.error('Save error:', error)
        this.$message.error('保存失败: ' + error.message)
      } finally {
        this.saving = false
      }
    },

    /**
     * 关键修复：将内存中编辑的HTML数据同步到节点的content字段
     * 这是保存前的必要步骤，确保nodeToXml()能生成正确的XML
     *
     * 原理：
     * - node.html 存储了用户编辑的内容（JSON格式）
     * - node.content 存储了原始的XML（来自parseXmlToTree）
     * - 保存前需要将HTML更新反映到content中
     *
     * 关键点：
     * 1. 只同步HTML内容，不修改子节点逻辑
     * 2. 如果没有HTML编辑，保留原始content不变
     * 3. 不处理children数组，由nodeToXml负责递归
     */

    /**
     * XML 转义函数：将用户输入的特殊字符进行安全转义
     * 仅转义 &, <, > 三个字符，但保留 HTML 标签（如 <b>, <p> 等）
     */
    escapeXml(str) {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    },

    /**
     * XML 转义函数（仅用于文本内容）
     * 保留 HTML 标签，仅转义 &, <, > 外的其他特殊字符
     *
     * 原理：UEditor 返回的是 HTML（包含 <p>, <b>, <a> 等标签）
     * 我们需要保留这些标签，但将文本中的 & < > 转义
     *
     * 但实际上，由于 XML 与 HTML 的标签是兼容的，我们可以直接使用
     * UEditor 返回的 HTML 作为 XML 内容，无需转义
     *
     * 唯一的风险是：如果文本中包含 CDATA 或其他 XML 特殊构造
     * 但这是罕见的，可以通过简单的 DOMParser 验证来处理
     */
    escapeXmlContent(content) {
      if (!content) return ''

      // 尝试通过 DOMParser 验证这是否是有效的 XML/HTML
      try {
        const parser = new DOMParser()
        // 用一个包装元素来验证
        const doc = parser.parseFromString(`<root>${content}</root>`, 'text/xml')

        if (!doc.querySelector('parsererror')) {
          // 如果能成功解析，说明内容的 XML 格式是正确的
          // 直接返回原始内容（包括 HTML 标签和已正确的特殊字符）
          return content
        }
      } catch (e) {
        // 解析失败，进行完整转义
      }

      // 如果解析失败，对所有特殊字符进行转义
      return String(content)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    },

    // ==================== 修复后的序列化方法（内联实现）====================

    // ==================== 自定义按钮注册 ====================

    registerCustomButtonsGlobal() {
      // 全局注册自定义按钮（只需注册一次）
      if (!window.UE) return

      // 注册 deflist 按钮（列表定义）
      UE.registerUI('deflist', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: '列表定义',
          cssRules: 'background-position: -340px -40px;',
          onclick: () => {
            const html = '<table deflist="1"><tr><td><br/></td></tr></table>'
            editor.execCommand('inserthtml', html)
          }
        })
        return btn
      }, 20)

      // 注册 insertnextrow 按钮（后插入行）
      UE.registerUI('insertnextrow', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: '后插入行',
          cssRules: 'background-position: -498px -76px;',
          onclick: () => editor.execCommand('insertrownext')
        })
        return btn
      }, 21)

      // 删除 insertparagraphbeforetable 注册（使用标准UEditor的insertrow按钮）
      // insertrow 是标准按钮，对应"前插入行"功能

      // 注册 interrefbutton 按钮（内部引用）
      UE.registerUI('interrefbutton', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: '内部引用',
          cssRules: 'background-position: -500px -0px;',
          onclick: () => {
            // 从全局映射获取当前实例，调用对话框
            const instanceId = editor.key
            const instance = window.$LEVELLEDPARA_DESIGNER_INSTANCES && window.$LEVELLEDPARA_DESIGNER_INSTANCES[instanceId]
            if (instance && instance.$refs.interrefDialog) {
              instance.$refs.interrefDialog.open()
            }
          }
        })
        return btn
      }, 25)

      // 注册 dmrefbutton 按钮（DM引用）
      UE.registerUI('dmrefbutton', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: 'DM引用',
          cssRules: 'background-position: -300px -20px;',
          onclick: () => {
            // 从全局映射获取当前实例，调用对话框
            const instanceId = editor.key
            const instance = window.$LEVELLEDPARA_DESIGNER_INSTANCES && window.$LEVELLEDPARA_DESIGNER_INSTANCES[instanceId]
            if (instance && instance.$refs.dmrefDialog) {
              instance.$refs.dmrefDialog.open()
            }
          }
        })
        return btn
      }, 26)

      // 注册 symbolbutton 按钮（图符）
      UE.registerUI('symbolbutton', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: '图符',
          cssRules: 'background-position: -60px -20px;',
          onclick: () => {
            // 从全局映射获取当前实例，调用对话框
            const instanceId = editor.key
            const instance = window.$LEVELLEDPARA_DESIGNER_INSTANCES && window.$LEVELLEDPARA_DESIGNER_INSTANCES[instanceId]
            if (instance && instance.$refs.symbolDialog) {
              instance.$refs.symbolDialog.open()
            }
          }
        })
        return btn
      }, 27)
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
  background: #f5f7fa;
}

.levelledpara-toolbar {
  background: #fff;
  border-bottom: 2px solid #e8e8e8;
  padding: 10px 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  .toolbar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .toolbar-title {
      font-size: 15px;
      font-weight: 600;
      color: #1890ff;
      letter-spacing: 0.5px;
    }

    .toolbar-actions {
      display: flex;
      gap: 10px;
    }
  }
}

.levelledpara-main {
  flex: 1;
  overflow: hidden;

  .main-layout {
    display: flex;
    height: 100%;
    gap: 16px;
    padding: 16px;
  }
}

.left-treegrid {
  min-width: 380px;
  width: 450px;
  max-width: 650px;
  background: #fff;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;

  .tree-toolbar {
    padding: 6px 10px;
    border-bottom: 1px solid #e8e8e8;
    background: #fafafa;
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
    min-height: 32px;
  }

  .tree-table-wrapper {
    flex: 1;
    overflow: auto;
    padding: 8px;
    background: #fff;

    // 树节点样式优化
    ::v-deep .ant-tree {
      .ant-tree-node-content-wrapper {
        line-height: 28px;
        border-radius: 2px;
        transition: all 0.2s;

        &:hover {
          background-color: #e6f7ff;
        }
      }

      .ant-tree-node-selected {
        .ant-tree-node-content-wrapper {
          background-color: #bae7ff;
        }
      }

      .ant-tree-title {
        font-size: 13px;
      }
    }

    .tree-node-title {
      display: flex;
      align-items: center;
      gap: 8px;

      .node-level {
        font-weight: 600;
        color: #1890ff;
        min-width: 80px;
        font-size: 13px;
      }

      .node-text {
        color: #262626;
        flex: 1;
      }
    }

    // 滚动条样式
    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 3px;

      &:hover {
        background: #bfbfbf;
      }
    }
  }
}

.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.title-edit-area {
  background: #fff;
  border-bottom: 2px solid #e8e8e8;
  padding: 10px 16px;
  min-height: 48px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);

  .title-table {
    width: 100%;
    border-collapse: collapse;

    tr {
      height: 100%;
    }

    td {
      vertical-align: middle;
      padding: 0 6px;
    }

    .title-label {
      width: 50px;
      text-align: right;
      padding-right: 10px;

      .title-link {
        color: #1890ff;
        cursor: pointer;
        text-decoration: none;
        font-weight: 500;
        font-size: 13px;

        &:hover {
          text-decoration: underline;
        }

        &[disabled] {
          color: #d9d9d9;
          cursor: not-allowed;
          pointer-events: none;
        }
      }
    }

    .title-input {
      padding: 0 10px;

      ::v-deep .ant-input {
        height: 28px;
        line-height: 28px;
        border-radius: 4px;
        border-color: #d9d9d9;

        &:focus {
          border-color: #40a9ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }
      }
    }

    .title-save {
      width: 140px;
      text-align: center;
      padding-left: 10px;

      .save-level-btn {
        font-weight: 600;
        font-size: 13px;
        height: 30px;
      }
    }
  }
}

.right-tabs {
  flex: 1;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;

  ::v-deep .ant-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;

    .ant-tabs-bar {
      margin-bottom: 0;
      border-bottom: 2px solid #e8e8e8;
      background: #fafafa;
      padding: 0 8px;
    }

    .ant-tabs-nav {
      .ant-tabs-tab {
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 500;
        color: #595959;
        margin-right: 4px;
        border-radius: 4px 4px 0 0;
        transition: all 0.2s;
        line-height: 1.6;

        &:hover {
          color: #1890ff;
        }

        &.ant-tabs-tab-active {
          color: #1890ff;
          background: #fff;
          font-weight: 600;
        }
      }
    }

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
      padding: 6px 10px;
      border-bottom: 1px solid #e8e8e8;
      background: #fafafa;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      align-items: center;
      min-height: 34px;

      .ant-btn {
        font-size: 13px;
        height: 28px;
        line-height: 1;
        padding: 0 12px;
        border-radius: 3px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;

        span {
          line-height: 1;
        }

        &:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .title-display {
      padding: 14px;
      flex: 1;
      overflow: auto;

      ::v-deep .ant-input {
        min-height: 100px;
        border-radius: 4px;
      }
    }

    ::v-deep .ant-table-wrapper {
      flex: 1;
      overflow: auto;
    }

    ::v-deep .ant-table {
      font-size: 13px;
      margin-bottom: 0;

      .ant-table-thead > tr > th {
        padding: 10px 8px;
        background: #fafafa;
        font-weight: 600;
        color: #262626;
        border-bottom: 2px solid #e8e8e8;
      }

      .ant-table-tbody > tr > td {
        padding: 8px;
        color: #595959;
      }

      .ant-table-tbody > tr {
        transition: background-color 0.2s;

        &:hover {
          background-color: #f0f5ff;
        }

        &.ant-table-row-selected {
          background-color: #e6f7ff;
        }
      }

      .ant-table-selection-column {
        width: 50px;
        text-align: center;
      }
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
    font-size: 13px;
    border-radius: 4px;
  }
}
</style>