const fs = require('fs');
const path = require('path');
const glob = require('glob');

// API methods to check
const apiMethods = ['getAction', 'postAction', 'putAction', 'deleteAction'];

// Results storage
const results = {
  total: 0,
  checked: 0,
  issues: [],
  correct: [],
  warnings: []
};

/**
 * 检查文件中的API方法使用和导入
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative('D:\\workspace\\IETM\\cape-ietm-vue', filePath);

  results.total++;

  // 跳过非Vue文件的特殊处理
  if (!filePath.endsWith('.vue')) {
    results.checked++;
    return;
  }

  // 提取 <script> 标签内容
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    results.checked++;
    results.correct.push({ file: relativePath, status: 'no-script' });
    return;
  }

  const scriptContent = scriptMatch[1];

  // 提取导入部分（从script开始到export default之间）
  const importSectionMatch = scriptContent.match(/^([\s\S]*?)(?=export\s+default)/);
  const importSection = importSectionMatch ? importSectionMatch[1] : scriptContent;

  // 检查每个API方法
  const usedMethods = [];
  const importedMethods = [];
  const usageDetails = [];

  apiMethods.forEach(method => {
    // 检查方法使用（排除注释）
    const lines = scriptContent.split('\n');
    lines.forEach((line, lineIndex) => {
      // 跳过单行注释
      if (line.trim().startsWith('//')) return;

      // 检查方法调用：method(
      const methodRegex = new RegExp(`\\b${method}\\s*\\(`, 'g');
      let match;
      while ((match = methodRegex.exec(line)) !== null) {
        usedMethods.push(method);
        usageDetails.push({
          method,
          line: lineIndex + 1,
          content: line.trim()
        });
      }
    });

    // 检查导入
    // 支持多种导入形式：
    // import { getAction } from '@/api/manage'
    // import { getAction, postAction } from '@/api/manage'
    const importPatterns = [
      new RegExp(`import\\s*{[^}]*\\b${method}\\b[^}]*}\\s*from`, 'g'),
      new RegExp(`import\\s*{\\s*${method}\\s*}\\s*from`, 'g')
    ];

    if (importPatterns.some(pattern => pattern.test(importSection))) {
      importedMethods.push(method);
    }
  });

  // 去重
  const uniqueUsed = [...new Set(usedMethods)];
  const uniqueImported = [...new Set(importedMethods)];

  results.checked++;

  // 查找缺失的导入
  const missingImports = uniqueUsed.filter(m => !uniqueImported.includes(m));

  if (missingImports.length > 0) {
    // 获取缺失方法的使用详情
    const missingDetails = usageDetails.filter(d => missingImports.includes(d.method));

    results.issues.push({
      file: relativePath,
      missing: missingImports,
      usageCount: usedMethods.length,
      usageDetails: missingDetails.slice(0, 5) // 只显示前5个使用位置
    });
  } else if (uniqueUsed.length > 0) {
    results.correct.push({
      file: relativePath,
      status: 'correct',
      used: uniqueUsed,
      imported: uniqueImported
    });
  } else {
    results.correct.push({
      file: relativePath,
      status: 'no-api-usage'
    });
  }

  // 检查警告：导入但未使用
  const unusedImports = uniqueImported.filter(m => !uniqueUsed.includes(m));
  if (unusedImports.length > 0) {
    results.warnings.push({
      file: relativePath,
      unused: unusedImports,
      type: 'unused-import'
    });
  }
}

// 查找所有Vue文件
const vueFiles = glob.sync('src/**/*.vue', {
  cwd: 'D:\\workspace\\IETM\\cape-ietm-vue',
  absolute: true
});

console.log(`Found ${vueFiles.length} Vue files to check\n`);

vueFiles.forEach(checkFile);

// 生成报告
console.log('='.repeat(80));
console.log('IETM PROJECT IMPORT AUDIT REPORT (ADVANCED)');
console.log('='.repeat(80));
console.log(`\nTotal files: ${results.total}`);
console.log(`Files checked: ${results.checked}`);
console.log(`Files with issues: ${results.issues.length}`);
console.log(`Files correct: ${results.correct.length}`);
console.log(`Files with warnings: ${results.warnings.length}`);

if (results.issues.length > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('❌ CRITICAL ISSUES - MISSING IMPORTS');
  console.log('='.repeat(80));

  results.issues.forEach((issue, idx) => {
    console.log(`\n${idx + 1}. ${issue.file}`);
    console.log(`   Missing imports: ${issue.missing.join(', ')}`);
    console.log(`   Total usage count: ${issue.usageCount}`);
    console.log(`   Usage locations:`);
    issue.usageDetails.forEach(detail => {
      console.log(`     Line ${detail.line}: ${detail.content.substring(0, 80)}`);
    });
  });
}

if (results.warnings.length > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  WARNINGS - UNUSED IMPORTS');
  console.log('='.repeat(80));
  console.log(`\nTotal: ${results.warnings.length} files with unused imports`);

  results.warnings.slice(0, 10).forEach((warning, idx) => {
    console.log(`${idx + 1}. ${warning.file}`);
    console.log(`   Unused: ${warning.unused.join(', ')}`);
  });

  if (results.warnings.length > 10) {
    console.log(`   ... and ${results.warnings.length - 10} more files`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ FILES WITH CORRECT API USAGE');
console.log('='.repeat(80));

const correctWithUsage = results.correct.filter(r => r.status === 'correct');
console.log(`\nTotal: ${correctWithUsage.length} files`);
correctWithUsage.slice(0, 10).forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.file}`);
  console.log(`   ✅ Used & imported: ${item.used.join(', ')}`);
});

if (correctWithUsage.length > 10) {
  console.log(`   ... and ${correctWithUsage.length - 10} more files`);
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`\n${results.issues.length > 0 ? '❌' : '✅'} Import check ${results.issues.length > 0 ? 'FAILED' : 'PASSED'}`);
console.log(`   ${results.issues.length} file(s) with missing imports (CRITICAL)`);
console.log(`   ${results.warnings.length} file(s) with unused imports (WARNING)`);
console.log(`   ${correctWithUsage.length} file(s) with correct imports`);
console.log(`   ${results.correct.filter(r => r.status === 'no-api-usage').length} file(s) with no API usage`);

// 写入详细JSON报告
const reportPath = 'import-audit-advanced-report.json';
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Detailed report written to: ${reportPath}`);

// 退出码
process.exit(results.issues.length > 0 ? 1 : 0);
