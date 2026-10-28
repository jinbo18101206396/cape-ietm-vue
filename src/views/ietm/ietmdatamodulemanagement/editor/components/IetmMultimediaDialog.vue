<template>
  <a-modal
    title="插入多媒体"
    :visible="visible"
    :width="1500"
    :mask="false"
    :maskClosable="false"
    :destroyOnClose="true"
    wrapClassName="multimedia-dialog"
    @cancel="handleClose">

    <div class="multimedia-dialog-body">
      <!-- 上区：二栏 -->
      <div class="multimedia-main">
        <!-- 左区：构型树 -->
        <div class="multimedia-west">
          <config-tree @select="onTreeSelect"/>
        </div>

        <!-- 右区：多媒体ICN列表 -->
        <div class="multimedia-center">
          <a-table
            :columns="columns"
            :data-source="tableData"
            :row-selection="rowSelection"
            :pagination="pagination"
            :loading="loading"
            :custom-row="customRow"
            :scroll="{ y: 320, x: 930 }"
            :locale="{ emptyText: '该节点下暂无多媒体文件' }"
            row-key="id"
            size="small"
            @change="onTableChange"/>
        </div>
      </div>
    </div>

    <template slot="footer">
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script>
import ConfigTree from '../../components/ConfigTree'
import { getAction } from '@/api/manage'

export default {
  name: 'IetmMultimediaDialog',
  components: { ConfigTree },
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return {
      loading: false,
      tableData: [],
      selectedRow: null,
      // 缓存当前查询参数，用于分页切换
      currentCmNodeId: '',
      currentIncludeChildren: '0',
      columns: [
        { title: 'ICN', dataIndex: 'icn', width: 480, ellipsis: true, align: 'center' },
        { title: '文件名称', dataIndex: 'fileName', width: 450, ellipsis: false, align: 'center' }
      ],
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
        showTotal: (total) => `共 ${total} 条`
      },
      rowSelection: {
        type: 'radio',
        selectedRowKeys: [],
        onChange: (keys, rows) => {
          this.selectedRow = rows[0]
          if (rows[0]) {
            this.onRowSelect(rows[0])
          }
        }
      }
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.resetState()
      }
    }
  },
  methods: {
    open() {
      this.$emit('update:visible', true)
      this.resetState()
    },

    resetState() {
      this.tableData = []
      this.selectedRow = null
      this.currentCmNodeId = ''
      this.rowSelection.selectedRowKeys = []
      this.pagination.current = 1
      this.pagination.total = 0
    },

    onTreeSelect(node) {
      this.selectedRow = null
      this.rowSelection.selectedRowKeys = []

      this.currentCmNodeId = node.nodeId
      this.currentIncludeChildren = node.showChildren ? '1' : '0'

      const params = {
        cmNodeId: this.currentCmNodeId,
        includeChildren: this.currentIncludeChildren,
        pageNo: 1,
        pageSize: this.pagination.pageSize
      }
      this.loadList(params)
    },

    loadList(params) {
      this.loading = true
      getAction('/icnmanage/ietmIcnManage/listMultimediaForDialog', params)
        .then(res => {
          if (res.success) {
            this.tableData = res.result.records || []
            this.pagination.total = res.result.total || 0
            this.pagination.current = res.result.current || 1
          } else {
            this.$message.error(res.message || '查询失败')
          }
        })
        .catch(err => {
          console.error('listMultimediaForDialog error:', err)
          this.$message.error('查询多媒体列表失败')
        })
        .finally(() => {
          this.loading = false
        })
    },

    onTableChange(pagination) {
      if (!this.currentCmNodeId) {
        this.$message.warning('请先选择构型节点')
        return
      }
      const params = {
        cmNodeId: this.currentCmNodeId,
        includeChildren: this.currentIncludeChildren,
        pageNo: pagination.current,
        pageSize: pagination.pageSize
      }
      this.loadList(params)
    },

    customRow(record) {
      return {
        on: {
          click: () => {
            this.selectedRow = record
            this.rowSelection.selectedRowKeys = [record.id]
            this.onRowSelect(record)
          }
        }
      }
    },

    onRowSelect(row) {
      if (row && row.id) {
        // 预览功能已移除
        // 仅用于选择行时的回调
      }
    },

    handleClose() {
      this.$emit('update:visible', false)
      this.resetState()
    },

    handleConfirm() {
      if (!this.selectedRow) {
        this.$message.warning('请先选择一个多媒体文件')
        return
      }

      const icn = this.selectedRow.icn
      if (!icn) {
        this.$message.error('ICN编号为空')
        return
      }

      // 获取文件名称（保持与多媒体对象列表一致）
      const fileName = this.selectedRow.fileName || ''

      // 生成symbol XML（与IetmSymbolDialog保持一致的格式）
      const symbolXml = `<symbol infoEntityIdent="${icn}"/>`

      // 传递 { symbolXml, icn, fileName } 让父组件能够获取完整的多媒体信息
      this.$emit('insert', { symbolXml, icn, fileName })
      this.handleClose()
    }
  }
}
</script>

<style lang="less" scoped>
.multimedia-dialog-body {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.multimedia-main {
  flex: 1;
  display: flex;
  gap: 10px;
  overflow: auto;
}

.multimedia-west {
  width: 380px;
  flex-shrink: 0;
  border: 1px solid #e8e8e8;
  border-radius: 2px;
  overflow: auto;
}

.multimedia-center {
  flex: 1;
  border: 1px solid #e8e8e8;
  border-radius: 2px;
  overflow: hidden;
}

/* 优化表格单元格显示 */
.multimedia-dialog {
  /deep/ .ant-table td {
    padding: 8px 12px !important;
    word-break: break-all;
    text-align: center !important;
  }

  /deep/ .ant-table-small td {
    padding: 6px 12px !important;
    text-align: center !important;
  }

  /* 文件名列允许换行显示完整名称 */
  /deep/ .ant-table-cell {
    white-space: normal !important;
    line-height: 1.5;
    text-align: center !important;
  }
}
</style>

