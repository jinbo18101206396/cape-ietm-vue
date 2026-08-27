<template>
  <a-modal
    title="插入图符"
    :visible="visible"
    :width="1200"
    :mask="false"
    :maskClosable="false"
    :destroyOnClose="true"
    wrapClassName="symbol-dialog"
    @cancel="handleClose">

    <div class="symbol-dialog-body">
      <!-- 上区：三栏 -->
      <div class="symbol-main">
        <!-- 西区：构型树 -->
        <div class="symbol-west">
          <config-tree @select="onTreeSelect"/>
        </div>

        <!-- 中区：ICN列表 -->
        <div class="symbol-center">
          <a-table
            :columns="columns"
            :data-source="tableData"
            :row-selection="rowSelection"
            :pagination="pagination"
            :loading="loading"
            :custom-row="customRow"
            :scroll="{ y: 320 }"
            :locale="{ emptyText: '该节点下暂无图符文件' }"
            row-key="id"
            size="small"
            @change="onTableChange"/>
        </div>

        <!-- 东区：预览 -->
        <div class="symbol-east">
          <div class="preview-title">预览</div>
          <icn-preview-pane :icn-id="previewIcnId" class="preview-pane"/>
        </div>
      </div>

      <!-- 下区：底部表单 -->
      <div class="symbol-form">
        <div class="original-size" v-if="originalSize">原始尺寸 {{ originalSize }}</div>
        <a-form layout="inline">
          <a-form-item label="宽">
            <a-input-number v-model="form.width" :min="1" style="width:90px" placeholder=""/>
          </a-form-item>
          <a-form-item label="高">
            <a-input-number v-model="form.height" :min="1" style="width:90px" placeholder=""/>
          </a-form-item>
          <a-form-item label="比例">
            <a-input-number v-model="form.scale" :min="1" :max="999" style="width:90px" placeholder=""/>
          </a-form-item>
        </a-form>
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
import IcnPreviewPane from './IcnPreviewPane'
import { getAction } from '@/api/manage'

