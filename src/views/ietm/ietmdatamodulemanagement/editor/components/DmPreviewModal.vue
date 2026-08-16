<template>
  <a-modal title="DM内容预览" :visible="visible" :width="1000" :footer="null" @cancel="onClose">
    <!--
      修复ICN图片不显示问题：
      使用src + blob URL代替srcdoc，确保iframe有真实的http://origin，可以加载同源图片
    -->
    <iframe ref="frame" :src="blobUrl"
      style="width:100%;height:800px;border:0;background:#fff;"/>

    <!-- 内部引用(dmRef)详情：单DM预览下点击引用弹出被引用DM的信息 -->
    <a-modal title="内部引用" :visible="dmRefVisible" :footer="null" :width="520"
      @cancel="dmRefVisible = false">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="引用DM代码">{{ dmRefInfo.dmc || '（无）' }}</a-descriptions-item>
        <a-descriptions-item label="引用片段">{{ dmRefInfo.fragment || '（未指定，引用整个DM）' }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- 图形/多媒体预览：点击图形或多媒体对象时显示ICN内容 -->
    <a-modal title="图形/多媒体预览" :visible="multimediaVisible" :footer="null" :width="800"
      @cancel="handleMultimediaClose">
      <div v-if="multimediaLoading" style="text-align:center;padding:40px;">
        <a-spin tip="加载中..."/>
      </div>
      <div v-else-if="multimediaUrl" style="text-align:center;">
        <img :src="multimediaUrl" style="max-width:100%;max-height:600px;" @error="handleImageError"/>
      </div>
      <a-empty v-else description="ICN内容为空或加载失败"/>
    </a-modal>
  </a-modal>
</template>
<script>
import { postAction } from '@/api/manage'

// 预览 iframe 加载时桩脚本（注入 <head>，在 body 内联 <script> 解析前就绪）
// 覆盖所有 XSLT 生成的旧 IETM 阅读器全局函数/构造器/对象。纯 no-op + 自包含的滚动函数，
// 不依赖 Vue 组件；依赖 Vue 的点击处理（showDmRefInfo/showMultimediaInfo）仍在 onload 注入。
// 脚本闭合标签在字符串里写成 <\/script> 以免截断 SFC 的 script 块。
const STUB_SCRIPT_HEAD = [
  '<script>(function(w){',
  // 目录/交叉引用滚动
  'w.getPos=w.JumpToRow=function(id){var e=document.getElementById(id);if(e)e.scrollIntoView({behavior:"smooth",block:"start"});};',
  // base.xsl t_root 每次预览调用
  'w.initFigureBrowser=w.clearLinks=w.setContentHolderHeight=w.autoJump=w.autoXref=function(){};',
  // 图形/多媒体加载时
  'w.addFigure=function(){};w.graphicTitle={add:function(){},updateTitleDiv:function(){}};',
  'w.multimediaTitle={add:function(){},updateTitleDiv:function(){}};w.lessonPath="";',
  // 告警/布局/音频
  'w.setActualContentHeight=w.acknowledged=w.playSound=w.showJSFacknowledged=function(){};',
  // 链接构造器（热点/引用图形 <script> 中 new 出来，实例需 addTarget）
  'function L(){}L.prototype.addTarget=function(){};',
  'w.REFDMLink=w.XREFLink=w.HotspotLink=w.CSNREFLink=w.ParamLink=L;',
  'w.addHotspotRef=function(){};',
  // 点击时（热点/参数/CSN/表格撕纸）
  'w.linkToHotSpot=w.linkToParam=w.locateCSN=w.prepTableForTearOff=w.doTearOffPrint=function(){};',
  // 专用 schema（IPD/fault/3D/techrep/process，仅对应 DM 可达，防 ReferenceError）
  'w.Richfaces={showModalPanel:function(){},hideModalPanel:function(){}};',
  'w.setIsoViewInstalled=w.nestedObjectEventHandler=w.isnRowClicked=w.linkToImage=function(){};',
  'w.GoBack=w.ShowNextStep=w.showHomeView=w.playAnimation=w.collapse_expand=w.swizzle_chevron=function(){};',
  'w.updateResponse=w.onFillInKeyUp=w.onFillInLoad=w.onUserEntryKeyUp=w.OnUserEntryLoad=function(){};',
  'w.enableOkButton=w.onMultipleMenuChoiceClick=w.onSingleMenuChoiceClick=w.checkSingleMenuChoice=w.validate=function(){};',
  // xref→图形图例 onclick(xref.xsl, 4类型均含; 修复前点击 xref 链接抛 updateLegendDiv is not defined)
  'w.updateLegendDiv=function(){};',
  // 旧阅读器其它全局函数
  'w.setSelectedDMFileName=w.setSelectedPublicationCode=w.showWCN=w.getWCNVisibility=function(){};',
  'w.addLink=w.addParamRef=w.initFault=w.loadImage=w.displayISOLegend=function(){};',
  '})(window);<\/script>'
].join('')

export default {
  name: 'DmPreviewModal',
  data() {
    return {
      visible: false,
      blobUrl: '',
      dmRefVisible: false,
      dmRefInfo: { dmc: '', fragment: '' },
      multimediaVisible: false,
      multimediaIcnIdent: '',
      multimediaUrl: null,
      multimediaLoading: false
    }
  },
  watch: {
    multimediaVisible(val) {
      if (val && this.multimediaIcnIdent) {
        this.fetchIcnContent(this.multimediaIcnIdent)
      }
    }
  },
  methods: {
    show(html) {
      // 清理旧的blob URL（避免内存泄漏）
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl)
      }

      // 构建完整HTML文档
      // 注意：后端返回的HTML已包含完整的<style>标签（287行CSS），
      // 前端不再添加覆盖样式，避免破坏后端精心设计的排版效果
      const body = html || ''
      // 加载时桩脚本：必须放在 <head>，在 body 内联 <script>（XSLT 生成，如 common.xsl:196
      // 的 new HotspotLink()、base.xsl 的 JumpToRow('dmview')）解析执行之前定义所有旧阅读器
      // 全局函数/构造器/对象，否则会抛 ReferenceError（iframe.onload 太晚，parse 阶段已报错）。
      // 注意：脚本闭合标签在字符串里写成 <\/script>，否则会截断组件 script 块。
      const fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8">' + STUB_SCRIPT_HEAD + '</head>' +
        '<body style="margin:0;padding:16px;">' + body + '</body></html>'

      // 创建Blob URL（text/html类型，iframe会当作完整文档加载）
      const blob = new Blob([fullHtml], { type: 'text/html' })
      this.blobUrl = URL.createObjectURL(blob)

      this.visible = true

      // 注入JS函数（§18需求：目录点击跳转）
      this.$nextTick(() => {
        const iframe = this.$refs.frame
        if (iframe) {
          iframe.onload = () => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
              const iframeWin = iframe.contentWindow

              // 注入 getPos：XSLT生成的所有目录/交叉引用链接均调用此函数
              // 加载时桩函数（getPos/JumpToRow/构造器/各类 no-op）已在 <head> 的 STUB_SCRIPT_HEAD
              // 中定义（parse 阶段就绪）。此处仅注入依赖 Vue 组件 this 的点击处理器。

              // 注入 showDmRefInfo：点击内部引用(dmRef)时展示被引用DM的信息
              // 单DM预览模式下无法跳转到目标DM内的片段，改为弹出引用详情
              iframeWin.showDmRefInfo = (dmc, fragment) => {
                this.dmRefInfo = {
                  dmc: (dmc || '').trim(),
                  fragment: (fragment || '').trim()
                }
                this.dmRefVisible = true
              }

              // 注入 showMultimediaInfo：点击图形/多媒体对象时展示ICN预览
              // 修复 window.external.ShowMultimedia (旧JSP宿主函数在Vue iframe中不存在)
              iframeWin.showMultimediaInfo = (icnIdent) => {
                this.multimediaIcnIdent = (icnIdent || '').trim()
                this.multimediaVisible = true
              }

              // 修复旧服务器相对路径图标（avicit/ietm/viewer/images/）
              // 这些路径来自 multimedia.xsl，在 blob: URL 下无法解析
              // 用内联 SVG 占位图替换，同时保留 cursor:pointer 样式让图标可点击
              const MEDIA_ICONS = {
                'audio':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23e6f4ff" stroke="%234096ff" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🎵</text></svg>',
                'video':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23e6f4ff" stroke="%234096ff" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🎬</text></svg>',
                'flash':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23fff7e6" stroke="%23fa8c16" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">⚡</text></svg>',
                '3d':     'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23f6ffed" stroke="%2352c41a" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🧊</text></svg>'
              }
              iframeDoc.querySelectorAll('img[src^="avicit/"]').forEach(img => {
                const src = img.getAttribute('src') || ''
                const type = Object.keys(MEDIA_ICONS).find(t => src.includes(t + '.gif'))
                if (type) img.src = MEDIA_ICONS[type]
              })

              // 修复 href="#xxx" 锚点链接（blob:// URL下无法直接跳转）
              const anchorLinks = iframeDoc.querySelectorAll('a[href^="#"]')
              anchorLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                  e.preventDefault()
                  const targetId = link.getAttribute('href').substring(1)
                  const el = iframeDoc.getElementById(targetId)
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                })
              })
            } catch (e) {
            }
          }
        }
      })
    },

    onClose() {
      this.visible = false
      // 清理blob URL
      if (this.blobUrl) {
        URL.revokeObjectURL(this.blobUrl)
        this.blobUrl = ''
      }
    },

    async fetchIcnContent(icnIdent) {
      this.multimediaLoading = true
      this.multimediaUrl = null
      try {
        const response = await postAction('/ietm/icn/operation/getIcnContent', { icn: icnIdent })
        if (response && response.dto && response.dto.id) {
          const { id, filename } = response.dto
          const ext = filename ? filename.substring(filename.lastIndexOf('.')).toLowerCase() : '.cgm'
          this.multimediaUrl = `/jeecg-boot/ietm/icn/ViewIcn?url=${id}${ext}`
        }
      } catch (error) {
        console.error('获取ICN内容失败:', error)
        this.$message.error('获取图形内容失败')
      } finally {
        this.multimediaLoading = false
      }
    },

    handleMultimediaClose() {
      this.multimediaVisible = false
      this.multimediaUrl = null
    },

    handleImageError() {
      this.$message.warning('图形加载失败')
    }
  }
}
</script>
