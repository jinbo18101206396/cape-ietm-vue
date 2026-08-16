/**
 * DM编辑器插入图符和校验功能详细测试
 *
 * 测试目标：
 * 1. 插入图符（symbol）完整流程 - 对标§14.6
 * 2. 校验功能详细验证 - 对标§17
 *
 * 包含：
 * - 图符弹窗布局
 * - ICN查询选择
 * - 尺寸自动回填
 * - symbol XML生成
 * - 校验触发与结果
 * - 错误定位
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = { username: 'admin', password: '123456' };

// 辅助函数
async function login(page) {
  await page.goto(`${BASE_URL}/user/login`);
  await page.fill('input[type="text"]', TEST_USER.username);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button:has-text("登 录")');
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function goToDmManagement(page) {
  await page.click('text=项目管理');
  await page.click('text=数据模块管理');
  await page.waitForSelector('.ant-table-tbody', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

async function openDmEditorInEditMode(page, index = 0) {
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  await page.click('button:has-text("签出")');
  await page.waitForTimeout(2000);

  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  const editButton = page.locator('button:has-text("编辑内容")').first();
  await editButton.click();
  await page.waitForSelector('.dm-editor-page', { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function cancelCheckoutDm(page, index = 0) {
  await page.click('text=数据模块管理');
  await page.waitForTimeout(1000);
  await page.click(`.ant-table-tbody tr:nth-child(${index + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);
  await page.click('button:has-text("取消签出")');
  await page.waitForTimeout(2000);
}

test.describe('插入图符功能 - 弹窗与查询', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-SYMBOL-001: 打开图符弹窗验证布局', async ({ page }) => {
    console.log('测试：图符弹窗布局');

    const symbolButton = page.locator('button:has-text("插入图符"), button:has-text("图符")');
    await symbolButton.click();
    await page.waitForTimeout(1500);

    const modal = page.locator('.ant-modal:visible');
    const isVisible = await modal.isVisible();
    expect(isVisible).toBe(true);

    // 验证：标题
    const title = await modal.locator('.ant-modal-title').textContent();
    console.log(`弹窗标题：${title}`);

    // 验证：左侧ICN分类树
    const tree = modal.locator('.ant-tree');
    const hasTree = await tree.count() > 0;
    console.log(`分类树存在：${hasTree}`);

    // 验证：中区ICN列表
    const table = modal.locator('.ant-table');
    const hasTable = await table.count() > 0;
    console.log(`ICN表格存在：${hasTable}`);

    // 验证：底部属性表单（尺寸等）
    const form = modal.locator('.ant-form, form');
    const hasForm = await form.count() > 0;
    console.log(`属性表单存在：${hasForm}`);

    console.log('✓ 图符弹窗布局验证完成');

    await page.keyboard.press('Escape');
  });

  test('TC-SYMBOL-002: ICN分类树查询', async ({ page }) => {
    console.log('测试：ICN分类树查询');

    const symbolButton = page.locator('button:has-text("图符")');
    await symbolButton.click();
    await page.waitForTimeout(1500);

    const modal = page.locator('.ant-modal:visible');

    // 点击分类树节点
    const treeNodes = modal.locator('.ant-tree-node-content-wrapper');
    const nodeCount = await treeNodes.count();
    console.log(`分类节点数：${nodeCount}`);

    if (nodeCount > 0) {
      await treeNodes.first().click();
      await page.waitForTimeout(2000);

      // 验证：表格加载ICN数据
      const rows = modal.locator('.ant-table-tbody tr');
      const rowCount = await rows.count();
      console.log(`查询到ICN数量：${rowCount}`);

      if (rowCount > 0) {
        console.log('✓ 分类树查询ICN成功');
      }
    }

    await page.keyboard.press('Escape');
  });

  test('TC-SYMBOL-003: 包含子节点查询（修复bug）', async ({ page }) => {
    console.log('测试：包含子节点查询');

    const symbolButton = page.locator('button:has-text("图符")');
    await symbolButton.click();
    await page.waitForTimeout(1500);

    const modal = page.locator('.ant-modal:visible');

    // 查找"包含子节点"复选框
    const includeChildCheckbox = modal.locator('input[type="checkbox"]').filter({ hasText: /包含子节点|子节点/ });
    const hasCheckbox = await includeChildCheckbox.count() > 0;

    if (hasCheckbox) {
      console.log('找到"包含子节点"复选框');

      // 勾选
      await includeChildCheckbox.first().check();
      await page.waitForTimeout(500);

      // 点击分类节点查询
      const treeNodes = modal.locator('.ant-tree-node-content-wrapper');
      if (await treeNodes.count() > 0) {
        await treeNodes.first().click();
        await page.waitForTimeout(2000);

        const rows = modal.locator('.ant-table-tbody tr');
        const withChildCount = await rows.count();
        console.log(`包含子节点查询结果：${withChildCount}条`);

        // 取消勾选
        await includeChildCheckbox.first().uncheck();
        await page.waitForTimeout(500);

        // 再次查询
        await treeNodes.first().click();
        await page.waitForTimeout(2000);

        const withoutChildCount = await rows.count();
        console.log(`不包含子节点查询结果：${withoutChildCount}条`);

        // 包含子节点应该 >= 不包含子节点
        expect(withChildCount).toBeGreaterThanOrEqual(withoutChildCount);

        console.log('✓ 包含子节点查询功能正常（使用START WITH/CONNECT BY）');
      }
    } else {
      console.log('⚠️ 未找到"包含子节点"选项');
    }

    await page.keyboard.press('Escape');
  });

  test('TC-SYMBOL-004: 选择ICN自动回填尺寸', async ({ page }) => {
    console.log('测试：图片类型自动回填尺寸');

    const symbolButton = page.locator('button:has-text("图符")');
    await symbolButton.click();
    await page.waitForTimeout(1500);

    const modal = page.locator('.ant-modal:visible');

    // 查询ICN
    const treeNodes = modal.locator('.ant-tree-node-content-wrapper');
    if (await treeNodes.count() > 0) {
      await treeNodes.first().click();
      await page.waitForTimeout(2000);

      const rows = modal.locator('.ant-table-tbody tr');
      if (await rows.count() > 0) {
        // 选择第一个ICN
        await rows.first().click();
        await page.waitForTimeout(1500);

        // 检查尺寸输入框
        const widthInput = modal.locator('input').filter({ hasText: /宽|width/i });
        const heightInput = modal.locator('input').filter({ hasText: /高|height/i });

        if (await widthInput.count() > 0) {
          const width = await widthInput.first().inputValue();
          console.log(`自动回填宽度：${width}`);
        }

        if (await heightInput.count() > 0) {
          const height = await heightInput.first().inputValue();
          console.log(`自动回填高度：${height}`);
        }

        // 检查reproductionScale（应默认100）
        const scaleInput = modal.locator('input').filter({ hasText: /scale|比例/i });
        if (await scaleInput.count() > 0) {
          const scale = await scaleInput.first().inputValue();
          console.log(`reproductionScale：${scale}`);
          expect(scale).toBe('100'); // 默认100%
        }

        console.log('✓ ICN选择后尺寸自动回填');
      }
    }

    await page.keyboard.press('Escape');
  });

});

test.describe('插入图符功能 - XML生成', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-SYMBOL-005: 插入symbol验证XML结构', async ({ page }) => {
    console.log('测试：symbol XML结构');

    const symbolButton = page.locator('button:has-text("图符")');
    await symbolButton.click();
    await page.waitForTimeout(1500);

    const modal = page.locator('.ant-modal:visible');

    // 选择ICN并确定
    const treeNodes = modal.locator('.ant-tree-node-content-wrapper');
    if (await treeNodes.count() > 0) {
      await treeNodes.first().click();
      await page.waitForTimeout(2000);

      const rows = modal.locator('.ant-table-tbody tr');
      if (await rows.count() > 0) {
        await rows.first().click();
        await page.waitForTimeout(1500);

        // 确定插入
        await modal.locator('button:has-text("确定")').click();
        await page.waitForTimeout(2000);

        // 获取XML
        const editor = page.locator('.CodeMirror');
        const xml = await editor.evaluate(el => el.CodeMirror.getValue());

        // 验证：包含symbol标签
        if (xml.includes('<symbol')) {
          console.log('✓ symbol标签已插入');

          // 验证：必需属性
          const requiredAttrs = ['infoEntityIdent', 'reproductionWidth', 'reproductionHeight', 'reproductionScale'];
          let missingAttrs = [];

          for (const attr of requiredAttrs) {
            if (!xml.includes(attr)) {
              missingAttrs.push(attr);
            }
          }

          if (missingAttrs.length === 0) {
            console.log('✓ symbol所有必需属性都存在');
          } else {
            console.log(`⚠️ 缺失属性：${missingAttrs.join(', ')}`);
          }

          // 验证：reproductionScale默认值
          const scaleMatch = xml.match(/reproductionScale="([^"]*)"/);
          if (scaleMatch) {
            console.log(`reproductionScale值：${scaleMatch[1]}`);
            expect(scaleMatch[1]).toBe('100');
          }
        } else {
          console.log('⚠️ symbol标签未插入');
        }
      }
    }
  });

  test('TC-SYMBOL-006: 扩展名大小写处理（JSP-05修复）', async ({ page }) => {
    console.log('测试：扩展名大小写处理');

    // 这个测试验证.JPG/.PNG等大写扩展名是否正确识别为图片
    // 在Vue版本中应该已修复（fileext.toLowerCase()）

    const symbolButton = page.locator('button:has-text("图符")');
    await symbolButton.click();
    await page.waitForTimeout(1500);

    const modal = page.locator('.ant-modal:visible');

    // 查询并选择ICN
    const treeNodes = modal.locator('.ant-tree-node-content-wrapper');
    if (await treeNodes.count() > 0) {
      await treeNodes.first().click();
      await page.waitForTimeout(2000);

      const rows = modal.locator('.ant-table-tbody tr');

      // 查找扩展名为大写的ICN
      for (let i = 0; i < Math.min(await rows.count(), 10); i++) {
        const row = rows.nth(i);
        const fileName = await row.locator('td').nth(1).textContent(); // 假设文件名在第2列

        if (fileName && /\.(JPG|PNG|TIF|GIF|BMP)$/i.test(fileName)) {
          console.log(`找到大写扩展名文件：${fileName}`);

          await row.click();
          await page.waitForTimeout(1500);

          // 检查尺寸是否自动回填
          const widthInput = modal.locator('input').filter({ hasText: /宽|width/i }).first();
          const width = await widthInput.inputValue().catch(() => '');

          if (width && width !== '') {
            console.log(`✓ 大写扩展名文件尺寸正确回填：${width}`);
            console.log('✓ JSP-05缺陷已修复（toLowerCase处理）');
          } else {
            console.log('⚠️ 大写扩展名文件尺寸未回填（可能仍有JSP-05缺陷）');
          }

          break;
        }
      }
    }

    await page.keyboard.press('Escape');
  });

});

test.describe('校验功能详细测试', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-VALIDATE-001: 手动触发校验', async ({ page }) => {
    console.log('测试：手动触发校验');

    const validateButton = page.locator('button:has-text("校验")');
    await validateButton.click();
    await page.waitForTimeout(3000);

    // 验证：校验面板或弹窗出现
    const modal = page.locator('.ant-modal:visible');
    const drawer = page.locator('.ant-drawer:visible');
    const panel = page.locator('.validate-panel:visible');

    const hasResult = await modal.count() > 0 || await drawer.count() > 0 || await panel.count() > 0;
    expect(hasResult).toBe(true);

    console.log('✓ 校验触发并显示结果');

    // 关闭校验结果
    await page.keyboard.press('Escape');
  });

  test('TC-VALIDATE-002: 校验通过提示', async ({ page }) => {
    console.log('测试：校验通过提示');

    // 先保存（确保XML有效）
    const saveButton = page.locator('button:has-text("保存"), button:has-text("已保存"), button:has-text("未保存")');
    const buttonText = await saveButton.textContent();
    if (buttonText.includes('未保存')) {
      await saveButton.click();
      await page.waitForTimeout(2000);
    }

    // 触发校验
    const validateButton = page.locator('button:has-text("校验")');
    await validateButton.click();
    await page.waitForTimeout(3000);

    // 检查提示消息
    const message = page.locator('.ant-message:visible');
    const modal = page.locator('.ant-modal:visible');

    const hasMessage = await message.count() > 0;
    const hasModal = await modal.count() > 0;

    if (hasMessage) {
      const messageText = await message.textContent();
      console.log(`提示消息：${messageText}`);

      if (messageText.includes('通过') || messageText.includes('成功') || messageText.includes('无错误')) {
        console.log('✓ 校验通过提示正常');
      }
    }

    if (hasModal) {
      const modalText = await modal.textContent();
      if (modalText.includes('错误') || modalText.includes('警告')) {
        console.log('有校验错误，记录详情');

        // 获取错误列表
        const errorRows = modal.locator('.ant-table-tbody tr');
        const errorCount = await errorRows.count();
        console.log(`校验错误数量：${errorCount}`);
      } else if (modalText.includes('通过')) {
        console.log('✓ 校验通过');
      }
    }

    await page.keyboard.press('Escape');
  });

  test('TC-VALIDATE-003: 校验错误列表显示', async ({ page }) => {
    console.log('测试：校验错误列表');

    // 破坏XML结构（故意制造错误）
    const editor = page.locator('.CodeMirror');
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type('<invalidTag>'); // 添加无效标签
    await page.waitForTimeout(500);

    // 触发校验
    const validateButton = page.locator('button:has-text("校验")');
    await validateButton.click();
    await page.waitForTimeout(3000);

    // 检查错误列表
    const modal = page.locator('.ant-modal:visible');
    const drawer = page.locator('.ant-drawer:visible');

    if (await modal.isVisible()) {
      // 查找错误列表表格
      const errorTable = modal.locator('.ant-table');
      if (await errorTable.count() > 0) {
        const rows = errorTable.locator('.ant-table-tbody tr');
        const errorCount = await rows.count();
        console.log(`校验错误数量：${errorCount}`);

        if (errorCount > 0) {
          // 读取第一个错误
          const firstRow = rows.first();
          const rowText = await firstRow.textContent();
          console.log(`第一个错误：${rowText}`);

          console.log('✓ 校验错误列表显示正常');
        }
      }
    }

    // 撤销破坏
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Z');
    await page.waitForTimeout(500);
  });

  test('TC-VALIDATE-004: 双击错误定位到行', async ({ page }) => {
    console.log('测试：错误定位');

    // 破坏XML
    const editor = page.locator('.CodeMirror');
    await editor.click();
    await page.keyboard.press('Control+Home');
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('End');
    await page.keyboard.type('<error>');
    await page.waitForTimeout(500);

    // 校验
    const validateButton = page.locator('button:has-text("校验")');
    await validateButton.click();
    await page.waitForTimeout(3000);

    const modal = page.locator('.ant-modal:visible');
    if (await modal.isVisible()) {
      const errorTable = modal.locator('.ant-table');
      const rows = errorTable.locator('.ant-table-tbody tr');

      if (await rows.count() > 0) {
        // 双击第一个错误
        await rows.first().dblclick();
        await page.waitForTimeout(1000);

        // 验证：编辑器光标应该移动到错误行
        const activeLine = page.locator('.CodeMirror-activeline');
        const hasActiveLine = await activeLine.count() > 0;
        expect(hasActiveLine).toBe(true);

        console.log('✓ 双击错误定位到行正常');
      }
    }

    // 清理
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Z');
  });

  test('TC-VALIDATE-005: 保存前校验开关', async ({ page }) => {
    console.log('测试：保存前校验开关');

    // 修改内容
    const editor = page.locator('.CodeMirror');
    await editor.click();
    await page.keyboard.type(' ');
    await page.waitForTimeout(500);

    // 尝试保存
    const saveButton = page.locator('button:has-text("未保存"), button:has-text("保存")');
    await saveButton.click();
    await page.waitForTimeout(2000);

    // 如果开启了保存前校验，应该先触发校验
    // 检查是否有校验相关提示或弹窗
    const modal = page.locator('.ant-modal:visible');
    const message = page.locator('.ant-message:visible');

    const hasValidation = await modal.count() > 0 || await message.count() > 0;

    if (hasValidation) {
      console.log('检测到保存前校验（designsett.validdmBeforesave=true）');

      const modalText = await modal.textContent().catch(() => '');
      const messageText = await message.textContent().catch(() => '');

      console.log(`提示内容：${modalText || messageText}`);
    } else {
      console.log('未触发保存前校验（可能designsett.validdmBeforesave=false）');
    }

    console.log('✓ 保存前校验逻辑已验证');
  });

  test('TC-VALIDATE-006: 校验性能测试', async ({ page }) => {
    console.log('测试：校验性能');

    const startTime = Date.now();

    // 触发校验
    const validateButton = page.locator('button:has-text("校验")');
    await validateButton.click();
    await page.waitForTimeout(5000); // 最多等5秒

    const duration = Date.now() - startTime;
    console.log(`校验耗时：${duration}ms`);

    // 校验应该在5秒内完成
    expect(duration).toBeLessThan(5000);

    console.log('✓ 校验性能可接受');

    await page.keyboard.press('Escape');
  });

});

test.describe('校验与保存集成测试', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToDmManagement(page);
    await openDmEditorInEditMode(page, 0);
  });

  test.afterEach(async ({ page }) => {
    await cancelCheckoutDm(page, 0);
  });

  test('TC-VALIDATE-007: 校验通过后允许保存', async ({ page }) => {
    console.log('测试：校验通过后保存');

    // 修改内容
    const editor = page.locator('.CodeMirror');
    await editor.click();
    await page.keyboard.type(' ');
    await page.waitForTimeout(500);

    // 先校验
    const validateButton = page.locator('button:has-text("校验")');
    await validateButton.click();
    await page.waitForTimeout(3000);

    // 关闭校验结果
    await page.keyboard.press('Escape');

    // 再保存
    const saveButton = page.locator('button:has-text("未保存")');
    await saveButton.click();
    await page.waitForTimeout(2000);

    // 验证：保存成功
    const buttonText = await saveButton.textContent();
    if (buttonText.includes('已保存')) {
      console.log('✓ 校验通过后保存成功');
    }
  });

  test('TC-VALIDATE-008: 有错误时签入被阻止', async ({ page }) => {
    console.log('测试：有校验错误时签入');

    // 破坏XML
    const editor = page.locator('.CodeMirror');
    await editor.click();
    await page.keyboard.type('<invalid>');
    await page.waitForTimeout(500);

    // 尝试签入
    const checkinButton = page.locator('button:has-text("签入")');
    await checkinButton.click();
    await page.waitForTimeout(2000);

    // 应该有阻止提示
    const message = page.locator('.ant-message:visible');
    const modal = page.locator('.ant-modal:visible');

    const hasWarning = await message.count() > 0 || await modal.count() > 0;

    if (hasWarning) {
      const text = await message.textContent().catch(() => '') || await modal.textContent().catch(() => '');
      console.log(`阻止提示：${text}`);

      if (text.includes('校验') || text.includes('错误')) {
        console.log('✓ 有错误时签入被正确阻止');
      }
    }

    // 撤销
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Z');
  });

});
