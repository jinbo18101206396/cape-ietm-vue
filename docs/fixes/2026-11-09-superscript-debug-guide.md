# 上标预览问题 - 完整诊断和修复指南

## 📋 问题描述

**用户报告**：
1. 设计视图中插入上标 "1²" ✓ 正常
2. XML源码为 `<para>1<superScript>2</superScript></para>` ✓ 正常
3. 预览显示为 "12"（无上标效果）❌ **错误**

**预期结果**：预览应该显示 "1²"（2为上标）

---

## 🔧 已实施的修复

修复代码已在 `DmPreviewModal.vue:238-243` 实施，但问题仍存在。

**修复逻辑**：
```javascript
body = body
  .replace(/<superScript>/g, '<sup>')
  .replace(/<\/superScript>/g, '</sup>')
  // ... 其他标签转换
```

---

## 🔍 诊断步骤（请按顺序执行）

### 步骤1：重启前端开发服务器

**问题**：Vue文件修改后需要重新编译才能生效

**操作**：
```bash
# 1. 停止当前运行的服务器（如果有）
# 按 Ctrl+C

# 2. 重新启动
cd D:\workspace\IETM\cape-ietm-vue
npm run serve

# 3. 等待编译完成，看到类似输出：
#    App running at:
#    - Local:   http://localhost:3000/
```

### 步骤2：硬刷新浏览器缓存

**问题**：浏览器可能缓存了旧的JS文件

**操作**：
1. 打开浏览器开发者工具（F12）
2. 访问页面：http://localhost:3000/ietm/dm-content-editor/...
3. 硬刷新：
   - Windows: `Ctrl + Shift + R` 或 `Ctrl + F5`
   - Mac: `Cmd + Shift + R`
4. 或者在开发者工具的 Network 面板勾选 "Disable cache"

### 步骤3：重现问题并查看控制台日志

**操作**：
1. 打开浏览器开发者工具（F12）
2. 切换到 **Console** 面板
3. 在 para 设计器中：
   - 输入 "1"
   - 点击工具栏的 "上标" 按钮（X²图标）
   - 输入 "2"
4. 点击 "保存" 按钮
5. 点击 "预览" 按钮
6. **查看 Console 面板的日志**

**预期看到的日志**：
```
🔍 [Preview Debug] 后端返回的原始HTML: <div>...1<superScript>2</superScript>...</div>
🔍 [Preview Debug] 是否包含<superScript>标签: true
🔍 [Preview Debug] 是否包含<sup>标签: false
🔍 [Preview Debug] 转换后的body: <div>...1<sup>2</sup>...</div>
🔍 [Preview Debug] 转换后是否包含<sup>: true
```

---

## 🎯 根据日志诊断问题

### 情况A：看不到任何 "🔍 [Preview Debug]" 日志

**原因**：前端代码未生效

**解决方法**：
1. 确认前端服务器是否正在运行：
   ```bash
   netstat -ano | grep ":3000"
   ```
2. 如果没有运行，执行步骤1重启服务器
3. 检查是否访问了正确的端口（应该是 localhost:3000 而非 localhost:8080）
4. 清除浏览器缓存并重试

### 情况B：日志显示 "是否包含<superScript>标签: false"

**原因**：后端已经转换了标签，返回的就是 `<sup>`

**可能的子情况**：

#### B1：日志显示 "是否包含<sup>标签: true"
说明后端已正确返回 `<sup>` 标签，但浏览器没有正确渲染。

**原因**：CSS样式问题或标签被转义

**检查方法**：
1. 在 Console 执行：
   ```javascript
   document.querySelector('iframe').contentDocument.querySelector('sup')
   ```
2. 如果返回 `null`：说明 `<sup>` 标签根本不在DOM中
3. 如果返回元素：说明标签存在，检查CSS样式

**解决方法**：
```javascript
// 在 Console 执行以下代码检查 iframe 内容
const iframe = document.querySelector('iframe')
const iframeDoc = iframe.contentDocument
console.log('iframe HTML:', iframeDoc.body.innerHTML.substring(0, 500))
console.log('sup 元素:', iframeDoc.querySelectorAll('sup'))
```

#### B2：日志显示 "是否包含<sup>标签: false"
说明后端返回的HTML既不包含 `<superScript>` 也不包含 `<sup>`

**原因**：后端返回的HTML可能有问题

**检查方法**：
查看完整的原始HTML（在Console中）：
```javascript
console.log('完整HTML:', html)
```

### 情况C：日志显示 "是否包含<superScript>标签: true" 但转换后仍然包含 `<superScript>`

**原因**：正则表达式替换失败

**可能原因**：
1. 标签中包含属性：`<superScript id="xxx">`
2. 标签大小写不一致：`<Superscript>` 或 `<SUPERSCRIPT>`

**解决方法**：
修改正则表达式，使用更宽松的匹配：
```javascript
body = body
  .replace(/<superScript[^>]*>/gi, '<sup>')  // 匹配任何属性，忽略大小写
  .replace(/<\/superScript>/gi, '</sup>')
```

---

## 🔧 临时调试补丁（如果以上都不行）

在 `DmPreviewModal.vue` 的 `show()` 方法中添加更详细的日志：

```javascript
show(html) {
  // ... 现有代码 ...

  let body = html || ''

  // 🔍 详细调试
  console.group('🔍 预览调试 - 完整数据流')
  console.log('1. 后端返回的原始HTML:', html)
  console.log('2. HTML长度:', html.length)
  console.log('3. 前100个字符:', html.substring(0, 100))
  console.log('4. 查找<superScript>:', html.indexOf('<superScript>'))
  console.log('5. 查找<sup>:', html.indexOf('<sup>'))
  
  // 执行替换
  body = body.replace(/<superScript>/g, '<sup>')
  console.log('6. 替换后查找<sup>:', body.indexOf('<sup>'))
  
  // 查看最终生成的HTML
  const fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
    '<body>' + body + '</body></html>'
  console.log('7. 最终HTML:', fullHtml)
  console.groupEnd()

  // ... 继续原有代码 ...
}
```

---

## 📝 报告结果模板

请将诊断结果按以下格式报告：

```
## 诊断结果

### 环境信息
- 浏览器版本: Chrome 120.0.0.0 / Firefox xxx
- 前端服务器状态: 运行中 / 未运行
- 访问URL: http://localhost:3000/...

### Console日志
```
[粘贴所有 🔍 [Preview Debug] 开头的日志]
```

### 观察到的现象
- [ ] 看不到调试日志
- [ ] 日志显示包含<superScript>
- [ ] 日志显示包含<sup>
- [ ] 预览仍显示为 "12" 无上标

### 尝试过的操作
- [ ] 重启前端服务器
- [ ] 硬刷新浏览器
- [ ] 清除浏览器缓存
```

---

## 🎯 预期的最终效果

1. ✅ Console显示：`是否包含<superScript>标签: true`
2. ✅ Console显示：`转换后是否包含<sup>: true`
3. ✅ 预览弹框中显示 "1²"（2为上标效果）
4. ✅ 浏览器审查元素看到 `<sup>2</sup>` 标签

---

## 🚀 如果问题已解决

请移除调试代码（保持代码整洁）：
1. 删除 `DmPreviewModal.vue:238-242` 的 console.log 语句
2. 保留标签转换的核心逻辑（.replace 语句）
3. 提交代码并验证生产环境

---

**文档创建时间**：2026-11-09  
**最后更新**：2026-11-09  
**状态**：等待用户反馈诊断结果
