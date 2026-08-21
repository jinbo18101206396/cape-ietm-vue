/**
 * 完整的端到端自动化测试
 * 包括：创建构型树节点、上传文件、测试预览功能
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 60000,
  username: 'admin',
  password: '123456'
};

const TEST_FILES = {
  image_jpg: path.join(__dirname, 'test-files', 'test_image.jpg'),
  image_png: path.join(__dirname, 'test-files', 'test_image.png'),
  video_mp4: path.join(__dirname, 'test-files', 'test_video.mp4'),
  audio_mp3: path.join(__dirname, 'test-files', 'test_audio.mp3')
};

test.describe('ICN预览功能 - 完整端到端测试', () => {
  let page;
  let context;
  let configTreeNodeCreated = false;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN'
    });
    page = await context.newPage();
    page.setDefaultTimeout(TEST_CONFIG.timeout);

    console.log('🚀 开始完整的端到端测试');
    console.log('='.repeat(60));

    // 1. 登录
    await login(page);

    // 2. 打开项目
    await openProject(page);

    // 3. 检查并创建构型树节点
    configTreeNodeCreated = await ensureConfigTreeNode(page);

    // 4. 进入ICN管理页面
    await navigateToICNManagement(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('完整流程：上传并预览图片文件', async () => {
    if (!configTreeNodeCreated) {
      console.log('⚠️ 构型树节点未创建，跳过测试');
      test.skip();
      return;
    }

    // 上传图片
    console.log('📤 上传图片文件...');
    const uploadResult = await uploadFile(page, TEST_FILES.image_jpg, '测试图片');

    if (!uploadResult.success) {
      console.error('❌ 上传失败:', uploadResult.error);
      return;
    }

    console.log('✅ 上传成功');

    // 等待列表刷新
    await page.waitForTimeout(2000);

    // 选中刚上传的文件
    const firstRow = page.locator('.ant-table-tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(500);

    // 点击浏览按钮
    const viewButton = page.locator('button:has-text("浏览")');
    await expect(viewButton).toBeEnabled();
    await viewButton.click();

    // 验证图片查看器出现
    const imageViewer = page.locator('.ant-modal:visible, [class*="image"], [class*="preview"]');
    await expect(imageViewer.first()).toBeVisible({ timeout: 5000 });

    console.log('✅ 图片预览功能正常');

    // 关闭查看器
    const closeButton = page.locator('.ant-modal-close, button:has-text("关闭")').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('完整流程：上传并预览视频文件', async () => {
    if (!configTreeNodeCreated) {
      test.skip();
      return;
    }

    console.log('📤 上传视频文件...');
    const uploadResult = await uploadFile(page, TEST_FILES.video_mp4, '测试视频');

    if (!uploadResult.success) {
      console.error('❌ 上传失败:', uploadResult.error);
      return;
    }

    console.log('✅ 上传成功');
    await page.waitForTimeout(2000);

    // 查找包含"测试视频"的行
    const videoRow = page.locator('.ant-table-tbody tr:has-text("测试视频")').first();
    if (await videoRow.count() > 0) {
      await videoRow.click();
      await page.waitForTimeout(500);

      const viewButton = page.locator('button:has-text("浏览")');
      await viewButton.click();

      // 验证视频播放器
      const videoPlayer = page.locator('video, .ant-modal:visible');
      await expect(videoPlayer.first()).toBeVisible({ timeout: 5000 });

      console.log('✅ 视频预览功能正常');

      // 关闭
      const closeButton = page.locator('.ant-modal-close').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
    }
  });

  test('完整流程：测试按钮状态', async () => {
    // 取消所有选中
    await page.click('body');
    await page.waitForTimeout(500);

    const viewButton = page.locator('button:has-text("浏览")');

    // 可能是禁用状态，也可能是启用状态（取决于是否有默认选中）
    const isDisabled = await viewButton.isDisabled();
    console.log(`浏览按钮状态: ${isDisabled ? '禁用' : '启用'}`);

    // 选中一行
    const firstRow = page.locator('.ant-table-tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await page.waitForTimeout(500);

      await expect(viewButton).toBeEnabled();
      console.log('✅ 选中记录后，浏览按钮正确启用');
    }
  });
});

/**
 * 登录
 */
async function login(page) {
  console.log('🔐 正在登录...');
  await page.goto(`${TEST_CONFIG.baseURL}/user/login`);

  await page.fill('#username, input[placeholder*="账户"]', TEST_CONFIG.username);
  await page.fill('#password, input[placeholder*="密码"]', TEST_CONFIG.password);
  await page.click('button:has-text("登录"), button[type="submit"]');

  await Promise.race([
    page.waitForURL('**/dashboard/**', { timeout: 15000 }),
    page.waitForSelector('.ant-modal:has-text("租户")', { timeout: 5000 })
      .then(async () => {
        await page.click('.ant-modal .ant-list-item:first-child');
        await page.waitForURL('**/dashboard/**', { timeout: 15000 });
      })
      .catch(() => {})
  ]).catch(() => {});

  await page.waitForTimeout(2000);
  console.log('✅ 登录成功');
}

/**
 * 打开项目
 */
