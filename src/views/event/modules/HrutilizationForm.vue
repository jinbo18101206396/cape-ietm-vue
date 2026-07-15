<template>
  <a-spin :spinning="confirmLoading">
    <j-form-container :disabled="formDisabled">
      <a-form-model
        ref="form"
        :model="model"
        :rules="validatorRules"
        slot="detail"
        labelAlign="right"
      >
        <a-row>
          <!-- <a-col :span="12">
            <a-form-model-item
              label="年份："
              :labelCol="labelCol2"
              :wrapperCol="wrapperCol2"
              prop="year"
            >
               <j-dict-select-tag v-model="model.year" dictCode="year" placeholder="请选择月报对应的年份" />
              <select
                class="ant-select-selection ant-select-selection--single"
                name="year"
                id="year"
                v-model="model.year"
              >
                <option v-for="item in year" :value="item" selected>{{ item }}</option>
              </select>
            </a-form-model-item>
          </a-col>
          <a-col :span="12">
            <a-form-model-item
              label="月份"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="month"
            >
               <j-dict-select-tag v-model="model.month" dictCode="month" placeholder="请选择月报对应的月份" />
              <select
                class="ant-select-selection ant-select-selection--single"
                name="month"
                id="month"
                v-model="model.month"
              >
                <option :value="month.value" v-for="month in monthArr" selected>{{ month.value }}</option>
              </select>
            </a-form-model-item>
          </a-col>-->

          <!-- <a-row :gutter="24">
            <a-col :span="12">
              <a-form-model-item label="字典搜索(同步)" prop="searchValue"></a-form-model-item>
            </a-col>
            <a-col :span="12">选中值：{{ formData.searchValue }}</a-col>
          </a-row>-->

          <!-- <a-col :span="24">
            <a-form-model-item label="姓名" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="name">
          <a-input v-model="model.name" placeholder="请输入姓名"></a-input>-->
          <!-- <j-dict-select-tag
                @change="selectName"
                v-model="model.name"
                dictCode="name"
                placeholder="请选择姓名"
              />
              <j-search-select-tag
                @change="selectName"
                placeholder="请选择姓名"
                v-model="model.name"
                :dictOptions="nameOptions"
              ></j-search-select-tag>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item
              label="工号"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="empNumber"
            >
              <a-input v-model="model.empNumber" placeholder="请输入工号"></a-input>
               <j-dict-select-tag v-model="model.empNumber" placeholder="请选择工号" />
            </a-form-model-item>
          </a-col>-->

          <a-col :span="24">
            <a-form-model-item label="角色" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="role">
              <j-dict-select-tag v-model="model.role" dictCode="role" placeholder="请选择角色" />
            </a-form-model-item>
          </a-col>
          <!-- <a-col :span="24">
            <a-form-model-item
              label="项目编号"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="projNo"
            >
              <a-input v-model="model.projNo" placeholder="请输入项目编号" />
            </a-form-model-item>
          </a-col>-->
          <a-col :span="24">
            <a-tooltip title="支持搜索，模糊匹配，如果项目不在下拉列表中可以选择“其他”然后添加“实际的项目名称”">
              <a-form-model-item
                label="项目名称"
                :labelCol="labelCol"
                :wrapperCol="wrapperCol"
                prop="projName"
              >
                <!-- <j-dict-select-tag
                type="list"
                v-model="model.projName"
                dictCode="proj_name"
                placeholder="请选择项目名称"
                />-->
                <!-- <j-search-select-tag
                placeholder="请选择项目名称"
                v-model="model.projName"
                :dictOptions="projNameOptions"
                ></j-search-select-tag>-->
                <j-search-select-tag
                  placeholder="请选择项目名称"
                  v-model="model.projName"
                  dict="PROJECT, PROJ_NAME, PROJ_NAME"
                  @change="(v) => handleSearchSelectAsyncChange(v)"
                >{{ model.projName }}
                </j-search-select-tag>
              </a-form-model-item>
            </a-tooltip>
          </a-col>
          <a-col :span="24">
            <a-form-model-item
              v-if="addActProjName"
              label="实际的项目名称"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="actProjName"
            >
              <a-input v-model="model.actProjName" placeholder="请输入实际的项目名称" style="width: 100%" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item
              label="承担内容概述"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="overview"
            >
              <a-textarea id="textarea" :rows="9" v-model="model.overview"
                          placeholder="请输入承担内容概述"></a-textarea>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item
              label="项目来源"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="projSource"
            >
              <j-dict-select-tag
                v-decorator="['projSource', { initialValue: '其他' }]"
                type="list"
                v-model="model.projSource"
                dictCode="proj_source"
                placeholder="请选择项目来源"
              />
            </a-form-model-item>
          </a-col>
          <!-- 给本月第一天作为默认值 -->
          <a-col :span="24">
            <a-form-model-item
              label="任务周期开始时间"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="startTime"
            >
              <j-date placeholder="请选择任务周期开始时间" v-model="model.startTime" style="width: 100%" />
            </a-form-model-item>
          </a-col>
          <!-- 给本月最后一天作为默认值 -->
          <a-col :span="24">
            <a-form-model-item
              label="任务周期结束时间"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="endTime"
            >
              <j-date placeholder="请选择任务周期结束时间" v-model="model.endTime" style="width: 100%" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item
              label="当前状态"
              :labelCol="labelCol"
              :wrapperCol="wrapperCol"
              prop="curStatus"
            >
              <j-dict-select-tag
                v-decorator="['curStatus', { initialValue: '正常开展' }]"
                type="list"
                v-model="model.curStatus"
                dictCode="cur_status"
                placeholder="请选择当前状态"
              />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-tooltip
              title="自评占时的值应该为0-1之间的数字，代表着本项工作在当前所填月份工作的比重，如果占比为 50%，则填 0.5">
              <a-form-model-item
                label="自评占时"
                :labelCol="labelCol"
                :wrapperCol="wrapperCol"
                prop="occupiedTime"
              >
                <a-input-number
                  v-model="model.occupiedTime"
                  placeholder="请输入自评占时"
                  style="width: 100%"
                />
              </a-form-model-item>
            </a-tooltip>
          </a-col>
        </a-row>
      </a-form-model>
    </j-form-container>
  </a-spin>
