<template>
  <a-modal
    title="选择出版模块（PM）"
    :visible="visible"
    :width="1200"
    :footer="null"
    :mask="false"
    :maskClosable="false"
    :destroyOnClose="true"
    wrapClassName="pm-ref-dialog"
    @cancel="handleClose"
  >
    <div class="pm-ref-body">
      <!-- 搜索栏 -->
      <div class="pm-ref-search">
        <a-input
          v-model="query.pmc"
          placeholder="PMC编号"
          size="small"
          allow-clear
          class="search-field"
          @pressEnter="searchData"
        />
        <a-input
          v-model="query.pmTitle"
          placeholder="PM标题"
          size="small"
          allow-clear
          class="search-field"
          @pressEnter="searchData"
        />
        <a-button type="primary" size="small" @click="searchData" icon="search">
          搜索
        </a-button>
        <a-button size="small" @click="handleReset">
          重置
        </a-button>
      </div>

      <!-- PM列表表格 -->
      <a-table
        ref="table"
        :columns="columns"
        :data-source="pmList"
        :loading="loading"
        :row-selection="rowSelection"
        :pagination="pagination"
        :row-key="record => record.id"
        :scroll="{ y: 400 }"
        size="small"
        bordered
        @change="handleTableChange"
        class="pm-ref-table"
      >
        <!-- PMC列 -->
        <span slot="pmc" slot-scope="text">
          <a-tag color="blue">{{ text }}</a-tag>
        </span>

        <!-- PM标题列 -->
        <span slot="pmTitle" slot-scope="text" :title="text">
          {{ text }}
        </span>

        <!-- 版本列 -->
        <span slot="issueInfo" slot-scope="text, record">
          {{ record.issueNumber }}-{{ record.inWork }}
        </span>

        <!-- 语言列 -->
        <span slot="language" slot-scope="text, record">
          {{ record.languageIsoCode }}-{{ record.countryIsoCode }}
        </span>

        <!-- 发布日期列 -->
        <span slot="issueDate" slot-scope="text, record">
          <template v-if="record.issueYear">
            {{ record.issueYear }}-{{ record.issueMonth }}-{{ record.issueDay }}
          </template>
          <template v-else>
            <span style="color: #bfbfbf;">-</span>
          </template>
        </span>
      </a-table>
    </div>

    <!-- 底部按钮 -->
    <div class="pm-ref-footer">
      <div class="footer-info">
        <template v-if="selectedPm">
          已选择：<a-tag color="blue">{{ selectedPm.pmc }}</a-tag>
          <span style="margin-left: 8px;">{{ selectedPm.pmTitle }}</span>
        </template>
        <template v-else>
          <span style="color: #bfbfbf;">请选择一个PM</span>
        </template>
      </div>
      <div class="footer-buttons">
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" @click="handleOk" :disabled="selectedPm === null">
          <a-icon type="check"/>
          确定
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

/**
 * PM引用选择对话框
 *
 * @description 从PM列表中选择一个PM，返回PMC及相关元数据
 * @author IETM Team
 * @date 2026-11-14
 */
