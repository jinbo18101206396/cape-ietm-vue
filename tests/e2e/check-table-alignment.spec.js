const { test, expect } = require('@playwright/test');

test('检查项目构型管理表格对齐', async ({ page }) => {
  // 1. 登录
  await page.goto('http://localhost:3000/user/login');
  await page.fill('input[placeholder="账号"]', 'admin');
  await page.fill('input[placeholder="密码"]', 'admin');
  await page.click('button:has-text("登录")');

  // 等待登录成功
  await page.waitForTimeout(2000);

  // 2. 打开项目（如果有的话）
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

  // 3. 导航到项目构型管理
  await page.click('text=项目管理');
  await page.waitForTimeout(500);
  await page.click('text=项目构型管理');
  await page.waitForTimeout(2000);

  // 4. 截图表格
  await page.screenshot({
    path: 'C:/Users/86135/Desktop/table-alignment.png',
    fullPage: true
  });

  // 5. 检查表格是否有 bordered 属性
  const table = page.locator('.ant-table');
  const hasBordered = await table.evaluate(el => {
    return el.classList.contains('ant-table-bordered');
  });

  console.log('表格是否有 bordered 类:', hasBordered);

  // 6. 获取表格的 scroll 配置
  const scrollX = await page.evaluate(() => {
    const vueInstance = document.querySelector('[data-v-app]').__vue__;
    return vueInstance.$children[0].$children[0].scrollX;
  });

  console.log('scrollX 值:', scrollX);

  // 7. 测量表头和表体的列宽
  const measurements = await page.evaluate(() => {
    const thead = document.querySelector('.ant-table-thead tr');
    const tbody = document.querySelector('.ant-table-tbody tr');

    if (!thead || !tbody) return null;

    const headerCells = Array.from(thead.querySelectorAll('th'));
    const bodyCells = Array.from(tbody.querySelectorAll('td'));

    return {
      headerWidths: headerCells.map(th => th.offsetWidth),
      bodyWidths: bodyCells.map(td => td.offsetWidth),
      headerTotal: headerCells.reduce((sum, th) => sum + th.offsetWidth, 0),
      bodyTotal: bodyCells.reduce((sum, td) => sum + td.offsetWidth, 0)
    };
  });

  console.log('表头列宽:', measurements?.headerWidths);
  console.log('表体列宽:', measurements?.bodyWidths);
  console.log('表头总宽:', measurements?.headerTotal);
  console.log('表体总宽:', measurements?.bodyTotal);
});
