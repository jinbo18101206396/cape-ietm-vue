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

      <!-- 图片显示（原有） -->
      <div v-else-if="multimediaUrl" style="text-align:center;">
        <img :src="multimediaUrl" style="max-width:100%;max-height:600px;" @error="handleImageError"/>
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

              // 注入 showHotspotInfo：点击热点时展示热点详情
              iframeWin.showHotspotInfo = (id, description, coordinates) => {
                this.hotspotInfo = {
                  id: (id || '').trim(),
                  description: (description || '').trim(),
                  coordinates: (coordinates || '').trim()
                }
                this.hotspotVisible = true
              }

              // 渲染热点SVG叠加层
              this.renderHotspotOverlays(iframeDoc, iframeWin)

              // 修复旧服务器相对路径图标（avicit/ietm/viewer/images/）
              // 这些路径来自 multimedia.xsl，在 blob: URL 下无法解析
              // 用内联 SVG 占位图替换，同时保留 cursor:pointer 样式让图标可点击
              const MEDIA_ICONS = {
                'audio':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23e6f4ff" stroke="%234096ff" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🎵</text></svg>',
                'video':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23e6f4ff" stroke="%234096ff" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🎬</text></svg>',
                'flash':  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23fff7e6" stroke="%23fa8c16" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">⚡</text></svg>',
                '3d':     'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="%23f6ffed" stroke="%2352c41a" stroke-width="2"/><text x="24" y="32" text-anchor="middle" font-size="24">🧊</text></svg>'
              }
              const avicitImages = iframeDoc.querySelectorAll('img[src^="avicit/"]')
              avicitImages.forEach(img => {
                const src = img.getAttribute('src') || ''
                const type = Object.keys(MEDIA_ICONS).find(t => src.includes(t + '.gif'))
                if (type) {
                  img.src = MEDIA_ICONS[type]
                }
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

        // 🔧 2026-09-18 增强：先获取多媒体元数据
        try {
          const res = await this.$http.get(`/ietm/icn/metadata/${icnCode}`)
          if (res.success) {
            this.multimediaInfo = res.result
            console.log('多媒体元数据:', this.multimediaInfo)
          }
        } catch (err) {
          console.warn('获取元数据失败，使用默认处理:', err)
        }

        // 设置预览URL
        this.multimediaUrl = `/jeecg-boot/ietm/icn/view/${icnCode}`
        console.log('加载多媒体:', icnCode, '-> URL:', this.multimediaUrl)

      } catch (error) {
        console.error('获取ICN内容失败:', error)
        this.$message.error('获取多媒体内容失败')
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
     * 渲染热点SVG叠加层
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
  }
}
</script>
