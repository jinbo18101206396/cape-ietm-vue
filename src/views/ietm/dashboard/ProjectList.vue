<template>
  <div>
    <a-table
      :columns="columns"
      :scroll="{x:true, y:scrollY}"
      :dataSource="dataSource"
      :pagination="false"
      bordered>
      <span slot="action" slot-scope="text, record">
        <a-popconfirm title="打开新的手册项目将关闭所有功能页签，是否确认打开该项目?" @confirm="() => handleOpenProject(record.id)">
          <a>打开项目</a>
        </a-popconfirm>
        </span>
    </a-table>
  </div>
</template>

<script>

import '@/assets/less/TableExpand.less'
import { mixinDevice } from '@/utils/mixin'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'

export default {
  name: 'ProjectList',
  mixins: [mixinDevice, JeecgListMixin],
  components: {},
  data() {
    return {
      description: '首页-手册项目列表',
      scrollY: 0,
      // 表头
      columns: [
        {
          title: '序号',
          dataIndex: '',
          key: 'rowIndex',
          width: 60,
          align: 'center',
          customRender: function(t, r, index) {
            return parseInt(index) + 1
          }
        },
        {
          title: '项目名称',
          align: 'left',
          dataIndex: 'name',
          width: 180
        },
        {
          title: '装备编码',
          align: 'left',
          dataIndex: 'equipmentCode',
          width: 180
        },
        {
          title: 'IETM标准',
          align: 'left',
          dataIndex: 'ietmStandard',
          width: 180
        },
        {
          title: '密级',
          align: 'center',
          dataIndex: 'security',
          width: 147
        },
        {
          title: '操作',
          dataIndex: 'action',
          align: 'center',
          fixed: 'right',
          width: 147,
          scopedSlots: { customRender: 'action' }
        }
      ],
      dataSource: [],
      url: {
        list: '/ietmproject/ietmProject/listData'
      }
    }
  },
  created() {

  },
  mounted() {
    this.calcScrollHeight()
  },
  computed: {},

  methods: {
    calcScrollHeight() {
      console.log(window.innerHeight)
      this.scrollY = window.innerHeight * 0.5 - 170
    },
    handleOpenProject(){

    }
  }
}
</script>
<style scoped>
@import '~@assets/less/common.less';
</style>