#!/usr/bin/env node

/**
 * ICN预览功能快速验证脚本
 * 使用方法：node quick-verify-preview.js
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('ICN 预览功能快速验证');
console.log('='.repeat(60));
console.log();

// 检查项目结构
console.log('📋 检查1：代码文件结构');
const files = [
  'src/views/ietm/icnmanage/IetmIcnManageList.vue',
  'src/views/ietm/icnmanage/modules/IetmIcnManageModal.vue',
  'src/views/ietm/icnmanage/modules/IetmIcnManageForm.vue',
  'src/views/ietm/playertool/playVideo.vue',
  'src/views/ietm/playertool/playAudio.vue',
  'src/views/ietm/playertool/playImg.vue'
];

let allFilesExist = true;
files.forEach(file => {
  const filePath = path.join('D:', 'workspace', 'IETM', 'cape-ietm-vue', file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.log('\n❌ 部分文件缺失，请检查项目完整性');
  process.exit(1);
}

console.log('\n✅ 所有必需文件存在\n');

// 检查关键代码实现
console.log('📋 检查2：预览功能代码实现');

const mainListFile = path.join('D:', 'workspace', 'IETM', 'cape-ietm-vue', 'src/views/ietm/icnmanage/IetmIcnManageList.vue');
const content = fs.readFileSync(mainListFile, 'utf-8');

const checks = [
  { name: '浏览按钮', pattern: /button.*浏览|@click="handleView"/, desc: '检查是否有浏览按钮' },
  { name: 'handleView方法', pattern: /handleView\s*\(\s*\)\s*{/, desc: '检查预览方法是否存在' },
  { name: '图片格式支持', pattern: /\.jpg.*\.jpeg.*\.png.*\.gif.*\.bmp/s, desc: '检查图片格式支持' },
  { name: '视频格式支持', pattern: /\.mp4.*\.avi.*\.mov.*\.webm.*\.wmv/s, desc: '检查视频格式支持（包含新增的wmv）' },
  { name: '音频格式支持', pattern: /\.mp3/, desc: '检查音频格式支持' },
  { name: 'PlayVideo组件', pattern: /playVideo/, desc: '检查视频播放器组件引用' },
  { name: 'PlayAudio组件', pattern: /playAudio/, desc: '检查音频播放器组件引用' },
  { name: 'PlayImg组件', pattern: /playImg/, desc: '检查图片查看器组件引用' },
  { name: '缓存机制', pattern: /nocached/, desc: '检查缓存控制机制' },
  { name: '错误提示', pattern: /该ICN没有关联的实体文件|不支持预览/, desc: '检查错误提示消息' }
];

let allChecksPass = true;
checks.forEach(check => {
  const pass = check.pattern.test(content);
  console.log(`  ${pass ? '✅' : '❌'} ${check.name}: ${check.desc}`);
  if (!pass) allChecksPass = false;
});

if (!allChecksPass) {
  console.log('\n❌ 部分代码检查未通过');
} else {
  console.log('\n✅ 所有代码检查通过\n');
}

// 检查组件文件
console.log('📋 检查3：播放器组件文件');
const components = [
  { name: 'PlayVideo', path: 'src/views/ietm/playertool/playVideo.vue' },
  { name: 'PlayAudio', path: 'src/views/ietm/playertool/playAudio.vue' },
  { name: 'PlayImg', path: 'src/views/ietm/playertool/playImg.vue' }
];

let allComponentsExist = true;
components.forEach(comp => {
  const filePath = path.join('D:', 'workspace', 'IETM', 'cape-ietm-vue', comp.path);
  const exists = fs.existsSync(filePath);

  if (exists) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasTemplate = /<template>/.test(content);
    const hasScript = /<script>/.test(content);
    console.log(`  ${hasTemplate && hasScript ? '✅' : '⚠️'} ${comp.name}: ${exists ? '文件存在' : '文件缺失'}`);
    if (!hasTemplate || !hasScript) {
      console.log(`     ⚠️ 组件可能不完整（缺少 template 或 script）`);
    }
  } else {
    console.log(`  ❌ ${comp.name}: 文件缺失`);
    allComponentsExist = false;
  }
});

if (!allComponentsExist) {
  console.log('\n❌ 部分播放器组件缺失');
} else {
  console.log('\n✅ 所有播放器组件存在\n');
}

// 检查参数传递修复
console.log('📋 检查4：新增ICN参数传递');
const modalFile = path.join('D:', 'workspace', 'IETM', 'cape-ietm-vue', 'src/views/ietm/icnmanage/modules/IetmIcnManageModal.vue');
const modalContent = fs.readFileSync(modalFile, 'utf-8');

const modalChecks = [
  {
    name: 'add方法接收projectInfo',
    pattern: /add\s*\(\s*cmnodeId\s*,\s*projectInfo\s*\)/,
    desc: '检查add方法是否接收projectInfo参数'
  },
  {
    name: 'projectInfo传递给表单',
    pattern: /realForm\.add\s*\(\s*cmnodeId\s*,\s*projectInfo\s*\)/,
    desc: '检查是否将projectInfo传递给内部表单'
  }
];

let modalCheckPass = true;
modalChecks.forEach(check => {
  const pass = check.pattern.test(modalContent);
  console.log(`  ${pass ? '✅' : '❌'} ${check.name}`);
  if (!pass) modalCheckPass = false;
});

if (modalCheckPass) {
  console.log('\n✅ 参数传递修复正确\n');
} else {
  console.log('\n❌ 参数传递可能有问题\n');
}

// 生成测试总结
console.log('='.repeat(60));
console.log('验证总结');
console.log('='.repeat(60));

const summary = {
  '文件结构': allFilesExist,
  '代码实现': allChecksPass,
  '播放器组件': allComponentsExist,
  '参数传递': modalCheckPass
};

let allPass = true;
Object.entries(summary).forEach(([key, value]) => {
  console.log(`  ${value ? '✅' : '❌'} ${key}: ${value ? '通过' : '未通过'}`);
  if (!value) allPass = false;
});

console.log();
if (allPass) {
  console.log('✅ 所有验证通过！预览功能代码实现完整。');
  console.log();
  console.log('📝 下一步：');
  console.log('  1. 启动开发服务器：npm run serve');
  console.log('  2. 在浏览器中测试预览功能');
  console.log('  3. 上传不同格式的测试文件');
  console.log('  4. 点击"浏览"按钮验证预览效果');
  process.exit(0);
} else {
  console.log('❌ 部分验证未通过，请检查相关代码。');
  process.exit(1);
}
