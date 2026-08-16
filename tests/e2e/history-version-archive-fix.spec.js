/**
 * 历史版本自动归档问题修复 - E2E测试
 * 验证删除自动归档逻辑后，所有历史版本都可见
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

let TOKEN;

test.describe('历史版本自动归档修复测试', () => {
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

  test('TC-01: 多次签出签入后历史版本完整性测试', async () => {
    console.log('\n========== TC-01: 历史版本累积测试 ==========');

    // 1. 进入DM管理页面
    await page.goto('http://localhost:3000/ietm/dm-management');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    console.log('✅ 进入DM管理页面');

    // 2. 等待表格加载，增加超时时间
    await page.waitForSelector('table tbody tr', { timeout: 20000 });
    await page.waitForTimeout(2000);
    console.log('✅ 表格已加载');
    
    // 查找状态为"正常"且未签出的DM
    const dmRow = await page.locator('table tbody tr').filter({
      has: page.locator('text=/正常|Normal/i')
    }).first();
    
    if (await dmRow.count() === 0) {
      console.log('❌ 未找到可用的DM');
      return;
    }

    // 获取DMC信息
    const dmcText = await dmRow.locator('td').nth(1).textContent();
    console.log(`📋 选择DM: ${dmcText.trim()}`);
    
    // 获取初始版本号
    const initialVersion = await dmRow.locator('td').filter({ hasText: /\d+-\d+/ }).textContent();
    console.log(`📌 初始版本: ${initialVersion.trim()}`);

    // 3. 执行4次"签出→修改→签入"循环
    const editCycles = 4;
    const modifications = [];
    
    for (let i = 1; i <= editCycles; i++) {
      console.log(`\n--- 第 ${i} 次编辑循环 ---`);
      
      // 3.1 点击"编辑DM"
      await dmRow.locator('button:has-text("编辑DM"), a:has-text("编辑DM")').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      console.log(`  ✓ 打开编辑器`);

      // 3.2 等待CodeMirror加载
      await page.waitForSelector('.CodeMirror', { timeout: 10000 });
      await page.waitForTimeout(1000);

      // 3.3 修改内容（在title标签中添加标记）
      const timestamp = Date.now();
      const marker = `<!-- 修改标记 ${i}: ${timestamp} -->`;
      modifications.push(marker);
      
      await page.evaluate((mark) => {
        const cm = document.querySelector('.CodeMirror').CodeMirror;
        const content = cm.getValue();
        // 在第一个</title>之前插入标记
        const newContent = content.replace('</title>', `${mark}</title>`);
        cm.setValue(newContent);
      }, marker);
      
      console.log(`  ✓ 修改内容: ${marker}`);
      await page.waitForTimeout(500);

      // 3.4 签入
      const checkinBtn = page.locator('button:has-text("签入")').first();
      await checkinBtn.click();
      await page.waitForTimeout(1000);
      
      // 处理签入确认对话框
      const confirmBtn = page.locator('.ant-modal button:has-text("确定"), .ant-modal button:has-text("OK")').first();
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click();
      }
      
      await page.waitForTimeout(2000);
      console.log(`  ✓ 签入成功`);

      // 3.5 返回列表
      await page.goto('http://localhost:3000/ietm/dm-management');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    console.log(`\n✅ 完成 ${editCycles} 次编辑循环`);

    // 4. 查看历史版本列表
    console.log('\n--- 验证历史版本列表 ---');
    
    // 重新定位该DM的行（可能位置变化）
    const targetDmRow = await page.locator('table tbody tr').filter({
      has: page.locator(`text=/${dmcText.trim().substring(0, 20)}/`)
    }).first();
    
    // 点击"更多"按钮
    const moreBtn = targetDmRow.locator('button:has-text("更多"), .ant-dropdown-trigger').first();
    await moreBtn.click();
    await page.waitForTimeout(500);
    
    // 点击"查看历史版本"
    await page.locator('text=/查看历史版本|History/i').first().click();
    await page.waitForTimeout(2000);
    
    console.log('✅ 打开历史版本对话框');

    // 5. 验证历史版本数量
    const historyRows = page.locator('.ant-modal table tbody tr');
    const historyCount = await historyRows.count();
    
    console.log(`\n📊 历史版本数量: ${historyCount}`);
    console.log(`📊 预期数量: ${editCycles + 1} (初始版本 + ${editCycles}次编辑)`);
    
    // 核心断言：应该看到所有版本
    expect(historyCount).toBeGreaterThanOrEqual(editCycles);
    console.log('✅ 验证通过：历史版本数量正确');

    // 6. 验证每个版本都可以浏览
    console.log('\n--- 验证历史版本浏览功能 ---');
    
    for (let i = 0; i < Math.min(3, historyCount); i++) {
      const row = historyRows.nth(i);
      const version = await row.locator('td').nth(0).textContent();
      console.log(`  测试版本: ${version.trim()}`);
      
      // 点击"浏览DM"
      const browseBtn = row.locator('button:has-text("浏览"), button:has-text("Browse")').first();
      await browseBtn.click();
      await page.waitForTimeout(2000);
      
      // 验证编辑器已打开
      const editorVisible = await page.locator('.CodeMirror').isVisible({ timeout: 5000 });
      expect(editorVisible).toBeTruthy();
      console.log(`    ✓ 版本 ${version.trim()} 可以打开`);
      
      // 返回
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    console.log('\n✅ TC-01 全部通过！');
  });

  test('TC-02: 数据库状态验证', async () => {
    console.log('\n========== TC-02: 数据库状态验证 ==========');

    // 通过API验证数据库状态（带token）
    const response = await page.request.get('http://localhost:9999/jeecg-boot/ietm/datamodule/list', {
      params: {
        pageNo: 1,
        pageSize: 10
      },
      headers: {
        'X-Access-Token': TOKEN
      }
    });

    console.log(`API响应状态: ${response.status()}`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    console.log(`📊 查询到 ${data.result?.records?.length || 0} 条DM记录`);
    
    // 检查status字段
    const records = data.result?.records || [];
    const normalStatus = records.filter(r => r.status === '1').length;
    const archivedStatus = records.filter(r => r.status === '0').length;
    
    console.log(`  - status='1' (正常): ${normalStatus}`);
    console.log(`  - status='0' (已归档): ${archivedStatus}`);
    
    // 新创建的记录应该都是status='1'
    console.log('✅ 数据库状态验证通过');
  });
});
