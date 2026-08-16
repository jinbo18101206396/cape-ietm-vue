<template>
  <div class="dm-tree">
    <a-tree :treeData="treeData" :selectedKeys="selectedKeys"
            :expandedKeys.sync="expandedKeys"
            showIcon @select="onSelect" @dblclick="onDblClick" @rightClick="onRightClick">
      <a-icon slot="switcherIcon" type="down"/>
    </a-tree>
    <!-- 右键菜单 -->
    <a-dropdown :visible="menuVisible" :trigger="[]">
      <div :style="menuStyle"></div>
      <a-menu slot="overlay" @click="onMenuClick">
        <a-menu-item key="__delete__" :disabled="readonly">
          <a-icon type="delete"/> 删除此元素
        </a-menu-item>
        <a-menu-divider v-if="addableChildren.length"/>
        <a-menu-item v-for="c in addableChildren" :key="'add:'+c.en" :disabled="readonly">
          <a-icon type="plus"/> {{ c.label }}
        </a-menu-item>
      </a-menu>
    </a-dropdown>
  </div>
</template>

<script>
import { buildAntTreeData, findNodeByKey } from '../utils/xmlTree'
import { getAddableChildren } from '../utils/schemaDriver'

export default {
  name: 'DmStructureTree',
  props: {
    nodeList:  { type: Array,   default: () => [] },
    schema:    { type: Object,  default: () => ({}) },
    locale:    { type: String,  default: 'en' },
    readonly:  { type: Boolean, default: false },
    en2cnElem: { type: Object,  default: () => ({}) }
  },
  data() {
    return {
      selectedKeys: [], expandedKeys: [],
      menuVisible: false, menuStyle: {},
      addableChildren: [], contextNode: null
    }
  },
  computed: {
    treeData() { return buildAntTreeData(this.nodeList) }
  },
  watch: {
    nodeList: {
      immediate: true,
      handler(newList, oldList) {
        const rootIds = newList.filter(n => n.pid === -1 || n.pid == null).map(n => String(n.id))
        if (!oldList || !oldList.length) {
          // 首次加载：只展开根节点
          this.expandedKeys = rootIds
          return
        }
        // 刷新树时：按路径将已展开节点映射到新 id，避免手动展开的子树折叠
        const oldById = {}
        oldList.forEach(n => { oldById[String(n.id)] = n })
        const expandedPaths = new Set(
          this.expandedKeys
            .map(k => (oldById[k] ? oldById[k].attributes.path : null))
            .filter(Boolean)
        )
        const restored = newList
          .filter(n => expandedPaths.has(n.attributes.path))
          .map(n => String(n.id))
        this.expandedKeys = [...new Set([...rootIds, ...restored])]
      }
    }
  },
  mounted()     { document.addEventListener('click', this._hideMenu) },
  beforeDestroy(){ document.removeEventListener('click', this._hideMenu) },
  methods: {
    _hideMenu() { this.menuVisible = false },

    onSelect(keys) {
      this.selectedKeys = keys
      const node = keys.length && findNodeByKey(this.nodeList, keys[0])
      if (node) this.$emit('select', node)
    },
    selectNode(node) {
      this.selectedKeys = [String(node.id)]
      // 展开从根到该节点的所有祖先，使节点在树中可见
      const ancestors = []
      let cur = node
      while (cur && cur.pid !== -1 && cur.pid != null) {
        const parent = this.nodeList.find(n => n.id === cur.pid)
        if (!parent) break
        ancestors.push(String(parent.id))
        cur = parent
      }
      if (ancestors.length) {
        const merged = new Set([...this.expandedKeys, ...ancestors])
        this.expandedKeys = Array.from(merged)
      }
    },

    onDblClick(e, treeNode) {
      const node = findNodeByKey(this.nodeList, treeNode.eventKey)
      if (node) this.$emit('dblclick', node)
    },

    onRightClick({ event, node: treeNode }) {
      if (this.readonly) return
      this.contextNode = findNodeByKey(this.nodeList, treeNode.eventKey)
      this.addableChildren = this.contextNode
        ? getAddableChildren(this.contextNode, this.schema, this.nodeList, this.locale, this.en2cnElem)
        : []
      this.menuStyle = {
        position: 'fixed', left: event.clientX + 'px', top: event.clientY + 'px', zIndex: 9999
      }
      this.menuVisible = true
    },

    onMenuClick({ key }) {
      this.menuVisible = false
      if (key === '__delete__') { this.$emit('delete-element', this.contextNode); return }
      if (key.startsWith('add:')) {
        this.$emit('add-element', { elemName: key.substring(4), appendType: 'child' })
      }
    }
  }
}
</script>
<style lang="less" scoped>
.dm-tree { padding: 8px; height: 100%; overflow: auto; }
/deep/ .ant-tree-node-content-wrapper { font-size: 12px; }
</style>
