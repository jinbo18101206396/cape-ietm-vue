<template>
  <a-modal
    title="内部引用"
    :visible="visible"
    :width="600"
    :maskClosable="false"
    :destroyOnClose="true"
    wrapClassName="interref-dialog"
    @cancel="handleClose">

    <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="引用类型">
        <a-select
          v-model="selectedType"
          placeholder="请选择引用类型"
          style="width: 100%"
          @change="onTypeChange">
          <a-select-option v-for="t in typeOptions" :key="t.value" :value="t.value">
            {{ t.label }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="引用标识">
        <a-select
          v-model="selectedId"
          :placeholder="selectedType ? '请选择引用标识' : '请先选择引用类型'"
          style="width: 100%"
          :disabled="!selectedType"
          :not-found-content="selectedType ? '该类型无可引用元素' : undefined">
          <a-select-option v-for="opt in idOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="引用文本（可选）">
        <a-textarea v-model="titleText" :rows="2" placeholder="留空则不添加文本内容"/>
      </a-form-item>
    </a-form>

    <template slot="footer">
      <a-button @click="handleClose">关闭</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script>
// 引用类型下拉选项（值为 XML internalRefTargetType 属性值，与 S1000D 标准一致）
const TYPE_OPTIONS = [
  { value: 'figure',           label: '插图 (figure)' },
  { value: 'table',            label: '表格 (table)' },
  { value: 'multimedia',       label: '多媒体 (multimedia)' },
  { value: 'para',             label: '段落节 (para)' },
  { value: 'proceduralStep',   label: '操作步骤 (proceduralStep)' },
  { value: 'graphic',          label: '图形 (graphic)' },
  { value: 'multimediaObject', label: '多媒体对象 (multimediaObject)' },
  { value: 'hotspot',          label: '热点 (hotspot)' }
]

export default {
  name: 'IetmInterrefDialog',
  props: {
    // 父组件传入英文 nodeList（始终用英文名匹配 XML 属性值）
    visible:  { type: Boolean, default: false },
    nodeList: { type: Array,   default: () => [] }
  },
  data() {
    return {
      typeOptions: TYPE_OPTIONS,
      selectedType: undefined,
      selectedId:   undefined,
      titleText:    '',
      idOptions:    []
    }
  },
  watch: {
    visible(val) {
      if (val) this.resetState()
    }
  },
  methods: {
    resetState() {
      this.selectedType = undefined
      this.selectedId   = undefined
      this.titleText    = ''
      this.idOptions    = []
    },

    // 切换引用类型时，重新筛选 nodeList 填充「引用标识」下拉
    onTypeChange(type) {
      this.selectedId = undefined
      this.idOptions  = []
      if (!type) return

      const opts = []
      const seen = new Set()   // 按 id 去重：脏数据中同 id 元素只保留一项，避免 :key 冲突与选择歧义
      for (const node of this.nodeList) {
        if (!node.attributes || node.attributes.name !== type) continue

        let attrObj = {}
        try { attrObj = JSON.parse(node.attributes.attrval || '{}') } catch (e) { /* 忽略格式异常节点 */ }
        const id = attrObj.id
        if (!id || seen.has(id)) continue
        seen.add(id)

        const display = node.text ? `${id}（${node.text}）` : id
        opts.push({ value: id, label: display })
      }
      this.idOptions = opts
      // §14.7.2③.5：筛选后默认选中首项，便于快速操作
      if (opts.length > 0) this.selectedId = opts[0].value
    },

    handleConfirm() {
      if (!this.selectedType) { this.$message.warning('请选择引用类型。'); return }
      if (!this.selectedId)   { this.$message.warning('请选择引用标识。'); return }

      // §14.7.4：引用文本取 trim 后的值，纯空白视为空 → 生成 <internalRef ...></internalRef>
      const trimmed = (this.titleText || '').trim()
      const title = trimmed ? this.escapeXml(trimmed) : ''
      const xml = `<internalRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest"` +
                  ` internalRefId="${this.escapeXml(this.selectedId)}"` +
                  ` internalRefTargetType="${this.escapeXml(this.selectedType)}">${title}</internalRef>`

      this.$emit('insert', xml)
      this.handleClose()
    },

    handleClose() {
      this.resetState()
      this.$emit('update:visible', false)
    },

    escapeXml(str) {
      if (!str && str !== 0) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }
  }
}
</script>
