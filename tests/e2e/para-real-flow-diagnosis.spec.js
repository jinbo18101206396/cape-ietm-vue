import { test, expect } from '@playwright/test'

test.describe('Para设计视图图符加载真实流程诊断', () => {
  test('完整复现用户场景', async ({ page, context }) => {
    console.log('\n=== 真实流程诊断：源码 → 设计视图 → 源码 ===\n')

    const DMC = 'DMC-ZB1-A-05-00-00-00A-007A-A_001-01_zh-CN'
    const ICN = 'ICN-ZB1-A-0200000-60101-30101-00017-A-001-01'

    // 1. 登录
    console.log('[步骤 1] 访问应用首页...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    console.log('✓ 首页已加载')

    // 2. 进入编辑页面（使用 DMC）
    console.log(`\n[步骤 2] 导航到编辑页面 (DMC: ${DMC})...`)
    await page.goto(`http://localhost:3000/ietm/dm-content-list`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)

    // 在列表中查找该 DMC
    const dmRow = page.locator(`text=${DMC}`).first()
    if (await dmRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dmRow.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      console.log('✓ 已进入编辑页面')
    } else {
      console.log('⚠ 列表中找不到该 DMC，尝试直接导航...')
      // 从 URL 参数推断 ID，直接打开
      await page.goto(`http://localhost:3000/ietm/dm-content-editor`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)
    }

    // 3. 确认在源码视图
    console.log(`\n[步骤 3] 验证源码视图中的 symbol 标签...`)
    const sourceContent = await page.evaluate(() => {
      try {
        const cm = document.querySelector('.CodeMirror')
        if (cm && cm.CodeMirror) {
          return cm.CodeMirror.getValue()
        }
      } catch (e) {}
      return ''
    })

    const hasSymbol = sourceContent.includes(ICN)
    console.log(`源码长度: ${sourceContent.length} 字符`)
    console.log(`包含 ICN: ${hasSymbol}`)

    if (!hasSymbol) {
      console.log(`✗ 源码中找不到 ${ICN}`)
      return
    }

    // 提取 symbol 标签
    const symbolRegex = /<symbol[^>]*infoEntityIdent="([^"]+)"[^>]*>[\s\S]*?<\/symbol>/
    const symbolMatch = sourceContent.match(symbolRegex)
    if (symbolMatch) {
      console.log(`✓ 找到完整 symbol 标签`)
      console.log(`  长度: ${symbolMatch[0].length} 字符`)
      console.log(`  属性值: ${symbolMatch[0].substring(0, 150)}...`)
    }

    // 4. 查询数据库验证 ICN 是否存在
    console.log(`\n[步骤 4] 验证数据库中 ICN 的存在性...`)

    // 获取 token
    const token = await page.evaluate(() => {
      return localStorage.getItem('Authorization') ||
             localStorage.getItem('X-Access-Token') ||
             sessionStorage.getItem('Authorization') ||
             ''
    })
    console.log(`Token: ${token ? '已获取' : '未获取'}`)

    try {
      const dbResponse = await page.request.get(
        `http://localhost:9999/jeecg-boot/icnmanage/ietmIcnManage/queryByIcnCode?icnCode=${ICN}`,
        { headers: token ? { 'X-Access-Token': token, 'Authorization': token } : {} }
      )
      const dbData = await dbResponse.json()

      console.log(`API 状态: ${dbResponse.status()}`)

      if (dbData.success && dbData.result) {
        console.log(`✓ ICN 在数据库中存在`)
        const icnRecord = dbData.result
        console.log(`  - ID: ${icnRecord.id}`)
        console.log(`  - ICN: ${icnRecord.icn}`)
        console.log(`  - attachmentId: ${icnRecord.attachmentId}`)
        console.log(`  - fileKey: ${icnRecord.fileKey || '未设置'}`)

        if (!icnRecord.attachmentId) {
          console.log(`  ⚠ 问题1: 没有关联的附件！`)
        }
      } else {
        console.log(`✗ ICN 不存在于数据库（最可能的问题）`)
        console.log(`  响应: ${JSON.stringify(dbData)}`)
      }
    } catch (e) {
      console.log(`✗ 数据库查询异常: ${e.message}`)
    }

    // 5. 直接测试后端查看接口
    console.log(`\n[步骤 5] 测试后端 /view 接口...`)
    const viewUrl = `http://localhost:9999/jeecg-boot/icnmanage/ietmIcnManage/view/${ICN}`
    console.log(`请求: ${viewUrl}`)

    try {
      const viewResponse = await page.request.get(viewUrl)
      const viewText = await viewResponse.text()

      console.log(`状态码: ${viewResponse.status()}`)
      console.log(`Content-Type: ${viewResponse.headers()['content-type']}`)
      console.log(`响应大小: ${viewText.length} 字节`)

      if (viewText.includes('<svg')) {
        console.log(`✗ 返回 SVG 占位图（不是真实图片）`)

        if (viewText.includes('加载失败')) {
          console.log(`✗ SVG 中显示"加载失败"文本`)
        } else if (viewText.includes('ICN不存在')) {
          console.log(`✗ 消息: ICN不存在`)
        } else if (viewText.includes('文件缺失')) {
          console.log(`✗ 消息: 图片文件缺失`)
        } else if (viewText.includes('文件不存在')) {
          console.log(`✗ 消息: 文件不存在于文件系统`)
        }

        console.log(`\n[问题根源分析]`)
        console.log(`后端返回 SVG 占位图的可能原因:`)
        console.log(`  1. ❌ ICN 在数据库中不存在`)
        console.log(`  2. ❌ ICN 没有关联附件`)
        console.log(`  3. ❌ 附件文件在文件系统缺失: /upload/files/{file_key}`)
      } else if (viewResponse.status() === 200) {
        console.log(`✓ 返回 200，且不是 SVG，应该是真实图片`)
      }
    } catch (e) {
      console.log(`✗ 请求异常: ${e.message}`)
    }

    // 6. 切换到设计视图
    console.log(`\n[步骤 6] 切换到设计视图并观察图符显示...`)

    // 监听所有网络请求
    const imageRequests = []
    page.on('response', response => {
      if (response.url().includes('/icnmanage/ietmIcnManage/view/')) {
        imageRequests.push({
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type']
        })
      }
    })

    const designTab = page.locator('.ant-tabs-tab:has-text("设计视图")')
    if (await designTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await designTab.click()
      await page.waitForTimeout(5000)
      console.log(`✓ 已切换到设计视图`)

      if (imageRequests.length > 0) {
        console.log(`\n[图片加载请求记录]`)
        imageRequests.forEach((req, i) => {
          console.log(`  ${i + 1}. ${req.url}`)
          console.log(`     Status: ${req.status}, Type: ${req.contentType}`)
        })
      }

      // 检查 UEditor iframe 中的图片
      console.log(`\n[检查 UEditor 中的图片元素]`)
      const frames = page.frames()
      console.log(`找到 ${frames.length} 个 iframe`)

      for (let i = 0; i < frames.length; i++) {
        try {
          const images = await frames[i].$$('img')
          if (images.length > 0) {
            console.log(`  iframe ${i} 中有 ${images.length} 个 <img>:`)
            for (let j = 0; j < images.length; j++) {
              const src = await images[j].getAttribute('src')
              console.log(`    - src: ${src ? src.substring(0, 100) + '...' : 'null'}`)
            }
          }
        } catch (e) {
          // iframe 访问受限
        }
      }
    }

    // 7. 返回源码视图
    console.log(`\n[步骤 7] 返回源码视图，验证往返一致性...`)
    const sourceTab = page.locator('.ant-tabs-tab:has-text("源码视图")')
    if (await sourceTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sourceTab.click()
      await page.waitForTimeout(3000)

      const sourceContent2 = await page.evaluate(() => {
        try {
          const cm = document.querySelector('.CodeMirror')
          if (cm && cm.CodeMirror) {
            return cm.CodeMirror.getValue()
          }
        } catch (e) {}
        return ''
      })

      const stillHasSymbol = sourceContent2.includes(ICN)
      console.log(`✓ 返回源码视图`)
      console.log(`  Symbol 标签仍存在: ${stillHasSymbol}`)
    }

    console.log('\n=== 诊断完成 ===\n')
  })
})
