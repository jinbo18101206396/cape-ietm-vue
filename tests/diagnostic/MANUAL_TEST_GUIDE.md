/**
 * CodeMirror 布局修复手动测试指南
 * 
 * 由于自动化测试需要后端服务支持，本文档提供手动测试步骤
 */

# CodeMirror 布局修复手动测试指南

## 准备工作

1. 确保前端服务运行：`npm run serve`
2. 确保后端服务运行
3. 打开浏览器开发者工具（F12）

## 测试步骤

### 测试1：基本修复验证

1. 登录系统
2. 进入"项目数据模块管理"
3. 点击任意 DM 的"浏览或编辑DM内容"按钮
4. **观察**：此时应该直接进入源码视图，布局正常
5. 双击左侧树的任意 `para` 节点
6. **观察**：进入设计视图，底部标签显示"设计视图"为激活状态
7. 点击底部"源码视图"标签
8. **观察控制台**：应该看到类似以下日志
   ```
   [rebuildEditor] 容器已可见，开始重建 CodeMirror
   [DmSourceView] CodeMirror已重建
   ```
9. **在控制台运行验证脚本**（见下方）

### 测试2：多次切换验证

1. 在源码视图状态下，双击左侧树的 `para` 节点
2. 再次点击"源码视图"标签
3. 重复步骤 1-2 三次
4. **观察**：每次切换后布局都应该正常

### 测试3：对比验证

1. **场景A**：直接进入
   - 刷新页面，点击"浏览或编辑DM内容"
   - 直接进入源码视图
   - 运行验证脚本，记录数据

2. **场景B**：切换进入
   - 刷新页面，点击"浏览或编辑DM内容"
   - 双击 para 进入设计视图
   - 点击"源码视图"标签
   - 运行验证脚本，记录数据

3. **对比**：两次测量的数据应该一致

## 验证脚本

在浏览器控制台粘贴运行：

```javascript
// 复制 tests/diagnostic/verify-codemirror-fix.js 的内容
(function verifyCodeMirrorFix() {
  console.log('\n=== CodeMirror 布局修复验证 ===\n');

  const cmElement = document.querySelector('.CodeMirror');
  if (!cmElement) {
    console.error('❌ 错误：找不到 CodeMirror 元素');
    return;
  }

  const gutters = cmElement.querySelector('.CodeMirror-gutters');
  const foldGutter = cmElement.querySelector('.CodeMirror-foldgutter');
  const cmScroll = cmElement.querySelector('.CodeMirror-scroll');

  const measurements = {
    guttersWidth: gutters.offsetWidth,
    foldGutterLeft: foldGutter.offsetLeft,
    scrollHeight: cmScroll.offsetHeight
  };

  console.log('--- 测量结果 ---');
  console.log('Gutters 宽度:', measurements.guttersWidth, 'px (期望 > 50)');
  console.log('折叠列位置:', measurements.foldGutterLeft, 'px (期望 = 44)');
  console.log('Scroll 高度:', measurements.scrollHeight, 'px (期望 > 600)');

  const allPassed =
    measurements.guttersWidth > 50 &&
    measurements.foldGutterLeft === 44 &&
    measurements.scrollHeight > 600;

  if (allPassed) {
    console.log('\n✅✅✅ 所有检查通过！布局正常！');
  } else {
    console.log('\n❌❌❌ 检查失败！布局仍有问题！');
  }

  return measurements;
})();
```

## 预期结果

### 正常情况

```
=== CodeMirror 布局修复验证 ===

--- 测量结果 ---
Gutters 宽度: 60 px (期望 > 50)
折叠列位置: 44 px (期望 = 44)
Scroll 高度: 850 px (期望 > 600)

✅✅✅ 所有检查通过！布局正常！
```

### 异常情况（修复前）

```
=== CodeMirror 布局修复验证 ===

--- 测量结果 ---
Gutters 宽度: 1 px (期望 > 50)
折叠列位置: 0 px (期望 = 44)
Scroll 高度: 350 px (期望 > 600)

❌❌❌ 检查失败！布局仍有问题！
```

## 控制台日志检查

在切换到源码视图时，应该看到以下日志序列：

```
[rebuildEditor] 容器已可见，开始重建 CodeMirror
[DmSourceView] CodeMirror已重建
```

**不应该**看到以下警告日志：
```
[rebuildEditor] TabPane 仍然隐藏，延迟重建
[rebuildEditor] 容器高度为 0，延迟重建
```

如果看到警告日志，说明时序问题仍然存在。

## 问题排查

### 如果测试失败

1. **检查代码是否最新**
   - 刷新浏览器（Ctrl+F5 强制刷新）
   - 检查 `DmSourceView.vue` 和 `DmContentEditor.vue` 是否包含修复代码

2. **检查控制台**
   - 是否有 JavaScript 错误
   - 是否看到 rebuildEditor 相关日志

3. **手动触发重建**
   ```javascript
   // 在控制台运行
   const vm = document.querySelector('.dm-source-view').__vue__;
   if (vm && vm.rebuildEditor) {
     vm.rebuildEditor();
   }
   ```

4. **检查 DOM 结构**
   ```javascript
   // 检查 TabPane 可见性
   const cm = document.querySelector('.CodeMirror');
   const tabPane = cm.closest('.ant-tabs-tabpane');
   console.log('TabPane display:', getComputedStyle(tabPane).display);
   console.log('容器高度:', cm.closest('.dm-source-view').offsetHeight);
   ```

## 成功标准

- ✅ Gutters 宽度 > 50px
- ✅ 折叠列位置 = 44px
- ✅ Scroll 高度 > 600px
- ✅ 控制台显示重建日志
- ✅ 无警告日志
- ✅ 多次切换保持一致
- ✅ 与直接进入的布局一致

## 修复原理说明

**问题根源**：
- Ant Design Tabs 使用 `display: none` 隐藏非活动标签页
- CodeMirror 在容器隐藏时初始化，测量到错误的尺寸
- `refresh()` 无法清除已缓存的错误尺寸

**修复方案**：
1. 检测 TabPane 容器的可见性（而非组件根元素）
2. 确保容器真正可见（offsetHeight > 0）
3. 完全重建 CodeMirror 实例而非仅刷新
4. 使用 requestAnimationFrame 确保 DOM 更新完成

## 注意事项

- 测试时请使用真实数据，避免空 DM
- 确保 DM 内容足够长（至少 20 行），否则 scroll 高度可能小于 600
- 不同分辨率下 gutters 宽度可能略有差异（50-70px），但不应该是 1px
