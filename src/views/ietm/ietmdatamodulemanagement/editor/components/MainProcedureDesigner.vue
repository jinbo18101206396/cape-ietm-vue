<template>
  <div class="mainprocedure-designer">
    <!-- 工具栏 -->
    <div class="mainprocedure-toolbar" v-if="showSaveBtn">
      <div class="toolbar-header">
        <span class="toolbar-title">◤操作步骤◢</span>
        <div class="toolbar-actions">
          <a-button type="primary" icon="save" @click="handleSave" :loading="saving" size="small">
            保存
          </a-button>
        </div>
      </div>
    </div>

    <!-- 主容器：左侧Tree + 右侧Editor -->
    <div class="mainprocedure-main">
      <div class="main-layout">
        <!-- 左侧：步骤树 -->
        <div class="left-tree">
          <div class="tree-toolbar">
            <a-button icon="plus" @click="handleAddStep" :disabled="readonly || !selectedNode" size="small">
              添加子步骤
            </a-button>
            <a-button icon="delete" @click="handleDeleteStep" :disabled="readonly || !selectedNode || selectedNode.id === '0'" size="small">
              删除步骤
            </a-button>
            <a-button icon="bars" @click="batchGenerate" :disabled="readonly || !selectedNode" size="small">
              批量生成
            </a-button>
          </div>
          <div class="tree-wrapper">
            <a-tree
              :tree-data="treeData"
              :expanded-keys="expandedKeys"
              :selected-keys="selectedKeys"
              :show-icon="false"
              :replace-fields="{ title: 'title', key: 'id', children: 'children' }"
              @select="onTreeSelect"
              @expand="onTreeExpand"
            >
              <template slot="title" slot-scope="{ stepno, title }">
                <span class="tree-node-title">
                  <span class="node-level">{{ stepno }}</span>
                  <span class="node-text">{{ getDisplayTitle(title) }}</span>
                </span>
              </template>
            </a-tree>
          </div>
        </div>

        <!-- 右侧：步骤编辑器 -->
        <div class="right-editor">
          <!-- 标题编辑区 -->
          <div class="title-edit-area" v-if="selectedNode && selectedNode.id !== '0'">
            <table class="title-table">
              <tr>
                <td class="title-label">
                  <a @click="openTitleEditor" :disabled="readonly" class="title-link">标题</a>
                </td>
                <td class="title-input">
                  <a-input
                    v-model="currentTitle"
                    placeholder="当前步骤标题"
                    :disabled="readonly"
                    @change="handleTitleChange"
                  />
                </td>
                <td class="title-save">
                  <a-button
                    type="danger"
                    @click="handleSaveStep"
                    :disabled="!selectedNode || readonly"
                    size="small"
                    class="save-level-btn"
                  >
                    保存步骤信息
                  </a-button>
                </td>
              </tr>
            </table>
          </div>

          <!-- Tab 切换内容编辑器 -->
          <div class="right-tabs">
            <a-tabs v-model="activeTab" size="small" type="card">
              <!-- 警告 Tab -->
              <a-tab-pane key="warning">
                <span slot="tab" :style="getItemCount('warning') > 0 ? 'color: red;' : ''">
                  警告({{ getItemCount('warning') }})
                </span>
                <div class="tab-content">
                  <div class="tab-toolbar">
                    <a-button icon="plus" size="small" @click="addItem('warning')" :disabled="!selectedNode || readonly">
                      增加
                    </a-button>
                    <a-button icon="edit" size="small" @click="editItem('warning')" :disabled="!canEditItem('warning')">
                      编辑
                    </a-button>
                    <a-button icon="delete" size="small" @click="deleteItem('warning')" :disabled="!canDeleteItem('warning')">
                      删除
                    </a-button>
                    <a-button icon="arrow-up" size="small" @click="moveItemUp('warning')" :disabled="!canMoveItemUp('warning')">
                      上移
                    </a-button>
                    <a-button icon="arrow-down" size="small" @click="moveItemDown('warning')" :disabled="!canMoveItemDown('warning')">
                      下移
                    </a-button>
                    <a-button icon="bars" size="small" @click="batchGenerateContent('warning')" :disabled="!selectedNode || readonly">
                      批量生成
                    </a-button>
                  </div>
                  <a-table
                    :columns="getContentColumns('warning')"
                    :data-source="getContentData('warning')"
                    :pagination="false"
                    :row-selection="getRowSelection('warning')"
                    size="small"
                    bordered
                    :scroll="{ y: 400 }"
                  >
                    <template slot="content" slot-scope="text">
                      <div v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                    </template>
                  </a-table>
                </div>
              </a-tab-pane>

              <!-- 注意 Tab -->
              <a-tab-pane key="caution">
                <span slot="tab" :style="getItemCount('caution') > 0 ? 'color: red;' : ''">
                  注意({{ getItemCount('caution') }})
                </span>
                <div class="tab-content">
                  <div class="tab-toolbar">
                    <a-button icon="plus" size="small" @click="addItem('caution')" :disabled="!selectedNode || readonly">
                      增加
                    </a-button>
                    <a-button icon="edit" size="small" @click="editItem('caution')" :disabled="!canEditItem('caution')">
                      编辑
                    </a-button>
                    <a-button icon="delete" size="small" @click="deleteItem('caution')" :disabled="!canDeleteItem('caution')">
                      删除
                    </a-button>
                    <a-button icon="arrow-up" size="small" @click="moveItemUp('caution')" :disabled="!canMoveItemUp('caution')">
                      上移
                    </a-button>
                    <a-button icon="arrow-down" size="small" @click="moveItemDown('caution')" :disabled="!canMoveItemDown('caution')">
                      下移
                    </a-button>
                    <a-button icon="bars" size="small" @click="batchGenerateContent('caution')" :disabled="!selectedNode || readonly">
                      批量生成
                    </a-button>
                  </div>
                  <a-table
                    :columns="getContentColumns('caution')"
                    :data-source="getContentData('caution')"
                    :pagination="false"
                    :row-selection="getRowSelection('caution')"
                    size="small"
                    bordered
                    :scroll="{ y: 400 }"
                  >
                    <template slot="content" slot-scope="text">
                      <div v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                    </template>
                  </a-table>
                </div>
              </a-tab-pane>

              <!-- 段落 Tab -->
              <a-tab-pane key="para">
                <span slot="tab" :style="getItemCount('para') > 0 ? 'color: red;' : ''">
                  段落({{ getItemCount('para') }})
                </span>
                <div class="tab-content">
                  <div class="tab-toolbar">
                    <a-button icon="plus" size="small" @click="addItem('para')" :disabled="!selectedNode || readonly">
                      增加
                    </a-button>
                    <a-button icon="edit" size="small" @click="editItem('para')" :disabled="!canEditItem('para')">
                      编辑
                    </a-button>
                    <a-button icon="delete" size="small" @click="deleteItem('para')" :disabled="!canDeleteItem('para')">
                      删除
                    </a-button>
                    <a-button icon="arrow-up" size="small" @click="moveItemUp('para')" :disabled="!canMoveItemUp('para')">
                      上移
                    </a-button>
                    <a-button icon="arrow-down" size="small" @click="moveItemDown('para')" :disabled="!canMoveItemDown('para')">
                      下移
                    </a-button>
                    <a-button icon="bars" size="small" @click="batchGenerateContent('para')" :disabled="!selectedNode || readonly">
                      批量生成
                    </a-button>
                  </div>
                  <a-table
                    :columns="getContentColumns('para')"
                    :data-source="getContentData('para')"
                    :pagination="false"
                    :row-selection="getRowSelection('para')"
                    size="small"
                    bordered
                    :scroll="{ y: 400 }"
                  >
                    <template slot="content" slot-scope="text">
                      <div v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                    </template>
                  </a-table>
                </div>
              </a-tab-pane>

              <!-- 注 Tab -->
              <a-tab-pane key="note">
                <span slot="tab" :style="getItemCount('note') > 0 ? 'color: red;' : ''">
                  注({{ getItemCount('note') }})
                </span>
                <div class="tab-content">
                  <div class="tab-toolbar">
                    <a-button icon="plus" size="small" @click="addItem('note')" :disabled="!selectedNode || readonly">
                      增加
                    </a-button>
                    <a-button icon="edit" size="small" @click="editItem('note')" :disabled="!canEditItem('note')">
                      编辑
                    </a-button>
                    <a-button icon="delete" size="small" @click="deleteItem('note')" :disabled="!canDeleteItem('note')">
                      删除
                    </a-button>
                    <a-button icon="arrow-up" size="small" @click="moveItemUp('note')" :disabled="!canMoveItemUp('note')">
                      上移
                    </a-button>
                    <a-button icon="arrow-down" size="small" @click="moveItemDown('note')" :disabled="!canMoveItemDown('note')">
                      下移
                    </a-button>
                    <a-button icon="bars" size="small" @click="batchGenerateContent('note')" :disabled="!selectedNode || readonly">
                      批量生成
                    </a-button>
                  </div>
                  <a-table
                    :columns="getContentColumns('note')"
                    :data-source="getContentData('note')"
                    :pagination="false"
                    :row-selection="getRowSelection('note')"
                    size="small"
                    bordered
                    :scroll="{ y: 400 }"
                  >
                    <template slot="content" slot-scope="text">
                      <div v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
                    </template>
                  </a-table>
                </div>
              </a-tab-pane>

              <!-- 插图 Tab -->
              <a-tab-pane key="figure">
                <span slot="tab" :style="getItemCount('figure') > 0 ? 'color: red;' : ''">
                  插图({{ getItemCount('figure') }})
                </span>
                <div class="tab-content">
                  <div class="tab-toolbar">
                    <a-button icon="plus" size="small" @click="addItem('figure')" :disabled="!selectedNode || readonly">
                      增加
                    </a-button>
                    <a-button icon="edit" size="small" @click="editItem('figure')" :disabled="!canEditItem('figure')">
                      编辑
                    </a-button>
                    <a-button icon="delete" size="small" @click="deleteItem('figure')" :disabled="!canDeleteItem('figure')">
                      删除
                    </a-button>
                    <a-button icon="arrow-up" size="small" @click="moveItemUp('figure')" :disabled="!canMoveItemUp('figure')">
                      上移
                    </a-button>
                    <a-button icon="arrow-down" size="small" @click="moveItemDown('figure')" :disabled="!canMoveItemDown('figure')">
                      下移
                    </a-button>
                  </div>
                  <a-table
                    :columns="getContentColumns('figure')"
                    :data-source="getContentData('figure')"
                    :pagination="false"
                    :row-selection="getRowSelection('figure')"
                    size="small"
                    bordered
                    :scroll="{ y: 400 }"
                  >
                    <template slot="xmlTitle" slot-scope="text">
                      <span>{{ text }}</span>
                    </template>
                  </a-table>
                </div>
              </a-tab-pane>

              <!-- 多媒体 Tab -->
              <a-tab-pane key="multimedia">
                <span slot="tab" :style="getItemCount('multimedia') > 0 ? 'color: red;' : ''">
                  多媒体({{ getItemCount('multimedia') }})
                </span>
                <div class="tab-content">
                  <div class="tab-toolbar">
                    <a-button icon="plus" size="small" @click="addItem('multimedia')" :disabled="!selectedNode || readonly">
                      增加
                    </a-button>
                    <a-button icon="edit" size="small" @click="editItem('multimedia')" :disabled="!canEditItem('multimedia')">
                      编辑
                    </a-button>
                    <a-button icon="delete" size="small" @click="deleteItem('multimedia')" :disabled="!canDeleteItem('multimedia')">
                      删除
                    </a-button>
                    <a-button icon="arrow-up" size="small" @click="moveItemUp('multimedia')" :disabled="!canMoveItemUp('multimedia')">
                      上移
                    </a-button>
                    <a-button icon="arrow-down" size="small" @click="moveItemDown('multimedia')" :disabled="!canMoveItemDown('multimedia')">
                      下移
                    </a-button>
                  </div>
                  <a-table
                    :columns="getContentColumns('multimedia')"
                    :data-source="getContentData('multimedia')"
                    :pagination="false"
                    :row-selection="getRowSelection('multimedia')"
                    size="small"
                    bordered
                    :scroll="{ y: 400 }"
                  >
                    <template slot="xmlTitle" slot-scope="text">
                      <span>{{ text }}</span>
                    </template>
                  </a-table>
                </div>
              </a-tab-pane>

              <!-- 表格 Tab -->
              <a-tab-pane key="table">
                <span slot="tab" :style="getItemCount('table') > 0 ? 'color: red;' : ''">
                  表格({{ getItemCount('table') }})
                </span>
                <div class="tab-content">
                  <div class="tab-toolbar">
                    <a-button icon="plus" size="small" @click="addItem('table')" :disabled="!selectedNode || readonly">
                      增加
                    </a-button>
                    <a-button icon="edit" size="small" @click="editItem('table')" :disabled="!canEditItem('table')">
                      编辑
                    </a-button>
                    <a-button icon="delete" size="small" @click="deleteItem('table')" :disabled="!canDeleteItem('table')">
                      删除
                    </a-button>
                    <a-button icon="arrow-up" size="small" @click="moveItemUp('table')" :disabled="!canMoveItemUp('table')">
                      上移
                    </a-button>
                    <a-button icon="arrow-down" size="small" @click="moveItemDown('table')" :disabled="!canMoveItemDown('table')">
                      下移
                    </a-button>
                  </div>
                  <a-table
                    :columns="getContentColumns('table')"
                    :data-source="getContentData('table')"
                    :pagination="false"
                    :row-selection="getRowSelection('table')"
                    size="small"
                    bordered
                    :scroll="{ y: 400 }"
                  >
                    <template slot="xmlTitle" slot-scope="text">
                      <span>{{ text }}</span>
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
      :destroyOnClose="true"
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

    <!-- 对话框组件（P0遗漏项补充） -->
    <ietm-interref-dialog
      ref="interrefDialog"
      :visible.sync="interrefDialogVisible"
      :node-list="nodeList"
      @insert="insertInterref"
    />
    <ietm-dm-ref-dialog
      ref="dmrefDialog"
      :visible.sync="dmrefDialogVisible"
      @insert="insertDmRef"
    />
    <ietm-symbol-dialog
      ref="symbolDialog"
      :visible.sync="symbolDialogVisible"
      @insert="insertSymbol"
    />

    <!-- 结构化编辑器对话框 -->
    <a-modal
      v-model="structuredEditorVisible"
      :title="structuredEditorTitle"
      :width="1200"
      :footer="null"
      :maskClosable="false"
      :destroyOnClose="true"
      :dialogClass="`${structuredEditorType}-editor-modal`"
    >
      <figure-designer
        v-if="structuredEditorType === 'figure' && structuredEditorVisible"
        ref="structuredFigureDesigner"
        :lineno="structuredEditorLineno"
        :editor="structuredEditorInstance"
        :locale="locale"
        :cmnodeid="cmnodeid"
        :ifedit="ifedit"
        :save="'0'"
        @save="handleStructuredEditorSave"
      />
      <multimedia-designer
        v-if="structuredEditorType === 'multimedia' && structuredEditorVisible"
        ref="structuredMultimediaDesigner"
        :lineno="structuredEditorLineno"
        :editor="structuredEditorInstance"
        :locale="locale"
        :cmnodeid="cmnodeid"
        :ifedit="ifedit"
        :save="'0'"
        @save="handleStructuredEditorSave"
      />
      <table-designer
        v-if="structuredEditorType === 'table' && structuredEditorVisible"
        ref="structuredTableDesigner"
        :lineno="structuredEditorLineno"
        :editor="structuredEditorInstance"
        :locale="locale"
        :cmnodeid="cmnodeid"
        :ifedit="ifedit"
        :save="'0'"
        @save="handleStructuredEditorSave"
      />
      <div class="modal-footer" style="margin-top: 12px; text-align: right;">
        <a-button @click="closeStructuredEditor">取消</a-button>
        <a-button type="primary" @click="saveStructuredEditor" :loading="structuredEditorSaving">确定</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script>
