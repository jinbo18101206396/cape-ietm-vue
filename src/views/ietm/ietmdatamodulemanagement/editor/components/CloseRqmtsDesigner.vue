<template>
  <a-spin :spinning="loading">
  <div class="closerqmts-designer">
    <!-- 顶部标题 -->
    <div class="closerqmts-header">
      <span class="header-title">收尾工作</span>
    </div>

    <!-- 主内容区 -->
    <div class="closerqmts-main">
      <!-- 条件类型选择 + 保存按钮 -->
      <div class="condition-type-header">
        <a-radio-group v-model="conditionType" @change="onConditionTypeChange" :disabled="readonly">
          <a-radio :value="0">无必要条件</a-radio>
          <a-radio :value="1">必要条件列表</a-radio>
        </a-radio-group>
        <a-button v-if="showSaveBtn" type="primary" @click="handleSave" :loading="saving" :disabled="readonly">
          <a-icon type="save"/>
          保存
        </a-button>
      </div>

      <!-- 条件列表 -->
      <div class="condition-list">
        <!-- 列表工具栏 -->
        <div class="list-toolbar">
          <a-button size="small" @click="handleAdd" :disabled="readonly || conditionType === 0">
            <a-icon type="plus"/>
            增加
          </a-button>
          <a-button size="small" @click="handleDelete" :disabled="readonly || conditionType === 0 || selectedRow === null">
            <a-icon type="delete"/>
            删除
          </a-button>
          <a-button size="small" @click="handleMoveUp" :disabled="readonly || conditionType === 0 || selectedRow === null || selectedRow === 0">
            <a-icon type="arrow-up"/>
            上移
          </a-button>
          <a-button size="small" @click="handleMoveDown" :disabled="readonly || conditionType === 0 || selectedRow === null || selectedRow === conditions.length - 1">
            <a-icon type="arrow-down"/>
            下移
          </a-button>
          <a-button size="small" @click="showBatchDialog" :disabled="readonly || conditionType === 0">
            <a-icon type="bars"/>
            批量生成
          </a-button>
        </div>

        <!-- 条件表格 -->
        <a-table
          class="condition-table"
          :columns="columns"
          :data-source="conditions"
          :row-selection="rowSelection"
          :pagination="false"
          :row-key="(record, index) => index"
          :row-class-name="(record, index) => readonly ? 'readonly-row' : ''"
          size="small"
          bordered
        >
          <!-- 类型列 -->
          <span slot="condtype" slot-scope="text, record, index">
            <a-select
              v-model="record.condtype"
              size="small"
              style="width: 100%"
              :disabled="readonly"
              @change="isDirty = true"
            >
              <a-select-option :value="1">无引用</a-select-option>
              <a-select-option :value="2">DM</a-select-option>
              <a-select-option :value="3">PM</a-select-option>
              <a-select-option :value="4">外部出版物</a-select-option>
            </a-select>
          </span>

          <!-- 条件内容列 -->
          <div slot="cond" slot-scope="text, record, index" class="cond-cell">
            <div class="cond-display" v-html="record.condDisplay || '（未设置）'"></div>
            <a-button
              size="small"
              icon="edit"
              @click="openParaEditor(index)"
              :disabled="readonly"
            >
              编辑
            </a-button>
          </div>

          <!-- 引用列 -->
          <div slot="ref" slot-scope="text, record, index" class="ref-cell">
            <a-input
              v-model="record.ref"
              size="small"
              :disabled="true"
              :placeholder="getRefPlaceholder(record.condtype)"
              style="flex: 1"
            />
            <a-button
              size="small"
              icon="select"
              @click="openRefSelector(index)"
              :disabled="readonly || record.condtype === 1 || record.condtype === 4"
              :title="record.condtype === 1 ? '无引用类型不需要选择' : record.condtype === 4 ? '外部出版物暂不支持' : '选择引用'"
            >
            </a-button>
          </div>
        </a-table>
      </div>
    </div>

    <!-- Para编辑器对话框（内联实现，与LevelledParaDesigner保持一致） -->
    <a-modal
      v-model="paraEditorVisible"
      title="编辑条件内容"
      :width="800"
      :footer="null"
      :maskClosable="false"
    >
      <div class="para-editor-id-row">
        <span class="para-editor-id-label">id:</span>
        <a-input v-model="editingCondId" size="small" class="para-editor-id-input" />
      </div>
      <div ref="paraEditorWrapper" class="para-editor-wrapper">
        <textarea :id="paraEditorId" ref="paraEditorTextarea"></textarea>
      </div>
      <div class="modal-footer" style="margin-top: 12px; text-align: right;">
        <a-button @click="closeParaEditor">取消</a-button>
        <a-button type="primary" @click="saveParaEditor" :loading="paraEditorSaving">确定</a-button>
      </div>
    </a-modal>

    <!-- 批量生成对话框（暂时注释） -->
    <!--
    <close-reqmts-batch-dialog
      :visible="batchDialogVisible"
      @ok="onBatchDialogOk"
      @cancel="batchDialogVisible = false"
    />
    -->

    <!-- DM引用选择对话框 -->
    <ietm-dm-ref-dialog
      :visible.sync="dmRefDialogVisible"
      @insert="onDmRefInsert"
    />

    <!-- PM引用选择对话框 -->
    <ietm-pm-ref-dialog
      :visible="pmRefDialogVisible"
      @ok="onPmRefOk"
      @cancel="pmRefDialogVisible = false"
    />

    <!-- 内部引用对话框 -->
    <ietm-interref-dialog
      ref="interrefDialog"
      :visible.sync="interrefDialogVisible"
      @insert="insertInterref"
    />
  </div>
  </a-spin>
