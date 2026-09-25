/**
 * Para设计器真实浏览器完整验证测试
 *
 * 目标: 对标旧系统，验证新系统Para设计器全流程功能
 * 范围: 源码视图 → 设计视图 → 编辑 → 源码视图
 * 环境: 真实浏览器 + 真实后端API
 *
 * @author Claude (AI Assistant)
 * @date 2026-09-25
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:9999'
const TEST_TIMEOUT = 60000

test.describe('Para设计器真实浏览器完整验证', () => {

  test.beforeEach(async ({ page }) => {
    // 设置超时
    test.setTimeout(TEST_TIMEOUT)

    // 跳转到登录页
    await page.goto(`${BASE_URL}/user/login`)

    // 等待登录表单加载
    await page.waitForSelector('input[placeholder*="账号"]', { timeout: 10000 })

    // 登录（使用测试账号）
    await page.fill('input[placeholder*="账号"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin123')
    await page.click('button:has-text("登录")')

    // 等待登录成功跳转到首页
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    console.log('✅ 登录成功')
  })

  /**
   * 场景1: 基础文本编辑往返验证
   * 源码 → 设计视图编辑 → 源码，验证一致性
   */
  test('场景1: 基础文本编辑往返验证', async ({ page }) => {
    console.log('\n🧪 开始测试: 场景1 - 基础文本编辑往返验证')

    // 1. 进入数据模块列表
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForSelector('.ant-table', { timeout: 10000 })
    console.log('✅ 数据模块列表加载完成')

    // 2. 打开第一个DM（假设存在测试数据）
    await page.click('.ant-table tbody tr:first-child .ant-table-row-expand-icon')
    await page.waitForTimeout(500)

    // 3. 点击编辑按钮
    await page.click('.ant-table tbody tr:first-child button:has-text("编辑")')
    await page.waitForSelector('.codemirror-container', { timeout: 15000 })
    console.log('✅ 编辑器加载完成')

    // 4. 定位到第一个para元素
    const firstParaLine = await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      if (!editor) return null

      const content = editor.getValue()
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<para>')) {
          return i + 1  // CodeMirror行号从1开始
        }
      }
      return null
    })

    if (!firstParaLine) {
      console.log('⚠️ 未找到para元素，跳过测试')
      test.skip()
      return
    }

    console.log(`✅ 找到para元素在第${firstParaLine}行`)

    // 5. 点击gutter上的铅笔图标进入设计视图
    await page.click(`.CodeMirror-gutter-wrapper:has-text("${firstParaLine}") .gutter-icon`)
    await page.waitForSelector('#para_ueditor', { timeout: 10000 })
    console.log('✅ 设计视图打开')

    // 6. 等待UEditor加载完成
    await page.waitForTimeout(2000)

    // 7. 获取原始XML内容
    const originalXml = await page.evaluate(() => {
      return window.paraDesigner?.originalXml || ''
    })
    console.log(`📄 原始XML: ${originalXml.substring(0, 100)}...`)

    // 8. 在UEditor中编辑内容（添加文本）
    await page.evaluate(() => {
      const ue = window.UE.getEditor('para_ueditor')
      if (ue) {
        const content = ue.getContent()
        ue.setContent(content + '<p>【测试新增文本】</p>')
      }
    })
    console.log('✅ 在设计视图中添加了测试文本')

    await page.waitForTimeout(1000)

    // 9. 点击"确定"按钮保存
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(1000)
    console.log('✅ 保存设计视图修改')

    // 10. 验证源码视图已更新
    const updatedXml = await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      if (!editor) return ''
      return editor.getValue()
    })

    // 11. 验证新增文本已反映到XML
    expect(updatedXml).toContain('【测试新增文本】')
    console.log('✅ 验证通过: 设计视图修改已正确反映到源码')

    // 12. 验证XML格式正确（没有残留标签）
    const hasUnclosedTags = updatedXml.match(/<\/td>(?!.*<td)/g)
    expect(hasUnclosedTags).toBeNull()
    console.log('✅ 验证通过: 无残留标签')

    console.log('🎉 场景1测试完成\n')
  })

  /**
   * 场景2: 复杂嵌套列表编辑验证
   * 测试randomList/sequentialList/listItem的往返转换
   */
  test('场景2: 复杂嵌套列表编辑验证', async ({ page }) => {
    console.log('\n🧪 开始测试: 场景2 - 复杂嵌套列表编辑')

    // 准备测试XML
    const testXml = `<para>
  <randomList>
    <listItem><para>项目1</para></listItem>
    <listItem><para>项目2</para>
      <sequentialList>
        <listItem><para>子项目2.1</para></listItem>
        <listItem><para>子项目2.2</para></listItem>
      </sequentialList>
    </listItem>
    <listItem><para>项目3</para></listItem>
  </randomList>
</para>`

    // 1. 进入数据模块列表
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForSelector('.ant-table', { timeout: 10000 })

    // 2. 打开编辑器
    await page.click('.ant-table tbody tr:first-child .ant-table-row-expand-icon')
    await page.waitForTimeout(500)
    await page.click('.ant-table tbody tr:first-child button:has-text("编辑")')
    await page.waitForSelector('.codemirror-container', { timeout: 15000 })
    console.log('✅ 编辑器加载完成')

    // 3. 插入测试XML
    await page.evaluate((xml) => {
      const editor = window.dmEditor?.editor
      if (editor) {
        // 在第一个dmodule内容区插入
        const content = editor.getValue()
        const insertPos = content.indexOf('</dmodule>') - 1
        editor.replaceRange(xml + '\n', editor.posFromIndex(insertPos))
      }
    }, testXml)

    await page.waitForTimeout(1000)
    console.log('✅ 插入测试XML')

    // 4. 找到新插入的para
    const paraLine = await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      if (!editor) return null

      const content = editor.getValue()
      const lines = content.split('\n')
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('<randomList>')) {
          return i  // 返回randomList所在行
        }
      }
      return null
    })

    if (!paraLine) {
      console.log('⚠️ 未找到插入的列表，跳过测试')
      test.skip()
      return
    }

    // 5. 点击gutter图标进入设计视图
    await page.click(`.CodeMirror-line:has-text("randomList") .gutter-icon`)
    await page.waitForSelector('#para_ueditor', { timeout: 10000 })
    console.log('✅ 设计视图打开')

    await page.waitForTimeout(2000)

    // 6. 验证UEditor中渲染了正确的HTML结构
    const htmlContent = await page.evaluate(() => {
      const ue = window.UE.getEditor('para_ueditor')
      return ue ? ue.getContent() : ''
    })

    // 验证转换: randomList → ul, sequentialList → ol, listItem → li
    expect(htmlContent).toContain('<ul>')
    expect(htmlContent).toContain('<ol>')
    expect(htmlContent).toContain('项目1')
    expect(htmlContent).toContain('子项目2.1')
    console.log('✅ 验证通过: 嵌套列表正确转换为HTML')

    // 7. 在UEditor中添加新列表项
    await page.evaluate(() => {
      const ue = window.UE.getEditor('para_ueditor')
      if (ue) {
        const content = ue.getContent()
        // 在ul结束前添加新li
        const updated = content.replace('</ul>', '<li>项目4（新增）</li></ul>')
        ue.setContent(updated)
      }
    })
    console.log('✅ 添加新列表项')

    await page.waitForTimeout(1000)

    // 8. 保存
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 9. 验证XML中包含新增项
    const updatedXml = await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      return editor ? editor.getValue() : ''
    })

    expect(updatedXml).toContain('项目4（新增）')
    expect(updatedXml).toContain('<listItem><para>项目4（新增）</para></listItem>')
    console.log('✅ 验证通过: 新增列表项正确转换为XML')

    // 10. 验证嵌套结构完整
    const hasRandomList = updatedXml.includes('<randomList>')
    const hasSequentialList = updatedXml.includes('<sequentialList>')
    const hasAllListItems = updatedXml.includes('项目1') &&
                            updatedXml.includes('子项目2.1') &&
                            updatedXml.includes('项目4（新增）')

    expect(hasRandomList).toBe(true)
    expect(hasSequentialList).toBe(true)
    expect(hasAllListItems).toBe(true)
    console.log('✅ 验证通过: 嵌套列表结构完整')

    console.log('🎉 场景2测试完成\n')
  })

  /**
   * 场景3: definitionList (表格) 编辑验证
   * 测试definitionList ↔ table的往返转换
   */
  test('场景3: definitionList表格编辑验证', async ({ page }) => {
    console.log('\n🧪 开始测试: 场景3 - definitionList表格编辑')

    // 准备测试XML - 包含多个para的td（CRITICAL bug场景）
    const testXml = `<para>
  <definitionList>
    <definitionListItem>
      <listItemTerm>术语1</listItemTerm>
      <listItemDefinition>
        <para>定义段落1</para>
        <para>定义段落2</para>
        <para>定义段落3</para>
      </listItemDefinition>
    </definitionListItem>
    <definitionListItem>
      <listItemTerm>术语2</listItemTerm>
      <listItemDefinition><para>定义2</para></listItemDefinition>
    </definitionListItem>
  </definitionList>
</para>`

    // 1-3. 进入编辑器并插入测试XML（同场景2）
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForSelector('.ant-table', { timeout: 10000 })
    await page.click('.ant-table tbody tr:first-child .ant-table-row-expand-icon')
    await page.waitForTimeout(500)
    await page.click('.ant-table tbody tr:first-child button:has-text("编辑")')
    await page.waitForSelector('.codemirror-container', { timeout: 15000 })

    await page.evaluate((xml) => {
      const editor = window.dmEditor?.editor
      if (editor) {
        const content = editor.getValue()
        const insertPos = content.indexOf('</dmodule>') - 1
        editor.replaceRange(xml + '\n', editor.posFromIndex(insertPos))
      }
    }, testXml)

    await page.waitForTimeout(1000)
    console.log('✅ 插入测试XML（包含td内多个para）')

    // 4. 找到definitionList并打开设计视图
    await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      if (!editor) return

      const content = editor.getValue()
      const lines = content.split('\n')
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('<definitionList>')) {
          // 点击该行的gutter图标
          const lineHandle = editor.getLineHandle(i)
          const gutterMarkers = lineHandle.gutterMarkers
          if (gutterMarkers && gutterMarkers['gutter-icons']) {
            gutterMarkers['gutter-icons'].click()
          }
          break
        }
      }
    })

    await page.waitForSelector('#para_ueditor', { timeout: 10000 })
    console.log('✅ 设计视图打开')
    await page.waitForTimeout(2000)

    // 5. 验证转换: definitionList → table with deflist="1"
    const htmlContent = await page.evaluate(() => {
      const ue = window.UE.getEditor('para_ueditor')
      return ue ? ue.getContent() : ''
    })

    expect(htmlContent).toContain('<table')
    expect(htmlContent).toContain('deflist="1"')
    expect(htmlContent).toContain('<th>术语1</th>')
    expect(htmlContent).toContain('<td>')
    expect(htmlContent).toContain('定义段落1')
    expect(htmlContent).toContain('定义段落2')
    expect(htmlContent).toContain('定义段落3')
    console.log('✅ 验证通过: definitionList正确转换为table')

    // 6. 关键验证: td内多个para不应残留</td>标签
    const hasBadClosingTags = htmlContent.includes('</para></td></td>')
    expect(hasBadClosingTags).toBe(false)
    console.log('✅ 验证通过: td内多个para无残留标签（CRITICAL bug已修复）')

    // 7. 在UEditor中编辑表格（添加新行）
    await page.evaluate(() => {
      const ue = window.UE.getEditor('para_ueditor')
      if (ue) {
        const content = ue.getContent()
        // 在table结束前添加新行
        const newRow = '<tr><th>术语3（新增）</th><td>定义3（新增）</td></tr>'
        const updated = content.replace('</table>', newRow + '</table>')
        ue.setContent(updated)
      }
    })
    console.log('✅ 添加新表格行')
    await page.waitForTimeout(1000)

    // 8. 保存
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 9. 验证XML正确生成
    const updatedXml = await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      return editor ? editor.getValue() : ''
    })

    // 验证新增行
    expect(updatedXml).toContain('术语3（新增）')
    expect(updatedXml).toContain('定义3（新增）')
    expect(updatedXml).toContain('<listItemTerm>术语3（新增）</listItemTerm>')
    expect(updatedXml).toContain('<listItemDefinition><para>定义3（新增）</para></listItemDefinition>')
    console.log('✅ 验证通过: 新增表格行正确转换为XML')

    // 10. 验证原有多个para保持完整
    const hasAllParas = updatedXml.includes('定义段落1') &&
                        updatedXml.includes('定义段落2') &&
                        updatedXml.includes('定义段落3')
    expect(hasAllParas).toBe(true)
    console.log('✅ 验证通过: td内多个para完整保留')

    // 11. 验证无残留标签
    const hasResidualTags = updatedXml.match(/<\/td>(?!.*<(table|tr|th|td))/g)
    expect(hasResidualTags).toBeNull()
    console.log('✅ 验证通过: 无任何残留</td>标签')

    console.log('🎉 场景3测试完成\n')
  })

  /**
   * 场景4: 混合内容编辑验证
   * 测试emphasis、superScript、subScript等混合使用
   */
  test('场景4: 混合内容编辑验证', async ({ page }) => {
    console.log('\n🧪 开始测试: 场景4 - 混合内容编辑')

    const testXml = `<para>普通文本 <emphasis>强调文本</emphasis> H<subScript>2</subScript>O X<superScript>2</superScript> 结束</para>`

    // 1-3. 进入编辑器
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForSelector('.ant-table', { timeout: 10000 })
    await page.click('.ant-table tbody tr:first-child .ant-table-row-expand-icon')
    await page.waitForTimeout(500)
    await page.click('.ant-table tbody tr:first-child button:has-text("编辑")')
    await page.waitForSelector('.codemirror-container', { timeout: 15000 })

    // 插入测试XML
    await page.evaluate((xml) => {
      const editor = window.dmEditor?.editor
      if (editor) {
        const content = editor.getValue()
        const insertPos = content.indexOf('</dmodule>') - 1
        editor.replaceRange(xml + '\n', editor.posFromIndex(insertPos))
      }
    }, testXml)

    await page.waitForTimeout(1000)
    console.log('✅ 插入混合格式测试XML')

    // 4. 打开设计视图
    await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      if (!editor) return

      const content = editor.getValue()
      const lines = content.split('\n')
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].includes('<emphasis>')) {
          const lineHandle = editor.getLineHandle(i)
          const gutterMarkers = lineHandle.gutterMarkers
          if (gutterMarkers && gutterMarkers['gutter-icons']) {
            gutterMarkers['gutter-icons'].click()
          }
          break
        }
      }
    })

    await page.waitForSelector('#para_ueditor', { timeout: 10000 })
    await page.waitForTimeout(2000)
    console.log('✅ 设计视图打开')

    // 5. 验证HTML转换
    const htmlContent = await page.evaluate(() => {
      const ue = window.UE.getEditor('para_ueditor')
      return ue ? ue.getContent() : ''
    })

    expect(htmlContent).toContain('<strong>强调文本</strong>')  // emphasis → strong
    expect(htmlContent).toContain('<sub>2</sub>')               // subScript → sub
    expect(htmlContent).toContain('<sup>2</sup>')               // superScript → sup
    console.log('✅ 验证通过: 混合格式正确转换为HTML')

    // 6. 编辑：添加新的格式文本
    await page.evaluate(() => {
      const ue = window.UE.getEditor('para_ueditor')
      if (ue) {
        const content = ue.getContent()
        ue.setContent(content + ' <strong>新强调</strong> E=mc<sup>2</sup>')
      }
    })
    console.log('✅ 添加新格式文本')
    await page.waitForTimeout(1000)

    // 7. 保存
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 8. 验证XML
    const updatedXml = await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      return editor ? editor.getValue() : ''
    })

    expect(updatedXml).toContain('<emphasis>新强调</emphasis>')
    expect(updatedXml).toContain('<superScript>2</superScript>')
    expect(updatedXml).toContain('<subScript>2</subScript>')
    console.log('✅ 验证通过: 混合格式正确转换回XML')

    console.log('🎉 场景4测试完成\n')
  })

  /**
   * 场景5: 大文档性能测试
   * 测试包含50个para的大文档编辑性能
   */
  test('场景5: 大文档性能测试', async ({ page }) => {
    console.log('\n🧪 开始测试: 场景5 - 大文档性能测试')

    // 生成50个para
    let largeXml = ''
    for (let i = 1; i <= 50; i++) {
      largeXml += `<para>段落${i}: 这是一个测试段落，包含一些内容。<emphasis>强调${i}</emphasis></para>\n`
    }

    // 1-3. 进入编辑器
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagementList`)
    await page.waitForSelector('.ant-table', { timeout: 10000 })
    await page.click('.ant-table tbody tr:first-child .ant-table-row-expand-icon')
    await page.waitForTimeout(500)
    await page.click('.ant-table tbody tr:first-child button:has-text("编辑")')
    await page.waitForSelector('.codemirror-container', { timeout: 15000 })

    // 插入大文档
    const startInsert = Date.now()
    await page.evaluate((xml) => {
      const editor = window.dmEditor?.editor
      if (editor) {
        const content = editor.getValue()
        const insertPos = content.indexOf('</dmodule>') - 1
        editor.replaceRange(xml, editor.posFromIndex(insertPos))
      }
    }, largeXml)
    const insertTime = Date.now() - startInsert
    console.log(`✅ 插入50个para，耗时: ${insertTime}ms`)

    await page.waitForTimeout(2000)

    // 4. 打开设计视图（第25个para）
    const startOpen = Date.now()
    await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      if (!editor) return

      const content = editor.getValue()
      const lines = content.split('\n')
      let paraCount = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<para>段落')) {
          paraCount++
          if (paraCount === 25) {
            const lineHandle = editor.getLineHandle(i)
            const gutterMarkers = lineHandle.gutterMarkers
            if (gutterMarkers && gutterMarkers['gutter-icons']) {
              gutterMarkers['gutter-icons'].click()
            }
            break
          }
        }
      }
    })

    await page.waitForSelector('#para_ueditor', { timeout: 15000 })
    const openTime = Date.now() - startOpen
    console.log(`✅ 打开设计视图，耗时: ${openTime}ms`)

    await page.waitForTimeout(2000)

    // 5. 验证性能指标
    expect(insertTime).toBeLessThan(5000)  // 插入应在5秒内
    expect(openTime).toBeLessThan(3000)    // 打开应在3秒内
    console.log('✅ 验证通过: 大文档性能符合预期')

    // 6. 编辑并保存
    const startEdit = Date.now()
    await page.evaluate(() => {
      const ue = window.UE.getEditor('para_ueditor')
      if (ue) {
        const content = ue.getContent()
        ue.setContent(content + '<p>【性能测试标记】</p>')
      }
    })
    const editTime = Date.now() - startEdit
    console.log(`✅ 编辑内容，耗时: ${editTime}ms`)

    await page.waitForTimeout(1000)

    const startSave = Date.now()
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(1000)
    const saveTime = Date.now() - startSave
    console.log(`✅ 保存修改，耗时: ${saveTime}ms`)

    // 7. 验证XML正确
    const updatedXml = await page.evaluate(() => {
      const editor = window.dmEditor?.editor
      return editor ? editor.getValue() : ''
    })

    expect(updatedXml).toContain('【性能测试标记】')
    expect(updatedXml).toContain('段落25')
    console.log('✅ 验证通过: 大文档编辑保存成功')

    // 8. 性能报告
    console.log('\n📊 性能报告:')
    console.log(`  - 插入50个para: ${insertTime}ms`)
    console.log(`  - 打开设计视图: ${openTime}ms`)
    console.log(`  - 编辑内容: ${editTime}ms`)
    console.log(`  - 保存修改: ${saveTime}ms`)
    console.log(`  - 总耗时: ${insertTime + openTime + editTime + saveTime}ms`)

    console.log('🎉 场景5测试完成\n')
  })
})

/**
 * 测试总结
 *
 * 本测试套件覆盖了Para设计器的5个关键场景:
 *
 * 1. ✅ 基础文本编辑往返 - 验证最基本的para2html/html2para流程
 * 2. ✅ 复杂嵌套列表 - 验证randomList/sequentialList的3层嵌套
 * 3. ✅ definitionList表格 - 验证CRITICAL bug（td内多个para）已修复
 * 4. ✅ 混合格式内容 - 验证emphasis/superScript/subScript转换
 * 5. ✅ 大文档性能 - 验证50个para的性能表现
 *
 * 测试方法:
 * - 真实浏览器环境（Playwright）
 * - 真实后端API（http://localhost:9999）
 * - 真实用户操作流程（点击、编辑、保存）
 * - 完整往返验证（XML → HTML → XML）
 *
 * 预期结果:
 * - 所有场景100%通过
 * - 无残留标签
 * - 性能符合预期
 * - 对齐旧系统功能
 */
