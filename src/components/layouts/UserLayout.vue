<template>
  <div id="userLayout" :class="['user-layout-wrapper', device]">
    <div class="layout">
      <!-- 左侧品牌区 -->
      <div class="brand">
        <div class="glow glow-1"></div>
        <div class="glow glow-2"></div>
        <div class="deco deco-1"></div>
        <div class="deco deco-2"></div>

        <!-- Logo行 -->
        <div class="brand-header">
          <div class="logo-wrap">
            <div class="logo-ring"></div>
            <div class="brand-logo">📘</div>
          </div>
          <div class="brand-sys-name">IETM 研发平台</div>
        </div>

        <!-- 主体内容 -->
        <div class="brand-body">
          <div class="brand-tag">
            <div class="status-dot"></div>
            <span>企业级系统</span>
            <span class="tag-badge">v3.0</span>
          </div>

          <div class="brand-slogan">IETM 研发管理系统</div>
          <div class="brand-subtitle">武器装备交互式电子技术手册</div>
          <div class="brand-desc">
            为装备研制提供数字化技术文档全生命周期管理，支持多标准 IETM 编制、角色权限精细管控、构型版本管理、全流程在线协作。
          </div>

          <!-- 特性网格 -->
          <div class="features">
            <div class="feat">
              <div class="feat-icon">📁</div>
              <div class="feat-title">全流程文档管理</div>
              <div class="feat-desc">从编制到发布的完整流程</div>
            </div>
            <div class="feat">
              <div class="feat-icon">📋</div>
              <div class="feat-title">多标准 IETM 支持</div>
              <div class="feat-desc">符合国军标与国际标准</div>
            </div>
            <div class="feat">
              <div class="feat-icon">🔐</div>
              <div class="feat-title">精细权限管控</div>
              <div class="feat-desc">项目与构型双重授权体系</div>
            </div>
            <div class="feat">
              <div class="feat-icon">🔄</div>
              <div class="feat-title">构型版本管理</div>
              <div class="feat-desc">自动化版本追溯与比对</div>
            </div>
          </div>
        </div>

        <!-- 底部版权 -->
        <div class="brand-foot">
          <div class="brand-divider"></div>
          <div class="brand-copyright">
            © 2026 中国航空综合技术研究所 | 版权所有
          </div>
        </div>
      </div>

      <!-- 右侧登录区 -->
      <div class="login-panel">
        <route-view></route-view>
      </div>
    </div>
  </div>
</template>

<script>
import RouteView from "@/components/layouts/RouteView"
import { mixinDevice } from '@/utils/mixin.js'

export default {
  name: "UserLayout",
  components: { RouteView },
  mixins: [mixinDevice],
  data() {
    return {}
  },
  mounted() {
    document.body.classList.add('userLayout')
  },
  beforeDestroy() {
    document.body.classList.remove('userLayout')
  },
}
</script>

<style lang="less" scoped>
#userLayout.user-layout-wrapper {
  height: 100vh;
  overflow: hidden;
}

.layout {
  display: flex;
  height: 100vh;
  position: relative;
}

/* ══════════════════════════════════
   左侧品牌区 (46%)
══════════════════════════════════ */
.brand {
  flex: 0 0 46%;
  position: relative;
  background: linear-gradient(135deg, #1890ff 0%, #0d7adf 48%, #0050b3 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 64px 80px 56px;
  overflow: hidden;
}

/* 六边形网格背景 */
.brand::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(0deg, transparent, transparent 38px, rgba(255,255,255,0.04) 38px, rgba(255,255,255,0.04) 39px),
    repeating-linear-gradient(60deg, transparent, transparent 38px, rgba(255,255,255,0.04) 38px, rgba(255,255,255,0.04) 39px),
    repeating-linear-gradient(120deg, transparent, transparent 38px, rgba(255,255,255,0.04) 38px, rgba(255,255,255,0.04) 39px);
  animation: hexMove 28s linear infinite;
  pointer-events: none;
}
@keyframes hexMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(66px, 66px); }
}

/* 光晕装饰 */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
  animation: glowPulse 9s ease-in-out infinite;
}
.glow-1 {
  width: 480px;
  height: 480px;
  background: rgba(96, 165, 250, 0.22);
  right: -120px;
  bottom: -100px;
}
.glow-2 {
  width: 320px;
  height: 320px;
  background: rgba(59, 130, 246, 0.18);
  left: -80px;
  top: 120px;
  animation-delay: 4.5s;
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.12); }
}

