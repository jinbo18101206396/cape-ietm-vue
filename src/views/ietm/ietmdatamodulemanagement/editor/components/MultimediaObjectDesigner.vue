<template>
  <div class="object-designer">
    <!-- 多媒体对象工具栏 -->
    <div class="object-toolbar">
      <a-button size="small" icon="plus" @click="handleAddObject" :disabled="readonly" title="增加">增加</a-button>
      <a-button size="small" icon="delete" @click="handleDeleteObject" :disabled="readonly || selectedObjectIndex === -1" title="删除">删除</a-button>
      <a-button size="small" icon="arrow-up" @click="handleMoveObjectUp" :disabled="readonly || selectedObjectIndex <= 0" title="上移">上移</a-button>
      <a-button size="small" icon="arrow-down" @click="handleMoveObjectDown" :disabled="readonly || selectedObjectIndex === -1 || selectedObjectIndex >= multimediaObjects.length - 1" title="下移">下移</a-button>
    </div>

    <!-- 多媒体对象表格 -->
    <a-table
      :columns="objectColumns"
      :data-source="multimediaObjects"
      :pagination="false"
      :row-key="(record, index) => index"
      size="small"
      :customRow="customObjectRow"
      :scroll="{ y: '400px' }"
      class="object-table">
      <template slot="icn" slot-scope="text">
        <span>{{ text || '未设置' }}</span>
      </template>
      <template slot="filename" slot-scope="text">
        <span>{{ text || '-' }}</span>
      </template>
    </a-table>
  </div>
</template>

<script>
export default {
  name: 'MultimediaObjectDesigner',

  props: {
    multimediaObjects: { type: Array, default: () => [] },
    readonly: { type: Boolean, default: false }
  },

  data() {
    return {
      selectedObjectIndex: -1,
      objectColumns: [
        { title: '序号', width: '60px', align: 'center', customRender: (text, record, index) => index + 1 },
        { title: 'ICN', dataIndex: 'icn', align: 'center', scopedSlots: { customRender: 'icn' } },
        { title: '文件名称', dataIndex: 'filename', align: 'center', scopedSlots: { customRender: 'filename' } }
      ]
    }
  },

  watch: {
    multimediaObjects: {
      deep: true,
      handler() {
        if (this.selectedObjectIndex >= this.multimediaObjects.length) {
          this.selectedObjectIndex = Math.max(0, this.multimediaObjects.length - 1)
        }
      }
    }
  },

  methods: {
    customObjectRow(record, index) {
      return {
        on: {
          click: () => this.handleSelectObject(index),
          // 双击编辑可以在将来扩展
        },
        style: {
          cursor: 'pointer',
          background: this.selectedObjectIndex === index ? '#e6f7ff' : ''
        }
      }
    },

    handleSelectObject(index) {
      this.selectedObjectIndex = index
      this.$emit('object-select', index)
    },

    handleAddObject() {
      this.$emit('add-object')
    },

    handleDeleteObject() {
      if (this.selectedObjectIndex === -1) {
        this.$message.warning('请先选择要删除的多媒体对象')
        return
      }

      this.$confirm({
        title: '确认',
        content: '确定要删除该多媒体对象？',
        onOk: () => {
          this.$emit('delete-object', this.selectedObjectIndex)
          this.selectedObjectIndex = -1
        }
      })
    },

    handleMoveObjectUp() {
      if (this.selectedObjectIndex <= 0) {
        this.$message.warning('顶行无法上移!')
        return
      }
      this.$emit('move-object', { index: this.selectedObjectIndex, direction: 'up' })
      this.selectedObjectIndex -= 1
    },

    handleMoveObjectDown() {
      if (this.selectedObjectIndex >= this.multimediaObjects.length - 1) {
        this.$message.warning('底行无法下移!')
        return
      }
      this.$emit('move-object', { index: this.selectedObjectIndex, direction: 'down' })
      this.selectedObjectIndex += 1
    }
  }
}
</script>

<style scoped lang="less">
.object-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.object-toolbar {
  padding: 10px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  gap: 8px;
}

.object-table {
  flex: 1;

  /deep/ .ant-table-tbody > tr {
    cursor: pointer;

    &:hover {
      background: #f5f5f5;
    }
  }

  /* 表格单元格居中对齐 */
  /deep/ .ant-table td {
    text-align: center !important;
  }

  /deep/ .ant-table th {
    text-align: center !important;
  }

  /deep/ .ant-table-cell {
    text-align: center !important;
  }
}
</style>
