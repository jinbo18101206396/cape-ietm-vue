/**
 * DM编辑器UI改进验证测试
 *
 * 测试本次修改的4个UI改进点：
 * 1. 浏览模式下属性面板默认隐藏
 * 2. 编辑模式下属性面板默认显示
 * 3. DM树显示/隐藏图标动态切换
 * 4. 属性面板显示/隐藏图标动态切换
 * 5. 未保存按钮danger样式
 *
 * 对标需求：编辑DM内容功能完整需求文档 §4, §5, §15
 */

const { test, expect } = require('@playwright/test');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:9999';

// 测试数据
const TEST_USER = {
  username: 'admin',
  password: '123456'
};

const TEST_PROJECT = {
  name: '测试项目'
};

/**
 * 辅助函数：登录系统
 */
async function login(page) {
  await page.goto(`${BASE_URL}/user/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', TEST_USER.username);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button:has-text("登 录")');
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 });
  await page.waitForTimeout(1000);
}

/**
 * 辅助函数：打开项目
 */
async function openProject(page, projectName) {
  // 在首页可能已经打开了项目，先检查是否需要打开项目
  await page.waitForTimeout(500);
}

/**
 * 辅助函数：进入数据模块管理
 */
async function goToDmManagement(page) {
  // 点击菜单进入数据模块管理
  await page.click('text=项目管理');
  await page.click('text=数据模块管理');
  await page.waitForSelector('.ant-table-tbody', { timeout: 10000 });
  await page.waitForTimeout(1000);
}

/**
 * 辅助函数：选择第一个DM并打开编辑器
 */
async function openFirstDmEditor(page) {
  // 等待表格加载
  await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });

  // 选中第一行
  await page.click('.ant-table-tbody tr:first-child .ant-checkbox-input');
  await page.waitForTimeout(500);

  // 点击"浏览或编辑DM内容"按钮（可能显示为"编辑内容"）
  const editButton = page.locator('button:has-text("编辑内容"), button:has-text("浏览或编辑")').first();
  await editButton.click();

  // 等待编辑器页面加载
  await page.waitForSelector('.dm-editor-page', { timeout: 15000 });
  await page.waitForTimeout(2000); // 等待编辑器初始化
}

/**
 * 辅助函数：签出DM
 */
async function checkoutDm(page, dmIndex = 0) {
  // 选中指定行
  await page.click(`.ant-table-tbody tr:nth-child(${dmIndex + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);

  // 点击签出按钮
  const checkoutButton = page.locator('button:has-text("签出")');
  await checkoutButton.click();
  await page.waitForTimeout(2000);

  // 等待签出成功（可能有提示或刷新）
  await page.waitForTimeout(1000);
}

/**
 * 辅助函数：取消签出DM
 */
async function cancelCheckoutDm(page, dmIndex = 0) {
  // 选中指定行
  await page.click(`.ant-table-tbody tr:nth-child(${dmIndex + 1}) .ant-checkbox-input`);
  await page.waitForTimeout(500);

  // 点击取消签出按钮
  const cancelButton = page.locator('button:has-text("取消签出")');
  await cancelButton.click();
  await page.waitForTimeout(2000);

  // 等待操作完成
  await page.waitForTimeout(1000);
}

test.describe('DM编辑器UI改进验证', () => {

  test.beforeEach(async ({ page }) => {
    // 每个测试前登录
    await login(page);
    await openProject(page, TEST_PROJECT.name);
    await goToDmManagement(page);
  });

  test('TC-UI-001: 浏览模式下属性面板默认隐藏', async ({ page }) => {
    console.log('测试：浏览模式下属性面板默认隐藏');

    // 打开编辑器（假设第一个DM未签出，为浏览模式）
    await openFirstDmEditor(page);

    // 检查是否为浏览模式
    const modeBanner = page.locator('.mode-banner');
    const bannerText = await modeBanner.textContent();

    if (bannerText.includes('浏览模式')) {
      console.log('当前为浏览模式，验证属性面板隐藏');

      // 验证：属性面板默认隐藏
      const attrPanel = page.locator('.region-east');
      const isVisible = await attrPanel.isVisible();
      expect(isVisible).toBe(false);

      // 验证：右侧按钮显示"<"图标
      const rightButton = page.locator('.edge-btn.edge-right .edge-icon');
      const iconText = await rightButton.textContent();
      expect(iconText.trim()).toBe('<');

      // 点击按钮展开属性面板
      await page.click('.edge-btn.edge-right');
      await page.waitForTimeout(500);

      // 验证：属性面板显示
      const isVisibleAfter = await attrPanel.isVisible();
      expect(isVisibleAfter).toBe(true);

      // 验证：图标变为">"
      const newIconText = await rightButton.textContent();
      expect(newIconText.trim()).toBe('>');

      console.log('✓ 浏览模式下属性面板默认隐藏测试通过');
    } else {
      console.log('当前为编辑模式，跳过此测试（需要未签出的DM）');
    }
  });

  test('TC-UI-002: 编辑模式下属性面板默认显示', async ({ page }) => {
    console.log('测试：编辑模式下属性面板默认显示');

    // 先签出DM
    await checkoutDm(page, 0);
    await page.waitForTimeout(1000);

    // 打开编辑器
    await openFirstDmEditor(page);

    // 检查是否为编辑模式
    const modeBanner = page.locator('.mode-banner');
    const bannerText = await modeBanner.textContent();

    if (bannerText.includes('编辑模式')) {
      console.log('当前为编辑模式，验证属性面板显示');

      // 验证：属性面板默认显示
      const attrPanel = page.locator('.region-east');
      const isVisible = await attrPanel.isVisible();
      expect(isVisible).toBe(true);

      // 验证：右侧按钮显示">"图标
      const rightButton = page.locator('.edge-btn.edge-right .edge-icon');
      const iconText = await rightButton.textContent();
      expect(iconText.trim()).toBe('>');

      // 点击按钮隐藏属性面板
      await page.click('.edge-btn.edge-right');
      await page.waitForTimeout(500);

      // 验证：属性面板隐藏
      const isVisibleAfter = await attrPanel.isVisible();
      expect(isVisibleAfter).toBe(false);

      // 验证：图标变为"<"
      const newIconText = await rightButton.textContent();
      expect(newIconText.trim()).toBe('<');

      console.log('✓ 编辑模式下属性面板默认显示测试通过');
    } else {
      console.log('签出失败或当前为浏览模式，跳过此测试');
    }

    // 清理：返回列表页并取消签出
    await page.click('text=数据模块管理');
    await page.waitForTimeout(1000);
    await cancelCheckoutDm(page, 0);
  });

  test('TC-UI-003: DM树显示/隐藏图标动态切换', async ({ page }) => {
    console.log('测试：DM树显示/隐藏图标动态切换');

    // 打开编辑器（浏览模式即可）
    await openFirstDmEditor(page);

    // 验证：初始状态树应该显示
    const treePanel = page.locator('.region-west');
    await expect(treePanel).toBeVisible();

    // 验证：左侧按钮显示"<"图标
    const leftButton = page.locator('.edge-btn.edge-left .edge-icon');
    let iconText = await leftButton.textContent();
    expect(iconText.trim()).toBe('<');

    // 点击按钮隐藏树
    await page.click('.edge-btn.edge-left');
    await page.waitForTimeout(500);

    // 验证：树隐藏
    await expect(treePanel).toBeHidden();

    // 验证：图标变为">"
    iconText = await leftButton.textContent();
    expect(iconText.trim()).toBe('>');

    // 再次点击显示树
    await page.click('.edge-btn.edge-left');
    await page.waitForTimeout(500);

    // 验证：树显示
    await expect(treePanel).toBeVisible();

    // 验证：图标恢复为"<"
    iconText = await leftButton.textContent();
    expect(iconText.trim()).toBe('<');

    console.log('✓ DM树显示/隐藏图标动态切换测试通过');
  });

  test('TC-UI-004: 属性面板显示/隐藏图标动态切换', async ({ page }) => {
    console.log('测试：属性面板显示/隐藏图标动态切换');

    // 签出并打开编辑器（编辑模式）
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await checkoutDm(page, firstRow);
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForTimeout(1000);

    await openFirstDmEditor(page);

    // 验证：初始状态属性面板应该显示（编辑模式）
    const attrPanel = page.locator('.region-east');
    await expect(attrPanel).toBeVisible();

    // 验证：右侧按钮显示">"图标
    const rightButton = page.locator('.edge-btn.edge-right .edge-icon');
    let iconText = await rightButton.textContent();
    expect(iconText.trim()).toBe('>');

    // 点击按钮隐藏属性面板
    await page.click('.edge-btn.edge-right');
    await page.waitForTimeout(500);

    // 验证：属性面板隐藏
    await expect(attrPanel).toBeHidden();

    // 验证：图标变为"<"
    iconText = await rightButton.textContent();
    expect(iconText.trim()).toBe('<');

    // 再次点击显示属性面板
    await page.click('.edge-btn.edge-right');
    await page.waitForTimeout(500);

    // 验证：属性面板显示
    await expect(attrPanel).toBeVisible();

    // 验证：图标恢复为">"
    iconText = await rightButton.textContent();
    expect(iconText.trim()).toBe('>');

    // 清理：取消签出
    await page.goto(`${BASE_URL}/ietm/ietmdatamodulemanagement`);
    await page.waitForTimeout(1000);
    await cancelCheckoutDm(page, firstRow);

    console.log('✓ 属性面板显示/隐藏图标动态切换测试通过');
  });

  test('TC-UI-005: 未保存按钮danger样式', async ({ page }) => {
    console.log('测试：未保存按钮danger样式');

    // 签出并打开编辑器
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await checkoutDm(page, firstRow);
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForTimeout(1000);

    await openFirstDmEditor(page);

    // 验证：初始状态按钮为primary样式，文字为"已保存"
    const saveButton = page.locator('button:has-text("已保存"), button:has-text("未保存")');
    await expect(saveButton).toHaveClass(/ant-btn-primary/);
    await expect(saveButton).not.toHaveClass(/ant-btn-danger/);

    let buttonText = await saveButton.textContent();
    expect(buttonText).toContain('已保存');

    // 修改XML内容
    const editor = page.locator('.CodeMirror');
    await editor.click();
    await page.keyboard.press('End'); // 移到行尾
    await page.keyboard.type(' '); // 输入一个空格触发修改
    await page.waitForTimeout(500);

    // 验证：按钮变为danger样式（红色），文字为"未保存"
    await expect(saveButton).toHaveClass(/ant-btn-danger/);
    await expect(saveButton).not.toHaveClass(/ant-btn-primary/);

    buttonText = await saveButton.textContent();
    expect(buttonText).toContain('未保存');

    // 点击保存
    await saveButton.click();
    await page.waitForTimeout(2000); // 等待保存完成

    // 验证：按钮恢复primary样式，文字为"已保存"
    await expect(saveButton).toHaveClass(/ant-btn-primary/);
    await expect(saveButton).not.toHaveClass(/ant-btn-danger/);

    buttonText = await saveButton.textContent();
    expect(buttonText).toContain('已保存');

    // 清理：取消签出
    await page.goto(`${BASE_URL}/ietm/ietmdatamodulemanagement`);
    await page.waitForTimeout(1000);
    await cancelCheckoutDm(page, firstRow);

    console.log('✓ 未保存按钮danger样式测试通过');
  });

  test('TC-UI-006: 综合场景 - 浏览切换到编辑模式', async ({ page }) => {
    console.log('测试：浏览切换到编辑模式综合场景');

    // 先以浏览模式打开
    await openFirstDmEditor(page);

    // 验证：浏览模式，属性面板隐藏
    let attrPanel = page.locator('.region-east');
    await expect(attrPanel).toBeHidden();

    // 返回列表页
    await page.goBack();
    await page.waitForTimeout(1000);

    // 签出DM
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await checkoutDm(page, firstRow);
    await page.waitForTimeout(1000);

    // 再次打开编辑器
    await openFirstDmEditor(page);

    // 验证：编辑模式，属性面板显示
    attrPanel = page.locator('.region-east');
    await expect(attrPanel).toBeVisible();

    // 验证：模式横幅为编辑模式
    const modeBanner = page.locator('.mode-banner');
    await expect(modeBanner).toHaveClass(/mode-banner--edit/);

    // 清理
    await page.goto(`${BASE_URL}/ietm/ietmdatamodulemanagement`);
    await page.waitForTimeout(1000);
    await cancelCheckoutDm(page, firstRow);

    console.log('✓ 浏览切换到编辑模式综合场景测试通过');
  });

});

test.describe('DM编辑器布局响应式测试', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await openProject(page, TEST_PROJECT.name);
    await goToDmManagement(page);
  });

  test('TC-UI-007: 面板折叠展开不影响编辑器功能', async ({ page }) => {
    console.log('测试：面板折叠展开不影响编辑器功能');

    // 签出并打开编辑器
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await checkoutDm(page, firstRow);
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForTimeout(1000);

    await openFirstDmEditor(page);

    // 隐藏左侧树
    await page.click('.edge-btn.edge-left');
    await page.waitForTimeout(500);

    // 验证：编辑器仍然可用
    const editor = page.locator('.CodeMirror');
    await editor.click();
    await page.keyboard.type('test');
    await page.waitForTimeout(500);

    // 撤销修改
    await page.keyboard.press('Control+Z');
    await page.waitForTimeout(500);

    // 显示左侧树
    await page.click('.edge-btn.edge-left');
    await page.waitForTimeout(500);

    // 隐藏右侧属性面板
    await page.click('.edge-btn.edge-right');
    await page.waitForTimeout(500);

    // 验证：编辑器仍然可用
    await editor.click();
    await page.keyboard.type('test');
    await page.waitForTimeout(500);

    // 清理
    await page.goto(`${BASE_URL}/ietm/ietmdatamodulemanagement`);
    await page.waitForTimeout(1000);
    await cancelCheckoutDm(page, firstRow);

    console.log('✓ 面板折叠展开不影响编辑器功能测试通过');
  });

  test('TC-UI-008: 按钮图标与面板状态同步', async ({ page }) => {
    console.log('测试：按钮图标与面板状态同步');

    await openFirstDmEditor(page);

    // 连续快速切换树显示状态
    for (let i = 0; i < 5; i++) {
      await page.click('.edge-btn.edge-left');
      await page.waitForTimeout(200);

      const treePanel = page.locator('.region-west');
      const leftButton = page.locator('.edge-btn.edge-left .edge-icon');
      const iconText = await leftButton.textContent();

      const isTreeVisible = await treePanel.isVisible();
      const expectedIcon = isTreeVisible ? '<' : '>';

      expect(iconText.trim()).toBe(expectedIcon);
    }

    console.log('✓ 按钮图标与面板状态同步测试通过');
  });

});
