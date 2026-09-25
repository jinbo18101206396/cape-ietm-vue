# CodeMirror视图切换布局修复 - 部署文档

**修复日期**: 2026-09-24  
**修复版本**: v1.0  
**修复文件**: `src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue`

## 问题描述

从设计视图切换回源码视图时，CodeMirror XML编辑器的布局损坏：
- Gutters宽度从正常值收缩为1px
- 折叠列位置错误（从44px变为0px）
- 编辑器高度从684px收缩为350px

## 根本原因

CodeMirror在Ant Design Tabs使用`display:none`隐藏TabPane后，切换回来时内部布局计算出现三处错误：
1. `.CodeMirror-gutters`的CSS computed width被错误地设为0px
2. 所有gutter子元素的`left`定位都错误地为0px
3. `setSize(null, null)` + 延迟 `setSize('100%', '100%')` 导致scroll高度在中间状态回退到错误的CSS计算值（~350px）

## 修复方案

在`DmContentEditor.vue`的`onViewTabChange`方法中（第1025-1060行），当切换回源码视图时：
1. 计算并强制设置gutters容器宽度为子元素宽度总和
2. 手动设置每个子元素的left位置为累加值
3. 清除scroll容器的错误样式
4. 调用`setSize()`和`refresh()`强制CodeMirror重新布局

## 部署步骤

### 1. 备份当前版本
```bash
# 备份前端静态文件
cp -r /path/to/production/dist /path/to/production/dist.backup.$(date +%Y%m%d_%H%M%S)
```

### 2. 部署新版本
```bash
# 方式A: 复制构建产物到生产环境
cp -r D:/workspace/IETM/cape-ietm-vue/dist/* /path/to/production/dist/

# 方式B: 如果使用nginx，重启服务
systemctl reload nginx
```

### 3. 清除浏览器缓存
**重要**: 由于修改了JavaScript代码，用户必须清除浏览器缓存才能看到修复效果。

建议在部署时通知用户：
- 按 `Ctrl+Shift+Delete` 清除缓存
- 或按 `Ctrl+F5` 硬刷新页面

## 测试验证

### 测试场景

**场景1: 基本视图切换**
1. 登录系统
2. 进入任意DM编辑器
3. 记录首次进入时的布局指标（见下方验证脚本）
4. 双击任意para元素，进入设计视图
5. 点击"源码视图"标签返回
6. 运行验证脚本，对比指标

**场景2: 多次切换**
1. 重复切换设计视图 ↔ 源码视图 5次
2. 每次返回源码视图时，验证布局是否正常

**场景3: 不同DM类型**
1. 测试描述性DM（大量文本内容）
2. 测试程序性DM（表格、列表）
3. 测试故障隔离DM（复杂嵌套结构）

### 验证脚本

在浏览器控制台运行以下脚本：

```javascript
// 验证CodeMirror布局是否正常
const cm = document.querySelector('.CodeMirror').CodeMirror;
const gutters = cm.display.gutters;
const foldGutter = gutters.querySelector('.CodeMirror-foldgutter');
const scroll = cm.display.wrapper.querySelector('.CodeMirror-scroll');

console.log('=== CodeMirror布局验证 ===');
console.log('Gutters 宽度:', gutters.offsetWidth, '(期望>50)');
console.log('折叠列位置:', foldGutter.offsetLeft, '(期望>40)'); 
console.log('Scroll 高度:', scroll.offsetHeight, '(期望>600)');

// 判断是否通过
const pass = gutters.offsetWidth > 50 && 
             foldGutter.offsetLeft > 40 && 
             scroll.offsetHeight > 600;

console.log(pass ? '✅ 布局正常' : '❌ 布局异常');
```

### 期望结果

- Gutters宽度: >50px (通常为75-106px，取决于文档行数)
- 折叠列位置: >40px (通常为43-44px)
- Scroll高度: >600px (通常为634-684px，取决于窗口大小)

### 已验证环境

- ✅ Windows 11 + Chrome
- ✅ 开发环境 (localhost:3000)
- ✅ Node.js v24 + Vue CLI 3

## 回滚方案

如果部署后发现新问题：

```bash
# 恢复备份
rm -rf /path/to/production/dist
mv /path/to/production/dist.backup.YYYYMMDD_HHMMSS /path/to/production/dist

# 重启服务
systemctl reload nginx
```

## 技术细节

**修改文件**: 
- `src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue` (行1025-1060)

**关键代码**:
```javascript
onViewTabChange(key) {
  this.viewMode = key
  if (key === 'source') {
    // ... 其他逻辑 ...
    
    // 修复CodeMirror布局
    this.$nextTick(() => {
      this.$nextTick(() => {
        setTimeout(() => {
          if (this.$refs.editor && this.$refs.editor.getEditor) {
            const cm = this.$refs.editor.getEditor()
            const gutters = cm.display.gutters
            const scrollElement = cm.display.wrapper.querySelector('.CodeMirror-scroll')

            // 1. 修复gutters容器宽度
            const totalWidth = Array.from(gutters.children).reduce(
              (sum, child) => sum + child.offsetWidth, 0
            )
            if (totalWidth > 0) {
              gutters.style.width = totalWidth + 'px'
            }

            // 2. 修复子元素定位
            let leftPosition = 0
            Array.from(gutters.children).forEach((child) => {
              child.style.left = leftPosition + 'px'
              leftPosition += child.offsetWidth
            })

            // 3. 清除scroll容器错误样式
            scrollElement.style.height = ''
            scrollElement.style.minHeight = ''
            scrollElement.style.maxHeight = ''

            // 4. 强制重新计算
            cm.setSize(null, null)
            setTimeout(() => {
              cm.setSize('100%', '100%')
              cm.refresh()
            }, 50)
          }
        }, 100)
      })
    })
  }
}
```

## 注意事项

1. **浏览器缓存**: 用户必须清除缓存才能看到修复效果
2. **性能影响**: 修复逻辑在视图切换时执行，延迟约150-200ms，对用户体验影响很小
3. **兼容性**: 修复方案不影响首次进入源码视图的体验，只在视图切换时生效
4. **后续优化**: 如果未来升级CodeMirror或Ant Design版本，需重新验证此修复是否仍然必要

## 联系人

- 开发: Claude (AI Assistant)
- 测试: [待填写]
- 部署: [待填写]