// 工具函数导入
import {
  parseXmlToTree,
  treeToXml,
  createEmptyNode,
  createEmptyHtmlContent,
  setParent
} from '../utils/mainProcedureConverterV2'
import { html2para, para2html } from '../utils/paraConverter'
import { getUEditorConfig, loadUEditor } from '../utils/ueditorConfig'

// 组件导入
import IetmInterrefDialog from './IetmInterrefDialog'
import IetmDmRefDialog from './IetmDmRefDialog'
import IetmSymbolDialog from './IetmSymbolDialog'
import FigureDesigner from './FigureDesigner'
import MultimediaDesigner from './MultimediaDesigner'
import TableDesigner from './TableDesigner'

// 引入补充方法（通过mixin）
import MainProcedureDesignerMethods from './MainProcedureDesigner_methods'

export default {
  name: 'MainProcedureDesigner',

  mixins: [MainProcedureDesignerMethods],

  components: {
    IetmInterrefDialog,
    IetmDmRefDialog,
    IetmSymbolDialog,
    FigureDesigner,
    MultimediaDesigner,
    TableDesigner
  },

  props: {
    lineno: { type: Number, required: true },
    editor: { type: Object, required: true },
    locale: { type: String, default: 'en' },
    cmnodeid: { type: String, required: true },
    ifedit: { type: String, default: '1' },
    save: { type: String, default: '1' },
    // P1遗漏项补充：缺失的props
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
      // 树形数据
      rawTreeData: [],
      treeData: [],
      expandedKeys: [],
      selectedKeys: [],
      selectedNode: null,

      // 编辑状态
      activeTab: 'warning',
      currentTitle: '',
      saving: false,

      // 内容项选择状态
      selectedRowKeys: {},

      // 内容编辑器
      contentEditorVisible: false,
      contentEditorTitle: '',
      contentEditorType: '',
      contentEditorIndex: -1,
      contentEditor: null,
      contentEditorReady: false,
      contentEditorId: `content_editor_${Date.now()}`,
      contentEditorSaving: false,

      // P0遗漏项补充：对话框可见性
      interrefDialogVisible: false,
      dmrefDialogVisible: false,
      symbolDialogVisible: false,

      // 批量生成
      batchGenerateVisible: false,
      batchGenerateText: '',
      batchGenerateType: '',

      // 结构化编辑器
      structuredEditorVisible: false,
      structuredEditorTitle: '',
      structuredEditorType: '', // 'figure' | 'multimedia' | 'table'
      structuredEditorIndex: -1,
      structuredEditorLineno: 0,
      structuredEditorInstance: null,
      structuredEditorSaving: false,

      // XML源码
      endline: -1
    }
  },

  computed: {
    readonly() {
      return this.ifedit === '0'
    },

    showSaveBtn() {
      return this.save === '1'
    },

    // Parent接口对象（供html2para使用）
    Parent() {
      return {
        editor: this.editor,
        locale: this.locale,
        dmCode: this.dmCode,
        nodeList: this.nodeList,
        cmnodeid: this.cmnodeid,
        projectParameters: this.projectParameters,
        uniqueid: this.uniqueid,
        getLocaleName: this.getLocaleName,
        toEnXml: this.toEnXml,
        toCnXml: this.toCnXml,
        formateXml: this.formateXml
      }
    }
  },

  // P0遗漏项补充：mounted生命周期钩子
  mounted() {
    // 1. 注册全局实例映射（用于按钮回调访问 $refs 对话框）
    if (!window.$MAINPROCEDURE_DESIGNER_INSTANCES) {
      window.$MAINPROCEDURE_DESIGNER_INSTANCES = {}
    }
    window.$MAINPROCEDURE_DESIGNER_INSTANCES[this.contentEditorId] = this

    // 2. 加载UEditor并注册自定义按钮
    loadUEditor()
      .then(() => {
        this.$nextTick(() => {
          // 注册自定义按钮（必须在组件挂载且UE加载完成后）
          this.registerCustomButtonsGlobal()
        })
      })
      .catch((error) => {
        console.error('UEditor脚本加载失败:', error)
        this.$message.error('富文本编辑器加载失败')
      })

    // 3. 设置Parent对象到转换器
    setParent(this.Parent)

    // 4. 加载内容
    this.loadContent()
  },

  // P0遗漏项补充：beforeDestroy生命周期钩子
  beforeDestroy() {
    if (this.contentEditor) {
      try {
        this.contentEditor.destroy()
      } catch (e) {
        console.warn('[MainProcedure] ContentEditor destroy error:', e)
      }
    }

    // 清理全局实例映射（防止内存泄漏）
    if (window.$MAINPROCEDURE_DESIGNER_INSTANCES) {
      delete window.$MAINPROCEDURE_DESIGNER_INSTANCES[this.contentEditorId]
    }
  },

  methods: {
    /**
     * 加载mainProcedure内容
     */
    async loadContent() {
      try {
        // 1. 获取mainProcedure的XML
        let mainProcedureXml = this.editor.getLine(this.lineno)

        if (!mainProcedureXml || mainProcedureXml.trim() === '') {
          throw new Error(`第 ${this.lineno + 1} 行为空`)
        }

        // 2. 判断是单行还是多行
        const isSingleLine =
          mainProcedureXml.includes('<mainProcedure') && mainProcedureXml.includes('</mainProcedure>')

        if (!isSingleLine) {
          // P1遗漏项补充：使用findEndLine方法查找结束行
          this.endline = this.findEndLine('mainProcedure', this.lineno)

          if (this.endline === -1) {
            throw new Error('未找到匹配的 </mainProcedure> 结束标签')
          }

          mainProcedureXml = this.editor.getRange(
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        } else {
          this.endline = this.lineno
        }

        // 3. 转换为英文XML
        if (this.locale === 'cn') {
          mainProcedureXml = this.toEnXml(mainProcedureXml)
        }

        // 4. P0遗漏项补充：替换xlink命名空间（避免XML解析错误）
        mainProcedureXml = mainProcedureXml.replace(/xlink:/g, 'xlink_')

        // 5. 解析为树形数据
        this.rawTreeData = parseXmlToTree(mainProcedureXml)

        // 6. 转换为Ant Tree数据
        this.treeData = this.convertToAntTreeData(this.rawTreeData)

        // 7. 初始化展开所有节点
        this.expandedKeys = this.getAllNodeKeys(this.rawTreeData)

        // 8. 自动选中第一个一级节点
        if (this.rawTreeData.length > 0) {
          const rootNode = this.rawTreeData[0]
          if (rootNode.children && rootNode.children.length > 0) {
            const firstStep = rootNode.children[0]
            this.selectedKeys = [firstStep.id]
            this.selectedNode = firstStep
            this.currentTitle = firstStep.title || ''
            this.activeTab = 'warning'
          } else {
            // 如果根节点没有子节点，选中根节点本身
            this.selectedKeys = [rootNode.id]
            this.selectedNode = rootNode
            this.currentTitle = ''
            this.activeTab = 'warning'
          }
        }

        console.log('[MainProcedure] 内容加载成功', {
          步骤数: this.rawTreeData[0]?.children?.length || 0,
          树形数据: this.rawTreeData
        })
      } catch (error) {
        console.error('[MainProcedure] 加载失败:', error)
        this.$message.error('加载失败: ' + error.message)
      }
    },

    /**
     * P1遗漏项补充：查找元素结束行号（支持嵌套标签）
     */
    findEndLine(tagName, startLine) {
      const lineCount = this.editor.lineCount()
      const openTag = `<${tagName}`
      const closeTag = `</${tagName}>`

      let depth = 1 // 起始行已有一个开始标签

      for (let i = startLine + 1; i < lineCount; i++) {
        const line = this.editor.getLine(i)

        // 统计当前行的开始标签和结束标签数量
        const openCount = (line.match(new RegExp(openTag, 'g')) || []).length
        const closeCount = (line.match(new RegExp(closeTag, 'g')) || []).length

        depth += openCount - closeCount

        // 当深度回到0时，找到了匹配的结束标签
        if (depth === 0) {
          return i
        }

        // 深度不应该为负数
        if (depth < 0) {
          console.error('[findEndLine] 标签嵌套错误', { tagName, startLine, line: i })
          return -1
        }
      }

      return -1 // 遍历完仍未找到
    },

    /**
     * 获取所有节点的Key
     */
    getAllNodeKeys(nodes) {
      let keys = []
      const traverse = (nodeList) => {
        nodeList.forEach((node) => {
          keys.push(node.id)
          if (node.children && node.children.length > 0) {
            traverse(node.children)
          }
        })
      }
      traverse(nodes)
      return keys
    },

    /**
     * 转换为Ant Design Tree数据格式
     */
    convertToAntTreeData(nodes) {
      return nodes.map((node) => {
        const treeNode = {
          id: node.id,
          stepno: node.stepno,
          title: node.title,
          scopedSlots: { title: 'title' }
        }
        if (node.children && node.children.length > 0) {
          treeNode.children = this.convertToAntTreeData(node.children)
        }
        return treeNode
      })
    },

    /**
     * 在树中查找节点
     */
    findNodeInTree(nodes, nodeId) {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return node
        }
        if (node.children && node.children.length > 0) {
          const found = this.findNodeInTree(node.children, nodeId)
          if (found) return found
        }
      }
      return null
    },

    /**
     * 获取显示的标题文本
     */
    getDisplayTitle(titleXml) {
      if (!titleXml) return '(无标题)'
      // 简单提取文本内容，去除XML标签
      const text = titleXml.replace(/<[^>]+>/g, '').trim()
      return text || '(无标题)'
    },

    /**
     * 树节点选中事件
     */
    onTreeSelect(selectedKeys, e) {
      if (selectedKeys.length === 0) return

      this.selectedKeys = selectedKeys
      const nodeKey = selectedKeys[0]

      // 根节点特殊处理
      if (nodeKey === '0') {
        this.selectedNode = this.rawTreeData[0]
        this.currentTitle = ''
        return
      }

      // 从原始数据中查找节点
      this.selectedNode = this.findNodeInTree(this.rawTreeData, nodeKey)
      if (this.selectedNode) {
        this.currentTitle = this.getDisplayTitle(this.selectedNode.title)
      }
    },

    /**
     * 树节点展开事件
     */
    onTreeExpand(expandedKeys) {
      this.expandedKeys = expandedKeys
    },

    /**
     * 标题变化事件
     */
    handleTitleChange() {
      // 实时更新节点标题（不保存）
      if (this.selectedNode) {
        this.selectedNode.title = this.currentTitle
      }
    },

    /**
     * 打开标题编辑器
     */
    openTitleEditor() {
      // TODO: 实现富文本标题编辑器
      this.$message.info('标题编辑器开发中...')
    },

    /**
     * 添加子步骤
     */
    handleAddStep() {
      if (!this.selectedNode) {
        this.$message.warning('请先选择一个步骤节点')
        return
      }

      // 1. 计算新步骤ID（P1遗漏项补充：正确处理根节点子节点ID）
      let maxId = 0
      if (this.selectedNode.children) {
        this.selectedNode.children.forEach((child) => {
          const ids = child.id.split('.')
          const lastId = parseInt(ids[ids.length - 1])
          if (lastId > maxId) maxId = lastId
        })
      }

      // P1遗漏项补充：根节点的子节点ID不包含"0."前缀
      const newId =
        this.selectedNode.id === '0'
          ? `${maxId + 1}` // 根节点子节点：1, 2, 3
          : `${this.selectedNode.id}.${maxId + 1}` // 其他节点子节点：1.1, 1.2

      // 2. 创建新节点
      const newNode = createEmptyNode(newId, this.selectedNode.id)
      newNode.stepno = `步骤${newId}`
      newNode.html = createEmptyHtmlContent()

      // 3. 添加到树形数据
      if (!this.selectedNode.children) {
        this.selectedNode.children = []
      }
      this.selectedNode.children.push(newNode)

      // 4. 更新Ant Tree数据
      this.treeData = this.convertToAntTreeData(this.rawTreeData)

      // 5. 展开父节点并选中新节点
      if (!this.expandedKeys.includes(this.selectedNode.id)) {
        this.expandedKeys.push(this.selectedNode.id)
      }
      this.selectedKeys = [newId]
      this.selectedNode = newNode
      this.currentTitle = ''

      this.$message.success('添加子步骤成功')
    },

    /**
     * 删除步骤
     */
    handleDeleteStep() {
      if (!this.selectedNode || this.selectedNode.id === '0') {
        this.$message.warning('请选择一个除根节点外的步骤')
        return
      }

      // 检查是否有子步骤
      if (this.selectedNode.children && this.selectedNode.children.length > 0) {
        this.$message.warning('当前步骤还有下级步骤，不能删除')
        return
      }

      this.$confirm({
        title: '确认删除',
        content: '确定要删除该步骤么？',
        onOk: () => {
          // 1. 从父节点中移除
          const parentNode = this.findNodeInTree(this.rawTreeData, this.selectedNode._parentId)
          if (parentNode && parentNode.children) {
            const index = parentNode.children.findIndex((n) => n.id === this.selectedNode.id)
            if (index !== -1) {
              parentNode.children.splice(index, 1)
            }
          }

          // 2. 更新Ant Tree数据
          this.treeData = this.convertToAntTreeData(this.rawTreeData)

          // 3. 清空选中状态
          this.selectedKeys = []
          this.selectedNode = null
          this.currentTitle = ''

          this.$message.success('删除成功')
        }
      })
    },

    /**
     * 批量生成步骤
     */
    batchGenerate() {
      if (!this.selectedNode) {
        this.$message.warning('请选择操作步骤节点')
        return
      }
      this.batchGenerateVisible = true
      this.batchGenerateType = 'step'
      this.batchGenerateText = ''
    },

    /**
     * 处理批量生成
     */
    handleBatchGenerate() {
      if (this.batchGenerateType === 'step') {
        this.handleBatchGenerateSteps()
      } else {
        this.handleBatchGenerateContents()
      }
    },

    /**
     * 批量生成步骤
     */
    handleBatchGenerateSteps() {
      if (!this.batchGenerateText || !this.batchGenerateText.trim()) {
        this.$message.warning('请输入批量生成的内容')
        return
      }

      // 1. 处理文本（去除多余空格、换行）
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

      // 2. 获取当前子步骤数量
      const childCount = this.selectedNode.children ? this.selectedNode.children.length : 0

      // 3. 批量创建步骤
      if (!this.selectedNode.children) {
        this.selectedNode.children = []
      }

      text.forEach((line, index) => {
        const newId =
          this.selectedNode.id === '0'
            ? `${childCount + index + 1}`
            : `${this.selectedNode.id}.${childCount + index + 1}`

        const newNode = createEmptyNode(newId, this.selectedNode.id)
        newNode.stepno = `步骤${newId}`
        newNode.title = `<title>${this.escapeXml(line)}</title>`
        newNode.html = createEmptyHtmlContent()

        this.selectedNode.children.push(newNode)
      })

      // 4. 更新Tree
      this.treeData = this.convertToAntTreeData(this.rawTreeData)

      // 5. 展开父节点
      if (!this.expandedKeys.includes(this.selectedNode.id)) {
        this.expandedKeys.push(this.selectedNode.id)
      }

      this.batchGenerateVisible = false
      this.$message.success(`成功批量生成 ${text.length} 项`)
    },

    /**
     * P1遗漏项补充：XML特殊字符转义
     */
    escapeXml(text) {
      if (!text) return ''
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    },

    /**
     * P1遗漏项补充：获取当前行的缩进量
     */
    getIndent() {
      const line = this.editor.getLine(this.lineno)
      const match = line.match(/^(\s*)/)
      return match ? match[1].length : 0
    },

    /**
     * 保存步骤信息（不保存到XML）
     */
    handleSaveStep() {
      if (!this.selectedNode) {
        this.$message.warning('请先选择一个步骤节点')
        return
      }

      // 更新标题
      this.selectedNode.title = this.currentTitle

      // 注意：内容已经在各Tab的操作中实时更新到selectedNode.html
      // 这里只需要更新Tree显示
      this.treeData = this.convertToAntTreeData(this.rawTreeData)

      this.$message.success('保存步骤信息成功')
    },

    /**
     * 保存所有步骤到XML
     */
    async handleSave() {
      if (this.saving) return

      try {
        this.saving = true

        // 1. 验证数据
        if (!this.rawTreeData || this.rawTreeData.length === 0) {
          this.$message.warning('还没有步骤，无需保存')
          return
        }

        const rootNode = this.rawTreeData[0]
        if (!rootNode.children || rootNode.children.length === 0) {
          this.$message.warning('还没有步骤，无需保存')
          return
        }

        // 2. 树形数据 → XML（treeToXml 是 async，必须 await）
        const xmlString = await treeToXml(this.rawTreeData, {
          locale: this.locale,
          indent: this.getIndent()
        })

        // 3. 格式化XML
        let formattedXml = this.formateXml(xmlString, this.getIndent())

        // 4. 转换为中文XML（如果需要）
        if (this.locale === 'cn') {
          formattedXml = this.toCnXml(formattedXml)
        }

        // 5. 替换源码视图内容
        this.editor.replaceRange(formattedXml, { line: this.lineno, ch: 0 }, { line: this.endline + 1, ch: 0 })

        // 6. 触发保存事件，让父组件处理保存和视图切换
        this.$emit('save')

        this.$message.success('保存成功')
      } catch (error) {
        console.error('[MainProcedure] 保存失败:', error)
        this.$message.error('保存失败: ' + error.message)
      } finally {
        this.saving = false
      }
    },

    /**
     * 关闭批量生成对话框
     */
    closeBatchGenerate() {
      this.batchGenerateVisible = false
      this.batchGenerateText = ''
    },

    // ========== 内容编辑相关方法 ==========
    // 由于篇幅限制，完整代码请参考下一个文件块
  }
}
</script>

