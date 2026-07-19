<template>
  <a-modal
    title="批量新增ICN"
    :width="800"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form-model ref="form" :model="model" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-alert
        message="批量新增说明"
        description="系统将自动生成连续的唯一识别码（从当前最大值+1开始），其他字段保持一致。"
        type="info"
        show-icon
        style="margin-bottom: 16px;"
      />

      <a-form-model-item label="构型节点" required>
        <a-input :value="cmnodeName" disabled />
      </a-form-model-item>

      <a-form-model-item label="新增数量" required>
        <a-input-number
          v-model="model.count"
          :min="1"
          :max="100"
          placeholder="请输入要新增的ICN数量（1-100）"
          style="width: 100%;"
        />
      </a-form-model-item>

      <a-form-model-item label="变量码">
        <a-input v-model="model.variantCode" placeholder="请输入变量码（A-Z）" :maxLength="1" />
      </a-form-model-item>

      <a-form-model-item label="版本号" required>
        <a-input v-model="model.issueNo" placeholder="请输入版本号" :maxLength="3" />
      </a-form-model-item>

      <a-form-model-item label="密级" required>
        <a-select v-model="model.security" placeholder="请选择密级">
          <a-select-option :value="1">公开</a-select-option>
          <a-select-option :value="2">内部</a-select-option>
          <a-select-option :value="3">秘密</a-select-option>
          <a-select-option :value="4">机密</a-select-option>
        </a-select>
      </a-form-model-item>

      <a-form-model-item label="ICN分类">
        <a-input v-model="model.icnType" placeholder="请输入ICN分类" />
      </a-form-model-item>

      <a-form-model-item label="创作单位编码">
        <a-input v-model="model.originator" placeholder="请输入创作单位编码" :maxLength="2" />
      </a-form-model-item>

      <a-form-model-item label="创作单位名称">
        <a-input v-model="model.originatorName" placeholder="请输入创作单位名称" />
      </a-form-model-item>

      <a-form-model-item label="责任单位编码">
        <a-input v-model="model.rpc" placeholder="请输入责任单位编码" :maxLength="1" />
      </a-form-model-item>

      <a-form-model-item label="责任单位名称">
        <a-input v-model="model.rpcName" placeholder="请输入责任单位名称" />
      </a-form-model-item>
    </a-form-model>
  </a-modal>
</template>

<script>
import { postAction } from '@/api/manage'

export default {
  name: 'IcnBatchAddModal',
  data() {
    return {
      visible: false,
      confirmLoading: false,
      cmnodeId: '',
      cmnodeName: '',
      model: {
        count: 1,
        variantCode: '',
        issueNo: '001',
        security: 2,
        icnType: '',
        originator: '',
        originatorName: '',
        rpc: '',
        rpcName: ''
      }
    }
  },
  methods: {
    show(cmnodeId, cmnodeName) {
      this.visible = true
      this.cmnodeId = cmnodeId
      this.cmnodeName = cmnodeName
      this.resetForm()
    },

    resetForm() {
      this.model = {
        count: 1,
        variantCode: '',
        issueNo: '001',
        security: 2,
        icnType: '',
        originator: '',
        originatorName: '',
        rpc: '',
        rpcName: ''
      }
    },

    handleOk() {
      if (!this.model.count || this.model.count < 1) {
        this.$message.warning('请输入有效的新增数量')
        return
      }

      if (!this.model.issueNo) {
        this.$message.warning('请输入版本号')
        return
      }

      if (!this.model.security) {
        this.$message.warning('请选择密级')
        return
      }

      this.confirmLoading = true

      const params = {
        cmnodeId: this.cmnodeId,
        count: this.model.count,
        variantCode: this.model.variantCode,
        issueNo: this.model.issueNo,
        security: this.model.security,
        icnType: this.model.icnType,
        originator: this.model.originator,
        originatorName: this.model.originatorName,
        rpc: this.model.rpc,
        rpcName: this.model.rpcName
      }

      postAction('/icnmanage/ietmIcnManage/batchAdd', params)
        .then(res => {
          if (res.success) {
            this.$message.success(`批量新增成功，共创建 ${this.model.count} 条ICN记录`)
            this.handleCancel()
            this.$emit('ok')
          } else {
            this.$message.error(res.message || '批量新增失败')
          }
        })
        .catch(err => {
          console.error('批量新增异常', err)
          this.$message.error('批量新增失败')
        })
        .finally(() => {
          this.confirmLoading = false
        })
    },

    handleCancel() {
      this.visible = false
      this.resetForm()
    }
  }
}
</script>
