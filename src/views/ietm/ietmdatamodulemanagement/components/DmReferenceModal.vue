<template>
  <a-modal
    title="引用关系"
    :width="1000"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <!-- 顶部信息 -->
      <a-alert
        :message="`当前DM：${currentDmc}`"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 引用类型切换 -->
      <a-radio-group v-model="refType" button-style="solid" style="margin-bottom: 16px" @change="handleRefTypeChange">
        <a-radio-button value="out">
          <a-icon type="export" /> 出引用 ({{ outRefCount }})
        </a-radio-button>
        <a-radio-button value="in">
          <a-icon type="import" /> 入引用 ({{ inRefCount }})
        </a-radio-button>
      </a-radio-group>

      <!-- 引用关系树 -->
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

      <!-- 引用统计 -->
      <a-divider>引用统计</a-divider>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-statistic title="出引用数量" :value="outRefCount" suffix="个">
            <template #prefix>
              <a-icon type="export" style="color: #1890ff;" />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="8">
          <a-statistic title="入引用数量" :value="inRefCount" suffix="个">
            <template #prefix>
              <a-icon type="import" style="color: #52c41a;" />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="8">
          <a-statistic title="引用深度" :value="maxDepth" suffix="层">
            <template #prefix>
              <a-icon type="apartment" style="color: #faad14;" />
            </template>
          </a-statistic>
        </a-col>
      </a-row>

      <!-- 引用详情列表 -->
      <a-divider>引用详情</a-divider>
      <a-table
        :columns="detailColumns"
        :dataSource="detailDataSource"
        :pagination="false"
        size="small"
        rowKey="id"
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
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'DmReferenceModal',
  data() {
    return {
      visible: false,
      loading: false,
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

    // 加载引用关系树
    loadReferenceTree() {
      this.loading = true
      getAction('/ietm/datamodule/referenceTree', {
        dmId: this.currentDmId,
        refType: this.refType
      }).then(res => {
        if (res.success) {
          const data = res.result || []
          this.buildTreeData(data)
          this.buildDetailData(data)
          this.calculateStatistics(data)
        } else {
          this.$message.error(res.message || '加载引用关系失败')
        }
      }).finally(() => {
        this.loading = false
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
    }
  }
}
</script>

<style scoped>
.ant-tree >>> .ant-tree-node-content-wrapper {
  display: inline-block;
  width: 100%;
}
</style>
