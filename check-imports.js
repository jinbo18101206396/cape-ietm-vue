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
  correct: []
};

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative('D:\\workspace\\IETM\\cape-ietm-vue', filePath);

  results.total++;

  // Extract import section (everything before export default or first script tag end)
  const importMatch = content.match(/<script[^>]*>([\s\S]*?)(?=export\s+default|<\/script>)/);
  if (!importMatch) {
    results.checked++;
    results.correct.push({ file: relativePath, status: 'no-script' });
    return;
  }

  const importSection = importMatch[1];

  // Check which API methods are used
  const usedMethods = [];
  const importedMethods = [];

  apiMethods.forEach(method => {
    // Check if method is used (not in comments)
    const methodUsageRegex = new RegExp(`\\b${method}\\s*\\(`, 'g');
    const usages = content.match(methodUsageRegex);
    if (usages && usages.length > 0) {
      usedMethods.push({ method, count: usages.length });
    }

    // Check if method is imported
    const importRegex = new RegExp(`(?:import|{).*\\b${method}\\b.*(?:from|})`, 'g');
    if (importRegex.test(importSection)) {
      importedMethods.push(method);
    }
  });

  results.checked++;

  // Find issues: used but not imported
  const missingImports = usedMethods
    .filter(used => !importedMethods.includes(used.method))
    .map(used => used.method);

  if (missingImports.length > 0) {
    results.issues.push({
      file: relativePath,
      missing: missingImports,
      used: usedMethods
    });
  } else if (usedMethods.length > 0) {
    results.correct.push({
      file: relativePath,
      status: 'correct',
      used: usedMethods.map(u => u.method),
      imported: importedMethods
    });
  } else {
    results.correct.push({
      file: relativePath,
      status: 'no-api-usage'
    });
  }
}

// Find all Vue files
const vueFiles = glob.sync('src/views/ietm/**/*.vue', {
  cwd: 'D:\\workspace\\IETM\\cape-ietm-vue',
  absolute: true
});

console.log(`Found ${vueFiles.length} Vue files to check\n`);

vueFiles.forEach(checkFile);

// Generate report
console.log('='.repeat(80));
console.log('IETM PROJECT IMPORT AUDIT REPORT');
console.log('='.repeat(80));
console.log(`\nTotal files: ${results.total}`);
console.log(`Files checked: ${results.checked}`);
console.log(`Files with issues: ${results.issues.length}`);
console.log(`Files correct: ${results.correct.length}`);

if (results.issues.length > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('ISSUES FOUND');
  console.log('='.repeat(80));

  results.issues.forEach((issue, idx) => {
    console.log(`\n${idx + 1}. ${issue.file}`);
    console.log(`   Missing imports: ${issue.missing.join(', ')}`);
    console.log(`   Used methods:`);
    issue.used.forEach(u => {
      const status = issue.missing.includes(u.method) ? '❌' : '✅';
      console.log(`     ${status} ${u.method} (${u.count} usage(s))`);
    });
  });
}

console.log('\n' + '='.repeat(80));
console.log('FILES WITH API USAGE (CORRECT)');
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
console.log(`   ${results.issues.length} file(s) with missing imports`);
console.log(`   ${correctWithUsage.length} file(s) with correct imports`);
console.log(`   ${results.correct.filter(r => r.status === 'no-api-usage').length} file(s) with no API usage`);

// Write detailed JSON report
const reportPath = 'import-audit-report.json';
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\nDetailed report written to: ${reportPath}`);
