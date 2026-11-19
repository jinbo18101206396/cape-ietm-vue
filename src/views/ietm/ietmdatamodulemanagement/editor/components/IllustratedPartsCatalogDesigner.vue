<template>
  <div class="ipc-designer">
    <!-- 顶部工具栏 -->
    <div class="ipc-toolbar">
      <span class="toolbar-title">图解零部件</span>
      <a-button
        v-if="!readonly"
        type="primary"
        size="small"
        :loading="saving"
        @click="handleSave"
        style="margin-left: auto;"
      >
        <a-icon type="save" />保存
      </a-button>
    </div>

    <!-- 主体区域：三Tab布局 -->
    <a-tabs v-model="activeTabKey" class="ipc-tabs" :animated="false">
      <!-- Tab 1: 插图（左插图 + 右目录列表） -->
      <a-tab-pane key="figure" tab="插图">
        <a-layout class="figure-layout">
          <!-- 左侧：Figure设计器（内含左侧表单 + 右侧预览） -->
          <a-layout-content class="figure-content">
            <FigureDesigner
              ref="figureDesigner"
              :lineno="figureLineno"
              :editor="editor"
              :locale="locale"
              :cmnodeid="cmnodeid"
              :ifedit="ifedit"
              :save="'0'"
            />
          </a-layout-content>

          <!-- 右侧：目录列表 -->
          <a-layout-sider width="800" class="catalog-sider" theme="light">
            <CatalogDesigner
              ref="catalogDesigner"
              :catalogs="catalogs"
              :columns="catalogColumns"
              :readonly="readonly"
            />
          </a-layout-sider>
        </a-layout>
      </a-tab-pane>

      <!-- Tab 2: 多媒体 -->
      <a-tab-pane key="multimedia" tab="多媒体">
        <MultimediaDesigner
          ref="multimediaDesigner"
          :lineno="multimediaLineno"
          :editor="editor"
          :locale="locale"
          :cmnodeid="cmnodeid"
          :ifedit="ifedit"
          :save="'0'"
        />
      </a-tab-pane>

      <!-- Tab 3: 其它（只读字段） -->
      <a-tab-pane key="other" tab="其它">
        <div class="other-panel">
          <a-form :label-col="{span: 4}" :wrapper-col="{span: 18}">
            <a-form-item label="Initial Provisioning Project">
              <a-input v-model="initialProvisioningProject" :readonly="readonly" />
            </a-form-item>
            <a-form-item label="Zone Group">
              <a-input v-model="zoneGroup" :readonly="readonly" />
            </a-form-item>
          </a-form>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script>
import FigureDesigner from './FigureDesigner.vue'
import MultimediaDesigner from './MultimediaDesigner.vue'
import CatalogDesigner from './CatalogDesigner.vue'
// getAction/postAction 已移除（后端接口不存在，直接用前端默认配置）

