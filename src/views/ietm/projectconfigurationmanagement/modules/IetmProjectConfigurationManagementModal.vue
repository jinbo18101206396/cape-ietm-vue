<template>
  <j-modal
    :title="title"
    :width="width"
    :visible="visible"
    :confirmLoading="confirmLoading"
    switchFullscreen
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="关闭">
    <a-spin :spinning="confirmLoading">
      <a-form-model ref="form" :model="model" :rules="validatorRules">

        <a-form-model-item label="编码" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="code">
          <a-input
            v-model="model.code"
            :placeholder="codeRuleText || '请输入编码(大写字母+数字)'"
            @blur="handleCodeBlur"
            :maxLength="10">
            <a-icon slot="suffix" v-if="codeChecking" type="loading" />
            <a-icon slot="suffix" v-else-if="codeValid === true" type="check-circle" style="color: #52c41a" />
            <a-icon slot="suffix" v-else-if="codeValid === false" type="close-circle" style="color: #f5222d" />
          </a-input>
        </a-form-model-item>

        <a-form-model-item label="技术名称" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="title">
          <a-input v-model="model.title" placeholder="请输入技术名称" :maxLength="200"></a-input>
        </a-form-model-item>

        <a-form-model-item label="序号" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="seq">
          <a-input-number
            v-model="model.seq"
            placeholder="请输入序号"
            :min="1"
            :max="9999"
            style="width: 100%"></a-input-number>
        </a-form-model-item>

        <a-form-model-item label="路径" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="path">
          <a-input v-model="model.path" placeholder="系统自动生成" disabled></a-input>
        </a-form-model-item>

        <a-form-model-item label="密级" :labelCol="labelCol" :wrapperCol="wrapperCol" prop="security">
          <j-dict-select-tag type="list" v-model="model.security" dictCode="security" placeholder="请选择密级" />
        </a-form-model-item>

      </a-form-model>
    </a-spin>
  </j-modal>
</template>

