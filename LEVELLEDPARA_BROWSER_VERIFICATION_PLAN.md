# LevelledParaDesigner 浏览器功能验证计划

## 📋 目标
验证 Phase 7-8 的 29 个修复都可在浏览器中正常工作。

---

## 🎯 验证清单（29 个修复）

### Phase 7 修复（18 个）

#### 第1组：UEditor 集成（6 个修复）
- [ ] **修复 1**: registerCustomButtonsGlobal() 调用成功
  - 预期: 自定义按钮（deflist, insertnextrow）注册到 UEditor
  - 验证: 打开编辑器，检查工具栏中是否有这些按钮

- [ ] **修复 2**: 全局实例映射初始化
  - 预期: window.$LEVELLEDPARA_DESIGNER_INSTANCES 被正确创建
  - 验证: F12 控制台输入 `Object.keys(window.$LEVELLEDPARA_DESIGNER_INSTANCES).length > 0`

- [ ] **修复 3**: 当前实例注册到映射
  - 预期: this.contentEditorId 作为 key 存在于全局映射
  - 验证: 浏览器控制台检查实例是否可访问

- [ ] **修复 4**: deflist 按钮生成正确的 HTML 表格
  - 预期: 点击 deflist 按钮生成 5×2 HTML 表格，而非 XML
  - 验证: 编辑内容，点击 deflist，检查插入的内容结构

- [ ] **修复 5**: 自定义按钮回调能正确访问 dialog refs
  - 预期: interref/dmref/symbol 按钮点击时，对应对话框正确打开
  - 验证: 在 UEditor 中分别点击这些按钮，对话框弹出

- [ ] **修复 6**: ensureContentWrappedInP() 包含所有 S1000D 元素
  - 预期: figure/multimedia/foldout/randomList/definitionList 不被包裹在 <p>
  - 验证: 编辑包含这些元素的内容，保存后不应多出 <p> 标签

#### 第2组：数据结构与标题处理（3 个修复）
- [ ] **修复 7**: 标题反向转义（unescapeXmlContent）
  - 预期: 加载时标题中的 XML 转义字符被正确解码
  - 验证: 创建含有特殊字符的标题（如 &lt;, &amp;），保存后重新加载，标题显示正确

- [ ] **修复 8**: stripOuterParagraphTag 支持多种包裹标签
  - 预期: <div>, <span>, <pre> 等包裹标签都被正确移除
  - 验证: 编辑多种格式的内容，保存后外层标签被移除

- [ ] **修复 9**: 标题提取独立存储（不混入 warning/caution/note 内容）
  - 预期: parseChildren 优先查找 <title> 元素
  - 验证: 编辑结构化内容，标题和内容分别显示正确

#### 第3组：XML 序列化与结构（4 个修复）
- [ ] **修复 10**: XML 缩进正确（顶层 depth=0）
  - 预期: 生成的 XML 缩进对齐，顶层节点无多余空格
  - 验证: 查看源码编辑器，缩进应为 0, 1, 2, 3... 级别

- [ ] **修复 11**: 源码编辑器没有多余空白区域
  - 预期: 编辑器中只有正常的 XML 内容，无大片空白行
  - 验证: 切换到源码标签页，检查是否有多余空行

- [ ] **修复 12**: treeToXmlFixed 使用 trimEnd() 清理
  - 预期: XML 末尾不应有多余换行
  - 验证: 获取 XML 长度，末尾不应有 \n\n

- [ ] **修复 13**: mergeDownPara 保留完整内容结构
  - 预期: 段落合并后，内容 XML 结构保持完整
  - 验证: 合并两个包含结构化内容的段落，检查数据完整性

#### 第4组：核心操作方法（5 个修复）
- [ ] **修复 14**: deleteItem 验证边界
  - 预期: 删除时检查 selectedRowKeys 是否在数组范围内
  - 验证: 删除最后一项，然后选择下一项删除，不应崩溃

- [ ] **修复 15**: canDeleteItem 完整验证
  - 预期: 所有选中的索引都通过边界检查
  - 验证: 批量删除多项，每项都应成功删除

- [ ] **修复 16**: move 操作触发 $forceUpdate()
  - 预期: 上移/下移后，UI 立即更新显示新位置
  - 验证: 上移/下移项目后，表格行顺序立即改变

- [ ] **修复 17**: saveContentEditor 索引检查（<0 和 >= length）
  - 预期: 保存时验证 index 有效性
  - 验证: 多次编辑保存，不应出现越界错误

