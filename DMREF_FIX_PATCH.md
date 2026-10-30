# DM 引用显示修复补丁

## 问题描述

1. **警告列表显示原始 XML**：显示 `<dmRef xlink:type="simple"...>` 而不是 `【引用DMC-...: 标题】`
2. **XML 中 dmRef 被转义**：`&lt;dmRef&gt;` 而不是 `<dmRef>`

## 修复位置

文件：`src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue`

## 修复步骤

### 步骤1：添加 ConvertedContent 组件

在 `<script>` 标签开始后，`export default` 之前添加：

```javascript
// 异步内容转换组件
const ConvertedContent = {
  props: ['content', 'parent'],
  data() {
    return {
      convertedHtml: '加载中...',
      loading: true
    }
  },
  async mounted() {
    await this.convert()
  },
  watch: {
    content: {
      handler() {
        this.convert()
      }
    }
  },
  methods: {
    async convert() {
      if (!this.content) {
        this.convertedHtml = ''
        this.loading = false
        return
      }
      
      try {
        this.loading = true
        const { para2html } = await import('../utils/paraConverter')
        
        // 包装在 para 标签中
        const wrapped = `<para>${this.content}</para>`
        const html = await para2html(this.parent, wrapped)
        
        // 移除外层 para 标签
        this.convertedHtml = html.replace(/<\/?para>/g, '')
        this.loading = false
      } catch (e) {
        console.error('[ConvertedContent] 转换失败:', e)
        this.convertedHtml = this.content
        this.loading = false
      }
    }
  },
  template: `
    <div v-if="loading" style="color: #999;">加载中...</div>
    <div v-else v-html="convertedHtml" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
  `
}
```

### 步骤2：注册组件

在 `export default` 内添加 `components` 部分（如果已存在则合并）：

```javascript
export default {
  name: 'LevelledParaDesigner',
  components: {
    ConvertedContent
  },
  // ... 其他代码
}
```

### 步骤3：更新模板 - 警告 tab（约第100行）

将：
```vue
<template slot="content" slot-scope="text, record">
  <div v-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
  <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
</template>
```

替换为：
```vue
<template slot="content" slot-scope="text, record">
  <ConvertedContent v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" :content="text" :parent="Parent" />
  <div v-else-if="text && text.includes('<symbol')" v-html="convertSymbolsToHtml(text)" style="max-width: 800px; overflow: auto;"></div>
  <div v-else v-html="text" style="max-width: 800px; word-break: break-all; text-align: left;"></div>
</template>
```

### 步骤4：更新模板 - 注意 tab（约第127行）

应用相同的修改。

### 步骤5：更新模板 - 段落 tab（约第155行）

应用相同的修改。

### 步骤6：更新模板 - 注 tab（约第182行）

应用相同的修改。

## 验证步骤

1. 编译项目：`npm run serve`
2. 打开编辑器，进入设计视图
3. 查看警告列表，应显示 `【引用DMC-...: 标题】`
4. 切换到源码视图，应显示 `<dmRef>` 而不是 `&lt;dmRef&gt;`

## 影响范围

- ✅ 警告模块
- ✅ 注意模块
- ✅ 段落模块
- ✅ 注模块

## 注意事项

1. 此修复只解决**显示问题**，不改变数据保存逻辑
2. 如果 XML 中仍然被转义，需要额外修复保存流程
3. `para2html` 函数负责将 dmRef XML 转换为可读的 HTML 格式
