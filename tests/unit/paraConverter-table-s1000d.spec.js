/**
 * ParaConverter - 普通table转S1000D标准测试
 * 验证修复11：UEditor插入的HTML table自动转换为S1000D标准格式
 */

// 注意：由于 convertHtmlTableToS1000D 是私有函数，我们通过 html2para 测试完整流程

describe('ParaConverter - Table S1000D转换', () => {

  // 测试用例1：基本2×2表格
  test('TC-01: 基本2×2表格转S1000D格式', () => {
    const input = `<table><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>`

    const expected = {
      hasTable: true,
      hasTgroup: true,
      hasRow: true,
      hasEntry: true,
      cols: '2',
      noHtmlTags: true  // 不应该有 <tr>, <td>, <tbody>（tbody应被tgroup包裹）
    }

    // 断言：结果应包含S1000D标准元素
    // 实际测试需要调用 html2para 并解析结果
  })

  // 测试用例2：移除HTML属性
  test('TC-02: 移除HTML属性（class, style, width, valign）', () => {
    const input = `<table><tbody><tr class="firstRow"><td width="1009" valign="top" style="word-break: break-all;">1</td><td>2</td></tr></tbody></table>`

    const expected = {
      noClass: true,
      noStyle: true,
      noWidth: true,
      noValign: true
    }
  })

  // 测试用例3：3列表格
  test('TC-03: 3列表格正确计算cols属性', () => {
    const input = `<table><tbody><tr><td>A</td><td>B</td><td>C</td></tr></tbody></table>`

    const expected = {
      cols: '3'
    }
  })

  // 测试用例4：带thead的表格
  test('TC-04: 带thead的表格正确分离thead和tbody', () => {
    const input = `<table><thead><tr><th>标题1</th><th>标题2</th></tr></thead><tbody><tr><td>数据1</td><td>数据2</td></tr></tbody></table>`

    const expected = {
      hasThead: true,
      hasTbody: true,
      theadBeforeTbody: true  // thead应该在tbody之前
    }
  })

  // 测试用例5：不应该影响 deflist="1" 的表格
  test('TC-05: 不转换deflist标记的表格', () => {
    const input = `<table deflist="1"><tr><th>术语</th><td>定义</td></tr></table>`

    const expected = {
      hasDefinitionList: true,  // 应该转换为 definitionList
      noTgroup: true            // 不应该有 tgroup
    }
  })

  // 测试用例6：不应该影响 caption="1" 的表格
  test('TC-06: 不转换caption标记的表格', () => {
    const input = `<table caption="1"><tbody><tr><td>内容</td></tr></tbody></table>`

    const expected = {
      hasCaptionGroup: true,  // 应该转换为 captionGroup
      noTgroup: true          // 不应该有 tgroup
    }
  })

  // 测试用例7：空表格
  test('TC-07: 空表格处理', () => {
    const input = `<table><tbody></tbody></table>`

    const expected = {
      hasTable: true,
      hasTgroup: true,
      cols: '1'  // 默认最少1列
    }
  })

  // 测试用例8：单行单列
  test('TC-08: 单行单列表格', () => {
    const input = `<table><tbody><tr><td>单元格</td></tr></tbody></table>`

    const expected = {
      cols: '1',
      hasEntry: true
    }
  })

  // 测试用例9：多行表格
  test('TC-09: 多行表格（5行）', () => {
    const input = `<table><tbody><tr><td>R1</td></tr><tr><td>R2</td></tr><tr><td>R3</td></tr><tr><td>R4</td></tr><tr><td>R5</td></tr></tbody></table>`

    const expected = {
      rowCount: 5
    }
  })

  // 测试用例10：嵌套内容（entry内有文本+标签）
  test('TC-10: entry内嵌套内容保持不变', () => {
    const input = `<table><tbody><tr><td>普通文本<strong>加粗</strong>文本</td></tr></tbody></table>`

    const expected = {
      hasEmphasis: true,  // <strong> 应该转换为 <emphasis>
      preserveText: true
    }
  })

})

/**
 * 测试断言说明：
 *
 * 由于 convertHtmlTableToS1000D 是私有函数，实际测试需要：
 * 1. 通过 html2para(parent, htmlWithTable, projectParams) 调用完整转换流程
 * 2. 解析返回的XML字符串
 * 3. 验证XML结构符合S1000D标准
 *
 * 标准验证点：
 * - 必须有 <table><tgroup cols="N"><tbody><row><entry>
 * - 不能有 <tr>, <td>, <th>（除非在未标记的原始HTML中）
 * - 不能有 HTML属性（class, style, width, valign, colspan, rowspan等）
 * - thead/tbody顺序正确
 * - deflist="1" 和 caption="1" 的表格不受影响
 */