export default {
  name: 'IllustratedPartsCatalogDesigner',
  components: {
    FigureDesigner,
    MultimediaDesigner,
    CatalogDesigner
  },
  inject: ['getLocaleName', 'toEnXml', 'toCnXml', 'formateXml', 'getDesignerSett'],
  props: {
    lineno: {
      type: Number,
      required: true
    },
    editor: {
      type: Object,
      required: true
    },
    locale: {
      type: String,
      default: 'en'
    },
    cmnodeid: {
      type: String,
      default: ''
    },
    ifedit: {
      type: String,
      default: '1'
    },
    save: {
      type: String,
      default: '1'
    },
    ietmstandard: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      activeTabKey: 'figure',
      saving: false,
      endline: -1,
      figureLineno: -1,
      multimediaLineno: -1,
      catalogs: [],
      catalogColumns: [],
      savingXmlTemplate: '',
      initialProvisioningProject: '',
      zoneGroup: ''
    }
  },
  computed: {
    readonly() {
      return this.ifedit === '0'
    }
  },
  async mounted() {
    // 先等列配置加载完毕，再解析XML行数据（_parseCatalogRows 依赖 catalogColumns）
    await this.loadCatalogColumns()
    this.loadContent()
    this.loadSavingTemplate()
  },
  methods: {
    /**
     * 加载IPC内容
     */
    loadContent() {
      const cm = this.editor
      if (!cm) return

      const ipc_ = this.getLocaleName('illustratedPartsCatalog')
      const ipcLine = cm.getLine(this.lineno)

      // 1. 确定endline（支持自闭合标签）
      if (ipcLine.trim().endsWith('/>')) {
        this.endline = this.lineno
      } else if (ipcLine.includes('<' + ipc_) && ipcLine.includes('</' + ipc_ + '>')) {
        this.endline = this.lineno
      } else {
        const closeTag = '</' + ipc_ + '>'
        for (let i = this.lineno + 1; i < cm.lineCount(); i++) {
          if (cm.getLine(i).includes(closeTag)) {
            this.endline = i
            break
          }
        }
      }

      if (this.endline < 0) {
        this.$message.error('找不到illustratedPartsCatalog结束标签')
        return
      }

      // 2. 提取XML内容
      let xmlContent = ''
      for (let i = this.lineno; i <= this.endline; i++) {
        xmlContent += cm.getLine(i) + '\n'
      }

      // 3. 解析XML
      this.parseIpcXml(xmlContent)
    },

    /**
     * 加载列配置
     */
    async loadCatalogColumns() {
      // 优先级1：从designerSett读取
      const designerSett = this.getDesignerSett()
      const standard = this.ietmstandard.toLowerCase()
      let columns = null

      if (designerSett && designerSett[standard]) {
        columns = designerSett[standard].catalogColumns || designerSett[standard].columns
      }

      // 优先级2：硬编码默认配置
      if (!columns) {
        columns = this._getDefaultColumns()
      }

      // 注释掉自动添加locationRcmdSegment列的逻辑，使用旧版系统的标准8列配置
      // const hasLocationCol = columns.some(col => col.elem === 'locationRcmdSegment')
      // if (!hasLocationCol) {
      //   columns.push({
      //     title: '位置推荐',
      //     elem: 'locationRcmdSegment',
      //     attr: '',
      //     width: 150,
      //     field: 'locationRcmdSegment_',
      //     editor: 'text'
      //   })
      // }

      this.catalogColumns = columns
    },

    /**
     * 加载保存用XML模板
     */
    async loadSavingTemplate() {
      // 模板机制已废弃，改为 generateCatalogXml 直接拼接
    },

    /**
     * 解析IPC XML
     */
    parseIpcXml(xmlStr) {
      const parser = new DOMParser()
      // xlink命名空间处理
      xmlStr = xmlStr.replace(/xlink:/g, 'xlink_')
      const doc = parser.parseFromString(xmlStr, 'text/xml')
      const ipcRoot = doc.documentElement

      if (!ipcRoot || ipcRoot.nodeName === 'parsererror') {
        this.$message.error('XML解析失败')
        return
      }

      // 1. 查找figure和multimedia行号
      this._findLineInEditor('figure')
      this._findLineInEditor('multimedia')

      // 2. 解析目录行
      this._parseCatalogRows(ipcRoot)

      // 3. 解析其它字段
      const ippNode = ipcRoot.querySelector('initialProvisioningProject')
      if (ippNode) {
        this.initialProvisioningProject = this._extractValue(ippNode, '', '')
      }

      const zgNode = ipcRoot.querySelector('zoneGroup')
      if (zgNode) {
        this.zoneGroup = this._extractValue(zgNode, '', '')
      }
    },

    /**
     * 在编辑器中查找元素行号
     */
    _findLineInEditor(elemName) {
      const cm = this.editor
      const localName = this.getLocaleName(elemName)
      const openTag = '<' + localName
      const fieldName = elemName + 'Lineno'

      for (let i = this.lineno; i <= this.endline; i++) {
        if (cm.getLine(i).includes(openTag)) {
          this[fieldName] = i
          return
        }
      }
    },

    /**
     * 解析目录行数据
     */
    _parseCatalogRows(ipcRoot) {
      const catalogSeqNodes = ipcRoot.querySelectorAll('catalogSeqNumber')
      const rows = []

      catalogSeqNodes.forEach(csNode => {
        // 获取catalogSeqNumber的属性值
        const catalogItemNumber = csNode.getAttribute('catalogItemNumber') || ''
        const indenture = csNode.getAttribute('indenture') || ''

        const itemNodes = csNode.querySelectorAll('itemSequenceNumber')
        if (itemNodes.length === 0) return

        itemNodes.forEach(itemNode => {
          const row = {}
          // 先添加catalogSeqNumber的属性
          row['catalogSeqNumber_catalogItemNumber'] = catalogItemNumber
          row['catalogSeqNumber_indenture'] = indenture

          // 提取itemSequenceNumber的属性
          const itemSeqNumberValue = itemNode.getAttribute('itemSeqNumberValue') || ''
          row['itemSequenceNumber_itemSeqNumberValue'] = itemSeqNumberValue

          // 再提取itemSequenceNumber下的其他字段
          this.catalogColumns.forEach(col => {
            // 如果字段已经被设置（catalogSeqNumber或itemSequenceNumber的属性），跳过
            if (row[col.field] !== undefined) return
            row[col.field] = this._extractValue(itemNode, col.elem, col.attr)
          })
          rows.push(row)
        })
      })

      this.catalogs = rows
    },

    /**
     * 提取节点值（支持嵌套路径）
     */
    _extractValue(parentNode, elemPath, attrName) {
      if (!elemPath) return ''

      const parts = elemPath.split('/')
      let current = parentNode

      for (const part of parts) {
        const child = current.querySelector(part)
        if (!child) return ''
        current = child
      }

      if (attrName && attrName.trim() !== '') {
        return current.getAttribute(attrName) || ''
      } else {
        return current.textContent || ''
      }
    },

    /**
     * 保存按钮
     */
    async handleSave() {
      this.saving = true
      try {
        // 1. 获取最新目录数据
        const catalogData = this.$refs.catalogDesigner.getCatalogs()

        // 2. 生成catalog XML
        const catalogXml = this.generateCatalogXml(catalogData)

        // 3. 获取figure和multimedia XML
        let figureXml = ''
        let multimediaXml = ''

        if (this.$refs.figureDesigner && this.$refs.figureDesigner.generateFigureXml) {
          figureXml = await this.$refs.figureDesigner.generateFigureXml()
        }

        if (this.$refs.multimediaDesigner && this.$refs.multimediaDesigner.generateMultimediaXml) {
          multimediaXml = await this.$refs.multimediaDesigner.generateMultimediaXml()
        }

        // 4. 组装完整IPC XML
        const ipc_ = this.getLocaleName('illustratedPartsCatalog')
        let finalXml = `<${ipc_}>\n`

        if (figureXml) {
          finalXml += figureXml + '\n'
        }
        if (multimediaXml) {
          finalXml += multimediaXml + '\n'
        }

        finalXml += catalogXml

        if (this.initialProvisioningProject) {
          const ipp_ = this.getLocaleName('initialProvisioningProject')
          finalXml += `<${ipp_}>${this._esc(this.initialProvisioningProject)}</${ipp_}>\n`
        }

        if (this.zoneGroup) {
          const zg_ = this.getLocaleName('zoneGroup')
          finalXml += `<${zg_}>${this._esc(this.zoneGroup)}</${zg_}>\n`
        }

        finalXml += `</${ipc_}>`

        // 5. 格式化（调用inject的formateXml），传入<illustratedPartsCatalog>所在行的基础缩进
        const ipcLine = this.editor.getLine(this.lineno)
        const indentMatch = ipcLine.match(/^(\s*)/)
        const baseIndent = indentMatch ? indentMatch[1].length : 0
        const formatted = await this.formateXml(finalXml, baseIndent)

        // 6. 清理样式标记
        const cleaned = this._cleanupViewStyles(formatted)

        // 7. 写回编辑器
        const cm = this.editor
        cm.replaceRange(cleaned, { line: this.lineno, ch: 0 }, { line: this.endline + 1, ch: 0 })

        this.$message.success('保存成功')
        this.$emit('save')
      } catch (err) {
        console.error('保存失败', err)
        this.$message.error('保存失败：' + err.message)
      } finally {
        this.saving = false
      }
    },

    /**
     * 生成catalog XML（每行一个catalogSeqNumber）
     * S1000D 4.0 IPD schema 要求 itemSequenceNumber 的元素顺序（ipd.xsd:4360-4376）：
     * 1. reasonForSelection (可选)
     * 2. quantityPerNextHigherAssy (必须)
     * 3. manufacturerCode (必须，直接子元素)
     * 4. partNumber (必须)
     * 5. partIdentSegment (可选，可多个)
     * 6. 其他元素...
     */
    generateCatalogXml(catalogData) {
      if (!catalogData || catalogData.length === 0) return ''

      const cs_ = this.getLocaleName('catalogSeqNumber')
      const isn_ = this.getLocaleName('itemSequenceNumber')
      let xml = ''

      catalogData.forEach(row => {
        // A类：catalogSeqNumber 属性
        const csAttrs = this.catalogColumns
          .filter(col => col.elem === 'catalogSeqNumber' && col.attr)
          .map(col => `${col.attr}="${this._esc(row[col.field] || '')}"`)
          .join(' ')

        // B类：itemSequenceNumber 属性
        const isnAttrs = this.catalogColumns
          .filter(col => col.elem === 'itemSequenceNumber' && col.attr)
          .map(col => `${col.attr}="${this._esc(row[col.field] || '')}"`)
          .join(' ')

        const csOpen = csAttrs ? `<${cs_} ${csAttrs}>` : `<${cs_}>`
        const isnOpen = isnAttrs ? `  <${isn_} ${isnAttrs}>` : `  <${isn_}>`

        xml += `${csOpen}\n${isnOpen}\n`

        // 按照 S1000D 4.0 schema 强制顺序生成子元素
        // 1. reasonForSelection (可选，当前版本不支持)

        // 2. quantityPerNextHigherAssy (必须)
        const qtyCol = this.catalogColumns.find(c => c.elem === 'quantityPerNextHigherAssy')
        if (qtyCol) {
          const qtyValue = row[qtyCol.field] || ''
          const qtyTag = this.getLocaleName('quantityPerNextHigherAssy')
          xml += `    <${qtyTag}>${this._esc(qtyValue)}</${qtyTag}>\n`
        }

        // 3. manufacturerCode (必须，直接子元素)
        const mfrCol = this.catalogColumns.find(c => c.elem === 'manufacturerCode')
        if (mfrCol) {
          const mfrValue = row[mfrCol.field] || ''
          const mfrTag = this.getLocaleName('manufacturerCode')
          xml += `    <${mfrTag}>${this._esc(mfrValue)}</${mfrTag}>\n`
        }

        // 4. partNumber (必须，文本内容)
        const partCol = this.catalogColumns.find(c => c.elem === 'partNumber')
        if (partCol) {
          const partValue = row[partCol.field] || ''
          const partTag = this.getLocaleName('partNumber')
          xml += `    <${partTag}>${this._esc(partValue)}</${partTag}>\n`
        }

        // 5. partIdentSegment (可选)
        const descrCol = this.catalogColumns.find(c => c.elem === 'partIdentSegment/descrForPart')
        if (descrCol) {
          const descrValue = row[descrCol.field] || ''
          const pis_ = this.getLocaleName('partIdentSegment')
          const descrTag = this.getLocaleName('descrForPart')
          xml += `    <${pis_}>\n`
          xml += `      <${descrTag}>${this._esc(descrValue)}</${descrTag}>\n`
          xml += `    </${pis_}>\n`
        }

        // 6. locationRcmdSegment (必须，含嵌套结构)
        // 检查是否有配置 service 字段（单位字段映射到 service）
        const serviceCol = this.catalogColumns.find(c => c.elem === 'locationRcmdSegment/locationRcmd/service')
        const serviceValue = serviceCol ? (row[serviceCol.field] || '') : ''

        const lrsTag = this.getLocaleName('locationRcmdSegment')
        const lrTag = this.getLocaleName('locationRcmd')
        const serviceTag = this.getLocaleName('service')
        const smrTag = this.getLocaleName('sourceMaintRecoverability')
        xml += `    <${lrsTag}>\n`
        xml += `      <${lrTag}>\n`
        xml += `        <${serviceTag}>${this._esc(serviceValue)}</${serviceTag}>\n`
        xml += `        <${smrTag}></${smrTag}>\n`
        xml += `      </${lrTag}>\n`
        xml += `    </${lrsTag}>\n`

        // 7. 其他可选元素（按schema顺序）
        const otherOrder = ['natoStockNumber', 'partLocationSegment', 'applicabilitySegment',
                           'categoryOneContainerLocation',
                           'referenceDesignator', 'ilsNumber', 'changeAuthorityNumber',
                           'genericPartDataGroup']

        otherOrder.forEach(elemName => {
          const col = this.catalogColumns.find(c => c.elem === elemName)
          if (col) {
            const value = row[col.field] || ''
            if (value) {
              const tag = this.getLocaleName(elemName)
              if (col.attr) {
                xml += `    <${tag} ${col.attr}="${this._esc(value)}"/>\n`
              } else {
                xml += `    <${tag}>${this._esc(value)}</${tag}>\n`
              }
            }
          }
        })

        // 移除原有的兜底逻辑（locationRcmdSegment 已在上方统一生成）
        const hasLocationRcmd_deprecated = false
        if (hasLocationRcmd_deprecated) {
          const lrsTag = this.getLocaleName('locationRcmdSegment')
          const lrTag = this.getLocaleName('locationRcmd')
          const serviceTag = this.getLocaleName('service')
          const smrTag = this.getLocaleName('sourceMaintRecoverability')
          xml += `    <${lrsTag}>\n`
          xml += `      <${lrTag}>\n`
          xml += `        <${serviceTag}></${serviceTag}>\n`
          xml += `        <${smrTag}></${smrTag}>\n`
          xml += `      </${lrTag}>\n`
          xml += `    </${lrsTag}>\n`
        }

        xml += `  </${isn_}>\n</${cs_}>\n`
      })

      return xml
    },

    /**
     * 兜底：手动构建行XML
     */
    _buildRowXmlFallback(row, hasLocationCol) {
      const cs_ = this.getLocaleName('catalogSeqNumber')
      const isn_ = this.getLocaleName('itemSequenceNumber')

      let xml = `<${cs_}>\n`
      xml += `  <${isn_}>\n`

      this.catalogColumns.forEach(col => {
        const value = row[col.field] || ''
        if (!value) return
        xml += this._buildChildXml(col.elem, col.attr, value, 2)
      })

      xml += `  </${isn_}>\n`
      xml += `</${cs_}>`
      return xml
    },

    /**
     * 递归构建子元素XML
     */
    _buildChildXml(elemPath, attrName, value, indentLevel) {
      const indent = '  '.repeat(indentLevel)
      const parts = elemPath.split('/')
      const localNames = parts.map(p => this.getLocaleName(p))

      if (parts.length === 1) {
        const tag = localNames[0]
        if (attrName && attrName.trim() !== '') {
          return `${indent}<${tag} ${attrName}="${this._esc(value)}"/>\n`
        } else {
          return `${indent}<${tag}>${this._esc(value)}</${tag}>\n`
        }
      } else {
        // 嵌套路径
        let xml = ''
        for (let i = 0; i < parts.length - 1; i++) {
          xml += '  '.repeat(indentLevel + i) + `<${localNames[i]}>\n`
        }
        const lastTag = localNames[parts.length - 1]
        if (attrName && attrName.trim() !== '') {
          xml += '  '.repeat(indentLevel + parts.length - 1) + `<${lastTag} ${attrName}="${this._esc(value)}"/>\n`
        } else {
          xml += '  '.repeat(indentLevel + parts.length - 1) + `<${lastTag}>${this._esc(value)}</${lastTag}>\n`
        }
        for (let i = parts.length - 2; i >= 0; i--) {
          xml += '  '.repeat(indentLevel + i) + `</${localNames[i]}>\n`
        }
        return xml
      }
    },

    /**
     * XML转义
     */
    _esc(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    },

    /**
     * 清理视图样式标记
     */
    _cleanupViewStyles(xml) {
      return xml
        .replace(/ ?style="[^"]*"/g, '')
        .replace(/ ?class="[^"]*"/g, '')
        .replace(/ ?data-view="[^"]*"/g, '')
    },

    /**
     * 默认列配置（8列）- 符合 S1000D 4.0 schema
     * 修复：elem 和 attr 必须与 generateCatalogXml 生成的实际 XML 结构一致
     */
    _getDefaultColumns() {
      return [
        { title: '目录号', elem: 'catalogSeqNumber', attr: 'catalogItemNumber', width: 100, field: 'catalogSeqNumber_catalogItemNumber', editor: 'text' },
        { title: '条目顺序码', elem: 'itemSequenceNumber', attr: 'itemSeqNumberValue', width: 100, field: 'itemSequenceNumber_itemSeqNumberValue', editor: 'text' },
        { title: '数量', elem: 'quantityPerNextHigherAssy', attr: '', width: 80, field: 'quantityPerNextHigherAssy_', editor: 'number' },
        { title: '厂商码', elem: 'manufacturerCode', attr: '', width: 150, field: 'manufacturerCode_', editor: 'text' },
        { title: '部件码', elem: 'partNumber', attr: '', width: 120, field: 'partNumber_', editor: 'text' },
        { title: '层级', elem: 'catalogSeqNumber', attr: 'indenture', width: 80, field: 'catalogSeqNumber_indenture', editor: 'text' },
        { title: '名称', elem: 'partIdentSegment/descrForPart', attr: '', width: 200, field: 'partIdentSegment_descrForPart_', editor: 'text' },
        { title: '单位', elem: 'locationRcmdSegment/locationRcmd/service', attr: '', width: 80, field: 'locationRcmdSegment_locationRcmd_service_', editor: 'text' }
      ]
    },

    /**
     * 前端兜底模板（已废弃，模板机制由 generateCatalogXml 直接拼接取代）
     */
    _buildFallbackTemplate() {
      return ''
    }
  }
}
</script>

