<template>
  <!-- , width: fixedHeader ? `calc(100% - ${sidebarOpened ? 256 : 80}px)` : '100%'  -->
  <a-layout-header
    v-if="!headerBarFixed"
    :class="[fixedHeader && 'ant-header-fixedHeader', sidebarOpened ? 'ant-header-side-opened' : 'ant-header-side-closed', ]"
    :style="{ padding: '0' }">

    <div v-if="mode === 'sidemenu'" class="header" :class="theme">
      <a-icon
        v-if="device==='mobile'"
        class="trigger"
        :type="collapsed ? 'menu-fold' : 'menu-unfold'"
        @click="toggle"></a-icon>
      <a-icon
        v-else
        class="trigger"
        :type="collapsed ? 'menu-unfold' : 'menu-fold'"
        @click="toggle"/>

      <span v-if="device === 'desktop'"></span>
      <span v-else>Jeecg-Boot</span>

      <!-- 当前项目信息 -->
      <div v-if="currentProject" class="current-project-info">
        <div class="project-container">
          <a-icon type="folder-open" class="project-icon" />
          <span class="project-label">当前手册项目：</span>
          <span class="project-name">{{ currentProject.projectName }}</span>
        </div>
        <a-divider type="vertical" class="divider" />
        <a class="close-project-btn" @click="handleCloseProject">
          <a-icon type="close-circle" />
          <span>关闭项目</span>
        </a>
      </div>

      <user-menu :theme="theme"/>
    </div>
    <!-- 顶部导航栏模式 -->
    <div v-else :class="['top-nav-header-index', theme]">
      <div class="header-index-wide">
        <div class="header-index-left" :style="topMenuStyle.headerIndexLeft">
          <logo class="top-nav-header" :show-title="device !== 'mobile'" :style="topMenuStyle.topNavHeader"/>
          <div v-if="device !== 'mobile'" :style="topMenuStyle.topSmenuStyle">
            <s-menu
              mode="horizontal"
              :menu="menus"
              :theme="theme"
              @updateMenuTitle="handleUpdateMenuTitle"
            ></s-menu>
          </div>
          <a-icon
            v-else
            class="trigger"
            :type="collapsed ? 'menu-fold' : 'menu-unfold'"
            @click="toggle"></a-icon>
        </div>
        <user-menu class="header-index-right" :theme="theme" :style="topMenuStyle.headerIndexRight"/>
      </div>
    </div>

  </a-layout-header>
</template>

