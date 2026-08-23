<template>
  <a-modal
    title="批量重新启动流程"
    :width="1000"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    :maskClosable="false"
    :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px' }"
  >
    <a-spin :spinning="confirmLoading">
      <a-form-model ref="form" :model="model" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="info-circle" class="section-icon" />
            基本信息
          </div>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="选中DM数量">
                <a-input :value="`${selectedDmCount} 条`" disabled />
              </a-form-model-item>
            </a-col>

            <a-col :span="12">
              <a-form-model-item label="紧急级别" required>
                <a-radio-group v-model="model.ifurgent">
                  <a-radio value="1">一般</a-radio>
                  <a-radio value="2">紧急</a-radio>
                  <a-radio value="3">特急</a-radio>
                </a-radio-group>
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="24">
              <a-form-model-item label="重启原因" required :label-col="{ span: 2 }" :wrapper-col="{ span: 22 }">
                <a-textarea
                  v-model="model.reason"
                  placeholder="请输入重启原因"
                  :rows="3"
                  :maxLength="200"
                />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- 流程节点配置 -->
        <div class="form-section" style="margin-top: 16px;">
          <div class="section-title">
            <a-icon type="apartment" class="section-icon" />
            流程节点配置
          </div>

          <a-table
            :columns="nodeColumns"
            :data-source="model.nodes"
            :pagination="false"
            bordered
            size="small"
            rowKey="seqno"
          >
            <template slot="nodename" slot-scope="text, record">
              <a-input v-model="record.nodename" placeholder="请输入节点名称" />
            </template>

            <template slot="nodetype" slot-scope="text, record">
              <a-select v-model="record.nodetype" placeholder="请选择" style="width: 100%">
                <a-select-option value="0">创建节点</a-select-option>
                <a-select-option value="1">审核节点</a-select-option>
                <a-select-option value="2">签批节点</a-select-option>
              </a-select>
            </template>

            <template slot="userid" slot-scope="text, record">
              <a-input
                v-model="record.userid"
                placeholder="用户ID（逗号分隔）"
                @blur="() => handleUseridChange(record)"
              />
            </template>

            <template slot="useridname" slot-scope="text, record">
              <a-input v-model="record.useridname" placeholder="用户姓名（逗号分隔）" />
            </template>

            <template slot="action" slot-scope="text, record, index">
              <a
                @click="handleDeleteNode(index)"
                :disabled="model.nodes.length <= 1"
                :style="{ color: model.nodes.length <= 1 ? '#ccc' : '#1890ff' }"
              >
                删除
              </a>
            </template>
          </a-table>

          <a-button
            type="dashed"
            block
            @click="handleAddNode"
            style="margin-top: 16px"
          >
            <a-icon type="plus" /> 添加节点
          </a-button>
        </div>
      </a-form-model>
    </a-spin>
  </a-modal>
</template>

<script>
import { postAction } from '@/api/manage'
import { generateUUID } from '@/utils/util'

