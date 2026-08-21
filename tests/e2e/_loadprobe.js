const http = require('http')
const API = 'http://localhost:9999/jeecg-boot'
function req(m, p, t) {
  return new Promise((res, rej) => {
    const h = { 'Content-Type': 'application/json' }
    if (t) h['X-Access-Token'] = t
    const r = http.request(API + p, { method: m, headers: h }, x => {
      let s = ''; x.on('data', c => s += c).on('end', () => { try { res(JSON.parse(s)) } catch (e) { res({ raw: s }) } })
    })
    r.on('error', rej); r.end()
  })
}
;(async () => {
  const t = (await req('POST', '/sys/login', null)).result
    ? (await new Promise(async r => { const l = await req('POST', '/sys/login', null); r(l) })) : null
  // 简单登录
  const login = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: 'admin', password: '123456' })
    const rq = http.request(API + '/sys/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => resolve(JSON.parse(d)))
    }); rq.on('error', reject); rq.write(body); rq.end()
  })
  const token = login.result.token
  const dmId = '2084257576786046977'
  const load = await req('GET', '/ietm/dm-content/load/' + dmId, token)
  const r = load.result
  console.log('load flag=', r.flag, '| checkoutUser? readonly取决于前端mode')
  const xml = r.xml || ''
  console.log('XML length=', xml.length)
  console.log('XML head:\n', xml.substring(0, 600))
  // 找 schema 中允许 dmRef 作为子元素的父元素
  const schema = r.schema || {}
  const allow = Object.keys(schema).filter(k => schema[k] && Array.isArray(schema[k].children) && schema[k].children.includes('dmRef'))
  console.log('允许 dmRef 子元素的父元素(前20):', allow.slice(0, 20))
})().catch(e => console.error('ERR', e.message))
