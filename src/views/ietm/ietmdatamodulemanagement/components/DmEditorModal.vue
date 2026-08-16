<template>
  <a-modal
    title="DM内容编辑器"
    :width="1400"
    :visible="visible"
    :confirmLoading="saving"
    :maskClosable="false"
    @ok="handleSave"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <!-- 工具栏 -->
      <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <a-space>
          <a-button size="small" icon="check" @click="handleValidate" :loading="validating">
            校验XML
          </a-button>
          <a-button size="small" icon="format-painter" @click="handleFormat">
            格式化
          </a-button>
          <a-button size="small" icon="undo" @click="handleUndo">
            撤销
          </a-button>
          <a-button size="small" icon="redo" @click="handleRedo">
            重做
          </a-button>
          <a-divider type="vertical" />
          <a-button size="small" icon="save" @click="handleSave" type="primary" :loading="saving">
            保存
          </a-button>
          <a-button size="small" icon="reload" @click="handleReset">
            重置
          </a-button>
        </a-space>

        <!-- 校验结果 -->
        <div v-if="validateResult">
          <a-tag v-if="validateResult.valid" color="green">
            <a-icon type="check-circle" /> {{ validateResult.message }}
          </a-tag>
          <a-tag v-else color="red">
            <a-icon type="close-circle" /> {{ validateResult.message }}
          </a-tag>
        </div>
      </div>

      <!-- Monaco Editor -->
      <monaco-editor
        ref="editor"
        v-model="content"
        language="xml"
        theme="vs"
        :height="600"
        :options="editorOptions"
        @change="handleContentChange"
      />

      <!-- 状态栏 -->
      <div style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; display: flex; justify-content: space-between; font-size: 12px; color: #666;">
        <span>
          <a-icon type="file-text" /> DMC: {{ dmcCode || '未知' }}
        </span>
        <span>
          <a-icon type="edit" /> 字符数: {{ contentLength }}
        </span>
        <span v-if="isModified">
          <a-icon type="warning" style="color: orange;" /> 内容已修改，未保存
        </span>
        <span v-else style="color: green;">
          <a-icon type="check-circle" /> 已保存
        </span>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import MonacoEditor from '@/components/MonacoEditor'
import { getAction, putAction, postAction } from '@/api/manage'

