<template>
  <div class="para-designer">
    <!-- 顶部工具栏（§3.2，可选，save=1时显示） -->
    <div class="para-toolbar" v-if="showSaveBtn">
      <span class="para-title">◤段落◢</span>
      <a-button type="primary" icon="save" @click="handleSave" :loading="saving">保存</a-button>
    </div>

    <!-- Para ID输入框（§3.2） -->
    <div class="para-header">
      <label>ID：</label>
      <a-input v-model="paraId" style="width:200px" :disabled="readonly"/>
    </div>

    <!-- UEditor容器（§3.2） -->
    <div ref="editorContainer" class="ueditor-container">
      <textarea :id="ueditorInstanceId" ref="textarea"></textarea>
    </div>

    <!-- 3个对话框组件（§7，复用现有） -->
    <ietm-interref-dialog ref="interrefDialog" @confirm="insertInterref"/>
    <ietm-dm-ref-dialog ref="dmrefDialog" @confirm="insertDmRef"/>
    <ietm-symbol-dialog ref="symbolDialog" @confirm="insertSymbol"/>
  </div>
</template>

<script>
import { para2html, html2para } from '../utils/paraConverter'
import { getUEditorConfig } from '../utils/ueditorConfig'
import IetmInterrefDialog from './IetmInterrefDialog'
import IetmDmRefDialog from './IetmDmRefDialog'
import IetmSymbolDialog from './IetmSymbolDialog'

