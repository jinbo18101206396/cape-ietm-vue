<template>
  <!-- 校验情况对话框（§17.3）：非模态（:mask=false），标题栏可拖拽，可与编辑器同时操作 -->
  <a-modal
    :title="null"
    :visible="visible"
    :width="1000"
    :mask="false"
    :maskClosable="false"
    :footer="null"
    :closable="false"
    :bodyStyle="{ padding: '0' }"
    :dialogStyle="dialogStyle"
    wrapClassName="dm-validate-wrap"
    @cancel="close">
    <div class="dm-validate-panel">
      <!-- 可拖拽标题栏 -->
      <div class="dvp-header" @mousedown="onDragStart">
        <span class="dvp-title"><a-icon type="check-circle" />校验情况</span>
        <a-icon class="dvp-close" type="close" @click="close" />
      </div>
      <!-- 错误列表：表头居中（CSS），内容左对齐（列 align:left），信息列自动换行 -->
      <div class="dvp-body">
        <a-table
          :columns="cols"
          :dataSource="errors"
          size="small"
          bordered
          :rowKey="(r, i) => i"
          :pagination="false"
          :scroll="{ y: 480 }"
          :customRow="onCustomRow"
          :rowClassName="rowClassName" />
      </div>
      <!-- 底部按钮：定位 / 关闭（§17.3） -->
      <div class="dvp-footer">
        <a-button type="primary" size="small" @click="locate">定位</a-button>
        <a-button size="small" @click="close">关闭</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script>
export default {
  name: 'DmValidatePanel',
  data() {
    return {
      visible: false,
      errors: [],
      selectedIndex: -1,
      // 对话框位置（可拖拽），初始水平居中、距顶 80px；去掉 antd 默认 24px 底部留白
      dialogStyle: { top: '80px', paddingBottom: '0' },
      cols: [
        // 序号/行号内容居中；信息内容左对齐；表头统一由 CSS !important 居中
        { title: '序号', width: 64, align: 'center', customRender: (t, r, i) => i + 1 },
        { title: '行号', dataIndex: 'lineno', width: 72, align: 'center', customRender: t => (t > 0 ? t : '-') },
        { title: '信息', dataIndex: 'info', align: 'left' }
      ]
    }
  },
  methods: {
    /** 打开对话框并填充错误列表（rows 为已完成行号换算的 {lineno, info}） */
    show(errors) {
      this.errors = errors || []
      this.selectedIndex = -1
      this.visible = true
    },
    close() { this.visible = false },

    // ── 单选与定位（§17.4） ─────────────────────────────────────────────
    onCustomRow(record, index) {
      return {
        on: {
          click: () => { this.selectedIndex = index },
          dblclick: () => { this.selectedIndex = index; this.locate() }
        }
      }
    },
    rowClassName(record, index) {
      return index === this.selectedIndex ? 'dvp-row-selected' : ''
    },
    locate() {
      if (this.selectedIndex < 0) { this.$message.info('请选择一行数据。'); return }
      this.$emit('locate', this.errors[this.selectedIndex])
    },

    // ── 标题栏拖拽 ──────────────────────────────────────────────────────
    onDragStart(e) {
      const wrap = document.querySelector('.dm-validate-wrap .ant-modal')
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const startX = e.clientX; const startY = e.clientY
      const startLeft = rect.left; const startTop = rect.top
      const onMove = ev => {
        const left = startLeft + (ev.clientX - startX)
        const top = Math.max(0, startTop + (ev.clientY - startY))
        this.dialogStyle = { top: top + 'px', left: left + 'px', margin: '0', paddingBottom: 0 }
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }
  }
}
</script>

<style scoped>
.dm-validate-panel { display: flex; flex-direction: column; }
.dvp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; cursor: move; user-select: none;
  border-bottom: 1px solid #e8e8e8; background: #fafafa;
}
.dvp-title { font-weight: 600; }
.dvp-title .anticon { margin-right: 6px; color: #1890ff; }
.dvp-close { cursor: pointer; color: #999; }
.dvp-close:hover { color: #333; }
.dvp-body { padding: 12px 16px; }
.dvp-body >>> .ant-table-tbody > tr > td { line-height: 1.6; word-break: break-word; }
/* 表头居中：antd 把列 align:'left' 渲染成 th 的行内样式(text-align:left)，
   行内样式优先级高于普通规则，故用 !important 覆盖；内容左对齐仍由列 align:'left' 决定 */
.dvp-body >>> .ant-table-thead > tr > th { text-align: center !important; }
.dvp-footer {
  text-align: right; padding: 8px 12px;
  border-top: 1px solid #e8e8e8;
}
.dvp-footer .ant-btn { margin-left: 8px; }
</style>
<style>
/* 非模态：包裹层不拦截鼠标事件，仅对话框本体可交互（可同时操作编辑器） */
.dm-validate-wrap { pointer-events: none; }
.dm-validate-wrap .ant-modal { pointer-events: auto; }
.dm-validate-wrap .dvp-row-selected > td { background: #e6f7ff !important; }
</style>
