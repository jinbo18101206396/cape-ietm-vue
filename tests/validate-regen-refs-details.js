/**
 * 重建 refs 细节功能验证脚本
 * 不依赖测试框架，直接运行验证逻辑
 */

const { NOTATIONS, hasNotation, getNotation } = require('../src/views/ietm/ietmdatamodulemanagement/editor/utils/notations')
const { ICN_FILE_EXT, isValidIcnExt, normalizeExt } = require('../src/views/ietm/ietmdatamodulemanagement/editor/utils/icnFileExt')

// 简单的断言函数
function assert(condition, message) {
  if (!condition) {
    console.error('❌', message)
    process.exitCode = 1
  } else {
    console.log('✅', message)
  }
}

function assertEquals(actual, expected, message) {
  const match = JSON.stringify(actual) === JSON.stringify(expected)
  assert(match, `${message} (期望: ${JSON.stringify(expected)}, 实际: ${JSON.stringify(actual)})`)
}

console.log('\n========================================')
console.log('重建 refs 细节功能验证')
console.log('========================================\n')

// ============================================================================
// 1. 去重逻辑测试
// ============================================================================
console.log('【1】去重逻辑测试')

const deduplicatePreserveOrder = (arr) => {
  const seen = new Set()
  const result = []
  for (const item of arr) {
    const ident = item.split('【')[0]
    if (!seen.has(ident)) {
      seen.add(ident)
      result.push(item)
    }
  }
  return result
}

const testInput1 = ['ICN-001【10行】', 'ICN-002【15行】', 'ICN-001【20行】', 'ICN-003【25行】']
const testOutput1 = deduplicatePreserveOrder(testInput1)
assertEquals(testOutput1.length, 3, '去重后应保留3个')
assertEquals(testOutput1[0], 'ICN-001【10行】', '第一个应保留')
assert(!testOutput1.includes('ICN-001【20行】'), '重复的应被过滤')

const testInput2 = []
assertEquals(deduplicatePreserveOrder(testInput2).length, 0, '空数组应返回空数组')

const testInput3 = ['ICN-001【10行】', 'ICN-001【20行】', 'ICN-001【30行】']
assertEquals(deduplicatePreserveOrder(testInput3).length, 1, '全部重复应只保留1个')

console.log('')

// ============================================================================
// 2. ICN 大小写匹配测试
// ============================================================================
console.log('【2】ICN 大小写匹配测试')

const findIcnCaseInsensitive = (icnlist, ident) => {
  return icnlist.find(item =>
    item.toLowerCase().startsWith(ident.toLowerCase() + '.')
  )
}

const icnlist1 = ['icn-001.cgm', 'icn-002.svg']
const found1 = findIcnCaseInsensitive(icnlist1, 'ICN-001')
assertEquals(found1, 'icn-001.cgm', '大写 ICN 应匹配小写文件名')

const icnlist2 = ['ICN-001.CGM', 'ICN-002.SVG']
const found2 = findIcnCaseInsensitive(icnlist2, 'icn-001')
assertEquals(found2, 'ICN-001.CGM', '小写 ICN 应匹配大写文件名')

const found3 = findIcnCaseInsensitive(icnlist1, 'ICN-999')
assertEquals(found3, undefined, '不存在的 ICN 应返回 undefined')

const found4 = findIcnCaseInsensitive([], 'ICN-001')
assertEquals(found4, undefined, '空 icnlist 应返回 undefined')

console.log('')

// ============================================================================
// 3. NOTATION 映射表测试
// ============================================================================
console.log('【3】NOTATION 映射表测试')

assert(NOTATIONS.hasOwnProperty('cgm'), '应包含 cgm')
assert(NOTATIONS.hasOwnProperty('svg'), '应包含 svg')
assert(NOTATIONS.hasOwnProperty('png'), '应包含 png')
assert(NOTATIONS.hasOwnProperty('jpg'), '应包含 jpg')
assert(NOTATIONS.hasOwnProperty('mp3'), '应包含 mp3')
assert(NOTATIONS.hasOwnProperty('mp4'), '应包含 mp4')
assert(NOTATIONS.hasOwnProperty('wrl'), '应包含 wrl')
assert(NOTATIONS.hasOwnProperty('pdf'), '应包含 pdf')

assert(hasNotation('cgm') === true, 'hasNotation("cgm") 应返回 true')
assert(hasNotation('.cgm') === true, 'hasNotation(".cgm") 应返回 true')
assert(hasNotation('CGM') === true, 'hasNotation("CGM") 应返回 true (大小写不敏感)')
assert(hasNotation('unknown') === false, 'hasNotation("unknown") 应返回 false')

const cgmNotation = getNotation('cgm')
assert(cgmNotation && cgmNotation.includes('Computer Graphics Metafile'), 'CGM NOTATION 应包含正确描述')

const pdfNotation = getNotation('.pdf')
assert(pdfNotation && pdfNotation.includes('Portable Document Format'), 'PDF NOTATION 应包含正确描述')

assert(getNotation('unknown') === null, 'getNotation("unknown") 应返回 null')

const notationCount = Object.keys(NOTATIONS).length
assert(notationCount >= 100, `映射表应至少100种格式 (当前: ${notationCount})`)

console.log('')

// ============================================================================
// 4. ICN 后缀白名单测试
// ============================================================================
console.log('【4】ICN 后缀白名单测试')

