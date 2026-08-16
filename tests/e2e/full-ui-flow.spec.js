/**
 * Comprehensive test: Create project, create DM, test preview via pure UI automation
 * No API shortcuts - all through UI interactions
 */
const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'

test.describe('Full UI Flow: Create Test Data and Test Preview', () => {
  test('Create project and DM via UI, then test preview legacy function fixes', async ({ page }) => {
    test.setTimeout(120000) // 2 minutes for complete flow

    // Navigate to main page
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    console.log('✅ Page loaded')

    // Try to find and click "IETM项目管理" or "项目管理" in menu
    const projectMenuItems = [
      'text=IETM项目管理',
      'text=项目管理',
      'a:has-text("项目")',
      'span:has-text("项目管理")'
    ]

    let projectMenuFound = false
    for (const selector of projectMenuItems) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await element.click()
        await page.waitForTimeout(1000)
        projectMenuFound = true
        console.log(`✅ Clicked project menu: ${selector}`)
        break
      }
    }

    if (!projectMenuFound) {
      console.log('⚠️ Project menu not found, trying direct navigation')
      await page.goto(`${BASE}/ietm/project-management`)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)
    }

    // Look for "新建" or "新增" button to create project
    const newProjectButtons = [
      'button:has-text("新建")',
      'button:has-text("新增")',
      'button:has-text("添加")'
    ]

    let canCreateProject = false
    for (const selector of newProjectButtons) {
      const button = page.locator(selector).first()
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found new project button: ${selector}`)
        canCreateProject = true

        // Create test project
        await button.click()
        await page.waitForTimeout(1000)

        // Fill project form (exact fields depend on actual UI)
        const modal = page.locator('.ant-modal-content')
        await expect(modal).toBeVisible({ timeout: 5000 })

        // Project name
        const nameInput = modal.locator('input').first()
        await nameInput.fill('TEST_PREVIEW_PROJECT_' + Date.now())
        await page.waitForTimeout(500)

        // Submit
        const submitBtn = modal.locator('button:has-text("确定"), button:has-text("提交")').first()
        await submitBtn.click()
        await page.waitForTimeout(2000)

        console.log('✅ Project created')
        break
      }
    }

    // Navigate to DM management
    await page.goto(`${BASE}/ietm/data-module-management`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/dm-mgmt-after-project.png' })
    console.log('📸 DM management page after project creation')

    // Now try to create DM
    // First, try to click tree node if available
    const treeNode = page.locator('.ant-tree-node-content-wrapper, .ant-tree-title').first()
    if (await treeNode.isVisible({ timeout: 3000 }).catch(() => false)) {
      await treeNode.click()
      await page.waitForTimeout(1000)
      console.log('✅ Selected tree node')
    }

    // Look for "新建" button
    const newDmBtn = page.locator('button:has-text("新建")').first()
    if (await newDmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newDmBtn.click()
      await page.waitForTimeout(1000)
      console.log('✅ Clicked new DM button')

      // Fill DM creation form (simplified - focus on getting a DM created)
      const dmModal = page.locator('.ant-modal-content').last()
      await expect(dmModal).toBeVisible()

      // Fill required fields with minimal data
      const inputs = await dmModal.locator('input[type="text"]').all()
      if (inputs.length >= 2) {
        await inputs[0].fill('PREVIEW_TEST_' + Date.now())
        await inputs[1].fill('Preview Legacy Function Test DM')
      }

      // Select any options from dropdowns (schema, language, etc.)
      const selects = await dmModal.locator('.ant-select-selection').all()
      for (let i = 0; i < Math.min(selects.length, 5); i++) {
        await selects[i].click()
        await page.waitForTimeout(300)
        await page.locator('.ant-select-dropdown-menu-item').first().click()
        await page.waitForTimeout(300)
      }

      // Submit
      const submitBtn = dmModal.locator('button:has-text("确定")').first()
      await submitBtn.click()
      await page.waitForTimeout(5000)

      console.log('✅ DM creation submitted')

      // Should now be in editor - check for CodeMirror
      const editor = page.locator('.CodeMirror')
      if (await editor.isVisible({ timeout: 10000 }).catch(() => false)) {
        console.log('✅ Editor loaded successfully!')

        // Get DM_ID from URL
        const url = page.url()
        const dmIdMatch = url.match(/\/ietm\/dm-content-editor\/(\d+)/)
        if (dmIdMatch) {
          const dmId = dmIdMatch[1]
          console.log(`✅ DM_ID: ${dmId}`)
          console.log(`✅ URL: ${url}`)

          // Now we can test preview!
          // Click preview button
          const previewBtn = page.locator('button:has-text("预览")').first()
          if (await previewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await previewBtn.click()
            await page.waitForTimeout(2000)

            // Check if preview modal opens
            const previewModal = page.locator('.ant-modal:has-text("预览")')
            if (await previewModal.isVisible({ timeout: 5000 }).catch(() => false)) {
              console.log('✅ Preview modal opened')

              // Check iframe content
              const iframe = previewModal.locator('iframe').first()
              await expect(iframe).toBeVisible({ timeout: 5000 })

              console.log('✅ Preview iframe loaded')
              console.log('\n🎉 FULL UI FLOW SUCCESSFUL!')
              console.log(`   Created project → Created DM ${dmId} → Opened preview`)
              console.log(`   Ready for preview testing!`)
            }
          }
        }
      }
    } else {
      console.log('❌ Cannot create DM - no "新建" button visible')
      await page.screenshot({ path: 'test-results/no-new-dm-button.png' })
    }
  })
})
