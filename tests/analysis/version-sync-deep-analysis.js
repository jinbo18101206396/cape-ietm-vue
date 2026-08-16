/**
 * 深度排查报告：版本号不一致的所有根源
 *
 * 目标：从数据创建、保存、签入签出全流程排查版本号同步问题
 */

console.log('=== 版本号不一致深度排查报告 ===\n')

const issues = []
const rootCauses = []

console.log('📦 场景1: DM内容保存流程\n')

console.log('问题点1.1: saveContent方法')
console.log('  位置: IetmDmContentServiceImpl.saveContent()')
console.log('  代码:')
console.log('    IetmDataModule update = new IetmDataModule();')
console.log('    update.setId(id);')
console.log('    update.setDmContent(content);  // ❌ 只保存XML内容')
console.log('    // 缺失: 未解析XML提取issueNumber并同步到issueNo字段')
console.log('')
console.log('  ❌ 问题: 用户编辑XML修改了issueNumber，但数据库issueNo字段未更新')
console.log('')

rootCauses.push({
  id: 1,
  scene: 'DM内容保存',
  problem: 'saveContent只保存dm_content，不同步issueNo',
  impact: 'XML内部版本号与数据库字段不一致',
  solution: '保存时解析XML提取issueNumber/inWork，同步到数据库字段'
})

console.log('问题点1.2: 用户可以手动编辑issueInfo标签')
console.log('  场景: 用户在编辑器中修改<issueInfo issueNumber="001" inWork="05" />')
console.log('  结果: XML保存成功，但数据库issueNo仍是旧值')
console.log('')

console.log('='.repeat(60))
console.log('\n📦 场景2: DM签入流程\n')

console.log('问题点2.1: 签入时版本号更新')
console.log('  预期流程:')
console.log('    1. 数据库issueNo + 1 或 inWork + 1')
console.log('    2. 同步更新XML内<issueInfo>标签')
console.log('')
console.log('  ❌ 实际: 可能只更新了数据库，未更新XML')
console.log('')

rootCauses.push({
  id: 2,
  scene: 'DM签入',
  problem: '签入时数据库版本号更新，XML内容未同步',
  impact: '新版本的XML仍保留旧版本号',
  solution: '签入时强制同步XML中的issueInfo标签'
})

console.log('='.repeat(60))
console.log('\n📦 场景3: DM复制流程\n')

console.log('问题点3.1: 复制DM时继承XML内容')
console.log('  场景: 从DMC-A复制创建DMC-B')
console.log('  步骤:')
console.log('    1. 复制A的dm_content到B')
console.log('    2. B的issueNo设为001, inWork设为00')
console.log('    3. ❌ B的XML内部仍是<issueInfo issueNumber="005" inWork="10" />')
console.log('')

rootCauses.push({
  id: 3,
  scene: 'DM复制',
  problem: '复制时XML内容原样拷贝，未更新issueInfo',
  impact: '新DM的XML包含旧DM的版本号',
  solution: '复制时替换XML中的issueInfo标签'
})

console.log('='.repeat(60))
console.log('\n📦 场景4: 历史版本创建\n')

console.log('问题点4.1: 创建历史版本时的版本号')
console.log('  场景: 签入时创建历史版本记录')
console.log('  可能情况:')
console.log('    情况A: 复制当前记录，issueNo/inWork/dm_content全部复制')
console.log('      → XML内容与数据库字段保持一致 ✓')
console.log('    情况B: 手动构造历史记录，设置新issueNo但不更新XML')
console.log('      → XML内容与数据库字段不一致 ❌')
console.log('')

rootCauses.push({
  id: 4,
  scene: '历史版本创建',
  problem: '创建历史版本时未确保XML与数据库一致',
  impact: '历史版本列表显示的版本号与XML不符',
  solution: '创建历史版本时强制同步XML和数据库'
})

console.log('='.repeat(60))
console.log('\n📦 场景5: DM导入流程\n')

console.log('问题点5.1: 导入XML文件')
console.log('  场景: 从外部导入XML文件')
console.log('  步骤:')
console.log('    1. 解析XML提取DMC信息')
console.log('    2. 解析<issueInfo>提取版本号')
console.log('    3. 保存到数据库issueNo/inWork字段')
console.log('    4. 保存原始XML到dm_content')
console.log('  结果: 应该是一致的 ✓')
console.log('')
console.log('  ❌ 但如果解析逻辑有BUG，也可能不一致')
console.log('')

console.log('='.repeat(60))
console.log('\n📋 根本原因总结\n')

console.log('核心问题：')
console.log('  1. ❌ 数据库字段(issueNo/inWork)与XML内容(issueInfo标签)是独立维护的')
console.log('  2. ❌ 没有强制同步机制保证两者一致')
console.log('  3. ❌ 多个流程(保存/签入/复制)都可能导致不一致')
console.log('')

