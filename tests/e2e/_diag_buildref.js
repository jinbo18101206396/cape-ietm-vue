// 诊断：引用最新版列表里的 DM，其 dm_content 状态 + buildDmRef 真实返回
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
        try { resolve(JSON.parse(d)) } catch (e) { resolve({ raw: d }) }
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}
const get = (p, t) => req('GET', p, null, t)
const post = (p, b, t) => req('POST', p, b, t)

;(async () => {
  const login = await post('/sys/login', { username: 'admin', password: '123456' })
  const TOKEN = login.result.token

  const projs = await get('/ietmproject/ietmProject/listData', TOKEN)
  const projList = (projs.result || []).filter(p => p.id)

  for (const proj of projList) {
    const list = await get(`/ietm/datamodule/list?projectId=${proj.id}&pageNo=1&pageSize=50`, TOKEN)
    const recs = (list.result && list.result.records) || []
    if (recs.length === 0) continue
    await post('/ietmproject/ietmProject/openProject', { projectId: proj.id }, TOKEN)
    console.log(`\n=== 项目 ${proj.id} ${proj.projectName || ''}  DM数=${recs.length} ===`)
    for (const rec of recs.slice(0, 8)) {
      // load：编辑器视角（null 内容会回填模板）
      const load = await get(`/ietm/dm-content/load/${rec.id}`, TOKEN)
      const xml = (load && load.result && load.result.xml) || ''
      const hasDmCodeInLoad = xml.includes('<dmCode')
      // buildDmRef：引用视角（直接读 dm_content，无模板兜底）
      const build = await post('/ietm/dm-content/buildDmRef',
        [{ dmId: rec.id, includeVersion: false, referredFragment: null }], TOKEN)
      const buildXml = (build && build.result && build.result.xml) || ''
      console.log(
        `id=${rec.id} dmc=${(rec.dmcCode||'').slice(0,40)}` +
        ` | load.xmlLen=${xml.length} load有dmCode=${hasDmCodeInLoad}` +
        ` | build.flag=${build.result && build.result.flag} build.xmlLen=${buildXml.length}` +
        (buildXml.length === 0 ? '  <<< 空! (引用会报警告)' : '')
      )
    }
    break // 只诊断第一个有DM的项目
  }
})().catch(e => { console.error(e); process.exit(1) })
