<template>
  <a-card :bordered="false">
    <!-- 查询区域 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline" @keyup.enter.native="searchQuery">
        <a-row :gutter="24"></a-row>
      </a-form>
    </div>
    <!-- 查询区域-END -->

    <!-- 操作按钮区域 -->
    <div class="table-operator">
      <a-button @click="handleAdd" type="primary" icon="plus">新增</a-button>
      <a-button type="primary" icon="download" @click="handleExportXls('人力资源使用情况报表')">导出</a-button>
      <a-upload
        name="file"
        :showUploadList="true"
        :multiple="true"
        :headers="tokenHeader"
        :action="importExcelUrl"
        @change="handleImportExcel"
      >
        <a-button type="primary" icon="import">导入</a-button>
      </a-upload>
      <!-- <a-button type="primary" icon="search" @click="search">北区开发机用户月报统计</a-button>
      <a-button type="primary" icon="search" @click="searchRemaining">非北区开发机用户月报统计</a-button>-->
      <!-- 高级查询区域 -->
      <a-tooltip title="可以通过高级查询来筛选月报所属的年份以及月份，方便当前月份自评占时的估算">
        <j-super-query
          :fieldList="superFieldList"
          ref="superQueryModal"
          @handleSuperQuery="handleSuperQuery"
        ></j-super-query>
      </a-tooltip>
      <!-- 月报统计查询区域 -->
      <a-tooltip title="可以通过月报统计查询来筛选月报所属的年份以及月份对应的月报填报情况，当不指定年月时则默认查询当前年月的月报填报情况">
        <j-statistical-query
          :fieldList="statisticalFieldList"
          ref="statisticalQueryModal"
          @handleStatisticalQuery="handleStatisticalQuery"
        ></j-statistical-query>
      </a-tooltip>

      <a-dropdown v-if="selectedRowKeys.length > 0">
        <a-menu slot="overlay">
          <a-menu-item key="1" @click="batchDel">
            <a-icon type="delete" />删除
          </a-menu-item>
        </a-menu>
        <a-button style="margin-left: 8px">
          批量操作
          <a-icon type="down" />
        </a-button>
      </a-dropdown>
    </div>
    <div style="display: flex;">
      <!-- 左侧用户信息区域 -->
      <div style="width: 10%;">
        <div>
          <b style="font-size: x-large; margin-bottom: 10px;">用户信息</b>
        </div>
        <!-- <a-tooltip title="默认仅可以填写自己当前月份的月报，点击编辑可以替别人以及填写其他月份的月报">
          <a-button @click="handleEdit" type="primary" icon="edit">编辑</a-button>
        </a-tooltip>-->

        <j-form-container :disabled="disabled" style="margin-top: 10px;">
          <a-form-model ref="form" :model="model" slot="detail">
            <a-row>
              <a-col :span="24">
                <a-form-model-item
                  label="年份："
                  :labelCol="labelCol"
                  :wrapperCol="wrapperCol"
                  prop="year"
                >
                  <!-- <j-dict-select-tag v-model="model.year" dictCode="year" placeholder="请选择月报对应的年份" /> -->
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
              <a-col :span="24">
                <a-form-model-item
                  label="月份"
                  :labelCol="labelCol"
                  :wrapperCol="wrapperCol"
                  prop="month"
                >
                  <!-- <j-dict-select-tag v-model="model.month" dictCode="month" placeholder="请选择月报对应的月份" /> -->
                  <select
                    class="ant-select-selection ant-select-selection--single"
                    name="month"
                    id="month"
                    v-model="model.month"
                  >
                    <option
                      :value="month.value"
                      v-for="month in monthArr"
                      selected
                    >{{ month.value }}</option>
                  </select>
                </a-form-model-item>
              </a-col>

              <a-col :span="24">
                <a-form-model-item
                  label="姓名"
                  :labelCol="labelCol"
                  :wrapperCol="wrapperCol"
                  prop="name"
                >
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
                  <a-input v-model="model.empNumber" placeholder="工号"></a-input>
                  <!-- <j-dict-select-tag v-model="model.empNumber" placeholder="请选择工号" /> -->
                </a-form-model-item>
              </a-col>
            </a-row>
          </a-form-model>
        </j-form-container>
      </div>

      <!-- table区域-begin -->
      <div style="width: 90%;">
        <div class="ant-alert ant-alert-info" style="margin-bottom: 16px;">
          <i class="anticon anticon-info-circle ant-alert-icon"></i> 已选择
          <a style="font-weight: 600">{{ selectedRowKeys.length }}</a>项
          <a style="margin-left: 24px" @click="onClearSelected">清空</a>
        </div>

        <a-table
          ref="table"
          size="middle"
          :scroll="{ x: true }"
          bordered
          rowKey="id"
          :columns="columns"
          :dataSource="dataSource"
          :pagination="ipagination"
          :loading="loading"
          :rowSelection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
          class="j-table-force-nowrap"
          @change="handleTableChange"
        >
          <!-- <j-vxe-table
          ref="table"
          :scroll="{ x: true }"
          bordered
          rowKey="id"
          :columns="columns"
          :dataSource="dataSource"
          :pagination="ipagination"
          :loading="loading"
          class="j-table-force-nowrap"
          @change="handleTableChange"
          >-->
          <!-- a-table 插槽开始 -->
          <template slot="htmlSlot" slot-scope="text">
            <div v-html="text"></div>
          </template>
          <template slot="imgSlot" slot-scope="text,record">
            <span v-if="!text" style="font-size: 12px;font-style: italic;">无图片</span>
            <img
              v-else
              :src="getImgView(text)"
              :preview="record.id"
              height="25px"
              alt
              style="max-width:80px;font-size: 12px;font-style: italic;"
            />
          </template>
          <template slot="fileSlot" slot-scope="text">
            <span v-if="!text" style="font-size: 12px;font-style: italic;">无文件</span>
            <a-button
              v-else
              :ghost="true"
              type="primary"
              icon="download"
              size="small"
              @click="downloadFile(text)"
            >下载</a-button>
          </template>

          <span slot="action" slot-scope="text, record">
            <a @click="handleEdit(record)">编辑</a>

            <a-divider type="vertical" />
            <a-dropdown>
              <a class="ant-dropdown-link">
                更多
                <a-icon type="down" />
              </a>
              <a-menu slot="overlay">
                <a-menu-item>
                  <a @click="handleDetail(record)">详情</a>
                </a-menu-item>
                <a-menu-item>
                  <a-popconfirm title="确定删除吗?" @confirm="() => handleDelete(record.id)">
                    <a>删除</a>
                  </a-popconfirm>
                </a-menu-item>
              </a-menu>
            </a-dropdown>
          </span>
          <!-- a-table 插槽结束 -->
          <!-- j-vxe-table 的插槽开始 -->
          <!-- <template v-slot:action="props">
            <a @click="handleView(props)">查看</a>
            <a-divider type="vertical"></a-divider>
            <a-popconfirm title="确定删除吗？" @confirm="handleDelete(props)">
              <a>删除</a>
            </a-popconfirm>
          </template>-->
          <!-- j-vxe-table 的插槽结束 -->
          <!-- </j-vxe-table> -->
        </a-table>
      </div>
    </div>

    <hrutilization-modal ref="modalForm" @ok="modalFormOk"></hrutilization-modal>
  </a-card>
