<template>
    <div>
      <a-form-model ref="form" :model="model" :rules="validatorRules">
        <a-form-model-item required prop="username" class="form-item">
          <label class="form-label">账户名</label>
          <div class="input-wrap">
            <input
              v-model="model.username"
              type="text"
              class="form-input"
              placeholder="请输入账户名 / admin"
            />
            <span class="input-icon">👤</span>
          </div>
        </a-form-model-item>

        <a-form-model-item required prop="password" class="form-item">
          <label class="form-label">密码</label>
          <div class="input-wrap">
            <input
              v-model="model.password"
              type="password"
              class="form-input"
              placeholder="请输入密码 / 123456"
              autocomplete="off"
            />
            <span class="input-icon">🔒</span>
          </div>
        </a-form-model-item>

      </a-form-model>
    </div>
</template>

<script>
  import { getAction } from '@/api/manage'
  import Vue from 'vue'
  import { mapActions } from 'vuex'

  export default {
    name: 'LoginAccount',
    data(){
      return {
        requestCodeSuccess: false,
        randCodeImage: '',
        currdatetime: '',
        loginType: 0,
        model:{
          username: 'admin',
          password: '123456',
          inputCode: ''
        },
        validatorRules:{
          username: [
            { required: true, message: '请输入用户名!' },
            { validator: this.handleUsernameOrEmail }
          ],
          password: [{
            required: true, message: '请输入密码!', validator: 'click'
          }],
        }

      }
    },
    created() {
    },
    methods:{
      ...mapActions(['Login']),
      // 判断登录类型
      handleUsernameOrEmail (rule, value, callback) {
        const regex = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/;
        if (regex.test(value)) {
          this.loginType = 0
        } else {
          this.loginType = 1
        }
        callback()
      },
      /**
       * 验证字段
       * @param arr
       * @param callback
       */
      validateFields(arr, callback){
        let promiseArray = []
        for(let item of arr){
          let p = new Promise((resolve, reject) => {
            this.$refs['form'].validateField(item, (err)=>{
              if(!err){
                resolve();
              }else{
                reject(err);
              }
            })
          });
          promiseArray.push(p)
        }
        Promise.all(promiseArray).then(()=>{
          callback()
        }).catch(err=>{
          callback(err)
        })
      },
      acceptUsername(username){
        this.model['username'] = username
      },
      //账号密码登录
      handleLogin(rememberMe){
        this.validateFields([ 'username', 'password'], (err)=>{
          if(!err){
            let loginParams = {
              username: this.model.username,
              password: this.model.password,
              checkKey: this.currdatetime,
              remember_me: rememberMe,
            }
            console.log("登录参数", loginParams)
            this.Login(loginParams).then((res) => {
              console.log(res.result)
              this.$emit('success', res.result)
            }).catch((err) => {
              this.$emit('fail', err)
            });
          }else{
            this.$emit('validateFail')
          }
        })
      }


    }

  }
</script>

<style scoped>
.form-item {
  margin-bottom: 26px;
}

.form-item /deep/ .ant-form-item-control {
  line-height: normal;
  max-width: 100%;
}

.form-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0,0,0,0.88);
  margin-bottom: 11px;
  letter-spacing: 0.5px;
}

.input-wrap {
  position: relative;
  max-width: 460px;
  margin: 0 auto;
}

.input-icon {
  position: absolute;
  left: 17px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: rgba(0,0,0,0.28);
  pointer-events: none;
  transition: color 0.3s;
}

.form-input {
  width: 100%;
  height: 50px;
  padding: 0 18px 0 50px;
  background: #fff;
  border: 1.5px solid #e1e4e8;
  border-radius: 8px;
  font-size: 15px;
  color: rgba(0,0,0,0.88);
  outline: none;
  transition: all 0.3s;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.form-input::placeholder {
  color: rgba(0,0,0,0.28);
  font-size: 14px;
}

.form-input:hover {
  border-color: #a8b3c0;
}

.form-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24,144,255,0.12);
}

.form-input:focus + .input-icon {
  color: #1890ff;
}
</style>