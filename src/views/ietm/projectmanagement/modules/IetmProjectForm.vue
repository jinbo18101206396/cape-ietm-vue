<template>
  <a-spin :spinning="confirmLoading">
    <!-- 主表单区域 -->
    <a-tabs v-model="activeKey" @change="handleChangeTabs">
      <a-tab-pane tab="基本信息" :key="refKeys[0]" :forceRender="true">
        <j-form-container :disabled="formDisabled">
          <a-form-model ref="form" :model="model" :rules="validatorRules" slot="detail">
            <a-row>
              <a-col :span="24">
                <a-form-model-item label="密级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="security">
                  <j-dict-select-tag type="list" v-model="model.security" dictCode="security" placeholder="请选择密级"/>
                </a-form-model-item>
              </a-col>
              <a-col :span="24">
                <a-form-model-item label="装备编码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="equipmentCode">
                  <a-input v-model="model.equipmentCode" placeholder="请输入装备编码"></a-input>
                </a-form-model-item>
              </a-col>
              <a-col :span="24">
                <a-form-model-item label="IETM标准" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="ietmStandard">
                  <j-dict-select-tag type="list" v-model="model.ietmStandard" dictCode="standard_type"
                                     placeholder="请选择标准版本"/>
                </a-form-model-item>
              </a-col>
              <a-col :span="24">
                <a-form-model-item label="项目名称" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="name">
                  <a-input v-model="model.name" placeholder="请输入装备编码"></a-input>
                </a-form-model-item>
              </a-col>
              <a-col :span="24">
                <a-form-model-item label="项目描述" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="description">
                  <a-textarea v-model="model.description" rows="4" placeholder="请输入描述"/>
                </a-form-model-item>
              </a-col>
              <a-col :span="24">
                <a-form-model-item label="业务规则模板" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="businessRuleTemp">
                  <a-input v-model="model.businessRuleTemp" placeholder="请输入业务规则模板"></a-input>
                </a-form-model-item>
              </a-col>
              <a-col :span="24">
                <a-form-model-item label="编码规则" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="codeRule">
                  <a-input v-model="model.codeRule" placeholder="请输入编码规则" @click.native="openShowRuleModal"
                  ></a-input>
                </a-form-model-item>
              </a-col>
            </a-row>
          </a-form-model>
        </j-form-container>
      </a-tab-pane>
      <a-tab-pane tab="项目参数" :key="refKeys[1]" :forceRender="true">
        <ietm-project-params-form ref="ietmProjectParamsForm" :paramModel="model" :pid="model.id" :formDisabled="formDisabled"
                                  @validateError="validateError"></ietm-project-params-form>
      </a-tab-pane>
    </a-tabs>

    <ietm-code-rule-modal ref="codeModal" @getRuleCode="getRuleCode" @ok="codeModalFormOk"/>
  </a-spin>
</template>

<script>

import {getAction} from '@/api/manage'
import {JVxeTableModelMixin} from '@/mixins/JVxeTableModelMixin.js'
import {
  getRefPromise,
  VALIDATE_FAILED,
  validateFormModelAndTables
} from '@/components/jeecg/JVxeTable/utils/vxeUtils.js'
import JFormContainer from '@/components/jeecg/JFormContainer'
import IetmProjectParamsForm from './IetmProjectParamsForm.vue'
import IetmCodeRuleModal from './IetmCodeRuleModal'

