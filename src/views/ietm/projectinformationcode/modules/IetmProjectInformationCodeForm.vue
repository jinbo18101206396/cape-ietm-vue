<template>
  <a-spin :spinning="confirmLoading">
    <j-form-container :disabled="formDisabled">
      <a-form-model ref="form" :model="model" :rules="validatorRules" slot="detail">
        <a-row>
          <a-col :span="24">
            <a-form-model-item label="编码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="code">
              <a-input v-model="model.code" placeholder="请输入编码"  ></a-input>
            </a-form-model-item>
          </a-col>
          <a-col :span="24">
            <a-form-model-item label="数据模块类型" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="dmtypeId">
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
              <a-spin v-else-if="dmtypeLoading" />
              <span v-else style="color: #999;">请先选择项目或等待项目信息加载</span>
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
  import { validateDuplicateValue } from '@/utils/util'

  export default {
    name: 'IetmProjectInformationCodeForm',
    components: {
    },
    props: {
      //表单禁用
      disabled: {
        type: Boolean,
        default: false,
        required: false
      }
    },
    data () {
      return {
        model:{
         },
        labelCol: {
          xs: { span: 24 },
          sm: { span: 5 },
        },
        wrapperCol: {
          xs: { span: 24 },
          sm: { span: 16 },
        },
        confirmLoading: false,
        dmtypeOptions: [],
        dmtypeLoading: false,
        validatorRules: {
           code: [
              { required: true, message: '请输入编码!'},
              { pattern: /^[0-9A-Z]*$/, message: '编码只能包含数字和大写字母!' },
           ],
           dmtypeId: [
              { required: true, message: '请选择数据模块类型!'},
           ],
        },
        url: {
          add: "/projectinformationcode/ietmProjectInformationCode/add",
          edit: "/projectinformationcode/ietmProjectInformationCode/edit",
          queryById: "/projectinformationcode/ietmProjectInformationCode/queryById"
        }
      }
    },
    computed: {
      formDisabled(){
        return this.disabled
      },
    },
    created () {
       //备份model原始值
      this.modelDefault = JSON.parse(JSON.stringify(this.model));
    },
    methods: {
      add () {
        this.edit(this.modelDefault);
      },
      edit (record) {
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
          code: '',
          projectId: '',
          dmtypeId: undefined,
          dmtypeName: '',
          description: '',
          remark: '',
          security: undefined
        }, validRecord)
        console.log('Form.edit 合并后的 model:', this.model)

        this.visible = true;
      },
      submitForm () {
        const that = this;
        // 触发表单验证
        this.$refs.form.validate(valid => {
          if (valid) {
            // 检查编码是否已存在
            that.checkCodeExists().then(() => {
              that.confirmLoading = true;
              let httpurl = '';
              let method = '';
              if(!this.model.id){
                httpurl+=this.url.add;
                method = 'post';
              }else{
                httpurl+=this.url.edit;
                 method = 'put';
              }
              httpAction(httpurl,this.model,method).then((res)=>{
                if(res.success){
                  that.$message.success(res.message);
                  that.$emit('ok');
                }else{
                  that.$message.warning(res.message);
                }
              }).finally(() => {
                that.confirmLoading = false;
              })
            }).catch(() => {
              // 编码已存在，不提交
            });
          }

        })
      },
      // 检查编码是否已存在
      checkCodeExists() {
        return new Promise((resolve, reject) => {
          if (!this.model.code || !this.model.projectId) {
            resolve();
            return;
          }

          const params = {
            projectId: this.model.projectId,
            code: this.model.code,
            id: this.model.id || ''
          };

          getAction('/projectinformationcode/ietmProjectInformationCode/checkCode', params).then((res) => {
            if (res.success) {
              if (res.result === true) {
                this.$message.error('编码已存在，请重新输入！');
                reject();
              } else {
                resolve();
              }
            } else {
              resolve();
            }
          }).catch(() => {
            resolve();
          });
        });
      },
      // 设置数据模块类型选项（从父组件传递）
      setDmtypeOptions(options) {
        // 按 dmtypeName 去重，保留第一个匹配的记录
        const uniqueMap = new Map()
        ;(options || []).forEach(item => {
          if (item.dmtypeName && !uniqueMap.has(item.dmtypeName)) {
            uniqueMap.set(item.dmtypeName, item)
          }
        })
        this.dmtypeOptions = Array.from(uniqueMap.values()).sort((a, b) =>
          (a.dmtypeName || '').localeCompare(b.dmtypeName || '')
        )
        console.log('Form 接收到的 dmtypeOptions (去重后):', this.dmtypeOptions)

        // 如果当前有 dmtypeName 但没有 dmtypeId，尝试匹配
        if (this.model.dmtypeName && !this.model.dmtypeId) {
          const matchByName = this.dmtypeOptions.find(item => item.dmtypeName === this.model.dmtypeName)
          if (matchByName) {
            console.log('按名称匹配成功，更新 dmtypeId:', matchByName.id)
            this.model.dmtypeId = matchByName.id
          }
        }
      },
      // 根据项目ID加载数据模块类型选项（已弃用，保留用于兼容）
      loadDmtypeOptions(projectId) {
        console.log('loadDmtypeOptions 已弃用，请使用 setDmtypeOptions')
      },
      // 选中DM类型时同步写入 dmtypeName
      onDmtypeChange(value) {
        const selected = this.dmtypeOptions.find(item => item.id === value)
        this.model.dmtypeName = selected ? selected.dmtypeName : ''
      }
    }
  }
</script>