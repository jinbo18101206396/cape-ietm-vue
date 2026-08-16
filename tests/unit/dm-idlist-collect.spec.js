#!/usr/bin/env node
/* eslint-disable */
// §14.8 对象列表弹窗 DmIdListModal — 纯函数级验证（collect / _attrs / _dmCode）
// 直接从 .vue 抽取 methods，构造 this 上下文调用，不依赖 Jest/浏览器/DOMParser。
const fs = require('fs')
const path = require('path')

const C = { g:'\x1b[32m', r:'\x1b[31m', b:'\x1b[34m', y:'\x1b[33m', x:'\x1b[0m' }
const log = (c,...a)=>console.log(c+a.join(' ')+C.x)
const stats = { total:0, passed:0, failed:0, errs:[] }
function assert(cond, msg){ stats.total++; if(cond){ stats.passed++; log(C.g,'  ✓',msg) } else { stats.failed++; log(C.r,'  ✗',msg); stats.errs.push(msg) } }
function eq(a,e,msg){ const ok=JSON.stringify(a)===JSON.stringify(e); if(!ok) msg+=`\n      期望:${JSON.stringify(e)}\n      实际:${JSON.stringify(a)}`; assert(ok,msg) }

// ---- 从 DmIdListModal.vue 抽取 export default 对象，取出 methods ----
const vuePath = path.join(__dirname,'../../src/views/ietm/ietmdatamodulemanagement/editor/components/DmIdListModal.vue')
const src = fs.readFileSync(vuePath,'utf-8')
const scriptSrc = src.slice(src.indexOf('<script>')+8, src.indexOf('</script>'))
// export default {...} → 直接 eval 成对象；TYPE_LABEL 是 script 内的顶层 const，一并求值
const comp = eval(`(function(){ ${scriptSrc.replace('export default','return')} })()`)
const M = comp.methods

// 构造 this 上下文：collect 内会调用 this._attrs / this._dmCode
function ctx(){ return { _attrs: M._attrs, _dmCode: M._dmCode } }
const collect = (nodeList, offset) => M.collect.call(ctx(), nodeList, offset)

// 便捷构造 nodeList 节点
function node(id, pid, text, path, lineno, attrs){
  return { id, pid, text, attributes: { name:text, path, lineno, attrval: JSON.stringify(attrs||{}) } }
}

// ========== 场景1：空 nodeList ==========
log(C.b,'\n📋 场景1：空/无对象输入')
{
  eq(collect([], 1), [], '空 nodeList → 空数组')
  const plain = [ node(0,-1,'dmodule','/dmodule',1), node(1,0,'content','/dmodule/content',2) ]
  eq(collect(plain, 1), [], '无 id/dmRef/graphic 的普通结构 → 空数组')
}

// ========== 场景2：id 元素收集 ==========
log(C.b,'\n📋 场景2：带 id 属性的元素')
{
  const nl = [
    node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'para','/dmodule/content/para',5,{ id:'p-001' }),
    node(2,0,'table','/dmodule/content/table',9,{ id:'t-1', frame:'all' })
  ]
  const r = collect(nl, 1)
  eq(r.length, 2, '收集到 2 个 id 元素')
  eq(r[0], { key:r[0].key, type:'id', typeLabel:'ID元素', tag:'para', ref:'p-001', editorLine:5 }, 'para id=p-001 行号5')
  eq(r[1].ref, 't-1', 'table id=t-1（多属性下仍取 id）')
}

// ========== 场景3：dmRef 重组 dmCode ==========
log(C.b,'\n📋 场景3：dmRef 从子树 dmCode 重组 DMC 串')
{
  const nl = [
    node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'dmRef','/dmodule/content/dmRef',10),
    node(2,1,'dmRefIdent','/dmodule/content/dmRef/dmRefIdent',11),
    node(3,2,'dmCode','/dmodule/content/dmRef/dmRefIdent/dmCode',12,{
      modelIdentCode:'ZB1', systemDiffCode:'A', systemCode:'03', subSystemCode:'0',
      subSubSystemCode:'0', assyCode:'00', disassyCode:'00', disassyCodeVariant:'A',
      infoCode:'007', infoCodeVariant:'A', itemLocationCode:'A' })
  ]
  const r = collect(nl, 1)
  eq(r.length, 1, '仅 dmRef 计一行（dmCode 本身不带 id 不单列）')
  eq(r[0].type, 'dmRef', '类型 dmRef')
  eq(r[0].ref, 'DMC-ZB1-A-03-0-0-00-00-A-007-A-A', 'DMC 串按 11 段顺序拼接')
  eq(r[0].editorLine, 10, 'dmRef 行号取 dmRef 自身（10），非 dmCode 行')
}

