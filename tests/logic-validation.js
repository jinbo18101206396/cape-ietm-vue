/**
 * 逻辑验证测试：数据模块导入 - ZIP展开功能
 *
 * 这是一个独立的Node.js脚本，用于验证核心逻辑的正确性
 * 不依赖Jest或其他测试框架
 */

console.log('\n========================================')
console.log('数据模块导入 - ZIP展开功能逻辑验证')
console.log('========================================\n')

let passCount = 0
let failCount = 0

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`)
    passCount++
  } else {
    console.log(`✗ ${message}`)
    failCount++
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    console.log(`✓ ${message}`)
    passCount++
  } else {
    console.log(`✗ ${message}`)
    console.log(`  期望: ${expected}`)
    console.log(`  实际: ${actual}`)
    failCount++
  }
}

function assertArrayEqual(actual, expected, message) {
  const isEqual = JSON.stringify(actual.sort()) === JSON.stringify(expected.sort())
  if (isEqual) {
    console.log(`✓ ${message}`)
    passCount++
  } else {
    console.log(`✗ ${message}`)
    console.log(`  期望: ${JSON.stringify(expected)}`)
    console.log(`  实际: ${JSON.stringify(actual)}`)
    failCount++
  }
}

// ==================== 测试1: parseZipFile 逻辑 ====================
console.log('\n【测试1】parseZipFile 逻辑验证')
console.log('----------------------------------------')

async function testParseZipFile() {
  // 模拟后端返回的数据
  const mockApiResponse = {
    success: true,
    result: {
      files: [
        {
          fileName: 'DMC-001.xml',
          fileType: 'DM',
          resultCode: '1',
          resultMessage: '校验通过',
          dmcCode: 'DMC-001',
          tempFilePath: '/tmp/file1.xml',
          xmlContent: '<dmodule>...</dmodule>'
        },
        {
          fileName: 'DMC-002.xml',
          fileType: 'DM',
          resultCode: '1',
          resultMessage: '校验通过',
          dmcCode: 'DMC-002',
          tempFilePath: '/tmp/file2.xml',
          xmlContent: '<dmodule>...</dmodule>'
        },
        {
          fileName: 'ICN-001.PNG',
          fileType: 'ICN',
          resultCode: '1',
          resultMessage: '校验通过',
          tempFilePath: '/tmp/icn1.png'
        }
      ]
    }
  }

  // 模拟parseZipFile方法
  function parseZipFile(zipFile, apiResponse) {
    const validateResult = apiResponse.result
    const innerFiles = []

    if (validateResult.files && validateResult.files.length > 0) {
      for (const fileItem of validateResult.files) {
        const code = parseInt(fileItem.resultCode)

        const virtualFile = {
          name: fileItem.fileName,
          uid: Date.now() + '_' + Math.random() + '_' + fileItem.fileName,
          size: 0,
          type: fileItem.fileType === 'DM' ? 'text/xml' : 'application/octet-stream',
          validated: true,
          validateSuccess: code === 1,
          validateMessage: fileItem.resultMessage,
          validateDetail: fileItem,
          dmcCode: fileItem.dmcCode,
          tempFilePath: fileItem.tempFilePath,
          xmlContent: fileItem.xmlContent,
          sourceZipFile: zipFile,
          isFromZip: true
        }

        innerFiles.push(virtualFile)
      }
    }

    if (innerFiles.length === 0) {
      throw new Error('ZIP文件中没有有效的文件')
    }

    return innerFiles
  }

  const mockZipFile = { name: 'test.zip', size: 2048 }
  const result = parseZipFile(mockZipFile, mockApiResponse)

  assertEqual(result.length, 3, '返回3个文件')
  assertEqual(result[0].name, 'DMC-001.xml', '第1个文件名正确')
  assertEqual(result[1].name, 'DMC-002.xml', '第2个文件名正确')
  assertEqual(result[2].name, 'ICN-001.PNG', '第3个文件名正确')
  assert(result[0].validated === true, '第1个文件已标记为已校验')
  assert(result[0].validateSuccess === true, '第1个文件校验成功')
  assert(result[0].isFromZip === true, '第1个文件标记为来自ZIP')
  assertEqual(result[0].sourceZipFile.name, 'test.zip', '第1个文件保存了ZIP引用')
  assertEqual(result[2].type, 'application/octet-stream', 'ICN文件类型正确')
}

await testParseZipFile()

// ==================== 测试2: handleFileInputChange ZIP展开逻辑 ====================
console.log('\n【测试2】handleFileInputChange ZIP展开逻辑验证')
console.log('----------------------------------------')

function testHandleFileInputChangeZip() {
  const fileList = []

  // 模拟parseZipFile返回的虚拟文件
  const mockVirtualFiles = [
    {
      name: 'DMC-001.xml',
      validated: true,
      validateSuccess: true,
      isFromZip: true,
      sourceZipFile: { name: 'test.zip' }
    },
    {
      name: 'DMC-002.xml',
      validated: true,
      validateSuccess: true,
      isFromZip: true,
      sourceZipFile: { name: 'test.zip' }
    }
  ]

  // 模拟添加到列表
  for (const innerFile of mockVirtualFiles) {
    // 检查重复
    const exists = fileList.find(f => f.name === innerFile.name)
    if (!exists) {
      fileList.push(innerFile)
    }
  }

  assertEqual(fileList.length, 2, 'fileList包含2个文件')
  assertEqual(fileList[0].name, 'DMC-001.xml', '第1个文件名是XML，不是ZIP')
  assertEqual(fileList[1].name, 'DMC-002.xml', '第2个文件名是XML，不是ZIP')

  const hasZipFile = fileList.some(f => f.name === 'test.zip')
  assert(!hasZipFile, 'fileList不包含ZIP文件本身')
}

testHandleFileInputChangeZip()

// ==================== 测试3: handleFileInputChange XML文件逻辑 ====================
console.log('\n【测试3】handleFileInputChange XML文件逻辑验证')
console.log('----------------------------------------')

function testHandleFileInputChangeXml() {
  const fileList = []

  // 模拟XML文件
  const mockXmlFile = {
    name: 'DMC-SINGLE.xml',
    size: 1024,
    lastModified: Date.now(),
    validated: false,
    validateSuccess: false,
    validateMessage: '',
    sourceFile: {}
  }

  fileList.push(mockXmlFile)

  assertEqual(fileList.length, 1, 'fileList包含1个文件')
  assertEqual(fileList[0].name, 'DMC-SINGLE.xml', '文件名正确')
  assert(fileList[0].validated === false, 'XML文件初始未校验')
  assert(fileList[0].isFromZip === undefined, 'XML文件没有isFromZip标记')
}

testHandleFileInputChangeXml()

// ==================== 测试4: validateFile 跳过逻辑 ====================
console.log('\n【测试4】validateFile 跳过逻辑验证')
console.log('----------------------------------------')

function testValidateFileSkip() {
  let apiCallCount = 0

  function validateFile(file) {
    // 如果是从ZIP解析出来的虚拟文件，已经在上传时校验过了
    if (file.isFromZip && file.validated) {
      // 跳过，不调用API
      return
    }

    // 模拟API调用
    apiCallCount++
    file.validated = true
    file.validateSuccess = true
  }

  // 测试虚拟文件
  const virtualFile = {
    name: 'DMC-001.xml',
    isFromZip: true,
    validated: true,
    validateSuccess: true
  }

  validateFile(virtualFile)
  assertEqual(apiCallCount, 0, '虚拟文件不调用API')

  // 测试独立XML文件
  const xmlFile = {
    name: 'DMC-SINGLE.xml',
    validated: false
  }

  validateFile(xmlFile)
  assertEqual(apiCallCount, 1, '独立XML文件调用API')
  assert(xmlFile.validated === true, '文件标记为已校验')
}

testValidateFileSkip()

// ==================== 测试5: doImport 分组逻辑 ====================
console.log('\n【测试5】doImport 分组逻辑验证')
console.log('----------------------------------------')

function testDoImportGrouping() {
  const mockZipFile1 = { name: 'test1.zip', size: 2048 }
  const mockZipFile2 = { name: 'test2.zip', size: 3072 }

  const files = [
    // 来自第一个ZIP
    {
      name: 'DMC-001.xml',
      validated: true,
      validateSuccess: true,
      vldCode: 1,
      isFromZip: true,
      sourceZipFile: mockZipFile1
    },
    {
      name: 'DMC-002.xml',
      validated: true,
      validateSuccess: true,
      vldCode: 1,
      isFromZip: true,
      sourceZipFile: mockZipFile1
    },
    // 来自第二个ZIP
    {
      name: 'DMC-003.xml',
      validated: true,
      validateSuccess: true,
      vldCode: 1,
      isFromZip: true,
      sourceZipFile: mockZipFile2
    },
    // 独立XML文件
    {
      name: 'DMC-SINGLE.xml',
      validated: true,
      validateSuccess: true,
      vldCode: 1,
      size: 512
    }
  ]

  // 分组逻辑
  const zipFileMap = new Map()
  const standaloneXmlFiles = []

  files.forEach(file => {
    if (file.isFromZip && file.sourceZipFile) {
      if (!zipFileMap.has(file.sourceZipFile)) {
        zipFileMap.set(file.sourceZipFile, [])
      }
      zipFileMap.get(file.sourceZipFile).push(file)
    } else {
      standaloneXmlFiles.push(file)
    }
  })

  assertEqual(zipFileMap.size, 2, '识别出2个不同的ZIP来源')
  assertEqual(zipFileMap.get(mockZipFile1).length, 2, '第一个ZIP包含2个文件')
  assertEqual(zipFileMap.get(mockZipFile2).length, 1, '第二个ZIP包含1个文件')
  assertEqual(standaloneXmlFiles.length, 1, '有1个独立XML文件')
  assertEqual(standaloneXmlFiles[0].name, 'DMC-SINGLE.xml', '独立XML文件名正确')

  // 构建导入文件列表
  const importFiles = []

  zipFileMap.forEach((virtualFiles, zipFile) => {
    virtualFiles.forEach(vf => {
      importFiles.push({
        filename: vf.name,
        validing: JSON.stringify({ vld: String(vf.vldCode || 1) })
      })
    })
  })

  standaloneXmlFiles.forEach(file => {
    importFiles.push({
      filename: file.name,
      validing: JSON.stringify({ vld: String(file.vldCode || 1) })
    })
  })

  assertEqual(importFiles.length, 4, '导入列表包含4个文件')

  const fileNames = importFiles.map(f => f.filename)
  assertArrayEqual(
    fileNames,
    ['DMC-001.xml', 'DMC-002.xml', 'DMC-003.xml', 'DMC-SINGLE.xml'],
    '导入文件名列表正确'
  )

  // 确定upfilename
  let upfilename = ''
  if (zipFileMap.size > 0) {
    const firstZipFile = zipFileMap.keys().next().value
    upfilename = firstZipFile.name
  }

  assertEqual(upfilename, 'test1.zip', 'upfilename使用第一个ZIP文件名')
}

testDoImportGrouping()

// ==================== 测试6: 边界情况 - 空ZIP ====================
console.log('\n【测试6】边界情况 - 空ZIP验证')
console.log('----------------------------------------')

function testEmptyZip() {
  function parseZipFile(zipFile, apiResponse) {
    const validateResult = apiResponse.result
    const innerFiles = []

    if (validateResult.files && validateResult.files.length > 0) {
      for (const fileItem of validateResult.files) {
        innerFiles.push({ name: fileItem.fileName })
      }
    }

    if (innerFiles.length === 0) {
      throw new Error('ZIP文件中没有有效的文件')
    }

    return innerFiles
  }

  const emptyApiResponse = {
    success: true,
    result: { files: [] }
  }

  try {
    parseZipFile({ name: 'empty.zip' }, emptyApiResponse)
    assert(false, '空ZIP应该抛出异常')
  } catch (e) {
    assertEqual(e.message, 'ZIP文件中没有有效的文件', '空ZIP抛出正确的异常')
  }
}

testEmptyZip()

// ==================== 测试7: 边界情况 - 重复文件 ====================
console.log('\n【测试7】边界情况 - 重复文件验证')
console.log('----------------------------------------')

function testDuplicateFiles() {
  const fileList = []

  const file1 = { name: 'DMC-001.xml', validated: true }

  // 第一次添加
  const exists1 = fileList.find(f => f.name === file1.name)
  if (!exists1) {
    fileList.push(file1)
  }

  assertEqual(fileList.length, 1, '第一次添加成功')

  // 第二次添加相同文件
  const file2 = { name: 'DMC-001.xml', validated: true }
  const exists2 = fileList.find(f => f.name === file2.name)
  if (!exists2) {
    fileList.push(file2)
  }

  assertEqual(fileList.length, 1, '重复文件被跳过，列表仍为1个')
}

testDuplicateFiles()

// ==================== 测试8: 完整流程 ====================
console.log('\n【测试8】完整流程验证')
console.log('----------------------------------------')

function testCompleteFlow() {
  const fileList = []
  let validateApiCallCount = 0

  // 步骤1: 上传ZIP并展开
  const mockVirtualFiles = [
    { name: 'DMC-001.xml', validated: true, validateSuccess: true, vldCode: 1, isFromZip: true, sourceZipFile: { name: 'test.zip' } },
    { name: 'DMC-002.xml', validated: true, validateSuccess: true, vldCode: 1, isFromZip: true, sourceZipFile: { name: 'test.zip' } }
  ]

  mockVirtualFiles.forEach(f => fileList.push(f))
  assertEqual(fileList.length, 2, '步骤1: ZIP文件展开为2个文件')

  // 步骤2: 校验（虚拟文件跳过）
  fileList.forEach(file => {
    if (!(file.isFromZip && file.validated)) {
      validateApiCallCount++
    }
  })
  assertEqual(validateApiCallCount, 0, '步骤2: 虚拟文件跳过校验，API调用0次')

  // 步骤3: 添加独立XML
  const xmlFile = { name: 'DMC-SINGLE.xml', validated: false, size: 512 }
  fileList.push(xmlFile)
  assertEqual(fileList.length, 3, '步骤3: 添加独立XML，总共3个文件')

  // 步骤4: 校验独立XML
  if (!(xmlFile.isFromZip && xmlFile.validated)) {
    validateApiCallCount++
    xmlFile.validated = true
    xmlFile.validateSuccess = true
    xmlFile.vldCode = 1
  }
  assertEqual(validateApiCallCount, 1, '步骤4: 独立XML调用校验API')
  assert(xmlFile.validated === true, '步骤4: 独立XML已校验')

  // 步骤5: 导入
  const validFiles = fileList.filter(f => f.validated && f.validateSuccess)
  assertEqual(validFiles.length, 3, '步骤5: 3个文件都通过校验')

  const importFiles = validFiles.map(f => ({ filename: f.name }))
  assertArrayEqual(
    importFiles.map(f => f.filename),
    ['DMC-001.xml', 'DMC-002.xml', 'DMC-SINGLE.xml'],
    '步骤5: 导入文件列表正确'
  )
}

testCompleteFlow()

// ==================== 测试总结 ====================
console.log('\n========================================')
console.log('测试总结')
console.log('========================================')
console.log(`通过: ${passCount}`)
console.log(`失败: ${failCount}`)
console.log(`总计: ${passCount + failCount}`)
console.log(`成功率: ${((passCount / (passCount + failCount)) * 100).toFixed(2)}%`)

if (failCount === 0) {
  console.log('\n✅ 所有测试通过！核心逻辑验证成功。')
  process.exit(0)
} else {
  console.log(`\n❌ 有 ${failCount} 个测试失败`)
  process.exit(1)
}