export default {
  name: 'IetmSymbolDialog',
  components: { ConfigTree, IcnPreviewPane },
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return {
      loading: false,
      tableData: [],
      selectedRow: null,
      previewIcnId: '',
      originalSize: '',
      form: {
        width: '',
        height: '',
        scale: 100
      },
      // 缓存当前查询参数，用于分页切换
      currentCmNodeId: '',
      currentIncludeChildren: '0',
      columns: [
        { title: 'ICN', dataIndex: 'icn', width: 300, ellipsis: true },
        { title: '文件名称', dataIndex: 'fileName', ellipsis: true }
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
        // 打开弹窗时：清空历史状态
        this.resetState()
      }
    }
  },
  methods: {
    resetState() {
      this.tableData = []
      this.selectedRow = null
      this.previewIcnId = ''
      this.originalSize = ''
      this.form = { width: '', height: '', scale: 100 }
      this.currentCmNodeId = ''
      this.rowSelection.selectedRowKeys = []
      this.pagination.current = 1
      this.pagination.total = 0
    },

    onTreeSelect(node) {
      // 清空选中
      this.selectedRow = null
      this.rowSelection.selectedRowKeys = []
      this.clearPreview()

      // 缓存查询参数
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
      getAction('/icnmanage/ietmIcnManage/listSymbolsForDialog', params)
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
          console.error('listSymbolsForDialog error:', err)
          this.$message.error('查询ICN列表失败')
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
            // 单选模式下点击行相当于勾选
            this.rowSelection.selectedRowKeys = [record.id]
            this.selectedRow = record
            this.onRowSelect(record)
          }
        }
      }
    },

    onRowSelect(row) {
      // 🔍 调试日志（开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('=== 图符选择 ===')
        console.log('1. onRowSelect 触发')
        console.log('2. row =', row)
        console.log('3. row.id =', row ? row.id : 'row为空')
      }

      if (!row || !row.id) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ row 或 row.id 为空，预览中止')
        }
        this.$message.warning('该记录数据异常，无法预览')
        return
      }

      // 预览：把ICN ID交给预览面板，面板自行按类型（图片/CGM）鉴权加载
      if (process.env.NODE_ENV === 'development') {
        console.log('4. 设置 previewIcnId =', row.id)
      }
      this.previewIcnId = row.id

      // 根据后端返回的needDimension标志位判断是否加载尺寸
      if (row.needDimension === '1') {
        // 位图类型：加载尺寸
        this.loadFileProp(row.id)
      } else {
        // 矢量类型（cgm/svg）：清空表单
        this.clearForm()
      }
    },

    loadFileProp(id) {
      getAction('/icnmanage/ietmIcnManage/queryByIdWithAttachment', { id })
        .then(res => {
          if (!res.success || !res.result) {
            this.clearForm()
            return
          }

          const att = res.result.ietmAttachment
          if (!att || !att.fileProp) {
            this.$message.info('该图符无尺寸信息，请手动输入')
            this.clearForm()
            return
          }

          if (typeof att.fileProp !== 'string') {
            this.$message.warning('尺寸数据格式错误')
            this.clearForm()
            return
          }

          const parts = att.fileProp.split(',')
          if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
            this.$message.warning('尺寸数据格式错误，请手动输入')
            this.clearForm()
            return
          }

          const w = parseInt(parts[0], 10)
          const h = parseInt(parts[1], 10)

          // 范围校验：1-100000
          if (w <= 0 || h <= 0 || w > 100000 || h > 100000) {
            this.$message.warning('尺寸数据异常（有效范围：1-100000），请手动输入')
            this.clearForm()
            return
          }

          // 成功填充
          this.form.width = w
          this.form.height = h
          this.form.scale = 100
          this.originalSize = `${w}×${h}`
        })
        .catch(err => {
          console.error('queryByIdWithAttachment error:', err)
          this.$message.error('获取文件尺寸失败')
          this.clearForm()
        })
    },

    clearForm() {
      this.form = { width: '', height: '', scale: 100 }
      this.originalSize = ''
    },

    clearPreview() {
      this.previewIcnId = ''
      this.clearForm()
    },

    escapeXml(str) {
      if (!str && str !== 0) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    },

    handleConfirm() {
      if (!this.selectedRow) {
        this.$message.warning('请选择一个图符文件')
        return
      }

      // 校验必填属性：infoEntityIdent（ICN编码）
      if (!this.selectedRow.icn) {
        this.$message.error('图符ICN编码为空，无法插入')
        return
      }

      // 生成 XML（符合S1000D 4.0 schema + XML转义防注入）
      let xml = `<symbol infoEntityIdent="${this.escapeXml(this.selectedRow.icn)}"`
      if (this.form.width) xml += ` reproductionWidth="${this.escapeXml(this.form.width)}"`
      if (this.form.height) xml += ` reproductionHeight="${this.escapeXml(this.form.height)}"`
      if (this.form.scale) xml += ` reproductionScale="${this.escapeXml(this.form.scale)}"`
      xml += `></symbol>`

      this.$emit('insert', xml)
      this.handleClose()
    },

    handleClose() {
      this.resetState()
      this.$emit('update:visible', false)
    }
  }
}
</script>

<style lang="less" scoped>
.symbol-dialog-body {
  display: flex;
  flex-direction: column;
  height: 520px;
}

.symbol-main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.symbol-west {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e8e8e8;
  padding-right: 12px;
  margin-right: 12px;
  overflow: hidden;
}

.symbol-center {
  flex: 1;
  min-width: 0;
  padding: 0 12px;
}

.symbol-east {
  width: 260px;
  flex-shrink: 0;
  border-left: 1px solid #e8e8e8;
  padding-left: 12px;
  display: flex;
  flex-direction: column;
}

.preview-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
}

.preview-pane {
  flex: 1;
  min-height: 0;
}

.symbol-form {
  height: 80px;
  flex-shrink: 0;
  padding: 12px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
  display: flex;
  align-items: center;
  gap: 16px;
}

.original-size {
  color: #666;
  font-size: 13px;
  margin-right: 12px;
  white-space: nowrap;
}

/deep/ .ant-table-thead > tr > th {
  background: #fafafa;
  font-weight: 600;
  padding: 6px 8px;
}

/deep/ .ant-table-tbody > tr > td {
  padding: 6px 8px;
}
</style>
