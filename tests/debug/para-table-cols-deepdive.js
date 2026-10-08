/**
 * 复现"Invalid count value: -1"错误
 *
 * 测试策略：
 * 1. 测试各种UEditor可能生成的表格HTML
 * 2. 分析哪种HTML会导致cols计算错误
 * 3. 定位根本原因
 */

// 引入实际的paraConverter.js代码片段
function convertHtmlTableToS1000D(htmlTable) {
  console.log('[convertHtmlTableToS1000D] 输入HTML table:', htmlTable.substring(0, 200))

  // 1. 移除HTML属性和标签，转换为S1000D元素
  let xml = htmlTable
    .replace(/<table[^>]*>/g, '<table>')
    .replace(/<tbody[^>]*>/g, '')
    .replace(/<\/tbody>/g, '')
    .replace(/<thead[^>]*>/g, '<thead>')
    .replace(/<tr[^>]*>/g, '<row>')
    .replace(/<\/tr>/g, '</row>')
    .replace(/<th(\s[^>]*)?\>/g, '<entry>')
    .replace(/<\/th>/g, '</entry>')
    .replace(/<td[^>]*>/g, '<entry>')
    .replace(/<\/td>/g, '</entry>')

  console.log('[Step 1] 转换后的XML:', xml)

  // 2. 计算列数（从第一个row中统计entry数量）
  const firstRowMatch = xml.match(/<row>([\s\S]*?)<\/row>/)
  let cols = 1

  console.log('[Step 2] firstRowMatch:', firstRowMatch)

  if (firstRowMatch) {
    const entryMatches = firstRowMatch[1].match(/<entry>/g)
    console.log('[Step 3] entryMatches:', entryMatches)
    cols = entryMatches ? entryMatches.length : 1
    console.log('[Step 4] 计算的cols:', cols, '类型:', typeof cols)
  } else {
    console.warn('[convertHtmlTableToS1000D] 未找到<row>，使用默认cols=1')
  }

  // 防御性检查
  if (!Number.isInteger(cols) || cols < 1) {
    console.error('[convertHtmlTableToS1000D] ❌ cols值无效:', cols, '类型:', typeof cols, '强制设为1')
    cols = 1
  }

  // 3. 检测是否有thead
  const hasTheadMatch = xml.match(/<thead>([\s\S]*?)<\/thead>/)
  const hasTheadSection = hasTheadMatch && hasTheadMatch[0].includes('<row>')

  // 4. 构建S1000D结构
  let s1000dTable = ''

  if (hasTheadSection) {
    const theadContent = hasTheadMatch[0]
    const restContent = xml.replace(/<table>/, '').replace(/<\/table>/, '').replace(theadContent, '').trim()

    s1000dTable = `<table>
  <tgroup cols="${cols}">
${theadContent.split('\n').map(line => '    ' + line).join('\n')}
    <tbody>
${restContent.split('\n').map(line => '      ' + line).join('\n')}
    </tbody>
  </tgroup>
</table>`
  } else {
    const bodyContent = xml.replace(/<table>/, '').replace(/<\/table>/, '').trim()

    s1000dTable = `<table>
  <tgroup cols="${cols}">
    <tbody>
${bodyContent.split('\n').map(line => '      ' + line).join('\n')}
    </tbody>
  </tgroup>
</table>`
  }

  console.log('[Step 5] 输出S1000D table:', s1000dTable.substring(0, 300))

  // 验证cols属性
  const colsMatch = s1000dTable.match(/cols="([^"]*)"/)
  if (colsMatch) {
    const colsValue = colsMatch[1]
    console.log('[Step 6] 最终cols值:', colsValue)

    if (colsValue === '-1') {
      console.error('❌❌❌ 发现问题：cols="-1"！')
    }
  }

  return s1000dTable
}

console.log('========================================')
console.log('开始测试：寻找导致cols=-1的HTML结构')
console.log('========================================\n')

// 测试1：UEditor默认插入的2x2表格
console.log('【测试1】UEditor默认2x2表格')
const test1 = `<table>
<tbody>
<tr><td width="123" valign="top" style="word-break: break-all;border:1px solid #000000;"><br></td><td width="123" valign="top" style="word-break: break-all;border:1px solid #000000;"><br></td></tr>
<tr><td width="123" valign="top" style="word-break: break-all;border:1px solid #000000;"><br></td><td width="123" valign="top" style="word-break: break-all;border:1px solid #000000;"><br></td></tr>
</tbody>
</table>`
convertHtmlTableToS1000D(test1)

console.log('\n【测试2】UEditor 3x3表格')
const test2 = `<table>
<tbody>
<tr><td><br></td><td><br></td><td><br></td></tr>
<tr><td><br></td><td><br></td><td><br></td></tr>
<tr><td><br></td><td><br></td><td><br></td></tr>
</tbody>
</table>`
convertHtmlTableToS1000D(test2)

console.log('\n【测试3】带thead的表格')
const test3 = `<table>
<thead>
<tr><th>Header 1</th><th>Header 2</th></tr>
</thead>
<tbody>
<tr><td>Cell 1</td><td>Cell 2</td></tr>
</tbody>
</table>`
convertHtmlTableToS1000D(test3)

console.log('\n【测试4】UEditor可能的边界情况：只有一个cell')
const test4 = `<table><tbody><tr><td><br></td></tr></tbody></table>`
convertHtmlTableToS1000D(test4)

console.log('\n【测试5】表格中有合并单元格（colspan）')
const test5 = `<table>
<tbody>
<tr><td colspan="2">Merged Cell</td></tr>
<tr><td>Cell 1</td><td>Cell 2</td></tr>
</tbody>
</table>`
convertHtmlTableToS1000D(test5)

console.log('\n【测试6】表格中有合并单元格（rowspan）')
const test6 = `<table>
<tbody>
<tr><td rowspan="2">Merged Cell</td><td>Cell 2</td></tr>
<tr><td>Cell 3</td></tr>
</tbody>
</table>`
convertHtmlTableToS1000D(test6)

console.log('\n【测试7】嵌套表格')
const test7 = `<table>
<tbody>
<tr><td>Cell 1</td><td><table><tbody><tr><td>Inner</td></tr></tbody></table></td></tr>
</tbody>
</table>`
convertHtmlTableToS1000D(test7)

console.log('\n【测试8】UEditor可能生成的空表格（已观察到）')
const test8 = `<table><tbody></tbody></table>`
convertHtmlTableToS1000D(test8)

console.log('\n【测试9】表格第一行为空，第二行有内容')
const test9 = `<table>
<tbody>
<tr></tr>
<tr><td>Cell 1</td><td>Cell 2</td></tr>
</tbody>
</table>`
convertHtmlTableToS1000D(test9)

console.log('\n【测试10】自闭合td标签（浏览器可能生成）')
const test10 = `<table><tbody><tr><td/><td/></tr></tbody></table>`
convertHtmlTableToS1000D(test10)

console.log('\n========================================')
console.log('所有测试完成')
console.log('========================================')
