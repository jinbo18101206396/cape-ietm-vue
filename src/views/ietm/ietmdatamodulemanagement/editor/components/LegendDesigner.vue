<template>
  <div class="legend-designer">
    <!-- 工具栏 -->
    <div class="legend-toolbar">
      <a-button size="small" icon="plus" @click="handleAddLegend" :disabled="readonly" title="增加">增加</a-button>
      <a-button size="small" icon="delete" @click="handleDeleteLegend" :disabled="readonly || !selectedRow" title="删除">删除</a-button>
      <a-button size="small" icon="save" @click="handleSaveLegend" :disabled="readonly" title="保存">保存</a-button>
      <a-button size="small" icon="arrow-up" @click="handleMoveUp" :disabled="readonly || !selectedRow || selectedIndex === 0" title="上移">上移</a-button>
      <a-button size="small" icon="arrow-down" @click="handleMoveDown" :disabled="readonly || !selectedRow || selectedIndex === legends.length - 1" title="下移">下移</a-button>
    </div>

    <!-- 图例表格 -->
    <a-table
      :columns="columns"
      :data-source="legends"
      :pagination="false"
      :row-key="(record, index) => index"
      size="small"
      :customRow="customRow"
      :scroll="{ y: 'calc(100vh - 300px)' }"
      class="legend-table"
    >
      <!-- 编号列 -->
      <template slot="no" slot-scope="text, record, index">
        <a-input
          v-if="editingIndex === index"
          v-model="record.no"
          size="small"
          placeholder="编号"
          :disabled="readonly"
          @pressEnter="endEdit"
        />
        <span v-else>{{ text }}</span>
      </template>

      <!-- 名称列 -->
      <template slot="name" slot-scope="text, record, index">
        <a-input
          v-if="editingIndex === index"
          v-model="record.name"
          size="small"
          placeholder="名称"
          :disabled="readonly"
          @pressEnter="endEdit"
        />
        <span v-else>{{ text }}</span>
      </template>
    </a-table>
  </div>
</template>

<script>
export default {
  name: 'LegendDesigner',

  props: {
    legends: {
      type: Array,
      default: () => []
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      selectedIndex: -1,
      selectedRow: null,
      editingIndex: -1,
      columns: [
        {
          title: '序号',
          width: '60px',
          align: 'center',
          customRender: (text, record, index) => index + 1
        },
        {
          title: '编号',
          dataIndex: 'no',
          width: '30%',
          align: 'center',
          scopedSlots: { customRender: 'no' }
        },
        {
          title: '名称',
          dataIndex: 'name',
          align: 'center',
          scopedSlots: { customRender: 'name' }
        }
      ]
    }
  },

  methods: {
    customRow(record, index) {
      return {
        on: {
          click: () => {
            this.handleRowClick(index)
          }
        },
        style: {
          cursor: 'pointer',
          background: this.selectedIndex === index ? '#e6f7ff' : ''
        }
      }
    },

    handleRowClick(index) {
      if (this.readonly) return

      this.endEdit()
      this.selectedIndex = index
      this.selectedRow = this.legends[index]

      // 开始编辑
      this.editingIndex = index
    },

    endEdit() {
      this.editingIndex = -1
    },

    handleAddLegend() {
      this.endEdit()
      this.$emit('add-legend')

      // 选中新增的行
      this.$nextTick(() => {
        const newIndex = this.legends.length - 1
        this.selectedIndex = newIndex
        this.selectedRow = this.legends[newIndex]
        this.editingIndex = newIndex
      })
    },

    handleDeleteLegend() {
      if (this.selectedIndex === -1) {
        this.$message.warning('请先选择要删除的图例')
        return
      }

      this.$confirm({
        title: '确认',
        content: '确认要删除该图例？',
        onOk: () => {
          this.$emit('delete-legend', this.selectedIndex)
          this.selectedIndex = -1
          this.selectedRow = null
          this.editingIndex = -1
        }
      })
    },

    handleSaveLegend() {
      this.endEdit()
      this.$message.success('保存成功')
    },

    handleMoveUp() {
      if (this.selectedIndex <= 0) {
        this.$message.warning('顶行无法上移!')
        return
      }

      this.endEdit()
      this.$emit('move-legend', { index: this.selectedIndex, direction: 'up' })
      this.selectedIndex -= 1
      this.selectedRow = this.legends[this.selectedIndex]
    },

    handleMoveDown() {
      if (this.selectedIndex >= this.legends.length - 1) {
        this.$message.warning('底行无法下移!')
        return
      }

      this.endEdit()
      this.$emit('move-legend', { index: this.selectedIndex, direction: 'down' })
      this.selectedIndex += 1
      this.selectedRow = this.legends[this.selectedIndex]
    }
  }
}
</script>

<style scoped lang="less">
.legend-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  .legend-toolbar {
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;
    flex-shrink: 0;

    .ant-btn {
      font-size: 14px;
      height: 32px;
      line-height: 32px;
      padding: 0 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }

  .legend-table {
    flex: 1;
    overflow: hidden;

    /deep/ .ant-table {
      font-size: 14px;
    }

    /deep/ .ant-table-thead > tr > th {
      background: #fafafa;
      font-weight: 600;
      padding: 10px 8px;
      border-bottom: 2px solid #e8e8e8;
      font-size: 14px;
    }

    /deep/ .ant-table-tbody > tr > td {
      padding: 8px;
      border-bottom: 1px solid #f0f0f0;
      text-align: center;
      font-size: 14px;
    }

    /deep/ .ant-table-tbody > tr:hover {
      background: #f0f7ff !important;
    }

    /deep/ .ant-input {
      font-size: 14px;
      text-align: center;
    }
  }
}
</style>
