/**
 * 多媒体显示问题诊断测试
 *
 * 目标：
 * 1. 验证多媒体图标是否显示
 * 2. 检查图标路径替换是否生效
 * 3. 验证点击事件是否正常触发
 * 4. 诊断具体的失败原因
 */

const { test, expect } = require('@playwright/test')

test.describe('多媒体显示诊断', () => {
  test.beforeEach(async ({ page }) => {
    // 登录系统
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder*="账户名"]', 'admin')
    await page.fill('input[type="password"]', 'admin')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 打开项目
    await page.click('text=打开项目')
    await page.waitForTimeout(1000)
    const projectRows = await page.locator('.ant-table-tbody tr').count()
    if (projectRows > 0) {
      await page.locator('.ant-table-tbody tr').first().click()
      await page.click('button:has-text("确定")')
      await page.waitForTimeout(2000)
    }

    // 进入数据模块管理
    await page.click('text=数据模块')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })
  })

  test('诊断1: 创建包含多媒体的测试DM', async ({ page }) => {
    console.log('📝 创建包含多媒体标签的测试DM...')

    // 点击新建按钮
    await page.click('button:has-text("新建")')
    await page.waitForSelector('.ant-modal:has-text("新建数据模块")', { timeout: 5000 })

    // 填写基本信息
    await page.fill('input[placeholder*="系统名称"]', 'TEST')
    await page.fill('input[placeholder*="系统差异代码"]', '000')
    await page.fill('input[placeholder*="标准编号代码"]', 'A')

    // 选择DM类型（描述性）
    await page.click('.ant-select:has-text("请选择DM类型")')
    await page.waitForTimeout(500)
    await page.click('.ant-select-dropdown-menu-item:has-text("描述性")')

    // 填写信息代码
    await page.fill('input[placeholder*="信息代码"]', '999')
    await page.fill('input[placeholder*="信息代码变体"]', 'A')
    await page.fill('input[placeholder*="项位置代码"]', '00')

    // 填写标题
    await page.fill('input[placeholder*="技术名称"]', '多媒体测试DM')
    await page.fill('input[placeholder*="信息名称"]', '多媒体诊断')

    // 提交创建
    await page.click('.ant-modal-footer button.ant-btn-primary')
    await page.waitForTimeout(2000)

    // 验证是否成功跳转到编辑器
    const editorVisible = await page.locator('.editor-container, .monaco-editor').isVisible().catch(() => false)
    if (editorVisible) {
      console.log('✅ 测试DM创建成功，进入编辑器')

      // 等待编辑器加载
      await page.waitForTimeout(3000)

      // 插入多媒体标签
      const multimediaXml = `
    <levelledPara>
      <title>多媒体测试</title>
      <para>以下是各种多媒体类型：</para>
    </levelledPara>
    <levelledPara>
      <title>测试视频</title>
      <multimedia>
        <multimediaObject multimediaType="video" infoEntityIdent="ICN-TEST-VIDEO-001"/>
      </multimedia>
    </levelledPara>
    <levelledPara>
      <title>测试音频</title>
      <multimedia>
        <multimediaObject multimediaType="audio" infoEntityIdent="ICN-TEST-AUDIO-001"/>
      </multimedia>
    </levelledPara>
    <levelledPara>
      <title>测试3D模型</title>
      <multimedia>
        <multimediaObject multimediaType="3D" infoEntityIdent="ICN-TEST-3D-001"/>
      </multimedia>
    </levelledPara>
    <levelledPara>
      <title>测试Flash</title>
      <multimedia>
        <multimediaObject multimediaType="other" infoEntityIdent="ICN-TEST-FLASH-001"/>
      </multimedia>
    </levelledPara>`

      // 在Monaco编辑器中插入内容
      await page.evaluate((xml) => {
        const editor = window.editor || window.monacoEditor
        if (editor) {
          const model = editor.getModel()
          const content = model.getValue()
          // 在</content>之前插入
          const newContent = content.replace('</content>', xml + '\n  </content>')
          model.setValue(newContent)
        }
      }, multimediaXml)

      await page.waitForTimeout(1000)

      // 保存DM
      await page.click('button:has-text("保存")')
      await page.waitForTimeout(2000)

      console.log('✅ 多媒体XML已插入并保存')
    } else {
      console.log('⚠️ 未能进入编辑器，可能需要手动创建')
    }
  })

  test('诊断2: 检查预览中的多媒体显示', async ({ page }) => {
    console.log('🔍 查找包含多媒体的DM...')

    // 在列表中查找测试DM（通过标题搜索）
    await page.fill('input[placeholder*="技术名称"]', '多媒体测试')
    await page.waitForTimeout(1000)

    const rows = await page.locator('.ant-table-tbody tr').count()
    if (rows === 0) {
      console.log('⚠️ 未找到多媒体测试DM，跳过此测试')
      test.skip()
      return
    }

    // 打开第一个DM
    await page.locator('.ant-table-tbody tr').first().dblclick()
    await page.waitForTimeout(2000)

    // 点击预览按钮
    const previewBtn = page.locator('button:has-text("预览")')
    if (await previewBtn.isVisible()) {
      await previewBtn.click()
      await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 5000 })

      console.log('✅ 预览弹框已打开')

      // 等待iframe加载
      await page.waitForTimeout(3000)

      // 诊断iframe内容
      const diagnosticResult = await page.evaluate(() => {
        const iframe = document.querySelector('iframe')
        if (!iframe) return { error: 'iframe未找到' }

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
        const iframeWin = iframe.contentWindow

        const result = {
          // 1. 检查多媒体图标
          audioImages: [],
          videoImages: [],
          images3d: [],
          flashImages: [],

          // 2. 检查图标src属性
          avicitPaths: [],
          dataPaths: [],

          // 3. 检查函数注入
          hasShowMultimediaInfo: typeof iframeWin.showMultimediaInfo === 'function',
          hasPlaySound: typeof iframeWin.playSound === 'function',

          // 4. 检查404错误
          imageErrors: [],

          // 5. HTML内容采样
          bodyHTML: iframeDoc.body.innerHTML.substring(0, 2000)
        }

        // 查找所有图片
        const allImages = iframeDoc.querySelectorAll('img')
        allImages.forEach(img => {
          const src = img.getAttribute('src') || ''
          const onclick = img.getAttribute('onclick') || ''

          // 分类多媒体图标
          if (src.includes('audio') || onclick.includes('playSound')) {
            result.audioImages.push({ src, onclick, complete: img.complete, naturalWidth: img.naturalWidth })
          }
          if (src.includes('video')) {
            result.videoImages.push({ src, onclick, complete: img.complete, naturalWidth: img.naturalWidth })
          }
          if (src.includes('3d')) {
            result.images3d.push({ src, onclick, complete: img.complete, naturalWidth: img.naturalWidth })
          }
          if (src.includes('flash')) {
            result.flashImages.push({ src, onclick, complete: img.complete, naturalWidth: img.naturalWidth })
          }

          // 检查路径类型
          if (src.startsWith('avicit/')) {
            result.avicitPaths.push(src)
          }
          if (src.startsWith('data:')) {
            result.dataPaths.push(src.substring(0, 50) + '...')
          }

          // 检查加载错误
          if (!img.complete || img.naturalWidth === 0) {
            result.imageErrors.push({ src, complete: img.complete, naturalWidth: img.naturalWidth })
          }
        })

        return result
      })

      console.log('📊 诊断结果：', JSON.stringify(diagnosticResult, null, 2))

      // 断言关键检查点
      expect(diagnosticResult.hasShowMultimediaInfo).toBe(true)
      expect(diagnosticResult.hasPlaySound).toBe(true)

      // 生成诊断报告
      const report = {
        总图标数: diagnosticResult.audioImages.length +
                  diagnosticResult.videoImages.length +
                  diagnosticResult.images3d.length +
                  diagnosticResult.flashImages.length,
        音频图标: diagnosticResult.audioImages.length,
        视频图标: diagnosticResult.videoImages.length,
        '3D图标': diagnosticResult.images3d.length,
        Flash图标: diagnosticResult.flashImages.length,
        '未修复的avicit路径': diagnosticResult.avicitPaths.length,
        '已修复的data路径': diagnosticResult.dataPaths.length,
        图片加载错误: diagnosticResult.imageErrors.length,
        函数注入正常: diagnosticResult.hasShowMultimediaInfo && diagnosticResult.hasPlaySound
      }

      console.log('\n📋 诊断报告：')
      console.log(JSON.stringify(report, null, 2))

      // 如果有avicit路径，说明替换失败
      if (diagnosticResult.avicitPaths.length > 0) {
        console.error('❌ 发现未替换的avicit路径：', diagnosticResult.avicitPaths)
      }

      // 如果有data路径，说明替换成功
      if (diagnosticResult.dataPaths.length > 0) {
        console.log('✅ 图标路径已成功替换为data URI')
      }

      // 测试点击事件
      if (diagnosticResult.videoImages.length > 0) {
        console.log('🖱️ 测试点击视频图标...')

        await page.evaluate(() => {
          const iframe = document.querySelector('iframe')
          const iframeDoc = iframe.contentDocument
          const videoImg = iframeDoc.querySelector('img[src*="video"]')
          if (videoImg) {
            videoImg.click()
          }
        })

        await page.waitForTimeout(1000)

        // 检查是否弹出多媒体预览框
        const multimediaModal = page.locator('.ant-modal:has-text("图形/多媒体预览")')
        const multimediaModalVisible = await multimediaModal.isVisible()

        console.log(multimediaModalVisible ? '✅ 多媒体预览弹框已弹出' : '❌ 多媒体预览弹框未弹出')
        expect(multimediaModalVisible).toBe(true)
      }

      // 测试音频点击
      if (diagnosticResult.audioImages.length > 0) {
        console.log('🖱️ 测试点击音频图标...')

        // 关闭多媒体预览框
        await page.click('.ant-modal:has-text("图形/多媒体预览") .ant-modal-close')
        await page.waitForTimeout(500)

        const audioClickResult = await page.evaluate(() => {
          const iframe = document.querySelector('iframe')
          const iframeDoc = iframe.contentDocument
          const audioImg = iframeDoc.querySelector('img[src*="audio"]')
          if (audioImg) {
            const onclick = audioImg.getAttribute('onclick')
            audioImg.click()
            return { clicked: true, onclick }
          }
          return { clicked: false }
        })

        console.log('音频点击结果：', audioClickResult)

        // 音频当前使用playSound桩函数，不会有弹框
        // 这是已知问题，需要修复
        if (audioClickResult.onclick && audioClickResult.onclick.includes('playSound')) {
          console.log('⚠️ 音频使用playSound桩函数，点击无效果（已知P0问题）')
        }
      }

    } else {
      console.log('⚠️ 未找到预览按钮')
    }
  })

  test('诊断3: 检查网络请求', async ({ page }) => {
    console.log('🌐 监控网络请求...')

    const requests404 = []
    const requestsICN = []

    page.on('response', response => {
      const url = response.url()
      const status = response.status()

      // 记录404错误
      if (status === 404) {
        requests404.push({ url, status })
      }

      // 记录ICN请求
      if (url.includes('/ietm/icn/view/')) {
        requestsICN.push({ url, status })
      }
    })

    // 在列表中查找任意DM
    const rows = await page.locator('.ant-table-tbody tr').count()
    if (rows > 0) {
      // 打开第一个DM
      await page.locator('.ant-table-tbody tr').first().dblclick()
      await page.waitForTimeout(2000)

      // 点击预览
      const previewBtn = page.locator('button:has-text("预览")')
      if (await previewBtn.isVisible()) {
        await previewBtn.click()
        await page.waitForTimeout(5000)

        console.log('\n📊 网络请求统计：')
        console.log('404错误数量：', requests404.length)
        console.log('ICN请求数量：', requestsICN.length)

        if (requests404.length > 0) {
          console.log('\n❌ 404错误列表：')
          requests404.forEach(req => console.log(`  - ${req.url}`))
        }

        if (requestsICN.length > 0) {
          console.log('\n📦 ICN请求列表：')
          requestsICN.forEach(req => console.log(`  - ${req.url} (${req.status})`))
        }
      }
    }
  })
})