</template>

<script>

import '@/assets/less/TableExpand.less'
import { mixinDevice } from '@/utils/mixin'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import HrutilizationModal from './modules/HrutilizationModal.vue'
import { mapGetters } from 'vuex'
import { JVXETypes } from '../../components/jeecg/JVxeTable'
import { httpAction, postAction, getAction } from '@/api/manage'
import { Tooltip } from 'ant-design-vue'
export default {
  name: 'HrutilizationList',
  mixins: [JeecgListMixin, mixinDevice],
  components: {
    HrutilizationModal
  },
  data() {
    return {
      description: '人力资源使用情况报表管理页面',
      disabled: true,
      // 用户表表头
      userColumns: [
        {
          title: '年',
          align: "center",
          dataIndex: 'year'
        },
        {
          title: '月',
          align: "center",
          dataIndex: 'month'
        },
        {
          title: '工号',
          align: "center",
          dataIndex: 'empNumber'
        },
        {
          title: '姓名',
          align: "center",
          dataIndex: 'name'
        },
      ],
      // 月报表表头
      columns: [
        {
          title: '#',
          dataIndex: '',
          key: 'rowIndex',
          width: 60,
          align: "center",
          customRender: function (t, r, index) {
            return parseInt(index) + 1;
          }
        },
        {
          title: '角色',
          align: "center",
          key: 'role',
          dataIndex: 'role',
          width: '110px',
        },
        {
          title: '姓名',
          align: "center",
          key: 'name',
          dataIndex: 'name',
          width: '80px',
        },
        {
          title: '项目名称',
          align: "center",
          key: 'projName',
          dataIndex: 'projName',
          width: '160px',
          ellipsis: true
        },
        {
          title: '自评占时',
          key: 'occupiedTime',
          type: JVXETypes.inputNumber,
          align: "center",
          width: '100px',
          dataIndex: 'occupiedTime',
          statistics: ['sum']
        },
        {
          title: '承担内容概述',
          align: "center",
          key: 'overview',
          dataIndex: 'overview',
          width: '160px',
          ellipsis: true,
          onCell: () => {
            return {
              style: {
                maxWidth: 200,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                cursor: 'pointer'
              }
            };
          },
          // render: (_, item) => (
          //   <Tooltip placement='topLeft' title={item?.name || '-'}>
          //     {item?.name || '-'}
          //   </Tooltip>
          // )
        },
        {
          title: '项目来源',
          align: "center",
          key: 'projSource',
          dataIndex: 'projSource',
          width: '100px',
        },
        {
          title: '任务周期开始时间',
          align: "center",
          key: 'startTime',
          dataIndex: 'startTime',
          width: '120px',
          customRender: function (text) {
            return !text ? "" : (text.length > 10 ? text.substr(0, 10) : text)
          }
        },
        {
          title: '任务周期结束时间',
          align: "center",
          key: 'endTime',
          dataIndex: 'endTime',
          width: '120px',
          customRender: function (text) {
            return !text ? "" : (text.length > 10 ? text.substr(0, 10) : text)
          }
        },
        {
          title: '当前状态',
          align: "center",
          key: 'curStatus',
          dataIndex: 'curStatus',
          width: '100px',
        },
        {
          title: '操作',
          key: 'action',
          dataIndex: 'action',
          align: "center",
          // 组件类型定义为【插槽】
          // type: JVXETypes.slot,
          // slot 的名称，对应 v-slot 冒号后面和等号前面的内容
          // slotName: 'action',
          fixed: "right",
          width: 147,
          // width: '100px',
          scopedSlots: { customRender: 'action' }
        }
      ],
      url: {
        list: "/hrutilization/list",
        delete: "/hrutilization/delete",
        deleteBatch: "/hrutilization/deleteBatch",
        exportXlsUrl: "/hrutilization/exportXls",
        importExcelUrl: "hrutilization/importExcel",
        queryFillingStatus: "/hrutilization/queryFillingStatus",
        queryRemainingFillingStatus: "/hrutilization/queryRemainingFillingStatus"
      },
      dictOptions: {},
      userFieldList: [],
      superFieldList: [],
      statisticalFieldList: [],
      year: ["2023", "2024", "2025"],
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
        },
      ],
      model: {
        year: this.getYear(),
        month: this.getMonth(),
        name: this.nickname(),
        // empNumber: this.getEmpNumber(),
      },
      labelCol: {
        xs: { span: 24 },
        sm: { span: 5 },
      },
      labelCol2: {
        xs: { span: 24 },
        sm: { span: 8 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 },
      },
      wrapperCol2: {
        xs: { span: 24 },
        sm: { span: 14 },
      },
      nameOptions: [
        {
          text: "常银桥",
          value: "常银桥"
        }, {
          text: "张春雷",
          value: "张春雷"
        }, {
          text: "江志炜",
          value: "江志炜"
        },
        {
          text: "王桂锋",
          value: "王桂锋"
        }, {
          text: "杨俊",
          value: "杨俊"
        }, {
          text: "杨忠良",
          value: "杨忠良"
        },
        {
          text: "陈明泽",
          value: "陈明泽"
        },
        {
          text: "王一平",
          value: "王一平"
        },
        {
          text: "米富博",
          value: "米富博"
        },
        {
          text: "陈斯玉",
          value: "陈斯玉"
        }, {
          text: "陈素微",
          value: "陈素微"
        },
        {
          text: "陈燕凤",
          value: "陈燕凤"
        }, {
          text: "陈正峰",
          value: "陈正峰"
        }, {
          text: "丁新",
          value: "丁新"
        },
        {
          text: "黄燕冰",
          value: "黄燕冰"
        }, {
          text: "赖智超",
          value: "赖智超"
        }, {
          text: "蓝昭伟",
          value: "蓝昭伟"
        },
        {
          text: "李江杰",
          value: "李江杰"
        }, {
          text: "李韶东",
          value: "李韶东"
        }, {
          text: "李鑫然",
          value: "李鑫然"
        },
        {
          text: "刘勇",
          value: "刘勇"
        }, {
          text: "吕佳炎",
          value: "吕佳炎"
        }, {
          text: "师美玲",
          value: "师美玲"
        },
        {
          text: "宋英杰",
          value: "宋英杰"
        }, {
          text: "孙岩",
          value: "孙岩"
        }, {
          text: "唐洋",
          value: "唐洋"
        },
        {
          text: "汪齐家",
          value: "汪齐家"
        }, {
          text: "王东",
          value: "王东"
        }, {
          text: "王明亮",
          value: "王明亮"
        },
        {
          text: "王伟光",
          value: "王伟光"
        }, {
          text: "吴奇峰",
          value: "吴奇峰"
        }, {
          text: "肖梦雨",
          value: "肖梦雨"
        },
        {
          text: "余晓宁",
          value: "余晓宁"
        }, {
          text: "智新凯",
          value: "智新凯"
        }, {
          text: "邹国兵",
          value: "邹国兵"
        },
        {
          text: "陈卓敏",
          value: "陈卓敏"
        }, {
          text: "段德红",
          value: "段德红"
        }, {
          text: "苏航",
          value: "苏航"
        },
        {
          text: "林伟贤",
          value: "林伟贤"
        }, {
          text: "卓权财",
          value: "卓权财"
        }, {
          text: "黄慧龙",
          value: "黄慧龙"
        },
        {
          text: "金星",
          value: "金星"
        }, {
          text: "郭晓",
          value: "郭晓"
        }, {
          text: "解鹏程",
          value: "解鹏程"
        },
        {
          text: "李世雄",
          value: "李世雄"
        }, {
          text: "梁淑婷",
          value: "梁淑婷"
        }, {
          text: "莫瑞麟",
          value: "莫瑞麟"
        },
        {
          text: "孙菥瑶",
          value: "孙菥瑶"
        }, {
          text: "谭冬梅",
          value: "谭冬梅"
        }, {
          text: "杨翠",
          value: "杨翠"
        }, {
          text: "吕海熊",
          value: "吕海熊"
        },
        {
          text: "孔令超",
          value: "孔令超"
        },
        {
          text: "刘书廷",
          value: "刘书廷"
        },
        {
          text: "张玉新",
          value: "张玉新"
        },
      ],
      confirmLoading: false
    }
  },
  created() {
    // this.showInfo();
    let that = this;
    // 备份model原始值
    that.modelDefault = JSON.parse(JSON.stringify(that.model));
    // 必须通过这种方式回调才能正确渲染回显
    that.$nextTick(function () {
      that.model.empNumber = that.getEmpNumber();
    });
    this.getUserFieldList();
    this.getSuperFieldList();
    this.getStatisticalFieldList();
  },
  computed: {
    importExcelUrl: function () {
      return `${window._CONFIG['domianURL']}/${this.url.importExcelUrl}`;
    },
  },
  methods: {
    ...mapGetters(["nickname"]),
    initDictConfig() {
    },
    getYear() {
      const newDate = new Date();
      return String(newDate.getFullYear());
    },
    getMonth() {
      const newDate = new Date();
      return newDate.getMonth() + 1;
    },
    getEmpNumber() {
      // undefined
      // console.log("this.model inside getEmpNumber: ", this.model);
      var value = this.model.name;
      if (value != undefined) {
        switch (value) {
          case "常银桥":
            return 30107738;
          case "张春雷":
            return 30104179;

          case "江志炜":
            return 30101824;

          case "王桂锋":
            return 30101800;

          case "杨俊":
            return 30107827;

          case "杨忠良":
            return 30103570;

          case "陈明泽":
            return 30107673;

          case "王一平":
            return 30108093;

          case "陈斯玉":
            return 30107312;

          case "陈素微":
            return 30101683;

          case "陈燕凤":
            return 30103368;

          case "陈正峰":
            return 30101684;

          case "丁新":
            return 30107316;

          case "黄燕冰":
            return 30101685;

          case "赖智超":
            return 30103118;

          case "蓝昭伟":
            return 30101682;

          case "李江杰":
            return 30101680;

          case "李韶东":
            return 30103250;

          case "李鑫然":
            return 30107628;

          case "刘勇":
            return 30107290;

          case "吕佳炎":
            return 30108002;

          case "师美玲":
            return 30107941;

          case "宋英杰":
            return 30107818;

          case "孙岩":
            return 30104159;

          case "唐洋":
            return 30107606;

          case "汪齐家":
            return 30107319;

          case "王东":
            return 30107736;

          case "王明亮":
            return 30104263;

          case "王伟光":
            return 30107744;

          case "吴奇峰":
            return 30101742;

          case "肖梦雨":
            return 30107853;

          case "余晓宁":
            return 30102759;

          case "智新凯":
            return 30107749;

          case "邹国兵":
            return 30103969;

          case "陈卓敏":
            return 30101692;

          case "段德红":
            return 30103425;

          case "苏航":
            return 30107428;

          case "林伟贤":
            return 30102786;

          case "卓权财":
            return 30101693;

          case "黄慧龙":
            return 30107940;

          case "金星":
            return 30101670;

          case "郭晓":
            return 30100363;

          case "解鹏程":
            return 30107295;

          case "李世雄":
            return 30104284;

          case "梁淑婷":
            return 30102664;

          case "莫瑞麟":
            return 30107570;

          case "孙菥瑶":
            return 30104374;

          case "谭冬梅":
            return 30107647;

          case "杨翠":
            return 30103764;

          case "吕海熊":
            return 30103807;
          case "金波":
            return 30108085;

          case "孔令超":
            return 30108016;

          case "张玉新":
            return 30108047;

          case "刘书廷":
            return 30108077;

          default:
            return "";
        }
      }
    },
    selectName(value) {
      console.log("this.model.empNumber inside selectName:", this.model.empNumber);
      if (value != undefined) {
        console.log("this.model.empNumber: ", this.model.empNumber);
        switch (value) {
          case "常银桥":
            this.model.empNumber = 30107738;
            break;
          case "张春雷":
            this.model.empNumber = 30104179;
            break;
          case "江志炜":
            this.model.empNumber = 30101824;
            break;
          case "王桂锋":
            this.model.empNumber = 30101800;
            break;
          case "杨俊":
            this.model.empNumber = 30107827;
            break;
          case "杨忠良":
            this.model.empNumber = 30103570;
            break;
          case "陈明泽":
            this.model.empNumber = 30107673;
            break;
          case "王一平":
            this.model.empNumber = 30108093;
            break;
          case "陈斯玉":
            this.model.empNumber = 30107312;
            break;
          case "陈素微":
            this.model.empNumber = 30101683;
            break;
          case "陈燕凤":
            this.model.empNumber = 30103368;
            break;
          case "陈正峰":
            this.model.empNumber = 30101684;
            break;
          case "丁新":
            this.model.empNumber = 30107316;
            break;
          case "黄燕冰":
            this.model.empNumber = 30101685;
            break;
          case "赖智超":
            this.model.empNumber = 30103118;
            break;
          case "蓝昭伟":
            this.model.empNumber = 30101682;
            break;
          case "李江杰":
            this.model.empNumber = 30101680;
            break;
          case "李韶东":
            this.model.empNumber = 30103250;
            break;
          case "李鑫然":
            this.model.empNumber = 30107628;
            break;
          case "刘勇":
            this.model.empNumber = 30107290;
            break;
          case "吕佳炎":
            this.model.empNumber = 30108002;
            break;
          case "师美玲":
            this.model.empNumber = 30107941;
            break;
          case "宋英杰":
            this.model.empNumber = 30107818;
            break;
          case "孙岩":
            this.model.empNumber = 30104159;
            break;
          case "唐洋":
            this.model.empNumber = 30107606;
            break;
          case "汪齐家":
            this.model.empNumber = 30107319;
            break;
          case "王东":
            this.model.empNumber = 30107736;
            break;
          case "王明亮":
            this.model.empNumber = 30104263;
            break;
          case "王伟光":
            this.model.empNumber = 30107744;
            break;
          case "吴奇峰":
            this.model.empNumber = 30101742;
            break;
          case "肖梦雨":
            this.model.empNumber = 30107853;
            break;
          case "余晓宁":
            this.model.empNumber = 30102759;
            break;
          case "智新凯":
            this.model.empNumber = 30107749;
            break;
          case "邹国兵":
            this.model.empNumber = 30103969;
            break;
          case "陈卓敏":
            this.model.empNumber = 30101692;
            break;
          case "段德红":
            this.model.empNumber = 30103425;
            break;
          case "苏航":
            this.model.empNumber = 30107428;
            break;
          case "林伟贤":
            this.model.empNumber = 30102786;
            break;
          case "卓权财":
            this.model.empNumber = 30101693;
            break;
          case "黄慧龙":
            this.model.empNumber = 30107940;
            break;
          case "金星":
            this.model.empNumber = 30101670;
            break;
          case "郭晓":
            this.model.empNumber = 30100363;
            break;
          case "解鹏程":
            this.model.empNumber = 30107295;
            break;
          case "李世雄":
            this.model.empNumber = 30104284;
            break;
          case "梁淑婷":
            this.model.empNumber = 30102664;
            break;
          case "莫瑞麟":
            this.model.empNumber = 30107570;
            break;
          case "孙菥瑶":
            this.model.empNumber = 30104374;
            break;
          case "谭冬梅":
            this.model.empNumber = 30107647;
            break;
          case "杨翠":
            this.model.empNumber = 30103764;
            break;
          case "吕海熊":
            this.model.empNumber = 30103807;
            break;
          case "金波":
            this.model.empNumber = 30108085;
            break;
          case "孔令超":
            this.model.empNumber = 30108016;
            break;
          case "张玉新":
            this.model.empNumber = 30108047;
            break;
          case "刘书廷":
            this.model.empNumber = 30108077;
            break;
          default:
            this.model.empNumber = "";
            break;
        }
      }
    },
    search(month) {
      let that = this;
      that.confirmLoading = true;
      let httpurl = '';
      let param = new FormData();
      param.append('month', month);
      httpurl += that.url.queryFillingStatus;
      postAction(httpurl, param).then((res) => {
        if (res.success) {
          if (res.message == "") {
            this.$notification['warning']({
              message: '北区开发机用户全都填写了该月月报',
              description: res.message,
            });
          } else {
            this.$notification['warning']({
              message: '北区开发机用户没填该月月报的人有：',
              description: res.message,
            });
          }
        } else {
          // that.$message.warning("获取项目填报情况失败");
          this.$notification['warning']({
            message: '提示信息：',
            description: '获取项目填报情况失败',
          });
        }
      }).finally(() => {
        that.confirmLoading = false;
      })
    },
    searchRemaining(month) {
      let that = this;
      that.confirmLoading = true;
      let httpurl = '';
      let param = new FormData();
      param.append('month', month);
      httpurl += that.url.queryRemainingFillingStatus;
      postAction(httpurl, param).then((res) => {
        if (res.success) {
          if (res.message == "") {
            this.$notification['warning']({
              message: '非北区开发机用户全都填写了该月月报',
              description: res.message,
            });
          } else {
            this.$notification['warning']({
              message: '非北区开发机用户没填该月月报的人有：',
              description: res.message,
            });
          }
        } else {
          // that.$message.warning("获取项目填报情况失败");
          this.$notification['warning']({
            message: '提示信息：',
            description: '获取项目填报情况失败',
          });
        }
      }).finally(() => {
        that.confirmLoading = false;
      })
    },
    handleAdd() {
      // console.log("this.model clicking handleAdd: ", this.model);
      this.$refs.modalForm.disableSubmit = false;
      this.$refs.modalForm.add({ disableSubmit2: this.$refs.modalForm.disableSubmit });
      this.$refs.modalForm.add(this.model.year);
      this.$refs.modalForm.add(this.model.month);
      this.$refs.modalForm.add(this.model.name);
      this.$refs.modalForm.add(this.model.empNumber);
      // console.log("this.$refs.modalForm: ", this.$refs.modalForm);
      this.$refs.modalForm.title = "添加月报信息";
    },
    handleEditUser: function (record) {
      this.disabled = false;
    },
    // showInfo() {
    //   var tableBody = document.getElementById("tBody");
    //   var tdstr = '';
    //   tdstr += '<td>' + this.getYear() + '</td>';
    //   tdstr += '<td>' + this.getMonth() + '</td>';
    //   tdstr += '<td>' + this.nickname() + '</td>';
    //   tdstr += '<td>' + this.getEmpNumber() + '</td>';
    //   tableBody.innerHTML = tdstr;
    // },
    getUserFieldList() {
      let fieldList = [];
      fieldList.push({ type: 'string', value: 'year', text: '月报所属年份', dictCode: '' })
      fieldList.push({ type: 'string', value: 'month', text: '月报所属月份', dictCode: '' })
      fieldList.push({ type: 'string', value: 'empNumber', text: '工号', dictCode: '' })
      fieldList.push({ type: 'string', value: 'name', text: '姓名', dictCode: '' })
      this.userFieldList = fieldList
    },
    getSuperFieldList() {
      let fieldList = [];
      fieldList.push({ type: 'string', value: 'year', text: '月报所属年份', dictCode: '' })
      fieldList.push({ type: 'string', value: 'month', text: '月报所属月份', dictCode: '' })
      fieldList.push({ type: 'string', value: 'empNumber', text: '工号', dictCode: '' })
      fieldList.push({ type: 'string', value: 'name', text: '姓名', dictCode: '' })
      fieldList.push({ type: 'string', value: 'role', text: '角色', dictCode: '' })
      fieldList.push({ type: 'string', value: 'projNo', text: '项目编号', dictCode: '' })
      fieldList.push({ type: 'string', value: 'projName', text: '项目名称', dictCode: '' })
      fieldList.push({ type: 'Text', value: 'overview', text: '承担内容概述', dictCode: '' })
      fieldList.push({ type: 'string', value: 'projSource', text: '项目来源', dictCode: '' })
      fieldList.push({ type: 'date', value: 'startTime', text: '任务周期开始时间' })
      fieldList.push({ type: 'date', value: 'endTime', text: '任务周期结束时间' })
      fieldList.push({ type: 'string', value: 'curStatus', text: '当前状态', dictCode: '' })
      fieldList.push({ type: 'double', value: 'occupiedTime', text: '自评占时', dictCode: '' })
      this.superFieldList = fieldList
    },
    getStatisticalFieldList() {
      let fieldList = [];
      fieldList.push({ type: 'string', value: 'north', text: '北区开发机用户月报统计', dictCode: '' })
      fieldList.push({ type: 'string', value: 'non-north', text: '非北区开发机用户月报统计', dictCode: '' })
      this.statisticalFieldList = fieldList
    },
    handleView(props) {
      // 参数介绍：
      // props.value          当前单元格的值
      // props.row            当前行的数据
      // props.rowId          当前行 ID
      // props.rowIndex       当前行下标
      // props.column         当前列的配置 
      // props.columnIndex    当前列下标   
      // props.$table         vxe 实例，可以调用 vxe 内置方法
      // props.target         JVXE实例，可以调用 JVXE内置方法 
      // props.caseId         JVXE实例唯一ID
      // props.scrolling      是否正在滚动     
      // props.triggerChange  触发 change 事件，用于更改 slot 的值
      // props.     
      console.log("props: ", props);
    },
    handleStatisticalQuery(arg) {
      if (!arg) {
        this.statisticalQueryParams = ''
        this.statisticalQueryFlag = false
      } else if (arg.length > 0) {
        // this.statisticalQueryParams = JSON.stringify(arg)       
        let val = arg[0].val, month = arg[0].month;
        switch (val) {
          case 'north':
            this.search(month);
            break;
          case 'non-north':
            this.searchRemaining(month);
            break;
        }
      }
      // this.loadData()
    },
    // 并没有从数据库删除，只是在前端删除了，一刷新数据还在
    // handleDelete(props) {
    //   // 使用实例：删除当前操作的行
    //   props.target.removeRows(props.row);
    // }
  }
}
</script>
<style scoped>
@import "~@assets/less/common.less";
#table {
  width: auto;
  margin: auto;
  border: 1px solid rgb(22, 129, 36);
  text-align: center;
}
#table th {
  text-align: center; /*设置表头文本居中*/
  vertical-align: middle; /*设置表头文本垂直居中*/
  background-color: #eee; /*设置表头背景颜色*/
}
#table th:first-child {
  border-right: 1px solid #ccc; /* 设置第一列表头右边框 */
}
#table td:first-child {
  border-right: 1px solid #ccc; /* 设置第一列单元格右边框 */
}
</style>
