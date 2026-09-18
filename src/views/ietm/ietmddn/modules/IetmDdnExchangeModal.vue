<template>
  <a-modal
    :title="title"
    :width="800"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="关闭">

    <a-spin :spinning="confirmLoading">
      <a-form-model ref="form" :model="model" :rules="validatorRules" :label-col="labelCol" :wrapper-col="wrapperCol">

        <a-form-model-item label="DDN编码" prop="ddnCode">
          <a-input v-model="model.ddnCode" placeholder="请输入DDN编码" :disabled="!!model.id" />
        </a-form-model-item>

        <a-form-model-item label="DDN类型" prop="ddnType">
          <a-select v-model="model.ddnType" placeholder="请选择DDN类型">
            <a-select-option value="DM">DM</a-select-option>
            <a-select-option value="ICN">ICN</a-select-option>
            <a-select-option value="PM">PM</a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="导入导出标识" prop="impexp">
          <a-select v-model="model.impexp" placeholder="请选择导入导出标识">
            <a-select-option value="e">导出</a-select-option>
            <a-select-option value="i">导入</a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="型号代码" prop="modelIdentCode">
          <a-input v-model="model.modelIdentCode" placeholder="请输入型号代码" />
        </a-form-model-item>

        <a-form-model-item label="发送方代码" prop="senderIdent">
          <a-input v-model="model.senderIdent" placeholder="请输入发送方代码" />
        </a-form-model-item>

        <a-form-model-item label="接收方代码" prop="receiverIdent">
          <a-input v-model="model.receiverIdent" placeholder="请输入接收方代码" />
        </a-form-model-item>

        <a-form-model-item label="发布年份" prop="yearOfDataIssue">
          <a-input v-model="model.yearOfDataIssue" placeholder="请输入发布年份（4位数字）" />
        </a-form-model-item>

        <a-form-model-item label="序列号" prop="seqNumber">
          <a-input v-model="model.seqNumber" placeholder="请输入序列号" />
        </a-form-model-item>

        <a-form-model-item label="发布日期" prop="issueDate">
          <a-date-picker
            v-model="model.issueDate"
            style="width: 100%"
            format="YYYY-MM-DD"
            placeholder="请选择发布日期" />
        </a-form-model-item>

        <a-form-model-item label="密级" prop="security">
          <a-input v-model="model.security" placeholder="请输入密级" />
        </a-form-model-item>

        <a-form-model-item label="DM数量" prop="dmCount">
          <a-input-number v-model="model.dmCount" :min="0" style="width: 100%" placeholder="请输入DM数量" />
        </a-form-model-item>

        <a-form-model-item label="ICN数量" prop="icnCount">
          <a-input-number v-model="model.icnCount" :min="0" style="width: 100%" placeholder="请输入ICN数量" />
        </a-form-model-item>

      </a-form-model>
    </a-spin>
  </a-modal>
</template>

<script>
import { httpAction, getAction } from '@/api/manage'
import moment from 'moment'

export default {
  name: 'IetmDdnExchangeModal',
  data() {
    return {
      title: '操作',
      visible: false,
      model: {},
      labelCol: {
        xs: { span: 24 },
        sm: { span: 6 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 }
      },
      confirmLoading: false,
      validatorRules: {
        ddnCode: [
          { required: true, message: '请输入DDN编码!' }
        ],
        ddnType: [
          { required: true, message: '请选择DDN类型!' }
        ],
        impexp: [
          { required: true, message: '请选择导入导出标识!' }
        ],
        modelIdentCode: [
          { required: true, message: '请输入型号代码!' }
        ],
        senderIdent: [
          { required: true, message: '请输入发送方代码!' }
        ],
        receiverIdent: [
          { required: true, message: '请输入接收方代码!' }
        ]
      },
      url: {
        add: '/ietmddn/ietmDdnExchange/add',
        edit: '/ietmddn/ietmDdnExchange/edit',
        queryById: '/ietmddn/ietmDdnExchange/queryById'
      }
    }
  },
  created() {
  },
  methods: {
    add() {
      this.edit({})
    },
    edit(record) {
      this.model = Object.assign({}, record)
      this.visible = true
      this.$nextTick(() => {
        this.$refs.form.clearValidate()
      })

      if (this.model.id) {
        this.title = '编辑数据交换记录'
        // 如果有ID，从服务器获取完整数据
        this.confirmLoading = true
        getAction(this.url.queryById, { id: this.model.id }).then(res => {
          if (res.success) {
            this.model = Object.assign({}, res.result)
            // 转换日期格式
            if (this.model.issueDate) {
              this.model.issueDate = moment(this.model.issueDate)
            }
          }
          this.confirmLoading = false
        }).catch(() => {
          this.confirmLoading = false
        })
      } else {
        this.title = '新增数据交换记录'
        // 获取当前项目ID
        getAction('/ietmproject/ietmProject/getCurrentProject').then(res => {
          if (res.success && res.result) {
            this.model.projectId = res.result.projectId
          }
        })
      }
    },
    close() {
      this.$emit('close')
      this.visible = false
      this.$refs.form.clearValidate()
      this.model = {}
    },
    handleOk() {
      this.$refs.form.validate(valid => {
        if (valid) {
          this.confirmLoading = true
          let httpurl = ''
          let method = ''
          if (!this.model.id) {
            httpurl = this.url.add
            method = 'post'
          } else {
            httpurl = this.url.edit
            method = 'put'
          }

          // 处理日期格式
          let formData = Object.assign({}, this.model)
          if (formData.issueDate && moment.isMoment(formData.issueDate)) {
            formData.issueDate = formData.issueDate.format('YYYY-MM-DD HH:mm:ss')
          }

          httpAction(httpurl, formData, method).then((res) => {
            if (res.success) {
              this.$message.success(res.message)
              this.$emit('ok')
              this.close()
            } else {
              this.$message.warning(res.message)
            }
          }).finally(() => {
            this.confirmLoading = false
          })
        }
      })
    },
    handleCancel() {
      this.close()
    }
  }
}
</script>
