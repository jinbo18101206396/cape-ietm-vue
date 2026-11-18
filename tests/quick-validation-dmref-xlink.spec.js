/**
 * DM引用 xlink 属性修复 - 快速验证测试
 *
 * 核心验证：
 * 1. 读取 XML 内容
 * 2. 检查 dmRef 元素是否包含 xlink 属性
 * 3. 执行 Schema 校验
 *
 * @date 2026-11-17
 */

const { test, expect } = require('@playwright/test')

test.describe('DM引用 xlink 属性快速验证', () => {

  test('核心验证: XML 中不应包含 dmRef xlink 属性', async ({ page }) => {
    console.log('\n🚀 开始快速验证测试')
    console.log('=' .repeat(60))

    // 1. 登录
    console.log('步骤 1: 登录系统...')
    await page.goto('http://localhost:3000/')
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(3000)
    console.log('✓ 登录成功')

    // 2. 打开 DM 编辑器
    console.log('\n步骤 2: 打开 DM 编辑器...')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2121448129847848962?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-212A-A_001-01_zh-CN')
    await page.waitForTimeout(5000)
    console.log('✓ 页面加载完成')

    // 3. 等待 CodeMirror 编辑器
    console.log('\n步骤 3: 等待编辑器加载...')
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })
    console.log('✓ 编辑器加载完成')

    // 4. 读取 XML 内容
    console.log('\n步骤 4: 读取 XML 内容...')
    const xmlContent = await page.evaluate(() => {
      const cmInstance = document.querySelector('.CodeMirror')?.CodeMirror
      return cmInstance ? cmInstance.getValue() : ''
    })

    if (!xmlContent || xmlContent.length === 0) {
      console.log('❌ 无法读取 XML 内容')
      throw new Error('Failed to read XML content')
    }

    console.log(`✓ XML 长度: ${xmlContent.length} 字符`)

    // 5. 分析 XML 内容
    console.log('\n步骤 5: 分析 XML 内容...')

    // 检查是否为 PreliminaryRqmts
    const isPreliminaryRqmts = xmlContent.includes('<preliminaryRqmts>')
    const hasProductionMaintData = xmlContent.includes('<productionMaintData>')
    console.log(`  - 是否为 PreliminaryRqmts: ${isPreliminaryRqmts}`)
    console.log(`  - 是否包含 productionMaintData: ${hasProductionMaintData}`)

    // 统计元素数量
    const dmRefCount = (xmlContent.match(/<dmRef[^>]*>/g) || []).length
    const pmRefCount = (xmlContent.match(/<pmRef[^>]*>/g) || []).length
    const zoneRefCount = (xmlContent.match(/<zoneRef[^>]*>/g) || []).length
    const accessPointRefCount = (xmlContent.match(/<accessPointRef[^>]*>/g) || []).length

    console.log(`  - dmRef 数量: ${dmRefCount}`)
    console.log(`  - pmRef 数量: ${pmRefCount}`)
    console.log(`  - zoneRef 数量: ${zoneRefCount}`)
    console.log(`  - accessPointRef 数量: ${accessPointRefCount}`)

    // 6. 核心验证：检查 xlink 属性
    console.log('\n步骤 6: 核心验证 - 检查 xlink 属性...')
    console.log('-'.repeat(60))

    const dmRefs = xmlContent.match(/<dmRef[^>]*>/g) || []
    const pmRefs = xmlContent.match(/<pmRef[^>]*>/g) || []

    let foundXlinkError = false
    const xlinkErrors = []

    // 检查所有 dmRef
    dmRefs.forEach((dmRef, index) => {
      if (dmRef.includes('xlink:type') || dmRef.includes('xlink:show') || dmRef.includes('xlink:actuate')) {
        foundXlinkError = true
        xlinkErrors.push({
          type: 'dmRef',
          index: index + 1,
          content: dmRef
        })
        console.log(`❌ dmRef #${index + 1} 包含 xlink 属性:`)
        console.log(`   ${dmRef.substring(0, 100)}${dmRef.length > 100 ? '...' : ''}`)
      }
    })

    // 检查所有 pmRef
    pmRefs.forEach((pmRef, index) => {
      if (pmRef.includes('xlink:type') || pmRef.includes('xlink:show') || pmRef.includes('xlink:actuate')) {
        foundXlinkError = true
        xlinkErrors.push({
          type: 'pmRef',
          index: index + 1,
          content: pmRef
        })
        console.log(`❌ pmRef #${index + 1} 包含 xlink 属性:`)
        console.log(`   ${pmRef.substring(0, 100)}${pmRef.length > 100 ? '...' : ''}`)
      }
    })

    if (!foundXlinkError) {
      console.log(`✅ 所有引用元素（${dmRefCount + pmRefCount} 个）都不包含 xlink 属性`)
    } else {
      console.log(`❌ 发现 ${xlinkErrors.length} 个包含 xlink 属性的引用元素`)
    }

    console.log('-'.repeat(60))

    // 7. Schema 校验（如果有校验按钮）
    console.log('\n步骤 7: 执行 Schema 校验...')

    const validateButton = page.locator('button:has-text("校验")')
    const hasValidateButton = await validateButton.isVisible({ timeout: 3000 }).catch(() => false)

    if (hasValidateButton) {
      console.log('✓ 找到校验按钮，执行校验...')
      await validateButton.click()
      await page.waitForTimeout(2000)

      // 等待校验对话框
      const hasModal = await page.locator('.ant-modal:has-text("校验情况")').isVisible({ timeout: 5000 }).catch(() => false)

      if (hasModal) {
        console.log('✓ 校验对话框已打开')
        await page.waitForTimeout(1000)

        // 读取校验错误
        const validationErrors = await page.locator('.ant-table-tbody tr').allTextContents().catch(() => [])
        console.log(`  - 校验错误数量: ${validationErrors.length}`)

        // 查找 xlink 相关错误
        const xlinkValidationErrors = validationErrors.filter(error =>
          error.includes('xlink_type') ||
          error.includes('xlink_show') ||
          error.includes('xlink_actuate') ||
          (error.includes('xlink') && error.includes('dmRef'))
        )

        if (xlinkValidationErrors.length > 0) {
          console.log(`❌ 发现 ${xlinkValidationErrors.length} 个 xlink 相关校验错误:`)
          xlinkValidationErrors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.substring(0, 150)}${error.length > 150 ? '...' : ''}`)
          })
        } else {
          console.log('✅ Schema 校验无 xlink 相关错误')
        }

        // 关闭对话框
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)

        // 断言
        expect(xlinkValidationErrors.length).toBe(0)
      } else {
        console.log('⚠️  校验对话框未出现，跳过 Schema 校验检查')
      }
    } else {
      console.log('⚠️  未找到校验按钮，跳过 Schema 校验')
    }

    // 8. 最终断言
    console.log('\n步骤 8: 最终验证...')
    console.log('='.repeat(60))

    expect(foundXlinkError).toBe(false)

    console.log('✅ 测试通过：所有 dmRef/pmRef 元素都不包含 xlink 属性')
    console.log('='.repeat(60))
    console.log()

    // 截图保存
    await page.screenshot({
      path: 'test-results/dmref-xlink-validation-success.png',
      fullPage: false
    })
    console.log('📸 已保存截图: test-results/dmref-xlink-validation-success.png')
  })
})
