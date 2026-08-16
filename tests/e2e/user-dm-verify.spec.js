/**
 * 用户实际DM预览验证
 * DMC: DMC-ZB1-A-02-00-00-00A-007A-A_001-03_ZH-CN
 */

const { test, expect } = require('@playwright/test')
const http = require('http')

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DMC = 'DMC-ZB1-A-02-00-00-00A-007A-A_001-03_ZH-CN'
const PROJECT_ID = '2078348945532030978'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''
      res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(d) }
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

let TOKEN

test.describe('用户实际DM预览验证', () => {
  test.beforeAll(async () => {
    const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
    if (!login || !login.result || !login.result.token) throw new Error('登录失败')
    TOKEN = login.result.token
    await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
  })

  test('获取用户DM的实际内容和ID', async () => {
    console.log('\n查询DMC:', DMC)

    // 查询DM列表获取ID
    const listResp = await apiReq('POST', '/ietm/ietmdatamodulemanagement/list', {
      pageNo: 1,
      pageSize: 100,
      dmCode: DMC
    }, TOKEN)

    console.log('\n查询结果:', JSON.stringify(listResp, null, 2))

    if (!listResp || !listResp.result || !listResp.result.records) {
      throw new Error('查询DM失败')
    }

    const records = listResp.result.records
    console.log(`\n找到 ${records.length} 条记录`)

    if (records.length === 0) {
      throw new Error(`未找到DMC: ${DMC}`)
    }

    const dm = records[0]
    console.log('\nDM信息:')
    console.log('- ID:', dm.id)
    console.log('- DMC:', dm.dmCode)
    console.log('- 标题:', dm.techName, '/', dm.infoName)
    console.log('- 类型:', dm.infoCode)

    // 获取DM内容
    const contentResp = await apiReq('GET', `/ietm/dm-content/get?dmId=${dm.id}`, null, TOKEN)

    if (!contentResp || !contentResp.result) {
      throw new Error('获取DM内容失败')
    }

    const content = contentResp.result
    console.log('\n内容长度:', content.xml ? content.xml.length : 0)

    // 调用预览API
    console.log('\n调用预览API...')
    const previewResp = await apiReq('POST', '/ietm/dm-content/preview', {
      xml: content.xml
    }, TOKEN)

    if (typeof previewResp === 'string') {
      // 分析HTML
      console.log('\n预览HTML长度:', previewResp.length)

      // 检查TOC
      const tocMatch = previewResp.match(/<table[^>]*class="toc-table"/)
      console.log('\n✓ TOC表格class:', tocMatch ? 'toc-table存在' : '❌ 缺少toc-table')

      // 检查表格标题
      const titleMatch = previewResp.match(/<table[^>]*class="tabletitle"/)
      console.log('✓ 嵌套表格标题:', titleMatch ? '❌ 存在.tabletitle' : 'OK - 无嵌套')

      // 检查数据限制嵌套
      const dataRestMatch = previewResp.match(/<td[^>]*class="idStatus"[^>]*>[\s\S]*?<table/)
      console.log('✓ 数据限制嵌套表格:', dataRestMatch ? '❌ 存在嵌套' : 'OK - 无嵌套')

      // 检查CSS
      const cssMatch = previewResp.match(/\.toc-table[^{]*\{[^}]*border:\s*none/)
      console.log('✓ TOC CSS规则:', cssMatch ? 'OK - border:none存在' : '❌ 缺少规则')

      // 保存HTML供检查
      const fs = require('fs')
      const path = require('path')
      const outputPath = path.join(__dirname, 'user-dm-preview-output.html')
      fs.writeFileSync(outputPath, previewResp, 'utf-8')
      console.log('\n预览HTML已保存:', outputPath)

      // 检查序号
      const seqPattern = /<td[^>]*>\s*(\d+(?:\.\d+)*)\s*<\/td>/g
      const sequences = []
      let match
      while ((match = seqPattern.exec(previewResp)) !== null && sequences.length < 10) {
        sequences.push(match[1])
      }
      console.log('\n检测到的序号:', sequences.slice(0, 5).join(', '))
    }
  })
})
