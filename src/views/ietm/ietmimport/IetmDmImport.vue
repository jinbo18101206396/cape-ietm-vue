<template>
  <div class="ietm-dm-import-container">
    <!-- DDN基本信息 -->
    <a-card title="来源数据交换凭证DDN" :bordered="false" class="form-card" size="small">
      <a-form-model
        ref="ddnForm"
        :model="ddnInfo"
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
              v-model="ddnInfo.modelic"
              placeholder=""
              size="small"
              :max-length="50"
              style="width: 100%"
              disabled
            />
          </a-form-model-item>

          <a-form-model-item
            label="密级"
            prop="security"
            :rules="[{ required: true, message: '请选择密级' }]"
            class="form-item-quarter"
          >
            <a-input
              :value="getSecurityText(ddnInfo.security)"
              placeholder="从DM文件提取"
              size="small"
              style="width: 100%"
              disabled
            />
          </a-form-model-item>

          <a-form-model-item
            label="商业密级"
            prop="commercialSecurity"
            class="form-item-quarter"
          >
            <a-select v-model="ddnInfo.commercialSecurity" placeholder="请选择" size="small" allow-clear style="width: 100%" disabled>
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
            <a-select v-model="ddnInfo.caveat" placeholder="请选择" size="small" allow-clear style="width: 100%" disabled>
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
              v-model="ddnInfo.sender"
              placeholder=""
              size="small"
              :max-length="50"
              style="width: 100%"
              disabled
            />
          </a-form-model-item>

          <a-form-model-item
            label="接收单位"
            prop="receiver"
            class="form-item-quarter"
          >
            <a-input
              v-model="ddnInfo.receiver"
              placeholder="默认00000"
              size="small"
              :max-length="50"
              style="width: 100%"
              disabled
            />
          </a-form-model-item>

          <a-form-model-item
            label="发布日期"
            prop="issueDate"
            :rules="[{ required: true, message: '请选择日期' }]"
            class="form-item-quarter"
          >
            <a-date-picker
              v-model="ddnInfo.issueDate"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              size="small"
              style="width: 100%"
              @change="handleDateChange"
              disabled
            />
          </a-form-model-item>

          <a-form-model-item
            label="年份"
            prop="year"
            class="form-item-quarter"
          >
            <a-input
              v-model="ddnInfo.year"
              placeholder="从日期获取"
              size="small"
              disabled
              style="width: 100%"
            />
          </a-form-model-item>
        </div>
      </a-form-model>
    </a-card>

    <!-- 文件列表表格 -->
    <a-card :bordered="false" class="table-card" size="small" style="margin-top: 16px;">
      <!-- 自定义标题 -->
      <div slot="title" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <span>待导入文件列表</span>
        <span style="color: #f5222d; font-size: 13px; font-weight: 500; margin-left: 24px;">【说明：可以导入单一DM文件；或者导入包含多个DM及其ICN文件的ZIP压缩文件，最大1GB】</span>
      </div>

      <!-- 操作按钮区域 -->
      <div class="table-operator">
        <div class="toolbar-left">
          <a-space>
            <!-- P1-1修复：添加文件选择器（符合需求文档§2.2.2） -->
            <input
              ref="fileInput"
              type="file"
              accept=".xml,.zip"
              multiple
              style="display: none"
              @change="handleFileInputChange"
            />
            <a-button type="primary" icon="folder-open" @click="$refs.fileInput.click()">上传文件</a-button>
            <a-button type="primary" icon="check-circle" @click="handleValidate" :disabled="fileList.length === 0">校验</a-button>
            <a-button type="primary" icon="import" @click="handleImport" :disabled="!canImport">导入</a-button>
            <a-button icon="delete" @click="handleDeleteSelected" :disabled="selectedRowKeys.length === 0">删除</a-button>
            <a-button icon="delete" @click="handleClear" :disabled="fileList.length === 0">清空列表</a-button>
          </a-space>
        </div>
      </div>

      <!-- 文件列表表格 -->
      <div>
        <a-table
          ref="table"
          size="middle"
          :scroll="{x:true}"
          bordered
          rowKey="uid"
          :columns="fileListColumns"
          :dataSource="fileList"
          :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
          :pagination="paginationConfig"
          :loading="loading"
          class="j-table-force-nowrap"
          :locale="{ emptyText: '暂无文件，请点击选择文件按钮添加' }">
          <span slot="serial" slot-scope="text, record, index">
            {{ (paginationConfig.current - 1) * paginationConfig.pageSize + index + 1 }}
          </span>
          <span slot="validing" slot-scope="text, record">
            <a-tag v-if="!record.validated" color="default">未校验</a-tag>
            <a-tag v-else-if="record.validateSuccess" color="green">
              {{ record.validateMessage }}
            </a-tag>
            <a-tag v-else color="red">
              {{ record.validateMessage }}
            </a-tag>
          </span>
          <span slot="importing" slot-scope="text, record">
            <span v-if="record.importResult" :style="{color: getImportingColor(record.importResult)}">
              {{ record.importResult }}
            </span>
            <span v-else style="color: #999;">-</span>
          </span>
        </a-table>
      </div>
    </a-card>

    <!-- 上传文件对话框 -->
    <a-modal
      title="上传数据模块文件"
      :visible="uploadVisible"
      :confirmLoading="uploading"
      :maskClosable="false"
      @ok="handleUploadOk"
      @cancel="handleUploadCancel"
      width="600px">
      <a-upload-dragger
        :file-list="uploadFileList"
        :before-upload="beforeUpload"
        :remove="handleRemoveUpload"
        accept=".xml,.zip"
        :multiple="false">
        <p class="ant-upload-drag-icon">
          <a-icon type="inbox" />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">
          支持单个XML文件或ZIP压缩包（最大1GB）<br/>
          ZIP包可包含多个DM XML文件和ICN图片文件
        </p>
      </a-upload-dragger>
    </a-modal>

    <!-- 校验详情对话框 -->
    <a-modal
      title="校验详情"
      :visible="detailVisible"
      :footer="null"
      @cancel="detailVisible = false"
      width="800px">
      <div v-if="currentDetail">
        <a-descriptions bordered :column="2" size="small">
          <a-descriptions-item label="文件名" :span="2">
            {{ currentDetail.name }}
          </a-descriptions-item>
          <a-descriptions-item label="文件类型">
            <a-tag :color="getFileTypeColor(currentDetail.name)">
              {{ getFileType(currentDetail.name) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="文件大小">
            {{ formatFileSize(currentDetail.size) }}
          </a-descriptions-item>
          <a-descriptions-item label="校验状态" :span="2">
            <a-tag v-if="currentDetail.validateSuccess" color="green">
              <a-icon type="check-circle" /> 校验通过
            </a-tag>
            <a-tag v-else color="red">
              <a-icon type="close-circle" /> 校验失败
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="校验消息" :span="2">
            {{ currentDetail.validateMessage || '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- 校验详细结果 -->
        <div v-if="currentDetail.validateDetail && detailFilesList.length > 0" style="margin-top: 16px;">
          <a-divider>详细校验结果</a-divider>
          <a-table
            :columns="detailColumns"
            :dataSource="detailFilesList"
            :pagination="false"
            :scroll="{y: 300}"
            size="small"
            bordered
            rowKey="fileName">
            <span slot="fileType" slot-scope="text">
              <a-tag :color="text === 'DM' ? 'blue' : 'green'">{{ text }}</a-tag>
            </span>
            <span slot="canImport" slot-scope="text">
              <a-tag :color="text ? 'green' : 'red'">
                {{ text ? '可导入' : '不可导入' }}
              </a-tag>
            </span>
          </a-table>
        </div>
      </div>
    </a-modal>

    <!-- 导入结果对话框 -->
    <a-modal
      title="导入结果"
      :visible="importVisible"
      :footer="null"
      @cancel="handleImportResultClose"
      width="480px"
      :bodyStyle="{ padding: '20px 24px' }">
      <div v-if="importResult">
        <!-- 状态图标 -->
        <div style="text-align: center; margin-bottom: 16px;">
          <a-icon
            :type="importResult.failureCount === 0 ? 'check-circle' : 'exclamation-circle'"
            :style="{
              fontSize: '56px',
              color: importResult.failureCount === 0 ? '#52c41a' : '#faad14'
            }" />
        </div>

        <!-- 统计卡片 -->
        <div style="background: #fafafa; border-radius: 4px; padding: 12px 16px; margin-bottom: 16px;">
          <a-row :gutter="12">
            <a-col :span="8" style="text-align: center;">
              <div style="font-size: 22px; font-weight: 600; color: #52c41a; margin-bottom: 2px;">
                {{ importResult.dmSuccessCount }}
              </div>
              <div style="font-size: 12px; color: rgba(0,0,0,0.6);">DM成功</div>
            </a-col>
            <a-col :span="8" style="text-align: center;">
              <div style="font-size: 22px; font-weight: 600; color: #52c41a; margin-bottom: 2px;">
                {{ importResult.icnSuccessCount }}
              </div>
              <div style="font-size: 12px; color: rgba(0,0,0,0.6);">ICN成功</div>
            </a-col>
            <a-col :span="8" style="text-align: center;">
              <div style="font-size: 22px; font-weight: 600; color: #f5222d; margin-bottom: 2px;">
                {{ importResult.failureCount }}
              </div>
              <div style="font-size: 12px; color: rgba(0,0,0,0.6);">失败</div>
            </a-col>
          </a-row>
        </div>

        <!-- 错误列表 -->
        <div v-if="importResult.errors && importResult.errors.length > 0">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: rgba(0,0,0,0.85);">
            失败详情
          </div>
          <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ffe7ba; border-radius: 4px;">
            <div
              v-for="(error, index) in importResult.errors"
              :key="index"
              :style="{
                padding: '8px 10px',
                background: index % 2 === 0 ? '#fffbf0' : '#fff7e6',
                borderBottom: index < importResult.errors.length - 1 ? '1px solid #ffe7ba' : 'none',
                fontSize: '12px',
                lineHeight: '1.5',
                color: 'rgba(0,0,0,0.75)'
              }">
              <span style="color: #fa8c16; margin-right: 4px;">●</span>{{ formatErrorMessage(error) }}
            </div>
          </div>
        </div>

        <!-- 关闭按钮 -->
        <div style="text-align: center; margin-top: 16px;">
          <a-button type="primary" @click="handleImportResultClose" style="min-width: 100px;">
            确定
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { postAction, getAction } from '@/api/manage'
import { mapState } from 'vuex'

export default {
  name: 'IetmDmImport',
  data() {
    return {
      // 当前项目信息
      currentProjectId: '',
      currentProjectInfo: null,

      // DDN信息
      ddnInfo: {
        modelic: '', // 型号
        security: '', // P1-7修复：密级（动态加载默认值，不硬编码）
        commercialSecurity: '', // 商业密级
        caveat: '', // 警告
        sender: '', // 发送单位
        receiver: '00000', // 接收单位（默认00000）
        issueDate: null, // 发布日期
        year: '' // 年份（从日期自动获取）
      },

      // 商业密级和警告选项
      commercialSecurityOptions: [],
      caveatOptions: [],

      // 文件列表
      fileList: [],
      loading: false,
      selectedRowKeys: [], // 选中的文件行

      // 分页配置（对齐导出页面）
      paginationConfig: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showQuickJumper: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total) => `共 ${total} 条`,
        size: 'small'
      },

      fileListColumns: [
        {
          title: '序号',
          dataIndex: 'serial',
          key: 'serial',
          width: 55,
          align: 'center',
          scopedSlots: { customRender: 'serial' }
        },
        {
          title: '数据包名',
          dataIndex: 'packageName',
          key: 'packageName',
          width: 200,
          align: 'center',
          ellipsis: true,
          customRender: (text, record, index) => {
            // 如果是从ZIP解压的文件，显示ZIP文件名
            const packageName = (record.isFromZip && record.sourceZipFile)
              ? record.sourceZipFile.name
              : '-'

            // 计算合并单元格的行数
            let rowSpan = 0
            if (packageName !== '-') {
              // 向下查找相同数据包名的连续行
              let count = 1
              for (let i = index + 1; i < this.fileList.length; i++) {
                const nextRecord = this.fileList[i]
                const nextPackageName = (nextRecord.isFromZip && nextRecord.sourceZipFile)
                  ? nextRecord.sourceZipFile.name
                  : '-'
                if (nextPackageName === packageName) {
                  count++
                } else {
                  break
                }
              }

              // 向上查找，判断当前行是否是该组的第一行
              let isFirstRow = true
              if (index > 0) {
                const prevRecord = this.fileList[index - 1]
                const prevPackageName = (prevRecord.isFromZip && prevRecord.sourceZipFile)
                  ? prevRecord.sourceZipFile.name
                  : '-'
                if (prevPackageName === packageName) {
                  isFirstRow = false
                }
              }

              rowSpan = isFirstRow ? count : 0
            } else {
              // "-" 不合并
              rowSpan = 1
            }

            return {
              children: packageName,
              attrs: {
                rowSpan: rowSpan
              }
            }
          }
        },
        {
          title: '文件名',
          dataIndex: 'name',
          key: 'name',
          width: 360,
          align: 'center',
          ellipsis: true
        },
        {
          title: '校验情况',
          key: 'validing',
          width: 360,
          align: 'center',
          customRender: (text, record) => {
            // 根据validateSuccess和validateMessage显示
            if (!record.validated) {
              return '未校验'
            }
            return record.validateMessage || '未知'
          },
          scopedSlots: { customRender: 'validing' }
        },
        {
          title: '导入结果',
          key: 'importing',
          width: 360,
          align: 'center',
          customRender: (text, record) => {
            return record.importResult || ''
          },
          scopedSlots: { customRender: 'importing' }
        }
      ],

      // 上传对话框
      uploadVisible: false,
      uploading: false,
      uploadFileList: [],

      // 校验详情对话框
      detailVisible: false,
      currentDetail: null,
      detailColumns: [
        {
          title: '文件名',
          dataIndex: 'fileName',
          ellipsis: true
        },
        {
          title: '类型',
          dataIndex: 'fileType',
          width: 80,
          align: 'center',
          scopedSlots: { customRender: 'fileType' }
        },
        {
          title: 'DMC',
          dataIndex: 'dmcCode',
          width: 200,
          ellipsis: true
        },
        {
          title: '状态',
          dataIndex: 'canImport',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'canImport' }
        },
        {
          title: '消息',
          dataIndex: 'resultMessage',
          ellipsis: true
        }
      ],

      // 导入对话框
      importing: false,
      importVisible: false,
      importResult: null
    }
  },
  created() {
    // 只初始化项目ID，不自动填充DDN字段（DDN字段在点击"校验"按钮后才自动填充）
    const project = this.$store.state.project.currentProject
    if (project && project.projectId) {
      this.currentProjectId = project.projectId
      this.currentProjectInfo = project
    }
    this.loadDictOptions()
  },
  watch: {
    currentProject: {
      handler(newVal, oldVal) {
        if (newVal && newVal.projectId) {
          if (this.currentProjectId !== newVal.projectId) {
            this.currentProjectId = newVal.projectId
            this.currentProjectInfo = newVal
          }
        } else if (!newVal) {
          this.currentProjectId = ''
          this.currentProjectInfo = null
        }
      },
      deep: true,
      immediate: false
    },
    // 监听文件列表变化，自动更新分页总数
    fileList: {
      handler(newVal) {
        this.paginationConfig.total = newVal.length
      },
      immediate: true
    }
  },
  computed: {
    ...mapState({
      currentProject: state => state.project.currentProject
    }),

    // 是否可以导入（必须有校验通过的文件）
    canImport() {
      return this.fileList.length > 0 &&
             this.fileList.some(f => f.validated && f.validateSuccess)
    },

    // P1-10修复：校验详情对话框的文件列表
    detailFilesList() {
      if (!this.currentDetail || !this.currentDetail.validateDetail) {
        return []
      }
      const result = []
      for (const [fileName, vldJson] of Object.entries(this.currentDetail.validateDetail)) {
        try {
          const vldObj = JSON.parse(vldJson)
          const vldCode = parseInt(vldObj.vld)
          result.push({
            fileName: fileName,
            fileType: fileName.toLowerCase().endsWith('.xml') ? 'DM' : 'ICN',
            dmcCode: fileName.replace('.xml', '').replace('DMC-', ''),
            canImport: vldCode === 1 || vldCode > 0,
            resultMessage: this.formatValiding(vldCode)
          })
        } catch (e) {
          console.error('解析失败:', e)
        }
      }
      return result
    },

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
  methods: {
    // ICN文件名校验（轻量级API）
    // 【P2修复】通用文件名校验方法，消除代码重复
    validateFileByName(file, apiPath) {
      return new Promise((resolve, reject) => {
        const params = {
          fileName: file.name
        }

        getAction(apiPath, params).then(res => {
          if (res.success && res.result) {
            // 【P0修复】保存原有的tempFilePath，防止被覆盖
            // 问题：ZIP解压时已保存临时文件，但二次校验时validateResourceByName接口不返回tempFilePath，导致丢失
            const originalTempFilePath = file.tempFilePath
            const originalXmlContent = file.xmlContent

            file.validated = true
            const code = parseInt(res.result.resultCode)
            file.validateSuccess = (code === 1)
            file.validateMessage = res.result.resultMessage
            file.vldCode = code
            file.validateDetail = res.result

            // 【关键修复】如果原有tempFilePath存在，且新结果中没有，则保留原值
            if (originalTempFilePath && !res.result.tempFilePath) {
              file.tempFilePath = originalTempFilePath
            }
            if (originalXmlContent && !res.result.xmlContent) {
              file.xmlContent = originalXmlContent
            }

            resolve()
          } else {
            file.validated = true
            file.validateSuccess = false
            file.validateMessage = res.message || '校验失败'
            file.vldCode = -10
            file.validateDetail = null
            resolve()
          }
        }).catch(err => {
          file.validated = true
          file.validateSuccess = false
          file.validateMessage = err.message || '网络错误'
          file.vldCode = -10
          file.validateDetail = null
          resolve()
        })
      })
    },

    validateIcnByName(file) {
      return this.validateFileByName(file, '/ietm/ietmimport/validateIcnByName')
    },

    validateResourceByName(file) {
      return this.validateFileByName(file, '/ietm/ietmimport/validateResourceByName')
    },

    // 初始化当前项目
    initCurrentProject() {
      const project = this.$store.state.project.currentProject
      if (project && project.projectId) {
        this.currentProjectId = project.projectId
        this.currentProjectInfo = project
        // 从项目信息中获取DDN相关字段
        this.loadDdnFromProject(project)
      }
    },

    // 从项目信息加载DDN字段
    loadDdnFromProject(project) {
      if (project) {
        // 型号：从项目中获取
        this.ddnInfo.modelic = project.modelCode || project.projectName || ''
        // 发送单位：从项目配置中获取
        this.ddnInfo.sender = project.company || project.orgName || ''
        // 密级：从项目中获取，默认01
        this.ddnInfo.security = project.securityLevel || '01'
        // P1-6优化：日期和年份统一处理
        const today = this.$moment().format('YYYY-MM-DD')
        this.ddnInfo.issueDate = today
        this.ddnInfo.year = today.substring(0, 4) // 从日期提取年份，保持逻辑一致
      }
    },

    // 加载字典选项
    loadDictOptions() {
      // 加载商业密级选项（不设置默认值）
      getAction('/sys/dict/getDictItems/commercial_security').then(res => {
        if (res.success && res.result) {
          this.commercialSecurityOptions = res.result.map(item => ({
            value: item.value,
            label: item.text
          }))
        }
      }).catch(() => {
        // 失败时使用fallback选项
        this.commercialSecurityOptions = []
      })

      // 加载警告选项（不设置默认值）
      getAction('/sys/dict/getDictItems/caveat').then(res => {
        if (res.success && res.result) {
          this.caveatOptions = res.result.map(item => ({
            value: item.value,
            label: item.text
          }))
        }
      }).catch(() => {
        // 失败时使用fallback选项
        this.caveatOptions = []
      })
    },

    // 日期变化时自动更新年份
    handleDateChange(date, dateString) {
      if (dateString) {
        this.ddnInfo.year = dateString.substring(0, 4)
      } else {
        this.ddnInfo.year = ''
      }
    },

    // 打开上传对话框
    handleUpload() {
      if (!this.currentProjectId) {
        this.$message.warning('请先打开项目')
        return
      }
      // P0-5修复：检查项目参数（临时放宽校验，等待后端修复）
      if (!this.currentProjectInfo) {
        this.$message.warning('请先打开项目')
        return
      }
      // 临时方案：只警告，不阻断
      if (!this.currentProjectInfo.parameters) {
        console.warn('当前项目未配置项目参数，建议在【手册项目管理】中设置')
      }
      this.uploadVisible = true
      this.uploadFileList = []
    },

    // 文件上传前处理
    beforeUpload(file) {
      // 检查文件类型
      const isXml = file.name.toLowerCase().endsWith('.xml')
      const isZip = file.name.toLowerCase().endsWith('.zip')

      if (!isXml && !isZip) {
        this.$message.error('只能上传XML或ZIP文件')
        return false
      }

      // P1-4修复：文件大小限制（≤1GB）
      const isLt1G = file.size / 1024 / 1024 / 1024 <= 1
      if (!isLt1G) {
        this.$message.error('文件大小不能超过1GB')
        return false
      }

      // P1-9修复：文件重复检测（包含最后修改时间）
      const exists = this.fileList.find(f =>
        f.name === file.name &&
        f.size === file.size &&
        f.lastModified === file.lastModified
      )
      if (exists) {
        this.$message.warning('文件已存在，请勿重复上传')
        return false
      }

      this.uploadFileList = [file]
      return false // 阻止自动上传
    },

    // 移除上传文件
    handleRemoveUpload(file) {
      const index = this.uploadFileList.indexOf(file)
      if (index > -1) {
        this.uploadFileList.splice(index, 1)
      }
    },

    // 确认上传
    handleUploadOk() {
      if (this.uploadFileList.length === 0) {
        this.$message.warning('请选择要上传的文件')
        return
      }

      // 添加到文件列表
      const file = this.uploadFileList[0]
      file.uid = new Date().getTime() + '_' + Math.random()
      file.validated = false
      file.validateSuccess = false
      file.validateMessage = ''
      file.validateDetail = null

      this.fileList.push(file)
      this.$message.success('文件已添加到列表')

      // 关闭对话框
      this.uploadVisible = false
      this.uploadFileList = []
    },

    // 取消上传
    handleUploadCancel() {
      this.uploadVisible = false
      this.uploadFileList = []
    },

    // P1-1修复：处理文件选择器选择文件（直接添加到列表）
    async handleFileInputChange(event) {
      const files = event.target.files
      if (!files || files.length === 0) {
        return
      }

      if (!this.currentProjectId) {
        this.$message.warning('请先打开项目')
        event.target.value = '' // 重置input
        return
      }

      // P0-5修复：检查项目参数（临时放宽校验，等待后端修复）
      if (!this.currentProjectInfo) {
        this.$message.warning('请先打开项目')
        event.target.value = '' // 重置input
        return
      }
      // 临时方案：只警告，不阻断
      if (!this.currentProjectInfo.parameters) {
        console.warn('当前项目未配置项目参数，建议在【手册项目管理】中设置')
      }

      // 显示加载提示
      const hide = this.$message.loading('正在解压ZIP文件，请稍候...', 0)

      // 处理每个选中的文件
      let addedCount = 0
      let skippedCount = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 文件类型检查
        const isXml = file.name.toLowerCase().endsWith('.xml')
        const isZip = file.name.toLowerCase().endsWith('.zip')

        if (!isXml && !isZip) {
          this.$message.error(`文件 "${file.name}" 格式不支持，只能上传XML或ZIP文件`)
          skippedCount++
          continue
        }

        // 文件大小检查
        const isLt1G = file.size / 1024 / 1024 / 1024 <= 1
        if (!isLt1G) {
          this.$message.error(`文件 "${file.name}" 大小超过1GB`)
          skippedCount++
          continue
        }

        try {
          if (isZip) {
            // ZIP文件：前端解压，显示文件列表（不调用后端校验）
            const innerFiles = await this.extractZipFile(file)

            // 将ZIP内部的每个文件作为独立条目添加到列表
            for (const innerFile of innerFiles) {
              // 文件重复检查（基于文件名）
              const exists = this.fileList.find(f => f.name === innerFile.name)
              if (exists) {
                console.warn(`文件 "${innerFile.name}" 已存在，跳过`)
                skippedCount++
                continue
              }

              this.fileList.push(innerFile)
              addedCount++
            }
          } else {
            // XML文件：读取内容后添加（用于DDN自动填充）
            // 文件重复检查
            const exists = this.fileList.find(f =>
              f.name === file.name &&
              f.size === file.size &&
              f.lastModified === file.lastModified
            )
            if (exists) {
              this.$message.warning(`文件 "${file.name}" 已存在，跳过`)
              skippedCount++
              continue
            }

            // 读取XML内容（用于后续的DDN自动填充）
            try {
              const xmlContent = await this.readFileAsText(file)

              // 添加到文件列表
              file.uid = new Date().getTime() + '_' + Math.random() + '_' + i
              file.validated = false
              file.validateSuccess = false
              file.validateMessage = ''
              file.validateDetail = null
              file.sourceFile = file // 保存原始文件对象
              file.xmlContent = xmlContent // 保存XML内容（用于DDN自动填充）

              this.fileList.push(file)
              addedCount++
            } catch (readErr) {
              console.error('读取XML文件失败:', readErr)
              this.$message.error(`读取文件 "${file.name}" 失败：${readErr.message || '未知错误'}`)
              skippedCount++
            }
          }
        } catch (err) {
          console.error('处理文件失败:', err)
          this.$message.error(`处理文件 "${file.name}" 失败：${err.message || '未知错误'}`)
          skippedCount++
        }
      }

      // 关闭加载提示
      hide()

      // 提示消息
      if (addedCount > 0) {
        this.$message.success(`已添加 ${addedCount} 个文件到列表`)
      }
      if (skippedCount > 0) {
        this.$message.warning(`跳过 ${skippedCount} 个文件`)
      }

      // 重置input，允许重复选择同一文件
      event.target.value = ''
    },

    // 解析ZIP文件，获取内部文件列表
    async extractZipFile(zipFile) {
      // 使用jszip在前端解压ZIP文件，获取文件列表（不调用后端校验）
      const JSZip = require('jszip')
      const zip = new JSZip()

      try {
        const zipData = await zip.loadAsync(zipFile)
        const innerFiles = []

        // 遍历ZIP内的所有文件
        for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
          // 跳过目录
          if (zipEntry.dir) {
            continue
          }

          // 获取文件名（去掉路径）
          const fileName = relativePath.split('/').pop()

          // 过滤DDN元数据文件（S1000D标准：DDN是数据交换凭证，不是数据模块）
          if (fileName.toUpperCase().startsWith('DDN-')) {
            console.debug(`跳过DDN元数据文件: ${fileName}`)
            continue
          }

          // 修复P0-1：判断文件类型（支持S1000D 4.0标准的三级目录结构 + 旧系统的扁平结构）
          const isXml = fileName.toLowerCase().endsWith('.xml')
          const hasImageExt = /\.(png|jpg|jpeg|gif|bmp|svg|tif|tiff|cgm)$/i.test(fileName)

          let fileType = 'UNKNOWN'

          // 优先识别S1000D 4.0标准目录结构（DM/、ICN/、MM/）
          if (relativePath.startsWith('DM/') || relativePath.startsWith('dm/')) {
            // DM/目录下的XML文件
            if (isXml) {
              fileType = 'DM'
            } else {
              console.warn(`DM/目录下发现非XML文件，跳过: ${relativePath}`)
              continue
            }
          } else if (relativePath.startsWith('ICN/') || relativePath.startsWith('icn/')) {
            // ICN/目录下的图片文件
            if (hasImageExt) {
              fileType = 'ICN'
            } else {
              console.warn(`ICN/目录下发现非图片文件，跳过: ${relativePath}`)
              continue
            }
          } else if (relativePath.startsWith('MM/') || relativePath.startsWith('mm/')) {
            // MM/目录下的资源文件
            fileType = 'RESOURCE'
          } else {
            // 向后兼容：根目录的文件（旧系统扁平结构）
            if (isXml) {
              fileType = 'DM'
            } else if (hasImageExt) {
              // 【关键修复】区分ICN和资源文件
              // ICN文件名格式：ICN-xxx-xxx-xxx.ext
              // 资源文件格式：DMC-xxx_xxx.ext 或其他不以ICN开头的图片
              const upperFileName = fileName.toUpperCase()
              if (upperFileName.startsWith('ICN-')) {
                fileType = 'ICN'
              } else {
                // 不以ICN开头的图片都视为资源文件
                fileType = 'RESOURCE'
                console.debug(`根目录图片识别为资源文件: ${fileName}`)
              }
            } else {
              console.warn(`根目录下发现不支持的文件类型，跳过: ${relativePath}`)
              continue
            }
          }

          // 读取文件内容（仅XML需要内容）
          let fileContent = null
          if (fileType === 'DM') {
            fileContent = await zipEntry.async('string')
          }

          // 创建虚拟文件对象
          const virtualFile = {
            name: fileName,
            uid: new Date().getTime() + '_' + Math.random() + '_' + fileName,
            size: zipEntry._data ? zipEntry._data.uncompressedSize : 0,
            type: fileType === 'DM' ? 'text/xml' : 'application/octet-stream',
            fileType: fileType, // 添加文件类型标识
            validated: false, // 未校验
            validateSuccess: false,
            validateMessage: '待校验',
            validateDetail: null,
            xmlContent: fileContent, // 保存XML内容
            sourceZipFile: zipFile, // 保存源ZIP文件引用
            isFromZip: true, // 标记为来自ZIP
            zipEntryPath: relativePath // 保存ZIP内的相对路径
          }

          innerFiles.push(virtualFile)
        }

        if (innerFiles.length === 0) {
          throw new Error('ZIP文件中没有有效的XML、ICN或资源文件')
        }

        console.info(`ZIP文件解析完成：共${innerFiles.length}个有效文件（DM:${innerFiles.filter(f => f.fileType === 'DM').length}, ICN:${innerFiles.filter(f => f.fileType === 'ICN').length}, 资源:${innerFiles.filter(f => f.fileType === 'RESOURCE').length}）`)

        return innerFiles
      } catch (error) {
        console.error('解压ZIP文件失败:', error)
        throw new Error('解压ZIP文件失败: ' + error.message)
      }
    },

    /**
     * 读取文件内容为文本（用于独立上传的XML文件）
     */
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = function(e) {
          resolve(e.target.result)
        }

        reader.onerror = function(e) {
          reject(new Error('文件读取失败'))
        }

        reader.readAsText(file, 'UTF-8')
      })
    },

    async parseZipFile(zipFile) {
      const formData = new FormData()
      formData.append('file', zipFile)

      const res = await postAction('/ietm/ietmimport/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (!res.success || !res.result) {
        throw new Error('解析ZIP文件失败')
      }

      // res.result是DmValidateResultVO，包含files数组
      const validateResult = res.result
      const innerFiles = []

      // 遍历校验结果中的文件列表
      if (validateResult.files && validateResult.files.length > 0) {
        for (const fileItem of validateResult.files) {
          // 将resultCode转换为数字
          const code = parseInt(fileItem.resultCode)

          // 创建虚拟文件对象
          const virtualFile = {
            name: fileItem.fileName,
            uid: new Date().getTime() + '_' + Math.random() + '_' + fileItem.fileName,
            size: 0, // ZIP内部文件大小未知
            type: fileItem.fileType === 'DM' ? 'text/xml' : 'application/octet-stream',
            validated: true, // 已经校验过了
            validateSuccess: code === 1,
            validateMessage: fileItem.resultMessage,
            validateDetail: fileItem,
            dmcCode: fileItem.dmcCode, // 保存DMC编码
            tempFilePath: fileItem.tempFilePath, // 保存临时文件路径
            xmlContent: fileItem.xmlContent, // 保存XML内容
            sourceZipFile: zipFile, // 保存源ZIP文件引用
            isFromZip: true // 标记为来自ZIP
          }

          innerFiles.push(virtualFile)
        }
      }

      if (innerFiles.length === 0) {
        throw new Error('ZIP文件中没有有效的文件')
      }

      return innerFiles
    },

    // 校验文件
    handleValidate() {
      if (!this.currentProjectId) {
        this.$message.warning('请先打开项目')
        return
      }

      if (this.fileList.length === 0) {
        this.$message.warning('请先上传文件')
        return
      }

      // 只校验未校验的文件
      const unvalidatedFiles = this.fileList.filter(f => !f.validated)
      if (unvalidatedFiles.length === 0) {
        this.$message.info('所有文件已校验')
        return
      }

      // P1-3修复：添加进度提示
      this.loading = true
      const hide = this.$message.loading('正在校验，请稍候...', 0)

      const promises = unvalidatedFiles.map(file => this.validateFile(file))

      Promise.all(promises).then(() => {
        this.loading = false
        hide() // 关闭loading提示

        const successCount = this.fileList.filter(f => f.validated && f.validateSuccess).length
        const failCount = this.fileList.filter(f => f.validated && !f.validateSuccess).length

        // 校验完成后，自动填充DDN信息
        this.autoFillDdnInfo()

        if (failCount === 0) {
          this.$message.success(`校验完成！全部通过（${successCount}个文件）`)
        } else {
          this.$message.warning(`校验完成！通过${successCount}个，失败${failCount}个`)
        }
      }).catch(err => {
        this.loading = false
        hide() // 关闭loading提示
        this.$message.error('校验失败：' + (err.message || '未知错误'))
      })
    },

    // 校验单个文件
    validateFile(file) {
      return new Promise((resolve, reject) => {
        // 准备要校验的文件
        let fileToValidate = null

        if (file.isFromZip) {
          // 从ZIP解压出来的虚拟文件，需要将XML内容转换为Blob
          if (file.xmlContent) {
            // XML文件：使用保存的内容
            const blob = new Blob([file.xmlContent], { type: 'text/xml' })
            fileToValidate = new File([blob], file.name, { type: 'text/xml' })
          } else if (file.fileType === 'ICN') {
            // ICN文件：调用轻量级API校验（只传文件名，不传二进制数据）
            this.validateIcnByName(file).then(() => {
              resolve()
            }).catch(() => {
              resolve()
            })
            return
          } else if (file.fileType === 'RESOURCE') {
            // 【关键修复】资源文件：调用后端校验，检查关联的DM是否存在
            this.validateResourceByName(file).then(() => {
              resolve()
            }).catch(() => {
              resolve()
            })
            return
          } else {
            // 其他情况：标记为待处理
            file.validated = true
            file.validateSuccess = false
            file.validateMessage = '未知文件类型'
            file.vldCode = -10
            resolve()
            return
          }
        } else {
          // 独立上传的文件
          fileToValidate = file.sourceFile || file
        }

        const formData = new FormData()
        formData.append('file', fileToValidate)

        // 使用新的API路径
        postAction('/ietm/ietmimport/validate', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => {
          if (res.success && res.result) {
            file.validated = true

            // res.result是DmValidateResultVO，包含files数组
            const validateResult = res.result

            // 查找当前文件的校验结果
            if (validateResult.files && validateResult.files.length > 0) {
              const fileItem = validateResult.files.find(f => f.fileName === file.name)

              if (fileItem) {
                const code = parseInt(fileItem.resultCode)
                file.validateSuccess = code === 1
                file.validateMessage = fileItem.resultMessage
                file.vldCode = code
                file.dmcCode = fileItem.dmcCode
                file.tempFilePath = fileItem.tempFilePath
                file.xmlContent = fileItem.xmlContent || file.xmlContent
                file.validateDetail = fileItem
              } else {
                file.validateSuccess = false
                file.validateMessage = '校验失败：未找到结果'
                file.vldCode = -10
                file.validateDetail = null
              }
            } else {
              file.validateSuccess = false
              file.validateMessage = '校验失败：无有效结果'
              file.vldCode = -10
              file.validateDetail = null
            }
          } else {
            file.validated = true
            file.validateSuccess = false
            file.validateMessage = res.message || '校验失败'
            file.validateDetail = null
          }
          resolve()
        }).catch(err => {
          file.validated = true
          file.validateSuccess = false
          file.validateMessage = err.message || '网络错误'
          file.validateDetail = null
          resolve() // 不reject，继续校验其他文件
        })
      })
    },

    // 自动填充DDN信息（从校验成功的第一个DM文件中提取）
    autoFillDdnInfo() {
      // 查找第一个DM文件（只要是DM类型且有xmlContent即可，不要求校验成功）
      // 因为即使校验失败，XML结构可能是完整的，仍然可以提取DDN信息
      const firstValidDm = this.fileList.find(f =>
        f.validated &&
        f.validateDetail &&
        f.validateDetail.fileType === 'DM' &&
        f.xmlContent
      )

      if (!firstValidDm || !firstValidDm.xmlContent) {
        return
      }

      try {
        // 从XML内容中提取DDN信息
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(firstValidDm.xmlContent, 'text/xml')

        // 检查是否解析成功
        const parserError = xmlDoc.getElementsByTagName('parsererror')
        if (parserError.length > 0) {
          console.error('XML解析失败:', parserError[0].textContent)
          return
        }

        let filledCount = 0
        const filledFields = []

        // 1. 提取型号 (modelIdentCode)
        const dmCodeElem = xmlDoc.querySelector('dmCode, dmIdent dmCode')
        if (dmCodeElem) {
          const modelIdentCode = dmCodeElem.getAttribute('modelIdentCode')
          if (modelIdentCode && !this.ddnInfo.modelic) {
            this.$set(this.ddnInfo, 'modelic', modelIdentCode)
            filledCount++
            filledFields.push('型号')
          }
        }

        // 2. 提取安全相关属性
        const securityElem = xmlDoc.querySelector('security[securityClassification]')
        if (securityElem) {
          // 2.1 密级 (securityClassification)
          let securityClass = securityElem.getAttribute('securityClassification')

          // 确保密级是2位格式（如 "01"）
          if (securityClass && securityClass.length === 1) {
            securityClass = '0' + securityClass
          }
          if (securityClass && !this.ddnInfo.security) {
            this.$set(this.ddnInfo, 'security', securityClass)
            filledCount++
            filledFields.push('密级')
          }

          // 2.2 商业密级 (commercialSecurityClass)
          const commercialSecurity = securityElem.getAttribute('commercialSecurityClass') ||
                                     securityElem.getAttribute('commercialSecurityAttGroup')
          if (commercialSecurity && !this.ddnInfo.commercialSecurity) {
            this.$set(this.ddnInfo, 'commercialSecurity', commercialSecurity)
            filledCount++
            filledFields.push('商业密级')
          }

          // 2.3 警告 (caveat)
          const caveat = securityElem.getAttribute('caveat')
          if (caveat && !this.ddnInfo.caveat) {
            this.$set(this.ddnInfo, 'caveat', caveat)
            filledCount++
            filledFields.push('警告')
          }
        }

        // 3. 提取发布日期 (issueDate)
        const issueDateElem = xmlDoc.querySelector('issueDate[year][month][day]')
        if (issueDateElem && !this.ddnInfo.issueDate) {
          const year = issueDateElem.getAttribute('year')
          const month = issueDateElem.getAttribute('month')
          const day = issueDateElem.getAttribute('day')

          if (year && month && day) {
            // 格式化为YYYY-MM-DD
            const paddedMonth = month.padStart(2, '0')
            const paddedDay = day.padStart(2, '0')
            const issueDate = year + '-' + paddedMonth + '-' + paddedDay

            this.$set(this.ddnInfo, 'issueDate', issueDate)
            this.$set(this.ddnInfo, 'year', year)
            filledCount++
            filledFields.push('发布日期')
          }
        }

        // 4. 从项目信息填充导出单位
        // 这些是DDN特有的字段，DM XML中不包含，需要从项目信息获取
        if (this.currentProjectInfo && !this.ddnInfo.sender) {
          // 优先使用originator字段（与DDN导出页面保持一致）
          const sender = this.currentProjectInfo.originator ||
                        this.currentProjectInfo.company ||
                        this.currentProjectInfo.orgName || ''

          if (sender) {
            this.$set(this.ddnInfo, 'sender', sender)
            filledCount++
            filledFields.push('导出单位')
          }
        }

        // 强制更新视图（确保响应式更新）
        this.$forceUpdate()

        // 提示用户
        if (filledCount > 0) {
          this.$message.success('已从DM文件中自动填充：' + filledFields.join('、'))
        } else {
          this.$message.info('DM文件中未找到可填充的字段')
        }
      } catch (error) {
        console.error('提取DDN信息失败:', error)
        this.$message.error('提取DDN信息失败：' + error.message)
      }
    },

    // 导入文件
    handleImport() {
      if (!this.currentProjectId) {
        this.$message.warning('请先打开项目')
        return
      }

      if (!this.canImport) {
        this.$message.warning('没有可导入的文件，请先校验')
        return
      }

      // 只导入校验成功的文件
      const validFiles = this.fileList.filter(f => f.validated && f.validateSuccess)

      this.$confirm({
        title: '确认导入',
        content: `即将导入${validFiles.length}个文件，是否继续？`,
        onOk: () => {
          this.doImport(validFiles)
        }
      })
    },

    // 执行导入
    doImport(files) {
      // 验证DDN信息
      if (!this.ddnInfo.modelic) {
        this.$message.warning('请填写型号')
        return
      }
      if (!this.ddnInfo.security) {
        this.$message.warning('请选择密级')
        return
      }
      if (!this.ddnInfo.sender) {
        this.$message.warning('请填写发送单位')
        return
      }
      if (!this.ddnInfo.issueDate) {
        this.$message.warning('请选择日期')
        return
      }
      if (!this.ddnInfo.year) {
        this.$message.warning('请填写年份')
        return
      }

      this.importing = true

      // P1-3修复：添加导入进度提示
      const hide = this.$message.loading('正在导入，请稍候...', 0)

      // 将文件按来源分组：来自同一个ZIP的文件需要合并处理
      const zipFileMap = new Map() // sourceZipFile -> [虚拟文件列表]
      const standaloneXmlFiles = [] // 独立的XML文件

      files.forEach(file => {
        if (file.isFromZip && file.sourceZipFile) {
          // 来自ZIP的虚拟文件
          if (!zipFileMap.has(file.sourceZipFile)) {
            zipFileMap.set(file.sourceZipFile, [])
          }
          zipFileMap.get(file.sourceZipFile).push(file)
        } else {
          // 独立上传的XML文件
          standaloneXmlFiles.push(file)
        }
      })

      // 构建导入请求数据 - 使用新的API结构
      const importFiles = []

      // 处理来自ZIP的文件
      zipFileMap.forEach((virtualFiles, zipFile) => {
        virtualFiles.forEach(vf => {
          // 使用校验时返回的完整信息
          const fileType = (vf.validateDetail && vf.validateDetail.fileType)
            ? vf.validateDetail.fileType
            : (vf.name.toLowerCase().endsWith('.xml') ? 'DM' : 'ICN')

          const fileItem = {
            fileName: vf.name,
            fileType: fileType,
            resultCode: String(vf.vldCode || 1),
            resultMessage: vf.validateMessage || '',
            dmcCode: vf.dmcCode || '',
            tempFilePath: vf.tempFilePath || '',
            xmlContent: vf.xmlContent || ''
          }
          importFiles.push(fileItem)
        })
      })

      // 处理独立的XML文件
      standaloneXmlFiles.forEach(file => {
        const fileType = (file.validateDetail && file.validateDetail.fileType)
          ? file.validateDetail.fileType
          : 'DM'

        const fileItem = {
          fileName: file.name,
          fileType: fileType,
          resultCode: String(file.vldCode || 1),
          resultMessage: file.validateMessage || '',
          dmcCode: file.dmcCode || '',
          tempFilePath: file.tempFilePath || '',
          xmlContent: file.xmlContent || ''
        }
        importFiles.push(fileItem)
      })

      // 构建导入请求对象
      const importRequest = {
        files: importFiles,
        ddnInfo: {
          modelic: this.ddnInfo.modelic || '',
          security: this.ddnInfo.security || '',
          commercialSecurity: this.ddnInfo.commercialSecurity || '',
          caveat: this.ddnInfo.caveat || '',
          sender: this.ddnInfo.sender || '',
          receiver: this.ddnInfo.receiver || '00000',
          issueDate: this.ddnInfo.issueDate || '',
          year: parseInt(this.ddnInfo.year) || new Date().getFullYear()
        }
      }

      // 使用新的API路径，发送JSON格式数据
      postAction('/ietm/ietmimport/import', importRequest).then(res => {
        this.importing = false
        hide() // 关闭loading提示

        if (res.success && res.result) {
          // 新API返回DmImportResultVO，结构更简洁
          const result = res.result

          // 根据后端返回的错误消息，标记每个文件的导入结果
          const errorMessages = result.errors || []

          files.forEach(file => {
            // 检查该文件是否在错误列表中
            const fileError = errorMessages.find(err =>
              err.includes(file.name) || err.includes(file.dmcCode)
            )

            if (fileError) {
              // 从错误消息中提取精简的失败原因
              let reason = fileError
                .replace(/^导入DM失败：/, '')
                .replace(/^导入ICN失败：/, '')
                .replace(/^导入资源失败：/, '')

              // 只保留文件名后面的失败原因
              const fileNameIndex = reason.indexOf(file.name)
              if (fileNameIndex >= 0) {
                reason = reason.substring(fileNameIndex + file.name.length)
                reason = reason.replace(/^\s*-\s*/, '').trim()
              }

              // 进一步精简
              reason = reason
                .replace(/该DM已存在，不能导入.*$/, 'DM已存在')
                .replace(/ICN的SNS \[([^\]]+)\] 在项目构型中不存在.*$/, 'SNS [$1] 不存在')
                .replace(/。如需更新.*$/, '')

              this.$set(file, 'importResult', `失败：${reason}`)
            } else {
              this.$set(file, 'importResult', '导入成功')
            }
          })

          // 强制刷新表格
          this.$forceUpdate()

          // 设置导入结果对话框数据
          this.importResult = {
            failureCount: result.failureCount || 0,
            dmSuccessCount: result.dmSuccessCount || 0,
            icnSuccessCount: result.icnSuccessCount || 0,
            message: result.message || '导入完成',
            errors: result.errors || []
          }
          this.importVisible = true

          // 提示消息
          const totalSuccess = (result.dmSuccessCount || 0) + (result.icnSuccessCount || 0)
          const totalFail = result.failureCount || 0

          if (totalFail === 0) {
            this.$message.success(`导入完成！成功${totalSuccess}个文件`)
          } else {
            this.$message.warning(`导入完成！成功${totalSuccess}个，失败${totalFail}个`)
          }
        } else {
          this.$message.error(res.message || '导入失败')
        }
      }).catch(err => {
        this.importing = false
        hide() // 关闭loading提示
        this.$message.error('导入失败：' + (err.message || '网络错误'))
      })
    },

    // 清空列表
    handleClear() {
      this.$confirm({
        title: '确认清空',
        content: '确定要清空文件列表吗？',
        onOk: () => {
          // P1-5修复：清空所有相关状态
          this.fileList = []
          this.selectedRowKeys = []
          this.importResult = null
          this.importVisible = false
          this.detailVisible = false
          this.currentDetail = null
          // 重置分页
          this.paginationConfig.current = 1
          this.paginationConfig.total = 0
          this.$message.success('已清空')
        }
      })
    },

    // 选择行变化
    onSelectChange(selectedRowKeys) {
      this.selectedRowKeys = selectedRowKeys
    },

    // 删除选中的文件
    handleDeleteSelected() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请先选择要删除的文件')
        return
      }

      this.$confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${this.selectedRowKeys.length} 个文件吗？`,
        onOk: () => {
          // 过滤掉选中的文件
          this.fileList = this.fileList.filter(file => !this.selectedRowKeys.includes(file.uid))
          this.selectedRowKeys = []
          this.paginationConfig.total = this.fileList.length
          this.$message.success('删除成功')
        }
      })
    },

    // 分页切换处理
    handlePageChange(page, pageSize) {
      this.paginationConfig.current = page
      this.paginationConfig.pageSize = pageSize
    },

    // 每页条数切换处理
    handleSizeChange(current, size) {
      this.paginationConfig.current = 1 // 重置到第一页
      this.paginationConfig.pageSize = size
    },

    // 查看详情
    handleViewDetail(file) {
      this.currentDetail = file
      this.detailVisible = true
    },

    // 删除文件
    handleRemoveFile(file) {
      const index = this.fileList.indexOf(file)
      if (index > -1) {
        this.fileList.splice(index, 1)
        this.$message.success('已删除')
      }
    },

    // 关闭导入结果
    handleImportResultClose() {
      this.importVisible = false
      this.importResult = null
    },

    // P1-12修复：获取文件类型（支持ICN格式）
    getFileType(fileName) {
      const ext = fileName.toLowerCase().split('.').pop()
      const typeMap = {
        'xml': 'XML',
        'zip': 'ZIP',
        'cgm': 'CGM',
        'jpg': 'JPG',
        'jpeg': 'JPEG',
        'png': 'PNG',
        'gif': 'GIF',
        'tif': 'TIF',
        'tiff': 'TIFF',
        'bmp': 'BMP',
        'svg': 'SVG'
      }
      return typeMap[ext] || '其他'
    },

    // 获取文件类型颜色
    getFileTypeColor(fileName) {
      const ext = fileName.toLowerCase().split('.').pop()
      if (ext === 'xml') {
        return 'blue'
      } else if (ext === 'zip') {
        return 'orange'
      } else if (['cgm', 'jpg', 'jpeg', 'png', 'gif', 'tif', 'tiff', 'bmp', 'svg'].includes(ext)) {
        return 'green'
      }
      return 'default'
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
    },

    // 格式化校验情况（根据需求文档的formateresult函数）
    formatValiding(code) {
      const validingMap = {
        '-10': '未知原因导入失败',
        '-1': '已存在该DM，不能导入',
        '-2': '构型中不存在该DM的SNS，不能导入',
        '-3': 'DDN文件列表中的该文件不存在，不能导入',
        '-4': 'DM文件名编码与内容编码不一致，不能导入',
        '-5': 'DM文件不属于当前项目，不能导入',
        '-6': 'DM文件密级值不存在，不能导入',
        '-7': '文件密级大于项目密级，不能导入',
        '-99': '没有DM等任何文件，不能导入',
        '-11': 'ICN文件名不规范，不能导入',
        '-12': 'ICN的SNS在项目构型结构中不存在，不能导入',
        '-13': '该ICN已存在，不能导入'
      }

      if (code === 1 || code > 0) {
        return '可以导入'
      }
      return validingMap[String(code)] || '未校验'
    },

    // 获取校验情况颜色
    getValidingColor(code) {
      if (code === 1 || code > 0) {
        return 'green'
      } else if (code < 0) {
        return 'red'
      }
      return 'default'
    },

    // 获取导入结果颜色
    getImportingColor(result) {
      if (result && result.includes('成功')) {
        return '#52c41a'
      } else if (result && result.includes('失败')) {
        return '#f5222d'
      }
      return '#1890ff'
    },

    // 获取密级文本（将代码转换为中文显示）
    getSecurityText(code) {
      if (!code) return ''

      // 标准密级映射（根据国家保密标准）
      const securityMap = {
        '01': '公开',
        '02': '内部',
        '03': '秘密',
        '04': '机密',
        '05': '绝密'
      }

      return securityMap[code] || code
    },

    // 格式化错误消息（精简、清晰）
    formatErrorMessage(error) {
      if (!error) return ''

      // 提取文件名（去掉"导入DM失败："或"导入ICN失败："前缀）
      let message = error
        .replace(/^导入DM失败：/, '')
        .replace(/^导入ICN失败：/, '')
        .replace(/^导入资源失败：/, '')

      // 精简冗长的错误描述
      message = message
        .replace(/。如需更新，请先删除旧版本后再导入。$/, '') // 去掉操作提示
        .replace(/DMC编码：([^ ]+)/, 'DMC: $1') // 简化DMC显示
        .replace(/该DM已存在，不能导入/, 'DM已存在') // 精简提示
        .replace(/ICN的SNS \[([^\]]+)\] 在项目构型中不存在，无法自动关联构型节点/, 'SNS [$1] 不存在于项目构型')

      return message
    }
  }
}
</script>

<style scoped>
/* ========== 容器 ========== */
.ietm-dm-import-container {
  padding: 0;
}

/* ========== 表单卡片 ========== */
.form-card {
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  margin-bottom: 0;
}

.form-card >>> .ant-card-head {
  padding: 8px 16px;
  min-height: 40px;
  background: linear-gradient(to bottom, #fafafa, #f5f5f5);
  border-bottom: 1px solid #e8e8e8;
}

.form-card >>> .ant-card-head-title {
  padding: 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.form-card >>> .ant-card-body {
  padding: 16px;
}

/* ========== 紧凑表单布局 ========== */
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
.form-card >>> .ant-select-sm,
.form-card >>> .ant-input-number-sm {
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

.form-card >>> .ant-input-number {
  width: 100%;
}

.form-card >>> .ant-calendar-picker {
  width: 100%;
}

/* ========== 表格卡片 ========== */
.table-card {
  border-radius: 2px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.table-card >>> .ant-card-head {
  padding: 8px 16px;
  min-height: 40px;
  background: linear-gradient(to bottom, #fafafa, #f5f5f5);
  border-bottom: 1px solid #e8e8e8;
}

.table-card >>> .ant-card-head-title {
  padding: 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.table-card >>> .ant-card-body {
  padding: 16px;
}

/* ========== 工具栏 ========== */
.table-operator {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: inline-block;
}

.toolbar-right {
  display: inline-block;
}

/* ========== 表格样式 ========== */
.table-card >>> .ant-table-small {
  font-size: 13px;
}

.table-card >>> .ant-table-thead > tr > th {
  background: #fafafa;
  font-weight: 600;
  padding: 8px 8px;
}

.table-card >>> .ant-table-tbody > tr > td {
  padding: 8px 8px;
}

/* ========== 统计卡片 ========== */
.table-card >>> .ant-statistic-title {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 4px;
}

.table-card >>> .ant-statistic-content {
  font-size: 20px;
  line-height: 28px;
}
</style>
