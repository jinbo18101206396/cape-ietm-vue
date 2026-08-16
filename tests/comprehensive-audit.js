#!/usr/bin/env node
// 全面排查 - 所有行号转换和元素操作相关的问题

const fs = require('fs')

console.log('🔍 全面深度排查 - 行号转换和元素操作\n')
console.log('='.repeat(70))

// 读取关键文件
const files = {
  elementOps: 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/elementOps.js',
  xmlTree: 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/utils/xmlTree.js',
  sourceView: 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/DmSourceView.vue',
  contentEditor: 'D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue'
}

const codes = {}
for (const [name, path] of Object.entries(files)) {
  try {
    codes[name] = fs.readFileSync(path, 'utf8')
  } catch (e) {
    console.error(`❌ 无法读取 ${name}: ${e.message}`)
    process.exit(1)
  }
}

const issues = []

console.log('📋 检查点列表:\n')
console.log('1. 行号转换公式一致性')
console.log('2. 所有使用lineno的地方')
console.log('3. 所有使用linenoOffset的地方')
console.log('4. 自闭合标签处理')
console.log('5. 多行元素判断')
console.log('6. 插入位置计算')
console.log('7. 删除范围计算')
console.log('8. 移动元素计算')
console.log('9. 属性设置位置')
console.log('10. 防循环机制')

console.log('\n' + '='.repeat(70))
console.log('🧪 检查1: 行号转换公式一致性\n')

// 查找所有行号转换公式
const patterns = {
  'lineno转editor': /lineno\s*\+\s*linenoOffset\s*-\s*\d+/g,
  'editor转lineno': /editorLine\s*-\s*linenoOffset\s*\+\s*\d+/g,
  'displayLine计算': /displayLine\s*=.*lineno.*linenoOffset/g,
  'startLine计算': /startLine\s*=.*lineno.*linenoOffset/g
}

