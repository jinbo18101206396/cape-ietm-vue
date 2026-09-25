# UEditor 部署指南（手动版）

**目标**: 为Para设计器部署UEditor 1.4.3.3编辑器

---

## 方式1: 手动下载部署（推荐）

### 步骤1: 下载UEditor

访问以下任一地址下载：

**选项A - 官方下载**:
- 地址: http://ueditor.baidu.com/website/download.html
- 选择: **UEditor 1.4.3.3 JSP UTF8版**
- 文件名: `ueditor1_4_3_3-utf8-jsp.zip` (约2.5MB)

**选项B - GitHub下载**:
- 地址: https://github.com/fex-team/ueditor/releases/tag/v1.4.3.3
- 下载: `ueditor1_4_3_3-utf8-jsp.zip`

**选项C - npm安装**:
```bash
cd D:/workspace/IETM/cape-ietm-vue
npm install ueditor --save
# 然后将 node_modules/ueditor 复制到 public/static/ueditor
```

### 步骤2: 解压到指定目录

将下载的zip文件解压到：
```
D:/workspace/IETM/cape-ietm-vue/public/static/ueditor/
```

解压后的目录结构应该是：
```
public/static/ueditor/
├── dialogs/                  # 对话框
├── lang/                     # 语言包
│   └── zh-cn/
│       └── zh-cn.js
├── themes/                   # 主题样式
│   ├── default/
│   │   └── css/
│   │       └── ueditor.css
│   └── iframe.css
├── third-party/              # 第三方插件
├── ueditor.all.js           # 核心文件（完整版，约600KB）
├── ueditor.all.min.js       # 核心文件（压缩版）
├── ueditor.config.js        # 配置文件
└── ueditor.parse.js         # 前端展现
```

### 步骤3: 验证文件完整性

运行以下命令检查核心文件：
```bash
cd D:/workspace/IETM/cape-ietm-vue/public/static/ueditor
ls -lh ueditor.all.js ueditor.config.js lang/zh-cn/zh-cn.js themes/default/css/ueditor.css
```

应该看到4个文件都存在。

### 步骤4: 修改配置文件

编辑 `public/static/ueditor/ueditor.config.js`，找到：
```javascript
window.UEDITOR_HOME_URL = "/ueditor/";
```

修改为：
```javascript
window.UEDITOR_HOME_URL = "/static/ueditor/";
```

### 步骤5: 在 index.html 引入

编辑 `public/index.html`，在 `</body>` 前添加：
```html
<!-- UEditor 编辑器 -->
<script src="/static/ueditor/ueditor.config.js"></script>
<script src="/static/ueditor/ueditor.all.min.js"></script>
<script src="/static/ueditor/lang/zh-cn/zh-cn.js"></script>
```

---

## 方式2: CDN引入（备选）

如果手动下载困难，可以使用CDN：

在 `public/index.html` 中添加：
```html
<!-- UEditor CDN -->
<script src="https://cdn.bootcdn.net/ajax/libs/ueditor/1.4.3.3/ueditor.config.js"></script>
<script src="https://cdn.bootcdn.net/ajax/libs/ueditor/1.4.3.3/ueditor.all.min.js"></script>
<script src="https://cdn.bootcdn.net/ajax/libs/ueditor/1.4.3.3/lang/zh-cn/zh-cn.js"></script>
```

**注意**: CDN方式需要修改 `UEDITOR_HOME_URL` 为CDN路径。

---

## Kity Formula 插件（可选）

如果需要公式编辑功能：

### 下载
- GitHub: https://github.com/fex-team/kityformula
- 下载zip并解压到: `public/static/ueditor/kityformula-plugin/`

### 配置
在 `ueditor.config.js` 中添加：
```javascript
// 公式插件路径
, formulaPath: '/static/ueditor/kityformula-plugin/'
```

---

## 验证部署

### 测试1: 启动开发服务器
```bash
cd D:/workspace/IETM/cape-ietm-vue
npm run serve
```

### 测试2: 浏览器控制台
打开浏览器控制台（F12），检查是否有UEditor相关错误。

### 测试3: 访问Para设计器
1. 登录系统
2. 进入DM编辑器
3. 双击para节点
4. 应该看到UEditor编辑器加载

---

## 故障排查

### 问题1: 404错误（找不到ueditor.all.js）

**原因**: 路径配置错误

**解决**:
1. 检查 `UEDITOR_HOME_URL` 是否为 `/static/ueditor/`
2. 检查文件是否在 `public/static/ueditor/` 目录下
3. 重启开发服务器

### 问题2: 编辑器无法初始化

**原因**: 脚本加载顺序错误

**解决**: 确保按顺序加载：
1. `ueditor.config.js` （配置）
2. `ueditor.all.js` （核心）
3. `lang/zh-cn/zh-cn.js` （语言）

### 问题3: 工具栏图标不显示

**原因**: 主题CSS未加载

**解决**:
1. 检查 `themes/default/css/ueditor.css` 是否存在
2. 检查 `themes/default/images/` 图标是否完整

---

## 快速验证命令

运行以下命令一键检查：
```bash
cd D:/workspace/IETM/cape-ietm-vue

# 检查目录结构
echo "=== 检查UEditor文件 ==="
if [ -f "public/static/ueditor/ueditor.all.js" ]; then
    echo "✅ ueditor.all.js 存在"
    ls -lh public/static/ueditor/ueditor.all.js
else
    echo "❌ ueditor.all.js 缺失"
fi

if [ -f "public/static/ueditor/ueditor.config.js" ]; then
    echo "✅ ueditor.config.js 存在"
else
    echo "❌ ueditor.config.js 缺失"
fi

if [ -f "public/static/ueditor/lang/zh-cn/zh-cn.js" ]; then
    echo "✅ 中文语言包存在"
else
    echo "❌ 中文语言包缺失"
fi

if [ -d "public/static/ueditor/themes" ]; then
    echo "✅ 主题目录存在"
else
    echo "❌ 主题目录缺失"
fi

echo ""
echo "=== 检查配置 ==="
grep "UEDITOR_HOME_URL" public/static/ueditor/ueditor.config.js 2>/dev/null || echo "配置文件未找到"

echo ""
echo "如果以上都显示 ✅，说明部署成功！"
```

---

## 联系支持

如果遇到问题，提供以下信息：
1. 错误截图（浏览器控制台）
2. 目录结构截图（`ls -la public/static/ueditor/`）
3. 配置文件内容（`UEDITOR_HOME_URL` 部分）

---

**部署完成后，Para设计器即可正常使用UEditor编辑器！** 🎉
