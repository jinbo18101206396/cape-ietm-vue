<template>
  <a-modal
    :title="title"
    :width="1300"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px' }"
  >
    <!-- 编辑模式提示 -->
    <a-alert
      v-if="isEditMode"
      message="编辑模式：仅可修改「技术名称」，其他字段不可修改（信息名称由信息码自动填充）"
      type="info"
      show-icon
      style="margin-bottom: 12px;"
    />

    <a-spin :spinning="confirmLoading">
      <a-form-model ref="form" :model="model" :rules="rules" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">

        <!-- 数据模块代码 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="code" class="section-icon" />
            数据模块代码
          </div>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="密级" prop="security">
                <j-dict-select-tag
                  v-model="model.security"
                  dictCode="security"
                  placeholder="请选择密级"
                  :disabled="isEditMode"
                />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="信息码" prop="infoCode">
                <a-input v-model="model.infoCode" readonly placeholder="请选择信息码" :disabled="isEditMode">
                  <a-button slot="suffix" size="small" type="link" @click="showInfoCodeSelector" :disabled="isEditMode" style="padding: 0; height: auto;">
                    <a-icon type="search" />
                  </a-button>
                </a-input>
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="SNS" prop="sns">
                <a-input :value="snsFormatted" placeholder="自动生成" disabled />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="数据模块类型" prop="dmType">
                <j-dict-select-tag
                  v-model="model.dmType"
                  dictCode="dm_type"
                  placeholder="请选择数据模块类型"
                  :disabled="isEditMode"
                />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="信息码变量" prop="infoCodeVariant">
                <a-input v-model="model.infoCodeVariant" placeholder="A（默认）" :maxLength="1" :disabled="isEditMode" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="位置码" prop="ietmLocationCode">
                <j-dict-select-tag
                  v-model="model.ietmLocationCode"
                  dictCode="dm_location_code"
                  placeholder="A（默认）"
                  :disabled="isEditMode"
                />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="学习码" prop="learnCode">
                <a-input v-model="model.learnCode" placeholder="000-999（可选）" :maxLength="3" :disabled="isEditMode" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="学习事件码" prop="learnEventCode">
                <a-input
                  v-model="model.learnEventCode"
                  placeholder="A-Z（可选）"
                  :maxLength="1"
                  :disabled="isEditMode"
                  @input="e => model.learnEventCode = e.target.value.toUpperCase()"
                />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="创作单位" prop="originator">
                <a-select
                  v-model="model.originator"
                  placeholder="请选择创作单位"
                  show-search
                  option-filter-prop="children"
                  :disabled="isEditMode"
                >
                  <a-select-option v-for="item in originatorList" :key="`originator-${item.companyCode}`" :value="item.companyCode">
                    {{ item.companyName }}
                  </a-select-option>
                </a-select>
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="责任单位" prop="rpc">
                <a-select
                  v-model="model.rpc"
                  placeholder="请选择责任单位"
                  show-search
                  option-filter-prop="children"
                  :disabled="isEditMode"
                >
                  <a-select-option v-for="item in rpcList" :key="`rpc-${item.companyCode}`" :value="item.companyCode">
                    {{ item.companyName }}
                  </a-select-option>
                </a-select>
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- 标题 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="font-size" class="section-icon" />
            标题信息
          </div>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="技术名称" prop="techName">
                <a-input v-model="model.techName" :disabled="!isEditMode" :placeholder="isEditMode ? '请输入技术名称' : '从构型节点自动填充'" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="信息名称">
                <a-input v-model="model.infoName" disabled placeholder="从信息码描述自动填充" />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- 语言和国家 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="global" class="section-icon" />
            语言和国家
          </div>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="语言" prop="languageIsoCode">
                <j-dict-select-tag
                  v-model="model.languageIsoCode"
                  dictCode="language"
                  placeholder="请选择语言"
                  :disabled="isEditMode"
                />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="国家" prop="countryIsoCode">
                <j-dict-select-tag
                  v-model="model.countryIsoCode"
                  dictCode="country"
                  placeholder="请选择国家"
                  :disabled="isEditMode"
                />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- 隐藏字段：项目ID、构型节点ID、发布类型、版本号、修订号 -->
        <input type="hidden" v-model="model.projectId" />
        <input type="hidden" v-model="model.cmNodeId" />
        <input type="hidden" v-model="model.issueType" />
        <input type="hidden" v-model="model.issueNo" />
        <input type="hidden" v-model="model.inWork" />

      </a-form-model>

      <!-- DMC格式 + 预览 -->
      <div v-if="!isEditMode" class="dmc-preview-section">
        <a-alert
          message="DMC格式：DMC-{schema}-{sys}-{subsys}-{comp}-{infoCode}{variant}-{loc}{lrn}{evt}-{year}-{seq}{orig}-{issue}-{work}_{lang}-{country}"
          type="success"
          show-icon
          style="font-family: 'Courier New', monospace; margin-bottom: 10px; font-size: 12px;"
        />
        <a-alert
          :message="`DMC预览：${dmcPreview}`"
          type="info"
          show-icon
          style="font-family: 'Courier New', monospace; font-size: 12px;"
        />
      </div>
    </a-spin>

    <!-- 信息码选择器弹窗 -->
    <info-code-selector ref="infoCodeSelector" :projectId="model.projectId" @select="onInfoCodeSelect" />

    <template slot="footer">
      <a-button @click="handleCancel">返回</a-button>
      <a-button type="primary" @click="handleOk" :loading="confirmLoading">保存</a-button>
    </template>
  </a-modal>
