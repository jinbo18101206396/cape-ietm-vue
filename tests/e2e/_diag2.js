// 走弹窗真实链路：openProject -> rootList -> listForDialog(includeChildren) -> load vs buildDmRef
const http = require('http')
const API = 'http://localhost:9999/jeecg-boot'
function req(m, p, b, t) {
  return new Promise((res, rej) => {
    const d = b ? JSON.stringify(b) : null
    const h = { 'Content-Type': 'application/json' }
    if (d) h['Content-Length'] = Buffer.byteLength(d)
    if (t) h['X-Access-Token'] = t
    const r = http.request(API + p, { method: m, headers: h }, x => {
      let s = ''; x.on('data', c => s += c).on('end', () => { try { res(JSON.parse(s)) } catch (e) { res({ raw: s }) } })
    })
    r.on('error', rej); if (d) r.write(d); r.end()
  })
}
const get = (p, t) => req('GET', p, null, t)
const post = (p, b, t) => req('POST', p, b, t)

;(async () => {
  const login = await post('/sys/login', { username: 'admin', password: '123456' })
  const T = login.result.token
  const projs = await get('/ietmproject/ietmProject/listData', T)
  for (const proj of (projs.result || [])) {
    await post('/ietmproject/ietmProject/openProject', { projectId: proj.id }, T)
    const cur = await get('/ietmproject/ietmProject/getCurrentProject', T)
    const pid = cur.result && cur.result.projectId
    const root = await get('/projectconfigurationmanagement/ietmProjectConfigurationManagement/rootList?projectId=' + pid, T)
    const recsRoot = (root.result && root.result.records) || []
    if (!recsRoot.length) { console.log(`proj ${proj.id} 无根节点`); continue }
    const rn = recsRoot[0]
    const params = `cmNodeId=${encodeURIComponent(rn.id)}&cmNodePath=${encodeURIComponent(rn.nodePath || '')}&includeChildren=true&onlyIssued=false&pageNo=1&pageSize=100`
    const list = await get('/ietm/datamodule/listForDialog?' + params, T)
    const recs = (list.result && list.result.records) || []
    console.log(`\n=== proj ${proj.id} ${proj.projectName||''} 根节点=${rn.code} listForDialog DM=${recs.length} ===`)
    if (!recs.length) continue
    let emptyCount = 0
    for (const rec of recs) {
      const load = await get(`/ietm/dm-content/load/${rec.id}`, T)
      const xml = (load && load.result && load.result.xml) || ''
      const build = await post('/ietm/dm-content/buildDmRef', [{ dmId: rec.id, includeVersion: false, referredFragment: null }], T)
      const bxml = (build && build.result && build.result.xml) || ''
      const empty = bxml.length === 0
      if (empty) emptyCount++
      console.log(`  id=${rec.id} dmc=${(rec.dmcCode||'').slice(0,34)} loadLen=${xml.length} loadDmCode=${xml.includes('<dmCode')} | buildLen=${bxml.length}${empty?' <<<空(引用报警告)':''}`)
    }
    console.log(`  >>> 空xml的DM数: ${emptyCount}/${recs.length}`)
    if (recs.length) break
  }
})().catch(e => { console.error('ERR', e); process.exit(1) })