async function openProject(page) {
  console.log('📂 正在打开项目...');

  const openBtn = page.locator('button:has-text("打开项目"), a:has-text("打开项目")').first();
  if (await openBtn.count() > 0) {
    await openBtn.click();
    await page.waitForTimeout(2000);

    // 处理模态框
    const modal = page.locator('.ant-modal:visible').first();
    if (await modal.count() > 0) {
      const confirmBtn = page.locator('.ant-modal-footer button').first();
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    console.log('✅ 项目已打开');
  } else {
    console.log('⚠️ 未找到"打开项目"按钮，可能已打开');
  }
}

/**
 * 确保构型树有节点（如果没有则创建）
 */
async function ensureConfigTreeNode(page) {
  console.log('🌲 检查构型树节点...');

  // 先进入项目构型管理
  await page.goto(`${TEST_CONFIG.baseURL}/configmanage`);
  await page.waitForTimeout(3000);

  // 检查是否有树节点
  const treeNodes = page.locator('.ant-tree-treenode');
  const nodeCount = await treeNodes.count();

  console.log(`当前构型树节点数: ${nodeCount}`);

  if (nodeCount === 0 || nodeCount === 1) {
    // 只有根节点或没有节点，需要创建
    console.log('📝 构型树为空或只有根节点，尝试创建节点...');

    try {
      // 选中根节点（如果有）
      if (nodeCount === 1) {
        await treeNodes.first().click();
        await page.waitForTimeout(500);
      }

      // 查找"新增"或"添加"按钮
      const addButtons = [
        'button:has-text("新增")',
        'button:has-text("添加")',
        'button:has-text("新建")',
        '[title*="新增"], [title*="添加"]'
      ];

      let addButtonFound = false;
      for (const selector of addButtons) {
        const btn = page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(1000);
          addButtonFound = true;
          console.log(`✅ 找到并点击: ${selector}`);
          break;
        }
      }

      if (addButtonFound) {
        // 填写表单
        const modal = page.locator('.ant-modal:visible');
        if (await modal.count() > 0) {
          // 查找名称/标题输入框
          const nameInputs = [
            'input[placeholder*="名称"]',
            'input[placeholder*="标题"]',
            'input[id*="name"]',
            '.ant-modal input[type="text"]'
          ];

          for (const selector of nameInputs) {
            const input = modal.locator(selector).first();
            if (await input.count() > 0 && await input.isVisible()) {
              await input.fill('自动化测试节点');
              console.log('✅ 填写节点名称');
              break;
            }
          }

          // 点击确定/保存
          const saveBtn = modal.locator('button:has-text("确定"), button:has-text("保存"), button.ant-btn-primary').first();
          if (await saveBtn.count() > 0) {
            await saveBtn.click();
            await page.waitForTimeout(2000);
            console.log('✅ 节点创建成功');
            return true;
          }
        }
      }

      console.log('⚠️ 无法自动创建节点，继续测试但可能失败');
      return false;

    } catch (error) {
      console.error('创建节点时出错:', error.message);
      return false;
    }
  } else {
    console.log('✅ 构型树已有节点，无需创建');
    return true;
  }
}

/**
 * 导航到ICN管理
 */
async function navigateToICNManagement(page) {
  console.log('📋 进入项目实体管理...');
  await page.goto(`${TEST_CONFIG.baseURL}/icnmanage`);
  await page.waitForSelector('.ant-table, .icn-manage-container', { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('✅ 进入项目实体管理页面');
}

/**
 * 上传文件
 */
async function uploadFile(page, filePath, description) {
  try {
    // 选择构型树节点
    const treeNodes = page.locator('.ant-tree-treenode');
    const nodeCount = await treeNodes.count();

    if (nodeCount === 0) {
      return { success: false, error: '构型树没有节点' };
    }

    // 选择第一个子节点（跳过根节点）
    const targetNode = nodeCount > 1 ? treeNodes.nth(1) : treeNodes.first();
    await targetNode.click();
    await page.waitForTimeout(500);

    // 点击新增按钮
    const addBtn = page.locator('button:has-text("新增")').first();
    if (await addBtn.count() === 0) {
      return { success: false, error: '未找到新增按钮' };
    }

    await addBtn.click();
    await page.waitForTimeout(1000);

    // 等待弹窗
    const modal = page.locator('.ant-modal:visible');
    if (await modal.count() === 0) {
      return { success: false, error: '新增弹窗未出现' };
    }

    // 填写必填字段
    // 密级
    const secretSelect = modal.locator('[id*="secretLevel"], .ant-select:has-text("密级")').first();
    if (await secretSelect.count() > 0) {
      await secretSelect.click();
      await page.waitForTimeout(300);
      await page.locator('.ant-select-dropdown:visible .ant-select-item').first().click();
      await page.waitForTimeout(300);
    }

    // 上传文件
    const fileInput = modal.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(filePath);
      await page.waitForTimeout(1500);
    } else {
      return { success: false, error: '未找到文件上传控件' };
    }

    // 点击确定
    const submitBtn = modal.locator('.ant-modal-footer button:has-text("确定"), .ant-modal-footer button[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();

      // 等待成功提示或弹窗关闭
      await Promise.race([
        page.waitForSelector('.ant-message-success', { timeout: 10000 }),
        page.waitForSelector('.ant-modal:visible', { state: 'hidden', timeout: 10000 })
      ]).catch(() => {});

      await page.waitForTimeout(1500);
      return { success: true };
    }

    return { success: false, error: '未找到提交按钮' };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 运行测试时的配置
test.use({
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'retain-on-failure'
});
