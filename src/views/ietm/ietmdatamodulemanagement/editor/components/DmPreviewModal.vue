<template>
  <a-modal title="DM内容预览" :visible="visible && !multimediaVisible" :width="1000" :footer="null" @cancel="onClose">
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
    <a-modal title="图形/多媒体预览" :visible="multimediaVisible" :footer="null" :width="900"
      @cancel="handleMultimediaClose">
      <!-- 加载中 -->
      <div v-if="multimediaLoading" style="text-align:center;padding:60px;">
        <a-spin size="large" tip="加载中..."/>
      </div>

      <!-- 视频播放器 -->
      <div v-else-if="multimediaInfo && multimediaInfo.isVideo" style="background:#000;">
        <video
          :src="multimediaUrl"
          controls
          style="width:100%;max-height:600px;"
          @loadedmetadata="handleVideoMetadata"
          @error="handleMediaError">
          您的浏览器不支持视频播放
        </video>

        <!-- 视频元数据 -->
        <div style="padding:12px;background:#f5f5f5;">
          <a-descriptions size="small" :column="3">
            <a-descriptions-item label="格式">{{ multimediaInfo.mimeType }}</a-descriptions-item>
            <a-descriptions-item label="大小">{{ formatFileSize(multimediaInfo.fileSize) }}</a-descriptions-item>
            <a-descriptions-item label="时长" v-if="videoDuration">{{ formatDuration(videoDuration) }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </div>

      <!-- 音频播放器 -->
      <div v-else-if="multimediaInfo && multimediaInfo.isAudio" style="text-align:center;padding:40px;">
        <!-- 音频图标 -->
        <div style="font-size:80px;color:#1890ff;margin-bottom:20px;">
          🎵
        </div>

        <audio
          :src="multimediaUrl"
          controls
          style="width:100%;max-width:500px;"
          @loadedmetadata="handleAudioMetadata"
          @error="handleMediaError">
          您的浏览器不支持音频播放
        </audio>

        <!-- 音频元数据 -->
        <div style="margin-top:20px;">
          <a-descriptions size="small" :column="2" bordered>
            <a-descriptions-item label="格式">{{ multimediaInfo.mimeType }}</a-descriptions-item>
            <a-descriptions-item label="大小">{{ formatFileSize(multimediaInfo.fileSize) }}</a-descriptions-item>
            <a-descriptions-item label="文件名" :span="2">{{ multimediaInfo.fileName }}</a-descriptions-item>
            <a-descriptions-item label="时长" v-if="audioDuration" :span="2">
              {{ formatDuration(audioDuration) }}
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </div>

      <!-- 3D 模型渲染（使用Three.js） -->
      <div v-else-if="multimediaInfo && multimediaInfo.is3DModel && multimediaUrl"
           class="multimedia-3d-container">
        <div style="width:100%;height:560px;position:relative;background:#1a1a1a;padding:20px;box-sizing:border-box;">
          <div ref="canvas3d" class="three-canvas" style="width:100%;height:100%;"></div>
          <div class="loading-spinner" v-if="multimediaLoading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100;">
            <a-spin size="large" tip="加载3D模型中..."/>
          </div>
        </div>
        <!-- 3D模型元数据 -->
        <div v-if="!multimediaLoading" style="padding:12px;background:#f5f5f5;border-top:1px solid #333;">
          <a-descriptions size="small" :column="3">
            <a-descriptions-item label="格式">{{ multimediaInfo.mimeType }}</a-descriptions-item>
            <a-descriptions-item label="大小">{{ formatFileSize(multimediaInfo.fileSize) }}</a-descriptions-item>
            <a-descriptions-item label="文件名">{{ multimediaInfo.fileName }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </div>

      <!-- 图片显示（原有） -->
      <div v-else-if="multimediaUrl">
        <div style="text-align:center;padding:20px;background:#f5f5f5;min-height:400px;display:flex;align-items:center;justify-content:center;">
          <img :src="multimediaUrl" style="max-width:100%;max-height:560px;object-fit:contain;" @error="handleImageError"/>
        </div>

        <!-- 图片元数据 -->
        <div v-if="multimediaInfo" style="padding:12px;background:#fff;border-top:1px solid #e8e8e8;">
          <a-descriptions size="small" :column="3">
            <a-descriptions-item label="格式">{{ multimediaInfo.mimeType }}</a-descriptions-item>
            <a-descriptions-item label="大小">{{ formatFileSize(multimediaInfo.fileSize) }}</a-descriptions-item>
            <a-descriptions-item label="文件名">{{ multimediaInfo.fileName }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </div>

      <!-- 空状态 -->
      <a-empty v-else description="ICN内容为空或加载失败"/>
    </a-modal>

    <!-- 热点详情弹框：点击热点时显示描述信息 -->
    <a-modal title="热点详情" :visible="hotspotVisible" :footer="null" :width="520"
      @cancel="hotspotVisible = false">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="热点ID">{{ hotspotInfo.id || '（无）' }}</a-descriptions-item>
        <a-descriptions-item label="描述信息">
          <div v-html="hotspotInfo.description || '（无描述）'"></div>
        </a-descriptions-item>
        <a-descriptions-item label="坐标信息">{{ hotspotInfo.coordinates || '（无）' }}</a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </a-modal>
</template>
<script>
import { postAction } from '@/api/manage'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { VRMLLoader } from 'three/examples/jsm/loaders/VRMLLoader'

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
  // 热点功能（真实实现，不再是桩函数）
  'w.hotspotRegistry={};',
  'w.addHotspotRef=function(id,link){w.hotspotRegistry[id]=link;};',
  // 点击时（热点/参数/CSN/表格撕纸）
  'w.linkToHotSpot=w.linkToParam=w.locateCSN=w.prepTableForTearOff=w.doTearOffPrint=function(){};',
  // 🔧 2026-11-03 修复P0：多媒体/图形/热点点击桩函数（parse阶段需要，onload时覆盖真实实现）
  // 使用队列机制：如果onload前被调用，存储参数待onload后重放；onload后直接执行
  'w._pendingCalls={};',
  'w.showMultimediaInfo=function(a){if(w._pendingCalls.multimedia===undefined)w._pendingCalls.multimedia=a;};',
  'w.showDmRefInfo=function(a,b){if(w._pendingCalls.dmRef===undefined)w._pendingCalls.dmRef=[a,b];};',
  'w.showHotspotInfo=function(a,b,c){if(w._pendingCalls.hotspot===undefined)w._pendingCalls.hotspot=[a,b,c];};',
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
      multimediaLoading: false,
      // 🔧 2026-09-18 新增：多媒体元数据
      multimediaInfo: null, // { mimeType, isVideo, isAudio, isImage, fileSize, fileName }
      videoDuration: 0,     // 视频时长（秒）
      audioDuration: 0,     // 音频时长（秒）
      // 🔧 2026-11-02 新增：3D模型渲染相关
      three3dScene: null,          // Three.js 场景
      three3dCamera: null,         // Three.js 摄像机
      three3dRenderer: null,       // Three.js 渲染器
      three3dModel: null,          // 加载的3D模型对象
      three3dAnimationId: null,    // 动画帧 ID（用于取消）
      // 热点交互相关
      hotspotVisible: false,
      hotspotInfo: { id: '', description: '', coordinates: '' }
    }
  },
  watch: {
    multimediaVisible(val) {
      if (val && this.multimediaIcnIdent) {
        this.fetchIcnContent(this.multimediaIcnIdent)
      }
    },
    // 🔧 2026-11-02 新增：当multimediaUrl改变时初始化3D渲染
    multimediaUrl(newVal) {
      if (newVal && this.multimediaInfo && this.multimediaInfo.is3DModel) {
        this.$nextTick(() => {
          this.init3dRenderer()
          this.load3dModel(newVal)
        })
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
          iframe.onload = async () => {
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

              // 注入 showHotspotInfo：点击热点时展示热点详情
              iframeWin.showHotspotInfo = (id, description, coordinates) => {
                this.hotspotInfo = {
                  id: (id || '').trim(),
                  description: (description || '').trim(),
                  coordinates: (coordinates || '').trim()
                }
                this.hotspotVisible = true
              }

              // 🔧 2026-11-03 修复P0：重放onload前的点击（处理用户在iframe加载完成前就点击的情况）
              if (iframeWin._pendingCalls) {
                if (iframeWin._pendingCalls.multimedia !== undefined) {
                  iframeWin.showMultimediaInfo(iframeWin._pendingCalls.multimedia)
                  delete iframeWin._pendingCalls.multimedia
                }
                if (iframeWin._pendingCalls.dmRef !== undefined) {
                  iframeWin.showDmRefInfo(...iframeWin._pendingCalls.dmRef)
                  delete iframeWin._pendingCalls.dmRef
                }
                if (iframeWin._pendingCalls.hotspot !== undefined) {
                  iframeWin.showHotspotInfo(...iframeWin._pendingCalls.hotspot)
                  delete iframeWin._pendingCalls.hotspot
                }
              }

              // 渲染热点SVG叠加层
              this.renderHotspotOverlays(iframeDoc, iframeWin)

              // 🔧 2026-11-03 修复P1：先替换多媒体占位图标（必须在ICN加载前执行）
              // 修复旧服务器相对路径图标（avicit/ietm/viewer/images/）
              // 这些路径来自 multimedia.xsl，在 blob: URL 下无法解析
              // 用内联 SVG 占位图替换，同时保留 cursor:pointer 样式让图标可点击
              const MEDIA_ICONS = {
                'audio':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23e6f4ff" stroke="%234096ff" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🎵</text></svg>',
                'video':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23e6f4ff" stroke="%234096ff" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🎬</text></svg>',
                'flash':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23fff7e6" stroke="%23fa8c16" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">⚡</text></svg>',
                '3d':     'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23f6ffed" stroke="%2352c41a" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🧊</text></svg>'
              }
              // 查找所有图片，通过 src 属性判断是否为多媒体占位图标
              const allImages = iframeDoc.querySelectorAll('img')
              console.log('🔍 iframe中共有', allImages.length, '个图片')
              allImages.forEach((img, idx) => {
                console.log(`  图片${idx}: src="${img.src.substring(0, 80)}", id="${img.id}", onclick="${img.getAttribute('onclick')}"`)
              })

              let replacedCount = 0
              allImages.forEach(img => {
                const src = img.getAttribute('src') || ''
                // 匹配 avicit/ 开头或包含 .gif 的多媒体图标
                if (src.includes('avicit/') || src.includes('audio.gif') || src.includes('video.gif') || src.includes('3d.gif') || src.includes('flash.gif')) {
                  const type = Object.keys(MEDIA_ICONS).find(t => src.includes(t + '.gif'))
                  if (type) {
                    img.src = MEDIA_ICONS[type]
                    replacedCount++
                  }
                }
              })
              console.log('🎨 替换了', replacedCount, '个多媒体占位图标')

              // 🔧 2026-10-16 修复：区分公式和图符的处理方式
              // - 公式：需要 fetch 获取 HTML，提取 base64 图片
              // - 图符：直接设置 img.src，让浏览器自动加载
              // 🔧 2026-11-02 修复P0：兼容旧XSLT（未生成data-icn-code属性的情况）
              // 选择器：优先使用 data-icn-code，降级到 boardno 属性
              // 🔧 2026-11-04 修复P0：区分<graphic>图片和<multimediaObject>占位图标
              // 问题：之前逻辑认为"所有带onclick的都是多媒体占位图标"，但<graphic>也有onclick
              // 正确区分：
              //   - <graphic>生成的图片：class="figureLinkGraphic"，src="ShowSmallImage"，需要加载真实图片
              //   - <multimediaObject>占位图标：src包含".gif"或"avicit/"，已经是占位图标，不需要加载
              const allIcnImages = iframeDoc.querySelectorAll('img[data-icn-code], img.figureLinkGraphic[boardno]')
              console.log('🔍 选择器匹配到', allIcnImages.length, '个图片')

              // 🔧 2026-11-04 增强调试：打印每个匹配到的图片详情
              allIcnImages.forEach((img, idx) => {
                console.log(`  候选图片${idx}:`, {
                  class: img.className,
                  src: img.getAttribute('src'),
                  'data-icn-code': img.getAttribute('data-icn-code'),
                  boardno: img.getAttribute('boardno'),
                  onclick: img.hasAttribute('onclick') ? '有' : '无'
                })
              })

              const icnImages = Array.from(allIcnImages).filter(img => {
                // 🔧 2026-11-06 修复：XSLT为symbol设置的占位SVG也是data:image/svg+xml，
                // 但同时打了data-need-load="true"标记，必须保留以触发真实ICN加载
                if (img.getAttribute('data-need-load') === 'true') return true

                const src = img.getAttribute('src') || ''

                // 🔧 2026-11-04 修复：排除所有多媒体类型，只保留真实图片
                // 多媒体类型：
                // 1. 占位图标：.gif、avicit/路径
                // 2. 3D模型：data:model/gltf-binary、data:model/gltf+json
                // 3. 视频/音频：data:video/、data:audio/
                // 4. SVG占位图标：data:image/svg+xml（已替换的占位图标）
                const isMultimedia =
                  src.includes('.gif') ||
                  src.includes('avicit/') ||
                  src.includes('data:model/') ||
                  src.includes('data:video/') ||
                  src.includes('data:audio/') ||
                  src.includes('data:image/svg+xml')

                const keep = !isMultimedia

                console.log(`  过滤图片 src="${src.substring(0, 50)}...": isMultimedia=${isMultimedia}, keep=${keep}`)
                return keep
              })
              console.log('🔍 找到', icnImages.length, '个需要加载的ICN（已排除', allIcnImages.length - icnImages.length, '个多媒体占位图标）')

              const apiBaseUrl = process.env.VUE_APP_API_BASE_URL || 'http://localhost:9999/jeecg-boot'

              const loadPromises = Array.from(icnImages).map(async (img) => {
                const icnCode = img.getAttribute('data-icn-code') || img.getAttribute('boardno')
                if (!icnCode) return

                try {
                  // 先尝试判断是公式还是图符
                  const metadataUrl = `${apiBaseUrl}/ietm/icn/metadata/${icnCode}`
                  const metaResponse = await fetch(metadataUrl, {
                    headers: {
                      'X-Access-Token': this.$store.getters.token
                    }
                  })

                  if (metaResponse.ok) {
                    const metaData = await metaResponse.json()
                    if (metaData.success && metaData.result && metaData.result.mimeType === 'text/html') {
                      // 公式：fetch HTML 提取 base64
                      const viewUrl = `${apiBaseUrl}/ietm/icn/view/${icnCode}`
                      const response = await fetch(viewUrl, {
                        headers: {
                          'X-Access-Token': this.$store.getters.token
                        }
                      })
                      const formulaHtml = await response.text()
                      const match = formulaHtml.match(/src="(data:image\/png;base64,[^"]+)"/)
                      if (match && match[1]) {
                        img.src = match[1]
                        img.title = '公式: ' + icnCode
                        console.log('✅ 公式加载成功:', icnCode)
                      }
                      return
                    }
                  }

                  // 🔧 2026-11-04 修复P0：后端返回二进制图片数据，必须用blob()读取
                  // 问题根因：后端Content-Type为image/jpeg等，返回的是二进制数据
                  // 错误做法：用response.text()读取会导致二进制数据损坏（UTF-8编码错误）
                  // 正确做法：用response.blob()读取，然后转换为base64 data URL
                  const viewUrl = `${apiBaseUrl}/ietm/icn/view/${icnCode}`
                  console.log('🔵 开始获取图符:', icnCode, '从', viewUrl)

                  const response = await fetch(viewUrl, {
                    headers: {
                      'X-Access-Token': this.$store.getters.token
                    }
                  })

                  console.log('📡 响应状态:', response.status, response.statusText)

                  if (response.ok) {
                    // 获取Content-Type
                    const contentType = response.headers.get('content-type') || ''
                    console.log('📝 Content-Type:', contentType)

                    // 🔧 关键修复：用blob()读取二进制数据，而非text()
                    const blob = await response.blob()
                    console.log('📦 Blob大小:', blob.size, '类型:', blob.type)

                    // 使用FileReader转换为base64 data URL
                    const reader = new FileReader()
                    reader.onload = () => {
                      img.src = reader.result
                      img.title = '图符: ' + icnCode
                      console.log('✅ 图符加载成功:', icnCode)
                    }
                    reader.onerror = () => {
                      console.error('❌ FileReader错误:', icnCode)
                    }
                    reader.readAsDataURL(blob)
                  } else {
                    console.error('❌ fetch失败:', response.status)
                    throw new Error(`HTTP ${response.status}`)
                  }

                } catch (err) {
                  console.error('❌ ICN处理失败:', icnCode, err)
                  // 降级：直接尝试作为图片加载
                  const viewUrl = `${apiBaseUrl}/ietm/icn/view/${icnCode}`
                  img.src = viewUrl
                }
              })

              // 等待所有ICN处理完成
              await Promise.all(loadPromises)


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
              console.error('❌ iframe处理出错:', e)
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
      this.multimediaInfo = null
      this.videoDuration = 0
      this.audioDuration = 0

      try {
        if (!icnIdent || !icnIdent.trim()) {
          this.$message.warning('ICN编码为空')
          return
        }

        const icnCode = icnIdent.trim()

        // 🔧 2026-10-16 修复P0：先获取ICN元数据，判断是否为公式类型
        let isFormula = false
        try {
          const metaRes = await this.$http.get(`/ietm/icn/metadata/${icnCode}`)
          console.log('🔍 DEBUG metadata响应:', JSON.stringify(metaRes))
          console.log('🔍 DEBUG metaRes.success:', metaRes.success)
          console.log('🔍 DEBUG metaRes.result:', JSON.stringify(metaRes.result))
          if (metaRes.success) {
            this.multimediaInfo = metaRes.result
            isFormula = metaRes.result && metaRes.result.icnType === 'formula'
            console.log('🔍 DEBUG 赋值后 this.multimediaInfo:', JSON.stringify(this.multimediaInfo))
            console.log('多媒体元数据:', this.multimediaInfo, '是否公式:', isFormula)
          } else {
            console.warn('⚠️ metadata请求返回success=false:', metaRes.message)
          }
        } catch (err) {
          console.warn('获取元数据失败，使用默认处理:', err)
        }

        // 🔧 2026-10-16 修复P0：公式类型ICN从数据库BLOB加载，而非磁盘文件
        // 根本原因：公式保存在ietm_icn_manage.filecontent BLOB字段（完整的<img>标签），
        // 而/ietm/icn/view端点是为普通图符设计的（加载磁盘文件），导致公式预览失败
        if (isFormula) {
          const res = await this.$http.post('/ietm/icn/getIcnContent',
            { icn: icnCode },
            { params: { icn: icnCode } }
          )

          if (res.success && res.result && res.result.formula) {
            // 🔧 2026-10-16 修复：formula字段是十六进制编码的HTML字符串
            // 需要先解码为HTML，再提取base64图片数据
            let formulaHtml = res.result.formula

            // 检查是否为十六进制字符串（全是0-9a-fA-F字符）
            if (/^[0-9a-fA-F]+$/.test(formulaHtml)) {
              // 十六进制 → 字节数组 → UTF-8字符串
              const bytes = []
              for (let i = 0; i < formulaHtml.length; i += 2) {
                bytes.push(parseInt(formulaHtml.substr(i, 2), 16))
              }
              formulaHtml = new TextDecoder('utf-8').decode(new Uint8Array(bytes))
              console.log('解码后的公式HTML:', formulaHtml.substring(0, 200))
            }

            // 从完整的<img>标签中提取base64图片数据
            const match = formulaHtml.match(/src="(data:image\/png;base64,[^"]+)"/)

            if (match && match[1]) {
              this.multimediaUrl = match[1]  // 设置为base64 data URL
              console.log('✅ 公式加载成功:', icnCode)
            } else {
              throw new Error('公式HTML格式错误，无法提取base64图片')
            }
          } else {
            throw new Error('公式内容为空')
          }
        } else if (this.multimediaInfo && (this.multimediaInfo.icnType === '3D' || this.multimediaInfo.mimeType?.startsWith('model/'))) {
          // 🔧 2026-11-02 修复P0：3D模型文件的处理分支
          // 根本原因：之前缺少3D类型的处理，导致3D文件被当作普通图片处理，无法渲染
          // 3D模型需要返回Blob URL用于Three.js渲染器加载
          const apiBaseUrl = process.env.VUE_APP_API_BASE_URL || 'http://localhost:9999/jeecg-boot'

          // 获取3D模型文件的Blob数据
          try {
            const modelRes = await this.$http.get(
              `${apiBaseUrl}/ietm/icn/view/${icnCode}`,
              { responseType: 'blob' }
            )

            if (modelRes) {
              // 创建Blob URL用于3D查看器
              this.multimediaUrl = URL.createObjectURL(modelRes)
              this.multimediaInfo.is3DModel = true
              console.log('✅ 3D模型加载成功:', icnCode, '-> Blob URL:', this.multimediaUrl)
            } else {
              throw new Error('3D模型数据为空')
            }
          } catch (err) {
            console.error('3D模型加载失败:', err)
            throw new Error('无法加载3D模型数据: ' + err.message)
          }
        } else {
          // 普通图符/多媒体：使用绝对URL（iframe blob环境下相对路径无法解析）
          const apiBaseUrl = process.env.VUE_APP_API_BASE_URL || 'http://localhost:9999/jeecg-boot'
          this.multimediaUrl = `${apiBaseUrl}/ietm/icn/view/${icnCode}`
          console.log('加载多媒体:', icnCode, '-> URL:', this.multimediaUrl)
        }

      } catch (error) {
        console.error('获取ICN内容失败:', error)
        this.$message.error('获取多媒体内容失败: ' + (error.message || '未知错误'))
      } finally {
        this.multimediaLoading = false
      }
    },

    handleMultimediaClose() {
      // 停止视频播放
      const video = this.$el.querySelector('video')
      if (video) {
        video.pause()
        video.currentTime = 0
      }

      // 停止音频播放
      const audio = this.$el.querySelector('audio')
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }

      // 清理3D渲染器
      this.dispose3dRenderer()

      // 清理Blob URL（3D模型）
      if (this.multimediaUrl && this.multimediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.multimediaUrl)
      }

      // 清理状态
      this.multimediaVisible = false
      this.multimediaUrl = null
      this.multimediaInfo = null
      this.videoDuration = 0
      this.audioDuration = 0
    },

    handleImageError() {
      this.$message.warning('图形加载失败')
    },

    /**
     * 处理视频元数据加载完成
     * @param {Event} event - loadedmetadata事件
     */
    handleVideoMetadata(event) {
      this.videoDuration = event.target.duration
      console.log('视频时长:', this.videoDuration, '秒')
    },

    /**
     * 处理音频元数据加载完成
     * @param {Event} event - loadedmetadata事件
     */
    handleAudioMetadata(event) {
      this.audioDuration = event.target.duration
      console.log('音频时长:', this.audioDuration, '秒')
    },

    /**
     * 处理视频/音频加载错误
     * @param {Event} event - error事件
     */
    handleMediaError(event) {
      console.error('多媒体加载失败:', event)
      const error = event.target.error
      let message = '多媒体文件加载失败'

      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            message = '播放被中止'
            break
          case error.MEDIA_ERR_NETWORK:
            message = '网络错误，无法加载'
            break
          case error.MEDIA_ERR_DECODE:
            message = '文件解码失败'
            break
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = '格式不支持或文件损坏'
            break
        }
      }

      this.$message.error(message)
    },

    /**
     * 格式化文件大小
     * @param {Number} bytes - 字节数
     * @returns {String} 格式化后的大小
     */
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    /**
     * 格式化时长
     * @param {Number} seconds - 秒数
     * @returns {String} 格式化后的时长 (mm:ss)
     */
    formatDuration(seconds) {
      if (!seconds || isNaN(seconds)) return '00:00'
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    },

    /**
     * 关闭多媒体预览弹框
     * 停止播放并清理资源
     */

    /**
     * 3D模型动画循环
     */
    animate3dModel() {
      if (!this.three3dRenderer) return

      this.three3dAnimationId = requestAnimationFrame(() => this.animate3dModel())

      // 自动旋转模型
      if (this.three3dModel) {
        this.three3dModel.rotation.x += 0.003
        this.three3dModel.rotation.y += 0.005
      }

      this.three3dRenderer.render(this.three3dScene, this.three3dCamera)
    },

    /**
     * 清理Three.js资源
     * 释放渲染器、场景、模型等占用的内存
     */
    dispose3dRenderer() {
      // 停止动画循环
      if (this.three3dAnimationId) {
        cancelAnimationFrame(this.three3dAnimationId)
        this.three3dAnimationId = null
      }

      // 清理模型
      if (this.three3dModel) {
        this.three3dModel.traverse((child) => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
        this.three3dModel = null
      }

      // 清理渲染器
      if (this.three3dRenderer) {
        this.three3dRenderer.dispose()
        this.three3dRenderer.domElement.remove()
        this.three3dRenderer = null
      }

      this.three3dScene = null
      this.three3dCamera = null
    },
    /**
     * 支持拖拽旋转、滚轮缩放
     */
    setupMouseControl() {
      const container = this.$refs.canvas3d
      if (!container) return

      let isMouseDown = false
      let previousMousePosition = { x: 0, y: 0 }

      container.addEventListener('mousedown', (e) => {
        isMouseDown = true
        previousMousePosition = { x: e.clientX, y: e.clientY }
      })

      container.addEventListener('mousemove', (e) => {
        if (isMouseDown && this.three3dModel) {
          const deltaX = e.clientX - previousMousePosition.x
          const deltaY = e.clientY - previousMousePosition.y

          this.three3dModel.rotation.y += deltaX * 0.01
          this.three3dModel.rotation.x += deltaY * 0.01

          previousMousePosition = { x: e.clientX, y: e.clientY }
        }
      })

      container.addEventListener('mouseup', () => {
        isMouseDown = false
      })

      container.addEventListener('mouseleave', () => {
        isMouseDown = false
      })

      // 滚轮缩放
      container.addEventListener('wheel', (e) => {
        e.preventDefault()
        if (this.three3dModel) {
          const zoomSpeed = 0.1
          if (e.deltaY > 0) {
            this.three3dModel.scale.multiplyScalar(1 - zoomSpeed)
          } else {
            this.three3dModel.scale.multiplyScalar(1 + zoomSpeed)
          }
        }
      }, { passive: false })
    },

    /**
     * 加载3D模型（支持.glb/.gltf/.stl/.wrl格式）
     * @param {string} modelUrl - 模型的Blob URL
     */
    async load3dModel(modelUrl) {
      try {
        // 🔧 2026-11-04 修复P0：优先使用文件扩展名判断格式，MIME类型作为降级
        // 根本原因：后端MIME类型检测可能不准确（例如.wrl文件被错误识别为model/stl）
        // 文件扩展名是用户上传时的原始格式，更可靠
        const mimeType = this.multimediaInfo?.mimeType || ''
        const fileName = this.multimediaInfo?.fileName || ''
        const fileExt = fileName.toLowerCase()

        console.log('🔧 加载3D模型:', { mimeType, fileName, modelUrl })

        // 优先根据文件扩展名判断
        if (fileExt.endsWith('.wrl')) {
          // VRML 格式
          await this.loadVRMLModel(modelUrl)
        } else if (fileExt.endsWith('.stl')) {
          // STL 格式
          await this.loadSTLModel(modelUrl)
        } else if (fileExt.endsWith('.gltf') || fileExt.endsWith('.glb')) {
          // GLTF/GLB 格式
          await this.loadGLTFModel(modelUrl)
        } else {
          // 降级：根据 MIME 类型判断
          if (mimeType === 'model/vrml' || mimeType === 'model/x-world') {
            await this.loadVRMLModel(modelUrl)
          } else if (mimeType === 'model/stl') {
            await this.loadSTLModel(modelUrl)
          } else {
            // 默认使用 GLTF 加载器（支持 .gltf 和 .glb）
            await this.loadGLTFModel(modelUrl)
          }
        }
      } catch (err) {
        console.error('❌ 3D模型加载异常:', err)
        this.$message.error('3D模型加载异常: ' + err.message)
      }
    },

    /**
     * 加载 GLTF/GLB 模型
     */
    async loadGLTFModel(modelUrl) {
      const loader = new GLTFLoader()

      loader.load(
        modelUrl,
        (gltf) => {
          // 清理旧模型
          if (this.three3dModel) {
            this.three3dScene.remove(this.three3dModel)
          }

          const model = gltf.scene
          this.three3dModel = model

          // 计算模型包围盒
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 4 / maxDim
          model.scale.multiplyScalar(scale)

          // 居中模型
          const center = box.getCenter(new THREE.Vector3())
          model.position.x = -center.x * scale
          model.position.y = -center.y * scale
          model.position.z = -center.z * scale

          // 调整摄像机
          this.three3dCamera.position.z = 5
          this.three3dCamera.lookAt(0, 0, 0)

          this.three3dScene.add(model)

          console.log('✅ GLTF模型加载成功')
        },
        (progress) => {
          console.log('📦 模型加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%')
        },
        (error) => {
          console.error('❌ 加载GLTF模型失败:', error)
          this.$message.error('加载GLTF模型失败: ' + error.message)
        }
      )
    },

    /**
     * 加载 STL 模型
     */
    async loadSTLModel(modelUrl) {
      const loader = new STLLoader()

      loader.load(
        modelUrl,
        (geometry) => {
          // 清理旧模型
          if (this.three3dModel) {
            this.three3dScene.remove(this.three3dModel)
          }

          // 创建材质
          const material = new THREE.MeshPhongMaterial({
            color: 0x00a8ff,
            specular: 0x111111,
            shininess: 200
          })

          // 创建网格
          const mesh = new THREE.Mesh(geometry, material)
          this.three3dModel = mesh

          // 计算模型包围盒
          geometry.computeBoundingBox()
          const box = geometry.boundingBox
          const size = new THREE.Vector3()
          box.getSize(size)
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 4 / maxDim
          mesh.scale.multiplyScalar(scale)

          // 居中模型
          const center = new THREE.Vector3()
          box.getCenter(center)
          mesh.position.x = -center.x * scale
          mesh.position.y = -center.y * scale
          mesh.position.z = -center.z * scale

          // 调整摄像机
          this.three3dCamera.position.z = 5
          this.three3dCamera.lookAt(0, 0, 0)

          this.three3dScene.add(mesh)

          console.log('✅ STL模型加载成功')
        },
        (progress) => {
          console.log('📦 STL模型加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%')
        },
        (error) => {
          console.error('❌ 加载STL模型失败:', error)
          this.$message.error('加载STL模型失败: ' + error.message)
        }
      )
    },

    /**
     * 加载 VRML 模型
     */
    async loadVRMLModel(modelUrl) {
      const loader = new VRMLLoader()

      loader.load(
        modelUrl,
        (scene) => {
          // 清理旧模型
          if (this.three3dModel) {
            this.three3dScene.remove(this.three3dModel)
          }

          this.three3dModel = scene

          // 计算模型包围盒
          const box = new THREE.Box3().setFromObject(scene)
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 4 / maxDim
          scene.scale.multiplyScalar(scale)

          // 居中模型
          const center = box.getCenter(new THREE.Vector3())
          scene.position.x = -center.x * scale
          scene.position.y = -center.y * scale
          scene.position.z = -center.z * scale

          // 调整摄像机
          this.three3dCamera.position.z = 5
          this.three3dCamera.lookAt(0, 0, 0)

          this.three3dScene.add(scene)

          console.log('✅ VRML模型加载成功')
        },
        (progress) => {
          console.log('📦 VRML模型加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%')
        },
        (error) => {
          console.error('❌ 加载VRML模型失败:', error)
          this.$message.error('加载VRML模型失败: ' + error.message)
        }
      )
    },

    /**
     * 初始化Three.js渲染器
     * 创建场景、摄像机、渲染器，设置灯光和环境
     * 🔧 2026-11-04 修复P0：复用渲染器，避免重复创建WebGL上下文导致资源耗尽
     */
    init3dRenderer() {
      try {
        const container = this.$refs.canvas3d
        if (!container) {
          console.error('❌ 3D容器不存在')
          return
        }

        const width = container.clientWidth
        const height = container.clientHeight

        // 🔧 修复：只在渲染器不存在时创建，避免重复创建导致WebGL上下文耗尽
        if (!this.three3dRenderer) {
          // 创建渲染器（只创建一次）
          this.three3dRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
          this.three3dRenderer.setPixelRatio(window.devicePixelRatio)
          container.innerHTML = ''
          container.appendChild(this.three3dRenderer.domElement)
          console.log('✅ Three.js渲染器创建成功')
        }

        // 更新渲染器尺寸
        this.three3dRenderer.setSize(width, height)

        // 清理旧场景
        if (this.three3dScene) {
          // 移除所有子对象（灯光、模型等）
          while (this.three3dScene.children.length > 0) {
            this.three3dScene.remove(this.three3dScene.children[0])
          }
        } else {
          // 创建新场景
          this.three3dScene = new THREE.Scene()
        }
        this.three3dScene.background = new THREE.Color(0x1a1a1a)

        // 重置摄像机
        this.three3dCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000)
        this.three3dCamera.position.z = 5

        // 添加灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        this.three3dScene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(5, 10, 7)
        this.three3dScene.add(directionalLight)

        // 清理旧模型引用
        this.three3dModel = null

        // 停止旧的动画循环
        if (this.three3dAnimationId) {
          cancelAnimationFrame(this.three3dAnimationId)
          this.three3dAnimationId = null
        }

        // 启用鼠标控制旋转（简单实现）
        this.setupMouseControl()

        // 开始渲染循环
        this.animate3dModel()

        console.log('✅ Three.js场景初始化成功')
      } catch (err) {
        console.error('❌ 初始化Three.js失败:', err)
        this.$message.error('3D模型渲染初始化失败: ' + err.message)
      }
    },
    /**
     * 遍历所有带有热点的图片，在图片上方叠加SVG层，绘制热点区域
     * @param {Document} iframeDoc - iframe文档对象
     * @param {Window} iframeWin - iframe窗口对象
     */
    renderHotspotOverlays(iframeDoc, iframeWin) {
      try {
        // 查找所有热点数据标记（由XSLT生成的span.hotspot-data元素）
        const hotspotDataElements = iframeDoc.querySelectorAll('.hotspot-data')

        // 按图片分组热点
        const hotspotsByImage = new Map()

        hotspotDataElements.forEach(element => {
          const id = element.getAttribute('data-hotspot-id')
          const shape = element.getAttribute('data-hotspot-shape')
          const coords = element.getAttribute('data-hotspot-coords')
          const description = element.getAttribute('data-hotspot-description')

          if (!id || !shape || !coords) return

          // 查找包含此热点的图片（通过遍历父元素查找最近的graphic容器）
          let parent = element.parentElement
          let img = null
          while (parent && !img) {
            img = parent.querySelector('img')
            parent = parent.parentElement
          }

          if (!img) return

          if (!hotspotsByImage.has(img)) {
            hotspotsByImage.set(img, [])
          }

          hotspotsByImage.get(img).push({
            id,
            shape,
            coords,
            description: description || ''
          })
        })

        // 为每个图片创建热点叠加层
        hotspotsByImage.forEach((hotspots, img) => {
          if (img.complete) {
            this.createHotspotOverlay(img, hotspots, iframeDoc, iframeWin)
          } else {
            img.addEventListener('load', () => {
              this.createHotspotOverlay(img, hotspots, iframeDoc, iframeWin)
            })
          }
        })
      } catch (error) {
        console.error('❌ 渲染热点叠加层失败:', error)
      }
    },

    /**
     * 为单个图片创建热点SVG叠加层
     * @param {HTMLImageElement} img - 图片元素
     * @param {Array} hotspots - 热点数据数组
     * @param {Document} doc - 文档对象
     * @param {Window} win - 窗口对象
     */
    createHotspotOverlay(img, hotspots, doc, win) {
      try {
        if (!hotspots || hotspots.length === 0) return

        // 获取图片尺寸
        const imgWidth = img.naturalWidth || img.width
        const imgHeight = img.naturalHeight || img.height

        // 创建SVG容器
        const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', imgWidth)
        svg.setAttribute('height', imgHeight)
        svg.style.position = 'absolute'
        svg.style.top = '0'
        svg.style.left = '0'
        svg.style.pointerEvents = 'none' // SVG本身不捕获事件
        svg.style.zIndex = '10'

        // 将图片包装在相对定位的容器中
        if (img.parentElement.style.position !== 'relative') {
          const wrapper = doc.createElement('div')
          wrapper.style.position = 'relative'
          wrapper.style.display = 'inline-block'
          img.parentNode.insertBefore(wrapper, img)
          wrapper.appendChild(img)
          wrapper.appendChild(svg)
        } else {
          img.parentElement.appendChild(svg)
        }

        // 渲染每个热点
        hotspots.forEach(hotspot => {
          this.renderHotspot(svg, hotspot, doc, win, imgWidth, imgHeight)
        })
      } catch (error) {
        console.error('❌ 创建热点叠加层失败:', error)
      }
    },

    /**
     * 解析热点数据字符串
     * @param {string} data - 热点数据（格式：id1:shape1:coords1;id2:shape2:coords2）
     * @returns {Array} 热点对象数组
     */
    parseHotspotsData(data) {
      try {
        const hotspots = []
        const items = data.split(';')

        items.forEach(item => {
          const parts = item.trim().split(':')
          if (parts.length >= 3) {
            hotspots.push({
              id: parts[0],
              shape: parts[1], // rect, circle, poly
              coords: parts[2],
              description: parts[3] || '' // 可选的描述信息
            })
          }
        })

        return hotspots
      } catch (error) {
        console.error('❌ 解析热点数据失败:', error)
        return []
      }
    },

    /**
     * 渲染单个热点图形
     * @param {SVGElement} svg - SVG容器
     * @param {Object} hotspot - 热点数据
     * @param {Document} doc - 文档对象
     * @param {Window} win - 窗口对象
     * @param {number} imgWidth - 图片宽度
     * @param {number} imgHeight - 图片高度
     */
    renderHotspot(svg, hotspot, doc, win, imgWidth, imgHeight) {
      try {
        let shape = null
        const coords = hotspot.coords.split(',').map(Number)

        // 根据形状类型创建不同的SVG元素
        if (hotspot.shape === 'rect' && coords.length >= 4) {
          // 矩形：x,y,width,height
          shape = doc.createElementNS('http://www.w3.org/2000/svg', 'rect')
          shape.setAttribute('x', coords[0])
          shape.setAttribute('y', coords[1])
          shape.setAttribute('width', coords[2])
          shape.setAttribute('height', coords[3])
        } else if (hotspot.shape === 'circle' && coords.length >= 3) {
          // 圆形：cx,cy,radius
          shape = doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
          shape.setAttribute('cx', coords[0])
          shape.setAttribute('cy', coords[1])
          shape.setAttribute('r', coords[2])
        } else if (hotspot.shape === 'poly' && coords.length >= 6) {
          // 多边形：x1,y1,x2,y2,x3,y3,...
          shape = doc.createElementNS('http://www.w3.org/2000/svg', 'polygon')
          const points = []
          for (let i = 0; i < coords.length; i += 2) {
            points.push(`${coords[i]},${coords[i + 1]}`)
          }
          shape.setAttribute('points', points.join(' '))
        }

        if (!shape) return

        // 设置热点样式
        shape.setAttribute('fill', 'rgba(255, 87, 34, 0.2)') // 半透明橙色
        shape.setAttribute('stroke', 'rgba(255, 87, 34, 0.8)') // 橙色边框
        shape.setAttribute('stroke-width', '2')
        shape.style.cursor = 'pointer'
        shape.style.pointerEvents = 'all' // 热点区域可捕获事件

        // 鼠标悬停高亮效果
        shape.addEventListener('mouseenter', () => {
          shape.setAttribute('fill', 'rgba(255, 87, 34, 0.35)') // 加深高亮
          shape.setAttribute('stroke-width', '3')
        })
        shape.addEventListener('mouseleave', () => {
          shape.setAttribute('fill', 'rgba(255, 87, 34, 0.2)') // 恢复默认
          shape.setAttribute('stroke-width', '2')
        })

        // 点击事件：显示热点详情
        shape.addEventListener('click', () => {
          const coordsStr = `${hotspot.shape}: ${hotspot.coords}`
          win.showHotspotInfo(hotspot.id, hotspot.description, coordsStr)
        })

        svg.appendChild(shape)
      } catch (error) {
        console.error('❌ 渲染热点失败:', error)
      }
    }
  },
  beforeDestroy() {
    // 🔧 修复P1-内存泄漏: 组件销毁时清理 blob URL 和 Three.js 资源
    // 问题: URL.createObjectURL() 创建的 blob URL 没有在组件销毁时释放
    // 根因: 用户打开预览但不关闭对话框直接离开页面时，onClose不会触发
    // 影响: 长时间使用会累积大量未释放的 blob 对象，导致内存泄漏
    // 解决: 在 beforeDestroy 中调用 URL.revokeObjectURL() 释放资源

    // 清理3D渲染资源
    this.dispose3dRenderer()

    // 清理主预览的 blob URL
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl)
      this.blobUrl = ''
    }

    // 清理多媒体预览的 blob URL（如果是 blob 类型）
    if (this.multimediaUrl && this.multimediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.multimediaUrl)
      this.multimediaUrl = ''
    }

    // 清理 iframe 引用（防御性编程）
    if (this.$refs.frame) {
      this.$refs.frame.src = 'about:blank'
    }
  }
}
</script>
