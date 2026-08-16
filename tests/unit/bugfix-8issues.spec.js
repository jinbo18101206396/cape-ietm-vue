#!/usr/bin/env node
/* eslint-disable */
// 8个问题修复验证：纯函数级（formatXml 拆行 / _writeAttr 自闭合 / getnodeBylineno 反查）
// 直接从源码抽取函数运行，不依赖 Jest/浏览器。
const fs = require('fs')
const path = require('path')

const C = { g:'\x1b[32m', r:'\x1b[31m', b:'\x1b[34m', y:'\x1b[33m', x:'\x1b[0m' }
const log = (c,...a)=>console.log(c+a.join(' ')+C.x)
const stats = { total:0, passed:0, failed:0, errs:[] }
function assert(cond, msg){ stats.total++; if(cond){ stats.passed++; log(C.g,'  ✓',msg) } else { stats.failed++; log(C.r,'  ✗',msg); stats.errs.push(msg) } }
function eq(a,e,msg){ const ok=a===e; if(!ok) msg+=`\n      期望:${JSON.stringify(e)}\n      实际:${JSON.stringify(a)}`; assert(ok,msg) }

// ---- 抽取 xmlTree.js 中的纯函数（formatXml + _splitGluedTags 依赖）----
const xmlTreeSrc = fs.readFileSync(path.join(__dirname,'../../src/views/ietm/ietmdatamodulemanagement/editor/utils/xmlTree.js'),'utf-8')

// 抽取 _splitGluedTags（内部函数）与 formatXml（export），拼成可 eval 的模块
function grab(src, sig){
  const start = src.indexOf(sig)
  if(start<0) throw new Error('未找到 '+sig)
  // 从签名处向后按大括号配平截取函数体
  let i = src.indexOf('{', start), depth=0, end=-1
  for(; i<src.length; i++){ if(src[i]==='{')depth++; else if(src[i]==='}'){depth--; if(depth===0){end=i;break}} }
  return src.slice(start, end+1)
}
const splitSrc  = grab(xmlTreeSrc, 'function _splitGluedTags')
const formatSrc = grab(xmlTreeSrc, 'export function formatXml').replace('export ','')
const sandbox = eval(`(function(){ ${splitSrc}\n ${formatSrc}\n return { _splitGluedTags, formatXml } })()`)
const { formatXml } = sandbox

// ---- 抽取 DmSourceView.vue 中的 _writeAttr ----
const viewSrc = fs.readFileSync(path.join(__dirname,'../../src/views/ietm/ietmdatamodulemanagement/editor/components/DmSourceView.vue'),'utf-8')
const writeAttrSrc = grab(viewSrc, 'function _writeAttr')
const _writeAttr = eval('('+writeAttrSrc+')')

// ========== Bug2/6：formatXml 拆开同行粘连标签 ==========
log(C.b,'\n📋 Bug2/6：弹框补全后同行粘连标签应被格式化拆行')
{
  // 回车补全把 <refs></refs> 插在 <content> 同行
  const glued = '<dmodule>\n<content><refs></refs>\n</content>\n</dmodule>'
  const out = formatXml(glued, 2)
  const lines = out.split('\n').filter(l=>l.trim())
  assert(lines.some(l=>l.trim()==='<content>'), '<content> 独占一行')
  assert(lines.some(l=>l.trim()==='<refs></refs>'), '<refs></refs> 拆到独立行（空文本元素合并单行）')
  assert(lines.some(l=>l.trim()==='</content>'), '</content> 独占一行')
  // 缩进：refs 应比 content 深一级
  const refsLine = lines.find(l=>l.includes('<refs>'))
  const contentLine = lines.find(l=>l.trim()==='<content>')
  assert(refsLine.match(/^\s*/)[0].length > contentLine.match(/^\s*/)[0].length, 'refs 缩进比 content 深一级')
}

// ========== Bug6：多个粘连子元素全部拆行 ==========
log(C.b,'\n📋 Bug6：多个同行粘连子元素应全部拆行')
{
  const glued = '<content><refs></refs><warningsAndCautions></warningsAndCautions></content>'
  const out = formatXml(glued,2).split('\n').filter(l=>l.trim())
  assert(out.some(l=>l.trim()==='<refs></refs>'), 'refs 拆行')
  assert(out.some(l=>l.trim()==='<warningsAndCautions></warningsAndCautions>'), 'warningsAndCautions 拆行')
}

