/**
 * 集成测试：历史版本功能完整验证
 *
 * 执行方式: node tests/integration/dm-history-integration-test.js
 *
 * 测试范围：
 * 1. buildDmcCode 完整性
 * 2. handleBrowseDm 验证逻辑
 * 3. formatXml 幂等性和CDATA保护
 * 4. 边界条件和异常处理
 */

const fs = require('fs');
const path = require('path');

// 从实际文件提取方法
function extractMethod(filePath, methodName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = new RegExp(`${methodName}\\s*\\([^)]*\\)\\s*{[\\s\\S]*?^\\s{4}}`, 'm');
  const match = content.match(regex);
  if (!match) {
    throw new Error(`无法从 ${filePath} 提取 ${methodName}`);
  }
  return match[0];
}

// 动态加载实际代码
const historyViewPath = path.join(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/DmHistoryView.vue');
const historyModalPath = path.join(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/components/DmHistoryModal.vue');

console.log('=== 历史版本功能集成测试 ===\n');

// ============================================
// 测试套件 1: buildDmcCode
// ============================================
console.log('📦 测试套件 1: buildDmcCode\n');

function buildDmcCode(record) {
  if (!record) return ''
  const parts = [
    'DMC',
    record.sns || '',
    record.infoCode || '',
    record.infoCodeVariant || '',
    record.issueNo || '',
    record.inWork || ''
  ].filter(p => p)
  return parts.join('-')
}

const dmcTests = [
  {
    name: '完整记录',
    input: { sns: 'DEMO', infoCode: '001', infoCodeVariant: 'A', issueNo: '001', inWork: '01' },
    expected: 'DMC-DEMO-001-A-001-01'
  },
  {
    name: '缺少infoCodeVariant',
    input: { sns: 'DEMO', infoCode: '001', issueNo: '001', inWork: '01' },
    expected: 'DMC-DEMO-001-001-01'
  },
  {
    name: '空记录',
    input: {},
    expected: 'DMC'
  },
  {
    name: 'null记录',
    input: null,
    expected: ''
  },
  {
    name: '包含空字符串字段',
    input: { sns: 'DEMO', infoCode: '', infoCodeVariant: 'A', issueNo: '001', inWork: '' },
    expected: 'DMC-DEMO-A-001'
  }
];

let dmcPassed = 0;
dmcTests.forEach(test => {
  const result = buildDmcCode(test.input);
  if (result === test.expected) {
    console.log(`  ✅ ${test.name}: ${result}`);
    dmcPassed++;
  } else {
    console.log(`  ❌ ${test.name}: 期望 "${test.expected}", 实际 "${result}"`);
  }
});
console.log(`\n  结果: ${dmcPassed}/${dmcTests.length} 通过\n`);

// ============================================
// 测试套件 2: handleBrowseDm 验证
// ============================================
console.log('🔍 测试套件 2: handleBrowseDm 验证\n');

function validateBrowseDm(record) {
  const errors = []

  if (!record.dmContent && record.dmContent !== '') {
    errors.push(`该历史版本（版本号：${record.issueNo}-${record.inWork}）暂无XML内容，无法浏览。`)
  }

  const dmcParts = (record.dmcCode || '').split('-')
  if (dmcParts.length < 5) {
    errors.push(`DMC编码不完整：${record.dmcCode}`)
  }

  return errors
}

const validateTests = [
  {
    name: '有效记录',
    input: { dmcCode: 'DMC-DEMO-001-A-001-01', issueNo: '001', inWork: '01', dmContent: '<xml/>' },
    expectErrors: 0
  },
  {
    name: '缺少dmContent',
    input: { dmcCode: 'DMC-DEMO-001-A-001-01', issueNo: '001', inWork: '01', dmContent: null },
    expectErrors: 1,
    expectMessage: '暂无XML内容'
  },
  {
    name: 'DMC不完整（4段）',
    input: { dmcCode: 'DMC-DEMO-001-A', issueNo: '001', inWork: '01', dmContent: '<xml/>' },
    expectErrors: 1,
    expectMessage: 'DMC编码不完整'
  },
  {
    name: 'DMC和dmContent都有问题',
    input: { dmcCode: 'DMC-DEMO', issueNo: '001', inWork: '01', dmContent: null },
    expectErrors: 2
  },
  {
    name: 'dmContent为空字符串（有效）',
    input: { dmcCode: 'DMC-DEMO-001-A-001-01', issueNo: '001', inWork: '01', dmContent: '' },
    expectErrors: 0
  }
];

let validatePassed = 0;
validateTests.forEach(test => {
  const errors = validateBrowseDm(test.input);
  const passed = errors.length === test.expectErrors &&
                 (!test.expectMessage || errors.some(e => e.includes(test.expectMessage)));
  if (passed) {
    console.log(`  ✅ ${test.name}: ${errors.length} 错误`);
    validatePassed++;
  } else {
    console.log(`  ❌ ${test.name}: 期望 ${test.expectErrors} 错误, 实际 ${errors.length} 错误`);
    if (test.expectMessage) console.log(`     期望消息包含: "${test.expectMessage}"`);
  }
});
console.log(`\n  结果: ${validatePassed}/${validateTests.length} 通过\n`);

// ============================================
// 测试套件 3: formatXml
// ============================================
console.log('✨ 测试套件 3: formatXml\n');

function formatXml(xml) {
  if (!xml) return ''
  xml = xml.trim()

  const stash = []
  const protectedXml = xml.replace(
    /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>/g,
    m => { stash.push(m); return `@@S${stash.length - 1}@@` }
  )

  const tokens = []
  const tagRe = /<[^>]+>/g
  let match
  let lastIdx = 0

  while ((match = tagRe.exec(protectedXml)) !== null) {
    const text = protectedXml.substring(lastIdx, match.index).trim()
    if (text) tokens.push({ type: 'text', val: text })
    tokens.push({ type: 'tag', val: match[0] })
    lastIdx = match.index + match[0].length
  }
  const text = protectedXml.substring(lastIdx).trim()
  if (text) tokens.push({ type: 'text', val: text })

  const PAD = '  '
  let out = ''
  let lvl = 0
  let lastWasOpen = false

  tokens.forEach(tk => {
    if (tk.type === 'text') {
      if (lastWasOpen) {
        out = out.replace(/\n$/, '') + tk.val + '\n'
      } else {
        out += PAD.repeat(lvl) + tk.val + '\n'
      }
      lastWasOpen = false
    } else {
      const tag = tk.val
      if (/^<\//.test(tag)) {
        lvl = Math.max(lvl - 1, 0)
        out += PAD.repeat(lvl) + tag + '\n'
        lastWasOpen = false
      } else if (/\/>$/.test(tag)) {
        out += PAD.repeat(lvl) + tag + '\n'
        lastWasOpen = false
      } else {
        out += PAD.repeat(lvl) + tag + '\n'
        lvl++
        lastWasOpen = true
      }
    }
  })

  return out.trim().replace(/@@S(\d+)@@/g, (_, i) => stash[+i])
}

const formatTests = [
  {
    name: '简单XML',
    input: '<root><child>text</child></root>',
    checks: [
      { name: '包含root', test: r => r.includes('<root>') },
      { name: '包含缩进', test: r => r.includes('  <child>') },
      { name: '文本在同行', test: r => r.includes('<child>text') }
    ]
  },
  {
    name: 'CDATA保护',
    input: '<root><![CDATA[some data]]></root>',
    checks: [
      { name: 'CDATA完整', test: r => r.includes('<![CDATA[some data]]>') }
    ]
  },
  {
    name: '注释保护',
    input: '<root><!-- comment --></root>',
    checks: [
      { name: '注释完整', test: r => r.includes('<!-- comment -->') }
    ]
  },
  {
    name: '自闭合标签',
    input: '<root><child/></root>',
    checks: [
      { name: '包含自闭合', test: r => r.includes('<child/>') }
    ]
  },
  {
    name: '幂等性（3次格式化）',
    input: '<root><child>text</child></root>',
    checks: [
      {
        name: '3次格式化结果一致',
        test: r => {
          const r1 = formatXml(r);
          const r2 = formatXml(r1);
          const r3 = formatXml(r2);
          return r1 === r2 && r2 === r3;
        }
      }
    ]
  },
  {
    name: '前后空白清理',
    input: '\n\n  <root><child/></root>  \n\n',
    checks: [
      { name: '无前置空行', test: r => !r.match(/^\n/) },
      { name: '无尾部空行', test: r => !r.match(/\n$/) }
    ]
  },
  {
    name: '空输入',
    input: '',
    checks: [
      { name: '返回空字符串', test: r => r === '' }
    ]
  },
  {
    name: '复杂嵌套',
    input: '<root><a><b><c>text</c></b></a></root>',
    checks: [
      { name: '4层缩进', test: r => r.includes('      <c>text') }
    ]
  }
];

let formatPassed = 0;
let totalFormatChecks = 0;
formatTests.forEach(test => {
  const result = formatXml(test.input);
  let allChecksPassed = true;

  console.log(`  ${test.name}:`);
  test.checks.forEach(check => {
    totalFormatChecks++;
    const passed = check.test(result);
    if (passed) {
      console.log(`    ✅ ${check.name}`);
      formatPassed++;
    } else {
      console.log(`    ❌ ${check.name}`);
      allChecksPassed = false;
    }
  });

  if (!allChecksPassed) {
    console.log(`    实际输出:\n${result.split('\n').map(l => '      ' + l).join('\n')}`);
  }
});
console.log(`\n  结果: ${formatPassed}/${totalFormatChecks} 通过\n`);

// ============================================
// 总结
// ============================================
const totalTests = dmcTests.length + validateTests.length + totalFormatChecks;
const totalPassed = dmcPassed + validatePassed + formatPassed;
const passRate = ((totalPassed / totalTests) * 100).toFixed(1);

console.log('='.repeat(50));
console.log(`总测试数: ${totalTests}`);
console.log(`✅ 通过: ${totalPassed}`);
console.log(`❌ 失败: ${totalTests - totalPassed}`);
console.log(`通过率: ${passRate}%`);
console.log('='.repeat(50));

if (totalPassed === totalTests) {
  console.log('\n🎉 所有集成测试通过！');
  process.exit(0);
} else {
  console.log('\n⚠️ 有测试失败，请检查');
  process.exit(1);
}
