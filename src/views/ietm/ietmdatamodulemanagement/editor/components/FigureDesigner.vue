<template>
  <div class="figure-designer">
    <!-- 工具栏（与表格设计视图风格一致） -->
    <div class="figure-toolbar" v-if="showSaveBtn">
      <!-- 标题行 -->
      <div class="toolbar-header">
        <span class="toolbar-title">◤插图◢</span>
      </div>

      <!-- 控制行（标题、ID、保存按钮在同一行）-->
      <div class="toolbar-controls">
        <label class="control-item">标题：<input type="text" v-model="figureTitle" class="figure-input" :disabled="readonly" placeholder="图形标题（必填）"/></label>
        <label class="control-item">ID：<input type="text" v-model="figureId" class="figure-input" :disabled="readonly" placeholder="图形ID（可选）"/></label>
        <a-button type="primary" icon="save" @click="handleSave" :loading="saving" class="save-btn">保存</a-button>
      </div>
    </div>

    <!-- 主容器：左侧tabs（图形+图例）+ 右侧预览（与旧系统布局一致） -->
    <div class="figure-main">
      <div class="main-layout">
        <!-- 左侧：图形和图例tabs -->
        <div class="left-tabs">
          <a-tabs v-model="activeTabKey" @change="handleTabChange" type="card" class="figure-tabs" :animated="false">
            <!-- Tab 1: 图形 -->
            <a-tab-pane key="graphic" :tab="graphicTabTitle" force-render>
              <graphic-designer
                ref="graphicDesigner"
                :graphics="graphics"
                :readonly="readonly"
                @graphic-select="handleSelectGraphic"
                @add-graphic="handleAddGraphic"
                @delete-graphic="handleDeleteGraphic"
                @move-graphic="handleMoveGraphic"
                @add-hotspot="handleAddHotspot"
                @delete-hotspot="handleDeleteHotspot"
                @import-hotspots="handleImportHotspots"
              />
            </a-tab-pane>

            <!-- Tab 2: 图例 -->
            <a-tab-pane key="legend" :tab="legendTabTitle" force-render>
              <legend-designer
                ref="legendDesigner"
                :legends="legends"
                :readonly="readonly"
                @add-legend="handleAddLegend"
                @delete-legend="handleDeleteLegend"
                @move-legend="handleMoveLegend"
              />
            </a-tab-pane>
          </a-tabs>
        </div>

        <!-- 右侧：预览区域 -->
        <div class="right-preview">
          <div class="preview-panel">
            <div class="panel-title">预览</div>
            <div class="preview-container">
              <a-spin :spinning="previewLoading" tip="加载预览中...">
                <img v-if="previewUrl" :src="previewUrl" class="preview-image" alt="ICN预览"/>
                <div v-else class="empty-state">请先选择图形</div>
              </a-spin>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 插入图符弹窗 -->
    <ietm-symbol-dialog
      :visible="symbolDialogVisible"
      @update:visible="symbolDialogVisible = $event"
      @insert="handleSymbolInsert"
    />
  </div>
</template>

<script>
import { figure2object, object2figure, validateFigure } from '../utils/figureConverter'
import IetmSymbolDialog from './IetmSymbolDialog'
import GraphicDesigner from './GraphicDesigner'
import LegendDesigner from './LegendDesigner'
import { getAction, postAction } from '@/api/manage'
import Vue from 'vue'
import { ACCESS_TOKEN } from '@/store/mutation-types'

