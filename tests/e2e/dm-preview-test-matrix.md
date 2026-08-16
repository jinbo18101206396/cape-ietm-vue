# DM预览功能全场景测试矩阵

## 测试维度与覆盖目标

### 维度1：DM类型覆盖（S1000D schema分类）
| DM类型 | schema文件 | 关键元素 | 测试要点 |
|---|---|---|---|
| descript（描述性） | descript.xsd | levelledPara, table, figure | TOC序号层级、表格标题、图形 |
| proced（程序性） | proced.xsd | procedure, preliminaryRqmts, mainProcedure, closeRqmts | procedure硬编码序号(1/1.1/1.2) |
| fault（故障隔离） | fault.xsd | faultIsolation, isolationProcedure | 故障树+诊断步骤 |
| crew（人员） | crew.xsd | crewDrill, crewProcedure | 人员程序 |
| comrep（通用需求） | comrep.xsd | commonRepository（无正文，纯status） | 无TOC，status部分渲染 |

**测试用例分配**：
- descript（5个用例）：嵌套levelledPara、table+figure混排、多表多图
- proced（2个用例）：标准procedure、含notes/warnings
- fault（1个用例）：isolationProcedure基础验证
- comrep（1个用例）：无content边界

### 维度2：嵌套深度与复杂度
| 场景 | levelledPara嵌套 | 预期TOC序号 | 测试目标 |
|---|---|---|---|
| 单层平铺 | 3个顶层 | 1, 2, 3 | 基础序号 |
| 两层嵌套 | 2顶层，第2个含2子 | 1, 2, 2.1, 2.2, 3 | 二级编号 |
| 三层嵌套 | 1顶层含1子含1孙 | 1, 1.1, 1.1.1, 2 | 三级编号 |
| 深嵌套（5层） | 递归5层 | 1, 1.1, 1.1.1, 1.1.1.1, 1.1.1.1.1 | XSLT number边界 |
| 不均衡树 | 第1个3层，第2个单层 | 1, 1.1, 1.1.1, 2 | 混合深度 |

### 维度3：特殊元素组合（混排/边界）
| 组合场景 | 元素 | 验证点 |
|---|---|---|
| 表格+图形+警告混排 | table, figure, warning | 序号独立（表1/图1/警告无序号）+ 各自样式 |
| 嵌套表格（CALS） | table内嵌entry含para | 单元格内段落格式 |
| 多个table连续 | 3个table无间隔 | 表1/表2/表3编号连续 + TOT目录 |
| 多个figure连续 | 3个figure | 图1/图2/图3 + LOF目录 |
| 空title的table | `<table><title/><tgroup>` | TableTitle div为空或显示"表X" |
| 超长title | title含200字符 | 居中无溢出 |
| 特殊字符 | title含`<>&"'` | HTML转义正确 |

### 维度4：dataRestrictions全场景
| 场景 | 子元素组合 | 验证点 |
|---|---|---|
| 仅restrictionInstructions | dataDistribution, dataHandling, dataDestruction | 3行平铺，无嵌套表 |
| 仅restrictionInfo | policyStatement, copyright, dataConds | 子行平铺，无`<td><tr>` |
| 两者混合 | instructions + info 都有 | 6-8行，"数据限制"header下全平铺 |
| 空dataRestrictions | `<dataRestrictions/>` | 仅header行或不显示 |
| 只有copyright | `<restrictionInfo><copyright>` | 单行，label"版权" |

### 维度5：procedure特殊结构（proced.xsd）
| 场景 | 结构 | 预期TOC序号 |
|---|---|---|
| 标准三段式 | preliminaryRqmts + mainProcedure + closeRqmts | 1（准备）, 1.1-1.N（小节）, 2（主程序）, 2.1-2.N, 3（收尾） |
| 无preliminaryRqmts | 直接mainProcedure | 从1开始（主程序） |
| 嵌套proceduralStep | mainProcedure含3层step | 1, 1.1, 1.1.1（硬编码序号规则） |

### 维度6：边界与异常
| 场景 | 输入 | 预期行为 |
|---|---|---|
| 空content | `<content><description/></content>` | 无TOC，status部分正常 |
| 无levelledPara的descript | `<description><para>纯段落</para>` | 无正文目录，直接显示段落 |
| 超大DM（500KB） | 100个levelledPara + 50个table | 预览弹窗E-PRE-12警告 + 正常渲染（性能） |
| 特殊字符全集 | title含`<>&"'中文🔥\n\t` | 正确转义+显示 |
| 无dmStatus（非法） | 缺status节点 | 降级渲染或提示（XSLT容错） |
| 中英文切换 | locale=cn时预览 | toEnXml转换后再渲染（中文元素名→英文） |

