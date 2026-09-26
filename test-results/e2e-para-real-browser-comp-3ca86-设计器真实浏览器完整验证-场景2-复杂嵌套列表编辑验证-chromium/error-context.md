# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\para-real-browser-complete.spec.js >> Para设计器真实浏览器完整验证 >> 场景2: 复杂嵌套列表编辑验证
- Location: tests\e2e\para-real-browser-complete.spec.js:140:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.ant-table tbody tr:first-child .ant-table-row-expand-icon')

```

# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e9]:
    - generic [ref=e10]:
      - link "logo IETM" [ref=e12] [cursor=pointer]:
        - /url: /
        - img "logo" [ref=e13]
        - heading "IETM" [level=1] [ref=e14]
      - menu [ref=e16]:
        - 'menuitem "图标: home 首页" [ref=e17] [cursor=pointer]':
          - 'link "图标: home 首页" [ref=e18]':
            - /url: /dashboard/analysis
            - 'generic "图标: home" [ref=e19]':
              - img [ref=e20]
            - text: 首页
        - 'menuitem "图标: copy 手册管理" [ref=e22]':
          - generic [ref=e24] [cursor=pointer]:
            - 'generic "图标: copy" [ref=e25]':
              - img [ref=e26]
            - text: 手册管理
        - 'menuitem "图标: audit 项目管理" [ref=e28]':
          - generic [ref=e30] [cursor=pointer]:
            - 'generic "图标: audit" [ref=e31]':
              - img [ref=e32]
            - text: 项目管理
        - 'menuitem "图标: interation 数据交换" [ref=e34]':
          - generic [ref=e36] [cursor=pointer]:
            - 'generic "图标: interation" [ref=e37]':
              - img [ref=e38]
            - text: 数据交换
        - 'menuitem "图标: global 数据发布" [ref=e40]':
          - generic [ref=e42] [cursor=pointer]:
            - 'generic "图标: global" [ref=e43]':
              - img [ref=e44]
            - text: 数据发布
        - 'menuitem "图标: setting 系统管理" [ref=e46]':
          - generic [ref=e48] [cursor=pointer]:
            - 'generic "图标: setting" [ref=e49]':
              - img [ref=e50]
            - text: 系统管理
    - generic [ref=e52]:
      - 'generic "图标: search" [ref=e54] [cursor=pointer]':
        - img [ref=e55]
      - 'link "图标: question-circle-o" [ref=e58] [cursor=pointer]':
        - /url: http://doc.jeecg.com
        - 'generic "图标: question-circle-o" [ref=e59]':
          - img [ref=e60]
      - 'generic "图标: bell" [ref=e66] [cursor=pointer]':
        - img [ref=e67]
      - generic [ref=e69] [cursor=pointer]: 欢迎您，管理员
      - 'link "图标: logout 退出登录" [ref=e72] [cursor=pointer]':
        - /url: javascript:;
        - 'generic "图标: logout" [ref=e73]':
          - img [ref=e74]
        - text: 退出登录
      - generic "系统设置"
  - main [ref=e76]:
    - generic [ref=e77]:
      - tablist [ref=e78]:
        - generic [ref=e79]:
          - generic:
            - generic:
              - 'generic "图标: left"':
                - img
          - generic:
            - generic:
              - 'generic "图标: right"':
                - img
          - tab "首页" [selected] [ref=e84] [cursor=pointer]:
            - generic [ref=e85]: 首页
      - generic:
        - tabpanel
    - generic [ref=e87]:
      - generic [ref=e88]:
        - generic [ref=e90]:
          - generic [ref=e94]:
            - 'generic "图标: folder" [ref=e95]':
              - img [ref=e96]
            - text: 手册项目
          - generic [ref=e99]:
            - generic [ref=e102]:
              - combobox [ref=e104] [cursor=pointer]:
                - generic "项目名称" [ref=e106]
                - 'generic "图标: down" [ref=e108]':
                  - img [ref=e109]
              - generic [ref=e111]:
                - textbox "请输入关键字" [ref=e112]
                - 'generic "图标: search" [ref=e114] [cursor=pointer]':
                  - img [ref=e115]
            - generic [ref=e122]:
              - table [ref=e124]:
                - rowgroup [ref=e132]:
                  - row "序号 项目名称 装备编码 IETM标准 密级 操作" [ref=e133]:
                    - columnheader "序号" [ref=e134]:
                      - generic [ref=e136]: 序号
                    - columnheader "项目名称" [ref=e137]:
                      - generic [ref=e139]: 项目名称
                    - columnheader "装备编码" [ref=e140]:
                      - generic [ref=e142]: 装备编码
                    - columnheader "IETM标准" [ref=e143]:
                      - generic [ref=e145]: IETM标准
                    - columnheader "密级" [ref=e146]:
                      - generic [ref=e148]: 密级
                    - columnheader "操作" [ref=e149]:
                      - generic [ref=e151]: 操作
              - table [ref=e153]:
                - rowgroup [ref=e161]:
                  - row "1 项目3 ZB3 S1000D4.2 公开 打开项目" [ref=e162]:
                    - cell "1" [ref=e163]
                    - cell "项目3" [ref=e164]
                    - cell "ZB3" [ref=e165]
                    - cell "S1000D4.2" [ref=e166]
                    - cell "公开" [ref=e167]:
                      - generic [ref=e169]: 公开
                    - cell "打开项目" [ref=e170]:
                      - generic [ref=e171]: 打开项目
                  - row "2 项目2 ZB2 S1000D4.1 公开 打开项目" [ref=e172]:
                    - cell "2" [ref=e173]
                    - cell "项目2" [ref=e174]
                    - cell "ZB2" [ref=e175]
                    - cell "S1000D4.1" [ref=e176]
                    - cell "公开" [ref=e177]:
                      - generic [ref=e179]: 公开
                    - cell "打开项目" [ref=e180]:
                      - generic [ref=e181]: 打开项目
                  - row "3 项目1 ZB1 S1000D4.0 公开 打开项目" [ref=e182]:
                    - cell "3" [ref=e183]
                    - cell "项目1" [ref=e184]
                    - cell "ZB1" [ref=e185]
                    - cell "S1000D4.0" [ref=e186]
                    - cell "公开" [ref=e187]:
                      - generic [ref=e189]: 公开
                    - cell "打开项目" [ref=e190]:
                      - generic [ref=e191]: 打开项目
                  - row "4 项目4 ZB4 GJB6600 公开 打开项目" [ref=e192]:
                    - cell "4" [ref=e193]
                    - cell "项目4" [ref=e194]
                    - cell "ZB4" [ref=e195]
                    - cell "GJB6600" [ref=e196]
                    - cell "公开" [ref=e197]:
                      - generic [ref=e199]: 公开
                    - cell "打开项目" [ref=e200]:
                      - generic [ref=e201]: 打开项目
                  - row "5 项目5 ZB5 S1000D4.0 公开 打开项目" [ref=e202]:
                    - cell "5" [ref=e203]
                    - cell "项目5" [ref=e204]
                    - cell "ZB5" [ref=e205]
                    - cell "S1000D4.0" [ref=e206]
                    - cell "公开" [ref=e207]:
                      - generic [ref=e209]: 公开
                    - cell "打开项目" [ref=e210]:
                      - generic [ref=e211]: 打开项目
        - generic [ref=e213]:
          - generic [ref=e217]:
            - 'generic "图标: check-circle" [ref=e218]':
              - img [ref=e219]
            - text: 我的待办
          - generic [ref=e223]:
            - generic [ref=e224]:
              - 'button "图标: check-circle 批量审批" [disabled] [ref=e225]':
                - 'generic "图标: check-circle"':
                  - img
                - generic: 批量审批
              - generic [ref=e227]:
                - combobox [ref=e229] [cursor=pointer]:
                  - generic "标题" [ref=e231]
                  - 'generic "图标: down" [ref=e233]':
                    - img [ref=e234]
                - generic [ref=e236]:
                  - textbox "请输入关键字" [ref=e237]
                  - 'generic "图标: search" [ref=e239] [cursor=pointer]':
                    - img [ref=e240]
              - generic [ref=e242]: 【★紧急 ★★特急】
            - generic [ref=e248]:
              - table [ref=e250]:
                - rowgroup [ref=e258]:
                  - row "状态 标题 节点 创建人 创建日期" [ref=e259]:
                    - columnheader [ref=e260]:
                      - checkbox [disabled] [ref=e267]
                    - columnheader "状态" [ref=e269]:
                      - generic [ref=e271]: 状态
                    - columnheader "标题" [ref=e272]:
                      - generic [ref=e274]: 标题
                    - columnheader "节点" [ref=e275]:
                      - generic [ref=e277]: 节点
                    - columnheader "创建人" [ref=e278]:
                      - generic [ref=e280]: 创建人
                    - columnheader "创建日期" [ref=e281]:
                      - generic [ref=e283]: 创建日期
              - generic:
                - table:
                  - rowgroup
              - generic [ref=e284]: 暂无待办事项
      - generic [ref=e285]:
        - generic [ref=e287]:
          - generic [ref=e291]:
            - 'generic "图标: database" [ref=e292]':
              - img [ref=e293]
            - text: 数据模块
          - generic [ref=e296]:
            - generic [ref=e299]:
              - combobox [ref=e301] [cursor=pointer]:
                - generic "DMC编码" [ref=e303]
                - 'generic "图标: down" [ref=e305]':
                  - img [ref=e306]
              - generic [ref=e308]:
                - textbox "请输入关键字" [ref=e309]
                - 'generic "图标: search" [ref=e311] [cursor=pointer]':
                  - img [ref=e312]
            - generic [ref=e319]:
              - table [ref=e321]:
                - rowgroup [ref=e328]:
                  - row "序号 DMC编码 技术名称 信息名称 DM类型" [ref=e329]:
                    - columnheader "序号" [ref=e330]:
                      - generic [ref=e332]: 序号
                    - columnheader "DMC编码" [ref=e333]:
                      - generic [ref=e336]: DMC编码
                    - columnheader "技术名称" [ref=e337]:
                      - generic [ref=e340]: 技术名称
                    - columnheader "信息名称" [ref=e341]:
                      - generic [ref=e344]: 信息名称
                    - columnheader "DM类型" [ref=e345]:
                      - generic [ref=e348]: DM类型
              - generic:
                - table:
                  - rowgroup
              - generic [ref=e349]: 暂无数据模块
        - generic [ref=e351]:
          - generic [ref=e355]:
            - 'generic "图标: file-text" [ref=e356]':
              - img [ref=e357]
            - text: 项目实体
          - generic [ref=e360]:
            - generic [ref=e363]:
              - combobox [ref=e365] [cursor=pointer]:
                - generic "ICN编号" [ref=e367]
                - 'generic "图标: down" [ref=e369]':
                  - img [ref=e370]
              - generic [ref=e372]:
                - textbox "请输入关键字" [ref=e373]
                - 'generic "图标: search" [ref=e375] [cursor=pointer]':
                  - img [ref=e376]
            - generic [ref=e383]:
              - table [ref=e385]:
                - rowgroup [ref=e391]:
                  - row "序号 ICN编号 文件名称 文件大小" [ref=e392]:
                    - columnheader "序号" [ref=e393]:
                      - generic [ref=e395]: 序号
                    - columnheader "ICN编号" [ref=e396]:
                      - generic [ref=e399]: ICN编号
                    - columnheader "文件名称" [ref=e400]:
                      - generic [ref=e403]: 文件名称
                    - columnheader "文件大小" [ref=e404]:
                      - generic [ref=e406]: 文件大小
              - generic:
                - table:
                  - rowgroup
              - generic [ref=e407]: 暂无实体ICN数据
```

