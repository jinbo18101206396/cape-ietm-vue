<template>
  <div class="dm-attr-panel">

    <!-- ── 属性区 ─────────────────────────────────── -->
    <div class="panel-section panel-attrs">
      <div class="section-hdr">
        <a-icon type="profile" class="hdr-icon"/>
        <span class="hdr-title">属性</span>
        <span class="hdr-tag" v-if="node">&lt;{{ node.text }}&gt;</span>
        <span class="hdr-badge" v-if="node && attrList.length">{{ attrList.length }}</span>
      </div>

      <div v-if="!node" class="empty-tip">
        <a-icon type="select" class="empty-icon"/>
        <p>请在左侧选择元素</p>
      </div>
      <div v-else-if="attrList.length === 0" class="empty-tip">
        <a-icon type="minus-circle-o" class="empty-icon"/>
        <p>该元素无属性</p>
      </div>
      <div v-else class="attr-list">
        <div v-for="attr in attrList" :key="attr.name"
          class="attr-row" :class="{'attr-row--req': attr.required}">
          <div class="attr-label" :title="attr.name + (attr.pattern ? '  格式: ' + attr.pattern : '')">
            <span class="req-mark" v-if="attr.required">*</span>
            <span class="lbl-text">{{ attr.label }}</span>
          </div>
          <div class="attr-ctrl">
            <a-select v-if="attr.options" size="small" :allowClear="!attr.required" :disabled="readonly"
              class="ctrl-full"
              :value="attr._draft !== undefined ? attr._draft : attr.value"
              @change="v => { draft(attr, v == null ? '' : v); commit(attr, v) }">
              <a-select-option v-for="op in attr.options" :key="op" :value="op">{{ op }}</a-select-option>
            </a-select>
            <a-input v-else size="small" :disabled="readonly"
              class="ctrl-full"
              :placeholder="attr.pattern || ''"
              :value="attr._draft !== undefined ? attr._draft : attr.value"
              @change="e => draft(attr, e.target.value)"
              @pressEnter="() => commit(attr, attr._draft !== undefined ? attr._draft : attr.value)"
              @blur="() => commit(attr, attr._draft !== undefined ? attr._draft : attr.value)"/>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 元素区 ─────────────────────────────────── -->
    <div class="panel-section panel-elems">
      <div class="section-hdr">
        <a-icon type="apartment" class="hdr-icon"/>
        <span class="hdr-title">元素</span>
        <span class="hdr-hint">双击插入</span>
      </div>

      <div v-if="!node" class="empty-tip">
        <a-icon type="select" class="empty-icon"/>
        <p>请先选择元素</p>
      </div>
      <div v-else class="elem-body">
        <div class="elem-group">
          <div class="elem-group-hdr">
            <span>子元素</span>
            <span class="elem-count">{{ childElems.length }}</span>
          </div>
          <div class="elem-pills">
            <span v-if="childElems.length === 0" class="no-elems">无</span>
            <span v-for="c in childElems" :key="c.en"
              class="elem-pill pill-child" :title="c.en"
              @dblclick="$emit('insert-child', c.en)">{{ c.label }}</span>
          </div>
        </div>
        <div class="elem-group">
          <div class="elem-group-hdr">
            <span>同级元素</span>
            <span class="elem-count">{{ siblingElems.length }}</span>
          </div>
          <div class="elem-pills">
            <span v-if="siblingElems.length === 0" class="no-elems">无</span>
            <span v-for="c in siblingElems" :key="c.en"
              class="elem-pill pill-sibling" :title="c.en"
              @dblclick="$emit('insert-sibling', c.en)">{{ c.label }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { buildAttrList, getAddableChildren, getAddableSiblings } from '../utils/schemaDriver'
export default {
  name: 'DmAttrPanel',
  props: {
    node:     { type: Object,  default: null },
    schema:   { type: Object,  default: () => ({}) },
    nodeList: { type: Array,   default: () => [] },
    en2cnElem:{ type: Object,  default: () => ({}) },
    locale:   { type: String,  default: 'en' },
    readonly: { type: Boolean, default: false }
  },
  computed: {
    attrList()    { return this.node ? buildAttrList(this.node, this.schema, this.en2cnElem, this.locale) : [] },
    childElems()  { return this.node ? getAddableChildren(this.node, this.schema, this.nodeList, this.locale, this.en2cnElem) : [] },
    siblingElems(){ return this.node ? getAddableSiblings(this.node, this.schema, this.nodeList, this.locale, this.en2cnElem) : [] }
  },
  methods: {
    draft(attr, v) { this.$set(attr, '_draft', v) },
    commit(attr, v) {
      if (attr.required && (v == null || v === '')) {
        this.$message.error('该属性为必填项！'); return
      }
      if (attr.pattern && v && !new RegExp('^' + attr.pattern + '$').test(v)) {
        this.$message.error('验证未通过！'); return
      }
      this.$emit('set-property', {
        lineno: this.node.attributes && this.node.attributes.lineno,
        attrName: attr.name,
        attrVal: v == null ? '' : v
      })
    }
  }
}
</script>

<style lang="less" scoped>
@border:   #e8e8e8;
@hdr-bg:   #f7f8fa;
@primary:  #1890ff;
@req-red:  #f5222d;
@muted:    #8c8c8c;
@hover-bg: #f0f7ff;

/* ── 面板容器 ─────────────────────────── */
.dm-attr-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: #333;
}