// ========== 回归：内联文本元素保持单行、不被误拆 ==========
log(C.b,'\n📋 回归：内联文本/mixed 元素保持单行')
{
  const src = '<dmodule>\n<techName>飞机维护手册</techName>\n<para>这是一段<emphasis>强调</emphasis>文字</para>\n</dmodule>'
  const out = formatXml(src,2).split('\n').filter(l=>l.trim())
  assert(out.some(l=>l.trim()==='<techName>飞机维护手册</techName>'), 'techName 文本单行保留')
  assert(out.some(l=>l.includes('<para>这是一段')), 'para 含内联子元素的混合内容保持单行')
}

// ========== 回归：已格式化良好的 XML 幂等 ==========
log(C.b,'\n📋 回归：格式化幂等（已规范内容再次格式化不变形）')
{
  const src = '<dmodule>\n  <content>\n    <refs></refs>\n  </content>\n</dmodule>'
  const out1 = formatXml(src,2)
  const out2 = formatXml(out1,2)
  eq(out2, out1, '两次格式化结果一致（幂等）')
}

// ========== 回归：自闭合元素与 prologue/DOCTYPE ==========
log(C.b,'\n📋 回归：自闭合标签与声明行')
{
  const src = '<?xml version="1.0"?>\n<!DOCTYPE dmodule>\n<dmodule>\n<graphic infoEntityIdent="ICN-01"/>\n</dmodule>'
  const out = formatXml(src,2).split('\n').filter(l=>l.trim())
  assert(out.some(l=>l.trim()==='<?xml version="1.0"?>'), 'prologue 保留')
  assert(out.some(l=>l.trim()==='<!DOCTYPE dmodule>'), 'DOCTYPE 保留')
  assert(out.some(l=>l.trim()==='<graphic infoEntityIdent="ICN-01"/>'), '自闭合标签保留单行')
}

// ========== Bug3：_writeAttr 自闭合标签加属性 ==========
log(C.b,'\n📋 Bug3：自闭合标签加属性位置正确')
{
  eq(_writeAttr('  <description/>', 'warningRefs', '1'), '  <description warningRefs="1"/>', '<description/> 加属性 → <description warningRefs="1"/>')
  eq(_writeAttr('<graphic/>', 'id', 'g1'), '<graphic id="g1"/>', '紧凑自闭合 <graphic/> 加属性正确')
  eq(_writeAttr('  <description attr1="a"/>', 'attr2', 'b'), '  <description attr1="a" attr2="b"/>', '已有属性的自闭合标签追加属性')
  // 普通开标签不受影响
  eq(_writeAttr('  <para>', 'id', 'p1'), '  <para id="p1">', '普通开标签加属性正确')
  // 修改已有属性
  eq(_writeAttr('<para id="old">', 'id', 'new'), '<para id="new">', '修改已有属性值')
  // 删除属性（空值）
  eq(_writeAttr('<para id="p1">', 'id', ''), '<para>', '空值删除属性')
}

// ========== 同族A：属性值 XML 转义（值含 " & < > 不得生成非法XML） ==========
log(C.b,'\n📋 同族A：_writeAttr 属性值 XML 转义')
{
  eq(_writeAttr('<para>', 'id', 'a"b'), '<para id="a&quot;b">', '值含双引号 → &quot;')
  eq(_writeAttr('<para>', 'id', 'a&b'), '<para id="a&amp;b">', '值含 & → &amp;')
  eq(_writeAttr('<para>', 'id', 'a<b>c'), '<para id="a&lt;b&gt;c">', '值含 <> → &lt;&gt;')
  eq(_writeAttr('<graphic/>', 'id', 'a&b'), '<graphic id="a&amp;b"/>', '自闭合标签值含 & 也转义')
  eq(_writeAttr('<para id="x">', 'id', 'a"b'), '<para id="a&quot;b">', '改已有属性时值也转义')
}

// ========== 同族B：值含 $ 序列不得被当作替换模式展开 ==========
log(C.b,'\n📋 同族B：_writeAttr 值含 $ 序列')
{
  eq(_writeAttr('<para id="old">', 'id', '$1'), '<para id="$1">', '改属性值为 $1 不展开为空')
  // $ 不被展开（& 仍按同族A转义为 &amp;，$ 原样保留即证明未走替换模式展开）
  eq(_writeAttr('<para id="old">', 'id', 'a$&b'), '<para id="a$&amp;b">', '值含 $& 时 $ 原样、& 转义')
  eq(_writeAttr('<para>', 'id', '$1'), '<para id="$1">', '新增属性值为 $1 不展开')
  eq(_writeAttr('<graphic/>', 'id', '$&'), '<graphic id="$&amp;"/>', '自闭合新增值 $& → $ 原样、& 转义')
}

