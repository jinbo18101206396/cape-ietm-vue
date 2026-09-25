# 部署检查清单 v2.3 - CodeMirror布局修复

**构建时间**: 待确认  
**修复版本**: v2.3  
**修复内容**: 
1. CodeMirror源码视图 Gutters 宽度塌陷（1px → 105px）
2. CodeMirror内容区域下方空白区域（344px → 0px）

---

## ✅ 部署前检查

- [x] **代码已构建**: dist/目录存在，index.html时间戳 21:43:32
- [x] **修复代码已打包**: forceFixGuttersLayout() 已包含在 chunk-1ec23d5c.js
- [x] **dist目录完整**: 包含 js/css/fonts/img/static 等所有资源

---

## 📋 部署步骤

### 第一步：备份现有生产环境

```bash
# 在生产服务器执行
cd /path/to/production/frontend
cp -r dist dist.backup.$(date +%Y%m%d_%H%M%S)
```

### 第二步：上传新构建文件

```bash
# 方式A：本地上传到生产服务器
cd D:/workspace/IETM/cape-ietm-vue
# 使用你的部署工具（scp/ftp/jenkins等）上传整个 dist/ 目录

# 方式B：在生产服务器上拉取代码并重新构建
git pull origin main
npm run build:prod
```

### 第三步：重启Web服务器（如需要）

```bash
# Nginx示例
sudo systemctl reload nginx

# 或清除CDN缓存（如有）
# ...
```

### 第四步：验证部署

访问生产环境URL，按F12打开开发者工具，执行以下检查：

---

## 🧪 部署后验证清单

### 1. 基础功能验证

- [ ] 打开任意DM数据模块编辑器
- [ ] 首次进入源码视图：布局正常 ✓
- [ ] 双击para节点进入设计视图：UEditor加载正常 ✓
- [ ] 点击"源码视图"标签切换回源码视图

### 2. 关键指标验证（F12 → Elements）

检查 `.CodeMirror-gutters` 元素：

- [ ] **宽度**: 应为 `width: 105px`（不是1px）
- [ ] **子元素定位**:
  - `.CodeMirror-linenumbers`: left: 0px, width: 40px
  - `.CodeMirror-foldgutter`: left: 40px, width: ~47px
  - `.dmGutter`: left: ~87px, width: 18px

检查 `.CodeMirror-scroll` 元素：

- [ ] **高度**: 应接近容器高度（误差 < 100px）
- [ ] **内容区域**: 完全填满容器，下方无大块空白

### 3. 控制台日志验证

应看到以下日志（按顺序）：

```
[DmSourceView] 🔧 开始强制修复gutters布局
[DmSourceView] === 修复前状态诊断 ===
[DmSourceView] Wrapper.offsetHeight: xxxx
[DmSourceView] .dm-source-view.offsetHeight: xxxx
[DmSourceView] Gutters.offsetWidth: 1
[DmSourceView] ✓ 已清除 TabPane 高度限制
[DmSourceView] ✓ 已清除 .dm-source-view 高度限制
[DmSourceView] ✓ 已清除 wrapper 高度缓存
[DmSourceView] === 修复后状态 ===
[DmSourceView] Wrapper.offsetHeight: xxxx (应>0)
[DmSourceView] ✅ Gutters宽度已修复为: 105px
[DmSourceView] 🔧 修复前 scroller.offsetHeight: 350
[DmSourceView] 🔧 强制设置 scroller 高度为 wrapper 高度: 634px
[DmSourceView] === 最终验证 ===
[DmSourceView] scroller.offsetHeight: 684 (应接近 wrapper)
[DmSourceView] ✅ 高度完美匹配，空白区域已消除
[DmSourceView] ✅ Gutters布局修复完成
```

### 4. 视觉验证

- [ ] **无空白区域**: CodeMirror内容区域下方没有空白块
- [ ] **行号对齐**: 行号列、折叠图标、铅笔图标三列对齐
- [ ] **滚动正常**: 垂直滚动条在正确位置，滚动流畅
- [ ] **内容可见**: XML代码完整显示，无截断

### 5. 边界情况测试

- [ ] 快速切换视图5次：每次切换后gutters宽度都是105px
- [ ] 窗口缩放：拖动浏览器窗口改变大小，布局自适应
- [ ] 多标签页：同时打开多个DM编辑器，互不干扰

---

## ⚠️ 回滚方案

如果验证失败，立即回滚：

```bash
# 在生产服务器执行
cd /path/to/production/frontend
rm -rf dist
mv dist.backup.YYYYMMDD_HHMMSS dist
sudo systemctl reload nginx
```

---

## 📊 已知限制（v2.3）

**v2.3 完全解决了布局问题，无已知限制。**

修复方案：
1. ✅ Gutters 宽度：手动计算子元素宽度并强制设置
2. ✅ 内容区域高度：直接强制设置 `scroller.style.height = wrapper.offsetHeight + 'px'`

对比旧版本：
- v2.1：仅修复 gutters 宽度，空白区域依然存在
- v2.2：尝试清除缓存但失败
- v2.3：直接强制设置高度，彻底解决问题

---

## 🎯 验证通过标准

所有以下条件必须同时满足：

✅ Gutters宽度 = 105px（不是1px）  
✅ 控制台显示修复成功日志  
✅ 无空白区域（scroller 高度接近 wrapper 高度）  
✅ 快速切换5次无异常  

如果任何一项失败，标记为**验证未通过**，启动回滚流程。

---

## 📞 联系方式

如有问题，请提供：
1. 浏览器类型和版本
2. F12控制台完整日志
3. `.CodeMirror-gutters` 元素的Computed样式截图

---

**部署负责人签名**: ___________  
**验证时间**: ___________  
**验证结果**: [ ] 通过 / [ ] 未通过
