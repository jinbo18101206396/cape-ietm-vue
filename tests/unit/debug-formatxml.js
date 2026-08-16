// 调试 formatXml（新实现）
function formatXml(xml) {
  if (!xml) return ''
  xml = xml.trim()
  const stash = []
  // 保护CDATA、注释、处理指令
  const protectedXml = xml.replace(
    /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>/g,
    m => { stash.push(m); return `@@STASH_${stash.length - 1}@@` }
  )

  const PAD = '  '
  let formatted = ''
  let indent = 0

  // 先识别内联文本元素（如 <name>text</name>）并保护
  const inlineProtected = protectedXml.replace(
    /<([a-zA-Z][\w:-]*)[^>]*>([^<]+)<\/\1>/g,
    (match) => {
      stash.push(match)
      return `@@STASH_${stash.length - 1}@@`
    }
  )

  console.log('inlineProtected:', inlineProtected)

  // 移除标签间空白
  const cleaned = inlineProtected.replace(/>\s*</g, '><')

  console.log('cleaned:', cleaned)

  // 按标签拆分并格式化
  cleaned.split(/(?=<)/).forEach(node => {
    if (!node) return
    if (/^<\/\w/.test(node)) indent = Math.max(indent - 1, 0)
    formatted += PAD.repeat(indent) + node + '\n'
    if (/^<\w[^>]*[^/]>$/.test(node) && !/^<.*<\/.*>$/.test(node)) indent++
  })

  // 恢复所有保护的内容，并trim结果
  return formatted.trim().replace(/@@STASH_(\d+)@@/g, (_, i) => stash[+i])
}

const xml = '<root><child>text</child></root>'

console.log('原始XML:')
console.log(xml)
console.log()

const formatted1 = formatXml(xml)
console.log('第1次格式化:')
console.log(formatted1)
console.log('行数:', formatted1.split('\n').length)
console.log()

const formatted2 = formatXml(formatted1)
console.log('第2次格式化:')
console.log(formatted2)
console.log('行数:', formatted2.split('\n').length)
console.log()

const formatted3 = formatXml(formatted2)
console.log('第3次格式化:')
console.log(formatted3)
console.log('行数:', formatted3.split('\n').length)
console.log()

console.log('是否稳定:', formatted2 === formatted1 && formatted3 === formatted2)