// ========== 场景4：graphic / symbol 图形 ==========
log(C.b,'\n📋 场景4：graphic / symbol 图形(ICN)')
{
  const nl = [
    node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'graphic','/dmodule/content/figure/graphic',7,{ infoEntityIdent:'ICN-A-001' }),
    node(2,0,'symbol','/dmodule/content/para/symbol',12,{ infoEntityIdent:'ICN-S-9', reproductionWidth:'50' })
  ]
  const r = collect(nl, 1)
  eq(r.length, 2, 'graphic + symbol 各计一行')
  eq(r[0], { key:r[0].key, type:'icn', typeLabel:'图形ICN', tag:'graphic', ref:'ICN-A-001', editorLine:7 }, 'graphic ICN 正确')
  eq(r[1].tag, 'symbol', 'symbol 也归入图形ICN')
  eq(r[1].ref, 'ICN-S-9', 'symbol 取 infoEntityIdent')
}

// ========== 场景5：混合 + 行号升序 ==========
log(C.b,'\n📋 场景5：三类混合，按编辑器行号升序')
{
  const nl = [
    node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'graphic','/dmodule/g',20,{ infoEntityIdent:'ICN-2' }),
    node(2,0,'para','/dmodule/p',5,{ id:'p1' }),
    node(3,0,'dmRef','/dmodule/dmRef',12),
    node(4,3,'dmCode','/dmodule/dmRef/dmRefIdent/dmCode',13,{ modelIdentCode:'X', systemCode:'01' })
  ]
  const r = collect(nl, 1)
  eq(r.map(i=>i.editorLine), [5,12,20], '结果按 editorLine 升序：5,12,20')
  eq(r.map(i=>i.type), ['id','dmRef','icn'], '顺序对应 id/dmRef/icn')
}

// ========== 边界1：dmRef 无 dmCode 子节点 ==========
log(C.b,'\n📋 边界1：dmRef 子树内无 dmCode')
{
  const nl = [
    node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'dmRef','/dmodule/dmRef',8),
    node(2,1,'dmRefIdent','/dmodule/dmRef/dmRefIdent',9)  // 无 dmCode
  ]
  const r = collect(nl, 1)
  eq(r[0].ref, '(无dmCode)', 'dmRef 无 dmCode → 显示 (无dmCode)')
}

// ========== 边界2：graphic 无 infoEntityIdent ==========
log(C.b,'\n📋 边界2：graphic 无 infoEntityIdent')
{
  const nl = [ node(0,-1,'dmodule','/dmodule',1), node(1,0,'graphic','/dmodule/g',4,{}) ]
  eq(collect(nl,1)[0].ref, '(无ICN)', 'graphic 无 infoEntityIdent → (无ICN)')
}

// ========== 边界3：同元素既有 id 又是 graphic → 双列 ==========
log(C.b,'\n📋 边界3：graphic 元素自身带 id（同元素进两类）')
{
  const nl = [ node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'graphic','/dmodule/g',6,{ id:'g1', infoEntityIdent:'ICN-9' }) ]
  const r = collect(nl,1)
  eq(r.length, 2, '同一 graphic 既进 ID元素 又进 图形ICN（各一行）')
  const types = r.map(i=>i.type).sort()
  eq(types, ['icn','id'], '两行类型分别为 id 与 icn')
}

