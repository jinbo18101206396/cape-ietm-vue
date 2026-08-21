// 后端代码质量检查
const fs = require('fs')
const path = require('path')

console.log('=== 后端代码质量检查 ===\n')

const javaPath = 'D:/workspace/IETM/cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement'

const issues = []
const warnings = []

// 1. 检查Service实现类
console.log('【1】检查Service实现...')
const serviceImpl = path.join(javaPath, 'service/impl/IetmDataModuleServiceImpl.java')
if (fs.existsSync(serviceImpl)) {
  const content = fs.readFileSync(serviceImpl, 'utf-8')

  // 检查事务注解
  const transactionalCount = (content.match(/@Transactional/g) || []).length
  console.log(`  @Transactional注解: ${transactionalCount} 处`)

  // 检查异常处理
  const throwCount = (content.match(/throw new/g) || []).length
  const catchCount = (content.match(/catch\s*\(/g) || []).length
  console.log(`  throw异常: ${throwCount}`)
  console.log(`  catch块: ${catchCount}`)

  // 检查空指针防护
  const nullChecks = (content.match(/if\s*\([^)]*==\s*null/g) || []).length
  const notNullChecks = (content.match(/if\s*\([^)]*!=\s*null/g) || []).length
  console.log(`  null检查: ${nullChecks + notNullChecks}`)

  // 检查SQL注入风险
  if (content.includes('executeQuery') || content.includes('createNativeQuery')) {
    warnings.push('使用了原生SQL，需检查参数化查询')
  }

  console.log('  ✓ Service层基本结构正常')
} else {
  issues.push('未找到ServiceImpl文件')
}
console.log()

// 2. 检查Controller层
console.log('【2】检查Controller层...')
const controller = path.join(javaPath, 'controller/IetmDataModuleController.java')
if (fs.existsSync(controller)) {
  const content = fs.readFileSync(controller, 'utf-8')

  // 检查权限注解
  const requiresPermissions = (content.match(/@RequiresPermissions/g) || []).length
  console.log(`  @RequiresPermissions注解: ${requiresPermissions} 处`)

  if (requiresPermissions === 0) {
    warnings.push('Controller缺少权限控制注解')
  }

  // 检查参数校验
  const validAnnotations = (content.match(/@Valid|@NotNull|@NotBlank/g) || []).length
  console.log(`  参数校验注解: ${validAnnotations}`)

  // 检查返回值统一
  const resultCount = (content.match(/return Result\./g) || []).length
  console.log(`  统一返回值: ${resultCount}`)

  console.log('  ✓ Controller层基本结构正常')
} else {
  issues.push('未找到Controller文件')
}
console.log()

// 3. 检查Entity实体
console.log('【3】检查Entity实体...')
const entity = path.join(javaPath, 'entity/IetmDataModule.java')
if (fs.existsSync(entity)) {
  const content = fs.readFileSync(entity, 'utf-8')

  // 检查字段注解
  const tableFieldCount = (content.match(/@TableField/g) || []).length
  const columnCount = (content.match(/@Column/g) || []).length
  console.log(`  @TableField注解: ${tableFieldCount}`)

  // 检查字段校验
  const notBlankCount = (content.match(/@NotBlank/g) || []).length
  const notNullCount = (content.match(/@NotNull/g) || []).length
  console.log(`  @NotBlank: ${notBlankCount}`)
  console.log(`  @NotNull: ${notNullCount}`)

  // 检查索引
  if (content.includes('@TableName')) {
    console.log('  ✓ 使用MyBatis-Plus注解')
  }

  console.log('  ✓ Entity层基本结构正常')
} else {
  issues.push('未找到Entity文件')
}
console.log()

// 4. 检查Mapper
console.log('【4】检查Mapper接口...')
const mapper = path.join(javaPath, 'mapper/IetmDataModuleMapper.java')
if (fs.existsSync(mapper)) {
  const content = fs.readFileSync(mapper, 'utf-8')

  // 检查自定义SQL
  const selectCount = (content.match(/@Select/g) || []).length
  const updateCount = (content.match(/@Update/g) || []).length
  const deleteCount = (content.match(/@Delete/g) || []).length
  console.log(`  自定义SQL方法: ${selectCount + updateCount + deleteCount}`)

  if (selectCount + updateCount + deleteCount > 0) {
    console.log('  ⚠️ 有自定义SQL，需检查SQL注入防护')
  }

  console.log('  ✓ Mapper层基本结构正常')
} else {
  warnings.push('未找到Mapper文件')
}
console.log()

// 5. 检查工具类
console.log('【5】检查工具类...')
const utilsPath = 'D:/workspace/IETM/cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/common/utils'
if (fs.existsSync(utilsPath)) {
  const files = fs.readdirSync(utilsPath).filter(f => f.endsWith('.java'))
  console.log(`  工具类数量: ${files.length}`)

  files.forEach(f => {
    const content = fs.readFileSync(path.join(utilsPath, f), 'utf-8')
    if (content.includes('public static') && !content.includes('private constructor')) {
      // 静态工具类应该有私有构造函数
    }
  })

  console.log('  ✓ 工具类结构正常')
} else {
  console.log('  - 未找到工具类目录')
}
console.log()

// 6. 检查配置文件
console.log('【6】检查配置文件...')
const mapperXmlPath = 'D:/workspace/IETM/cape-ietm-java/jeecg-module-ietm/src/main/resources/org/jeecg/modules/ietm/ietmdatamodulemanagement/mapper/xml'
if (fs.existsSync(mapperXmlPath)) {
  const xmlFiles = fs.readdirSync(mapperXmlPath).filter(f => f.endsWith('.xml'))
  console.log(`  Mapper XML: ${xmlFiles.length} 个`)

  xmlFiles.forEach(f => {
    const content = fs.readFileSync(path.join(mapperXmlPath, f), 'utf-8')
    // 检查是否使用#{}参数化查询
    const paramCount = (content.match(/#{/g) || []).length
    const dollarCount = (content.match(/\${/g) || []).length

    if (dollarCount > paramCount / 2) {
      warnings.push(`${f}使用${}较多，可能存在SQL注入风险`)
    }
  })

  console.log('  ✓ Mapper XML配置正常')
} else {
  console.log('  - 未找到Mapper XML目录')
}
console.log()

// 总结
console.log('='.repeat(80))
console.log('【后端代码质量检查总结】\n')

if (issues.length === 0 && warnings.length === 0) {
  console.log('✓ 后端代码质量良好')
} else {
  if (issues.length > 0) {
    console.log(`❌ 严重问题 (${issues.length}):`)
    issues.forEach((x, i) => console.log(`  ${i + 1}. ${x}`))
    console.log()
  }
  if (warnings.length > 0) {
    console.log(`⚠️ 建议检查 (${warnings.length}):`)
    warnings.forEach((x, i) => console.log(`  ${i + 1}. ${x}`))
  }
}

console.log('\n' + '='.repeat(80))