# Test source

```ts
  62  | 
  63  |     // 4. 定位到第一个para元素
  64  |     const firstParaLine = await page.evaluate(() => {
  65  |       const editor = window.dmEditor?.editor
  66  |       if (!editor) return null
  67  | 
  68  |       const content = editor.getValue()
  69  |       const lines = content.split('\n')
  70  |       for (let i = 0; i < lines.length; i++) {
  71  |         if (lines[i].includes('<para>')) {
  72  |           return i + 1  // CodeMirror行号从1开始
  73  |         }
  74  |       }
  75  |       return null
  76  |     })
  77  | 
  78  |     if (!firstParaLine) {
  79  |       console.log('⚠️ 未找到para元素，跳过测试')
  80  |       test.skip()
  81  |       return
  82  |     }
  83  | 
  84  |     console.log(`✅ 找到para元素在第${firstParaLine}行`)
  85  | 
  86  |     // 5. 点击gutter上的铅笔图标进入设计视图
  87  |     await page.click(`.CodeMirror-gutter-wrapper:has-text("${firstParaLine}") .gutter-icon`)
  88  |     await page.waitForSelector('#para_ueditor', { timeout: 10000 })
  89  |     console.log('✅ 设计视图打开')
  90  | 
  91  |     // 6. 等待UEditor加载完成
  92  |     await page.waitForTimeout(2000)
  93  | 
  94  |     // 7. 获取原始XML内容
  95  |     const originalXml = await page.evaluate(() => {
  96  |       return window.paraDesigner?.originalXml || ''
  97  |     })
  98  |     console.log(`📄 原始XML: ${originalXml.substring(0, 100)}...`)
  99  | 
  100 |     // 8. 在UEditor中编辑内容（添加文本）
  101 |     await page.evaluate(() => {
  102 |       const ue = window.UE.getEditor('para_ueditor')
  103 |       if (ue) {
  104 |         const content = ue.getContent()
  105 |         ue.setContent(content + '<p>【测试新增文本】</p>')
  106 |       }
  107 |     })
  108 |     console.log('✅ 在设计视图中添加了测试文本')
  109 | 
  110 |     await page.waitForTimeout(1000)
  111 | 
  112 |     // 9. 点击"确定"按钮保存
  113 |     await page.click('button:has-text("确定")')
  114 |     await page.waitForTimeout(1000)
  115 |     console.log('✅ 保存设计视图修改')
  116 | 
  117 |     // 10. 验证源码视图已更新
  118 |     const updatedXml = await page.evaluate(() => {
  119 |       const editor = window.dmEditor?.editor
  120 |       if (!editor) return ''
  121 |       return editor.getValue()
  122 |     })
  123 | 
  124 |     // 11. 验证新增文本已反映到XML
  125 |     expect(updatedXml).toContain('【测试新增文本】')
  126 |     console.log('✅ 验证通过: 设计视图修改已正确反映到源码')
  127 | 
  128 |     // 12. 验证XML格式正确（没有残留标签）
  129 |     const hasUnclosedTags = updatedXml.match(/<\/td>(?!.*<td)/g)
  130 |     expect(hasUnclosedTags).toBeNull()
  131 |     console.log('✅ 验证通过: 无残留标签')
  132 | 
  133 |     console.log('🎉 场景1测试完成\n')
  134 |   })
  135 | 
  136 |   /**
  137 |    * 场景2: 复杂嵌套列表编辑验证
  138 |    * 测试randomList/sequentialList/listItem的往返转换
  139 |    */
  140 |   test('场景2: 复杂嵌套列表编辑验证', async ({ page }) => {
  141 |     console.log('\n🧪 开始测试: 场景2 - 复杂嵌套列表编辑')
  142 | 
  143 |     // 准备测试XML
  144 |     const testXml = `<para>
  145 |   <randomList>
  146 |     <listItem><para>项目1</para></listItem>
  147 |     <listItem><para>项目2</para>
  148 |       <sequentialList>
  149 |         <listItem><para>子项目2.1</para></listItem>
  150 |         <listItem><para>子项目2.2</para></listItem>
  151 |       </sequentialList>
  152 |     </listItem>
  153 |     <listItem><para>项目3</para></listItem>
  154 |   </randomList>
  155 | </para>`
  156 | 
  157 |     // 1. 进入数据模块列表
  158 |     await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
  159 |     await page.waitForSelector('.ant-table', { timeout: 10000 })
  160 | 
  161 |     // 2. 打开编辑器
> 162 |     await page.click('.ant-table tbody tr:first-child .ant-table-row-expand-icon')
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  163 |     await page.waitForTimeout(500)
  164 |     await page.click('.ant-table tbody tr:first-child button:has-text("编辑")')
  165 |     await page.waitForSelector('.codemirror-container', { timeout: 15000 })
  166 |     console.log('✅ 编辑器加载完成')
  167 | 
  168 |     // 3. 插入测试XML
  169 |     await page.evaluate((xml) => {
  170 |       const editor = window.dmEditor?.editor
  171 |       if (editor) {
  172 |         // 在第一个dmodule内容区插入
  173 |         const content = editor.getValue()
  174 |         const insertPos = content.indexOf('</dmodule>') - 1
  175 |         editor.replaceRange(xml + '\n', editor.posFromIndex(insertPos))
  176 |       }
  177 |     }, testXml)
  178 | 
  179 |     await page.waitForTimeout(1000)
  180 |     console.log('✅ 插入测试XML')
  181 | 
  182 |     // 4. 找到新插入的para
  183 |     const paraLine = await page.evaluate(() => {
  184 |       const editor = window.dmEditor?.editor
  185 |       if (!editor) return null
  186 | 
  187 |       const content = editor.getValue()
  188 |       const lines = content.split('\n')
  189 |       for (let i = lines.length - 1; i >= 0; i--) {
  190 |         if (lines[i].includes('<randomList>')) {
  191 |           return i  // 返回randomList所在行
  192 |         }
  193 |       }
  194 |       return null
  195 |     })
  196 | 
  197 |     if (!paraLine) {
  198 |       console.log('⚠️ 未找到插入的列表，跳过测试')
  199 |       test.skip()
  200 |       return
  201 |     }
  202 | 
  203 |     // 5. 点击gutter图标进入设计视图
  204 |     await page.click(`.CodeMirror-line:has-text("randomList") .gutter-icon`)
  205 |     await page.waitForSelector('#para_ueditor', { timeout: 10000 })
  206 |     console.log('✅ 设计视图打开')
  207 | 
  208 |     await page.waitForTimeout(2000)
  209 | 
  210 |     // 6. 验证UEditor中渲染了正确的HTML结构
  211 |     const htmlContent = await page.evaluate(() => {
  212 |       const ue = window.UE.getEditor('para_ueditor')
  213 |       return ue ? ue.getContent() : ''
  214 |     })
  215 | 
  216 |     // 验证转换: randomList → ul, sequentialList → ol, listItem → li
  217 |     expect(htmlContent).toContain('<ul>')
  218 |     expect(htmlContent).toContain('<ol>')
  219 |     expect(htmlContent).toContain('项目1')
  220 |     expect(htmlContent).toContain('子项目2.1')
  221 |     console.log('✅ 验证通过: 嵌套列表正确转换为HTML')
  222 | 
  223 |     // 7. 在UEditor中添加新列表项
  224 |     await page.evaluate(() => {
  225 |       const ue = window.UE.getEditor('para_ueditor')
  226 |       if (ue) {
  227 |         const content = ue.getContent()
  228 |         // 在ul结束前添加新li
  229 |         const updated = content.replace('</ul>', '<li>项目4（新增）</li></ul>')
  230 |         ue.setContent(updated)
  231 |       }
  232 |     })
  233 |     console.log('✅ 添加新列表项')
  234 | 
  235 |     await page.waitForTimeout(1000)
  236 | 
  237 |     // 8. 保存
  238 |     await page.click('button:has-text("确定")')
  239 |     await page.waitForTimeout(1000)
  240 | 
  241 |     // 9. 验证XML中包含新增项
  242 |     const updatedXml = await page.evaluate(() => {
  243 |       const editor = window.dmEditor?.editor
  244 |       return editor ? editor.getValue() : ''
  245 |     })
  246 | 
  247 |     expect(updatedXml).toContain('项目4（新增）')
  248 |     expect(updatedXml).toContain('<listItem><para>项目4（新增）</para></listItem>')
  249 |     console.log('✅ 验证通过: 新增列表项正确转换为XML')
  250 | 
  251 |     // 10. 验证嵌套结构完整
  252 |     const hasRandomList = updatedXml.includes('<randomList>')
  253 |     const hasSequentialList = updatedXml.includes('<sequentialList>')
  254 |     const hasAllListItems = updatedXml.includes('项目1') &&
  255 |                             updatedXml.includes('子项目2.1') &&
  256 |                             updatedXml.includes('项目4（新增）')
  257 | 
  258 |     expect(hasRandomList).toBe(true)
  259 |     expect(hasSequentialList).toBe(true)
  260 |     expect(hasAllListItems).toBe(true)
  261 |     console.log('✅ 验证通过: 嵌套列表结构完整')
  262 | 
```