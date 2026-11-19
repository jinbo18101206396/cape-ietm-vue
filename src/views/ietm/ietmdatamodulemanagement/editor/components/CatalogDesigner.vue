<template>
  <div class="catalog-designer">
    <!-- 工具栏 -->
    <div class="catalog-toolbar">
      <a-button type="primary" size="small" @click="handleAdd" :disabled="readonly">
        <a-icon type="plus" />增加
      </a-button>
      <a-button size="small" @click="handleMoveUp" :disabled="readonly || editingRowIndex < 0">
        <a-icon type="arrow-up" />上移
      </a-button>
      <a-button size="small" @click="handleMoveDown" :disabled="readonly || editingRowIndex < 0">
        <a-icon type="arrow-down" />下移
      </a-button>
      <a-button size="small" @click="handleDelete" :disabled="readonly || editingRowIndex < 0" type="danger">
        <a-icon type="delete" />删除
      </a-button>
      <a-button size="small" @click="endEdit" :disabled="readonly" type="primary" style="margin-left: 20px;">
        <a-icon type="save" />保存
      </a-button>
    </div>

    <!-- 目录表格 -->
    <div class="catalog-table-wrapper">
      <table class="catalog-table" v-if="columns && columns.length > 0">
        <thead>
          <tr>
            <th style="width: 50px;">序号</th>
            <th v-for="(col, idx) in columns" :key="idx" :style="{width: col.width + 'px'}">
              {{ col.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIdx) in catalogData"
            :key="rowIdx"
            :class="{active: editingRowIndex === rowIdx}"
            @click="handleRowClick(rowIdx)"
          >
            <td class="row-number">{{ rowIdx + 1 }}</td>
            <td v-for="(col, colIdx) in columns" :key="colIdx">
              <input
                v-if="editingRowIndex === rowIdx"
                type="text"
                class="cell-input"
                :value="row[col.field]"
                @input="e => handleCellChange(rowIdx, col.field, e.target.value)"
                :readonly="readonly"
              />
              <span v-else class="cell-text">{{ row[col.field] || '' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-tip">未配置列定义</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CatalogDesigner',
  props: {
    catalogs: {
      type: Array,
      default: () => []
    },
    columns: {
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
      catalogData: [],
      editingRowIndex: -1
    }
  },
  watch: {
    catalogs: {
      handler(newVal) {
        this.catalogData = JSON.parse(JSON.stringify(newVal || []))
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    /**
     * 行点击：先结束上一行编辑，再进入当前行编辑
     */
    handleRowClick(rowIdx) {
      if (this.readonly) return
      // 先结束之前的编辑
      this.endEdit()
      // 设置新的编辑行
      this.editingRowIndex = rowIdx
    },

    /**
     * 单元格值变更（受控输入模式）
     */
    handleCellChange(rowIdx, field, value) {
      this.$set(this.catalogData[rowIdx], field, value)
    },

    /**
     * 增加行
     */
    handleAdd() {
      this.endEdit()
      const newRow = {}
      this.columns.forEach(col => {
        newRow[col.field] = ''
      })
      this.catalogData.push(newRow)
      this.editingRowIndex = this.catalogData.length - 1
    },

    /**
     * 上移
     */
    handleMoveUp() {
      const idx = this.editingRowIndex
      if (idx <= 0) return
      const temp = this.catalogData[idx]
      this.$set(this.catalogData, idx, this.catalogData[idx - 1])
      this.$set(this.catalogData, idx - 1, temp)
      this.editingRowIndex = idx - 1
    },

    /**
     * 下移
     */
    handleMoveDown() {
      const idx = this.editingRowIndex
      if (idx < 0 || idx >= this.catalogData.length - 1) return
      const temp = this.catalogData[idx]
      this.$set(this.catalogData, idx, this.catalogData[idx + 1])
      this.$set(this.catalogData, idx + 1, temp)
      this.editingRowIndex = idx + 1
    },

    /**
     * 删除行
     */
    handleDelete() {
      const idx = this.editingRowIndex
      if (idx < 0) return
      this.$confirm({
        title: '确认删除',
        content: `确定删除第 ${idx + 1} 行吗？`,
        onOk: () => {
          this.catalogData.splice(idx, 1)
          this.editingRowIndex = -1
        }
      })
    },

    /**
     * 结束编辑（保存按钮 + 内部调用）
     */
    endEdit() {
      this.editingRowIndex = -1
    },

    /**
     * 公开方法：重新加载数据
     */
    reload(rows) {
      this.catalogData = JSON.parse(JSON.stringify(rows || []))
      this.editingRowIndex = -1
    },

    /**
     * 公开方法：获取当前目录数据
     */
    getCatalogs() {
      return JSON.parse(JSON.stringify(this.catalogData))
    }
  }
}
</script>

<style scoped>
.catalog-designer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.catalog-toolbar {
  padding: 8px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.catalog-toolbar .ant-btn {
  margin-right: 8px;
}

.catalog-table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.catalog-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e8e8e8;
  background: white;
}

.catalog-table th,
.catalog-table td {
  border: 1px solid #e8e8e8;
  padding: 4px 8px;
  text-align: left;
  vertical-align: middle;
}

.catalog-table th {
  background: #fafafa;
  font-weight: 600;
  font-size: 13px;
  text-align: center;
  white-space: nowrap;
}

.catalog-table tbody tr {
  cursor: pointer;
}

.catalog-table tbody tr:hover {
  background: #f0f7ff;
}

.catalog-table tbody tr.active {
  background: #e6f7ff;
}

.row-number {
  text-align: center;
  color: #999;
  font-size: 12px;
}

.cell-input {
  width: 100%;
  border: 1px solid #40a9ff;
  padding: 2px 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.cell-input:focus {
  outline: none;
  border-color: #1890ff;
}

.cell-text {
  display: block;
  font-size: 13px;
  min-height: 20px;
}

.empty-tip {
  text-align: center;
  color: #999;
  padding: 40px;
  font-size: 14px;
}
</style>
