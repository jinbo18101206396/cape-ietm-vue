# CodeMirror 布局完全一致性测试指南

## 测试目标

验证从设计视图切换回源码视图时，CodeMirror 的样式、布局、排版与直接进入源码视图时**完全一致**。

## 测试准备

1. 确保前后端服务都在运行
2. 打开浏览器，登录系统
3. 打开开发者工具（F12），切换到 Console 标签

## 测试步骤

### 第一步：测量"直接进入"场景

1. **进入数据模块列表**
   - 导航到"项目数据模块管理"

2. **点击任意 DM 的"浏览或编辑DM内容"按钮**
   - 系统会直接进入源码视图

3. **等待编辑器完全加载**（约 1-2 秒）

4. **在控制台运行验证脚本**：
   ```javascript
   // 复制粘贴 tests/diagnostic/quick-verify.js 的全部内容
   // 或者直接运行：
   fetch('/tests/diagnostic/quick-verify.js').then(r=>r.text()).then(eval)
   ```

5. **在弹出的提示框中输入**: `direct`

6. **记录控制台输出**，应该看到类似：
   ```
   ✅ Gutters 宽度: 60 (期望 > 50)
   ✅ 折叠列位置: 44 (期望 = 44)
   ✅ Scroll 高度: 850 (期望 > 600)
   ✅ 行高: 22 (期望 15-30)
   ✅ 字符宽度: 7.27 (期望 5-15)
   
   ✅ 所有检查通过！
   ```

### 第二步：测量"切换进入"场景

1. **双击左侧树的任意 para 节点**
   - 进入设计视图
   - 底部标签应显示"设计视图"为激活状态

2. **点击底部"源码视图"标签**
   - 切换回源码视图

3. **等待切换完成**（约 0.5-1 秒）

4. **观察控制台**，应该看到：
   ```
   [rebuildEditor] 容器已可见，开始重建 CodeMirror
   [DmSourceView] CodeMirror已重建
   ```

5. **再次运行验证脚本**（同样的代码）

6. **在弹出的提示框中输入**: `switched`

7. **查看自动生成的对比分析**

### 第三步：分析结果

控制台会自动显示对比分析：

```
═══════════════════════════════════
  对比分析
═══════════════════════════════════

✅ Gutters 宽度:
   直接: 60
   切换: 60
   差异: 0.00 (容差: 5)

✅ 折叠列位置:
   直接: 44
   切换: 44
   差异: 0.00 (容差: 2)

✅ Scroll 高度:
   直接: 850
   切换: 850
   差异: 0.00 (容差: 50)

✅ 行高:
   直接: 22
   切换: 22
   差异: 0.00 (容差: 2)

✅ 字符宽度:
   直接: 7.27
   切换: 7.27
   差异: 0.00 (容差: 1)

✅ 缓存字符宽度:
   直接: 7.27
   切换: 7.27
   差异: 0.00 (容差: 1)

✅ 缓存文本高度:
   直接: 22
   切换: 22
   差异: 0.00 (容差: 2)

🎉 完美匹配！两种方式完全一致！
```

## 成功标准

所有以下条件都必须满足：

### 布局一致性
- ✅ Gutters 宽度差异 ≤ 5px
- ✅ 折叠列位置差异 ≤ 2px
- ✅ Scroll 高度差异 ≤ 50px

### 文本测量一致性
- ✅ 行高差异 ≤ 2px
- ✅ 字符宽度差异 ≤ 1px

### 内部状态一致性
- ✅ 缓存字符宽度差异 ≤ 1px
- ✅ 缓存文本高度差异 ≤ 2px

### 视觉一致性（人工检查）
- ✅ 行号列宽度相同
- ✅ 折叠箭头位置相同（行号右侧）
- ✅ XML 内容行高相同
- ✅ 字体大小和间距相同
- ✅ 滚动条位置和行为相同

## 故障排查

### 如果看到 ❌ 标记

1. **检查控制台日志**
   - 是否有 `[rebuildEditor]` 相关的警告？
   - 是否看到 "TabPane 仍然隐藏" 或 "容器高度为 0"？

