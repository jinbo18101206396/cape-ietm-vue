<template>
  <a-config-provider :locale="locale">
    <div id="app">
        <a-spin v-bind='loading'>
           <router-view/>
        </a-spin>
    </div>
  </a-config-provider>
</template>
<script>
  import zhCN from 'ant-design-vue/lib/locale-provider/zh_CN'
  import enquireScreen from '@/utils/device'
  import Vue from 'vue'
  export default {
    data () {
      return {
        loading:{
          spinning:false
        },
        locale: zhCN,
      }
    },
    beforeCreate() {
      Vue.prototype.$app = this;
    },
    created () {
      let that = this
      enquireScreen(deviceType => {
        // tablet
        if (deviceType === 0) {
          that.$store.commit('TOGGLE_DEVICE', 'mobile')
          that.$store.dispatch('setSidebar', false)
        }
        // mobile
        else if (deviceType === 1) {
          that.$store.commit('TOGGLE_DEVICE', 'mobile')
          that.$store.dispatch('setSidebar', false)
        }
        else {
          that.$store.commit('TOGGLE_DEVICE', 'desktop')
          that.$store.dispatch('setSidebar', true)
        }

      })
    }
  }
</script>
<style>
  #app {
    height: 100%;
    //overflow-y: hidden;
  }
</style>