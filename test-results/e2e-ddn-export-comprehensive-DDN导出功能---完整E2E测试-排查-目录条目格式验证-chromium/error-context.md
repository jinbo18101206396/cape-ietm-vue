# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ddn-export-comprehensive.spec.js >> DDN导出功能 - 完整E2E测试 >> 排查: 目录条目格式验证
- Location: tests\e2e\ddn-export-comprehensive.spec.js:559:3

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
  558 | 
  559 |   test('排查: 目录条目格式验证', async () => {
  560 |     console.log('\n========== 排查: 目录格式 ==========');
  561 | 
  562 |     // 1. 生成数据包
> 563 |     await page.click('button:has-text("添加DM")');
      |                ^ Error: page.click: Target page, context or browser has been closed
  564 |     await page.waitForTimeout(1000);
  565 | 
  566 |     const firstCheckbox = page.locator('.ant-modal .ant-table-tbody .ant-checkbox-input').first();
  567 |     await firstCheckbox.check();
  568 |     await page.waitForTimeout(500);
  569 | 
  570 |     await page.locator('.ant-modal button:has-text("确定")').click();
  571 |     await page.waitForTimeout(1000);
  572 | 
  573 |     const downloadPromise = page.waitForEvent('download');
  574 |     await page.click('button:has-text("生成数据包")');
  575 | 
  576 |     const download = await downloadPromise;
  577 |     const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
  578 |     await download.saveAs(downloadPath);
  579 | 
  580 |     // 2. 验证目录条目格式
  581 |     const zip = new AdmZip(downloadPath);
  582 |     const entries = zip.getEntries();
  583 | 
  584 |     const directories = entries.filter(e => e.isDirectory);
  585 |     const directoriesEndWithSlash = directories.filter(e => e.entryName.endsWith('/'));
  586 | 
  587 |     console.log(`\n目录总数: ${directories.length}`);
  588 |     console.log(`以/结尾的目录: ${directoriesEndWithSlash.length}`);
  589 | 
  590 |     directories.forEach(dir => {
  591 |       const endsWithSlash = dir.entryName.endsWith('/');
  592 |       console.log(`  ${dir.entryName} ${endsWithSlash ? '✅' : '❌'}`);
  593 |       expect(endsWithSlash).toBeTruthy();
  594 |     });
  595 | 
  596 |     console.log('✅ 所有目录条目格式正确');
  597 | 
  598 |     // 清理
  599 |     fs.unlinkSync(downloadPath);
  600 |   });
  601 | 
  602 | });
  603 | 
```