<template>
  <a-modal
    title="从Excel导入构型数据"
    :width="1200"
    :visible="visible"
    :confirmLoading="confirmLoading"
    :maskClosable="false"
    @cancel="handleCancel"
  >
    <a-spin :spinning="confirmLoading">
      <!-- 步骤条 -->
      <a-steps :current="currentStep" style="margin-bottom: 24px;">
        <a-step title="选择文件" />
        <a-step title="数据校验" />
        <a-step title="确认导入" />
      </a-steps>

      <!-- 步骤1: 选择文件 -->
      <div v-show="currentStep === 0">
        <a-alert
          message="导入说明"
          type="info"
          showIcon
          style="margin-bottom: 16px;"
        >
          <template slot="description">
            <div>1. 支持 <strong>.xls</strong> 和 <strong>.xlsx</strong> 格式</div>
            <div>2. Excel采用二级表头，共14列（7级编码+7级技术名称）</div>
            <div>3. 第1行：区分码、系统码、子系统、子子系统、部件码、拆分码、拆分码变量</div>
            <div>4. 第2行：编码、名称（交替出现）</div>
            <div>5. 编码必须连续，不能跳级（如：有3级必须有1、2级）</div>
            <div>6. 增量导入：已存在的节点会自动跳过</div>
            <div>7. <a @click="downloadTemplate">点击下载Excel模板</a></div>
          </template>
        </a-alert>

        <a-form-item label="选择Excel文件">
          <a-upload
            :fileList="fileList"
            :remove="handleRemove"
            :beforeUpload="beforeUpload"
            accept=".xls,.xlsx"
          >
            <a-button>
              <a-icon type="upload" /> 选择文件
            </a-button>
          </a-upload>
          <div v-if="fileList.length > 0" style="margin-top: 8px; color: #666;">
            已选择: {{ fileList[0].name }}
          </div>
        </a-form-item>
      </div>

      <!-- 步骤2: 数据校验 -->
      <div v-show="currentStep === 1">
        <a-alert
          v-if="validationResult"
          :message="validationMessage"
          :type="validationResult.invalidCount > 0 ? 'warning' : 'success'"
          showIcon
          style="margin-bottom: 16px;"
        >
          <template slot="description">
            <div>总行数：{{ validationResult.totalCount }}</div>
            <div>有效：{{ validationResult.validCount }} 条</div>
            <div>无效：{{ validationResult.invalidCount }} 条</div>
          </template>
        </a-alert>

        <!-- 校验结果表格 -->
        <a-table
          :columns="validationColumns"
          :dataSource="excelData"
          :pagination="{ pageSize: 10 }"
          :rowKey="(record, index) => index"
          :scroll="{ x: 2210, y: 400 }"
          bordered
          size="small"
          class="validation-table"
        >
          <span slot="valid" slot-scope="text, record">
            <a-tag :color="record.valid ? 'green' : 'red'">
              {{ record.valid ? '通过' : '失败' }}
            </a-tag>
          </span>
          <span slot="errorMsg" slot-scope="text">
            <span style="color: red;">{{ text }}</span>
          </span>
        </a-table>
      </div>

      <!-- 步骤3: 确认导入 -->
      <div v-show="currentStep === 2">
        <a-result
          status="success"
          :title="importResultTitle"
        >
          <template slot="subTitle">
            <div v-if="importResult">
              <div>总行数: {{ importResult.totalCount }}</div>
              <div>成功导入: {{ importResult.successCount }} 条</div>
              <div>跳过（已存在）: {{ importResult.skipCount }} 条</div>
            </div>
          </template>
          <template slot="extra">
            <a-button type="primary" @click="handleComplete">
              完成
            </a-button>
          </template>
        </a-result>
      </div>
    </a-spin>

    <!-- 底部按钮 -->
    <template slot="footer">
      <a-button v-if="currentStep > 0 && currentStep < 2" @click="handlePrev">
        上一步
      </a-button>
      <a-button v-if="currentStep < 2" @click="handleCancel">
        取消
      </a-button>
      <a-button
        v-if="currentStep === 0"
        type="primary"
        :loading="confirmLoading"
        :disabled="fileList.length === 0"
        @click="handleNext"
      >
        下一步：数据校验
      </a-button>
      <a-button
        v-if="currentStep === 1"
        type="primary"
        :loading="confirmLoading"
        :disabled="!canImport"
        @click="handleImport"
      >
        下一步：确认导入
      </a-button>
    </template>
  </a-modal>
