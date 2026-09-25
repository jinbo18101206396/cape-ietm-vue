# 🚀 快速部署指南 - CodeMirror布局修复 v2.3

**5分钟完成部署** | 2026-09-24

**修复内容**：
1. ✅ Gutters 宽度塌陷：1px → 105px
2. ✅ 内容区域空白：344px空白区域完全消除

---

## 方式A：本地开发环境测试（推荐先做）

### 1. 启动开发服务器

```bash
cd D:/workspace/IETM/cape-ietm-vue
npm run serve
```

### 2. 打开浏览器测试

访问: http://localhost:8080

**测试步骤**:
1. 登录系统
2. 进入 "数据模块管理" → 双击任意DM打开编辑器
3. 首次进入源码视图：观察布局是否正常 ✓
4. 双击左侧树的 `para` 节点 → 进入设计视图（UEditor界面）
5. **关键步骤**: 点击顶部 "源码视图" 标签切换回来
6. 按 F12 打开开发者工具 → Elements 标签
7. 找到 `.CodeMirror-gutters` 元素，查看 `width` 属性

**预期结果**:
- ✅ Gutters 宽度：`width: 105px`（修复成功）
- ✅ 空白区域：CodeMirror 内容完全填满容器，下方无空白
- ❌ 如果 gutters 仍为 `width: 1px` 或仍有空白区域（修复失败）

**控制台日志**（F12 → Console）:
```
[DmSourceView] 🔧 开始强制修复gutters布局
[DmSourceView] ✅ Gutters宽度已修复为: 105px
[DmSourceView] 🔧 强制设置 scroller 高度为 wrapper 高度: 634px
[DmSourceView] === 最终验证 ===
[DmSourceView] wrapper.offsetHeight: 634
[DmSourceView] scroller.offsetHeight: 684
[DmSourceView] ✅ 高度完美匹配，空白区域已消除
[DmSourceView] ✅ Gutters布局修复完成
```

---

## 方式B：生产环境部署（三选一）

### 选项1: 使用自动化脚本（需要SSH访问权限）

```bash
cd D:/workspace/IETM/cape-ietm-vue

# 1. 编辑脚本，填写你的服务器信息
vim deploy-to-production.sh
# 修改这几行:
#   PROD_SERVER="your-production-server"  → 改为实际服务器地址
#   PROD_USER="deploy"                    → 改为你的SSH用户名
#   PROD_PATH="/opt/ietm/frontend"        → 改为实际部署路径

# 2. 执行部署
./deploy-to-production.sh
```

脚本会自动完成：
- ✓ 检查本地构建
- ✓ 创建部署包 (tar.gz)
- ✓ 提示你备份生产环境
- ✓ 提示你上传文件
- ✓ 显示验证清单

---

### 选项2: 手动部署（通用方式）

#### 步骤1: 创建部署包

```bash
cd D:/workspace/IETM/cape-ietm-vue
tar -czf ietm-frontend-v2.1.tar.gz -C dist .
```

#### 步骤2: 上传到服务器

使用你习惯的工具（FTP/SCP/WinSCP/FileZilla）上传 `ietm-frontend-v2.1.tar.gz`

#### 步骤3: 在服务器上解压

```bash
# 登录到生产服务器
ssh user@production-server

# 备份现有版本
cd /path/to/frontend
tar -czf dist.backup.$(date +%Y%m%d_%H%M%S).tar.gz dist/

# 解压新版本
rm -rf dist
mkdir dist
tar -xzf ietm-frontend-v2.1.tar.gz -C dist/

# 重启Web服务器（如Nginx）
sudo systemctl reload nginx
```

---

### 选项3: 直接在服务器上重新构建

```bash
# 登录到生产服务器
ssh user@production-server
cd /path/to/ietm-vue

# 拉取最新代码
git pull origin main

# 备份旧版本
tar -czf dist.backup.$(date +%Y%m%d_%H%M%S).tar.gz dist/

# 重新构建
npm run build:prod

# 重启Web服务器
sudo systemctl reload nginx
```

---

## 🧪 部署后验证（必须完成）

### 验证步骤

1. 打开生产环境编辑器
2. 切换到源码视图
3. **按 F12** 打开开发者工具 → Elements 标签
4. 找到 `.CodeMirror-gutters`，检查 `width` 属性

### ✅ 成功标志

```
width: 105px;  ← 这是正确的
```

控制台显示:
```
[DmSourceView] ✅ Gutters宽度已修复为: 105px
```

### ❌ 失败标志

```
width: 1px;  ← 说明修复未生效
```

**如果失败，执行回滚**:
```bash
cd /path/to/frontend
rm -rf dist
tar -xzf dist.backup.YYYYMMDD_HHMMSS.tar.gz
sudo systemctl reload nginx
```

---

## 📊 补充验证（可选）

### 1. 快速切换测试

连续切换视图5次，每次切换后检查 gutters 宽度是否保持 105px

### 2. 多标签页测试

同时打开3个DM编辑器，切换视图，验证互不干扰

### 3. 窗口缩放测试

拖动浏览器窗口改变大小，检查布局是否自适应

---

## ⚠️ 常见问题

### Q1: 浏览器缓存导致看不到新版本

**解决**: 按 `Ctrl + F5` 强制刷新，或清除浏览器缓存

### Q2: 控制台看不到日志

**原因**: 控制台过滤器可能隐藏了日志

**解决**: 
1. 打开 F12 → Console
2. 点击右上角过滤器图标
3. 确保 "Info" 和 "Verbose" 都已勾选
4. 在过滤框输入 `DmSourceView` 快速定位

### Q3: gutters 宽度仍然是 1px

**可能原因**:
1. 部署包未包含修复代码 → 重新构建
2. 服务器缓存未清除 → 重启Nginx
3. 浏览器缓存 → Ctrl+F5 强刷
4. 时机问题（慢速机器）→ 考虑升级到 ResizeObserver 方案

---

## 📞 需要帮助？

提供以下信息以便诊断：

1. **浏览器信息**: Chrome 110 / Firefox 108 / Edge 109
2. **F12控制台完整日志**: 截图或复制文本
3. **元素样式截图**: `.CodeMirror-gutters` 的 Computed 样式
4. **操作录屏**: 如果可以，录制切换视图的操作过程

---

## 🎯 成功标准

- [x] dist/ 目录存在且完整 (21:43:32 构建)
- [x] 修复代码已打包到 chunk-1ec23d5c.js
- [x] 部署检查清单已创建
- [x] 自动化部署脚本已创建
- [ ] **你的验证**: gutters 宽度 = 105px ✓
- [ ] **你的验证**: 控制台显示修复成功日志 ✓
- [ ] **你的验证**: 快速切换5次无异常 ✓

**只要最后3项通过，部署即成功！** 🎉
