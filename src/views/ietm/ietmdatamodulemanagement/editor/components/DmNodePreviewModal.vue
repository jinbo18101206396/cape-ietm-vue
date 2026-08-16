<template>
  <a-modal
    v-model:visible="visible"
    :title="modalTitle"
    :width="600"
    :maskClosable="true"
    :footer="null"
    :destroyOnClose="true"
    wrapClassName="dm-node-preview-modal"
    @cancel="handleClose"
  >
    <!-- ICN/Symbol 预览 -->
    <div v-if="previewType === 'icn'" class="icn-preview-container">
      <img v-if="icnUrl" :src="icnUrl" style="max-width: 100%; max-height: 360px;" />
      <a-empty v-else description="ICN内容为空" />
    </div>

    <!-- Table 预览 -->
    <div v-if="previewType === 'table'" class="table-preview-container">
      <iframe
        v-if="tableHtml"
        :srcdoc="tableHtml"
        style="width: 100%; height: 360px; border: none;"
      ></iframe>
      <a-empty v-else description="表格内容为空" />
    </div>

    <!-- DmRef 信息 -->
    <div v-if="previewType === 'dmRef'" class="dmref-info-container">
      <a-descriptions :column="1" bordered size="small">
        <a-descriptions-item label="引用类型">{{ dmRefInfo.type }}</a-descriptions-item>
        <a-descriptions-item label="DMC">{{ dmRefInfo.dmc }}</a-descriptions-item>
        <a-descriptions-item label="标题">{{ dmRefInfo.title }}</a-descriptions-item>
        <a-descriptions-item label="Issue">{{ dmRefInfo.issue }}</a-descriptions-item>
      </a-descriptions>
    </div>
  </a-modal>
</template>

<script>
import { postAction } from '@/api/manage'
import { message } from 'ant-design-vue'

