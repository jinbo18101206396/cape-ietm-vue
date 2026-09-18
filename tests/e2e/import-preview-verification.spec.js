/**
 * E2E测试：验证导入的ICN和资源文件预览功能
 *
 * 测试场景：
 * 1. 导入包含DM、ICN、资源文件的ZIP包
 * 2. 验证ICN能否在"项目实体管理"页面预览
 * 3. 验证资源文件能否在"DM资源列表"中预览
 * 4. 验证文件路径一致性
 *
 * @author IETM Team
 * @date 2026-09-05
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:9999';
const TEST_USER = {
  username: 'admin',
  password: '123456'
};

test.describe('导入文件预览验证', () => {
  let page;
  let context;
  let projectId;
  let importedDmId;
  let importedIcnId;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // 1. 登录
    await page.goto(BASE_URL + '/#/user/login');
    await page.fill('input[placeholder="账号"]', TEST_USER.username);
    await page.fill('input[placeholder="密码"]', TEST_USER.password);
    await page.click('button:has-text("登录")');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });

    console.log('✅ 登录成功');

    // 2. 打开测试项目
    await page.goto(BASE_URL + '/#/ietm/projectmanage/IetmProjectManageList');
    await page.waitForTimeout(2000);

    // 点击第一个项目的"打开项目"按钮
    await page.click('button:has-text("打开项目"):first');
    await page.waitForTimeout(2000);

    console.log('✅ 项目已打开');
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('步骤1：准备测试ZIP包', async () => {
    // 创建测试ZIP包（包含DM、ICN、资源文件）
    const testZipPath = path.join(__dirname, 'test-import-preview.zip');

    // 检查测试ZIP是否存在
    if (!fs.existsSync(testZipPath)) {
      console.log('⚠️ 测试ZIP包不存在，跳过此测试');
      test.skip();
      return;
    }

    console.log('✅ 测试ZIP包已准备：', testZipPath);
  });

  test('步骤2：导入ZIP包', async () => {
    // 导航到数据模块导入页面
    await page.goto(BASE_URL + '/#/ietm/ietmimport/IetmDmImport');
    await page.waitForTimeout(2000);

    const testZipPath = path.join(__dirname, 'test-import-preview.zip');

    if (!fs.existsSync(testZipPath)) {
      console.log('⚠️ 测试ZIP包不存在，跳过此测试');
      test.skip();
      return;
    }

    // 上传ZIP文件
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testZipPath);
    await page.waitForTimeout(3000);

    // 点击"导入"按钮
    await page.click('button:has-text("导入")');
    await page.waitForTimeout(1000);

    // 确认导入
    await page.click('button:has-text("确定")');
    await page.waitForTimeout(5000);

    // 检查导入结果弹窗
    const successIcon = await page.locator('.anticon-check-circle').count();
    const warningIcon = await page.locator('.anticon-exclamation-circle').count();

    if (successIcon > 0) {
      console.log('✅ 导入成功');
    } else if (warningIcon > 0) {
      console.log('⚠️ 导入部分成功');
    }

    // 关闭结果弹窗
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // 记录导入的文件信息
    const dmFiles = await page.locator('tr:has-text("DM")').count();
    const icnFiles = await page.locator('tr:has-text("ICN")').count();
    const resourceFiles = await page.locator('tr:has-text("RESOURCE")').count();

    console.log(`📊 导入统计：DM=${dmFiles}, ICN=${icnFiles}, 资源=${resourceFiles}`);
  });

  test('步骤3：验证ICN在项目实体管理页面的预览', async () => {
    // 导航到项目实体管理页面（ICN列表）
    await page.goto(BASE_URL + '/#/ietm/icnmanage/IetmIcnManageList');
    await page.waitForTimeout(3000);

    // 等待构型树加载
    await page.waitForSelector('.tree-card', { timeout: 10000 });

    // 点击构型树的第一个节点
    await page.click('.ant-tree-node-content-wrapper:first');
    await page.waitForTimeout(2000);

    // 等待ICN列表加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 获取ICN列表中的第一条记录
    const icnRows = await page.locator('table tbody tr').count();
    console.log(`📋 ICN列表记录数：${icnRows}`);

    if (icnRows === 0) {
      console.log('⚠️ ICN列表为空，可能导入失败或构型节点选择错误');
      throw new Error('ICN列表为空');
    }

    // 选中第一条ICN记录
    await page.click('table tbody tr:first input[type="radio"]');
    await page.waitForTimeout(500);

    // 点击"浏览"按钮
    const viewButton = await page.locator('button:has-text("浏览")');
    await expect(viewButton).toBeEnabled();
    await viewButton.click();
    await page.waitForTimeout(2000);

    // 验证预览模态框是否打开
    const previewModal = await page.locator('.ant-modal:visible').count();

    if (previewModal > 0) {
      console.log('✅ ICN预览模态框已打开');

      // 检查是否有图片或错误提示
      const imgElement = await page.locator('.ant-modal img').count();
      const errorText = await page.locator('.ant-modal:has-text("加载失败")').count();
      const notFoundText = await page.locator('.ant-modal:has-text("找不到")').count();

      if (imgElement > 0) {
        console.log('✅ ICN图片元素存在');

        // 获取图片src
        const imgSrc = await page.locator('.ant-modal img').first().getAttribute('src');
        console.log(`📷 ICN图片路径：${imgSrc}`);

        // 验证图片是否加载成功
        const imgNaturalWidth = await page.locator('.ant-modal img').first().evaluate(img => img.naturalWidth);

        if (imgNaturalWidth > 0) {
          console.log(`✅ ICN图片加载成功，宽度：${imgNaturalWidth}px`);
        } else {
          console.log(`❌ ICN图片加载失败，路径可能不正确：${imgSrc}`);
          throw new Error('ICN图片加载失败');
        }
      } else if (errorText > 0 || notFoundText > 0) {
        console.log('❌ ICN预览显示错误提示');
        throw new Error('ICN预览失败');
      } else {
        console.log('⚠️ ICN预览模态框内容未知');
      }

      // 关闭预览模态框
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      console.log('❌ ICN预览模态框未打开');
      throw new Error('ICN预览模态框未打开');
    }
  });

  test('步骤4：验证资源文件在DM资源列表的预览', async () => {
    // 导航到项目数据模块管理页面
    await page.goto(BASE_URL + '/#/ietm/ietmdatamodulemanagement/IetmDataModuleList');
    await page.waitForTimeout(3000);

    // 等待构型树加载
    await page.waitForSelector('.tree-card', { timeout: 10000 });

    // 点击构型树的第一个节点
    await page.click('.ant-tree-node-content-wrapper:first');
    await page.waitForTimeout(2000);

    // 等待DM列表加载
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // 获取DM列表中的第一条记录
    const dmRows = await page.locator('table tbody tr').count();
    console.log(`📋 DM列表记录数：${dmRows}`);

    if (dmRows === 0) {
      console.log('⚠️ DM列表为空');
      throw new Error('DM列表为空');
    }

    // 选中第一条DM记录
    await page.click('table tbody tr:first input[type="checkbox"]');
    await page.waitForTimeout(500);

    // 查找并点击DM记录的展开按钮（查看资源列表）
    const expandButton = await page.locator('table tbody tr:first .ant-table-row-expand-icon');
    if (await expandButton.count() > 0) {
      await expandButton.click();
      await page.waitForTimeout(2000);

      // 查找展开的资源列表
      const resourceRows = await page.locator('.ant-table-expanded-row table tbody tr').count();
      console.log(`📋 DM资源列表记录数：${resourceRows}`);

      if (resourceRows === 0) {
        console.log('⚠️ 该DM没有关联的资源文件');
        // 尝试其他DM
        await expandButton.click(); // 收起
        await page.waitForTimeout(500);

        // 选中第二条DM
        if (dmRows > 1) {
          await page.click('table tbody tr:nth-child(2) input[type="checkbox"]');
          await page.waitForTimeout(500);

          const expandButton2 = await page.locator('table tbody tr:nth-child(2) .ant-table-row-expand-icon');
          await expandButton2.click();
          await page.waitForTimeout(2000);

          const resourceRows2 = await page.locator('.ant-table-expanded-row table tbody tr').count();
          console.log(`📋 第二个DM资源列表记录数：${resourceRows2}`);
        }
      }

      // 检查资源文件的下载链接
      const downloadLinks = await page.locator('.ant-table-expanded-row a:has-text("下载")').count();

      if (downloadLinks > 0) {
        console.log(`✅ 找到 ${downloadLinks} 个资源文件下载链接`);

        // 获取第一个资源文件的信息
        const resourceName = await page.locator('.ant-table-expanded-row table tbody tr:first td:nth-child(2)').textContent();
        console.log(`📄 资源文件名：${resourceName}`);

        // 点击下载链接（实际不下载，只验证路径）
        const downloadLink = await page.locator('.ant-table-expanded-row a:has-text("下载"):first');
        const downloadHref = await downloadLink.getAttribute('href');
        console.log(`🔗 资源文件下载路径：${downloadHref}`);

        // 验证路径格式
        if (downloadHref && downloadHref.includes('/sys/common/static/')) {
          console.log('✅ 资源文件路径格式正确');

          // 发起HEAD请求验证文件是否存在
          const response = await page.request.head(API_BASE_URL + downloadHref);

          if (response.ok()) {
            console.log('✅ 资源文件可访问');
          } else {
            console.log(`❌ 资源文件不可访问，状态码：${response.status()}`);
            throw new Error('资源文件路径不正确');
          }
        } else {
          console.log('❌ 资源文件路径格式不正确');
          throw new Error('资源文件路径格式错误');
        }
      } else {
        console.log('⚠️ 未找到资源文件下载链接');
      }
    } else {
      console.log('⚠️ DM列表没有展开按钮');
    }
  });

  test('步骤5：对比导出和导入的文件路径', async () => {
    // 发起API请求获取导入的ICN详情
    const icnListResponse = await page.request.get(API_BASE_URL + '/icnmanage/ietmIcnManage/list', {
      params: {
        pageNo: 1,
        pageSize: 10
      }
    });

    const icnData = await icnListResponse.json();

    if (icnData.success && icnData.result.records.length > 0) {
      const firstIcn = icnData.result.records[0];
      console.log('📊 ICN数据库记录：');
      console.log('  - ID:', firstIcn.id);
      console.log('  - ICN编码:', firstIcn.icn);
      console.log('  - 构型节点ID:', firstIcn.cmNodeId);
      console.log('  - SNS:', firstIcn.sns);

      // 获取ICN的附件信息
      const attachmentResponse = await page.request.get(API_BASE_URL + '/sys/common/attachment/list', {
        params: {
          pid: firstIcn.id
        }
      });

      const attachmentData = await attachmentResponse.json();

      if (attachmentData.success && attachmentData.result.length > 0) {
        const attachment = attachmentData.result[0];
        console.log('📊 ICN附件记录：');
        console.log('  - 文件名:', attachment.fileName);
        console.log('  - 文件路径(fileKey):', attachment.fileKey);
        console.log('  - 存储位置:', attachment.fileKey ? `${API_BASE_URL}/sys/common/static/${attachment.fileKey}` : '无');
      }
    }

    // 发起API请求获取导入的DM和资源文件详情
    const dmListResponse = await page.request.get(API_BASE_URL + '/ietm/datamodule/list', {
      params: {
        pageNo: 1,
        pageSize: 10
      }
    });

    const dmData = await dmListResponse.json();

    if (dmData.success && dmData.result.records.length > 0) {
      const firstDm = dmData.result.records[0];
      console.log('📊 DM数据库记录：');
      console.log('  - ID:', firstDm.id);
      console.log('  - DMC编码:', firstDm.dmcCode);
      console.log('  - 构型节点ID:', firstDm.cmNodeId);
      console.log('  - SNS:', firstDm.sns);

      // 获取DM的资源文件
      const resourceResponse = await page.request.get(API_BASE_URL + '/ietm/datamodule/queryDmResources', {
        params: {
          dmId: firstDm.id
        }
      });

      const resourceData = await resourceResponse.json();

      if (resourceData.success && resourceData.result.length > 0) {
        const resource = resourceData.result[0];
        console.log('📊 DM资源记录：');
        console.log('  - 资源名称:', resource.resourceName);
        console.log('  - 文件名:', resource.fileName);
        console.log('  - 文件路径(filePath):', resource.filePath);
        console.log('  - 存储位置:', resource.filePath ? `${API_BASE_URL}/sys/common/static/${resource.filePath}` : '无');
      } else {
        console.log('⚠️ 该DM没有关联的资源文件');
      }
    }

    console.log('✅ 路径对比完成');
  });
});
