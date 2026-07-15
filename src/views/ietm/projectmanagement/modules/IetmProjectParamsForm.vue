<template>
  <div>
    <a-form-model ref="form" slot="detail">
      <a-table
        :columns="paramsColumns"
        :data-source="paramsData"
        :pagination="false"
        bordered
        class="form-table"
        rowKey="key"
      >
        <!-- 自定义参数列值 -->
        <template slot="valueRender" slot-scope="text, record">
          <a-input v-model="record.paramValue" :disabled="formDisabled" :placeholder="record.placeholder"
                   @change="paramValueChange(record.required, record.paramName, record.paramValue)"></a-input>
        </template>
      </a-table>
    </a-form-model>
    <a-row :gutter="16" style="margin-top: 30px">
      <!--      创作单位-->
      <a-col :span="12">
        <a-card size="small" title="创作单位" :bordered="false"
                :headStyle="{background: '#BAE7FF', fontWeight: 'bold'}">
          <ietm-project-company-list :type="1" :pid="pid"
                                     :formDisabled="formDisabled"
                                     @getCompany="getCompany1">
          </ietm-project-company-list>
        </a-card>
      </a-col>
      <!--      责任单位-->
      <a-col :span="12">
        <a-card size="small" title="责任单位" :bordered="false"
                :headStyle="{background: '#BAE7FF', fontWeight: 'bold'}">
          <ietm-project-company-list :type="2" :pid="pid"
                                     :formDisabled="formDisabled"
                                     @getCompany="getCompany2">
          </ietm-project-company-list>
        </a-card>
      </a-col>
    </a-row>
  </div>

</template>
<script>
import {JeecgListMixin} from '@/mixins/JeecgListMixin'
import IetmProjectCompanyList from "@views/ietm/ietmprojectcompany/IetmProjectCompanyList";

