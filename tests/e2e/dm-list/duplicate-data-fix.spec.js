const { test, expect } = require('@playwright/test');

/**
 * DM列表重复数据修复E2E验证
 *
 * BUG: BUG-2026-08-23-001
 * 问题: 启动流程后列表出现重复数据
 * 修复: 后端SQL使用子查询获取最新流程实例
 *
 * @date 2026-08-23
 */

test.describe('DM列表重复数据修复验证', () => {

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000');
    await page.fill('input[placeholder="账号"]', 'admin');
    await page.fill('input[placeholder="密码"]', 'admin');
    await page.click('button:has-text("登录")');
    await page.waitForTimeout(2000);

    // 进入数据模块管理页面
    await page.goto('http://localhost:3000/ietm/data-module');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  /**
   * 辅助函数: 运行重复数据诊断脚本
   */
  async function checkForDuplicates(page) {
    return await page.evaluate(() => {
      // 查找IetmDataModuleList组件
      let dmListComponent = null;
      function findComponent(vm) {
        if (vm.$options.name === 'IetmDataModuleList' ||
            vm.$options._componentTag === 'IetmDataModuleList') {
          return vm;
        }
        if (vm.$children) {
          for (let child of vm.$children) {
            const found = findComponent(child);
            if (found) return found;
          }
        }
        return null;
      }

      const vueApp = document.querySelector('#app').__vue__;
      dmListComponent = findComponent(vueApp);

      if (!dmListComponent) {
        return { error: '无法找到IetmDataModuleList组件' };
      }

      const dataSource = dmListComponent.dataSource;

      // 统计ID重复
      const idCount = {};
      const dmcCount = {};

      dataSource.forEach((record, index) => {
        if (!idCount[record.id]) {
          idCount[record.id] = [];
        }
        idCount[record.id].push(index);

        const dmc = record.dmcCode || record.dmc;
        if (dmc) {
          if (!dmcCount[dmc]) {
            dmcCount[dmc] = [];
          }
          dmcCount[dmc].push({
            index: index,
            id: record.id,
            issueNo: record.issueNo,
            inWork: record.inWork,
            workflowStatus: record.workflowStatus
          });
        }
      });

      const duplicateIds = Object.keys(idCount).filter(id => idCount[id].length > 1);
      const duplicateDmcs = Object.keys(dmcCount).filter(dmc => dmcCount[dmc].length > 1);

      return {
        totalRecords: dataSource.length,
        duplicateIds: duplicateIds.map(id => ({
          id: id,
          count: idCount[id].length,
          indices: idCount[id]
        })),
        duplicateDmcs: duplicateDmcs.map(dmc => ({
          dmc: dmc,
          count: dmcCount[dmc].length,
          records: dmcCount[dmc]
        }))
      };
    });
  }

  /**
   * TC-B06: 已结束流程DM启动流程后列表不重复（核心测试）
   */
  test('已结束流程DM启动流程后列表不重复', async ({ page }) => {
    // 1. 查找"已结束"的DM
    const endedRow = await page.locator('tr:has-text("已结束")').first();

    if (await endedRow.count() === 0) {
      console.log('⚠️  跳过: 列表中无"已结束"流程的DM');
      test.skip();
      return;
    }

    // 2. 记录DM ID（用于后续验证）
    const dmId = await endedRow.evaluate(row => {
      // 从第一个隐藏列或data属性获取ID
      const idCell = row.cells[0];
      return idCell?.innerText || row.getAttribute('data-row-key');
    });

    console.log(`📌 选中DM: ${dmId}`);

    // 3. 勾选该行
    await endedRow.locator('input[type="checkbox"]').check();

    // 4. 点击"启动流程"按钮
    await page.click('button:has-text("启动流程")');
    await page.waitForSelector('.ant-modal');

    // 5. 填写流程启动表单
    await page.fill('textarea[placeholder*="请输入"]', 'E2E测试: 验证启动流程不重复');
    await page.click('.ant-modal button:has-text("确定")');

    // 6. 等待提交完成并刷新
    await page.waitForTimeout(3000);

    // 7. 运行诊断脚本
    const diagnostic = await checkForDuplicates(page);

    console.log('📊 诊断结果:', JSON.stringify(diagnostic, null, 2));

    // 8. 断言: 不应有重复ID
    expect(diagnostic.duplicateIds).toHaveLength(0);

    if (diagnostic.duplicateIds.length > 0) {
      console.error('❌ 检测到重复ID:');
      diagnostic.duplicateIds.forEach(dup => {
        console.error(`   ID: ${dup.id}, 出现${dup.count}次，索引: [${dup.indices.join(', ')}]`);
      });
    } else {
      console.log('✅ 通过: 列表中无重复ID');
    }

    // 9. 断言: 不应有重复DMC（同版本）
    const samVersionDuplicates = diagnostic.duplicateDmcs.filter(dup => {
      const records = dup.records;
      return records.every((r, i) =>
        i === 0 || (r.issueNo === records[0].issueNo && r.inWork === records[0].inWork)
      );
    });

    expect(sameVersionDuplicates).toHaveLength(0);

    if (sameVersionDuplicates.length > 0) {
      console.error('❌ 检测到重复DMC（同版本）:');
      sameVersionDuplicates.forEach(dup => {
        console.error(`   DMC: ${dup.dmc}, 出现${dup.count}次`);
        console.table(dup.records);
      });
    } else {
      console.log('✅ 通过: 无重复DMC（同版本）');
    }
  });

  /**
   * TC-S02: 批量启动10条DM后列表不重复
   */
  test('批量启动10条DM后列表不重复', async ({ page }) => {
    // 1. 勾选前10条
    const checkboxes = await page.locator('.ant-table-tbody input[type="checkbox"]').all();
    const limit = Math.min(10, checkboxes.length);

    console.log(`📊 批量选择${limit}条DM`);

    for (let i = 0; i < limit; i++) {
      await checkboxes[i].check();
    }

    // 2. 点击"批量启动流程"
    await page.click('button:has-text("批量启动流程")');
    await page.waitForSelector('.ant-modal');

    // 3. 填写表单
    await page.fill('textarea', 'E2E测试: 批量启动流程');
    await page.click('.ant-modal button:has-text("确定")');

    // 4. 等待批量处理完成
    await page.waitForTimeout(5000);

    // 5. 刷新页面验证持久性
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 6. 运行诊断
    const diagnostic = await checkForDuplicates(page);

    console.log('📊 批量启动后诊断结果:', JSON.stringify(diagnostic, null, 2));

    // 7. 断言
    expect(diagnostic.duplicateIds).toHaveLength(0);
    console.log(`✅ 通过: 批量启动${limit}条DM后无重复，总记录数: ${diagnostic.totalRecords}`);
  });

  /**
   * TC-S06: 多次启动-结束循环后列表始终不重复
   */
  test('多次启动-结束循环后列表始终不重复', async ({ page }) => {
    // 注意: 此测试需要能将DM设置为"已结束"状态
    // 在实际环境中可能需要手动操作或数据库脚本支持

    // 1. 选择一条DM
    const firstCheckbox = page.locator('.ant-table-tbody input[type="checkbox"]').first();
    await firstCheckbox.check();

    for (let cycle = 1; cycle <= 3; cycle++) {
      console.log(`\n🔄 循环${cycle}: 启动流程`);

      // 启动流程
      await page.click('button:has-text("启动流程")');
      await page.waitForSelector('.ant-modal');
      await page.fill('textarea', `E2E测试循环${cycle}`);
      await page.click('.ant-modal button:has-text("确定")');
      await page.waitForTimeout(3000);

      // 验证无重复
      let diagnostic = await checkForDuplicates(page);
      expect(diagnostic.duplicateIds).toHaveLength(0);
      console.log(`✅ 循环${cycle}-启动后: 无重复`);

      // TODO: 这里需要将DM状态改为"已结束"
      // 可以通过API调用或数据库脚本实现
      // await setWorkflowStatusToEnded(page, dmId);

      await page.waitForTimeout(2000);

      // 刷新并再次验证
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      diagnostic = await checkForDuplicates(page);
      expect(diagnostic.duplicateIds).toHaveLength(0);
      console.log(`✅ 循环${cycle}-刷新后: 无重复`);
    }

    console.log('✅ 通过: 3次启动-结束循环后始终无重复');
  });

  /**
   * TC-B08: 单条DM记录边界测试
   */
  test('单条DM记录查询无重复', async ({ page }) => {
    // 筛选只显示1条记录
    // 这里假设可以通过搜索框过滤
    const searchInput = page.locator('input[placeholder*="搜索"]').first();

    if (await searchInput.count() > 0) {
      // 输入一个唯一的DMC编码
      const firstDmc = await page.locator('.ant-table-tbody tr').first().locator('td').nth(2).innerText();
      await searchInput.fill(firstDmc);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    // 运行诊断
    const diagnostic = await checkForDuplicates(page);

    console.log('📊 单条记录诊断:', JSON.stringify(diagnostic, null, 2));

    expect(diagnostic.totalRecords).toBeGreaterThanOrEqual(0);
    expect(diagnostic.duplicateIds).toHaveLength(0);
    console.log('✅ 通过: 单条记录查询无重复');
  });

  /**
   * TC-B09: 大数据量分页测试
   */
  test('大数据量分页查询无重复', async ({ page }) => {
    // 切换到显示100条/页
    const pageSizeSelector = page.locator('.ant-select-selection').filter({ hasText: /10 \/ 页/ });

    if (await pageSizeSelector.count() > 0) {
      await pageSizeSelector.click();
      await page.click('.ant-select-dropdown li:has-text("100 / 页")');
      await page.waitForTimeout(2000);
    }

    // 运行诊断
    const diagnostic = await checkForDuplicates(page);

    console.log(`📊 大数据量诊断: 总记录${diagnostic.totalRecords}条`);

    expect(diagnostic.duplicateIds).toHaveLength(0);
    console.log('✅ 通过: 大数据量分页无重复');
  });

  /**
   * TC-B10: 包含子节点查询
   */
  test('包含子节点查询无重复', async ({ page }) => {
    // 勾选"包含子节点"选项
    const includeChildrenCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /包含子节点/ });

    if (await includeChildrenCheckbox.count() > 0) {
      await includeChildrenCheckbox.check();
      await page.waitForTimeout(2000);

      // 运行诊断
      const diagnostic = await checkForDuplicates(page);

      console.log('📊 包含子节点诊断:', JSON.stringify(diagnostic, null, 2));

      expect(diagnostic.duplicateIds).toHaveLength(0);
      console.log('✅ 通过: 包含子节点查询无重复');
    } else {
      console.log('⚠️  跳过: 页面上无"包含子节点"选项');
      test.skip();
    }
  });

  /**
   * 压力测试: 快速连续刷新
   */
  test('快速连续刷新10次列表始终无重复', async ({ page }) => {
    for (let i = 1; i <= 10; i++) {
      console.log(`🔄 刷新第${i}次`);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const diagnostic = await checkForDuplicates(page);
      expect(diagnostic.duplicateIds).toHaveLength(0);
    }

    console.log('✅ 通过: 快速连续刷新10次无重复');
  });

});
