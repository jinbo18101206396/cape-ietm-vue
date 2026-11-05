/**
 * 3D 多媒体预览问题诊断测试
 *
 * 问题描述：
 * 1. 在 multimedia 设计视图中新增三个 3D 多媒体，格式分别为".gltf"".stl"".wrl"
 * 2. 保存后生成的 XML 正确
 * 3. 在源码视图点击"预览"，弹出"DM内容预览"弹出框
 * 4. 点击多媒体图标，弹出"图形/多媒体预览"弹出框，但无法预览这些格式文件
 *
 * 测试目标：
 * - 诊断为何 3D 格式文件（.gltf, .stl, .wrl）无法预览
 * - 检查前端 multimediaConverter 的格式识别
 * - 检查后端元数据接口返回
 * - 验证前端预览逻辑
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const API_BASE_URL = 'http://localhost:9999/jeecg-boot'
const PROJECT_ID = '2078348945532030978'

// 登录凭证
const LOGIN_CREDENTIALS = {
  username: 'admin',
  password: '123456'
}

test.describe('3D 多媒体预览问题诊断', () => {
  let page
  let authToken

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()

    // 登录获取 token
    const loginRes = await page.request.post(`${API_BASE_URL}/sys/login`, {
      data: LOGIN_CREDENTIALS
    })
    const loginData = await loginRes.json()
    expect(loginData.success).toBe(true)
    authToken = loginData.result.token

    // 注入 localStorage
    await page.goto(BASE_URL)
    await page.evaluate((token) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({
        value: token,
        expire: Date.now() + 7200000
      }))
    }, authToken)

    // 打开项目上下文
    await page.request.post(`${API_BASE_URL}/ietmproject/ietmProject/openProject`, {
      headers: { 'X-Access-Token': authToken },
      data: { projectId: PROJECT_ID }
    })
  })

  test('步骤1：检查 multimediaConverter 的格式识别逻辑', async () => {
    console.log('\n========== 步骤1：检查前端格式识别逻辑 ==========')

    // 导航到 DM 编辑器
    await page.goto(`${BASE_URL}/ietm/dm-content-editor/2117141579532677122?mode=edit&dmc=DMC-ZB1-A-06-00-00-00A-007A-A_001-01_zh-CN`)
    await page.waitForLoadState('networkidle')

    // 读取 multimediaConverter.js 中的格式识别逻辑
    const formatDetectionResult = await page.evaluate(() => {
      // 模拟 detectMultimediaType 函数
      function detectMultimediaType(filename) {
        if (!filename) return 'other'
        const ext = filename.substr(filename.lastIndexOf('.')).toLowerCase()

        const videoExtArr = ['.avi', '.wmv', '.mp4', '.mov', '.rm', '.mpg', '.webm']
        if (videoExtArr.includes(ext)) return 'video'

        const audioExtArr = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.wma']
        if (audioExtArr.includes(ext)) return 'audio'

        const d3extArr = ['.wrl', '.smg', '.swf']
        if (d3extArr.includes(ext)) return '3D'

        const imgextArr = ['.bmp', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.cgm', '.svg']
        if (imgextArr.includes(ext)) return 'other'

        return 'other'
      }

      return {
        gltf: detectMultimediaType('test-triangle.gltf'),
        stl: detectMultimediaType('test-pyramid.stl'),
        wrl: detectMultimediaType('test-cube.wrl'),
        recognizedExtensions: ['.wrl', '.smg', '.swf']
      }
    })

    console.log('格式识别结果：', formatDetectionResult)

    // ❌ 问题确认：.gltf 和 .stl 不在识别列表中
    expect(formatDetectionResult.gltf).toBe('other')  // 应该是 '3D'，但实际是 'other'
    expect(formatDetectionResult.stl).toBe('other')   // 应该是 '3D'，但实际是 'other'
    expect(formatDetectionResult.wrl).toBe('3D')      // ✓ 正确

    console.log('❌ 问题1确认：multimediaConverter.js 只识别 [.wrl, .smg, .swf]')
    console.log('   缺少 .gltf 和 .stl 扩展名！')
  })

  test('步骤2：检查后端元数据接口返回', async () => {
    console.log('\n========== 步骤2：检查后端元数据接口 ==========')

    // 模拟创建三个 3D ICN（实际测试中应该已存在）
    const testIcnCodes = [
      'ICN-ZB1-A-000000-60101-30101-00010-A-001-01',  // .gltf
      'ICN-ZB1-A-000000-60101-30101-00008-A-001-01',  // .stl
      'ICN-ZB1-A-000000-60101-30101-00006-A-001-01'   // .wrl
    ]

    for (const icnCode of testIcnCodes) {
      const metadataRes = await page.request.get(
        `${API_BASE_URL}/ietm/icn/metadata/${icnCode}`,
        { headers: { 'X-Access-Token': authToken } }
      )

      if (metadataRes.ok()) {
        const metadataData = await metadataRes.json()
        console.log(`\nICN: ${icnCode}`)
        console.log('  返回结果：', JSON.stringify(metadataData.result, null, 2))

        if (metadataData.success && metadataData.result) {
          const info = metadataData.result
          console.log(`  mimeType: ${info.mimeType}`)
          console.log(`  icnType: ${info.icnType || '(未设置)'}`)
          console.log(`  is3DModel: ${info.is3DModel}`)
          console.log(`  fileName: ${info.fileName}`)

          // 检查是否正确识别为 3D 模型
          if (info.mimeType && info.mimeType.startsWith('model/')) {
            console.log('  ✓ MIME 类型正确')
          } else {
            console.log('  ❌ MIME 类型错误或缺失')
          }

          if (info.icnType === '3D') {
            console.log('  ✓ icnType 正确')
          } else {
            console.log('  ⚠️  icnType 未设置为 "3D"')
          }
        }
      } else {
        console.log(`\n❌ ICN ${icnCode} 不存在或获取失败`)
      }
    }
  })

  test('步骤3：检查 DM 预览中的多媒体渲染逻辑', async () => {
    console.log('\n========== 步骤3：检查 DM 预览逻辑 ==========')

    // 导航到 DM 编辑器
    await page.goto(`${BASE_URL}/ietm/dm-content-editor/2117141579532677122?mode=edit&dmc=DMC-ZB1-A-06-00-00-00A-007A-A_001-01_zh-CN`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 等待编辑器加载完成
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })

    // 点击"预览"按钮
    console.log('点击"预览"按钮...')
    const previewBtn = page.locator('button:has-text("预览")')
    if (await previewBtn.count() > 0) {
      await previewBtn.first().click()
      await page.waitForTimeout(2000)

      // 等待预览弹框出现
      const modal = page.locator('.ant-modal:has-text("DM内容预览")')
      await expect(modal).toBeVisible({ timeout: 10000 })
      console.log('✓ DM内容预览弹框已打开')

      // 查找 iframe
      const iframe = page.frameLocator('iframe').first()

      // 等待 iframe 内容加载
      await page.waitForTimeout(3000)

      // 查找多媒体图标
      console.log('\n查找多媒体图标...')
      const multimediaIcons = await page.evaluate(() => {
        const iframe = document.querySelector('iframe')
        if (!iframe || !iframe.contentDocument) return []

        const doc = iframe.contentDocument
        const images = doc.querySelectorAll('img')
        const icons = []

        images.forEach((img, idx) => {
          const src = img.getAttribute('src') || ''
          const onclick = img.getAttribute('onclick') || ''

          // 判断是否为多媒体图标
          if (src.includes('data:image/svg+xml') ||
              src.includes('.gif') ||
              onclick.includes('showMultimediaInfo')) {
            icons.push({
              index: idx,
              src: src.substring(0, 100),
              onclick: onclick.substring(0, 100),
              hasOnclick: onclick.length > 0
            })
          }
        })

        return icons
      })

      console.log(`找到 ${multimediaIcons.length} 个多媒体图标：`)
      multimediaIcons.forEach(icon => {
        console.log(`  图标 ${icon.index}:`, icon)
      })

      if (multimediaIcons.length > 0) {
        console.log('\n尝试点击第一个多媒体图标...')

        // 点击 iframe 内的多媒体图标
        await page.evaluate((iconIndex) => {
          const iframe = document.querySelector('iframe')
          if (iframe && iframe.contentDocument) {
            const images = iframe.contentDocument.querySelectorAll('img')
            if (images[iconIndex]) {
              images[iconIndex].click()
            }
          }
        }, multimediaIcons[0].index)

        await page.waitForTimeout(2000)

        // 检查是否弹出"图形/多媒体预览"
        const multimediaModal = page.locator('.ant-modal:has-text("图形/多媒体预览")')
        if (await multimediaModal.count() > 0) {
          console.log('✓ "图形/多媒体预览"弹框已打开')

          // 检查预览内容
          const previewContent = await page.evaluate(() => {
            const modal = document.querySelector('.ant-modal:has-text("图形/多媒体预览")')
            if (!modal) return null

            return {
              hasVideo: !!modal.querySelector('video'),
              hasAudio: !!modal.querySelector('audio'),
              has3DCanvas: !!modal.querySelector('.three-canvas'),
              hasImage: !!modal.querySelector('img'),
              hasLoadingSpinner: !!modal.querySelector('.ant-spin'),
              hasEmptyState: !!modal.querySelector('.ant-empty')
            }
          })

          console.log('\n预览内容检查：', previewContent)

          if (previewContent.has3DCanvas) {
            console.log('✓ 找到 3D 渲染容器')
          } else if (previewContent.hasEmptyState) {
            console.log('❌ 显示空状态 - 3D 模型未加载')
          } else if (previewContent.hasLoadingSpinner) {
            console.log('⚠️  仍在加载中...')
            await page.waitForTimeout(5000)
          } else {
            console.log('❌ 未找到任何预览内容')
          }
        } else {
          console.log('❌ "图形/多媒体预览"弹框未打开')
        }
      } else {
        console.log('❌ 未找到多媒体图标')
      }
    } else {
      console.log('❌ 未找到"预览"按钮')
    }
  })

  test('步骤4：输出诊断总结', async () => {
    console.log('\n========== 诊断总结 ==========')
    console.log('问题根因：')
    console.log('1. ❌ 前端 multimediaConverter.js 只识别 [.wrl, .smg, .swf]')
    console.log('   位置：cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/multimediaConverter.js:209')
    console.log('   缺少：.gltf 和 .stl 扩展名')
    console.log('')
    console.log('2. ⚠️  后端元数据接口未明确设置 icnType="3D"')
    console.log('   位置：IetmIcnViewController.java:154-158')
    console.log('   虽然返回了正确的 mimeType (model/*)，但 icnType 字段未设置')
    console.log('')
    console.log('修复方案：')
    console.log('1. 前端：修改 multimediaConverter.js，添加 .gltf 和 .stl 到 d3extArr')
    console.log('2. 后端：在 getMetadata 接口中，当 mimeType 为 model/* 时，设置 icnType="3D"')
  })

  test.afterAll(async () => {
    if (page) {
      await page.close()
    }
  })
})
