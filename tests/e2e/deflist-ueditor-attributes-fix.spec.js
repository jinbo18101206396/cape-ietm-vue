/**
 * DefList UEditor属性保留测试
 * 验证修复：UEditor插入deflist表格时能否保留deflist="1"属性
 * 根本原因：UEditor默认HTML过滤会删除自定义属性
 * 修复方案：ueditorConfig.js添加 filtersEnabled: false
 */

describe('DefList UEditor属性保留 - P0修复验证', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
    cy.login()
    cy.wait(2000)
  })

  it('TEST-001: 插入deflist表格后属性应该被保留（不应被删除）', () => {
    // 1. 打开DM编辑器
    cy.get('[data-testid="dm-list-item"]').first().click()
    cy.wait(1000)

    // 2. 进入设计视图
    cy.get('.view-mode-toggle').click()
    cy.wait(1000)

    // 3. 打开Para设计器（点击某个para编辑按钮）
    cy.get('[data-testid="edit-para"]').first().click()
    cy.wait(2000)

    // 4. 获取UEditor iframe
    cy.get('iframe[src*="ueditor"]').then($iframe => {
      const $body = $iframe.contents().find('body')
      const editor = cy.wrap($body)

      // 5. 点击deflist按钮
      cy.get('.para-toolbar .edui-btn[title*="列表定义"]').click()
      cy.wait(500)

      // 🔥 关键验证：检查插入的表格是否包含deflist="1"属性
      cy.get('iframe[src*="ueditor"]').then($iframe2 => {
        const html = $iframe2.contents().find('body').html()

        // 验证1：deflist属性存在
        expect(html).to.include('deflist="1"')
        cy.log('✅ 验证通过：deflist="1"属性存在')

        // 验证2：表格不是普通表格
        const deflistTables = html.match(/<table deflist="1">[\s\S]*?<\/table>/g)
        expect(deflistTables).to.not.be.null
        expect(deflistTables.length).to.be.greaterThan(0)
        cy.log(`✅ 验证通过：找到 ${deflistTables.length} 个deflist表格`)
      })
    })
  })

  it('TEST-002: 多行deflist保存后应该能被正确识别（不应该被删除）', () => {
    // 打开Para设计器
    cy.get('[data-testid="dm-list-item"]').first().click()
    cy.wait(1000)
    cy.get('.view-mode-toggle').click()
    cy.wait(1000)
    cy.get('[data-testid="edit-para"]').first().click()
    cy.wait(2000)

    // 插入deflist
    cy.get('.para-toolbar .edui-btn[title*="列表定义"]').click()
    cy.wait(500)

    // 在deflist中添加多行内容
    cy.get('iframe[src*="ueditor"]').then($iframe => {
      const $body = $iframe.contents().find('body')

      // 模拟用户在表格中输入多行内容
      cy.wrap($body).find('td').first().type('项目1{enter}多行内容{enter}第三行')
      cy.wrap($body).find('td').eq(1).type('定义1{enter}多行定义{enter}第三行定义')
    })

    cy.wait(500)

    // 保存para
    cy.get('.para-toolbar button[type="primary"]').click()
    cy.wait(2000)

    // 验证：应该保存成功，没有"内容被清空"错误
    cy.get('.ant-message-error').should('not.exist')
    cy.log('✅ 验证通过：多行deflist保存成功，无错误')
  })

  it('TEST-003: caption表格属性也应该被保留', () => {
    cy.get('[data-testid="dm-list-item"]').first().click()
    cy.wait(1000)
    cy.get('.view-mode-toggle').click()
    cy.wait(1000)

    // 手动插入caption表格测试
    cy.get('iframe[src*="ueditor"]').then($iframe => {
      const doc = $iframe.contents()
      const editor = window.UE.getEditor($iframe.attr('id'))

      if (editor) {
        // 使用execCommand插入caption表格
        const captionHtml = '<table caption="1"><tr><td>标题</td></tr></table>'
        editor.execCommand('inserthtml', captionHtml)
        cy.wait(500)

        // 验证caption属性保留
        const html = doc.find('body').html()
        expect(html).to.include('caption="1"')
        cy.log('✅ 验证通过：caption="1"属性保留')
      }
    })
  })

  it('TEST-004: 浏览器控制台不应出现"普通表格被删除"警告', () => {
    cy.get('[data-testid="dm-list-item"]').first().click()
    cy.wait(1000)
    cy.get('.view-mode-toggle').click()
    cy.wait(1000)
    cy.get('[data-testid="edit-para"]').first().click()
    cy.wait(2000)

    // 清空控制台日志
    cy.window().then(win => {
      win.console.logs = []
    })

    // 插入deflist
    cy.get('.para-toolbar .edui-btn[title*="列表定义"]').click()
    cy.wait(500)

    // 保存
    cy.get('.para-toolbar button[type="primary"]').click()
    cy.wait(2000)

    // 检查控制台是否有警告
    cy.window().then(win => {
      const warnings = (win.console.logs || []).filter(log =>
        log.includes('普通表格') || log.includes('被删除')
      )
      expect(warnings.length).to.equal(0)
      cy.log('✅ 验证通过：无"普通表格被删除"警告')
    })
  })
})
