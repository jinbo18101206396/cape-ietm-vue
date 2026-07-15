<template>
  <a-spin :spinning="confirmLoading">
    <j-form-container :disabled="formDisabled">
      <a-form-model ref="form" :model="model" :rules="validatorRules" slot="detail">
        <a-row>
          <a-col :span="24">
            <a-form-model-item label="手册标准" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="standard">
              <j-dict-select-tag type="list" v-model="model.standard" dictCode="standard_type" placeholder="请选择手册标准" @change="onStandardChange" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="编码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="infoCode">
              <a-input v-model="model.infoCode" placeholder="请输入编码"></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="数据模块类型名称" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="dmtypeId">
              <a-select
                v-if="!dmtypeLoading && dmtypeOptions.length > 0"
                v-model="model.dmtypeId"
                placeholder="请选择数据模块类型"
                allowClear
                @change="onDmtypeChange">
                <a-select-option
                  v-for="item in dmtypeOptions"
                  :key="item.id"
                  :value="item.id">
                  {{ item.dmtypeName }}
                </a-select-option>
              </a-select>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="描述" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="description">
              <a-textarea v-model="model.description" rows="4" placeholder="请输入描述" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="备注" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="remark">
              <a-textarea v-model="model.remark" rows="4" placeholder="请输入备注" />
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="密级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="security">
              <j-dict-select-tag type="list" v-model="model.security" dictCode="security" placeholder="请选择密级" />
            </a-form-model-item>
          </a-col>
        </a-row>
      </a-form-model>
    </j-form-container>
  </a-spin>
</template>

<script>

import { httpAction, getAction } from '@/api/manage'

export default {
  name: 'IetmStandardInformationCodeForm',
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
      model: {},
      labelCol: {
        xs: { span: 24 },
        sm: { span: 5 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 }
      },
      confirmLoading: false,
      dmtypeOptions: [],
      dmtypeLoading: false,
      validatorRules: {
        standard: [
          { required: true, message: '请选择手册标准!' }
        ],
        infoCode: [
          { required: true, message: '请输入编码!' }
        ],
        dmtypeId: [
          { required: true, message: '请选择数据模块类型名称!' }
        ],
        description: [
          { required: true, message: '请输入描述!' }
        ],
        // 自定义校验器：兼容 security=0 的情况（async-validator 将 0 判定为空）
        security: [
          {
            validator: (rule, value, callback) => {
              if (value === null || value === undefined || value === '') {
                callback(new Error('请选择密级!'))
              } else {
                callback()
              }
            }
          }
        ]
      },
      url: {
        add: '/standardinformationcode/ietmStandardInformationCode/add',
        edit: '/standardinformationcode/ietmStandardInformationCode/edit',
        queryById: '/standardinformationcode/ietmStandardInformationCode/queryById'
      }
    }
  },
  computed: {
    formDisabled() {
      return this.disabled
    }
  },
  created() {
    //备份model原始值
    this.modelDefault = JSON.parse(JSON.stringify(this.model))
  },
  methods: {
    add(standard) {
      this.model.standard = standard
      this.modelDefault = JSON.parse(JSON.stringify(this.model))
      this.edit(this.modelDefault)
    },
    edit(record) {
      console.log('Form.edit 接收到的 record:', record)
      // 过滤掉 null/undefined，避免覆盖默认值
      const validRecord = {}
      Object.keys(record).forEach(key => {
        if (record[key] !== null && record[key] !== undefined) {
          validRecord[key] = record[key]
        }
      })
      // 预置所有字段，确保 Vue 2 响应式追踪生效
      this.model = Object.assign({
        standard: '',
        infoCode: '',
        dmtypeId: undefined,
        dmtypeName: '',
        description: '',
        remark: '',
        security: undefined
      }, validRecord)
      console.log('Form.edit 合并后的 model:', this.model)
      if (this.model.standard) {
        console.log('开始加载 DM 类型选项, standard:', this.model.standard)
        // 等待选项加载完成后再进行名称匹配
        this.loadDmtypeOptions(this.model.standard)
      } else {
        console.log('standard 为空，跳过加载 DM 类型选项')
      }
    },
    submitForm() {
      console.log('submitForm called, refs.form:', this.$refs.form)
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
          httpAction(httpurl, this.model, method).then((res) => {
            if (res.success) {
              that.$message.success(res.message)
              that.$emit('ok')
            } else {
              that.$message.warning(res.message)
            }
          }).finally(() => {
            that.confirmLoading = false
          })
        } else {
          that.$message.warning('表单验证失败，请检查必填项！')
          return false
        }
      })
    },
    // 用户手动切换手册标准时，清空并重新加载DM类型选项
    onStandardChange(val) {
      this.model.dmtypeId = undefined
      this.model.dmtypeName = ''
      if (val) {
        this.loadDmtypeOptions(val)
      } else {
        this.dmtypeOptions = []
      }
    },
    // 根据手册标准加载DM类型选项，返回Promise供edit()等待
    loadDmtypeOptions(standard) {
      this.dmtypeLoading = true
      return getAction('/standardmanagement/ietmStandard/listIetmStandardDmtypeByMainId', {
        pid: standard,
        pageSize: 500
      }).then(res => {
        if (res.success) {
          this.dmtypeOptions = res.result.records || res.result || []
          console.log('加载选项完成:', this.dmtypeOptions)
          console.log('当前 dmtypeId:', this.model.dmtypeId)
          console.log('当前 dmtypeName:', this.model.dmtypeName)

          // 检查 dmtypeId 是否在选项中
          const matchById = this.dmtypeOptions.find(item => item.id === this.model.dmtypeId)
          console.log('按 ID 匹配结果:', matchById)

          if (!matchById && this.model.dmtypeName) {
            // 如果 ID 不匹配但有名称，尝试按名称匹配
            const matchByName = this.dmtypeOptions.find(item => item.dmtypeName === this.model.dmtypeName)
            console.log('按名称匹配结果:', matchByName)
            if (matchByName) {
              // 更新为当前标准下的正确 ID
              console.log('按名称匹配成功，更新 dmtypeId:', matchByName.id)
              this.model.dmtypeId = matchByName.id
            }
          }
        }
      }).finally(() => {
        this.dmtypeLoading = false
      })
    },
    // 选中DM类型时同步写入 dmtypeName
    onDmtypeChange(value) {
      const selected = this.dmtypeOptions.find(item => item.id === value)
      this.model.dmtypeName = selected ? selected.dmtypeName : ''
    }
  }
}
</script>
