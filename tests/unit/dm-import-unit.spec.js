/**
 * 数据模块导入功能单元测试
 * 测试核心业务逻辑，不依赖实际服务
 */

const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')
const JSZip = require('jszip')

// 测试临时目录
const TEMP_DIR = path.join(__dirname, '../temp')

// 确保临时目录存在
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// ========== 测试辅助函数 ==========

/**
 * 创建DM XML内容
 */
function createDmXml(modelCode, systemCode, security) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="${modelCode}"
                systemDiffCode="A"
                systemCode="${systemCode}"
                subSystemCode="0"
                subSubSystemCode="0"
                assyCode="00"
                disassyCode="00"
                disassyCodeVariant="A"
                infoCode="040"
                infoCodeVariant="A"
                itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="${security}"/>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <para>Test content</para>
    </description>
  </content>
</dmodule>`
}

/**
 * 模拟前端的extractZipFile逻辑（从实际代码提取）
 */
async function extractZipFile(zipBuffer) {
  const JSZip = require('jszip')
  const zip = new JSZip()

  const zipData = await zip.loadAsync(zipBuffer)
  const innerFiles = []

  for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
    if (zipEntry.dir) continue

    const fileName = relativePath.split('/').pop()
    const isXml = fileName.toLowerCase().endsWith('.xml')
    const isIcn = !isXml && /\.(png|jpg|jpeg|gif|bmp|svg|tif|tiff|cgm)$/i.test(fileName)

    if (!isXml && !isIcn) continue

    let fileContent = null
    if (isXml) {
      fileContent = await zipEntry.async('string')
    }

    const virtualFile = {
      name: fileName,
      uid: Date.now() + '_' + Math.random() + '_' + fileName,
      size: zipEntry._data ? zipEntry._data.uncompressedSize : 0,
      type: isXml ? 'text/xml' : 'application/octet-stream',
      validated: false,
      validateSuccess: false,
      validateMessage: '待校验',
      xmlContent: fileContent,
      isFromZip: true,
      zipEntryPath: relativePath
    }

    innerFiles.push(virtualFile)
  }

  return innerFiles
}

/**
 * 模拟autoFillDdnInfo逻辑
 */
function autoFillDdnInfo(fileList, currentDdnInfo) {
  const firstValidDm = fileList.find(f =>
    f.validated &&
    f.validateSuccess &&
    f.xmlContent &&
    f.name.toLowerCase().endsWith('.xml')
  )

  if (!firstValidDm || !firstValidDm.xmlContent) {
    return { filled: false, reason: '未找到可用的DM文件' }
  }

  try {
    const DOMParser = require('xmldom').DOMParser
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(firstValidDm.xmlContent, 'text/xml')

    const parserError = xmlDoc.getElementsByTagName('parsererror')
    if (parserError.length > 0) {
      return { filled: false, reason: 'XML解析失败' }
    }

    const result = { filled: false, modelic: null, security: null }

    // 提取型号
    const dmCodeElems = xmlDoc.getElementsByTagName('dmCode')
    if (dmCodeElems.length > 0) {
      const modelIdentCode = dmCodeElems[0].getAttribute('modelIdentCode')
      if (modelIdentCode && !currentDdnInfo.modelic) {
        result.modelic = modelIdentCode
        result.filled = true
      }
    }

    // 提取密级
    const securityElems = xmlDoc.getElementsByTagName('security')
    if (securityElems.length > 0) {
      let securityClass = securityElems[0].getAttribute('securityClassification')
      if (securityClass && securityClass.length === 1) {
        securityClass = '0' + securityClass
      }
      if (securityClass && !currentDdnInfo.security) {
        result.security = securityClass
        result.filled = true
      }
    }

    return result
  } catch (error) {
    return { filled: false, reason: error.message }
  }
}

// ========== 单元测试 ==========

test.describe('单元测试 - ZIP文件解压', () => {

  test('UT-01: 解压包含3个DM的ZIP，返回3个虚拟文件对象', async () => {
    // 创建ZIP
    const zip = new JSZip()
    zip.file('DMC-MODEL1-A-001-0-0-00-00A-040A-A.xml', createDmXml('MODEL1', '001', '01'))
    zip.file('DMC-MODEL1-A-002-0-0-00-00A-040A-A.xml', createDmXml('MODEL1', '002', '01'))
    zip.file('DMC-MODEL1-A-003-0-0-00-00A-040A-A.xml', createDmXml('MODEL1', '003', '01'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // 解压
    const files = await extractZipFile(zipBuffer)

    // 验证
    expect(files.length).toBe(3)
    expect(files[0].name).toContain('DMC-MODEL1-A-001')
    expect(files[0].isFromZip).toBe(true)
    expect(files[0].validated).toBe(false)
    expect(files[0].xmlContent).toBeTruthy()

    console.log('✓ UT-01: 解压3个DM成功')
  })

  test('UT-02: 解压混合文件（DM+ICN），正确分类', async () => {
    const zip = new JSZip()
    zip.file('DMC-MODEL2-A-001-0-0-00-00A-040A-A.xml', createDmXml('MODEL2', '001', '02'))
    zip.file('ICN-MODEL2-001-00001.png', Buffer.from([0x89, 0x50, 0x4E, 0x47]))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    expect(files.length).toBe(2)

    const dmFile = files.find(f => f.name.includes('DMC-'))
    const icnFile = files.find(f => f.name.includes('ICN-'))

    expect(dmFile).toBeDefined()
    expect(icnFile).toBeDefined()
    expect(dmFile.type).toBe('text/xml')
    expect(icnFile.type).toBe('application/octet-stream')

    console.log('✓ UT-02: 混合文件分类正确')
  })

  test('UT-03: 解压空ZIP，返回空数组', async () => {
    const zip = new JSZip()
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    expect(files.length).toBe(0)

    console.log('✓ UT-03: 空ZIP返回空数组')
  })

  test('UT-04: 跳过不支持的文件类型', async () => {
    const zip = new JSZip()
    zip.file('document.pdf', 'fake pdf content')
    zip.file('readme.txt', 'text file')
    zip.file('DMC-VALID-A-001-0-0-00-00A-040A-A.xml', createDmXml('VALID', '001', '01'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    expect(files.length).toBe(1) // 只有XML
    expect(files[0].name).toContain('DMC-VALID')

    console.log('✓ UT-04: 跳过不支持文件类型')
  })
})

test.describe('单元测试 - DDN自动填充', () => {

  test('UT-05: 从DM提取型号和密级', async () => {
    const xmlContent = createDmXml('ZB1', '001', '01')

    const fileList = [{
      name: 'test.xml',
      validated: true,
      validateSuccess: true,
      xmlContent: xmlContent
    }]

    const currentDdnInfo = { modelic: '', security: '' }
    const result = autoFillDdnInfo(fileList, currentDdnInfo)

    expect(result.filled).toBe(true)
    expect(result.modelic).toBe('ZB1')
    expect(result.security).toBe('01')

    console.log('✓ UT-05: DDN信息提取成功')
  })

  test('UT-06: 密级格式标准化（1位→2位）', async () => {
    const xmlContent = createDmXml('ZB2', '001', '1') // 单字符密级

    const fileList = [{
      name: 'test.xml',
      validated: true,
      validateSuccess: true,
      xmlContent: xmlContent
    }]

    const currentDdnInfo = { modelic: '', security: '' }
    const result = autoFillDdnInfo(fileList, currentDdnInfo)

    expect(result.security).toBe('01') // 自动补零

    console.log('✓ UT-06: 密级格式标准化')
  })

  test('UT-07: 不覆盖已填写字段', async () => {
    const xmlContent = createDmXml('ZB3', '001', '02')

    const fileList = [{
      name: 'test.xml',
      validated: true,
      validateSuccess: true,
      xmlContent: xmlContent
    }]

    const currentDdnInfo = {
      modelic: 'USER_MODEL', // 已填写
      security: ''
    }

    const result = autoFillDdnInfo(fileList, currentDdnInfo)

    expect(result.modelic).toBeNull() // 不提取，因为已有值
    expect(result.security).toBe('02') // 提取密级

    console.log('✓ UT-07: 不覆盖已填写字段')
  })

  test('UT-08: 无有效DM文件时不填充', async () => {
    const fileList = [{
      name: 'test.png',
      validated: true,
      validateSuccess: true,
      xmlContent: null // ICN文件
    }]

    const currentDdnInfo = { modelic: '', security: '' }
    const result = autoFillDdnInfo(fileList, currentDdnInfo)

    expect(result.filled).toBe(false)

    console.log('✓ UT-08: 无DM时不填充')
  })

  test('UT-09: XML解析失败时静默处理', async () => {
    const invalidXml = '<invalid>not a valid dm</invalid>'

    const fileList = [{
      name: 'test.xml',
      validated: true,
      validateSuccess: true,
      xmlContent: invalidXml
    }]

    const currentDdnInfo = { modelic: '', security: '' }
    const result = autoFillDdnInfo(fileList, currentDdnInfo)

    expect(result.filled).toBe(false)
    // 不应抛出异常

    console.log('✓ UT-09: XML解析失败静默处理')
  })
})

test.describe('单元测试 - 数据流转换', () => {

  test('UT-10: 校验后虚拟文件状态更新', async () => {
    const zip = new JSZip()
    zip.file('DMC-TEST-A-001-0-0-00-00A-040A-A.xml', createDmXml('TEST', '001', '01'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    // 初始状态
    expect(files[0].validated).toBe(false)
    expect(files[0].validateMessage).toBe('待校验')

    // 模拟校验后
    files[0].validated = true
    files[0].validateSuccess = true
    files[0].validateMessage = '校验通过'

    expect(files[0].validated).toBe(true)
    expect(files[0].validateSuccess).toBe(true)

    console.log('✓ UT-10: 状态更新正确')
  })

  test('UT-11: 文件名提取逻辑', async () => {
    const zip = new JSZip()
    zip.folder('subfolder').file('DMC-NESTED-A-001-0-0-00-00A-040A-A.xml', createDmXml('NESTED', '001', '01'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    // 验证：只提取文件名，不包含路径
    expect(files[0].name).toBe('DMC-NESTED-A-001-0-0-00-00A-040A-A.xml')
    expect(files[0].name).not.toContain('subfolder')

    console.log('✓ UT-11: 文件名提取正确')
  })
})

test.describe('集成测试 - 业务流程', () => {

  test('IT-01: 上传→解压→显示文件列表', async () => {
    // 1. 创建ZIP
    const zip = new JSZip()
    zip.file('DMC-FLOW1-A-001-0-0-00-00A-040A-A.xml', createDmXml('FLOW1', '001', '01'))
    zip.file('DMC-FLOW1-A-002-0-0-00-00A-040A-A.xml', createDmXml('FLOW1', '002', '01'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // 2. 解压
    const files = await extractZipFile(zipBuffer)

    // 3. 验证文件列表
    expect(files.length).toBe(2)
    expect(files.every(f => f.isFromZip)).toBe(true)
    expect(files.every(f => !f.validated)).toBe(true)

    console.log('✓ IT-01: 上传解压流程完整')
  })

  test('IT-02: 校验→更新状态→自动填充DDN', async () => {
    // 1. 准备文件
    const zip = new JSZip()
    zip.file('DMC-FLOW2-A-001-0-0-00-00A-040A-A.xml', createDmXml('FLOW2', '001', '02'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    // 2. 模拟校验
    files[0].validated = true
    files[0].validateSuccess = true

    // 3. 自动填充DDN
    const currentDdnInfo = { modelic: '', security: '' }
    const result = autoFillDdnInfo(files, currentDdnInfo)

    // 4. 验证
    expect(result.filled).toBe(true)
    expect(result.modelic).toBe('FLOW2')
    expect(result.security).toBe('02')

    console.log('✓ IT-02: 校验填充流程完整')
  })

  test('IT-03: 大批量文件处理（50个DM）', async () => {
    const startTime = Date.now()

    // 创建50个DM
    const zip = new JSZip()
    for (let i = 1; i <= 50; i++) {
      const dmCode = `BULK-A-${String(i).padStart(3, '0')}-0-0-00-00A-040A-A`
      zip.file(`DMC-${dmCode}.xml`, createDmXml('BULK', String(i).padStart(3, '0'), '01'))
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    const endTime = Date.now()
    const duration = endTime - startTime

    // 验证
    expect(files.length).toBe(50)
    expect(duration).toBeLessThan(5000) // 应该在5秒内完成

    console.log(`✓ IT-03: 大批量处理成功 (${duration}ms)`)
  })
})

test.describe('边界测试', () => {

  test('BT-01: 超长文件名处理', async () => {
    const longName = 'DMC-' + 'A'.repeat(200) + '.xml'
    const zip = new JSZip()
    zip.file(longName, createDmXml('LONG', '001', '01'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    expect(files.length).toBe(1)
    expect(files[0].name).toBe(longName)

    console.log('✓ BT-01: 超长文件名处理正常')
  })

  test('BT-02: 特殊字符文件名', async () => {
    const specialName = 'DMC-测试中文-001.xml'
    const zip = new JSZip()
    zip.file(specialName, createDmXml('SPECIAL', '001', '01'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    expect(files.length).toBe(1)
    expect(files[0].name).toBe(specialName)

    console.log('✓ BT-02: 特殊字符文件名处理正常')
  })

  test('BT-03: XML格式边界情况', async () => {
    const xmlWithNamespace = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="NS1"
                systemDiffCode="A"
                systemCode="001"
                subSystemCode="0"
                subSubSystemCode="0"
                assyCode="00"
                disassyCode="00"
                disassyCodeVariant="A"
                infoCode="040"
                infoCodeVariant="A"
                itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="03"/>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <para>Test</para>
    </description>
  </content>
</dmodule>`

    const fileList = [{
      name: 'test.xml',
      validated: true,
      validateSuccess: true,
      xmlContent: xmlWithNamespace
    }]

    const result = autoFillDdnInfo(fileList, { modelic: '', security: '' })

    expect(result.filled).toBe(true)
    expect(result.modelic).toBe('NS1')

    console.log('✓ BT-03: 带命名空间XML处理正常')
  })

  test('BT-04: 嵌套目录结构', async () => {
    const zip = new JSZip()
    zip.folder('level1').folder('level2').file('DMC-NESTED-A-001-0-0-00-00A-040A-A.xml', createDmXml('NESTED', '001', '01'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const files = await extractZipFile(zipBuffer)

    expect(files.length).toBe(1)
    expect(files[0].name).not.toContain('/') // 只有文件名

    console.log('✓ BT-04: 嵌套目录处理正常')
  })
})

// 测试汇总
test.afterAll(() => {
  console.log('\n' + '='.repeat(60))
  console.log('单元测试和集成测试完成')
  console.log('='.repeat(60))
})
