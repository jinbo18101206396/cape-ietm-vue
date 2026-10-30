# DM 引用 xlink 命名空间修复

## 问题描述

在 LevelledPara 设计器中添加包含 DM 引用的 warning 时，保存后生成的 XML 包含 `parsererror`，且 warning 标签为空：

```xml
<warning id="warning-xxx"/>
```

实际应该生成：

```xml
<warning id="warning-xxx">
  <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
    <dmRefIdent>...</dmRefIdent>
    <dmRefAddressItems>...</dmRefAddressItems>
  </dmRef>
</warning>
```

## 根本原因

1. **数据流程**：
   - 用户添加 warning → `item.content` 被设置为完整的 `<warning>...</warning>` XML
   - 保存时 → `syncNodeToContent` 将 `item.content` 推送到 levelledPara 的 content 中
   - `treeToXml` 解析 levelledPara 的 content → 提取子元素（warning）→ 序列化

2. **问题所在**：
   - warning 元素包含 `<dmRef xlink:type="simple">` 等 xlink 属性
   - 但 warning 元素本身**没有 xlink 命名空间声明**
   - 当 DOMParser 解析 levelledPara content 时，warning 继承了父元素的命名空间
   - 但当**单独序列化 warning 元素**时，命名空间声明丢失
   - 导致 DOMParser 在后续解析时报错：`Namespace prefix xlink for type on dmRef is not defined`

## 解决方案

在 `syncNodeToContent` 函数中，为包含 xlink 属性但缺少命名空间声明的元素添加声明：

```javascript
// 🔑 P0修复：如果 content 包含 xlink: 但没有命名空间声明，添加它
if (content && content.includes('xlink:') && !content.includes('xmlns:xlink')) {
  content = content.replace(/^(<[a-zA-Z]+)(\s|>)/, '$1 xmlns:xlink="http://www.w3.org/1999/xlink"$2')
}
```

修改位置：
1. `LevelledParaDesigner.vue:1799` - levelledPara 类型的同步
2. `LevelledParaDesigner.vue:1844` - 其他类型的同步

## 修改文件

- `src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue`

## 测试验证

### 单元测试
```bash
cd D:/workspace/IETM/cape-ietm-vue
node tests/test-xlink-namespace-fix.js
```

结果：✅ 4/4 通过

### 端到端测试
```bash
node tests/test-dmref-e2e.js
```

结果：✅ 5/5 通过

验证项：
- ✅ levelledPara 包含 xmlns:xlink
- ✅ warning 标签包含 xmlns:xlink
- ✅ dmRef 标签存在
- ✅ 没有 parsererror
- ✅ warning 标签不为空

## 手动测试步骤

1. 启动开发服务器
2. 打开数据模块编辑器
3. 切换到 LevelledPara 设计视图
4. 添加警告 → 插入 DM 引用 → 保存
5. 切换到源码视图，验证：
   - warning 标签包含完整的 dmRef 内容
   - 没有 parsererror
   - XML 格式正确

## 影响范围

- ✅ warning 包含 DM 引用
- ✅ caution 包含 DM 引用
- ✅ note 包含 DM 引用  
- ✅ para 包含 internalRef
- ✅ 任何包含 xlink 属性的元素

## 后续优化

目前的修复是在 `syncNodeToContent` 层面添加命名空间，这是最安全和直接的方案。未来可以考虑：

1. 在添加内容时就包含命名空间（`saveContentEditor` 函数）
2. 在 `nodeToXml` 解析时智能检测并添加命名空间
3. 统一的命名空间管理机制

当前方案的优点：
- 修改最小化
- 不影响现有逻辑
- 容易理解和维护