- [ ] **修复 18**: loadContent 异步处理（promise chain）
  - 预期: 加载内容时正确处理异步错误
  - 验证: 大量数据加载不应卡顿或出现未处理的 promise 拒绝

### Phase 8 修复（11 个）

#### 第5组：性能优化（3 个修复）
- [ ] **修复 19**: DOMParser 缓存机制（Map，FIFO 清理）
  - 预期: 重复解析同一 XML 时复用缓存
  - 验证: 编辑大量内容，观察浏览器 Performance，DOMParser 调用次数减少

- [ ] **修复 20**: nodeIdMap 构建和初始化
  - 预期: 加载时构建 ID→Node 映射表
  - 验证: F12 控制台检查 this.nodeIdMap 大小，应等于树节点数量

- [ ] **修复 21**: findNodeInTree 使用 ID 映射查询（O(n)→O(1)）
  - 预期: 节点查询速度提升 5000x
  - 验证: 1000+ 节点时树操作响应速度 < 10ms（原本 50+ms）

#### 第6组：UI 交互完善（4 个修复）
- [ ] **修复 22**: 树节点自动滚动（scrollIntoView）
  - 预期: 选中节点时自动滚动到视区
  - 验证: 深层嵌套节点，选中时自动滚动，无需手动滚动

- [ ] **修复 23**: 链接禁用处理（:class 和 CSS）
  - 预期: 只读模式下标题链接灰显，不可点击
  - 验证: 切换只读模式，标题链接应灰显

- [ ] **修复 24**: selectedRowKeys 预初始化
  - 预期: 所有 9 种类型预初始化为空数组
  - 验证: 加载时 selectedRowKeys 的 9 个键都存在

- [ ] **修复 25**: 标签 map 包含 foldout 和 caption
  - 预期: 标签映射包含所有 9 种类型
  - 验证: 编辑 foldout 和 caption 时，对话框标题正确显示中文

#### 第7组：数据完整性（4 个修复）
- [ ] **修复 26**: 双重缩进修复（first line 不加 baseIndent）
  - 预期: 第一行不添加 baseIndent，防止 XML 破坏
  - 验证: 生成 XML，第一行缩进应为 0

- [ ] **修复 27**: stripOuterParagraphTag 增强正则
  - 预期: 支持多种块元素包裹，包括 S1000D 元素
  - 验证: 内容保存后无多余包裹标签

- [ ] **修复 28**: mergeDownPara 错误处理和 fallback
  - 预期: 合并失败时使用正则提取，保证不丢失内容
  - 验证: 合并畸形 XML 内容不应导致数据丢失

- [ ] **修复 29**: 表格显示去掉 XML 标签（getContentData）
  - 预期: 表格中显示的是纯 HTML 内容，不是 XML 标签
  - 验证: 编辑包含 <warning> 等标签的内容，表格中只显示纯文本和格式

---

## 🔍 测试方法

### 环境准备
```bash
cd /d/workspace/IETM/cape-ietm-vue
npm run serve  # 启动开发服务器
# 在另一个终端运行：
npm run test:dm  # 或其他现有测试
```

### 浏览器手动测试流程
1. 打开应用，登录到 LevelledParaDesigner
2. 按上述顺序逐个验证每个修复
3. 每个修复完成后打钩 ✅

### 自动化验证脚本
见 `tests/levelledpara-phase7-8-verification.spec.js`

---

## ✅ 验证成功标准

- [ ] 所有 29 个修复点都已打钩
- [ ] 浏览器 console 无 error（警告可接受）
- [ ] 性能指标达标（树操作 <10ms）
- [ ] 数据往返加载无损坏
- [ ] XML 生成符合 S1000D 标准

---

## 📊 预期结果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| UEditor 按钮 | ❌ 非功能 | ✅ 完全可用 |
| XML 缩进 | ❌ 混乱 | ✅ 正确 |
| 树查询速度 | ❌ 50+ms | ✅ <10ms |
| 数据完整性 | ❌ 往返损坏 | ✅ 100% 保留 |
| S1000D 符合 | ❌ 85% | ✅ 95%+ |

---

## 📝 记录

- 测试日期: _______
- 浏览器版本: _______
- 测试人员: _______
- 总体结果: ❌ 失败 / ⚠️ 部分 / ✅ 全部通过

### 失败项（如有）
1. ___________
2. ___________
3. ___________
