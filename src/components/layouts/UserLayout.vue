<template>
  <div id="userLayout" :class="['user-layout-wrapper', device]">
    <div class="layout">
      <!-- 登录区 -->
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
   登录区
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
  .login-panel {
    padding: 56px 64px;
  }
}

@media (max-width: 1100px) {
  .login-panel {
    padding: 48px 48px;
  }
}

@media (max-width: 900px) {
  .login-panel {
    padding: 32px 24px;
  }
}

@media (max-width: 600px) {
  .login-panel {
    padding: 24px 16px;
  }
}

</style>
