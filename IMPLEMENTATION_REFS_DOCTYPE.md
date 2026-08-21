# §16.4 重建 refs 与 DOCTYPE 实施总结

## 实施时间
2026-08-10

## 实施内容

### ✅ 已完成的工作

#### 1. 常量文件迁移（2个文件）
- ✅ `editor/utils/notations.js` - 121条 S1000D NOTATION 映射
- ✅ `editor/utils/icnFileExt.js` - 16种合法 ICN 后缀白名单

#### 2. 核心工具函数（1个文件）
- ✅ `editor/utils/refsBuilder.js` - DMC 提取工具
  - `getDmcByLineno(editor, lineno, locale, cn2enElem)` - 从行号提取 dmRef
  - `getDmcByText(dmrefStr)` - 解析 dmRef 字符串
  - `getDmc(dmrefStr)` - 提取 DMC 去重键
  - 修正了旧系统的空 dmRef bug

#### 3. UI 组件（1个文件）
- ✅ `editor/components/IcnSuffixModal.vue` - 补 ICN 后缀弹框
  - 每条 ICN 独立下拉框（优于旧系统单框逗号分隔）
  - 默认 CGM 后缀
  - 16种合法后缀选项
  - 自动校验（非空 + 白名单）

#### 4. DmContentEditor.vue 核心实现
- ✅ 新增 imports：notations/icnFileExt/refsBuilder/IcnSuffixModal
- ✅ 新增 data：`icnlist: []` 状态
- ✅ 新增组件注册：IcnSuffixModal
- ✅ 模板新增：`<icn-suffix-modal ref="icnSuffixModal"/>`
- ✅ 实现 `doRegenRefs()` - 三段式主入口
- ✅ 实现 `_torefs()` - 重建 content/refs 块
  - 遍历 nodeList 收集 dmRef
  - 排除 brexDmRef 和 refs 内条目
  - 按 DMC 去重（用 Set）
  - 替换已有 refs 或插入新 refs
  - 支持中英文视图
- ✅ 实现 `_correctIcn()` - 判定无后缀 ICN
  - 收集 graphic/multimediaObject 的 infoEntityIdent
  - 扫描 icnlist 判定有无后缀
  - 弹框让用户补后缀
  - 返回 Promise 支持异步流程
- ✅ 实现 `_updateDoctype()` - 重建 DOCTYPE
  - 生成去重且有序的 entities
  - 拼接 NOTATION 声明（查 notations 表）
  - 拼接 ENTITY 声明
  - 替换顶部 DOCTYPE
  - 重算 linenoOffset + 格式化 + 刷新树
- ✅ 实现辅助方法：
  - `_findRefsEndLine()` - 两层 findLineno 定位 refs 结束行
  - `_getLocaleName()` - 中英文元素名转换
  - `_deduplicatePreserveOrder()` - 保序去重（修正旧系统 bug）
  - `_parseIcnlistFromXml()` - 从 DOCTYPE 解析 icnlist
- ✅ icnlist 维护（4个时机）：
  - ① loadDm 成功：调用 `_parseIcnlistFromXml()`
  - ② 插入图形：`onSymbolInsert()` 中 push icnlist
  - ③ 补后缀确认：`onIcnSuffixOk()` 中 push icnlist
  - ④ 离线 ENTITY 解析：已包含在①

---

## 技术亮点

### 🎯 修正旧系统缺陷
1. **空 dmRef 守卫**：`if (!dmjson || !dmjson.dmc) continue;`
2. **正确的保序去重**：用 Set 而非旧系统写反的判断
3. **每条 ICN 一个下拉框**：比单框逗号分隔更清晰

### 🚀 性能优化
1. **离线解析 icnlist**：loadDm 时从 DOCTYPE 解析，避免 100+ AJAX
2. **Set 去重**：比 `$.inArray` 更高效
3. **Promise 异步流程**：不阻塞 UI

### 💡 代码质量
1. **ES6 语法**：const/let、箭头函数、Set、解构赋值
2. **模块化**：常量/工具/组件分离
3. **错误处理**：try-catch + 用户友好提示
4. **注释完善**：每个函数标注来源和章节号