export default {
  name: 'DmEditorModal',
  components: {
    MonacoEditor
  },
  data() {
    return {
      visible: false,
      loading: false,
      saving: false,
      validating: false,
      dmId: '',
      dmcCode: '',
      currentRecord: null,
      content: '',
      originalContent: '',
      validateResult: null,
      isModified: false,
      autoSaveTimer: null,
      editorOptions: {
        automaticLayout: true,
        fontSize: 14,
        minimap: {
          enabled: true
        },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'always'
      }
    }
  },
  computed: {
    contentLength() {
      return this.content ? this.content.length : 0
    }
  },
  methods: {
    show(record) {
      this.visible = true
      this.dmId = record.id
      this.currentRecord = record // 保存完整 record，供 generateDefaultXml 使用
      this.dmcCode = record.dmcCode || this.generateDmcCode(record)
      this.validateResult = null
      this.isModified = false
      this.loadContent()
    },

    loadContent() {
      this.loading = true
      getAction('/ietm/datamodule/queryById', { id: this.dmId }).then(res => {
        if (res.success) {
          this.content = res.result.dmContent || this.generateDefaultXml()
          this.originalContent = this.content
        } else {
          this.$message.error(res.message || '加载DM内容失败')
        }
      }).catch(err => {
        console.error('加载DM内容失败', err)
        this.$message.error('加载DM内容失败')
      }).finally(() => {
        this.loading = false
      })
    },

    // JS 版 DmcUtils.decomposeSns()：将 SNS 字符串拆解为 <dmCode> 的8个XML属性
    // 对标后端 DmcUtils.decomposeSns()，保证前后端拆解逻辑一致
    _decomposeSns(sns) {
      const parts = (sns || '').split('-')
      const seg3 = parts[3] || '0'
      const seg5 = parts[5] || '00'
      return {
        modelIdentCode: parts[0] || '',
        systemDiffCode: parts[1] || 'A',
        systemCode: parts[2] || '00',
        subSystemCode: seg3.substring(0, 1) || '0',
        subSubSystemCode: seg3.length > 1 ? seg3.substring(1) : '0',
        assyCode: parts[4] || '00',
        disassyCode: seg5.substring(0, 2) || '00',
        disassyCodeVariant: seg5.length > 2 ? seg5.substring(2) : 'A'
      }
    },

    // BUG-1修复：生成符合S1000D标准的默认XML（<dmCode>使用XML属性格式，与后端generateS1000DXml一致）
    generateDefaultXml() {
      const r = this.currentRecord || {}
      const seg = this._decomposeSns(r.sns || '')
      const modelIdentCode = seg.modelIdentCode || 'AA'
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')

      const dmCodeAttrs = [
        `modelIdentCode="${modelIdentCode}"`,
        `systemDiffCode="${seg.systemDiffCode}"`,
        `systemCode="${seg.systemCode}"`,
        `subSystemCode="${seg.subSystemCode}"`,
        `subSubSystemCode="${seg.subSubSystemCode || '0'}"`,
        `assyCode="${seg.assyCode}"`,
        `disassyCode="${seg.disassyCode}"`,
        `disassyCodeVariant="${seg.disassyCodeVariant || 'A'}"`,
        `infoCode="${r.infoCode || ''}"`,
        // infoCodeVariant 空时输出空属性，不补A——对齐后端 generateS1000DXml 的 nvl(..,"")
        `infoCodeVariant="${r.infoCodeVariant || ''}"`,
        `itemLocationCode="${r.ietmLocationCode || 'A'}"`
      ].join(' ')

      return `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode ${dmCodeAttrs}/>
        <language languageIsoCode="${r.languageIsoCode || 'zh'}" countryIsoCode="${r.countryIsoCode || 'CN'}"/>
        <issueInfo issueNumber="${r.issueNo || '001'}" inWork="${r.inWork || '00'}"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="${year}" month="${month}" day="${day}"/>
        <dmTitle>
          <techName>${r.techName || ''}</techName>
          <infoName>${r.infoName || ''}</infoName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="${r.security || '01'}"/>
      <responsiblePartnerCompany>
        <enterpriseName>${r.rpcName || ''}</enterpriseName>
      </responsiblePartnerCompany>
      <originator>
        <enterpriseName>${r.originatorName || ''}</enterpriseName>
      </originator>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <para>${r.infoName || '数据模块内容'}</para>
    </description>
  </content>
</dmodule>`
    },

    // 逐字符对标老系统 getDmc() 及后端 generateDmc()（纯S1000D缩略标识+文件名后缀）：
    // DMC-{sns}-{infoCode}{infoCodeVariant}-{itemLocationCode}_{issueNo}-{inWork}_{lang}-{country}
    generateDmcCode(record) {
      const r = record || {}
      const sns = r.sns || ''
      const infoCode = (r.infoCode || '') + (r.infoCodeVariant || '')
      const loc = r.ietmLocationCode || 'A'
      const issueBlock = (r.issueNo || '001') + '-' + (r.inWork || '00')
      const langBlock = (r.languageIsoCode || 'zh') + '-' + (r.countryIsoCode || 'CN')
      return `DMC-${sns}-${infoCode}-${loc}_${issueBlock}_${langBlock}`
    },

    handleContentChange(value) {
      this.isModified = this.content !== this.originalContent
      this.validateResult = null

      // 清除之前的自动保存定时器
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer)
      }

      // 设置新的自动保存定时器（30秒无操作后自动保存，降低服务器压力）
      this.autoSaveTimer = setTimeout(() => {
        if (this.isModified) {
          this.handleAutoSave()
        }
      }, 30000)
    },

    handleValidate() {
      if (!this.content || this.content.trim() === '') {
        this.$message.warning('内容为空，无法校验')
        return
      }

      this.validating = true
      postAction('/ietm/datamodule/validateContent', {
        id: this.dmId,
        content: this.content
      }).then(res => {
        if (res.success) {
          this.validateResult = {
            valid: res.result.valid,
            message: res.result.message || (res.result.valid ? 'XML格式校验通过' : 'XML格式校验失败')
          }
          if (res.result.valid) {
            this.$message.success('XML格式校验通过')
          } else {
            this.$message.error(res.result.message || 'XML格式校验失败')
          }
        } else {
          this.validateResult = {
            valid: false,
            message: res.message || 'XML格式校验失败'
          }
          this.$message.error(res.message || 'XML格式校验失败')
        }
      }).catch(err => {
        console.error('XML校验失败', err)
        // 前端简单校验
        this.validateXmlLocally()
      }).finally(() => {
        this.validating = false
      })
    },

    validateXmlLocally() {
      try {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(this.content, 'text/xml')
        const parseError = xmlDoc.getElementsByTagName('parsererror')

        if (parseError.length > 0) {
          this.validateResult = {
            valid: false,
            message: 'XML格式错误：' + parseError[0].textContent
          }
          this.$message.error('XML格式错误')
        } else {
          this.validateResult = {
            valid: true,
            message: 'XML基本格式正确'
          }
          this.$message.success('XML基本格式正确')
        }
      } catch (err) {
        this.validateResult = {
          valid: false,
          message: 'XML格式错误：' + err.message
        }
        this.$message.error('XML格式错误')
      }
    },

    handleFormat() {
      if (this.$refs.editor) {
        this.$refs.editor.format()
        this.$message.success('格式化成功')
      }
    },

    handleUndo() {
      if (this.$refs.editor) {
        this.$refs.editor.undo()
      }
    },

    handleRedo() {
      if (this.$refs.editor) {
        this.$refs.editor.redo()
      }
    },

    handleReset() {
      this.$confirm({
        title: '确认重置',
        content: '重置后将丢失所有未保存的修改，确定要重置吗？',
        onOk: () => {
          this.content = this.originalContent
          this.isModified = false
          this.validateResult = null
          this.$message.success('已重置到最后保存的内容')
        }
      })
    },

    handleAutoSave() {
      if (!this.isModified) return

      // 大文件保护：内容超过 500KB 时禁用自动保存，避免频繁大请求
      const contentSize = new Blob([this.content]).size
      const MAX_AUTO_SAVE_SIZE = 512 * 1024 // 512KB

      if (contentSize > MAX_AUTO_SAVE_SIZE) {
        return
      }

      this.doSave(true)
    },

    handleSave() {
      this.doSave(false)
    },

    doSave(isAutoSave = false) {
      if (!this.content || this.content.trim() === '') {
        if (!isAutoSave) {
          this.$message.warning('内容为空，无法保存')
        }
        return
      }

      this.saving = true
      putAction('/ietm/datamodule/edit', {
        id: this.dmId,
        dmContent: this.content
      }).then(res => {
        if (res.success) {
          if (!isAutoSave) {
            this.$message.success('保存成功')
          }
          this.originalContent = this.content
          this.isModified = false
          if (!isAutoSave) {
            this.$emit('ok')
            this.visible = false
          }
        } else {
          this.$message.error(res.message || '保存失败')
        }
      }).catch(err => {
        console.error('保存失败', err)
        if (!isAutoSave) {
          this.$message.error('保存失败')
        }
      }).finally(() => {
        this.saving = false
      })
    },

    handleCancel() {
      if (this.isModified) {
        this.$confirm({
          title: '确认关闭',
          content: '内容已修改但未保存，确定要关闭吗？',
          onOk: () => {
            this.closeModal()
          }
        })
      } else {
        this.closeModal()
      }
    },

    closeModal() {
      this.visible = false
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer)
        this.autoSaveTimer = null
      }
      // 重置所有状态，防止下次打开时展示旧内容
      this.content = ''
      this.originalContent = ''
      this.dmId = ''
      this.currentRecord = null
      this.isModified = false
      this.validateResult = null
    }
  },

  beforeDestroy() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
  }
}
</script>

<style scoped>
/* Monaco Editor全局样式已在组件内处理 */
</style>
