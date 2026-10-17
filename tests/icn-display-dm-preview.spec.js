import { test, expect } from '@playwright/test';

test.describe('ICN 图符在 DM 预览中显示验证', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 输入用户名密码（使用input type选择器）
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', '123456');

    // 点击登录（注意按钮文本有空格）
    const loginBtn = page.locator('button:has-text("登 录")');
    await loginBtn.click();

    // 等待登录完成
    await page.waitForURL(/.*/, { timeout: 30000 }).catch(() => {
      console.log('Redirect may not happen, continuing...');
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('步骤1: 导航到项目数据模块管理', async ({ page }) => {
    // 导航菜单 - 项目管理 - 项目数据模块管理
    await page.goto('/');

    // 寻找菜单项（通常在侧边栏）
    const menuItem = page.locator('text=项目数据模块管理').first();

    if (await menuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuItem.click();
    } else {
      // 如果找不到，尝试通过 URL 直接导航
      await page.goto('/jeecg-boot/ietmproject/ietmDataModuleManagement');
    }

    await page.waitForLoadState('networkidle');

    // 验证页面加载
    const pageTitle = page.locator('text=项目数据模块管理', { exact: true });
    await expect(pageTitle).toBeVisible({ timeout: 5000 });
  });

  test('步骤2-5: 打开DM预览并验证ICN图符显示', async ({ page }) => {
    // 导航到数据模块管理页
    await page.goto('/jeecg-boot/ietmproject/ietmDataModuleManagement');
    await page.waitForLoadState('networkidle');

    // 等待表格加载
    await page.waitForSelector('table', { timeout: 10000 });

    // 搜索或找到 DMC: DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="DMC"]').first();

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN');
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle');
    }

    // 查找该行记录
    const dmcCell = page.locator('text=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN');
    if (await dmcCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dmcCell.click();
    } else {
      console.log('DMC record not found, selecting first available record');
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.click();
    }

    // 查找"浏览或编辑DM内容"按钮
    const browseBtn = page.locator('button:has-text("浏览或编辑DM内容"), button:has-text("编辑DM"), button:has-text("预览")').first();

    if (await browseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await browseBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // 点击"预览"按钮
    const previewBtn = page.locator('button:has-text("预览")').last();
    if (await previewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await previewBtn.click();

      // 等待弹窗打开
      await page.waitForSelector('dialog, .el-dialog, [role="dialog"]', { timeout: 5000 }).catch(() => {
        console.log('Dialog selector not found, waiting for iframe');
      });

      // 等待内容加载
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // 检查 iframe 中的 ICN 图像
      const iframes = page.frames();
      console.log(`Found ${iframes.length} frames`);

      let icnImagesFound = 0;
      let brokenImages = 0;

      for (const frame of iframes) {
        try {
          // 查找所有 img 标签
          const images = await frame.locator('img').all();
          console.log(`Frame has ${images.length} images`);

          for (const img of images) {
            const src = await img.getAttribute('src');
            const alt = await img.getAttribute('alt');

            // 检查是否是 ICN 图像（通常是 base64 或包含 icn）
            if (src && (src.includes('base64') || src.includes('icn') || src.includes('.wrl') || src.includes('.jpg'))) {
              icnImagesFound++;
              console.log(`✓ Found ICN image: ${alt || 'unnamed'}`);

              // 验证图像是否加载成功
              const naturalWidth = await img.evaluate(el => el.naturalWidth).catch(() => 0);
              if (naturalWidth === 0) {
                brokenImages++;
                console.log(`✗ Image broken or not loaded: ${alt}`);
              } else {
                console.log(`✓ Image loaded successfully, width: ${naturalWidth}`);
              }
            }
          }
        } catch (e) {
          console.log('Error checking frame:', e.message);
        }
      }

      // 截图验证
      await page.screenshot({ path: 'icn-preview-screenshot.png' });

      // 断言验证
      test.info().annotations.push({
        type: 'ICN Test Result',
        description: `Found ${icnImagesFound} ICN images, ${brokenImages} broken`
      });

      if (icnImagesFound > 0 && brokenImages === 0) {
        console.log('✅ ICN 图符显示正常！');
        expect(icnImagesFound).toBeGreaterThan(0);
      } else if (icnImagesFound > 0 && brokenImages > 0) {
        console.log('⚠️ 部分 ICN 图符未加载');
        throw new Error(`${brokenImages} out of ${icnImagesFound} images failed to load`);
      } else {
        console.log('❌ 未找到 ICN 图符');
        throw new Error('No ICN images found in DM preview');
      }
    } else {
      console.log('Preview button not found');
      throw new Error('Could not find preview button');
    }
  });

  test('完整端到端测试: ICN 图符验证', async ({ page }) => {
    // 一次性执行所有步骤
    console.log('=== 开始 ICN 图符完整验证 ===');

    // 步骤1: 导航
    await page.goto('/jeecg-boot/ietmproject/ietmDataModuleManagement');
    console.log('✓ 已导航到项目数据模块管理页');

    await page.waitForLoadState('networkidle');

    // 步骤2: 查找并选择记录
    try {
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      console.log(`✓ 找到 ${count} 条记录`);

      if (count > 0) {
        const firstRow = rows.first();
        const dmcText = await firstRow.locator('td').first().textContent();
        console.log(`✓ 选择记录: ${dmcText}`);
        await firstRow.click();
      }
    } catch (e) {
      console.log('Warning: Could not select record:', e.message);
    }

    // 步骤3-4: 打开预览
    await page.waitForTimeout(1000);

    const allButtons = page.locator('button');
    let previewClicked = false;

    for (let i = 0; i < await allButtons.count(); i++) {
      const btn = allButtons.nth(i);
      const text = await btn.textContent();

      if (text.includes('预览') || text.includes('浏览') || text.includes('编辑')) {
        await btn.click();
        previewClicked = true;
        console.log(`✓ 已点击按钮: ${text}`);
        break;
      }
    }

    if (!previewClicked) {
      console.log('⚠️ 未找到预览按钮，使用备用方案');
    }

    // 等待弹窗
    await page.waitForTimeout(2000);

    // 步骤5: 验证 ICN 图符
    console.log('🔍 开始扫描 ICN 图符...');

    const allFrames = page.frames();
    let totalImages = 0;
    let icnImages = 0;

    for (const frame of allFrames) {
      try {
        const images = await frame.locator('img').all();
        totalImages += images.length;

        for (const img of images) {
          const src = await img.getAttribute('src');
          if (src && src.includes('base64')) {
            icnImages++;
            console.log(`✓ 发现 base64 图符`);
          }
        }
      } catch (e) {
        // Frame might be unreachable
      }
    }

    console.log(`📊 结果: 总计 ${totalImages} 张图片, ${icnImages} 张 ICN 图符`);

    // 截图
    await page.screenshot({ path: 'icn-full-test-screenshot.png' });

    if (icnImages > 0) {
      console.log('✅ ICN 图符验证成功！');
      expect(icnImages).toBeGreaterThan(0);
    } else {
      console.log('❌ 未检测到 ICN 图符');
      expect(icnImages).toBeGreaterThan(0);
    }
  });
});
