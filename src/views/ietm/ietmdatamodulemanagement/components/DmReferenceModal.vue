<template>
  <a-modal
    title="引用关系"
    :width="900"
    :visible="visible"
    :footer="null"
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
            >
              <template slot="title" slot-scope="item">
                <span>
                  <a-icon :type="item.icon" />
                  <strong style="margin-left: 8px;">{{ item.dmcCode }}</strong>
                  <span style="margin-left: 8px; color: #999;">{{ item.techName }}</span>
                  <a-tag v-if="item.isCircular" color="red" style="margin-left: 8px;">
                    <a-icon type="warning" /> 循环引用
                  </a-tag>
                  <a-tag v-if="item.refType" color="blue" style="margin-left: 8px;">
                    {{ item.refType }}
                  </a-tag>
                </span>
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
            >
              <span slot="dmcCode" slot-scope="text, record">
                <a @click="handleViewDm(record)">{{ text }}</a>
              </span>

              <span slot="refType" slot-scope="text">
                <a-tag color="blue">{{ text }}</a-tag>
              </span>

              <span slot="refDepth" slot-scope="text">
                <a-tag>第{{ text }}层</a-tag>
              </span>

              <span slot="action" slot-scope="text, record">
                <a @click="handleViewDm(record)">查看</a>
                <a-divider type="vertical" />
                <a @click="handleShowReference(record)">引用链</a>
              </span>
            </a-table>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'

export default {
  name: 'DmReferenceModal',
  data() {
    return {
      visible: false,
      loading: false,
      calculating: false,   // 计算引用信息 loading 状态
      requestSeq: 0,        // 防竞态：每次 loadReferenceTree 自增，响应回来时校验是否最新
      currentDmc: '',
      currentDmId: '',
      refType: 'out', // out-出引用, in-入引用
      treeData: [],
      outRefCount: 0,
      inRefCount: 0,
      maxDepth: 0,
      detailColumns: [
        {
          title: 'DMC编码',
          dataIndex: 'dmcCode',
          width: 250,
          scopedSlots: { customRender: 'dmcCode' }
        },
        {
          title: '技术名称',
          dataIndex: 'techName',
          ellipsis: true
        },
        {
          title: '引用类型',
          dataIndex: 'refType',
          width: 120,
          scopedSlots: { customRender: 'refType' }
        },
        {
          title: '引用深度',
          dataIndex: 'refDepth',
          width: 100,
          scopedSlots: { customRender: 'refDepth' }
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: 150,
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
      this.treeData = data.map(item => this.convertToTreeNode(item))
    },

    // 转换为树节点
    convertToTreeNode(item) {
      const node = {
        key: item.dmId,
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
          flatData.push({
            id: item.dmId,
            dmcCode: item.dmcCode,
            techName: item.techName,
            infoName: item.infoName,
            refType: item.refType,
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
      this.$message.info(`查看DM：${record.dmcCode}`)
      // TODO: 打开DM查看弹窗
    },

    // 显示引用链
    handleShowReference(record) {
      this.$message.info(`显示引用链：${record.dmcCode}`)
      // TODO: 高亮显示引用路径
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

.ant-tree >>> .ant-tree-node-content-wrapper {
  display: inline-block;
  width: 100%;
}
</style>
