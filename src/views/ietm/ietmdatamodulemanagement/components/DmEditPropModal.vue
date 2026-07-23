<template>
  <a-modal
    :visible="visible"
    title="编辑DM属性"
    :width="700"
    :maskClosable="false"
    :confirmLoading="saveLoading"
    okText="保存"
    cancelText="返回"
    @ok="handleSave"
    @cancel="handleClose"
  >
    <!-- 状态提示（红色，说明版本变化规则） -->
    <a-alert
      :message="statusNote"
      type="warning"
      show-icon
      style="margin-bottom: 16px; color: red;"
    />

    <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">

      <!-- 数据模块代码（只读展示区） -->
      <fieldset style="border:1px solid #d9d9d9;border-radius:4px;padding:12px 16px;margin-bottom:14px;">
        <legend style="font-weight:bold;font-size:13px;padding:0 8px;width:auto;">数据模块代码</legend>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="密级" :label-col="{span:8}" :wrapper-col="{span:14}">
              <a-input :value="currentRecord.security_dictText || '-'" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="DM类型" :label-col="{span:8}" :wrapper-col="{span:14}">
              <a-input :value="currentRecord.dmType || '-'" disabled />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row>
          <a-col :span="24">
            <a-form-item label="DMC" :label-col="{span:4}" :wrapper-col="{span:19}">
              <a-input
                :value="currentRecord.dmcCode || '-'"
                disabled
                style="font-family:monospace;color:#1890ff;"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="语言" :label-col="{span:8}" :wrapper-col="{span:14}">
              <a-input :value="currentRecord.languageIsoCode || '-'" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="国家" :label-col="{span:8}" :wrapper-col="{span:14}">
              <a-input :value="currentRecord.countryIsoCode || '-'" disabled />
            </a-form-item>
          </a-col>
        </a-row>
      </fieldset>

      <!-- 标题（可编辑区，蓝色边框突出） -->
      <fieldset style="border:2px solid #1890ff;border-radius:4px;padding:12px 16px;margin-bottom:14px;background:#f0f7ff;">
        <legend style="font-weight:bold;font-size:14px;color:#1890ff;padding:0 8px;width:auto;">
          📝 标题（仅可编辑以下字段）
        </legend>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="技术名称" :label-col="{span:8}" :wrapper-col="{span:14}">
              <a-input
                v-decorator="['techName', {
                  rules: [
                    { required: true, whitespace: true, message: '技术名称不能为空' },
                    { max: 50, message: '技术名称最大50字符' }
                  ]
                }]"
                placeholder="请输入技术名称（最多50字）"
                :maxLength="50"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="信息名称" :label-col="{span:8}" :wrapper-col="{span:14}">
              <a-input
                v-decorator="['infoName', {
                  rules: [
                    { required: true, whitespace: true, message: '信息名称不能为空' },
                    { max: 50, message: '信息名称最大50字符' }
                  ]
                }]"
                placeholder="请输入信息名称（最多50字）"
                :maxLength="50"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
      </fieldset>

      <!-- 版本信息（只读展示区） -->
      <fieldset style="border:1px solid #d9d9d9;border-radius:4px;padding:12px 16px;">
        <legend style="font-weight:bold;font-size:13px;padding:0 8px;width:auto;">版本</legend>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="当前版本号" :label-col="{span:8}" :wrapper-col="{span:14}">
              <a-input :value="(currentRecord.issueNo || '') + '-' + (currentRecord.inWork || '')" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="签发日期" :label-col="{span:8}" :wrapper-col="{span:14}">
              <a-input :value="formatDate(currentRecord.issueDate)" disabled />
            </a-form-item>
          </a-col>
        </a-row>
      </fieldset>

    </a-form>
  </a-modal>
</template>

<script>
import { putAction } from '@/api/manage'

export default {
  name: 'DmEditPropModal',
  beforeCreate() {
    // Ant Design Vue v1 推荐在 beforeCreate 中创建 form 实例
    this.form = this.$form.createForm(this)
  },
  data() {
    return {
      visible: false,
      saveLoading: false,
      currentRecord: {},
      oldTechName: '',
      oldInfoName: ''
    }
  },
  computed: {
    // 根据签出状态显示不同提示文字
    statusNote() {
      const isCheckedOut = !!this.currentRecord.checkoutUser
      if (isCheckedOut) {
        return '【编辑签出状态DM的属性时，修改技术名称、信息名称，则版本日期更新为当前日期，版本号不升级。】'
      }
      return '【编辑签入状态DM的属性时，系统将自动签出该DM，修改版本日期为当前日期，版本号升级。】'
    }
  },
  methods: {
    /**
     * 打开弹窗，由父页面调用：this.$refs.editPropModal.show(record)
     */
    show(record) {
      this.currentRecord = record || {}
      this.oldTechName = (record && record.techName) ? record.techName : ''
      this.oldInfoName = (record && record.infoName) ? record.infoName : ''
      this.visible = true
      this.$nextTick(() => {
        this.form.setFieldsValue({
          techName: this.oldTechName,
          infoName: this.oldInfoName
        })
      })
    },
    // 关闭弹窗
    handleClose() {
      this.visible = false
      this.form.resetFields()
      this.currentRecord = {}
      this.oldTechName = ''
      this.oldInfoName = ''
    },
    // 保存
    handleSave() {
      this.form.validateFields((err, values) => {
        if (err) return

        const techName = (values.techName || '').trim()
        const infoName = (values.infoName || '').trim()

        // 变化检测
        if (techName === this.oldTechName && infoName === this.oldInfoName) {
          this.$message.warning('技术名称和信息名称没有任何变化')
          return
        }

        this.saveLoading = true
        putAction(`/ietm/datamodule/editProp/${this.currentRecord.id}`, { techName, infoName })
          .then(res => {
            if (res.success) {
              this.$message.success(res.message || '修改DM属性成功')
              this.visible = false
              this.form.resetFields()
              this.$emit('ok')
            } else {
              this.$message.error(res.message || '操作失败，请重试')
            }
          })
          .catch(() => {
            this.$message.error('网络异常，操作失败，请重试')
          })
          .finally(() => {
            this.saveLoading = false
          })
      })
    },
    // 格式化日期（取前10位）
    formatDate(val) {
      if (!val) return '-'
      return String(val).substring(0, 10)
    }
  }
}
</script>
