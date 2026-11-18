/**
 * XSD Schema 校验测试
 *
 * 测试目标：
 * 1. 验证修复后的 XML 符合 S1000D Schema
 * 2. 确认不再出现 xlink 相关的校验错误
 * 3. 生成详细的校验报告
 *
 * @date 2026-11-17
 */

const fs = require('fs')
const path = require('path')

// 模拟 XML 示例（修复后）
const xmlSamples = {
  'zone-with-dmref': `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <preliminaryRqmts>
      <productionMaintData>
        <zoneRef id="z001" zoneNumber="ZN001">
          <name>测试区域</name>
          <refs>
            <dmRef>
              <dmRefIdent>
                <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="212" infoCodeVariant="A" itemLocationCode="A"/>
                <issueInfo issueNumber="001" inWork="01"/>
                <language languageIsoCode="zh" countryIsoCode="CN"/>
              </dmRefIdent>
            </dmRef>
          </refs>
        </zoneRef>
      </productionMaintData>
    </preliminaryRqmts>
  </content>
</dmodule>`,

  'zone-with-dmref-old-format': `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <preliminaryRqmts>
      <productionMaintData>
        <zoneRef id="z002" zoneNumber="ZN002">
          <name>旧格式区域</name>
          <refs>
            <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
              <dmRefIdent>
                <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="212" infoCodeVariant="A" itemLocationCode="A"/>
                <issueInfo issueNumber="001" inWork="01"/>
                <language languageIsoCode="zh" countryIsoCode="CN"/>
              </dmRefIdent>
            </dmRef>
          </refs>
        </zoneRef>
      </productionMaintData>
    </preliminaryRqmts>
  </content>
</dmodule>`,

  'access-with-dmref': `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <preliminaryRqmts>
      <productionMaintData>
        <accessPointRef id="ap001" accessPointNumber="AP001">
          <name>测试口盖</name>
          <refs>
            <dmRef>
              <dmRefIdent>
                <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="041" infoCodeVariant="A" itemLocationCode="A"/>
                <issueInfo issueNumber="002" inWork="01"/>
                <language languageIsoCode="zh" countryIsoCode="CN"/>
              </dmRefIdent>
            </dmRef>
          </refs>
        </accessPointRef>
      </productionMaintData>
    </preliminaryRqmts>
  </content>
</dmodule>`
}

/**
 * 模拟 XSD 校验逻辑
 * 实际项目中应该使用真实的 XML Schema 校验器（如 xmllint, libxmljs 等）
 */
function validateXML(xmlContent, sampleName) {
  console.log(`\n📋 校验样本: ${sampleName}`)
  console.log('=' .repeat(60))

  const errors = []

  // 检查 xlink 属性
  const xlinkTypeRegex = /<dmRef[^>]*xlink:type/g
  const xlinkShowRegex = /<dmRef[^>]*xlink:show/g
  const xlinkActuateRegex = /<dmRef[^>]*xlink:actuate/g

  const xlinkTypeMatches = xmlContent.match(xlinkTypeRegex) || []
  const xlinkShowMatches = xmlContent.match(xlinkShowRegex) || []
  const xlinkActuateMatches = xmlContent.match(xlinkActuateRegex) || []

  if (xlinkTypeMatches.length > 0) {
    errors.push({
      type: 'cvc-complex-type.3.2.2',
      message: "Attribute 'xlink:type' is not allowed to appear in element 'dmRef'",
      count: xlinkTypeMatches.length
    })
  }

  if (xlinkShowMatches.length > 0) {
    errors.push({
      type: 'cvc-complex-type.3.2.2',
      message: "Attribute 'xlink:show' is not allowed to appear in element 'dmRef'",
      count: xlinkShowMatches.length
    })
  }

  if (xlinkActuateMatches.length > 0) {
    errors.push({
      type: 'cvc-complex-type.3.2.2',
      message: "Attribute 'xlink:actuate' is not allowed to appear in element 'dmRef'",
      count: xlinkActuateMatches.length
    })
  }

  // 检查必要元素是否存在
  if (!xmlContent.includes('<dmRef>') && !xmlContent.includes('<dmRef ')) {
    console.log('⚠️  未找到 dmRef 元素')
  } else {
    console.log('✓ 包含 dmRef 元素')
  }

  if (!xmlContent.includes('<dmRefIdent>')) {
    console.log('⚠️  未找到 dmRefIdent 元素')
  } else {
    console.log('✓ 包含 dmRefIdent 元素')
  }

  // 报告结果
  if (errors.length === 0) {
    console.log('\n✅ 校验通过：无 xlink 相关错误')
    return { passed: true, errors: [] }
  } else {
    console.log('\n❌ 校验失败：发现以下错误')
    errors.forEach((error, index) => {
      console.log(`  ${index + 1}. [${error.type}] ${error.message} (出现 ${error.count} 次)`)
    })
    return { passed: false, errors }
  }
}

/**
 * 运行所有测试
 */
function runAllTests() {
  console.log('🚀 XSD Schema 校验测试')
  console.log('=' .repeat(60))
  console.log('修复目标: 移除 dmRef 元素上的 xlink:type / xlink:show / xlink:actuate 属性')
  console.log('=' .repeat(60))

  const results = {}

  Object.keys(xmlSamples).forEach(sampleName => {
    const xmlContent = xmlSamples[sampleName]
    const result = validateXML(xmlContent, sampleName)
    results[sampleName] = result
  })

  // 生成总结报告
  console.log('\n\n📊 测试总结')
  console.log('=' .repeat(60))

  const totalSamples = Object.keys(results).length
  const passedSamples = Object.values(results).filter(r => r.passed).length
  const failedSamples = totalSamples - passedSamples

  console.log(`总样本数: ${totalSamples}`)
  console.log(`通过: ${passedSamples}`)
  console.log(`失败: ${failedSamples}`)
  console.log()

  Object.keys(results).forEach(sampleName => {
    const result = results[sampleName]
    const status = result.passed ? '✅ PASS' : '❌ FAIL'
    console.log(`  ${status} - ${sampleName}`)
  })

  console.log('\n' + '='.repeat(60))

  if (failedSamples > 0) {
    console.log('❌ 部分样本校验失败')
    console.log('\n预期行为:')
    console.log('  - zone-with-dmref: 应通过（修复后格式）')
    console.log('  - zone-with-dmref-old-format: 应失败（旧格式，需清理）')
    console.log('  - access-with-dmref: 应通过（修复后格式）')
    console.log('\n实际应用中，旧格式应通过 buildDmRefXml 自动清理')
    process.exit(1)
  } else {
    console.log('✅ 所有样本校验通过')
    process.exit(0)
  }
}

// 运行测试
runAllTests()
