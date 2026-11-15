<template>
  <a-spin :spinning="loading">
  <div class="reqcond-group-designer">
    <!-- 条件类型选择 -->
    <div class="condition-type-header">
      <a-radio-group v-model="conditionType" @change="onConditionTypeChange" :disabled="readonly">
        <a-radio :value="0">无必要条件</a-radio>
        <a-radio :value="1">必要条件列表</a-radio>
      </a-radio-group>
    </div>

    <!-- 列表工具栏 -->
    <div class="list-toolbar">
      <a-button size="small" @click="handleAdd"
        :disabled="readonly || conditionType === 0">
        <a-icon type="plus"/>增加
      </a-button>
      <a-button size="small" @click="handleDelete"
        :disabled="readonly || conditionType === 0 || selectedRow === null">
        <a-icon type="delete"/>删除
      </a-button>
      <a-button size="small" @click="handleMoveUp"
        :disabled="readonly || conditionType === 0 || selectedRow === null || selectedRow === 0">
        <a-icon type="arrow-up"/>上移
      </a-button>
      <a-button size="small" @click="handleMoveDown"
        :disabled="readonly || conditionType === 0 || selectedRow === null || selectedRow === conditions.length - 1">
        <a-icon type="arrow-down"/>下移
      </a-button>
      <a-button size="small" @click="showBatchDialog"
        :disabled="readonly || conditionType === 0">
        <a-icon type="bars"/>批量生成
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
      :row-class-name="() => readonly ? 'readonly-row' : ''"
      size="small"
      bordered>

      <!-- 类型列 -->
      <span slot="condtype" slot-scope="text, record">
        <a-select v-model="record.condtype" size="small" style="width:100%"
          :disabled="readonly" @change="isDirty = true">
          <a-select-option :value="1">无引用</a-select-option>
          <a-select-option :value="2">DM</a-select-option>
          <a-select-option :value="3">PM</a-select-option>
          <a-select-option :value="4">外部出版物</a-select-option>
        </a-select>
      </span>

      <!-- 条件内容列 -->
      <div slot="cond" slot-scope="text, record, index" class="cond-cell">
        <div class="cond-display" v-html="record.condDisplay || '<span style=\'color:#bbb\'>（未设置）</span>'"></div>
        <a-button size="small" icon="edit" @click="openParaEditor(index)" :disabled="readonly">编辑</a-button>
      </div>

      <!-- 引用列 -->
      <div slot="ref" slot-scope="text, record, index" class="ref-cell">
        <a-input v-model="record.ref" size="small" :disabled="true"
          :placeholder="getRefPlaceholder(record.condtype)" style="flex:1"/>
        <a-button size="small" icon="select"
          @click="openRefSelector(index)"
          :disabled="readonly || record.condtype === 1 || record.condtype === 4"
          :title="record.condtype === 1 ? '无引用类型不需要选择' : record.condtype === 4 ? '外部出版物暂不支持' : '选择引用'">
        </a-button>
      </div>
    </a-table>

    <!-- Para 编辑器对话框（与 CloseRqmtsDesigner 保持一致） -->
    <a-modal v-model="paraEditorVisible" title="编辑条件内容"
      :width="800" :footer="null" :maskClosable="false">
      <div class="para-editor-id-row">
        <span class="para-editor-id-label">id:</span>
        <a-input v-model="editingCondId" size="small" class="para-editor-id-input"/>
      </div>
      <div ref="paraEditorWrapper" class="para-editor-wrapper">
        <textarea :id="paraEditorId" ref="paraEditorTextarea"></textarea>
      </div>
      <div class="modal-footer" style="margin-top:12px;text-align:right;">
        <a-button @click="closeParaEditor">取消</a-button>
        <a-button type="primary" @click="saveParaEditor" :loading="paraEditorSaving" style="margin-left:8px">确定</a-button>
      </div>
    </a-modal>

    <!-- 批量生成对话框 -->
    <a-modal v-model="batchDialogVisible" title="批量生成条件"
      :width="600" @ok="handleBatchOk">
      <a-textarea v-model="batchText"
        placeholder="每行一个条件文本，按回车换行。&#10;批量生成的条件默认为「无引用」类型，可在表格中修改。"
        :rows="10"/>
    </a-modal>

    <!-- DM 引用选择对话框 -->
    <ietm-dm-ref-dialog
      :visible.sync="dmRefDialogVisible"
      @insert="onDmRefInsert"/>

    <!-- PM 引用选择对话框 -->
    <ietm-pm-ref-dialog
      :visible="pmRefDialogVisible"
      @ok="onPmRefOk"
      @cancel="pmRefDialogVisible = false"/>

    <!-- 内部引用对话框 -->
    <ietm-interref-dialog
      ref="interrefDialog"
      :visible.sync="interrefDialogVisible"
      @insert="insertInterref"/>
  </div>
  </a-spin>
