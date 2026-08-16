<template>
  <a-modal
    title="对象列表"
    :visible="visible"
    :width="760"
    :mask="false"
    :maskClosable="false"
    :destroyOnClose="true"
    wrapClassName="dm-idlist-dialog"
    @cancel="handleClose">

    <div class="idlist-body">
      <div class="idlist-filter">
        <a-radio-group v-model="filter" size="small" button-style="solid">
          <a-radio-button value="all">全部 <b>{{ items.length }}</b></a-radio-button>
          <a-radio-button value="id">ID元素 <b>{{ countBy('id') }}</b></a-radio-button>
          <a-radio-button value="dmRef">引用DM <b>{{ countBy('dmRef') }}</b></a-radio-button>
          <a-radio-button value="icn">图形ICN <b>{{ countBy('icn') }}</b></a-radio-button>
        </a-radio-group>
        <span class="idlist-tip"><a-icon type="info-circle"/> 双击任意行定位到源码对应位置</span>
      </div>
      <a-table
        class="idlist-table"
        :columns="columns"
        :data-source="filteredItems"
        :pagination="pagination"
        :custom-row="customRow"
        :scroll="tableScroll"
        :locale="{ emptyText: emptyText }"
        row-key="key"
        size="small">
        <a-tag slot="typeCol" slot-scope="text, r" :color="typeColor(r.type)" class="type-tag">{{ r.typeLabel }}</a-tag>
        <code slot="tagCol" slot-scope="text" class="el-chip">&lt;{{ text }}&gt;</code>
        <span slot="refCol" slot-scope="text" class="ref-val" :class="{ 'ref-missing': isMissing(text) }">{{ text }}</span>
        <span slot="lineCol" slot-scope="text" class="line-pill"><a-icon type="enter"/>{{ text }}</span>
      </a-table>
    </div>

    <template slot="footer">
      <a-button @click="handleClose">关闭</a-button>
    </template>
  </a-modal>
</template>

<script>
// 对象列表弹窗（§14.8）：只读。遍历当前 DM 的 nodeList，收集三类对象：
//   ① 带 id 属性的元素  ② dmRef 引用  ③ graphic/symbol 图形(ICN)
// 双击行 emit('locate', 编辑器行号) 由父组件调用 locateByLineno 定位，弹窗不关闭。
const TYPE_LABEL = { id: 'ID元素', dmRef: '引用DM', icn: '图形ICN' }

