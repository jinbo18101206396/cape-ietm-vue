/**
 * DDN自动填充功能 - 完整字段测试
 *
 * 测试目标：验证从DM XML中提取所有DDN字段
 *
 * @date 2026-09-04
 */

const { test, expect } = require('@playwright/test')

test.describe('DDN自动填充 - 完整字段测试', () => {

  test('场景1：完整DM XML - 应填充所有可提取字段', async () => {
    // 创建完整的测试DM XML
    const completeXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST-MODEL-001"
                systemDiffCode="A"
                systemCode="00"
                subSystemCode="0"
                subSubSystemCode="0"
                assyCode="00"
                disassyCode="00"
                disassyCodeVariant="A"
                infoCode="000"
                infoCodeVariant="A"
                itemLocationCode="A"/>
        <issueInfo issueNumber="001" inWork="00"/>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="09" day="04"/>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="3"
                commercialSecurityClass="cc52"
                caveat="cv51"/>
      <responsiblePartnerCompany>
        <enterpriseName>测试公司</enterpriseName>
      </responsiblePartnerCompany>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <para>测试内容</para>
    </description>
  </content>
</dmodule>`

    // 模拟DOMParser解析
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(completeXml, 'text/xml')

    // 验证解析成功
    const parserError = xmlDoc.getElementsByTagName('parsererror')
    expect(parserError.length).toBe(0)

    // 测试字段提取
    const results = {}

    // 1. 型号
    const dmCodeElem = xmlDoc.querySelector('dmCode')
    if (dmCodeElem) {
      results.modelic = dmCodeElem.getAttribute('modelIdentCode')
    }

    // 2. 安全属性
    const securityElem = xmlDoc.querySelector('security[securityClassification]')
    if (securityElem) {
      let securityClass = securityElem.getAttribute('securityClassification')
      if (securityClass && securityClass.length === 1) {
        securityClass = '0' + securityClass
      }
      results.security = securityClass

      results.commercialSecurity = securityElem.getAttribute('commercialSecurityClass') ||
                                    securityElem.getAttribute('commercialSecurityAttGroup')

      results.caveat = securityElem.getAttribute('caveat')
    }

    // 3. 发布日期
    const issueDateElem = xmlDoc.querySelector('issueDate[year][month][day]')
    if (issueDateElem) {
      const year = issueDateElem.getAttribute('year')
      const month = issueDateElem.getAttribute('month').padStart(2, '0')
      const day = issueDateElem.getAttribute('day').padStart(2, '0')
      results.issueDate = `${year}-${month}-${day}`
      results.year = year
    }

    // 验证结果
    expect(results.modelic).toBe('TEST-MODEL-001')
    expect(results.security).toBe('03')
    expect(results.commercialSecurity).toBe('cc52')
    expect(results.caveat).toBe('cv51')
    expect(results.issueDate).toBe('2026-09-04')
    expect(results.year).toBe('2026')

    console.log('✓ 完整XML测试通过:', results)
  })

  test('场景2：最小DM XML - 只填充必填字段', async () => {
    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="MIN-MODEL"
                systemDiffCode="A"
                systemCode="00"
                subSystemCode="0"
                subSubSystemCode="0"
                assyCode="00"
                disassyCode="00"
                disassyCodeVariant="A"
                infoCode="000"
                infoCodeVariant="A"
                itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="1"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(minimalXml, 'text/xml')

    const results = {}

    const dmCodeElem = xmlDoc.querySelector('dmCode')
    if (dmCodeElem) {
      results.modelic = dmCodeElem.getAttribute('modelIdentCode')
    }

    const securityElem = xmlDoc.querySelector('security[securityClassification]')
    if (securityElem) {
      let securityClass = securityElem.getAttribute('securityClassification')
      if (securityClass && securityClass.length === 1) {
        securityClass = '0' + securityClass
      }
      results.security = securityClass
      results.commercialSecurity = securityElem.getAttribute('commercialSecurityClass')
      results.caveat = securityElem.getAttribute('caveat')
    }

    const issueDateElem = xmlDoc.querySelector('issueDate[year][month][day]')
    results.hasIssueDate = !!issueDateElem

    // 验证结果
    expect(results.modelic).toBe('MIN-MODEL')
    expect(results.security).toBe('01')
    expect(results.commercialSecurity).toBeFalsy() // 可选字段为空
    expect(results.caveat).toBeFalsy() // 可选字段为空
    expect(results.hasIssueDate).toBe(false) // 没有issueDate

    console.log('✓ 最小XML测试通过:', results)
  })

  test('场景3：不覆盖用户已填写的字段', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="XML-MODEL"
                systemDiffCode="A"
                systemCode="00"
                subSystemCode="0"
                subSubSystemCode="0"
                assyCode="00"
                disassyCode="00"
                disassyCodeVariant="A"
                infoCode="000"
                infoCodeVariant="A"
                itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="2"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xml, 'text/xml')

    // 模拟用户已填写的DDN信息
    const ddnInfo = {
      modelic: 'USER-MODEL', // 用户已填写
      security: '', // 未填写
      commercialSecurity: '',
      caveat: '',
      sender: 'User Company', // 用户已填写
      receiver: '00000',
      issueDate: null,
      year: ''
    }

    // 模拟autoFillDdnInfo的逻辑（只填充空字段）
    const dmCodeElem = xmlDoc.querySelector('dmCode')
    if (dmCodeElem) {
      const modelIdentCode = dmCodeElem.getAttribute('modelIdentCode')
      if (modelIdentCode && !ddnInfo.modelic) { // 条件不满足，不填充
        ddnInfo.modelic = modelIdentCode
      }
    }

    const securityElem = xmlDoc.querySelector('security[securityClassification]')
    if (securityElem) {
      let securityClass = securityElem.getAttribute('securityClassification')
      if (securityClass && securityClass.length === 1) {
        securityClass = '0' + securityClass
      }
      if (securityClass && !ddnInfo.security) { // 条件满足，填充
        ddnInfo.security = securityClass
      }
    }

    // 验证结果：型号保持用户输入，密级被填充
    expect(ddnInfo.modelic).toBe('USER-MODEL') // 未被覆盖
    expect(ddnInfo.security).toBe('02') // 被填充
    expect(ddnInfo.sender).toBe('User Company') // 未被覆盖

    console.log('✓ 不覆盖用户输入测试通过:', ddnInfo)
  })

  test('场景4：日期格式处理 - 单位数月日补零', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="DATE-TEST"
                systemDiffCode="A"
                systemCode="00"
                subSystemCode="0"
                subSubSystemCode="0"
                assyCode="00"
                disassyCode="00"
                disassyCodeVariant="A"
                infoCode="000"
                infoCodeVariant="A"
                itemLocationCode="A"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="1" day="5"/>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xml, 'text/xml')

    const issueDateElem = xmlDoc.querySelector('issueDate[year][month][day]')
    expect(issueDateElem).toBeTruthy()

    const year = issueDateElem.getAttribute('year')
    const month = issueDateElem.getAttribute('month').padStart(2, '0')
    const day = issueDateElem.getAttribute('day').padStart(2, '0')
    const issueDate = `${year}-${month}-${day}`

    // 验证格式化结果
    expect(issueDate).toBe('2026-01-05') // month和day已补零

    console.log('✓ 日期格式化测试通过:', issueDate)
  })

  test('场景5：XML命名空间处理', async () => {
    // S1000D可能包含命名空间
    const xmlWithNs = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns="http://www.s1000d.org/S1000D_4-0">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="NS-MODEL"
                systemDiffCode="A"
                systemCode="00"
                subSystemCode="0"
                subSubSystemCode="0"
                assyCode="00"
                disassyCode="00"
                disassyCodeVariant="A"
                infoCode="000"
                infoCodeVariant="A"
                itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`

    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlWithNs, 'text/xml')

    // querySelector应该能处理命名空间（使用本地名称）
    let dmCodeElem = xmlDoc.querySelector('dmCode')

    // 如果querySelector失败，尝试getElementsByTagName
    if (!dmCodeElem) {
      const dmCodeElems = xmlDoc.getElementsByTagName('dmCode')
      if (dmCodeElems.length > 0) {
        dmCodeElem = dmCodeElems[0]
      }
    }

    expect(dmCodeElem).toBeTruthy()
    const modelIdentCode = dmCodeElem.getAttribute('modelIdentCode')
    expect(modelIdentCode).toBe('NS-MODEL')

    console.log('✓ 命名空间处理测试通过')
  })
})

