<template>
  <div class="ietm-icn-export-container">
    <!-- 表单区域 -->
    <a-card title="DDN基本信息" :bordered="false" class="form-card" size="small">
      <a-form-model
        ref="ddnForm"
        :model="formData"
        class="compact-inline-form"
      >
        <!-- 第一行：型号、密级、商业密级、警告 -->
        <div class="form-row">
          <a-form-model-item
            label="型号"
            prop="modelic"
            :rules="[{ required: true, message: '型号不能为空' }]"
            class="form-item-quarter"
          >
            <a-input
              v-model="formData.modelic"
              placeholder="从项目获取"
              size="small"
              :max-length="50"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item
            label="密级"
            prop="security"
            :rules="[{ required: true, message: '请选择密级' }]"
            class="form-item-quarter"
          >
            <j-dict-select-tag
              type="list"
              v-model="formData.security"
              dictCode="security"
              placeholder="请选择"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item
            label="商业密级"
            prop="commercialSecurity"
            class="form-item-quarter"
          >
            <a-select v-model="formData.commercialSecurity" placeholder="请选择" size="small" allow-clear style="width: 100%">
              <a-select-option
                v-for="opt in (commercialSecurityOptions.length > 0 ? commercialSecurityOptions : fallbackCommercialOptions)"
                :key="opt.value"
                :value="opt.value">
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-model-item>

          <a-form-model-item
            label="警告"
            prop="caveat"
            class="form-item-quarter"
          >
            <a-select v-model="formData.caveat" placeholder="请选择" size="small" allow-clear style="width: 100%">
              <a-select-option
                v-for="opt in (caveatOptions.length > 0 ? caveatOptions : fallbackCaveatOptions)"
                :key="opt.value"
                :value="opt.value">
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-model-item>
        </div>

        <!-- 第二行：导出单位、接收单位、发布日期、年份 -->
        <div class="form-row">
          <a-form-model-item
            label="导出单位"
            prop="sender"
            :rules="[{ required: true, message: '请输入导出单位' }]"
            class="form-item-quarter"
          >
            <a-input
              v-model="formData.sender"
              placeholder="从项目获取"
              size="small"
              :max-length="50"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item
            label="接收单位"
            prop="receiver"
            class="form-item-quarter"
          >
            <a-input
              v-model="formData.receiver"
              placeholder="默认00000"
              size="small"
              :max-length="50"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item
            label="日期"
            prop="issueDate"
            :rules="[{ required: true, message: '请选择日期' }]"
            class="form-item-quarter"
          >
            <a-date-picker
              v-model="formData.issueDate"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              placeholder="请选择日期"
              size="small"
              style="width: 100%"
              @change="onDateChange"
            />
          </a-form-model-item>

          <a-form-model-item
            label="年份"
            prop="year"
            class="form-item-quarter"
          >
            <a-input v-model="formData.year" size="small" disabled style="width: 100%" />
          </a-form-model-item>
        </div>
      </a-form-model>
    </a-card>

    <!-- ICN列表区域（修复P0-3：7列完整字段） -->
    <a-card
      title="实体列表"
      :bordered="false"
      class="table-card"
    >
      <div class="table-operator">
        <div class="toolbar-left">
          <a-space :size="8">
            <a-button type="primary" icon="plus" @click="handleAddIcn">
              添加ICN
            </a-button>
            <a-button
              icon="delete"
              @click="handleDeleteIcn"
              :disabled="selectedRowKeys.length === 0"
            >
              删除
            </a-button>
          </a-space>
        </div>
        <div class="toolbar-right">
          <a-button
            type="primary"
            icon="cloud-download"
            @click="handleGenerateDdn"
            :loading="generating"
          >
            生成数据包
          </a-button>
        </div>
      </div>

      <!-- 表格内容 -->
      <div>
        <a-alert
          v-if="icnList.length === 0"
          message='暂无实体，请点击"添加"按钮选择'
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 16px;"
        />
        <a-table
          v-else
          ref="icnTable"
          :columns="columns"
          :data-source="icnList"
          :row-key="record => record.id"
          :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
          :pagination="false"
          :loading="tableLoading"
          bordered
          size="middle"
        >
          <span slot="serial" slot-scope="text, record, index">
            {{ index + 1 }}
          </span>
          <span slot="security" slot-scope="text">
            <a-tag :color="getSecurityColor(text)">
              {{ getSecurityText(text) }}
            </a-tag>
          </span>
          <span slot="createTime" slot-scope="text">
            {{ text ? text.substring(0, 10) : '-' }}
          </span>
        </a-table>
      </div>
    </a-card>

    <!-- ICN选择弹窗 -->
    <icn-select-modal
      ref="icnSelectModal"
      @ok="handleIcnSelect"
    />
  </div>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import JDictSelectTag from '@/components/dict/JDictSelectTag'
