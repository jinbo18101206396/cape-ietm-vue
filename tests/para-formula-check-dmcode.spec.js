import { test } from '@playwright/test'

test('读取当前DM的完整dmCode', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    console.log('\n🔵 登录...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    console.log('🔵 打开DM编辑页面...')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN',
      { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // 读取dmodule标签的dmCode属性
    const dmInfo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const content = cm.getValue()

      // 查找dmodule标签
      const dmoduleMatch = content.match(/<dmodule[^>]*>/)
      if (!dmoduleMatch) return { error: '未找到dmodule标签' }

      const dmoduleTag = dmoduleMatch[0]

      // 提取各种Code属性
      const modelIdentCode = (dmoduleTag.match(/modelIdentCode="([^"]+)"/) || [])[1]
      const systemDiffCode = (dmoduleTag.match(/systemDiffCode="([^"]+)"/) || [])[1]
      const systemCode = (dmoduleTag.match(/systemCode="([^"]+)"/) || [])[1]
      const subSystemCode = (dmoduleTag.match(/subSystemCode="([^"]+)"/) || [])[1]
      const subSubSystemCode = (dmoduleTag.match(/subSubSystemCode="([^"]+)"/) || [])[1]
      const assyCode = (dmoduleTag.match(/assyCode="([^"]+)"/) || [])[1]
      const disassyCode = (dmoduleTag.match(/disassyCode="([^"]+)"/) || [])[1]
      const disassyCodeVariant = (dmoduleTag.match(/disassyCodeVariant="([^"]+)"/) || [])[1]
      const infoCode = (dmoduleTag.match(/infoCode="([^"]+)"/) || [])[1]
      const infoCodeVariant = (dmoduleTag.match(/infoCodeVariant="([^"]+)"/) || [])[1]
      const itemLocationCode = (dmoduleTag.match(/itemLocationCode="([^"]+)"/) || [])[1]

      // 构建完整的DMC
      const dmcParts = [
        'DMC',
        modelIdentCode,
        systemDiffCode,
        systemCode,
        subSystemCode,
        subSubSystemCode,
        assyCode,
        disassyCode,
        disassyCodeVariant,
        infoCode,
        infoCodeVariant,
        itemLocationCode
      ].filter(Boolean)

      return {
        dmoduleTag: dmoduleTag.substring(0, 500),
        modelIdentCode,
        systemDiffCode,
        systemCode,
        subSystemCode,
        subSubSystemCode,
        assyCode,
        disassyCode,
        disassyCodeVariant,
        infoCode,
        infoCodeVariant,
        itemLocationCode,
        constructedDMC: dmcParts.join('-'),
        dmcParts
      }
    })

    console.log('\n' + '='.repeat(70))
    console.log('📋 DM编码信息:')
    console.log('='.repeat(70))
    console.log('URL中的dmc参数: DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN')
    console.log('\nXML dmodule标签中的属性:')
    console.log('  modelIdentCode =', dmInfo.modelIdentCode)
    console.log('  systemDiffCode =', dmInfo.systemDiffCode)
    console.log('  systemCode =', dmInfo.systemCode)
    console.log('  subSystemCode =', dmInfo.subSystemCode)
    console.log('  subSubSystemCode =', dmInfo.subSubSystemCode)
    console.log('  assyCode =', dmInfo.assyCode)
    console.log('  disassyCode =', dmInfo.disassyCode)
    console.log('  disassyCodeVariant =', dmInfo.disassyCodeVariant)
    console.log('  infoCode =', dmInfo.infoCode)
    console.log('  infoCodeVariant =', dmInfo.infoCodeVariant)
    console.log('  itemLocationCode =', dmInfo.itemLocationCode)

    console.log('\n构建的完整DMC:', dmInfo.constructedDMC)
    console.log('\nDMC分段 (共' + dmInfo.dmcParts.length + '段):')
    dmInfo.dmcParts.forEach((part, idx) => {
      let label = ''
      if (idx === 0) label = 'DMC前缀'
      else if (idx === 1) label = 'modelIdentCode (ZB1)'
      else if (idx === 2) label = 'systemDiffCode (A)'
      else if (idx === 3) label = 'systemCode'
      else if (idx === 4) label = 'subSystemCode'
      else if (idx === 5) label = 'subSubSystemCode'
      else if (idx === 6) label = 'assyCode (责任单位1)'
      else if (idx === 7) label = 'disassyCode (责任单位2)'
      else if (idx === 8) label = 'disassyCodeVariant'
      else if (idx === 9) label = 'infoCode'
      else if (idx === 10) label = 'infoCodeVariant'
      else if (idx === 11) label = 'itemLocationCode'

      console.log(`  第${idx + 1}段: "${part}" (${label})`)
    })

    console.log('\n' + '='.repeat(70))
    console.log('🔍 问题分析:')
    console.log('='.repeat(70))
    console.log('期望的 assyCode (责任单位1): 60101')
    console.log('实际的 assyCode (责任单位1):', dmInfo.assyCode)
    console.log('')
    console.log('期望的 disassyCode (责任单位2): 30101')
    console.log('实际的 disassyCode (责任单位2):', dmInfo.disassyCode)

    if (dmInfo.assyCode !== '60101' || dmInfo.disassyCode !== '30101') {
      console.log('\n❌ 问题确认: 当前DM的编码中缺少正确的责任单位编码！')
      console.log('   assyCode应为60101，实际为', dmInfo.assyCode)
      console.log('   disassyCode应为30101，实际为', dmInfo.disassyCode)
    }
  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
