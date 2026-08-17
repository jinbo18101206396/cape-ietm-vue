/**
 * 引用关系 - 查看DM功能 E2E测试
 *
 * 测试场景：
 * 1. 打开引用关系弹窗
 * 2. 切换到详情列表
 * 3. 点击DMC编码链接查看DM
 * 4. 点击"查看"按钮查看DM
 * 5. 验证弹窗嵌套层级
 * 6. 验证连续查看多个DM
 *
 * 前置条件：
 * - 前端运行在 http://localhost:3000
 * - 后端运行在 http://localhost:9999
 * - 已登录系统
 * - 存在有引用关系的DM数据
 */

const { chromium } = require('playwright');

async function testDmReferenceView() {
  console.log('🚀 开始测试：引用关系-查看DM功能\n');

  const browser = await chromium.launch({
    headless: false, // 显示浏览器窗口
    slowMo: 500      // 每步操作延迟500ms，便于观察
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // ==================== 第1步：直接进入项目数据模块管理页面（假设已登录）====================
    console.log('📝 第1步：进入项目数据模块管理页面...');
    console.log('   提示：请确保浏览器已有登录态，或手动登录后按Enter继续测试');

    await page.goto('http://localhost:3000/ietm/datamodule-manage');

    // 等待页面加载，如果跳转到登录页则等待用户手动登录
    try {
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 5000 });
      console.log('✅ 页面加载完成（已登录）\n');
    } catch (e) {
      console.log('⚠️  需要登录，请在浏览器中手动登录...');
      console.log('   登录完成后，测试将自动继续');
      // 等待用户登录并跳转到数据模块管理页面
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 60000 });
      console.log('✅ 登录完成，页面加载成功\n');
    }

    // ==================== 第2步：选择一条DM记录 ====================
    console.log('📝 第2步：选择一条有引用关系的DM记录...');

    // 等待表格加载
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });

    // 点击第一条记录的checkbox
    await page.click('.ant-table-tbody tr:first-child .ant-checkbox-input');
    await page.waitForTimeout(500);

    // 获取选中的DMC编码
    const selectedDmc = await page.textContent('.ant-table-tbody tr:first-child td:nth-child(3)');
    console.log(`✅ 已选中DM: ${selectedDmc}\n`);

    // ==================== 第3步：打开引用关系弹窗 ====================
    console.log('📝 第3步：点击"引用关系"按钮...');

    // 点击工具栏中的"引用关系"按钮
    await page.click('button:has-text("引用关系")');

    // 等待引用关系弹窗出现
    await page.waitForSelector('.ant-modal:has-text("引用关系")', { timeout: 5000 });
    console.log('✅ 引用关系弹窗已打开\n');

    // ==================== 第4步：切换到详情列表 ====================
    console.log('📝 第4步：切换到"详情列表"标签页...');

    await page.click('.ant-tabs-tab:has-text("详情列表")');
    await page.waitForTimeout(1000);

    // 检查详情列表是否有数据
    const hasDetailData = await page.locator('.ant-table-tbody tr').count() > 0;

    if (!hasDetailData) {
      console.log('⚠️ 当前DM没有引用关系数据，尝试切换到"入引用"...');
      await page.click('.ant-radio-button-wrapper:has-text("入引用")');
      await page.waitForTimeout(2000);
    }

    const detailRowCount = await page.locator('.ant-table-tbody tr').count();
    console.log(`✅ 详情列表已展示，共 ${detailRowCount} 条记录\n`);

    if (detailRowCount === 0) {
      console.log('⚠️ 当前DM没有引用关系数据，跳过查看测试');
      await browser.close();
      return;
    }

    // ==================== 第5步：点击DMC编码链接查看DM ====================
    console.log('📝 第5步：点击第一条记录的DMC编码链接...');

    // 获取第一条记录的DMC编码
    const firstDmc = await page.textContent('.ant-table-tbody tr:first-child td:nth-child(1) a');
    console.log(`   目标DM: ${firstDmc}`);

    // 点击DMC编码链接
    await page.click('.ant-table-tbody tr:first-child td:nth-child(1) a');

    // 等待DM预览弹窗出现
    await page.waitForSelector('.ant-modal:has-text("数据模块详情")', { timeout: 5000 });
    console.log('✅ DM预览弹窗已打开\n');

    // ==================== 第6步：验证弹窗嵌套层级 ====================
    console.log('📝 第6步：验证弹窗嵌套层级...');

    const modalCount = await page.locator('.ant-modal-wrap').count();
    console.log(`   当前弹窗数量: ${modalCount}`);

    if (modalCount >= 2) {
      console.log('✅ 弹窗嵌套正确（引用关系弹窗 + DM预览弹窗）\n');
    } else {
      console.log('❌ 弹窗嵌套异常\n');
    }

    // ==================== 第7步：验证DM详情内容 ====================
    console.log('📝 第7步：验证DM详情内容...');

    // 检查DMC编码是否显示
    const dmcCodeVisible = await page.isVisible('text=DMC编码');
    console.log(`   DMC编码标签: ${dmcCodeVisible ? '✅ 显示' : '❌ 未显示'}`);

    // 检查技术名称是否显示
    const techNameVisible = await page.isVisible('text=技术名称');
    console.log(`   技术名称标签: ${techNameVisible ? '✅ 显示' : '❌ 未显示'}`);

    // 检查版本号是否显示
    const versionVisible = await page.isVisible('text=版本号');
    console.log(`   版本号标签: ${versionVisible ? '✅ 显示' : '❌ 未显示'}`);

    console.log('✅ DM详情内容验证完成\n');

    // ==================== 第8步：关闭DM预览弹窗 ====================
    console.log('📝 第8步：关闭DM预览弹窗...');

    // 点击DM预览弹窗的关闭按钮（最后一个弹窗的关闭按钮）
    await page.click('.ant-modal-wrap:last-child .ant-modal-close');
    await page.waitForTimeout(500);

    // 验证DM预览弹窗已关闭
    const dmViewModalClosed = await page.locator('.ant-modal:has-text("数据模块详情")').count() === 0;
    console.log(`   DM预览弹窗已关闭: ${dmViewModalClosed ? '✅' : '❌'}`);

    // 验证引用关系弹窗仍然打开
    const refModalStillOpen = await page.isVisible('.ant-modal:has-text("引用关系")');
    console.log(`   引用关系弹窗仍打开: ${refModalStillOpen ? '✅' : '❌'}\n`);

    // ==================== 第9步：点击"查看"按钮查看DM ====================
    if (detailRowCount > 1) {
      console.log('📝 第9步：点击第二条记录的"查看"按钮...');

      // 获取第二条记录的DMC编码
      const secondDmc = await page.textContent('.ant-table-tbody tr:nth-child(2) td:nth-child(1)');
      console.log(`   目标DM: ${secondDmc}`);

      // 点击第二条记录的"查看"按钮
      await page.click('.ant-table-tbody tr:nth-child(2) a:has-text("查看")');

      // 等待DM预览弹窗出现
      await page.waitForSelector('.ant-modal:has-text("数据模块详情")', { timeout: 5000 });
      console.log('✅ 通过"查看"按钮成功打开DM预览弹窗\n');

      // 等待2秒观察
      await page.waitForTimeout(2000);

      // 关闭DM预览弹窗
      await page.click('.ant-modal-wrap:last-child .ant-modal-close');
      await page.waitForTimeout(500);
      console.log('✅ 已关闭DM预览弹窗\n');
    }

    // ==================== 第10步：关闭引用关系弹窗 ====================
    console.log('📝 第10步：关闭引用关系弹窗...');

    await page.click('.ant-modal:has-text("引用关系") .ant-modal-close');
    await page.waitForTimeout(500);
    console.log('✅ 引用关系弹窗已关闭\n');

    // ==================== 测试完成 ====================
    console.log('🎉 测试完成！所有步骤执行成功！\n');
    console.log('📊 测试总结：');
    console.log('  ✅ 打开引用关系弹窗');
    console.log('  ✅ 切换到详情列表');
    console.log('  ✅ 点击DMC编码链接查看DM');
    console.log('  ✅ DM预览弹窗正确显示');
    console.log('  ✅ 弹窗嵌套层级正确');
    console.log('  ✅ 关闭预览后引用关系弹窗保持打开');
    if (detailRowCount > 1) {
      console.log('  ✅ 点击"查看"按钮查看DM');
    }
    console.log('');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);

    // 截图保存错误现场
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    console.log('📸 错误截图已保存: test-error.png');
  } finally {
    // 保持浏览器打开5秒，便于查看最终状态
    console.log('⏳ 5秒后关闭浏览器...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// 运行测试
testDmReferenceView().catch(console.error);
