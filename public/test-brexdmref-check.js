/**
 * 测试：验证重建 refs 后 brexDmRef 是否被保留
 *
 * 运行方式：在浏览器控制台中粘贴此脚本
 */

(async function testBrexDmRefPreservation() {
  console.log('========================================')
  console.log('测试：brexDmRef 保留验证')
  console.log('========================================')

  // 读取测试 XML
  const response = await fetch('/test-brexdmref.xml')
  const xmlText = await response.text()

  console.log('原始 XML 长度:', xmlText.length)

  // 检查原始 XML 中是否有 brexDmRef
  const hasBrexBefore = xmlText.includes('<brexDmRef>')
  console.log('✓ 原始 XML 包含 <brexDmRef>:', hasBrexBefore)

  if (!hasBrexBefore) {
    console.error('❌ 测试失败：原始 XML 没有 brexDmRef')
    return
  }

  // 提取 brexDmRef 的完整内容
  const brexStart = xmlText.indexOf('<brexDmRef>')
  const brexEnd = xmlText.indexOf('</brexDmRef>') + '</brexDmRef>'.length
  const originalBrexDmRef = xmlText.substring(brexStart, brexEnd)
  console.log('原始 brexDmRef 内容:')
  console.log(originalBrexDmRef)

  // 模拟重建 refs 的关键步骤
  console.log('\n--- 模拟重建 refs ---')

  // 1. 找到 <refs> 的位置
  const refsStartTag = '<refs'
  const refsStartIndex = xmlText.indexOf(refsStartTag)
  const refsEndTag = '</refs>'
  const refsEndIndex = xmlText.indexOf(refsEndTag) + refsEndTag.length

  console.log('原 <refs> 起始位置:', refsStartIndex)
  console.log('原 </refs> 结束位置:', refsEndIndex)

  const oldRefs = xmlText.substring(refsStartIndex, refsEndIndex)
  console.log('原 refs 内容长度:', oldRefs.length)

  // 2. 生成新的 refs（模拟：只包含 description 中引用的 dmRef）
  const newRefs = `<refs xmlns:xlink="http://www.w3.org/1999/xlink">
      <dmRef>
        <dmRefIdent>
          <dmCode modelIdentCode="REFER" systemDiffCode="A" systemCode="02" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="040" infoCodeVariant="A" itemLocationCode="A"/>
        </dmRefIdent>
      </dmRef>
    </refs>`

  // 3. 替换 refs 块
  const newXml = xmlText.substring(0, refsStartIndex) + newRefs + xmlText.substring(refsEndIndex)

  console.log('新 XML 长度:', newXml.length)

  // 4. 检查新 XML 中是否还有 brexDmRef
  const hasBrexAfter = newXml.includes('<brexDmRef>')
  console.log('\n--- 验证结果 ---')
  console.log('✓ 重建后 XML 包含 <brexDmRef>:', hasBrexAfter)

  if (hasBrexAfter) {
    // 提取重建后的 brexDmRef
    const newBrexStart = newXml.indexOf('<brexDmRef>')
    const newBrexEnd = newXml.indexOf('</brexDmRef>') + '</brexDmRef>'.length
    const newBrexDmRef = newXml.substring(newBrexStart, newBrexEnd)

    const brexUnchanged = originalBrexDmRef === newBrexDmRef
    console.log('✓ brexDmRef 内容未改变:', brexUnchanged)

    if (!brexUnchanged) {
      console.error('❌ brexDmRef 内容发生了变化')
      console.log('期望:', originalBrexDmRef)
      console.log('实际:', newBrexDmRef)
    }
  } else {
    console.error('❌ 测试失败：brexDmRef 被删除了！')

    // 检查 brexDmRef 原本的位置
    const dmStatusStart = xmlText.indexOf('<dmStatus>')
    const dmStatusEnd = xmlText.indexOf('</dmStatus>') + '</dmStatus>'.length
    const brexPosition = brexStart

    console.log('\nbrexDmRef 原本位置:', brexPosition)
    console.log('dmStatus 范围:', dmStatusStart, '-', dmStatusEnd)
    console.log('brexDmRef 在 dmStatus 内:', brexPosition > dmStatusStart && brexPosition < dmStatusEnd)

    console.log('\nrefs 范围:', refsStartIndex, '-', refsEndIndex)
    console.log('brexDmRef 是否在 refs 范围内:', brexPosition >= refsStartIndex && brexPosition <= refsEndIndex)

    if (brexPosition >= refsStartIndex && brexPosition <= refsEndIndex) {
      console.error('❌ 根因：brexDmRef 被错误地放在了 <refs> 块内，所以被替换掉了')
    } else {
      console.error('❌ 根因：替换范围有误，误删了 refs 之外的内容')
    }
  }

  // 5. 验证 XML 是否合法
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(newXml, 'text/xml')
    const parseError = doc.getElementsByTagName('parsererror')
    if (parseError.length > 0) {
      console.error('❌ 重建后的 XML 格式错误:', parseError[0].textContent)
    } else {
      console.log('✓ 重建后的 XML 格式正确')
    }
  } catch (e) {
    console.error('❌ XML 解析异常:', e.message)
  }

  console.log('\n========================================')
  console.log('测试完成')
  console.log('========================================')
})()
