const { test } = require('@playwright/test')
const http = require('http')
const BASE='http://localhost:3000', API='http://localhost:9999/jeecg-boot'
const PROJECT='2078348945532030978', TARGET='2078360430056513538'
function req(m,p,b,t){return new Promise((res,rej)=>{const d=b?JSON.stringify(b):null;const h={'Content-Type':'application/json'};if(d)h['Content-Length']=Buffer.byteLength(d);if(t)h['X-Access-Token']=t;const r=http.request(API+p,{method:m,headers:h},x=>{let s='';x.on('data',c=>s+=c);x.on('end',()=>{try{res(JSON.parse(s))}catch(e){res({raw:s})}})});r.on('error',rej);if(d)r.write(d);r.end()})}
let T
test.beforeAll(async()=>{const l=await req('POST','/sys/login',{username:'admin',password:'123456'});T=l.result.token;await req('POST','/ietmproject/ietmProject/openProject',{projectId:PROJECT},T)})
test('explore tree', async({page})=>{
  await page.addInitScript(([tok])=>{localStorage.setItem('pro__Access-Token',JSON.stringify({value:tok,expire:Date.now()+7*864e5}))},[T])
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(1000)
  // 根节点渲染情况
  const rootWrappers = await page.locator('.ant-tree-node-content-wrapper').count()
  console.log('初始可见节点数:', rootWrappers)
  // 展开根节点：点展开箭头(switcher)
  const switcher = page.locator('.ant-tree-switcher').first()
  await switcher.click()
  await page.waitForTimeout(1500)
  const afterExpand = await page.locator('.ant-tree-node-content-wrapper').count()
  console.log('展开根后可见节点数:', afterExpand)
  // 探查树节点DOM：li的属性、key在哪
  const domInfo = await page.evaluate(()=>{
    const lis = Array.from(document.querySelectorAll('.ant-tree li'))
    return lis.slice(0,5).map(li=>({
      attrs: Array.from(li.attributes).map(a=>a.name+'='+a.value),
      title: (li.querySelector('.ant-tree-title')||{}).innerText,
      cls: li.className
    }))
  })
  console.log('前5个li:', JSON.stringify(domInfo, null, 2))
  // 尝试通过Vue组件数据找target节点在第几个可见wrapper
  const idx = await page.evaluate((target)=>{
    const wrappers = Array.from(document.querySelectorAll('.ant-tree-node-content-wrapper'))
    for(let i=0;i<wrappers.length;i++){
      // antd把dataRef挂在__vue__或通过title匹配, 试着找eventKey
      const li = wrappers[i].closest('li')
      // antdv 1.x TreeNode: li上无key属性, 需从vue实例取
    }
    return wrappers.length
  }, TARGET)
  console.log('wrapper count via eval:', idx)
})