export default {
  name: 'IetmProjectForm',
  mixins: [JVxeTableModelMixin],
  components: {
    JFormContainer,
    IetmProjectParamsForm,
    IetmCodeRuleModal
  },
  data() {
    return {
      showRuleModal: false,
      labelCol: {
        xs: {span: 24},
        sm: {span: 5},
      },
      wrapperCol: {
        xs: {span: 24},
        sm: {span: 16},
      },
      model: {},
      // 新增时子表默认添加几行空数据
      addDefaultRowNum: 1,
      validatorRules: {
        name: [
          { required: true, message: '请输入项目名称!' },
          { max: 100, message: '项目名称最多100个字符!' }
        ],
        codeRule: [
          { required: true, message: '请输入编码规则!' },
          { max: 100, message: '编码规则最多100个字符!' }
        ],
        equipmentCode: [
          { required: true, message: '请输入装备编码!' },
          {
            pattern: /^[a-zA-Z0-9]{2,14}$/,
            message: '装备编码必须为2-14位字母或数字!'
          }
        ],
        security: [
          { required: true, message: '请选择密级!' }
        ],
        description: [
          { max: 500, message: '项目描述最多500个字符!' }
        ],
        businessRuleTemp: [
          { max: 100, message: '业务规则模板最多100个字符!' }
        ]
      },
      refKeys: ['ietmProject', 'ietmProjectParams'],
      tableKeys: [],
      activeKey: 'ietmProject',
      // 项目管理-项目参数
      ietmProjectParamsTable: {
        loading: false,
        dataSource: [],
        columns: []
      },
      ietmProjectParamsList: [],
      url: {
        add: "/ietmproject/ietmProject/add",
        edit: "/ietmproject/ietmProject/edit",
        queryById: "/ietmproject/ietmProject/queryById",
        ietmProjectParams: {
          list: '/ietmproject/ietmProject/queryIetmProjectParamsByMainId'
        },
      }
    }
  },
  props: {
    //表单禁用
    disabled: {
      type: Boolean,
      default: false,
      required: false
    }
  },
  computed: {
    formDisabled() {
      return this.disabled
    },
  },
  created() {

  },
  methods: {
    handleChangeTabs(key) {
      // 自动重置scrollTop状态，防止出现白屏
      getRefPromise(this, key).then(vxeTable => {
        vxeTable.resetScrollTop()
      })
    },
    getRuleCode(ruleCode) {
      this.model.codeRule = ruleCode;
    },
    codeModalFormOk() {

    },
    openShowRuleModal() {
      this.$refs.codeModal.title = "编码规则";
      this.$refs.codeModal.ruleModalVisible = true;
    },
    getAllTable() {
      return new Promise(resolve => {
        resolve([]);
      })
    },
    //校验所有一对一子表表单
    validateSubForm(allValues) {
      return new Promise((resolve, reject) => {
        let b = this.$refs.ietmProjectParamsForm.validate(0);
        Promise.all([
          b,
        ]).then(() => {
          b ? resolve(allValues) : reject({error: VALIDATE_FAILED, refKeys: 1})
        })
      })
    },
    /** 整理成formData */
    classifyIntoFormData(allValues) {
      let main = Object.assign(this.model, allValues.formValue)
      return {
        ...main, // 展开
      }
    },
    handleOk() {
      /** 触发表单验证 */
      this.getAllTable().then(tables => {
        /** 一次性验证主表和所有的次表 */
        return validateFormModelAndTables(this.$refs.form, this.model, tables)
      }).then(allValues => {
        /** 一次性验证一对一的所有子表 */
        return this.validateSubForm(allValues)
      }).then(allValues => {
        if (typeof this.classifyIntoFormData !== 'function') {
          throw this.throwNotFunction('classifyIntoFormData')
        }
        let paramFormData = this.$refs.ietmProjectParamsForm.getFormData();
        paramFormData["formDataList"].forEach(p => {
          allValues.formValue[p.key] = p.paramValue;
        })
        let projectCompany = []

        if (paramFormData["companyList1"].length == 0) {
          this.$message.warning(`请输入创作单位！`)
          return;
        }
        if (paramFormData["companyList2"].length == 0) {
          this.$message.warning(`请输入责任单位！`)
          return;
        }
        if (paramFormData["companyList1"]) {
          paramFormData["companyList1"].forEach(p => {
            projectCompany.push(p);
          })
        }
        if (paramFormData["companyList2"]) {
          paramFormData["companyList2"].forEach(p => {
            projectCompany.push(p);
          })
        }
        //如果没有设置，默认设置为1（有效）
        if (!allValues.formValue["status"]) {
          allValues.formValue["status"] = 1;
        }
        allValues.formValue["projectCompany"] = projectCompany;
        let formData = this.classifyIntoFormData(allValues)
        // 发起请求
        return this.request(formData)
      }).catch(e => {
        if (e.error === VALIDATE_FAILED) {
          // 如果有未通过表单验证的子表，就自动跳转到它所在的tab
          if (e.refKeys) {
            this.activeKey = this.refKeys[1]
          } else {
            this.activeKey = this.refKeys[0]
          }
        } else {
        }
      })
    },
    validateError(msg) {
      this.$message.error(msg)
    },

  }
}
</script>

<style scoped>
</style>