export default {
  name: 'DmIdListModal',
  data() {
    return {
      visible: false,
      filter: 'all',
      items: [],
      columns: [
        { title: '类型', dataIndex: 'typeLabel', width: 84, align: 'center', scopedSlots: { customRender: 'typeCol' } },
        { title: '元素', dataIndex: 'tag', width: 120, ellipsis: true, scopedSlots: { customRender: 'tagCol' } },
        // 标识/引用不设 width → 占据剩余全部空间，DMC 长串给足展示宽度
        { title: '标识 / 引用', dataIndex: 'ref', ellipsis: true, scopedSlots: { customRender: 'refCol' } },
        { title: '行号', dataIndex: 'editorLine', width: 76, align: 'center', scopedSlots: { customRender: 'lineCol' } }
      ],
      pagination: { pageSize: 20, hideOnSinglePage: true, showTotal: t => `共 ${t} 条` }
    }
  },
  computed: {
    filteredItems() {
      return this.filter === 'all' ? this.items : this.items.filter(i => i.type === this.filter)
    },
    // 空态文案区分：整篇无对象 vs 当前筛选无匹配
    emptyText() {
      if (this.items.length === 0) return '当前DM无可列出的对象'
      return '当前筛选无匹配对象'
    },
    // 高度自适应：行数少时随内容收缩（不留大片空白）；超过阈值才固定滚动区
    // 每行约 40px，表头约 39px；11 行以上锁定 440px 内滚动
    tableScroll() {
      return this.filteredItems.length > 11 ? { y: 440 } : undefined
    }
  },
  methods: {
    // 由父组件调用：传入解析好的 nodeList 与 linenoOffset（dmodule 起始行）
    show(nodeList, linenoOffset) {
      this.filter = 'all'
      this.items = this.collect(nodeList || [], linenoOffset || 1)
      this.visible = true
    },
    handleClose() { this.visible = false },
    countBy(type) { return this.items.filter(i => i.type === type).length },
    typeColor(type) { return { id: 'blue', dmRef: 'green', icn: 'orange' }[type] || 'default' },
    isMissing(v) { return typeof v === 'string' && v.charAt(0) === '(' },

    // 三遍扫描 nodeList，nodeList 已按文档顺序、lineno 相对 dmodule（=1）
    collect(nodeList, offset) {
      const rows = []
      let seq = 0
      const toEditorLine = n => (n.attributes.lineno || 1) - 1 + offset
      nodeList.forEach((n, idx) => {
        const attrs = this._attrs(n)
        // ① id 元素
        if (attrs.id) {
          rows.push({ key: 'k' + seq++,
type: 'id',
typeLabel: TYPE_LABEL.id,
            tag: n.text,
ref: attrs.id,
editorLine: toEditorLine(n) })
        }
        // ② dmRef
        if (n.text === 'dmRef') {
          rows.push({ key: 'k' + seq++,
type: 'dmRef',
typeLabel: TYPE_LABEL.dmRef,
            tag: n.text,
ref: this._dmCode(nodeList, idx) || '(无dmCode)',
editorLine: toEditorLine(n) })
        }
        // ③ graphic / symbol（图形 ICN）
        if (n.text === 'graphic' || n.text === 'symbol') {
          rows.push({ key: 'k' + seq++,
type: 'icn',
typeLabel: TYPE_LABEL.icn,
            tag: n.text,
ref: attrs.infoEntityIdent || '(无ICN)',
editorLine: toEditorLine(n) })
        }
      })
      return rows.sort((a, b) => a.editorLine - b.editorLine)
    },

    // 解析 nodeList 节点的 attrval（JSON 字符串）
    _attrs(n) {
      try { return JSON.parse((n.attributes && n.attributes.attrval) || '{}') } catch (e) { return {} }
    },

    // 从 dmRef 子树内的 dmCode 节点重组 S1000D DMC 字符串（用于展示）
    _dmCode(nodeList, dmRefIdx) {
      const base = nodeList[dmRefIdx].attributes.path + '/'
      for (let i = dmRefIdx + 1; i < nodeList.length; i++) {
        const p = nodeList[i].attributes.path
        if (p.indexOf(base) !== 0) break // 离开该 dmRef 子树
        if (nodeList[i].text === 'dmCode') {
          const a = this._attrs(nodeList[i])
          const parts = [a.modelIdentCode, a.systemDiffCode, a.systemCode, a.subSystemCode,
            a.subSubSystemCode, a.assyCode, a.disassyCode, a.disassyCodeVariant,
            a.infoCode, a.infoCodeVariant, a.itemLocationCode]
          return 'DMC-' + parts.filter(x => x != null && x !== '').join('-')
        }
      }
      return ''
    },

    customRow(record) {
      return { on: { dblclick: () => this.$emit('locate', record.editorLine) } }
    }
  }
}
</script>

<style lang="less" scoped>
/* 高度随内容自适应：不再写死 420/440px，避免少数据时下方大片空白。
   仅给一个温和下限，保证空态提示不显局促。 */
.idlist-body { min-height: 180px; }

.idlist-filter {
  display: flex;
  align-items: center;
  margin-bottom: 14px;

  /* 计数用弱化的圆角底色，与文字拉开层次 */
  b {
    font-weight: 600;
    margin-left: 4px;
    padding: 0 5px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.06);
    font-size: 12px;
  }
  /deep/ .ant-radio-button-wrapper-checked b {
    background: rgba(255, 255, 255, 0.28);
    color: #fff;
  }
}
.idlist-tip {
  color: #8c8c8c;
  font-size: 12px;
  margin-left: auto;
  white-space: nowrap;
}

.idlist-table {
  /deep/ .ant-table-thead > tr > th {
    background: #fafafa;
    font-weight: 600;
    padding: 8px 10px;
    color: #595959;
  }
  /deep/ .ant-table-tbody > tr > td { padding: 7px 10px; }
  /deep/ .ant-table-tbody > tr { cursor: pointer; }
  /deep/ .ant-table-tbody > tr:hover > td { background: #e6f7ff; }
}

/* 类型标签：去掉默认外边距，居中 */
.type-tag { margin: 0; }

/* 元素名代码片：等宽字体 + 浅底 */
.el-chip {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #c41d7f;
  background: #fff0f6;
  border: 1px solid #ffd6e7;
  border-radius: 3px;
  padding: 1px 6px;
}

/* 标识/引用值：等宽，占位值弱化 */
.ref-val {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #262626;
}
.ref-missing {
  color: #bfbfbf;
  font-style: italic;
  font-family: inherit;
}

/* 行号胶囊：暗示可点击定位 */
.line-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: #1890ff;
  background: #e6f7ff;
  border-radius: 10px;
  padding: 1px 8px;
  .anticon { font-size: 11px; }
}
</style>
