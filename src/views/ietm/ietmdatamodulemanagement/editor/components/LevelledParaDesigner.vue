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
                >
                  <!-- 🔧 修复DMREF-DISPLAY: 支持 dmRef/internalRef/symbol 的正确显示 -->
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
                >
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
                >
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
                >
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
                >
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
                >
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
                >
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
                >
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
                >
                  <template slot="content" slot-scope="text, record">
                    <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
                    <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
                    <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                  </template>
                </a-table>
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
// 异步内容转换组件 - 用于将 dmRef/internalRef XML 转换为可读格式
const ConvertedContent = {
  props: ['content', 'parent'],
  data() {
    return {
      convertedHtml: '加载中...',
      loading: true
    }
  },
  async mounted() {
    await this.convert()
  },
  watch: {
    content: {
      handler() {
        this.convert()
      }
    }
  },
  methods: {
    async convert() {
      if (!this.content) {
        this.convertedHtml = ''
        this.loading = false
        return
      }

      try {
        this.loading = true
        const { para2html } = await import('../utils/paraConverter')

        // 包装在 para 标签中以便转换
        const wrapped = `<para>${this.content}</para>`
        const html = await para2html(this.parent, wrapped)

        // 移除外层 para 标签
        this.convertedHtml = html.replace(/<\/?para>/g, '')
        this.loading = false
      } catch (e) {
        console.error('[ConvertedContent] 转换失败:', e)
        this.convertedHtml = this.content
        this.loading = false
      }
    }
  },
  // 🔑 P0修复：使用 render 函数替代 template 字符串（避免 runtime-only 错误）
  render(h) {
    if (this.loading) {
      return h('div', { style: 'color: #999; font-size: 12px;' }, '加载中...')
    }
    return h('div', {
      style: 'max-width: 800px; word-break: break-all; text-align: left;',
      domProps: { innerHTML: this.convertedHtml }
    })
  }
}

// 第3阶段修复：使用新的完整转换器
import { parseXmlToTree, treeToXml, createEmptyNode, getRowhtml, createEmptyHtmlContent, validateTree } from '../utils/levelledParaConverterV2'
// 从旧转换器导入 ID 重生成工具函数（独立功能）
import { regenerateIds } from '../utils/levelledParaConverter'
import { escapeXmlForAttribute, html2para, para2html } from '../utils/paraConverter'
import { getUEditorConfig, loadUEditor } from '../utils/ueditorConfig'
import IetmInterrefDialog from './IetmInterrefDialog'
import IetmDmRefDialog from './IetmDmRefDialog'
import IetmSymbolDialog from './IetmSymbolDialog'

