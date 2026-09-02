# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ddn-icn-directory-fix.spec.js >> DDN导出ICN目录修复验证 >> P1: 验证引用ICN时文件命名正确
- Location: tests\e2e\ddn-icn-directory-fix.spec.js:204:3

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
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
  141 |     // 9. 解析ZIP包结构
  142 |     console.log('\n步骤9: 解析ZIP包结构...');
  143 |     const zip = new AdmZip(downloadPath);
  144 |     const entries = zip.getEntries();
  145 | 
  146 |     console.log(`ZIP包总条目数: ${entries.length}`);
  147 |     console.log('\n--- ZIP包完整结构 ---');
  148 |     entries.forEach((entry, index) => {
  149 |       const type = entry.isDirectory ? '[DIR]' : '[FILE]';
  150 |       const size = entry.isDirectory ? '' : `(${entry.header.size} bytes)`;
  151 |       console.log(`${index + 1}. ${type} ${entry.entryName} ${size}`);
  152 |     });
  153 | 
  154 |     // 10. 关键验证：ICN/目录必须存在
  155 |     console.log('\n========== 关键验证 ==========');
  156 | 
  157 |     const icnDirEntry = entries.find(e => e.entryName === 'ICN/');
  158 |     const hasIcnDir = entries.some(e => e.entryName === 'ICN/' || e.entryName.startsWith('ICN/'));
  159 | 
  160 |     console.log(`\n✅ 验证1: ICN/目录条目存在: ${icnDirEntry ? '是' : '否'}`);
  161 |     console.log(`✅ 验证2: ICN/相关条目存在: ${hasIcnDir ? '是' : '否'}`);
  162 | 
  163 |     if (icnDirEntry) {
  164 |       console.log(`   - 条目名称: ${icnDirEntry.entryName}`);
  165 |       console.log(`   - 是否为目录: ${icnDirEntry.isDirectory}`);
  166 |       console.log(`   - 以/结尾: ${icnDirEntry.entryName.endsWith('/')}`);
  167 |     }
  168 | 
  169 |     // 断言：ICN目录必须存在（这是修复的核心）
  170 |     expect(hasIcnDir).toBeTruthy();
  171 | 
  172 |     // 11. 验证基础结构
  173 |     console.log('\n--- 基础结构验证 ---');
  174 | 
  175 |     const structure = {
  176 |       'DM/目录': entries.some(e => e.entryName.startsWith('DM/')),
  177 |       'ICN/目录': hasIcnDir,
  178 |       'XML文件': entries.some(e => e.entryName.match(/DDN-.*\.xml$/)),
  179 |       'LOG文件': entries.some(e => e.entryName.endsWith('.log'))
  180 |     };
  181 | 
  182 |     Object.entries(structure).forEach(([key, value]) => {
  183 |       console.log(`${value ? '✅' : '❌'} ${key}: ${value ? '存在' : '缺失'}`);
  184 |       expect(value).toBeTruthy();
  185 |     });
  186 | 
  187 |     // 12. 验证目录格式
  188 |     console.log('\n--- 目录格式验证 ---');
  189 |     const directories = entries.filter(e => e.isDirectory);
  190 |     console.log(`目录总数: ${directories.length}`);
  191 | 
  192 |     directories.forEach(dir => {
  193 |       const endsWithSlash = dir.entryName.endsWith('/');
  194 |       console.log(`${endsWithSlash ? '✅' : '❌'} ${dir.entryName}`);
  195 |       expect(endsWithSlash).toBeTruthy();
  196 |     });
  197 | 
  198 |     // 13. 清理
  199 |     console.log('\n步骤13: 清理下载文件...');
  200 |     fs.unlinkSync(downloadPath);
  201 |     console.log('已删除临时文件');
  202 | 
  203 |     console.log('\n========== ✅ P0核心验证通过！ICN目录存在于ZIP包中 ==========\n');
  204 |   });
  205 | 
  206 |   test('P1: 验证引用ICN时文件命名正确', async ({ page }) => {
  207 |     console.log('\n========== P1: 引用ICN文件命名验证 ==========\n');
  208 | 
  209 |     // 登录
  210 |     await page.goto('http://localhost:3000/user/login');
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
> 241 |     await page.waitForTimeout(2000);
      |                    ^ Error: locator.click: Test timeout of 180000ms exceeded.
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
  311 |     await page.fill('input[placeholder="请输入账户名"]', 'admin');
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
```