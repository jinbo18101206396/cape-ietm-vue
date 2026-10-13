import { test } from '@playwright/test'

test.describe('Para设计视图图符诊断', () => {
  test('完整诊断链路', async ({ page }) => {
    console.log('\n=== Para 设计视图图符加载诊断 ===\n')

    // 1. 登录
    console.log('[步骤 1] 登录系统...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })

    const loginBtn = page.locator('button:has-text("登录")')
    const isLoginPage = await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (isLoginPage) {
      console.log('  进行登录...')
      await page.locator('input[placeholder*="用户名"]').fill('admin')
      await page.locator('input[placeholder*="密码"]').fill('admin')
      await loginBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
    }
    console.log('✓ 已登录')

    // 2. 获取 token 并查询 DM 列表
    console.log('\n[步骤 2] 获取已认证的 DM 列表...')
    const cookies = await page.context().cookies()
    const tokenCookie = cookies.find(c => c.name === 'Authorization') || cookies.find(c => c.name.toLowerCase().includes('token'))

    let dmId = null
    try {
      // 从本地存储获取 token
      const token = await page.evaluate(() => {
        return localStorage.getItem('Authorization') ||
               localStorage.getItem('X-Access-Token') ||
               localStorage.getItem('token') ||
               ''
      })

      console.log(`  Token: ${token ? token.substring(0, 50) + '...' : '未找到'}`)

      const listResponse = await page.request.get(
        'http://localhost:9999/jeecg-boot/ietm/datamodule/list?pageNo=1&pageSize=10',
        {
          headers: token ? { 'X-Access-Token': token } : {}
        }
      )

      console.log(`  API 状态: ${listResponse.status()}`)
      const listData = await listResponse.json()

      if (listData.result?.records?.length > 0) {
        dmId = listData.result.records[0].id
        console.log(`✓ 获取到 DM ID: ${dmId}`)
      }
    } catch (e) {
      console.log(`✗ 查询失败: ${e.message}`)
    }

    if (!dmId) {
      // 从 UI 导航获取
      console.log('\n[步骤 2-备用] 从 UI 导航到 DM 列表...')
      try {
        await page.goto('http://localhost:3000/ietm/dm-content-list', { waitUntil: 'networkidle' })
        await page.waitForTimeout(3000)

        // 点击第一行
        const firstRow = page.locator('tbody tr:first-child')
        if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          const idCell = firstRow.locator('td:first-child')
          dmId = await idCell.textContent()
          console.log(`✓ 从 UI 获取到 DM ID: ${dmId}`)
        }
      } catch (e) {
        console.log(`✗ UI 导航失败: ${e.message}`)
      }
    }

    if (!dmId) {
      console.log('✗ 无法获取 DM ID，诊断中止')
      return
    }

    // 3. 打开 DM 编辑页面
    console.log(`\n[步骤 3] 打开 DM 编辑页面 (ID: ${dmId})...`)
    await page.goto(`http://localhost:3000/ietm/dm-content-editor?id=${dmId}`, {
      waitUntil: 'networkidle'
    })
    await page.waitForTimeout(4000)
    console.log('✓ 页面加载完成')

    // 4. 查找 symbol
    console.log('\n[步骤 4] 查找源码中的 symbol...')
    const sourceContent = await page.evaluate(() => {
      try {
        const cm = document.querySelector('.CodeMirror')
        if (cm && cm.CodeMirror) {
          return cm.CodeMirror.getValue()
        }
      } catch (e) {}
      return ''
    })

    const symbolMatch = sourceContent.match(/<symbol[^>]*infoEntityIdent="([^"]+)"/)
    if (!symbolMatch) {
      console.log('✗ 源码中没有 symbol 标签')
      console.log('  建议: 手动在源码中插入一个 symbol 标签或使用"插入图符"按钮')
      return
    }

    const icn = symbolMatch[1]
    console.log(`✓ 找到 ICN: ${icn}`)

    // 5. 测试后端 API
    console.log(`\n[步骤 5] 测试后端 API...`)
    const apiUrl = `http://localhost:9999/jeecg-boot/icnmanage/ietmIcnManage/view/${icn}`
    console.log(`  请求: GET ${apiUrl}`)

    try {
      const response = await page.request.get(apiUrl)
      const text = await response.text()

      console.log(`  响应状态码: ${response.status()}`)
      console.log(`  Content-Type: ${response.headers()['content-type']}`)
      console.log(`  响应大小: ${text.length} 字节`)

      if (response.status() !== 200) {
        console.log(`✗ 返回非 200 状态码`)
      } else if (text.includes('<svg')) {
        console.log(`✗ 返回 SVG 占位图（不是真实图片）`)
        if (text.includes('加载失败')) {
          console.log(`✗ SVG 中包含"加载失败"文本`)
          console.log('\n问题根源可能是:')
          console.log('  1. ICN 在数据库中不存在')
          console.log('  2. ICN 没有关联的附件文件')
          console.log('  3. 附件文件在文件系统中缺失')
        }
      } else {
        console.log(`✓ 返回 200 且不是 SVG（图片应该能正常显示）`)
      }
    } catch (e) {
      console.log(`✗ API 测试异常: ${e.message}`)
    }

    // 6. 数据库验证
    console.log(`\n[步骤 6] 验证数据库中的 ICN...`)
    try {
      const token = await page.evaluate(() => localStorage.getItem('Authorization') || localStorage.getItem('X-Access-Token') || '')
      const dbResponse = await page.request.get(
        `http://localhost:9999/jeecg-boot/icnmanage/ietmIcnManage/queryByIcnCode?icnCode=${icn}`,
        { headers: token ? { 'X-Access-Token': token } : {} }
      )
      const dbData = await dbResponse.json()

      if (dbData.success && dbData.result) {
        console.log(`✓ ICN 在数据库中存在`)
        console.log(`  - ID: ${dbData.result.id}`)
        console.log(`  - attachmentId: ${dbData.result.attachmentId}`)
        if (!dbData.result.attachmentId) {
          console.log(`  ⚠ 没有关联附件，这是问题根源！`)
        }
      } else {
        console.log(`✗ ICN 不存在于数据库，这是问题根源！`)
      }
    } catch (e) {
      console.log(`✗ 数据库查询异常: ${e.message}`)
    }

    // 7. 切换到设计视图
    console.log(`\n[步骤 7] 切换到设计视图...`)
    const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
    if (await designTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await designTab.click()
      await page.waitForTimeout(5000)
      console.log(`✓ 已切换到设计视图，观察图符是否显示`)
    }

    console.log('\n=== 诊断完成 ===\n')
  })
})