/* ── 两区 ─────────────────────────────── */
.panel-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-attrs { border-bottom: 2px solid @border; }

/* ── 区域标题栏 ───────────────────────── */
.section-hdr {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  background: @hdr-bg;
  border-bottom: 1px solid @border;
  flex-shrink: 0;
}
.hdr-icon  { color: @primary; font-size: 13px; }
.hdr-title { font-weight: 600; font-size: 12px; color: #262626; }
.hdr-tag   {
  font-size: 11px; color: @primary;
  background: #e6f4ff; border: 1px solid #91caff;
  border-radius: 3px; padding: 0 5px; line-height: 18px;
}
.hdr-badge {
  margin-left: auto;
  min-width: 18px; height: 18px; line-height: 18px;
  padding: 0 5px; border-radius: 9px;
  background: @primary; color: #fff;
  font-size: 11px; text-align: center;
}
.hdr-hint {
  margin-left: auto;
  font-size: 11px; color: @muted;
  border: 1px solid #d9d9d9; border-radius: 3px;
  padding: 0 5px; line-height: 18px;
}

/* ── 空状态 ──────────────────────────── */
.empty-tip {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: #bfbfbf; text-align: center;
  padding: 16px 8px;
  p { margin: 6px 0 0; font-size: 12px; }
}
.empty-icon { font-size: 28px; }

/* ── 属性列表 ─────────────────────────── */
.attr-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.attr-row {
  display: flex;
  align-items: center;
  min-height: 28px;
  padding: 2px 10px;
  &:hover { background: @hover-bg; }
  &--req { background: #fff9f9; }
  &--req:hover { background: #fff0f0; }
}
.attr-label {
  width: 38%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  overflow: hidden;
}
.req-mark {
  color: @req-red;
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
}
.lbl-text {
  font-size: 11px;
  color: #595959;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attr-ctrl {
  flex: 1;
  min-width: 0;
}
.ctrl-full { width: 100%; }
.attr-ctrl /deep/ .ant-input       { font-size: 11px; }
.attr-ctrl /deep/ .ant-select      { font-size: 11px; }
.attr-ctrl /deep/ .ant-select-selection { font-size: 11px; }

/* ── 元素区内容 ──────────────────────── */
.elem-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.elem-group {}
.elem-group-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #595959;
  margin-bottom: 5px;
  padding-bottom: 3px;
  border-bottom: 1px solid @border;
}
.elem-count {
  min-width: 16px; height: 16px; line-height: 16px;
  padding: 0 5px; border-radius: 8px;
  background: #f0f0f0; color: @muted;
  font-size: 10px; text-align: center; font-weight: 400;
}
.elem-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.no-elems {
  font-size: 11px;
  color: #bfbfbf;
}
.elem-pill {
  display: inline-block;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  user-select: none;
}
.pill-child {
  background: #e6f4ff;
  color: #0958d9;
  border: 1px solid #91caff;
  &:hover { background: #1890ff; color: #fff; border-color: #1890ff; }
}
.pill-sibling {
  background: #f6ffed;
  color: #389e0d;
  border: 1px solid #b7eb8f;
  &:hover { background: #52c41a; color: #fff; border-color: #52c41a; }
}
</style>
