<template>
  <a-tabs
    defaultActiveKey="1">
    <a-tab-pane key="1" tab="信息码管理">
      <ietm-standard-information-code-list></ietm-standard-information-code-list>
    </a-tab-pane>
    <a-tab-pane key="2" tab="构型管理">
      <ietm-standard-configuration-management-list></ietm-standard-configuration-management-list>
    </a-tab-pane>
  </a-tabs>
</template>

<script>

import { mapState } from 'vuex'
import IetmStandardInformationCodeList from '@views/ietm/standardinformationcode/IetmStandardInformationCodeList.vue'
import IetmStandardConfigurationManagementList from '@views/ietm/ietmstandardconfigurationmanagement/IetmStandardConfigurationManagementList.vue'
export default {
  name: 'StandardTemplateManagement',
  components: {
    IetmStandardInformationCodeList,
    IetmStandardConfigurationManagementList
  },
  data () {
    return {
      activePage: '',
    }
  },
  created() {
  },
  watch:{
  },
  mounted() {
  },
  methods: {
  }
}
</script>

<style scoped>
/deep/ .ant-tabs-nav-scroll {
  background: white;
}
</style>