import IcnSelectModal from './modules/IcnSelectModal'
import { mapState } from 'vuex'

export default {
  name: 'IetmIcnExport',
  components: {
    JDictSelectTag,
    IcnSelectModal
  },
  data() {
    return {
      formData: {
        modelic: '',
        security: '',
        commercialSecurity: '',
        caveat: '',
        sender: '',
        receiver: '00000',
        issueDate: '',
        year: ''
      },
      icnList: [],
      selectedRowKeys: [],
      tableLoading: false,
      generating: false,
      // 修复P0-3：7列完整字段（所有列居中对齐，字段名对齐后端）
      columns: [
        {
          title: '序号',
          dataIndex: 'serial',
          key: 'serial',
          width: 55,
          align: 'center',
          scopedSlots: { customRender: 'serial' }
        },
        {
          title: 'ICN',
          dataIndex: 'icn',
          key: 'icn',
          width: 200,
          align: 'center',
          ellipsis: true
        },
        {
          title: '版本号',
          dataIndex: 'issueNo',
          key: 'issueNo',
          width: 100,
          align: 'center'
        },
        {
          title: '密级',
          dataIndex: 'security',
          key: 'security',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'security' }
        },
        {
          title: '文件名称',
          dataIndex: 'fileName',
          key: 'fileName',
          width: 180,
          align: 'center',
          ellipsis: true
        },
        {
          title: '创建日期',
          dataIndex: 'createTime',
          key: 'createTime',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'createTime' }
        },
        {
          title: '创建人',
          dataIndex: 'createBy',
          key: 'createBy',
          width: 120,
          align: 'center',
          ellipsis: true
        }
      ],
      commercialSecurityOptions: [],
      caveatOptions: []
    }
  },
  computed: {
    ...mapState({
      currentProject: state => state.project ? state.project.currentProject : null
    }),
    // 商业密级回退选项
    fallbackCommercialOptions() {
      return Array.from({ length: 49 }, (_, i) => ({
        value: `cc${i + 51}`,
        label: `cc${i + 51}`
      }))
    },
    // 警告回退选项
    fallbackCaveatOptions() {
      return Array.from({ length: 49 }, (_, i) => ({
        value: `cv${i + 51}`,
        label: `cv${i + 51}`
      }))
    }
  },
  watch: {
    currentProject: {
      handler(val) {
        if (val) {
          this.formData.modelic = val.equipmentCode || ''
          // 密级字段：保持原始类型（Integer），由字典组件自动匹配
          this.formData.security = val.security != null ? val.security : ''
          this.formData.sender = val.originator || ''
        }
      },
      immediate: true,
      deep: true
    }
  },
  created() {
    // 初始化发布日期
    const moment = this.$moment || require('moment')
    this.formData.issueDate = moment().format('YYYY-MM-DD')
    this.formData.year = moment().format('YYYY')

    this.loadDictOptions()
    this.restoreFromSession()
  },
  methods: {
    async loadDictOptions() {
      try {
        // 加载商业密级和警告选项
        const res = await getAction('/sys/dict/getDictItems/security')
        if (res.success && res.result) {
          const allOptions = res.result
          // 商业密级：51-99
          this.commercialSecurityOptions = allOptions
            .filter(item => {
              const code = parseInt(item.value)
              return code >= 51 && code <= 99
            })
            .map(item => ({ value: item.value, label: item.text }))

          // 警告：51-99
          this.caveatOptions = allOptions
            .filter(item => {
              const code = parseInt(item.value)
              return code >= 51 && code <= 99
            })
            .map(item => ({ value: item.value, label: item.text }))
        }
      } catch (error) {
        console.error('加载字典选项失败：', error)
      }
    },

    // 日期变化
    onDateChange(date, dateString) {
      if (dateString) {
        this.formData.year = dateString.substring(0, 4)
      } else {
        this.formData.year = ''
      }
    },

    // 表格选择变化
    onSelectChange(selectedRowKeys) {
      this.selectedRowKeys = selectedRowKeys
    },

    // 获取密级颜色（对齐ICN实体管理页面）
    getSecurityColor(security) {
      const colorMap = { 1: 'green', 2: 'blue', 3: 'orange', 4: 'red' }
      return colorMap[security] || 'default'
    },

    // 获取密级文本（对齐ICN实体管理页面）
    getSecurityText(security) {
      const textMap = { 1: '公开', 2: '内部', 3: '秘密', 4: '机密' }
      return textMap[security] || '未知'
    },

    // 添加ICN
    handleAddIcn() {
      if (!this.currentProject) {
        this.$message.warning('请先打开项目')
        return
      }
      // 修复：使用projectId而不是id（对齐DdnExport.vue的实现）
      this.$refs.icnSelectModal.show(this.currentProject.projectId)
    },

    // ICN选择回调
    handleIcnSelect(icn) {
      console.log('选择的ICN:', icn)

      // 检查数量限制
      if (this.icnList.length >= 1000) {
        this.$message.error('单次最多导出1000个ICN')
        return
      }

      // 检查ID是否重复
      const existsById = this.icnList.some(item => item.id === icn.id)
      if (existsById) {
        this.$message.warning('该ICN已在列表中')
        return
      }

      // 检查ICN编码是否重复
      const existsByCode = this.icnList.some(item => item.icn === icn.icn)
      if (existsByCode) {
        this.$message.warning(`ICN编码 ${icn.icn} 已在列表中`)
        return
      }

      // 添加到列表
      this.icnList.push(icn)
      this.$message.success('添加成功')

      // 保存会话存储
      this.saveToSession()
    },

    // 删除ICN（修复P1-4：统一术语）
    handleDeleteIcn() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请先选择要删除的ICN')
        return
      }
      this.$confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${this.selectedRowKeys.length} 个ICN吗？`,
        onOk: () => {
          this.icnList = this.icnList.filter(item => !this.selectedRowKeys.includes(item.id))
          this.selectedRowKeys = []
          this.saveToSession()
          this.$message.success('删除成功')
        }
      })
    },

    // 生成DDN（修复P1-1：强制表单校验）
    handleGenerateDdn() {
      // 强制触发表单校验
      this.$refs.ddnForm.validate(valid => {
        if (!valid) {
          this.$message.error('请填写完整的DDN信息')
          return
        }
        if (this.icnList.length === 0) {
          this.$message.error('请至少添加一个实体')
          return
        }

        // 修复P1-1：添加确认对话框
        this.$confirm({
          title: '确认生成',
          content: '确定要生成DDN数据包吗？',
          onOk: () => {
            this.doGenerateDdn()
          }
        })
      })
    },

    // 执行生成DDN
    doGenerateDdn() {
      this.generating = true
      // 修复P1-2：添加进度提示
      const hide = this.$message.loading('正在生成DDN数据包...', 0)

      const params = {
        icnIds: this.icnList.map(icn => icn.id),
        modelic: this.formData.modelic,
        security: this.formData.security,
        commercialSecurity: this.formData.commercialSecurity,
        caveat: this.formData.caveat,
        sender: this.formData.sender,
        receiver: this.formData.receiver || '00000',  // 确保默认值00000
        issueDate: this.formData.issueDate
      }

      postAction('/ietm/ddn/generateIcn', params)
        .then(res => {
          hide()
          if (res.success) {
            // 修复P1-5：显示DDN编码
            this.$message.success(`DDN数据包生成成功！编码：${res.result.ddnCode}`)

            // 修复P1-5：提示缺失文件（如果有）
            if (res.result.errorDmList && res.result.errorDmList.length > 0) {
              this.$warning({
                title: '部分ICN文件缺失',
                content: `以下 ${res.result.errorDmList.length} 个ICN无法导出：\n${res.result.errorDmList.slice(0, 5).join('\n')}${res.result.errorDmList.length > 5 ? '\n...' : ''}`,
                okText: '知道了'
              })
            }

            // 下载文件
            const downloadUrl = res.result.downloadUrl
            window.location.href = downloadUrl
            // 清空列表
            this.clearExportData()
          } else {
            this.$message.error(res.message || 'DDN生成失败')
          }
        })
        .catch(error => {
          hide()
          console.error('生成DDN失败：', error)
          this.$message.error('生成DDN数据包失败')
        })
        .finally(() => {
          this.generating = false
        })
    },

    // 保存到sessionStorage
    saveToSession() {
      const data = {
        formData: this.formData,
        icnList: this.icnList,
        timestamp: Date.now()
      }
      sessionStorage.setItem('ietm_icn_export', JSON.stringify(data))
    },

    // 从sessionStorage恢复
    restoreFromSession() {
      try {
        const stored = sessionStorage.getItem('ietm_icn_export')
        if (stored) {
          const data = JSON.parse(stored)
          // 检查是否超过1小时
          if (Date.now() - data.timestamp < 60 * 60 * 1000) {
            this.icnList = data.icnList || []
          }
        }
      } catch (error) {
        console.error('恢复会话数据失败：', error)
      }
    },

    // 清空导出数据
    clearExportData() {
      this.icnList = []
      this.selectedRowKeys = []
      sessionStorage.removeItem('ietm_icn_export')
    }
  }
}
</script>

<style scoped>
.ietm-icn-export-container {
  padding: 0;
  background-color: #f0f2f5;
  min-height: calc(100vh - 64px);
}

/* ========== 表单卡片 ========== */
.form-card {
  margin-bottom: 16px;
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.form-card >>> .ant-card-head {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  padding: 8px 16px;
  min-height: 40px;
}

.form-card >>> .ant-card-head-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
  padding: 4px 0;
}

.form-card >>> .ant-card-body {
  padding: 16px 24px;
}

/* 紧凑行内表单布局 */
.compact-inline-form {
  width: 100%;
}

.form-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-item-quarter {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  margin-bottom: 0 !important;
}

.form-item-quarter >>> .ant-form-item-label {
  flex: 0 0 90px;
  padding-right: 8px;
  line-height: 28px;
  text-align: right;
  white-space: nowrap;
}

.form-item-quarter >>> .ant-form-item-label > label {
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  font-size: 13px;
  height: 28px;
  display: inline-flex;
  align-items: center;
}

.form-item-quarter >>> .ant-form-item-label > label::after {
  content: '：';
  margin-left: 2px;
}

.form-item-quarter >>> .ant-form-item-control-wrapper {
  flex: 1;
  min-width: 0;
}

.form-item-quarter >>> .ant-form-item-control {
  line-height: 28px;
}

.form-card >>> .ant-input-sm,
.form-card >>> .ant-calendar-picker-input,
.form-card >>> .ant-select-sm {
  height: 28px;
  line-height: 28px;
  font-size: 13px;
}

.form-card >>> .ant-select-selection--single {
  height: 28px;
}

.form-card >>> .ant-select-selection__rendered {
  line-height: 26px;
}

/* ========== 表格卡片 ========== */
.table-card {
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* ========== 工具栏 ========== */
.table-operator {
  margin-bottom: 16px;
}

.toolbar-left {
  display: inline-block;
}

.toolbar-right {
  float: right;
  display: inline-block;
}
</style>
