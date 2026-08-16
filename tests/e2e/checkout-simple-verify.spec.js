/**
 * 签出流程 - 简化验证（调试用）
 */

const { test, expect } = require('@playwright/test')
const http = require('http')

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve({ raw: d }) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败: ' + JSON.stringify(l))
  TOKEN = l.result.token
  console.log('✅ 登录成功，token:', TOKEN.substring(0, 20) + '...')
  
  const openRes = await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT }, TOKEN)
  console.log('openProject 响应:', JSON.stringify(openRes).substring(0, 100))
})

test.describe('签出流程 - 简化验证', () => {
  test.setTimeout(60000)

  test('能否看到数据模块管理页面', async ({ page }) => {
    // 注入 token
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    // 导航
    console.log('导航到:', `${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    await page.goto(`${BASE}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
    
    // 等待页面加载
    await page.waitForLoadState('load')
    await page.waitForTimeout(3000)

    // 截图
    await page.screenshot({ path: 'test-results/debug-page.png', fullPage: true })
    console.log('截图保存到: test-results/debug-page.png')

    // 检查页面标题
    const title = await page.title()
    console.log('页面标题:', title)

    // 检查是否有登录表单（说明未登录）
    const loginForm = await page.locator('input[placeholder*="账号"]').count()
    console.log('登录表单数量:', loginForm)

    // 检查是否有树组件
    const treeCount = await page.locator('.ant-tree').count()
    console.log('树组件数量:', treeCount)

    // 检查页面 body 内容
    const bodyText = await page.locator('body').textContent()
    console.log('页面内容前200字符:', bodyText?.substring(0, 200))

    // 如果有树，测试通过
    if (treeCount > 0) {
      console.log('✅ 找到树组件，页面加载成功')
    } else {
      console.log('❌ 未找到树组件，可能是权限或路由问题')
    }
  })
})
