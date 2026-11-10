# 删除线功能修复总结

## 问题描述
- **问题**: Para 设计器中插入删除线文本后，保存生成的 XML 不符合 S1000D 4.0 标准
- **预期**: `<para><delete>123</delete></para>`
- **实际**: `<para>123</para>` (删除线格式丢失)

## 根因分析
`paraConverter.js` 缺少删除线的双向转换逻辑：
- XML → HTML (para2html): 未将 `<delete>` 转换为 HTML 删除线标签
- HTML → XML (html2para): 未将 HTML 删除线标签转换回 `<delete>`

## 修复方案

### 修改文件
`src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js`

### 修改 1: para2html (第 130-131 行)
```javascript
// XML → HTML: 供 UEditor 显示
.replace(/<delete>/g, '<s>')
.replace(/<\/delete>/g, '</s>')
```

### 修改 2: html2para (第 441-447 行)
```javascript
// HTML → XML: 保存时转换
// 🔧 2026-11-10 P0修复: 删除线转换 (HTML <s>/<del> → S1000D <delete>)
.replace(/<s(\s[^>]*)?\>/g, '<delete>')
.replace(/<\/s>/g, '</delete>')
.replace(/<del(\s[^>]*)?\>/g, '<delete>')
.replace(/<\/del>/g, '</delete>')
.replace(/<strike(\s[^>]*)?\>/g, '<delete>')
.replace(/<\/strike>/g, '</delete>')
```

## 支持的 HTML 标签
- `<s>` - HTML5 标准删除线
- `<del>` - HTML 语义化删除标签
- `<strike>` - 旧版删除线标签（向下兼容）

## 验证步骤

### 自动验证
```bash
cd /d/workspace/IETM/cape-ietm-vue
node diagnose-delete-fix.js
```

### 手动验证
1. **清除浏览器缓存**: 按 `Ctrl+Shift+R` 强制刷新
2. **访问页面**: http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN
3. **进入设计视图**: 点击"设计视图"标签
4. **插入删除线文本**:
   - 输入 "123"
   - 全选文本
   - 点击工具栏的删除线按钮 (或按 Ctrl+Shift+S)
5. **保存**: 点击"保存"按钮
6. **查看 XML**:
   - 切换到"源码视图"
   - 验证 XML 包含 `<delete>123</delete>`

### 预期结果
```xml
<para>
    <delete>123</delete>
</para>
```

## S1000D 4.0 合规性
✅ 符合 S1000D 4.0 Issue 4.0 规范 (descript.xsd)
- `<delete>` 元素用于标记删除的内容
- 可包含文本内容和行内元素

## 状态
✅ 源代码修改完成
⏳ 等待浏览器缓存刷新后生效

## 注意事项
1. 如果强制刷新后仍未生效，请重启 webpack dev server
2. 检查浏览器控制台是否有 [HMR] 热更新提示
3. 确认没有 ESLint 或编译错误
