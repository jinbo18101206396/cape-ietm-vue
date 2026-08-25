/**
 * BUG验证：display:none全局替换破坏UI控制逻辑
 *
 * 问题：fixLegacyFunctionCalls会替换**所有**display:none，包括XSLT有意添加的UI控制元素
 */
const { test, expect } = require('@playwright/test')

test.describe('BUG: display:none全局替换破坏UI控制', () => {
  function fixLegacyFunctionCalls(html) {
    if (!html) return html
    html = html.replace(/window\.external\.ShowDmRef/g, 'showDmRefInfo')
    html = html.replace(/window\.parent\.addShowContentPanel/g, 'showDmRefInfo')
    html = html.replace(/window\.parent\.showPicture/g, 'showMultimediaInfo')
    html = html.replace(/display:\s*none\s*;?/g, 'display:;')
    return html
  }

  test('❌ BUG: 警告面板的display:none被错误移除', () => {
    // 来自base.xsl的真实HTML模式
    const htmlFromXslt = `
      <div id="wcnDiv" class="dmview" style="display: none">
        <h3>Warning and Caution</h3>
        <div class="warning">Important warning</div>
      </div>
      <button onclick="showWarning()">Show Warning</button>
    `

    const result = fixLegacyFunctionCalls(htmlFromXslt)

    // 预期：wcnDiv初始应该隐藏（display:none），点击按钮后由JavaScript控制显示
    // 实际：display:none被替换成display:; 导致wcnDiv初始就显示出来
    console.log('Original:', htmlFromXslt.includes('style="display: none"'))
    console.log('After fix:', result.includes('style="display: none"'))
    console.log('Result contains display:;', result.includes('style="display:;'))

    // 验证BUG存在
    expect(result).not.toContain('display: none') // display:none被移除了
    expect(result).toContain('display:;') // 被替换成无效的display:;

    console.log('\n❌ BUG确认：警告面板的display:none被错误移除')
    console.log('   影响：警告面板会初始显示，破坏交互逻辑')
  })

  test('❌ BUG: 故障隔离流程的条件显示被破坏', () => {
    // 来自fault.xsl的真实HTML模式
    const htmlFromXslt = `
      <div class="faultStep" style="display:none;text-align: center;">
        <p>Step 2: Check voltage</p>
      </div>
      <div class="faultStep" style="display:none;">
        <p>Step 3: Replace component</p>
      </div>
    `

    const result = fixLegacyFunctionCalls(htmlFromXslt)

    // 预期：故障步骤初始隐藏，根据前序步骤结果动态显示
    // 实际：所有步骤都显示出来，破坏了故障隔离的逐步引导逻辑

    console.log('\nOriginal step1:', htmlFromXslt.match(/style="display:none;text-align/))
    console.log('After fix step1:', result.match(/style="display:;text-align/))

    expect(result).not.toContain('display:none')
    expect(result).toContain('display:;')

    console.log('\n❌ BUG确认：故障隔离流程的条件显示被破坏')
    console.log('   影响：所有故障步骤同时显示，失去逐步引导功能')
  })

  test('❌ BUG: 无法区分旧系统兼容和真实UI控制', () => {
    // 混合场景：既有旧系统兼容（应该移除），又有真实UI控制（应该保留）
    const mixedHtml = `
      <!-- 这个display:none是旧IETM阅读器兼容性hack，应该移除 -->
      <span style="display:none">Legacy compatibility hidden</span>

      <!-- 这个display:none是有意的UI控制，不应该移除 -->
      <div id="optionalPanel" style="display:none">
        <button onclick="toggle()">Toggle</button>
      </div>
    `

    const result = fixLegacyFunctionCalls(mixedHtml)

    // 问题：当前实现无法区分这两种情况，一刀切全部替换
    const noneCount = (result.match(/display:\s*none/g) || []).length

    console.log('\nOriginal display:none count:', 2)
    console.log('After fix display:none count:', noneCount)
    console.log('Both removed:', noneCount === 0)

    expect(noneCount).toBe(0) // 两个都被移除了

    console.log('\n❌ BUG确认：无法区分应该移除和应该保留的display:none')
    console.log('   根本原因：正则表达式过于简单，缺少上下文判断')
  })

  test('💡 修复方案演示：保留特定元素的display:none', () => {
    // 修复方案：只替换特定内容元素的display:none，保留UI控制元素
    function fixLegacyFunctionCallsImproved(html) {
      if (!html) return html

      // 替换旧函数调用
      html = html.replace(/window\.external\.ShowDmRef/g, 'showDmRefInfo')
      html = html.replace(/window\.parent\.addShowContentPanel/g, 'showDmRefInfo')
      html = html.replace(/window\.parent\.showPicture/g, 'showMultimediaInfo')

      // 改进：只替换内容元素的display:none，保留有id或特定class的元素
      // 方案1: 只替换<span>和<emphasis>等内联元素
      html = html.replace(/<(span|emphasis)([^>]*?)style="([^"]*?)display:\s*none\s*;?([^"]*?)"/g,
                         '<$1$2style="$3display:;$4"')

      return html
    }

    const testHtml = `
      <span style="display:none">Legacy inline hidden</span>
      <div id="panel" style="display:none">UI control panel</div>
    `

    const result = fixLegacyFunctionCallsImproved(testHtml)

    // 验证：span的display:none被替换，div的被保留
    expect(result).toMatch(/<span[^>]*style="display:;"/) // span被修复
    expect(result).toMatch(/<div id="panel" style="display:none">/) // div被保留

    console.log('\n✅ 修复方案验证通过')
    console.log('   内联元素的display:none被移除')
    console.log('   有id的div的display:none被保留')
  })

  test('📊 影响评估：真实XSLT输出中的display:none分布', () => {
    // 基于grep结果统计
    const xsltDisplayNoneUsage = {
      'base.xsl': 3, // wcnDiv + 2个动态属性
      'fault.xsl': 7, // 多个故障步骤的条件显示
      total: 10
    }

    console.log('\n📊 XSLT模板中的display:none使用情况:')
    console.log('   base.xsl (警告/注意面板): 3处')
    console.log('   fault.xsl (故障隔离流程): 7处')
    console.log('   总计: 10+处')
    console.log('\n   这些都是有意的UI控制，不应该被移除')
    console.log('   当前实现会将它们全部破坏 ❌')

    expect(xsltDisplayNoneUsage.total).toBeGreaterThan(0)
  })
})

test.describe('正确性重新评估', () => {
  test('综合评估：代码质量应该降级', () => {
    console.log('\n=== 正确性重新评估 ===\n')
    console.log('原评分: ⭐⭐⭐⭐☆ (4/5)')
    console.log('问题性质: "潜在问题" → 实际是 "真实BUG"')
    console.log('\nBUG详情:')
    console.log('  1. 破坏警告/注意面板的交互逻辑')
    console.log('  2. 破坏故障隔离流程的逐步引导')
    console.log('  3. 影响范围：所有使用display:none控制UI的DM类型')
    console.log('  4. 严重程度：中等（影响UX和功能逻辑）')
    console.log('\n修正后评分: ⭐⭐⭐☆☆ (3/5)')
    console.log('  扣分原因: 正则过于简单，缺少上下文判断，破坏正常UI控制')
  })
})