console.log('公式搜索结果:')
for (const [desc, pattern] of Object.entries(patterns)) {
  console.log(`\n${desc}:`)

  for (const [fileName, code] of Object.entries(codes)) {
    const matches = [...code.matchAll(pattern)]
    if (matches.length > 0) {
      console.log(`  ${fileName}:`)
      matches.forEach((match, i) => {
        const line = code.substring(0, match.index).split('\n').length
        console.log(`    行${line}: ${match[0]}`)
      })
    }
  }
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查2: locateNode公式验证\n')

// 检查locateNode - 从节点定位到编辑器
const locateNodeMatch = codes.sourceView.match(/locateNode\(node\)[^}]*\{([^}]+)\}/s)
if (locateNodeMatch) {
  console.log('locateNode函数:')
  const funcBody = locateNodeMatch[1]

  // 提取关键行
  const lineCalc = funcBody.match(/line\s*=.*lineno.*linenoOffset[^;]+/)
  if (lineCalc) {
    console.log(`  计算公式: ${lineCalc[0]}`)

    // 验证公式
    if (lineCalc[0].includes('lineno + this.linenoOffset - 2')) {
      console.log('  ✅ 公式正确: lineno + linenoOffset - 2')
    } else {
      console.log('  ❌ 公式可能错误')
      issues.push('locateNode公式不是标准的 lineno + linenoOffset - 2')
    }
  }
} else {
  console.log('⚠️  未找到locateNode函数')
  issues.push('未找到locateNode函数')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查3: getnodeBylineno公式验证\n')

// 检查getnodeBylineno - 从编辑器定位到节点
const getnodeBylinenoMatch = codes.xmlTree.match(/function getnodeBylineno[^}]*\{([^}]+)\}/s)
if (getnodeBylinenoMatch) {
  console.log('getnodeBylineno函数:')
  const funcBody = getnodeBylinenoMatch[1]

  const targetCalc = funcBody.match(/target\s*=.*editorLine.*linenoOffset[^;]+/)
  if (targetCalc) {
    console.log(`  计算公式: ${targetCalc[0]}`)

    if (targetCalc[0].includes('editorLine - linenoOffset + 1')) {
      console.log('  ✅ 公式正确: editorLine - linenoOffset + 1')
    } else {
      console.log('  ❌ 公式可能错误')
      issues.push('getnodeBylineno公式不是标准的 editorLine - linenoOffset + 1')
    }
  }

  // 检查闭合标签处理
  if (funcBody.includes('closeTagMatch')) {
    console.log('  ✅ 有闭合标签识别')

    // 检查向上查找逻辑
    if (funcBody.includes('for') && funcBody.includes('editorLine - 2')) {
      console.log('  ✅ 有向上查找开始标签逻辑')
    } else {
      console.log('  ⚠️  向上查找逻辑可能不完整')
      issues.push('getnodeBylineno的向上查找逻辑可能有问题')
    }
  } else {
    console.log('  ❌ 缺少闭合标签识别')
    issues.push('getnodeBylineno缺少闭合标签识别')
  }
} else {
  console.log('⚠️  未找到getnodeBylineno函数')
  issues.push('未找到getnodeBylineno函数')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查4: calculateInsertLine公式验证\n')

const calcInsertMatch = codes.elementOps.match(/function calculateInsertLine[^}]*\{([\s\S]*?)^\}/m)
if (calcInsertMatch) {
  console.log('calculateInsertLine函数:')
  const funcBody = calcInsertMatch[1]

  // 检查displayLine计算
  const displayLineMatch = funcBody.match(/displayLine\s*=\s*baseLine\s*\+\s*linenoOffset\s*-\s*(\d+)/)
  if (displayLineMatch) {
    const offset = displayLineMatch[1]
    console.log(`  displayLine = baseLine + linenoOffset - ${offset}`)
    if (offset === '2') {
      console.log('  ✅ displayLine计算正确（转为0-based）')
    } else {
      console.log(`  ❌ displayLine计算错误（应该是-2，实际是-${offset}）`)
      issues.push(`calculateInsertLine的displayLine计算错误: -${offset}`)
    }
  } else {
    console.log('  ⚠️  未找到displayLine计算')
    issues.push('calculateInsertLine缺少displayLine计算')
  }

  // 检查expandSelfClosingTag调用
  if (funcBody.includes('expandSelfClosingTag')) {
    console.log('  ✅ 有自闭合标签展开逻辑')
  } else {
    console.log('  ❌ 缺少自闭合标签展开')
    issues.push('calculateInsertLine缺少自闭合标签展开')
  }

  // 检查child分支返回值
  const childReturnMatch = funcBody.match(/if\s*\(appendType\s*===\s*'child'\)[\s\S]*?return\s+(displayLine[^;]+)/m)
  if (childReturnMatch) {
    console.log(`  child分支返回: ${childReturnMatch[1]}`)
    if (childReturnMatch[1].includes('displayLine + 1')) {
      console.log('  ✅ child分支返回正确（displayLine + 1）')
    } else {
      console.log('  ⚠️  child分支返回可能不正确')
      issues.push('calculateInsertLine的child分支返回值可能错误')
    }
  }
} else {
  console.log('⚠️  未找到calculateInsertLine函数')
  issues.push('未找到calculateInsertLine函数')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查5: expandSelfClosingTag公式验证\n')

const expandMatch = codes.elementOps.match(/function expandSelfClosingTag[^}]*\{([\s\S]*?)^\}/m)
if (expandMatch) {
  console.log('expandSelfClosingTag函数:')
  const funcBody = expandMatch[1]

  const startLineMatch = funcBody.match(/startLine\s*=\s*[^;]+/)
  if (startLineMatch) {
    console.log(`  ${startLineMatch[0]}`)
    if (startLineMatch[0].includes('lineno + linenoOffset - 2')) {
      console.log('  ✅ startLine计算正确')
    } else {
      console.log('  ❌ startLine计算错误')
      issues.push('expandSelfClosingTag的startLine计算错误')
    }
  }

  // 检查正则匹配
  if (funcBody.includes('selfClosingMatch')) {
    console.log('  ✅ 有正则匹配自闭合标签')
  } else {
    console.log('  ❌ 缺少正则匹配')
    issues.push('expandSelfClosingTag缺少正则匹配')
  }
} else {
  console.log('⚠️  未找到expandSelfClosingTag函数')
  issues.push('未找到expandSelfClosingTag函数')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查6: isMultiLineElement逻辑验证\n')

const isMultiLineMatch = codes.elementOps.match(/function isMultiLineElement[^}]*\{([\s\S]*?)^\}/m)
if (isMultiLineMatch) {
  console.log('isMultiLineElement函数:')
  const funcBody = isMultiLineMatch[1]

  // 检查startLine计算
  const startLineMatch = funcBody.match(/startLine\s*=\s*[^;]+/)
  if (startLineMatch) {
    console.log(`  ${startLineMatch[0]}`)
    if (startLineMatch[0].includes('lineno + linenoOffset')) {
      console.log('  ⚠️  startLine可能需要转为0-based')
      issues.push('isMultiLineElement的startLine可能需要-2转为0-based')
    }
  }

  // 检查单行元素判断
  if (funcBody.includes('includes(openTag) && includes(closeTag)')) {
    console.log('  ✅ 有单行元素判断')
  } else {
    console.log('  ⚠️  单行元素判断可能不准确')
  }

  // 检查闭合标签查找
  if (funcBody.includes('includes(closeTag)')) {
    console.log('  ✅ 有闭合标签查找')
  } else {
    console.log('  ❌ 缺少闭合标签查找')
    issues.push('isMultiLineElement缺少闭合标签查找')
  }
} else {
  console.log('⚠️  未找到isMultiLineElement函数')
  issues.push('未找到isMultiLineElement函数')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查7: deleteThisAndChildren逻辑验证\n')

const deleteMatch = codes.elementOps.match(/function deleteThisAndChildren[^}]*\{([\s\S]*?)^\}/m)
if (deleteMatch) {
  console.log('deleteThisAndChildren函数:')
  const funcBody = deleteMatch[1]

  // 检查startLine计算
  const startLineMatch = funcBody.match(/startLine\s*=\s*[^;]+/)
  if (startLineMatch) {
    console.log(`  ${startLineMatch[0]}`)
  }

  // 检查闭合标签查找
  if (funcBody.includes('closeTag')) {
    console.log('  ✅ 有闭合标签查找')
  } else {
    console.log('  ❌ 缺少闭合标签查找')
    issues.push('deleteThisAndChildren缺少闭合标签查找')
  }

  // 检查删除范围
  if (funcBody.includes('replaceRange')) {
    console.log('  ✅ 使用replaceRange删除')

    // 检查是否删除了endLine+1
    if (funcBody.match(/endLine\s*\+\s*1/)) {
      console.log('  ✅ 删除到endLine+1（包含换行）')
    } else {
      console.log('  ⚠️  可能只删除到endLine')
      issues.push('deleteThisAndChildren可能没有删除换行符')
    }
  }
} else {
  console.log('⚠️  未找到deleteThisAndChildren函数')
  issues.push('未找到deleteThisAndChildren函数')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查8: moveElementBlock逻辑验证\n')

const moveMatch = codes.elementOps.match(/function moveElementBlock[^}]*\{([\s\S]*?)^\}/m)
if (moveMatch) {
  console.log('moveElementBlock函数:')
  const funcBody = moveMatch[1]

  // 检查行号计算
  const lineMatches = funcBody.match(/Line\s*=.*lineno.*linenoOffset/g) || []
  console.log(`  找到${lineMatches.length}个行号计算`)

  // 检查闭合标签查找
  if (funcBody.includes('closeTag')) {
    console.log('  ✅ 有闭合标签查找')
  } else {
    console.log('  ❌ 缺少闭合标签查找')
    issues.push('moveElementBlock缺少闭合标签查找')
  }
} else {
  console.log('⚠️  未找到moveElementBlock函数')
  issues.push('未找到moveElementBlock函数')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查9: setProperty逻辑验证\n')

const setPropMatch = codes.sourceView.match(/setProperty\(lineno[^}]*\{([\s\S]*?)^\s{4}\}/m)
if (setPropMatch) {
  console.log('setProperty函数:')
  const funcBody = setPropMatch[1]

  // 检查闭合标签识别
  if (funcBody.includes('<\\/') || funcBody.includes('</')) {
    console.log('  ✅ 有闭合标签识别')

    // 检查向上查找开始标签
    if (funcBody.includes('for') && funcBody.includes('i--')) {
      console.log('  ✅ 有向上查找开始标签逻辑')
    } else {
      console.log('  ⚠️  向上查找逻辑可能不完整')
    }
  } else {
    console.log('  ⚠️  可能缺少闭合标签识别')
    issues.push('setProperty可能缺少闭合标签识别')
  }
} else {
  console.log('⚠️  未找到setProperty函数')
}

console.log('\n' + '='.repeat(70))
console.log('🧪 检查10: 调用处是否传递正确参数\n')

// 检查calculateInsertLine调用
const insertLineCalls = codes.contentEditor.match(/calculateInsertLine\([^)]+\)/g) || []
console.log(`\ncalculateInsertLine调用（${insertLineCalls.length}处）:`)
insertLineCalls.forEach(call => {
  console.log(`  ${call}`)
  // 检查是否传入editor
  if (call.includes(', editor)')) {
    console.log('    ✅ 传入了editor参数')
  } else {
    console.log('    ⚠️  可能没有传入editor参数')
    issues.push(`calculateInsertLine调用可能缺少editor参数: ${call}`)
  }
})

