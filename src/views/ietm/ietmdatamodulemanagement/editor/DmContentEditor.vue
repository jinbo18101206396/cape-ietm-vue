<template>
  <div class="dm-editor-page">
    <!-- 三区主体 -->
    <a-spin :spinning="loading" wrapperClassName="editor-body-spin">
      <div class="editor-body">
        <div class="region-west" v-show="treeVisible">
          <dm-structure-tree
            ref="tree" :nodeList="displayNodeList" :schema="schema"
            :locale="locale" :readonly="readonly" :en2cnElem="en2cnElem"
            @select="onTreeSelect" @dblclick="onTreeDblClick"
            @delete-element="onDeleteElement" @add-element="onAddElement"/>
        </div>
        <div class="region-center" :class="{'region-center--readonly': readonly}">
          <!-- 模式横幅：醒目区分编辑/浏览（绿=可编辑，红=只读）-->
          <div class="mode-banner" :class="readonly ? 'mode-banner--readonly' : 'mode-banner--edit'">
            <a-icon :type="readonly ? 'eye' : 'edit'" class="mb-icon"/>
            <span class="mb-mode">{{ readonly ? '浏览模式 · 只读' : '编辑模式 · 可编辑' }}</span>
            <span class="mb-dmc">DMC：{{ dmc || '未知' }}</span>
            <span class="mb-hint" v-if="readonly">该DM未被您签出，签出后方可编辑</span>
          </div>
          <!-- 工具栏属于中区源码视图（§4 center north）-->
          <!-- 中区底部页签（§4 tabPosition:'bottom'）：设计视图在左·二期禁用占位，源码视图在右·默认选中 -->
          <a-tabs class="view-tabs" :active-key="viewMode" tab-position="bottom"
            :animated="false" size="small" @change="onViewTabChange">
            <!-- 页签1：设计视图（DOM先声明→按钮在左），二期功能，禁用占位 -->
            <a-tab-pane key="design" disabled>
              <span slot="tab" title="设计视图为二期功能"><a-icon type="edit"/> 设计视图</span>
              <div class="design-placeholder">
                <a-icon type="tool" class="dp-icon"/>
                <span>设计视图为二期功能，敬请期待</span>
              </div>
            </a-tab-pane>
            <!-- 页签2：源码视图（默认选中）；工具栏归属本页签内部（§4/§5 center north） -->
            <a-tab-pane key="source">
              <span slot="tab"><a-icon type="code"/> 源码视图</span>
              <div class="source-pane">
          <div class="editor-toolbar">
            <!-- 第一行：视图/编辑辅助（§5），左端< 右端> -->
            <div class="toolbar-row">
              <a-button size="small" class="edge-btn edge-left" @click="toggleTree" :title="treeVisible ? '隐藏DM树' : '显示DM树'">
                <span class="edge-icon">{{ treeVisible ? '&lt;' : '&gt;' }}</span>
              </a-button>
              <div class="toolbar-tools">
                <!-- 隐藏主题下拉框，主题固定为default -->
                <a-select size="small" v-model="locale" style="width:90px" @change="onLocaleChange" v-if="!isGjb" title="中/英文切换">
                  <a-select-option value="en">English</a-select-option>
                  <a-select-option value="cn">中文</a-select-option>
                </a-select>
                <a-button size="small" type="primary" @click="doFormat" title="格式化（2空格缩进）"><a-icon type="unordered-list"/>格式化</a-button>
                <a-button size="small" type="primary" @click="doFold" title="折叠/展开当前行"><a-icon type="plus-square"/>折叠/展开</a-button>
                <a-button size="small" type="primary" @click="doMoveRow" title="移动行（整块元素上/下移）"><a-icon type="swap"/>移动行</a-button>
                <a-button size="small" type="primary" @click="doFind" title="查找（Ctrl+F）"><a-icon type="search"/>查找</a-button>
                <a-button size="small" type="primary" @click="fontLarger" title="放大字体"><a-icon type="zoom-in"/>放大</a-button>
                <a-button size="small" type="primary" @click="fontSmaller" title="缩小字体"><a-icon type="zoom-out"/>缩小</a-button>
                <a-button size="small" type="primary" :disabled="readonly" @click="doUndo" title="撤销（Ctrl+Z）"><a-icon type="undo"/>撤销</a-button>
                <a-button size="small" type="primary" :disabled="readonly" @click="doRedo" title="重做（Ctrl+Y）"><a-icon type="redo"/>重做</a-button>
                <a-button size="small" type="primary" :disabled="readonly" @click="doDeleteElement" title="删除行（Ctrl+D）"><a-icon type="delete"/>删除行</a-button>
                <a-button size="small" type="primary" @click="doExport" title="导出XML文件"><a-icon type="download"/>导出</a-button>
                <a-button size="small" type="primary" v-show="hasNotice" @click="showNotice" title="重要提示"><a-icon type="bell"/>提示</a-button>
              </div>
              <a-button size="small" class="edge-btn edge-right" @click="toggleAttr" :title="attrVisible ? '隐藏属性面板' : '显示属性面板'">
                <span class="edge-icon">{{ attrVisible ? '&gt;' : '&lt;' }}</span>
              </a-button>
            </div>
            <!-- 第二行：内容编辑与业务操作（§5） -->
            <div class="toolbar-row toolbar-row--edit">
              <div class="toolbar-tools">
                <a-button size="small" :type="dirty ? 'danger' : 'primary'" :disabled="readonly" @click="doSave()" :loading="saving" title="保存到数据库（Ctrl+S）">
                  <a-icon type="save"/>{{ dirty ? '未保存' : '已保存' }}
                </a-button>
                <a-button size="small" type="primary" :disabled="readonly" @click="doCheckin" title="保存并签入"><a-icon type="import"/>签入</a-button>
                <a-button size="small" type="primary" :disabled="readonly" @click="openDmRef" title="插入dmRef引用"><a-icon type="link"/>引用DM</a-button>
                <a-button size="small" type="primary" :disabled="readonly" @click="openSymbol" title="插入symbol图符"><a-icon type="picture"/>插入图符</a-button>
                <a-button size="small" type="primary" :disabled="readonly" @click="openInterref" title="插入internalRef内部引用"><a-icon type="file-text"/>内部引用</a-button>
                <a-button size="small" type="primary" @click="showIdList" title="对象列表（全文id/DM/ICN）"><a-icon type="ordered-list"/>对象列表</a-button>
                <a-button size="small" type="primary" @click="doValidate()" :loading="validating" title="XSD Schema校验"><a-icon type="check-circle"/>校验</a-button>
                <a-button size="small" type="primary" @click="doPreview" :loading="previewing" title="生成HTML预览"><a-icon type="eye"/>预览</a-button>
                <a-button size="small" type="primary" :disabled="readonly" @click="doRegenRefs" title="重建引用块与DOCTYPE声明"><a-icon type="sync"/>重建refs与DOCTYPE</a-button>
                <a-button size="small" :disabled="readonly" @click="openCustom" title="自定义代码生成"><a-icon type="code"/>自定义生成</a-button>
                <a-button size="small" :disabled="readonly" @click="openWordGen" title="由Word转换XML"><a-icon type="file"/>由Word生成</a-button>
              </div>
            </div>
          </div>
          <dm-source-view
            ref="editor" :value="content" :schema="hintSchema"
            :theme="theme" :readonly="readonly"
            @cursor-node="onCursorNode" @cursor-change="onCursorChange" @content-change="onContentChange"
            @element-inserted="onElementInserted"/>
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>
        <div class="region-east" v-show="attrVisible">
          <dm-attr-panel
            :node="currentNode" :schema="schema" :nodeList="displayNodeList"
            :en2cnElem="en2cnElem" :locale="locale" :readonly="readonly"
            @set-property="onSetProperty"
            @insert-child="en => onAddElement({elemName: en, appendType: 'child'})"
            @insert-sibling="en => onAddElement({elemName: en, appendType: 'sibling'})"/>
        </div>
      </div>
    </a-spin>

    <dm-validate-panel ref="validatePanel" @locate="onLocateValid"/>
    <dm-preview-modal  ref="previewModal"/>
    <dm-node-preview-modal ref="nodePreviewModal"/>
    <ietm-dm-ref-dialog ref="dmRefDialog" @insert="onDmRefInsert"/>
    <ietm-symbol-dialog
      v-if="symbolDialogVisible"
      :visible.sync="symbolDialogVisible"
      @insert="onSymbolInsert"/>
    <ietm-interref-dialog
      v-if="interrefVisible"
      :visible.sync="interrefVisible"
      :node-list="nodeList"
      @insert="onInterrefInsert"/>
    <dm-id-list-modal ref="idListModal" @locate="onIdListLocate"/>

    <!-- 移动行弹框（§5 movethis）-->
    <a-modal v-model="moveRowVisible" title="移动行" @ok="confirmMoveRow"
      ok-text="移动" cancel-text="取消" :width="360">
      <a-form layout="inline" style="margin-bottom:8px">
        <a-form-item label="起始行">
          <a-input-number v-model="moveRowFrom" :min="1" size="small" style="width:80px"/>
        </a-form-item>
        <a-form-item label="目标行">
          <a-input-number v-model="moveRowTo" :min="1" size="small" style="width:80px"/>
        </a-form-item>
      </a-form>
      <div style="color:#999;font-size:12px">将起始行所在元素整块移动到目标行之前（仅限同层移动）</div>
    </a-modal>

    <!-- 补ICN后缀弹框（§16.4 correctIcn） -->
    <icn-suffix-modal ref="icnSuffixModal" @ok="onIcnSuffixOk" @cancel="onIcnSuffixCancel"/>

    <!-- 流程信息面板（South区域，可折叠+可拖高，还原旧 region:'south' split+collapsed） -->
    <div v-if="showWorkflowPanel" class="region-south" :class="{ 'region-south--collapsed': workflowCollapsed }">
      <!-- 拖拽分隔条（展开时才可拖） -->
      <div
        v-if="!workflowCollapsed"
        class="south-resize-bar"
        @mousedown="startWorkflowResize"
      ></div>
      <!-- 标题栏：点击折叠/展开 -->
      <div class="south-title-bar" @click="toggleWorkflowPanel">
        <span class="south-title">流程信息</span>
        <a-icon :type="workflowCollapsed ? 'up' : 'down'" class="south-toggle-icon"/>
      </div>
      <!-- 面板主体：折叠时隐藏 -->
      <div
        v-show="!workflowCollapsed"
        class="south-body"
        :style="{ height: workflowHeight + 'px' }"
      >
        <workflow-info-panel
          ref="workflowPanel"
          :formid="id"
          :readonly="readonly"
          @workflow-change="onWorkflowChange"
          @workflow-complete="onWorkflowComplete"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import DmStructureTree  from './components/DmStructureTree'