export default {
  name: 'DmNodePreviewModal',
  data() {
    return {
      visible: false,
      previewType: null, // 'icn', 'table', 'dmRef'
      modalTitle: '',
      icnUrl: null,
      tableHtml: null,
      dmRefInfo: {}
    }
  },
  methods: {
    /**
     * 预览 graphic/symbol 节点
     * @param {Object} node - 树节点对象
     */
    async previewIcn(node) {
      this.previewType = 'icn'
      this.modalTitle = (node.attributes && node.attributes.name) === 'graphic' ? '图形预览' : '符号预览'
      this.visible = true

      try {
        // 从节点属性中获取ICN标识
        const attrval = node.attributes && node.attributes.attrval
        if (!attrval) {
          message.warning('ICN属性为空')
          return
        }

        // 解析ICN标识
        let icnIdent
        try {
          const parsed = JSON.parse(attrval)
          icnIdent = parsed.infoEntityIdent
        } catch (e) {
          // 如果不是JSON，直接使用原值
          icnIdent = attrval
        }

        if (!icnIdent) {
          message.warning('ICN标识为空')
          return
        }

        // 调用API获取ICN内容
        const response = await postAction('/ietm/icn/operation/getIcnContent', { icn: icnIdent })

        if (response && response.dto && response.dto.id) {
          const { id, filename } = response.dto

          // 获取文件扩展名
          const ext = filename ? filename.substring(filename.lastIndexOf('.')).toLowerCase() : '.cgm'

          // 构建ICN URL
          this.icnUrl = `/jeecg-boot/ietm/icn/ViewIcn?url=${id}${ext}`
        } else {
          message.warning('ICN内容为空')
          this.icnUrl = null
        }
      } catch (error) {
        console.error('获取ICN内容失败:', error)
        message.error('获取ICN内容失败')
        this.icnUrl = null
      }
    },

    /**
     * 预览 table 节点
     * @param {Object} node - 树节点对象
     * @param {String} xmlContent - 完整XML内容
     * @param {Number} linenoOffset - 行号偏移
     */
    previewTable(node, xmlContent, linenoOffset) {
      this.previewType = 'table'
      this.modalTitle = '表格预览'
      this.visible = true

      try {
        // 计算实际行号
        const lineno = node.attributes.lineno + linenoOffset - 1

        // 从XML中提取表格内容
        const lines = xmlContent.split('\n')

        // 找到table标签的起止位置
        let startLine = lineno
        let endLine = lineno
        let depth = 0

        // 向后查找匹配的</table>
        for (let i = startLine; i < lines.length; i++) {
          const line = lines[i]
          if (line.includes('<table')) depth++
          if (line.includes('</table>')) {
            depth--
            if (depth === 0) {
              endLine = i
              break
            }
          }
        }

        // 提取表格XML
        const tableXml = lines.slice(startLine, endLine + 1).join('\n')

        // 检查是否为空表格
        const cleanXml = tableXml.replace(/\s/g, '')
        if (cleanXml === '<table></table>' || cleanXml === '<table/>') {
          message.info('表格内容为空')
          this.tableHtml = null
          return
        }

        // 简单渲染表格HTML（实际应该调用XSLT转换）
        // 这里暂时直接显示XML，后续可以调用预览API转换
        this.tableHtml = `
          <html>
            <head>
              <style>
                body { font-family: Arial, 宋体, SimSun; padding: 10px; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #000; padding: 4px 8px; }
                th { background-color: #f0f0f0; font-weight: bold; }
              </style>
            </head>
            <body>
              <pre>${this.escapeHtml(tableXml)}</pre>
            </body>
          </html>
        `
      } catch (error) {
        console.error('预览表格失败:', error)
        message.error('预览表格失败')
        this.tableHtml = null
      }
    },

    /**
     * 显示 dmRef 信息
     * @param {Object} node - 树节点对象
     * @param {String} xmlContent - 完整XML内容
     * @param {Number} linenoOffset - 行号偏移
     */
    showDmRefInfo(node, xmlContent, linenoOffset) {
      this.previewType = 'dmRef'
      this.modalTitle = 'DM引用信息'
      this.visible = true

      try {
        // 计算实际行号
        const lineno = node.attributes.lineno + linenoOffset - 1
        const lines = xmlContent.split('\n')

        // 提取dmRef标签内容
        let dmRefXml = ''
        let startLine = lineno
        let endLine = lineno

        // 向后查找匹配的</dmRef>
        for (let i = startLine; i < lines.length; i++) {
          const line = lines[i]
          dmRefXml += line + '\n'
          if (line.includes('</dmRef>')) {
            endLine = i
            break
          }
        }

        // 简单解析dmRef属性（实际应该用XML解析器）
        const dmcMatch = dmRefXml.match(/dmCode="([^"]+)"/)
        const typeMatch = dmRefXml.match(/dmRefAddressItems[^>]*>/)

        this.dmRefInfo = {
          type: 'DM引用',
          dmc: dmcMatch ? dmcMatch[1] : '未找到',
          title: '(需要查询DM标题)',
          issue: '(需要查询Issue信息)'
        }
      } catch (error) {
        console.error('解析dmRef失败:', error)
        message.error('解析dmRef失败')
        this.dmRefInfo = { type: '解析失败', dmc: '', title: '', issue: '' }
      }
    },

    /**
     * HTML转义
     */
    escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }
      return text.replace(/[&<>"']/g, m => map[m])
    },

    handleClose() {
      this.visible = false
      this.icnUrl = null
      this.tableHtml = null
      this.dmRefInfo = {}
    }
  }
}
</script>

<style scoped>
.dm-node-preview-modal :deep(.ant-modal) {
  position: fixed;
  right: 20px;
  top: 100px;
  margin: 0;
}

.icn-preview-container,
.table-preview-container,
.dmref-info-container {
  min-height: 200px;
  max-height: 360px;
  overflow: auto;
}

.icn-preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