</template>

<script>
import { getAction, postAction, putAction } from '@/api/manage'
import JDictSelectTag from '@/components/dict/JDictSelectTag'
import InfoCodeSelector from './InfoCodeSelector.vue'

export default {
  name: 'DataModuleFormModal',
  components: {
    JDictSelectTag,
    InfoCodeSelector
  },
  data() {
    return {
      title: '新建DM',
      visible: false,
      confirmLoading: false,
      isEditMode: false,  // 是否为编辑模式
      model: {},
      rules: {
        security: [{ required: true, message: '请选择密级', trigger: 'change' }],
        sns: [
          { required: true, message: '请先在左侧树中选择构型节点以生成SNS', trigger: 'blur' },
          { max: 16, message: 'SNS最多16位', trigger: 'blur' }
        ],
        infoCode: [
          { required: true, message: '请选择信息码', trigger: 'blur' },
          { len: 3, message: '信息码必须为3位', trigger: 'blur' }
        ],
        dmType: [{ required: true, message: '请选择数据模块类型', trigger: 'change' }],
        infoCodeVariant: [
          { pattern: /^[A-HJ-NP-Z]?$/, message: '必须是除I、O之外的大写字母或为空', trigger: 'blur' }
        ],
        ietmLocationCode: [{ required: true, message: '请选择位置码', trigger: 'change' }],
        learnCode: [
          { pattern: /^\d{3}$/, message: '学习码格式为3位数字（000-999）', trigger: 'blur' }
        ],
        learnEventCode: [
          { pattern: /^[A-Z]$/, message: '学习事件码格式为单个大写字母（A-Z）', trigger: 'blur' }
        ],
        originator: [
          { required: true, message: '请选择创作单位', trigger: 'change' },
          { max: 50, message: '创作单位代码最多50字符', trigger: 'change' }
        ],
        rpc: [
          { required: true, message: '请选择责任单位', trigger: 'change' },
          { max: 50, message: '责任单位代码最多50字符', trigger: 'change' }
        ],
        techName: [{ required: true, message: '请输入技术名称', trigger: 'blur' }],
        languageIsoCode: [{ required: true, message: '请选择语言', trigger: 'change' }],
        countryIsoCode: [{ required: true, message: '请选择国家', trigger: 'change' }]
      },
      url: {
        add: '/ietm/datamodule/add',
        edit: '/ietm/datamodule/edit',
        queryById: '/ietm/datamodule/queryById',
        infoCodeList: '/projectinformationcode/ietmProjectInformationCode/list',
        getProjectInfo: '/ietm/datamodule/getProjectInfo',  // 获取项目信息（含SNS）
        companyList: '/ietmprojectcompany/ietmProjectCompany/list'  // 项目单位列表
      },
      // 从父组件传递的上下文
      contextData: null,
      // 创作单位和责任单位列表
      originatorList: [],
      rpcList: []
    }
  },
  methods: {
    add(contextData) {
      this.title = '添加'
      this.visible = true
      this.isEditMode = false  // 标记为新增模式
      this.contextData = contextData || {}

      // 初始化默认值
      this.model = {
        projectId: contextData.projectId || '',
        cmNodeId: contextData.cmNodeId || '',
        cmNodePath: contextData.cmNodePath || '',
        schema: 'J',
        sns: '',
        security: '1',  // 默认为"1"（最低密级）
        infoCodeVariant: 'A',
        ietmLocationCode: 'A',
        learnCode: '',
        learnEventCode: '',
        yearOfChange: '',
        seqNo: '',
        languageIsoCode: 'zh',  // 小写
        countryIsoCode: 'CN',
        infoCode: '',
        dmType: '',
        originator: '',
        rpc: '',
        techName: contextData.techName || '',  // 从构型节点传入
        infoName: '',
        issueNo: '000',
        inWork: '01',
        issueType: 'new'
      }

      // 加载项目信息（包含SNS编码）
      this.loadProjectInfo()
    },
    edit(record) {
      this.title = '编辑'
      this.visible = true
      this.confirmLoading = true
      this.isEditMode = true  // 标记为编辑模式

      getAction(this.url.queryById, { id: record.id }).then(res => {
        if (res.success) {
          this.model = Object.assign({}, res.result)
          // 编辑模式下加载单位列表，确保下拉框有选项
          if (this.model.projectId) {
            this.loadCompanyList(this.model.projectId)
          }
        }
      }).finally(() => {
        this.confirmLoading = false
      })
    },
    handleOk() {
      // 前置检查必填隐藏字段
      if (!this.model.projectId) {
        this.$message.error('项目ID缺失，请重新打开表单')
        return
      }
      if (!this.model.cmNodeId) {
        this.$message.error('构型节点ID缺失，请先在左侧树中选择构型节点')
        return
      }

      this.$refs.form.validate(valid => {
        if (valid) {
          this.confirmLoading = true

          // 将空字符串的可选字段转为null，避免触发后端正则校验
          const payload = { ...this.model }
          const optionalFields = ['learnCode', 'learnEventCode']
          optionalFields.forEach(k => { if (payload[k] === '') payload[k] = null })

          // 去除字符串字段的前后空格
          const trimFields = ['sns', 'infoCode', 'originator', 'rpc', 'techName', 'infoName', 'learnCode', 'learnEventCode']
          trimFields.forEach(k => {
            if (typeof payload[k] === 'string') {
              payload[k] = payload[k].trim()
            }
          })

          // 语言/国家代码后端要求大写
          if (payload.languageIsoCode) payload.languageIsoCode = payload.languageIsoCode.toUpperCase()
          if (payload.countryIsoCode) payload.countryIsoCode = payload.countryIsoCode.toUpperCase()

          const url = payload.id ? this.url.edit : this.url.add
          const method = payload.id ? putAction : postAction

          method(url, payload).then(res => {
            if (res.success) {
              this.$message.success(res.message || '操作成功')
              this.$emit('ok')
              this._doCancel()  // 保存成功，直接关闭，不走脏数据检查
            } else {
              this.$message.error(res.message || '操作失败')
            }
          }).finally(() => {
            this.confirmLoading = false
          })
        }
      })
    },
    handleCancel() {
      this._doCancel()
    },
    _doCancel() {
      this.visible = false
      this.isEditMode = false
      this.model = {}
      this.contextData = null
      this.originatorList = []
      this.rpcList = []
      this.$nextTick(() => {
        this.$refs.form.clearValidate()
      })
    },
    showInfoCodeSelector() {
      this.$refs.infoCodeSelector.show()
    },

    onInfoCodeSelect(row) {
      this.model.infoCode = row.infocode || row.code
      if (row.description) {
        this.model.infoName = row.description
      }
      if (row.dmtypename) {
        // InfoCodeSelector返回的dmtypename是中文描述（从ietm_standard_dmtype表的dmtype_name字段）
        // 需要映射为dm_type字典的value（descriptive/procedural等）
        const dmTypeMap = {
          '描述类': 'descriptive',
          '程序类': 'procedural',
          '故障类': 'fault',
          '人员类': 'crew',
          '前言类': 'frontmatter',
          '规划类': 'planning',
          '工艺类': 'process'
        }
        const mappedValue = dmTypeMap[row.dmtypename]
        if (mappedValue) {
          this.model.dmType = mappedValue
        } else {
          // 映射失败时，尝试直接使用原始值（可能后端返回的就是英文value）
          this.model.dmType = row.dmtypename
          console.warn('DM类型映射失败，使用原始值:', row.dmtypename)
        }
      }
    },

    // 加载项目信息（包含SNS编码）
    // 与ICN模块保持相同逻辑
    loadProjectInfo() {
      if (!this.model.cmNodeId) {
        this.$message.warning('请先选择构型节点')
        return
      }
      getAction(this.url.getProjectInfo, { cmNodeId: this.model.cmNodeId })
        .then(res => {
          if (res.success) {
            // 基础信息
            this.model.sns = res.result.sns || ''
            this.model.security = res.result.security || ''

            // 语言和国家（从项目）
            this.model.languageIsoCode = res.result.languageCode || 'ZH'
            this.model.countryIsoCode = res.result.countryCode || 'CN'

            // 技术名称（从构型节点）
            this.model.techName = res.result.techName || ''

            // 加载单位列表（传递projectId用于过滤）
            this.loadCompanyList(res.result.projectId)
          } else {
            this.$message.error(res.result || '加载项目信息失败')
            // 加载失败，清空SNS避免误导
            this.model.sns = ''
          }
        })
        .catch(err => {
          console.error('加载项目信息失败:', err)
          this.$message.error('加载项目信息失败')
          // 异常时清空SNS
          this.model.sns = ''
        })
    },

    // 加载项目单位列表（创作单位和责任单位）
    loadCompanyList(projectId) {
      if (!projectId) {
        console.warn('projectId为空，无法加载单位列表')
        return
      }
      const params = { pid: projectId, pageNo: 1, pageSize: 1000 }
      getAction(this.url.companyList, params).then(res => {
        if (res.success && res.result && res.result.records) {
          const allCompanies = res.result.records
          // 创作单位：type=1
          this.originatorList = allCompanies.filter(item => item.type === 1)
          // 责任单位：type=2
          this.rpcList = allCompanies.filter(item => item.type === 2)
        }
      }).catch(err => {
        console.error('加载单位列表失败', err)
        this.$message.error('加载创作单位/责任单位列表失败，请刷新后重试')
      })
    }
  },
  computed: {
    // SNS格式化显示
    // 根据需求文档，SNS从后端返回时应该已经包含分隔符（如 28-60-04-00A）
    // 如果后端返回的SNS不包含分隔符，则进行格式化处理
    snsFormatted() {
      const sns = this.model.sns || ''
      if (!sns) return ''

      // 如果已经包含分隔符，直接返回
      if (sns.includes('-')) return sns

      // 否则按照编码规则补全分隔符
      // SNS格式：{系统码}-{子系统码}-{组件码}-{子组件码}
      // 规则：每段2-4位，最多4段，总长度最多16位

      // 简单规则：按固定长度分段
      // 常见格式：28-60-04-00A（2位-2位-2位-3位）
      const segments = []
      let pos = 0
      const lengths = [2, 2, 2]  // 前3段固定2位

      for (const len of lengths) {
        if (pos < sns.length) {
          segments.push(sns.substring(pos, pos + len))
          pos += len
        }
      }

      // 剩余部分作为最后一段
      if (pos < sns.length) {
        segments.push(sns.substring(pos))
      }

      return segments.join('-')
    },

    dmcPreview() {
      const m = this.model
      const parts = []

      // DMC格式（S1000D标准）与后端IetmDataModuleServiceImpl.generateDmc()保持一致：
      // DMC-{schema}-{sns}-{infocode}{variant}-{location}{learn}{event}-{yearOfChange}-{seqNo}{originator}-{issueno}-{inwork}_{lang}-{country}

      // 第0段：前缀
      parts.push('DMC')

      // 第1段：Schema（默认J）
      parts.push(m.schema || 'J')

      // 第2段：SNS（使用格式化后的）
      parts.push(this.snsFormatted || '[SNS]')

      // 第3段：InfoCode + InfoCodeVariant（不带分隔符）
      const infoCodePart = (m.infoCode || '[信息码]') + (m.infoCodeVariant || 'A')
      parts.push(infoCodePart)

      // 第4段：IetmLocationCode + LearnCode + LearnEventCode（可选字段直接拼接）
      let segment4 = ''
      if (m.ietmLocationCode) segment4 += m.ietmLocationCode
      if (m.learnCode) segment4 += m.learnCode
      if (m.learnEventCode) segment4 += m.learnEventCode
      parts.push(segment4 || '[位置码]')

      // 第5段：YearOfChange（变更年代码，默认00）
      parts.push(m.yearOfChange || '00')

      // 第6段：SeqNo + Originator（顺序码+创作单位，无分隔符）
      let segment6 = ''
      segment6 += (m.seqNo || '00')
      segment6 += (m.originator || '[创作单位]')
      parts.push(segment6)

      // 第7段：IssueNo（默认001）
      parts.push(m.issueNo || '001')

      // 第8段：InWork_LanguageIsoCode（在编编号_语言代码，保持大写）
      const segment8 = (m.inWork || '00') + '_' + (m.languageIsoCode || 'ZH')
      parts.push(segment8)

      // 第9段：CountryIsoCode（保持大写）
      parts.push(m.countryIsoCode || 'CN')

      return parts.join('-')
    }
  }
}
</script>

