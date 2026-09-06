const { test, expect } = require('@playwright/test')

/**
 * currentProject问题诊断测试
 */

test.describe('currentProject诊断', () => {
  test('诊断currentProject状态', async ({ page }) => {
    console.log('\n========== currentProject诊断 ==========')

    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.waitForSelector('input[placeholder*="账户名"]', { timeout: 10000 })
    await page.fill('input[placeholder*="账户名"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // 打开项目
    try {
      const openProjectBtn = page.locator('button:has-text("打开项目")').first()
      if (await openProjectBtn.isVisible({ timeout: 3000 })) {
        await openProjectBtn.click()
        await page.waitForTimeout(1000)

        const firstProject = page.locator('.ant-table-row').first()
        if (await firstProject.isVisible({ timeout: 2000 })) {
          await firstProject.click()
          await page.click('button:has-text("确定")')
          await page.waitForTimeout(2000)
          console.log('✅ 项目已打开')
        }
      }
    } catch (e) {
      console.log('⚠️ 项目可能已打开')
    }

    // 导航到ICN导出页面
    await page.goto('http://localhost:3000/#/ietm/ietmicn-export')
    await page.waitForTimeout(2000)

    // 执行诊断脚本
    const diagnostics = await page.evaluate(() => {
      const results = {
        页面加载: false,
        Vue实例存在: false,
        store存在: false,
        project模块存在: false,
        currentProject值: null,
        currentProject类型: 'unknown',
        错误信息: []
      }

      try {
        // 1. 检查页面容器
        const container = document.querySelector('.ietm-icn-export-container')
        results.页面加载 = !!container

        if (container && container.__vue__) {
          const vm = container.__vue__
          results.Vue实例存在 = true

          // 2. 检查$store
          if (vm.$store) {
            results.store存在 = true

            // 3. 检查state.project
            if (vm.$store.state.project) {
              results.project模块存在 = true

              // 4. 检查currentProject
              const cp = vm.$store.state.project.currentProject
              results.currentProject值 = cp
              results.currentProject类型 = typeof cp

              if (cp) {
                results.currentProject详情 = {
                  id: cp.id,
                  projectId: cp.projectId,
                  equipmentCode: cp.equipmentCode,
                  projectName: cp.projectName || cp.name
                }
              }
            } else {
              results.错误信息.push('state.project模块不存在')
            }

            // 5. 检查computed中的currentProject
            if (vm.currentProject !== undefined) {
              results.computed_currentProject = vm.currentProject
              results.computed_currentProject类型 = typeof vm.currentProject
            } else {
              results.错误信息.push('vm.currentProject未定义')
            }

            // 6. 检查$refs.icnSelectModal
            if (vm.$refs.icnSelectModal) {
              results.icnSelectModal引用 = '✅ 存在'
            } else {
              results.错误信息.push('$refs.icnSelectModal不存在')
            }
          } else {
            results.错误信息.push('$store不存在')
          }
        } else {
          results.错误信息.push('Vue实例不存在')
        }
      } catch (error) {
        results.错误信息.push('执行异常: ' + error.message)
      }

      return results
    })

    // 打印诊断结果
    console.log('\n========== 诊断结果 ==========')
    console.log(JSON.stringify(diagnostics, null, 2))

    // 关键检查
    console.log('\n========== 关键检查 ==========')
    console.log(`1. 页面加载: ${diagnostics.页面加载 ? '✅' : '❌'}`)
    console.log(`2. Vue实例: ${diagnostics.Vue实例存在 ? '✅' : '❌'}`)
    console.log(`3. Store: ${diagnostics.store存在 ? '✅' : '❌'}`)
    console.log(`4. project模块: ${diagnostics.project模块存在 ? '✅' : '❌'}`)
    console.log(`5. currentProject值: ${diagnostics.currentProject值 ? '✅ ' + JSON.stringify(diagnostics.currentProject详情) : '❌ null'}`)
    console.log(`6. computed currentProject: ${diagnostics.computed_currentProject ? '✅' : '❌'}`)

    if (diagnostics.错误信息.length > 0) {
      console.log('\n========== 错误信息 ==========')
      diagnostics.错误信息.forEach(err => console.log('❌', err))
    }

    // 测试handleAddIcn
    console.log('\n========== 测试handleAddIcn ==========')
    const addBtnClick = await page.evaluate(() => {
      const container = document.querySelector('.ietm-icn-export-container')
      if (container && container.__vue__) {
        const vm = container.__vue__

        // 模拟点击添加按钮
        try {
          if (!vm.currentProject || !vm.currentProject.id) {
            return { success: false, message: '触发了"请先打开项目"提示' }
          }
          return { success: true, message: 'currentProject存在' }
        } catch (error) {
          return { success: false, message: '异常: ' + error.message }
        }
      }
      return { success: false, message: 'Vue实例不存在' }
    })

    console.log('handleAddIcn模拟结果:', addBtnClick)

    // 如果currentProject为null，尝试手动设置
    if (!diagnostics.currentProject值) {
      console.log('\n========== 尝试手动设置currentProject ==========')

      const manualSet = await page.evaluate(() => {
        const container = document.querySelector('.ietm-icn-export-container')
        if (container && container.__vue__) {
          const vm = container.__vue__

          // 检查store中是否有其他地方存储了项目信息
          const storeKeys = Object.keys(vm.$store.state)
          return {
            storeModules: storeKeys,
            user: vm.$store.state.user ? { username: vm.$store.state.user.username } : null
          }
        }
        return {}
      })

      console.log('Store模块:', manualSet.storeModules)
      console.log('User信息:', manualSet.user)
    }
  })
})