</template>

<script>

import { httpAction, postAction, getAction } from '@/api/manage'
import { validateDuplicateValue } from '@/utils/util'
import { mapGetters } from 'vuex'

export default {
  name: 'HrutilizationForm',
  components: {},
  props: {
    //表单禁用
    disabled: {
      type: Boolean,
      default: false,
      required: false
    }
  },
  data() {
    return {
      // empNumber: "",
      year: ['2023', '2024', '2025'],
      monthArr: [
        {
          monthId: '1',
          value: '1'
        },
        {
          monthId: '2',
          value: '2'
        },
        {
          monthId: '3',
          value: '3'
        },
        {
          monthId: '4',
          value: '4'
        },
        {
          monthId: '5',
          value: '5'
        },
        {
          monthId: '6',
          value: '6'
        },
        {
          monthId: '7',
          value: '7'
        },
        {
          monthId: '8',
          value: '8'
        },
        {
          monthId: '9',
          value: '9'
        },
        {
          monthId: '10',
          value: '10'
        },
        {
          monthId: '11',
          value: '11'
        },
        {
          monthId: '12',
          value: '12'
        }
      ],
      disabledSubmit2: false,
      model: {
        year: this.getYear(),
        month: this.getMonth(),
        name: this.nickname(),
        startTime: '',
        endTime: '',
        PROJ_NAME: '',
        // 此处必须进行双向绑定，否则 overview 渲染过后就不能继续编辑了
        overview: ''
      },
      modelToTransfer: {
        year: this.getYear(),
        month: this.getMonth(),
        name: this.nickname(),
        startTime: '',
        endTime: '',
        PROJ_NAME: ''
      },
      addActProjName: false,
      labelCol: {
        xs: { span: 24 },
        sm: { span: 5 }
      },
      labelCol2: {
        xs: { span: 24 },
        sm: { span: 10 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 }
      },
      wrapperCol2: {
        xs: { span: 24 },
        sm: { span: 14 }
      },
      confirmLoading: false,
      nameOptions: [
        {
          text: '常银桥',
          value: '常银桥'
        }, {
          text: '张春雷',
          value: '张春雷'
        }, {
          text: '江志炜',
          value: '江志炜'
        },
        {
          text: '王桂锋',
          value: '王桂锋'
        }, {
          text: '杨俊',
          value: '杨俊'
        }, {
          text: '杨忠良',
          value: '杨忠良'
        },
        {
          text: '陈明泽',
          value: '陈明泽'
        },
        {
          text: '王一平',
          value: '王一平'
        },
        {
          text: '陈斯玉',
          value: '陈斯玉'
        }, {
          text: '陈素微',
          value: '陈素微'
        },
        {
          text: '陈燕凤',
          value: '陈燕凤'
        }, {
          text: '陈正峰',
          value: '陈正峰'
        }, {
          text: '丁新',
          value: '丁新'
        },
        {
          text: '黄燕冰',
          value: '黄燕冰'
        }, {
          text: '赖智超',
          value: '赖智超'
        }, {
          text: '蓝昭伟',
          value: '蓝昭伟'
        },
        {
          text: '李江杰',
          value: '李江杰'
        }, {
          text: '李韶东',
          value: '李韶东'
        }, {
          text: '李鑫然',
          value: '李鑫然'
        },
        {
          text: '刘勇',
          value: '刘勇'
        }, {
          text: '吕佳炎',
          value: '吕佳炎'
        }, {
          text: '师美玲',
          value: '师美玲'
        },
        {
          text: '宋英杰',
          value: '宋英杰'
        }, {
          text: '孙岩',
          value: '孙岩'
        }, {
          text: '唐洋',
          value: '唐洋'
        },
        {
          text: '汪齐家',
          value: '汪齐家'
        }, {
          text: '王东',
          value: '王东'
        }, {
          text: '王明亮',
          value: '王明亮'
        },
        {
          text: '王伟光',
          value: '王伟光'
        }, {
          text: '吴奇峰',
          value: '吴奇峰'
        }, {
          text: '肖梦雨',
          value: '肖梦雨'
        },
        {
          text: '余晓宁',
          value: '余晓宁'
        }, {
          text: '智新凯',
          value: '智新凯'
        }, {
          text: '邹国兵',
          value: '邹国兵'
        },
        {
          text: '陈卓敏',
          value: '陈卓敏'
        }, {
          text: '段德红',
          value: '段德红'
        }, {
          text: '苏航',
          value: '苏航'
        },
        {
          text: '林伟贤',
          value: '林伟贤'
        }, {
          text: '卓权财',
          value: '卓权财'
        }, {
          text: '黄慧龙',
          value: '黄慧龙'
        },
        {
          text: '金星',
          value: '金星'
        }, {
          text: '郭晓',
          value: '郭晓'
        }, {
          text: '解鹏程',
          value: '解鹏程'
        },
        {
          text: '李世雄',
          value: '李世雄'
        }, {
          text: '梁淑婷',
          value: '梁淑婷'
        }, {
          text: '莫瑞麟',
          value: '莫瑞麟'
        },
        {
          text: '孙菥瑶',
          value: '孙菥瑶'
        }, {
          text: '谭冬梅',
          value: '谭冬梅'
        }, {
          text: '杨翠',
          value: '杨翠'
        }, {
          text: '吕海熊',
          value: '吕海熊'
        },
        {
          text: '孔令超',
          value: '孔令超'
        },
        {
          text: '刘书廷',
          value: '刘书廷'
        },
        {
          text: '张玉新',
          value: '张玉新'
        }
      ],
      projNameOptions: [],
      // projNameOptions: [
      //   {
      //     text: "故障模式分析工具",
      //     value: "故障模式分析工具"
      //   },
      //   {
      //     text: "直升机全生命周期系统",
      //     value: "直升机全生命周期系统"
      //   },
      //   {
      //     text: "装备作战试验通用质量特性评估系统",
      //     value: "装备作战试验通用质量特性评估系统"
      //   },
      //   {
      //     text: "基准比较系统软件",
      //     value: "基准比较系统软件"
      //   },
      //   {
      //     text: "多学科联合仿真相关开发技术",
      //     value: "多学科联合仿真相关开发技术"
      //   },
      //   {
      //     text: "数字实验软件开发技术（Ansys TwinBuilder）",
      //     value: "数字实验软件开发技术（Ansys TwinBuilder）"
      //   },
      //   {
      //     text: "电子部件可靠性加速试验系统",
      //     value: "电子部件可靠性加速试验系统"
      //   },
      //   {
      //     text: "GJB5000B",
      //     value: "GJB5000B"
      //   }, {
      //     text: "RAMIDS 2.3产品研制",
      //     value: "RAMIDS 2.3产品研制"
      //   }, {
      //     text: "RAMIDS大型工业软件测评",
      //     value: "RAMIDS大型工业软件测评"
      //   },
      //   {
      //     text: "B工程信息管理系统研发",
      //     value: "B工程信息管理系统研发"
      //   }, {
      //     text: "B工程信息管理系统运维",
      //     value: "B工程信息管理系统运维"
      //   }, {
      //     text: "B工程二期信息管理系统论证",
      //     value: "B工程二期信息管理系统论证"
      //   },
      //   {
      //     text: "B工程-2",
      //     value: "B工程-2"
      //   }, {
      //     text: "B工程-2二期",
      //     value: "B工程-2二期"
      //   }, {
      //     text: "专用系统可靠性数据管理系统（Fracas天津核）",
      //     value: "专用系统可靠性数据管理系统（Fracas天津核）"
      //   },
      //   {
      //     text: "供应链项目",
      //     value: "供应链项目"
      //   }, {
      //     text: "外场技术资料全寿命管理系统",
      //     value: "外场技术资料全寿命管理系统"
      //   }, {
      //     text: "IETM",
      //     value: "IETM"
      //   },
      //   {
      //     text: "APQP",
      //     value: "APQP"
      //   }, {
      //     text: "航质云平台",
      //     value: "航质云平台"
      //   }, {
      //     text: "地面站改型研制",
      //     value: "地面站改型研制"
      //   },
      //   {
      //     text: "无人机外场保障建设观摩研讨会",
      //     value: "无人机外场保障建设观摩研讨会"
      //   }, {
      //     text: "数字化TDDM系统",
      //     value: "数字化TDDM系统"
      //   }, {
      //     text: "数字化协同工作管理平台工作流程组件开发",
      //     value: "数字化协同工作管理平台工作流程组件开发"
      //   },
      //   {
      //     text: "应标软件",
      //     value: "应标软件"
      //   }, {
      //     text: "B区域增强故障诊断软件",
      //     value: "B区域增强故障诊断软件"
      //   }, {
      //     text: "故障诊断系统",
      //     value: "故障诊断系统"
      //   },
      //   {
      //     text: "技术资料编修",
      //     value: "技术资料编修"
      //   }, {
      //     text: "技术资料整改",
      //     value: "技术资料整改"
      //   }, {
      //     text: "标准化信息管理系统",
      //     value: "标准化信息管理系统"
      //   },
      //   {
      //     text: "低代码平台",
      //     value: "低代码平台"
      //   }, {
      //     text: "基于二维码的标准件资源管理系统",
      //     value: "基于二维码的标准件资源管理系统"
      //   }, {
      //     text: "质量提升工程",
      //     value: "质量提升工程"
      //   },
      //   {
      //     text: "航天基于模型的故障模式辅助分析插件",
      //     value: "航天基于模型的故障模式辅助分析插件"
      //   }, {
      //     text: "开发运维一体化（DevOps）平台",
      //     value: "开发运维一体化（DevOps）平台"
      //   }, {
      //     text: "某型产品技术资料编修结题验收",
      //     value: "某型产品技术资料编修结题验收"
      //   },
      //   {
      //     text: "602 X8项目",
      //     value: "602 X8项目"
      //   }, {
      //     text: "航标国防科大项目",
      //     value: "航标国防科大项目"
      //   }, {
      //     text: "质量外审",
      //     value: "质量外审"
      //   },
      //   {
      //     text: "质量专项整治",
      //     value: "质量专项整治"
      //   }, {
      //     text: "GJB9000外审＆民品扩项",
      //     value: "GJB9000外审＆民品扩项"
      //   }, {
      //     text: "信息共享标准符合性检测工具",
      //     value: "信息共享标准符合性检测工具"
      //   },
      //   {
      //     text: "商用软件研发运维体系建立",
      //     value: "商用软件研发运维体系建立"
      //   }, {
      //     text: "硬件产品研制程序文件修订",
      //     value: "硬件产品研制程序文件修订"
      //   },
      //   {
      //     text: "仿真大平台",
      //     value: "仿真大平台"
      //   }, {
      //     text: "统标统型项目",
      //     value: "统标统型项目"
      //   }, {
      //     text: "集团服务保障信息化平台",
      //     value: "集团服务保障信息化平台"
      //   },
      //   {
      //     text: "其他",
      //     value: "其他"
      //   },
      // ],
      validatorRules: {
        year: [{ required: true, message: '请选择月报所属年份！' },
          { initialValue: (new Date).getFullYear() }],
        month: [{ required: true, message: '请选择月报所属月份！' }],
        empNumber: [
          { required: true, message: '请输入工号!' },
          { pattern: /^-?\d+$/, message: '请输入整数!' }
        ],
        name: [
          { required: true, message: '请选择姓名!' }
        ],
        role: [
          { required: true, message: '请选择角色!' }
        ],
        projName: [
          { required: true, message: '请选择项目名称!' }
        ],
        actProjName: [
          { required: true, message: '请输入实际项目名称' }
        ],
        overview: [
          { required: true, message: '请输入承担内容概述!' }
        ],
        projSource: [
          { required: false, message: '请选择项目来源!', initialValue: '其他' }
        ],
        occupiedTime: [
          { required: true, message: '请输入自评占时!' },
          { pattern: /^-?\d+\.?\d*$/, message: '请输入数字!' }
        ],
        curStatus: [
          { initialValue: '正常开展' }
        ]
      },
      url: {
        add: '/hrutilization/add',
        edit: '/hrutilization/edit',
        queryById: '/hrutilization/queryById',
        queryProjName: '/hrutilization/queryProjName',
        queryOverview: '/hrutilization/queryOverview'
      }
    }
  },
  computed: {
    formDisabled() {
      return this.disabled
    }
  },
  // 创建时自动加载数据
  created() {
    let that = this
    // 备份model原始值
    that.modelDefault = JSON.parse(JSON.stringify(that.model))
    // 设置默认值必须通过这种方式回调才能正确渲染回显
    that.$nextTick(function() {
      that.model.empNumber = that.getEmpNumber()
      that.model.name = that.nickname()
      that.model.projSource = '其他'
      that.model.curStatus = '正常开展'
      that.model.startTime = that.getStartTime()
      that.model.endTime = that.getEndTime()
    })
  },
  mounted() {
    // console.log("this.$refs.modalForm.disableSubmit: ", this.disabledSubmit2);
    this.selectName(this.model.name)
    this.$forceUpdate()
  },
  methods: {
    ...mapGetters(['nickname']),
    getStartTime() {
      const newDate = new Date()
      const date = {
        year: newDate.getFullYear(),
        month: newDate.getMonth() + 1,
        date: '01'
      }
      const newmonth = date.month >= 10 ? date.month : '0' + date.month
      return date.year + '-' + newmonth + '-' + date.date
    },
    // 获取某个月的总天数
    getDaysOfMonth(year, month) {
      var date = new Date(year, month, 0)
      var days = date.getDate()
      return days
    },
    getEndTime() {
      const newDate = new Date()
      const date = {
        year: newDate.getFullYear(),
        month: newDate.getMonth() + 1,
        date: ''
      }
      const newmonth = date.month >= 10 ? date.month : '0' + date.month
      date.date = this.getDaysOfMonth(date.year, date.month)
      return date.year + '-' + newmonth + '-' + date.date
    },
    getDate() {
      const newDate = new Date()
      const date = {
        year: newDate.getFullYear(),
        month: newDate.getMonth() + 1,
        date: newDate.getDate()
      }
      const newmonth = date.month >= 10 ? date.month : '0' + date.month
      const day = date.date >= 10 ? date.date : '0' + date.date
      return date.year + '-' + newmonth + '-' + day
    },
    getYear() {
      const newDate = new Date()
      return String(newDate.getFullYear())
    },
    getMonth() {
      const newDate = new Date()
      return newDate.getMonth() + 1
    },
    getEmpNumber() {
      var value = this.model.name
      if (value != undefined) {
        switch (value) {
          case '常银桥':
            return 30107738
          case '张春雷':
            return 30104179

          case '江志炜':
            return 30101824

          case '王桂锋':
            return 30101800

          case '杨俊':
            return 30107827

          case '杨忠良':
            return 30103570

          case '陈明泽':
            return 30107673
          case '王一平':
            return 30108093
          case '陈斯玉':
            return 30107312

          case '陈素微':
            return 30101683

          case '陈燕凤':
            return 30103368

          case '陈正峰':
            return 30101684

          case '丁新':
            return 30107316

          case '黄燕冰':
            return 30101685

          case '赖智超':
            return 30103118

          case '蓝昭伟':
            return 30101682

          case '李江杰':
            return 30101680

          case '李韶东':
            return 30103250

          case '李鑫然':
            return 30107628

          case '刘勇':
            return 30107290

          case '吕佳炎':
            return 30108002

          case '师美玲':
            return 30107941

          case '宋英杰':
            return 30107818

          case '孙岩':
            return 30104159

          case '唐洋':
            return 30107606

          case '汪齐家':
            return 30107319

          case '王东':
            return 30107736

          case '王明亮':
            return 30104263

          case '王伟光':
            return 30107744

          case '吴奇峰':
            return 30101742

          case '肖梦雨':
            return 30107853

          case '余晓宁':
            return 30102759

          case '智新凯':
            return 30107749

          case '邹国兵':
            return 30103969

          case '陈卓敏':
            return 30101692

          case '段德红':
            return 30103425

          case '苏航':
            return 30107428

          case '林伟贤':
            return 30102786

          case '卓权财':
            return 30101693

          case '黄慧龙':
            return 30107940

          case '金星':
            return 30101670

          case '郭晓':
            return 30100363

          case '解鹏程':
            return 30107295

          case '李世雄':
            return 30104284

          case '梁淑婷':
            return 30102664

          case '莫瑞麟':
            return 30107570

          case '孙菥瑶':
            return 30104374

          case '谭冬梅':
            return 30107647

          case '杨翠':
            return 30103764

          case '吕海熊':
            return 30103807
          case '金波':
            return 30108085

          case '孔令超':
            return 30108016

          case '张玉新':
            return 30108047

          case '刘书廷':
            return 30108077

          default:
            return ''
        }
      }
    },
    selectName(value) {
      if (value != undefined) {
        switch (value) {
          case '常银桥':
            this.model.empNumber = 30107738
            break
          case '张春雷':
            this.model.empNumber = 30104179
            break
          case '江志炜':
            this.model.empNumber = 30101824
            break
          case '王桂锋':
            this.model.empNumber = 30101800
            break
          case '杨俊':
            this.model.empNumber = 30107827
            break
          case '杨忠良':
            this.model.empNumber = 30103570
            break
          case '陈明泽':
            this.model.empNumber = 30107673
            break
          case '王一平':
            this.model.empNumber = 30108093
            break
          case '陈斯玉':
            this.model.empNumber = 30107312
            break
          case '陈素微':
            this.model.empNumber = 30101683
            break
          case '陈燕凤':
            this.model.empNumber = 30103368
            break
          case '陈正峰':
            this.model.empNumber = 30101684
            break
          case '丁新':
            this.model.empNumber = 30107316
            break
          case '黄燕冰':
            this.model.empNumber = 30101685
            break
          case '赖智超':
            this.model.empNumber = 30103118
            break
          case '蓝昭伟':
            this.model.empNumber = 30101682
            break
          case '李江杰':
            this.model.empNumber = 30101680
            break
          case '李韶东':
            this.model.empNumber = 30103250
            break
          case '李鑫然':
            this.model.empNumber = 30107628
            break
          case '刘勇':
            this.model.empNumber = 30107290
            break
          case '吕佳炎':
            this.model.empNumber = 30108002
            break
          case '师美玲':
            this.model.empNumber = 30107941
            break
          case '宋英杰':
            this.model.empNumber = 30107818
            break
          case '孙岩':
            this.model.empNumber = 30104159
            break
          case '唐洋':
            this.model.empNumber = 30107606
            break
          case '汪齐家':
            this.model.empNumber = 30107319
            break
          case '王东':
            this.model.empNumber = 30107736
            break
          case '王明亮':
            this.model.empNumber = 30104263
            break
          case '王伟光':
            this.model.empNumber = 30107744
            break
          case '吴奇峰':
            this.model.empNumber = 30101742
            break
          case '肖梦雨':
            this.model.empNumber = 30107853
            break
          case '余晓宁':
            this.model.empNumber = 30102759
            break
          case '智新凯':
            this.model.empNumber = 30107749
            break
          case '邹国兵':
            this.model.empNumber = 30103969
            break
          case '陈卓敏':
            this.model.empNumber = 30101692
            break
          case '段德红':
            this.model.empNumber = 30103425
            break
          case '苏航':
            this.model.empNumber = 30107428
            break
          case '林伟贤':
            this.model.empNumber = 30102786
            break
          case '卓权财':
            this.model.empNumber = 30101693
            break
          case '黄慧龙':
            this.model.empNumber = 30107940
            break
          case '金星':
            this.model.empNumber = 30101670
            break
          case '郭晓':
            this.model.empNumber = 30100363
            break
          case '解鹏程':
            this.model.empNumber = 30107295
            break
          case '李世雄':
            this.model.empNumber = 30104284
            break
          case '梁淑婷':
            this.model.empNumber = 30102664
            break
          case '莫瑞麟':
            this.model.empNumber = 30107570
            break
          case '孙菥瑶':
            this.model.empNumber = 30104374
            break
          case '谭冬梅':
            this.model.empNumber = 30107647
            break
          case '杨翠':
            this.model.empNumber = 30103764
            break
          case '吕海熊':
            this.model.empNumber = 30103807
            break
          case '金波':
            this.model.empNumber = 30108085
            break
          case '孔令超':
            this.model.empNumber = 30108016
            break
          case '张玉新':
            this.model.empNumber = 30108047
            break
          case '刘书廷':
            this.model.empNumber = 30108077
            break
          default:
            this.model.empNumber = ''
            break
        }
      }
    },
    requestProjName() {
      let that = this
      that.confirmLoading = true
      let httpurl = ''
      let param = ''

      httpurl += this.url.queryProjName

      postAction(httpurl, param).then((res) => {
        if (res.success) {
          that.projNameOptions = res.data
        } else {
          that.$message.warning('获取项目名称失败')
        }
      }).finally(() => {
        that.confirmLoading = false
      })

    },
    // selectProj(value) {
    //   if (value != undefined) {
    //     switch (value) {
    //       case "GJB5000B":
    //         this.model.projSource = 30107738;
    //         break;
    //       case "RAMIDS 2.3产品研制":
    //         this.model.projSource = "技术市场";
    //         break;
    //       case "RAMIDS大型工业软件测评":
    //         this.model.projSource = 30101824;
    //         break;
    //       case "B工程信息管理系统研发":
    //         this.model.projSource = 30101800;
    //         break;
    //       case "B工程信息管理系统运维":
    //         this.model.projSource = 30107827;
    //         break;
    //       case "B工程二期信息管理系统论证":
    //         this.model.projSource = 30103570;
    //         break;
    //       case "B工程-2":
    //         this.model.projSource = 30107673;
    //         break;
    //       case "B工程-2二期":
    //         this.model.projSource = 30107312;
    //         break;
    //       case "专用系统可靠性数据管理系统（Fracas天津核）":
    //         this.model.projSource = 30101683;
    //         break;
    //       case "供应链项目":
    //         this.model.projSource = 30103368;
    //         break;
    //       case "外场技术资料全寿命管理系统":
    //         this.model.projSource = 30101684;
    //         break;
    //       case "IETM":
    //         this.model.projSource = 30107316;
    //         break;
    //       case "APQP":
    //         this.model.projSource = 30101685;
    //         break;
    //       case "航质云平台":
    //         this.model.projSource = 30103118;
    //         break;
    //       case "地面站改型研制":
    //         this.model.projSource = 30101682;
    //         break;
    //       case "无人机外场保障建设观摩研讨会":
    //         this.model.projSource = 30101680;
    //         break;
    //       case "数字化TDDM系统":
    //         this.model.projSource = 30103250;
    //         break;
    //       case "数字化协同工作管理平台工作流程组件开发":
    //         this.model.projSource = 30107628;
    //         break;
    //       case "应标软件":
    //         this.model.projSource = 30107290;
    //         break;
    //       case "B区域增强故障诊断软件":
    //         this.model.projSource = 30108002;
    //         break;
    //       case "故障诊断系统":
    //         this.model.projSource = 30107941;
    //         break;
    //       case "技术资料编修":
    //         this.model.projSource = 30107818;
    //         break;
    //       case "技术资料整改":
    //         this.model.projSource = 30104159;
    //         break;
    //       case "标准化信息管理系统":
    //         this.model.projSource = 30107606;
    //         break;
    //       case "低代码平台":
    //         this.model.projSource = 30107319;
    //         break;
    //       case "基于二维码的标准件资源管理系统":
    //         this.model.projSource = 30107736;
    //         break;
    //       case "质量提升工程":
    //         this.model.projSource = 30104263;
    //         break;
    //       case "航天基于模型的故障模式辅助分析插件":
    //         this.model.projSource = 30107744;
    //         break;
    //       case "开发运维一体化（DevOps）平台":
    //         this.model.projSource = 30101742;
    //         break;
    //       case "某型产品技术资料编修结题验收":
    //         this.model.projSource = 30107853;
    //         break;
    //       case "602 X8项目":
    //         this.model.projSource = 30102759;
    //         break;
    //       case "航标国防科大项目":
    //         this.model.projSource = 30107749;
    //         break;
    //       case "质量外审":
    //         this.model.projSource = 30103969;
    //         break;
    //       case "质量专项整治":
    //         this.model.projSource = 30101692;
    //         break;
    //       case "GJB9000外审＆民品扩项":
    //         this.model.projSource = 30103425;
    //         break;
    //       case "信息共享标准符合性检测工具":
    //         this.model.projSource = 30107428;
    //         break;
    //       case "商用软件研发运维体系建立":
    //         this.model.projSource = 30102786;
    //         break;
    //       case "硬件产品研制程序文件修订":
    //         this.model.projSource = 30101693;
    //         break;
    //       case "信息共享标准符合性检测工具":
    //         this.model.projSource = 30107940;
    //         break;
    //       case "仿真大平台":
    //         this.model.projSource = 30101670;
    //         break;
    //       case "统标统型项目":
    //         this.model.projSource = 30100363;
    //         break;
    //       case "集团服务保障信息化平台":
    //         this.model.projSource = 30107295;
    //         break;
    //       case "其他":
    //         this.model.projSource = 30104284;
    //         break;
    //       default:
    //         this.model.projSource = "";
    //         break;
    //     }
    //   }
    // },
    renderOverView(value) {
      let that = this
      that.confirmLoading = true
      let httpurl = ''
      let param = {
        projName: value,
        createBy: this.nickname()
      }
      httpurl += this.url.queryOverview
      postAction(httpurl, param).then((res) => {
        if (res.success) {
          that.model.overview = res.result
          // var overview = document.getElementById("textarea");
          // this.autoUpdate(overview);
          // overview.addEventListener('input', this.adjustSize);
        }
        // else {
        //   that.$message.warning("从周报系统中获取承担内容概述失败");
        // }
      }).finally(() => {
        that.confirmLoading = false
      })
    },
    adjustSize() {
      document.getElementById('textarea').style.height = 'auto'
      document.getElementById('textarea').style.height = document.getElementById('textarea').scrollHeight + 'px'
    },

    autoUpdate(elem, extra, maxHeight) {
      extra = extra || 0
      var isFirefox = !!document.getBoxObjectFor || 'mozInnerScreenX' in window,
        isOpera = !!window.opera && !!window.opera.toString().indexOf('Opera'),
        addEvent = function(type, callback) {
          elem.addEventListener ?
            elem.addEventListener(type, callback, false) :
            elem.attachEvent('on' + type, callback)
        },
        getStyle = elem.currentStyle ? function(name) {
          var val = elem.currentStyle[name]

          if (name === 'height' && val.search(/px/i) !== 1) {
            var rect = elem.getBoundingClientRect()
            return rect.bottom - rect.top -
              parseFloat(getStyle('paddingTop')) -
              parseFloat(getStyle('paddingBottom')) + 'px'
          }


          return val
        } : function(name) {
          return getComputedStyle(elem, null)[name]
        },
        minHeight = parseFloat(getStyle('height'))

      elem.style.resize = 'none'

      var change = function() {
        var scrollTop, height,
          padding = 0,
          style = elem.style

        if (elem._length === elem.value.length) return
        elem._length = elem.value.length

        if (!isFirefox && !isOpera) {
          padding = parseInt(getStyle('paddingTop')) + parseInt(getStyle('paddingBottom'))
        }

        scrollTop = document.body.scrollTop || document.documentElement.scrollTop

        elem.style.height = minHeight + 'px'
        if (elem.scrollHeight > minHeight) {
          if (maxHeight && elem.scrollHeight > maxHeight) {
            height = maxHeight - padding
            style.overflowY = 'auto'
          } else {
            height = elem.scrollHeight - padding
            style.overflowY = 'hidden'
          }

          style.height = height + extra + 'px'
          scrollTop += parseInt(style.height) - elem.currHeight
          document.body.scrollTop = scrollTop
          document.documentElement.scrollTop = scrollTop
          elem.currHeight = parseInt(style.height)
        }

      }

      addEvent('propertychange', change)
      addEvent('input', change)
      addEvent('focus', change)
      change()
    },
    handleSearchSelectAsyncChange(value) {
      // console.log("value when handleSearchSelectAsyncChange = ", value);
      // true: 显示对应的文本框允许添加实际的项目名
      this.addActProjName = value && value.trim() === '其他'
      this.renderOverView(value)
    },

    add() {
      this.modelDefault = JSON.parse(JSON.stringify(this.model))
      this.edit(this.modelDefault)
    },
    edit(record) {
      this.model = Object.assign({}, record)
      this.visible = true
    },
    submitForm() {
      const that = this
      // 触发表单验证
      this.$refs.form.validate(valid => {
        if (valid) {
          that.confirmLoading = true
          let httpurl = ''
          let method = ''
          if (!this.model.id) {
            httpurl += this.url.add
            method = 'post'
          } else {
            httpurl += this.url.edit
            method = 'put'
          }
          if (this.model.occupiedTime > 1) {
            // 防止有人不按照规则填写自评占时
            this.model.occupiedTime = 1
          }
          if (this.model.occupiedTime < 0) {
            this.model.occupiedTime = 0
          }
          this.modelToTransfer = this.model
          if (this.model.projName === '其他' && this.model.actProjName !== '其他') {
            this.modelToTransfer.projName = this.model.actProjName
          }
          httpAction(httpurl, this.modelToTransfer, method).then((res) => {
            if (res.success) {
              that.$message.success(res.message)
              that.$emit('ok')
            } else {
              that.$message.warning(res.message)
            }
          }).finally(() => {
            that.confirmLoading = false
          })
        }

      })
    }
  }
}
</script>
<style>
.select {
  position: relative;
  height: 32px;
  cursor: pointer;
  margin-left: 11px;
}

/* #textarea {
  display: block;
  margin: 0 auto;
  overflow: hidden;
  width: 550px;
  font-size: 14px;
  height: 18px;
  line-height: 24px;
  padding: 2px;
}
textarea {
  outline: 0 none;
  border-color: rgba(82, 168, 236, 0.8);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1),
    0 0 8px rgba(82, 168, 236, 0.6);
} */
</style>