// ========== 同族C：属性名互为子串时不误match（词边界） ==========
log(C.b,'\n📋 同族C：_writeAttr 属性名子串隔离')
{
  // id 不应误判为已存在（validid 里的 id）
  eq(_writeAttr('<x validid="7">', 'id', '9'), '<x validid="7" id="9">', 'validid 存在时新增 id 不误判为已存在')
  // 改 id 不应破坏 validid
  eq(_writeAttr('<x validid="7" id="8">', 'id', '9'), '<x validid="7" id="9">', '改 id 不误伤 validid')
  // 清 id 不应破坏 validid
  eq(_writeAttr('<x validid="7" id="8">', 'id', ''), '<x validid="7">', '清 id 不误伤 validid')
}

// ========== Bug8：getnodeBylineno 支持闭合标签行反查 ==========
log(C.b,'\n📋 Bug8：移动行起始行落在闭合标签行/精确行都能定位元素')
{
  const TAG = xmlTreeSrc.split('\n').find(l=>l.trim().startsWith('const TAG ='))
  const getNodeSrc = grab(xmlTreeSrc, 'export function getnodeBylineno').replace('export ','')
  const getnodeBylineno = eval(`(function(){ ${TAG}\n ${getNodeSrc}\n return getnodeBylineno })()`)
  global.Node = { COMMENT_NODE:8, ELEMENT_NODE:1 } // 占位（本函数未用到）

  // 编辑器：dmodule 在第1行(offset=1)，content 在第3行，section 双行 4~6
  const editorLines = ['<dmodule>','  <ident/>','  <content>','    <section>','      <para></para>','    </section>','  </content>','</dmodule>']
  const cm = { getLine:(i)=>editorLines[i] }
  // nodeList.lineno 相对 dmodule(=1)：section 开始标签在编辑器第4行 → lineno=4
  const nodeList = [
    { id:0, pid:-1, text:'dmodule', attributes:{lineno:1} },
    { id:1, pid:0,  text:'ident',   attributes:{lineno:2} },
    { id:2, pid:0,  text:'content', attributes:{lineno:3} },
    { id:3, pid:2,  text:'section', attributes:{lineno:4} },
    { id:4, pid:3,  text:'para',    attributes:{lineno:5} }
  ]
  const offset = 1
  // 精确匹配开始标签行（编辑器第4行）
  const n1 = getnodeBylineno(nodeList, 4, offset, cm)
  assert(n1 && n1.text==='section', '起始行=开始标签行 → 定位到 section')
  // 落在闭合标签行 </section>（编辑器第6行）→ 反查到 section
  const n2 = getnodeBylineno(nodeList, 6, offset, cm)
  assert(n2 && n2.text==='section', '起始行=闭合标签行 </section> → 反查定位到 section（Bug8核心）')
  // 落在空白/无元素行 → 返回 null（触发友好提示而非误移）
  const n3 = getnodeBylineno(nodeList, 99, offset, cm)
  assert(n3===null, '越界行 → 返回 null（配合友好提示）')
}

// ========== 边界：formatXml 空输入/仅声明/深层嵌套 ==========
log(C.b,'\n📋 边界：formatXml 极端输入')
{
  eq(formatXml('',2), '', '空字符串 → 空')
  eq(formatXml('   \n  \n',2), '', '纯空白 → 空')
  const deep = '<a><b><c><d></d></c></b></a>'
  const out = formatXml(deep,2).split('\n').filter(l=>l.trim())
  assert(out.some(l=>l==='      <d></d>'), '4层嵌套 <d> 缩进=6空格')
  assert(out.some(l=>l==='</a>'), '根闭合 </a> 无缩进')
}

// ========== 同类排查：GJB6600 中文元素名（\w+ 修复）==========
log(C.b,'\n📋 同类①：中文元素名场景（GJB6600）')
{
  // formatXml 拆分中文粘连标签
  const glued = '<数据模块>\n<内容><说明></说明></内容>\n</数据模块>'
  const out = formatXml(glued,2).split('\n').filter(l=>l.trim())
  assert(out.some(l=>l.trim()==='<说明></说明>'), '中文子元素 <说明> 拆行')
  assert(out.some(l=>l.trim()==='<内容>'), '中文 <内容> 独占一行')
  // _writeAttr 中文自闭合标签
  eq(_writeAttr('  <图形/>', '标识', 'ICN-1'), '  <图形 标识="ICN-1"/>', '中文自闭合 <图形/> 加属性正确')
  eq(_writeAttr('  <说明>', 'id', 's1'), '  <说明 id="s1">', '中文开标签加属性正确')
}

