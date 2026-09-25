/**
 * CodeMirror Tab 切换测试
 * 验证从设计视图切换回源码视图后，CodeMirror 的高度和 gutters 布局是否正常
 */

describe('CodeMirror Tab Switch Test', () => {
  beforeEach(() => {
    // 登录并进入数据模块列表
    cy.login()
    cy.visit('/ietm/datamodule')
    cy.wait(1000)
  })

  it('应该在从设计视图切换回源码视图后保持正确的布局', () => {
    // 1. 点击"浏览或编辑DM内容"进入源码视图（路径A）
    cy.contains('浏览或编辑DM内容').first().click()
    cy.wait(2000)

    // 2. 记录路径A的正常状态
    cy.window().then((win) => {
      const cmScroll = win.document.querySelector('.CodeMirror-scroll')
      const gutters = win.document.querySelector('.CodeMirror-gutters')
      const lineNumbers = win.document.querySelector('.CodeMirror-linenumbers')
      const foldGutter = win.document.querySelector('.CodeMirror-foldgutter')

      // 记录正常状态
      win.pathA_state = {
        scrollHeight: cmScroll.offsetHeight,
        guttersWidth: gutters.offsetWidth,
        lineNumbersLeft: lineNumbers.offsetLeft,
        foldGutterLeft: foldGutter.offsetLeft
      }

      cy.log('路径A正常状态:', win.pathA_state)

      // 验证初始状态正常
      expect(cmScroll.offsetHeight).to.be.greaterThan(600)
      expect(gutters.offsetWidth).to.be.greaterThan(50)
      expect(foldGutter.offsetLeft).to.equal(lineNumbers.offsetWidth)
    })

    // 3. 双击 para 节点进入设计视图
    cy.get('.dm-structure-tree').contains('para').first().dblclick()
    cy.wait(1000)

    // 验证已切换到设计视图
    cy.get('.ant-tabs-tab-active').should('contain', '设计视图')

    // 4. 点击"源码视图"按钮切换回来（路径B）
    cy.contains('源码视图').click()
    cy.wait(1000)

    // 5. 验证路径B的状态是否与路径A一致
    cy.window().then((win) => {
      const cmScroll = win.document.querySelector('.CodeMirror-scroll')
      const gutters = win.document.querySelector('.CodeMirror-gutters')
      const lineNumbers = win.document.querySelector('.CodeMirror-linenumbers')
      const foldGutter = win.document.querySelector('.CodeMirror-foldgutter')

      const pathB_state = {
        scrollHeight: cmScroll.offsetHeight,
        guttersWidth: gutters.offsetWidth,
        lineNumbersLeft: lineNumbers.offsetLeft,
        foldGutterLeft: foldGutter.offsetLeft
      }

      cy.log('路径B状态:', pathB_state)
      cy.log('路径A正常状态:', win.pathA_state)

      // 关键验证
      cy.wrap(null).then(() => {
        // 验证1: CodeMirror-scroll 高度应该正常（不是350px）
        expect(cmScroll.offsetHeight, 'CodeMirror-scroll 高度').to.be.greaterThan(600)

        // 验证2: Gutters 容器宽度应该正常（不是1px）
        expect(gutters.offsetWidth, 'Gutters 容器宽度').to.be.greaterThan(50)

        // 验证3: 折叠标记列应该在行号列右侧（不是重叠）
        expect(foldGutter.offsetLeft, '折叠标记列位置').to.equal(lineNumbers.offsetWidth)

        // 验证4: 路径B状态应该与路径A一致（误差 ±5px）
        expect(Math.abs(pathB_state.scrollHeight - win.pathA_state.scrollHeight), '高度差异')
          .to.be.lessThan(5)
        expect(Math.abs(pathB_state.guttersWidth - win.pathA_state.guttersWidth), 'Gutters宽度差异')
          .to.be.lessThan(5)
        expect(pathB_state.foldGutterLeft, '折叠列位置一致')
          .to.equal(win.pathA_state.foldGutterLeft)
      })
    })

    // 6. 验证滚动条功能正常
    cy.get('.CodeMirror-scroll').then(($scroll) => {
      const initialScrollTop = $scroll[0].scrollTop

      // 向下滚动
      $scroll[0].scrollTop = 100
      cy.wait(100)

      // 验证滚动生效
      cy.wrap($scroll[0]).should('have.property', 'scrollTop').and('be.greaterThan', initialScrollTop)
    })
  })

  it('应该在多次切换后保持一致的布局', () => {
    // 进入源码视图
    cy.contains('浏览或编辑DM内容').first().click()
    cy.wait(2000)

    // 记录初始状态
    cy.window().then((win) => {
      const cmScroll = win.document.querySelector('.CodeMirror-scroll')
      win.initialHeight = cmScroll.offsetHeight
    })

    // 连续切换3次
    for (let i = 0; i < 3; i++) {
      // 切换到设计视图
      cy.get('.dm-structure-tree').contains('para').first().dblclick()
      cy.wait(500)

      // 切换回源码视图
      cy.contains('源码视图').click()
      cy.wait(500)

      // 验证高度保持一致
      cy.window().then((win) => {
        const cmScroll = win.document.querySelector('.CodeMirror-scroll')
        expect(cmScroll.offsetHeight, `第${i+1}次切换后的高度`)
          .to.be.closeTo(win.initialHeight, 5)
      })
    }
  })
})
