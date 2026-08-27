<template>
  <a-modal
    :title="title"
    :width="1000"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto', padding: '16px 24px' }"
    :footer="isViewMode ? null : undefined"
  >
    <a-alert
      v-if="!isViewMode"
      message="编辑说明：可修改技术名称和信息名称，其他字段为只读展示"
      type="info"
      show-icon
    />

    <a-spin :spinning="confirmLoading">
      <a-form-model ref="form" :model="model" :rules="validatorRules" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">

        <!-- 数据模块代码 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="code" class="section-icon" />
            数据模块代码
          </div>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="密级">
                <a-input v-model="model.security_dictText" disabled />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="数据模块类型">
                <a-input v-model="dmTypeDisplayName" disabled />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="24">
              <a-form-model-item label="DMC" :label-col="{ span: 3 }" :wrapper-col="{ span: 21 }">
                <a-input v-model="model.dmcCode" disabled style="font-family:monospace;color:#1890ff;font-weight:500;" />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="信息码">
                <a-input v-model="model.infoCode" disabled />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="信息码变量">
                <a-input v-model="model.infoCodeVariant" disabled />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="位置码">
                <a-input v-model="model.ietmLocationCode" disabled />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="学习码">
                <a-input v-model="model.learnCode" disabled />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="学习事件码">
                <a-input v-model="model.learnEventCode" disabled />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="创作单位">
                <a-input v-model="originatorDisplayName" disabled />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="责任单位">
                <a-input v-model="rpcDisplayName" disabled />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <!-- 占位，保持布局对称 -->
            </a-col>
          </a-row>
        </div>

        <!-- 标题 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="font-size" class="section-icon" />
            标题
          </div>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="技术名称" prop="techName">
                <a-input v-model="model.techName" placeholder="请输入技术名称" :disabled="isViewMode" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="信息名称" prop="infoName">
                <a-input v-model="model.infoName" placeholder="请输入信息名称" :disabled="isViewMode" />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- 语言 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="global" class="section-icon" />
            语言
          </div>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="语言">
                <a-input v-model="model.languageIsoCode" disabled />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="国家">
                <a-input v-model="model.countryIsoCode" disabled />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- 版本 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="profile" class="section-icon" />
            版本
          </div>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="版本类型" prop="issueType">
                <a-select
                  v-model="model.issueType"
                  :disabled="isViewMode"
                  placeholder="请选择版本类型"
                  style="width: 100%"
                >
                  <a-select-option value="new">new（新建）</a-select-option>
                  <a-select-option value="changed">changed（变更，10%-30%）</a-select-option>
                  <a-select-option value="revised">revised（修订，30%以上）</a-select-option>
                  <a-select-option value="status">status（仅状态变更）</a-select-option>
                  <a-select-option value="deleted">deleted（删除）</a-select-option>
                </a-select>
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="版本日期">
                <a-input v-model="model.issueDate" disabled />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

      </a-form-model>
    </a-spin>

    <template slot="footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="confirmLoading" @click="handleOk">保存</a-button>
    </template>
  </a-modal>
</template>

<script>
import { httpAction, getAction } from '@/api/manage'

export default {
  name: 'DmEditPropModal',
  data() {
    return {
      title: '编辑属性',
      visible: false,
      confirmLoading: false,
      model: {},
      isViewMode: false, // 是否为查看模式
      // 公司名称缓存
      companyNameMap: {},
      validatorRules: {
        techName: [
          { required: true, message: '请输入技术名称', trigger: 'blur' },
          { max: 50, message: '技术名称最多50字符', trigger: 'blur' }
        ],
        infoName: [
          { required: true, message: '请输入信息名称', trigger: 'blur' },
          { max: 50, message: '信息名称最多50字符', trigger: 'blur' }
        ]
      },
      url: {
        edit: '/ietm/datamodule/editProp'
      }
    }
  },
  computed: {
    // 创作单位完整名称
    originatorDisplayName() {
      if (!this.model.originator) return ''
      return this.companyNameMap[this.model.originator] || this.model.originatorName || this.model.originator
    },
    // 责任单位完整名称
    rpcDisplayName() {
      if (!this.model.rpc) return ''
      return this.companyNameMap[this.model.rpc] || this.model.rpcName || this.model.rpc
    },
    // 数据模块类型显示名称（优先使用字典文本，如果不存在则使用原始值）
    dmTypeDisplayName() {
      return this.model.dmType_dictText || this.model.dmType || ''
    }
  },
  methods: {
    show(record, viewMode = false) {
      this.model = Object.assign({}, record)
      this.isViewMode = viewMode
      this.title = viewMode ? 'DMC详情' : '编辑属性'
      this.visible = true
      // 加载公司名称
      this.loadCompanyNames(record.projectId)
      // 拉取完整实体（列表记录字段不全：密级/DM类型/语言/国家/版本类型/版本日期等）
      // queryById 返回全字段并由 DictAspect 填充 _dictText，保证详情/编辑弹框数据完整
      if (record.id) {
        getAction('/ietm/datamodule/queryById', { id: record.id }).then(res => {
          if (res.success && res.result) {
            this.model = Object.assign({}, this.model, res.result)
          }
        })
      }
    },

    // 加载项目关联的公司列表
    async loadCompanyNames(projectId) {
      if (!projectId) return

      try {
        const url = '/ietmprojectcompany/ietmProjectCompany/list'
        const params = { projectId, pageNo: 1, pageSize: 999 }
        const res = await httpAction(url, params, 'get')

        if (res.success && res.result && res.result.records) {
          // 构建 companyCode -> companyName 的映射
          const map = {}
          res.result.records.forEach(item => {
            map[item.companyCode] = item.companyName
          })
          this.companyNameMap = map
        }
      } catch (err) {
        console.error('加载公司列表失败:', err)
      }
    },
    handleOk() {
      this.$refs.form.validate(valid => {
        if (valid) {
          this.confirmLoading = true
          const formData = {
            techName: this.model.techName,
            infoName: this.model.infoName,
            issueType: this.model.issueType
          }
          httpAction(`${this.url.edit}/${this.model.id}`, formData, 'put')
            .then(res => {
              if (res.success) {
                this.$message.success('保存成功')
                this.visible = false
                this.$emit('ok')
              } else {
                this.$message.warning(res.message || '保存失败')
              }
            })
            .catch(err => {
              this.$message.error('保存失败：' + (err.message || '未知错误'))
            })
            .finally(() => {
              this.confirmLoading = false
            })
        }
      })
    },
    handleCancel() {
      this.visible = false
      this.$refs.form.clearValidate()
    }
  }
}
</script>

<style scoped>
.form-section {
  margin-bottom: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 12px 16px;
  background: #fafafa;
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid #1890ff;
  display: flex;
  align-items: center;
}

.section-icon {
  font-size: 16px;
  color: #1890ff;
  margin-right: 8px;
}

/deep/ .ant-form-item {
  margin-bottom: 12px;
}

/deep/ .ant-form-item:last-child {
  margin-bottom: 0;
}

/deep/ .ant-modal-header {
  background: #f0f2f5;
  border-bottom: 2px solid #1890ff;
  padding: 14px 24px;
}

/deep/ .ant-modal-title {
  font-weight: 600;
  color: #262626;
}

/deep/ .ant-modal-footer {
  border-top: 1px solid #e8e8e8;
  padding: 10px 16px;
}

/deep/ .ant-alert {
  border-radius: 4px;
  margin-bottom: 12px;
}
</style>