export default {
  name: 'FigureDesigner',

  components: {
    IetmSymbolDialog,
    GraphicDesigner,
    LegendDesigner
  },

  props: {
    lineno: { type: Number, required: true },
    editor: { type: Object, required: true },
    locale: { type: String, default: 'en' },
    cmnodeid: { type: String, required: true },
    ifedit: { type: String, default: '1' },
    save: { type: String, default: '1' }
  },

  inject: {
    getLocaleName: { default: () => (name) => name },
    toEnXml: { default: () => (xml) => xml },
    toCnXml: { default: () => (xml) => xml },
    formateXml: { default: () => (xml, indent) => xml }
  },

  data() {
    return {
      figureTitle: '',
      figureId: '',
      graphics: [],
      legends: [],
      endline: -1,
      saving: false,
      activeTabKey: 'graphic',
      previewUrl: '',
      previewLoading: false,
      previewContent: null,
      symbolDialogVisible: false
    }
  },

  computed: {
    readonly() { return this.ifedit === '0' },
    showSaveBtn() { return this.save === '1' },
    graphicTabTitle() {
      return `图形[${this.graphics.length}]`
    },
    legendTabTitle() {
      return `图例[${this.legends.length}]`
    }
  },

  mounted() {
    this.loadContent()
  },

  beforeDestroy() {
    // 清理资源，防止内存泄漏
    this.graphics = []
    this.legends = []
    this.previewContent = null

    // 清理 blob URL
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl)
    }
    this.previewUrl = ''

    this.figureTitle = ''
    this.figureId = ''

    // 🔧 修复P0-LAYOUT: 清理样式污染
    this._cleanupViewStyles()
  },

  methods: {
    // 🔧 修复P0-LAYOUT: 清理设计视图样式污染
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
    },

    async loadContent() {
      if (!this.editor || this.lineno === null) return

      try {
        let figureXml = this.editor.getLine(this.lineno)
        const isSingleLine = figureXml.includes('<figure') && figureXml.includes('</figure>')

        if (!isSingleLine) {
          for (let i = this.lineno + 1; i < this.editor.lineCount(); i++) {
            if (this.editor.getLine(i).includes('</figure>')) {
              this.endline = i
              break
            }
          }
          if (this.endline === -1) {
            throw new Error('找不到</figure>结束标签')
          }
          figureXml = this.editor.getRange(
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        } else {
          this.endline = this.lineno
        }

        if (this.locale === 'cn') {
          figureXml = this.toEnXml(figureXml)
        }

        // 检测空figure标签（旧系统兼容逻辑）：直接初始化空数据，不解析XML
        const isEmptyFigure = /^<figure[^>]*>\s*<\/figure>$/i.test(figureXml.trim())
        if (isEmptyFigure) {
          // 旧系统行为：空figure时不报错，直接初始化空表单
          this.figureTitle = ''
          this.figureId = ''
          this.graphics = [{ icn: '', filename: '', hotspots: [] }]
          this.legends = []
          this.selectedGraphicIndex = 0
          return
        }

        // 非空figure：正常解析和验证
        const figureObj = await figure2object(null, figureXml)

        const validation = validateFigure(figureObj)
        if (!validation.valid) {
          const warnings = validation.errors.slice(0, 3).join('; ')
          this.$message.warning(`数据验证警告: ${warnings}`)
        }

        this.figureTitle = figureObj.title
        this.figureId = figureObj.id
        this.graphics = figureObj.graphics
        this.legends = figureObj.legends

        // 优化: 按需加载图形预览，而不是Promise.all并发全部
        if (this.graphics.length > 0) {
          // 优先加载第一个图形的预览
          await this.loadGraphicPreview(0)

          // 其他图形在后台预加载（不阻塞UI）
          for (let i = 1; i < this.graphics.length; i++) {
            this.preloadGraphicFilename(this.graphics[i], i).catch(err => {
              console.warn(`预加载图形${i}失败:`, err.message)
            })
          }
        }
      } catch (error) {
        this.$message.error('加载失败: ' + error.message)
        this.figureTitle = ''
        this.graphics = []
        this.legends = []
      }
    },

    async preloadGraphicFilename(graphic, index) {
      if (!graphic.icn) return

      try {
        const response = await getAction(`/icnmanage/ietmIcnManage/queryByIcnCode?icn=${graphic.icn}`)
        if (response.success && response.result && response.result.id) {
          graphic.filename = response.result.id + '.cgm'
        }
      } catch (error) {
        console.warn(`预加载图形${index}的filename失败:`, error.message)
      }
    },

    async loadGraphicPreview(index) {
      if (index < 0 || index >= this.graphics.length) {
        this.previewUrl = ''
        return
      }

      const graphic = this.graphics[index]
      if (!graphic.icn) {
        this.previewUrl = ''
        return
      }

      this.previewLoading = true

      try {
        console.log('[FigureDesigner] 查询ICN:', graphic.icn)
        const response = await getAction(`/icnmanage/ietmIcnManage/queryByIcnCode?icn=${graphic.icn}`)

        console.log('[FigureDesigner] queryByIcnCode完整响应:', response)

        if (response.success && response.result && response.result.id) {
          const icnId = response.result.id
          console.log('[FigureDesigner] 获取到ID:', icnId, '现在调用preview API')

          // 更新 filename（用于保存时，优先使用原始文件名）
          if (response.result.ietmAttachment) {
            graphic.filename = response.result.ietmAttachment.fileName || response.result.ietmAttachment.fileKey
          }

          // 调用 preview API 获取 fileUrl（与 IcnPreviewPane 一致）
          const previewRes = await getAction(`/icnmanage/ietmIcnManage/preview/${icnId}`)
          console.log('[FigureDesigner] preview API响应:', previewRes)

          if (previewRes.success && previewRes.result && previewRes.result.fileUrl) {
            const fileUrl = previewRes.result.fileUrl
            console.log('[FigureDesigner] fileUrl:', fileUrl)

            // 使用 fetch 加载 blob（需要 token）
            await this.loadBlobUrl(fileUrl)
          } else {
            console.error('[FigureDesigner] preview API返回失败')
            this.$message.warning(`无法获取预览: ${previewRes.message || '未知错误'}`)
            this.previewUrl = ''
          }
        } else {
          console.error('[FigureDesigner] queryByIcnCode失败或result为空:', response)
          this.$message.warning(`未找到 ICN: ${graphic.icn}`)
          this.previewUrl = ''
        }
      } catch (error) {
        console.error('[FigureDesigner] 加载预览异常:', error)
        this.$message.error(`加载预览失败: ${error.message}`)
        this.previewUrl = ''
      } finally {
        this.previewLoading = false
      }
    },

    async loadBlobUrl(fileUrl) {
      if (!fileUrl) {
        this.previewUrl = ''
        return
      }

      const token = Vue.ls.get(ACCESS_TOKEN)
      const baseUrl = window._CONFIG['domianURL'] || ''

      console.log('[FigureDesigner] loadBlobUrl, fileUrl =', fileUrl)
      console.log('[FigureDesigner] token存在:', !!token)

      try {
        const response = await fetch(baseUrl + fileUrl, {
          method: 'GET',
          headers: { 'X-Access-Token': token || '' }
        })

        console.log('[FigureDesigner] fetch响应, status =', response.status)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const blob = await response.blob()
        console.log('[FigureDesigner] blob加载成功, size =', blob.size, 'bytes')

        // 清理旧的 blob URL
        if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(this.previewUrl)
        }

        this.previewUrl = URL.createObjectURL(blob)
        console.log('[FigureDesigner] 设置 previewUrl =', this.previewUrl)
      } catch (error) {
        console.error('[FigureDesigner] loadBlobUrl异常:', error)
        this.$message.error(`加载图片失败: ${error.message}`)
        this.previewUrl = ''
      }
    },

    handleSelectGraphic(index) {
      this.loadGraphicPreview(index)
    },

    handleAddGraphic() {
      this.symbolDialogVisible = true
    },

    handleSymbolInsert(symbolXml) {
      // symbolXml 格式: <symbol infoEntityIdent="ICN-xxx" ...></symbol>
      const icnMatch = symbolXml.match(/infoEntityIdent="([^"]+)"/)
      if (!icnMatch) {
        this.$message.error('无法解析ICN编号')
        return
      }

      const icn = icnMatch[1]
      this.graphics.push({ icn: icn, filename: '', hotspots: [] })
      const newIndex = this.graphics.length - 1

      // 立即加载预览
      this.$nextTick(() => {
        this.loadGraphicPreview(newIndex)
      })
    },

    handleDeleteGraphic(index) {
      this.graphics.splice(index, 1)

      // 刷新预览：如果还有图形，加载第一个；否则清空预览
      this.$nextTick(() => {
        if (this.graphics.length > 0) {
          this.loadGraphicPreview(0)
        } else {
          this.previewUrl = ''
        }
      })
    },

    handleMoveGraphic({ index, direction }) {
      if (direction === 'up' && index > 0) {
        [this.graphics[index], this.graphics[index - 1]] = [this.graphics[index - 1], this.graphics[index]]
      } else if (direction === 'down' && index < this.graphics.length - 1) {
        [this.graphics[index], this.graphics[index + 1]] = [this.graphics[index + 1], this.graphics[index]]
      }
    },

    handleAddHotspot(graphicIndex) {
      if (graphicIndex < 0 || graphicIndex >= this.graphics.length) {
        this.$message.warning('请先选中一个图形')
        return
      }
      const currentGraphic = this.graphics[graphicIndex]
      if (!currentGraphic.hotspots) {
        this.$set(currentGraphic, 'hotspots', [])
      }
      currentGraphic.hotspots.push({ apsid: '', name: '', id: '' })
    },

    handleDeleteHotspot({ graphicIndex, hotspotIndex }) {
      if (graphicIndex < 0 || graphicIndex >= this.graphics.length) return
      this.graphics[graphicIndex].hotspots.splice(hotspotIndex, 1)
    },

    handleImportHotspots(graphicIndex) {
      if (graphicIndex < 0 || graphicIndex >= this.graphics.length) {
        this.$message.warning('请先选中一个图形')
        return
      }

      if (!this.previewContent || !this.previewContent.hotspots || this.previewContent.hotspots.length === 0) {
        this.$message.info('暂无可导入的预览热点')
        return
      }

      const currentGraphic = this.graphics[graphicIndex]

      if (!currentGraphic.hotspots) {
        this.$set(currentGraphic, 'hotspots', [])
      }

      const existingKeys = new Set(
        currentGraphic.hotspots.map(h => `${h.apsid}|${h.name}`)
      )

      let importedCount = 0
      for (const hs of this.previewContent.hotspots) {
        const key = `${hs.apsid}|${hs.name}`
        if (!existingKeys.has(key)) {
          currentGraphic.hotspots.push({
            apsid: hs.apsid || '',
            name: hs.name || '',
            id: hs.id || ''
          })
          importedCount++
        }
      }

      if (importedCount > 0) {
        this.$message.success(`成功导入 ${importedCount} 个热点`)
      } else {
        this.$message.info('所有预览热点已存在')
      }
    },

    handleAddLegend() {
      this.legends.push({ no: '', name: '' })
    },

    handleDeleteLegend(index) {
      this.legends.splice(index, 1)
    },

    handleMoveLegend({ index, direction }) {
      if (direction === 'up' && index > 0) {
        [this.legends[index], this.legends[index - 1]] = [this.legends[index - 1], this.legends[index]]
      } else if (direction === 'down' && index < this.legends.length - 1) {
        [this.legends[index], this.legends[index + 1]] = [this.legends[index + 1], this.legends[index]]
      }
    },

    async handleTabChange(key) {
      // Tab change handler - reserved for future use
    },

    async handleSave() {
      if (this.saving) return

      try {
        const validation = validateFigure({
          title: this.figureTitle,
          graphics: this.graphics,
          legends: this.legends
        })
        if (!validation.valid) {
          this.$message.error(validation.errors.join('\n'))
          return
        }

        this.saving = true

        console.log('[FigureDesigner] 开始保存, 数据:', {
          dmId: this.cmnodeid,
          lineno: this.lineno,
          endline: this.endline,
          locale: this.locale,
          figureData: {
            title: this.figureTitle,
            id: this.figureId,
            graphics: this.graphics,
            legends: this.legends
          }
        })

        // 提交到后端，由后端生成标准XML（确保XML生成逻辑唯一）
        const response = await postAction(
          '/ietm/dm-content/saveFigureContent',
          {
            dmId: this.cmnodeid,
            lineno: this.lineno,
            endline: this.endline,
            locale: this.locale,
            figureData: {
              title: this.figureTitle,
              id: this.figureId,
              graphics: this.graphics,
              legends: this.legends
            }
          }
        )

        console.log('[FigureDesigner] 保存响应:', response)

        if (!response.success) {
          throw new Error(response.message || '保存失败')
        }

        // 使用后端返回的标准XML并立即格式化
        let { figureXml, endline } = response.result

        console.log('[FigureDesigner] 格式化前的XML长度:', figureXml.length)
        console.log('[FigureDesigner] 格式化前的XML前200字符:', figureXml.substring(0, 200))

        // 计算<figure>标签在原始文档中的缩进位置
        // 从编辑器中读取<figure>所在行的原始内容，计算前导空格数
        let baseIndent = 0
        if (this.editor) {
          const figureLine = this.editor.getLine(this.lineno)
          const match = figureLine.match(/^(\s*)/)
          if (match && match[1]) {
            baseIndent = match[1].length
            console.log('[FigureDesigner] 检测到<figure>标签的基础缩进:', baseIndent, '个空格')
          }
        }

        // 自动格式化XML（使用检测到的基础缩进）
        let formattedXml = this.formateXml(figureXml, baseIndent)

        console.log('[FigureDesigner] formateXml返回类型:', typeof formattedXml)
        console.log('[FigureDesigner] 格式化后的XML长度:', formattedXml ? formattedXml.length : 'null')
        console.log('[FigureDesigner] 格式化后的XML前200字符:', formattedXml ? formattedXml.substring(0, 200) : 'null')

        if (formattedXml && formattedXml.length > 0) {
          // 移除末尾的换行符，避免在</figure>下方生成空行
          // formatXml函数在每行末尾都添加了\n，包括最后一行
          figureXml = formattedXml.replace(/\n$/, '')
          console.log('[FigureDesigner] 已移除末尾换行符，最终XML长度:', figureXml.length)
        } else {
          console.warn('[FigureDesigner] 格式化返回空值，使用原始XML')
        }

        console.log('[FigureDesigner] 准备触发save事件, figureXml长度:', figureXml.length)

        // 先触发父组件的 save 事件，让父组件更新编辑器并保存
        // 注意：不在这里直接操作editor，避免与父组件的content状态不同步
        this.$emit('save', {
          lineno: this.lineno,
          endline: this.endline,
          figureXml: figureXml
        })

        console.log('[FigureDesigner] 已触发save事件')

        // 保存成功提示
        this.$message.success('保存成功')
      } catch (error) {
        console.error('[FigureDesigner] 保存失败:', error)
        this.$message.error('保存失败: ' + error.message)
      } finally {
        this.saving = false
      }
    },

    // 🔧 新增：为LevelledParaDesigner提供的方法，用于获取当前figure XML
    async generateFigureXml() {
      const validation = validateFigure({
        title: this.figureTitle,
        graphics: this.graphics,
        legends: this.legends
      })
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'))
      }

      const figureXml = await object2figure(null, {
        title: this.figureTitle,
        id: this.figureId,
        graphics: this.graphics,
        legends: this.legends
      })

      return figureXml
    }
  }
}
</script>

