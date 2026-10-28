<template>
  <div class="graphic-designer">
    <!-- 图形区域 -->
    <div class="graphic-section">
      <div class="graphic-toolbar">
        <a-button size="small" icon="plus" @click="handleAddGraphic" :disabled="readonly" title="增加">增加</a-button>
        <a-button size="small" icon="delete" @click="handleDeleteGraphic" :disabled="readonly || selectedGraphicIndex === -1" title="删除">删除</a-button>
        <a-button size="small" icon="arrow-up" @click="handleMoveGraphicUp" :disabled="readonly || selectedGraphicIndex <= 0" title="上移">上移</a-button>
        <a-button size="small" icon="arrow-down" @click="handleMoveGraphicDown" :disabled="readonly || selectedGraphicIndex === -1 || selectedGraphicIndex >= graphics.length - 1" title="下移">下移</a-button>
      </div>
      <a-table :columns="graphicColumns" :data-source="graphics" :pagination="false" :row-key="(record, index) => index" size="small" :customRow="customGraphicRow" :scroll="{ y: '168px' }" class="graphic-table">
        <template slot="icn" slot-scope="text"><span>{{ text || '未设置' }}</span></template>
      </a-table>
    </div>
    <!-- 热点区域 -->
    <div class="hotspot-section">
      <div class="hotspot-toolbar">
        <span class="toolbar-title">【热点】</span>
        <a-button size="small" icon="plus" @click="handleAddHotspot" :disabled="readonly || selectedGraphicIndex === -1" title="增加">增加</a-button>
        <a-button size="small" icon="delete" @click="handleDeleteHotspot" :disabled="readonly || selectedHotspotIndex === -1" title="删除">删除</a-button>
        <a-button size="small" icon="arrow-up" @click="handleMoveHotspotUp" :disabled="readonly || selectedHotspotIndex <= 0" title="上移">上移</a-button>
        <a-button size="small" icon="arrow-down" @click="handleMoveHotspotDown" :disabled="readonly || selectedHotspotIndex === -1 || selectedHotspotIndex >= currentHotspots.length - 1" title="下移">下移</a-button>
        <a-button size="small" icon="download" @click="handleImportHotspots" :disabled="readonly || selectedGraphicIndex === -1" title="导入图形中包含的热点">导入</a-button>
        <a-button size="small" icon="save" @click="handleSaveHotspot" :disabled="readonly" title="保存">保存</a-button>
      </div>
      <a-table :columns="hotspotColumns" :data-source="currentHotspots" :pagination="false" :row-key="(record, index) => index" size="small" :customRow="customHotspotRow" :scroll="{ y: '200px' }" class="hotspot-table">
        <template slot="apsid" slot-scope="text, record, index">
          <a-input v-if="editingHotspotIndex === index" v-model="record.apsid" size="small" placeholder="apsID" :disabled="readonly" @pressEnter="endEdit" />
          <span v-else>{{ text }}</span>
        </template>
        <template slot="name" slot-scope="text, record, index">
          <a-input v-if="editingHotspotIndex === index" v-model="record.name" size="small" placeholder="aps名称" :disabled="readonly" @pressEnter="endEdit" />
          <span v-else>{{ text }}</span>
        </template>
        <template slot="id" slot-scope="text, record, index">
          <a-input v-if="editingHotspotIndex === index" v-model="record.id" size="small" placeholder="ID" :disabled="readonly" @pressEnter="endEdit" />
          <span v-else>{{ text }}</span>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GraphicDesigner',
  props: {
    graphics: { type: Array, default: () => [] },
    readonly: { type: Boolean, default: false }
  },
  data() {
    return {
      selectedGraphicIndex: -1,
      selectedHotspotIndex: -1,
      editingHotspotIndex: -1,
      graphicColumns: [
        { title: '序号', width: '60px', align: 'center', customRender: (text, record, index) => index + 1 },
        { title: 'ICN', dataIndex: 'icn', align: 'center', scopedSlots: { customRender: 'icn' } }
      ],
      hotspotColumns: [
        { title: '序号', width: '60px', align: 'center', customRender: (text, record, index) => index + 1 },
        { title: 'apsID', dataIndex: 'apsid', width: '30%', align: 'center', scopedSlots: { customRender: 'apsid' } },
        { title: 'aps名称', dataIndex: 'name', width: '30%', align: 'center', scopedSlots: { customRender: 'name' } },
        { title: 'ID', dataIndex: 'id', width: '30%', align: 'center', scopedSlots: { customRender: 'id' } }
      ]
    }
  },
  computed: {
    currentHotspots() {
      if (this.selectedGraphicIndex === -1 || !this.graphics[this.selectedGraphicIndex]) return []
      return this.graphics[this.selectedGraphicIndex].hotspots || []
    }
  },
  watch: {
    graphics: {
      deep: true,
      handler() {
        if (this.selectedGraphicIndex >= this.graphics.length) {
          this.selectedGraphicIndex = Math.max(0, this.graphics.length - 1)
        }
      }
    }
  },
  methods: {
    customGraphicRow(record, index) {
      return {
        on: { click: () => this.handleSelectGraphic(index) },
        style: { cursor: 'pointer', background: this.selectedGraphicIndex === index ? '#e6f7ff' : '' }
      }
    },
    customHotspotRow(record, index) {
      return {
        on: { click: () => this.handleSelectHotspot(index) },
        style: { cursor: 'pointer', background: this.selectedHotspotIndex === index ? '#e6f7ff' : '' }
      }
    },
    handleSelectGraphic(index) {
      this.selectedGraphicIndex = index
      this.selectedHotspotIndex = -1
      this.editingHotspotIndex = -1
      this.$emit('graphic-select', index)
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
    handleAddGraphic() {
      this.$emit('add-graphic')
    },
    handleDeleteGraphic() {
      if (this.selectedGraphicIndex === -1) {
        this.$message.warning('请先选择要删除的图形')
        return
      }
      this.$confirm({
        title: '确认',
        content: '确定要删除该图形？',
        onOk: () => {
          this.$emit('delete-graphic', this.selectedGraphicIndex)
          this.selectedGraphicIndex = -1
          this.selectedHotspotIndex = -1
          this.editingHotspotIndex = -1
        }
      })
    },
    handleMoveGraphicUp() {
      if (this.selectedGraphicIndex <= 0) {
        this.$message.warning('顶行无法上移!')
        return
      }
      this.$emit('move-graphic', { index: this.selectedGraphicIndex, direction: 'up' })
      this.selectedGraphicIndex -= 1
    },
    handleMoveGraphicDown() {
      if (this.selectedGraphicIndex >= this.graphics.length - 1) {
        this.$message.warning('底行无法下移!')
        return
      }
      this.$emit('move-graphic', { index: this.selectedGraphicIndex, direction: 'down' })
      this.selectedGraphicIndex += 1
    },
    handleAddHotspot() {
      if (this.selectedGraphicIndex === -1) {
        this.$message.warning('请先选择一个图形')
        return
      }
      this.endEdit()
      this.$emit('add-hotspot', this.selectedGraphicIndex)
      this.$nextTick(() => {
        const newIndex = this.currentHotspots.length - 1
        this.selectedHotspotIndex = newIndex
        this.editingHotspotIndex = newIndex
      })
    },
    handleDeleteHotspot() {
      if (this.selectedHotspotIndex === -1) {
        this.$message.warning('请先选择要删除的热点')
        return
      }
      this.$confirm({
        title: '确认',
        content: '确认要删除该热点？',
        onOk: () => {
          this.$emit('delete-hotspot', {
            graphicIndex: this.selectedGraphicIndex,
            hotspotIndex: this.selectedHotspotIndex
          })
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
      this.endEdit()
      const hotspots = this.currentHotspots
      const temp = hotspots[this.selectedHotspotIndex]
      hotspots.splice(this.selectedHotspotIndex, 1)
      hotspots.splice(this.selectedHotspotIndex - 1, 0, temp)
      this.selectedHotspotIndex -= 1
    },
    handleMoveHotspotDown() {
      if (this.selectedHotspotIndex >= this.currentHotspots.length - 1) {
        this.$message.warning('底行无法下移!')
        return
      }
      this.endEdit()
      const hotspots = this.currentHotspots
      const temp = hotspots[this.selectedHotspotIndex]
      hotspots.splice(this.selectedHotspotIndex, 1)
      hotspots.splice(this.selectedHotspotIndex + 1, 0, temp)
      this.selectedHotspotIndex += 1
    },
    handleImportHotspots() {
      if (this.selectedGraphicIndex === -1) {
        this.$message.warning('请先选择一个图形')
        return
      }
      this.endEdit()
      this.$emit('import-hotspots', this.selectedGraphicIndex)
    },
    handleSaveHotspot() {
      this.endEdit()
      this.$message.success('保存成功')
    }
  }
}
</script>

<style scoped lang="less">
.graphic-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;

  .graphic-section {
    flex: 0 0 auto;
    border-bottom: 1px solid #e8e8e8;
    margin-bottom: 12px;
    padding-bottom: 8px;

    .graphic-toolbar {
      display: flex;
      gap: 6px;
      padding: 8px 12px;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;

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

    .graphic-table {
      ::v-deep .ant-table {
        font-size: 14px;
      }

      ::v-deep .ant-table-thead > tr > th {
        background: #fafafa;
        font-weight: 600;
        padding: 10px 8px;
        border-bottom: 2px solid #e8e8e8 !important;
        font-size: 14px;
      }

      ::v-deep .ant-table-tbody > tr > td {
        padding: 8px;
        border-bottom: 1px solid #f0f0f0;
        text-align: center;
        font-size: 14px;
      }

      ::v-deep .ant-table-tbody > tr:hover {
        background: #f0f7ff !important;
      }
    }
  }

  .hotspot-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .hotspot-toolbar {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 8px 12px;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;
      flex-shrink: 0;

      .toolbar-title {
        font-weight: bold;
        font-size: 14px;
        margin-right: 8px;
      }

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

    .hotspot-table {
      flex: 1;
      overflow: hidden;

      ::v-deep .ant-table {
        font-size: 14px;
      }

      ::v-deep .ant-table-thead {
        border-bottom: 2px solid #e8e8e8 !important;
      }

      ::v-deep .ant-table-thead tr {
        border-bottom: 2px solid #e8e8e8 !important;
      }

      ::v-deep .ant-table-thead th {
        background: #fafafa;
        font-weight: 600;
        padding: 10px 8px;
        border-bottom: 2px solid #e8e8e8 !important;
        font-size: 14px;
      }

      ::v-deep .ant-table-tbody > tr > td {
        padding: 8px;
        border-bottom: 1px solid #f0f0f0;
        text-align: center;
        font-size: 14px;
      }

      ::v-deep .ant-table-tbody > tr:hover {
        background: #f0f7ff !important;
      }

      ::v-deep .ant-input {
        font-size: 14px;
        text-align: center;
      }
    }
  }
}
</style>