<script>
  import UserMenu from '../tools/UserMenu'
  import SMenu from '../menu/'
  import Logo from '../tools/Logo'
  import { mixin } from '@/utils/mixin.js'
  import { mapState, mapActions } from 'vuex'

  export default {
    name: 'GlobalHeader',
    components: {
      UserMenu,
      SMenu,
      Logo,
    },
    mixins: [mixin],
    props: {
      mode: {
        type: String,
        default: 'sidemenu'
      },
      menus: {
        type: Array,
        required: true
      },
      theme: {
        type: String,
        required: false,
        default: 'dark'
      },
      collapsed: {
        type: Boolean,
        required: false,
        default: false
      },
      device: {
        type: String,
        required: false,
        default: 'desktop'
      }
    },
    data() {
      return {
        headerBarFixed: false,
        topMenuStyle: {
          headerIndexLeft: {},
          topNavHeader: {},
          headerIndexRight: {},
          topSmenuStyle: {}
        },
        chatStatus: '',
      }
    },
    computed: {
      ...mapState({
        currentProject: state => state.project.currentProject
      })
    },
    watch: {
      /** 监听设备变化 */
      device() {
        if (this.mode === 'topmenu') {
          this.buildTopMenuStyle()
        }
      },
      /** 监听导航栏模式变化 */
      mode(newVal) {
        if (newVal === 'topmenu') {
          this.buildTopMenuStyle()
        }
      }
    },
    //update-end--author:sunjianlei---date:20190508------for: 顶部导航栏过长时显示更多按钮-----
    mounted() {
      window.addEventListener('scroll', this.handleScroll)
      //update-begin--author:sunjianlei---date:20190508------for: 顶部导航栏过长时显示更多按钮-----
      if (this.mode === 'topmenu') {
        this.buildTopMenuStyle()
      }
      //update-end--author:sunjianlei---date:20190508------for: 顶部导航栏过长时显示更多按钮-----
      // 加载当前项目
      this.LoadCurrentProject()
      // 监听项目变化事件
      if (this.$bus) {
        this.$bus.$on('project-changed', this.handleProjectChanged)
        this.$bus.$on('project-closed', this.handleProjectClosed)
      }
    },
    beforeDestroy() {
      if (this.$bus) {
        this.$bus.$off('project-changed', this.handleProjectChanged)
        this.$bus.$off('project-closed', this.handleProjectClosed)
      }
    },
    methods: {
      ...mapActions(['LoadCurrentProject', 'CloseProject']),
      handleScroll() {
        if (this.autoHideHeader) {
          let scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
          if (scrollTop > 100) {
            this.headerBarFixed = true
          } else {
            this.headerBarFixed = false
          }
        } else {
          this.headerBarFixed = false
        }
      },
      toggle() {
        this.$emit('toggle')
      },
      //update-begin--author:sunjianlei---date:20190508------for: 顶部导航栏过长时显示更多按钮-----
      buildTopMenuStyle() {
        if (this.mode === 'topmenu') {
          if (this.device === 'mobile') {
            // 手机端需要清空样式，否则显示会错乱
            this.topMenuStyle.topNavHeader = {}
            this.topMenuStyle.topSmenuStyle = {}
            this.topMenuStyle.headerIndexRight = {}
            this.topMenuStyle.headerIndexLeft = {}
          } else {
            let rightWidth = '400px'
            this.topMenuStyle.topNavHeader = { 'min-width': '165px' }
            this.topMenuStyle.topSmenuStyle = { 'width': 'calc(100% - 165px)' }
            this.topMenuStyle.headerIndexRight = { 'min-width': rightWidth, 'white-space': 'nowrap' }
            this.topMenuStyle.headerIndexLeft = { 'width': `calc(100% - ${rightWidth})` }
          }
        }
      },
      //update-begin--author:sunjianlei---date:20190508------for: 顶部导航栏过长时显示更多按钮-----

      // update-begin-author:sunjianlei date:20210508 for: 修复动态功能测试菜单、带参数菜单标题错误、展开错误的问题
      handleUpdateMenuTitle(value) {
        this.$emit('updateMenuTitle', value)
      },
      // update-end-author:sunjianlei date:20210508 for: 修复动态功能测试菜单、带参数菜单标题错误、展开错误的问题

      // 处理项目变化事件
      handleProjectChanged(project) {
        this.LoadCurrentProject()
      },

      // 处理项目关闭事件
      handleProjectClosed() {
        this.LoadCurrentProject()
      },

      // 关闭当前项目
      handleCloseProject() {
        const that = this
        this.$confirm({
          title: '确认关闭项目',
          content: '关闭当前项目将清除项目上下文，是否确认？',
          okText: '确认',
          cancelText: '取消',
          onOk() {
            that.CloseProject()
              .then(() => {
                that.$message.success('项目已关闭')
                if (that.$bus) {
                  that.$bus.$emit('project-closed')
                }
              })
              .catch(error => {
                that.$message.error(error || '关闭项目失败')
              })
          }
        })
      }

    }
  }
</script>

<style lang="less" scoped>
  /* update_begin author:scott date:20190220 for: 缩小首页布局顶部的高度*/

  @height: 59px;

  .layout {

    .top-nav-header-index {

      .header-index-wide {
        margin-left: 10px;

        .ant-menu.ant-menu-horizontal {
          height: @height;
          line-height: @height;
        }
      }
      .trigger {
        line-height: 64px;
        &:hover {
          background: rgba(0, 0, 0, 0.05);
        }
      }
    }

    .header {
      z-index: 2;
      color: white;
      height: @height;
      background-color: @primary-color;
      transition: background 300ms;

      /* dark 样式 */
      &.dark {
        color: #000000;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
        background-color: white !important;
      }
    }

    .header, .top-nav-header-index {
      &.dark .trigger:hover {
        background: rgba(0, 0, 0, 0.05);
      }
    }
  }

  .ant-layout-header {
    height: @height;
    line-height: @height;
  }

  .current-project-info {
    display: inline-flex;
    align-items: center;
    margin-left: 16px;
    height: 30px;
    padding: 0 12px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.45);
    background: rgba(0, 0, 0, 0.15);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    .project-container {
      display: inline-flex;
      align-items: center;
      gap: 6px;

      .project-icon {
        color: #fff;
        font-size: 14px;
      }

      .project-label {
        color: rgba(255, 255, 255, 0.85);
        font-size: 13px;
        font-weight: normal;
      }

      .project-name {
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .divider {
      background: rgba(255, 255, 255, 0.5);
      height: 16px;
      margin: 0 12px;
    }

    .close-project-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: #ff7875;
      }

      .anticon {
        font-size: 14px;
      }
    }
  }

  /* dark 主题 header 为白底，需切换为深色文字 */
  .header.dark .current-project-info {
    border-color: #d0d0d0;
    background: #efefef;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    .project-container {
      .project-icon {
        color: @primary-color;
      }
      .project-label {
        color: #595959;
      }
      .project-name {
        color: #1a1a1a;
      }
    }

    .divider {
      background: #bfbfbf;
    }

    .close-project-btn {
      color: #434343;

      &:hover {
        color: #ff4d4f;
      }
    }
  }

  /* update_end author:scott date:20190220 for: 缩小首页布局顶部的高度*/

</style>