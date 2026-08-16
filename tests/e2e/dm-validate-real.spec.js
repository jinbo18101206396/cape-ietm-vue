const { test, expect } = require('@playwright/test')
const http = require('http')
const BASE='http://localhost:3000', API='http://localhost:9999/jeecg-boot'
const DM_ID='2083905781513461761', DMC='DMC-J-ZB1-A-02-111A-A-00-0030101-001-01_ZH-CN'
function apiLogin(){return new Promise((res,rej)=>{const b=JSON.stringify({username:'admin',password:'123456'});const r=http.request(API+'/sys/login',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}},x=>{let d='';x.on('data',c=>d+=c);x.on('end',()=>{try{const j=JSON.parse(d);j.success?res(j.result.token):rej(new Error(j.message))}catch(e){rej(e)}})});r.on('error',rej);r.write(b);r.end()})}
let TOKEN; test.beforeAll(async()=>{TOKEN=await apiLogin()})
test('真实后端校验 → 非法元素触发错误对话框', async ({page})=>{
  await page.addInitScript(([t])=>localStorage.setItem('pro__Access-Token',JSON.stringify({value:t,expire:Date.now()+7*864e5})),[TOKEN])
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror',{timeout:30000})
  await page.waitForFunction(()=>{const cm=document.querySelector('.CodeMirror');return cm&&cm.CodeMirror&&cm.CodeMirror.getValue().includes('<dmodule')},{timeout:30000})
  // 注入 schema 非法元素：在 <content> 后插入一个不允许的 <xxbadelem/>（走 CodeMirror→Vue content-change）
  await page.evaluate(()=>{
    const cm=document.querySelector('.CodeMirror').CodeMirror
    let v=cm.getValue()
    v=v.replace('<content>','<content>\n<xxbadelem>非法</xxbadelem>')
    cm.setValue(v)
  })
  let called=false, res=null
  await page.route('**/dm-content/validate**', async r=>{ called=true; const rp=await r.fetch(); const b=await rp.text(); try{res=JSON.parse(b)}catch{}; await r.fulfill({response:rp}) })
  await page.locator('button[title*="XSD Schema校验"]').click()
  // 真实后端应返回错误 → 对话框出现
  await page.locator('.dvp-title').waitFor({state:'visible',timeout:30000})
  const rowCount=await page.locator('.dm-validate-panel tbody tr').count()
  const errs=(res&&res.result&&res.result.errors)||[]
  const infos=errs.map(e=>e.info).join(' || ')
  console.log('真实校验API被调用?',called,'| success?',res&&res.success,'| flag?',res&&res.result&&res.result.flag,'| 错误行数(UI)=',rowCount)
  console.log('错误信息：',infos)
  expect(called).toBeTruthy()
  expect(rowCount).toBeGreaterThan(0)
  // 反假阳性：修复前 SchemaFactory.setProperty 抛 SAXNotRecognizedException，被 service 包成「校验异常」。
  // 修复后应是真实 schema 校验错误（提及非法元素 xxbadelem），绝不能再含包装异常关键字。
  expect(infos).not.toContain('校验异常')
  expect(infos).not.toContain('SAXNotRecognized')
  expect(infos).not.toContain('is not recognized')
  // 真实 XSD 校验的铁证：错误信息含标准 XSD 校验错误码前缀 cvc-（如 cvc-complex-type / cvc-pattern-valid）。
  // 修复前只会得到「校验异常：... is not recognized」这类包装异常，绝不含 cvc- 码。
  expect(infos).toContain('cvc-')
  console.log('✅ 真实后端校验链路：非法内容→后端返回真实schema错误(cvc-*)→对话框显示（非假阳性包装异常）')
})
