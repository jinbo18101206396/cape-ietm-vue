/**
 * 历史版本自动归档修复 - 全量真实UI测试
 * 通过真实浏览器操作验证修复效果
 */

const { test, expect } = require('@playwright/test');
const http = require('http');

// API登录辅助函数
function apiLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username: 'admin', password: '123456' });
    const req = http.request('http://localhost:9999/jeecg-boot/sys/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk });
      res.on('end', () => {
        const json = JSON.parse(data);
        resolve(json.result.token);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// API请求辅助函数
function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9999,
      path: `/jeecg-boot${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': token || ''
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let TOKEN;
let TEST_DM_SNS;
let TEST_DM_INFO_CODE;
let TEST_DM_INFO_CODE_VARIANT;
let INITIAL_VERSION_COUNT;

test.describe('历史版本自动归档修复 - 全量测试', () => {
  let page;
  let context;

  test.beforeAll(async ({ browser }) => {
    // API登录获取token
    TOKEN = await apiLogin();
    console.log('✅ API登录成功');

    context = await browser.newContext();
    page = await context.newPage();

    // 设置token到localStorage
    await page.goto('http://localhost:3000');
    await page.evaluate((token) => {
      localStorage.setItem('pro__Access-Token', token);
      localStorage.setItem('Access-Token', token);
    }, TOKEN);

    console.log('✅ Token已设置');
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('阶段1: 准备测试数据 - 选择或创建DM', async () => {
    console.log('\n========== 阶段1: 准备测试数据 ==========');

    // 1. 进入DM管理页面
    await page.goto('http://localhost:3000/ietm/dm-management');
    await page.waitForTimeout(3000);
    console.log('✅ 进入DM管理页面');

    // 2. 检查是否有项目选择要求
    const pageContent = await page.content();
    if (pageContent.includes('请先选择项目') || pageContent.includes('选择项目')) {
      console.log('⚠️  系统要求先选择项目');
      console.log('💡 请手动在页面上选择项目后继续测试');

      // 等待用户手动选择项目（最多60秒）
      console.log('⏳ 等待项目选择...');
      await page.waitForTimeout(60000);
    }

    // 3. 等待表格加载
    try {
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
      const rowCount = await page.locator('table tbody tr').count();
      console.log(`✅ 表格已加载，找到 ${rowCount} 条记录`);

      if (rowCount === 0) {
        console.log('❌ 没有DM数据');
        console.log('💡 请先在系统中创建一些DM数据');
        throw new Error('无测试数据');
      }

      // 4. 选择第一个未签出的DM
      const firstRow = page.locator('table tbody tr').first();

      // 获取DMC信息
      const dmcText = await firstRow.locator('td').nth(1).textContent();
      console.log(`📋 选择DM: ${dmcText.trim()}`);

      // 从DMC中提取SNS和infoCode（假设格式：XXX-SNS-INFOCODE-...）
      const dmcParts = dmcText.trim().split('-');
      if (dmcParts.length >= 3) {
        TEST_DM_SNS = dmcParts[1];
        TEST_DM_INFO_CODE = dmcParts[2];
        TEST_DM_INFO_CODE_VARIANT = dmcParts[3] || null;
        console.log(`  SNS: ${TEST_DM_SNS}`);
        console.log(`  InfoCode: ${TEST_DM_INFO_CODE}`);
        console.log(`  Variant: ${TEST_DM_INFO_CODE_VARIANT || 'null'}`);
      }

      // 5. 查询初始历史版本数量
      if (TEST_DM_SNS && TEST_DM_INFO_CODE) {
        const params = new URLSearchParams({
          sns: TEST_DM_SNS,
          infoCode: TEST_DM_INFO_CODE
        });
        if (TEST_DM_INFO_CODE_VARIANT) {
          params.append('infoCodeVariant', TEST_DM_INFO_CODE_VARIANT);
        }

        const historyResult = await apiReq('GET', `/ietm/datamodule/historyVersions?${params.toString()}`, null, TOKEN);
        if (historyResult.success) {
          INITIAL_VERSION_COUNT = historyResult.result?.length || 0;
          console.log(`📊 初始历史版本数量: ${INITIAL_VERSION_COUNT}`);
        }
      }

    } catch (error) {
      console.log('❌ 页面加载失败:', error.message);

      // 截图保存
      await page.screenshot({ path: 'test-results/stage1-error.png', fullPage: true });
      console.log('📸 错误截图已保存: test-results/stage1-error.png');

      throw error;
    }
  });

  test('阶段2: 执行4次签出-编辑-签入循环', async () => {
    console.log('\n========== 阶段2: 执行编辑循环 ==========');

    if (!TEST_DM_SNS || !TEST_DM_INFO_CODE) {
      console.log('⚠️  跳过：无有效测试DM');
      return;
    }

    const editCycles = 4;

    for (let i = 1; i <= editCycles; i++) {
      console.log(`\n--- 第 ${i} 次编辑循环 ---`);

      try {
        // 1. 刷新页面，重新定位DM行
        await page.goto('http://localhost:3000/ietm/dm-management');
        await page.waitForTimeout(2000);
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        // 2. 找到目标DM（通过DMC匹配）
        const targetRow = page.locator('table tbody tr').filter({
          has: page.locator(`text=/${TEST_DM_SNS}/`)
        }).first();

        // 3. 点击"编辑DM"
        const editBtn = targetRow.locator('button:has-text("编辑"), a:has-text("编辑")').first();
        await editBtn.click();
        await page.waitForTimeout(3000);
        console.log(`  ✓ 打开编辑器`);

        // 4. 等待CodeMirror加载
        await page.waitForSelector('.CodeMirror', { timeout: 15000 });
        await page.waitForTimeout(2000);

        // 5. 修改内容
        const timestamp = Date.now();
        const marker = `<!-- 测试标记 ${i}: ${timestamp} -->`;

        await page.evaluate((mark) => {
          const cm = document.querySelector('.CodeMirror').CodeMirror;
          if (!cm) throw new Error('CodeMirror未找到');

          const content = cm.getValue();
          // 在第一个</techName>之后插入标记
          const newContent = content.replace('</techName>', `</techName>\n${mark}`);
          cm.setValue(newContent);
        }, marker);

        console.log(`  ✓ 修改内容: ${marker}`);
        await page.waitForTimeout(1000);

        // 6. 点击签入
        const checkinBtn = page.locator('button:has-text("签入")').first();
        await checkinBtn.click();
        await page.waitForTimeout(1500);

        // 处理确认对话框
        try {
          const confirmBtn = page.locator('.ant-modal button:has-text("确定"), .ant-modal button:has-text("OK")').first();
          if (await confirmBtn.isVisible({ timeout: 2000 })) {
            await confirmBtn.click();
            await page.waitForTimeout(2000);
          }
        } catch (e) {
          // 没有对话框，继续
        }

        console.log(`  ✓ 签入成功`);

        // 7. 等待操作完成
        await page.waitForTimeout(2000);

      } catch (error) {
        console.log(`  ❌ 第 ${i} 次编辑失败:`, error.message);
        await page.screenshot({ path: `test-results/stage2-cycle${i}-error.png`, fullPage: true });
        console.log(`  📸 错误截图: test-results/stage2-cycle${i}-error.png`);

        // 继续下一次循环
        continue;
      }
    }

    console.log(`\n✅ 完成 ${editCycles} 次编辑循环`);
  });

  test('阶段3: 验证历史版本完整性（UI）', async () => {
    console.log('\n========== 阶段3: 验证历史版本列表 ==========');

    if (!TEST_DM_SNS || !TEST_DM_INFO_CODE) {
      console.log('⚠️  跳过：无有效测试DM');
      return;
    }

    try {
      // 1. 返回DM管理页面
      await page.goto('http://localhost:3000/ietm/dm-management');
      await page.waitForTimeout(2000);
      await page.waitForSelector('table tbody tr', { timeout: 10000 });

      // 2. 找到目标DM
      const targetRow = page.locator('table tbody tr').filter({
        has: page.locator(`text=/${TEST_DM_SNS}/`)
      }).first();

      // 3. 点击"更多"按钮
      const moreBtn = targetRow.locator('button.ant-dropdown-trigger, button:has-text("更多")').first();
      await moreBtn.click();
      await page.waitForTimeout(500);

      // 4. 点击"查看历史版本"
      await page.locator('text=/查看历史版本|History/i').first().click();
      await page.waitForTimeout(2000);

      console.log('✅ 打开历史版本对话框');

      // 5. 等待历史版本表格加载
      await page.waitForSelector('.ant-modal table tbody tr', { timeout: 5000 });

      // 6. 统计历史版本数量
      const historyRows = page.locator('.ant-modal table tbody tr');
      const historyCount = await historyRows.count();

      console.log(`\n📊 UI显示的历史版本数量: ${historyCount}`);
      console.log(`📊 预期数量: ${INITIAL_VERSION_COUNT + 4} (初始${INITIAL_VERSION_COUNT} + 4次编辑)`);

      // 7. 核心验证
      const expectedCount = INITIAL_VERSION_COUNT + 4;
      if (historyCount >= expectedCount) {
        console.log(`✅ 验证通过：历史版本数量正确 (${historyCount} >= ${expectedCount})`);
      } else {
        console.log(`❌ 验证失败：历史版本数量不足 (${historyCount} < ${expectedCount})`);
        console.log(`⚠️  可能原因：部分版本被自动归档`);
      }

      // 8. 列出所有版本
      console.log('\n版本列表：');
      for (let i = 0; i < Math.min(historyCount, 10); i++) {
        const row = historyRows.nth(i);
        const versionText = await row.locator('td').first().textContent();
        console.log(`  ${i + 1}. ${versionText.trim()}`);
      }

      // 9. 测试浏览功能（前3个版本）
      console.log('\n--- 测试历史版本浏览功能 ---');
      for (let i = 0; i < Math.min(3, historyCount); i++) {
        const row = historyRows.nth(i);
        const version = await row.locator('td').first().textContent();

        const browseBtn = row.locator('button:has-text("浏览"), a:has-text("浏览")').first();
        await browseBtn.click();
        await page.waitForTimeout(2000);

        // 验证编辑器已打开
        const editorVisible = await page.locator('.CodeMirror').isVisible({ timeout: 5000 });
        console.log(`  ${editorVisible ? '✅' : '❌'} 版本 ${version.trim()} 可以打开`);

        // 返回
        await page.goBack();
        await page.waitForTimeout(1500);

        // 重新打开历史版本对话框
        if (i < Math.min(3, historyCount) - 1) {
          await moreBtn.click();
          await page.waitForTimeout(500);
          await page.locator('text=/查看历史版本|History/i').first().click();
          await page.waitForTimeout(1500);
        }
      }

      // 断言
      expect(historyCount).toBeGreaterThanOrEqual(expectedCount);

    } catch (error) {
      console.log('❌ UI验证失败:', error.message);
      await page.screenshot({ path: 'test-results/stage3-error.png', fullPage: true });
      console.log('📸 错误截图: test-results/stage3-error.png');
      throw error;
    }
  });

  test('阶段4: 验证数据库状态（API）', async () => {
    console.log('\n========== 阶段4: 数据库状态验证 ==========');

    if (!TEST_DM_SNS || !TEST_DM_INFO_CODE) {
      console.log('⚠️  跳过：无有效测试DM');
      return;
    }

    // 通过API查询历史版本
    const params = new URLSearchParams({
      sns: TEST_DM_SNS,
      infoCode: TEST_DM_INFO_CODE
    });
    if (TEST_DM_INFO_CODE_VARIANT) {
      params.append('infoCodeVariant', TEST_DM_INFO_CODE_VARIANT);
    }

    const historyResult = await apiReq('GET', `/ietm/datamodule/historyVersions?${params.toString()}`, null, TOKEN);

    expect(historyResult.success).toBeTruthy();

    const versions = historyResult.result || [];
    console.log(`\n📊 API返回的历史版本数量: ${versions.length}`);

    // 统计状态
    const statusCounts = {
      normal: 0,
      archived: 0,
      temp: 0
    };

    console.log('\n版本详情：');
    console.log('─'.repeat(90));
    console.log('序号\t版本号\t\tis_latest\tstatus\t\t内容长度');
    console.log('─'.repeat(90));

    versions.forEach((v, idx) => {
      let statusText;
      if (v.status === '1') {
        statusText = '正常 ✅';
        statusCounts.normal++;
      } else if (v.status === '0') {
        statusText = '已归档 ❌';
        statusCounts.archived++;
      } else if (v.status === '2') {
        statusText = '临时';
        statusCounts.temp++;
      } else {
        statusText = '未知';
      }

      console.log(`${idx + 1}\t${v.issueNo}-${v.inWork}\t\t${v.isLatest}\t\t${statusText}\t\t${v.dmContent?.length || 0}`);
    });
    console.log('─'.repeat(90));

    console.log(`\n统计结果：`);
    console.log(`  - 总数: ${versions.length}`);
    console.log(`  - status='1' (正常): ${statusCounts.normal} ✅`);
    console.log(`  - status='0' (已归档): ${statusCounts.archived} ${statusCounts.archived > 0 ? '❌' : ''}`);
    console.log(`  - status='2' (临时): ${statusCounts.temp}`);

    // 核心断言：不应该有已归档的历史版本
    if (statusCounts.archived > 0) {
      console.log(`\n❌ 测试失败：发现 ${statusCounts.archived} 个已归档版本！`);
      console.log('💡 这些可能是修复前的旧数据，或修复未生效');
    } else {
      console.log(`\n✅ 测试通过：所有历史版本都是正常状态！`);
    }

    // 验证版本数量一致性
    const expectedCount = INITIAL_VERSION_COUNT + 4;
    if (versions.length >= expectedCount) {
      console.log(`✅ 版本数量验证通过 (${versions.length} >= ${expectedCount})`);
    } else {
      console.log(`⚠️  版本数量不足 (${versions.length} < ${expectedCount})`);
    }

    // 总体断言
    expect(statusCounts.archived).toBe(0);
    expect(versions.length).toBeGreaterThanOrEqual(expectedCount);
  });
});
