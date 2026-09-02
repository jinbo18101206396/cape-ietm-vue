# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ddn-export-comprehensive.spec.js >> DDN导出功能 - 完整E2E测试 >> 排查: 检查deliveryList.xml结构
- Location: tests\e2e\ddn-export-comprehensive.spec.js:453:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('button:has-text("添加DM")')

```

# Page snapshot

```yaml
- generic [ref=e9]:
  - generic [ref=e10]:
    - generic [ref=e11]:
      - heading "IETM 研发管理系统" [level=1] [ref=e12]
      - paragraph [ref=e13]: 武器装备交互式电子技术手册
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: 📊
        - generic [ref=e17]: 智能数据管理与分析
      - generic [ref=e18]:
        - generic [ref=e19]: 🔒
        - generic [ref=e20]: 企业级安全保障
      - generic [ref=e21]:
        - generic [ref=e22]: ⚡
        - generic [ref=e23]: 高效协同工作流
  - generic [ref=e24]:
    - generic [ref=e25]:
      - heading "用户登录" [level=2] [ref=e26]
      - paragraph [ref=e27]: 欢迎使用 IETM 研发管理系统
    - generic [ref=e28]:
      - generic [ref=e30]:
        - generic [ref=e35]:
          - generic [ref=e36]: 账户名
          - generic [ref=e37]:
            - textbox "账户名" [ref=e38]:
              - /placeholder: 请输入账户名 / admin
              - text: admin
            - generic: 👤
        - generic [ref=e43]:
          - generic [ref=e44]: 密码
          - generic [ref=e45]:
            - textbox "密码" [ref=e46]:
              - /placeholder: 请输入密码 / 123456
              - text: "123456"
            - generic: 🔒
      - generic [ref=e47]:
        - generic [ref=e48] [cursor=pointer]:
          - checkbox "记住密码" [checked] [ref=e49]
          - generic [ref=e50]: 记住密码
        - link "忘记密码？" [ref=e51] [cursor=pointer]:
          - /url: "#"
      - button "登 录" [ref=e52] [cursor=pointer]
    - generic [ref=e53]:
      - text: Copyright © 2026
      - link "中国航空综合技术研究所" [ref=e54] [cursor=pointer]:
        - /url: "#"
