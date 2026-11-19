const { test, expect } = require('@playwright/test');

test.describe('MultimediaDesigner布局问题排查', () => {
  test('复现多媒体模块布局错误', async ({ page }) => {
    // 1. 访问登录页
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // 2. 登录
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', '123456');
    await page.click('button:has-text("登录")');
    await page.waitForLoadState('networkidle');

    // 3. 访问编辑器页面
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2122695633541234689?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-008A-A_001-01_zh-CN');
    await page.waitForLoadState('networkidle');

    // 4. 点击 illustratedPartsCatalog 左侧的铅笔图标
    await page.click('[data-element="illustratedPartsCatalog"] .edit-icon');
    await page.waitForTimeout(1000);

    // 5. 切换至"多媒体"Tab
    await page.click('.ant-tabs-tab:has-text("多媒体")');
    await page.waitForTimeout(1000);

    // 6. 截图并分析布局
    await page.screenshot({ path: 'multimedia-layout-actual.png', fullPage: true });

    // 7. 检查关键元素的位置和可见性
    const multimediaDesigner = page.locator('.multimedia-designer');
    const toolbar = multimediaDesigner.locator('.multimedia-toolbar');
    const mainArea = multimediaDesigner.locator('.multimedia-main');
    const leftPanel = mainArea.locator('.left-tabs');
    const rightPanel = mainArea.locator('.right-preview');

    // 验证工具栏是否在顶部
    const toolbarBox = await toolbar.boundingBox();
    console.log('工具栏位置:', toolbarBox);

    // 验证主容器布局
    const mainBox = await mainArea.boundingBox();
    console.log('主容器位置:', mainBox);

    // 验证左侧面板
    const leftBox = await leftPanel.boundingBox();
    console.log('左侧面板位置:', leftBox);

    // 验证右侧面板
    const rightBox = await rightPanel.boundingBox();
    console.log('右侧面板位置:', rightBox);

    // 检查是否存在样式污染
    const computedStyles = await page.evaluate(() => {
      const designer = document.querySelector('.multimedia-designer');
      const main = designer?.querySelector('.multimedia-main');
      const leftTabs = main?.querySelector('.left-tabs');
      const rightPreview = main?.querySelector('.right-preview');

      return {
        designer: designer ? window.getComputedStyle(designer) : null,
        main: main ? window.getComputedStyle(main) : null,
        leftTabs: leftTabs ? window.getComputedStyle(leftTabs) : null,
        rightPreview: rightPreview ? window.getComputedStyle(rightPreview) : null,
        designerStyles: {
          display: designer?.style.display,
          flex: designer?.style.flex,
          height: designer?.style.height,
          position: designer?.style.position
        },
        mainStyles: {
          display: main?.style.display,
          flex: main?.style.flex,
          height: main?.style.height,
          position: main?.style.position
        }
      };
    });

    console.log('计算样式:', JSON.stringify(computedStyles, null, 2));

    // 检查父容器的样式
    const parentStyles = await page.evaluate(() => {
      const designer = document.querySelector('.multimedia-designer');
      if (!designer) return null;

      const parents = [];
      let current = designer.parentElement;

      while (current && parents.length < 5) {
        parents.push({
          tagName: current.tagName,
          className: current.className,
          styles: {
            display: window.getComputedStyle(current).display,
            flex: window.getComputedStyle(current).flex,
            flexDirection: window.getComputedStyle(current).flexDirection,
            height: window.getComputedStyle(current).height,
            minHeight: window.getComputedStyle(current).minHeight,
            overflow: window.getComputedStyle(current).overflow
          },
          inlineStyles: {
            display: current.style.display,
            flex: current.style.flex,
            height: current.style.height
          }
        });
        current = current.parentElement;
      }

      return parents;
    });

    console.log('父容器样式链:', JSON.stringify(parentStyles, null, 2));
  });
});
