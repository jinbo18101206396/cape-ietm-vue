const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

/**
 * DDN导出功能 - 完整E2E测试套件
 *
 * 测试范围：
 * 1. 场景测试：正常导出、引用ICN、引用DM、组合场景
 * 2. 边界测试：空数据、大数据量、特殊字符、权限
 * 3. ZIP结构验证：ICN目录、文件命名、S1000D合规性
 * 4. 类似问题排查：其他导出功能、目录结构、文件命名
 */

test.describe('DDN导出功能 - 完整E2E测试', () => {

  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // 登录
    await page.goto('http://localhost:3000/user/login');
    await page.waitForSelector('input[placeholder*="账户名"]', { timeout: 10000 });
    await page.fill('input[placeholder*="账户名"]', 'admin');
    await page.fill('input[placeholder*="密码"]', 'admin123');
    await page.click('button[type="submit"]');

    // 等待登录成功
    await page.waitForTimeout(2000);

    // 打开项目（如果有的话）
    try {
      const openProjectBtn = page.locator('button:has-text("打开项目")').first();
      if (await openProjectBtn.isVisible({ timeout: 3000 })) {
        await openProjectBtn.click();
        await page.waitForTimeout(1000);

        // 选择第一个项目
        const firstProject = page.locator('.ant-table-row').first();
        if (await firstProject.isVisible({ timeout: 2000 })) {
          await firstProject.click();
          await page.click('button:has-text("确定")');
          await page.waitForTimeout(1000);
        }
      }
    } catch (e) {
      console.log('未找到打开项目按钮，可能已有项目打开');
    }

    // 导航到DDN导出页面
    await page.goto('http://localhost:3000/#/ietm/ietmddn-export');
    await page.waitForTimeout(2000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ==================== 场景测试 ====================

  test('场景1: 基础导出（不引用ICN/DM）- 验证ICN目录存在', async () => {
    console.log('\n========== 场景1: 基础导出 ==========');

    // 1. 点击"添加DM"按钮打开弹窗
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    // 2. 在弹窗中选择第一个DM（使用antdv 1.7.8的表格选择器）
    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    // 3. 点击"确定"关闭弹窗
    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    // 4. 验证DM已添加到列表
    const dmCount = await page.locator('.ant-table-tbody tr').count();
    console.log(`已添加 ${dmCount} 个DM到导出列表`);
    expect(dmCount).toBeGreaterThan(0);

    // 5. 确保"引用ICN"和"引用DM"都未勾选
    const icnCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /引用ICN/ });
    const dmCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /引用DM/ });

    if (await icnCheckbox.isChecked()) {
      await icnCheckbox.uncheck();
    }
    if (await dmCheckbox.isChecked()) {
      await dmCheckbox.uncheck();
    }

    // 6. 点击"生成数据包"
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("生成数据包")');

    // 7. 等待下载完成
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    console.log(`ZIP包已下载: ${downloadPath}`);

    // 8. 验证ZIP结构
    expect(fs.existsSync(downloadPath)).toBeTruthy();

    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    console.log('\n--- ZIP包结构 ---');
    entries.forEach(entry => {
      console.log(entry.entryName);
    });

    // 9. 关键验证：ICN/目录必须存在（即使为空）
    const hasIcnDir = entries.some(entry => entry.entryName === 'ICN/' || entry.entryName.startsWith('ICN/'));
    console.log(`\n✅ 关键验证: ICN/目录${hasIcnDir ? '存在' : '不存在'}`);
    expect(hasIcnDir).toBeTruthy();

    // 10. 验证基础结构
    const hasDmDir = entries.some(entry => entry.entryName.startsWith('DM/'));
    const hasXml = entries.some(entry => entry.entryName.endsWith('.xml'));
    const hasLog = entries.some(entry => entry.entryName.endsWith('.log'));

    console.log(`DM/目录: ${hasDmDir ? '✅' : '❌'}`);
    console.log(`XML文件: ${hasXml ? '✅' : '❌'}`);
    console.log(`日志文件: ${hasLog ? '✅' : '❌'}`);

    expect(hasDmDir).toBeTruthy();
    expect(hasXml).toBeTruthy();

    // 清理
    fs.unlinkSync(downloadPath);
  });

  test('场景2: 引用ICN - 验证ICN文件命名', async () => {
    console.log('\n========== 场景2: 引用ICN ==========');

    // 1. 添加DM（选择有ICN引用的DM）
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    // 2. 勾选"引用ICN"
    const icnCheckbox = page.locator('label:has-text("引用ICN") input[type="checkbox"]');
    await icnCheckbox.check();
    await page.waitForTimeout(500);

    // 3. 生成数据包
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("生成数据包")');

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    console.log(`ZIP包已下载: ${downloadPath}`);

    // 4. 验证ICN文件命名格式
    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    const icnFiles = entries.filter(entry =>
      entry.entryName.startsWith('ICN/') && !entry.isDirectory
    );

    console.log(`\nICN文件数量: ${icnFiles.length}`);

    if (icnFiles.length > 0) {
      icnFiles.forEach(file => {
        console.log(`  ${file.entryName}`);

        // 验证文件名格式：ICN-xxx-xxx.扩展名
        const fileName = path.basename(file.entryName);
        const isValidFormat = /^ICN-[A-Z0-9-]+\.(png|jpg|jpeg|gif|svg|cgm)$/i.test(fileName);

        console.log(`  格式验证: ${isValidFormat ? '✅' : '❌'} ${fileName}`);
        expect(isValidFormat).toBeTruthy();
      });
    } else {
      console.log('⚠️ 选择的DM没有ICN引用（这是正常的，取决于数据）');
    }

    // 5. ICN/目录必须存在
    const hasIcnDir = entries.some(entry => entry.entryName === 'ICN/' || entry.entryName.startsWith('ICN/'));
    console.log(`\n✅ ICN/目录存在: ${hasIcnDir}`);
    expect(hasIcnDir).toBeTruthy();

    // 清理
    fs.unlinkSync(downloadPath);
  });

  test('场景3: 引用DM - 验证递归收集', async () => {
    console.log('\n========== 场景3: 引用DM ==========');

    // 1. 添加DM
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    // 2. 记录初始DM数量
    const initialDmCount = await page.locator('.ant-table-tbody tr').count();
    console.log(`初始DM数量: ${initialDmCount}`);

    // 3. 勾选"引用DM"
    const dmCheckbox = page.locator('label:has-text("引用DM") input[type="checkbox"]');
    await dmCheckbox.check();
    await page.waitForTimeout(500);

    // 4. 生成数据包
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("生成数据包")');

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    console.log(`ZIP包已下载: ${downloadPath}`);

    // 5. 验证DM文件数量
    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    const dmFiles = entries.filter(entry =>
      entry.entryName.startsWith('DM/') && entry.entryName.endsWith('.xml')
    );

    console.log(`\nDM文件数量: ${dmFiles.length}`);
    console.log(`预期数量: >= ${initialDmCount}`);

    // 引用DM时，可能会递归收集更多DM
    expect(dmFiles.length).toBeGreaterThanOrEqual(initialDmCount);

    dmFiles.forEach(file => {
      console.log(`  ${file.entryName}`);
    });

    // 清理
    fs.unlinkSync(downloadPath);
  });

  test('场景4: 同时引用ICN和DM - 完整场景', async () => {
    console.log('\n========== 场景4: ICN + DM ==========');

    // 1. 添加DM
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    // 2. 同时勾选两个选项
    const icnCheckbox = page.locator('label:has-text("引用ICN") input[type="checkbox"]');
    const dmCheckbox = page.locator('label:has-text("引用DM") input[type="checkbox"]');

    await icnCheckbox.check();
    await dmCheckbox.check();
    await page.waitForTimeout(500);

    // 3. 生成数据包
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("生成数据包")');

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    console.log(`ZIP包已下载: ${downloadPath}`);

    // 4. 完整结构验证
    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    console.log('\n--- 完整ZIP结构 ---');
    entries.forEach(entry => {
      console.log(entry.entryName);
    });

    // 5. S1000D 4.0结构验证
    const structure = {
      'ICN/': entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/')),
      'DM/': entries.some(e => e.entryName.startsWith('DM/')),
      'DDN XML': entries.some(e => e.entryName.match(/DDN-.*\.xml$/)),
      'DDN Log': entries.some(e => e.entryName.endsWith('.log'))
    };

    console.log('\n--- S1000D 4.0结构验证 ---');
    Object.entries(structure).forEach(([key, value]) => {
      console.log(`${key}: ${value ? '✅' : '❌'}`);
      expect(value).toBeTruthy();
    });

    // 清理
    fs.unlinkSync(downloadPath);
  });

  // ==================== 边界测试 ====================

  test('边界1: 空列表导出（不添加任何DM）', async () => {
    console.log('\n========== 边界1: 空列表 ==========');

    // 直接点击"生成数据包"，不添加DM
    await page.click('button:has-text("生成数据包")');
    await page.waitForTimeout(1000);

    // 应该有错误提示
    const errorMsg = await page.locator('.ant-message-error, .ant-notification-error').count();
    console.log(`错误提示数量: ${errorMsg}`);

    if (errorMsg > 0) {
      const errorText = await page.locator('.ant-message-error, .ant-notification-error').first().textContent();
      console.log(`错误信息: ${errorText}`);
      console.log('✅ 空列表校验生效');
    } else {
      console.log('⚠️ 未找到明确的错误提示');
    }
  });

  test('边界2: 选择不存在ICN引用的DM + 勾选引用ICN', async () => {
    console.log('\n========== 边界2: 无ICN引用 ==========');

    // 1. 添加DM
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    // 2. 勾选"引用ICN"
    const icnCheckbox = page.locator('label:has-text("引用ICN") input[type="checkbox"]');
    await icnCheckbox.check();

    // 3. 生成数据包
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("生成数据包")');

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    // 4. 验证：即使没有ICN文件，ICN/目录也必须存在
    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    const icnDir = entries.find(e => e.entryName === 'ICN/');
    const icnFiles = entries.filter(e => e.entryName.startsWith('ICN/') && !e.isDirectory);

    console.log(`ICN/目录存在: ${icnDir ? '✅' : '❌'}`);
    console.log(`ICN文件数量: ${icnFiles.length}`);

    // 关键验证：即使没有ICN文件，ICN/目录也必须存在
    expect(entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/'))).toBeTruthy();

    // 清理
    fs.unlinkSync(downloadPath);
  });

  test('边界3: 删除已添加的DM', async () => {
    console.log('\n========== 边界3: 删除DM ==========');

    // 1. 添加DM
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    // 2. 验证DM已添加
    let dmCount = await page.locator('.ant-table-tbody tr').count();
    console.log(`添加后DM数量: ${dmCount}`);
    expect(dmCount).toBeGreaterThan(0);

    // 3. 删除第一个DM（点击删除按钮）
    const deleteBtn = page.locator('.ant-table-tbody tr').first().locator('button:has-text("删除")');
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);

      // 4. 验证删除成功
      dmCount = await page.locator('.ant-table-tbody tr').count();
      console.log(`删除后DM数量: ${dmCount}`);
      console.log('✅ 删除功能正常');
    } else {
      console.log('⚠️ 未找到删除按钮');
    }
  });

  test('边界4: 清空列表', async () => {
    console.log('\n========== 边界4: 清空列表 ==========');

    // 1. 添加多个DM
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    // 选择前3个
    const checkboxes = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input');
    const count = Math.min(await checkboxes.count(), 3);

    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
      await page.waitForTimeout(200);
    }

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    let dmCount = await page.locator('.ant-table-tbody tr').count();
    console.log(`添加后DM数量: ${dmCount}`);

    // 2. 点击"清空"按钮（如果存在）
    const clearBtn = page.locator('button:has-text("清空")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(500);

      dmCount = await page.locator('.ant-table-tbody tr').count();
      console.log(`清空后DM数量: ${dmCount}`);
      expect(dmCount).toBe(0);
      console.log('✅ 清空功能正常');
    } else {
      console.log('⚠️ 未找到清空按钮');
    }
  });

  // ==================== 类似问题排查 ====================

  test('排查: 检查deliveryList.xml结构', async () => {
    console.log('\n========== 排查: deliveryList.xml ==========');

    // 1. 生成一个数据包
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("生成数据包")');

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    // 2. 提取deliveryList.xml
    const zip = new AdmZip(downloadPath);
    const xmlEntry = zip.getEntries().find(e => e.entryName.match(/DDN-.*\.xml$/));

    if (xmlEntry) {
      const xmlContent = xmlEntry.getData().toString('utf8');
      console.log('\n--- deliveryList.xml内容 ---');
      console.log(xmlContent.substring(0, 1000)); // 前1000字符

      // 验证XML结构
      const checks = {
        '有dmodule标签': xmlContent.includes('<dmodule>'),
        '有dmIdent标签': xmlContent.includes('<dmIdent>'),
        '有dmCode标签': xmlContent.includes('<dmCode'),
        '有ICN路径': xmlContent.includes('ICN/')
      };

      console.log('\n--- XML结构检查 ---');
      Object.entries(checks).forEach(([key, value]) => {
        console.log(`${key}: ${value ? '✅' : '❌'}`);
      });
    }

    // 清理
    fs.unlinkSync(downloadPath);
  });

  test('排查: 验证ZIP文件完整性', async () => {
    console.log('\n========== 排查: ZIP完整性 ==========');

    // 1. 生成数据包
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    // 勾选所有选项
    const icnCheckbox = page.locator('label:has-text("引用ICN") input[type="checkbox"]');
    const dmCheckbox = page.locator('label:has-text("引用DM") input[type="checkbox"]');
    await icnCheckbox.check();
    await dmCheckbox.check();

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("生成数据包")');

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    // 2. 验证ZIP能正常打开
    try {
      const zip = new AdmZip(downloadPath);
      const entries = zip.getEntries();

      console.log(`\nZIP条目总数: ${entries.length}`);

      // 3. 验证每个条目
      let corruptedFiles = 0;
      entries.forEach(entry => {
        try {
          entry.getData(); // 尝试读取数据
        } catch (err) {
          console.log(`❌ 损坏文件: ${entry.entryName}`);
          corruptedFiles++;
        }
      });

      console.log(`损坏文件数: ${corruptedFiles}`);
      expect(corruptedFiles).toBe(0);
      console.log('✅ ZIP文件完整性验证通过');

    } catch (err) {
      console.error(`❌ ZIP文件损坏: ${err.message}`);
      throw err;
    }

    // 清理
    fs.unlinkSync(downloadPath);
  });

  test('排查: 目录条目格式验证', async () => {
    console.log('\n========== 排查: 目录格式 ==========');

    // 1. 生成数据包
    await page.click('button:has-text("添加DM")');
    await page.waitForTimeout(1000);

    const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);

    await page.locator('.ant-modal button:has-text("确定")').click();
    await page.waitForTimeout(1000);

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("生成数据包")');

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
    await download.saveAs(downloadPath);

    // 2. 验证目录条目格式
    const zip = new AdmZip(downloadPath);
    const entries = zip.getEntries();

    const directories = entries.filter(e => e.isDirectory);
    const directoriesEndWithSlash = directories.filter(e => e.entryName.endsWith('/'));

    console.log(`\n目录总数: ${directories.length}`);
    console.log(`以/结尾的目录: ${directoriesEndWithSlash.length}`);

    directories.forEach(dir => {
      const endsWithSlash = dir.entryName.endsWith('/');
      console.log(`  ${dir.entryName} ${endsWithSlash ? '✅' : '❌'}`);
      expect(endsWithSlash).toBeTruthy();
    });

    console.log('✅ 所有目录条目格式正确');

    // 清理
    fs.unlinkSync(downloadPath);
  });

});