import DmSourceView     from './components/DmSourceView'
import DmAttrPanel      from './components/DmAttrPanel'
import DmValidatePanel  from './components/DmValidatePanel'
import DmPreviewModal   from './components/DmPreviewModal'
import DmNodePreviewModal from './components/DmNodePreviewModal'
import IetmDmRefDialog  from './components/IetmDmRefDialog'
import IetmSymbolDialog   from './components/IetmSymbolDialog'
import IetmInterrefDialog from './components/IetmInterrefDialog'
import DmIdListModal      from './components/DmIdListModal'
import IcnSuffixModal     from './components/IcnSuffixModal'
import WorkflowInfoPanel  from '../components/WorkflowInfoPanel'
import { getTreeNodesfromXml, buildCnNodeList, extractRootContent, getnodeBylineno, formatXml } from './utils/xmlTree'
import { toEnXml, toCnXml } from './utils/enCnConvert'
import { getDmcByLineno } from './utils/refsBuilder'
import { NOTATIONS } from './utils/notations'
import { ICN_FILE_EXT, normalizeExt, isValidIcnExt } from './utils/icnFileExt'

export default {
  name: 'DmContentEditor',
  components: {
    DmStructureTree,
    DmSourceView,
    DmAttrPanel,
    DmValidatePanel,
    DmPreviewModal,
    DmNodePreviewModal,
    IetmDmRefDialog,
    IetmSymbolDialog,
    IetmInterrefDialog,
    DmIdListModal,
    IcnSuffixModal,
    WorkflowInfoPanel
  },
  data() {
    return {
      id:   this.$route.params.id,
      dmc:  this.$route.query.dmc  || '',
      mode: this.$route.query.mode || 'browse',
      historyId: this.$route.query.historyId || null,  // 历史版本ID
      isClosing: false,  // 标记页面正在关闭/销毁
      loading: false, saving: false, validating: false, previewing: false,
      content: '', originalContent: '',
      xsdSchema: '', ietmStandard: 'S1000D4.0',
      schema: {}, cnSchema: {}, en2cnElem: {}, cn2enElem: {},
      designerSett: {},
      nodeList: [], cnNodeList: [],
      currentNode: null,
      dbVersion: null,
      dirty: false,
      locale: 'en',
      theme: 'default',  // 主题固定为default
      themes: ['default'],  // 只保留default主题
      viewMode: 'source',  // 视图模式：source源码视图, design设计视图
      treeVisible: true, attrVisible: false,  // 属性面板默认隐藏，浏览模式下保持隐藏
      autoSaveTimer: null,
      editorcursorFlag: false,   // 防三区联动循环（§7.0）
      cursorLine: 1,
      hasNotice: false,
      moveRowVisible: false, moveRowFrom: 1, moveRowTo: 1,
      symbolDialogVisible:   false,
      interrefVisible:       false,
      icnlist: [],  // ICN后缀映射数组（§16.4.3 四时机维护）
      showWorkflowPanel: false,  // 流程信息面板显示控制
      // 南区流程信息：默认折叠（对齐旧系统 region:'south',collapsed:true）+ 点标题栏展开/可拖高
      workflowCollapsed: true,
      workflowHeight: 350,
      workflowResizing: false
    }
  },
  computed: {
    readonly()      { return this.mode !== 'edit' },
    isGjb()         { return this.ietmStandard === 'GJB6600' },
    hintSchema()    { return this.locale === 'cn' ? this.cnSchema : this.schema },
    displayNodeList(){ return this.locale === 'cn' ? this.cnNodeList : this.nodeList }
  },
  // ✅ 修复：监听路由变化，重新加载不同历史版本的XML内容
  watch: {
    '$route': {
      handler(to, from) {
        // 检查路由参数是否变化
        if (!to || !from) return

        const idChanged = to.params.id !== from.params.id
        const historyIdChanged = to.query.historyId !== from.query.historyId

        if (idChanged || historyIdChanged) {
          // 更新组件数据
          this.id = to.params.id
          this.historyId = to.query.historyId || null
          this.dmc = to.query.dmc || ''
          this.mode = to.query.mode || 'browse'

          // 重新加载数据
          this.loadData()
        }
      },
      immediate: false  // 首次加载时不触发（created已经调用了loadData）
    }
  },
  created()       { this.loadData() },
  mounted()       { window.addEventListener('beforeunload', this._beforeUnload) },
  beforeDestroy() {
    this.isClosing = true  // 标记页面正在关闭
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer)
    window.removeEventListener('beforeunload', this._beforeUnload)
    // 清理南区拖拽监听
    document.removeEventListener('mousemove', this.handleWorkflowResize)
    document.removeEventListener('mouseup', this.stopWorkflowResize)
  },
  // 路由离开守卫：内容已改未保存 → 弹确认（验收§15）
  beforeRouteLeave(to, from, next) {
    if (!this.dirty) { next(); return }
    this.$confirm({
      title: '确认离开', content: '内容已修改但未保存，确定离开？',
      okText: '离开', cancelText: '取消',
      onOk: () => next(), onCancel: () => next(false)
    })
  },
  methods: {
    // ── 加载 ──────────────────────────────────────────────────────────────────
    loadData() {
      // 防御性检查：页面正在关闭或ID无效时，不发起请求
      if (this.isClosing) {
        return
      }
      if (!this.id || this.id === 'undefined') {
        return
      }

      this.loading = true
      // 构建API URL，如果有historyId则添加为查询参数
      const url = `/ietm/dm-content/load/${this.id}` + (this.historyId ? `?historyId=${this.historyId}` : '')
      getAction(url).then(res => {
        if (!res.success) { this.$message.error(res.message || '加载失败'); return }
        const r = res.result
        this.content         = r.xml || ''
        this.originalContent = this.content
        this.xsdSchema       = r.xsdSchema
        this.ietmStandard    = r.ietmStandard || 'S1000D4.0'
        this.schema          = r.schema    || {}
        this.cnSchema        = r.cnSchema  || {}
        this.en2cnElem       = r.en2cnElem || {}
        this.cn2enElem       = r.cn2enElem || {}
        this.designerSett    = r.designerSett || {}
        if (this.isGjb) this.locale = 'cn'
        // 🆕 解析 icnlist（离线模式，§16.4.3 机制2）
        this._parseIcnlistFromXml()

        // 🆕 根据模式设置属性面板初始显示状态
        this.attrVisible = !this.readonly  // 编辑模式显示，浏览模式隐藏

        // ==============================
        // ==============================
        this.$nextTick(() => {
          // 关键时序：必须"先格式化，再基于格式化后的内容解析nodeList"
          // 否则 nodeList 的 lineno 基于原始XML，与格式化后的编辑器行号对不上 → 高亮/定位全错
          this.$refs.editor.setValue(this.content)
          this.$refs.editor.formateDM()                    // 1. 先格式化
          this.$refs.editor.setHintSchema(this.hintSchema)
          if (this.readonly) this.$refs.editor.setReadOnly(true)

          // 2. 用格式化后的内容重新解析 nodeList（lineno 与编辑器行号一致）
          const formatted = this.$refs.editor.getValue()
          this.content    = formatted
          this.nodeList   = getTreeNodesfromXml(formatted, this.isGjb ? '数据模块' : 'dmodule')
          this.cnNodeList = buildCnNodeList(this.nodeList, this.en2cnElem)
          // 3. 把与编辑器一致的 nodeList 交给编辑器（供 cursorActivity 反查）
          this.$refs.editor.setNodeList(this.nodeList)

          // 格式化会 emit content-change 误置 dirty，加载时应保持"已保存"
          this.originalContent = this.content
          this.dirty = false
          // 清空撤销栈：否则 setValue('')+加载+formateDM 都在 undo 历史里，
          // 连续撤销会退回初始空文档、导航树随之清空（Bug5）
          this.$refs.editor.clearHistory()
        })
        // 乐观锁版本随加载返回，避免二次查询与保存竞态（version 未就绪时保存会传 null 绕过乐观锁）
        this.dbVersion = r.version != null ? r.version : null
        this.setupAutoSave()
      }).catch(err => {
        this.$message.error('加载失败：' + (err.message || '网络错误'))
        console.error('[DM加载] 网络异常:', err)
      }).finally(() => {
        this.loading = false
        // 加载完成后检查是否有流程实例
        this.checkWorkflowExists()
      })
    },
    setupAutoSave() {
      if (this.autoSaveTimer) clearInterval(this.autoSaveTimer)
      const t = ((this.designerSett.common || {}).autosavetime) || '10'
      if (this.readonly || !t || t === '0') return
      this.autoSaveTimer = setInterval(() => { if (this.dirty) this.doSave(true) }, Number(t) * 60 * 1000)
    },

    // ── 三区联动（§7） ────────────────────────────────────────────────────────
    onCursorNode(node) {
      if (!node) return
      this.editorcursorFlag = true
      this.currentNode = node
      this.$refs.tree && this.$refs.tree.selectNode(node)
      this.$nextTick(() => { this.editorcursorFlag = false })
    },
    onTreeSelect(node) {
      this.currentNode = node
      if (this.editorcursorFlag) return
      this.$refs.editor.locateNode(node)
    },
    onTreeDblClick() { this.$message.info('设计视图为二期功能') },
    onContentChange(val) {
      this.content = val
      this.dirty = (val !== this.originalContent)
    },
    // 回车补全插入元素后：刷新树，使新元素出现在导航树中（§14.1）
    onElementInserted() {
      this.dirty = true
      this.refreshTree()
    },
    onSetProperty({ lineno, attrName, attrVal }) {
      this.$refs.editor.setProperty(lineno, attrName, attrVal)
      this.dirty = true
      // 同步更新当前节点的 attrval，避免切走再切回同节点时属性面板显示旧值
      this._patchNodeAttr(this.currentNode, attrName, attrVal)
    },
    /** 把属性变更写回 nodeList 中该节点的 attrval（JSON 字符串），保持面板与源码一致 */
    _patchNodeAttr(node, attrName, attrVal) {
      if (!node || !node.attributes) return
      let obj = {}
      try { obj = JSON.parse(node.attributes.attrval || '{}') } catch (e) { obj = {} }
      if (attrVal === '' || attrVal == null) delete obj[attrName]
      else obj[attrName] = attrVal
      node.attributes.attrval = JSON.stringify(obj)
    },
    onAddElement({ elemName, appendType }) {
      if (this.readonly) { this.$message.warning('浏览模式下无法插入元素'); return }
      if (!this.currentNode) { this.$message.warning('请先选择一个节点'); return }
      this._insertElement(elemName, appendType, this.currentNode)
    },
    onDeleteElement(node) {
      if (this.readonly) { this.$message.warning('浏览模式下无法删除元素'); return }
      const targetNode = node || this.currentNode
      if (!targetNode) { this.$message.warning('请先选择要删除的元素'); return }
      this._deleteElement(targetNode)
    },

    // ── 保存（§15） ───────────────────────────────────────────────────────────
    doSave(isAuto = false) {
      if (this.readonly) return
      if (!this.content || !this.content.trim()) { if (!isAuto) this.$message.warning('内容为空，无法保存'); return }
      const proceed = () => {
        const body = this.locale === 'cn' ? toEnXml(this.content, this.cn2enElem) : this.content
        this.saving = true
        postAction(`/ietm/dm-content/save/${this.id}`, { content: body, version: this.dbVersion })
          .then(res => {
            if (res.success) {
              if (!isAuto) this.$message.success('保存成功')
              this.originalContent = this.content
              this.dirty = false
              if (this.dbVersion != null) this.dbVersion++
            } else { this._onSaveFail(res) }
          }).finally(() => { this.saving = false })
      }
      const common = this.designerSett.common || {}
      if (common.validdmBeforesave === 'true') {
        this.doValidate(true).then(ok => { if (ok) proceed(); else this.$message.error('验证未通过，不能保存。') })
      } else { proceed() }
    },

    // ── 校验（§17） ───────────────────────────────────────────────────────────
    doValidate(silent = false) {
      const raw  = this.locale === 'cn' ? toEnXml(this.content, this.cn2enElem) : this.content
      const body = extractRootContent(raw, 'dmodule')
      // §17.2 空文档前置拦截：不发请求。手动校验时提示"内容为空。"，保存前(silent)静默通过
      // （空内容另由 doSave 的空守卫拦截）。对齐旧系统 validThis 的 S(editorValue).isEmpty() 短路。
      if (!body || !body.trim()) {
        if (!silent) this.$message.info('内容为空。')
        return Promise.resolve(true)
      }
      this.validating = true
      return postAction('/ietm/dm-content/validate', {
        content: body, standard: this.ietmStandard, schema: this.xsdSchema
      }).then(res => {
        this.validating = false
        if (!res.success) { this.$message.error(res.message || '校验失败'); return false }
        const r = res.result
        if (r.flag === '1') { if (!silent) this.$message.success('经校验无问题。'); return true }
        if (r.flag === '0') { if (!silent) this.$message.info('内容为空。'); return true }
        if (!silent) {
          // 行号换算（§17.2）：后端行号（纯 XML 内 1-based）→ 编辑器行号 = lineno - 1 + linenoOffset
          const offset = this.$refs.editor.getLinenoOffset()
          const rows = (r.errors || []).map(e => ({
            // 后端 lineno<=0 为哨兵（配置/异常类错误，无真实行号）：原样保留 0，前端显示"-"且不参与定位；
            // 真实行号(>0)按 §17.2 换算为编辑器 gutter 行号（1-based）
            lineno: e.lineno > 0 ? e.lineno - 1 + offset : 0,
            info: e.info
          }))
          this.$refs.validatePanel.show(rows)
        }
        return false
      }).catch(() => { this.validating = false; return false })
    },
    onLocateValid(record) {
      // 哨兵行(lineno<=0，无真实行号的配置/异常类错误)不参与定位
      if (!record || record.lineno <= 0) { this.$message.info('该错误无对应行号，无法定位。'); return }
      this.$refs.editor.locateByLineno(record.lineno)
    },

    // ── 预览（§18） ───────────────────────────────────────────────────────────
    doPreview() {
      // E-PRE-10：防止快速连续点击，预览期间禁用按钮
      if (this.previewing) return

      const body = this.locale === 'cn' ? toEnXml(this.content, this.cn2enElem) : this.content
      if (!body || !body.trim()) { this.$message.info('DM内容为空,无法预览。'); return }

      // E-PRE-12：大文档预警（超过 500KB）
      const sizeKB = new Blob([body]).size / 1024
      if (sizeKB > 500) {
        this.$message.warning(`文档较大（${Math.round(sizeKB)} KB），预览可能较慢，请稍候...`)
      }

      this.previewing = true

      postAction('/ietm/dm-content/preview', { content: body }).then(res => {
        // § 18.11 E-PRE-02：详细判断后端返回的 flag，提供明确错误提示
        if (!res.success) {
          this.$message.error('预览请求失败')
          return
        }

        const result = res.result
        if (!result) {
          this.$message.error('预览返回数据为空')
          return
        }

        // XSL 文件缺失
        if (result.flag === 'noxsl') {
          this.$message.warning('无解析引擎，无法预览')
          return
        }

        // 内容为空（后端判断）
        if (result.flag === 'null' || !result.html) {
          this.$message.info('DM内容为空，无法预览')
          return
        }

        // 其他失败情况
        if (result.flag !== 'success') {
          this.$message.warning('预览生成失败：' + (result.message || '未知错误'))
          return
        }

        // 成功：显示预览（HTML 内容已由 sandbox iframe 隔离，无需字符串过滤）
        this.$refs.previewModal.show(result.html)
      }).catch(err => {
        this.$message.error('预览失败：' + (err.message || '网络错误'))
      }).finally(() => {
        // E-PRE-10/E-PRE-12：无论成功失败，都恢复按钮状态
        this.previewing = false
      })
    },

    // ── 签入（§20：先 save 后 checkin） ──────────────────────────────────────
    doCheckin() {
      // ID有效性检查
      if (!this.id || this.id === 'undefined') {
        this.$message.error('DM ID无效，无法签入')
        return
      }

      this.$confirm({
        title: '签入', content: '确定该DM要签入？',
        onOk: () => {
          // 返回 Promise 让确认框等待异步操作完成后再关闭
          return new Promise((resolve, reject) => {
            // 先保存，保存失败（乐观锁冲突/未签出）则中止签入，避免签入未落库内容
            this._doSaveSync().then(ok => {
              if (!ok) {
                resolve() // 保存失败也要resolve让确认框关闭
                return
              }
              // 后端 checkIn 用 @RequestParam String id（query 参数），须拼到 URL；
              // postAction 第二参会进 body，导致 id 收不到（Bug4，与列表页 checkOut?id= 写法对齐）
              postAction(`/ietm/datamodule/checkIn?id=${encodeURIComponent(this.id)}`).then(res => {
                if (res.success) {
                  this.$message.success('签入成功')
                  this.mode = 'browse'
                  this.$refs.editor.setReadOnly(true)
                  resolve()
                } else {
                  this.$message.error(res.message || '签入失败')
                  reject(new Error(res.message || '签入失败'))
                }
              }).catch(err => {
                this.$message.error('签入失败：' + (err.message || '网络错误'))
                reject(err)
              })
            }).catch(err => {
              reject(err)
            })
          })
        }
      })
    },
    // 保存并返回成功与否；成功时同步 dirty/originalContent/dbVersion，与 doSave 保持一致
    _doSaveSync() {
      return new Promise(resolve => {
        const body = this.locale === 'cn' ? toEnXml(this.content, this.cn2enElem) : this.content
        postAction(`/ietm/dm-content/save/${this.id}`, { content: body, version: this.dbVersion })
          .then(res => {
            if (res && res.success) {
              this.originalContent = this.content
              this.dirty = false
              if (this.dbVersion != null) this.dbVersion++
              resolve(true)
            } else {
              this._onSaveFail(res, '，已取消签入')
              resolve(false)
            }
          }).catch(() => { this.$message.error('保存失败，已取消签入'); resolve(false) })
      })
    },
    // 保存失败统一处置：乐观锁版本冲突时弹确认框引导重新加载（本地 dbVersion 已失效，
    // 不重载则后续保存会一直冲突）；其余失败仅提示。后端冲突消息含"版本冲突"字样。
    _onSaveFail(res, suffix = '') {
      const msg = (res && res.message) || ('保存失败' + suffix)
      if (res && res.message && res.message.indexOf('版本冲突') >= 0) {
        this.$confirm({
          title: '版本冲突',
          content: '该DM已被他人修改，本地版本已失效。是否重新加载最新内容？（本地未保存的修改将丢失）',
          okText: '重新加载', cancelText: '暂不',
          onOk: () => this.loadData()
        })
      } else {
        this.$message.error(msg)
      }
    },

    // ── 编辑器辅助 ────────────────────────────────────────────────────────────
    toggleTree()  { this.treeVisible = !this.treeVisible },
    toggleAttr()  { this.attrVisible = !this.attrVisible },
    onViewTabChange(key) {
      // 设计视图（design）为二期功能：页签已 disabled，正常不会触发；此处兜底防止编程式切换
      if (key === 'design') {
        this.$message.info('设计视图为二期功能，暂不支持')
        return
      }
      this.viewMode = key
    },
    refreshTree() {
      try {
        const content = this.$refs.editor.getValue()
        if (!content || !content.trim()) {
          this.nodeList = []
          this.cnNodeList = []
          this.$refs.editor.setNodeList([])
          return
        }

        this.nodeList   = getTreeNodesfromXml(content, this.isGjb ? '数据模块' : 'dmodule')
        this.cnNodeList = buildCnNodeList(this.nodeList, this.en2cnElem)
        this.$refs.editor.setNodeList(this.nodeList)
      } catch (error) {
        console.error('[refreshTree] XML解析失败:', error)
        // 🔧 修复：畸形XML显示错误提示（P2缺陷#2）
        this.$message.error('XML格式错误，无法解析文档结构：' + (error.message || '请检查标签是否完整闭合'))
        this.nodeList = []
        this.cnNodeList = []
        this.$refs.editor.setNodeList([])
      }
    },
    onThemeChange(t)  { this.$refs.editor.setTheme(t) },
    onLocaleChange(loc) {
      // 纯切换语言不应改变"未保存"状态：切换前记录 dirty，切换后还原
      const wasDirty = this.dirty
      const cur  = this.$refs.editor.getValue()
      const next = loc === 'cn' ? toCnXml(cur, this.en2cnElem) : toEnXml(cur, this.cn2enElem)
      this.locale = loc
      this.$refs.editor.setValue(next)
      this.content = next
      this.$refs.editor.setHintSchema(this.hintSchema)
      this.$refs.editor.formateDM()   // 会 emit content-change 触发 onContentChange 误置 dirty
      // 未修改状态下把比较基准同步为当前语言的内容，避免后续误判
      if (!wasDirty) this.originalContent = this.content
      this.dirty = wasDirty
      // 语言切换整篇 setValue，同样清空撤销栈，避免撤销跨语言/退回空文档（Bug5）
      this.$refs.editor.clearHistory()
    },
    // 格式化会改变行号/linenoOffset，必须刷新树使节点lineno同步（否则高亮定位错乱）
    doFormat()    { this.$refs.editor.formateDM(); this.refreshTree() },
    doFold()      { this.$refs.editor.foldCurrent() },
    doFind()      { this.$refs.editor.find() },
    fontLarger()  { this.$refs.editor.fontDelta(2) },
    fontSmaller() { this.$refs.editor.fontDelta(-2) },
    // 对象列表（§14.8）：基于编辑器当前内容重新解析 nodeList（手动输入不会刷新 this.nodeList），
    // 连同 linenoOffset 交给弹窗收集 id/dmRef/graphic 三类对象
    showIdList()  {
      const cur = this.$refs.editor.getValue()
      if (!cur || !cur.trim()) { this.$message.info('DM内容为空，无对象可列出'); return }
      const nodeList = getTreeNodesfromXml(cur, this.isGjb ? '数据模块' : 'dmodule')
      const offset   = this.$refs.editor.getLinenoOffset()
      this.$refs.idListModal.show(nodeList, offset)
    },
    // 双击对象列表某行：定位到编辑器对应行（弹窗保持打开，可连续定位）
    onIdListLocate(editorLine) { this.$refs.editor.locateByLineno(editorLine) },
    doDeleteElement() { this.currentNode && this.onDeleteElement(this.currentNode) },
    // 撤销/重做会增删元素或改变行号，必须刷新树保持一致
    doUndo()      { this.$refs.editor.undo(); this.$nextTick(() => this.refreshTree()) },
    doRedo()      { this.$refs.editor.redo(); this.$nextTick(() => this.refreshTree()) },
    // 引用DM（§14.5）：三道前置校验通过后打开弹窗
    openDmRef() {
      if (this.readonly) { this.$message.warning('浏览模式下无法插入引用'); return }
      // ① 编辑器内容非空
      if (!this.content || !this.content.trim()) return
      const editor = this.$refs.editor.getEditor()
      const linenoOffset = this.$refs.editor.getLinenoOffset()
      if (!editor) return
      // ② 光标须落在某元素上下文内
      const cursor = editor.getCursor()
      const parent = getnodeBylineno(this.nodeList, cursor.line + 1, linenoOffset, editor)
      if (!parent) return
      // ③ 父元素 schema 允许 dmRef 子元素（nodeList 恒为英文名，无需中英转换）
      const def = this.schema[parent.text]
      if (!def || !def.children || def.children.indexOf('dmRef') === -1) {
        this.$message.info('此处不能插入DM。')
        return
      }
      this.$refs.dmRefDialog.show()
    },
    // 三个插入功能（引用DM/图符/内部引用）统一的插入原语：在光标处插入 XML 片段。
    // 若用户存在选区，折叠到选区起点插入而非替换选区——避免删除跨标签边界的选中文本
    // 导致 XML 结构破损。无选区时 getCursor('from')==光标，行为与原 replaceSelection 一致。
    insertXmlAtCursor(xml) {
      const cm = this.$refs.editor && this.$refs.editor.getEditor()
      if (!cm) return false
      cm.replaceRange(xml, cm.getCursor('from'))
      return true
    },
    // 弹窗确定回调：插入 dmRef → 中文视图转换 → 刷新树 → 格式化 → 标记未保存
    onDmRefInsert(xml) {
      if (!xml) return
      const out = this.locale === 'cn' ? toCnXml(xml, this.en2cnElem) : xml
      if (!this.insertXmlAtCursor(out)) return
      this.dirty = true
      this.$nextTick(() => {
        this.$refs.editor.formateDM()
        this.refreshTree()
      })
    },
    openSymbol() {
      // ① 编辑器内容非空
      if (!this.content || !this.content.trim()) return
      const editor = this.$refs.editor.getEditor()
      const linenoOffset = this.$refs.editor.getLinenoOffset()
      if (!editor) return
      // ② 光标须落在某元素上下文内
      const cursor = editor.getCursor()
      const parent = getnodeBylineno(this.nodeList, cursor.line + 1, linenoOffset, editor)
      if (!parent) return
      // ③ 父元素 schema 允许 symbol 子元素（nodeList 恒为英文名，无需中英转换）
      const def = this.schema[parent.text]
      if (!def || !def.children || def.children.indexOf('symbol') === -1) {
        this.$message.warning('此处不能插入图符。')
        return
      }

      this.symbolDialogVisible = true
    },

    onSymbolInsert(xml) {
      if (!this.insertXmlAtCursor(xml)) return

      // 🆕 维护 icnlist（§16.4.3 机制3）
      const match = xml.match(/infoEntityIdent="([^"]+)"/)
      if (match && match[1]) {
        const icn = match[1]
        // 默认 CGM 后缀（如果 icnlist 中不存在该 ICN）
        if (!this.icnlist.find(item => item.startsWith(icn))) {
          this.icnlist.push(icn + '.cgm')
        }
      }

      this.$refs.editor.formateDM()
      this.refreshTree()
      this.dirty = true
    },

    openInterref() {
      // ① 内容非空
      if (!this.content || !this.content.trim()) return
      const editor = this.$refs.editor.getEditor()
      if (!editor) return
      // ② 打开弹窗前刷新树（§14.7.3①）：用户可能已新增带 id 的元素，
      //    刷新确保父节点定位与 refidCombo 列出的 id 都是最新的
      this.refreshTree()
      const linenoOffset = this.$refs.editor.getLinenoOffset()
      // ③ 光标须落在某元素上下文内
      const cursor = editor.getCursor()
      const parent = getnodeBylineno(this.nodeList, cursor.line + 1, linenoOffset, editor)
      if (!parent) return
      // ④ 父元素 schema 允许 internalRef 子元素（nodeList 恒为英文名）
      const def = this.schema[parent.text]
      if (!def || !def.children || def.children.indexOf('internalRef') === -1) {
        this.$message.warning('此处不能插入内部引用。')
        return
      }
      this.interrefVisible = true
    },

    onInterrefInsert(xml) {
      if (!this.insertXmlAtCursor(xml)) return
      this.$refs.editor.formateDM()
      this.refreshTree()
      this.dirty = true
    },
    openCustom()  { this.$message.info('自定义生成为三期功能') },
    openWordGen() { this.$message.info('由Word生成为三期功能') },

    // ── 重建 refs 与 DOCTYPE（§16.4）─────────────────────────────────────────
    /**
     * 重建 refs 与 DOCTYPE（三段式：torefs → correctIcn → updateDoctype）
     * 入口：工具栏"重建Refs"按钮
     */
    doRegenRefs() {
      // 重入保护：防止重复点击
      if (this._regenRefsRunning) {
        this.$message.warning('重建操作正在进行中，请稍候...')
        return
      }

      this.$confirm({
        title: '重建 refs 与 DOCTYPE',
        content: '此操作将删除原 content/refs 元素以及 <!DOCTYPE> 并重新生成，是否确认？',
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          // 返回 Promise 让确认框等待异步操作完成后再关闭
          return new Promise(async (resolve, reject) => {
            this._regenRefsRunning = true
            try {
              await this._torefs()
              await this._correctIcn()
              resolve()
            } catch (err) {
              console.error('[doRegenRefs] 执行失败:', err)
              this.$message.error('重建失败：' + (err.message || '未知错误'))
              reject(err)
            } finally {
              this._regenRefsRunning = false
            }
          })
        }
      })
    },

    /**
     * 【第一段】torefs：重建 content/refs 引用块
     * §16.4.4 完整实现
     */
    async _torefs() {
      this.refreshTree()

      // 防御性检查：如果 nodeList 为空，说明 XML 解析失败
      if (!this.nodeList || this.nodeList.length === 0) {
        const errorMsg = 'XML 解析失败，无法生成 refs 块。请检查 XML 结构是否符合 S1000D 标准（常见问题：标签未正确闭合、元素嵌套错误）'
        console.error('[_torefs] ' + errorMsg)
        throw new Error(errorMsg)
      }

      const refs = []
      const refDmcSet = new Set()
      let refsline1 = -1
      let mainelemname = ''

      // 遍历 nodeList 收集 dmRef
      for (const node of this.nodeList) {
        if (!node.attributes) continue

        // 获取 lineno（可能在 attributes.lineno）
        const lineno = node.attributes.lineno
        if (!lineno) continue

        // 获取节点名称和路径
        const nodeName = node.text || node.name
        const nodePath = node.attributes.path || node.path
        const parentPath = nodePath ? nodePath.substring(0, nodePath.lastIndexOf('/')) : ''

        // 记录 content 下非 refs 的直接子元素名
        if (parentPath === '/dmodule/content' && nodeName !== 'refs') {
          mainelemname = nodeName
        }

        // 记录 refs 起始行
        if (parentPath === '/dmodule/content' && nodeName === 'refs') {
          refsline1 = lineno
        }

        // 收集 dmRef（排除 brexDmRef 和 refs 内条目）
        if (nodeName === 'dmRef' &&
            nodePath !== '/dmodule/identAndStatusSection/dmStatus/brexDmRef' &&
            !nodePath.includes('/dmodule/content/refs')) {

          const editor = this.$refs.editor.getEditor()
          const linenoOffset = this.$refs.editor.getLinenoOffset()
          const dmjson = getDmcByLineno(editor, lineno + linenoOffset - 1, this.locale, this.cn2enElem)

          // 空 dmRef 守卫（修正旧系统 bug）
          if (!dmjson || !dmjson.dmc) continue

          const dmc = dmjson.dmc

          if (!refDmcSet.has(dmc)) {
            refDmcSet.add(dmc)
            refs.push(dmjson.xml.replace(/`/g, '"'))
          }
        }
      }

      // 重建 refs 块
      if (refs.length > 0) {
        let refsXml = '<refs xmlns:xlink="http://www.w3.org/1999/xlink">\n' + refs.join('\n') + '\n</refs>'

        // 中文视图转换
        if (this.locale === 'cn') {
          refsXml = toCnXml(refsXml, this.en2cnElem)
        }

        // 格式化（缩进4空格）并移除尾部空白
        refsXml = formatXml(refsXml, 4).trimEnd()

        // 验证生成的 refsXml 本身是否合法
        try {
          const parser = new DOMParser()
          const testDoc = parser.parseFromString(refsXml, 'text/xml')
          const parseError = testDoc.getElementsByTagName('parsererror')
          if (parseError.length > 0) {
            console.error('[_torefs] ❌ 生成的refsXml本身就不合法!')
            console.error(parseError[0].textContent)
            this.$message.error('生成的refs块格式错误，请检查')
            return
          }
        } catch (e) {
          console.error('[_torefs] ❌ refsXml解析异常:', e.message)
          return
        }

        const editor = this.$refs.editor.getEditor()
        const linenoOffset = this.$refs.editor.getLinenoOffset()

        if (refsline1 !== -1) {
          // 替换已有 refs - 通过搜索 <refs> 标签找到准确的起始行
          const refsOpenTag = '<' + this._getLocaleName('refs')
          let startLine = -1

          // 从 content 往下搜索 <refs> 的实际起始位置
          const searchStart = Math.max(0, linenoOffset)
          for (let i = searchStart; i < editor.lineCount(); i++) {
            const line = editor.getLine(i) || ''
            if (line.includes(refsOpenTag)) {
              startLine = i
              break
            }
          }

          if (startLine === -1) {
            return
          }

          const refsline2 = this._findRefsEndLine(mainelemname, refsline1)
          if (refsline2 !== -1) {
            const endLine = refsline2  // refsline2 是绝对行号

            // 删除从 <refs> 到 </refs> 包含换行符，避免留下空行或旧内容
            editor.replaceRange(refsXml + '\n',
              { line: startLine, ch: 0 },
              { line: endLine + 1, ch: 0 })

            const fullXml = editor.getValue()

            // 验证XML是否合法
            try {
              const parser = new DOMParser()
              const xmlDoc = parser.parseFromString(fullXml, 'text/xml')
              const parseError = xmlDoc.getElementsByTagName('parsererror')
              if (parseError.length > 0) {
                console.error('[_torefs] ❌ XML解析错误:', parseError[0].textContent)
              }
            } catch (e) {
              console.error('[_torefs] ❌ XML解析异常:', e.message)
            }
          }
        } else {
          // 插入新 refs（在 content 起始行下一行）
          const contentNode = this.nodeList.find(n => {
            const name = n.text || n.name
            const path = (n.attributes && n.attributes.path) || n.path
            return path === '/dmodule' && name === 'content'
          })
          if (contentNode) {
            const contentLineno = (contentNode.attributes && contentNode.attributes.lineno) || contentNode.lineno
            // contentLineno 是从1开始的相对行号,需转换为0-based绝对行号
            editor.setCursor({ line: contentLineno + linenoOffset - 1, ch: 0 })
            editor.replaceSelection(refsXml)
          }
        }
      } else if (refsline1 !== -1) {
        // refs块外无dmRef，但有旧refs块 → 删除旧refs块
        const editor = this.$refs.editor.getEditor()
        const linenoOffset = this.$refs.editor.getLinenoOffset()
        const refsline2 = this._findRefsEndLine(mainelemname, refsline1)
        if (refsline2 !== -1) {
          const startLine = refsline1 + linenoOffset - 1
          const endLine = refsline2
          editor.replaceRange('',
            { line: startLine, ch: 0 },
            { line: endLine + 1, ch: 0 })
        }
      }

      // 刷新 linenoOffset 和树（关键！下游方法依赖最新状态）
      this.$refs.editor.getLinenoOffset()
      this.refreshTree()
      this.dirty = true
    },

    /**
     * 【第二段】correctIcn：收集实体 + 判定无后缀 ICN
     * §16.4.4 完整实现
     */
    async _correctIcn() {
      this.refreshTree()

      // 防御性检查：如果 nodeList 为空，说明 XML 解析失败
      if (!this.nodeList || this.nodeList.length === 0) {
        const errorMsg = 'XML 解析失败，无法修正 ICN 后缀。请检查 XML 结构是否符合 S1000D 标准'
        console.error('[_correctIcn] ' + errorMsg)
        throw new Error(errorMsg)
      }

      const editor = this.$refs.editor.getEditor()
      const linenoOffset = this.$refs.editor.getLinenoOffset()

      // 取当前 XML（中文视图转英文）
      let xmlContent = editor.getValue()
      if (this.locale === 'cn') {
        xmlContent = toEnXml(xmlContent, this.cn2enElem)
      }

      // 🔧 修复：基于英文XML重新解析nodeList以确保标签名统一（GJB6600 i18n）
      // 原nodeList可能包含中文标签名，导致英文匹配失败
      let workingNodeList = this.nodeList
      if (this.locale === 'cn') {
        // 用英文XML重新解析，确保node.text是英文标签名
        workingNodeList = getTreeNodesfromXml(xmlContent, 'dmodule')
      }

      // 收集 graphic/multimediaObject 的 infoEntityIdent
      const g_m = []          // 带行号标注
      const g_m_withseq = []  // 纯 ident，保序

      for (const node of workingNodeList) {
        // 节点名称存储在 text 字段，现在统一为英文
        if (node.text === 'graphic' || node.text === 'multimediaObject') {
          // 属性存储在 attributes.attrval (JSON 字符串)
          let ident = null
          if (node.attributes && node.attributes.attrval) {
            try {
              const attrs = typeof node.attributes.attrval === 'string'
                ? JSON.parse(node.attributes.attrval)
                : node.attributes.attrval
              ident = attrs.infoEntityIdent
            } catch (e) {
              // 解析失败，跳过
            }
          }

          if (ident) {
            // lineno 字段存储行号
            const lineno = (node.attributes && node.attributes.lineno) || '?'
            g_m.push(`${ident}【${lineno}行】`)
            g_m_withseq.push(ident)
          }
        }
      }

      // 判定有无后缀
      const entities = []
      const noexts = []

      // 如果 icnlist 为空但存在图形元素，提示用户
      if (this.icnlist.length === 0 && g_m.length > 0) {
        this.$message.warning('检测到图形元素但无图符文件信息，请在弹窗中补全 ICN 后缀', 3)
      }

      // 如果没有图形元素，直接生成空 DOCTYPE（合法场景）
      if (g_m.length === 0) {
        await this._updateDoctype([], [])
        return
      }

      for (const identWithLine of g_m) {
        const ident = identWithLine.split('【')[0]
        // 大小写不敏感匹配：ICN-001 可以匹配 icn-001.cgm
        const found = this.icnlist.find(item =>
          item.toLowerCase().startsWith(ident.toLowerCase() + '.')
        )

        if (found) {
          entities.push(found)
        } else {
          noexts.push(identWithLine)
        }
      }

      // 分支处理
      if (noexts.length === 0) {
        // 全部有后缀，直接重建 DOCTYPE
        await this._updateDoctype(entities, g_m_withseq)
      } else {
        // 存在无后缀 ICN，去重后弹框
        const noextArr = this._deduplicatePreserveOrder(noexts)

        // 返回 Promise 等待用户操作
        return new Promise((resolve, reject) => {
          this._icnSuffixResolve = resolve
          this._icnSuffixReject = reject
          this._icnSuffixContext = { entities, g_m_withseq, noextArr }
          this.$refs.icnSuffixModal.show(noextArr)
        })
      }
    },

    /**
     * 补后缀弹框确定回调
     */
    async onIcnSuffixOk(suffixes) {
      const { entities, g_m_withseq, noextArr } = this._icnSuffixContext

      // 补入 entities 和 icnlist
      for (let i = 0; i < noextArr.length; i++) {
        const identWithLine = noextArr[i]
        const ident = identWithLine.split('【')[0]
        const suffix = suffixes[i]
        const fullIcn = ident + suffix

        entities.push(fullIcn)
        if (!this.icnlist.includes(fullIcn)) {
          this.icnlist.push(fullIcn)
        }
      }

      // 重建 DOCTYPE
      await this._updateDoctype(entities, g_m_withseq)

      // 清理 Promise 回调（防止内存泄漏）
      if (this._icnSuffixResolve) {
        this._icnSuffixResolve()
        this._icnSuffixResolve = null
        this._icnSuffixReject = null
        this._icnSuffixContext = null
      }
    },

    /**
     * 补后缀弹框取消回调
     */
    onIcnSuffixCancel() {
      this.$message.info('取消生成。')
      if (this._icnSuffixReject) {
        this._icnSuffixReject(new Error('用户取消'))
        // 清理 Promise 回调（防止内存泄漏）
        this._icnSuffixResolve = null
        this._icnSuffixReject = null
        this._icnSuffixContext = null
      }
    },

    /**
     * 【第三段】updateDoctype：重建 DOCTYPE 并写回
     * §16.4.4 完整实现
     */
    async _updateDoctype(entityArr, g_m_withseq) {
      const editor = this.$refs.editor.getEditor()

      // 🔧 修复：查找 <dmodule> 或 <数据模块> 标签的实际位置（GJB6600 i18n）
      // 🔧 增强：同时检测实际根元素名，支持混合标准（P2缺陷#3）
      let dmoduleLine = -1
      let actualRootElementName = 'dmodule' // 默认值

      for (let i = 0; i < editor.lineCount(); i++) {
        const line = editor.getLine(i) || ''
        if (line.includes('<dmodule')) {
          dmoduleLine = i
          actualRootElementName = 'dmodule'
          break
        } else if (line.includes('<数据模块')) {
          dmoduleLine = i
          actualRootElementName = '数据模块'
          break
        }
      }

      if (dmoduleLine === -1) {
        console.error('[_updateDoctype] 未找到 <dmodule> 或 <数据模块> 标签')
        return
      }

      // 1. 生成去重且有序的 entities
      let entities = []
      if (!g_m_withseq || g_m_withseq.length === 0) {
        // 无序列，按 entityArr 去重
        const seen = new Set()
        for (const item of entityArr) {
          if (!seen.has(item)) {
            seen.add(item)
            entities.push(item)
          }
        }
      } else {
        // 有序列，按正文出现顺序重排
        const seen = new Set()
        for (const ident of g_m_withseq) {
          const found = entityArr.find(item => item.startsWith(ident) && !seen.has(item))
          if (found) {
            seen.add(found)
            entities.push(found)
          }
        }
      }

      // 2. 汇总后缀（去重、小写）
      const exts = new Set()
      for (const entity of entities) {
        const dotIndex = entity.lastIndexOf('.')
        if (dotIndex !== -1) {
          const ext = entity.substring(dotIndex + 1).toLowerCase()
          exts.add(ext)
        }
      }

      // 🔧 修复：使用实际检测到的根元素名，而非根据isGjb标志（P2缺陷#3混合标准支持）
      const rootElementName = actualRootElementName

      // 3. 拼 DOCTYPE
      let newdoctype = `<!DOCTYPE ${rootElementName}[`

      // 生成 NOTATION 声明
      for (const ext of exts) {
        if (NOTATIONS[ext]) {
          newdoctype += '\n<!NOTATION ' + ext + ' PUBLIC "' + NOTATIONS[ext] + '">'
        }
      }

      // 生成 ENTITY 声明
      for (const entity of entities) {
        const dotIndex = entity.lastIndexOf('.')
        const filename = dotIndex !== -1 ? entity.substring(0, dotIndex) : entity
        const fileext = dotIndex !== -1 ? entity.substring(dotIndex + 1).toLowerCase() : ''
        newdoctype += '\n<!ENTITY ' + filename + ' SYSTEM "' + entity + '" NDATA ' + fileext + '>'
      }

      newdoctype += ']>'

      // 4. 定位并删除所有旧DOCTYPE
      // 🔧 修复：删除所有旧DOCTYPE声明，不只是第一个（P2缺陷#1多DOCTYPE问题）
      const doctypeLinesToDelete = []
      for (let i = 0; i < dmoduleLine; i++) {
        const line = editor.getLine(i) || ''
        const trimmed = line.trim()
        if (trimmed.startsWith('<!DOCTYPE dmodule') || trimmed.startsWith('<!DOCTYPE 数据模块')) {
          // 找到DOCTYPE起始行，查找其结束行
          let endLine = i
          for (let j = i; j < editor.lineCount(); j++) {
            const checkLine = editor.getLine(j) || ''
            if (checkLine.includes(']>')) {
              endLine = j
              break
            }
          }
          doctypeLinesToDelete.push({ start: i, end: endLine })
        }
      }

      // 从后往前删除，避免行号偏移
      for (let idx = doctypeLinesToDelete.length - 1; idx >= 0; idx--) {
        const { start, end } = doctypeLinesToDelete[idx]
        editor.replaceRange('', { line: start, ch: 0 }, { line: end + 1, ch: 0 })
      }

      // 重新获取dmoduleLine（删除DOCTYPE后行号会变化）
      dmoduleLine = -1
      for (let i = 0; i < editor.lineCount(); i++) {
        const line = editor.getLine(i) || ''
        if (line.includes('<dmodule') || line.includes('<数据模块')) {
          dmoduleLine = i
          break
        }
      }

      if (dmoduleLine === -1) {
        console.error('[_updateDoctype] 删除旧DOCTYPE后无法重新定位根元素')
        return
      }

      // 5. 插入新DOCTYPE（在根元素前）
      // 注意：newdoctype 末尾必须有换行符，否则会与 <dmodule> 粘在一起
      const doctypeWithNewline = newdoctype + '\n'
      editor.replaceRange(doctypeWithNewline, { line: dmoduleLine, ch: 0 })

      // 5. 重算 linenoOffset 并刷新
      const newLinenoOffset = this.$refs.editor.getLinenoOffset()

      this.$refs.editor.formateDM()

      const finalLinenoOffset = this.$refs.editor.getLinenoOffset()

      this.refreshTree()

      this.$message.success('生成成功。')
      this.dirty = true
    },

    /**
     * 辅助：查找 refs 结束行（两层 findLineno）
     * §16.4.4 refsline2 算法
     * @param {string} mainelemname - content 下非 refs 的子元素名
     * @param {number} refsline1Relative - refs 起始行（相对行号，从1开始）
     * @returns {number} refs 结束行的绝对行号（0-based），未找到返回 -1
     */
    _findRefsEndLine(mainelemname, refsline1Relative) {
      const editor = this.$refs.editor.getEditor()
      const linenoOffset = this.$refs.editor.getLinenoOffset()

      // 转换为绝对行号（0-based）
      const refsline1Abs = refsline1Relative + linenoOffset - 1

      // 直接从 <refs> 起始行向下搜索 </refs>
      const closeTag = '</' + this._getLocaleName('refs') + '>'
      for (let i = refsline1Abs + 1; i < editor.lineCount(); i++) {
        const line = editor.getLine(i) || ''
        if (line.includes(closeTag)) {
          return i  // 返回绝对行号
        }
      }

      return -1
    },

    /**
     * 辅助：根据 locale 返回本地化元素名
     */
    _getLocaleName(elemName) {
      return this.locale === 'cn' ? (this.en2cnElem[elemName] || elemName) : elemName
    },

    /**
     * 辅助：去重并保序（修正旧系统 bug）
     */
    _deduplicatePreserveOrder(arr) {
      const seen = new Set()
      const result = []
      for (const item of arr) {
        const ident = item.split('【')[0]
        if (!seen.has(ident)) {
          seen.add(ident)
          result.push(item)
        }
      }
      return result
    },

    /**
     * 辅助：从 XML 解析 icnlist（离线模式，§16.4.3 机制2）
     */
    _parseIcnlistFromXml() {
      this.icnlist = []
      const entityMatches = this.content.match(/<!ENTITY.*?>/g) || []

      for (const ent of entityMatches) {
        const arr = ent.split(/\s+/)
        // 严格匹配：<!ENTITY ICN SYSTEM "ICN.ext" NDATA ext>
        if (arr.length < 6) {
          continue
        }
        const ndata = arr[5].replace('>', '').toLowerCase()
        const systemFile = arr[3].replace(/"/g, '')
        // icnlist 存储格式：ICN-xxx.ext
        this.icnlist.push(systemFile)
      }
    },

    openSnippets(){ this.$message.info('可重用片段为三期功能') },
    showNotice()  { this.$message.info('暂无重要通知') },
    openWorkNote(){ this.$message.info('工作日志为二期功能') },

    // ── 光标位置（§7.1）──────────────────────────────────────────────────────
    onCursorChange({ line }) { this.cursorLine = line },

    // ── 导出XML（§5 exportxml）───────────────────────────────────────────────
    doExport() {
      const xml = this.locale === 'cn' ? toEnXml(this.content, this.cn2enElem) : this.content
      if (!xml || !xml.trim()) { this.$message.info('DM内容为空，无法导出'); return }
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = (this.dmc || 'dm') + '.xml'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },

    // ── 移动行弹框（§5 movethis）─────────────────────────────────────────────
    doMoveRow() {
      this.moveRowFrom = this.cursorLine
      this.moveRowTo   = Math.max(1, this.cursorLine - 1)
      this.moveRowVisible = true
    },
    confirmMoveRow() {
      if (this.readonly) { this.$message.warning('浏览模式下无法移动元素'); this.moveRowVisible = false; return }
      this._moveElement(this.moveRowFrom, this.moveRowTo)
      this.moveRowVisible = false
    },

    // ── 元素操作实现（§14.1-14.3）────────────────────────────────────────────
    _insertElement(elemName, appendType, parentNode) {
      // 错误边界检查
      if (!this.$refs.editor) {
        this.$message.error('编辑器未初始化，请稍后再试')
        return
      }

      const editor = this.$refs.editor.getEditor()
      const linenoOffset = this.$refs.editor.getLinenoOffset()

      if (!editor) {
        this.$message.error('编辑器实例获取失败')
        return
      }

      const { calculateIndent, generateXmlSnippet, calculateInsertLine } = require('./utils/elementOps')

      try {
        // 计算缩进和XML片段
        const indent = calculateIndent(appendType === 'child' ? parentNode : this.nodeList.find(n => n.id === parentNode.pid), this.nodeList)
        const snippet = generateXmlSnippet(elemName, this.schema, indent)

        // 用 editor.operation 包裹「(自闭合展开)+插入snippet+formateDM」三处内容变更，
        // 使其共享同一 CodeMirror opId 合并为【一个撤销单元】——一次插入=一次 Ctrl+Z 即可完全回退，
        // 避免停在"仅撤销了格式化、元素仍在"的缩进畸形中间态。（CM5 runInOp 重入性保证 setValue 复用外层 op）
        editor.operation(() => {
          // 计算插入位置（传入editor以支持自闭合标签展开）
          const insertLine = calculateInsertLine(parentNode, appendType, this.nodeList, linenoOffset, 0, editor)
          // 插入XML
          editor.replaceRange(snippet + '\n', { line: insertLine, ch: 0 })
          // 标记未保存
          this.dirty = true
          // 先格式化（统一缩进，规范XML）
          this.$refs.editor.formateDM()
        })
        // 刷新树前 XML 已格式化，能正确解析出完整nodeList

        // 刷新树（此时XML已格式化，能正确解析出完整nodeList）
        this.refreshTree()

        // 定位到新元素（格式化后重新查找该元素的行；不入撤销单元）
        this.$nextTick(() => {
          const newNode = this.nodeList.find(n =>
            n.text === elemName && n.pid === parentNode.id
          )
          if (newNode) {
            this.$refs.editor.locateNode(newNode)
            this.currentNode = newNode
          }
        })

        this.$message.success(`已插入 ${elemName}`)
      } catch (err) {
        console.error('[元素插入错误]', err)
        this.$message.error('插入失败：' + err.message)
      }
    },

    _deleteElement(node) {
      // 错误边界检查
      if (!this.$refs.editor) {
        this.$message.error('编辑器未初始化，请稍后再试')
        return
      }

      const editor = this.$refs.editor.getEditor()
      const linenoOffset = this.$refs.editor.getLinenoOffset()

      if (!editor) {
        this.$message.error('编辑器实例获取失败')
        return
      }

      const { isMultiLineElement, deleteLine, deleteThisAndChildren, canDeleteElement } = require('./utils/elementOps')

      try {
        // 检查是否可以删除
        const validation = canDeleteElement(node, this.nodeList, editor, linenoOffset, this.schema)
        if (!validation.canDelete) {
          this.$message.error(validation.message)
          return
        }

        // 检查是否为多行元素
        const isMultiLine = isMultiLineElement(node, this.nodeList, editor, linenoOffset)

        // 确认删除
        this.$confirm({
          title: '确认删除',
          content: `确定要删除元素 ${node.text} 吗？${isMultiLine ? '（包含所有子元素）' : ''}`,
          onOk: () => {
            try {
              // 包 operation：删除+formateDM 合并为一个撤销单元（一次 Ctrl+Z 完全恢复被删元素）
              editor.operation(() => {
                if (isMultiLine) {
                  deleteThisAndChildren(node, this.nodeList, editor, linenoOffset)
                } else {
                  const line = node.attributes.lineno + linenoOffset - 2  // 转为0-based
                  deleteLine(editor, line)
                }
                // 标记未保存
                this.dirty = true
                // 先格式化（消除删除后可能的空行/缩进错乱）
                this.$refs.editor.formateDM()
              })

              // 刷新树
              this.refreshTree()

              // 删除后清空当前选中节点（因为节点已删除）
              this.currentNode = null

              this.$message.success('删除成功')
            } catch (err) {
              console.error('[元素删除错误]', err)
              this.$message.error('删除失败：' + err.message)
            }
          }
        })
      } catch (err) {
        console.error('[删除检查错误]', err)
        this.$message.error('删除检查失败：' + err.message)
      }
    },

    _moveElement(fromLine, toLine) {
      // 错误边界检查
      if (!this.$refs.editor) {
        this.$message.error('编辑器未初始化，请稍后再试')
        return
      }

      const editor = this.$refs.editor.getEditor()
      const linenoOffset = this.$refs.editor.getLinenoOffset()

      if (!editor) {
        this.$message.error('编辑器实例获取失败')
        return
      }

      const { validateMove, moveElementBlock } = require('./utils/elementOps')

      try {
        // 查找content区域范围
        const contentStartLine = this._findContentStartLine(editor)
        const contentEndLine = editor.lineCount() - 1

        // 校验移动操作
        const validation = validateMove(fromLine, toLine, contentStartLine, contentEndLine)
        if (!validation.valid) {
          this.$message.error(validation.message)
          return
        }

        // 查找fromLine对应的节点。旧写法用 lineno+offset-1===fromLine 精确匹配开始标签行，
        // 当起始行落在闭合标签行/空行/文本行时找不到 → "未找到起始行对应的元素"（Bug8）。
        // 改用 getnodeBylineno（支持闭合标签行向上反查开始标签），并对 pid=-1 根/注释兜底提示。
        const fromNode = getnodeBylineno(this.nodeList, fromLine, linenoOffset, editor)
        if (!fromNode) {
          this.$message.error('起始行未对应到元素，请把行号定位到某个元素的开始或结束标签行')
          return
        }
        if (fromNode.pid === -1 || fromNode.pid == null) {
          this.$message.error('不能移动根元素')
          return
        }

        // 包 operation：移动(删原块+插新位)+formateDM 合并为一个撤销单元
        let insertLine = 0
        editor.operation(() => {
          // 执行移动（返回移动后元素的 0-based 真实首行；向下移动时 != toLine-1）
          insertLine = moveElementBlock(fromNode, fromLine, toLine, this.nodeList, editor, linenoOffset)
          // 标记未保存
          this.dirty = true
          // 先格式化（消除移动后的缩进错乱）
          this.$refs.editor.formateDM()
        })

        // 刷新树
        this.refreshTree()

        // 定位到新位置：用移动实际落点 insertLine，而非 toLine-1
        // （向下移动删除原块后目标行上移 blockSize，toLine-1 会多下移 blockSize 行）
        editor.setCursor({ line: Math.max(0, insertLine), ch: 0 })

        this.$message.success(`已将元素从第 ${fromLine} 行移至第 ${toLine} 行`)
      } catch (err) {
        console.error('[元素移动错误]', err)
        this.$message.error('移动失败：' + err.message)
      }
    },

    _findContentStartLine(editor) {
      // 查找<content>标签所在行
      for (let i = 0; i < editor.lineCount(); i++) {
        const line = editor.getLine(i)
        if (line && line.trim().startsWith('<content')) {
          return i + 1 // content区域从下一行开始
        }
      }
      return 0
    },

    // 关闭/刷新标签页时的原生未保存提示（验收§15）
    _beforeUnload(e) {
      if (!this.dirty) return
      e.preventDefault()
      e.returnValue = ''
      return ''
    },

    // ── 流程信息面板 ──────────────────────────────────────────────────────────
    /**
     * 检查是否存在流程实例
     */
    async checkWorkflowExists() {
      if (!this.id) return

      try {
        const res = await getAction('/ietm/workflow/instance/getByFormid', { formid: this.id })
        // 如果有流程实例，显示流程信息面板
        this.showWorkflowPanel = res.success && res.result != null
      } catch (err) {
        console.warn('[流程信息] 查询流程实例失败:', err)
        this.showWorkflowPanel = false
      }
    },

    /**
     * 流程状态变化回调
     * @param {Object} data - 流程变化数据
     */
    onWorkflowChange(data) {
      console.log('[流程信息] 流程状态变化:', data)

      // 如果流程提交处理完成，可能需要重新检查编辑权限
      if (data && data.submitted) {
        // TODO: 根据业务需求，判断是否需要切换为只读模式
        // 例如：当"DM编写"节点处理完成后，切换为浏览模式
        // this.mode = 'browse'
        // this.$router.replace({ query: { ...this.$route.query, mode: 'browse' } })
      }
    },

    /**
     * P1-SYNC-01修复：流程完成回调
     * 当流程审核通过或终止时，通知父组件刷新DM列表状态
     * @param {Object} payload - {instid, formid, status: 'approved'/'terminated'}
     */
    onWorkflowComplete(payload) {
      console.log('[流程信息] 流程已完成:', payload)

      // 发射事件到父组件（DM列表页）
      this.$emit('workflow-complete', payload)

      // 根据流程结果状态提示用户
      if (payload.status === 'approved') {
        this.$message.success('流程审核通过！')
      } else if (payload.status === 'terminated') {
        this.$message.warning('流程已终止')
      }

      // 流程完成后可能需要切换为只读模式（根据业务需求）
      // 例如：最后节点通过后，自动切换为浏览模式
      // if (payload.status === 'approved') {
      //   this.mode = 'browse'
      //   this.$router.replace({ query: { ...this.$route.query, mode: 'browse' } })
      // }
    },

    // ── 南区流程信息：折叠/拖高（还原旧 region south split+collapsed）──
    toggleWorkflowPanel() {
      this.workflowCollapsed = !this.workflowCollapsed
    },
    startWorkflowResize(e) {
      this.workflowResizing = true
      this._resizeStartY = e.clientY
      this._resizeStartH = this.workflowHeight
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', this.handleWorkflowResize)
      document.addEventListener('mouseup', this.stopWorkflowResize)
    },
    handleWorkflowResize(e) {
      if (!this.workflowResizing) return
      // 向上拖增高、向下拖减高
      const delta = this._resizeStartY - e.clientY
      const next = this._resizeStartH + delta
      if (next >= 200 && next <= 600) {
        this.workflowHeight = next
      }
    },
    stopWorkflowResize() {
      this.workflowResizing = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', this.handleWorkflowResize)
      document.removeEventListener('mouseup', this.stopWorkflowResize)
    }
  }
}
</script>

<style lang="less" scoped>
@border:    #e8e8e8;
@panel-w:   300px;
@toolbar-h: 32px;   // 每行工具栏高度
@edge-w:    28px;   // < > 折叠按钮宽度
@edge-gap:  8px;    // < > 按钮与工具区间距

// 布局占用高度：全局头 59px + 多页签栏 52px + 外层容器上边距 12px = 123px；
// 再留 12px 底部间距（与两侧 margin 对齐），共 135px，使整页正好落在视口内、无外层滚动条。
.dm-editor-page {
  height: calc(100vh - 135px);
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}
.editor-body-spin { flex: 1; overflow: hidden; }
/deep/ .editor-body-spin > .ant-spin-container { height: 100%; }
.editor-body { display: flex; height: 100%; gap: 8px; padding: 8px; }

/* ── 三区卡片 ─────────────────────────────── */
.region-west,
.region-center,
.region-east {
  background: #fff;
  border: 1px solid @border;
  border-radius: 4px;
  overflow: hidden;
}
.region-west  { width: @panel-w; flex-shrink: 0; overflow: auto; }
.region-center{ flex: 1; display: flex; flex-direction: column; min-width: 0; }
.region-east  { width: @panel-w; flex-shrink: 0; display: flex; flex-direction: column; }

/* ── 模式横幅 ─────────────────────────────── */
.mode-banner {
  flex-shrink: 0;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid @border;
}
.mode-banner--edit {
  background: #f6ffed;
  color: #389e0d;
  border-bottom-color: #b7eb8f;
}
.mode-banner--readonly {
  background: #fff1f0;
  color: #cf1322;
  border-bottom-color: #ffa39e;
}
.mode-banner .mb-icon { font-size: 14px; }
.mode-banner .mb-dmc  { font-weight: 400; color: #595959; }
.mode-banner .mb-hint {
  margin-left: auto;
  font-weight: 400;
  font-style: italic;
  opacity: .85;
}

/* 只读模式：编辑器区淡灰底，强化"不可编辑"观感 */
.region-center--readonly /deep/ .CodeMirror { background: #fafafa; }

/* ── 中区底部页签（§4 tabPosition:'bottom'）──────────
   重建 flex 高度链穿过 a-tabs DOM，使内部 CodeMirror(height:100%) 不塌陷 */
.view-tabs { flex: 1; min-height: 0; display: flex; flex-direction: column; }
/* 内容区撑满剩余高度，页签栏固定；bottom 模式下 antd 已把 bar 排在内容之后 */
.view-tabs /deep/ .ant-tabs-content {
  flex: 1;
  min-height: 0;
  height: auto;
}
.view-tabs /deep/ .ant-tabs-bar {
  flex-shrink: 0;
  margin: 0;
  border-top: 1px solid @border;
}
/* 关闭动画后 antd 仍保留一层 tabpanel 容器，需逐层撑高 */
.view-tabs /deep/ .ant-tabs-tabpane-active {
  height: 100%;
  display: flex;
  flex-direction: column;
}
/* 源码视图页签内容：工具栏+状态栏固定，编辑器占余高 */
.source-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
/* 设计视图占位（二期禁用，正常不可见）*/
.design-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #bfbfbf;
  font-size: 13px;
}
.design-placeholder .dp-icon { font-size: 36px; }

/* ── 工具栏容器 ───────────────────────────── */
.editor-toolbar {
  border-bottom: 1px solid @border;
  flex-shrink: 0;
  background: #fafafa;
}

/* ── 工具栏行 ─────────────────────────────── */
.toolbar-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  min-height: @toolbar-h;
  padding: 4px 10px;
  &:first-child {
    border-bottom: 1px solid #efefef;
  }
}

// 第二行：左侧空出 < 按钮的位置，使两行工具区左端对齐
.toolbar-row--edit {
  padding-left: (@edge-w + @edge-gap + 10px);
}

/* ── 中部工具区 ───────────────────────────── */
.toolbar-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;          // 行/列统一间距，按钮与分割线一致
  flex: 1;
  min-width: 0;
}

/* 每个按钮的外边距归零，间距完全交给 gap，保证均匀 */
.toolbar-tools /deep/ .ant-btn { margin: 0; }

/* 分组竖线：不再叠加自身 margin，间距由 gap 统一控制 */
.toolbar-tools /deep/ .ant-divider-vertical {
  height: 16px;
  margin: 0;
  border-left-color: #d9d9d9;
}

/* ── < > 折叠按钮 ─────────────────────────── */
.edge-btn {
  flex-shrink: 0;
  width: @edge-w;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-color: #d9d9d9;
  color: #595959;
  border-radius: 3px;
  &:hover, &:focus {
    background: #1890ff;
    border-color: #1890ff;
    color: #fff;
  }
}
.edge-left  { margin-right: @edge-gap; }
.edge-right { margin-left:  @edge-gap; }
.edge-icon  { font-size: 13px; font-weight: bold; line-height: 1; }

/* ── South区域（流程信息面板） ─────────────── */
.region-south {
  flex-shrink: 0;
  border-top: 1px solid @border;
  background: #fff;
  display: flex;
  flex-direction: column;
}

/* 拖拽分隔条（展开时可拖高） */
.south-resize-bar {
  height: 5px;
  cursor: ns-resize;
  background: @border;
  transition: background 0.2s;
}
.south-resize-bar:hover  { background: #1890ff; }
.south-resize-bar:active { background: #096dd9; }

/* 标题栏（点击折叠/展开，还原旧 panel-title '流程信息'） */
.south-title-bar {
  flex-shrink: 0;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #fafafa;
  border-bottom: 1px solid @border;
  cursor: pointer;
  user-select: none;
}
.region-south--collapsed .south-title-bar {
  border-bottom: none;
}
.south-title {
  font-weight: bold;
  color: #2d75cd;
}
.south-toggle-icon {
  color: #999;
}

/* 面板主体（折叠时 v-show 隐藏；高度由 workflowHeight 控制） */
.south-body {
  overflow: auto;
}
</style>
