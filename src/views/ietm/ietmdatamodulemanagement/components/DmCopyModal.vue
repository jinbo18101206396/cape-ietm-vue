<template>
  <a-modal
    :title="modalTitle"
    :width="1300"
    :visible="visible"
    :confirmLoading="loading"
    @ok="handleOk"
    @cancel="handleCancel"
    :bodyStyle="{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px' }"
  >
    <!-- 复制DM模式：简单确认 -->
    <div v-if="mode === 'copy'">
      <a-result status="info" title="确认复制此DM？">
        <template slot="subTitle">
          <div style="text-align: left; padding: 0 20px;">
            <p><strong>DMC编码：</strong>{{ sourceDm.dmcCode }}</p>
            <p><strong>技术名称：</strong>{{ sourceDm.techName }}</p>
            <p><strong>信息名称：</strong>{{ sourceDm.infoName }}</p>
          </div>
        </template>
      </a-result>
    </div>

    <!-- 复制新建DM模式：完整表单 -->
    <a-spin v-else :spinning="loading">
      <a-form-model
        ref="form"
        :model="model"
        :rules="rules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <!-- fieldset 1: 数据模块代码 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="code" class="section-icon" />
            数据模块代码
          </div>
          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="密级" prop="security">
                <j-dict-select-tag v-model="model.security" dictCode="security" placeholder="公开" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="信息码" prop="infoCode">
                <a-input v-model="model.infoCode" placeholder="请选择信息码">
                  <a-button slot="suffix" size="small" type="link" @click="showInfoCodeSelector" style="padding: 0; height: auto;">
                    <a-icon type="search" />
                  </a-button>
                </a-input>
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="SNS" prop="sns">
                <a-input v-model="model.sns" placeholder="自动生成" disabled />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="数据模块类型" prop="dmType">
                <j-dict-select-tag
                  v-model="model.dmType"
                  dictCode="dm_type"
                  placeholder="请选择数据模块类型"
                />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="信息码变量" prop="infoCodeVariant">
                <a-input v-model="model.infoCodeVariant" placeholder="A" :maxLength="1" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="位置码" prop="ietmLocationCode">
                <j-dict-select-tag v-model="model.ietmLocationCode" dictCode="dm_location_code" placeholder="A" />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="学习码">
                <a-input v-model="model.learnCode" placeholder="000-999" :maxLength="3" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="学习事件码">
                <a-input v-model="model.learnEventCode" placeholder="A-Z" :maxLength="1" />
              </a-form-model-item>
            </a-col>
          </a-row>

          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="创作单位" prop="originator">
                <a-select v-model="model.originator" placeholder="请选择创作单位" show-search option-filter-prop="children">
                  <a-select-option v-for="item in originatorList" :key="item.companyCode" :value="item.companyCode">
                    {{ item.companyName }}
                  </a-select-option>
                </a-select>
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="责任单位" prop="rpc">
                <a-select v-model="model.rpc" placeholder="请选择责任单位" show-search option-filter-prop="children">
                  <a-select-option v-for="item in rpcList" :key="item.companyCode" :value="item.companyCode">
                    {{ item.companyName }}
                  </a-select-option>
                </a-select>
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- fieldset 2: 标识与状态段 -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="font-size" class="section-icon" />
            标题信息
          </div>
          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="技术名称" prop="techName">
                <a-input v-model="model.techName" placeholder="从目标节点自动提取" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="信息名称">
                <a-input v-model="model.infoName" placeholder="从信息码自动填充" />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- fieldset 3: DME -->
        <div class="form-section">
          <div class="section-title">
            <a-icon type="file-text" class="section-icon" />
            DME
          </div>
          <a-row :gutter="20">
            <a-col :span="12">
              <a-form-model-item label="生产者">
                <a-input v-model="model.enterprise" placeholder="复制沿用" />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="扩展代码">
                <a-input v-model="model.extraCode" placeholder="复制沿用" />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- fieldset 4: 语言 -->
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
                />
              </a-form-model-item>
            </a-col>
            <a-col :span="12">
              <a-form-model-item label="国家" prop="countryIsoCode">
                <j-dict-select-tag
                  v-model="model.countryIsoCode"
                  dictCode="country"
                  placeholder="请选择国家"
                />
              </a-form-model-item>
            </a-col>
          </a-row>
        </div>

        <!-- 隐藏字段：固定值，不在表单中显示 -->
        <input type="hidden" v-model="model.projectId" />
        <input type="hidden" v-model="model.cmNodeId" />
        <input type="hidden" v-model="model.issueNo" />
        <input type="hidden" v-model="model.inWork" />
        <input type="hidden" v-model="model.issueType" />
      </a-form-model>

      <!-- DMC预览 -->
      <div class="dmc-preview-section">
        <a-alert
          :message="`DMC预览：${dmcPreview}`"
          type="info"
          show-icon
          style="font-family: 'Courier New', monospace; font-size: 12px;"
        />
      </div>
    </a-spin>

    <!-- 信息码选择器弹窗 -->
    <info-code-selector ref="infoCodeSelector" :projectId="projectId" @select="onInfoCodeSelect" />

    <template slot="footer">
      <a-button @click="handleCancel">返回</a-button>
      <a-button type="primary" @click="handleOk" :loading="loading">保存</a-button>
    </template>
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import InfoCodeSelector from './InfoCodeSelector.vue'
import JDictSelectTag from '@/components/dict/JDictSelectTag'

