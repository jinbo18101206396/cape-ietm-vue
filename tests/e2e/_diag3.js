// 递归走构型树找到真实 DM，逐个诊断 dm_content 状态 vs buildDmRef 返回
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

let T, found = 0

async function walk(projectId, parentId, depth) {
  if (found >= 6 || depth > 6) return
  const res = await get(`/projectconfigurationmanagement/ietmProjectConfigurationManagement/childList?parentId=${parentId}&projectId=${projectId}`, T)
  const nodes = (res.result && res.result.records) || []
  for (const n of nodes) {
    if (found >= 6) return
    // 用该节点直接查 listForDialog（不含子节点，精确到本节点）
    const params = `cmNodeId=${encodeURIComponent(n.id)}&cmNodePath=${encodeURIComponent(n.nodePath || '')}&includeChildren=false&onlyIssued=false&pageNo=1&pageSize=20`
    const list = await get('/ietm/datamodule/listForDialog?' + params, T)
    const recs = (list.result && list.result.records) || []
    if (recs.length) {
      console.log(`\n节点 ${n.code}-${n.title} path=${n.nodePath} DM数=${recs.length}`)
      for (const rec of recs) {
        if (found >= 6) break
        const load = await get(`/ietm/dm-content/load/${rec.id}`, T)
        const xml = (load && load.result && load.result.xml) || ''
        const build = await post('/ietm/dm-content/buildDmRef', [{ dmId: rec.id, includeVersion: false, referredFragment: null }], T)
        const bxml = (build && build.result && build.result.xml) || ''
        console.log(`  id=${rec.id} dmc=${(rec.dmcCode||'').slice(0,36)}`)
        console.log(`    load.xmlLen=${xml.length} load有dmCode=${xml.includes('<dmCode')} | build.flag=${build.result&&build.result.flag} build.xmlLen=${bxml.length}${bxml.length===0?'  <<<空xml! 复现用户问题':''}`)
        found++
      }
    }
    if (n.hasChild === '1') await walk(projectId, n.id, depth + 1)
  }
}

;(async () => {
  const login = await post('/sys/login', { username: 'admin', password: '123456' })
  T = login.result.token
  const projs = await get('/ietmproject/ietmProject/listData', T)
  for (const proj of (projs.result || [])) {
    if (found >= 6) break
    await post('/ietmproject/ietmProject/openProject', { projectId: proj.id }, T)
    const rootRes = await get(`/projectconfigurationmanagement/ietmProjectConfigurationManagement/rootList?projectId=${proj.id}`, T)
    const roots = (rootRes.result && rootRes.result.records) || []
    for (const root of roots) {
      if (found >= 6) break
      await walk(proj.id, root.id, 0)
    }
  }
  if (found === 0) console.log('\n!! 全树未找到任何 DM（当前DB无 is_latest DM 数据）')
})().catch(e => { console.error('ERR', e); process.exit(1) })
