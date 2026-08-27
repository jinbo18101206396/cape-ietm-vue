<template>
  <a-modal
    title="工作流管理"
    :width="900"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <!-- 工作流状态 -->
      <a-descriptions bordered :column="2" size="small">
        <a-descriptions-item label="工作流状态">
          <a-badge :status="getStatusBadge()" :text="getStatusText()" />
        </a-descriptions-item>
        <a-descriptions-item label="当前节点">
          {{ workflowInfo.currentStep || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="当前处理人">
          {{ workflowInfo.currentHandler || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="实例ID">
          {{ workflowInfo.instanceId || '-' }}
        </a-descriptions-item>
      </a-descriptions>

      <!-- 启动工作流 -->
      <div v-if="!workflowInfo.instanceId" style="margin-top: 24px;">
        <a-divider>启动工作流</a-divider>
        <a-form-model :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <a-form-model-item label="流程类型">
            <a-select v-model="processKey" placeholder="请选择流程类型">
              <a-select-option value="dm_review">DM审核流程</a-select-option>
              <a-select-option value="dm_approve">DM审批流程</a-select-option>
            </a-select>
          </a-form-model-item>
          <a-form-model-item :wrapper-col="{ span: 18, offset: 6 }">
            <a-button type="primary" @click="handleStartWorkflow">启动工作流</a-button>
          </a-form-model-item>
        </a-form-model>
      </div>

      <!-- 流程历史 -->
      <div v-else style="margin-top: 24px;">
        <a-divider>流程历史</a-divider>
        <a-timeline>
          <a-timeline-item v-for="item in workflowHistory" :key="item.id" :color="item.color">
            <p><strong>{{ item.step }}</strong></p>
            <p>处理人：{{ item.handler }}</p>
            <p>处理时间：{{ item.time }}</p>
            <p v-if="item.comment">意见：{{ item.comment }}</p>
          </a-timeline-item>
        </a-timeline>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'

export default {
  name: 'DmWorkflowModal',
  data() {
    return {
      visible: false,
      loading: false,
      dmId: '',
      processKey: undefined,
      workflowInfo: {},
      workflowHistory: []
    }
  },
  methods: {
    show(dmId) {
      this.visible = true
      this.dmId = dmId
      this.loadWorkflowInfo()
    },
    loadWorkflowInfo() {
      // 加载工作流信息
      if (!this.dmId) {
        return
      }

      this.loading = true

      // 查询DM的工作流实例信息
      getAction('/ietm/workflow/instance/getByFormid', { formid: this.dmId })
        .then(res => {
          if (res.success && res.result) {
            const instance = res.result
            this.workflowInfo = {
              instanceId: instance.id,
              status: instance.status,
              currentStep: instance.workflowStep || '-',
              currentHandler: instance.workflowHandler || '-'
            }

            // 如果有实例ID，加载流程历史
            if (instance.id) {
              this.loadWorkflowHistory(instance.id)
            }
          } else {
            // 没有工作流实例
            this.workflowInfo = {}
            this.workflowHistory = []
          }
        })
        .catch(err => {
          console.error('加载工作流信息失败', err)
          this.$message.error('加载工作流信息失败')
          this.workflowInfo = {}
          this.workflowHistory = []
        })
        .finally(() => {
          this.loading = false
        })
    },

    loadWorkflowHistory(instanceId) {
      // 加载工作流执行历史
      getAction('/ietm/workflow/execute/listByInstId', { instid: instanceId })
        .then(res => {
          if (res.success && res.result) {
            this.workflowHistory = res.result.map(item => ({
              id: item.id,
              step: item.nodename || '未知节点',
              handler: item.createName || item.createBy || '系统',
              time: item.createTime || '-',
              comment: item.opinion || '',
              color: this.getHistoryColor(item.ifagree)
            }))
          }
        })
        .catch(err => {
          console.error('加载流程历史失败', err)
          this.workflowHistory = []
        })
    },

    getHistoryColor(ifagree) {
      // 根据审批结果返回时间轴颜色
      if (ifagree === '1') return 'green'  // 同意
      if (ifagree === '2') return 'red'    // 不同意
      if (ifagree === '3') return 'blue'   // 跳转
      return 'gray'  // 其他
    },
    getStatusBadge() {
      const status = this.workflowInfo.status
      if (status === '1') return 'processing'
      if (status === '2') return 'success'
      if (status === '3') return 'error'
      return 'default'
    },
    getStatusText() {
      const status = this.workflowInfo.status
      if (status === '1') return '审批中'
      if (status === '2') return '已通过'
      if (status === '3') return '已拒绝'
      return '未提交'
    },
    handleStartWorkflow() {
      if (!this.processKey) {
        this.$message.warning('请选择流程类型')
        return
      }

      postAction('/ietm/datamodule/startWorkflow', {
        id: this.dmId,
        processKey: this.processKey
      }).then(res => {
        if (res.success) {
          this.$message.success('工作流启动成功')
          this.loadWorkflowInfo()
        } else {
          this.$message.error(res.message || '启动失败')
        }
      })
    },
    handleCancel() {
      this.visible = false
    }
  }
}
</script>