/* 装饰几何 */
.deco {
  position: absolute;
  border: 1px solid rgba(255,255,255,0.12);
  pointer-events: none;
}
.deco-1 {
  width: 160px;
  height: 160px;
  border-radius: 20px;
  right: 100px;
  top: 80px;
  transform: rotate(12deg);
  animation: decoFloat 7s ease-in-out infinite;
}
.deco-2 {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  left: 80px;
  bottom: 180px;
  animation: decoFloat 9s ease-in-out infinite 3s;
}
@keyframes decoFloat {
  0%, 100% { transform: translateY(0) rotate(12deg); }
  50% { transform: translateY(-25px) rotate(12deg); }
}

/* 内容层 */
.brand-header,
.brand-body,
.brand-foot {
  position: relative;
  z-index: 1;
}

/* Logo行 */
.brand-header {
  display: flex;
  align-items: center;
  gap: 20px;
}
.logo-wrap {
  position: relative;
}
.logo-ring {
  position: absolute;
  inset: -10px;
  border-radius: 14px;
  border: 2px solid rgba(255,255,255,0.25);
  animation: logoPulse 3.5s ease-out infinite;
}
@keyframes logoPulse {
  0% { transform: scale(0.85); opacity: 0; }
  50% { opacity: 0.6; }
  100% { transform: scale(1.35); opacity: 0; }
}
.brand-logo {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255,255,255,0.26), rgba(255,255,255,0.16));
  border: 2px solid rgba(255,255,255,0.38);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
  box-shadow: 0 8px 26px rgba(0,0,0,0.14);
  position: relative;
}
.brand-sys-name {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2.5px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.12);
}

/* 主体 */
.brand-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 580px;
}

.brand-tag {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 20px;
  background: rgba(255,255,255,0.12);
  border: 1.5px solid rgba(255,255,255,0.26);
  border-radius: 24px;
  font-size: 13px;
  color: #fff;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 28px;
  width: fit-content;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.08);
}
.tag-badge {
  padding: 3px 10px;
  background: rgba(255,255,255,0.2);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 10px #52c41a;
  animation: statusBlink 2.8s ease-in-out infinite;
}
@keyframes statusBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.brand-slogan {
  font-size: 42px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  margin-bottom: 14px;
  letter-spacing: 1px;
  text-shadow: 0 3px 12px rgba(0,0,0,0.15);
}
.brand-subtitle {
  font-size: 17px;
  color: rgba(255,255,255,0.85);
  margin-bottom: 20px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.brand-desc {
  font-size: 15px;
  color: rgba(255,255,255,0.75);
  line-height: 1.8;
  margin-bottom: 36px;
  letter-spacing: 0.3px;
}

/* 特性网格 */
.features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.feat {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 18px 16px;
  backdrop-filter: blur(8px);
  transition: all 0.3s;
  cursor: pointer;
}
.feat:hover {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.28);
  transform: translateY(-4px);
  box-shadow: 0 10px 28px rgba(0,0,0,0.16);
}
.feat-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  margin-bottom: 6px;
}
.feat-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 3px;
}
.feat-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  line-height: 1.5;
}

/* 底部 */
.brand-divider {
  height: 1px;
  background: linear-gradient(to right,
    rgba(255,255,255,0),
    rgba(255,255,255,0.18) 50%,
    rgba(255,255,255,0));
  margin: 32px 0 20px;
}
.brand-copyright {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  text-align: center;
}

/* ══════════════════════════════════
   右侧登录区 (54%)
══════════════════════════════════ */
.login-panel {
  flex: 1;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 80px;
  position: relative;
}

/* SVG波浪背景 */
.login-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0c8.284 0 15 6.716 15 15 0 8.284-6.716 15-15 15S15 23.284 15 15C15 6.716 21.716 0 30 0z' fill='%231890ff' fill-opacity='0.02'/%3E%3C/svg%3E");
  background-size: 60px 60px;
  pointer-events: none;
}

/* ══════════════════════════════════
   响应式
══════════════════════════════════ */
@media (max-width: 1400px) {
  .brand {
    padding: 56px 64px 48px;
  }
  .login-panel {
    padding: 56px 64px;
  }
  .brand-slogan {
    font-size: 38px;
  }
}

@media (max-width: 1100px) {
  .brand {
    padding: 48px 56px 40px;
  }
  .login-panel {
    padding: 48px 48px;
  }
  .brand-slogan {
    font-size: 34px;
  }
}

@media (max-width: 900px) {
  .layout {
    flex-direction: column;
  }
  .brand {
    flex: none;
    height: 35vh;
    padding: 32px 40px;
  }
  .brand-body {
    max-width: 100%;
  }
  .brand-slogan {
    font-size: 28px;
  }
  .features {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .feat {
    padding: 14px 12px;
  }
  .login-panel {
    flex: 1;
    padding: 32px 24px;
  }
}

@media (max-width: 600px) {
  .brand {
    padding: 24px 20px;
  }
  .brand-slogan {
    font-size: 24px;
  }
  .login-panel {
    padding: 24px 16px;
  }
}

</style>
