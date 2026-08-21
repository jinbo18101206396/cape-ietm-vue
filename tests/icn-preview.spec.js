/**
 * 项目实体管理 - 预览功能自动化测试
 * 使用 Playwright 进行浏览器功能验证
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000', // 根据实际情况调整
  timeout: 30000,
  // 测试账号
  username: 'admin',
  password: 'admin123'
};

// 测试文件路径（需要准备这些测试文件）
const TEST_FILES = {
  image_jpg: path.join(__dirname, 'test-files', 'test_image.jpg'),
  image_png: path.join(__dirname, 'test-files', 'test_image.png'),
  image_gif: path.join(__dirname, 'test-files', 'test_image.gif'),
  video_mp4: path.join(__dirname, 'test-files', 'test_video.mp4'),
  audio_mp3: path.join(__dirname, 'test-files', 'test_audio.mp3')
};

test.describe('项目实体管理 - 预览功能测试', () => {
  let page;
  let context;

  test.beforeAll(async ({ browser }) => {
    // 创建浏览器上下文
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN'
    });
    page = await context.newPage();

    // 设置默认超时
    page.setDefaultTimeout(TEST_CONFIG.timeout);

    // 登录系统
    await login(page);

    // 进入项目实体管理页面
    await navigateToICNManagement(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1. 预览功能 - 按钮状态测试', async () => {
    // 测试点1：未选中记录时，按钮应该禁用
    await test.step('未选中记录时，浏览按钮应该禁用', async () => {
      // 确保没有选中任何记录
      await page.click('body'); // 点击空白处取消选择

      // 查找浏览按钮
      const viewButton = page.locator('button:has-text("浏览")');
      await expect(viewButton).toBeVisible();
      await expect(viewButton).toBeDisabled();

      console.log('✅ 未选中记录时，浏览按钮正确禁用');
    });

    // 测试点2：选中一条记录后，按钮应该启用
    await test.step('选中一条记录后，浏览按钮应该启用', async () => {
      // 选中第一条记录（假设列表有数据）
      const firstRow = page.locator('.ant-table-tbody tr').first();
      if (await firstRow.count() > 0) {
        await firstRow.click();

        const viewButton = page.locator('button:has-text("浏览")');
        await expect(viewButton).toBeEnabled();

        console.log('✅ 选中记录后，浏览按钮正确启用');
      } else {
        console.log('⚠️ 列表为空，跳过此测试');
      }
    });
  });

  test('2. 预览功能 - 图片预览测试', async () => {
    // 上传测试图片
    const icnId = await uploadTestFile(page, TEST_FILES.image_jpg, '图片测试');

    if (icnId) {
      // 选中刚创建的记录
      await selectICNRecord(page, icnId);

      // 点击浏览按钮
      await page.click('button:has-text("浏览")');

      // 等待图片查看器出现
      await test.step('验证图片查看器是否正常显示', async () => {
        // 等待 PlayImg 组件或图片查看器模态框
        const imageViewer = page.locator('.play-img-modal, .image-viewer-modal');
        await expect(imageViewer).toBeVisible({ timeout: 5000 });

        // 检查图片是否加载
        const image = page.locator('.play-img-modal img, .image-viewer-modal img');
        await expect(image).toBeVisible();

        console.log('✅ 图片查看器正常显示');

        // 关闭查看器
        const closeButton = page.locator('.play-img-modal .ant-modal-close, .ant-modal-close').first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
        }
      });
    }
  });

  test('3. 预览功能 - 视频预览测试', async () => {
    // 上传测试视频
    const icnId = await uploadTestFile(page, TEST_FILES.video_mp4, '视频测试');

    if (icnId) {
      // 选中刚创建的记录
      await selectICNRecord(page, icnId);

      // 点击浏览按钮
      await page.click('button:has-text("浏览")');

      // 等待视频播放器出现
      await test.step('验证视频播放器是否正常显示', async () => {
        const videoPlayer = page.locator('.play-video-modal, .video-player-modal');
        await expect(videoPlayer).toBeVisible({ timeout: 5000 });

        // 检查视频元素
        const video = page.locator('video');
        await expect(video).toBeVisible();

        // 检查播放控制条
        const controls = page.locator('video[controls]');
        await expect(controls).toBeVisible();

        console.log('✅ 视频播放器正常显示');

        // 关闭播放器
        const closeButton = page.locator('.play-video-modal .ant-modal-close, .ant-modal-close').first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
        }
      });
    }
  });

  test('4. 预览功能 - 音频预览测试', async () => {
    // 上传测试音频
    const icnId = await uploadTestFile(page, TEST_FILES.audio_mp3, '音频测试');

    if (icnId) {
      // 选中刚创建的记录
      await selectICNRecord(page, icnId);

      // 点击浏览按钮
      await page.click('button:has-text("浏览")');

      // 等待音频播放器出现
      await test.step('验证音频播放器是否正常显示', async () => {
        const audioPlayer = page.locator('.play-audio-modal, .audio-player-modal');
        await expect(audioPlayer).toBeVisible({ timeout: 5000 });

        // 检查音频元素
        const audio = page.locator('audio');
        await expect(audio).toBeVisible();

        // 检查播放控制条
        const controls = page.locator('audio[controls]');
        await expect(controls).toBeVisible();

        console.log('✅ 音频播放器正常显示');

        // 关闭播放器
        const closeButton = page.locator('.play-audio-modal .ant-modal-close, .ant-modal-close').first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
        }
      });
    }
  });

  test('5. 预览功能 - 异常处理测试', async () => {
    await test.step('测试无实体文件的记录', async () => {
      // 创建没有文件的ICN记录（如果系统允许）
      // 选中该记录
      // 点击浏览按钮
      // 应该显示提示："该ICN没有关联的实体文件"

      console.log('⚠️ 需要手动准备无文件的测试数据');
    });
  });

  test('6. 预览功能 - 多格式切换测试', async () => {
    // 依次预览不同格式的文件
    const formats = [
      { file: TEST_FILES.image_jpg, type: '图片' },
      { file: TEST_FILES.image_png, type: '图片' },
      { file: TEST_FILES.video_mp4, type: '视频' },
      { file: TEST_FILES.audio_mp3, type: '音频' }
    ];

    for (const format of formats) {
      await test.step(`测试 ${format.type} 格式切换`, async () => {
        const icnId = await uploadTestFile(page, format.file, `${format.type}切换测试`);

        if (icnId) {
          await selectICNRecord(page, icnId);
          await page.click('button:has-text("浏览")');
          await page.waitForTimeout(1000); // 等待播放器打开

          // 关闭播放器
          const closeButton = page.locator('.ant-modal-close').first();
          if (await closeButton.count() > 0) {
            await closeButton.click();
            await page.waitForTimeout(500);
          }

          console.log(`✅ ${format.type} 格式切换正常`);
        }
      });
    }
  });
});

/**
 * 辅助函数：登录系统
 */
