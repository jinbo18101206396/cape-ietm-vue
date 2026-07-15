import './config'
import Vue from 'vue'
import App from './App.vue'
import Storage from 'vue-ls'
import router from './router'
import store from './store/'
import {VueAxios} from "@/utils/request"
import Antd, {version} from 'ant-design-vue'
import Viser from 'viser-vue'
import 'ant-design-vue/dist/antd.less';
import '@/permission'
import '@/utils/filter'
import Print from 'vue-print-nb-jeecg'
import preview from 'vue-photo-preview'
import 'vue-photo-preview/dist/skin.css'
import SSO from '@/cas/sso.js'
import $ from 'jquery'
import {
    ACCESS_TOKEN,
    DEFAULT_COLOR,
    DEFAULT_COLOR_WEAK,
    DEFAULT_CONTENT_WIDTH_TYPE,
    DEFAULT_FIXED_HEADER,
    DEFAULT_FIXED_HEADER_HIDDEN,
    DEFAULT_FIXED_SIDEMENU,
    DEFAULT_LAYOUT_MODE,
    DEFAULT_MULTI_PAGE,
    DEFAULT_THEME,
    SIDEBAR_TYPE
} from "@/store/mutation-types"
import config from '@/defaultSettings'

import JDictSelectTag from './components/dict/index.js'
import hasPermission from '@/utils/hasPermission'
import vueBus from '@/utils/vueBus';
import JeecgComponents from '@/components/jeecg/index'
import '@/assets/less/JAreaLinkage.less'
import VueAreaLinkage from 'vue-area-linkage'
import '@/components/jeecg/JVxeTable/install'
import '@/components/JVxeCells/install'
//表单验证
import {rules} from '@/utils/rules'
import constant from "./utils/constant";


require('@jeecg/antd-online-mini')
require('@jeecg/antd-online-mini/dist/OnlineForm.css')

console.log('ant-design-vue version:', version)

