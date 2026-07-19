<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧品牌区 -->
      <div class="brand-section">
        <div class="brand-content">
          <h1 class="brand-title">IETM 研发管理系统</h1>
          <p class="brand-subtitle">武器装备交互式电子技术手册</p>
        </div>

        <div class="brand-features">
          <div class="feature-item">
            <div class="feature-icon">📊</div>
            <span>智能数据管理与分析</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🔒</div>
            <span>企业级安全保障</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon">⚡</div>
            <span>高效协同工作流</span>
          </div>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-section">
        <div class="form-header">
          <h2 class="form-title">用户登录</h2>
          <p class="form-description">欢迎使用 IETM 研发管理系统</p>
        </div>

        <form @submit.prevent="handleSubmit">
          <login-account ref="alogin" @validateFail="validateFail" @success="requestSuccess" @fail="requestFailed"></login-account>

          <div class="form-extras">
            <label class="checkbox-wrapper">
              <input type="checkbox" v-model="rememberMe">
              <span class="checkbox-label">记住密码</span>
            </label>
            <a href="#" class="forgot-link">忘记密码？</a>
          </div>

          <button type="submit" class="login-button" :disabled="loginBtn">
            <span v-if="!loginBtn">登 录</span>
            <span v-else>登录中...</span>
          </button>
        </form>

        <div class="footer-text">
          Copyright © 2026 <a href="#" class="footer-link">中国航空综合技术研究所</a>
        </div>
      </div>
    </div>

    <login-select-tenant ref="loginSelect" @success="loginSelectOk"></login-select-tenant>
  </div>
</template>

<script>
import Vue from 'vue'
import { ACCESS_TOKEN } from '@/store/mutation-types'
import LoginSelectTenant from './LoginSelectTenant'
import { timeFix } from '@/utils/util'
import LoginAccount from './LoginAccount'

export default {
  components: {
    LoginSelectTenant,
    LoginAccount
  },
  data() {
    return {
      rememberMe: true,
      loginBtn: false
    }
  },
  created() {
    Vue.ls.remove(ACCESS_TOKEN)
    this.getRouterData()
  },
  methods: {
    getRouterData() {
      this.$nextTick(() => {
        let temp = this.$route.params.username || this.$route.query.username || ''
        if (temp) {
          this.$refs.alogin.acceptUsername(temp)
        }
      })
    },
    handleSubmit() {
      this.loginBtn = true
      this.$refs.alogin.handleLogin(this.rememberMe)
    },
    validateFail() {
      this.loginBtn = false
    },
    requestSuccess(loginResult) {
      this.$refs.loginSelect.show(loginResult)
    },
    requestFailed(err) {
      let description = ((err.response || {}).data || {}).message || err.message || "请求出现错误，请稍后再试"
      this.$notification['error']({
        message: '登录失败',
        description: description,
        duration: 4
      })
      this.loginBtn = false
    },
    loginSelectOk() {
      this.$router.push({ path: "/dashboard/analysis" }).catch(() => {
        console.log('登录跳转首页出错')
      })
      this.$notification.success({
        message: '欢迎',
        description: `${timeFix()}，欢迎回来`
      })
    }
  }
}
</script>
<style lang="less" scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  background: linear-gradient(135deg, #5a7ce6 0%, #7b68ee 50%, #9370db 100%);
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: fixed;
  top: 0;
  left: 0;
  overflow: hidden;
  margin: 0;
}

.login-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 50%, rgba(64, 169, 255, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(24, 144, 255, 0.1) 0%, transparent 50%);
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-5%, -5%) rotate(5deg); }
}

.login-page::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="1" cy="1" r="1" fill="white" fill-opacity="0.08"/></svg>');
  background-size: 30px 30px;
  pointer-events: none;
}

.login-container {
  display: flex;
  width: 100%;
  max-width: 1200px;
  min-height: 680px;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25),
              0 10px 30px rgba(0, 0, 0, 0.15),
              0 0 1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  z-index: 1;
  animation: slideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 左侧品牌区 */
