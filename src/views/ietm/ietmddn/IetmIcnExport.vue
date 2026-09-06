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
        <a-table
          ref="icnTable"
          :columns="columns"
          :data-source="icnList"
          :row-key="record => record.id"
          :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
          :pagination="icnPaginationConfig"
          :loading="tableLoading"
          :scroll="{x:true}"
          bordered
          size="middle"
          class="j-table-force-nowrap"
        >
          <span slot="serial" slot-scope="text, record, index">
            {{ (icnPaginationConfig.current - 1) * icnPaginationConfig.pageSize + index + 1 }}
          </span>
          <span slot="icn" slot-scope="text, record">
            <a @click="handlePreviewIcn(record)">{{ text }}</a>
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

    <!-- ICN预览弹窗 -->
    <icn-viewer-modal ref="viewerModal" />
  </div>
</template>

<script>
import { getAction, postAction, downloadFile } from '@/api/manage'
import JDictSelectTag from '@/components/dict/JDictSelectTag'
import IcnSelectModal from './modules/IcnSelectModal'
import IcnViewerModal from '@/views/ietm/icnmanage/modules/IcnViewerModal'
import { mapState, mapActions } from 'vuex'

// 常量配置
// ICN列表最大数量限制：
// 1. 防止前端渲染性能问题（虽然已有分页，但大量数据仍会影响操作体验）
// 2. 限制DDN数据包大小，避免生成超大ZIP文件
// 3. 避免后端单次处理时间过长
// 4. 实际业务场景中，单次导出1000个ICN已能覆盖绝大多数需求
const MAX_ICN_COUNT = 1000
const SESSION_MAX_AGE = 60 * 60 * 1000 // 会话有效期：1小时