export default {
  name: 'IetmPmRefDialog',

  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      // 搜索条件
      query: {
        pmc: '',
        pmTitle: ''
      },

      // PM列表数据
      pmList: [],

      // 加载状态
      loading: false,

      // 当前选中的PM
      selectedPm: null,

      // 分页配置
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        pageSizeOptions: ['10', '20', '50', '100']
      },

      // 表格列配置
      columns: [
        {
          title: 'PMC编号',
          dataIndex: 'pmc',
          width: '25%',
          ellipsis: true,
          scopedSlots: { customRender: 'pmc' }
        },
        {
          title: 'PM标题',
          dataIndex: 'pmTitle',
          width: '30%',
          ellipsis: true,
          scopedSlots: { customRender: 'pmTitle' }
        },
        {
          title: '版本',
          dataIndex: 'issueInfo',
          width: '12%',
          align: 'center',
          scopedSlots: { customRender: 'issueInfo' }
        },
        {
          title: '语言',
          dataIndex: 'language',
          width: '10%',
          align: 'center',
          scopedSlots: { customRender: 'language' }
        },
        {
          title: '发布日期',
          dataIndex: 'issueDate',
          width: '13%',
          align: 'center',
          scopedSlots: { customRender: 'issueDate' }
        },
        {
          title: '状态',
          dataIndex: 'status',
          width: '10%',
          align: 'center'
        }
      ],

      // 行选择配置
      rowSelection: {
        type: 'radio',
        selectedRowKeys: [],
        onChange: (selectedRowKeys, selectedRows) => {
          this.selectedPm = selectedRows[0] || null
        }
      }
    }
  },

  watch: {
    visible(val) {
      if (val) {
        // 对话框打开时加载数据
        this.loadPmList()
      } else {
        // 对话框关闭时重置状态
        this.reset()
      }
    }
  },

  methods: {
    /**
     * 加载PM列表
     */
    async loadPmList() {
      this.loading = true

      try {
        // 构建查询参数
        const params = {
          pageNo: this.pagination.current,
          pageSize: this.pagination.pageSize
        }

        // 添加搜索条件
        if (this.query.pmc) {
          params.pmc = this.query.pmc
        }
        if (this.query.pmTitle) {
          params.pmTitle = this.query.pmTitle
        }

        // 调用后端接口
        // 注意：实际接口路径需根据后端实现调整
        const res = await getAction('/ietm/pm/list', params)

        if (res.success) {
          this.pmList = res.result.records || []
          this.pagination.total = res.result.total || 0
        } else {
          this.$message.error('加载PM列表失败: ' + res.message)
          this.pmList = []
          this.pagination.total = 0
        }

      } catch (error) {
        console.error('加载PM列表失败:', error)

        // 【开发阶段】如果接口不存在，使用Mock数据
        if (error.message && error.message.includes('404')) {
          this.$message.warning('后端PM接口暂未实现，使用Mock数据演示')
          this.loadMockData()
        } else {
          this.$message.error('加载PM列表失败: ' + error.message)
          this.pmList = []
          this.pagination.total = 0
        }

      } finally {
        this.loading = false
      }
    },

    /**
     * 【开发阶段】加载Mock数据
     * 注意：生产环境需删除此函数
     */
    loadMockData() {
      this.pmList = [
        {
          id: '1',
          pmc: 'PMC-SAMPLE-AVICI-00001-01',
          pmTitle: '示例出版模块1',
          modelIdentCode: 'SAMPLE',
          pmIssuer: 'AVICI',
          pmNumber: '00001',
          pmVolume: '01',
          issueNumber: '000',
          inWork: '01',
          languageIsoCode: 'zh',
          countryIsoCode: 'CN',
          issueYear: '2019',
          issueMonth: '10',
          issueDay: '15',
          status: '有效'
        },
        {
          id: '2',
          pmc: 'PMC-SAMPLE-AVICI-00002-01',
          pmTitle: '示例出版模块2',
          modelIdentCode: 'SAMPLE',
          pmIssuer: 'AVICI',
          pmNumber: '00002',
          pmVolume: '01',
          issueNumber: '001',
          inWork: '02',
          languageIsoCode: 'zh',
          countryIsoCode: 'CN',
          issueYear: '2020',
          issueMonth: '03',
          issueDay: '20',
          status: '有效'
        }
      ]
      this.pagination.total = 2
    },

    /**
     * 搜索按钮处理
     */
    searchData() {
      this.pagination.current = 1
      this.loadPmList()
    },

    /**
     * 重置按钮处理
     */
    handleReset() {
      this.query.pmc = ''
      this.query.pmTitle = ''
      this.pagination.current = 1
      this.loadPmList()
    },

    /**
     * 表格分页、排序、筛选变化处理
     */
    handleTableChange(pagination) {
      this.pagination.current = pagination.current
      this.pagination.pageSize = pagination.pageSize
      this.loadPmList()
    },

    /**
     * 确定按钮处理
     */
    handleOk() {
      if (!this.selectedPm) {
        this.$message.warning('请选择一个PM')
        return
      }

      // 构建返回数据（与开发方案§4.4.3的PmRefData结构一致）
      const pmData = {
        pmc: this.selectedPm.pmc,
        modelIdentCode: this.selectedPm.modelIdentCode,
        pmIssuer: this.selectedPm.pmIssuer,
        pmNumber: this.selectedPm.pmNumber,
        pmVolume: this.selectedPm.pmVolume,
        issueNumber: this.selectedPm.issueNumber || '000',
        inWork: this.selectedPm.inWork || '01',
        languageIsoCode: this.selectedPm.languageIsoCode || 'zh',
        countryIsoCode: this.selectedPm.countryIsoCode || 'CN',
        pmTitle: this.selectedPm.pmTitle || '',
        issueYear: this.selectedPm.issueYear || '',
        issueMonth: this.selectedPm.issueMonth || '',
        issueDay: this.selectedPm.issueDay || ''
      }

      // 向父组件返回数据
      this.$emit('ok', pmData)
    },

    /**
     * 取消/关闭按钮处理
     */
    handleClose() {
      this.$emit('cancel')
    },

    /**
     * 重置对话框状态
     */
    reset() {
      this.selectedPm = null
      this.query.pmc = ''
      this.query.pmTitle = ''
      this.pagination.current = 1
      this.rowSelection.selectedRowKeys = []
    }
  }
}
</script>

<style lang="less" scoped>
.pm-ref-body {
  .pm-ref-search {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;

    .search-field {
      width: 200px;
    }
  }

  .pm-ref-table {
    /deep/ .ant-table-tbody > tr {
      cursor: pointer;

      &:hover {
        background-color: #e6f7ff;
      }

      &.ant-table-row-selected {
        background-color: #bae7ff;
      }
    }
  }
}

.pm-ref-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;

  .footer-info {
    flex: 1;
    font-size: 14px;
  }

  .footer-buttons {
    display: flex;
    gap: 8px;
  }
}
</style>
