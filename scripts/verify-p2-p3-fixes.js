/**
 * P2/P3修复验证辅助脚本
 *
 * 用途: 在浏览器控制台运行，快速验证5个修复点
 * 使用:
 *   1. 打开Chrome DevTools (F12)
 *   2. 复制此脚本到Console
 *   3. 按照提示操作
 */

(function() {
  console.log('%c=== P2/P3修复验证工具 ===', 'color: #1890ff; font-size: 16px; font-weight: bold;')
  console.log('%c版本: 1.0.0', 'color: #52c41a;')
  console.log('%c日期: 2026-08-26', 'color: #52c41a;')
  console.log('')

  const verifications = {
    'P2-2': {
      name: '节点表格序号列',
      selector: '.ant-table-thead th:first-child',
      check: () => {
        const firstTh = document.querySelector('.ant-table-thead th:first-child')
        if (!firstTh) return { pass: false, msg: '未找到表格，请先打开启动流程弹窗' }

        const text = firstTh.textContent.trim()
        if (text === '序号') {
          // 检查序号列内容
          const firstCell = document.querySelector('.ant-table-tbody tr:first-child td:first-child')
          if (firstCell && firstCell.textContent.trim() === '1') {
            return { pass: true, msg: '✅ 序号列显示正确！第一行显示"1"' }
          }
          return { pass: false, msg: '⚠️ 序号列存在但内容不正确' }
        }
        return { pass: false, msg: `❌ 第一列不是"序号"，当前是"${text}"` }
      }
    },

    'P3-1': {
      name: '模板下拉可搜索',
      selector: '.ant-select-search__field',
      check: () => {
        const searchInput = document.querySelector('.ant-select-search__field')
        if (!searchInput) return { pass: false, msg: '未找到搜索框，请先点击模板下拉' }

        return { pass: true, msg: '✅ 模板下拉支持搜索！请手动输入关键词测试' }
      }
    },

    'P3-2': {
      name: '重启流程加载提示',
      selector: '.ant-spin-text',
      check: () => {
        const spinText = document.querySelector('.ant-spin-text')
        if (!spinText) return { pass: false, msg: '未找到加载提示，请先打开重启流程弹窗' }

        const text = spinText.textContent.trim()
        if (text === '正在加载，请稍候...') {
          return { pass: true, msg: '✅ 加载提示显示正确！' }
        }
        return { pass: false, msg: `⚠️ 加载提示存在但文案不正确: "${text}"` }
      }
    },

    'P2-3': {
      name: '追加意见字符计数',
      selector: '.ant-input-textarea-show-count::after',
      check: () => {
        const textarea = Array.from(document.querySelectorAll('textarea'))
          .find(el => el.placeholder && el.placeholder.includes('追加意见'))

        if (!textarea) return { pass: false, msg: '未找到追加意见输入框，请先打开流程信息面板' }

        const wrapper = textarea.closest('.ant-input-textarea-show-count')
        if (wrapper) {
          return { pass: true, msg: '✅ 字符计数功能正常！输入文字可看到计数变化' }
        }
        return { pass: false, msg: '⚠️ 输入框存在但未启用字符计数' }
      }
    }
  }

  // 验证函数
  window.verifyFix = function(fixId) {
    console.log('')
    console.log(`%c--- 验证 ${fixId}: ${verifications[fixId].name} ---`, 'color: #1890ff; font-weight: bold;')

    const result = verifications[fixId].check()
    const color = result.pass ? '#52c41a' : '#ff4d4f'
    console.log(`%c${result.msg}`, `color: ${color}; font-size: 14px;`)

    return result.pass
  }

  // 验证所有
  window.verifyAll = function() {
    console.log('')
    console.log('%c=== 开始验证所有修复点 ===', 'color: #1890ff; font-size: 14px; font-weight: bold;')

    let passed = 0
    let total = 0

    for (const [fixId, config] of Object.entries(verifications)) {
      if (fixId === 'P2-1') continue // P2-1需要实际提交，跳过自动验证

      total++
      if (window.verifyFix(fixId)) {
        passed++
      }
    }

    console.log('')
    console.log(`%c=== 验证完成: ${passed}/${total} 通过 ===`,
      passed === total ? 'color: #52c41a; font-size: 16px; font-weight: bold;' :
                         'color: #ff4d4f; font-size: 16px; font-weight: bold;')
  }

  // 显示使用说明
  console.log('%c使用说明:', 'color: #1890ff; font-weight: bold;')
  console.log('1. verifyFix("P2-2")  - 验证节点表格序号列')
  console.log('2. verifyFix("P3-1")  - 验证模板下拉搜索')
  console.log('3. verifyFix("P3-2")  - 验证重启流程加载提示')
  console.log('4. verifyFix("P2-3")  - 验证追加意见字符计数')
  console.log('5. verifyAll()        - 验证所有修复点')
  console.log('')
  console.log('%c注意: P2-1(成功提示)需要实际提交流程才能验证', 'color: #faad14;')
  console.log('')
})()
