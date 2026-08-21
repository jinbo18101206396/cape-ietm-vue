// 深度检查：数据库字段长度、索引、外键约束等
const http = require('http')
const API = 'http://localhost:9999/jeecg-boot'

function req(m, p, b, t) {
  return new Promise((res, rej) => {
    const d = b ? JSON.stringify(b) : null
    const h = { 'Content-Type': 'application/json' }
    if (d) h['Content-Length'] = Buffer.byteLength(d)
    if (t) h['X-Access-Token'] = t
    const r = http.request(API + p, { method: m, headers: h }, x => {
      let s = ''; x.on('data', c => s += c).on('end', () => {
        try { res(JSON.parse(s)) } catch (e) { res({ raw: s }) }
      })
    })
    r.on('error', rej); if (d) r.write(d); r.end()
  })
}
const get = (p, t) => req('GET', p, null, t)
const post = (p, b, t) => req('POST', p, b, t)

;(async () => {
  console.log('=== 深度检查：边界条件、数据完整性 ===\n')

  const issues = []
  const warnings = []

  const login = await post('/sys/login', { username: 'admin', password: '123456' })
  const T = login.result.token

  // 1. 检查DMC长度限制
  console.log('【1】检查DMC长度...')
  const cur = await get('/ietmproject/ietmProject/getCurrentProject', T)
  if (cur.success && cur.result) {
    const pid = cur.result.projectId
    const rootRes = await get(`/projectconfigurationmanagement/ietmProjectConfigurationManagement/rootList?projectId=${pid}`, T)
    const roots = (rootRes.result && rootRes.result.records) || []

    if (roots.length > 0) {
      const childRes = await get(`/projectconfigurationmanagement/ietmProjectConfigurationManagement/childList?parentId=${roots[0].id}&projectId=${pid}`, T)
      const children = (childRes.result && childRes.result.records) || []

      if (children.length > 0) {
        const info = await get(`/ietm/datamodule/getProjectInfo?cmNodeId=${children[0].id}`, T)
        const sns = info.result.sns || ''

        // 模拟最长DMC
        const longestDmc = `DMC-${sns}-999Z-Z999Z-9999-99XXXXXXXXXX-999-ZZ_ZH-CN`
        console.log(`  最长可能DMC: ${longestDmc}`)
        console.log(`  长度: ${longestDmc.length} 字符`)

        if (longestDmc.length > 255) {
          issues.push(`DMC可能超过VARCHAR(255)限制: ${longestDmc.length}字符`)
        } else if (longestDmc.length > 200) {
          warnings.push(`DMC接近上限: ${longestDmc.length}/255字符`)
        } else {
          console.log(`  ✓ 长度安全 (${longestDmc.length}/255)`)
        }
      }
    }
  }
  console.log()

  // 2. 检查特殊字符处理
  console.log('【2】检查特殊字符处理...')
  const specialChars = {
    'XML实体': '&<>"\'',
    '中文': '《》、：；（）【】',
    '控制符': '\n\r\t',
    'Unicode': '😀🔥'
  }

  for (const [name, chars] of Object.entries(specialChars)) {
    console.log(`  ${name}: ${chars}`)
  }
  console.log('  ⚠️ 需要前端确保XML转义正确，后端确保数据库编码为UTF-8')
  console.log()

  // 3. 检查并发场景
  console.log('【3】检查并发控制...')
  const params = 'cmNodeId=&cmNodePath=&includeChildren=true&onlyIssued=false&pageNo=1&pageSize=5'
  const list = await get('/ietm/datamodule/listForDialog?' + params, T)
  const recs = (list.result && list.result.records) || []

  if (recs.length > 0) {
    const dm = recs[0]
    console.log(`  样本DM: ${dm.dmcCode}`)
    console.log(`  checkoutUser: ${dm.checkoutUser || '(未签出)'}`)

    if (dm.checkoutUser) {
      console.log(`  ✓ 有签出控制`)
    } else {
      console.log(`  ⚠️ 未签出状态`)
      warnings.push('需验证多用户同时编辑的并发控制')
    }
  }
  console.log()

  // 4. 检查版本管理
  console.log('【4】检查版本管理...')
  if (recs.length > 0) {
    const dm = recs[0]
    console.log(`  issueNo: ${dm.issueNo || '(无)'}`)
    console.log(`  inWork: ${dm.inWork || '(无)'}`)
    console.log(`  isLatest: ${dm.isLatest || '(无)'}`)

    if (!dm.issueNo) {
      issues.push('DM缺少issueNo（发布号）')
    }
    if (dm.isLatest !== '1' && dm.isLatest !== '0') {
      warnings.push('isLatest字段值异常')
    }
  }
  console.log()

  // 5. 检查引用完整性
  console.log('【5】检查DM引用关系...')
  if (recs.length > 0) {
    const dm = recs[0]
    const refs = await get(`/ietm/dm-ref/list?dmId=${dm.id}&pageNo=1&pageSize=100`, T)
    const refList = (refs.result && refs.result.records) || []
    console.log(`  DM[${dm.id}]的引用数: ${refList.length}`)

    if (refList.length > 0) {
      console.log(`  样本引用: ${refList[0].refDmId || '(无refDmId)'}`)
      if (!refList[0].refDmId) {
        issues.push('DM引用表缺少refDmId外键')
      } else {
        console.log(`  ✓ 引用关系记录正常`)
      }
    }
  }
  console.log()

  // 6. 检查文件附件
  console.log('【6】检查附件管理...')
  if (recs.length > 0) {
    const dm = recs[0]
    // 检查是否有附件表
    console.log(`  DM[${dm.id}]可能有附件（图片、多媒体）`)
    console.log(`  ⚠️ 需验证附件上传、存储、引用路径的正确性`)
  }
  console.log()

  // 7. 检查Schema版本兼容性
  console.log('【7】检查Schema版本...')
  const schemaRes = await get('/ietm/dm-schema/list?pageNo=1&pageSize=10', T)
  const schemas = (schemaRes.result && schemaRes.result.records) || []

  if (schemas.length > 0) {
    console.log(`  Schema数量: ${schemas.length}`)
    const s = schemas[0]
    console.log(`  样本Schema: ${s.type}`)
    console.log(`  版本: ${s.version || '(无版本信息)'}`)

    if (!s.version) {
      warnings.push('Schema缺少版本控制，可能导致升级后不兼容')
    }
  } else {
    issues.push('Schema配置为空（重复上次检查结果）')
  }
  console.log()

  // 8. 检查工作流状态
  console.log('【8】检查工作流状态...')
  if (recs.length > 0) {
    const dm = recs[0]
    console.log(`  wfStatus: ${dm.wfStatus || '(无)'}`)
    console.log(`  wfPiId: ${dm.wfPiId || '(无)'}`)

    if (dm.wfStatus === 'started') {
      console.log(`  ✓ 工作流运行中`)
    } else if (dm.wfStatus === 'ended') {
      console.log(`  ✓ 工作流已结束`)
    } else if (!dm.wfStatus) {
      console.log(`  - 未启动工作流`)
    }
  }
  console.log()

  // 9. 检查权限控制
  console.log('【9】检查权限控制...')
  console.log('  登录用户: admin')
  console.log('  ⚠️ 需验证普通用户的操作权限：')
  console.log('    - 只能查看自己创建的DM？')
  console.log('    - 只能编辑签出给自己的DM？')
  console.log('    - 只能删除特定状态的DM？')
  console.log()

  // 10. 检查日志审计
  console.log('【10】检查操作日志...')
  console.log('  ⚠️ 需验证关键操作是否记录日志：')
  console.log('    - 新建、编辑、删除DM')
  console.log('    - 签出、签入')
  console.log('    - 提交工作流')
  console.log('    - 发布版本')
  console.log()

  // 总结
  console.log('='.repeat(80))
  console.log('【深度检查总结】\n')

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✓ 未发现新的严重问题')
  } else {
    if (issues.length > 0) {
      console.log(`❌ 新发现问题 (${issues.length}):`)
      issues.forEach((x, i) => console.log(`  ${i + 1}. ${x}`))
      console.log()
    }
    if (warnings.length > 0) {
      console.log(`⚠ 需要关注 (${warnings.length}):`)
      warnings.forEach((x, i) => console.log(`  ${i + 1}. ${x}`))
    }
  }
  console.log()
})().catch(e => {
  console.error('\n✗ 检查失败:', e.message)
  process.exit(1)
})
