/**
 * Para包含Table往返转换Bug分析
 * 问题：</para>结束标签丢失
 */

const fs = require('fs');

// 模拟paraConverter.js的关键逻辑
function para2html_step_by_step(xml) {
  console.log('=== para2html 步骤追踪 ===\n');
  console.log('输入XML:', xml);

  let html = xml.trim();

  // Step 1: <para> → <p>
  html = html.replace(/<para/g, '<p');
  console.log('\nStep 1: <para> → <p');
  console.log(html);

  // Step 2: </para> → </p>
  html = html.replace(/<\/para>/g, '</p>');
  console.log('\nStep 2: </para> → </p>');
  console.log(html);

  // Step 3: S1000D table标签移除（para2html中实际没有这步，table保持原样）
  // 注意：para2html并不处理<tgroup>等标签

  return html;
}

function html2para_step_by_step(html) {
  console.log('\n\n=== html2para 步骤追踪 ===\n');
  console.log('输入HTML:', html);

  let para = html.trim();

  // Step 1: 清理换行和空格
  para = para.replace(/&nbsp;/g, '')
    .replace(/<br>/g, '')
    .replace(/<\/br>/g, '')
    .replace(/<br\/>/g, '')
    .replace(/\n/g, '');
  console.log('\nStep 1: 清理换行');
  console.log(para);

  // Step 2: <p> → <p>（标准化）
  para = para.replace(/<p(\s[^>]*)?\>/g, '<p>');
  console.log('\nStep 2: 标准化<p>');
  console.log(para);

  // Step 3: </p> → </para>  🔴 关键步骤
  para = para.replace(/<\/p>/g, '</para>');
  console.log('\nStep 3: </p> → </para> 🔴 第一次替换');
  console.log(para);
  console.log('  </para>数量:', (para.match(/<\/para>/g) || []).length);

  // Step 4-10: 列表等其他转换（跳过）

  // Step 11: 处理table相关
  para = para.replace(/<\/table><p>/g, '</table>')
    .replace(/<\/p><p><table>/g, '<table>')
    .replace(/<\/p><table/g, '<table')
    .replace(/<\/table><\/p>/g, '</table>');  // 🔴 关键！移除table后的</p>
  console.log('\nStep 11: 处理table周围的<p>标签');
  console.log(para);
  console.log('  </para>数量:', (para.match(/<\/para>/g) || []).length);

  // Step 12: <p> → <para>  🔴 第二次转换
  para = para.replace(/<p>/g, '<para>');
  console.log('\nStep 12: <p> → <para> 🔴 开始标签转换');
  console.log(para);
  console.log('  <para>数量:', (para.match(/<para>/g) || []).length);
  console.log('  </para>数量:', (para.match(/<\/para>/g) || []).length);

  // Step 13: </p> → </para>  🔴 第二次替换（但前面已经替换过了！）
  para = para.replace(/<\/p>/g, '</para>');
  console.log('\nStep 13: </p> → </para> 🔴 第二次替换（应该无匹配）');
  console.log(para);
  console.log('  </para>数量:', (para.match(/<\/para>/g) || []).length);

  // Step 14: 处理普通table → S1000D table
  const normalTables = para.match(/<table(?![^>]*(?:deflist|caption)="1")[^>]*>[\s\S]*?<\/table>/g);
  console.log('\nStep 14: 检测普通table');
  console.log('  匹配到的table:', normalTables ? normalTables.length : 0);

  if (normalTables) {
    normalTables.forEach(m => {
      console.log('\n  原始table:', m);
      let s1000d = convertHtmlTableToS1000D(m);
      console.log('  S1000D table:', s1000d);
      para = para.replace(m, s1000d);
    });
  }

  console.log('\nStep 14: table转换后');
  console.log(para);

  return para;
}

function convertHtmlTableToS1000D(htmlTable) {
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
    .replace(/<\/td>/g, '</entry>');

  // 计算列数
  const firstRowMatch = xml.match(/<row>([\s\S]*?)<\/row>/);
  let cols = 1;
  if (firstRowMatch) {
    const entryMatches = firstRowMatch[1].match(/<entry>/g);
    cols = entryMatches ? entryMatches.length : 1;
  }

  // 检测thead
  const hasTheadMatch = xml.match(/<thead>([\s\S]*?)<\/thead>/);
  const hasTheadSection = hasTheadMatch && hasTheadMatch[0].includes('<row>');

  let s1000dTable = '';
  if (hasTheadSection) {
    const theadContent = hasTheadMatch[0];
    const restContent = xml.replace(/<table>/, '').replace(/<\/table>/, '').replace(theadContent, '').trim();
    s1000dTable = `<table>
  <tgroup cols="${cols}">
${theadContent}
    <tbody>
${restContent}
    </tbody>
  </tgroup>
</table>`;
  } else {
    const bodyContent = xml.replace(/<table>/, '').replace(/<\/table>/, '').trim();
    s1000dTable = `<table>
  <tgroup cols="${cols}">
    <tbody>
${bodyContent}
    </tbody>
  </tgroup>
</table>`;
  }

  return s1000dTable;
}

// ===== 测试用例 =====
console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
console.log('┃   Para包含Table往返转换Bug - 根因分析              ┃');
console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

const originalXml = `<para>
  <table>
    <tgroup cols="1">
      <tbody>
        <row></row>
      </tbody>
    </tgroup>
  </table>
</para>`;

// 第一步：XML → HTML
const html = para2html_step_by_step(originalXml);

// 第二步：HTML → XML
const resultXml = html2para_step_by_step(html);

// 结果对比
console.log('\n\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
console.log('┃   结果对比                                          ┃');
console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
console.log('\n原始XML:');
console.log(originalXml);
console.log('\n最终XML:');
console.log(resultXml);

console.log('\n统计:');
console.log('  原始<para>数量:', (originalXml.match(/<para>/g) || []).length);
console.log('  结果<para>数量:', (resultXml.match(/<para>/g) || []).length);
console.log('  原始</para>数量:', (originalXml.match(/<\/para>/g) || []).length);
console.log('  结果</para>数量:', (resultXml.match(/<\/para>/g) || []).length);

console.log('\n🔴 Bug确认:');
if ((resultXml.match(/<para>/g) || []).length !== (resultXml.match(/<\/para>/g) || []).length) {
  console.log('  ❌ para标签不配对！开始标签和结束标签数量不一致');
  console.log('  ❌ 这会导致XML格式错误');
}

if ((resultXml.match(/<para>/g) || []).length > (originalXml.match(/<para>/g) || []).length) {
  console.log('  ❌ para标签嵌套！出现了多余的<para>标签');
}
