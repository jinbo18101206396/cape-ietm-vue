<template>
  <div class="hotspot-designer">
    <!-- 热点工具栏 -->
    <div class="hotspot-toolbar">
      <span class="toolbar-title">【热点】</span>
      <a-button size="small" icon="plus" @click="handleAddHotspot" :disabled="readonly || selectedObjectIndex === -1" title="增加">增加</a-button>
      <a-button size="small" icon="delete" @click="handleDeleteHotspot" :disabled="readonly || selectedHotspotIndex === -1" title="删除">删除</a-button>
      <a-button size="small" icon="arrow-up" @click="handleMoveHotspotUp" :disabled="readonly || selectedHotspotIndex <= 0" title="上移">上移</a-button>
      <a-button size="small" icon="arrow-down" @click="handleMoveHotspotDown" :disabled="readonly || selectedHotspotIndex === -1 || selectedHotspotIndex >= currentHotspots.length - 1" title="下移">下移</a-button>
      <a-button size="small" icon="download" @click="handleImportHotspots" :disabled="readonly || selectedObjectIndex === -1" title="从ICN元数据导入热点">导入</a-button>
    </div>

    <!-- 热点表格 -->
    <a-table
      :columns="hotspotColumns"
      :data-source="currentHotspots"
      :pagination="false"
      :row-key="(record, index) => index"
      size="small"
      :customRow="customHotspotRow"
      :scroll="{ y: '300px' }"
      class="hotspot-table">
      <template slot="apsid" slot-scope="text, record, index">
        <a-input
          v-if="editingHotspotIndex === index"
          v-model="record.apsid"
          size="small"
          placeholder="应用结构标识"
          :disabled="readonly"
          @pressEnter="endEdit" />
        <span v-else>{{ text }}</span>
      </template>
      <template slot="name" slot-scope="text, record, index">
        <a-input
          v-if="editingHotspotIndex === index"
          v-model="record.name"
          size="small"
          placeholder="应用结构名称"
          :disabled="readonly"
          @pressEnter="endEdit" />
        <span v-else>{{ text }}</span>
      </template>
      <template slot="id" slot-scope="text, record, index">
        <a-input
          v-if="editingHotspotIndex === index"
          v-model="record.id"
          size="small"
          placeholder="ID（可选）"
          :disabled="readonly"
          @pressEnter="endEdit" />
        <span v-else>{{ text }}</span>
      </template>
    </a-table>
  </div>
</template>

<script>
export default {
  name: 'MultimediaHotspotDesigner',

  props: {
    multimediaObjects: { type: Array, default: () => [] },
    selectedObjectIndex: { type: Number, default: -1 },
    readonly: { type: Boolean, default: false }
  },

  data() {
    return {
      selectedHotspotIndex: -1,
      editingHotspotIndex: -1,
      hotspotColumns: [
        { title: '序号', width: '60px', align: 'center', customRender: (text, record, index) => index + 1 },
        { title: '应用结构标识', dataIndex: 'apsid', width: '30%', align: 'center', scopedSlots: { customRender: 'apsid' } },
        { title: '应用结构名称', dataIndex: 'name', width: '30%', align: 'center', scopedSlots: { customRender: 'name' } },
        { title: 'ID', dataIndex: 'id', width: '30%', align: 'center', scopedSlots: { customRender: 'id' } }
      ]
    }
  },

  computed: {
    currentHotspots() {
      if (this.selectedObjectIndex === -1 || !this.multimediaObjects[this.selectedObjectIndex]) {
        return []
      }
      return this.multimediaObjects[this.selectedObjectIndex].hotspots || []
    }
  },

  watch: {
    selectedObjectIndex() {
      this.selectedHotspotIndex = -1
      this.editingHotspotIndex = -1
    },
    currentHotspots: {
      deep: true,
      handler() {
        if (this.selectedHotspotIndex >= this.currentHotspots.length) {
          this.selectedHotspotIndex = Math.max(-1, this.currentHotspots.length - 1)
        }
      }
    }
  },

  methods: {
    customHotspotRow(record, index) {
      return {
        on: { click: () => this.handleSelectHotspot(index) },
        style: { cursor: 'pointer', background: this.selectedHotspotIndex === index ? '#e6f7ff' : '' }
      }
    },

    handleSelectHotspot(index) {
      if (this.readonly) return
      this.endEdit()
      this.selectedHotspotIndex = index
      this.editingHotspotIndex = index
    },

    endEdit() {
      this.editingHotspotIndex = -1
    },

    handleAddHotspot() {
      this.$emit('add-hotspot')
    },

    handleDeleteHotspot() {
      if (this.selectedHotspotIndex === -1) {
        this.$message.warning('请先选择要删除的热点')
        return
      }

      this.$confirm({
        title: '确认',
        content: '确定要删除该热点？',
        onOk: () => {
          this.$emit('delete-hotspot', this.selectedHotspotIndex)
          this.selectedHotspotIndex = -1
          this.editingHotspotIndex = -1
        }
      })
    },

    handleMoveHotspotUp() {
      if (this.selectedHotspotIndex <= 0) {
        this.$message.warning('顶行无法上移!')
        return
      }

      const obj = this.multimediaObjects[this.selectedObjectIndex]
      if (!obj || !obj.hotspots) return

      const temp = obj.hotspots[this.selectedHotspotIndex]
      this.$set(obj.hotspots, this.selectedHotspotIndex, obj.hotspots[this.selectedHotspotIndex - 1])
      this.$set(obj.hotspots, this.selectedHotspotIndex - 1, temp)

      this.selectedHotspotIndex -= 1
      this.editingHotspotIndex = this.selectedHotspotIndex
    },

    handleMoveHotspotDown() {
      if (this.selectedHotspotIndex >= this.currentHotspots.length - 1) {
        this.$message.warning('底行无法下移!')
        return
      }

      const obj = this.multimediaObjects[this.selectedObjectIndex]
      if (!obj || !obj.hotspots) return

      const temp = obj.hotspots[this.selectedHotspotIndex]
      this.$set(obj.hotspots, this.selectedHotspotIndex, obj.hotspots[this.selectedHotspotIndex + 1])
      this.$set(obj.hotspots, this.selectedHotspotIndex + 1, temp)

      this.selectedHotspotIndex += 1
      this.editingHotspotIndex = this.selectedHotspotIndex
    },

    handleImportHotspots() {
      this.$emit('import-hotspots', this.selectedObjectIndex)
    }
  }
}
</script>

<style scoped lang="less">
.hotspot-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hotspot-toolbar {
  padding: 10px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar-title {
  font-weight: 600;
  color: #1890ff;
  margin-right: 10px;
}

.hotspot-table {
  flex: 1;

  /deep/ .ant-table-tbody > tr {
    cursor: pointer;

    &:hover {
      background: #f5f5f5;
    }
  }
}
</style>