<style scoped lang="less">
.figure-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  .figure-toolbar {
    display: flex;
    flex-direction: column;
    padding: 4px 12px;
    background: whitesmoke;
    border-bottom: 1px solid #e8e8e8;
    flex-shrink: 0;

    .toolbar-header {
      display: flex;
      align-items: center;
      height: 36px;

      .toolbar-title {
        font-size: 11pt;
        font-weight: bold;
        color: #2d75cd;
        font-family: 'Microsoft YaHei';
      }
    }

    .toolbar-controls {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      padding: 8px 0;
      font-size: 12px;

      .control-item {
        display: flex;
        align-items: center;
        white-space: nowrap;

        .figure-input {
          margin-left: 4px;
          padding: 4px 6px;
          border: 1px solid #d9d9d9;
          border-radius: 2px;
          width: 280px;
          font-size: 12px;

          &:focus {
            border-color: #40a9ff;
            outline: none;
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
          }

          &:disabled {
            background-color: #f5f5f5;
            color: #999;
            cursor: not-allowed;
          }
        }
      }

      .save-btn {
        margin-left: auto;
      }
    }
  }

  .figure-main {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;

    .main-layout {
      display: flex;
      width: 100%;
      height: 100%;
      gap: 12px;

      // 左侧：图形和图例tabs（西区，与旧系统一致）
      .left-tabs {
        flex: 0 0 680px;
        border-right: 1px solid #d9d9d9;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #fff;

        .figure-tabs {
          flex: 1;
          display: flex;
          flex-direction: column;

          /deep/ .ant-tabs-bar {
            margin-bottom: 0;
            border-bottom: 1px solid #d9d9d9;
          }

          /deep/ .ant-tabs-tab {
            padding: 8px 20px;
            font-size: 14px;
            font-weight: 500;
          }

          /deep/ .ant-tabs-content {
            flex: 1;
            overflow: hidden;
            padding: 8px;
          }

          /deep/ .ant-tabs-tabpane {
            height: 100%;
            overflow-y: auto;
          }

          /* ✅ 强制未激活的tab内容完全隐藏，避免图形和图例显示冲突 */
          /deep/ .ant-tabs-tabpane-inactive {
            display: none !important;
          }
        }
      }

      // 右侧：预览区域（与旧系统一致）
      .right-preview {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 8px;

        .preview-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #fafafa;
          border: 1px solid #e8e8e8;
          border-radius: 2px;

          .panel-title {
            font-weight: 600;
            font-size: 12px;
            color: #333;
            padding: 12px;
            border-bottom: 1px solid #e8e8e8;
            text-decoration: underline;
            color: blue;
            cursor: pointer;
          }

          .preview-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 10px;
            overflow: hidden;
            text-align: center;

            .preview-image {
              max-width: 60%;
              max-height: 60%;
              object-fit: contain;
              margin: 0 auto;
            }
          }
        }
      }
    }
  }

  .empty-state {
    color: #999;
    font-size: 12px;
    text-align: center;
    padding: 20px 0;
  }
}
</style>
