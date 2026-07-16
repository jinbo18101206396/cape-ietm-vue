<template>
  <a-card :bordered="false">
    <!-- 授权类型选择区域 -->
    <div class="auth-type-wrapper" style="margin-bottom: 16px; padding: 16px; background: #f0f2f5; border-radius: 4px;">
      <a-form layout="inline">
        <a-form-item label="授权类型" style="margin-bottom: 0;">
          <a-radio-group v-model="authType" @change="handleAuthTypeChange">
            <a-radio :value="'0'">不限制</a-radio>
            <a-radio :value="'1'">项目按角色授权</a-radio>
            <a-radio :value="'2'">构型按角色授权</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </div>

    <!-- 内容区域 -->
    <ietm-project-auth-tab v-if="authType === '1'" />
    <ietm-cm-auth-tab v-if="authType === '2'" />
    <a-empty v-if="authType === '0'" description="当前为不限制模式，所有用户均可访问" style="margin-top: 50px;" />
  </a-card>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import IetmProjectAuthTab from './modules/IetmProjectAuthTab'
import IetmCmAuthTab from './modules/IetmCmAuthTab'

export default {
  name: 'IetmRoleauthList',
  components: {
    IetmProjectAuthTab,
    IetmCmAuthTab
  },
  data() {
    return {
      description: '手册授权管理',
      authType: '1',
      url: {
        getAuthType: '/ietmroleauth/ietmRoleauth/getAuthType',
        setAuthType: '/ietmroleauth/ietmRoleauth/setAuthType'
      }
    }
  },
  created() {
    this.loadAuthType()
  },
  methods: {
    // 加载授权类型配置
    loadAuthType() {
      getAction(this.url.getAuthType).then(res => {
        if (res.success) {
          this.authType = res.result || '1'
          this.handleAuthTypeChange()
        }
      }).catch(err => {
        console.error('加载授权类型失败', err)
      })
    },
    // 授权类型切换
    handleAuthTypeChange() {
      // 授权类型变化时，自动保存到后端
      postAction(this.url.setAuthType + '?authType=' + this.authType).then(res => {
        if (!res.success) {
          this.$message.error(res.message || '设置失败！')
        }
      }).catch(err => {
        this.$message.error('设置失败：' + err.message)
      })
    }
  }
}
</script>

<style scoped>
.auth-type-wrapper {
  border: 1px solid #d9d9d9;
}
</style>
