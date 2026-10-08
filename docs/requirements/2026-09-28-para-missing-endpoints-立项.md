# 立项：Para 编辑器缺失后端端点全量补全

**提出日期**：2026-09-28
**模块**：Para 设计器 / DM 内容编辑器 - 图符 / 公式 / DM 引用 / ICN 预览
**状态**：待立项 / 待排期
**优先级**：P1（多处阻断"打开/保存含图符·公式·dmRef 的 para"）

> 本文档取代原《2026-09-28-formula-save-backend-endpoint-立项》。逐行排查 + 逐字节反编译旧系统后确认：前端有 **6 处调用命中 404**，但它们**不是同一类问题**——其中 #4 旧系统本是纯前端函数（不该建后端）、#6 旧系统本是 JSP 分发页（本质静态文件访问）、#1/#2/#3/#5 才是真·后端内容物化。修复方案已按旧系统真实形态分三类重写（见四、五节）。

---

## 一、背景与排查方法

新系统 Para 公式编辑器修复后（见附录 A），用户要求逐行排查"是否还有类似问题"（前端调后端不存在端点 / 注册未加载）。

**排查方法（地面真相，非推断）**：
1. 枚举 `editor/` 目录全部后端 URL 调用
2. 全后端 grep 每个路径的 `@RequestMapping` 映射
3. 登录（admin/123456）拿真实 token，逐个 curl 探测

**关键坑**：无 token 时 Shiro 鉴权前置拦截，404 与存在端点都返 **401**，无法区分。必须带 `X-Access-Token` 才有地面真相：404 = 不存在，200/500 = 存在。

---

## 二、确认缺失的 6 个端点（带 token 探测 = 404）

| # | 端点 | 前端调用点 | 触发场景 | 方向/严重度 |
|---|---|---|---|---|
| 1 | `POST /ietm/icn/save-formula` | paraConverter.js:434 | 保存含**新公式**的 para | 保存 |
| 2 | `POST /ietm/icn/getIcnContent` | paraConverter.js:623 `tosymbol` | **打开**含 `<symbol>`（图符/公式）的 para | 加载 ⚠️高 |
| 3 | `GET /ietm/icn/tmpICN/{id}.ext` | paraConverter.js:636 + ParaDesigner.vue:730 | 图符 img 的 src（加载 + 插入图符） | 加载+插入 ⚠️高 |
| 4 | `POST /ietm/dm-content/getDmcByText` | paraConverter.js:594 `getDmrefHtml` | **打开**含 `<dmRef>` 的 para | 加载 ⚠️高 |
| 5 | `GET /ietm/icn/operation/getIcnContent` | DmNodePreviewModal.vue:90 | 预览 ICN 节点 | 预览 中 |
| 6 | `GET /ietm/icn/ViewIcn` | DmNodePreviewModal.vue:99 | 预览 ICN 节点（取内容后） | 预览 中 |

**可达性**：全部为活代码。`para2html` 在 `ParaDesigner.vue:386/472` 被调（打开 para 主流程），`getDmrefHtml`/`tosymbol` 在 `para2html`（paraConverter.js:135/140）无条件执行。**#2#3#4 属加载方向，比 save-formula 更严重**：影响"打开查看任何已含图符/dmRef/公式的 para"，不只新建。

