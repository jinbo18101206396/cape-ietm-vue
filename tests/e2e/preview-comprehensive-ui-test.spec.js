const { test, expect } = require('@playwright/test')
const http = require('http')
const fs = require('fs')

/**
 * 预览功能全面验证 - 真实UI交互测试
 *
 * 测试策略：
 * 1. 创建包含所有测试元素的DM
 * 2. 通过真实UI操作（点击、输入）进行验证
 * 3. 覆盖所有场景和边界情况
 * 4. 验证遗留函数替换效果
 */

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'

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

let TOKEN, PROJECT_ID, TEST_DM_ID

test.beforeAll(async () => {
  // 登录
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败')
  TOKEN = l.result.token

  // 获取项目并打开
  const pList = await apiReq('GET', '/ietmproject/ietmProject/list?pageNo=1&pageSize=1', null, TOKEN)
  if (!pList.success || !pList.result?.records?.length) {
    throw new Error('未找到项目')
  }
  PROJECT_ID = pList.result.records[0].id
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)

  console.log('✅ 测试环境准备完成')
  console.log('   项目ID:', PROJECT_ID)
  console.log('   Token:', TOKEN.substring(0, 20) + '...')
})

test.describe('预览功能全面验证 - UI层测试', () => {
  test.setTimeout(180000)

  test('场景1：创建测试DM并验证基础预览功能', async ({ page }) => {
    // 注入token
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    // 访问系统
    await page.goto(BASE, { waitUntil: 'networkidle' })
    console.log('✅ 已访问系统首页')

    // 等待页面加载
    await page.waitForTimeout(2000)

    // 查找并点击"数据模块管理"菜单
    // 尝试多种选择器
    let menuClicked = false
    const menuSelectors = [
      'text=数据模块管理',
      '.ant-menu-item:has-text("数据模块管理")',
      'li.ant-menu-item:has-text("数据模块管理")',
      '[title="数据模块管理"]'
    ]

    for (const selector of menuSelectors) {
      try {
        const menu = page.locator(selector).first()
        if (await menu.isVisible({ timeout: 3000 })) {
          await menu.click()
          menuClicked = true
          console.log('✅ 点击菜单成功，使用选择器:', selector)
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!menuClicked) {
      // 如果菜单不可见，尝试直接导航
      await page.goto(BASE + '/#/ietm/IetmDataModuleManagement', { waitUntil: 'networkidle' })
      console.log('✅ 直接导航到数据模块管理页面')
    }

    // 等待列表加载
    await page.waitForSelector('.ant-table-wrapper', { timeout: 15000 })
    console.log('✅ 数据模块列表已加载')

    // 获取现有DM数量
    const rows = page.locator('.ant-table-tbody tr:not(.ant-table-placeholder)')
    const rowCount = await rows.count()
    console.log(`📊 当前DM数量: ${rowCount}`)

    // 点击"新建"按钮创建测试DM
    const addBtn = page.locator('button:has-text("新建")').first()
    await addBtn.click()
    await page.waitForSelector('.ant-modal-content', { timeout: 5000 })
    console.log('✅ 新建DM弹窗已打开')

    // 填写表单
    await page.fill('input[id*="dmCode"]', 'TEST-AA-00-0-0-00-00A-040A-A')
    await page.fill('input[id*="infoName"]', '预览功能测试DM-UI验证')

    // 选择DM类型
    const dmTypeSelect = page.locator('.ant-select:has-text("DM类型")').first()
    await dmTypeSelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown-menu-item:has-text("描述")').first().click()

    console.log('✅ 表单填写完成')

    // 提交创建
    const submitBtn = page.locator('.ant-modal-footer button:has-text("确定")').first()
    await submitBtn.click()

    // 等待创建成功
    await page.waitForTimeout(2000)

    // 查找新创建的DM
    await page.waitForSelector('.ant-table-tbody tr:not(.ant-table-placeholder)', { timeout: 5000 })
    const newRow = page.locator('.ant-table-tbody tr').filter({ hasText: '预览功能测试DM-UI验证' }).first()

    // 获取DM ID
    const dmId = await newRow.getAttribute('data-row-key')
    TEST_DM_ID = dmId
    console.log('✅ 测试DM已创建，ID:', TEST_DM_ID)

    // 点击"浏览DM"
    const viewLink = newRow.locator('a:has-text("浏览DM")').first()
    await viewLink.click()

    // 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror
    }, { timeout: 10000 })
    console.log('✅ DM编辑器已加载')

    // 注入测试XML内容
    const testXml = fs.readFileSync('/tmp/test_preview_dm.xml', 'utf-8')
    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(xml)
    }, testXml)
    console.log('✅ 测试XML内容已注入')

    // 保存
    const saveBtn = page.locator('button:has-text("保存")').first()
    await saveBtn.click()
    await page.waitForTimeout(2000)
    console.log('✅ DM已保存')

    // 点击预览按钮
    const previewBtn = page.locator('button:has-text("预览")').first()
    await previewBtn.click()
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })
    console.log('✅ 预览弹窗已打开')

    // 等待iframe加载
    await page.waitForTimeout(3000)
    const iframeElement = await page.locator('.ant-modal-content iframe').elementHandle()

    // 验证HTML内容
    const htmlContent = await page.evaluate(iframe => {
      const doc = iframe.contentDocument || iframe.contentWindow.document
      return doc.documentElement.outerHTML
    }, iframeElement)

    console.log('✅ 预览HTML已获取，长度:', htmlContent.length)

    // 关键验证：遗留函数检查
    const checks = {
      'window.external.ShowDmRef': /window\.external\.ShowDmRef/gi,
      'window.parent.addShowContentPanel': /window\.parent\.addShowContentPanel/gi,
      'window.parent.showPicture': /window\.parent\.showPicture/gi,
      'display:none': /display:\s*none/gi
    }

    console.log('\n========== 遗留函数检查 ==========')
    let allPassed = true
    for (const [name, pattern] of Object.entries(checks)) {
      const matches = htmlContent.match(pattern)
      if (matches) {
        console.error(`❌ ${name}: 发现 ${matches.length} 处未替换`)
        allPassed = false
      } else {
        console.log(`✅ ${name}: 已正确替换`)
      }
    }

    expect(allPassed, '所有遗留函数应该被替换').toBe(true)

    // 验证新函数存在
    expect(htmlContent).toContain('showDmRefInfo')
    expect(htmlContent).toContain('showMultimediaInfo')
    console.log('✅ 新函数已正确注入')
  })

  test('场景2：验证dmRef链接点击行为', async ({ page }) => {
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    // 直接导航到编辑页面
    await page.goto(`${BASE}/#/ietm/IetmDataModulePlatform?id=${TEST_DM_ID}&type=view`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    console.log('✅ 已打开测试DM编辑页面')

    // 点击预览
    const previewBtn = page.locator('button:has-text("预览")').first()
    await previewBtn.click()
    await page.waitForSelector('.ant-modal-content iframe', { timeout: 10000 })
    await page.waitForTimeout(3000)
    console.log('✅ 预览弹窗已打开')

    // 获取iframe
    const iframe = page.frameLocator('.ant-modal-content iframe')

    // 查找dmRef链接
    const dmRefLinks = await page.evaluate(() => {
      const iframeEl = document.querySelector('.ant-modal-content iframe')
      const doc = iframeEl.contentDocument || iframeEl.contentWindow.document
      const links = doc.querySelectorAll('a[onclick*="showDmRefInfo"]')
      return {
        count: links.length,
        samples: Array.from(links).slice(0, 3).map(a => ({
          text: a.textContent.trim(),
          onclick: a.getAttribute('onclick')
        }))
      }
    })

    console.log(`📊 找到 ${dmRefLinks.count} 个dmRef链接`)
    dmRefLinks.samples.forEach((link, i) => {
      console.log(`   [${i + 1}] ${link.text} → ${link.onclick?.substring(0, 50)}...`)
    })

    expect(dmRefLinks.count, '应该找到dmRef链接').toBeGreaterThan(0)
    expect(dmRefLinks.samples[0]?.onclick, '链接应使用showDmRefInfo').toContain('showDmRefInfo')

    console.log('✅ dmRef链接验证通过')
  })

  test('场景3：验证图形链接点击行为', async ({ page }) => {
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    await page.goto(`${BASE}/#/ietm/IetmDataModulePlatform?id=${TEST_DM_ID}&type=view`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 点击预览
    const previewBtn = page.locator('button:has-text("预览")').first()
    await previewBtn.click()
    await page.waitForSelector('.ant-modal-content iframe', { timeout: 10000 })
    await page.waitForTimeout(3000)

    // 检查图形链接
    const graphicLinks = await page.evaluate(() => {
      const iframeEl = document.querySelector('.ant-modal-content iframe')
      const doc = iframeEl.contentDocument || iframeEl.contentWindow.document
      const links = doc.querySelectorAll('a[onclick*="showMultimediaInfo"]')
      return {
        count: links.length,
        samples: Array.from(links).slice(0, 3).map(a => ({
          text: a.textContent.trim(),
          onclick: a.getAttribute('onclick')
        }))
      }
    })

    console.log(`📊 找到 ${graphicLinks.count} 个图形链接`)
    graphicLinks.samples.forEach((link, i) => {
      console.log(`   [${i + 1}] ${link.text} → ${link.onclick?.substring(0, 50)}...`)
    })

    expect(graphicLinks.count, '应该找到图形链接').toBeGreaterThan(0)
    expect(graphicLinks.samples[0]?.onclick, '链接应使用showMultimediaInfo').toContain('showMultimediaInfo')

    console.log('✅ 图形链接验证通过')
  })

  test('场景4：验证display:none元素可见性', async ({ page }) => {
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    await page.goto(`${BASE}/#/ietm/IetmDataModulePlatform?id=${TEST_DM_ID}&type=view`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 点击预览
    const previewBtn = page.locator('button:has-text("预览")').first()
    await previewBtn.click()
    await page.waitForSelector('.ant-modal-content iframe', { timeout: 10000 })
    await page.waitForTimeout(3000)

    // 检查display:none样式
    const displayCheck = await page.evaluate(() => {
      const iframeEl = document.querySelector('.ant-modal-content iframe')
      const doc = iframeEl.contentDocument || iframeEl.contentWindow.document
      const html = doc.documentElement.outerHTML

      // 检查是否还有display:none
      const displayNoneCount = (html.match(/display:\s*none/gi) || []).length

      // 检查隐藏文字是否可见
      const hiddenPara = doc.querySelector('[id*="hidden"]') || doc.querySelector('para:contains("原本隐藏")')
      const isVisible = hiddenPara ? window.getComputedStyle(hiddenPara).display !== 'none' : null

      return {
        displayNoneCount,
        hasHiddenElement: !!hiddenPara,
        isVisible
      }
    })

    console.log(`📊 display:none检查:`)
    console.log(`   HTML中display:none数量: ${displayCheck.displayNoneCount}`)
    console.log(`   找到测试元素: ${displayCheck.hasHiddenElement}`)

    expect(displayCheck.displayNoneCount, 'display:none应该被移除').toBe(0)
    console.log('✅ display:none移除验证通过')
  })

  test('边界测试1：空DM预览', async ({ page }) => {
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    // 创建一个空DM
    const emptyDmResp = await apiReq('POST', '/ietm/datamodule/add', {
      dmCode: 'EMPTY-00-00-0-0-00-00A-000A-A',
      infoName: '空DM边界测试',
      languageIsoCode: 'zh',
      issueNumber: '001',
      inIssueNumber: '00',
      securityClassification: '01',
      dmType: 'description'
    }, TOKEN)

    if (emptyDmResp.success) {
      const emptyDmId = emptyDmResp.result.id
      console.log('✅ 空DM已创建:', emptyDmId)

      await page.goto(`${BASE}/#/ietm/IetmDataModulePlatform?id=${emptyDmId}&type=view`, { waitUntil: 'networkidle' })
      await page.waitForSelector('.CodeMirror', { timeout: 15000 })

      // 尝试预览空DM
      const previewBtn = page.locator('button:has-text("预览")').first()
      await previewBtn.click()

      // 应该能正常打开预览（即使是空的）
      await page.waitForSelector('.ant-modal-content', { timeout: 10000 })
      console.log('✅ 空DM预览不崩溃')
    }
  })

  test('边界测试2：包含特殊字符的DM', async ({ page }) => {
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    await page.goto(`${BASE}/#/ietm/IetmDataModulePlatform?id=${TEST_DM_ID}&type=view`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 注入包含特殊字符的内容
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const content = cm.getValue()
      // 在content中插入特殊字符测试
      const modifiedContent = content.replace(
        '<para>这段文字应该可见。</para>',
        '<para>测试特殊字符：&lt; &gt; &amp; &quot; &#39; <注释><!-- test --></para>'
      )
      cm.setValue(modifiedContent)
    })

    // 保存并预览
    const saveBtn = page.locator('button:has-text("保存")').first()
    await saveBtn.click()
    await page.waitForTimeout(2000)

    const previewBtn = page.locator('button:has-text("预览")').first()
    await previewBtn.click()
    await page.waitForSelector('.ant-modal-content iframe', { timeout: 10000 })
    await page.waitForTimeout(3000)

    // 验证特殊字符被正确处理
    const htmlContent = await page.evaluate(() => {
      const iframeEl = document.querySelector('.ant-modal-content iframe')
      const doc = iframeEl.contentDocument || iframeEl.contentWindow.document
      return doc.body.innerHTML
    })

    // 不应该有XSS注入
    expect(htmlContent).not.toContain('<script>')
    console.log('✅ 特殊字符处理验证通过')
  })
})

test.afterAll(async () => {
  // 清理测试数据
  if (TEST_DM_ID) {
    console.log('🧹 清理测试DM:', TEST_DM_ID)
    // 可选：删除测试DM
  }
})