</template>

<script>
import * as XLSX from 'xlsx'
import { postAction } from '@/api/manage'

export default {
  name: 'ExcelImportModal',
  props: {
    projectId: {
      type: String,
      required: true
    },
    projectSecurity: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      visible: false,
      confirmLoading: false,
      currentStep: 0,

      // 文件相关
      fileList: [],

      // 校验结果
      excelData: [],
      validationResult: null,

      // 导入结果
      importResult: null,

      // 表格列定义（二级表头）
      validationColumns: [
        {
          title: '行号',
          dataIndex: 'rowNum',
          width: 60,
          align: 'center',
          fixed: 'left'
        },
        {
          title: '区分码',
          align: 'center',
          children: [
            {
              title: '编码',
              dataIndex: 'code1',
              width: 100,
              align: 'center'
            },
            {
              title: '名称',
              dataIndex: 'title1',
              width: 150,
              align: 'center'
            }
          ]
        },
        {
          title: '系统码',
          align: 'center',
          children: [
            {
              title: '编码',
              dataIndex: 'code2',
              width: 100,
              align: 'center'
            },
            {
              title: '名称',
              dataIndex: 'title2',
              width: 150,
              align: 'center'
            }
          ]
        },
        {
          title: '子系统',
          align: 'center',
          children: [
            {
              title: '编码',
              dataIndex: 'code3',
              width: 100,
              align: 'center'
            },
            {
              title: '名称',
              dataIndex: 'title3',
              width: 150,
              align: 'center'
            }
          ]
        },
        {
          title: '子子系统',
          align: 'center',
          children: [
            {
              title: '编码',
              dataIndex: 'code4',
              width: 100,
              align: 'center'
            },
            {
              title: '名称',
              dataIndex: 'title4',
              width: 150,
              align: 'center'
            }
          ]
        },
        {
          title: '部件码',
          align: 'center',
          children: [
            {
              title: '编码',
              dataIndex: 'code5',
              width: 100,
              align: 'center'
            },
            {
              title: '名称',
              dataIndex: 'title5',
              width: 150,
              align: 'center'
            }
          ]
        },
        {
          title: '拆分码',
          align: 'center',
          children: [
            {
              title: '编码',
              dataIndex: 'code6',
              width: 100,
              align: 'center'
            },
            {
              title: '名称',
              dataIndex: 'title6',
              width: 150,
              align: 'center'
            }
          ]
        },
        {
          title: '拆分码变量',
          align: 'center',
          children: [
            {
              title: '编码',
              dataIndex: 'code7',
              width: 100,
              align: 'center'
            },
            {
              title: '名称',
              dataIndex: 'title7',
              width: 150,
              align: 'center'
            }
          ]
        },
        {
          title: '校验状态',
          dataIndex: 'valid',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'valid' }
        },
        {
          title: '错误信息',
          dataIndex: 'errorMsg',
          width: 300,
          align: 'center',
          scopedSlots: { customRender: 'errorMsg' }
        }
      ]
    }
  },
  computed: {
    canImport() {
      return this.validationResult && this.validationResult.validCount > 0
    },
    validationMessage() {
      if (!this.validationResult) return ''
      if (this.validationResult.invalidCount > 0) {
        return `发现 ${this.validationResult.invalidCount} 条错误数据`
      }
      return '数据校验通过，可以导入'
    },
    importResultTitle() {
      if (!this.importResult) return '导入完成'
      return `成功导入 ${this.importResult.successCount} 条数据`
    }
  },
  methods: {
    /**
     * 显示对话框
     */
    show() {
      this.visible = true
      this.reset()
    },

    /**
     * 重置状态
     */
    reset() {
      this.currentStep = 0
      this.fileList = []
      this.excelData = []
      this.validationResult = null
      this.importResult = null
      this.confirmLoading = false
    },

    /**
     * 关闭对话框
     */
    handleCancel() {
      this.visible = false
      this.reset()
    },

    /**
     * 完成导入
     */
    handleComplete() {
      this.$emit('ok')
      this.visible = false
      this.reset()
    },

    /**
     * 上一步
     */
    handlePrev() {
      this.currentStep--
    },

    /**
     * 下一步
     */
    async handleNext() {
      if (this.currentStep === 0) {
        await this.parseAndValidate()
      }
    },

    /**
     * 移除文件
     */
    handleRemove(file) {
      this.fileList = []
    },

    /**
     * 文件上传前校验
     */
    beforeUpload(file) {
      const fileName = file.name.toLowerCase()
      const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx')

      if (!isExcel) {
        this.$message.error('仅支持.xls和.xlsx格式的Excel文件！')
        return false
      }

      // 文件大小限制（10MB）
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        this.$message.error('文件大小不能超过10MB！')
        return false
      }

      this.fileList = [file]
      return false // 阻止自动上传
    },

    /**
     * 解析Excel并校验
     */
    async parseAndValidate() {
      if (this.fileList.length === 0) {
        this.$message.error('请先选择Excel文件！')
        return
      }

      this.confirmLoading = true

      try {
        const file = this.fileList[0]

        // 1. 读取Excel文件
        const rawData = await this.readExcelFile(file)
        console.log('解析到的原始数据：', rawData)

        if (!rawData || rawData.length === 0) {
          this.$message.error('Excel文件无数据！')
          return
        }

        // 2. 转换为DTO格式（14列）
        const dtoList = this.convertToDTO(rawData)
        console.log('转换后的DTO：', dtoList)

        if (dtoList.length === 0) {
          this.$message.error('未解析到有效数据！')
          return
        }

        // 3. 调用后端校验接口
        const url = `/projectconfigurationmanagement/ietmProjectConfigurationManagement/validateExcelData?projectId=${this.projectId}`
        const res = await postAction(url, dtoList)

        console.log('校验结果：', res)

        if (res.success) {
          this.excelData = res.result.dataList || []
          this.validationResult = {
            totalCount: res.result.totalCount || 0,
            validCount: res.result.validCount || 0,
            invalidCount: res.result.invalidCount || 0
          }

          this.currentStep = 1
          this.$message.success(res.message || '数据校验完成')
        } else {
          this.$message.error(res.message || '数据校验失败')
        }
      } catch (error) {
        console.error('解析或校验失败：', error)
        this.$message.error('解析或校验失败：' + (error.message || '未知错误'))
      } finally {
        this.confirmLoading = false
      }
    },

    /**
     * 读取Excel文件
     */
    readExcelFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result)
            const workbook = XLSX.read(data, { type: 'array' })

            // 读取第一个sheet
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]

            // 转换为JSON（从第3行开始，前2行是表头）
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              range: 2, // 从第3行开始（0-based，所以是2）
              header: [
                'code1', 'title1',
                'code2', 'title2',
                'code3', 'title3',
                'code4', 'title4',
                'code5', 'title5',
                'code6', 'title6',
                'code7', 'title7'
              ],
              defval: '' // 空单元格默认值
            })

            resolve(jsonData)
          } catch (error) {
            reject(error)
          }
        }

        reader.onerror = (error) => reject(error)
        reader.readAsArrayBuffer(file)
      })
    },

    /**
     * 转换为DTO格式
     */
    convertToDTO(rawData) {
      return rawData.map((row, index) => {
        // 过滤空行（所有编码都为空）
        const hasData = row.code1 || row.code2 || row.code3 || row.code4 ||
                       row.code5 || row.code6 || row.code7

        if (!hasData) {
          return null
        }

        return {
          rowNum: index + 3, // Excel行号（前2行是表头，从第3行开始）
          code1: this.trimValue(row.code1),
          title1: this.trimValue(row.title1),
          code2: this.trimValue(row.code2),
          title2: this.trimValue(row.title2),
          code3: this.trimValue(row.code3),
          title3: this.trimValue(row.title3),
          code4: this.trimValue(row.code4),
          title4: this.trimValue(row.title4),
          code5: this.trimValue(row.code5),
          title5: this.trimValue(row.title5),
          code6: this.trimValue(row.code6),
          title6: this.trimValue(row.title6),
          code7: this.trimValue(row.code7),
          title7: this.trimValue(row.title7),
          valid: true,
          errorMsg: ''
        }
      }).filter(item => item !== null)
    },

    /**
     * 清理值
     */
    trimValue(val) {
      if (val === null || val === undefined) return ''
      return String(val).trim()
    },

    /**
     * 执行导入
     */
    async handleImport() {
      this.confirmLoading = true

      try {
        // 过滤出校验通过的数据
        const validData = this.excelData.filter(d => d.valid)

        if (validData.length === 0) {
          this.$message.error('没有有效数据可以导入！')
          return
        }

        // 调用后端导入接口（带上项目密级）
        const securityParam = this.projectSecurity != null ? `&security=${this.projectSecurity}` : ''
        const url = `/projectconfigurationmanagement/ietmProjectConfigurationManagement/importExcelData?projectId=${this.projectId}${securityParam}`
        const res = await postAction(url, validData)

        console.log('导入结果：', res)

        if (res.success) {
          // 处理导入结果
          const result = res.result || {}
          this.importResult = {
            totalCount: result.totalCount || validData.length,
            successCount: result.successCount || 0,
            skipCount: result.skipCount || 0
          }

          this.currentStep = 2
          this.$message.success(res.message || '导入成功')
        } else {
          this.$message.error(res.message || '导入失败')
        }
      } catch (error) {
        console.error('导入失败：', error)
        this.$message.error('导入失败：' + (error.message || '未知错误'))
      } finally {
        this.confirmLoading = false
      }
    },

    /**
     * 下载Excel模板
     */
    downloadTemplate() {
      try {
        // 创建工作簿
        const workbook = XLSX.utils.book_new()

        // 创建工作表（二级表头）
        const worksheet = XLSX.utils.aoa_to_sheet([
          // 第1行：一级表头（层级名称）
          [
            '区分码', '',
            '系统码', '',
            '子系统', '',
            '子子系统', '',
            '部件码', '',
            '拆分码', '',
            '拆分码变量', ''
          ],
          // 第2行：二级表头（编码、名称）
          [
            '编码', '名称',
            '编码', '名称',
            '编码', '名称',
            '编码', '名称',
            '编码', '名称',
            '编码', '名称',
            '编码', '名称'
          ],
          // 第3行开始：示例数据（必须包含完整的上级路径）
          ['AAA', '自行车', '', '', '', '', '', '', '', '', '', '', '', ''],
          ['AAA', '自行车', 'D00', '山地自行车', '', '', '', '', '', '', '', '', '', ''],
          ['AAA', '自行车', 'D00', '山地自行车', '1', '车架', '', '', '', '', '', '', '', ''],
          ['AAA', '自行车', 'D00', '山地自行车', '2', '前叉', '', '', '', '', '', '', '', '']
        ])

        // 合并单元格（一级表头跨2列）
        worksheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },  // 区分码
          { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } },  // 系统码
          { s: { r: 0, c: 4 }, e: { r: 0, c: 5 } },  // 子系统
          { s: { r: 0, c: 6 }, e: { r: 0, c: 7 } },  // 子子系统
          { s: { r: 0, c: 8 }, e: { r: 0, c: 9 } },  // 部件码
          { s: { r: 0, c: 10 }, e: { r: 0, c: 11 } }, // 拆分码
          { s: { r: 0, c: 12 }, e: { r: 0, c: 13 } }  // 拆分码变量
        ]

        // 设置列宽
        worksheet['!cols'] = [
          { wch: 12 }, { wch: 20 },
          { wch: 12 }, { wch: 20 },
          { wch: 12 }, { wch: 20 },
          { wch: 12 }, { wch: 20 },
          { wch: 12 }, { wch: 20 },
          { wch: 12 }, { wch: 20 },
          { wch: 12 }, { wch: 20 }
        ]

        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, '构型示例')

        // 下载文件
        XLSX.writeFile(workbook, '项目构型导入模板.xlsx')

        this.$message.success('模板下载成功')
      } catch (error) {
        console.error('下载模板失败：', error)
        this.$message.error('下载模板失败：' + error.message)
      }
    }
  }
}
</script>

<style scoped>
.ant-alert {
  margin-bottom: 16px;
}

/* 校验结果表格边框及表头样式 */
.validation-table >>> .ant-table-bordered .ant-table-thead > tr > th,
.validation-table >>> .ant-table-bordered .ant-table-tbody > tr > td {
  border: 1px solid #e8e8e8;
}

/* 一级表头（区分码/系统码等）背景色加深，与二级表头区分 */
.validation-table >>> .ant-table-thead > tr:first-child > th {
  background-color: #d6e4ff;
  font-weight: bold;
  text-align: center;
}

/* 二级表头（编码/名称）背景色 */
.validation-table >>> .ant-table-thead > tr:not(:first-child) > th {
  background-color: #f0f5ff;
  font-weight: bold;
  text-align: center;
}

/* 数据行居中 */
.validation-table >>> .ant-table-tbody > tr > td {
  text-align: center;
}

/* 行悬停高亮 */
.validation-table >>> .ant-table-tbody > tr:hover > td {
  background-color: #e6f7ff;
}
</style>