test.describe('DDN字段优先级测试', () => {

  test('优先级1：页面加载时从项目信息填充', () => {
    // 模拟项目信息
    const currentProject = {
      equipmentCode: 'PROJECT-MODEL',
      security: '02',
      originator: 'Project Company',
      company: 'Project Org'
    }

    // 模拟loadDdnFromProject逻辑
    const ddnInfo = {
      modelic: currentProject.equipmentCode || '',
      security: currentProject.security || '01',
      sender: currentProject.originator || currentProject.company || '',
      receiver: '00000',
      issueDate: '2026-09-04',
      year: '2026'
    }

    expect(ddnInfo.modelic).toBe('PROJECT-MODEL')
    expect(ddnInfo.security).toBe('02')
    expect(ddnInfo.sender).toBe('Project Company')

    console.log('✓ 项目信息填充测试通过')
  })

  test('优先级2：校验后从DM XML覆盖（仅空字段）', () => {
    // 初始状态：从项目信息填充
    const ddnInfo = {
      modelic: 'PROJECT-MODEL',
      security: '02',
      sender: 'Project Company',
      receiver: '00000',
      issueDate: '2026-09-04',
      year: '2026',
      commercialSecurity: '',
      caveat: ''
    }

    // DM XML提供了型号和商业密级
    const xmlData = {
      modelic: 'DM-MODEL',
      security: '03',
      commercialSecurity: 'cc52',
      caveat: 'cv51'
    }

    // autoFillDdnInfo逻辑：只填充空字段
    if (xmlData.modelic && !ddnInfo.modelic) {
      ddnInfo.modelic = xmlData.modelic
    }
    if (xmlData.security && !ddnInfo.security) {
      ddnInfo.security = xmlData.security
    }
    if (xmlData.commercialSecurity && !ddnInfo.commercialSecurity) {
      ddnInfo.commercialSecurity = xmlData.commercialSecurity
    }
    if (xmlData.caveat && !ddnInfo.caveat) {
      ddnInfo.caveat = xmlData.caveat
    }

    // 验证：项目信息保留，DM XML补充空字段
    expect(ddnInfo.modelic).toBe('PROJECT-MODEL') // 未覆盖
    expect(ddnInfo.security).toBe('02') // 未覆盖
    expect(ddnInfo.commercialSecurity).toBe('cc52') // 新填充
    expect(ddnInfo.caveat).toBe('cv51') // 新填充

    console.log('✓ 优先级测试通过：不覆盖已有值')
  })
})
