const fs = require('fs');
const path = require('path');

/**
 * 简单的文件验证脚本
 * 验证复制DM功能的关键文件是否存在且正确
 */

console.log('========================================');
console.log('  复制DM功能 - 文件验证');
console.log('========================================\n');

const checks = [];
let passed = 0;
let failed = 0;

// 检查函数
function check(name, condition, details = '') {
  const result = {
    name,
    passed: condition,
    details
  };
  checks.push(result);

  if (condition) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

// 1. 检查SQL文件
const sqlPath = path.join(__dirname, '../../../sql/001_add_learn_code_fields.sql');
const sqlExists = fs.existsSync(sqlPath);
check('SQL文件存在', sqlExists, sqlPath);

if (sqlExists) {
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
  check('SQL包含learn_code', sqlContent.includes('learn_code'));
  check('SQL包含learn_event_code', sqlContent.includes('learn_event_code'));
  check('SQL包含ALTER TABLE', sqlContent.includes('ALTER TABLE'));
}

// 2. 检查DmCopyModal组件
const modalPath = path.join(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/components/DmCopyModal.vue');
const modalExists = fs.existsSync(modalPath);
check('DmCopyModal组件存在', modalExists, modalPath);

if (modalExists) {
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  check('组件包含learnCode字段', modalContent.includes('learnCode'));
  check('组件包含learnEventCode字段', modalContent.includes('learnEventCode'));
  check('组件包含DMC预览', modalContent.includes('dmcPreview'));
  check('组件包含async方法', modalContent.includes('async loadSourceDmAndFill'));
  check('组件传递完整表单数据', modalContent.includes('learnCode: this.model.learnCode'));
}

// 3. 检查InfoCodeSelector组件
const selectorPath = path.join(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/components/InfoCodeSelector.vue');
const selectorExists = fs.existsSync(selectorPath);
check('InfoCodeSelector组件存在', selectorExists, selectorPath);

// 4. 检查主列表页面
const listPath = path.join(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/IetmDataModuleList.vue');
const listExists = fs.existsSync(listPath);
check('主列表页面存在', listExists, listPath);

if (listExists) {
  const listContent = fs.readFileSync(listPath, 'utf-8');
  check('列表包含copyId变量', listContent.includes('copyId'));
  check('列表包含handleCopy方法', listContent.includes('handleCopy(record)'));
  check('列表包含handleCopyNew方法', listContent.includes('handleCopyNew(record)'));
}

// 5. 检查后端文件
const basePath = path.join(__dirname, '../../../cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement');

// 实体类
const entityPath = path.join(basePath, 'entity/IetmDataModule.java');
const entityExists = fs.existsSync(entityPath);
check('实体类文件存在', entityExists, entityPath);

if (entityExists) {
  const entityContent = fs.readFileSync(entityPath, 'utf-8');
  check('实体类包含learnCode字段', entityContent.includes('private String learnCode'));
  check('实体类包含learnEventCode字段', entityContent.includes('private String learnEventCode'));
}

// VO类
const voPath = path.join(basePath, 'vo/DmCopyVO.java');
const voExists = fs.existsSync(voPath);
check('DmCopyVO文件存在', voExists, voPath);

if (voExists) {
  const voContent = fs.readFileSync(voPath, 'utf-8');
  check('VO包含learnCode字段', voContent.includes('private String learnCode'));
  check('VO包含完整字段', voContent.includes('private String sns'));
}

// Service实现
const servicePath = path.join(basePath, 'service/impl/IetmDataModuleServiceImpl.java');
const serviceExists = fs.existsSync(servicePath);
check('Service实现文件存在', serviceExists, servicePath);

if (serviceExists) {
  const serviceContent = fs.readFileSync(servicePath, 'utf-8');
  check('Service包含copyAndCreateDm方法', serviceContent.includes('public Result<?> copyAndCreateDm(DmCopyVO vo)'));
  check('Service处理学习码', serviceContent.includes('setLearnCode') && serviceContent.includes('vo.getLearnCode()'));
  check('Service生成DMC含前缀', serviceContent.includes('DMC-'));
}

// Controller
const controllerPath = path.join(basePath, 'controller/IetmDataModuleController.java');
const controllerExists = fs.existsSync(controllerPath);
check('Controller文件存在', controllerExists, controllerPath);

if (controllerExists) {
  const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
  check('Controller包含copyDm接口', controllerContent.includes('/copyDm'));
  check('Controller包含copyAndCreateDm接口', controllerContent.includes('/copyAndCreateDm'));
}

// 统计结果
console.log('\n========================================');
console.log('  验证结果');
console.log('========================================');
console.log(`总计: ${checks.length} 项`);
console.log(`✅ 通过: ${passed} 项`);
console.log(`❌ 失败: ${failed} 项`);
console.log(`通过率: ${((passed / checks.length) * 100).toFixed(1)}%`);
console.log('========================================\n');

// 退出码
process.exit(failed > 0 ? 1 : 0);