.brand-section {
  flex: 0 0 45%;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 50%, #0050b3 100%);
  padding: 70px 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.brand-section::before {
  content: '';
  position: absolute;
  top: -30%;
  right: -20%;
  width: 550px;
  height: 550px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 40%, transparent 70%);
  border-radius: 50%;
  animation: float 8s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-20px, -20px); }
}

.brand-section::after {
  content: '';
  position: absolute;
  bottom: -35%;
  left: -15%;
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 40%, transparent 70%);
  border-radius: 50%;
  animation: float 10s ease-in-out infinite reverse;
}

.brand-content {
  position: relative;
  z-index: 1;
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.3;
  margin-bottom: 20px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
}

.brand-subtitle {
  font-size: 17px;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.7;
  font-weight: 400;
  max-width: 450px;
  margin-bottom: 48px;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.1);
}

.brand-features {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.96);
  font-size: 15px;
  font-weight: 400;
  padding: 18px 22px;
  background: rgba(255, 255, 255, 0.13);
  border-radius: 14px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(8px) translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  width: 42px;
  height: 42px;
  background: rgba(255, 255, 255, 0.28);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.feature-item:hover .feature-icon {
  transform: scale(1.1) rotate(5deg);
  background: rgba(255, 255, 255, 0.35);
}

/* 右侧表单区 */
.form-section {
  flex: 1;
  padding: 70px 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #FFFFFF;
  position: relative;
}

.form-section::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(24, 144, 255, 0.03) 0%, transparent 70%);
  pointer-events: none;
}

.form-header {
  margin-bottom: 48px;
}

.form-title {
  font-size: 36px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.form-description {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.48);
  font-weight: 400;
}

/* 记住密码 + 忘记密码 */
.form-extras {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  font-size: 14px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-wrapper input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #1890ff;
  border-radius: 4px;
}

.checkbox-label {
  color: rgba(0, 0, 0, 0.65);
  font-weight: 400;
  cursor: pointer;
  transition: color 0.3s;
}

.checkbox-wrapper:hover .checkbox-label {
  color: rgba(0, 0, 0, 0.88);
}

.forgot-link {
  color: #1890ff;
  text-decoration: none;
  font-weight: 400;
  position: relative;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.forgot-link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 0;
  height: 1.5px;
  background: #1890ff;
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.forgot-link:hover {
  color: #40a9ff;
  transform: translateX(2px);
}

.forgot-link:hover::after {
  width: 100%;
}

/* 登录按钮 */
.login-button {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 4px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3),
              0 2px 4px rgba(24, 144, 255, 0.2);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2.5s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(24, 144, 255, 0.4),
              0 4px 8px rgba(24, 144, 255, 0.3);
  background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

/* 底部版权 */
.footer-text {
  margin-top: 40px;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  font-weight: 400;
}

.footer-link {
  color: #1890ff;
  text-decoration: none;
  font-weight: 400;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.footer-link::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -2px;
  transform: translateX(-50%);
  width: 0;
  height: 1.5px;
  background: #1890ff;
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-link:hover {
  color: #40a9ff;
}

.footer-link:hover::after {
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .login-container {
    max-width: 900px;
  }

  .brand-section {
    flex: 0 0 42%;
    padding: 60px 50px;
  }

  .form-section {
    padding: 60px 60px;
  }

  .brand-title {
    font-size: 42px;
  }

  .form-title {
    font-size: 32px;
  }
}

@media (max-width: 900px) {
  .brand-section {
    display: none;
  }

  .login-container {
    max-width: 540px;
  }

  .form-section {
    padding: 50px 50px;
  }
}

@media (max-width: 480px) {
  .form-section {
    padding: 40px 32px;
  }

  .form-title {
    font-size: 28px;
  }

  .form-header {
    margin-bottom: 36px;
  }
}
</style>
