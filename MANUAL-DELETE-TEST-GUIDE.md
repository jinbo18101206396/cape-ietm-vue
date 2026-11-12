# 删除线功能手动测试指南

## 📋 测试前准备

### 1. 确认代码已修改
运行验证脚本：
```bash
cd /d/workspace/IETM/cape-ietm-vue
node diagnose-delete-fix.js
```

应该看到：
- ✅ para2html: delete → s
- ✅ html2para: s → delete  
- ✅ html2para: del → delete
- ✅ html2para: strike → delete

### 2. 清除浏览器缓存
**重要：必须执行此步骤！**

- 在浏览器中按 `Ctrl+Shift+Delete`
- 选择"缓存的图像和文件"
- 时间范围：全部时间
- 点击"清除数据"

或者直接按 `Ctrl+Shift+R` 进行硬刷新

### 3. 检查 Webpack 编译状态
确认终端中显示：
```
Compiled successfully
```

---

## 🧪 测试步骤

### 第一部分：HTML → XML 转换测试

#### 步骤 1: 访问页面
```
http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN
```

#### 步骤 2: 进入设计视图
- 点击顶部的 **"设计视图"** 标签

#### 步骤 3: 清空编辑器
- 在编辑器中按 `Ctrl+A` 全选
- 按 `Delete` 删除所有内容

#### 步骤 4: 输入测试文本
- 输入：`123`

#### 步骤 5: 应用删除线
- 全选文本：`Ctrl+A`
- 点击工具栏中的 **删除线按钮**（S̶ 图标）
  - 或者按快捷键 `Ctrl+Shift+D`

#### 步骤 6: 验证删除线已应用
- 文本应该显示为：~~123~~（带删除线）
- 按 `F12` 打开开发者工具
- 切换到 **Elements** 标签
- 在 iframe 中查找编辑器 body
- 应该看到：`<s>123</s>` 或 `<del>123</del>`

✅ **检查点 1**: 编辑器中文本有删除线效果

#### 步骤 7: 保存
- 点击 **"保存"** 按钮
- 等待提示：`保存成功`

#### 步骤 8: 切换到源码视图
- 点击 **"源码视图"** 标签

#### 步骤 9: 验证 XML
在源码视图中查找 `<para>` 标签，应该看到：

**✅ 正确的 XML（期望）：**
```xml
<para>
    <delete>123</delete>
</para>
```

**❌ 错误的 XML（如果缓存未清除）：**
```xml
<para>
    123
</para>
```

✅ **检查点 2**: XML 包含 `<delete>123</delete>`

---

### 第二部分：XML → HTML 往返测试

#### 步骤 10: 切换回设计视图
- 点击 **"设计视图"** 标签

#### 步骤 11: 验证删除线保留
- 文本应该仍然显示为：~~123~~（带删除线）
- 格式应该保持一致

✅ **检查点 3**: 往返后删除线格式保留

---

## 🔍 调试方法

### 方法 1: 浏览器控制台测试
按 `F12` 打开控制台，粘贴以下代码：

```javascript
// 测试 HTML → XML 转换
let html = '<s>123</s>';
let xml = html
  .replace(/<s(\s[^>]*)?\>/g, '<delete>')
  .replace(/<\/s>/g, '</delete>');

console.log('输入:', html);
console.log('输出:', xml);
console.log('期望:', '<delete>123</delete>');
console.log('结果:', xml === '<delete>123</delete>' ? '✅ 代码已生效' : '❌ 缓存未清除');
```

### 方法 2: 检查 HMR 更新
在浏览器控制台中查看是否有：
```
[HMR] Updated modules:
[HMR] - ./src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js
```

如果没有，说明代码未重新加载，需要硬刷新。

### 方法 3: 使用测试页面
访问：`http://localhost:3000/test-delete-converter.html`

点击所有测试按钮，验证转换逻辑是否正确。

---

## ❌ 故障排除

### 问题 1: XML 中没有 `<delete>` 标签

**可能原因：**
1. 浏览器缓存未清除
2. 删除线未正确应用
3. Webpack 未重新编译

**解决方案：**
```bash
# 1. 强制刷新浏览器
按 Ctrl+Shift+R

# 2. 或重启 webpack
# 在终端中按 Ctrl+C 停止
cd /d/workspace/IETM/cape-ietm-vue
npm run serve
```

### 问题 2: 找不到删除线按钮

**解决方案：**
- 使用快捷键：`Ctrl+Shift+D`
- 或手动注入 HTML（在控制台中）：
```javascript
// 获取编辑器 iframe
const iframe = document.querySelector('iframe');
const body = iframe.contentDocument.body;
body.innerHTML = '<p><s>123</s></p>';
```

### 问题 3: 保存后仍显示错误的 XML

**确认以下几点：**
1. ✅ 源文件已修改（运行 `node diagnose-delete-fix.js`）
2. ✅ 浏览器缓存已清除
3. ✅ Webpack 编译成功
4. ✅ 删除线在编辑器中可见

如果以上都确认，尝试：
```bash
# 完全重启开发服务器
cd /d/workspace/IETM/cape-ietm-vue
# Ctrl+C 停止现有服务器
npm run serve
```

然后在**无痕模式**中测试：`Ctrl+Shift+N`

---

## 📊 测试结果记录

完成测试后，请记录以下信息：

### 检查点 1: 编辑器中删除线
- [ ] 文本显示删除线效果
- [ ] Elements 中看到 `<s>` 或 `<del>` 标签

### 检查点 2: XML 生成
- [ ] XML 包含 `<delete>123</delete>`
- [ ] 没有多余的空格或换行

### 检查点 3: 往返测试
- [ ] 切换回设计视图后删除线保留
- [ ] 格式保持一致

### 浏览器控制台测试
- [ ] 转换逻辑测试通过

### 测试页面验证
- [ ] HTML → XML 测试通过
- [ ] XML → HTML 测试通过
- [ ] 往返测试通过

---

## ✅ 预期最终结果

**编辑器视图：**
- 文本显示：~~123~~

**源码视图：**
```xml
<para>
    <delete>123</delete>
</para>
```

**符合 S1000D 4.0 标准** ✅

---

## 📞 需要帮助？

如果测试失败，请提供：
1. 浏览器控制台截图
2. 生成的完整 XML
3. `node diagnose-delete-fix.js` 的输出
4. 测试页面的测试结果

我会根据这些信息进一步诊断问题。