<script>

  import { httpAction, getAction } from '@/api/manage'
  import { validateDuplicateValue } from '@/utils/util'

  export default {
    name: "IetmProjectConfigurationManagementModal",
    components: {
    },
    data () {
      return {
        title:"操作",
        width:800,
        visible: false,
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
        validatorRules: {
           code: [
              { required: true, message: '请输入编码!'},
              { pattern: /^[A-Z0-9]+$/, message: '编码只能包含大写字母和数字!' },
              { validator: this.validateCode }
           ],
           title: [
              { required: true, message: '请输入技术名称!'},
           ],
           seq: [
              { required: false, message: '请输入序号!'},
           ],
           security: [
              { required: false, message: '请输入密级!'},
           ],
        },
        url: {
          add: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/add",
          edit: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/edit",
          checkCode: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/checkCode",
          checkDelete: "/projectconfigurationmanagement/ietmProjectConfigurationManagement/checkDelete",
        },
        expandedRowKeys:[],
        pidField:"pid",

        // 编码验证相关
        codeChecking: false,
        codeValid: null,
        codeHelpText: '请输入大写字母和数字组合',
        codeRuleText: '', // 编码规则提示文字

        // 编码规则配置（根节点=0级，A=1级，00=2级，以此类推）
        codeLengthRules: {
          1: 1, // 1级节点(A): 1位
          2: 2, // 2级节点(00): 2位
          3: 1, // 3级节点(0): 1位
          4: 1, // 4级节点(0): 1位
          5: 2, // 5级节点(00): 2位
          6: 2, // 6级节点(00): 2位
          7: 1  // 7级节点(A): 1位
        },
        currentLevel: 0, // 当前节点层级
        requiredCodeLength: 0, // 要求的编码长度

      }
    },
    created () {
       //备份model原始值
       this.modelDefault = JSON.parse(JSON.stringify(this.model));
    },
    methods: {
      add (obj) {
        this.modelDefault.pid=''
        // 合并传入的对象（可能包含根节点的默认编码和技术名称）
        let defaultData = Object.assign({}, this.modelDefault, obj);
        this.edit(defaultData);
      },
      edit (record) {
        this.model = Object.assign({}, record);

        console.log('模态框-edit方法接收到的record:', {
          id: record.id,
          code: record.code,
          pid: record.pid,
          path: record.path,
          level: record.level,
          parentLevel: record.parentLevel
        })

        // 计算当前节点层级
        // 优先级：1. parentLevel（添加下级时传入） 2. level字段（后端返回） 3. path计算
        if (record.parentLevel !== undefined) {
          // 场景1：添加下级节点，parentLevel是父节点的层级，当前节点=父节点+1
          this.currentLevel = record.parentLevel + 1;
          console.log('模态框-添加下级节点: parentLevel={}, currentLevel={}', record.parentLevel, this.currentLevel)
        } else if (record.level !== undefined && record.level !== null) {
          // 场景2：编辑节点，使用后端返回的level字段
          this.currentLevel = record.level;
          console.log('模态框-编辑节点（使用level字段）: currentLevel={}', this.currentLevel)
        } else if (record.path) {
          // 场景3：从path计算层级
          this.currentLevel = this.calculateLevelFromPath(record.path);
          console.log('模态框-编辑节点（从path计算）: path={}, currentLevel={}', record.path, this.currentLevel)
        } else {
          // 场景4：降级方案
          this.currentLevel = this.calculateNodeLevel(record.pid);
          console.log('模态框-编辑节点（降级方案）: pid={}, currentLevel={}', record.pid, this.currentLevel)
        }

        // 获取编码长度要求
        this.requiredCodeLength = this.getRequiredCodeLength(this.currentLevel);

        console.log('模态框-节点层级信息:', {
          currentLevel: this.currentLevel,
          requiredCodeLength: this.requiredCodeLength,
          codeLengthRules: this.codeLengthRules
        })

        // 更新提示文字
        this.updateCodeRuleText();

        this.visible = true;
        this.codeValid = null;
        this.codeHelpText = this.codeRuleText || '请输入大写字母和数字组合';
      },
      close () {
        this.$emit('close');
        this.visible = false;
        this.$refs.form.clearValidate();
        this.codeValid = null;
        this.codeRuleText = '';
        this.currentLevel = 0;
        this.requiredCodeLength = 0;
      },

      // 计算当前节点的层级（根节点=0级，A=1级，00=2级，以此类推）
      calculateNodeLevel(pid) {
        // 如果没有父节点,说明是根节点的子节点(1级)
        if (!pid || pid === '0') {
          return 1;
        }

        // 如果传入了父节点层级信息,直接使用
        if (this.model.parentLevel) {
          return this.model.parentLevel + 1;
        }

        // 默认返回1级
        return 1;
      },

      // 从path计算节点层级（path格式固定8段：装备编码-A-00-0-0-00-00-A）
      calculateLevelFromPath(path) {
        if (!path) return 1
        const segments = path.split('-')
        if (segments.length !== 8) {
          console.warn('[calculateLevelFromPath] path段数不是8:', path)
          return 1
        }
        const template = ['A', '00', '0', '0', '00', '00', 'A']
        let level = 0
        for (let i = 1; i <= 7; i++) {
          if (segments[i] !== template[i - 1]) {
            level = i
          }
        }
        console.log('[calculateLevelFromPath] path:', path, '→ level:', level)
        return level || 1
      },

      // 根据层级获取编码长度要求
      getRequiredCodeLength(level) {
        return this.codeLengthRules[level] || 0;
      },

      // 更新编码规则提示文字
      updateCodeRuleText() {
        if (this.currentLevel > 0 && this.requiredCodeLength > 0) {
          this.codeRuleText = `第${this.currentLevel}级节点编码必须是${this.requiredCodeLength}位(大写字母和数字)`;
        } else {
          this.codeRuleText = '';
        }
      },

      // 编码失焦时验证
      handleCodeBlur() {
        if (this.model.code) {
          // 先进行长度验证
          if (this.requiredCodeLength > 0 && this.model.code.length !== this.requiredCodeLength) {
            this.codeValid = false;
            this.codeHelpText = `第${this.currentLevel}级节点编码必须是${this.requiredCodeLength}位,当前为${this.model.code.length}位`;
            return;
          }

          this.checkCodeDuplicate();
        }
      },

      // 检查编码重复
      checkCodeDuplicate() {
        const code = this.model.code;
        if (!code) {
          return;
        }

        // 格式验证：只能包含大写字母和数字
        if (!/^[A-Z0-9]+$/.test(code)) {
          this.codeValid = false;
          this.codeHelpText = '编码只能包含大写字母和数字';
          return;
        }

        // 长度验证：根据层级严格检查编码位数
        if (this.requiredCodeLength > 0 && code.length !== this.requiredCodeLength) {
          this.codeValid = false;
          this.codeHelpText = `第${this.currentLevel}级节点编码必须是${this.requiredCodeLength}位,当前为${code.length}位`;
          return;
        }

        this.codeChecking = true;
        this.codeValid = null;

        const params = {
          code: code,
          pid: this.model.pid || '0',
        };

        if (this.model.id) {
          params.id = this.model.id;
        }

        getAction(this.url.checkCode, params).then((res) => {
          if (res.success) {
            this.codeValid = true;
            this.codeHelpText = '编码可用';
          } else {
            this.codeValid = false;
            this.codeHelpText = res.message || '编码已存在';
          }
        }).catch(() => {
          this.codeValid = false;
          this.codeHelpText = '编码验证失败';
        }).finally(() => {
          this.codeChecking = false;
        });
      },

      // 自定义编码验证器
      validateCode(rule, value, callback) {
        if (!value) {
          callback();
          return;
        }

        // 格式验证
        if (!/^[A-Z0-9]+$/.test(value)) {
          callback(new Error('编码只能包含大写字母和数字'));
          return;
        }

        // 长度验证
        if (this.requiredCodeLength > 0) {
          if (value.length !== this.requiredCodeLength) {
            callback(new Error(`第${this.currentLevel}级节点编码必须是${this.requiredCodeLength}位,当前为${value.length}位`));
            return;
          }
        }

        // 重复性验证（通过codeValid状态判断）
        if (this.codeValid === false) {
          callback(new Error(this.codeHelpText));
          return;
        }

        callback();
      },

      handleOk () {
        const that = this;
        // 触发表单验证
       this.$refs.form.validate(valid => {
          if (valid) {
            // 再次检查编码是否可用
            if (that.codeValid === false) {
              that.$message.warning('编码不可用，请修改后重试');
              return;
            }

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
             if(this.model.id && this.model.id === this.model[this.pidField]){
              that.$message.warning("父级节点不能选择自己");
              that.confirmLoading = false;
              return;
            }
            httpAction(httpurl,this.model,method).then((res)=>{
              if(res.success){
                that.$message.success(res.message);
                this.$emit('ok');
              }else{
                that.$message.warning(res.message);
              }
            }).finally(() => {
              that.confirmLoading = false;
              that.close();
            })
          }else{
             return false
          }
        })
      },
      handleCancel () {
        this.close()
      },
      submitSuccess(formData,flag){
        if(!formData.id){
          let treeData = this.$refs.treeSelect.getCurrTreeData()
          this.expandedRowKeys=[]
          this.getExpandKeysByPid(formData[this.pidField],treeData,treeData)
          this.$emit('ok',formData,this.expandedRowKeys.reverse());
        }else{
          this.$emit('ok',formData,flag);
        }
      },
      getExpandKeysByPid(pid,arr,all){
        if(pid && arr && arr.length>0){
          for(let i=0;i<arr.length;i++){
            if(arr[i].key==pid){
              this.expandedRowKeys.push(arr[i].key)
              this.getExpandKeysByPid(arr[i]['parentId'],all,all)
            }else{
              this.getExpandKeysByPid(pid,arr[i].children,all)
            }
          }
        }
      }


    }
  }
</script>

</style>
