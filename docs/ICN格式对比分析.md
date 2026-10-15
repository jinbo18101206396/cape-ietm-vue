# ICN格式对比分析

## 旧系统源码分析

### 公式ICN生成（IetmEditorDesignerPara.js:242-280）

```javascript
// 行258-259: 从parent_.name提取SNS
var nameArr=parent_.name.split('-');
json.sns=nameArr[1]+'-'+nameArr[2]+'-'+nameArr[3]+nameArr[4]+nameArr[5];
// 注意：nameArr[3]+nameArr[4]+nameArr[5] 是直接拼接，无连接符
// 例如: nameArr = ['DMC', 'ZB1', 'A', '02', '00', '00', ...]
// json.sns = 'ZB1' + '-' + 'A' + '-' + '020000'
// 结果: json.sns = 'ZB1-A-020000' (3段)

// 行264: 生成ICN
var icn = 'ICN-'+json.sns+'-'+json.rpc+'-'+json.originator+'-'+uniqueid_+'-A-001-01';
// ICN = 'ICN-ZB1-A-020000-{rpc}-{originator}-{uniqueid}-A-001-01'
// 段数 = 1 + 3 + 1 + 1 + 1 + 1 + 1 + 1 = 10段
```

### 问题：新系统中parent.name是什么？

- **旧系统**: `parent_.name` 存在且可用
- **新系统**: `parent.name = undefined`

需要检查：
1. parent.name应该从哪里来？
2. parent.name的格式是什么？
3. 它与parent.dmCode有什么区别？

## 对比表

| 项目 | 旧系统公式 | 新系统公式（当前错误） | 预期 |
|------|-----------|---------------------|------|
| 数据源 | `parent_.name` | `parent.dmCode` | ？ |
| SNS段数 | 3段 (ZB1-A-020000) | 5段 (ZB1-A-020000-60101-30101) | ？ |
| ICN段数 | 10段 | 10段 | 10段 |
| 第4-5段 | rpc, originator | rpc, originator | rpc, originator |
| 第6段 | uniqueId | uniqueId | uniqueId |
| 60101/30101来自 | 项目参数rpc？ | dmCode？ | ？ |

## 待确认

1. **parent.name的格式**：旧系统的parent_.name是什么格式？是否包含60101/30101？
2. **rpc vs 责任单位编码**：60101/30101是否就是rpc？还是另一个字段？
3. **DMC vs DM name的区别**：parent.dmCode vs parent.name
