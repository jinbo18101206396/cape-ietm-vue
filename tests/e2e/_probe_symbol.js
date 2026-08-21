// One-off probe: find a DM whose XML allows <symbol> (has <para>/<title>/<note> etc.)
const http = require('http')
const API = 'http://localhost:9999/jeecg-boot'
function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(null) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}
const post = (p, b, t) => req('POST', p, b, t)
const get = (p, t) => req('GET', p, null, t)

;(async () => {
  const login = await post('/sys/login', { username: 'admin', password: '123456' })
  const TOKEN = login.result.token
  const projs = await get('/ietmproject/ietmProject/listData', TOKEN)
  const projList = (projs.result || []).filter(p => p.id)
  for (const proj of projList) {
    const list = await get(`/ietm/datamodule/list?projectId=${proj.id}&pageNo=1&pageSize=50`, TOKEN)
    const recs = (list.result && list.result.records) || []
    if (!recs.length) continue
    console.log(`\n=== PROJECT ${proj.id} (${proj.projectName || ''}) : ${recs.length} DM ===`)
    for (const rec of recs) {
      const load = await get(`/ietm/dm-content/load/${rec.id}`, TOKEN)
      const xml = load && load.result && load.result.xml || ''
      const hasPara = /<para\b/.test(xml)
      const hasTitle = /<title\b/.test(xml)
      const hasSymbol = /<symbol\b/.test(xml)
      const schema = load && load.result && load.result.schema || {}
      const paraAllowsSymbol = schema.para && schema.para.children && schema.para.children.includes('symbol')
      console.log(`DM ${rec.id} dmc=${rec.dmcCode}`)
      console.log(`   xml: para=${hasPara} title=${hasTitle} symbol(existing)=${hasSymbol} len=${xml.length}`)
      console.log(`   schema.para.children includes symbol = ${paraAllowsSymbol}`)
      console.log(`   cmNodeId=${rec.cmNodeId}`)
      // probe symbols available at that cm node
      if (rec.cmNodeId) {
        const sy = await get(`/icnmanage/ietmIcnManage/listSymbolsForDialog?cmNodeId=${rec.cmNodeId}&includeChildren=1&pageNo=1&pageSize=10`, TOKEN)
        const rows = sy && sy.result && sy.result.records || []
        console.log(`   symbols@node(inclChildren)=${rows.length}`, rows.slice(0,3).map(r => `${r.fileName}(nd=${r.needDimension})`).join(', '))
      }
    }
  }
})().catch(e => { console.error(e); process.exit(1) })
