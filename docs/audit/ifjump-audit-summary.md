# ifjump/退回次数 类似问题排查总结

**日期**: 2026-08-27  
**状态**: ✅ 排查完成

---

## 排查结果

### ✅ 已修复问题 (1个)

**WfInstanceDtlTable.vue - getIfpassText方法**
- **问题**: `ifjump=0` 时错误显示 `[第0次退回]`
- **修复**: 改用 `parseInt(ifjump) > 0` 判断
- **验证**: 18/18 测试通过

### ✅ 已确认无问题 (3处)

| 代码位置 | 功能 | 验证结果 |
|---------|------|---------|
| `WfInstanceDtlTable.jumpPrefix` | 显示退回箭头`>` | ✅ 使用 `n <= 0` 判断，逻辑正确 |
| `WorkflowInfoPanel` 跳转前缀生成 | 计算下一个退回序号 | ✅ `returnNo = max + 1` 保证≥1 |
| `WfExecuteServiceImpl.handleReturn` | 后端退回处理 | ✅ 存储前先`++`，不会保存0 |

### ✅ 已排除无关代码 (2处)

- `DmContentEditor.vue` - "退回"指编辑器撤销功能，非工作流
- `DmSourceView.vue` - "退回"指编辑器撤销功能，非工作流

---

## 多层保护机制

系统对退回次数有三层独立保护：

```
生成端 (前端)  → returnNo = Math.max(0, ...ifjumps) + 1  [保证≥1]
   ↓
存储端 (后端)  → ifjumpValue++; save()                [保证≥1]
   ↓
显示端 (前端)  → jumpNum > 0 ? `[第${jumpNum}次退回]` : '' [过滤0值]
```

即使某一层失效，其他层仍能保证显示正确。

---

## 结论

**✅ 无其他类似问题**

经系统性排查6个前端文件、4个后端文件，确认：
- 仅有1处显示问题（已修复）
- 核心业务逻辑健壮
- 数据一致性有多层保护

**风险等级**: 🟢 极低

---

## 交付物

- ✅ 修复代码：`WfInstanceDtlTable.vue:1007-1011`
- ✅ 测试脚本：`tests/manual-verify-getIfpassText.js` (18测试)
- ✅ 完整报告：`docs/audit/ifjump-similar-issues-final-report.md`
