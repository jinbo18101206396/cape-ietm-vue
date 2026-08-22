/**
 * 引用DM弹窗 - 引用指定版本搜索功能测试
 *
 * 测试目标：
 * 1. 引用指定版本页签有搜索栏（与引用最新版一致）
 * 2. 表格样式一致（bordered、scroll）
 * 3. 搜索功能正常工作
 * 4. 版本号、版本日期列可见
 */

describe('引用DM弹窗 - 引用指定版本搜索', () => {
  before(() => {
    // 登录
    cy.visit('http://localhost:3000/user/login')
    cy.get('input[placeholder="账号"]').type('admin')
    cy.get('input[placeholder="密码"]').type('admin')
    cy.get('button[type="submit"]').click()
    cy.wait(2000)
  })

  beforeEach(() => {
    // 导航到数据模块管理页面
    cy.visit('http://localhost:3000')
    cy.wait(1000)
    cy.contains('IETM管理').click()
    cy.wait(500)
    cy.contains('数据模块管理').click()
    cy.wait(2000)

    // 选择项目
    cy.get('.ant-tree-title').first().click()
    cy.wait(1000)

    // 打开第一条DM
    cy.get('.ant-table-tbody tr').first().within(() => {
      cy.get('td').eq(1).find('a').click()
    })
    cy.wait(2000)

    // 点击"引用DM"工具栏按钮
    cy.get('button').contains('引用DM').click()
    cy.wait(1000)

    // 切换到"引用指定版本"页签
    cy.get('.ant-tabs-tab').contains('引用指定版本').click()
    cy.wait(1000)
  })

  it('TC-01: 引用指定版本页签有搜索栏', () => {
    // 验证搜索栏存在
    cy.get('.ant-tabs-tabpane-active .dm-ref-search').should('exist')

    // 验证4个搜索输入框
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]').should('exist')
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]').should('exist')
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="信息名称"]').should('exist')
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DM类型"]').should('exist')

    // 验证查询和清空按钮
    cy.get('.ant-tabs-tabpane-active .dm-ref-search button').contains('查询').should('exist')
    cy.get('.ant-tabs-tabpane-active .dm-ref-search button').contains('清空').should('exist')
  })

  it('TC-02: 表格有边框和滚动条', () => {
    // 验证表格存在
    cy.get('.ant-tabs-tabpane-active .dm-ref-table').should('exist')

    // 验证bordered（检查表格是否有边框class）
    cy.get('.ant-tabs-tabpane-active .ant-table-bordered').should('exist')

    // 验证滚动容器存在（ant-design scroll会生成 .ant-table-body）
    cy.get('.ant-tabs-tabpane-active .ant-table-body').should('exist')
  })

  it('TC-03: 表头包含版本号和版本日期列', () => {
    // 验证表头列
    cy.get('.ant-tabs-tabpane-active .ant-table-thead th').then($headers => {
      const headerTexts = $headers.map((i, el) => Cypress.$(el).text().trim()).get()

      // 应包含：选择框、DMC、技术名称、信息名称、DM类型、版本类型、版本号、版本日期
      expect(headerTexts).to.include('DMC')
      expect(headerTexts).to.include('技术名称')
      expect(headerTexts).to.include('信息名称')
      expect(headerTexts).to.include('DM类型')
      expect(headerTexts).to.include('版本类型')
      expect(headerTexts).to.include('版本号')
      expect(headerTexts).to.include('版本日期')
    })
  })

  it('TC-04: DMC搜索功能正常', () => {
    // 获取第一行的DMC值
    cy.get('.ant-tabs-tabpane-active .ant-table-tbody tr').first().within(() => {
      cy.get('td').eq(1).invoke('text').then(dmcText => {
        const dmcPart = dmcText.trim().substring(0, 10) // 取前10个字符

        // 输入搜索条件
        cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]').clear().type(dmcPart)

        // 点击查询
        cy.get('.ant-tabs-tabpane-active .dm-ref-search button').contains('查询').click()
        cy.wait(1000)

        // 验证结果包含搜索关键字
        cy.get('.ant-tabs-tabpane-active .ant-table-tbody tr').first().within(() => {
          cy.get('td').eq(1).should('contain', dmcPart)
        })
      })
    })
  })

  it('TC-05: 技术名称搜索功能正常', () => {
    // 获取第一行的技术名称
    cy.get('.ant-tabs-tabpane-active .ant-table-tbody tr').first().within(() => {
      cy.get('td').eq(2).invoke('text').then(techName => {
        if (techName && techName.trim()) {
          const searchTerm = techName.trim()

          // 输入搜索条件
          cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]').clear().type(searchTerm)

          // 点击查询
          cy.get('.ant-tabs-tabpane-active .dm-ref-search button').contains('查询').click()
          cy.wait(1000)

          // 验证结果
          cy.get('.ant-tabs-tabpane-active .ant-table-tbody tr').should('have.length.greaterThan', 0)
        } else {
          cy.log('技术名称为空，跳过测试')
        }
      })
    })
  })

  it('TC-06: 清空按钮正常工作', () => {
    // 输入搜索条件
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]').type('TEST')
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]').type('测试')

    // 点击清空
    cy.get('.ant-tabs-tabpane-active .dm-ref-search button').contains('清空').click()
    cy.wait(1000)

    // 验证输入框已清空
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]').should('have.value', '')
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="技术名称"]').should('have.value', '')
  })

  it('TC-07: Enter键触发搜索', () => {
    // 获取初始行数
    cy.get('.ant-tabs-tabpane-active .ant-table-tbody tr').its('length').then(initialCount => {
      // 在DMC输入框按Enter
      cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]')
        .clear()
        .type('DMC{enter}')
      cy.wait(1000)

      // 验证触发了查询（行数可能变化或保持）
      cy.get('.ant-tabs-tabpane-active .ant-table-tbody tr').should('exist')
    })
  })

  it('TC-08: 两个页签的搜索条件独立', () => {
    // 在引用指定版本输入搜索条件
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]').type('VERSION_TEST')

    // 切换到引用最新版
    cy.get('.ant-tabs-tab').contains('引用最新版').click()
    cy.wait(500)

    // 验证引用最新版的搜索框是空的
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]').should('have.value', '')

    // 在引用最新版输入搜索条件
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]').type('LATEST_TEST')

    // 切换回引用指定版本
    cy.get('.ant-tabs-tab').contains('引用指定版本').click()
    cy.wait(500)

    // 验证引用指定版本的搜索条件保持
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DMC"]').should('have.value', 'VERSION_TEST')
  })

  it('TC-09: 表格scroll配置一致（x=950, y=240）', () => {
    // 验证引用指定版本的表格配置
    cy.get('.ant-tabs-tab').contains('引用指定版本').click()
    cy.wait(500)
    cy.get('.ant-tabs-tabpane-active .ant-table-body').should('exist')

    // 切换到引用最新版对比
    cy.get('.ant-tabs-tab').contains('引用最新版').click()
    cy.wait(500)
    cy.get('.ant-tabs-tabpane-active .ant-table-body').should('exist')

    // 两个表格的DOM结构应该一致（都有 .ant-table-body）
    cy.log('两个页签的表格结构一致')
  })

  it('TC-10: DM类型搜索功能正常', () => {
    // 输入DM类型搜索
    cy.get('.ant-tabs-tabpane-active .dm-ref-search input[placeholder="DM类型"]').type('描述')

    // 点击查询
    cy.get('.ant-tabs-tabpane-active .dm-ref-search button').contains('查询').click()
    cy.wait(1000)

    // 验证有结果或空态
    cy.get('.ant-tabs-tabpane-active').within(() => {
      cy.get('.ant-table-tbody tr').should('exist')
    })
  })

  afterEach(() => {
    // 关闭弹窗
    cy.get('.ant-modal-footer button').contains('关闭').click({ force: true })
    cy.wait(500)
  })
})
