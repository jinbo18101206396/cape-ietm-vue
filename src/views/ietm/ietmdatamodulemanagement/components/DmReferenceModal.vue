<template>
  <a-modal
    title="引用关系"
    :width="900"
    :visible="visible"
    :footer="null"
    :z-index="1000"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <!-- 顶部工具栏：当前DM信息 + 计算引用 -->
      <div class="ref-header">
        <a-alert
          :message="`当前DM：${currentDmc}`"
          type="info"
          show-icon
          class="ref-header__alert"
        />
        <a-button
          type="primary"
          icon="calculator"
          :loading="calculating"
          @click="handleCalculateRef"
        >
          计算该DM引用信息
        </a-button>
      </div>

      <!-- 统计条 -->
      <a-row :gutter="12" class="ref-stats">
        <a-col :span="8">
          <div class="ref-stats__item">
            <a-icon type="export" class="ref-stats__icon ref-stats__icon--out" />
            <span class="ref-stats__label">出引用</span>
            <span class="ref-stats__value">{{ outRefCount }}</span>
          </div>
        </a-col>
        <a-col :span="8">
          <div class="ref-stats__item">
            <a-icon type="import" class="ref-stats__icon ref-stats__icon--in" />
            <span class="ref-stats__label">入引用</span>
            <span class="ref-stats__value">{{ inRefCount }}</span>
          </div>
        </a-col>
        <a-col :span="8">
          <div class="ref-stats__item">
            <a-icon type="apartment" class="ref-stats__icon ref-stats__icon--depth" />
            <span class="ref-stats__label">引用深度</span>
            <span class="ref-stats__value">{{ maxDepth }}</span>
          </div>
        </a-col>
      </a-row>

      <!-- 引用类型切换 -->
      <a-radio-group v-model="refType" button-style="solid" class="ref-toggle" @change="handleRefTypeChange">
        <a-radio-button value="out">
          <a-icon type="export" /> 出引用
        </a-radio-button>
        <a-radio-button value="in">
          <a-icon type="import" /> 入引用
        </a-radio-button>
      </a-radio-group>

      <!-- 关系树 / 详情列表 标签页 -->
      <a-tabs default-active-key="tree" size="small" class="ref-tabs">
        <a-tab-pane key="tree">
          <span slot="tab"><a-icon type="apartment" /> 关系树</span>
          <div class="ref-pane">
            <a-tree
              v-if="treeData.length > 0"
              :tree-data="treeData"
              :default-expand-all="true"
              :show-line="true"
              class="ref-tree"
            >
              <template slot="title" slot-scope="item">
                <div class="tree-node" :class="{ 'tree-node--root': item.isRoot }">
                  <div class="tree-node__main">
                    <span class="tree-node__code">{{ item.dmcCode }}</span>
                    <span v-if="item.techName" class="tree-node__name">{{ item.techName }}</span>
                  </div>
                  <div class="tree-node__meta">
                    <span v-if="item.refDepth" class="tree-node__depth">L{{ item.refDepth }}</span>
                    <a-tag v-if="item.refType" color="blue" size="small">{{ item.refType }}</a-tag>
                    <a-tag v-if="item.isCircular" color="red" size="small"><a-icon type="warning" /> 循环</a-tag>
                  </div>
                </div>
              </template>
            </a-tree>
            <a-empty v-else description="暂无引用关系" />
          </div>
        </a-tab-pane>

        <a-tab-pane key="detail">
          <span slot="tab"><a-icon type="unordered-list" /> 详情列表</span>
          <div class="ref-pane">
            <a-table
              :columns="detailColumns"
              :dataSource="detailDataSource"
              :pagination="false"
              size="small"
              :rowKey="(record, index) => index"
              class="ref-detail-table"
            >
              <span slot="dmcCode" slot-scope="text, record">
                <a @click="handleViewDm(record)">{{ text }}</a>
              </span>

              <span slot="refType" slot-scope="text">
                <a-tag color="blue" size="small">{{ text }}</a-tag>
              </span>

              <span slot="refDepth" slot-scope="text">
                <span class="depth-badge">L{{ text }}</span>
              </span>

              <span slot="action" slot-scope="text, record">
                <a @click="handleShowReference(record)">引用链</a>
              </span>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-spin>

    <!-- DM内容预览弹窗（嵌套） -->
    <dm-ref-content-modal ref="dmRefContentModal" @show-detail="handleShowFullDetail" />

    <!-- DM完整详情弹窗（嵌套） -->
    <dm-view-modal ref="dmViewModal" />

    <!-- 引用链弹窗（嵌套） -->
    <dm-reference-chain-modal ref="dmReferenceChainModal" />
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import DmRefContentModal from './DmRefContentModal'
import DmViewModal from './DmViewModal'
import DmReferenceChainModal from './DmReferenceChainModal'