</template>

<script>
import { closeRqmts2object, object2closeRqmts } from '../utils/closeRqmtsConverter'
import { loadUEditor, getUEditorConfig } from '../utils/ueditorConfig'
import IetmDmRefDialog from './IetmDmRefDialog'
import IetmPmRefDialog from './IetmPmRefDialog'
import IetmInterrefDialog from './IetmInterrefDialog'

/**
 * closeRqmts 设计器主组件
 *
 * @description closeRqmts（收尾工作）设计视图，支持4种条件类型的CRUD操作
 * @author IETM Team
 * @date 2026-11-14
 * @version 1.1.1
 */
export default {
  name: 'CloseRqmtsDesigner',

  components: {
    IetmDmRefDialog,
    IetmPmRefDialog,
    IetmInterrefDialog
  },

  props: {
    // 行号
    lineno: {
      type: Number,
      required: true,
      validator: (value) => value >= 0
    },
    // CodeMirror编辑器实例
    editor: {
      type: Object,
      required: true
    },
    // 语言环境（en/cn）
    locale: {
      type: String,
      default: 'en',
      validator: (value) => ['en', 'cn'].includes(value)
    },
    // 当前节点ID
    cmnodeid: {
      type: String,
      default: ''
    },
    // 是否可编辑（'0'=只读，'1'=可编辑）
    ifedit: {
      type: String,
      default: '1',
      validator: (value) => ['0', '1'].includes(value)
    },
    // 是否显示保存按钮（'0'=隐藏，'1'=显示）
    save: {
      type: String,
      default: '1',
      validator: (value) => ['0', '1'].includes(value)
    }
  },

  data() {
    return {
      conditionType: 0,              // 0=无必要条件，1=必要条件列表
      conditions: [],                // 条件列表
      selectedRow: null,             // 当前选中行索引
      editingIndex: -1,              // 正在编辑的行索引
      endline: -1,                   // closeRqmts结束行号
      saving: false,                 // 保存状态
      loading: false,                // 【v1.1】加载状态
      isDirty: false,                // 【v1.1】是否有未保存的修改
      paraEditorVisible: false,      // Para编辑器可见性
      editingCondContent: '',        // 正在编辑的条件内容（XML格式）
      paraEditor: null,              // UEditor实例
      paraEditorReady: false,        // UEditor就绪状态
      paraEditorSaving: false,       // Para编辑器保存状态
      paraEditorId: `closeRqmts-para-editor-${Date.now()}`, // UEditor容器ID
      editingCondId: '',             // 正在编辑的条件 id 属性
      interrefDialogVisible: false,  // 内部引用对话框可见性
      batchDialogVisible: false,     // 批量生成对话框可见性
      dmRefDialogVisible: false,     // DM引用选择对话框可见性
      pmRefDialogVisible: false,     // PM引用选择对话框可见性

      // 表格列配置
      columns: [
        {
          title: '类型',
          dataIndex: 'condtype',
          width: '20%',
          align: 'center',
          scopedSlots: { customRender: 'condtype' }
        },
        {
          title: '条件',
          dataIndex: 'condDisplay',
          width: '50%',
          align: 'center',
          scopedSlots: { customRender: 'cond' }
        },
        {
          title: '引用',
          dataIndex: 'ref',
          width: '30%',
          align: 'center',
          scopedSlots: { customRender: 'ref' }
        }
      ]
    }
  },

  computed: {
    readonly() {
      return this.ifedit === '0'
    },

    showSaveBtn() {
      return this.save === '1'
    },

    rowSelection() {
      return {
        type: 'radio',
        selectedRowKeys: this.selectedRow !== null ? [this.selectedRow] : [],
        onChange: (selectedRowKeys) => {
          this.selectedRow = selectedRowKeys[0] !== undefined ? selectedRowKeys[0] : null
          this.editingIndex = this.selectedRow
        }
      }
    }
  },

  inject: {
    getLocaleName: {
      default: () => (name) => {
        console.warn('getLocaleName未注入，使用默认实现')
        return name
      }
    },
    toEnXml: {
      default: () => (xml) => {
        console.warn('toEnXml未注入，使用默认实现（不转换）')
        return xml
      }
    },
    toCnXml: {
      default: () => (xml) => {
        console.warn('toCnXml未注入，使用默认实现（不转换）')
        return xml
      }
    },
    formateXml: {
      default: () => (xml, indent) => {
        console.warn('formateXml未注入，使用默认实现（不格式化）')
        return xml
      }
    }
  },

  // 【v1.1】添加watch监听未保存修改
  watch: {
    conditions: {
      deep: true,
      handler() {
        this.isDirty = true
      }
    },
    conditionType() {
      this.isDirty = true
    }
  },

  mounted() {
    // 【v1.1】验证依赖注入
    if (!this.toEnXml || !this.toCnXml || !this.formateXml) {
      console.error('依赖注入失败：缺少必要的XML转换函数')
      this.$message.error('初始化失败，缺少必要的转换函数，请联系管理员')
      return
    }

    this.loadContent()
  },

  beforeDestroy() {
    // 【v1.1】离开前检查未保存修改
    if (this.isDirty && this.conditions.length > 0) {
      const msg = '您有未保存的修改，离开后将丢失。建议先保存。'
      console.warn(msg)
    }

    // 清理资源
    this.conditions = []
    this.editingIndex = -1
    this.selectedRow = null
    if (this.paraEditor) {
      try { this.paraEditor.destroy() } catch (e) {}
      this.paraEditor = null
    }

    // 清理样式污染
    this._cleanupViewStyles()
  },

  methods: {
    // ========== 生命周期方法 ==========

    async loadContent() {
      if (!this.editor || this.lineno === null) return

      // 【v1.1】添加loading状态
      this.loading = true

      try {
        // 1. 读取 XML 内容
        let closeRqmtsXml = await this.getCloseRqmtsXml()

        // 2. 中文转英文（若需要）
        if (this.locale === 'cn') {
          closeRqmtsXml = this.toEnXml(closeRqmtsXml)
        }

        // 3. 检测空标签（旧系统兼容）
        const isEmpty = /^<closeRqmts[^>]*>\s*<\/closeRqmts>$/i.test(closeRqmtsXml.trim())
        if (isEmpty) {
          this.conditionType = 0
          this.conditions = []
          this.isDirty = false
          return
        }

        // 4. 解析 XML → Object
        const closeRqmtsObj = await closeRqmts2object(null, closeRqmtsXml)

        // 5. 填充数据
        this.conditionType = closeRqmtsObj.hasConditions ? 1 : 0
        this.conditions = closeRqmtsObj.conditions.map(cond => ({
          condtype: cond.type,
          condId: cond.id || '',
          condXml: cond.xml,
          condDisplay: this.para2html(cond.xml),
          ref: cond.ref || '',
          refData: cond.refData || null
        }))

        // 【v1.1】加载完成后重置dirty标记
        this.isDirty = false

      } catch (error) {
        console.error('加载closeRqmts失败:', error)
        this.$message.error('加载失败: ' + error.message)

        // 【v1.1】加载失败时初始化为空状态
        this.conditionType = 0
        this.conditions = []

      } finally {
        // 【v1.1】确保loading状态被清除
        this.loading = false
      }
    },

    async getCloseRqmtsXml() {
      let startLine = this.lineno
      let closeRqmtsXml = this.editor.getLine(startLine)
      const isSingleLine = closeRqmtsXml.includes('<closeRqmts') && closeRqmtsXml.includes('</closeRqmts>')

      if (!isSingleLine) {
        // 查找结束行
        for (let i = startLine + 1; i < this.editor.lineCount(); i++) {
          if (this.editor.getLine(i).includes('</closeRqmts>')) {
            this.endline = i
            break
          }
        }
        if (this.endline === -1) {
          throw new Error('找不到</closeRqmts>结束标签')
        }
        closeRqmtsXml = this.editor.getRange(
          { line: startLine, ch: 0 },
          { line: this.endline, ch: this.editor.getLine(this.endline).length }
        )
      } else {
        this.endline = startLine
      }

      return closeRqmtsXml
    },

    // ========== 条件操作方法 ==========

    handleAdd() {
      this.conditions.push({
        condtype: 1,
        condId: '',
        condXml: '',
        condDisplay: '',
        ref: '',
        refData: null
      })
      this.editingIndex = this.conditions.length - 1
      this.selectedRow = this.editingIndex
    },

    handleDelete() {
      if (this.selectedRow === null) {
        this.$message.warning('请选择一行数据')
        return
      }

      this.$confirm({
        title: '确认',
        content: '确认要删除该行条件？',
        onOk: () => {
          this.conditions.splice(this.selectedRow, 1)
          if (this.editingIndex === this.selectedRow) {
            this.editingIndex = -1
          }
          this.selectedRow = null
        }
      })
    },

    handleMoveUp() {
      if (this.selectedRow === null || this.selectedRow === 0) {
        this.$message.warning('顶行无法上移')
        return
      }
      const temp = this.conditions[this.selectedRow]
      this.$set(this.conditions, this.selectedRow, this.conditions[this.selectedRow - 1])
      this.$set(this.conditions, this.selectedRow - 1, temp)
      this.selectedRow--
    },

    handleMoveDown() {
      if (this.selectedRow === null || this.selectedRow === this.conditions.length - 1) {
        this.$message.warning('底行无法下移')
        return
      }
      const temp = this.conditions[this.selectedRow]
      this.$set(this.conditions, this.selectedRow, this.conditions[this.selectedRow + 1])
      this.$set(this.conditions, this.selectedRow + 1, temp)
      this.selectedRow++
    },

    onConditionTypeChange(e) {
      if (e.target.value === 0) {
        // 切换到"无必要条件"，清空列表
        if (this.conditions.length > 0) {
          this.$confirm({
            title: '确认',
            content: '切换到"无必要条件"将清空所有已添加的条件，确定要继续吗？',
            onOk: () => {
              this.conditions = []
              this.editingIndex = -1
              this.selectedRow = null
            },
            onCancel: () => {
              this.conditionType = 1
            }
          })
        }
      }
    },

    // ========== 编辑器方法 ==========

    async openParaEditor(index) {
      if (index < 0 || index >= this.conditions.length) return

      this.editingIndex = index
      this.editingCondContent = this.conditions[index].condXml || ''
      this.editingCondId = this.conditions[index].condId || ''
      this.paraEditorVisible = true

      await this.$nextTick()

      try {
        await loadUEditor()

        // 注册 interrefbutton（全局仅注册一次，避免与 LevelledParaDesigner 冲突）
        if (!window.$CLOSE_RQMTS_CUSTOM_BUTTONS_REGISTERED) {
          window.$CLOSE_RQMTS_CUSTOM_BUTTONS_REGISTERED = true
          const UE = window.UE
          if (!window.$LEVELLEDPARA_CUSTOM_BUTTONS_REGISTERED) {
            UE.registerUI('interrefbutton', (editor, uiName) => {
              const btn = new UE.ui.Button({
                name: uiName,
                title: '内部引用',
                cssRules: 'background-position: -500px -0px;',
                onclick: () => {
                  const instance = window.$LEVELLEDPARA_DESIGNER_INSTANCES &&
                    window.$LEVELLEDPARA_DESIGNER_INSTANCES[editor.key]
                  if (instance && instance.$refs.interrefDialog) {
                    instance.$refs.interrefDialog.open()
                  }
                }
              })
              return btn
            }, 25)
          }
        }

        // 注册当前实例，使 interrefbutton 点击时能找到 $refs.interrefDialog
        if (!window.$LEVELLEDPARA_DESIGNER_INSTANCES) {
          window.$LEVELLEDPARA_DESIGNER_INSTANCES = {}
        }
        window.$LEVELLEDPARA_DESIGNER_INSTANCES[this.paraEditorId] = this

        const config = getUEditorConfig({
          readonly: false,
          toolbars: [[
            'source', '|', 'undo', 'redo', '|', 'removeformat', 'selectall', 'cleardoc', '|',
            'date', 'time', 'spechars', 'searchreplace', '|',
            'superscript', 'subscript', '|',
            'interrefbutton', 'symbolbutton'
          ]]
        })

        this.paraEditor = window.UE.getEditor(this.paraEditorId, config)
        this.paraEditor.key = this.paraEditorId

        this.paraEditor.ready(() => {
          this.paraEditorReady = true
          const content = this.editingCondContent
            ? this.editingCondContent.replace(/<\/?para>/gi, '').trim()
            : ''
          this.paraEditor.setContent(content)
          // kityformula 按钮由插件异步注入，通过 CSS (.para-editor-wrapper) 隐藏
        })
      } catch (error) {
        console.error('UEditor初始化失败:', error)
        this.$message.error('编辑器初始化失败')
      }
    },

    closeParaEditor() {
      this.paraEditorVisible = false
      if (this.paraEditor) {
        try { this.paraEditor.destroy() } catch (e) {}
        this.paraEditor = null
        this.paraEditorReady = false
      }
      // 清理全局实例注册
      if (window.$LEVELLEDPARA_DESIGNER_INSTANCES) {
        delete window.$LEVELLEDPARA_DESIGNER_INSTANCES[this.paraEditorId]
      }
    },

    insertInterref(xml) {
      if (this.paraEditor && this.paraEditorReady) {
        this.paraEditor.execCommand('inserthtml', xml)
      }
    },

    saveParaEditor() {
      if (!this.paraEditor || !this.paraEditorReady) {
        this.$message.warning('编辑器未就绪，请稍候')
        return
      }
      const rawHtml = this.paraEditor.getContent()
      if (!rawHtml || rawHtml.trim() === '') {
        this.$message.warning('条件内容不能为空')
        return
      }
      // UEditor 总是把内容包在 <p></p> 里，并可能追加 <br/>，全部去掉
      const xmlContent = rawHtml
        .replace(/<\/?p>/gi, '')
        .replace(/<br\s*\/?>/gi, '')
        .trim()
      if (this.editingIndex >= 0 && this.editingIndex < this.conditions.length) {
        this.conditions[this.editingIndex].condId = this.editingCondId
        this.conditions[this.editingIndex].condXml = `<para>${xmlContent}</para>`
        this.conditions[this.editingIndex].condDisplay = xmlContent
      }
      this.closeParaEditor()
    },

    // ========== 引用选择方法 ==========

    openRefSelector(index) {
      if (index < 0 || index >= this.conditions.length) return

      const condtype = this.conditions[index].condtype

      if (condtype === 1) {
        this.$message.info('无引用类型不需要选择引用')
        return
      } else if (condtype === 2) {
        this.editingIndex = index
        this.dmRefDialogVisible = true
      } else if (condtype === 3) {
        this.editingIndex = index
        this.pmRefDialogVisible = true
      } else if (condtype === 4) {
        this.$message.info('外部出版物类型当前版本不支持引用选择')
      }
    },

    onDmRefInsert(dmRefXml) {
      console.log('【调试】onDmRefInsert 被调用')
      console.log('【调试】接收到的 dmRefXml:', dmRefXml)
      console.log('【调试】dmRefXml 类型:', typeof dmRefXml)

      if (this.editingIndex >= 0 && this.editingIndex < this.conditions.length) {
        try {
          // 添加命名空间声明
          let xmlWithNamespace = dmRefXml
          if (xmlWithNamespace.includes('xlink:') && !xmlWithNamespace.includes('xmlns:xlink')) {
            xmlWithNamespace = xmlWithNamespace.replace(
              '<dmRef',
              '<dmRef xmlns:xlink="http://www.w3.org/1999/xlink"'
            )
          }

          const parser = new DOMParser()
          const xmlDoc = parser.parseFromString(xmlWithNamespace, 'text/xml')

          console.log('【调试】XML 解析结果:', xmlDoc)

          // 检查解析错误
          const parserError = xmlDoc.querySelector('parsererror')
          if (parserError) {
            console.error('【调试】XML 解析错误:', parserError.textContent)
            this.$message.error('XML 解析失败')
            this.dmRefDialogVisible = false
            return
          }

          // 尝试多种方式查找 dmCode 节点
          let dmCodeNode = xmlDoc.querySelector('dmCode')
          if (!dmCodeNode) {
            dmCodeNode = xmlDoc.querySelector('dmRefIdent dmCode')
          }
          if (!dmCodeNode) {
            dmCodeNode = xmlDoc.querySelector('dmRef dmRefIdent dmCode')
          }

          console.log('【调试】dmCodeNode:', dmCodeNode)

          if (dmCodeNode) {
            // 构建 DMC
            const modelIdentCode = dmCodeNode.getAttribute('modelIdentCode') || ''
            const systemDiffCode = dmCodeNode.getAttribute('systemDiffCode') || ''
            const systemCode = dmCodeNode.getAttribute('systemCode') || '00'
            const subSystemCode = (dmCodeNode.getAttribute('subSystemCode') || '00').padStart(2, '0')
            const subSubSystemCode = (dmCodeNode.getAttribute('subSubSystemCode') || '00').padStart(2, '0')
            const assyCode = dmCodeNode.getAttribute('assyCode') || '00'
            const disassyCode = dmCodeNode.getAttribute('disassyCode') || '00'
            const disassyCodeVariant = dmCodeNode.getAttribute('disassyCodeVariant') || 'A'
            const infoCode = (dmCodeNode.getAttribute('infoCode') || '000').padStart(3, '0')
            const infoCodeVariant = dmCodeNode.getAttribute('infoCodeVariant') || 'A'
            const itemLocationCode = dmCodeNode.getAttribute('itemLocationCode') || 'A'

            console.log('【调试】dmCode 属性:', {
              modelIdentCode, systemDiffCode, systemCode,
              subSystemCode, subSubSystemCode, assyCode,
              disassyCode, disassyCodeVariant, infoCode,
              infoCodeVariant, itemLocationCode
            })

            // 获取 language
            let languageNode = xmlDoc.querySelector('language')
            if (!languageNode) {
              languageNode = xmlDoc.querySelector('dmRefIdent language')
            }
            const languageIsoCode = languageNode ? (languageNode.getAttribute('languageIsoCode') || 'zh') : 'zh'
            const countryIsoCode = languageNode ? (languageNode.getAttribute('countryIsoCode') || 'CN') : 'CN'

            // 构建完整的 DMC（标准格式）
            // DMC-{modelIdentCode}-{systemDiffCode}-{systemCode}-{subSystemCode}-{subSubSystemCode}-{assyCode}{disassyCode}-{disassyCodeVariant}{infoCode}{infoCodeVariant}-{itemLocationCode}_{languageIsoCode}-{countryIsoCode}
            const dmc = `DMC-${modelIdentCode}-${systemDiffCode}-${systemCode}-${subSystemCode}-${subSubSystemCode}-${assyCode}${disassyCode}-${disassyCodeVariant}${infoCode}${infoCodeVariant}-${itemLocationCode}_${languageIsoCode}-${countryIsoCode}`

            console.log('【调试】构建的 DMC:', dmc)

            // 保存引用信息
            this.conditions[this.editingIndex].ref = dmc
            this.conditions[this.editingIndex].refData = {
              xml: dmRefXml,  // 保存原始的 dmRef XML
              dmc: dmc
            }

            this.$message.success('DM引用选择成功')
          } else {
            console.error('【调试】未找到 dmCode 节点')
            console.log('【调试】XML 完整结构:', new XMLSerializer().serializeToString(xmlDoc))
            this.$message.error('无法解析DM引用信息：未找到dmCode节点')
          }
        } catch (error) {
          console.error('【调试】解析DM引用XML失败:', error)
          console.error('【调试】错误堆栈:', error.stack)
          this.$message.error('解析DM引用失败：' + error.message)
        }
      }
      this.dmRefDialogVisible = false
    },

    onPmRefOk(pmData) {
      if (this.editingIndex >= 0 && this.editingIndex < this.conditions.length) {
        this.conditions[this.editingIndex].ref = pmData.pmc
        this.conditions[this.editingIndex].refData = pmData
      }
      this.pmRefDialogVisible = false
    },

    // ========== 批量生成方法 ==========

    showBatchDialog() {
      this.batchDialogVisible = true
    },

    onBatchDialogOk(textArray) {
      textArray.forEach(text => {
        this.conditions.push({
          condtype: 1,
          condXml: `<para>${this.escapeXml(text)}</para>`,
          condDisplay: text,
          ref: '',
          refData: null
        })
      })
      this.batchDialogVisible = false
      this.$message.success(`成功添加 ${textArray.length} 条条件`)
    },

    // ========== 保存方法 ==========

    async handleSave() {
      if (this.saving) return

      // 【v1.1】备份当前XML，失败时恢复
      let backupXml = null

      try {
        this.saving = true

        // 【v1.1】保存前备份原XML
        if (this.endline !== -1) {
          backupXml = this.editor.getRange(
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        } else {
          backupXml = this.editor.getLine(this.lineno)
        }

        // 1. 验证数据
        if (this.conditionType === 1) {
          if (this.conditions.length === 0) {
            this.$message.warning('请至少添加一条必要条件，或选择"无必要条件"')
            return
          }
          for (let i = 0; i < this.conditions.length; i++) {
            const cond = this.conditions[i]
            if (!cond.condDisplay || cond.condDisplay.trim() === '') {
              this.$message.warning(`第 ${i + 1} 行条件内容不能为空`)
              return
            }
            if ((cond.condtype === 2 || cond.condtype === 3) && !cond.ref) {
              this.$message.warning(`第 ${i + 1} 行需要选择引用`)
              return
            }
            // 【v1.1】验证refData完整性（refData.dmc / refData.pmc 是实际存储的键）
            if (cond.condtype === 2 && cond.refData && !cond.refData.dmc) {
              this.$message.warning(`第 ${i + 1} 行DM引用数据不完整`)
              return
            }
            if (cond.condtype === 3 && cond.refData && !cond.refData.pmc) {
              this.$message.warning(`第 ${i + 1} 行PM引用数据不完整`)
              return
            }
          }
        }

        // 2. 构建数据对象
        const closeRqmtsObj = {
          hasConditions: this.conditionType === 1,
          conditions: this.conditions.map(cond => ({
            type: cond.condtype,
            id: cond.condId || '',
            xml: cond.condXml,
            ref: cond.ref,
            refData: cond.refData
          }))
        }

        // 3. 转换为 XML
        let closeRqmtsXml = await object2closeRqmts(null, closeRqmtsObj)

        // 4. 格式化 XML（添加缩进），去掉尾部多余换行避免产生空行
        const indent = this.editor.getLine(this.lineno).indexOf('<')
        closeRqmtsXml = this.formateXml(closeRqmtsXml, indent).replace(/\n$/, '')

        // 5. 转为中文（若需要）
        if (this.locale === 'cn') {
          closeRqmtsXml = this.toCnXml(closeRqmtsXml)
        }

        // 6. 替换源码编辑器内容
        if (this.endline === -1) {
          this.editor.replaceRange(closeRqmtsXml, { line: this.lineno, ch: 0 })
        } else {
          this.editor.replaceRange(
            closeRqmtsXml,
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        }

        // 7. 触发父组件保存
        this.$emit('save')

        this.$message.success('保存成功')

        // 【v1.1】保存成功后重置dirty标记
        this.isDirty = false

        // 8. 重新加载设计视图
        setTimeout(() => {
          this.loadContent()
        }, 500)

      } catch (error) {
        console.error('保存closeRqmts失败:', error)
        this.$message.error('保存失败: ' + error.message)

        // 【v1.1】保存失败时恢复原XML
        if (backupXml) {
          try {
            if (this.endline === -1) {
              this.editor.replaceRange(backupXml, { line: this.lineno, ch: 0 })
            } else {
              this.editor.replaceRange(
                backupXml,
                { line: this.lineno, ch: 0 },
                { line: this.endline, ch: this.editor.getLine(this.endline).length }
              )
            }
            this.$message.info('已恢复原内容')
          } catch (restoreError) {
            console.error('恢复原XML失败:', restoreError)
            this.$message.error('恢复失败，请手动撤销（Ctrl+Z）')
          }
        }

      } finally {
        this.saving = false
      }
    },

    // ========== 工具方法 ==========

    getRefPlaceholder(condtype) {
      if (condtype === 1) return '无引用'
      if (condtype === 2) return '选择DM引用'
      if (condtype === 3) return '选择PM引用'
      if (condtype === 4) return '外部出版物（暂不支持）'
      return ''
    },

    para2html(paraXml) {
      // 简化实现：去除 para 标签
      if (!paraXml) return ''
      return paraXml.replace(/<\/?para>/gi, '').trim()
    },

    html2para(html) {
      // 将 HTML 转换为 <para>...</para> XML 格式
      if (!html) return ''
      return `<para>${this.escapeXml(html)}</para>`
    },

    escapeXml(str) {
      if (!str) return ''
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    },

    // 【v1.1】清理设计视图样式污染
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
    }
  }
}
</script>

<style lang="less" scoped>
.closerqmts-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  .closerqmts-header {
    padding: 12px 16px;
    background: whitesmoke;
    border-bottom: 1px solid #d9d9d9;

    .header-title {
      font-size: 14pt;
      font-weight: bolder;
      color: #2d75cd;
      font-family: 'Microsoft YaHei';
    }
  }

  .closerqmts-main {
    flex: 1;
    padding: 16px;
    overflow: auto;

    .condition-type-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e8e8e8;
    }

    .condition-list {
      .list-toolbar {
        margin-bottom: 8px;
        display: flex;
        gap: 8px;
      }

      .condition-table {
        .cond-cell {
          display: flex;
          flex-direction: row;
          gap: 8px;
          align-items: center;

          .cond-display {
            flex: 1;
            word-break: break-word;
            min-height: 32px;
            padding: 4px 8px;
            background-color: #fafafa;
            border-radius: 2px;
            border: 1px solid #d9d9d9;

            /* 【v1.1】支持富文本HTML显示 */
            /deep/ b { font-weight: bold; }
            /deep/ i { font-style: italic; }
            /deep/ u { text-decoration: underline; }
            /deep/ strike { text-decoration: line-through; }
            /deep/ sub { vertical-align: sub; font-size: smaller; }
            /deep/ sup { vertical-align: super; font-size: smaller; }
          }
        }

        .ref-cell {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        /* 【v1.1】只读模式样式 */
        .readonly-row {
          background-color: #f5f5f5;
          cursor: not-allowed;

          /deep/ .ant-btn,
          /deep/ .ant-select,
          /deep/ .ant-input {
            pointer-events: none;
          }
        }
      }
    }

    .no-condition-hint {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }
  }
}

/* kityformula 插件异步注入按钮，无法通过 toolbars config 阻止，用 CSS 隐藏 */
.para-editor-wrapper {
  /deep/ [class*="kityformula"] {
    display: none !important;
  }
}

/* id 输入行（对齐旧系统样式） */
.para-editor-id-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;

  .para-editor-id-label {
    margin-right: 4px;
    white-space: nowrap;
    font-size: 13px;
  }

  .para-editor-id-input {
    width: 200px;
  }
}
</style>

