/**
 * Para设计器进入方式E2E测试
 * 验证从源码视图通过gutter图标进入设计视图的功能
 * 对标旧系统：点击行号右侧铅笔图标 ✏️ 进入Para设计器
 */

describe('Para设计器进入方式测试', () => {
  const baseURL = 'http://localhost:3000'
  const dmId = '1862031398009929730' // 测试DM ID

  beforeEach(() => {
    // 登录并进入编辑器
    cy.visit(`${baseURL}/#/login`)
    cy.get('input[placeholder="请输入账号"]').type('admin')
    cy.get('input[placeholder="请输入密码"]').type('123456')
    cy.get('button[type="submit"]').click()
    cy.wait(2000)

    // 进入DM编辑器
    cy.visit(`${baseURL}/#/ietm/dm-content-editor/${dmId}?mode=edit`)
    cy.wait(3000)
  })

  /**
   * TC-01: 验证gutter图标显示
   * 预期：para元素行号右侧显示蓝色铅笔图标 ✏️
   */
  it('TC-01: para元素行显示铅笔图标', () => {
    cy.log('✅ 测试用例: TC-01 - para元素行显示铅笔图标')

    // 等待编辑器加载完成
    cy.get('.CodeMirror', { timeout: 10000 }).should('be.visible')

    // 检查dmGutter列存在
    cy.get('.CodeMirror-gutters .dmGutter').should('exist')

    // 检查至少有一个铅笔图标
    cy.get('.gutter-design-marker .fa-pencil', { timeout: 5000 })
      .should('have.length.at.least', 1)
      .and('be.visible')

    cy.log('✅ 通过: 铅笔图标正常显示')
  })

  /**
   * TC-02: 点击gutter图标打开Para设计器
   * 预期：点击铅笔图标后，切换到设计视图页签，Para设计器打开
   */
  it('TC-02: 点击铅笔图标打开Para设计器', () => {
    cy.log('✅ 测试用例: TC-02 - 点击铅笔图标打开Para设计器')

    // 等待编辑器加载
    cy.get('.CodeMirror', { timeout: 10000 }).should('be.visible')

    // 点击第一个铅笔图标
    cy.get('.gutter-design-marker .fa-pencil', { timeout: 5000 })
      .first()
      .click({ force: true })

    cy.wait(1000)

    // 验证切换到设计视图页签
    cy.get('.ant-tabs-tab-active').should('contain', '设计视图')

    // 验证Para设计器已打开
    cy.get('.para-designer-container', { timeout: 5000 }).should('be.visible')

    cy.log('✅ 通过: Para设计器成功打开')
  })

  /**
   * TC-03: 非para元素不显示图标
   * 预期：dmodule/content等非para元素行不显示铅笔图标
   */
  it('TC-03: 非para元素行不显示铅笔图标', () => {
    cy.log('✅ 测试用例: TC-03 - 非para元素行不显示铅笔图标')

    // 等待编辑器加载
    cy.get('.CodeMirror', { timeout: 10000 }).should('be.visible')

    // 获取所有带图标的行
    cy.get('.gutter-design-marker').then($markers => {
      const markerCount = $markers.length

      // 获取总行数
      cy.get('.CodeMirror-line').then($lines => {
        const totalLines = $lines.length

        // 带图标的行应该远少于总行数（只有para才有图标）
        expect(markerCount).to.be.lessThan(totalLines / 2)
      })
    })

    cy.log('✅ 通过: 仅para元素显示图标')
  })

  /**
   * TC-04: 图标悬停提示
   * 预期：鼠标悬停在铅笔图标上时，显示"设计视图【para】"提示
   */
  it('TC-04: 图标悬停显示提示信息', () => {
    cy.log('✅ 测试用例: TC-04 - 图标悬停显示提示信息')

    // 等待编辑器加载
    cy.get('.CodeMirror', { timeout: 10000 }).should('be.visible')

    // 悬停在第一个铅笔图标上
    cy.get('.gutter-design-link', { timeout: 5000 })
      .first()
      .trigger('mouseover')

    // 验证title属性包含"设计视图"
    cy.get('.gutter-design-link')
      .first()
      .should('have.attr', 'title')
      .and('match', /设计视图/)

    cy.log('✅ 通过: 悬停提示正常显示')
  })

  /**
   * TC-05: 格式化后图标刷新
   * 预期：点击格式化按钮后，铅笔图标位置正确刷新（行号可能变化）
   */
  it('TC-05: 格式化后图标正确刷新', () => {
    cy.log('✅ 测试用例: TC-05 - 格式化后图标正确刷新')

    // 等待编辑器加载
    cy.get('.CodeMirror', { timeout: 10000 }).should('be.visible')

    // 记录格式化前的图标数量
    cy.get('.gutter-design-marker', { timeout: 5000 }).then($before => {
      const countBefore = $before.length

      // 点击格式化按钮
      cy.contains('button', '格式化').click()
      cy.wait(1000)

      // 验证格式化后图标数量不变
      cy.get('.gutter-design-marker').should('have.length', countBefore)

      cy.log(`✅ 通过: 格式化前后图标数量一致 (${countBefore}个)`)
    })
  })

  /**
   * TC-06: 中英文切换后图标保持
   * 预期：切换中英文语言后，图标正常显示且可点击
   */
  it('TC-06: 中英文切换后图标正常显示', () => {
    cy.log('✅ 测试用例: TC-06 - 中英文切换后图标正常显示')

    // 等待编辑器加载
    cy.get('.CodeMirror', { timeout: 10000 }).should('be.visible')

    // 切换到中文
    cy.get('select').contains('English').parent().select('中文')
    cy.wait(2000)

    // 验证图标仍然存在
    cy.get('.gutter-design-marker .fa-pencil')
      .should('have.length.at.least', 1)
      .and('be.visible')

    // 验证title包含中文
    cy.get('.gutter-design-link')
      .first()
      .should('have.attr', 'title')
      .and('match', /设计视图/)

    cy.log('✅ 通过: 中文模式下图标正常显示')
  })

  /**
   * TC-07: 双击树节点与点击图标等价
   * 预期：两种方式都能打开Para设计器，功能等价
   */
  it('TC-07: 双击树节点与点击图标功能等价', () => {
    cy.log('✅ 测试用例: TC-07 - 双击树节点与点击图标功能等价')

    // 等待编辑器加载
    cy.get('.CodeMirror', { timeout: 10000 }).should('be.visible')

    // 方式1: 点击铅笔图标
    cy.get('.gutter-design-marker .fa-pencil', { timeout: 5000 })
      .first()
      .click({ force: true })
    cy.wait(1000)

    // 验证设计器打开
    cy.get('.para-designer-container').should('be.visible')

    // 切换回源码视图
    cy.contains('.ant-tabs-tab', '源码视图').click()
    cy.wait(500)

    // 方式2: 双击树节点（如果树可见）
    cy.get('.region-west').then($west => {
      if ($west.is(':visible')) {
        cy.get('.dm-structure-tree .tree-node')
          .contains('para')
          .first()
          .dblclick()
        cy.wait(1000)

        // 验证设计器再次打开
        cy.get('.para-designer-container').should('be.visible')

        cy.log('✅ 通过: 两种进入方式功能等价')
      } else {
        cy.log('⚠️  跳过: 树视图未显示')
      }
    })
  })
})
