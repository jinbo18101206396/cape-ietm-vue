# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ddn-icn-directory-fix.spec.js >> DDN导出ICN目录修复验证 >> P2: 验证S1000D结构完整性
- Location: tests\e2e\ddn-icn-directory-fix.spec.js:304:3

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.fill: Test timeout of 180000ms exceeded.
Call log:
  - waiting for locator('input[placeholder="请输入账户名"]')

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
  211 |     await page.waitForLoadState('networkidle');
  212 |     await page.waitForTimeout(1000);
  213 |     await page.fill('input[placeholder="请输入账户名"]', 'admin');
  214 |     await page.fill('input[placeholder="请输入密码"]', 'admin');
  215 |     await page.click('button[type="submit"].login-button');
  216 |     await page.waitForURL(/\/#\/(?!user\/login)/, { timeout: 10000 });
  217 |     console.log('登录成功');
  218 |     await page.waitForTimeout(2000);
  219 | 
  220 |     // 打开项目
  221 |     try {
  222 |       const openProjectBtn = await page.locator('button:has-text("打开项目")').first();
  223 |       if (await openProjectBtn.isVisible({ timeout: 3000 })) {
  224 |         await openProjectBtn.click();
  225 |         await page.waitForTimeout(1500);
  226 |         const firstProject = page.locator('.ant-table-row').first();
  227 |         if (await firstProject.isVisible({ timeout: 3000 })) {
  228 |           await firstProject.click();
  229 |           await page.waitForTimeout(500);
  230 |           await page.click('button:has-text("确定")');
  231 |           await page.waitForTimeout(2000);
  232 |         }
  233 |       }
  234 |     } catch (e) {
  235 |       console.log('跳过项目选择');
  236 |     }
  237 | 
  238 |     // 导航到DDN导出
  239 |     await page.goto('http://localhost:3000/#/ietm/ietmddn-export');
  240 |     await page.waitForLoadState('networkidle');
  241 |     await page.waitForTimeout(2000);
  242 | 
  243 |     // 添加DM
  244 |     const addDmBtn = page.locator('button:has-text("添加DM")');
  245 |     await addDmBtn.click();
  246 |     await page.waitForTimeout(2000);
  247 | 
  248 |     const modal = page.locator('.ant-modal');
  249 |     const firstCheckbox = modal.locator('.ant-table-tbody .ant-checkbox-input').first();
  250 |     await firstCheckbox.check();
  251 |     await page.waitForTimeout(1000);
  252 |     await modal.locator('button:has-text("确定")').click();
  253 |     await page.waitForTimeout(2000);
  254 | 
  255 |     // 勾选"引用ICN"
  256 |     console.log('勾选"引用ICN"选项...');
  257 |     const icnCheckbox = page.locator('label:has-text("引用ICN")').locator('input[type="checkbox"]');
  258 |     await icnCheckbox.check();
  259 |     await page.waitForTimeout(500);
  260 | 
  261 |     // 生成数据包
  262 |     const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  263 |     await page.locator('button:has-text("生成数据包")').click();
  264 |     console.log('正在生成数据包...');
  265 | 
  266 |     const download = await downloadPromise;
  267 |     const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
  268 |     await download.saveAs(downloadPath);
  269 |     console.log(`ZIP包已保存: ${downloadPath}`);
  270 | 
  271 |     // 解析ZIP
  272 |     const zip = new AdmZip(downloadPath);
  273 |     const entries = zip.getEntries();
  274 | 
  275 |     const icnFiles = entries.filter(e =>
  276 |       e.entryName.startsWith('ICN/') && !e.isDirectory
  277 |     );
  278 | 
  279 |     console.log(`\nICN文件数量: ${icnFiles.length}`);
  280 | 
  281 |     if (icnFiles.length > 0) {
  282 |       console.log('\n--- ICN文件命名验证 ---');
  283 |       icnFiles.forEach(file => {
  284 |         const fileName = path.basename(file.entryName);
  285 |         const isValidFormat = /^ICN-[A-Z0-9-]+\.(png|jpg|jpeg|gif|svg|cgm|tif|bmp)$/i.test(fileName);
  286 |         console.log(`${isValidFormat ? '✅' : '❌'} ${file.entryName}`);
  287 |         expect(isValidFormat).toBeTruthy();
  288 |       });
  289 |       console.log('\n✅ 所有ICN文件命名格式正确');
  290 |     } else {
  291 |       console.log('⚠️ 选择的DM没有ICN引用（取决于数据）');
  292 |     }
  293 | 
  294 |     // ICN目录必须存在
  295 |     const hasIcnDir = entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/'));
  296 |     console.log(`\n✅ ICN/目录存在: ${hasIcnDir}`);
  297 |     expect(hasIcnDir).toBeTruthy();
  298 | 
  299 |     // 清理
  300 |     fs.unlinkSync(downloadPath);
  301 |     console.log('\n========== ✅ P1验证通过 ==========\n');
  302 |   });
  303 | 
  304 |   test('P2: 验证S1000D结构完整性', async ({ page }) => {
  305 |     console.log('\n========== P2: S1000D结构验证 ==========\n');
  306 | 
  307 |     // 登录
  308 |     await page.goto('http://localhost:3000/user/login');
  309 |     await page.waitForLoadState('networkidle');
  310 |     await page.waitForTimeout(1000);
> 311 |     await page.fill('input[placeholder="请输入账户名"]', 'admin');
      |                ^ Error: page.fill: Test timeout of 180000ms exceeded.
  312 |     await page.fill('input[placeholder="请输入密码"]', 'admin');
  313 |     await page.click('button[type="submit"].login-button');
  314 |     await page.waitForURL(/\/#\/(?!user\/login)/, { timeout: 10000 });
  315 |     console.log('登录成功');
  316 |     await page.waitForTimeout(2000);
  317 | 
  318 |     // 打开项目
  319 |     try {
  320 |       const openProjectBtn = await page.locator('button:has-text("打开项目")').first();
  321 |       if (await openProjectBtn.isVisible({ timeout: 3000 })) {
  322 |         await openProjectBtn.click();
  323 |         await page.waitForTimeout(1500);
  324 |         const firstProject = page.locator('.ant-table-row').first();
  325 |         if (await firstProject.isVisible({ timeout: 3000 })) {
  326 |           await firstProject.click();
  327 |           await page.waitForTimeout(500);
  328 |           await page.click('button:has-text("确定")');
  329 |           await page.waitForTimeout(2000);
  330 |         }
  331 |       }
  332 |     } catch (e) {}
  333 | 
  334 |     // 导航
  335 |     await page.goto('http://localhost:3000/#/ietm/ietmddn-export');
  336 |     await page.waitForLoadState('networkidle');
  337 |     await page.waitForTimeout(2000);
  338 | 
  339 |     // 添加DM
  340 |     await page.locator('button:has-text("添加DM")').click();
  341 |     await page.waitForTimeout(2000);
  342 |     const modal = page.locator('.ant-modal');
  343 |     await modal.locator('.ant-table-tbody .ant-checkbox-input').first().check();
  344 |     await page.waitForTimeout(1000);
  345 |     await modal.locator('button:has-text("确定")').click();
  346 |     await page.waitForTimeout(2000);
  347 | 
  348 |     // 勾选所有选项
  349 |     console.log('勾选所有导出选项...');
  350 |     const icnCheckbox = page.locator('label:has-text("引用ICN")').locator('input[type="checkbox"]');
  351 |     const dmCheckbox = page.locator('label:has-text("引用DM")').locator('input[type="checkbox"]');
  352 |     await icnCheckbox.check();
  353 |     await dmCheckbox.check();
  354 |     await page.waitForTimeout(500);
  355 | 
  356 |     // 生成
  357 |     const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  358 |     await page.locator('button:has-text("生成数据包")').click();
  359 | 
  360 |     const download = await downloadPromise;
  361 |     const downloadPath = path.join(__dirname, '..', '..', 'downloads', await download.suggestedFilename());
  362 |     await download.saveAs(downloadPath);
  363 | 
  364 |     // 验证S1000D 4.0结构
  365 |     const zip = new AdmZip(downloadPath);
  366 |     const entries = zip.getEntries();
  367 | 
  368 |     console.log('\n--- S1000D 4.0 标准结构验证 ---');
  369 |     const s1000dStructure = {
  370 |       'ICN/目录': entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/')),
  371 |       'DM/目录': entries.some(e => e.entryName.startsWith('DM/')),
  372 |       'deliveryList XML': entries.some(e => e.entryName.match(/DDN-.*\.xml$/)),
  373 |       'DDN.log': entries.some(e => e.entryName.endsWith('.log'))
  374 |     };
  375 | 
  376 |     Object.entries(s1000dStructure).forEach(([key, value]) => {
  377 |       console.log(`${value ? '✅' : '❌'} ${key}`);
  378 |       expect(value).toBeTruthy();
  379 |     });
  380 | 
  381 |     // 验证XML内容
  382 |     const xmlEntry = entries.find(e => e.entryName.match(/DDN-.*\.xml$/));
  383 |     if (xmlEntry) {
  384 |       const xmlContent = xmlEntry.getData().toString('utf8');
  385 |       console.log('\n--- deliveryList.xml 内容验证 ---');
  386 | 
  387 |       const xmlChecks = {
  388 |         '包含<dmodule>标签': xmlContent.includes('<dmodule>'),
  389 |         '包含<dmIdent>标签': xmlContent.includes('<dmIdent>'),
  390 |         '包含<dmCode>标签': xmlContent.includes('<dmCode')
  391 |       };
  392 | 
  393 |       Object.entries(xmlChecks).forEach(([key, value]) => {
  394 |         console.log(`${value ? '✅' : '❌'} ${key}`);
  395 |       });
  396 |     }
  397 | 
  398 |     // 清理
  399 |     fs.unlinkSync(downloadPath);
  400 |     console.log('\n========== ✅ P2: S1000D结构完整 ==========\n');
  401 |   });
  402 | 
  403 | });
  404 | 
```