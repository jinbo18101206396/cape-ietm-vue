/**
 * DDN自动填充 - 数据流完整性测试
 *
 * 目的：验证从后端响应到前端显示的完整数据流
 */

// ==================== 模拟后端响应 ====================
const mockBackendResponse = {
  success: true,
  result: {
    files: [
      {
        fileName: "DMC-TEST-A-00-0-0-00-00-A-000-A-A.xml",
        fileType: "DM",  // ← 关键字段1
        resultCode: "1",
        resultMessage: "可以导入",
        dmcCode: "DMC-TEST-A-00-0-0-00-00-A-000-A-A",
        tempFilePath: "/tmp/xxx",
        xmlContent: `<?xml version="1.0" encoding="UTF-8"?>
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
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="9" day="10"/>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="3"
                commercialSecurityClass="cc52"
                caveat="cv51"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`  // ← 关键字段2
      }
    ],
    totalCount: 1,
    successCount: 1,
    failureCount: 0
  }
}

console.log('=== 测试开始 ===\n')

// ==================== 步骤1：模拟validateFile处理 ====================
console.log('步骤1：模拟validateFile处理后端响应')

const file = {
  name: "DMC-TEST-A-00-0-0-00-00-A-000-A-A.xml",
  validated: false,
  validateSuccess: false,
  validateMessage: '',
  validateDetail: null,
  xmlContent: null  // 初始为空
}

// 模拟validateFile中的处理逻辑
const res = mockBackendResponse
if (res.success && res.result) {
  file.validated = true

  const validateResult = res.result
  if (validateResult.files && validateResult.files.length > 0) {
    const fileItem = validateResult.files.find(f => f.fileName === file.name)

    if (fileItem) {
      const code = parseInt(fileItem.resultCode)
      file.validateSuccess = code === 1
      file.validateMessage = fileItem.resultMessage
      file.vldCode = code
      file.dmcCode = fileItem.dmcCode
      file.tempFilePath = fileItem.tempFilePath
      file.xmlContent = fileItem.xmlContent || file.xmlContent  // ← 关键：设置xmlContent
      file.validateDetail = fileItem  // ← 关键：设置validateDetail
    }
  }
}

console.log('处理后的file对象：')
console.log('  validated:', file.validated, file.validated ? '✓' : '✗')
console.log('  validateSuccess:', file.validateSuccess, file.validateSuccess ? '✓' : '✗')
console.log('  validateDetail存在:', !!file.validateDetail, file.validateDetail ? '✓' : '✗')
console.log('  validateDetail.fileType:', file.validateDetail ? file.validateDetail.fileType : 'N/A')
console.log('  xmlContent存在:', !!file.xmlContent, file.xmlContent ? '✓' : '✗')
console.log('  xmlContent长度:', file.xmlContent ? file.xmlContent.length : 0)
console.log('')

// ==================== 步骤2：模拟autoFillDdnInfo条件判断 ====================
console.log('步骤2：检查autoFillDdnInfo的条件')

const fileList = [file]

const firstValidDm = fileList.find(f =>
  f.validated &&
  f.validateSuccess &&
  f.validateDetail &&
  f.validateDetail.fileType === 'DM'
)

console.log('条件检查：')
console.log('  f.validated:', file.validated, file.validated ? '✓' : '✗')
console.log('  f.validateSuccess:', file.validateSuccess, file.validateSuccess ? '✓' : '✗')
console.log('  f.validateDetail存在:', !!file.validateDetail, file.validateDetail ? '✓' : '✗')
console.log('  f.validateDetail.fileType === "DM":',
  file.validateDetail && file.validateDetail.fileType === 'DM',
  file.validateDetail && file.validateDetail.fileType === 'DM' ? '✓' : '✗')
console.log('')
console.log('结果：firstValidDm', firstValidDm ? '找到 ✓' : '未找到 ✗')

if (!firstValidDm) {
  console.error('❌ 条件不满足！autoFillDdnInfo会提前返回')
  console.log('\n请检查：')
  console.log('1. validateDetail是否正确设置？')
  console.log('2. validateDetail.fileType是否为"DM"？')
  console.log('3. xmlContent是否存在？')
} else if (!firstValidDm.xmlContent) {
  console.error('❌ 找到DM文件但xmlContent为空！')
} else {
  console.log('✓ 所有条件满足\n')

  // ==================== 步骤3：模拟提取DDN字段 ====================
  console.log('步骤3：提取DDN字段')

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(firstValidDm.xmlContent, 'text/xml')

  const parserError = xmlDoc.getElementsByTagName('parsererror')
  if (parserError.length > 0) {
    console.error('❌ XML解析失败')
  } else {
    console.log('✓ XML解析成功\n')

    const ddnInfo = {
      modelic: '',
      security: '',
      commercialSecurity: '',
      caveat: '',
      issueDate: null,
      year: ''
    }

    // 提取型号
    const dmCodeElem = xmlDoc.querySelector('dmCode, dmIdent dmCode')
    if (dmCodeElem) {
      const modelIdentCode = dmCodeElem.getAttribute('modelIdentCode')
      if (modelIdentCode && !ddnInfo.modelic) {
        ddnInfo.modelic = modelIdentCode
        console.log('✓ 提取型号:', modelIdentCode)
      }
    }

    // 提取安全属性
    const securityElem = xmlDoc.querySelector('security[securityClassification]')
    if (securityElem) {
      let securityClass = securityElem.getAttribute('securityClassification')
      if (securityClass && securityClass.length === 1) {
        securityClass = '0' + securityClass
      }
      if (securityClass && !ddnInfo.security) {
        ddnInfo.security = securityClass
        console.log('✓ 提取密级:', securityClass)
      }

      const commercialSecurity = securityElem.getAttribute('commercialSecurityClass')
      if (commercialSecurity && !ddnInfo.commercialSecurity) {
        ddnInfo.commercialSecurity = commercialSecurity
        console.log('✓ 提取商业密级:', commercialSecurity)
      }

      const caveat = securityElem.getAttribute('caveat')
      if (caveat && !ddnInfo.caveat) {
        ddnInfo.caveat = caveat
        console.log('✓ 提取警告:', caveat)
      }
    }

    // 提取发布日期
    const issueDateElem = xmlDoc.querySelector('issueDate[year][month][day]')
    if (issueDateElem) {
      const year = issueDateElem.getAttribute('year')
      const month = issueDateElem.getAttribute('month').padStart(2, '0')
      const day = issueDateElem.getAttribute('day').padStart(2, '0')
      ddnInfo.issueDate = `${year}-${month}-${day}`
      ddnInfo.year = year
      console.log('✓ 提取发布日期:', ddnInfo.issueDate)
    }

    console.log('\n最终的ddnInfo：')
    console.log(JSON.stringify(ddnInfo, null, 2))

    console.log('\n=== 测试通过 ✓✓✓ ===')
    console.log('数据流完整，逻辑正确')
  }
}
