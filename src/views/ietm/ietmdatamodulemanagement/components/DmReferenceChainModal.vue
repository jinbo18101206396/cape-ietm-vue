<template>
  <a-modal
    title="引用链"
    :width="700"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <!-- 引用链步骤展示 -->
      <a-steps
        :current="chain.length - 1"
        direction="vertical"
        size="small"
        status="finish"
      >
        <a-step
          v-for="(item, index) in chain"
          :key="index"
          :title="item.dmcCode"
        >
          <template slot="description">
            <div>
              <div style="margin-bottom: 8px;">
                <a-tag color="blue">{{ item.techName }}</a-tag>
                <a-tag v-if="item.infoName">{{ item.infoName }}</a-tag>
              </div>
              <div v-if="index < chain.length - 1" style="color: #999; font-size: 12px;">
                <a-icon type="arrow-down" />
                引用类型: <a-tag color="green" size="small">{{ item.refType || 'dmRef' }}</a-tag>
                <span v-if="item.refPosition" style="margin-left: 8px;">
                  位置: <code style="font-size: 11px;">{{ item.refPosition }}</code>
                </span>
              </div>
            </div>
          </template>
        </a-step>
      </a-steps>

      <!-- 统计信息 -->
      <a-card v-if="chain.length > 0" size="small" title="统计信息" style="margin-top: 16px;">
        <a-descriptions size="small" :column="2" bordered>
          <a-descriptions-item label="引用深度">
            {{ chain.length - 1 }} 层
          </a-descriptions-item>
          <a-descriptions-item label="引用节点">
            {{ chain.length }} 个
          </a-descriptions-item>
        </a-descriptions>
      </a-card>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'DmReferenceChainModal',
  data() {
    return {
      visible: false,
      loading: false,
      rootDmc: '',
      rootDmId: '',
      targetDmc: '',
      targetDmId: '',
      refType: 'out', // 引用类型：out-出引用，in-入引用
      chain: []
    }
  },
  methods: {
    // 显示引用链
    show(record, rootDmId, rootDmc, refType) {
      this.visible = true
      this.loading = true
      this.rootDmc = rootDmc
      this.rootDmId = rootDmId
      this.targetDmc = record.dmcCode
      this.targetDmId = record.id
      this.refType = refType || 'out' // 默认为出引用

      // 调用后端接口查询引用链
      this.loadReferenceChain()
    },

    // 加载引用链数据
    loadReferenceChain() {
      getAction('/ietm/datamodule/referenceChain', {
        rootDmId: this.rootDmId,
        targetDmId: this.targetDmId,
        refType: this.refType
      }).then(res => {
        if (res.success) {
          this.chain = res.result || []
          if (this.chain.length === 0) {
            this.$message.warning('未找到引用链路径')
          }
        } else {
          this.$message.error(res.message || '加载引用链失败')
          this.chain = []
        }
      }).catch(err => {
        this.$message.error('加载引用链失败：' + err.message)
        this.chain = []
      }).finally(() => {
        this.loading = false
      })
    },

    // 关闭弹窗
    handleCancel() {
      this.visible = false
      this.chain = []
    }
  }
}
</script>

<style scoped>
/* 引用链步骤样式 */
.ant-steps-item-description code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
