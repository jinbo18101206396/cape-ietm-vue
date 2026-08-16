#!/usr/bin/env node

/**
 * GJB6600 数据模块浏览器自动化验证
 * 使用 Puppeteer 模拟真实浏览器操作
 */

const puppeteer = require('puppeteer')

const BASE_URL = 'http://localhost:3000'
const DM_ID = '2083556266365288450'

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║     GJB6600 数据模块浏览器自动化验证                      ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const browser = await puppeteer.launch({
    headless: false,  // 显示浏览器窗口，方便观察
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  })

  const page = await browser.newPage()

  try {
    // 步骤1：登录
    console.log('步骤 1/5：登录系统...')
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' })
    await page.waitForSelector('input[placeholder*="用户名"]', { timeout: 10000 })
    await page.type('input[placeholder*="用户名"]', 'admin')
    await page.type('input[placeholder*="密码"]', '123456')
    await page.click('button[type="submit"]')
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
    console.log('✅ 登录成功\n')

    // 步骤2：直接访问 DM 编辑页面
    console.log('步骤 2/5：打开数据模块编辑页面...')
    const dmUrl = `${BASE_URL}/#/ietm/dm-content-editor?id=${DM_ID}`
    await page.goto(dmUrl, { waitUntil: 'networkidle2' })
    await page.waitForTimeout(3000)  // 等待编辑器加载
    console.log('✅ 页面已打开\n')

    // 步骤3：验证模板加载
    console.log('步骤 3/5：验证模板加载...')

    // 拦截网络请求，获取 load 接口的响应
    let loadResponse = null
    page.on('response', async response => {
      if (response.url().includes(`/dm-content/load/${DM_ID}`)) {
        loadResponse = await response.json()
      }
    })

    // 触发加载（如果页面还没加载）
    await page.waitForTimeout(2000)

    if (!loadResponse) {
      // 尝试刷新页面触发加载
      await page.reload({ waitUntil: 'networkidle2' })
      await page.waitForTimeout(3000)
    }

    // 检查页面中的 XML 内容
    const xmlContent = await page.evaluate(() => {
      // 尝试从各种可能的编辑器中获取内容
      const textarea = document.querySelector('textarea')
      if (textarea) return textarea.value

      const codeEditor = document.querySelector('.CodeMirror')
      if (codeEditor && codeEditor.CodeMirror) {
        return codeEditor.CodeMirror.getValue()
      }

      const xmlEditor = document.querySelector('[class*="xml-editor"]')
      if (xmlEditor) return xmlEditor.textContent

      return null
    })

    if (!xmlContent) {
      console.log('⚠️  无法从页面获取 XML 内容，尝试通过 API 验证...')
      // 通过后续截图来验证
    } else {
      const lines = xmlContent.split('\n').length
      console.log(`   - XML 行数: ${lines}`)
      console.log(`   - XML 长度: ${xmlContent.length} 字符`)

      if (lines <= 5) {
        console.log('   ❌ 模板加载失败（行数过少）')
        console.log('   前 200 字符:')
        console.log('   ' + xmlContent.substring(0, 200))
      } else {
        console.log('   ✅ 模板加载成功（>5行）')
        console.log('   包含关键元素:', xmlContent.includes('<标识和状态>') ? '✓' : '✗')
      }
    }
    console.log('')

    // 步骤4：截图保存
    console.log('步骤 4/5：保存页面截图...')
    const screenshotPath = './gjb6600-dm-editor-screenshot.png'
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`✅ 截图已保存: ${screenshotPath}\n`)

    // 步骤5：验证网络请求
    console.log('步骤 5/5：验证网络请求...')
    if (loadResponse) {
      console.log('   - API 响应成功:', loadResponse.success ? '✓' : '✗')
      if (loadResponse.result && loadResponse.result.xml) {
        const apiXmlLines = loadResponse.result.xml.split('\n').length
        console.log(`   - API 返回 XML 行数: ${apiXmlLines}`)
        console.log(`   - API 返回 XML 长度: ${loadResponse.result.xml.length} 字符`)
        console.log(`   - IETM 标准: ${loadResponse.result.ietmStandard}`)
        console.log(`   - 版本号: ${loadResponse.result.version}`)

        if (apiXmlLines > 30) {
          console.log('   ✅ API 返回完整模板')
        } else {
          console.log('   ❌ API 返回空骨架')
        }
      }
    } else {
      console.log('   ⚠️  未捕获到 load 请求响应')
    }
    console.log('')

    console.log('════════════════════════════════════════════════════════════')
    console.log('验证完成！请检查截图文件查看页面实际显示效果。')
    console.log('════════════════════════════════════════════════════════════\n')

    // 保持浏览器打开 30 秒供观察
    console.log('浏览器将保持打开 30 秒供观察...')
    await page.waitForTimeout(30000)

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message)
    console.error('堆栈:', error.stack)

    // 出错时也保存截图
    try {
      await page.screenshot({ path: './error-screenshot.png' })
      console.log('错误截图已保存: error-screenshot.png')
    } catch (e) {
      // ignore
    }
  } finally {
    await browser.close()
  }
}

// 检查依赖
try {
  require.resolve('puppeteer')
} catch (e) {
  console.error('❌ Puppeteer 未安装')
  console.error('请运行: cd ' + __dirname + ' && npm install')
  process.exit(1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
