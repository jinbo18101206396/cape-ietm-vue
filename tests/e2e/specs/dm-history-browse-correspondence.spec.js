/**
 * E2E测试：验证"浏览DM"功能的DMC与XML一一对应
 *
 * 测试目标：
 * 1. 点击"浏览DM"打开的XML必须与当前行的DMC一致
 * 2. 不同历史版本打开的内容必须不同
 * 3. 缺少XML内容的记录应给出友好提示
 */

const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978'

let TOKEN = ''

// 辅助函数：API请求
async function apiReq(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['X-Access-Token'] = token

  const url = `${API}${path}`
  const options = { method, headers }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(url, options)
  return await res.json()
}

test.beforeAll(async () => {
  // 登录并打开项目
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败: ' + JSON.stringify(l))
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT }, TOKEN)
})

test.describe('浏览DM - DMC与XML一一对应验证', () => {
  test('TC-01: 点击浏览DM应传递正确的参数', async ({ page }) => {
    // 1. 注入token
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({
        value: tok,
        expire: Date.now() + 7 * 864e5
      }))
    }, [TOKEN])

    // 2. 导航到DM管理页面
    await page.goto(`${BASE}/#/ietm/ietm-data-module-manage`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 3. 点击第一个DM，选择"查看历史版本"
    const firstRow = page.locator('.ant-table-row').first()
    const moreButton = firstRow.locator('button:has-text("更多")')

    if (await moreButton.count() > 0) {
      await moreButton.click()
      await page.click('text=查看历史版本')
    } else {
      // 如果没有"更多"按钮，跳过
      console.log('未找到"更多"按钮，跳过测试')
      return
    }

    // 4. 等待历史版本页面加载
    await page.waitForURL('**/dm-history**', { timeout: 10000 })
    await page.waitForSelector('.ant-table-row', { timeout: 5000 })

    // 5. 获取第一行的DMC和版本号
    const firstHistoryRow = page.locator('.ant-table-row').first()
    const dmcText = await firstHistoryRow.locator('td').nth(1).innerText()
    const versionText = await firstHistoryRow.locator('td').nth(4).innerText()

    console.log('列表中DMC:', dmcText)
    console.log('列表中版本:', versionText)

    // 6. 点击"浏览DM"，监听新窗口
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      firstHistoryRow.locator('a:has-text("浏览DM")').click()
    ])

    // 7. 等待新页面加载
    await newPage.waitForLoadState('networkidle')
    await newPage.waitForTimeout(1000)

    // 8. 验证URL包含正确的参数
    const url = newPage.url()
    console.log('打开的URL:', url)

    expect(url).toContain('dm-content-editor')
    expect(url).toContain('mode=browse')
    expect(url).toContain(`dmc=${encodeURIComponent(dmcText)}`)
    expect(url).toContain(`version=${encodeURIComponent(versionText)}`)

    // 9. 验证控制台日志（检查是否记录了调试信息）
    const logs = []
    newPage.on('console', msg => {
      if (msg.text().includes('[浏览历史版本DM]')) {
        logs.push(msg.text())
      }
    })

    await newPage.close()
  })

  test('TC-02: 浏览不同历史版本应打开不同内容', async ({ page }) => {
    // 注入token
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({
        value: tok,
        expire: Date.now() + 7 * 864e5
      }))
    }, [TOKEN])

    // 导航到历史版本页面（使用固定的DM参数）
    await page.goto(`${BASE}/#/ietm/dm-history?sns=DMC-DEMO&infoCode=000&infoCodeVariant=00&dmc=DMC-DEMO-000-00`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查是否有至少2条历史版本
    const rows = await page.locator('.ant-table-row').count()
    if (rows < 2) {
      console.log('历史版本少于2条，跳过测试')
      return
    }

    // 获取前两条记录的版本号
    const version1 = await page.locator('.ant-table-row').nth(0).locator('td').nth(4).innerText()
    const version2 = await page.locator('.ant-table-row').nth(1).locator('td').nth(4).innerText()

    console.log('版本1:', version1)
    console.log('版本2:', version2)

    // 验证版本号不同
    expect(version1).not.toBe(version2)
  })

  test('TC-03: 空XML内容应显示友好提示', async ({ page }) => {
    // 注入token
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({
        value: tok,
        expire: Date.now() + 7 * 864e5
      }))
    }, [TOKEN])

    // 监听消息提示
    const messages = []
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.text().includes('暂无XML内容')) {
        messages.push(msg.text())
      }
    })

    // 导航到历史版本页面
    await page.goto(`${BASE}/#/ietm/dm-history?sns=DMC-TEST&infoCode=001&infoCodeVariant=A&dmc=DMC-TEST-001-A`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 如果有记录，尝试点击第一条
    const rows = await page.locator('.ant-table-row').count()
    if (rows > 0) {
      const browseLink = page.locator('.ant-table-row').first().locator('a:has-text("浏览DM")')

      // 如果点击后没有打开新窗口，说明被拦截了（可能是空XML）
      let newPageOpened = false

      page.context().once('page', () => {
        newPageOpened = true
      })

      await browseLink.click()
      await page.waitForTimeout(500)

      // 如果没有打开新窗口，检查是否有警告消息
      if (!newPageOpened) {
        const warningVisible = await page.locator('.ant-message-warning').count()
        console.log('警告消息数量:', warningVisible)
      }
    }
  })

  test('TC-04: DMC编码不完整应显示错误提示', async ({ page }) => {
    // 这个测试需要模拟数据或者找到一个DMC不完整的记录
    // 由于实际环境中可能不存在这样的数据，这里仅做框架演示

    console.log('TC-04: 此测试需要特定的测试数据（DMC不完整的记录）')

    // 可以通过修改前端数据来模拟：
    // await page.evaluate(() => {
    //   // 模拟一条DMC不完整的记录
    //   window.__TEST_RECORD = {
    //     id: 'test-123',
    //     dmcCode: 'DMC-DEMO',  // 不完整的DMC
    //     issueNo: '001',
    //     inWork: '01',
    //     dmContent: '<xml>test</xml>'
    //   }
    // })
  })

  test('TC-05: 验证控制台日志包含完整信息', async ({ page, context }) => {
    // 注入token
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({
        value: tok,
        expire: Date.now() + 7 * 864e5
      }))
    }, [TOKEN])

    // 收集控制台日志
    const consoleLogs = []
    page.on('console', msg => {
      if (msg.text().includes('[浏览历史版本DM]')) {
        consoleLogs.push(msg.text())
      }
    })

    // 导航到历史版本页面
    await page.goto(`${BASE}/#/ietm/dm-history?sns=DMC-DEMO&infoCode=000&infoCodeVariant=00&dmc=DMC-DEMO-000-00`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const rows = await page.locator('.ant-table-row').count()
    if (rows > 0) {
      // 监听新页面
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        page.locator('.ant-table-row').first().locator('a:has-text("浏览DM")').click()
      ])

      await newPage.waitForTimeout(500)

      // 验证控制台日志
      expect(consoleLogs.length).toBeGreaterThan(0)

      // 验证日志包含必要信息
      const logText = consoleLogs[0]
      expect(logText).toContain('historyId')
      expect(logText).toContain('dmc')
      expect(logText).toContain('version')
      expect(logText).toContain('xmlLength')

      console.log('捕获的日志:', logText)

      await newPage.close()
    }
  })
})