export default {
  name: 'DmCopyModal',
  components: { InfoCodeSelector, JDictSelectTag },

  data() {
    return {
      visible: false,
      loading: false,
      mode: 'copy',
      sourceDm: { id: '', dmcCode: '', techName: '', infoName: '' },
      targetNodeId: '',
      targetNodeName: '',
      projectId: '',
      model: {
        projectId: '', cmNodeId: '',
        sns: '', security: '1',
        techName: '', infoName: '', dmType: '',
        infoCode: '', infoCodeVariant: 'A', ietmLocationCode: 'A',
        learnCode: '', learnEventCode: '',
        originator: '', rpc: '',
        enterprise: '', extraCode: '',
        languageIsoCode: 'ZH', countryIsoCode: 'CN',
        issueNo: '000', inWork: '00', issueType: 'new'
      },
      rules: {
        security: [{ required: true, message: '请选择密级', trigger: 'change' }],
        sns: [
          { required: true, message: 'SNS不能为空', trigger: 'blur' },
          { max: 16, message: 'SNS最多16位', trigger: 'blur' }
        ],
        infoCode: [
          { required: true, message: '信息码不能为空', trigger: 'blur' },
          { len: 3, message: '信息码必须为3位', trigger: 'blur' }
        ],
        dmType: [{ required: true, message: '数据模块类型不能为空', trigger: 'change' }],
        infoCodeVariant: [
          { pattern: /^[A-HJ-NP-Z]?$/, message: '必须是除I、O之外的大写字母或为空', trigger: 'blur' }
        ],
        ietmLocationCode: [{ required: true, message: '位置码不能为空', trigger: 'change' }],
        learnCode: [
          { pattern: /^\d{3}$/, message: '学习码格式为3位数字（000-999）', trigger: 'blur' }
        ],
        learnEventCode: [
          { pattern: /^[A-Z]$/, message: '学习事件码格式为单个大写字母（A-Z）', trigger: 'blur' }
        ],
        originator: [
          { required: true, message: '创作单位不能为空', trigger: 'change' },
          { max: 50, message: '创作单位代码最多50字符', trigger: 'change' }
        ],
        rpc: [
          { required: true, message: '责任单位不能为空', trigger: 'change' },
          { max: 50, message: '责任单位代码最多50字符', trigger: 'change' }
        ],
        techName: [{ required: true, message: '请输入技术名称', trigger: 'blur' }],
        languageIsoCode: [{ required: true, message: '请选择语言', trigger: 'change' }],
        countryIsoCode: [{ required: true, message: '请选择国家', trigger: 'change' }]
      },
      originatorList: [],
      rpcList: [],
      countryMap: {
        ZH: [{ value: 'CN', label: '中国' }, { value: 'TW', label: '台湾' }],
        EN: [{ value: 'US', label: '美国' }, { value: 'AU', label: '澳大利亚' }]
      },
      url: {
        companyList: '/ietmprojectcompany/ietmProjectCompany/list',
        queryById:   '/ietm/datamodule/queryById'
      }
    }
  },

  computed: {
    modalTitle() {
      return this.mode === 'copy' ? '复制DM' : '复制新建DM'
    },
    countryOptions() {
      return this.countryMap[this.model.languageIsoCode] || this.countryMap['ZH']
    },

    // SNS格式化显示
    snsFormatted() {
      const sns = this.model.sns || ''
      if (!sns) return ''

      // 如果已经包含分隔符，直接返回
      if (sns.includes('-')) return sns

      // 否则按照编码规则补全分隔符
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

    // DMC预览
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
  },

  methods: {
    show(record, copyType = 0, targetNode = null) {
      this.visible = true
      this.mode = copyType === 0 ? 'copy' : 'copyNew'
      this.sourceDm = {
        id: record.id,
        dmcCode: record.dmcCode,
        techName: record.techName,
        infoName: record.infoName,
        infoCode: record.infoCode,
        infoCodeVariant: record.infoCodeVariant,
        ietmLocationCode: record.ietmLocationCode,
        learnCode: record.learnCode,
        learnEventCode: record.learnEventCode,
        dmType: record.dmType,
        language: record.language,
        countryIsoCode: record.countryIsoCode,
        enterprise: record.enterprise,
        extraCode: record.extraCode
      }

      if (this.mode === 'copyNew') {
        if (!targetNode) {
          this.$message.error('请选择要复制到哪个构型节点下。')
          this.visible = false
          return
        }
        this.targetNodeId = targetNode.id
        this.targetNodeName = targetNode.nodeName
        this.projectId = record.projectId
        this.loadSourceDmAndFill()
      }
    },

    async loadSourceDmAndFill() {
      this.loading = true
      try {
        // 1. 并行请求：源DM完整数据、SNS、技术名称、项目信息、创作单位/责任单位
        const [dmRes, snsRes, techNameRes, projectRes, companyRes] = await Promise.all([
          getAction(this.url.queryById, { id: this.sourceDm.id }),
          getAction('/ietm/datamodule/calculateSns', { cmNodeId: this.targetNodeId }),
          getAction('/ietm/datamodule/extractTechName', { nodeName: this.targetNodeName }),
          getAction('/ietmproject/ietmProject/queryById', { id: this.projectId }),
          getAction(this.url.companyList, { pid: this.projectId, pageNo: 1, pageSize: 1000 })
        ])

        // 2. 设置SNS
        if (snsRes.success) {
          this.model.sns = snsRes.result
        } else {
          this.$message.warning('计算SNS失败：' + (snsRes.message || ''))
        }

        // 3. 设置技术名称（强制替换为目标节点名称）
        if (techNameRes.success) {
          this.model.techName = techNameRes.result
        } else {
          this.$message.warning('提取技术名称失败：' + (techNameRes.message || ''))
        }

        // 4. 设置项目ID和构型节点ID
        this.model.projectId = this.projectId
        this.model.cmNodeId = this.targetNodeId

        // 5. 从项目获取默认配置（优先级最高）
        let projectSecurity = null
        let projectLanguage = null
        let projectCountry = null

        if (projectRes.success && projectRes.result) {
          const project = projectRes.result
          // 项目密级（Integer转String）
          if (project.security != null) {
            projectSecurity = String(project.security)
          }
          // 项目语言（注意字段名拼写：lanuageCode）
          if (project.lanuageCode || project.languageCode) {
            projectLanguage = project.lanuageCode || project.languageCode
          }
          // 项目国家
          if (project.countryCode) {
            projectCountry = project.countryCode
          }
        }

        // 6. 继承源DM字段
        if (dmRes.success && dmRes.result) {
          const fullDm = dmRes.result
          this.model.infoCode = fullDm.infoCode
          this.model.infoCodeVariant = fullDm.infoCodeVariant || 'A'
          this.model.ietmLocationCode = fullDm.ietmLocationCode || 'A'
          this.model.learnCode = fullDm.learnCode || ''
          this.model.learnEventCode = fullDm.learnEventCode || ''
          this.model.infoName = fullDm.infoName
          this.model.dmType = fullDm.dmType
          this.model.enterprise = fullDm.enterprise || ''
          this.model.extraCode = fullDm.extraCode || ''

          // 密级：优先项目配置，其次源DM，最后默认公开
          this.model.security = projectSecurity || fullDm.security || '1'

          // 语言国家：优先项目配置，其次源DM，最后默认ZH/CN，统一转大写
          this.model.languageIsoCode = (projectLanguage || fullDm.languageIsoCode || 'ZH').toUpperCase()
          this.model.countryIsoCode = (projectCountry || fullDm.countryIsoCode || 'CN').toUpperCase()
        }

        // 7. 设置创作单位/责任单位（从项目公司列表取第一项）
        if (companyRes.success && companyRes.result && companyRes.result.records) {
          const allCompanies = companyRes.result.records
          this.originatorList = allCompanies.filter(item => item.type === 1)
          this.rpcList = allCompanies.filter(item => item.type === 2)

          // 自动选择第一项
          if (this.originatorList.length > 0) {
            this.model.originator = this.originatorList[0].companyCode
          }
          if (this.rpcList.length > 0) {
            this.model.rpc = this.rpcList[0].companyCode
          }
        }
      } catch (err) {
        console.error('加载数据失败', err)
        this.$message.error('加载数据失败：' + (err.message || ''))
      } finally {
        this.loading = false
      }
    },

    showInfoCodeSelector() {
      this.$refs.infoCodeSelector.show()
    },

    onInfoCodeSelect(row) {
      // InfoCodeSelector 返回的字段：infocode, dmtypeid, dmtypename, description
      // 填充信息码
      this.model.infoCode = row.infocode || row.code

      // 填充信息名称（描述）
      if (row.description) {
        this.model.infoName = row.description
      }

      // 联动填充数据模块类型（始终更新，不仅仅是空值时）
      // 注意：dmType字段存储的是类型名称（如"descript"），而不是ID
      if (row.dmtypename) {
        this.model.dmType = row.dmtypename
      }
    },

    onLanguageChange(val) {
      // 语言-国家联动
      const options = this.countryMap[val]
      if (options && options.length > 0) {
        this.model.countryIsoCode = options[0].value
      }
    },

    filterDmTypeOption(input, option) {
      return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
    },

    // 根据companyCode获取companyName
    getOriginatorName(code) {
      if (!code || !this.originatorList) return ''
      const found = this.originatorList.find(item => item.companyCode === code)
      return found ? found.companyName : ''
    },

    getRpcName(code) {
      if (!code || !this.rpcList) return ''
      const found = this.rpcList.find(item => item.companyCode === code)
      return found ? found.companyName : ''
    },

    handleOk() {
      if (this.mode === 'copy') {
        this.handleCopyDm()
      } else {
        this.handleCopyAndCreateDm()
      }
    },

    handleCopyDm() {
      // 复制DM模式已废弃（问题3已修复，复制为纯前端操作无弹窗）
      this.visible = false
    },

    handleCopyAndCreateDm() {
      this.$refs.form.validate(valid => {
        if (!valid) {
          return
        }
        this.loading = true

        // 语言/国家代码后端要求大写（与新建弹出框保持一致）
        const languageIsoCode = this.model.languageIsoCode ? this.model.languageIsoCode.toUpperCase() : null
        const countryIsoCode = this.model.countryIsoCode ? this.model.countryIsoCode.toUpperCase() : null

        postAction('/ietm/datamodule/copyAndCreateDm', {
          sourceDmId: this.sourceDm.id,
          targetCmNodeId: this.targetNodeId,
          targetCmNodeName: this.targetNodeName,
          sns: this.model.sns,
          techName: this.model.techName,
          infoCode: this.model.infoCode,
          infoCodeVariant: this.model.infoCodeVariant,
          ietmLocationCode: this.model.ietmLocationCode,
          learnCode: this.model.learnCode,
          learnEventCode: this.model.learnEventCode,
          infoName: this.model.infoName,
          dmType: this.model.dmType,
          enterprise: this.model.enterprise,
          extraCode: this.model.extraCode,
          languageIsoCode: languageIsoCode,
          countryIsoCode: countryIsoCode,
          security: this.model.security,
          originator: this.model.originator,
          originatorName: this.getOriginatorName(this.model.originator),  // 添加name
          rpc: this.model.rpc,
          rpcName: this.getRpcName(this.model.rpc),  // 添加name
          issueNo: this.model.issueNo,
          inWork: this.model.inWork,
          issueType: this.model.issueType
        })
          .then(res => {
            if (res.success) {
              this.$message.success('复制新建成功')
              this.visible = false
              this.$emit('ok')
            } else {
              this.$message.error(res.message || '复制新建失败')
            }
          })
          .finally(() => {
            this.loading = false
          })
      })
    },

    handleCancel() {
      this.visible = false
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

