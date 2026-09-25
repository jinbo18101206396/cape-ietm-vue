/**
 * 测试UEditor实际输出的HTML格式
 * UEditor在处理table时会添加额外的<p>标签
 */

const fs = require('fs');

function html2para_real(html) {
  console.log('=== 真实场景：UEditor输出 → XML ===\n');
  console.log('输入HTML (UEditor格式):');
  console.log(html);
  console.log('\n');

  let para = html.trim()
    .replace(/&nbsp;/g, '')
    .replace(/<br>/g, '')
    .replace(/<\/br>/g, '')
    .replace(/<br\/>/g, '')
    .replace(/\n/g, '')
    .replace(/<p><\/p>/g, '');

  console.log('Step 1: 清理后');
  console.log(para);
  console.log('\n');

  // 关键：<p> 标准化
  para = para.replace(/<p(\s[^>]*)?\>/g, '<p>');
  console.log('Step 2: <p>标准化');
  console.log(para);
  console.log('\n');

  // 🔴 第一次：</p> → </para>
  para = para.replace(/<\/p>/g, '</para>');
  console.log('Step 3: </p> → </para> (第一次)');
  console.log(para);
  console.log('  剩余</p>:', (para.match(/<\/p>/g) || []).length);
  console.log('  </para>数量:', (para.match(/<\/para>/g) || []).length);
  console.log('\n');

  // 处理列表
  para = para.replace(/<ul.*?>/g, '<ul>')
    .replace(/<ol.*?>/g, '<ol>')
    .replace(/<li(\s[^>]*)?\>/g, '<li>')
    .replace(/<\/p><ul/g, '<ul')
    .replace(/<\/p><ol/g, '<ol');

  console.log('Step 4: 处理列表');
  console.log(para);
  console.log('\n');

  // 🔴 关键步骤：处理table周围的<p>标签
  console.log('Step 5: 处理table周围的<p>');
  console.log('  执行: .replace(/<\\/table><p>/g, "</table>")');
  para = para.replace(/<\/table><p>/g, '</table>');
  console.log('  执行: .replace(/<\\/p><p><table>/g, "<table>")');
  para = para.replace(/<\/p><p><table>/g, '<table>');
  console.log('  执行: .replace(/<\\/p><table/g, "<table")');
  para = para.replace(/<\/p><table/g, '<table');
  console.log('  执行: .replace(/<\\/table><\\/p>/g, "</table>")');
  para = para.replace(/<\/table><\/p>/g, '</table>');
  console.log(para);
  console.log('  剩余<p>:', (para.match(/<p>/g) || []).length);
  console.log('  剩余</para>:', (para.match(/<\/para>/g) || []).length);
  console.log('\n');

  // 🔴 第二次：<p> → <para>
  para = para.replace(/<p>/g, '<para>');
  console.log('Step 6: <p> → <para> (第二次)');
  console.log(para);
  console.log('  <para>数量:', (para.match(/<para>/g) || []).length);
  console.log('  </para>数量:', (para.match(/<\/para>/g) || []).length);
  console.log('\n');

  // 🔴 第三次：</p> → </para>（此时应该没有</p>了）
  const remainingClosingP = (para.match(/<\/p>/g) || []).length;
  console.log('Step 7: </p> → </para> (第二次，应该无匹配)');
  console.log('  剩余</p>数量:', remainingClosingP);
  para = para.replace(/<\/p>/g, '</para>');
  console.log(para);
  console.log('  </para>数量:', (para.match(/<\/para>/g) || []).length);
  console.log('\n');

  // 处理table转换
  const normalTables = para.match(/<table(?![^>]*(?:deflist|caption)="1")[^>]*>[\s\S]*?<\/table>/g);
  console.log('Step 8: 普通table转S1000D');
  if (normalTables) {
    console.log('  找到', normalTables.length, '个table');
    normalTables.forEach((m, idx) => {
      console.log(`\n  Table ${idx + 1}:`);
      console.log('    原始:', m.substring(0, 100) + '...');
      const s1000d = convertHtmlTableToS1000D(m);
      console.log('    转换:', s1000d.substring(0, 100) + '...');
      para = para.replace(m, s1000d);
    });
  }

  console.log('\n最终结果:');
  console.log(para);

  return para;
}

function convertHtmlTableToS1000D(htmlTable) {
  let xml = htmlTable
    .replace(/<table[^>]*>/g, '<table>')
    .replace(/<tbody[^>]*>/g, '')
    .replace(/<\/tbody>/g, '')
    .replace(/<tr[^>]*>/g, '<row>')
    .replace(/<\/tr>/g, '</row>')
    .replace(/<td[^>]*>/g, '<entry>')
    .replace(/<\/td>/g, '</entry>');

  const firstRowMatch = xml.match(/<row>([\s\S]*?)<\/row>/);
  let cols = 1;
  if (firstRowMatch) {
    const entryMatches = firstRowMatch[1].match(/<entry>/g);
    cols = entryMatches ? entryMatches.length : 1;
  }

  const bodyContent = xml.replace(/<table>/, '').replace(/<\/table>/, '').trim();
  return `<table>\n  <tgroup cols="${cols}">\n    <tbody>\n${bodyContent}\n    </tbody>\n  </tgroup>\n</table>`;
}

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║   测试场景1：UEditor在table前后自动添加<p>标签           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// 场景1：UEditor常见输出 - table前后都有<p>
const ueditorHtml1 = `<p><table><tbody><tr><td></td></tr></tbody></table></p>`;
console.log('测试输入:', ueditorHtml1);
console.log('\n');
const result1 = html2para_real(ueditorHtml1);

console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   测试场景2：UEditor可能的另一种格式                      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// 场景2：table外层有p，但用户可能删除了部分内容
const ueditorHtml2 = `<p><table><tbody><tr><td>test</td></tr></tbody></table>`;
console.log('测试输入:', ueditorHtml2);
console.log('\n');
const result2 = html2para_real(ueditorHtml2);

console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║   Bug确认                                                  ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

function checkBug(xml, label) {
  const openCount = (xml.match(/<para>/g) || []).length;
  const closeCount = (xml.match(/<\/para>/g) || []).length;

  console.log(`${label}:`);
  console.log('  <para>数量:', openCount);
  console.log('  </para>数量:', closeCount);

  if (openCount !== closeCount) {
    console.log('  ❌ Bug: para标签不配对！');
    return true;
  } else if (openCount > 1) {
    console.log('  ⚠️  警告: para嵌套（虽然配对）');
    return true;
  } else {
    console.log('  ✓ 正常');
    return false;
  }
}

checkBug(result1, '场景1结果');
console.log('');
checkBug(result2, '场景2结果');