// 检查getnodeBylineno调用
const getnodeCalls = codes.sourceView.match(/getnodeBylineno\([^)]+\)/g) || []
console.log(`\ngetnodeBylineno调用（${getnodeCalls.length}处）:`)
getnodeCalls.forEach(call => {
  console.log(`  ${call}`)
  if (call.includes(', cm)')) {
    console.log('    ✅ 传入了cm参数')
  } else {
    console.log('    ⚠️  可能没有传入cm参数')
    issues.push(`getnodeBylineno调用可能缺少cm参数: ${call}`)
  }
})

console.log('\n' + '='.repeat(70))
console.log('📊 排查总结\n')

if (issues.length === 0) {
  console.log('✅ 未发现明显问题！')
} else {
  console.log(`⚠️  发现 ${issues.length} 个潜在问题:\n`)
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue}`)
  })
}

console.log('\n' + '='.repeat(70))
console.log('💡 重点关注的问题\n')

console.log('1. 行号转换公式一致性')
console.log('   所有地方都应该使用:')
console.log('   - lineno转editor(0-based): lineno + linenoOffset - 2')
console.log('   - editor(1-based)转lineno: editorLine - linenoOffset + 1')
console.log('')

console.log('2. 自闭合标签处理')
console.log('   - calculateInsertLine需要调用expandSelfClosingTag')
console.log('   - 调用时需要传入editor参数')
console.log('')

console.log('3. 闭合标签识别')
console.log('   - getnodeBylineno需要识别</tag>行')
console.log('   - setProperty需要向上查找开始标签')
console.log('   - isMultiLineElement需要查找闭合标签')
console.log('')

console.log('4. 删除和移动范围')
console.log('   - 需要正确计算endLine（包括闭合标签）')
console.log('   - 删除时需要删除换行符（endLine+1）')
console.log('')

process.exit(issues.length > 0 ? 1 : 0)