export default {
  name: 'DmReferenceModal',
  components: {
    DmRefContentModal,
    DmViewModal,
    DmReferenceChainModal
  },
  data() {
    return {
      visible: false,
      loading: false,
      calculating: false,   // 计算引用信息 loading 状态
      requestSeq: 0,        // 防竞态：每次 loadReferenceTree 自增，响应回来时校验是否最新
      currentDmc: '',
      currentDmId: '',
      currentTechName: '',  // 当前DM技术名称
      currentInfoName: '',  // 当前DM信息名称
      refType: 'out', // out-出引用, in-入引用
      treeData: [],
      outRefCount: 0,
      inRefCount: 0,
      maxDepth: 0,
      detailColumns: [
        {
          title: 'DMC编码',
          dataIndex: 'dmcCode',
          width: 330,
          scopedSlots: { customRender: 'dmcCode' }
        },
        {
          title: '技术名称',
          dataIndex: 'techName',
          width: 140,
          ellipsis: true
        },
        {
          title: '信息名称',
          dataIndex: 'infoName',
          width: 140,
          ellipsis: true
        },
        {
          title: '引用类型',
          dataIndex: 'refType',
          width: 80,
          align: 'center',
          scopedSlots: { customRender: 'refType' }
        },
        {
          title: '层级',
          dataIndex: 'refDepth',
          width: 70,
          align: 'center',
          scopedSlots: { customRender: 'refDepth' }
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: 80,
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      ],
      detailDataSource: []
    }
  },
  methods: {
    // 显示弹窗
    show(record) {
      this.visible = true
      this.currentDmc = record.dmcCode
      this.currentDmId = record.id
      this.currentTechName = record.techName || ''
      this.currentInfoName = record.infoName || ''
      this.refType = 'out'
      this.loadReferenceTree()
    },

    // 加载引用关系树（防竞态版）
    loadReferenceTree() {
      const seq = ++this.requestSeq
      this.loading = true
      getAction('/ietm/datamodule/referenceTree', {
        dmId: this.currentDmId,
        refType: this.refType
      }).then(res => {
        // 若已有更新的请求发出，丢弃当前过期响应
        if (seq !== this.requestSeq) return
        if (res.success) {
          const data = res.result || []
          this.buildTreeData(data)
          this.buildDetailData(data)
          this.calculateStatistics(data)
        } else {
          this.$message.error(res.message || '加载引用关系失败')
        }
      }).catch(() => {
        if (seq !== this.requestSeq) return
        this.$message.error('加载引用关系失败，请重试')
      }).finally(() => {
        if (seq === this.requestSeq) this.loading = false
      })
    },

    // 计算该DM引用信息
    handleCalculateRef() {
      this.calculating = true
      postAction('/ietm/datamodule/calcref/' + this.currentDmId).then(res => {
        if (res.success) {
          const refCount = (res.result && res.result.refCount) || 0
          this.$message.success('计算引用信息成功，共提取 ' + refCount + ' 条引用')
          // 重新加载引用关系树以刷新统计数据
          this.loadReferenceTree()
        } else {
          this.$message.error(res.message || '计算引用信息失败')
        }
      }).catch(() => {
        this.$message.error('计算引用信息失败，请重试')
      }).finally(() => {
        this.calculating = false
      })
    },

    // 构建树形数据
    buildTreeData(data) {
      // 将当前DM作为根节点，后端返回的数据作为children
      const rootNode = {
        key: this.currentDmId,
        title: this.currentDmc,
        dmcCode: this.currentDmc,
        techName: this.currentTechName,
        infoName: this.currentInfoName,
        refType: '',
        refDepth: 0,
        isCircular: false,
        isRoot: true, // 标记为根节点
        icon: 'home',
        scopedSlots: { title: 'title' },
        children: data.map(item => this.convertToTreeNode(item))
      }

      this.treeData = [rootNode]
    },

    // 转换为树节点
    convertToTreeNode(item) {
      // 根据引用类型确定DM ID字段
      // 出引用：使用 targetDmId（当前DM引用了谁）
      // 入引用：使用 sourceDmId（谁引用了当前DM）
      const dmId = this.refType === 'out' ? item.targetDmId : item.sourceDmId

      const node = {
        key: dmId,
        title: item.dmcCode,
        dmcCode: item.dmcCode,
        techName: item.techName,
        infoName: item.infoName,
        refType: item.refType,
        refDepth: item.refDepth,
        isCircular: item.isCircular,
        icon: item.isCircular ? 'warning' : 'file-text',
        scopedSlots: { title: 'title' }
      }

      if (item.children && item.children.length > 0) {
        node.children = item.children.map(child => this.convertToTreeNode(child))
      }

      return node
    },

    // 构建详情列表数据
    buildDetailData(data) {
      const flatData = []
      const flatten = (items, depth = 1) => {
        items.forEach(item => {
          // 根据引用类型确定DM ID字段
          // 出引用：使用 targetDmId（当前DM引用了谁）
          // 入引用：使用 sourceDmId（谁引用了当前DM）
          const dmId = this.refType === 'out' ? item.targetDmId : item.sourceDmId

          flatData.push({
            id: dmId,
            dmcCode: item.dmcCode,
            techName: item.techName,
            infoName: item.infoName,
            refType: item.refType || 'dmRef', // 默认值
            refPosition: item.refPosition, // 引用位置
            refDepth: depth,
            isCircular: item.isCircular
          })
          if (item.children && item.children.length > 0) {
            flatten(item.children, depth + 1)
          }
        })
      }
      flatten(data)
      this.detailDataSource = flatData

      // 调试：查看数据
      console.log('详情列表数据:', flatData)
    },

    // 计算统计数据
    calculateStatistics(data) {
      if (this.refType === 'out') {
        this.outRefCount = this.countReferences(data)
      } else {
        this.inRefCount = this.countReferences(data)
      }
      this.maxDepth = this.calculateMaxDepth(data)
    },

    // 计算引用数量
    countReferences(data) {
      let count = 0
      const traverse = (items) => {
        items.forEach(item => {
          count++
          if (item.children && item.children.length > 0) {
            traverse(item.children)
          }
        })
      }
      traverse(data)
      return count
    },

    // 计算最大深度
    calculateMaxDepth(data, depth = 1) {
      if (!data || data.length === 0) return depth - 1
      let maxDepth = depth
      data.forEach(item => {
        if (item.children && item.children.length > 0) {
          const childDepth = this.calculateMaxDepth(item.children, depth + 1)
          maxDepth = Math.max(maxDepth, childDepth)
        }
      })
      return maxDepth
    },

    // 切换引用类型
    handleRefTypeChange() {
      this.loadReferenceTree()
    },

    // 查看DM
    handleViewDm(record) {
      if (!record.id) {
        this.$message.warning('无法获取DM ID')
        return
      }
      // 打开DM内容预览弹窗，传递引用信息
      const refInfo = {
        refType: record.refType,
        refPosition: record.refPosition
      }
      this.$refs.dmRefContentModal.show(record.id, refInfo)
    },

    // 从内容预览弹窗打开完整详情
    handleShowFullDetail(dmId) {
      this.$refs.dmViewModal.show(dmId)
    },

    // 显示引用链
    handleShowReference(record) {
      // 打开引用链弹窗，传递当前记录、根DM ID、根DMC、引用类型
      this.$refs.dmReferenceChainModal.show(record, this.currentDmId, this.currentDmc, this.refType)
    },

    // 关闭弹窗
    handleCancel() {
      this.visible = false
      this.treeData = []
      this.detailDataSource = []
      this.outRefCount = 0
      this.inRefCount = 0
      this.maxDepth = 0
      this.calculating = false
      this.requestSeq = 0
    }
  }
}
</script>

<style scoped>
/* 顶部工具栏 */
.ref-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ref-header__alert {
  flex: 1;
  margin-right: 12px;
  margin-bottom: 0;
}

/* 统计条 */
.ref-stats {
  margin-bottom: 12px;
}
.ref-stats__item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}
.ref-stats__icon {
  font-size: 18px;
  margin-right: 8px;
}
.ref-stats__icon--out {
  color: #1890ff;
}
.ref-stats__icon--in {
  color: #52c41a;
}
.ref-stats__icon--depth {
  color: #faad14;
}
.ref-stats__label {
  color: #666;
  margin-right: auto;
}
.ref-stats__value {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

/* 类型切换 */
.ref-toggle {
  margin-bottom: 12px;
}

/* 标签页内容面板：固定高度可滚动 */
.ref-pane {
  height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

/* 关系树优化样式 */
.ref-tree {
  font-size: 13px;
}

/* 树节点：简洁布局 */
.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  min-height: 32px;
  width: 100%;
  border-radius: 2px;
  transition: all 0.2s;
}

.tree-node:hover {
  background: #fafafa;
}

/* 根节点：突出显示 */
.tree-node--root {
  background: #e6f7ff;
  border-left: 3px solid #1890ff;
  padding-left: 8px;
  font-weight: 500;
}

.tree-node--root:hover {
  background: #d6f0ff;
}

/* 左侧主要信息 */
.tree-node__main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 10px;
}