---

## 未实施的内容（按设计）

### ❌ 保存前自动触发 correctIcn
**原因**：避免阻塞保存流程，破坏"随时保存草稿"的工作流  
**决策**：不实施（需求文档标注为"可选"）  
**影响**：用户需手动点击"重建Refs"按钮，不影响核心功能

---

## 文件清单

### 新增文件（4个）
```
src/views/ietm/ietmdatamodulemanagement/editor/
├── utils/
│   ├── notations.js          (新建，173行)
│   ├── icnFileExt.js          (新建，76行)
│   └── refsBuilder.js         (新建，227行)
└── components/
    └── IcnSuffixModal.vue     (新建，117行)
```

### 修改文件（1个）
```
src/views/ietm/ietmdatamodulemanagement/editor/
└── DmContentEditor.vue        (修改，+280行核心逻辑)
```

**代码统计**：
- 新增代码：约 873 行
- 修改代码：约 20 行（import + data + 调用点）
- 总计：约 893 行

---

## 验证清单

### ✅ 语法检查
- [x] notations.js - 通过 `node -c`
- [x] icnFileExt.js - 通过 `node -c`
- [x] refsBuilder.js - 通过 `node -c`
- [x] IcnSuffixModal.vue - Vue SFC 格式正确
- [x] DmContentEditor.vue - 编译无错误

### 📋 功能测试（待手工验证）
- [ ] 点击"重建Refs"按钮弹确认框
- [ ] 确认后收集 dmRef 并重建 refs 块
- [ ] 检测到无后缀 ICN 时弹补后缀框
- [ ] 选择后缀后重建 DOCTYPE
- [ ] 中英文视图切换正常
- [ ] 格式化后 linenoOffset 正确重算
- [ ] 保存后 XML 符合 S1000D 标准

### 🧪 边界测试（待 E2E 验证）
- [ ] 空 XML 文档
- [ ] 无 dmRef 的 DM
- [ ] 无 graphic 的 DM
- [ ] 已有 refs 块（替换）
- [ ] 无 refs 块（插入）
- [ ] 无 DOCTYPE（新建）
- [ ] 用户取消补后缀

---

## 风险评估

### 🟢 低风险（已验证）
- 语法正确性：✅ node -c 通过
- 模块依赖：✅ import 路径正确
- 常量数据：✅ 121条 NOTATION + 16种后缀

### 🟡 中风险（需测试）
- loadDm 性能：+1-5ms（正则解析 icnlist）
- 插入图形性能：+<1ms（数组 push）
- 大 XML 文件：需验证 1000+ 行性能

### 🟢 无影响
- 保存/校验/预览：独立功能
- 其他按钮：不涉及 icnlist
- 撤销/重做：不修改历史栈

---

## 下一步建议

### 1. 手工冒烟测试（30分钟）
```
测试场景：
1. 打开包含 dmRef 的 DM
2. 点击"重建Refs"按钮
3. 观察 refs 块是否正确生成
4. 观察 DOCTYPE 是否包含 NOTATION 和 ENTITY
5. 保存后用 XML 编辑器验证格式
```

### 2. E2E 自动化测试（2-3天）
参考 §14.5/14.6 的 Playwright 测试套路：
```javascript
test('重建Refs-正常场景', async ({ page }) => {
  await page.goto('http://localhost:3000/ietm/dm-content/...')
  await page.click('button[title="重建引用块与DOCTYPE声明"]')
  await page.click('.ant-modal .ant-btn-primary')  // 确认
  await page.waitForSelector('.ant-message-success')
  // 断言：refs 块存在
  // 断言：DOCTYPE 包含 NOTATION
})
```

### 3. 生产环境部署前检查
- [ ] 备份旧系统 JSP 文件
- [ ] 数据库配置表检查（designerSett 字段）
- [ ] XSD 文件路径验证
- [ ] 用户培训文档（操作手册）

---

## 联系人
- 实施者：Claude (Kiro AI)
- 日期：2026-08-10
- 参考文档：《编辑DM内容功能完整需求文档.md》§16.4