console.log('风险点：')
rootCauses.forEach((rc, idx) => {
  console.log(`  ${idx + 1}. [${rc.scene}] ${rc.problem}`)
})
console.log('')

console.log('='.repeat(60))
console.log('\n✅ 源头解决方案\n')

console.log('方案1: 双向同步机制（推荐）')
console.log('  原则: 以数据库为准，XML自动跟随')
console.log('')
console.log('  实施点:')
console.log('    A. saveContent保存后')
console.log('       - 解析XML提取issueNumber/inWork')
console.log('       - 与数据库字段对比')
console.log('       - 不一致时自动修正XML中的issueInfo标签')
console.log('       - 重新保存修正后的XML')
console.log('')
console.log('    B. 签入时')
console.log('       - 更新数据库issueNo/inWork')
console.log('       - 同步替换XML中的<issueInfo>标签')
console.log('       - 保存更新后的XML')
console.log('')
console.log('    C. 复制DM时')
console.log('       - 复制dm_content后')
console.log('       - 替换XML中的issueInfo为新版本号')
console.log('       - 保存修正后的XML')
console.log('')
console.log('    D. 创建历史版本时')
console.log('       - 确保issueNo/inWork与XML一致后再保存')
console.log('')

console.log('方案2: 单一数据源（根治）')
console.log('  原则: 取消数据库issueNo/inWork字段，统一从XML解析')
console.log('')
console.log('  优点: 数据唯一，永不不一致')
console.log('  缺点: 需要大量改动，查询性能下降')
console.log('  评估: 改动太大，不推荐')
console.log('')

console.log('方案3: 后端强制校验（辅助）')
console.log('  - 每次加载DM时校验一致性')
console.log('  - 不一致时自动修正或拒绝加载')
console.log('  - 定期扫描修复历史数据')
console.log('')

console.log('='.repeat(60))
console.log('\n📌 推荐实施计划\n')

console.log('第1步: 立即修复（P0）')
console.log('  ✅ 已完成: 添加前端警告提示')
console.log('  待实施: 后端saveContent自动同步')
console.log('')

console.log('第2步: 修复存量（P1）')
console.log('  - 编写批量修复脚本')
console.log('  - 扫描所有不一致记录')
console.log('  - 以数据库为准修正XML')
console.log('')

console.log('第3步: 预防新增（P1）')
console.log('  - 签入时强制同步')
console.log('  - 复制时强制替换')
console.log('  - 添加后端校验')
console.log('')

console.log('第4步: 长期监控（P2）')
console.log('  - 定期扫描一致性')
console.log('  - 监控告警')
console.log('  - 健康报告')
console.log('')

console.log('='.repeat(60))
console.log('\n💡 技术实现要点\n')

console.log('XML解析正则：')
console.log('  const match = xml.match(')
console.log('    /<issueInfo[^>]*issueNumber\\s*=\\s*["\']([^"\']+)["\'][^>]*inWork\\s*=\\s*["\']([^"\']+)["\'][^>]*>/i')
console.log('  )')
console.log('')

console.log('XML替换正则：')
console.log('  xml = xml.replace(')
console.log('    /<issueInfo[^>]*\\/>/gi,')
console.log('    `<issueInfo issueNumber="${issueNo}" inWork="${inWork}"/>`')
console.log('  )')
console.log('')

console.log('Java实现示例：')
console.log('  // 1. 提取当前数据库版本号')
console.log('  String dbIssueNo = dm.getIssueNo();')
console.log('  String dbInWork = dm.getInWork();')
console.log('')
console.log('  // 2. 替换XML中的issueInfo')
console.log('  String content = dm.getDmContent();')
console.log('  Pattern pattern = Pattern.compile(')
console.log('    "<issueInfo[^>]*/>"')
console.log('  );')
console.log('  String newTag = String.format(')
console.log('    "<issueInfo issueNumber=\\"%s\\" inWork=\\"%s\\"/>",')
console.log('    dbIssueNo, dbInWork')
console.log('  );')
console.log('  content = pattern.matcher(content).replaceAll(newTag);')
console.log('')
console.log('  // 3. 保存修正后的XML')
console.log('  update.setDmContent(content);')
console.log('')

console.log('='.repeat(60))
console.log('\n✅ 结论\n')

console.log('根本原因：')
console.log('  数据库字段与XML内容独立维护，缺少同步机制')
console.log('')

console.log('核心解决方案：')
console.log('  在所有修改点（保存/签入/复制）强制同步版本号')
console.log('')

console.log('优先级：')
console.log('  P0: saveContent自动同步（最高频）')
console.log('  P1: 签入和复制流程同步')
console.log('  P2: 批量修复历史数据')
console.log('')

console.log(`发现${rootCauses.length}个根源问题`)
console.log('')

process.exit(0)
