# 部署更新 - Para设计器视图切换修复 v2.0

**更新时间**: 2026-09-24 20:41  
**版本**: v2.0（增强版）  
**修复问题**: Para设计视图切换回源码视图时行号列、铅笔列布局错乱  

---

## 🆕 v2.0 更新内容

### 与v1.0的区别

**v1.0 (20:31构建)**:
- ParaDesigner: 同步清理样式污染
- DmContentEditor: 直接操作CodeMirror内部API

**v2.0 (20:41构建) - 增强版**:
- ✅ 保留v1.0的所有修复
- ✅ **新增**: DmSourceView添加`forceFixGuttersLayout()`公开方法
- ✅ **改进**: DmContentEditor调用封装好的方法，代码更清晰
- ✅ **增强**: 添加详细的console.log诊断日志，便于排查

---

## 📦 构建信息

### 关键文件（已更新）
```
dist/js/
├── chunk-834a99e8.e4d42a50.js  ← DmSourceView (211KB, 含forceFixGuttersLayout方法)
├── chunk-e3d11396.5fbfb092.js  ← DmContentEditor (新)
└── ... (其他chunk)
```

### 验证标识
- ✅ `forceFixGuttersLayout` 方法已打包（4次出现，说明方法定义+调用都在）
- ✅ 构建时间: 2026-09-24 20:41

---

## 🚀 部署步骤

### 1. 备份当前版本
```bash
cd /path/to/production
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. 部署新版本
```bash
# 完整替换dist目录
scp -r D:/workspace/IETM/cape-ietm-vue/dist/* user@server:/path/to/production/dist/
```

### 3. 清除浏览器缓存（重要！）
- **Windows**: `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`
- **或**: F12 → Network → 勾选 "Disable cache"

### 4. 验证部署
访问编辑器页面，按F12打开控制台，应该看到新的诊断日志：
```
[DmSourceView] 开始强制修复gutters布局
[DmSourceView] Gutters 子元素宽度: [...]
[DmSourceView] Gutters 总宽度应为: ...
[DmSourceView] Gutters布局修复完成
```

---

## 🧪 测试步骤

### 测试场景1: 保存后返回
1. 编辑模式打开DM
2. 双击左侧树的para节点，进入Para设计视图
3. 编辑内容，点击"保存"按钮
4. **验证**: 源码视图的行号列、铅笔列、XML内容列对齐正常 ✅

### 测试场景2: 标签切换返回
1. 编辑模式打开DM
2. 双击左侧树的para节点，进入Para设计视图
3. 点击底部"源码视图"标签
4. **验证**: 源码视图的行号列、铅笔列、XML内容列对齐正常 ✅

### 测试场景3: 多次往返
1. 重复进入设计视图、返回源码视图 5次
2. **验证**: 每次布局都保持一致 ✅

### 诊断方法（如果问题仍存在）
打开浏览器控制台（F12），执行：
```javascript
// 获取gutters元素
const gutters = document.querySelector('.CodeMirror-gutters')

// 检查宽度
console.log('gutters.style.width:', gutters.style.width)
console.log('gutters.offsetWidth:', gutters.offsetWidth)

// 检查子元素
Array.from(gutters.children).forEach((child, i) => {
  console.log(`子元素${i}:`, {
    className: child.className,
    offsetWidth: child.offsetWidth,
    left: child.style.left
  })
})
```

**正常结果应该是**:
- gutters.style.width: "90px" 左右（取决于行号位数和gutter数量）
- 子元素left值依次递增: "0px", "29px", "58px" 等

---

## 🔧 技术细节

### 新增方法：DmSourceView.forceFixGuttersLayout()

**位置**: `src/views/ietm/ietmdatamodulemanagement/editor/components/DmSourceView.vue`

**作用**:
1. 重置CodeMirror尺寸缓存 (`setSize(null, null)`)
2. 重新设置尺寸 (`setSize('100%', '100%')`)
3. 刷新布局 (`refresh()`)
4. 手动计算并修复gutters宽度
5. 手动修复子元素定位（从左到右排列）
6. 再次刷新确保生效

**调用时机**:
- `onParaSave()`: Para设计器保存后切换回源码视图
- `onViewTabChange()`: 点击"源码视图"标签切换

**优势**:
- 封装了复杂的修复逻辑
- 统一的修复方法，减少代码重复
- 包含详细的诊断日志，便于问题排查

---

## ⚠️ 故障排除

### 问题1: 浏览器缓存未清除
**症状**: 控制台看不到新的诊断日志  
**解决**: 强制刷新（Ctrl + F5）或清除缓存后重新访问

### 问题2: 部署了错误的文件
**症状**: chunk文件名不匹配  
**解决**: 确认部署的是完整的dist目录，不是单个chunk文件

### 问题3: 问题仍然存在
**诊断步骤**:
1. 打开F12控制台，查看是否有JavaScript错误
2. 检查Network标签，确认加载的chunk文件时间戳是最新的
3. 搜索控制台日志，看是否有"[DmSourceView] 开始强制修复gutters布局"
4. 如果有日志，检查"Gutters 总宽度应为"的值是否正常（应该>0）
5. 使用上面的诊断JavaScript代码检查实际DOM状态

---

## 📞 技术支持

如果问题仍未解决，请提供以下信息：

1. **浏览器信息**
   - 浏览器类型和版本
   - 操作系统

2. **控制台日志**
   - F12 → Console标签的完整输出
   - 特别是包含"[DmSourceView]"的日志

3. **DOM状态**
   - 运行上面的诊断JavaScript代码的输出结果

4. **截图**
   - 问题状态的截图
   - F12控制台的截图

---

## 📝 修改的文件清单

1. `src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue`
   - `beforeDestroy()`: 同步清理样式污染

2. `src/views/ietm/ietmdatamodulemanagement/editor/components/DmSourceView.vue`
   - **新增**: `forceFixGuttersLayout()` 方法

3. `src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue`
   - `onParaSave()`: 调用`forceFixGuttersLayout()`
   - `onViewTabChange()`: 调用`forceFixGuttersLayout()`

---

**文档版本**: v2.0  
**创建时间**: 2026-09-24 20:45