2. **手动触发重建**
   ```javascript
   const vm = document.querySelector('.dm-source-view').__vue__;
   vm.rebuildEditor();
   ```

3. **检查代码是否最新**
   - 强制刷新浏览器（Ctrl+F5）
   - 确认修改已生效

4. **检查 DOM 结构**
   ```javascript
   const cm = document.querySelector('.CodeMirror');
   const tabPane = cm.closest('.ant-tabs-tabpane');
   console.log('TabPane display:', getComputedStyle(tabPane).display);
   console.log('TabPane class:', tabPane.className);
   console.log('SourceView height:', cm.closest('.dm-source-view').offsetHeight);
   ```

### 如果差异超出容差

记录以下信息并报告：

1. **差异详情**：
   - 哪些指标超出容差？
   - 实际差异值是多少？

2. **截图对比**：
   - 直接进入时的截图
   - 切换进入时的截图

3. **控制台日志**：
   - 复制所有相关日志

4. **完整数据导出**：
   ```javascript
   copy(JSON.stringify(window.__cmData, null, 2))
   ```

## 多次切换测试

为了验证稳定性，可以进行多次切换测试：

1. 在源码视图，双击 para → 设计视图
2. 点击"源码视图" → 返回源码视图
3. 运行验证脚本
4. 重复步骤 1-3 共 3 次
5. 验证每次的测量结果都一致

## 高级诊断

如果需要更详细的诊断信息，运行：

```javascript
// 复制粘贴 tests/diagnostic/comprehensive-verification.js 的内容
```

这将输出 10 个类别、100+ 项指标的详细分析。

## 预期修复效果

**修复前**（Bug 状态）：
```
❌ Gutters 宽度: 1 → 60 (差异: 59, 超出容差 5)
❌ 折叠列位置: 0 → 44 (差异: 44, 超出容差 2)
❌ Scroll 高度: 350 → 850 (差异: 500, 超出容差 50)
⚠️ 发现差异！需要进一步修复。
```

**修复后**（正常状态）：
```
✅ Gutters 宽度: 60 → 60 (差异: 0.00, 容差: 5)
✅ 折叠列位置: 44 → 44 (差异: 0.00, 容差: 2)
✅ Scroll 高度: 850 → 850 (差异: 0.00, 容差: 50)
🎉 完美匹配！两种方式完全一致！
```

## 快速验证命令

如果你已经有 `quick-verify.js` 的内容，可以创建书签快捷方式：

```javascript
javascript:(function(){fetch('/tests/diagnostic/quick-verify.js').then(r=>r.text()).then(eval)})()
```

或者直接在控制台输入简化版：

```javascript
(function(){const cm=document.querySelector('.CodeMirror');const g=cm.querySelector('.CodeMirror-gutters');const f=cm.querySelector('.CodeMirror-foldgutter');const s=cm.querySelector('.CodeMirror-scroll');console.log('Gutters:',g.offsetWidth,'Fold:',f.offsetLeft,'Scroll:',s.offsetHeight);})()
```

## 注意事项

- 每次测试使用同一个 DM，确保内容长度一致
- DM 内容至少 20 行，否则 scroll 高度可能不足 600
- 不要在测试过程中调整浏览器窗口大小
- 确保左侧树和右侧属性面板状态一致（都展开或都折叠）

## 测试记录模板

```
测试日期: ____________________
测试人员: ____________________
DM ID: ____________________

场景A（直接进入）:
  Gutters 宽度: ______
  折叠列位置: ______
  Scroll 高度: ______
  行高: ______
  字符宽度: ______

场景B（切换进入）:
  Gutters 宽度: ______
  折叠列位置: ______
  Scroll 高度: ______
  行高: ______
  字符宽度: ______

差异分析:
  □ 所有指标在容差范围内
  □ 发现 ____ 项超出容差
  
视觉检查:
  □ 布局一致
  □ 字体大小一致
  □ 行高一致
  □ 折叠箭头位置一致

总结: □ 通过  □ 不通过

问题描述: 
____________________
____________________
```