```

# Test source

```ts
  357 |     await page.click('button:has-text("生成数据包")');
  358 | 
  359 |     const download = await downloadPromise;
  360 |     const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
  361 |     await download.saveAs(downloadPath);
  362 | 
  363 |     // 4. 验证：即使没有ICN文件，ICN/目录也必须存在
  364 |     const zip = new AdmZip(downloadPath);
  365 |     const entries = zip.getEntries();
  366 | 
  367 |     const icnDir = entries.find(e => e.entryName === 'ICN/');
  368 |     const icnFiles = entries.filter(e => e.entryName.startsWith('ICN/') && !e.isDirectory);
  369 | 
  370 |     console.log(`ICN/目录存在: ${icnDir ? '✅' : '❌'}`);
  371 |     console.log(`ICN文件数量: ${icnFiles.length}`);
  372 | 
  373 |     // 关键验证：即使没有ICN文件，ICN/目录也必须存在
  374 |     expect(entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/'))).toBeTruthy();
  375 | 
  376 |     // 清理
  377 |     fs.unlinkSync(downloadPath);
  378 |   });
  379 | 
  380 |   test('边界3: 删除已添加的DM', async () => {
  381 |     console.log('\n========== 边界3: 删除DM ==========');
  382 | 
  383 |     // 1. 添加DM
  384 |     await page.click('button:has-text("添加DM")');
  385 |     await page.waitForTimeout(1000);
  386 | 
  387 |     const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
  388 |     await firstCheckbox.check();
  389 |     await page.waitForTimeout(500);
  390 | 
  391 |     await page.locator('.ant-modal button:has-text("确定")').click();
  392 |     await page.waitForTimeout(1000);
  393 | 
  394 |     // 2. 验证DM已添加
  395 |     let dmCount = await page.locator('.ant-table-tbody tr').count();
  396 |     console.log(`添加后DM数量: ${dmCount}`);
  397 |     expect(dmCount).toBeGreaterThan(0);
  398 | 
  399 |     // 3. 删除第一个DM（点击删除按钮）
  400 |     const deleteBtn = page.locator('.ant-table-tbody tr').first().locator('button:has-text("删除")');
  401 |     if (await deleteBtn.isVisible()) {
  402 |       await deleteBtn.click();
  403 |       await page.waitForTimeout(500);
  404 | 
  405 |       // 4. 验证删除成功
  406 |       dmCount = await page.locator('.ant-table-tbody tr').count();
  407 |       console.log(`删除后DM数量: ${dmCount}`);
  408 |       console.log('✅ 删除功能正常');
  409 |     } else {
  410 |       console.log('⚠️ 未找到删除按钮');
  411 |     }
  412 |   });
  413 | 
  414 |   test('边界4: 清空列表', async () => {
  415 |     console.log('\n========== 边界4: 清空列表 ==========');
  416 | 
  417 |     // 1. 添加多个DM
  418 |     await page.click('button:has-text("添加DM")');
  419 |     await page.waitForTimeout(1000);
  420 | 
  421 |     // 选择前3个
  422 |     const checkboxes = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input');
  423 |     const count = Math.min(await checkboxes.count(), 3);
  424 | 
  425 |     for (let i = 0; i < count; i++) {
  426 |       await checkboxes.nth(i).check();
  427 |       await page.waitForTimeout(200);
  428 |     }
  429 | 
  430 |     await page.locator('.ant-modal button:has-text("确定")').click();
  431 |     await page.waitForTimeout(1000);
  432 | 
  433 |     let dmCount = await page.locator('.ant-table-tbody tr').count();
  434 |     console.log(`添加后DM数量: ${dmCount}`);
  435 | 
  436 |     // 2. 点击"清空"按钮（如果存在）
  437 |     const clearBtn = page.locator('button:has-text("清空")');
  438 |     if (await clearBtn.isVisible()) {
  439 |       await clearBtn.click();
  440 |       await page.waitForTimeout(500);
  441 | 
  442 |       dmCount = await page.locator('.ant-table-tbody tr').count();
  443 |       console.log(`清空后DM数量: ${dmCount}`);
  444 |       expect(dmCount).toBe(0);
  445 |       console.log('✅ 清空功能正常');
  446 |     } else {
  447 |       console.log('⚠️ 未找到清空按钮');
  448 |     }
  449 |   });
  450 | 
  451 |   // ==================== 类似问题排查 ====================
  452 | 
  453 |   test('排查: 检查deliveryList.xml结构', async () => {
  454 |     console.log('\n========== 排查: deliveryList.xml ==========');
  455 | 
  456 |     // 1. 生成一个数据包
> 457 |     await page.click('button:has-text("添加DM")');
      |                ^ Error: page.click: Target page, context or browser has been closed
  458 |     await page.waitForTimeout(1000);
  459 | 
  460 |     const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
  461 |     await firstCheckbox.check();
  462 |     await page.waitForTimeout(500);
  463 | 
  464 |     await page.locator('.ant-modal button:has-text("确定")').click();
  465 |     await page.waitForTimeout(1000);
  466 | 
  467 |     const downloadPromise = page.waitForEvent('download');
  468 |     await page.click('button:has-text("生成数据包")');
  469 | 
  470 |     const download = await downloadPromise;
  471 |     const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
  472 |     await download.saveAs(downloadPath);
  473 | 
  474 |     // 2. 提取deliveryList.xml
  475 |     const zip = new AdmZip(downloadPath);
  476 |     const xmlEntry = zip.getEntries().find(e => e.entryName.match(/DDN-.*\.xml$/));
  477 | 
  478 |     if (xmlEntry) {
  479 |       const xmlContent = xmlEntry.getData().toString('utf8');
  480 |       console.log('\n--- deliveryList.xml内容 ---');
  481 |       console.log(xmlContent.substring(0, 1000)); // 前1000字符
  482 | 
  483 |       // 验证XML结构
  484 |       const checks = {
  485 |         '有dmodule标签': xmlContent.includes('<dmodule>'),
  486 |         '有dmIdent标签': xmlContent.includes('<dmIdent>'),
  487 |         '有dmCode标签': xmlContent.includes('<dmCode'),
  488 |         '有ICN路径': xmlContent.includes('ICN/')
  489 |       };
  490 | 
  491 |       console.log('\n--- XML结构检查 ---');
  492 |       Object.entries(checks).forEach(([key, value]) => {
  493 |         console.log(`${key}: ${value ? '✅' : '❌'}`);
  494 |       });
  495 |     }
  496 | 
  497 |     // 清理
  498 |     fs.unlinkSync(downloadPath);
  499 |   });
  500 | 
  501 |   test('排查: 验证ZIP文件完整性', async () => {
  502 |     console.log('\n========== 排查: ZIP完整性 ==========');
  503 | 
  504 |     // 1. 生成数据包
  505 |     await page.click('button:has-text("添加DM")');
  506 |     await page.waitForTimeout(1000);
  507 | 
  508 |     const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
  509 |     await firstCheckbox.check();
  510 |     await page.waitForTimeout(500);
  511 | 
  512 |     await page.locator('.ant-modal button:has-text("确定")').click();
  513 |     await page.waitForTimeout(1000);
  514 | 
  515 |     // 勾选所有选项
  516 |     const icnCheckbox = page.locator('label:has-text("引用ICN") input[type="checkbox"]');
  517 |     const dmCheckbox = page.locator('label:has-text("引用DM") input[type="checkbox"]');
  518 |     await icnCheckbox.check();
  519 |     await dmCheckbox.check();
  520 | 
  521 |     const downloadPromise = page.waitForEvent('download');
  522 |     await page.click('button:has-text("生成数据包")');
  523 | 
  524 |     const download = await downloadPromise;
  525 |     const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
  526 |     await download.saveAs(downloadPath);
  527 | 
  528 |     // 2. 验证ZIP能正常打开
  529 |     try {
  530 |       const zip = new AdmZip(downloadPath);
  531 |       const entries = zip.getEntries();
  532 | 
  533 |       console.log(`\nZIP条目总数: ${entries.length}`);
  534 | 
  535 |       // 3. 验证每个条目
  536 |       let corruptedFiles = 0;
  537 |       entries.forEach(entry => {
  538 |         try {
  539 |           entry.getData(); // 尝试读取数据
  540 |         } catch (err) {
  541 |           console.log(`❌ 损坏文件: ${entry.entryName}`);
  542 |           corruptedFiles++;
  543 |         }
  544 |       });
  545 | 
  546 |       console.log(`损坏文件数: ${corruptedFiles}`);
  547 |       expect(corruptedFiles).toBe(0);
  548 |       console.log('✅ ZIP文件完整性验证通过');
  549 | 
  550 |     } catch (err) {
  551 |       console.error(`❌ ZIP文件损坏: ${err.message}`);
  552 |       throw err;
  553 |     }
  554 | 
  555 |     // 清理
  556 |     fs.unlinkSync(downloadPath);
  557 |   });
```