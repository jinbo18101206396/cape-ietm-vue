<template>
  <div class="dm-history-page">
    <!-- 页面标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <span class="page-title">查看历史版本</span>
        <a-tag color="blue" class="dmc-tag">{{ currentDmc || '未知DMC' }}</a-tag>
      </div>
    </div>

    <a-spin :spinning="loading">
      <!-- 工具栏 -->
      <div class="page-toolbar">
        <a-checkbox v-model="onlyPublished" @change="reload">只显示发布版本</a-checkbox>
        <a-button
          type="primary"
          icon="columns"
          @click="handleCompare"
          :disabled="selectedRowKeys.length !== 2"
          style="margin-left: 8px;">
          内容对比
        </a-button>
        <span class="toolbar-hint">（勾选两条版本进行 XML 差异对比）</span>
      </div>

      <!-- 版本列表 -->
      <a-table
        :columns="columns"
        :dataSource="enrichedDataSource"
        :pagination="ipagination"
        :loading="loading"
        size="middle"
        rowKey="id"
        :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
        :scroll="{x:true}"
        bordered
        @change="handleTableChange"
      >
        <!-- 锁定状态图标 -->
        <span slot="lockStatus" slot-scope="text, record">
          <a-tooltip
            v-if="record.checkoutUser && record.checkoutUser === currentUser"
            :title="`您已签出（可编辑）\n时间：${record.checkoutTime || ''}`">
            <a-icon type="check-circle" style="font-size:16px;color:#52c41a;" />
          </a-tooltip>
          <a-tooltip
            v-else-if="record.checkoutUser"
            :title="`已被【${record.checkoutUser}】签出\n时间：${record.checkoutTime || ''}`">
            <a-icon type="lock" style="font-size:16px;color:#ff4d4f;" />
          </a-tooltip>
          <a-tooltip v-else title="已签入">
            <a-icon type="lock" style="font-size:16px;color:#d9d9d9;" />
          </a-tooltip>
        </span>

        <!-- 版本号：issueNo-inWork 格式 -->
        <span slot="fullIssueNo" slot-scope="text, record">
          <a-tag color="blue">
            {{ record.issueNo }}-{{ record.inWork }}
          </a-tag>
        </span>

        <!-- 版本类型：使用更清晰的tag样式 -->
        <span slot="versionType" slot-scope="text, record">
          <a-tag :color="getVersionTypeColor(record.versionType, record)" style="min-width: 60px; text-align: center;">
            {{ getVersionTypeName(record.versionType, record) }}
          </a-tag>
        </span>

        <!-- 版本日期：空值显示"-" -->
        <span slot="issueDate" slot-scope="text, record">
          {{ record.issueDate || '-' }}
        </span>

        <!-- 操作列 -->
        <span slot="action" slot-scope="text, record">
          <a @click="handleBrowseDm(record)">浏览DM</a>
        </span>
      </a-table>
    </a-spin>

    <!-- 内容对比弹窗 -->
    <a-modal
      title="版本对比"
      :width="1600"
      :visible="compareModalVisible"
      :footer="null"
      @cancel="onCompareClose"
      :destroyOnClose="true"
      :bodyStyle="{ padding: '0', height: '85vh', display: 'flex', flexDirection: 'column' }"
      centered
      wrapClassName="dm-compare-modal"
    >
      <!-- 固定顶部区域 -->
      <div class="compare-header-fixed">
        <!-- 版本信息栏 - 紧凑布局 -->
        <div class="compare-versions-bar">
          <!-- 版本 A -->
          <div class="version-item version-left">
            <div class="version-badge badge-primary">
              <a-icon type="file-text" />
              <span>版本 A</span>
            </div>
            <div class="version-info-compact">
              <span class="info-dmc">{{ compareSource && compareSource.dmcCode }}</span>
              <span class="info-meta" v-if="compareSource && compareSource.issueDate">{{ compareSource.issueDate }}</span>
            </div>
            <a-button size="small" icon="align-left" @click="formatSide(0)">格式化</a-button>
          </div>

          <!-- 分隔符 -->
          <div class="version-divider">
            <a-icon type="swap" class="swap-icon" />
          </div>

          <!-- 版本 B -->
          <div class="version-item version-right">
            <div class="version-badge badge-success">
              <a-icon type="file-text" />
              <span>版本 B</span>
            </div>
            <div class="version-info-compact">
              <span class="info-dmc">{{ compareTarget && compareTarget.dmcCode }}</span>
              <span class="info-meta" v-if="compareTarget && compareTarget.issueDate">{{ compareTarget.issueDate }}</span>
            </div>
            <a-button size="small" icon="align-left" @click="formatSide(1)">格式化</a-button>
          </div>
        </div>

        <!-- 对比图例 - 紧凑设计 -->
        <div class="compare-legend-simple">
          <span class="legend-label">
            <a-icon type="info-circle" />
            差异
          </span>
          <span class="legend-tag legend-added">
            <span class="legend-color"></span>
            新增
          </span>
          <span class="legend-tag legend-deleted">
            <span class="legend-color"></span>
            删除
          </span>
          <span class="legend-tag legend-changed">
            <span class="legend-color"></span>
            修改
          </span>
        </div>
      </div>

      <!-- 可滚动内容区域 -->
      <div class="compare-body-scrollable">
        <!-- MergeView容器 -->
        <div ref="mergeContainer" class="dm-merge-container"></div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'DmHistoryView',
  data() {
    return {
      loading: false,
      currentDmc: '',
      onlyPublished: false,
      queryParam: { projectId: '', sns: '', infoCode: '', infoCodeVariant: '', ietmLocationCode: '' },
      dataSource: [],
      selectedRowKeys: [],
      compareSource: null,
      compareTarget: null,
      compareModalVisible: false,
      // 对比视图相关变量
      orig0: '',
      orig1: '',
      mergeView: null,
      // 分页配置（与信息码管理页面保持一致）
      ipagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showTotal: (total, range) => {
          return range[0] + '-' + range[1] + ' 共' + total + '条'
        },
        showQuickJumper: true,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '30', '50', '100']
      },
      columns: [
        { title: '', align: 'center', width: 40,
          scopedSlots: { customRender: 'lockStatus' } },
        { title: 'DMC', dataIndex: 'dmcCode', width: 300, ellipsis: true, align: 'center' },
        { title: '技术名称', dataIndex: 'techName', width: 150, ellipsis: true, align: 'center' },
        { title: '信息名称', dataIndex: 'infoName', width: 150, ellipsis: true, align: 'center' },
        { title: '版本', width: 120, align: 'center',
          scopedSlots: { customRender: 'fullIssueNo' } },
        { title: '版本类型', width: 100, align: 'center',
          scopedSlots: { customRender: 'versionType' } },
        { title: '版本日期', width: 110, align: 'center',
          scopedSlots: { customRender: 'issueDate' } },
        { title: '创建人', dataIndex: 'createBy', width: 100, align: 'center' },
        { title: '操作', width: 100, fixed: 'right', align: 'center',
          scopedSlots: { customRender: 'action' } }
      ]
    }
  },
  computed: {
    currentUser() {
      return (this.$store.getters.userInfo && this.$store.getters.userInfo.username) || ''
    },
    // 直接使用数据库返回的数据，不进行动态拼接
    enrichedDataSource() {
      return this.dataSource
    }
  },
  created() {
    // 从路由 query 读取参数
    const q = this.$route.query || {}
    this.currentDmc = q.dmcCode || ''
    this.queryParam = {
      projectId: q.projectId || '',
      sns: q.sns || '',
      infoCode: q.infoCode || '',
      infoCodeVariant: q.infoCodeVariant || '',
      ietmLocationCode: q.ietmLocationCode || ''
    }
    this.reload()

    // 动态加载 CodeMirror MergeView 插件
    this.loadCodeMirrorMergeView()
  },
  mounted() {
    // 确保 CodeMirror 和 MergeView 已加载
    this.ensureCodeMirrorLoaded()
  },
  beforeDestroy() {
    this.mergeView = null
  },
  methods: {
    // ✅ 验证版本号一致性
    validateVersionConsistency(xmlContent, record, versionLabel) {
      if (!xmlContent || !record) return

      try {
        // 提取XML中的issueNumber和inWork
        const issueInfoMatch = xmlContent.match(/<issueInfo[^>]*issueNumber\s*=\s*["']([^"']+)["'][^>]*inWork\s*=\s*["']([^"']+)["'][^>]*>/i)

        if (issueInfoMatch) {
          const xmlIssueNumber = issueInfoMatch[1]
          const xmlInWork = issueInfoMatch[2]
          const dbIssueNo = record.issueNo || ''
          const dbInWork = record.inWork || ''

          // 对比版本号
          if (xmlIssueNumber !== dbIssueNo || xmlInWork !== dbInWork) {
            const msg = `版本 ${versionLabel} 版本号不一致！\n` +
                       `数据库记录: ${dbIssueNo}-${dbInWork}\n` +
                       `XML内部: ${xmlIssueNumber}-${xmlInWork}\n` +
                       `请注意：显示的版本号以数据库记录为准`

            this.$warning({
              title: '版本号不一致警告',
              content: msg,
              okText: '知道了'
            })
          }
        }
      } catch (e) {
        console.error('[版本号验证失败]', e)
      }
    },

    // 动态构建DMC编码，确保与issueNo/inWork一致
    buildDmcCode(record) {
      if (!record) return ''
      // 根据S1000D标准拼接完整DMC（包含语言和国家代码）
      // 格式: DMC-{sns}-{infoCode}{variant}-{location}_{issue}-{inWork}_{lang}-{country}
      const sns = record.sns || ''
      const infoCodePart = (record.infoCode || '') + (record.infoCodeVariant || '')
      const location = record.ietmLocationCode || 'A'
      const issueBlock = (record.issueNo || '001') + '-' + (record.inWork || '00')
      const langBlock = (record.languageIsoCode || 'zh') + '-' + (record.countryIsoCode || 'CN')

      // 拼接完整DMC（如果sns为空，则不显示DMC前缀）
      if (!sns) {
        return ''
      }
      return `DMC-${sns}-${infoCodePart}-${location}_${issueBlock}_${langBlock}`
    },

    reload() {
      this.loading = true
      getAction('/ietm/datamodule/historyVersions', {
        ...this.queryParam,
        onlyPublished: this.onlyPublished,
        pageNo: this.ipagination.current,
        pageSize: this.ipagination.pageSize
      }).then(res => {
        if (res.success) {
          // 如果后端返回的是分页结构
          if (res.result && res.result.records) {
            this.dataSource = res.result.records || []
            this.ipagination.total = res.result.total || 0
          } else {
            // 兼容：后端返回的是数组（前端分页）
            const allData = res.result || []
            this.ipagination.total = allData.length
            const start = (this.ipagination.current - 1) * this.ipagination.pageSize
            const end = start + this.ipagination.pageSize
            this.dataSource = allData.slice(start, end)
          }
        } else {
          this.$message.error(res.message || '加载历史版本失败')
        }
      }).catch(err => {
        console.error('请求历史版本出错:', err)
        this.$message.error('加载历史版本失败')
      }).finally(() => { this.loading = false })
    },

    handleTableChange(pagination) {
      this.ipagination = pagination
      this.reload()
    },

    onSelectChange(keys) {
      if (keys.length > 2) {
        this.$message.warning('内容对比最多选择两条版本')
        // 保留前2条选择，防止checkbox视觉与实际数据不一致
        this.selectedRowKeys = keys.slice(0, 2)
        return
      }
      this.selectedRowKeys = keys
    },

    // 浏览DM：新窗口打开XML编辑器查看当前历史版本
    handleBrowseDm(record) {
      // ✅ 验证: 确认DMC完整性
      const dmcParts = (record.dmcCode || '').split('-')
      if (dmcParts.length < 5) {
        this.$message.error(`DMC编码不完整：${record.dmcCode}`)
        return
      }

      // 注：不需要检查 dmContent 是否为空
      // 编辑器有模板回退逻辑：当 dm_content 为空时，自动从模板文件加载XML

      // ✅ 打开编辑器，传递完整信息确保一一对应（在Tab页签中打开）
      this.$router.push({
        path: `/ietm/dm-content-editor/${record.id}`,
        query: {
          mode: 'browse',
          dmc: record.dmcCode || '',
          version: `${record.issueNo}-${record.inWork}`,  // ✅ 添加版本号
          historyId: record.id  // ✅ 明确标识这是历史版本ID
        }
      })
    },

    // 内容对比：必须勾选恰好2条，行序靠前在左
    handleCompare() {
      if (this.selectedRowKeys.length !== 2) {
        this.$message.warning('请选择两条数据来进行内容对比。')
        return
      }
      const idx = this.dataSource.map(r => r.id)
      const [a, b] = this.selectedRowKeys.slice().sort(
        (x, y) => idx.indexOf(x) - idx.indexOf(y)
      )
      this.compareSource = this.dataSource.find(r => r.id === a)
      this.compareTarget = this.dataSource.find(r => r.id === b)
      this.compareModalVisible = true

      getAction('/ietm/datamodule/compareVersions', { sourceId: a, targetId: b })
        .then(res => {
          if (res.success) {
            this.orig0 = res.result.sourceContent || ''
            this.orig1 = res.result.targetContent || ''
            this.$nextTick(() => {
              setTimeout(() => this.renderDiff(this.orig0, this.orig1), 300)
            })
          } else {
            this.$message.error(res.message || '对比失败')
          }
        })
    },

    // ==================== 历史版本对比相关方法 ====================

    /**
     * 渲染 XML 差异对比（使用 CodeMirror MergeView）
     */
    renderDiff(leftXml, rightXml) {
      // 版本号验证
      this.$nextTick(() => {
        const target = this.$refs.mergeContainer
        if (target && leftXml && rightXml) {
          this.validateVersionConsistency(leftXml, this.compareSource, 'A')
          this.validateVersionConsistency(rightXml, this.compareTarget, 'B')
        }
      })

      // 渲染 CodeMirror MergeView
      this.$nextTick(() => {
        const target = this.$refs.mergeContainer
        if (!target) return

        target.innerHTML = ''

        if (typeof window.CodeMirror === 'undefined') {
          this.$message.error('CodeMirror 未加载')
          return
        }

        const CodeMirror = window.CodeMirror

        this.mergeView = CodeMirror.MergeView(target, {
          value: leftXml || '',
          origLeft: null,
          orig: rightXml || '',
          lineNumbers: true,
          mode: 'xml',
          theme: 'default',
          highlightDifferences: true,
          connect: 'align',
          collapseIdentical: false,
          readOnly: true,
          viewportMargin: 10
        })

        // 强制刷新
        setTimeout(() => {
          if (this.mergeView) {
            this.mergeView.editor().refresh()
            this.mergeView.rightOriginal().refresh()
          }
        }, 100)
      })
    },

    /**
     * 格式化某一侧的 XML
     */
    formatSide(side) {
      if (!this.mergeView) {
        this.$message.warning('对比视图未初始化')
        return
      }

      try {
        const editor = side === 0 ? this.mergeView.editor() : this.mergeView.rightOriginal()
        const xml = editor.getValue()
        const formatted = this.formatXml(xml)
        editor.setValue(formatted)
        this.$message.success('格式化完成')
      } catch (err) {
        this.$message.error('格式化失败: ' + err.message)
      }
    },

    /**
     * 格式化 XML 字符串
     */
    formatXml(xml) {
      if (!xml || !xml.trim()) return xml

      try {
        const PADDING = ' '.repeat(2) // 缩进2空格
        const reg = /(>)(<)(\/*)/g
        let formatted = xml.replace(reg, '$1\n$2$3')

        let pad = 0
        formatted = formatted.split('\n').map(node => {
          let indent = 0
          // 支持中文元素名：将 \w 替换为 [\w一-鿿]（CJK统一表意文字）
          if (node.match(/.+<\/[\w一-鿿][^>]*>$/)) {
            indent = 0
          } else if (node.match(/^<\/[\w一-鿿]/)) {
            if (pad !== 0) pad -= 1
          } else if (node.match(/^<[\w一-鿿]([^>]*[^\/])?>.*$/)) {
            indent = 1
          } else {
            indent = 0
          }

          const padding = PADDING.repeat(pad)
          pad += indent

          return padding + node
        }).join('\n')

        return formatted
      } catch (err) {
        console.error('[formatXml] 格式化失败:', err)
        return xml
      }
    },

    /**
     * 获取版本类型名称
     * 直接使用数据库中的 issueType 字段
     */
    getVersionTypeName(versionType, record) {
      if (!record) return '-'
      return record.issueType || '-'
    },

    /**
     * 获取版本类型颜色
     * 根据 issueType 返回对应颜色
     */
    getVersionTypeColor(versionType, record) {
      if (!record || !record.issueType) return 'default'
      const issueType = record.issueType
      if (issueType === 'new') return 'green'
      if (issueType === 'revised') return 'blue'
      if (issueType === 'changed') return 'orange'
      if (issueType === 'deleted') return 'red'
      return 'default'
    },

    onCompareClose() {
      this.compareModalVisible = false
      if (this.$refs.mergeContainer) this.$refs.mergeContainer.innerHTML = ''
      this.mergeView = null
      this.orig0 = ''
      this.orig1 = ''
    },

    /**
     * 动态加载 CodeMirror MergeView 插件
     */
    loadCodeMirrorMergeView() {
      if (window.CodeMirror && window.CodeMirror.MergeView) {
        return Promise.resolve()
      }

      const baseUrl = window.location.origin + '/static/ietmeditor/CodeMirror'

      return this.loadScript(`${baseUrl}/lib/codemirror.js`)
        .then(() => this.loadScript(`${baseUrl}/mode/xml/xml.js`))
        .then(() => this.loadCSS(`${baseUrl}/lib/codemirror.css`))
        .then(() => this.loadScript(`${baseUrl}/addon/merge/diff_match_patch.js`))
        .then(() => this.loadScript(`${baseUrl}/addon/merge/merge.js`))
        .then(() => this.loadCSS(`${baseUrl}/addon/merge/merge.css`))
        .catch(err => {
          console.error('加载 CodeMirror MergeView 失败:', err)
          this.$message.error('加载代码编辑器失败')
        })
    },

    /**
     * 确保 CodeMirror 已加载
     */
    ensureCodeMirrorLoaded() {
      if (!window.CodeMirror || !window.CodeMirror.MergeView) {
        this.loadCodeMirrorMergeView()
      }
    },

    /**
     * 动态加载 JS 脚本
     */
    loadScript(src) {
      return new Promise((resolve, reject) => {
        // 检查是否已存在
        const existingScript = document.querySelector(`script[src="${src}"]`)
        if (existingScript) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = src
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
        document.head.appendChild(script)
      })
    },

    /**
     * 动态加载 CSS 样式
     */
    loadCSS(href) {
      return new Promise((resolve, reject) => {
        // 检查是否已存在
        const existingLink = document.querySelector(`link[href="${href}"]`)
        if (existingLink) {
          resolve()
          return
        }

        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        link.onload = () => resolve()
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`))
        document.head.appendChild(link)
      })
    }
  }
}
</script>

<style scoped>
.dm-history-page {
  padding: 16px;
  background: #fff;
  min-height: 100%;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
}
.dmc-tag {
  font-family: Consolas, Monaco, monospace;
}
.page-toolbar {
  margin-bottom: 12px;
}
.toolbar-hint {
  margin-left: 8px;
  color: #999;
}

/* 对比弹窗全局样式 */
.dm-compare-modal >>> .ant-modal-body {
  padding: 0 !important;
  height: 85vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

/* 固定顶部区域 - 简约设计 */
/* ==================== 版本对比弹窗样式 ==================== */

.compare-header-fixed {
  flex-shrink: 0;
  background: #fafafa;
  border-bottom: 2px solid #e8e8e8;
  z-index: 10;
}

/* 版本信息栏 - 紧凑横向布局 */
.compare-versions-bar {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  gap: 16px;
  background: #fafafa;
}

.version-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.version-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  flex-shrink: 0;
}

.version-badge .anticon {
  font-size: 12px;
}

.badge-primary {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  color: #0050b3;
  border: 1px solid #91d5ff;
}

.badge-success {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  color: #389e0d;
  border: 1px solid #b7eb8f;
}

/* 版本信息紧凑展示 */
.version-info-compact {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.info-dmc {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}

.info-meta {
  font-size: 12px;
  color: #8c8c8c;
  flex-shrink: 0;
}

/* 分隔符 */
.version-divider {
  flex-shrink: 0;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swap-icon {
  font-size: 20px;
  color: #bfbfbf;
  transition: all 0.3s ease;
}

.swap-icon:hover {
  color: #1890ff;
  transform: rotate(180deg);
}

/* 对比图例 - 紧凑设计 */
.compare-legend-simple {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
}

.legend-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #595959;
  margin-right: 4px;
}

.legend-label .anticon {
  font-size: 13px;
  color: #1890ff;
}

.legend-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 3px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  font-size: 11px;
  color: #595959;
  transition: all 0.2s;
}

.legend-tag:hover {
  background: #f0f0f0;
}

.legend-color {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-added .legend-color {
  background: #d4f7dc;
  border: 1px solid #52c41a;
}

.legend-deleted .legend-color {
  background: #ffd4d4;
  border: 1px solid #ff4d4f;
}

.legend-changed .legend-color {
  background: #fff4d4;
  border: 1px solid #faad14;
}

.compare-body-scrollable {
  flex: 1;
  overflow: auto;
  background: #fff;
}

.dm-merge-container {
  width: 100%;
  height: 100%;
}

.legend-label {
  color: #595959;
  font-weight: 500;
}

.legend-tag {
  padding: 2px 10px;
  border-radius: 3px;
  font-size: 12px;
  border: 1px solid transparent;
}

.legend-tag.legend-added {
  background: #f6ffed;
  color: #52c41a;
  border-color: #b7eb8f;
}

.legend-tag.legend-deleted {
  background: #fff2e8;
  color: #fa8c16;
  border-color: #ffd591;
}

.legend-tag.legend-changed {
  background: #fffbe6;
  color: #faad14;
  border-color: #ffe58f;
}

/* 可滚动内容区域 */
.compare-body-scrollable {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  background: #f5f5f5;
}

/* 滚动条样式优化 */
.compare-body-scrollable::-webkit-scrollbar {
  width: 8px;
}

.compare-body-scrollable::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.compare-body-scrollable::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 4px;
}

.compare-body-scrollable::-webkit-scrollbar-thumb:hover {
  background: #8c8c8c;
}

/* 版本对比容器 - 简约样式 */
.dm-merge-container {
  min-height: 800px;
  height: auto;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: visible;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* CodeMirror基础样式 - 简约设计 */
.dm-merge-container >>> .CodeMirror {
  height: auto;
  min-height: 800px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  border-radius: 4px;
}

.dm-merge-container >>> .CodeMirror-merge {
  height: auto;
  min-height: 800px;
  border: none;
}

/* 左右编辑器面板 - 简化布局 */
.dm-merge-container >>> .CodeMirror-merge-pane-leftmost {
  width: calc(50% - 20px);
}

.dm-merge-container >>> .CodeMirror-merge-pane-rightmost {
  width: calc(50% - 20px);
}

/* 分隔栏 - 简约样式 */
.dm-merge-container >>> .CodeMirror-merge-gap {
  width: 40px;
  background: #fafafa;
  border-left: 1px solid #e8e8e8;
  border-right: 1px solid #e8e8e8;
}

.dm-merge-container >>> .CodeMirror-merge-spacer {
  width: 40px !important;
  min-width: 40px;
  max-width: 40px;
  background: #fafafa;
}

/* 滚动区域 */
.dm-merge-container >>> .CodeMirror-scroll {
  overflow: auto !important;
  min-height: 100%;
}

/* 行号 - 简约样式 */
.dm-merge-container >>> .CodeMirror-linenumber {
  color: #bfbfbf;
  font-size: 12px;
  padding: 0 5px;
}

.dm-merge-container >>> .CodeMirror-gutters {
  background-color: #fafafa;
  border-right: 1px solid #e8e8e8;
}

/* 差异高亮 - 柔和配色 */
.dm-merge-container >>> .CodeMirror-merge-r-inserted {
  background-color: #f6ffed;
}

.dm-merge-container >>> .CodeMirror-merge-r-deleted {
  background-color: #fff2e8;
}

.dm-merge-container >>> .CodeMirror-merge-r-chunk {
  background-color: #fffbe6;
}

/* 滚动区域 - 确保显示滚动条 */
.dm-merge-container >>> .CodeMirror-scroll {
  overflow: auto !important;
  overflow-x: auto !important;
  overflow-y: auto !important;
  min-height: 100%;
}

/* 滚动条样式优化 */
.dm-merge-container >>> .CodeMirror-scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.dm-merge-container >>> .CodeMirror-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 5px;
}

.dm-merge-container >>> .CodeMirror-scroll::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 5px;
}

.dm-merge-container >>> .CodeMirror-scroll::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 中间间隔区域 */
.dm-merge-container >>> .CodeMirror-merge-spacer {
  background: #f5f5f5;
  border-left: 1px solid #e8e8e8;
  border-right: 1px solid #e8e8e8;
  width: 50px !important;  /* 强制宽度 */
  min-width: 50px;
  max-width: 50px;
  flex-shrink: 0;  /* 防止弹性布局收缩 */
  box-sizing: border-box;  /* 确保边框包含在宽度内 */
}

/* 行号样式 */
.dm-merge-container >>> .CodeMirror-linenumber {
  color: #999;
  font-size: 12px;
  padding: 0 5px;
}

.dm-merge-container >>> .CodeMirror-gutters {
  background-color: #f7f7f7;
  border-right: 1px solid #ddd;
}

/* 活动行高亮 */
.dm-merge-container >>> .CodeMirror-activeline-background {
  background: #f0f9ff;
}

/* 差异高亮样式 */
.dm-merge-container >>> .CodeMirror-merge-r-inserted {
  background-color: #e6ffed;
}

.dm-merge-container >>> .CodeMirror-merge-r-deleted {
  background-color: #ffeef0;
}

.dm-merge-container >>> .CodeMirror-merge-r-chunk {
  background-color: #fff5b1;
}

/* 连接线样式 */
.dm-merge-container >>> .CodeMirror-merge-gap {
  width: 50px;
}

/* 代码内容区域 */
.dm-merge-container >>> .CodeMirror-code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

/* 确保内容区域可以水平滚动 */
.dm-merge-container >>> .CodeMirror-sizer {
  min-width: 100% !important;
}

.dm-merge-container >>> .CodeMirror-lines {
  padding: 4px 0;
}
</style>
