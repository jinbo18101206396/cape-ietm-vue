<template>
  <div class="multimedia-designer">
    <!-- 工具栏 -->
    <div class="multimedia-toolbar" v-if="showSaveBtn">
      <!-- 标题行 -->
      <div class="toolbar-header">
        <span class="toolbar-title">◤多媒体◢</span>
      </div>

      <!-- 控制行（标题、ID、保存按钮在同一行）-->
      <div class="toolbar-controls">
        <label class="control-item">标题：<input type="text" v-model="multimediaTitle" class="multimedia-input" :disabled="readonly" placeholder="多媒体标题（必填）"/></label>
        <label class="control-item">ID：<input type="text" v-model="multimediaId" class="multimedia-input" :disabled="readonly" placeholder="多媒体ID（可选）"/></label>
        <a-button type="primary" icon="save" @click="handleSave" :loading="saving" class="save-btn">保存</a-button>
      </div>
    </div>

    <!-- 主容器：左侧多媒体对象 + 右侧预览 -->
    <div class="multimedia-main">
      <div class="main-layout">
        <!-- 左侧：多媒体对象 -->
        <div class="left-tabs">
          <div class="multimedia-panel">
            <div class="panel-header">
              <span class="panel-title">{{ objectTabTitle }}</span>
            </div>
            <div class="panel-content">
              <multimedia-object-designer
                ref="objectDesigner"
                :multimedia-objects="multimediaObjects"
                :readonly="readonly"
                @object-select="handleSelectObject"
                @add-object="handleAddObject"
                @delete-object="handleDeleteObject"
                @move-object="handleMoveObject"
              />
            </div>
          </div>
        </div>

        <!-- 右侧：预览区域 -->
        <div class="right-preview">
          <div class="preview-panel">
            <div class="panel-title">预览</div>
            <div class="preview-container">
              <a-spin :spinning="previewLoading" tip="加载预览中...">
                <!-- 视频预览 -->
                <video
                  v-if="previewType === 'video'"
                  :src="previewUrl"
                  controls
                  class="preview-media">
                  您的浏览器不支持视频播放
                </video>

                <!-- 音频预览 -->
                <audio
                  v-else-if="previewType === 'audio'"
                  :src="previewUrl"
                  controls
                  class="preview-media">
                  您的浏览器不支持音频播放
                </audio>

                <!-- 图像预览（CGM转换后的图片） -->
                <img
                  v-else-if="previewType === 'image'"
                  :src="previewUrl"
                  class="preview-image"
                  alt="多媒体预览"/>

                <!-- 3D模型预览 -->
                <div v-else-if="previewType === '3d'" class="preview-3d">
                  <Model3DViewer
                    v-if="previewUrl"
                    :fileUrl="previewUrl"
                    :fileExt="currentFileExt"
                    @loaded="handle3DLoaded"
                    @error="handle3DError"
                  />
                </div>

                <!-- 空状态 -->
                <div v-else class="empty-state">请先选择多媒体对象</div>
              </a-spin>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 插入多媒体弹窗 -->
    <ietm-multimedia-dialog
      :visible="multimediaDialogVisible"
      @update:visible="multimediaDialogVisible = $event"
      @insert="handleSymbolInsert"
    />
  </div>
</template>

<script>
import { multimedia2object, object2multimedia, validateMultimedia, toEnMultimediaXml } from '../utils/multimediaConverter'
import IetmMultimediaDialog from './IetmMultimediaDialog'
import MultimediaObjectDesigner from './MultimediaObjectDesigner'
import Model3DViewer from '@/views/ietm/icnmanage/modules/Model3DViewer.vue'
import { getAction, postAction } from '@/api/manage'
import Vue from 'vue'
import { ACCESS_TOKEN } from '@/store/mutation-types'

