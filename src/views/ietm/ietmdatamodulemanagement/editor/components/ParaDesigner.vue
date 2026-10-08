<template>
  <div class="para-designer">
    <!-- 顶部工具栏（§3.2，可选，save=1时显示） -->
    <div class="para-toolbar" v-if="showSaveBtn">
      <span class="para-title">◤段落◢</span>
      <a-button type="primary" icon="save" @click="handleSave" :loading="saving">保存</a-button>
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
      ueditorInstanceId: `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,  // 唯一实例ID
      domObserver: null  // MutationObserver实例，用于监听UEditor DOM变化
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
    // 🔧 关键修复：在 nextTick 之后初始化 UEditor，确保容器高度已正确计算
    // 原因：直接在 mounted 中初始化时，flex 容器的高度可能还未完全计算
    this.$nextTick(() => {
      this.initUEditor()
    })
  },

  beforeDestroy() {
    // 关键修复：在组件销毁前同步清理UEditor对父容器的样式污染
    // 问题根因：UEditor初始化时会修改父容器的height/overflow/width等CSS属性，
    // 导致切换回源码视图后CodeMirror的gutters布局计算错误（行号列过宽、内容区域空白）。
    // 必须在this.$el还在DOM树中时同步清理，否则closest()返回null清理失败。

    // ① 先清理MutationObserver（修复P0-PERF-1内存泄漏）
    if (this.domObserver) {
      this.domObserver.disconnect()
      this.domObserver = null
    }

    // ② 修复P1-BUG-1：重置endline状态，防止切换视图后状态残留
    this.endline = -1
    this.paraId = ''

    // ③ 同步清理样式污染（此时this.$el仍在DOM中）
    try {
      const designContainer = this.$el.closest('.design-view-container')
      if (designContainer) {
        // 彻底清理：直接清空所有内联样式（保留class）
        const savedClass = designContainer.className
        designContainer.style.cssText = ''
        designContainer.className = savedClass
      }

      const viewTabs = this.$el.closest('.view-tabs')
      if (viewTabs) {
        const savedClass = viewTabs.className
        viewTabs.style.cssText = ''
        viewTabs.className = savedClass
      }

      // 清理可能被污染的ant-tabs-content层
      const tabsContent = this.$el.closest('.ant-tabs-content')
      if (tabsContent) {
        const savedClass = tabsContent.className
        tabsContent.style.cssText = ''
        tabsContent.className = savedClass
      }

      // 清理TabPane层
      const tabPane = this.$el.closest('.ant-tabs-tabpane')
      if (tabPane) {
        const savedClass = tabPane.className
        tabPane.style.cssText = ''
        tabPane.className = savedClass
      }
    } catch (error) {
      // 清理样式污染失败，继续销毁编辑器
    }

    // ④ 销毁UEditor实例
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
      } catch (error) {
        // UEditor销毁失败，继续清理
      }
    }
  },

  methods: {
    // § 5.3 UEditor实例化
    initUEditor() {
      // 修复P1-5: UEditor实例复用污染 - 强制销毁旧实例
      if (window.UE && window.UE.getEditor(this.ueditorInstanceId)) {
        const oldInstance = window.UE.getEditor(this.ueditorInstanceId)

        try {
          // 移除事件监听
          oldInstance.removeListener('contentChange')
          oldInstance.removeListener('ready')
          // 销毁实例
          oldInstance.destroy()
        } catch (e) {
          // 销毁旧实例失败，继续
        }
      }

      const config = getUEditorConfig({
        ifedit: this.ifedit,
        simple: this.simple,
        locale: this.locale,
        readonly: this.readonly
      })

      // §5.3 配置项 - 使用config作为基础，仅覆盖Para设计器特定的参数
      this.ueditor = UE.getEditor(this.ueditorInstanceId, {
        ...config,
        initialFrameHeight: 710,  // Para设计器固定高度：35行数据（每行20px）
        autoHeightEnabled: false  // 禁用自动高度，启用滚动条
      })

      // §5.4 ready事件
      this.ueditor.ready(() => {
        this.ueditorReady = true  // 标记初始化完成

        // 🔧 修复P0-PERF-1: 使用MutationObserver替代setTimeout轮询
        // 根因：UEditor会动态设置inline style覆盖CSS，必须监听DOM变化并修正
        const fixEditorHeight = () => {
          // 1. 固定最外层UEditor容器（.edui-editor）
          const editorContainer = document.querySelector('.edui-editor')
          if (editorContainer) {
            editorContainer.style.height = '710px'
            editorContainer.style.maxHeight = '710px'
            editorContainer.style.overflow = 'hidden'
          }

          // 2. 固定iframe容器（.edui-editor-iframeholder）
          const iframeHolder = document.querySelector('.edui-editor-iframeholder')
          if (iframeHolder) {
            iframeHolder.style.height = '670px'  // 710px - 工具栏高度
            iframeHolder.style.maxHeight = '670px'
            iframeHolder.style.overflow = 'hidden'
          }

          // 3. 固定iframe本身
          const iframe = document.querySelector('.edui-editor iframe')
          if (iframe) {
            iframe.style.height = '670px'
            iframe.style.maxHeight = '670px'
          }

          // 4. iframe内部body启用滚动
          if (iframe) {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
              if (iframeDoc && iframeDoc.body) {
                iframeDoc.body.style.height = 'auto'  // 允许内容撑开
                iframeDoc.body.style.overflowY = 'auto'  // Y轴滚动
                iframeDoc.body.style.overflowX = 'hidden'
                iframeDoc.body.style.margin = '0'
                iframeDoc.body.style.padding = '10px'

                iframeDoc.documentElement.style.height = '100%'
                iframeDoc.documentElement.style.overflowY = 'auto'
              }
            } catch (e) {
              // 设置iframe内部样式失败，忽略
            }
          }
        }

        const hideElementPath = () => {
          const editorContainer = document.querySelector('.edui-editor')
          if (editorContainer) {
            const bottomBar = editorContainer.querySelector('[class*="bottomContainer"]')
            if (bottomBar) {
              const tds = bottomBar.querySelectorAll('td')
              if (tds.length > 0) {
                // 隐藏第一个td（元素路径）
                tds[0].style.display = 'none'
                tds[0].style.width = '0'
                tds[0].style.padding = '0'
                tds[0].style.margin = '0'
              }
              if (tds.length > 1) {
                // 第二个td（字数统计）左对齐
                tds[1].style.textAlign = 'left'
                tds[1].style.paddingLeft = '12px'
              }
            }
          }
        }

        // 立即执行一次修正
        fixEditorHeight()
        hideElementPath()

        // 使用MutationObserver监听DOM变化，自动修正UEditor的样式覆盖
        const editorContainer = document.querySelector('.edui-editor')
        if (editorContainer && window.MutationObserver) {
          this.domObserver = new MutationObserver((mutations) => {
            // 只处理style属性变化和子树变化
            let needFix = false
            for (const mutation of mutations) {
              if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                needFix = true
                break
              }
              if (mutation.type === 'childList') {
                needFix = true
                break
              }
            }

            if (needFix) {
              fixEditorHeight()
              hideElementPath()
            }
          })

          // 监听editorContainer及其子树的属性和子节点变化
          this.domObserver.observe(editorContainer, {
            attributes: true,
            attributeFilter: ['style'],
            childList: true,
            subtree: true
          })
        }

        if (this.lineno !== null && this.lineno !== '') {
          this.setcontent()
        }
        if (this.readonly) {
          this.ueditor.setDisabled()
        }
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
        return
      }

      try {
        const paraName = this.getLocaleName('para')
        const nowstr = this.editor.getLine(this.lineno)

        // 提取para id
        if (nowstr.indexOf('id=') > 0) {
          const match = nowstr.match(/id="([^"]+)"/)
          if (match) this.paraId = match[1]
        }

        // 判断单行/多行para
        // 修复5：必须同时包含<para>和</para>才是单行para
        // Bug根因：只检查</para>存在，导致点击多行para的结束行时误判为单行para
        const hasOpenTag = nowstr.indexOf('<' + paraName) > -1
        const hasClosingTag = nowstr.lastIndexOf(`</${paraName}>`) > 0
        const isSingleLine = hasOpenTag && hasClosingTag

        if (isSingleLine) {
          // 单行para
          const html = await para2html(this.Parent, nowstr)
          this.ueditor.setContent(html)
          this.endline = this.lineno
        } else {
          // 多行para
          // 修复6：如果当前行只有</para>没有<para>，需要向上搜索开始标签
          // Bug根因：点击多行para的结束行时，从当前行向下搜索，导致只提取了结束标签
          let startLine = this.lineno
          let beginidx = nowstr.indexOf('<')

          // 检查当前行是否是结束行（只有</para>没有<para>）
          if (!hasOpenTag && hasClosingTag) {
            // 当前行是结束行，向上搜索开始标签
            for (let i = this.lineno - 1; i >= 0; i--) {
              const str = this.editor.getLine(i)
              if (str && str.indexOf('<' + paraName) > -1 && str.indexOf('</' + paraName + '>') === -1) {
                // 找到开始标签（有<para>但没有</para>）
                startLine = i
                // 修复8：更新beginidx为开始行的缩进位置
                beginidx = str.indexOf('<')
                break
              }
            }
          }

          this.endline = -1

          // 修复11：放宽缩进匹配条件，解决"找不到结束标签"错误
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

            // 优先匹配：结束标签缩进 <= 开始标签缩进
            if (closingTagIdx > -1 && indentIdx <= beginidx) {
              this.endline = i
              break
            }
          }

          // 第二轮：兜底匹配（如果第一轮没找到，放弃缩进检查）
          if (this.endline === -1) {
            for (let i = startLine; i < this.editor.lineCount(); i++) {
              const str = this.editor.getLine(i)
              if (str.indexOf(`</${paraName}>`) > -1) {
                this.endline = i
                break
              }
            }
          }

          // 找不到结束标签时抛出错误
          if (this.endline === -1) {
            // 修复12：错误消息显示用户实际点击的行号
            this.$message.error(`XML格式错误：找不到 </${paraName}> 结束标签（从第${this.lineno + 1}行开始搜索，开始标签在第${startLine + 1}行）`)
            throw new Error(`找不到 </${paraName}> 结束标签`)
          }

          // 更新lineno为实际的开始行
          this.lineno = startLine

          let xml = this.editor.getRange(
            { line: startLine, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )

          if (this.locale === 'cn') {
            xml = this.toEnXml(xml)
          }
          const html = await para2html(this.Parent, xml)
          this.ueditor.setContent(html)
        }
      } catch (error) {
        this.$message.error('加载内容失败：' + error.message)
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

        // 3. 包裹para标签
        let paraTag = '<para>'
        if (this.paraId && this.paraId.trim()) {
          paraTag = `<para id="${this.paraId}">`
        }

        // 构建完整的para XML
        let xml = paraContent ? `${paraTag}\n${paraContent}\n</para>` : `${paraTag}\n</para>`

        // 4. 格式化XML
        const indent = this.editor.getLine(this.lineno).indexOf('<')
        xml = this.formateXml(xml, indent)

        // 修复9：移除formatXml添加的末尾换行符，避免生成额外空行
        // Bug根因：formatXml每行都加\n，导致最后一行</para>后面有\n，replaceRange时会在下一行生成空行
        if (xml.endsWith('\n')) {
          xml = xml.replace(/\n+$/, '')
        }

        // 5. 中文转换
        if (this.locale === 'cn') {
          xml = this.toCnXml(xml)
        }

        // 6. 回写CodeMirror（精确替换para范围，避免误删后续内容）
        // 修复2：验证endline的有效性，防止误删其他行
        // Bug根因：如果endline=-1或无效，重新搜索可能找到错误的结束标签
        if (this.endline < this.lineno) {
          throw new Error(`内部错误：endline(${this.endline}) < lineno(${this.lineno})，保存失败。请刷新页面重试。`)
        }

        // 防御性检查：验证endline行是否存在
        let endlineContent = this.editor.getLine(this.endline)
        let actualEndline = this.endline

        if (!endlineContent) {
          // endline行不存在，重新查找para结束标签
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
        }

        // 修复P0：单行para只替换当前行，避免删除下一行内容
        // Bug根因：{line: actualEndline + 1, ch: 0} 会删除下一行的开头，导致下一行内容丢失
        // 修复方案：单行和多行都使用 {line: actualEndline, ch: lineContent.length}
        const currentLineContent = this.editor.getLine(actualEndline)

        this.editor.replaceRange(
          xml,
          { line: this.lineno, ch: 0 },
          { line: actualEndline, ch: currentLineContent.length }
        )

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
  min-height: 0;  /* 关键：允许flex子元素小于内容高度 */

  .para-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;  /* 减少 padding */
    background: whitesmoke;
    border-bottom: 1px solid #e8e8e8;
    flex-shrink: 0;
    height: 36px;  /* 限制高度 */

    .para-title {
      font-size: 11pt;  /* 减小字体 */
      font-weight: bold;
      color: #2d75cd;
      font-family: 'Microsoft YaHei';
    }
  }

  .ueditor-container {
    flex-shrink: 0;
    height: 710px !important;  /* 固定高度：35行 */
    overflow: visible;  /* 允许子元素显示滚动条 */
    display: flex;
    flex-direction: column;
    min-height: 0;

    textarea {
      display: none;  /* 隐藏原始textarea */
    }

    /* 强制iframe填充容器并显示滚动条 */
    iframe {
      width: 100% !important;
      height: 100% !important;
      flex: 1;
      border: none;
      overflow-y: auto !important;  /* Y轴滚动条 */
    }
  }
}

/* 隐藏UEditor底部栏的第一个td（元素路径） */
/deep/ .edui-editor-bottomContainer td:first-child {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* 字数统计左对齐 */
/deep/ .edui-editor-wordcount {
  text-align: left !important;
  padding-left: 12px !important;
}
</style>