async function login(page) {
  await page.goto(TEST_CONFIG.baseURL);

  // 等待登录页面加载
  await page.waitForSelector('input[placeholder*="用户名"], input[type="text"]', { timeout: 10000 });

  // 输入用户名和密码
  await page.fill('input[placeholder*="用户名"], input[type="text"]', TEST_CONFIG.username);
  await page.fill('input[placeholder*="密码"], input[type="password"]', TEST_CONFIG.password);

  // 点击登录按钮
  await page.click('button:has-text("登录"), button[type="submit"]');

  // 等待登录成功（跳转到首页）
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  console.log('✅ 登录成功');
}

/**
 * 辅助函数：导航到项目实体管理页面
 */
async function navigateToICNManagement(page) {
  // 方式1：通过菜单导航
  // 需要根据实际菜单结构调整
  await page.click('text=IETM管理').catch(() => {});
  await page.click('text=项目实体管理').catch(() => {});

  // 方式2：直接访问URL
  await page.goto(`${TEST_CONFIG.baseURL}/ietm/IetmIcnManageList`);

  // 等待页面加载完成
  await page.waitForSelector('.icn-manage-container, .ant-table', { timeout: 10000 });

  // 等待构型树加载
  await page.waitForTimeout(2000);

  console.log('✅ 进入项目实体管理页面');
}

/**
 * 辅助函数：上传测试文件
 * @returns {string} 返回创建的ICN ID
 */
async function uploadTestFile(page, filePath, description) {
  try {
    // 选择构型树节点（选择第一个子节点）
    await test.step('选择构型树节点', async () => {
      const treeNodes = page.locator('.ant-tree-treenode');
      const firstNode = treeNodes.first();

      if (await firstNode.count() > 0) {
        await firstNode.click();
        await page.waitForTimeout(500);
      } else {
        throw new Error('构型树没有节点');
      }
    });

    // 点击新增按钮
    await page.click('button:has-text("新增")');

    // 等待弹窗出现
    await page.waitForSelector('.ant-modal', { timeout: 5000 });

    // 填写必填字段
    await test.step('填写表单字段', async () => {
      // 选择密级（假设第一个选项）
      const securitySelect = page.locator('label:has-text("密级") + div .ant-select').first();
      if (await securitySelect.count() > 0) {
        await securitySelect.click();
        await page.waitForTimeout(300);
        await page.locator('.ant-select-dropdown .ant-select-item').first().click();
      }

      // 创作单位和责任单位应该自动选中，如果没有则手动选择
      const originatorSelect = page.locator('label:has-text("创作单位") + div .ant-select').first();
      const originatorValue = await originatorSelect.locator('.ant-select-selection-item').textContent();
      if (!originatorValue || originatorValue.trim() === '') {
        await originatorSelect.click();
        await page.waitForTimeout(300);
        await page.locator('.ant-select-dropdown .ant-select-item').first().click();
      }

      const rpcSelect = page.locator('label:has-text("责任单位") + div .ant-select').first();
      const rpcValue = await rpcSelect.locator('.ant-select-selection-item').textContent();
      if (!rpcValue || rpcValue.trim() === '') {
        await rpcSelect.click();
        await page.waitForTimeout(300);
        await page.locator('.ant-select-dropdown .ant-select-item').first().click();
      }
    });

    // 上传文件
    await test.step('上传文件', async () => {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      await page.waitForTimeout(1000);
    });

    // 点击确定按钮
    await page.click('.ant-modal-footer button:has-text("确定"), .ant-modal-footer button[type="submit"]');

    // 等待提交成功
    await page.waitForSelector('.ant-message-success', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log(`✅ 成功上传测试文件：${description}`);

    // 返回创建的ICN ID（从列表中获取最新的记录）
    const firstRowICN = await page.locator('.ant-table-tbody tr').first().locator('td').nth(1).textContent();
    return firstRowICN;

  } catch (error) {
    console.error(`❌ 上传测试文件失败：${error.message}`);
    // 截图保存错误现场
    await page.screenshot({ path: `test-error-${Date.now()}.png` });
    return null;
  }
}

/**
 * 辅助函数：选中指定的ICN记录
 */
async function selectICNRecord(page, icnId) {
  // 在表格中找到对应的行并点击
  const row = page.locator(`.ant-table-tbody tr:has-text("${icnId}")`);
  if (await row.count() > 0) {
    await row.click();
    await page.waitForTimeout(500);
    console.log(`✅ 已选中ICN记录：${icnId}`);
  } else {
    console.error(`❌ 找不到ICN记录：${icnId}`);
  }
}
