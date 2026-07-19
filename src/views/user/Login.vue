<template>
  <div class="main">
    <div class="login-card">
      <div class="card-header"></div>
      <div class="card-body">
        <div class="login-heading">
          <h2>用户登录</h2>
          <p>欢迎使用 IETM 研发管理系统</p>
        </div>

        <a-form-model class="user-layout-login" @keyup.enter.native="handleSubmit">
          <login-account ref="alogin" @validateFail="validateFail" @success="requestSuccess"
                         @fail="requestFailed"></login-account>

          <div class="form-extras">
            <div class="checkbox-wrap">
              <a-checkbox v-model="rememberMe">记住密码</a-checkbox>
            </div>
            <a href="#" class="forgot-link">忘记密码？</a>
          </div>

          <a-button type="primary" htmlType="submit" class="login-btn" :loading="loginBtn"
                    @click.stop.prevent="handleSubmit" :disabled="loginBtn">
            <span v-if="!loginBtn">登 录</span>
            <span v-else>登录中...</span>
          </a-button>
        </a-form-model>
      </div>
    </div>

    <div class="login-footer">
      Copyright © 2026 <a href="#">中国航空综合技术研究所</a>
    </div>

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
.main {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 80px;
}

.login-card {
  width: 100%;
  max-width: 650px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.08),
              0 0 0 1px rgba(0,0,0,0.02);
  overflow: hidden;
  position: relative;
  animation: cardSlideIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes cardSlideIn {
  0% { opacity: 0; transform: translateY(25px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* 顶部装饰条 */
.card-header {
  height: 5px;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
}

.card-body {
  padding: 60px 72px 56px;
}

/* 标题 */
.login-heading {
  text-align: center;
  margin-bottom: 44px;
  max-width: 460px;
  margin-left: auto;
  margin-right: auto;

  h2 {
    font-size: 32px;
    font-weight: 700;
    color: rgba(0,0,0,0.88);
    margin-bottom: 14px;
    position: relative;
    display: inline-block;
    letter-spacing: 1.5px;

    &::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: -8px;
      transform: translateX(-50%);
      width: 0;
      height: 3px;
      background: linear-gradient(90deg, #1890ff, #40a9ff);
      border-radius: 2px;
      transition: width 0.4s ease;
    }

    &:hover::after {
      width: 80%;
    }
  }

  p {
    font-size: 15px;
    color: rgba(0,0,0,0.48);
    letter-spacing: 0.5px;
  }
}

.user-layout-login {
  max-width: 460px;
  margin: 0 auto;

  /* 记住密码 + 忘记密码 */
  .form-extras {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
    font-size: 14px;

    .checkbox-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;

      /deep/ .ant-checkbox {
        top: 0;
      }

      /deep/ .ant-checkbox-inner {
        width: 17px;
        height: 17px;
        border-radius: 3px;
      }

      /deep/ .ant-checkbox-wrapper {
        font-size: 14px;
        color: rgba(0,0,0,0.65);
      }
    }

    .forgot-link {
      color: #1890ff;
      text-decoration: none;
      position: relative;
      transition: color 0.3s;

      &::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -2px;
        width: 0;
        height: 1px;
        background: #1890ff;
        transition: width 0.3s;
      }

      &:hover {
        color: #40a9ff;

        &::after {
          width: 100%;
        }
      }
    }
  }

  /* 登录按钮 */
  .login-btn {
    width: 100%;
    height: 50px;
    background: linear-gradient(135deg, #1890ff, #0d7adf);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 4px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(24,144,255,0.35);
    transition: all 0.3s;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg,
        transparent,
        rgba(255,255,255,0.25),
        transparent);
      animation: btnShine 2.5s infinite;
    }

    @keyframes btnShine {
      0% { left: -100%; }
      50%, 100% { left: 100%; }
    }

    &:hover:not(:disabled) {
      box-shadow: 0 6px 22px rgba(24,144,255,0.45);
      transform: translateY(-2px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    /* 禁用状态 */
    &:disabled,
    &.ant-btn-loading {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }
  }
}

/* 底部版权 */
.login-footer {
  position: absolute;
  bottom: 28px;
  left: 0;
  right: 0;
  font-size: 12px;
  color: rgba(0,0,0,0.48);
  text-align: center;

  a {
    color: #1890ff;
    text-decoration: none;
    position: relative;
    transition: color 0.3s;

    &::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: -2px;
      transform: translateX(-50%);
      width: 0;
      height: 1px;
      background: #1890ff;
      transition: width 0.3s;
    }

    &:hover {
      color: #40a9ff;

      &::after {
        width: 100%;
      }
    }
  }
}

/* 响应式 */
@media (max-width: 1100px) {
  .card-body {
    padding: 52px 64px 48px;
  }
}

@media (max-width: 900px) {
  .main {
    padding-bottom: 60px;
  }

  .card-body {
    padding: 48px 52px 44px;
  }

  .login-footer {
    bottom: 20px;
  }
}

@media (max-width: 600px) {
  .card-body {
    padding: 44px 40px 40px;
  }
}
</style>