</template>

<script>
import { loadUEditor, getUEditorConfig } from '../utils/ueditorConfig'
import IetmDmRefDialog   from './IetmDmRefDialog'
import IetmPmRefDialog   from './IetmPmRefDialog'
import IetmInterrefDialog from './IetmInterrefDialog'

/**
 * reqCondGroup（必要条件）子设计器
 *
 * 职责：
 *   - 独立管理必要条件的 CRUD（4种类型：无引用/DM/PM/外部出版物）
 *   - 富文本编辑（UEditor）
 *   - DM/PM 引用选择
 *   - 批量生成
 *
 * 生命周期：
 *   - 父组件（PreliminaryRqmtsDesigner）解析 XML 后调用 loadFromXml(xml)
 *   - 保存时父组件调用 getSaveXml() 拿到 XML 字符串
 *
 * @author IETM Team
 * @date   2026-11-15
 * @version 2.0
 */
export default {
  name: 'ReqCondGroupDesigner',

  components: {
    IetmDmRefDialog,
    IetmPmRefDialog,
    IetmInterrefDialog
  },

  props: {
    /** 是否可编辑（'0'=只读，'1'=可编辑） */
    ifedit: {
      type: String,
      default: '1',
      validator: v => ['0', '1'].includes(v)
    }
  },

  data() {
    return {
      conditionType: 0,    // 0=无必要条件，1=必要条件列表
      conditions: [],      // 条件列表
      selectedRow: null,   // 当前选中行索引
      editingIndex: -1,    // 正在操作的行
      loading: false,
      isDirty: false,

      // Para 编辑器
      paraEditorVisible: false,
      editingCondContent: '',
      editingCondId: '',
      paraEditor: null,
      paraEditorReady: false,
      paraEditorSaving: false,
      paraEditorId: `reqcond-para-editor-${Date.now()}`,

      // 引用对话框
      dmRefDialogVisible: false,
      pmRefDialogVisible: false,
      interrefDialogVisible: false,

      // 批量生成
      batchDialogVisible: false,
      batchText: '',

      // 表格列定义
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

    rowSelection() {
      return {
        type: 'radio',
        selectedRowKeys: this.selectedRow !== null ? [this.selectedRow] : [],
        onChange: (keys) => {
          this.selectedRow = keys[0] !== undefined ? keys[0] : null
          this.editingIndex = this.selectedRow
        }
      }
    }
  },

  watch: {
    conditions: {
      deep: true,
      handler() {
        this.isDirty = true
        this.$emit('change')
      }
    },
    conditionType() {
      this.isDirty = true
      this.$emit('change')
    }
  },

  beforeDestroy() {
    if (this.paraEditor) {
      try { this.paraEditor.destroy() } catch (e) {}
      this.paraEditor = null
    }
    if (window.$LEVELLEDPARA_DESIGNER_INSTANCES) {
      delete window.$LEVELLEDPARA_DESIGNER_INSTANCES[this.paraEditorId]
    }
  },

  methods: {
    // ══════════════════════════════════════════════════════
    // 对外接口（供父组件调用）
    // ══════════════════════════════════════════════════════

    /** 返回当前条件数量（用于父组件更新面板标题） */
    getCount() {
      return this.conditions.length
    },

    /** 数据校验，返回 true=校验通过 */
    validate() {
      if (this.conditionType === 1 && this.conditions.length === 0) {
        this.$message.warning('必要条件不能为空，请添加至少一条条件或选择"无必要条件"')
        return false
      }
      for (let i = 0; i < this.conditions.length; i++) {
        const cond = this.conditions[i]
        if (!cond.condDisplay || cond.condDisplay.trim() === '') {
          this.$message.warning(`第 ${i + 1} 行条件内容不能为空`)
          return false
        }
        if ((cond.condtype === 2 || cond.condtype === 3) && !cond.ref) {
          this.$message.warning(`第 ${i + 1} 行需要选择引用（${cond.condtype === 2 ? 'DM' : 'PM'}）`)
          return false
        }
      }
      return true
    },

    /** 生成 reqCondGroup XML 字符串 */
    async getSaveXml() {
      let xml = '<reqCondGroup>'

      if (this.conditionType === 0) {
        xml += '<noConds></noConds>'
      } else {
        for (const cond of this.conditions) {
          // 优先使用原始XML，降级使用显示文本
          const condContent = cond.condXml
            ? cond.condXml.replace(/<\/?para>/gi, '').trim()
            : (cond.condDisplay || '')
          const idAttr = cond.condId ? ` id="${cond.condId}"` : ''

          if (cond.condtype === 1) {
            xml += `<reqCondNoRef><reqCond${idAttr}>${condContent}</reqCond></reqCondNoRef>`
          } else if (cond.condtype === 2) {
            xml += `<reqCondDm><reqCond${idAttr}>${condContent}</reqCond>`
            if (cond.refData && cond.refData.xml) xml += cond.refData.xml
            xml += `</reqCondDm>`
          } else if (cond.condtype === 3) {
            xml += `<reqCondPm><reqCond${idAttr}>${condContent}</reqCond>`
            if (cond.refData && cond.refData.xml) xml += cond.refData.xml
            xml += `</reqCondPm>`
          } else if (cond.condtype === 4) {
            xml += `<reqCondExternalPub><reqCond${idAttr}>${condContent}</reqCond></reqCondExternalPub>`
          }
        }
      }

      xml += '</reqCondGroup>'
      return xml
    },

    /**
     * 从 reqCondGroup XML 加载数据（由父组件调用）
     * @param {string} reqCondGroupXml - 完整的 <reqCondGroup>...</reqCondGroup> XML 字符串
     */
    async loadFromXml(reqCondGroupXml) {
      if (!reqCondGroupXml || reqCondGroupXml.trim() === '') return

      this.loading = true
      try {
        const parser  = new DOMParser()
        const xmlDoc  = parser.parseFromString(reqCondGroupXml, 'text/xml')

        const parserError = xmlDoc.querySelector('parsererror')
        if (parserError) {
          console.error('reqCondGroup XML 解析错误:', parserError.textContent)
          this.$message.error('必要条件XML解析失败')
          return
        }

        // 检测无必要条件
        const noConds = xmlDoc.querySelector('noConds')
        if (noConds) {
          this.conditionType = 0
          this.conditions    = []
          this.isDirty       = false
          return
        }

        this.conditionType = 1
        this.conditions    = []

        // 解析无引用条件
        xmlDoc.querySelectorAll('reqCondNoRef').forEach(node => {
          const reqCond = node.querySelector('reqCond')
          if (reqCond) {
            this.conditions.push({
              condtype:    1,
              condId:      reqCond.getAttribute('id') || '',
              condXml:     `<para>${reqCond.innerHTML}</para>`,
              condDisplay: reqCond.innerHTML,
              ref:         '',
              refData:     null
            })
          }
        })

        // 解析 DM 引用条件
        xmlDoc.querySelectorAll('reqCondDm').forEach(node => {
          const reqCond = node.querySelector('reqCond')
          const dmRef   = node.querySelector('dmRef')
          if (reqCond) {
            const dmRefXml = dmRef ? new XMLSerializer().serializeToString(dmRef) : ''
            const dmc      = this._parseDmc(dmRefXml)
            this.conditions.push({
              condtype:    2,
              condId:      reqCond.getAttribute('id') || '',
              condXml:     `<para>${reqCond.innerHTML}</para>`,
              condDisplay: reqCond.innerHTML,
              ref:         dmc,
              refData:     dmRef ? { xml: dmRefXml, dmc } : null
            })
          }
        })

        // 解析 PM 引用条件
        xmlDoc.querySelectorAll('reqCondPm').forEach(node => {
          const reqCond = node.querySelector('reqCond')
          const pmRef   = node.querySelector('pmRef')
          if (reqCond) {
            const pmRefXml = pmRef ? new XMLSerializer().serializeToString(pmRef) : ''
            const pmc      = this._parsePmc(pmRefXml)
            this.conditions.push({
              condtype:    3,
              condId:      reqCond.getAttribute('id') || '',
              condXml:     `<para>${reqCond.innerHTML}</para>`,
              condDisplay: reqCond.innerHTML,
              ref:         pmc,
              refData:     pmRef ? { xml: pmRefXml, pmc } : null
            })
          }
        })

        // 解析外部出版物条件
        xmlDoc.querySelectorAll('reqCondExternalPub').forEach(node => {
          const reqCond = node.querySelector('reqCond')
          if (reqCond) {
            this.conditions.push({
              condtype:    4,
              condId:      reqCond.getAttribute('id') || '',
              condXml:     `<para>${reqCond.innerHTML}</para>`,
              condDisplay: reqCond.innerHTML,
              ref:         '',
              refData:     null
            })
          }
        })

        this.isDirty = false
      } catch (error) {
        console.error('加载reqCondGroup失败:', error)
        this.$message.error('加载必要条件失败: ' + error.message)
      } finally {
        this.loading = false
      }
    },

    // ══════════════════════════════════════════════════════
    // 条件增删移动
    // ══════════════════════════════════════════════════════

    handleAdd() {
      this.conditions.push({
        condtype: 1, condId: '', condXml: '', condDisplay: '', ref: '', refData: null
      })
      this.selectedRow  = this.conditions.length - 1
      this.editingIndex = this.selectedRow
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
          if (this.editingIndex === this.selectedRow) this.editingIndex = -1
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
      this.$set(this.conditions, this.selectedRow,     this.conditions[this.selectedRow - 1])
      this.$set(this.conditions, this.selectedRow - 1, temp)
      this.selectedRow--
    },

    handleMoveDown() {
      if (this.selectedRow === null || this.selectedRow === this.conditions.length - 1) {
        this.$message.warning('底行无法下移')
        return
      }
      const temp = this.conditions[this.selectedRow]
      this.$set(this.conditions, this.selectedRow,     this.conditions[this.selectedRow + 1])
      this.$set(this.conditions, this.selectedRow + 1, temp)
      this.selectedRow++
    },

    onConditionTypeChange(e) {
      if (e.target.value === 0 && this.conditions.length > 0) {
        this.$confirm({
          title: '确认',
          content: '切换到"无必要条件"将清空所有已添加的条件，确定要继续吗？',
          onOk: () => {
            this.conditions   = []
            this.editingIndex = -1
            this.selectedRow  = null
          },
          onCancel: () => {
            this.conditionType = 1
          }
        })
      }
    },

    // ══════════════════════════════════════════════════════
    // Para 编辑器
    // ══════════════════════════════════════════════════════

    async openParaEditor(index) {
      if (index < 0 || index >= this.conditions.length) return
      this.editingIndex       = index
      this.editingCondContent = this.conditions[index].condXml || ''
      this.editingCondId      = this.conditions[index].condId  || ''
      this.paraEditorVisible  = true

      await this.$nextTick()

      try {
        await loadUEditor()

        // 注册内部引用按钮（全局仅注册一次，与 CloseRqmtsDesigner 保持一致）
        if (!window.$REQCOND_CUSTOM_BUTTONS_REGISTERED) {
          window.$REQCOND_CUSTOM_BUTTONS_REGISTERED = true
          const UE = window.UE
          if (!window.$LEVELLEDPARA_CUSTOM_BUTTONS_REGISTERED) {
            UE.registerUI('interrefbutton', (editor, uiName) => {
              const btn = new UE.ui.Button({
                name: uiName,
                title: '内部引用',
                cssRules: 'background-position: -500px -0px;',
                onclick: () => {
                  const inst = window.$LEVELLEDPARA_DESIGNER_INSTANCES &&
                    window.$LEVELLEDPARA_DESIGNER_INSTANCES[editor.key]
                  if (inst && inst.$refs.interrefDialog) {
                    inst.$refs.interrefDialog.open()
                  }
                }
              })
              return btn
            }, 25)
          }
        }

        if (!window.$LEVELLEDPARA_DESIGNER_INSTANCES) {
          window.$LEVELLEDPARA_DESIGNER_INSTANCES = {}
        }
        window.$LEVELLEDPARA_DESIGNER_INSTANCES[this.paraEditorId] = this

        const config = getUEditorConfig({
          readonly: false,
          toolbars: [[
            'source', '|', 'undo', 'redo', '|',
            'removeformat', 'selectall', 'cleardoc', '|',
            'date', 'time', 'spechars', 'searchreplace', '|',
            'superscript', 'subscript', '|',
            'interrefbutton', 'symbolbutton'
          ]]
        })

        this.paraEditor      = window.UE.getEditor(this.paraEditorId, config)
        this.paraEditor.key  = this.paraEditorId

        this.paraEditor.ready(() => {
          this.paraEditorReady = true
          const content = this.editingCondContent
            ? this.editingCondContent.replace(/<\/?para>/gi, '').trim()
            : ''
          this.paraEditor.setContent(content)
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
        this.paraEditor      = null
        this.paraEditorReady = false
      }
      if (window.$LEVELLEDPARA_DESIGNER_INSTANCES) {
        delete window.$LEVELLEDPARA_DESIGNER_INSTANCES[this.paraEditorId]
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
      const xmlContent = rawHtml
        .replace(/<\/?p>/gi, '')
        .replace(/<br\s*\/?>/gi, '')
        .trim()
      if (this.editingIndex >= 0 && this.editingIndex < this.conditions.length) {
        this.conditions[this.editingIndex].condId      = this.editingCondId
        this.conditions[this.editingIndex].condXml     = `<para>${xmlContent}</para>`
        this.conditions[this.editingIndex].condDisplay = xmlContent
      }
      this.closeParaEditor()
    },

    insertInterref(xml) {
      if (this.paraEditor && this.paraEditorReady) {
        this.paraEditor.execCommand('inserthtml', xml)
      }
    },

    // ══════════════════════════════════════════════════════
    // 引用选择
    // ══════════════════════════════════════════════════════

    openRefSelector(index) {
      if (index < 0 || index >= this.conditions.length) return
      this.editingIndex = index
      const condtype = this.conditions[index].condtype
      if (condtype === 1) {
        this.$message.info('无引用类型不需要选择引用')
      } else if (condtype === 2) {
        this.dmRefDialogVisible = true
      } else if (condtype === 3) {
        this.pmRefDialogVisible = true
      } else if (condtype === 4) {
        this.$message.info('外部出版物类型当前版本不支持引用选择')
      }
    },

    onDmRefInsert(dmRefXml) {
      if (this.editingIndex >= 0 && this.editingIndex < this.conditions.length) {
        try {
          const dmc = this._parseDmc(dmRefXml)
          this.conditions[this.editingIndex].ref     = dmc
          this.conditions[this.editingIndex].refData = { xml: dmRefXml, dmc }
          this.$message.success('DM引用选择成功')
        } catch (error) {
          this.$message.error('解析DM引用失败: ' + error.message)
        }
      }
      this.dmRefDialogVisible = false
    },

    onPmRefOk(pmData) {
      if (this.editingIndex >= 0 && this.editingIndex < this.conditions.length) {
        this.conditions[this.editingIndex].ref     = pmData.pmc
        this.conditions[this.editingIndex].refData = pmData
      }
      this.pmRefDialogVisible = false
    },

    // ══════════════════════════════════════════════════════
    // 批量生成
    // ══════════════════════════════════════════════════════

    showBatchDialog() {
      this.batchText         = ''
      this.batchDialogVisible = true
    },

    handleBatchOk() {
      const lines = this.batchText.split('\n').filter(l => l.trim() !== '')
      if (lines.length === 0) {
        this.$message.warning('请输入至少一行条件文本')
        return
      }
      lines.forEach(text => {
        const t = text.trim()
        this.conditions.push({
          condtype:    1,
          condId:      '',
          condXml:     `<para>${this._escapeXml(t)}</para>`,
          condDisplay: t,
          ref:         '',
          refData:     null
        })
      })
      this.batchDialogVisible = false
      this.$message.success(`成功添加 ${lines.length} 条条件`)
    },

    // ══════════════════════════════════════════════════════
    // 私有工具方法
    // ══════════════════════════════════════════════════════

    getRefPlaceholder(condtype) {
      if (condtype === 1) return '无引用'
      if (condtype === 2) return '选择DM引用'
      if (condtype === 3) return '选择PM引用'
      if (condtype === 4) return '外部出版物（暂不支持）'
      return ''
    },

    /** 从 dmRef XML 字符串提取 DMC */
    _parseDmc(dmRefXml) {
      if (!dmRefXml) return ''
      try {
        const parser = new DOMParser()
        let xml = dmRefXml
        if (xml.includes('xlink:') && !xml.includes('xmlns:xlink')) {
          xml = xml.replace('<dmRef', '<dmRef xmlns:xlink="http://www.w3.org/1999/xlink"')
        }
        const doc  = parser.parseFromString(xml, 'text/xml')
        const code = doc.querySelector('dmCode')
        if (!code) return ''
        const f    = a => code.getAttribute(a) || ''
        const lang = doc.querySelector('language')
        const li   = lang ? (lang.getAttribute('languageIsoCode') || 'zh') : 'zh'
        const ci   = lang ? (lang.getAttribute('countryIsoCode')  || 'CN') : 'CN'
        return `DMC-${f('modelIdentCode')}-${f('systemDiffCode')}-${f('systemCode')}-${f('subSystemCode')}${f('subSubSystemCode')}-${f('assyCode')}${f('disassyCode')}-${f('disassyCodeVariant')}${f('infoCode')}${f('infoCodeVariant')}-${f('itemLocationCode')}_${li}-${ci}`
      } catch (e) {
        console.error('解析DMC失败:', e)
        return ''
      }
    },

    /** 从 pmRef XML 字符串提取 PMC */
    _parsePmc(pmRefXml) {
      if (!pmRefXml) return ''
      try {
        const parser = new DOMParser()
        const doc    = parser.parseFromString(pmRefXml, 'text/xml')
        const code   = doc.querySelector('pmCode')
        if (!code) return ''
        const f = a => code.getAttribute(a) || ''
        return `PMC-${f('modelIdentCode')}-${f('pmIssuer')}-${f('pmNumber')}-${f('pmVolume')}`
      } catch (e) {
        return ''
      }
    },

    _escapeXml(str) {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }
  }
}
</script>

<style lang="less" scoped>
.reqcond-group-designer {
  .condition-type-header {
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e8e8e8;
  }

  .list-toolbar {
    margin-bottom: 8px;
    display: flex;
    gap: 6px;
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
        font-size: 13px;

        /deep/ b      { font-weight: bold; }
        /deep/ i      { font-style: italic; }
        /deep/ u      { text-decoration: underline; }
        /deep/ strike { text-decoration: line-through; }
        /deep/ sub    { vertical-align: sub; font-size: smaller; }
        /deep/ sup    { vertical-align: super; font-size: smaller; }
      }
    }

    .ref-cell {
      display: flex;
      gap: 4px;
      align-items: center;
    }

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

/* kityformula 插件按钮隐藏 */
.para-editor-wrapper {
  /deep/ [class*="kityformula"] {
    display: none !important;
  }
}

.para-editor-id-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;

  .para-editor-id-label {
    margin-right: 4px;
    font-size: 13px;
    white-space: nowrap;
  }

  .para-editor-id-input {
    width: 200px;
  }
}
</style>
