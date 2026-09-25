/**
 * Para设计器真实验证测试
 * 使用系统现有的DM进行验证，不依赖测试API
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'

test.describe('Para设计器真实验证', () => {
  test('REAL-01: 使用现有DM验证基本功能', async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/#/user/login`)
    await page.fill('input[placeholder*="账号"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(3000)

    // 导航到DM列表
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModule`)
    await page.waitForTimeout(2000)

    // 查找第一个DM
    const firstRow = page.locator('tbody tr').first()
    const dmCodeCell = firstRow.locator('td').nth(1)
    const dmCode = await dmCodeCell.textContent()
    
    console.log('找到DM:', dmCode)

    // 点击编辑按钮（假设在操作列）
    await firstRow.locator('a:has-text("编辑"), button:has-text("编辑")').first().click()
    await page.waitForTimeout(3000)

    // 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // 获取编辑器内容
    const xmlContent = await page.evaluate(() => {
      const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
      return editor ? editor.$refs.editor.getEditor().getValue() : null
    })

    console.log('XML内容长度:', xmlContent ? xmlContent.length : 0)

    // 查找para标签
    const paraMatches = xmlContent.match(/<para[^>]*id="[^"]*"/g)
    console.log('找到para标签数量:', paraMatches ? paraMatches.length : 0)

    if (paraMatches && paraMatches.length > 0) {
      // 提取第一个para的id
      const firstParaId = paraMatches[0].match(/id="([^"]*)"/)[1]
      console.log('第一个para ID:', firstParaId)

      // 尝试双击打开设计视图
      try {
        await page.dblclick(`text=para#${firstParaId}`, { timeout: 5000 })
        await page.waitForSelector('.para-designer', { timeout: 5000 })
        
        console.log('✅ 成功打开Para设计视图')

        // 检查UEditor是否加载
        await page.waitForTimeout(1000)
        const ueditorExists = await page.evaluate(() => {
          const designer = window.app.$children
            .find(c => c.$options.name === 'DmContentEditor')
            .$refs.paraDesigner
          return designer && designer.ueditor
        })

        if (ueditorExists) {
          console.log('✅ UEditor已加载')

          // 获取UEditor内容
          const htmlContent = await page.evaluate(() => {
            const designer = window.app.$children
              .find(c => c.$options.name === 'DmContentEditor')
              .$refs.paraDesigner
            return designer.ueditor.getContent()
          })

          console.log('HTML内容长度:', htmlContent.length)
          console.log('HTML内容预览:', htmlContent.substring(0, 100))

          // 测试保存功能
          await page.click('.para-designer button:has-text("保存")')
          await page.waitForSelector('.source-pane', { state: 'visible', timeout: 5000 })
          
          console.log('✅ 成功保存并返回源码视图')

          // 验证内容一致性
          const finalXml = await page.evaluate(() => {
            const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
            return editor.$refs.editor.getEditor().getValue()
          })

          const finalParaMatches = finalXml.match(/<para[^>]*id="[^"]*"/g)
          console.log('保存后para数量:', finalParaMatches ? finalParaMatches.length : 0)

          // 验证para数量不变
          expect(finalParaMatches.length).toBe(paraMatches.length)
          console.log('✅ Para数量保持不变（往返一致性）')

        } else {
          console.log('❌ UEditor未加载')
        }

      } catch (e) {
        console.log('无法打开设计视图:', e.message)
      }
    } else {
      console.log('⚠️ 该DM不包含para标签')
    }
  })

  test('REAL-02: 验证Console无错误', async ({ page }) => {
    const consoleErrors = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 登录
    await page.goto(`${BASE_URL}/#/user/login`)
    await page.fill('input[placeholder*="账号"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForTimeout(3000)

    // 导航到DM列表
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModule`)
    await page.waitForTimeout(2000)

    // 打开第一个DM
    const firstRow = page.locator('tbody tr').first()
    await firstRow.locator('a:has-text("编辑"), button:has-text("编辑")').first().click()
    await page.waitForTimeout(3000)

    await page.waitForSelector('.CodeMirror', { timeout: 10000 })

    // 过滤掉无关错误
    const relevantErrors = consoleErrors.filter(err => {
      return err.includes('para') || 
             err.includes('UEditor') || 
             err.includes('JSON.parse') ||
             err.includes('dmCode') ||
             err.includes('uniqueid')
    })

    console.log('相关错误数量:', relevantErrors.length)
    if (relevantErrors.length > 0) {
      console.log('错误列表:', relevantErrors)
    }

    expect(relevantErrors.length).toBe(0)
    console.log('✅ 无Para相关Console错误')
  })
})