.tree-node__code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #262626;
  flex-shrink: 0;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node--root .tree-node__code {
  font-weight: 600;
  font-size: 13px;
}

.tree-node__name {
  color: #8c8c8c;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右侧元数据 */
.tree-node__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 12px;
}

.tree-node__depth {
  display: inline-block;
  padding: 0 6px;
  height: 20px;
  line-height: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #fa8c16;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 2px;
}

/* 优化树节点间距 */
.ref-tree >>> .ant-tree-node-content-wrapper {
  display: inline-block;
  width: calc(100% - 24px);
  padding: 0;
  line-height: 1.5;
}

.ref-tree >>> .ant-tree-node-content-wrapper:hover {
  background: transparent;
}

.ref-tree >>> .ant-tree-treenode {
  padding: 2px 0;
}

/* 优化缩进 */
.ref-tree >>> .ant-tree-indent-unit {
  width: 18px;
}

/* 优化连接线 */
.ref-tree >>> .ant-tree-show-line .ant-tree-indent-unit::before {
  border-left: 1px solid #e8e8e8;
}

.ref-tree >>> .ant-tree-switcher {
  color: #bfbfbf;
}

/* 详情列表样式优化 */
.ref-detail-table {
  font-size: 13px;
}

.ref-detail-table >>> .ant-table {
  font-size: 13px;
}

.ref-detail-table >>> .ant-table-thead > tr > th {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  background: #fafafa;
}

.ref-detail-table >>> .ant-table-tbody > tr > td {
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.6;
}

.ref-detail-table >>> .ant-table-tbody > tr:hover > td {
  background: #fafafa;
}

/* DMC编码列 */
.ref-detail-table >>> td:first-child a {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

/* 层级徽章 */
.depth-badge {
  display: inline-block;
  padding: 2px 8px;
  height: 20px;
  line-height: 16px;
  font-size: 11px;
  font-weight: 600;
  color: #fa8c16;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 2px;
}

/* 操作链接 */
.ref-detail-table >>> .ant-table-tbody a {
  font-size: 13px;
}
</style>
