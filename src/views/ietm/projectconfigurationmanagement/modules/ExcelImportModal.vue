<template>
  <a-modal
    :title="title"
    :width="1000"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-spin :spinning="confirmLoading">
      <a-form :form="form">
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
              <div>1. 请按照Excel模板格式准备数据</div>
              <div>2. 必填字段：父节点编码、编码、标题</div>
              <div>3. 父节点编码为"ROOT"表示根节点下的直接子节点</div>
              <div>4. 导入会覆盖现有构型数据（保留根节点）</div>
              <div>5. <a @click="downloadTemplate">点击下载Excel模板</a></div>
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
          </a-form-item>
        </div>

        <!-- 步骤2: 数据校验 -->
        <div v-show="currentStep === 1">
          <a-alert
            v-if="validationResult"
            :message="validationResult.invalidCount > 0 ? '发现 ' + validationResult.invalidCount + ' 条错误数据' : '数据校验通过'"
            :type="validationResult.invalidCount > 0 ? 'warning' : 'success'"
            showIcon
            style="margin-bottom: 16px;"
          >
            <template slot="description">
              <div>总共：{{ validationResult.totalCount }} 条</div>
              <div>有效：{{ validationResult.validCount }} 条</div>
              <div>无效：{{ validationResult.invalidCount }} 条</div>
            </template>
          </a-alert>

          <a-table
            :columns="columns"
            :dataSource="excelData"
            :pagination="{ pageSize: 10 }"
            :rowKey="(record, index) => index"
            :scroll="{ x: 1200 }"
            size="small"
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
            status="warning"
            title="请确认导入操作"
          >
            <template #subTitle>
              <div>即将导入 <strong>{{ validCount }}</strong> 条构型数据</div>
              <div style="color: red; margin-top: 8px;">
                ⚠️ 此操作将覆盖现有构型数据（保留根节点），不可恢复！
              </div>
            </template>
          </a-result>
        </div>
      </a-form>
    </a-spin>

    <template slot="footer">
      <a-button v-if="currentStep > 0" @click="handlePrev">上一步</a-button>
      <a-button @click="handleCancel">取消</a-button>
      <a-button
        v-if="currentStep < 2"
        type="primary"
        :loading="confirmLoading"
        :disabled="!canNext"
        @click="handleNext"
      >
        下一步
      </a-button>
      <a-button
        v-if="currentStep === 2"
        type="primary"
        :loading="confirmLoading"
        @click="handleImport"
      >
        确认导入
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
    }
  },
  data() {
    return {
      title: '从Excel导入',
      visible: false,
      confirmLoading: false,
      form: this.$form.createForm(this),
      currentStep: 0,
      fileList: [],
      excelData: [],
      validationResult: null,
      validCount: 0,
      columns: [
        {
          title: '行号',
          dataIndex: 'rowNum',
          width: 70,
          fixed: 'left'
        },
        {
          title: '父节点编码',
          dataIndex: 'parentCode',
          width: 120
        },
        {
          title: '编码',
          dataIndex: 'code',
          width: 100
        },
        {
          title: '标题',
          dataIndex: 'title',
          width: 200
        },
        {
          title: '序号',
          dataIndex: 'seq',
          width: 80
        },
        {
          title: '密级',
          dataIndex: 'securityLevel',
          width: 100
        },
        {
          title: '校验结果',
          dataIndex: 'valid',
          width: 100,
          scopedSlots: { customRender: 'valid' }
        },
        {
          title: '错误信息',
          dataIndex: 'errorMsg',
          width: 300,
          scopedSlots: { customRender: 'errorMsg' }
        }
      ]
    }
  },
  computed: {
    canNext() {
      if (this.currentStep === 0) {
        return this.fileList.length > 0
      }
      if (this.currentStep === 1) {
        return this.validationResult && this.validationResult.validCount > 0
      }
      return true
    }
  },
  methods: {
    show() {
      this.visible = true
      this.resetForm()
    },
    close() {
      this.visible = false
      this.resetForm()
    },
    resetForm() {
      this.currentStep = 0
      this.fileList = []
      this.excelData = []
      this.validationResult = null
      this.validCount = 0
      this.confirmLoading = false
    },
    handleCancel() {
      this.close()
    },
    handleOk() {
      // 由footer按钮控制
    },
    handlePrev() {
      this.currentStep--
    },
    async handleNext() {
      if (this.currentStep === 0) {
        // 步骤1 -> 步骤2: 解析Excel并校验
        await this.parseExcelAndValidate()
      } else if (this.currentStep === 1) {
        // 步骤2 -> 步骤3: 进入确认页
        this.currentStep++
      }
    },
    handleRemove(file) {
      const index = this.fileList.indexOf(file)
      const newFileList = this.fileList.slice()
      newFileList.splice(index, 1)
      this.fileList = newFileList
    },
    beforeUpload(file) {
      // 检查文件类型
      const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx')
      if (!isExcel) {
        this.$message.error('只能上传Excel文件（.xls/.xlsx）！')
        return false
      }

      // 检查文件大小（限制5MB）
      const isLt5M = file.size / 1024 / 1024 < 5
      if (!isLt5M) {
        this.$message.error('文件大小不能超过5MB！')
        return false
      }

      // 只保留最新的文件
      this.fileList = [file]
      return false // 阻止自动上传
    },
    async parseExcelAndValidate() {
      if (this.fileList.length === 0) {
        this.$message.error('请先选择Excel文件！')
        return
      }

      this.confirmLoading = true

      try {
        const file = this.fileList[0]

        // 读取Excel文件
        const data = await this.readExcelFile(file)
        console.log('解析到的Excel数据：', data)

        if (!data || data.length === 0) {
          this.$message.error('Excel文件无数据！')
          this.confirmLoading = false
          return
        }

        // 转换为DTO格式
        const dtoList = data.map((row, index) => ({
          rowNum: index + 2, // Excel第2行开始（第1行是标题）
          parentCode: row['父节点编码'] || row['parentCode'] || '',
          code: row['编码'] || row['code'] || '',
          title: row['标题'] || row['title'] || '',
          seq: row['序号'] || row['seq'] || null,
          securityLevel: row['密级'] || row['securityLevel'] || null,
          valid: true,
          errorMsg: ''
        }))

        console.log('转换后的DTO列表：', dtoList)

        // 调用后端校验接口
        const url = `/projectconfigurationmanagement/ietmProjectConfigurationManagement/validateExcelData?projectId=${this.projectId}`
        const res = await postAction(url, dtoList)

        console.log('校验结果：', res)

        if (res.success) {
          this.excelData = res.result.dataList
          this.validationResult = {
            totalCount: res.result.totalCount,
            validCount: res.result.validCount,
            invalidCount: res.result.invalidCount
          }
          this.validCount = res.result.validCount

          this.currentStep = 1
          this.$message.success(res.message || '数据校验完成')
        } else {
          this.$message.error(res.message || '数据校验失败')
        }
      } catch (error) {
        console.error('解析或校验失败：', error)
        this.$message.error('解析或校验失败：' + error.message)
      } finally {
        this.confirmLoading = false
      }
    },
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

            // 转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet)
            resolve(jsonData)
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsArrayBuffer(file)
      })
    },
    async handleImport() {
      this.confirmLoading = true

      try {
        // 过滤出校验通过的数据
        const validData = this.excelData.filter(d => d.valid)

        if (validData.length === 0) {
          this.$message.error('没有有效数据可以导入！')
          this.confirmLoading = false
          return
        }

        // 调用后端导入接口
        const url = `/projectconfigurationmanagement/ietmProjectConfigurationManagement/importExcelData?projectId=${this.projectId}`
        const res = await postAction(url, validData)

        if (res.success) {
          this.$message.success(res.message || '导入成功')
          this.$emit('ok')
          this.close()
        } else {
          this.$message.error(res.message || '导入失败')
        }
      } catch (error) {
        console.error('导入失败：', error)
        this.$message.error('导入失败：' + error.message)
      } finally {
        this.confirmLoading = false
      }
    },
    downloadTemplate() {
      // 创建模板数据
      const templateData = [
        {
          '父节点编码': 'ROOT',
          '编码': 'A',
          '标题': '总则',
          '序号': 1,
          '密级': '公开'
        },
        {
          '父节点编码': 'ROOT',
          '编码': 'B',
          '标题': '系统描述',
          '序号': 2,
          '密级': '公开'
        },
        {
          '父节点编码': 'A',
          '编码': '01',
          '标题': '通用信息',
          '序号': 1,
          '密级': '公开'
        },
        {
          '父节点编码': 'A',
          '编码': '02',
          '标题': '适用性',
          '序号': 2,
          '密级': '公开'
        }
      ]

      // 创建工作簿
      const worksheet = XLSX.utils.json_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '构型数据')

      // 下载
      XLSX.writeFile(workbook, '项目构型导入模板.xlsx')
    }
  }
}
</script>

<style scoped>
</style>