export default {
  name: 'IetmIcnExport',
  components: {
    JDictSelectTag,
    IcnSelectModal,
    IcnViewerModal
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
      // P1-1修复：添加分页配置（对齐DM列表）
      icnPaginationConfig: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: (total) => `共 ${total} 条`,
        size: 'small'
      },
      // 修复P0-3：7列完整字段（所有列居中对齐，字段名对齐后端）
      columns: [
        {
          title: '序号',
          dataIndex: 'serial',
          key: 'serial',
          width: 60,
          align: 'center',
          scopedSlots: { customRender: 'serial' }
        },
        {
          title: 'ICN',
          dataIndex: 'icn',
          key: 'icn',
          width: 200,
          align: 'center',
          scopedSlots: { customRender: 'icn' }
        },
        {
          title: '版本号',
          dataIndex: 'issueNo',
          key: 'issueNo',
          align: 'center'
        },
        {
          title: '密级',
          dataIndex: 'security',
          key: 'security',
          align: 'center',
          scopedSlots: { customRender: 'security' }
        },
        {
          title: '文件名称',
          dataIndex: 'fileName',
          key: 'fileName',
          align: 'center'
        },
        {
          title: '创建日期',
          dataIndex: 'createTime',
          key: 'createTime',
          align: 'center',
          scopedSlots: { customRender: 'createTime' }
        },
        {
          title: '创建人',
          dataIndex: 'createBy',
          key: 'createBy',
          align: 'center'
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
      immediate: true
      // 移除 deep: true，currentProject 是对象引用，无需深度监听
    },
    // P1-1修复：同步icnList变化到分页总数
    icnList: {
      handler(val) {
        this.icnPaginationConfig.total = val.length
      },
      immediate: true
    }
  },
  created() {
    // P2-1修复：从后端恢复项目状态，解决页面刷新后currentProject丢失问题
    const loading = this.$message.loading('正在加载项目信息...', 0)
    this.LoadCurrentProject()
      .catch(() => {
        this.$message.warning('请先打开项目后再使用导出功能')
      })
      .finally(() => {
        loading()
      })

    // 初始化发布日期
    const moment = this.$moment || require('moment')
    this.formData.issueDate = moment().format('YYYY-MM-DD')
    this.formData.year = moment().format('YYYY')

    this.loadDictOptions()
    this.restoreFromSession()
  },
  methods: {
    ...mapActions('project', ['LoadCurrentProject']),

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
        // 字典加载失败，使用回退选项
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
      // 检查数量限制（使用常量）
      if (this.icnList.length >= MAX_ICN_COUNT) {
        this.$message.error(`单次最多导出${MAX_ICN_COUNT}个ICN`)
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

    // 预览ICN（P1-3修复：增强异常处理）
    handlePreviewIcn(record) {
      if (!record || !record.id) {
        this.$message.warning('无法获取ICN信息')
        return
      }
      try {
        // 调用预览弹窗，传入ICN的ID
        this.$refs.viewerModal.show(record.id)
      } catch (error) {
        console.error('ICN预览失败:', error)
        this.$message.error('预览失败，请稍后重试')
      }
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

            // 修复404问题：使用downloadFile方法携带Token下载，而非window.location.href直接跳转
            // window.location.href会导致页面跳转到相对路径，引发404错误
            const fileName = res.result.fileName || `${res.result.ddnCode}.zip`
            downloadFile(res.result.downloadUrl, fileName)
              .then(() => {
                this.$message.success('下载成功')
                // 下载成功后保留列表数据，不自动清空
              })
              .catch(err => {
                this.$message.error('下载失败：' + (err.message || '未知错误'))
              })
          } else {
            this.$message.error(res.message || 'DDN生成失败')
          }
        })
        .catch(() => {
          hide()
          this.$message.error('生成DDN数据包失败')
        })
        .finally(() => {
          this.generating = false
        })
    },

    // 保存到sessionStorage（P1-2修复：按项目ID隔离，避免数据污染）
    saveToSession() {
      try {
        if (!this.currentProject || !this.currentProject.projectId) {
          return
        }
        const sessionKey = `ietm_icn_export_${this.currentProject.projectId}`
        const data = {
          projectId: this.currentProject.projectId,
          formData: this.formData,
          icnList: this.icnList,
          timestamp: Date.now()
        }
        sessionStorage.setItem(sessionKey, JSON.stringify(data))
      } catch (error) {
        console.warn('保存会话数据失败:', error)
        // sessionStorage写入失败（如配额超限），静默失败
      }
    },

    // 从sessionStorage恢复（P1-2修复：校验项目ID一致性）
    restoreFromSession() {
      try {
        if (!this.currentProject || !this.currentProject.projectId) {
          return
        }
        const sessionKey = `ietm_icn_export_${this.currentProject.projectId}`
        const stored = sessionStorage.getItem(sessionKey)
        if (stored) {
          const data = JSON.parse(stored)

          // 校验项目ID一致性
          if (data.projectId !== this.currentProject.projectId) {
            sessionStorage.removeItem(sessionKey)
            return
          }

          // 检查是否超过1小时（使用常量）
          if (Date.now() - data.timestamp < SESSION_MAX_AGE) {
            this.icnList = data.icnList || []
          } else {
            // 会话过期，清除数据
            sessionStorage.removeItem(sessionKey)
          }
        }
      } catch (error) {
        console.warn('恢复会话数据失败:', error)
        // 会话恢复失败，清除无效数据
        if (this.currentProject && this.currentProject.projectId) {
          const sessionKey = `ietm_icn_export_${this.currentProject.projectId}`
          sessionStorage.removeItem(sessionKey)
        }
      }
    },

    // 清空导出数据（P1-2修复：清除正确的sessionStorage键）
    clearExportData() {
      this.icnList = []
      this.selectedRowKeys = []
      if (this.currentProject && this.currentProject.projectId) {
        const sessionKey = `ietm_icn_export_${this.currentProject.projectId}`
        sessionStorage.removeItem(sessionKey)
      }
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
}
</style>