// ========== 同类②：editorProtect 中文元素名（rule7 保护）==========
log(C.b,'\n📋 同类②：editorProtect 父元素查找支持中文')
{
  const protSrc = fs.readFileSync(path.join(__dirname,'../../src/views/ietm/ietmdatamodulemanagement/editor/utils/editorProtect.js'),'utf-8')
  const tagLine = protSrc.split('\n').find(l=>l.trim().startsWith('const TAG ='))
  const fpSrc = grab(protSrc, 'function _findParentTagName')
  const ceSrc = grab(protSrc, 'function _currentElemName')
  const mod = eval(`(function(){ ${tagLine}\n ${fpSrc}\n ${ceSrc}\n return { _findParentTagName, _currentElemName } })()`)
  // _findParentTagName 返回文本行「最近的未闭合开标签」（即直接容器）
  const cmCn = { getLine:(i)=>['  <内容>','    <说明>','      正文文本','    </说明>','  </内容>'][i] }
  eq(mod._findParentTagName(cmCn, 2), '说明', '中文态：文本行的直接容器是 <说明>（\\w+ 修复前会返回 null）')
  eq(mod._currentElemName({getLine:()=>'    <说明>'}, {line:0}), '说明', '中文态：当前元素名 <说明>')
  // 英文回归：文本行直接容器是 para
  const cmEn = { getLine:(i)=>['  <content>','    <para>','      text'][i] }
  eq(mod._findParentTagName(cmEn, 2), 'para', '英文态：文本行直接容器 para 正确')
}

// ========== 同类③：setProperty 闭合标签行向上找（中文）==========
log(C.b,'\n📋 同类③：闭合标签名匹配支持中文')
{
  // 复现 setProperty 内的闭合标签名提取正则
  const re = /<\/([A-Za-z_一-鿿][\w.\-一-鿿]*)/
  eq('</说明>'.match(re)[1], '说明', '中文闭合标签 </说明> 提取元素名')
  eq('</warningsAndCautions>'.match(re)[1], 'warningsAndCautions', '英文闭合标签提取正常')
}

// ========== 边界：formatXml 属性值/非粘连行保护 ==========
log(C.b,'\n📋 边界：属性值含特殊字符、非粘连行保持原样')
{
  // 非粘连（无 ><）的单行标签原样保留，即便属性值含 '>'（XML 少见但合法）
  const src = '<dmodule>\n<graphic alt="a>b"/>\n</dmodule>'
  const out = formatXml(src,2).split('\n').filter(l=>l.trim())
  assert(out.some(l=>l.trim()==='<graphic alt="a>b"/>'), '属性值含 > 的非粘连自闭合行原样保留（不误拆）')
  // 带属性的粘连开标签也能拆
  const glued2 = '<content id="c1"><para>x</para></content>'
  const out2 = formatXml(glued2,2).split('\n').filter(l=>l.trim())
  assert(out2.some(l=>l.trim()==='<content id="c1">'), '带属性的父标签拆行后属性保留')
  assert(out2.some(l=>l.trim()==='<para>x</para>'), '内联文本子元素 <para>x</para> 保持单行')
}

// ========== 场景：连续两次补全插入（模拟 Bug2 修复后再插入）==========
log(C.b,'\n📋 场景：嵌套粘连（补全后光标在中间再插入）')
{
  // <content> 内插 refs，再在 refs 内插 para → <content><refs><para></para></refs></content>
  const glued = '<content><refs><para></para></refs></content>'
  const out = formatXml(glued,2).split('\n').filter(l=>l.trim())
  eq(out[0], '<content>', '第1行 content')
  eq(out[1], '  <refs>', '第2行 refs 缩进2')
  eq(out[2], '    <para></para>', '第3行 para 缩进4（空文本元素合并单行）')
  eq(out[3], '  </refs>', '第4行 </refs> 缩进2')
  eq(out[4], '</content>', '第5行 </content>')
}

// ========== 报告 ==========
log(C.b,'\n'+'='.repeat(56))
log(C.b,`总计 ${stats.total} | 通过 ${stats.passed} | 失败 ${stats.failed}`)
if(stats.failed){ log(C.r,'失败项：'); stats.errs.forEach((e,i)=>log(C.r,`  ${i+1}. ${e}`)); process.exit(1) }
log(C.g,'\n✅ 全部通过'); process.exit(0)