export default {
  name: 'LevelledParaDesigner',
  components: {
    ConvertedContent,
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
    save: { type: String, default: '1' },
    projectParameters: { type: String, required: true },
    uniqueid: { type: String, required: true },
    dmCode: { type: String, required: true },
    nodeList: { type: Array, default: () => [] }
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

      endline: -1,
      saving: false
    }
  },

  computed: {
    readonly() { return this.ifedit === '0' },
    showSaveBtn() { return this.save === '1' },

    // Parent接口对象（供html2para使用）
    Parent() {
      return {
        editor: this.editor,
        locale: this.locale,
        dmCode: this.dmCode,
        nodeList: this.nodeList,
        cmnodeid: this.cmnodeid,
        getLocaleName: this.getLocaleName,
        toEnXml: this.toEnXml,
        toCnXml: this.toCnXml,
        formateXml: this.formateXml
      }
    }
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
          align: 'center',
          scopedSlots: { customRender: 'content' }  // 🔧 修复SYMBOL-DISPLAY: 启用自定义slot渲染
        },
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 250,
          align: 'center'
        }
      ]
    },

    // 🔧 修复SYMBOL-DISPLAY: 将XML中的<symbol>转换为<img>用于显示
    convertSymbolsToHtml(content) {
      if (!content) {
        return content
      }

      let result = content

      // 🔑 先处理 <symbol> 标签
      if (result.includes('<symbol')) {
        const self = this

        // 提取所有 <symbol> 标签并替换为 <img>
        const symbolRegex = /<symbol\s+([^>]*?)\s*\/>/g
        let match

        while ((match = symbolRegex.exec(content)) !== null) {
          const symbolTag = match[0]
          const attributesStr = match[1]

          // 提取ICN编码
          const icnMatch = attributesStr.match(/infoEntityIdent="([^"]+)"/)
          if (!icnMatch || !icnMatch[1]) continue

          const icn = icnMatch[1]

          // 先使用占位符 src（会异步加载真实图片）
          const placeholderSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23f0f0f0'/%3E%3Ctext x='6' y='24' font-size='12' fill='%23999'%3E加载中...</text%3E%3C/svg%3E"
          const safeXml = escapeXmlForAttribute(symbolTag)
          const imgTag = `<img src="${placeholderSrc}" data-icn="${icn}" data-xml="${safeXml}" style="max-width: 300px; max-height: 200px; width: auto; height: auto; cursor: pointer; border: 1px solid #ddd; padding: 2px;"/>`

          result = result.replace(symbolTag, imgTag)

          // 异步获取真实图片URL
          this._loadSymbolImageUrl(icn)
        }
      }

      // 🔑 然后处理 <img class="kfformula"> 标签（如果存在，说明没被转换为 symbol）
      if (result.includes('class="kfformula"')) {
        // 保留原样（因为公式的 src 已经是 base64 data URL）
        // 这是一个备用方案，理想情况下公式应该已被转换为 <symbol>
        console.warn('[convertSymbolsToHtml] 发现未被转换的公式 <img class="kfformula">，这表示 html2para 可能没有正确处理公式')
      }

      return result
    },

    // 🔧 修复SYMBOL-DISPLAY: 异步加载图片URL并更新所有相关的img标签
    async _loadSymbolImageUrl(icn) {
      try {
        const apiBaseUrl = window._CONFIG['domianURL'] || '/jeecg-boot'
        const token = localStorage.getItem('pro__Access-Token') ? JSON.parse(localStorage.getItem('pro__Access-Token')).value : ''

        const icnInfo = await fetch(`${apiBaseUrl}/icnmanage/ietmIcnManage/queryByIcnCode?icn=${encodeURIComponent(icn)}`, {
          headers: { 'X-Access-Token': token }
        }).then(r => r.json())

        let imgSrc = null
        if (icnInfo.success && icnInfo.result) {
          const fileKey = icnInfo.result.ietmAttachment?.fileKey
          const icnType = icnInfo.result.icnType

          // 🔑 关键修复：公式使用特殊的处理逻辑
          if (icnType === 'formula' && fileKey && fileKey.startsWith('formula-')) {
            // 公式：从 fileContent 中提取 base64 图片
            try {
              const fileContentBase64 = icnInfo.result.filecontent
              if (fileContentBase64) {
                // 🔧 修复：filecontent 是 base64(HEX(HTML))，需要双重解码
                // 步骤1: Base64 解码 → HEX 字符串
                const hexString = atob(fileContentBase64)

                // 步骤2: HEX 解码 → HTML
                let formulaHtml = ''
                for (let i = 0; i < hexString.length; i += 2) {
                  const hexByte = hexString.substr(i, 2)
                  formulaHtml += String.fromCharCode(parseInt(hexByte, 16))
                }

                console.log('[_loadSymbolImageUrl] 公式HTML长度:', formulaHtml.length)

                // 从 HTML 中提取 base64 图片
                const imgMatch = formulaHtml.match(/src="(data:image\/png;base64,[^"]+)"/)
                if (imgMatch && imgMatch[1]) {
                  imgSrc = imgMatch[1]
                  console.log('[_loadSymbolImageUrl] 成功提取公式图片，长度:', imgSrc.length)
                } else {
                  console.warn('[_loadSymbolImageUrl] 公式HTML中未找到图片数据，HTML预览:', formulaHtml.substring(0, 200))
                  imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
                }
              }
            } catch (e) {
              console.warn('[_loadSymbolImageUrl] 解析公式数据失败:', e)
              imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
            }
          } else if (fileKey) {
            // 普通图片：使用 viewFile 路径
            imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/viewFile?fileKey=${encodeURIComponent(fileKey)}`
          } else {
            // Fallback
            imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
          }
        } else {
          imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
        }

        // 更新所有具有该 ICN 的 img 标签
        const allImgs = document.querySelectorAll(`img[data-icn="${icn}"]`)
        allImgs.forEach(img => {
          if (img.src.includes('data:image')) {
            img.src = imgSrc
          }
        })
      } catch (e) {
        console.warn('[_loadSymbolImageUrl] 加载图片失败:', e.message)
      }
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
                  // 🔧 修复：XML DOM 不支持 innerHTML，需要手动序列化子节点
                  const serializer = new XMLSerializer()
                  let innerContent = ''
                  for (let i = 0; i < element.childNodes.length; i++) {
                    innerContent += serializer.serializeToString(element.childNodes[i])
                  }
                  displayContent = innerContent || element.textContent || displayContent

                  // 🔑 新增修复：将 <symbol> 标签转换为 <img> 标签以便显示
                  displayContent = this._convertSymbolToImg(displayContent)
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

    /**
     * 将 XML 中的 <symbol> 标签转换为可显示的 <img> 标签
     * @param {string} content - 可能包含 <symbol> 标签的内容
     * @returns {string} 转换后的内容
     */
    _convertSymbolToImg(content) {
      if (!content || typeof content !== 'string') return content

      // 匹配 <symbol infoEntityIdent="..." reproductionWidth="..." reproductionHeight="..." reproductionScale="..."></symbol>
      const symbolRegex = /<symbol\s+([^>]*)><\/symbol>/gi

      return content.replace(symbolRegex, (match, attrs) => {
        try {
          // 提取属性
          const icnMatch = attrs.match(/infoEntityIdent="([^"]+)"/)
          const widthMatch = attrs.match(/reproductionWidth="([^"]+)"/)
          const heightMatch = attrs.match(/reproductionHeight="([^"]+)"/)

          if (!icnMatch) return match // 如果没有 ICN，保持原样

          const icn = icnMatch[1]
          const width = widthMatch ? widthMatch[1] : 'auto'
          const height = heightMatch ? heightMatch[1] : 'auto'

          // 生成图片 URL
          const apiBaseUrl = process.env.VUE_APP_API_BASE_URL || window._CONFIG?.domianURL || ''
          const imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`

          // 生成 <img> 标签
          return `<img src="${imgSrc}" data-icn="${icn}" style="max-width: 300px; max-height: 200px; width: auto; height: auto;" />`
        } catch (e) {
          console.warn('[_convertSymbolToImg] 转换失败:', e)
          return match
        }
      })
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

          // 🔑 使用 XMLSerializer 代替 innerHTML（XML DOM 不支持 innerHTML）
          const serializer = new XMLSerializer()
          let innerContent1 = ''
          let innerContent2 = ''

          for (let i = 0; i < elem1.childNodes.length; i++) {
            innerContent1 += serializer.serializeToString(elem1.childNodes[i])
          }
          for (let i = 0; i < elem2.childNodes.length; i++) {
            innerContent2 += serializer.serializeToString(elem2.childNodes[i])
          }

          const text1 = innerContent1 || elem1.textContent || ''
          const text2 = innerContent2 || elem2.textContent || ''
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

        console.log('===== saveContentEditor DEBUG START =====')
        console.log('[1] UEditor原始内容:', content)

        // 🔑 修复问题1：清理 UEditor 插入的 HTML 实体（如 &nbsp;）
        content = this.normalizeWhitespace(content)
        console.log('[1.5] normalizeWhitespace后:', content)

        // 🔑 关键修复：对于非标题项，不要剥离外层 <p> 标签，直接传递给 html2para
        // 因为 html2para 期望接收完整的 HTML（包含 <p> 标签）
        let processedContent = content
        if (type !== 'title') {
          // 不剥离，直接使用原始内容
          console.log('[2] 保留完整的 HTML 结构，直接传递给 html2para')
        } else {
          // 标题项时才剥离
          processedContent = this.stripOuterParagraphTag(content)
          console.log('[2] stripOuterParagraphTag后:', processedContent)
        }

        if (type === 'title') {
          this.currentTitle = processedContent
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
              originalItem.xml = processedContent
            } else {
              // 文本类型，需要包装成完整 XML
              // 🔧 修复SYMBOL-INCONSISTENCY: 检测 <img> 或 &lt;img（HTML转义）并转换为 <symbol>
              let finalContent = processedContent
              // 🔑 改进的检测逻辑：明确区分符号图片和公式图片
              const hasSymbolImage = processedContent && (processedContent.includes('data-icn=') || processedContent.includes('&lt;symbol'))
              const hasFormula = processedContent && (processedContent.includes('class="kfformula"') || processedContent.includes('class=&quot;kfformula&quot;') || processedContent.includes('data-latex='))
              const hasImage = hasSymbolImage || hasFormula || (processedContent && (processedContent.includes('<img') || processedContent.includes('&lt;img')))

              // 🔧 修复P0-DMREF: 检测 DM 引用和内部引用
              // 问题根因：saveContentEditor 只在有图片时调用 html2para()，导致 <a> 标签（包装的 dmRef/internalRef）无法转换
              // 修复：检测 <a xml="..."> 或显示文本标记，任一条件满足都调用 html2para()
              const hasDmOrInternalRef = processedContent && (
                processedContent.includes('【引用') ||        // DM引用的显示文本
                processedContent.includes('【内部引用') ||    // 内部引用的显示文本
                (processedContent.includes('<a') && processedContent.includes('xml='))  // <a> 标签结构标记
              )

              console.log('[编辑项] 原始content:', processedContent)
              console.log('[编辑项] hasSymbolImage:', hasSymbolImage, ' hasFormula:', hasFormula, ' hasImage:', hasImage)
              console.log('[编辑项] hasDmOrInternalRef:', hasDmOrInternalRef)

              // 🔑 关键修复：预分配 uniqueid（对标 ParaDesigner.vue）
              const newFormulas = (processedContent.match(/class="kfformula"/g) || []).length
              let allocatedUniqueids = []

              if (newFormulas > 0) {
                try {
                  console.log('[编辑项] 检测到公式数量:', newFormulas, '，开始分配 uniqueid')
                  const response = await this.$http.post('/ietm/dm-content/allocateUniqueids', {
                    dmId: this.cmnodeid,
                    count: newFormulas
                  })

                  if (!response.success) {
                    throw new Error('分配uniqueid失败')
                  }

                  const startId = response.result.start
                  allocatedUniqueids = Array.from({ length: newFormulas }, (_, i) =>
                    String(startId + i).padStart(5, '0')
                  )
                  console.log('[编辑项] uniqueid 分配成功:', allocatedUniqueids)
                } catch (err) {
                  console.error('[编辑项] 分配 uniqueid 失败:', err)
                  throw new Error('分配 uniqueid 失败: ' + err.message)
                }
              }

              if (hasImage || hasDmOrInternalRef) {
                // 异步调用 html2para 进行转换
                // 处理：图片→symbol、公式→symbol、<a>标签→dmRef/internalRef
                try {
                  console.log('[编辑项] 直接传递给 html2para:', processedContent)

                  // 🔑 关键修复：传递分配的 uniqueid 数组
                  finalContent = await html2para(this.Parent, processedContent, this.projectParameters, allocatedUniqueids)

                  console.log('[编辑项] html2para返回结果:', finalContent)
                  console.log('[编辑项] html2para返回结果长度:', finalContent ? finalContent.length : 0)
                } catch (e) {
                  console.error('[编辑项] html2para转换失败:', e.message, e.stack)
                  throw new Error('内容转换失败，请重试。如问题持续，请联系管理员。')
                }
              }

              // 🔑 P0修复：html2para 返回的内容已经是有效的 XML，不应再转义
              // 只对未经过 html2para 转换的纯文本内容进行转义
              const escapedContent = (hasImage || hasDmOrInternalRef)
                ? finalContent  // html2para 的输出是 XML，直接使用
                : this.escapeXmlContent(finalContent)  // 纯文本需要转义

              console.log('[编辑项] escapedContent:', escapedContent)
              console.log('[编辑项] 最终content字段:', `<${type} id="${itemId}">${escapedContent}</${type}>`)
              originalItem.content = `<${type} id="${itemId}">${escapedContent}</${type}>`
            }
          } else {
            // 添加新项：创建新对象并包装成完整 XML
            const newId = `${type}-${Date.now()}`
            const newItem = {
              id: newId
            }

            if (isStructured) {
              newItem.xml = processedContent
            } else {
              // 🔧 修复SYMBOL-INCONSISTENCY: 检测 <img> 或 &lt;img（HTML转义）并转换为 <symbol>
              let finalContent = processedContent
              // 🔑 改进的检测逻辑：明确区分符号图片和公式图片
              const hasSymbolImage = processedContent && (processedContent.includes('data-icn=') || processedContent.includes('&lt;symbol'))
              const hasFormula = processedContent && (processedContent.includes('class="kfformula"') || processedContent.includes('class=&quot;kfformula&quot;') || processedContent.includes('data-latex='))
              const hasImage = hasSymbolImage || hasFormula || (processedContent && (processedContent.includes('<img') || processedContent.includes('&lt;img')))

              // 🔧 修复P0-DMREF: 检测 DM 引用和内部引用
              const hasDmOrInternalRef = processedContent && (
                processedContent.includes('【引用') ||        // DM引用的显示文本
                processedContent.includes('【内部引用') ||    // 内部引用的显示文本
                (processedContent.includes('<a') && processedContent.includes('xml='))  // <a> 标签结构标记
              )

              console.log('[添加项] 原始content:', processedContent)
              console.log('[添加项] hasSymbolImage:', hasSymbolImage, ' hasFormula:', hasFormula, ' hasImage:', hasImage)
              console.log('[添加项] hasDmOrInternalRef:', hasDmOrInternalRef)

              // 🔑 关键修复：预分配 uniqueid（对标 ParaDesigner.vue）
              const newFormulas = (processedContent.match(/class="kfformula"/g) || []).length
              let allocatedUniqueids = []

              if (newFormulas > 0) {
                try {
                  console.log('[添加项] 检测到公式数量:', newFormulas, '，开始分配 uniqueid')
                  const response = await this.$http.post('/ietm/dm-content/allocateUniqueids', {
                    dmId: this.cmnodeid,
                    count: newFormulas
                  })

                  if (!response.success) {
                    throw new Error('分配uniqueid失败')
                  }

                  const startId = response.result.start
                  allocatedUniqueids = Array.from({ length: newFormulas }, (_, i) =>
                    String(startId + i).padStart(5, '0')
                  )
                  console.log('[添加项] uniqueid 分配成功:', allocatedUniqueids)
                } catch (err) {
                  console.error('[添加项] 分配 uniqueid 失败:', err)
                  throw new Error('分配 uniqueid 失败: ' + err.message)
                }
              }

              if (hasImage || hasDmOrInternalRef) {
                // 异步调用 html2para 进行转换
                try {
                  console.log('[添加项] 直接传递给 html2para:', processedContent)

                  // 🔑 关键修复：传递分配的 uniqueid 数组
                  finalContent = await html2para(this.Parent, processedContent, this.projectParameters, allocatedUniqueids)

                  console.log('[添加项] html2para返回结果:', finalContent)
                  console.log('[添加项] html2para返回结果长度:', finalContent ? finalContent.length : 0)
                } catch (e) {
                  console.error('[添加项] html2para转换失败:', e.message, e.stack)
                  throw new Error('内容转换失败，请重试。如问题持续，请联系管理员。')
                }
              }

              // 🔑 P0修复：html2para 返回的内容已经是有效的 XML，不应再转义
              // 只对未经过 html2para 转换的纯文本内容进行转义
              const escapedContent = (hasImage || hasDmOrInternalRef)
                ? finalContent  // html2para 的输出是 XML，直接使用
                : this.escapeXmlContent(finalContent)  // 纯文本需要转义

              console.log('[添加项] escapedContent:', escapedContent)
              console.log('[添加项] 最终content字段:', `<${type} id="${newId}">${escapedContent}</${type}>`)
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

    async insertSymbol(xml) {
      if (!this.contentEditor) return

      // 🔧 修复SYMBOL-DISPLAY: 从 symbol 标签中提取 ICN 编码，获取真实图片 URL
      const apiBaseUrl = window._CONFIG['domianURL'] || '/jeecg-boot'

      // 🔑 关键修复：xml 属性中的内容已经被 HTML 转义，需要先解码
      let decodedXml = xml
      if (xml.includes('&lt;')) {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = xml
        decodedXml = tempDiv.textContent
      }

      const icnMatch = decodedXml.match(/infoEntityIdent="([^"]+)"/)

      if (!icnMatch || !icnMatch[1]) {
        console.error('[insertSymbol] 无法从symbol标签中提取ICN编码', { xml, decodedXml })
        return
      }

      const icn = icnMatch[1]
      let imgSrc = null

      try {
        // 优先使用 viewFile API 获取图片
        const token = localStorage.getItem('pro__Access-Token') ? JSON.parse(localStorage.getItem('pro__Access-Token')).value : ''
        const icnInfo = await fetch(`${apiBaseUrl}/icnmanage/ietmIcnManage/queryByIcnCode?icn=${encodeURIComponent(icn)}`, {
          headers: { 'X-Access-Token': token }
        }).then(r => r.json())

        if (icnInfo.success && icnInfo.result && icnInfo.result.ietmAttachment && icnInfo.result.ietmAttachment.fileKey) {
          const fileKey = icnInfo.result.ietmAttachment.fileKey
          imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/viewFile?fileKey=${encodeURIComponent(fileKey)}`
        } else {
          // Fallback
          imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
        }
      } catch (e) {
        console.warn('[insertSymbol] queryByIcnCode失败，使用view fallback:', e.message)
        imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
      }

      // 使用真实图片 URL，添加尺寸限制，并保存 xml 属性用于后续转换
      // 🔑 关键修复：使用 HTML 实体编码保存转义后的 xml（这样被 UEditor 转义时能正确恢复）
      const safeXml = escapeXmlForAttribute(decodedXml)
      const html = `<img src="${imgSrc}" xml="${safeXml}" style="max-width: 300px; max-height: 200px; width: auto; height: auto;">`
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

      // 🔑 S1000D 标准：levelledPara 节点需要同步标题和内容
      if (node.type === 'levelledPara') {
        // 构建 levelledPara 的 content
        const parts = []

        // 1. 添加标题（如果存在）
        if (node.title && node.title.trim()) {
          parts.push(`<title>${this.escapeXmlContent(node.title)}</title>`)
        }

        // 2. 添加直接内容（para/warning/figure 等）
        // 🔑 P0修复问题2：item.content 已经是完整的 XML 节点（如 <warning id="...">内容</warning>），直接使用
        const contentTypes = ['warning', 'caution', 'note', 'para', 'figure', 'multimedia', 'table', 'foldout', 'caption']
        for (const type of contentTypes) {
          const items = node.html?.[type]
          if (Array.isArray(items) && items.length > 0) {
            items.forEach(item => {
              const isStructured = ['figure', 'multimedia', 'table', 'foldout', 'caption'].includes(type)
              let content = isStructured ? item.xml : item.content

              // 🔑 P0修复：如果 content 包含 xlink: 但没有命名空间声明，添加它
              if (content && content.includes('xlink:') && !content.includes('xmlns:xlink')) {
                content = content.replace(/^(<[a-zA-Z]+)(\s|>)/, '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2')
              }

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

      // 🔑 P0修复问题2：对于非 levelledPara 节点（warning/para/note 等），
      // 它们的 item.content 已经在 saveContentEditor 中被保存为完整的 XML 节点，
      // 不需要在这里再包一层标签。这个分支只用于递归处理子节点。
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

        console.log('===== treeToXml 生成的 XML =====')
        console.log(xml)
        console.log('===== XML 长度:', xml.length, '=====')

        // 语言转换（如果需要）
        if (this.locale === 'cn') {
          xml = this.toCnXml(xml)
        }

        // 🔑 修复问题4：先格式化 XML（2 个空格内部缩进）
        if (this.formateXml) {
          xml = this.formateXml(xml, 2)
        }

        // 🔑 关键修复：继承文档基础缩进（通常是 8 个空格）
        // 问题：formateXml 会给根元素也添加缩进，导致第一行有额外的空格
        // 解决：检测第一行的缩进，作为 formateXml 添加的"虚拟缩进"，在所有行中减去它
        const originalLine = this.editor.getLine(this.lineno)
        const baseIndentMatch = originalLine.match(/^(\s*)/)
        const baseIndent = baseIndentMatch ? baseIndentMatch[1] : ''

        if (baseIndent) {
          const lines = xml.split('\n')

          // 检测第一行的缩进（这是 formateXml 错误添加的）
          const firstLineIndent = lines[0] ? lines[0].match(/^(\s*)/)[1].length : 0

          xml = lines
            .map((line) => {
              // 空行不添加缩进
              if (!line.trim()) return ''

              // 移除 formateXml 添加的虚拟缩进，保留相对缩进
              const currentIndent = line.match(/^(\s*)/)[1].length
              const relativeIndent = Math.max(0, currentIndent - firstLineIndent)
              const indentSpaces = ' '.repeat(relativeIndent)

              // 添加文档基础缩进 + 相对缩进
              return baseIndent + indentSpaces + line.trimStart()
            })
            .join('\n')
        }

        // 去除末尾多余的换行符
        xml = xml.trimEnd()

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
     * 规范化 HTML 实体空格为普通空格
     * 修复 UEditor 日期/时间按钮插入的 &nbsp; 等实体
     */
    normalizeWhitespace(content) {
      if (!content) return ''
      return content
        .replace(/&nbsp;/g, ' ')
        .replace(/&thinsp;/g, ' ')
        .replace(/&ensp;/g, ' ')
        .replace(/&emsp;/g, ' ')
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