<style scoped>
.ipc-designer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.ipc-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: linear-gradient(to bottom, #fafafa 0%, #f0f0f0 100%);
  flex-shrink: 0;
  min-height: 40px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.toolbar-title {
  font-weight: 600;
  font-size: 14px;
  color: #1890ff;
  font-family: 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  letter-spacing: 0.5px;
}

.ipc-tabs {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ipc-tabs >>> .ant-tabs-bar {
  margin-bottom: 0;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  flex-shrink: 0;
}

.ipc-tabs >>> .ant-tabs-content {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.ipc-tabs >>> .ant-tabs-content > .ant-tabs-tabpane {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ipc-tabs >>> .ant-tabs-content > .ant-tabs-tabpane:not(.ant-tabs-tabpane-active) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  visibility: hidden;
  pointer-events: none;
}

.figure-layout {
  height: 100%;
  flex: 1;
  display: flex;
  min-height: 0;
}

.figure-content {
  flex: 1;
  overflow: auto;
  background: #fff;
  min-height: 0;
}

.catalog-sider {
  border-left: 2px solid #e8e8e8;
  height: 100%;
  overflow: hidden;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.03);
}

.other-panel {
  padding: 24px;
  background: #fafafa;
  min-height: 100%;
}

.other-panel .ant-form-item {
  margin-bottom: 16px;
}
</style>