export default {
  name: 'MultimediaDesigner',

  components: {
    IetmMultimediaDialog,
    MultimediaObjectDesigner,
    Model3DViewer
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
      multimediaTitle: '',
      multimediaId: '',
      multimediaObjects: [],
      endline: -1,
      saving: false,
      selectedObjectIndex: -1,
      previewUrl: '',
      previewType: '',  // 'video' | 'audio' | 'image' | '3d'
      previewLoading: false,
      multimediaDialogVisible: false,
      currentFileExt: ''  // 当前预览文件的扩展名（用于3D模型）
    }
  },

  computed: {
    readonly() { return this.ifedit === '0' },
    showSaveBtn() { return this.save === '1' },
    objectTabTitle() {
      return `多媒体对象[${this.multimediaObjects.length}]`
    }
  },

  mounted() {
    this.loadContent()
  },

  beforeDestroy() {
    // 清理资源，防止内存泄漏
    this.multimediaObjects = []

    // 清理 blob URL
    if (this.previewUrl && this.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl)
    }
    this.previewUrl = ''

    this.multimediaTitle = ''
    this.multimediaId = ''

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
        let multimediaXml = this.editor.getLine(this.lineno)
        const isSingleLine = multimediaXml.includes('<multimedia') && multimediaXml.includes('</multimedia>')

        if (!isSingleLine) {
          for (let i = this.lineno + 1; i < this.editor.lineCount(); i++) {
            if (this.editor.getLine(i).includes('</multimedia>')) {
              this.endline = i
              break
            }
          }
          if (this.endline === -1) {
            throw new Error('找不到</multimedia>结束标签')
          }
          multimediaXml = this.editor.getRange(
            { line: this.lineno, ch: 0 },
            { line: this.endline, ch: this.editor.getLine(this.endline).length }
          )
        } else {
          this.endline = this.lineno
        }

        if (this.locale === 'cn') {
          multimediaXml = this.toEnXml(multimediaXml)
        }

        // 检测空multimedia标签
        const isEmptyMultimedia = /^<multimedia[^>]*>\s*<\/multimedia>$/i.test(multimediaXml.trim())
        if (isEmptyMultimedia) {
          this.multimediaTitle = ''
          this.multimediaId = ''
          this.multimediaObjects = [{ icn: '', filename: '', multimediaType: '' }]
          this.selectedObjectIndex = 0
          return
        }

        // 非空multimedia：正常解析和验证
        const multimediaObj = await multimedia2object(null, multimediaXml)

        const validation = validateMultimedia(multimediaObj)
        if (!validation.valid) {
          const warnings = validation.errors.slice(0, 3).join('; ')
          this.$message.warning(`数据验证警告: ${warnings}`)
        }

        this.multimediaTitle = multimediaObj.title
        this.multimediaId = multimediaObj.id
        this.multimediaObjects = multimediaObj.multimediaObjects

        // 预加载所有对象的文件名（表格显示需要）
        await this.loadAllFilenames()

        // 优化: 按需加载预览
        if (this.multimediaObjects.length > 0) {
          await this.loadObjectPreview(0)
        }
      } catch (error) {
        this.$message.error('加载失败: ' + error.message)
        this.multimediaTitle = ''
        this.multimediaObjects = []
      }
    },

    /**
     * 预加载所有多媒体对象的文件名（用于表格显示）
     */
    async loadAllFilenames() {
      // 并行查询所有ICN的文件名
      const promises = this.multimediaObjects.map(async (obj) => {
        if (!obj.icn) return

        try {
          const response = await getAction(`/icnmanage/ietmIcnManage/queryByIcnCode?icn=${obj.icn}`)
          if (response.success && response.result && response.result.ietmAttachment) {
            const attachment = response.result.ietmAttachment
            obj.filename = attachment.fileName || attachment.fileKey
          }
        } catch (error) {
          console.error(`[MultimediaDesigner] 查询ICN文件名失败: ${obj.icn}`, error)
          // 静默失败，不影响其他对象的加载
        }
      })

      await Promise.all(promises)
    },

    async loadObjectPreview(index) {
      if (index < 0 || index >= this.multimediaObjects.length) {
        this.previewUrl = ''
        this.previewType = ''
        return
      }

      const obj = this.multimediaObjects[index]
      this.selectedObjectIndex = index

      if (!obj.icn) {
        this.previewUrl = ''
        this.previewType = ''
        return
      }

      this.previewLoading = true

      try {
        // 第一步：通过 ICN 查询获取 ICN ID
        const response = await getAction(`/icnmanage/ietmIcnManage/queryByIcnCode?icn=${obj.icn}`)

        if (!response.success || !response.result || !response.result.id) {
          this.$message.warning(`未找到ICN: ${obj.icn}`)
          this.previewUrl = ''
          this.previewType = ''
          return
        }

        const icnId = response.result.id
        const attachment = response.result.ietmAttachment

        // 保存原始文件名（用户友好）
        if (attachment) {
          obj.filename = attachment.fileName || attachment.fileKey
        }

        // 第二步：调用预览API获取预览信息（与IcnViewerModal一致）
        const previewRes = await getAction(`/icnmanage/ietmIcnManage/preview/${icnId}`)

        if (!previewRes.success || !previewRes.result || !previewRes.result.fileUrl) {
          this.$message.warning(`无法获取预览: ${previewRes.message || '未知错误'}`)
          this.previewUrl = ''
          this.previewType = ''
          return
        }

        const previewInfo = previewRes.result

        // 保存文件扩展名（用于3D模型预览）
        this.currentFileExt = previewInfo.fileExt || ''

        // 保存 multimediaType（根据预览类型映射）
        obj.multimediaType = this.mapPreviewTypeToMultimediaType(previewInfo.previewType)

        // 设置预览类型（统一使用小写）
        const previewType = previewInfo.previewType || ''
        if (previewType === 'VIDEO') {
          this.previewType = 'video'
        } else if (previewType === 'AUDIO') {
          this.previewType = 'audio'
        } else if (previewType === '3D') {
          this.previewType = '3d'
        } else if (previewType === 'IMAGE') {
          this.previewType = 'image'
        } else {
          this.previewType = ''
        }

        // 第三步：使用 fetch 携带 token 加载 blob URL（与IcnViewerModal一致）
        await this.loadBlobUrl(previewInfo.fileUrl)

      } catch (error) {
        console.error('[MultimediaDesigner] 加载预览异常:', error)
        this.$message.error(`加载预览失败: ${error.message}`)
        this.previewUrl = ''
        this.previewType = ''
      } finally {
        this.previewLoading = false
      }
    },

    // 映射后端预览类型到前端 multimediaType（符合S1000D 4.0标准）
    mapPreviewTypeToMultimediaType(previewType) {
      const mapping = {
        'VIDEO': 'video',
        'AUDIO': 'audio',  // 音频类型独立映射（符合S1000D 4.0标准）
        'IMAGE': 'other',  // 图像使用other类型
        '3D': '3D',
        'CGM': 'other',
        'FLASH': 'other',
        'SMG': 'other'
      }
      return mapping[previewType] || 'other'
    },

    async loadBlobUrl(fileUrl) {
      try {
        // 保存旧的blob URL，延迟释放
        const oldBlobUrl = this.previewUrl && this.previewUrl.startsWith('blob:') ? this.previewUrl : null

        // 先清空 previewUrl，避免子组件在加载期间使用旧 URL
        this.previewUrl = ''

        const token = Vue.ls.get(ACCESS_TOKEN)
        const baseUrl = window._CONFIG['domianURL'] || ''
        const fullUrl = baseUrl + fileUrl

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'X-Access-Token': token || ''
          }
        })

        // 检查Content-Type，防止把JSON错误当作Blob处理
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          // 返回的是JSON错误响应（如token失效），需要解析错误信息
          const json = await response.json()
          throw new Error(json.message || 'HTTP ' + response.status)
        }

        if (!response.ok) {
          throw new Error('HTTP ' + response.status)
        }

        const blob = await response.blob()

        // 检查Blob大小，防止空文件
        if (blob.size === 0) {
          throw new Error('文件为空或不存在')
        }

        // 创建新的 Blob URL
        this.previewUrl = URL.createObjectURL(blob)

        // 延迟释放旧的 Blob URL，确保组件已经切换到新 URL
        if (oldBlobUrl) {
          this.$nextTick(() => {
            URL.revokeObjectURL(oldBlobUrl)
          })
        }
      } catch (error) {
        throw new Error('加载文件失败: ' + error.message)
      }
    },

    handleTabChange(key) {
      // 保留方法以防万一，但由于移除了tabs，实际不会被调用
    },

    handleSelectObject(index) {
      this.selectedObjectIndex = index
      this.loadObjectPreview(index)
    },

    handleAddObject() {
      this.multimediaDialogVisible = true
    },

    handleSymbolInsert(insertData) {
      // 处理兼容性：insertData 可能是字符串（旧格式）或对象（新格式）
      let icn, fileName
      let symbolXml

      if (typeof insertData === 'string') {
        // 旧格式：直接是 symbolXml 字符串
        symbolXml = insertData
        const icnMatch = symbolXml.match(/infoEntityIdent="([^"]+)"/)
        icn = icnMatch ? icnMatch[1] : null
        fileName = ''
      } else {
        // 新格式：{ symbolXml, icn, fileName }
        symbolXml = insertData.symbolXml
        icn = insertData.icn
        fileName = insertData.fileName || ''
      }

      if (!icn) {
        this.$message.error('无法解析ICN编号')
        return
      }

      // 文件类型验证（排除普通图像）
      const ext = icn.substr(icn.lastIndexOf('.')).toLowerCase()
      const imgextArr = ['.bmp', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff']

      if (imgextArr.includes(ext)) {
        this.$message.warning('图像文件请使用figure元素，不应使用multimedia元素')
        return
      }

      // 添加到multimediaObjects，直接设置 fileName（来自弹窗的准确值）
      this.multimediaObjects.push({
        icn: icn,
        filename: fileName,
        multimediaType: ''
        // 注意：根据S1000D 4.0标准，multimediaObject不支持hotspot
      })

      const newIndex = this.multimediaObjects.length - 1
      this.selectedObjectIndex = newIndex

      // 立即加载预览，如果有 fileName 则使用它，否则从 ICN 查询获取
      this.$nextTick(() => {
        this.loadObjectPreview(newIndex)
      })
    },

    handleDeleteObject(index) {
      if (index < 0 || index >= this.multimediaObjects.length) return

      this.multimediaObjects.splice(index, 1)

      // 更新选中索引
      if (this.selectedObjectIndex >= this.multimediaObjects.length) {
        this.selectedObjectIndex = this.multimediaObjects.length - 1
      }

      // 加载新的预览
      if (this.selectedObjectIndex >= 0) {
        this.loadObjectPreview(this.selectedObjectIndex)
      } else {
        this.previewUrl = ''
        this.previewType = ''
      }
    },

    handleMoveObject({ index, direction }) {
      if (direction === 'up' && index > 0) {
        const temp = this.multimediaObjects[index]
        this.$set(this.multimediaObjects, index, this.multimediaObjects[index - 1])
        this.$set(this.multimediaObjects, index - 1, temp)

        if (this.selectedObjectIndex === index) {
          this.selectedObjectIndex = index - 1
        } else if (this.selectedObjectIndex === index - 1) {
          this.selectedObjectIndex = index
        }
      } else if (direction === 'down' && index < this.multimediaObjects.length - 1) {
        const temp = this.multimediaObjects[index]
        this.$set(this.multimediaObjects, index, this.multimediaObjects[index + 1])
        this.$set(this.multimediaObjects, index + 1, temp)

        if (this.selectedObjectIndex === index) {
          this.selectedObjectIndex = index + 1
        } else if (this.selectedObjectIndex === index + 1) {
          this.selectedObjectIndex = index
        }
      }
    },

    // 3D模型加载成功
    handle3DLoaded() {
      console.log('[MultimediaDesigner] 3D模型加载成功')
    },

    // 3D模型加载失败
    handle3DError(error) {
      console.error('[MultimediaDesigner] 3D模型加载失败:', error)
      this.$message.error('3D模型加载失败，请检查文件格式是否正确')
    },

    async generateMultimediaXml() {
      // 前端验证
      const validation = validateMultimedia({
        title: this.multimediaTitle,
        multimediaObjects: this.multimediaObjects
      })

      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'))
      }

      // 生成XML
      const multimediaXml = await object2multimedia(null, {
        title: this.multimediaTitle,
        id: this.multimediaId,
        multimediaObjects: this.multimediaObjects
      })

      return multimediaXml
    },

    async handleSave() {
      if (this.saving) return

      try {
        // 前端验证
        const validation = validateMultimedia({
          title: this.multimediaTitle,
          multimediaObjects: this.multimediaObjects
        })

        if (!validation.valid) {
          this.$message.error(validation.errors.join('\n'))
          return
        }

        this.saving = true

        // 提交到后端
        const response = await postAction(
          '/ietm/dm-content/saveMultimediaContent',
          {
            dmId: this.cmnodeid,
            lineno: this.lineno,
            endline: this.endline,
            locale: this.locale,
            multimediaData: {
              title: this.multimediaTitle,
              id: this.multimediaId,
              multimediaObjects: this.multimediaObjects
            }
          }
        )

        if (!response.success) {
          throw new Error(response.message || '保存失败')
        }

        // 获取后端返回的标准XML
        let { multimediaXml, endline } = response.result

        // 计算基础缩进
        let baseIndent = 0
        if (this.editor) {
          const multimediaLine = this.editor.getLine(this.lineno)
          const match = multimediaLine.match(/^(\s*)/)
          if (match && match[1]) {
            baseIndent = match[1].length
          }
        }

        // 格式化XML
        let formattedXml = this.formateXml(multimediaXml, baseIndent)
        if (formattedXml && formattedXml.length > 0) {
          multimediaXml = formattedXml.replace(/\n$/, '')
        }

        // 触发父组件的save事件
        this.$emit('save', {
          lineno: this.lineno,
          endline: this.endline,
          multimediaXml: multimediaXml
        })

        this.$message.success('保存成功')
      } catch (error) {
        console.error('[MultimediaDesigner] 保存失败:', error)
        this.$message.error('保存失败: ' + error.message)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped lang="less">
.multimedia-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f5f5;
}

.multimedia-toolbar {
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  margin-bottom: 10px;
}

.toolbar-header {
  padding: 8px 12px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.toolbar-title {
  font-weight: 600;
  font-size: 14px;
  color: #1890ff;
}

.toolbar-controls {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  margin: 0;
}

.multimedia-input {
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  font-size: 13px;
  min-width: 400px;

  &:focus {
    outline: none;
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }

  &:disabled {
    background-color: #f5f5f5;
    color: rgba(0, 0, 0, 0.25);
    cursor: not-allowed;
  }
}

.save-btn {
  margin-left: auto;
}

.multimedia-main {
  flex: 1;
  overflow: hidden;
}

.main-layout {
  display: flex;
  height: 100%;
  gap: 10px;
}

.left-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px;
}

.multimedia-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  overflow: hidden;
}

.panel-header {
  padding: 10px 12px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.panel-content {
  flex: 1;
  overflow: auto;
}

.right-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px;
}

.preview-panel {
  flex: 1;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
}

.panel-title {
  padding: 10px 12px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  font-weight: 600;
  font-size: 14px;
}

.preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 15px;
  position: relative;

  // 让 a-spin 组件的两层包裹都填满整个容器
  /deep/ .ant-spin-nested-loading {
    width: 100%;
    height: 100%;
  }

  /deep/ .ant-spin-container {
    width: 100%;
    height: 100%;
  }
}

.preview-media {
  max-width: 58%;
  max-height: 58%;
  object-fit: contain;
  display: block;
  margin: auto;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.preview-3d {
  position: absolute;
  top: 15px;
  left: 15px;
  right: 15px;
  bottom: 15px;
  width: auto;
  height: auto;

  .threejs-container {
    width: 100%;
    height: 100%;
  }

  .model-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
  }
}

.empty-state {
  text-align: center;
  color: #999;
  font-size: 13px;
}
</style>