// ========== 边界4：attrval 非法 JSON / 缺失 容错（不抛异常） ==========
log(C.b,'\n📋 边界4：attrval 非法/缺失 容错')
{
  // 非法 JSON 的 para（本无 id）→ _attrs 兜底 {} → 无 id 不产出行
  const bad = { id:1, pid:0, text:'para', attributes:{ path:'/dmodule/para', lineno:3, attrval:'{不是JSON' } }
  // attrval 缺失的 graphic → _attrs 兜底 {} → 仍是 graphic，产出 (无ICN) 一行（元素身份不因缺属性消失）
  const noAttr = { id:2, pid:0, text:'graphic', attributes:{ path:'/dmodule/g', lineno:4 } }
  const r = collect([ node(0,-1,'dmodule','/dmodule',1), bad, noAttr ], 1)
  eq(r.length, 1, '非法/缺失 attrval 不抛异常；仅 graphic 因元素身份产出 1 行')
  eq(r[0], { key:r[0].key, type:'icn', typeLabel:'图形ICN', tag:'graphic', ref:'(无ICN)', editorLine:4 }, '缺 attrval 的 graphic → (无ICN)')
}

// ========== 边界5：lineno 缺失 fallback + offset 换算 ==========
log(C.b,'\n📋 边界5：lineno=0(fallback) 与 linenoOffset 换算')
{
  const nl = [
    node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'para','/dmodule/para',0,{ id:'x' }),   // lineno 未算出=0
    node(2,0,'para','/dmodule/para2',5,{ id:'y' })
  ]
  // offset=3（dmodule 在编辑器第3行，前有 <?xml?> 与 <!DOCTYPE>）
  const r = collect(nl, 3)
  const rx = r.find(i=>i.ref==='x'), ry = r.find(i=>i.ref==='y')
  eq(rx.editorLine, 3, 'lineno=0 → (1)-1+3 = 3（fallback 到 dmodule 行）')
  eq(ry.editorLine, 7, 'lineno=5 → 5-1+3 = 7（offset 正确叠加）')
}

// ========== 边界6：相邻同级两个 dmRef 各自取对的 dmCode ==========
log(C.b,'\n📋 边界6：相邻兄弟 dmRef 不串味')
{
  const nl = [
    node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'dmRef','/dmodule/content/dmRef',10),
    node(2,1,'dmCode','/dmodule/content/dmRef/dmRefIdent/dmCode',11,{ modelIdentCode:'AAA', systemCode:'01' }),
    node(3,0,'dmRef','/dmodule/content/dmRef',15),
    node(4,3,'dmCode','/dmodule/content/dmRef/dmRefIdent/dmCode',16,{ modelIdentCode:'BBB', systemCode:'02' })
  ]
  const r = collect(nl, 1).filter(i=>i.type==='dmRef')
  eq(r.length, 2, '两个兄弟 dmRef')
  eq(r[0].ref, 'DMC-AAA-01', '第1个 dmRef 取自身子树 dmCode(AAA)')
  eq(r[1].ref, 'DMC-BBB-02', '第2个 dmRef 取自身子树 dmCode(BBB)，不被兄弟污染')
}

// ========== 边界7：dmCode 空段跳过（filter 空串） ==========
log(C.b,'\n📋 边界7：dmCode 含空/缺字段时跳过该段')
{
  const nl = [
    node(0,-1,'dmodule','/dmodule',1),
    node(1,0,'dmRef','/dmodule/dmRef',10),
    node(2,1,'dmCode','/dmodule/dmRef/dmRefIdent/dmCode',11,{
      modelIdentCode:'ZB1', systemDiffCode:'', systemCode:'03', infoCode:'007' }) // 多字段缺失
  ]
  eq(collect(nl,1)[0].ref, 'DMC-ZB1-03-007', '空 systemDiffCode 与缺失段被跳过，仅拼非空段')
}

// ========== 报告 ==========
log(C.b,'\n'+'='.repeat(56))
log(C.b,`总计 ${stats.total} | 通过 ${stats.passed} | 失败 ${stats.failed}`)
if(stats.failed){ log(C.r,'失败项：'); stats.errs.forEach((e,i)=>log(C.r,`  ${i+1}. ${e}`)); process.exit(1) }
log(C.g,'\n✅ 全部通过'); process.exit(0)
