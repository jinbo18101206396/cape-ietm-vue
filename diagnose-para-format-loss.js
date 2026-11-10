/**
 * Para设计视图保存后XML格式化丢失问题 - 诊断脚本
 *
 * 问题现象：
 * 1. 第一次点击保存 → XML有换行和缩进（正常）
 * 2. 再次打开para设计视图，点击保存 → XML变成单行（异常）
 *
 * 排查目标：
 * 1. 确认html2para返回的XML格式
 * 2. 确认formatXml的输入和输出
 * 3. 找出格式化丢失的环节
 */

const { formatXml } = require('./src/views/ietm/ietmdatamodulemanagement/editor/utils/xmlTree')

// 模拟第一次保存：dmRef XML是单行的（从对话框插入）
const dmRefXmlFirstSave = '<dmRef><dmRefAddressItems><dmCode modelIdentCode="ZB1" systemCode="A" subSystemCode="08" assyCode="00" disassyCode="00" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/><dmTitle><techName>技术手册</techName><infoName>信息说明</infoName></dmTitle></dmRefAddressItems></dmRef>'

console.log('=== 第一次保存模拟 ===')
console.log('dmRef XML (单行):', dmRefXmlFirstSave)

// 包裹para标签
const paraXmlFirstSave = `<para id="para001">\n${dmRefXmlFirstSave}\n</para>`
console.log('\n包裹para标签后:')
console.log(paraXmlFirstSave)

// 格式化
const formattedFirstSave = formatXml(paraXmlFirstSave, 2)
console.log('\nformatXml后 (第一次保存):')
console.log(formattedFirstSave)
console.log('换行符数量:', (formattedFirstSave.match(/\n/g) || []).length)

// 模拟第二次保存：dmRef XML是格式化的多行（从CodeMirror读取）
const dmRefXmlSecondSave = `<dmRef>
    <dmRefAddressItems>
      <dmCode modelIdentCode="ZB1" systemCode="A" subSystemCode="08" assyCode="00" disassyCode="00" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/>
      <dmTitle>
        <techName>技术手册</techName>
        <infoName>信息说明</infoName>
      </dmTitle>
    </dmRefAddressItems>
  </dmRef>`

console.log('\n\n=== 第二次保存模拟 ===')
console.log('dmRef XML (多行):', dmRefXmlSecondSave)

// 包裹para标签
const paraXmlSecondSave = `<para id="para001">\n${dmRefXmlSecondSave}\n</para>`
console.log('\n包裹para标签后:')
console.log(paraXmlSecondSave)

// 格式化
const formattedSecondSave = formatXml(paraXmlSecondSave, 2)
console.log('\nformatXml后 (第二次保存):')
console.log(formattedSecondSave)
console.log('换行符数量:', (formattedSecondSave.match(/\n/g) || []).length)

// 对比结果
console.log('\n\n=== 结果对比 ===')
console.log('第一次保存换行符数:', (formattedFirstSave.match(/\n/g) || []).length)
console.log('第二次保存换行符数:', (formattedSecondSave.match(/\n/g) || []).length)
console.log('结果是否一致:', formattedFirstSave === formattedSecondSave)

if (formattedFirstSave !== formattedSecondSave) {
  console.log('\n⚠️ 警告：两次保存的格式化结果不一致！')
  console.log('\n差异分析：')
  const lines1 = formattedFirstSave.split('\n')
  const lines2 = formattedSecondSave.split('\n')
  console.log('第一次行数:', lines1.length)
  console.log('第二次行数:', lines2.length)
}