assert(ICN_FILE_EXT.includes('.cgm'), '白名单应包含 .cgm')
assert(ICN_FILE_EXT.includes('.png'), '白名单应包含 .png')
assert(ICN_FILE_EXT.includes('.svg'), '白名单应包含 .svg')
assert(ICN_FILE_EXT.includes('.mp3'), '白名单应包含 .mp3')
assert(ICN_FILE_EXT.includes('.mp4'), '白名单应包含 .mp4')

assert(isValidIcnExt('.cgm') === true, 'isValidIcnExt(".cgm") 应返回 true')
assert(isValidIcnExt('.CGM') === true, 'isValidIcnExt(".CGM") 应返回 true (大小写不敏感)')
assert(isValidIcnExt('.unknown') === false, 'isValidIcnExt(".unknown") 应返回 false')
assert(isValidIcnExt('') === false, 'isValidIcnExt("") 应返回 false')
assert(isValidIcnExt(null) === false, 'isValidIcnExt(null) 应返回 false')

assertEquals(normalizeExt('cgm'), '.cgm', 'normalizeExt("cgm")')
assertEquals(normalizeExt('.cgm'), '.cgm', 'normalizeExt(".cgm")')
assertEquals(normalizeExt('CGM'), '.cgm', 'normalizeExt("CGM")')
assertEquals(normalizeExt('.CGM'), '.cgm', 'normalizeExt(".CGM")')
assertEquals(normalizeExt(' .CGM '), '.cgm', 'normalizeExt(" .CGM ")')
assertEquals(normalizeExt(''), '', 'normalizeExt("")')

assert(ICN_FILE_EXT.length >= 10, `白名单应至少10种格式 (当前: ${ICN_FILE_EXT.length})`)

// 检查白名单与 NOTATION 的对应关系
const missingNotations = []
for (const ext of ICN_FILE_EXT) {
  const normalized = ext.substring(1) // 去掉前导点
  if (!hasNotation(normalized)) {
    // .tif 是 .tiff 的别名，允许缺失
    if (ext !== '.tif') {
      missingNotations.push(ext)
    }
  }
}

assert(missingNotations.length === 0, `白名单后缀应都有对应 NOTATION (缺失: ${missingNotations.join(', ')})`)

console.log('')

// ============================================================================
// 5. DOCTYPE 生成测试
// ============================================================================
console.log('【5】DOCTYPE 生成逻辑测试')

const generateDoctype = (entities) => {
  const exts = new Set()
  for (const entity of entities) {
    const dotIndex = entity.lastIndexOf('.')
    if (dotIndex !== -1) {
      const ext = entity.substring(dotIndex + 1).toLowerCase()
      exts.add(ext)
    }
  }

  let doctype = '<!DOCTYPE dmodule['

  for (const ext of exts) {
    if (NOTATIONS[ext]) {
      doctype += '\n<!NOTATION ' + ext + ' PUBLIC "' + NOTATIONS[ext] + '">'
    }
  }

  for (const entity of entities) {
    const dotIndex = entity.lastIndexOf('.')
    const filename = dotIndex !== -1 ? entity.substring(0, dotIndex) : entity
    const fileext = dotIndex !== -1 ? entity.substring(dotIndex + 1).toLowerCase() : ''
    doctype += '\n<!ENTITY ' + filename + ' SYSTEM "' + entity + '" NDATA ' + fileext + '>'
  }

  doctype += ']>'
  return doctype
}

const doctype1 = generateDoctype(['ICN-001.cgm', 'ICN-002.svg'])
assert(doctype1.includes('<!NOTATION cgm PUBLIC'), 'DOCTYPE 应包含 cgm NOTATION')
assert(doctype1.includes('<!NOTATION svg PUBLIC'), 'DOCTYPE 应包含 svg NOTATION')

const doctype2 = generateDoctype(['ICN-001.cgm'])
assert(doctype2.includes('<!ENTITY ICN-001 SYSTEM "ICN-001.cgm" NDATA cgm>'), 'DOCTYPE 应包含 ENTITY 声明')

const doctype3 = generateDoctype(['ICN-001.cgm', 'ICN-002.cgm', 'ICN-003.cgm'])
const cgmNotationMatches = (doctype3.match(/<!NOTATION cgm/g) || []).length
assertEquals(cgmNotationMatches, 1, '相同后缀应只生成一个 NOTATION')

const doctype4 = generateDoctype(['ICN-001.cgm', 'ICN-002.svg', 'ICN-003.png'])
assert(doctype4.includes('<!NOTATION cgm'), 'DOCTYPE 应包含 cgm')
assert(doctype4.includes('<!NOTATION svg'), 'DOCTYPE 应包含 svg')
assert(doctype4.includes('<!NOTATION png'), 'DOCTYPE 应包含 png')

const doctype5 = generateDoctype(['ICN-001.unknown'])
assert(!doctype5.includes('<!NOTATION unknown'), '未知后缀不应生成 NOTATION')
assert(doctype5.includes('<!ENTITY ICN-001 SYSTEM "ICN-001.unknown" NDATA unknown>'), '但应生成 ENTITY')

const doctype6 = generateDoctype(['ICN-001.CGM'])
assert(doctype6.includes('NDATA cgm>'), '后缀应转换为小写')
assert(!doctype6.includes('NDATA CGM>'), '不应保留大写')

const doctype7 = generateDoctype([])
assertEquals(doctype7, '<!DOCTYPE dmodule[]>', '空实体列表应生成空 DOCTYPE')

console.log('')

// ============================================================================
// 总结
// ============================================================================
console.log('========================================')
if (process.exitCode === 1) {
  console.log('❌ 部分测试失败')
} else {
  console.log('✅ 所有测试通过')
}
console.log('========================================\n')