**验证程度（诚实说明）**：6 个均已 (a) 全后端 grep 零映射 (b) 带真实 token curl 确认 404 (c) 追调用链确认可达。但**仅 save-formula(#1) 做过真机浏览器 E2E 复现**；#2~#6 为"代码路径 + curl"级验证，未逐个真机跑。若需同等证据，可补真机复现。

---

## 三、架构级根因（决定修复方向）

**后端存在一整套并行 para 转换实现，却与前端从未接上：**

- 后端 `ParaConverter.java`（util）方法齐全：`para2html` / `html2para` / `convertSymbolToImg` / `convertDmRefToAnchor` / `convertInternalRefToAnchor` 等
- 后端 controller 有端点 `POST /ietm/dm-content/para2html`、`/html2para`（实测 **200 可用**）
- **前端从不调这两个端点**（grep 全空）→ 后端整套转换是**死代码**
- 前端坚持用客户端 `paraConverter.js` 逐元素转换，再去调那批**不存在**的细粒度子端点（#1~#6）
- 后端 `convertSymbolToImg`（ParaConverter.java:374）直接用 `symbolid` 属性拼 `tmpICN` URL，**不需要 getIcnContent** —— 证明两套设计思路从未对齐

---

## 四、修复方向（基于旧系统逐字节验证后重写）

> **重要**：原 A/B 方案基于对旧系统的错误假设，已废弃。逐字节反编译旧系统 `IetmIcnController` / JSP / 前端 JS 后发现，6 个端点**并非同一类问题**，不能用单一方案覆盖。以下按验证到的旧系统真实形态分三类。

### 4.1 三类端点（旧系统真实实现）

| 类别 | 端点 | 旧系统真实形态 | 正确修法 |
|---|---|---|---|
| **甲·纯前端** | #4 getDmcByText | `IetmEditorUtils-src.js:1197` **纯前端函数**，jQuery parseXML 抠 dmCode 拼 DMC，零后端 | **前端补齐**，不建后端端点 |
| **乙·内容物化** | #1 save-formula / #2·#5 getIcnContent / #3 tmpICN | BLOB 存 DB + 加载时物化到 tmpICN 目录 | 取决于存储模型决策（见 4.2） |
| **丙·文件查看** | #6 ViewIcn | `ViewIcn.jsp` 按扩展名分发到查看页，本质静态文件访问 | 后端提供文件流 或 前端直连 view 端点 |

### 4.2 架构根因（乙类的核心决策点）

旧系统 ICN = **BLOB 存 DB + 加载时按需物化成 tmpICN 物理文件**。新系统 ICN = **磁盘文件模型（IetmAttachment.fileKey），DB 无 BLOB 列**。新前端 `paraConverter.js` 直接移植自旧系统，仍带旧模型调用假设（getIcnContent 返回 `formula` 串 + tmpICN 取图），与新后端模型从未对齐——这是 5 个 404 的同一根因。

**乙类二选一（需决策）**：
- **路线 甲（贴合旧系统 BLOB 模型）**：新 ICN 表加 `filecontent` BLOB 列，save-formula 存 HTML 串字节，getIcnContent 加载时物化到 tmpICN。前端往返逻辑现成不动。代价=**改表**。
- **路线 乙（改造成新系统磁盘模型）**：save-formula 时把 base64 解码落盘存 fileKey；getIcnContent 从磁盘读、返回结构改造；前端 `tosymbol` 的 `data.formula` 分支需重写。代价=**改前端往返 + 重测一致性**，不改表。

**建议**：乙类走**路线甲**（贴合旧系统）。理由：前端往返逻辑是从旧系统整体移植且已随公式编辑器真机验证过一半，动它风险最高；加一个 BLOB 列是局部改动，且与旧系统数据模型一致，未来若做新旧数据迁移也顺。**前提**：需先确认新 ICN 表能否加列（见八·待确认）。

---

## 五、逐端点实现要点（按三类，均对标旧系统已验证逻辑）

### 甲类 · #4 getDmcByText —— 前端补齐，删除后端调用

旧系统 `getDmcByText`/`getDmc`（IetmEditorUtils-src.js:1197-1245）是**纯前端**：`$.parseXML('<xml>'+dmref.replace(/:/g,'_')+'</xml>')` 解析，抠 `dmCode` 各属性按固定格式拼 `DMC-{model}-{diff}-{sys}-...`，另取 dmTitle/issueDate/issueInfo，`xml=dmref.replace(/"/g,'`')`，返回 `{dmc,dmtitle,issuedate,issue,xml}`。

- **改前端** `paraConverter.js:594`：把 `axios.post('/getDmcByText')` 替换为移植旧系统的本地解析函数（照抄 getDmc 拼串逻辑）
- 删除对后端 `/dm-content/getDmcByText` 的调用（该端点无需新建）
- **注意**：新系统前端可能已有 dmCode 拼装工具（`buildDmRef` 前端侧或 DmEditorModal），优先复用而非重写
- 无后端改动、无表改动

### 乙类 · #1 / #2·#5 / #3 —— 内容物化（以路线甲=BLOB为例）

**#1 `POST /ietm/icn/save-formula`**（对标 `toSaveIetmIcnDTO`）
- 取 `data` → 解析 → 若含 `filecontent`：`filecontent.getBytes()` 存 BLOB，`filesize`=长度，`icntype="F"`
- 按 `icn` 编码查重（旧系统 save/null 分支），不存在才 insert
- **不解码 base64、不落盘**（旧系统 save 侧确实不落盘，落盘在 load 侧）
- `FormulaIcnVO`（11 字段孤儿类）可复用为入参载体

**#2·#5 `getIcnContent`**（对标 `toIcnFile`+`toGetIcncontent`，#2#5 旧系统是同一方法）
- 算 path = `<webroot>/.../tmpICN/{filename}`，`mkdirs`
- 公式类(`icntype=="F"`)：BLOB 字节→HTML 串 `put("formula",...)`；从串中 `substring("base64,"+7 .. "\" data-latex")` 抠 base64 → `base64StrToImage` 解码写 PNG 到 path
- 图片类：`copyFile(BLOB字节 → path)` 物化物理文件
- 计算 width/height（fileprop），`remove("path")`，返回 `{dto:{id,filename,...}, formula?, width, height}`
- **base64StrToImage 用了 `sun.misc.BASE64Decoder`**（JDK 内部类，JDK9+ 已移除）→ 新系统须改用 `java.util.Base64`

**#3 `GET /ietm/icn/tmpICN/{filename}`**
- 旧系统非独立端点，是 #2 现场物化出的**物理文件目录**，前端用静态 URL 取
- 新系统：确认 `WebMvcConfiguration` 的 `/**` 资源处理器覆盖 tmpICN 落盘目录即可；或加专用 handler。**与 #2 强耦合**（#2 负责物化，#3 负责取），须同时做

### 丙类 · #6 ViewIcn —— 文件查看

旧系统 `ViewIcn.jsp` 按扩展名分发到 ViewImg/ViewCgm/... 查看页，显示 tmpICN 物理文件。新系统 DmNodePreviewModal 期望 `/ietm/icn/ViewIcn?url={id}{ext}` 直接返回可展示内容。
- 简化实现：新增后端端点按 `url` 参数定位 tmpICN 物理文件（由 #5 物化），返回字节流（`Content-Type` 按扩展名）
- 图片类直接返回；cgm/3d/video 等特殊格式旧系统另有查看页，**新系统是否需支持这些格式需确认**（Para 场景通常只有 png 图符/公式，可先只支持图片类）

---

## 六、验收标准

1. **甲类**：#4 dmRef 解析完全在前端完成，代码中不再有 `/dm-content/getDmcByText` 调用；打开含 dmRef 的 para 无 404、DMC 拼串结果与旧系统一致
2. **乙类端点存在性**：#1/#2/#3 带 token 探测返 200
3. **加载闭环**：打开含 `<symbol>`(图符) + `<symbol>`(公式) + `<dmRef>` 的 para，图符显示、公式显示、DM 引用链接正常，控制台无 404
4. **保存闭环**：插入公式→保存→DM XML 出现 `<symbol infoEntityIdent="ICN-...">`→重开回显（公式图重新物化到 tmpICN 且可见，对标 `verify-kityformula.spec.js`）
5. **预览闭环**：#6 DmNodePreviewModal 预览 ICN 节点正常显示（图片类）
6. **回归**：现有 ICN 管理 / dm-content / para 转换测试全绿；BLOB 列改表不影响现有 ICN 磁盘文件流程
7. **E2E**：#2~#6 各补一条真机 Playwright（补齐当前仅公式按钮/弹窗有真机证据的缺口）

---

## 七、工作量估算（乙类走路线甲=BLOB）

| 类 | 项 | 人日 |
|---|---|---|
| 甲 | #4 前端移植 getDmc 解析（优先复用现有工具） | 0.5 |
| 乙 | ICN 表加 `filecontent` BLOB 列 + 实体/Mapper 改造 | 0.5 |
| 乙 | #1 save-formula（存 BLOB + 查重，Base64Decoder 换 java.util.Base64） | 1.0 |
| 乙 | #2·#5 getIcnContent（BLOB→物化 tmpICN + 返回结构，公式/图片双分支） | 1.5 |
| 乙 | #3 tmpICN 静态资源/handler（与 #2 联调） | 0.5 |
| 丙 | #6 ViewIcn 文件流端点（先只支持图片类） | 0.5 |
| — | 单元测试（save 查重 / 物化落盘 / base64 解码 / 前端解析） | 1.5 |
| — | E2E 真机（#2~#6 各一条 + 加载/保存/预览闭环） | 2.0 |
| | **合计（路线甲）** | **约 8 人日** |

**若乙类改走路线乙（磁盘模型）**：省掉改表（-0.5），但前端 `tosymbol` 往返重写 + 全量 para 转换回归 +3~4 人日，合计约 11 人日，且回归风险高。故不推荐。

---

## 八、风险 / 待确认（开发前必须先坐实）

**决定性前提（未验证，直接影响方案）**：
- **新 `ietm_icn_manage` 建表 SQL 能否加 BLOB 列** —— 路线甲的地基。未查建表 SQL / 是否有现成 attribute 备用列 / DBA 是否允许改表。**这一项没确认前不能开工乙类。**
- **新前端是否已有 dmCode 拼装工具**（#4）—— 决定甲类是"复用"还是"移植重写"。未核实 buildDmRef 前端侧 / DmEditorModal 是否已有等价逻辑。

**实现细节待确认**：
- **Base64Decoder 替换**（#2）：旧系统用 `sun.misc.BASE64Decoder`（JDK9+ 移除），新系统须换 `java.util.Base64`，且解码语义需对齐（旧的 decodeBuffer 容忍换行等）
- **getIcnContent 返回结构**（#2）：前端 `tosymbol` 读 `data.formula` 和 `data.dto.{id,filename}`；新后端 Result 包装是 `{result:{...}}`，需确认前端解包层级（旧系统直接 print JSON，无 Result 包装，前端移植时这层可能已错位）
- **tmpICN 落盘目录**（#3）：新系统 webroot 路径与旧 `getRealPath` 不同，落盘目录 + `/**` 资源处理器覆盖范围需确认
- **ViewIcn 格式范围**（#6）：Para 场景是否只有 png（可只支持图片类），还是需 cgm/3d/video
- **`security` 类型**（#1）：VO `secretLevel:String` vs 实体 `security:Integer`，映射转换
- **base64 缺失分支**（#1/#2）：src 非 base64（已是 URL）时的处理

**决策项**：
- **乙类存储模型**：路线甲（BLOB，推荐）vs 路线乙（磁盘）—— 见 4.2
- **#2 与 #5 合并**：旧系统本就是同一方法，新系统建议合并为一个端点

---

## 附录 A：公式编辑器修复（已完成）

四处断裂（simple 模式 / 插件缺失 / loadUEditor 死代码 / index.html 未挂脚本）已修：
- 移植 kityformula 插件到 `public/static/ueditor/kityformula-plugin/`（1.9M）+ 合并 `kityformula-plugin.js`
- `public/index.html` 挂载插件脚本（**关键**：真机 E2E 才发现 loadUEditor 是死代码，UEditor 实际由 index.html 加载）
- `ueditorConfig.js` simpleToolbar 加回 `'kityformula'`

真机 E2E（有头 Playwright + 截图）：插件资源 4/4=200、按钮渲染、弹窗+引擎加载全通过。测试 `tests/e2e/verify-kityformula.spec.js`，截图 `_kf_1`~`_kf_4`。

## 附录 B：save-formula 前端契约（#1 详情）

```js
// paraConverter.js:434
await axios.post('/jeecg-boot/ietm/icn/save-formula',
  { data: JSON.stringify(json) }, { timeout: 10000 })
```

json 12 键：`icn / sns / rpc / originator / uniqueid / variantcode / securityclassification / issueno / secretLevel / cmnodeid / filename / filecontent`。`filecontent` = 整段 `<img class="kfformula" src="data:image/png;base64,...">`。字段来源与 VO 映射见记忆 `ietm-para-missing-endpoints-audit` / `ietm-para-formula-missing-rootcause`。

可复用后端能力（已核实存在）：`addWithFiles(IetmIcnManage, MultipartFile[])` / `getNextUniqueId` / `generateIcnCode` / `calculateSns` / `queryByIcnCode`。

## 附录 C：证据文件
- E2E：`tests/e2e/verify-kityformula.spec.js`；截图 `tests/e2e/_kf_1~4.png`
- 记忆：`ietm-para-missing-endpoints-audit.md`、`ietm-para-formula-missing-rootcause.md`