export default {
  name: 'BatchRestartFlowModal',
  data() {
    return {
      visible: false,
      confirmLoading: false,
      selectedRecords: [],
      model: {
        batchId: '',
        reason: '',
        dataList: [],
        ifurgent: '1',
        nodes: [
          {
            seqno: 0,
            nodename: '创建节点',
            nodetype: '0',
            userid: '',
            useridname: '',
            stagename: '',
            ifgetback: ''
          }
        ]
      },
      nodeColumns: [
        {
          title: '顺序',
          dataIndex: 'seqno',
          width: 60,
          align: 'center'
        },
        {
          title: '节点名称',
          dataIndex: 'nodename',
          width: 150,
          scopedSlots: { customRender: 'nodename' }
        },
        {
          title: '节点类型',
          dataIndex: 'nodetype',
          width: 120,
          scopedSlots: { customRender: 'nodetype' }
        },
        {
          title: '处理人ID',
          dataIndex: 'userid',
          scopedSlots: { customRender: 'userid' }
        },
        {
          title: '处理人姓名',
          dataIndex: 'useridname',
          scopedSlots: { customRender: 'useridname' }
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: 80,
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      ]
    }
  },
  computed: {
    selectedDmCount() {
      return this.selectedRecords.length
    }
  },
  methods: {
    // 打开弹窗
    show(selectedRecords) {
      this.visible = true
      this.selectedRecords = selectedRecords
      this.model.batchId = generateUUID()

      // ⚠️ 自动填充重启原因（对标旧系统：fullissueno+'版重新启动流程'）
      if (selectedRecords.length === 1 && selectedRecords[0]) {
        const record = selectedRecords[0]
        const fullissueno = record.fullissueno || `${record.issueNo}-${record.inWork}`
        this.model.reason = `${fullissueno}版重新启动流程`
      } else {
        this.model.reason = ''
      }

      // 构建dataList（dmId + oldInstanceId）
      this.model.dataList = selectedRecords.map(record => ({
        dmId: record.id,
        oldInstanceId: record.workflowInstanceId || ''
      }))

      // 重置节点配置
      this.model.nodes = [
        {
          seqno: 0,
          nodename: '创建节点',
          nodetype: '0',
          userid: '',
          useridname: '',
          stagename: '',
          ifgetback: ''
        }
      ]
    },

    // 添加节点
    handleAddNode() {
      const maxSeqno = Math.max(...this.model.nodes.map(n => n.seqno))
      this.model.nodes.push({
        seqno: maxSeqno + 10,
        nodename: '',
        nodetype: '1',
        userid: '',
        useridname: '',
        stagename: '',
        ifgetback: ''
      })
    },

    // 删除节点
    handleDeleteNode(index) {
      if (this.model.nodes.length > 1) {
        this.model.nodes.splice(index, 1)
      }
    },

    // 处理userid变化
    handleUseridChange(record) {
      if (record.userid && !record.useridname) {
        const userids = record.userid.split(',')
        record.useridname = userids.map(id => `用户${id.trim()}`).join(',')
      }
    },

    // 提交
    handleOk() {
      // 前端表单验证
      const errors = this.validateForm()
      if (errors.length > 0) {
        this.$message.warning(errors[0])
        return
      }

      this.confirmLoading = true

      const params = {
        batchId: this.model.batchId,
        reason: this.model.reason,
        dataList: this.model.dataList,
        nodes: this.model.nodes,
        ifurgent: this.model.ifurgent
      }

      // ⚠️ 修复：正确的接口路径
      postAction('/ietm/workflow/instance/batchRestartFlow', params)
        .then(res => {
          if (res.success) {
            this.$message.success(res.message || '批量重启成功')
            this.handleCancel()
            this.$emit('ok')
          } else {
            this.$message.error(res.message || '批量重启失败')
          }
        })
        .catch(err => {
          console.error('批量重启失败', err)
          // 区分错误类型
          if (err.response) {
            const status = err.response.status
            if (status === 400) {
              this.$message.error('请求参数错误：' + (err.response.data.message || ''))
            } else if (status === 401) {
              this.$message.error('未登录或登录已过期，请重新登录')
            } else if (status === 500) {
              this.$message.error('服务器错误：' + (err.response.data.message || ''))
            } else {
              this.$message.error('操作失败：' + (err.message || '未知错误'))
            }
          } else if (err.request) {
            this.$message.error('网络错误，请检查网络连接')
          } else {
            this.$message.error('操作失败：' + (err.message || '未知错误'))
          }
        })
        .finally(() => {
          this.confirmLoading = false
        })
    },

    // 前端表单验证
    validateForm() {
      const errors = []

      // 验证重启原因
      if (!this.model.reason || !this.model.reason.trim()) {
        errors.push('请输入重启原因')
        return errors
      }

      if (this.model.reason.length > 200) {
        errors.push('重启原因不能超过200个字符')
        return errors
      }

      // 验证紧急级别
      if (!this.model.ifurgent) {
        errors.push('请选择紧急级别')
        return errors
      }

      // 验证节点配置
      if (this.model.nodes.length === 0) {
        errors.push('请至少配置一个节点')
        return errors
      }

      let hasCreateNode = false
      const seqnoSet = new Set()

      for (const node of this.model.nodes) {
        // 验证必填字段
        if (!node.nodename || !node.nodename.trim()) {
          errors.push('节点名称不能为空')
          break
        }
        if (!node.nodetype) {
          errors.push('节点类型不能为空')
          break
        }
        if (!node.userid || !node.userid.trim()) {
          errors.push('处理人ID不能为空')
          break
        }
        if (!node.useridname || !node.useridname.trim()) {
          errors.push('处理人姓名不能为空')
          break
        }

        // 验证seqno重复
        if (seqnoSet.has(node.seqno)) {
          errors.push(`节点顺序号重复：${node.seqno}`)
          break
        }
        seqnoSet.add(node.seqno)

        // 检查创建节点
        if (node.nodetype === '0') {
          hasCreateNode = true
          if (node.seqno !== 0) {
            errors.push('创建节点的顺序号必须为0')
            break
          }
        }
      }

      if (!hasCreateNode && errors.length === 0) {
        errors.push('必须包含创建节点（节点类型=创建节点）')
      }

      return errors
    },

    // 取消
    handleCancel() {
      this.visible = false
      this.selectedRecords = []
      this.model.reason = ''
      this.model.dataList = []
    }
  }
}
</script>

<style scoped>
.form-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
}

.section-icon {
  margin-right: 8px;
  color: #1890ff;
}
</style>
