<template>
  <div class="main">
    <a-form-model class="user-layout-login" @keyup.enter.native="handleSubmit">
      <login-account ref="alogin" @validateFail="validateFail" @success="requestSuccess"
                     @fail="requestFailed"></login-account>
      <a-form-item style="margin-top:24px">
        <a-button size="large" type="primary" htmlType="submit" class="login-button" :loading="loginBtn"
                  @click.stop.prevent="handleSubmit" :disabled="loginBtn">确定
        </a-button>
      </a-form-item>
    </a-form-model>
    <login-select-tenant ref="loginSelect" @success="loginSelectOk"></login-select-tenant>
  </div>
</template>

<script>
import Vue from 'vue'
import {ACCESS_TOKEN, ENCRYPTED_STRING} from '@/store/mutation-types'
import ThirdLogin from './third/ThirdLogin'
import LoginSelectTenant from './LoginSelectTenant'
import TwoStepCaptcha from '@/components/tools/TwoStepCaptcha'
import {getEncryptedString} from '@/utils/encryption/aesEncrypt'
import {timeFix} from '@/utils/util'
import {getAction, postAction} from "@api/manage";

import LoginAccount from './LoginAccount'
import LoginPhone from './LoginPhone'

export default {
  components: {
    LoginSelectTenant,
    TwoStepCaptcha,
    ThirdLogin,
    LoginAccount,
    LoginPhone
  },
  data() {
    return {
      rememberMe: true,
      loginBtn: false,
      requiredTwoStepCaptcha: false,
      stepCaptchaVisible: false,
      encryptedString: {
        key: "",
        iv: "",
      },
    }
  },
  created() {
    Vue.ls.remove(ACCESS_TOKEN)
    this.getRouterData();
    this.rememberMe = true
  },
  methods: {
    handleRememberMeChange(e) {
      this.rememberMe = e.target.checked
    },
    /**跳转到登录页面的参数-账号获取*/
    getRouterData() {
      this.$nextTick(() => {
        let temp = this.$route.params.username || this.$route.query.username || ''
        if (temp) {
          this.$refs.alogin.acceptUsername(temp)
        }
      })
    },

    //登录
    handleSubmit() {
      this.loginBtn = true;
      this.$refs.alogin.handleLogin(this.rememberMe)
    },
    // 校验失败
    validateFail() {
      this.loginBtn = false;
    },
    // 登录后台成功
    requestSuccess(loginResult) {
      this.$refs.loginSelect.show(loginResult)
    },
    //登录后台失败
    requestFailed(err) {
      let description = ((err.response || {}).data || {}).message || err.message || "请求出现错误，请稍后再试"
      this.$notification['error']({
        message: '登录失败',
        description: description,
        duration: 4,
      });
      this.loginBtn = false;
    },
    loginSelectOk() {
      this.loginSuccess()
    },
    //登录成功
    loginSuccess() {
      this.$router.push({path: "/dashboard/analysis"}).catch(() => {
        console.log('登录跳转首页出错,这个错误从哪里来的')
      })
      this.$notification.success({
        message: '欢迎',
        description: `${timeFix()}，欢迎回来`,
      });
    },

    stepCaptchaSuccess() {
      this.loginSuccess()
    },
    stepCaptchaCancel() {
      this.Logout().then(() => {
        this.loginBtn = false
        this.stepCaptchaVisible = false
      })
    },
    //获取密码加密规则
    getEncrypte() {
      var encryptedString = Vue.ls.get(ENCRYPTED_STRING);
      if (encryptedString == null) {
        getEncryptedString().then((data) => {
          this.encryptedString = data
        });
      } else {
        this.encryptedString = encryptedString;
      }
    }

  }

}
</script>
<style lang="less" scoped>
.user-layout-login {
  label {
    font-size: 14px;
  }

  .getCaptcha {
    display: block;
    width: 100%;
    height: 40px;
  }

  .forge-password {
    font-size: 14px;
  }

  button.login-button {
    padding: 0 15px;
    font-size: 16px;
    height: 40px;
    width: 100%;
  }

  .user-login-other {
    text-align: left;
    margin-top: 24px;
    line-height: 22px;

    .item-icon {
      font-size: 24px;
      color: rgba(0, 0, 0, .2);
      margin-left: 16px;
      vertical-align: middle;
      cursor: pointer;
      transition: color .3s;

      &:hover {
        color: #1890ff;
      }
    }

    .register {
      float: right;
    }
  }
}
</style>
<style>
.valid-error .ant-select-selection__placeholder {
  color: #f5222d;
}
</style>