export default {
  name: 'ParaDesigner',
  components: { IetmInterrefDialog, IetmDmRefDialog, IetmSymbolDialog },

  // §4 URL参数 + §12.1 Parent接口
  props: {
    // §4.1 基础参数
    lineno: { type: Number, required: true },        // XML行号（从0开始）
    pflag: { type: String, default: '' },            // 页面标志
    ifedit: { type: String, default: '1' },          // 是否可编辑（1=可编辑，0=只读）
    simple: { type: String, default: '0' },          // 是否简化工具栏（1=简化，0=完整）
    save: { type: String, default: '1' },            // 控制保存按钮显示（1=显示，0=隐藏）

    // §12.1 Parent接口（14个）
    editor: { type: Object, required: true },        // CodeMirror实例
    locale: { type: String, default: 'en' },         // 语言（en/cn）
    cmnodeid: { type: String, required: true },      // 构型节点ID
    projectParameters: { type: String, required: true }, // 项目参数JSON字符串
    uniqueid: { type: String, required: true },      // ICN计数器
    dmCode: { type: String, required: true },        // DM Code（用于提取SNS）
    nodeList: { type: Array, default: () => [] }     // 节点列表
  },

  // §12.1 Parent接口（函数类通过inject注入）
  inject: {
    getLocaleName: { default: () => (name) => name },
    toEnXml: { default: () => (xml) => xml },
    toCnXml: { default: () => (xml) => xml },
    formateXml: { default: () => (xml, indent) => xml }
  },

  data() {
    return {
      ueditor: null,
      ueditorReady: false,  // UEditor初始化完成标志
      paraId: '',
      endline: -1,
      saving: false,
      newformulaCnt: 0,  // §13.3 公式计数器
      deflistConfig: { termWidth: 0.3, defWidth: 0.7 },  // deflist列宽配置
      ueditorInstanceId: `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`  // 唯一实例ID
    }
  },

  computed: {
    readonly() { return this.ifedit === '0' },
    showSaveBtn() { return this.save === '1' },

    // §4.3 Parent变量绑定
    Parent() {
      // 优先使用props传入的方法和数据（推荐方式）
      if (this.editor && this.dmCode) {
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
      // 降级：通过pflag获取window.parent（兼容旧系统iframe嵌套）
      if (this.pflag === '1') return window.parent.parent
      if (this.pflag === '2') return window.parent.parent.parent
      return window.parent
    }
  },

  mounted() {
    this.initUEditor()
  },

  beforeDestroy() {
    // 🔧 关键修复：在组件销毁前**同步**清理UEditor对父容器的样式污染
    // 问题根因：UEditor初始化时会修改父容器的height/overflow/width等CSS属性，
    // 导致切换回源码视图后CodeMirror的gutters布局计算错误（行号列过宽、内容区域空白）。
    // 必须在this.$el还在DOM树中时同步清理，否则closest()返回null清理失败。

    // ① 先同步清理样式污染（此时this.$el仍在DOM中）
    try {
      console.log('[ParaDesigner] 🧹 开始清理UEditor样式污染')

      const designContainer = this.$el.closest('.design-view-container')
      if (designContainer) {
        // 彻底清理：直接清空所有内联样式（保留class）
        const savedClass = designContainer.className
        designContainer.style.cssText = ''
        designContainer.className = savedClass
        console.log('[ParaDesigner] ✓ 已清理 .design-view-container 的内联样式')
      }

      const viewTabs = this.$el.closest('.view-tabs')
      if (viewTabs) {
        const savedClass = viewTabs.className
        viewTabs.style.cssText = ''
        viewTabs.className = savedClass
        console.log('[ParaDesigner] ✓ 已清理 .view-tabs 的内联样式')
      }

      // 清理可能被污染的ant-tabs-content层
      const tabsContent = this.$el.closest('.ant-tabs-content')
      if (tabsContent) {
        const savedClass = tabsContent.className
        tabsContent.style.cssText = ''
        tabsContent.className = savedClass
        console.log('[ParaDesigner] ✓ 已清理 .ant-tabs-content 的内联样式')
      }

      // 清理TabPane层
      const tabPane = this.$el.closest('.ant-tabs-tabpane')
      if (tabPane) {
        const savedClass = tabPane.className
        tabPane.style.cssText = ''
        tabPane.className = savedClass
        console.log('[ParaDesigner] ✓ 已清理 .ant-tabs-tabpane 的内联样式')
      }

      console.log('[ParaDesigner] ✅ UEditor样式污染清理完成')
    } catch (error) {
      console.error('[ParaDesigner] ❌ 清理样式污染失败:', error)
    }

    // ② 再销毁UEditor实例
    if (this.ueditor) {
      try {
        // 1. 移除事件监听
        this.ueditor.removeListener('contentChange')
        this.ueditor.removeListener('ready')

        // 2. 销毁编辑器实例
        this.ueditor.destroy()

        // 3. 清空引用
        this.ueditor = null

        // 4. 清理DOM（UEditor可能残留）
        const container = document.getElementById(this.ueditorInstanceId)
        if (container) {
          container.innerHTML = ''
        }

        console.log('[ParaDesigner] ✅ UEditor实例销毁完成')
      } catch (error) {
        console.error('[ParaDesigner] ❌ UEditor销毁失败:', error)
      }
    }
  },

  methods: {
    // §5.3 UEditor实例化
    initUEditor() {
      // 检查实例是否已存在
      if (window.UE && window.UE.getEditor(this.ueditorInstanceId)) {
        console.warn('UEditor实例已存在，跳过加载:', this.ueditorInstanceId)
        this.ueditor = window.UE.getEditor(this.ueditorInstanceId)

        // 🔧 修复3：实例复用时也要调用setcontent()设置endline
        // Bug根因：实例复用时直接return，导致this.endline保持初始值-1
        // 修复：等待UEditor ready后再调用setcontent
        if (this.ueditor.isReady) {
          // UEditor已经ready，立即调用
          this.ueditorReady = true
          if (this.lineno !== null && this.lineno !== '') {
            this.setcontent()
          }
        } else {
          // UEditor未ready，等待ready事件
          this.ueditor.ready(() => {
            this.ueditorReady = true
            if (this.lineno !== null && this.lineno !== '') {
              this.setcontent()
            }
          })
        }

        return
      }

      const config = getUEditorConfig({
        ifedit: this.ifedit,
        simple: this.simple,
        locale: this.locale,
        readonly: this.readonly
      })

      // §5.3 配置项
      this.ueditor = UE.getEditor(this.ueditorInstanceId, {
        initialFrameWidth: '100%',
        initialFrameHeight: window.innerHeight - 180,
        scaleEnabled: true,
        allowDivTransToP: false,  // 关键：阻止div转p
        toolbars: config.toolbars,
        labelMap: { 'bold': '强调' },
        enableContextMenu: false,
        elementPathEnabled: false,
        wordCount: false
      })

      // §5.4 ready事件
      this.ueditor.ready(() => {
        this.ueditorReady = true  // 标记初始化完成
        if (this.lineno !== null && this.lineno !== '') {
          this.setcontent()
        }
        if (this.readonly) {
          this.ueditor.setDisabled()
        }
        // 调整对话框高度
        document.querySelectorAll('.edui-dialog-content').forEach(el => {
          el.style.height = '200px'
        })
      })

      // §6 注册5个自定义按钮
      this.registerCustomButtons()
    },

    // §6 注册5个自定义按钮
    registerCustomButtons() {
      const ue = this.ueditor

      // §6.1 deflist按钮（列表定义）
      UE.registerUI('deflist', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: '列表定义',
          cssRules: 'background-position: -340px -40px;',
          onclick: () => {
            const termWidth = (this.deflistConfig && this.deflistConfig.termWidth) || 0.3
            const defWidth = (this.deflistConfig && this.deflistConfig.defWidth) || 0.7

            const tdWidth = document.body.clientWidth / 2 - 10
            const w1 = Math.floor(tdWidth * termWidth)
            const w2 = Math.floor(tdWidth * defWidth)
            const html = []
            for (let r = 0; r < 5; r++) {
              html.push(`<tr${r === 0 ? ' class="firstRow"' : ''}>`)
              html.push(`<th style="width:${w1}px"><br/></th>`)
              html.push(`<td style="width:${w2}px"><br/></td>`)
              html.push('</tr>')
            }
            editor.execCommand('inserthtml', `<table deflist="1">${html.join('')}</table>`)
          }
        })
        return btn
      }, 20)

      // §6.2 insertnextrow按钮（后插入行）
      UE.registerUI('insertnextrow', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: '后插入行',
          cssRules: 'background-position: -498px -76px;',
          onclick: () => editor.execCommand('insertrownext')
        })
        return btn
      }, 21)

      // §6.3 interrefbutton按钮（内部引用）
      UE.registerUI('interrefbutton', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: '内部引用',
          cssRules: 'background-position: -500px -0px;',
          onclick: () => this.$refs.interrefDialog.open()
        })
        return btn
      }, 25)

      // §6.4 dmrefbutton按钮（DM引用）
      UE.registerUI('dmrefbutton', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: 'DM引用',
          cssRules: 'background-position: -300px -20px;',
          onclick: () => this.$refs.dmrefDialog.open()
        })
        return btn
      }, 26)

      // §6.5 symbolbutton按钮（图符）
      UE.registerUI('symbolbutton', (editor, uiName) => {
        const btn = new UE.ui.Button({
          name: uiName,
          title: '图符',
          cssRules: 'background-position: -60px -20px;',
          onclick: () => this.$refs.symbolDialog.open()
        })
        return btn
      }, 27)
    },

    // §10.1 setcontent函数（加载内容）
    async setcontent() {
      // 等待UEditor初始化完成
      if (!this.ueditorReady || !this.ueditor) {
        console.warn('UEditor未初始化完成，等待ready回调...')
        return
      }

      try {
        const paraName = this.getLocaleName('para')
        const nowstr = this.editor.getLine(this.lineno)

        console.log('[ParaDesigner] 🔍 setcontent开始:', {
          lineno: this.lineno,
          currentLine: JSON.stringify(nowstr),
          lineCount: this.editor.lineCount()
        })

        // 提取para id
        if (nowstr.indexOf('id=') > 0) {
          const match = nowstr.match(/id="([^"]+)"/)
          if (match) this.paraId = match[1]
        }

        // 判断单行/多行para
        // 🔧 修复5：必须同时包含<para>和</para>才是单行para
        // Bug根因：只检查</para>存在，导致点击多行para的结束行时误判为单行para
        const hasOpenTag = nowstr.indexOf('<' + paraName) > -1
        const hasClosingTag = nowstr.lastIndexOf(`</${paraName}>`) > 0
        const isSingleLine = hasOpenTag && hasClosingTag

        console.log('[ParaDesigner] 🔍 判断单行/多行para:', {
          hasOpenTag,
          hasClosingTag,
          isSingleLine,
          判定结果: isSingleLine ? '单行para' : '多行para'
        })

        if (isSingleLine) {
          // 单行para
          const html = await para2html(this.Parent, nowstr)
          this.ueditor.setContent(html)
          this.endline = this.lineno
          console.log('[ParaDesigner] ✓ 单行para: endline =', this.endline)
        } else {
          // 多行para
          // 🔧 修复6：如果当前行只有</para>没有<para>，需要向上搜索开始标签
          // Bug根因：点击多行para的结束行时，从当前行向下搜索，导致只提取了结束标签
          let startLine = this.lineno
          let beginidx = nowstr.indexOf('<')

          // 检查当前行是否是结束行（只有</para>没有<para>）
          if (!hasOpenTag && hasClosingTag) {
            // 当前行是结束行，向上搜索开始标签
            console.log('[ParaDesigner] 🔍 当前行是结束标签，向上搜索开始标签...')
            for (let i = this.lineno - 1; i >= 0; i--) {
              const str = this.editor.getLine(i)
              if (str && str.indexOf('<' + paraName) > -1 && str.indexOf('</' + paraName + '>') === -1) {
                // 找到开始标签（有<para>但没有</para>）
                startLine = i
                // 🔧 修复8：更新beginidx为开始行的缩进位置
                beginidx = str.indexOf('<')
                console.log('[ParaDesigner] ✓ 找到开始标签:', { startLine: i, beginidx, line: JSON.stringify(str) })
                break
              }
            }
          }

          this.endline = -1
          console.log('[ParaDesigner] 🔍 多行para搜索开始:', { startLine, beginidx, 从行号: startLine })

          // 🔧 修复11：放宽缩进匹配条件，解决"找不到结束标签"错误
          // Bug根因：严格的 beginidx === indentIdx 要求开始和结束标签缩进完全相同
          // 实际场景：用户手动编辑、格式化工具、之前的保存逻辑都可能产生缩进不一致
          // 修复策略：
          //   1. 优先匹配：缩进 <= 开始标签缩进（允许结束标签左对齐，常见格式化风格）
          //   2. 兜底匹配：如果第一轮没找到，第二轮放弃缩进检查，只匹配标签名

          // 第一轮：严格匹配（缩进 <= beginidx）
          for (let i = startLine; i < this.editor.lineCount(); i++) {
            const str = this.editor.getLine(i)
            const closingTagIdx = str.indexOf(`</${paraName}>`)
            const indentIdx = str.indexOf('<')
            console.log('[ParaDesigner] 🔍 搜索第', i, '行:', { line: JSON.stringify(str), closingTagIdx, indentIdx, beginidx })

            // 优先匹配：结束标签缩进 <= 开始标签缩进
            if (closingTagIdx > -1 && indentIdx <= beginidx) {
              this.endline = i
              console.log('[ParaDesigner] ✓ 找到结束标签(严格匹配):', { endline: i, line: JSON.stringify(str), indentMatch: indentIdx === beginidx })
              break
            }
          }

          // 第二轮：兜底匹配（如果第一轮没找到，放弃缩进检查）
          if (this.endline === -1) {
            console.warn('[ParaDesigner] ⚠️  严格匹配失败，启动兜底匹配（忽略缩进）')
            for (let i = startLine; i < this.editor.lineCount(); i++) {
              const str = this.editor.getLine(i)
              if (str.indexOf(`</${paraName}>`) > -1) {
                this.endline = i
                console.log('[ParaDesigner] ✓ 找到结束标签(兜底匹配):', { endline: i, line: JSON.stringify(str) })
                break
              }
            }
          }

          // 找不到结束标签时抛出错误
          if (this.endline === -1) {
            console.error('[ParaDesigner] ❌ 找不到结束标签')
            // 🔧 修复12：错误消息显示用户实际点击的行号
            this.$message.error(`XML格式错误：找不到 </${paraName}> 结束标签（从第${this.lineno + 1}行开始搜索，开始标签在第${startLine + 1}行）`)
            throw new Error(`找不到 </${paraName}> 结束标签`)
          }

          // 更新lineno为实际的开始行
          this.lineno = startLine

          let xml = this.editor.getRange(
            { line: startLine, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
          console.log('[ParaDesigner] 🔍 多行para XML:', JSON.stringify(xml))

          if (this.locale === 'cn') {
            xml = this.toEnXml(xml)
          }
          const html = await para2html(this.Parent, xml)
          this.ueditor.setContent(html)
        }
      } catch (error) {
        this.$message.error('加载内容失败：' + error.message)
        console.error('setcontent错误:', error)
      }
    },

    // §10.2 save函数（保存内容）
    async handleSave() {
      if (this.saving) return  // 防止重复提交
      this.saving = true

      try {
        // 1. 获取UEditor内容
        const html = this.ueditor.getContent()

        // 后端统一分配uniqueid，防止并发冲突
        const newFormulas = (html.match(/class="kfformula"/g) || []).length
        let allocatedUniqueids = []

        if (newFormulas > 0) {
          // 调用后端分配ID段
          const { data } = await this.$http.post('/jeecg-boot/ietm/dm-content/allocate-uniqueids', {
            dmId: this.cmnodeid,
            count: newFormulas
          })

          if (!data.success) {
            throw new Error('分配uniqueid失败')
          }

          // 生成ID数组
          const startId = data.result.start
          allocatedUniqueids = Array.from({ length: newFormulas }, (_, i) =>
            String(startId + i).padStart(5, '0')
          )
        }

        // 2. 转换HTML→XML（传入分配的uniqueid数组）
        let paraContent = await html2para(this.Parent, html, this.projectParameters, allocatedUniqueids)
        console.log('[ParaDesigner] 🔍 Step 2 - html2para结果:', JSON.stringify(paraContent))

        // 3. 包裹para标签
        let paraTag = '<para>'
        if (this.paraId && this.paraId.trim()) {
          paraTag = `<para id="${this.paraId}">`
          console.log('[ParaDesigner] 🔍 Step 3 - para标签带id:', paraTag)
        }

        // 构建完整的para XML
        let xml = paraContent ? `${paraTag}\n${paraContent}\n</para>` : `${paraTag}\n</para>`
        console.log('[ParaDesigner] 🔍 Step 3 - 包裹para后:', JSON.stringify(xml))

        // 4. 格式化XML
        const indent = this.editor.getLine(this.lineno).indexOf('<')
        console.log('[ParaDesigner] 🔍 Step 4a - 计算缩进:', {
          lineno: this.lineno,
          line: JSON.stringify(this.editor.getLine(this.lineno)),
          indent
        })
        xml = this.formateXml(xml, indent)
        console.log('[ParaDesigner] 🔍 Step 4b - formateXml后:', JSON.stringify(xml))
        console.log('[ParaDesigner] 🔍 XML长度:', xml.length, '字符')
        console.log('[ParaDesigner] 🔍 XML末尾字符码:', xml.charCodeAt(xml.length - 1))

        // 🔧 修复9：移除formatXml添加的末尾换行符，避免生成额外空行
        // Bug根因：formatXml每行都加\n，导致最后一行</para>后面有\n，replaceRange时会在下一行生成空行
        if (xml.endsWith('\n')) {
          xml = xml.replace(/\n+$/, '')
          console.log('[ParaDesigner] 🔧 修复9 - 移除末尾换行符:', JSON.stringify(xml))
        }

        // 5. 中文转换
        if (this.locale === 'cn') {
          xml = this.toCnXml(xml)
          console.log('[ParaDesigner] 🔍 Step 5 - toCnXml后:', JSON.stringify(xml))
        }

        // 6. 回写CodeMirror（精确替换para范围，避免误删后续内容）
        console.log('[ParaDesigner] 🔍 保存前状态:', {
          lineno: this.lineno,
          endline: this.endline,
          lineCount: this.editor.lineCount()
        })

        // 🔧 修复2：验证endline的有效性，防止误删其他行
        // Bug根因：如果endline=-1或无效，重新搜索可能找到错误的结束标签
        if (this.endline < this.lineno) {
          console.error('[ParaDesigner] ❌ endline无效:', this.endline, '< lineno:', this.lineno)
          throw new Error(`内部错误：endline(${this.endline}) < lineno(${this.lineno})，保存失败。请刷新页面重试。`)
        }

        // 防御性检查：验证endline行是否存在
        let endlineContent = this.editor.getLine(this.endline)
        let actualEndline = this.endline

        console.log('[ParaDesigner] 🔍 endline行内容:', JSON.stringify(endlineContent))

        if (!endlineContent) {
          // endline行不存在，重新查找para结束标签
          console.warn(`[ParaDesigner] endline行不存在: endline=${this.endline}, lineCount=${this.editor.lineCount()}, 重新搜索...`)

          const paraName = this.getLocaleName('para')
          actualEndline = -1

          for (let i = this.lineno; i < this.editor.lineCount(); i++) {
            const line = this.editor.getLine(i)
            if (line && line.indexOf(`</${paraName}>`) > -1) {
              actualEndline = i
              break
            }
          }

          if (actualEndline === -1) {
            throw new Error(`无法找到para结束标签，保存失败。请检查XML格式是否正确。`)
          }

          endlineContent = this.editor.getLine(actualEndline)
          console.warn(`[ParaDesigner] 重新找到para结束行: actualEndline=${actualEndline}`)
        }

        // 🔧 P0修复：单行para只替换当前行，避免删除下一行内容
        // Bug根因：{line: actualEndline + 1, ch: 0} 会删除下一行的开头，导致下一行内容丢失
        // 修复方案：单行和多行都使用 {line: actualEndline, ch: lineContent.length}
        const currentLineContent = this.editor.getLine(actualEndline)

        console.log('[ParaDesigner] 🔍 replaceRange参数:', {
          from: { line: this.lineno, ch: 0 },
          to: { line: actualEndline, ch: currentLineContent.length },
          xmlToInsert: JSON.stringify(xml),
          currentLineContent: JSON.stringify(currentLineContent)
        })

        // 保存替换前的全文（用于对比）
        const beforeContent = this.editor.getValue()
        console.log('[ParaDesigner] 🔍 替换前第', this.lineno, '行:', JSON.stringify(this.editor.getLine(this.lineno)))
        console.log('[ParaDesigner] 🔍 替换前第', this.lineno + 1, '行:', JSON.stringify(this.editor.getLine(this.lineno + 1)))

        this.editor.replaceRange(
          xml,
          { line: this.lineno, ch: 0 },
          { line: actualEndline, ch: currentLineContent.length }
        )

        // 保存替换后的全文（用于对比）
        const afterContent = this.editor.getValue()
        console.log('[ParaDesigner] 🔍 替换后第', this.lineno, '行:', JSON.stringify(this.editor.getLine(this.lineno)))
        console.log('[ParaDesigner] 🔍 替换后第', this.lineno + 1, '行:', JSON.stringify(this.editor.getLine(this.lineno + 1)))
        console.log('[ParaDesigner] 🔍 替换前后行数变化:', this.editor.lineCount())

        // 对比替换前后的差异（只显示改变的部分）
        const beforeLines = beforeContent.split('\n')
        const afterLines = afterContent.split('\n')
        if (beforeLines.length !== afterLines.length) {
          console.warn('[ParaDesigner] ⚠️  行数变化:', beforeLines.length, '→', afterLines.length)
        }

        // 显示变化的行
        const changedLines = []
        for (let i = Math.max(0, this.lineno - 2); i < Math.min(afterLines.length, this.lineno + 5); i++) {
          if (beforeLines[i] !== afterLines[i]) {
            changedLines.push({
              lineNo: i,
              before: beforeLines[i],
              after: afterLines[i]
            })
          }
        }
        if (changedLines.length > 0) {
          console.log('[ParaDesigner] 🔍 变化的行:', changedLines)
        }

        // 6. 触发父组件保存
        this.$emit('save')

        // 7. 刷新设计器
        this.$message.success('保存成功')
        this.$nextTick(() => {
          this.$emit('refresh', this.lineno)
        })

      } catch (error) {
        this.$message.error('保存失败：' + error.message)
      } finally {
        this.saving = false
      }
    },

    // §7.1 插入内部引用
    insertInterref(data) {
      const refxml = `<internalRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" internalRefId="${data.refid}" internalRefTargetType="${data.reftype}"></internalRef>`
      const html = `<a href="javascript:void(0);" xml="${refxml.replace(/"/g, '`')}">【内部引用${data.reftype}(${data.refid})】</a>`
      this.ueditor.execCommand('inserthtml', html)
    },

    // §7.2 插入DM引用
    insertDmRef(dms) {
      let html = ''
      dms.forEach(dm => {
        html += `<a href="javascript:void(0);" xml="${dm.dmref.replace(/"/g, '`')}">【DM引用${dm.dmc}】</a>`
      })
      this.ueditor.execCommand('inserthtml', html)
    },

    // §7.3 插入图符
    insertSymbol(rows) {
      rows.forEach(row => {
        const symbolxml = `<symbol infoEntityIdent="${row.icn}" symbolid="${row.id}" reproductionWidth="${row.width}" reproductionHeight="${row.height}" reproductionScale="${row.scale || 100}"></symbol>`
        const imgSrc = `/jeecg-boot/ietm/icn/tmpICN/${row.id}${row.filename.substring(row.filename.lastIndexOf('.')).toLowerCase()}`
        const html = `<img src="${imgSrc}" xml="${symbolxml.replace(/"/g, '`').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')}">`
        this.ueditor.execCommand('inserthtml', html)
      })
    }
  }
}
</script>

<style scoped lang="less">
.para-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  .para-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: whitesmoke;
    border-bottom: 1px solid #e8e8e8;

    .para-title {
      font-size: 12pt;
      font-weight: bold;
      color: #2d75cd;
      font-family: 'Microsoft YaHei';
    }
  }

  .para-header {
    padding: 10px 20px;
    border-bottom: 1px solid #e8e8e8;

    label {
      margin-right: 8px;
      font-weight: 500;
    }
  }

  .ueditor-container {
    flex: 1;
    overflow: hidden;

    textarea {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