<style lang="scss" scoped>
.mainprocedure-designer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;

  // ==================== 工具栏样式 ====================
  .mainprocedure-toolbar {
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
    padding: 0;

    .toolbar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;

      .toolbar-title {
        font-size: 16px;
        font-weight: bold;
        color: #1890ff;
      }

      .toolbar-actions {
        display: flex;
        gap: 8px;
      }
    }
  }

  // ==================== 主容器样式 ====================
  .mainprocedure-main {
    flex: 1;
    overflow: hidden;
    padding: 16px;

    .main-layout {
      display: flex;
      gap: 16px;
      height: 100%;
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }

  // ==================== 左侧树形区域 ====================
  .left-tree {
    width: 400px;
    min-width: 300px;
    border-right: 1px solid #e8e8e8;
    display: flex;
    flex-direction: column;

    .tree-toolbar {
      padding: 12px;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tree-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 12px;

      .tree-node-title {
        display: flex;
        align-items: center;
        gap: 8px;

        .node-level {
          font-weight: 500;
          color: #1890ff;
          white-space: nowrap;
        }

        .node-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #333;
        }
      }
    }
  }

  // ==================== 右侧编辑区域 ====================
  .right-editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    // 标题编辑区
    .title-edit-area {
      padding: 12px;
      border-bottom: 1px solid #e8e8e8;
      background: #fafafa;

      .title-table {
        width: 100%;
        border-collapse: collapse;

        td {
          padding: 4px 8px;
          vertical-align: middle;
        }

        .title-label {
          width: 60px;
          white-space: nowrap;

          .title-link {
            color: #1890ff;
            text-decoration: none;
            cursor: pointer;

            &:hover {
              text-decoration: underline;
            }

            &[disabled] {
              color: #d9d9d9;
              cursor: not-allowed;
            }
          }
        }

        .title-input {
          width: auto;
        }

        .title-save {
          width: 120px;
          text-align: right;

          .save-level-btn {
            white-space: nowrap;
          }
        }
      }
    }

    // Tab内容区
    .right-tabs {
      flex: 1;
      overflow: hidden;
      padding: 12px;

      ::v-deep .ant-tabs {
        height: 100%;
        display: flex;
        flex-direction: column;

        .ant-tabs-content {
          flex: 1;
          overflow: hidden;
        }

        .ant-tabs-tabpane-inactive {
          display: none;
        }

        .ant-tabs-tabpane-active {
          height: 100%;
          overflow: hidden;
        }
      }

      .tab-content {
        height: 100%;
        display: flex;
        flex-direction: column;

        .tab-toolbar {
          padding: 8px 0;
          border-bottom: 1px solid #e8e8e8;
          margin-bottom: 12px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        ::v-deep .ant-table-wrapper {
          flex: 1;
          overflow: hidden;

          .ant-table {
            height: 100%;
          }

          .ant-table-body {
            overflow-y: auto;
          }
        }
      }
    }
  }

  // ==================== 内容编辑器对话框 ====================
  .content-editor-wrapper {
    min-height: 400px;

    textarea {
      width: 100%;
      height: 400px;
    }
  }

  // ==================== 批量生成对话框 ====================
  .batch-generate-content {
    p {
      margin-bottom: 12px;
      color: #666;
    }
  }

  // ==================== 结构化编辑器对话框（插图/多媒体/表格）====================
  ::v-deep .figure-editor-modal .ant-modal-body,
  ::v-deep .multimedia-editor-modal .ant-modal-body,
  ::v-deep .table-editor-modal .ant-modal-body {
    padding: 16px;
    height: 900px;
    overflow: hidden;
  }

  ::v-deep .figure-editor-modal .figure-editor-container,
  ::v-deep .multimedia-editor-modal .multimedia-editor-container,
  ::v-deep .table-editor-modal .table-editor-container {
    height: 100%;
    overflow: auto;
  }

  // ==================== 响应式布局 ====================
  @media (max-width: 1200px) {
    .main-layout {
      flex-direction: column;
    }

    .left-tree {
      width: 100%;
      min-height: 300px;
      border-right: none;
      border-bottom: 1px solid #e8e8e8;
    }
  }
}
</style>

<style lang="scss">
/* 全局样式：用于 Portal 渲染的模态框（不受 scoped 限制） */
.figure-editor-modal .ant-modal-body,
.multimedia-editor-modal .ant-modal-body,
.table-editor-modal .ant-modal-body {
  padding: 16px;
  height: 700px;
  overflow: visible; /* 改为 visible 让按钮区域可见 */
  display: flex;
  flex-direction: column;
}

/* 内容区域占据剩余空间 */
.figure-editor-modal .figure-designer,
.multimedia-editor-modal .multimedia-designer,
.table-editor-modal .table-designer {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

/* 按钮区域固定在底部 */
.figure-editor-modal .modal-footer,
.multimedia-editor-modal .modal-footer,
.table-editor-modal .modal-footer {
  flex-shrink: 0;
  margin-top: 12px;
}
</style>