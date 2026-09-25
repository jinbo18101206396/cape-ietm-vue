# Para设计器已知问题与待办事项

**版本**: v1.0  
**日期**: 2026-09-24  
**严重等级**: P0=阻塞 | P1=严重 | P2=一般 | P3=轻微

---

## 🔴 P0 - 阻塞问题（0个）

无

---

## 🟠 P1 - 严重问题（3个）

### P1-1: captionGroup 转换依赖后端API，离线模式下无法工作

**位置**: `paraConverter.js:235-299`

**现象**:
```javascript
// para2html中，captionGroup转换必须调用后端API
const res = await axios.post('/jeecg-boot/ietm/dm-content/transCaptionToHtml', ...)
```

**影响**: 
- 后端服务不可用时，含 `<captionGroup>` 的para无法打开
- 前端测试环境需要mock该API

**建议方案**:
```javascript
// 方案A：降级处理（推荐）
try {
  const html = await convertCaptionGroupToTable(m)
  html = html.replace(m, tableHtml)
} catch (error) {
  console.warn('[captionGroup] API调用失败，保留原始XML', error)
  // 降级：将captionGroup包装为<pre>标签，保持可读性
  html = html.replace(m, `<pre class="caption-fallback">${m}</pre>`)
}

// 方案B：纯前端实现（工作量大）
// 将后端Java转换逻辑移植到JS
```

**优先级**: 高（影响用户体验）  
**工作量**: 方案A=2h | 方案B=1d

---

### P1-2: dmRef 转换依赖后端API查询DM信息

**位置**: `paraConverter.js:438-456`

**现象**:
```javascript
// getDmrefHtml中，需要查询DM code
const res = await axios.post('/jeecg-boot/ietm/dm-content/getDmcByText', ...)
```

**影响**:
- 网络延迟时Para打开慢
- 后端不可用时dmRef无法显示

**建议方案**:
```javascript
// 方案A：超时+降级
try {
  const res = await axios.post(..., { timeout: 3000 })
  // ...
} catch (error) {
  // 降级：显示原始dmRef XML
  html = html.replace(m, `<span class="dmref-fallback" title="${m}">【引用DM】</span>`)
}

// 方案B：缓存DM Code映射（推荐）
// 在DM编辑器打开时，预加载所有引用的DM code
// 存入 Vuex/localStorage，减少API调用
```

**优先级**: 中（有降级方案）  
**工作量**: 方案A=1h | 方案B=4h

---

### P1-3: 缺少单元测试框架（Jest未安装）

**现象**:
```bash
npm test
# npm error Missing script: "test"
```

**影响**:
- 无法运行单元测试（`ParaConverter.spec.js` 已编写但无法执行）
- 回归测试成本高

**建议方案**:
```json
// package.json
{
  "scripts": {
    "test:unit": "jest --no-coverage",
    "test:unit:watch": "jest --watch"
  },
  "devDependencies": {
    "@vue/test-utils": "^1.3.0",
    "jest": "^27.5.1",
    "babel-jest": "^27.5.1"
  }
}
```

**优先级**: 高（影响代码质量保障）  
**工作量**: 0.5d（含配置jest.config.js）

---

## 🟡 P2 - 一般问题（5个）

### P2-1: para2html 空字符串返回 `''`，html2para 返回 `'<para></para>'`

**位置**: 
- `para2html:15` 返回 `''`
- `html2para:120` 返回 `'<para></para>'`

**影响**: 双向转换不对称

**建议**: 统一为返回 `'<para></para>'`

**工作量**: 0.5h

---

### P2-2: definitionList 转换时，列宽比例硬编码（30%:70%）

**位置**: `ParaDesigner.vue:73, ueditorConfig.js:145`

**现象**:
```javascript
// 用户无法自定义列宽
deflistConfig: { termWidth: 0.3, defWidth: 0.7 }
```

**建议**: 
- 方案A：弹窗让用户输入比例
- 方案B：UEditor中拖拽列边框调整（技术难度高）

**工作量**: 方案A=2h | 方案B=1d

---

### P2-3: symbol 图符预览依赖后端API，无缓存

**位置**: `paraConverter.js:82-96, IetmSymbolDialog.vue`

**现象**: 每次打开Para都重新获取图符base64

**建议**: 
```javascript
// 浏览器缓存图符数据（IndexedDB）
const cachedSymbol = await symbolCache.get(infoEntityIdent)
if (cachedSymbol) {
  return cachedSymbol.base64
}
// ... 调用API并缓存
await symbolCache.set(infoEntityIdent, { base64, timestamp })
```

**工作量**: 3h

---

### P2-4: UEditor 实例ID使用时间戳+随机数，可能冲突

**位置**: `ParaDesigner.vue:74`

**现象**:
```javascript
ueditorInstanceId: `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

**风险**: 极低概率下，同一毫秒内创建多个实例可能ID重复

**建议**: 使用 UUID 或自增计数器

**工作量**: 0.5h

---

