const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

/**
 * DDN导出ICN目录修复验证 - 最小化测试
 *
 * 核心验证：修复后的ZIP包中必须包含ICN/目录（即使为空）
 */

test.describe('DDN导出ICN目录修复验证', () => {

  test('P0: 验证空ICN目录存在于ZIP包中', async ({ page }) => {
    console.log('\n========== P0核心验证：ICN目录必须存在 ==========\n');

    // 1. 登录
    console.log('步骤1: 登录系统...');
    await page.goto('http://localhost:3000/user/login');

    // 等待登录页面加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 填写登录信息
    await page.fill('input[placeholder="请输入账户名"]', 'admin');
    await page.fill('input[placeholder="请输入密码"]', 'admin');

    // 点击登录按钮
    await page.click('button[type="submit"].login-button');
    console.log('已提交登录...');

    // 等待登录成功（等待跳转或主页加载）
    await page.waitForURL(/\/#\/(?!user\/login)/, { timeout: 10000 });
    console.log('登录成功，已跳转到主页');
    await page.waitForTimeout(2000);

    // 2. 打开项目（如果需要）
    console.log('步骤2: 检查是否需要打开项目...');
    try {
      const openProjectBtn = await page.locator('button:has-text("打开项目")').first();
      if (await openProjectBtn.isVisible({ timeout: 3000 })) {
        console.log('发现"打开项目"按钮，正在打开...');
        await openProjectBtn.click();
        await page.waitForTimeout(1500);

        // 选择第一个项目
        const firstProject = page.locator('.ant-table-row').first();
        if (await firstProject.isVisible({ timeout: 3000 })) {
          await firstProject.click();
          await page.waitForTimeout(500);
          await page.click('button:has-text("确定")');
          console.log('已选择并打开项目');
          await page.waitForTimeout(2000);
        }
      } else {
        console.log('未找到"打开项目"按钮，项目可能已打开');
      }
    } catch (e) {
      console.log('项目选择步骤跳过:', e.message);
    }

    // 3. 导航到DDN导出页面
    console.log('步骤3: 导航到DDN导出页面...');
    await page.goto('http://localhost:3000/#/ietm/ietmddn-export');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证页面加载成功
    const pageTitle = await page.textContent('h2, .page-title, .ant-page-header-heading-title');
    console.log(`当前页面标题: ${pageTitle}`);

    // 4. 添加DM到导出列表
    console.log('步骤4: 添加DM到导出列表...');

    // 点击"添加DM"按钮
    const addDmBtn = page.locator('button:has-text("添加DM")');
    await addDmBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addDmBtn.click();
    console.log('已点击"添加DM"按钮');
    await page.waitForTimeout(2000);

    // 在弹窗中选择第一个DM
    console.log('在弹窗中选择DM...');
    const modal = page.locator('.ant-modal');
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    const firstCheckbox = modal.locator('.ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    await firstCheckbox.check();
    console.log('已选择第一个DM');
    await page.waitForTimeout(1000);

    // 点击确定按钮
    const confirmBtn = modal.locator('button:has-text("确定")');
    await confirmBtn.click();
    console.log('已点击"确定"按钮');
    await page.waitForTimeout(2000);

    // 5. 验证DM已添加
    const dmRows = await page.locator('.ant-table-tbody tr').count();
    console.log(`步骤5: 已添加 ${dmRows} 个DM到导出列表`);
    expect(dmRows).toBeGreaterThan(0);

    // 6. 确保"引用ICN"和"引用DM"都未勾选（测试最简单场景）
    console.log('步骤6: 确保导出选项未勾选...');

    // 查找所有checkbox，取消勾选
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (const checkbox of checkboxes) {
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
        await page.waitForTimeout(200);
      }
    }
    console.log('已清除所有导出选项勾选');

    // 7. 生成数据包
    console.log('步骤7: 生成数据包...');

    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

    const generateBtn = page.locator('button:has-text("生成数据包")');
    await generateBtn.click();
    console.log('已点击"生成数据包"按钮，等待下载...');

    const download = await downloadPromise;
    const fileName = await download.suggestedFilename();
    console.log(`下载文件名: ${fileName}`);

    // 保存下载的文件
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', fileName);
    await download.saveAs(downloadPath);
    console.log(`ZIP包已保存: ${downloadPath}`);

    // 8. 验证ZIP文件存在
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    const fileSize = fs.statSync(downloadPath).size;
    console.log(`ZIP文件大小: ${(fileSize / 1024).toFixed(2)} KB`);

    // 9. 解析ZIP包结构
    console.log('\n步骤9: 解析ZIP包结构...');
    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    console.log(`ZIP包总条目数: ${entries.length}`);
    console.log('\n--- ZIP包完整结构 ---');
    entries.forEach((entry, index) => {
      const type = entry.isDirectory ? '[DIR]' : '[FILE]';
      const size = entry.isDirectory ? '' : `(${entry.header.size} bytes)`;
      console.log(`${index + 1}. ${type} ${entry.entryName} ${size}`);
    });

    // 10. 关键验证：ICN/目录必须存在
    console.log('\n========== 关键验证 ==========');

    const icnDirEntry = entries.find(e => e.entryName === 'ICN/');
    const hasIcnDir = entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/'));

    console.log(`\n✅ 验证1: ICN/目录条目存在: ${icnDirEntry ? '是' : '否'}`);
    console.log(`✅ 验证2: ICN/相关条目存在: ${hasIcnDir ? '是' : '否'}`);

    if (icnDirEntry) {
      console.log(`   - 条目名称: ${icnDirEntry.entryName}`);
      console.log(`   - 是否为目录: ${icnDirEntry.isDirectory}`);
      console.log(`   - 以/结尾: ${icnDirEntry.entryName.endsWith('/')}`);
    }

    // 断言：ICN目录必须存在（这是修复的核心）
    expect(hasIcnDir).toBeTruthy();

    // 11. 验证基础结构
    console.log('\n--- 基础结构验证 ---');

    const structure = {
      'DM/目录': entries.some(e => e.entryName.startsWith('DM/')),
      'ICN/目录': hasIcnDir,
      'XML文件': entries.some(e => e.entryName.match(/DDN-.*\.xml$/)),
      'LOG文件': entries.some(e => e.entryName.endsWith('.log'))
    };

    Object.entries(structure).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}: ${value ? '存在' : '缺失'}`);
      expect(value).toBeTruthy();
    });

    // 12. 验证目录格式
    console.log('\n--- 目录格式验证 ---');
    const directories = entries.filter(e => e.isDirectory);
    console.log(`目录总数: ${directories.length}`);

    directories.forEach(dir => {
      const endsWithSlash = dir.entryName.endsWith('/');
      console.log(`${endsWithSlash ? '✅' : '❌'} ${dir.entryName}`);
      expect(endsWithSlash).toBeTruthy();
    });

    // 13. 清理
    console.log('\n步骤13: 清理下载文件...');
    fs.unlinkSync(downloadPath);
    console.log('已删除临时文件');

    console.log('\n========== ✅ P0核心验证通过！ICN目录存在于ZIP包中 ==========\n');
  });

  test('P1: 验证引用ICN时文件命名正确', async ({ page }) => {
    console.log('\n========== P1: 引用ICN文件命名验证 ==========\n');

    // 登录
    await page.goto('http://localhost:3000/user/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder="请输入账户名"]', 'admin');
    await page.fill('input[placeholder="请输入密码"]', 'admin');
    await page.click('button[type="submit"].login-button');
    await page.waitForURL(/\/#\/(?!user\/login)/, { timeout: 10000 });
    console.log('登录成功');
    await page.waitForTimeout(2000);

    // 打开项目
    try {
      const openProjectBtn = await page.locator('button:has-text("打开项目")').first();
      if (await openProjectBtn.isVisible({ timeout: 3000 })) {
        await openProjectBtn.click();
        await page.waitForTimeout(1500);
        const firstProject = page.locator('.ant-table-row').first();
        if (await firstProject.isVisible({ timeout: 3000 })) {
          await firstProject.click();
          await page.waitForTimeout(500);
          await page.click('button:has-text("确定")');
          await page.waitForTimeout(2000);
        }
      }
    } catch (e) {
      console.log('跳过项目选择');
    }

    // 导航到DDN导出
    await page.goto('http://localhost:3000/#/ietm/ietmddn-export');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 添加DM
    const addDmBtn = page.locator('button:has-text("添加DM")');
    await addDmBtn.click();
    await page.waitForTimeout(2000);

    const modal = page.locator('.ant-modal');
    const firstCheckbox = modal.locator('.ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(1000);
    await modal.locator('button:has-text("确定")').click();
    await page.waitForTimeout(2000);

    // 勾选"引用ICN"
    console.log('勾选"引用ICN"选项...');
    const icnCheckbox = page.locator('label:has-text("引用ICN")').locator('input[type="checkbox"]');
    await icnCheckbox.check();
    await page.waitForTimeout(500);

    // 生成数据包
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    await page.locator('button:has-text("生成数据包")').click();
    console.log('正在生成数据包...');

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);
    console.log(`ZIP包已保存: ${downloadPath}`);

    // 解析ZIP
    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    const icnFiles = entries.filter(e =>
      e.entryName.startsWith('ICN/') && !e.isDirectory
    );

    console.log(`\nICN文件数量: ${icnFiles.length}`);

    if (icnFiles.length > 0) {
      console.log('\n--- ICN文件命名验证 ---');
      icnFiles.forEach(file => {
        const fileName = path.basename(file.entryName);
        const isValidFormat = /^ICN-[A-Z0-9-]+\.(png|jpg|jpeg|gif|svg|cgm|tif|bmp)$/i.test(fileName);
        console.log(`${isValidFormat ? '✅' : '❌'} ${file.entryName}`);
        expect(isValidFormat).toBeTruthy();
      });
      console.log('\n✅ 所有ICN文件命名格式正确');
    } else {
      console.log('⚠️ 选择的DM没有ICN引用（取决于数据）');
    }

    // ICN目录必须存在
    const hasIcnDir = entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/'));
    console.log(`\n✅ ICN/目录存在: ${hasIcnDir}`);
    expect(hasIcnDir).toBeTruthy();

    // 清理
    fs.unlinkSync(downloadPath);
    console.log('\n========== ✅ P1验证通过 ==========\n');
  });

  test('P2: 验证S1000D结构完整性', async ({ page }) => {
    console.log('\n========== P2: S1000D结构验证 ==========\n');

    // 登录
    await page.goto('http://localhost:3000/user/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.fill('input[placeholder="请输入账户名"]', 'admin');
    await page.fill('input[placeholder="请输入密码"]', 'admin');
    await page.click('button[type="submit"].login-button');
    await page.waitForURL(/\/#\/(?!user\/login)/, { timeout: 10000 });
    console.log('登录成功');
    await page.waitForTimeout(2000);

    // 打开项目
    try {
      const openProjectBtn = await page.locator('button:has-text("打开项目")').first();
      if (await openProjectBtn.isVisible({ timeout: 3000 })) {
        await openProjectBtn.click();
        await page.waitForTimeout(1500);
        const firstProject = page.locator('.ant-table-row').first();
        if (await firstProject.isVisible({ timeout: 3000 })) {
          await firstProject.click();
          await page.waitForTimeout(500);
          await page.click('button:has-text("确定")');
          await page.waitForTimeout(2000);
        }
      }
    } catch (e) {}

    // 导航
    await page.goto('http://localhost:3000/#/ietm/ietmddn-export');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 添加DM
    await page.locator('button:has-text("添加DM")').click();
    await page.waitForTimeout(2000);
    const modal = page.locator('.ant-modal');
    await modal.locator('.ant-table-tbody .ant-checkbox-input').first().check();
    await page.waitForTimeout(1000);
    await modal.locator('button:has-text("确定")').click();
    await page.waitForTimeout(2000);

    // 勾选所有选项
    console.log('勾选所有导出选项...');
    const icnCheckbox = page.locator('label:has-text("引用ICN")').locator('input[type="checkbox"]');
    const dmCheckbox = page.locator('label:has-text("引用DM")').locator('input[type="checkbox"]');
    await icnCheckbox.check();
    await dmCheckbox.check();
    await page.waitForTimeout(500);

    // 生成
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    await page.locator('button:has-text("生成数据包")').click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    // 验证S1000D 4.0结构
    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    console.log('\n--- S1000D 4.0 标准结构验证 ---');
    const s1000dStructure = {
      'ICN/目录': entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/')),
      'DM/目录': entries.some(e => e.entryName.startsWith('DM/')),
      'deliveryList XML': entries.some(e => e.entryName.match(/DDN-.*\.xml$/)),
      'DDN.log': entries.some(e => e.entryName.endsWith('.log'))
    };

    Object.entries(s1000dStructure).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}`);
      expect(value).toBeTruthy();
    });

    // 验证XML内容
    const xmlEntry = entries.find(e => e.entryName.match(/DDN-.*\.xml$/));
    if (xmlEntry) {
      const xmlContent = xmlEntry.getData().toString('utf8');
      console.log('\n--- deliveryList.xml 内容验证 ---');

      const xmlChecks = {
        '包含<dmodule>标签': xmlContent.includes('<dmodule>'),
        '包含<dmIdent>标签': xmlContent.includes('<dmIdent>'),
        '包含<dmCode>标签': xmlContent.includes('<dmCode')
      };

      Object.entries(xmlChecks).forEach(([key, value]) => {
        console.log(`${value ? '✅' : '❌'} ${key}`);
      });
    }

    // 清理
    fs.unlinkSync(downloadPath);
    console.log('\n========== ✅ P2: S1000D结构完整 ==========\n');
  });

});