// 挂载到全局
window.$ = window.jQuery = $
Vue.prototype.rules = rules
Vue.prototype.monthArr = [
    {
        monthId: '1',
        value: '1'
    },
    {
        monthId: '2',
        value: '2'
    },
    {
        monthId: '3',
        value: '3'
    },
    {
        monthId: '4',
        value: '4'
    },
    {
        monthId: '5',
        value: '5'
    },
    {
        monthId: '6',
        value: '6'
    },
    {
        monthId: '7',
        value: '7'
    },
    {
        monthId: '8',
        value: '8'
    },
    {
        monthId: '9',
        value: '9'
    },
    {
        monthId: '10',
        value: '10'
    },
    {
        monthId: '11',
        value: '11'
    },
    {
        monthId: '12',
        value: '12'
    },
];
Vue.prototype.nameOptions = [
    {
        text: "常银桥",
        value: "常银桥"
    }, {
        text: "张春雷",
        value: "张春雷"
    }, {
        text: "江志炜",
        value: "江志炜"
    },
    {
        text: "王桂锋",
        value: "王桂锋"
    }, {
        text: "杨俊",
        value: "杨俊"
    }, {
        text: "杨忠良",
        value: "杨忠良"
    },
    {
        text: "陈明泽",
        value: "陈明泽"
    },
    {
        text: "王一平",
        value: "王一平"
    },
    {
        text: "米富博",
        value: "米富博"
    },
    {
        text: "陈斯玉",
        value: "陈斯玉"
    }, {
        text: "陈素微",
        value: "陈素微"
    },
    {
        text: "陈燕凤",
        value: "陈燕凤"
    }, {
        text: "陈正峰",
        value: "陈正峰"
    }, {
        text: "丁新",
        value: "丁新"
    },
    {
        text: "黄燕冰",
        value: "黄燕冰"
    }, {
        text: "赖智超",
        value: "赖智超"
    }, {
        text: "蓝昭伟",
        value: "蓝昭伟"
    },
    {
        text: "李江杰",
        value: "李江杰"
    }, {
        text: "李韶东",
        value: "李韶东"
    }, {
        text: "李鑫然",
        value: "李鑫然"
    },
    {
        text: "刘勇",
        value: "刘勇"
    }, {
        text: "吕佳炎",
        value: "吕佳炎"
    }, {
        text: "师美玲",
        value: "师美玲"
    },
    {
        text: "宋英杰",
        value: "宋英杰"
    }, {
        text: "孙岩",
        value: "孙岩"
    }, {
        text: "唐洋",
        value: "唐洋"
    },
    {
        text: "汪齐家",
        value: "汪齐家"
    }, {
        text: "王东",
        value: "王东"
    }, {
        text: "王明亮",
        value: "王明亮"
    },
    {
        text: "王伟光",
        value: "王伟光"
    }, {
        text: "吴奇峰",
        value: "吴奇峰"
    }, {
        text: "肖梦雨",
        value: "肖梦雨"
    },
    {
        text: "余晓宁",
        value: "余晓宁"
    }, {
        text: "智新凯",
        value: "智新凯"
    }, {
        text: "邹国兵",
        value: "邹国兵"
    },
    {
        text: "陈卓敏",
        value: "陈卓敏"
    }, {
        text: "段德红",
        value: "段德红"
    }, {
        text: "苏航",
        value: "苏航"
    },
    {
        text: "林伟贤",
        value: "林伟贤"
    }, {
        text: "卓权财",
        value: "卓权财"
    }, {
        text: "黄慧龙",
        value: "黄慧龙"
    },
    {
        text: "金星",
        value: "金星"
    }, {
        text: "郭晓",
        value: "郭晓"
    }, {
        text: "解鹏程",
        value: "解鹏程"
    },
    {
        text: "李世雄",
        value: "李世雄"
    }, {
        text: "梁淑婷",
        value: "梁淑婷"
    }, {
        text: "莫瑞麟",
        value: "莫瑞麟"
    },
    {
        text: "孙菥瑶",
        value: "孙菥瑶"
    }, {
        text: "谭冬梅",
        value: "谭冬梅"
    }, {
        text: "杨翠",
        value: "杨翠"
    }, {
        text: "吕海熊",
        value: "吕海熊"
    },
    {
        text: "孔令超",
        value: "孔令超"
    },
    {
        text: "刘书廷",
        value: "刘书廷"
    },
    {
        text: "张玉新",
        value: "张玉新"
    },
];
Vue.prototype.$setLoading=function(props){
  if(typeof props == 'boolean'){
    props = {spinning : props};
  }
  if(Object.prototype.toString.call(props) != '[object Object]'){
    props = {}
  }
  this.$app.loading={
    tip:'正在进行代码混淆，请稍后....',
    ...props
  }
}
Vue.config.productionTip = false
Vue.use(Storage, config.storageOptions)
Vue.use(Antd)
Vue.use(VueAxios, router)
Vue.use(Viser)
Vue.use(hasPermission)
Vue.use(JDictSelectTag)
Vue.use(Print)
Vue.use(preview)
Vue.use(vueBus);
Vue.use(JeecgComponents);
Vue.use(VueAreaLinkage);
Vue.use(constant);
SSO.init(() => {
    main()
})

function main() {
    new Vue({
        router,
        store,
        mounted() {
            store.commit('SET_SIDEBAR_TYPE', Vue.ls.get(SIDEBAR_TYPE, true))
            store.commit('TOGGLE_THEME', Vue.ls.get(DEFAULT_THEME, config.navTheme))
            store.commit('TOGGLE_LAYOUT_MODE', Vue.ls.get(DEFAULT_LAYOUT_MODE, config.layout))
            store.commit('TOGGLE_FIXED_HEADER', Vue.ls.get(DEFAULT_FIXED_HEADER, config.fixedHeader))
            store.commit('TOGGLE_FIXED_SIDERBAR', Vue.ls.get(DEFAULT_FIXED_SIDEMENU, config.fixSiderbar))
            store.commit('TOGGLE_CONTENT_WIDTH', Vue.ls.get(DEFAULT_CONTENT_WIDTH_TYPE, config.contentWidth))
            store.commit('TOGGLE_FIXED_HEADER_HIDDEN', Vue.ls.get(DEFAULT_FIXED_HEADER_HIDDEN, config.autoHideHeader))
            store.commit('TOGGLE_WEAK', Vue.ls.get(DEFAULT_COLOR_WEAK, config.colorWeak))
            store.commit('TOGGLE_COLOR', Vue.ls.get(DEFAULT_COLOR, config.primaryColor))
            store.commit('SET_TOKEN', Vue.ls.get(ACCESS_TOKEN))
            store.commit('SET_MULTI_PAGE', Vue.ls.get(DEFAULT_MULTI_PAGE, config.multipage))
        },
        render: h => h(App)
    }).$mount('#app')
}