### 维度7：交互完整性（不影响其他功能）
| 验证项 | 操作序列 | 断言 |
|---|---|---|
| 预览不影响编辑器 | 打开预览→iframe加载→关闭预览 | CodeMirror内容不变、光标位置保持 |
| 预览不影响树 | 打开预览→关闭 | 树选中节点不变、展开状态保持 |
| 预览不触发dirty | 打开预览（未保存状态） | dirty标志保持false，不弹"未保存"警告 |
| 连续预览 | 连续点3次预览按钮 | 每次生成新HTML，旧iframe释放（无Blob泄漏） |
| 预览中编辑 | 打开预览→编辑器改内容→关闭预览→再预览 | 第二次预览反映新内容 |
| 预览后保存 | 打开预览→关闭→修改→保存 | 保存流程正常，version递增 |
| 预览+树交互 | 预览打开时点树节点 | 预览Modal不关闭，树定位正常 |

### 维度8：CSS层叠与样式隔离
| 验证项 | 检查点 | 断言 |
|---|---|---|
| TOC无边框 | `.toc-table td` computed border | `0px / none` |
| 数据表格有边框 | `.tableBorders td` computed border | `1px solid` |
| TableTitle样式 | `.TableTitle` computed style | `text-align:center; font-style:italic` |
| body字体 | `body` computed fontFamily | 含`SimSun`或`宋体` |
| 全局table不影响TOC | 检查specificity冲突 | `.toc-table !important` 赢 |

### 维度9：XSLT模板边界
| 场景 | 输入结构 | 验证XSLT分支 |
|---|---|---|
| table无title | `<table><tgroup>` | TableTitle div不渲染或空 |
| levelledPara无title | `<levelledPara><para>` | TOC条目显示id或占位符 |
| 空table（无tbody） | `<table><tgroup><thead/></tgroup>` | 渲染表头，tbody为空 |
| figure无title | `<figure><graphic/>` | LOF条目显示"图X"无标题 |
| 嵌套table（非CALS） | entry含table | 二级表格正常渲染（虽罕见） |

## 测试用例编号规则
```
PRE-{维度}{场景}{序号}
  维度: T(类型) / N(嵌套) / M(混排) / D(数据限制) / P(程序) / B(边界) / I(交互) / S(样式) / X(XSLT)
  场景: 2位数字
  序号: 2位数字（同场景多用例）

示例:
  PRE-T0101 - 类型维度/descript/用例1（单层levelledPara）
  PRE-N0201 - 嵌套维度/两层嵌套/用例1
  PRE-D0301 - 数据限制/混合/用例1
  PRE-I0701 - 交互/预览不影响编辑器
```

## 最小测试集（核心路径，15个用例）
优先实现以下15个用例覆盖80%风险：

1. **PRE-T0101** - descript单层3个levelledPara（基础TOC）
2. **PRE-N0201** - 两层嵌套levelledPara（2.1编号）
3. **PRE-N0301** - 三层嵌套（1.1.1编号）
4. **PRE-M0101** - table+figure混排（独立编号）
5. **PRE-M0201** - 3个table连续（LOT目录）
6. **PRE-D0101** - dataRestrictions仅instructions（3行）
7. **PRE-D0201** - dataRestrictions仅info（无`<td><tr>`）
8. **PRE-D0301** - dataRestrictions混合（6+行）
9. **PRE-P0101** - procedure标准三段式（硬编码序号）
10. **PRE-B0101** - 空content边界
11. **PRE-B0201** - 超大DM（100个para，性能）
12. **PRE-I0101** - 预览不影响编辑器内容
13. **PRE-I0201** - 连续3次预览（Blob泄漏检测）
14. **PRE-S0101** - TOC/数据表格边框对比验证
15. **PRE-X0101** - table无title边界

## 完整测试集（扩展，25个用例）
在最小集基础上增加：

16. **PRE-T0201** - proced无preliminaryRqmts
17. **PRE-T0301** - fault基础验证
18. **PRE-T0401** - comrep无content
19. **PRE-N0401** - 深嵌套5层
20. **PRE-M0301** - 超长title（200字符）
21. **PRE-M0401** - 特殊字符全集
22. **PRE-D0401** - 空dataRestrictions
23. **PRE-B0301** - 中英文locale切换
24. **PRE-I0301** - 预览中编辑+再预览
25. **PRE-I0401** - 预览+树交互隔离

## 测试数据准备策略
- **内联XML模板**：15个最小集用例用内联XML（通过injectXml注入）
- **真实DM引用**：扩展集部分用例查询DB获取真实大型DM（通过DM_ID直接打开）
- **边界构造**：特殊字符/空节点等通过编程生成XML字符串

## 预期测试时长
- 最小集15个用例：~20分钟（Playwright串行，每用例~80秒）
- 完整集25个用例：~35分钟
- CI环境并行（workers=4）：~10分钟
