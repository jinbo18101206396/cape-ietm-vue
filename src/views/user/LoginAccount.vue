<template>
  <div>
    <a-form-model ref="form" :model="model" :rules="validatorRules">
      <a-form-model-item prop="username">
        <div class="form-group">
          <label class="form-label" for="username">账户名</label>
          <div class="input-wrapper">
            <input
              v-model="model.username"
              type="text"
              id="username"
              class="form-input"
              placeholder="请输入账户名 / admin"
              autocomplete="username"
            />
            <span class="input-icon">👤</span>
          </div>
        </div>
      </a-form-model-item>

      <a-form-model-item prop="password">
        <div class="form-group">
          <label class="form-label" for="password">密码</label>
          <div class="input-wrapper">
            <input
              v-model="model.password"
              type="password"
              id="password"
              class="form-input"
              placeholder="请输入密码 / 123456"
              autocomplete="current-password"
            />
            <span class="input-icon">🔒</span>
          </div>
        </div>
      </a-form-model-item>

    </a-form-model>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'LoginAccount',
  data() {
    return {
      currdatetime: '',
      loginType: 0,
      model: {
        username: 'admin',
        password: '123456',
        inputCode: ''
      },
      validatorRules: {
        username: [
          { required: true, message: '请输入用户名!' },
          { validator: this.handleUsernameOrEmail }
        ],
        password: [
          { required: true, message: '请输入密码!', validator: 'click' }
        ]
      }
    }
  },
  methods: {
    ...mapActions(['Login']),
    handleUsernameOrEmail(rule, value, callback) {
      const regex = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/
      if (regex.test(value)) {
        this.loginType = 0
      } else {
        this.loginType = 1
      }
      callback()
    },
    validateFields(arr, callback) {
      let promiseArray = []
      for (let item of arr) {
        let p = new Promise((resolve, reject) => {
          this.$refs['form'].validateField(item, (err) => {
            if (!err) {
              resolve()
            } else {
              reject(err)
            }
          })
        })
        promiseArray.push(p)
      }
      Promise.all(promiseArray).then(() => {
        callback()
      }).catch(err => {
        callback(err)
      })
    },
    acceptUsername(username) {
      this.model['username'] = username
    },
    handleLogin(rememberMe) {
      this.validateFields(['username', 'password'], (err) => {
        if (!err) {
          let loginParams = {
            username: this.model.username,
            password: this.model.password,
            checkKey: this.currdatetime,
            remember_me: rememberMe
          }
          console.log("登录参数", loginParams)
          this.Login(loginParams).then((res) => {
            console.log(res.result)
            this.$emit('success', res.result)
          }).catch((err) => {
            this.$emit('fail', err)
          })
        } else {
          this.$emit('validateFail')
        }
      })
    }
  }
}
</script>

<style scoped>
/* 隐藏 Ant Design 表单项的默认样式 */
/deep/ .ant-form-item {
  margin-bottom: 0;
}

/deep/ .ant-form-item-control {
  line-height: normal;
}

/deep/ .ant-form-item-explain,
/deep/ .ant-form-item-extra {
  min-height: 0;
  margin-top: 4px;
  font-size: 13px;
}

.form-group {
  margin-bottom: 28px;
}

.form-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 12px;
  letter-spacing: 0.3px;
}

.input-wrapper {
  position: relative;
}

.form-input {
  width: 100%;
  height: 52px;
  padding: 0 18px 0 52px;
  background: #fafafa;
  border: 1.5px solid #e8e8e8;
  border-radius: 10px;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.88);
  font-weight: 400;
  outline: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.form-input::placeholder {
  color: rgba(0, 0, 0, 0.3);
  font-weight: 400;
}

.form-input:hover {
  background: #ffffff;
  border-color: #b8b8b8;
}

.form-input:focus {
  background: #ffffff;
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1),
              0 1px 3px rgba(0, 0, 0, 0.05);
}

.input-icon {
  position: absolute;
  left: 17px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: rgba(0, 0, 0, 0.25);
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.form-input:focus ~ .input-icon {
  color: #1890ff;
  transform: translateY(-50%) scale(1.1);
}

.form-input:hover ~ .input-icon {
  color: rgba(0, 0, 0, 0.4);
}
</style>