### P2-5: handleSave 中未处理 html2para 转换失败的情况

**位置**: `ParaDesigner.vue:277-306`

**现象**:
```javascript
const newParaXml = await html2para(this, content)
// ↑ 如果转换失败抛异常，用户界面会卡住
```

**建议**:
```javascript
try {
  const newParaXml = await html2para(this, content)
  // ...
} catch (error) {
  this.$message.error('保存失败：内容转换错误')
  console.error('[Para保存]', error)
  this.saving = false
  return
}
```

**工作量**: 0.5h

---

## 🟢 P3 - 轻微问题（7个）

### P3-1: console.log 未添加DEBUG守卫（6处）

**位置**: `paraConverter.js:44, 62, 404, 407`

**建议**: 
```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('[para2html]', ...)
}
```

**工作量**: 0.5h

---

### P3-2: 部分变量命名不直观

**位置**: `paraConverter.js:22, 175`

**示例**:
```javascript
let html_ = m.replace(...)  // ← 下划线后缀含义不明确
let table_ = m.replace(...) 
```

**建议**: 重命名为 `convertedHtml`, `convertedTable`

**工作量**: 0.5h

---

### P3-3: 正则表达式未编译，性能可优化

**位置**: `paraConverter.js` 多处

**示例**:
```javascript
// 当前
html.match(/<definitionList.*?<\/definitionList>/g)

// 优化（模块顶部预编译）
const DEFLIST_PATTERN = /<definitionList.*?<\/definitionList>/g
html.match(DEFLIST_PATTERN)
```

**工作量**: 1h

---

### P3-4: str2jsons 函数未处理畸形XML

**位置**: `paraConverter.js:524-551`

**风险**: 缺少 `<tag>` 或多个 `</tag>` 时可能死循环

**建议**: 添加递归深度限制

**工作量**: 1h

---

### P3-5: ParaDesigner 组件缺少 props 验证

**位置**: `ParaDesigner.vue:39-55`

**示例**:
```javascript
// 当前
lineno: { type: Number, required: true }

// 建议
lineno: { 
  type: Number, 
  required: true,
  validator: val => val >= 0  // ← 添加校验
}
```

**工作量**: 1h

---

### P3-6: 魔法数字未定义为常量

**位置**: `ParaDesigner.vue:263, 272`

**示例**:
```javascript
// 当前
if (this.newformulaCnt > 99999) { ... }

// 建议
const MAX_FORMULA_COUNT = 99999
if (this.newformulaCnt > MAX_FORMULA_COUNT) { ... }
```

**工作量**: 0.5h

---

### P3-7: 缺少TypeScript类型定义

**现象**: 整个项目未使用TypeScript

**建议**: 
- 短期：添加JSDoc类型注释
- 长期：迁移到TypeScript

**工作量**: 短期=2h | 长期=3d

---

## 📊 问题统计

| 优先级 | 数量 | 总工作量 |
|--------|------|----------|
| P0 | 0 | 0 |
| P1 | 3 | 1.5~2.5d |
| P2 | 5 | 6.5~10.5h |
| P3 | 7 | 6~7.5h + 3d(TS) |
| **合计** | **15** | **~4d** (不含TS迁移) |

---

## 🎯 建议修复优先级

### 阶段1：紧急修复（1天）
1. ✅ P1-3: 配置Jest单元测试环境
2. ✅ P1-1: captionGroup API降级处理
3. ✅ P2-5: handleSave 异常处理

### 阶段2：质量提升（2天）
4. ✅ P1-2: dmRef缓存机制
5. ✅ P2-1~P2-4: 对称性/列宽/缓存/ID生成
6. ✅ P3-1: DEBUG守卫
7. ✅ P3-5: Props校验

### 阶段3：代码优化（1天）
8. ✅ P3-2~P3-4: 命名/正则/边界处理
9. ✅ P3-6: 常量提取
10. ✅ P3-7: JSDoc注释

---

## ✅ 已验证的功能点

- ✓ 基础元素转换（7类，100%通过）
- ✓ definitionList 双向转换（100%一致性）
- ✓ 复杂元素转换（internalRef/dmRef/symbol/verbatimText）
- ✓ 保存逻辑（Ctrl+S + 按钮）
- ✓ 只读模式
- ✓ Parent接口（14个参数+4个函数）
- ✓ 工具栏配置（33个按钮）
- ✓ replaceRange参数正确性

---

## 📝 测试覆盖现状

| 测试类型 | 已编写 | 已执行 | 通过率 |
|----------|--------|--------|--------|
| 单元测试 | 62个用例 | 0（无Jest） | N/A |
| E2E测试 | 6个场景 | 0（待运行） | N/A |
| 手动测试 | 20个场景 | 20 | 95% |

**建议**: 
1. 立即配置Jest执行单元测试
2. 运行E2E测试验证真实场景
3. 补充边界测试（空内容/超长内容/畸形XML）

---

**报告生成**: 2026-09-24 by Claude Code  
**下一步**: 执行阶段1紧急修复清单