<style lang="less" scoped>
.form-section {
  margin-bottom: 16px;
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid #f0f0f0;

  &:last-of-type {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #1890ff;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #1890ff;
    display: flex;
    align-items: center;

    .section-icon {
      margin-right: 6px;
      font-size: 15px;
    }
  }
}

.dmc-preview-section {
  margin-top: 8px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

::v-deep .ant-form-item {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

::v-deep .ant-form-item-label {
  > label {
    font-size: 13px;
    font-weight: 500;
    color: #262626;

    &::after {
      content: ':' !important;
      margin: 0 6px 0 2px;
    }
  }
}

::v-deep .ant-input,
::v-deep .ant-select-selection,
::v-deep .ant-select {
  font-size: 13px;
}

::v-deep .ant-input {
  &:disabled {
    background-color: #f5f5f5;
    color: #999;
    cursor: not-allowed;
  }
}

::v-deep .ant-modal-header {
  border-bottom: 1px solid #e8e8e8;
  padding: 12px 20px;

  .ant-modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #262626;
  }
}

::v-deep .ant-modal-footer {
  border-top: 1px solid #e8e8e8;
  padding: 10px 20px;
  text-align: right;

  .ant-btn {
    margin-left: 8px;
    min-width: 80px;
    height: 32px;
    font-size: 14px;

    &:first-child {
      margin-left: 0;
    }
  }
}

::v-deep .ant-alert {
  border-radius: 4px;

  &.ant-alert-info {
    background-color: #e6f7ff;
    border-color: #91d5ff;
  }

  &.ant-alert-success {
    background-color: #f6ffed;
    border-color: #b7eb8f;
  }
}
</style>