export default {
  name: 'IetmProjectParamsForm',
  mixins: [JeecgListMixin],
  components: {IetmProjectCompanyList},
  props: {
    formDisabled: {
      type: Boolean,
      default: false,
      required: false
    },
    paramModel: {
      type: Object,
    },
    pid: {
      type: String,
    }
  },
  watch: {
    paramModel(newVal) {
      this.paramsData.forEach(item => {
        let key = item.key;
        switch (key) {
          case 'cageCode':
            if (newVal[item.key]) {
              item.paramValue = newVal[item.key]
            } else {
              item.paramValue = ''
            }
            break;
          case 'positionCode':
            if (newVal[item.key]) {
              item.paramValue = newVal[item.key]
            } else {
              item.paramValue = 'D'
            }
            break;
          case 'countryCode':
            if (newVal[item.key]) {
              item.paramValue = newVal[item.key]
            } else {
              item.paramValue = 'CN'
            }
            break;
          case 'lanuageCode':
            if (newVal[item.key]) {
              item.paramValue = newVal[item.key]
            } else {
              item.paramValue = 'zh'
            }
            break;
          case 'defaultBusinessRule':
            if (newVal[item.key]) {
              item.paramValue = newVal[item.key]
            } else {
              item.paramValue = '-//S1000D-AAA-D00-00-00-00AA-022A-D//en-US'
            }
            break;
          default:
            break;
        }
      })
    }
  },
  data() {
    return {
      companyList1: [],
      companyList2: [],
      recordDefault: {},
      disableMixinCreated: true,
      paramsColumns: [
        {title: '参数名称', dataIndex: 'paramName', align: 'center', width: '30%'},
        {
          title: '*参数值',
          dataIndex: 'paramValue',
          align: 'center',
          width: '30%',
          scopedSlots: {customRender: 'valueRender'},
        },
        {title: '描述', dataIndex: 'description', align: 'center', width: '40%'}
      ],
      paramsData: [
        {
          key: 'cageCode',
          paramName: '商业和政府机构编码',
          paramValue: '',
          description: '请输入5位ORIG编码（数字/大写字母）。',
          placeholder: '请输入5位ORIG编码',
          required: true
        },
        {
          key: 'positionCode',
          paramName: '位置码',
          paramValue: 'D',
          description: '请输入1位位置编码。',
          placeholder: '请输入1位位置编码',
          required: true
        },
        {
          key: 'defaultBusinessRule',
          paramName: '默认业务规则',
          paramValue: '-//S1000D-AAA-D00-00-00-00AA-022A-D//en-US',
          description: '',
          placeholder: '',
          required: true
        },
        {
          key: 'countryCode',
          paramName: '国家',
          paramValue: 'CN',
          description: '请输入2位国家编码，如CN。',
          placeholder: '请输入2位国家编码',
          required: true
        },
        {
          key: 'lanuageCode',
          paramName: '语言',
          paramValue: 'zh',
          description: '请输入2-3位语言编码，如zh。',
          placeholder: '请输入2-3位语言编码',
          required: true
        }
      ],
      creatCompanyColumns: [
        {
          title: '创作单位编码',
          dataIndex: 'companyCode',
          align: 'center',
          width: '30%'
        },
        {
          title: '创作单位名称',
          dataIndex: 'companyName',
          align: 'center',
          width: '30%'
        },
        {
          title: '描述',
          dataIndex: 'description',
          align: 'center',
          width: '40%'
        },
        {
          title: '操作',
          dataIndex: 'createAction',
          align: "center",
          fixed: "right",
          width: 147,
          scopedSlots: {customRender: 'createAction'},
        }
      ],
      dutyCompanyColumns: [
        {
          title: '责任单位编码',
          dataIndex: 'companyCode',
          align: 'center',
          width: '30%'
        },
        {
          title: '责任单位代码',
          dataIndex: 'companyAgentCode',
          align: 'center',
          width: '30%'
        },
        {
          title: '责任单位名称',
          dataIndex: 'companyName',
          align: 'center',
          width: '40%'
        },
        {
          title: '操作',
          dataIndex: 'action',
          align: "center",
          fixed: "right",
          width: 147,
          scopedSlots: {customRender: 'action'}
        }
      ],
    }
  },
  computed: {},
  mounted() {

  },
  methods: {
    getCompany1(model) {
      this.companyList1 = model
    },
    getCompany2(model) {
      this.companyList2 = model
    },
    getFormData() {
      let formDataList = [];
      this.paramsData.forEach(item => {
        let data = {
          key: item.key,
          paramValue: item.paramValue,
        }
        formDataList.push(data)
      })
      let data = {
        formDataList: formDataList,
        companyList1: this.companyList1,
        companyList2: this.companyList2,
      }
      return data;
    },
    paramValueChange(required, name, value) {
      if (required) {
        if (value === '') {//警告
          this.$message.warning(`请输入${name}`)
        }
      }
    },
    validate() {
      const requiredItems = this.paramsData.filter(item => item.required);
      const errorMessages = [];
      // 检查必填项是否为空
      const emptyItems = requiredItems.filter(item => (!item.paramValue || !item.paramValue.trim()));
      if (emptyItems.length > 0) {
        const emptyNames = emptyItems.map(item => item.paramName).join('、');
        errorMessages.push(`请填写必填项：${emptyNames}`);
      }
      // 检查格式校验,暂时注掉位数校验
      /*      requiredItems.forEach(item => {
              const value = item.paramValue.trim();
              const {key, paramName} = item;

              switch (key) {
                case 'cageCode':
                  if (!/^[A-Za-z0-9]{5}$/.test(value)) {
                    errorMessages.push(`${paramName} 必须为5位字母或数字`);
                  }
                  break;
                case 'positionCode':
                  if (!/^[A-Za-z]$/.test(value)) {
                    errorMessages.push(`${paramName} 必须为1位字母`);
                  }
                  break;
                case 'countryCode':
                  if (!/^[A-Za-z]{2}$/.test(value)) {
                    errorMessages.push(`${paramName} 必须为2位字母`);
                  }
                  break;
                case 'lanuageCode':
                  if (!/^[A-Za-z]{2,3}$/.test(value)) {
                    errorMessages.push(`${paramName} 必须为2-3位字母`);
                  }
                  break;
                case 'defaultBusinessRule':
                  // 该字段没有特殊格式要求，无需校验
                  break;
                default:
                  break;
              }
            });*/
      if (errorMessages.length > 0) {
        this.$message.error(errorMessages.join('\n'));
        return false;
      }
      return true;
    },
  }
}
</script>

<style scoped>
.form-table {
  max-width: 100%;
}

/deep/ .ant-card-body {
  padding: 0px;
}
</style>
