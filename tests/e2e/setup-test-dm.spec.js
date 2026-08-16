/**
 * Setup script: Create test DM with preview-testable content via UI automation
 * Creates DM containing: dmRef, graphic, display:none elements
 */
const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NTUwOTg0MjUsInVzZXJuYW1lIjoiYWRtaW4ifQ.G_ryx3_rLyhZG7c0OPkHdBYBykIC-pxpwEMaVLt_EJo'
const PROJECT_ID = '2078348945532030978'

test.describe('Setup: Create Test DM for Preview Testing', () => {
  test('Should create test DM with preview elements via UI', async ({ page }) => {
    // Navigate directly - system uses auto-login or persistent session
    await page.goto(`${BASE}/ietm/data-module-management`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Take screenshot to verify page loaded
    await page.screenshot({ path: 'test-results/dm-management-loaded.png' })
    console.log('📸 DM management page loaded')

    // Click left tree to select project - find first tree node
    const treeNode = page.locator('.ant-tree-node-content-wrapper').first()
    await expect(treeNode).toBeVisible({ timeout: 10000 })
    await treeNode.click()
    await page.waitForTimeout(1500)

    // Click "新建" (New) button - should appear after selecting tree node
    const newBtn = page.locator('button:has-text("新建")')
    await expect(newBtn).toBeVisible({ timeout: 10000 })
    await newBtn.click()
    await page.waitForTimeout(1000)

    // Fill DM creation form
    const modal = page.locator('.ant-modal-content')
    await expect(modal).toBeVisible()

    // Tech Name
    await modal.locator('input[placeholder*="技术名称"]').fill('TEST_PREVIEW_LEGACY_FUNCTIONS')
    await page.waitForTimeout(300)

    // Info Name
    await modal.locator('input[placeholder*="资料名称"]').fill('Preview Legacy Function Test DM')
    await page.waitForTimeout(300)

    // DM Type - select first available
    await modal.locator('.ant-select-selection').first().click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown-menu-item').first().click()
    await page.waitForTimeout(300)

    // Language - 中文
    const langSelect = modal.locator('.ant-select-selection').nth(1)
    await langSelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown-menu-item:has-text("中文")').first().click()
    await page.waitForTimeout(300)

    // Country - 中国
    const countrySelect = modal.locator('.ant-select-selection').nth(2)
    await countrySelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown-menu-item:has-text("中国")').first().click()
    await page.waitForTimeout(300)

    // Security - 01 (non-classified)
    const securitySelect = modal.locator('.ant-select-selection').nth(3)
    await securitySelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown-menu-item').first().click()
    await page.waitForTimeout(300)

    // Schema - S1000D40 or first available
    const schemaSelect = modal.locator('.ant-select-selection').nth(4)
    await schemaSelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown-menu-item').first().click()
    await page.waitForTimeout(300)

    // Submit form
    const submitBtn = modal.locator('button:has-text("确定")')
    await submitBtn.click()
    await page.waitForTimeout(3000)

    // Wait for editor to load
    await expect(page.locator('.CodeMirror')).toBeVisible({ timeout: 30000 })
    await page.waitForTimeout(2000)

    // Inject test XML content with legacy function test elements
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/descript.xsd">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationCode="A"/>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
        <issueInfo issueNumber="001" inWork="01"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="08" day="13"/>
        <dmTitle>
          <techName>Preview Legacy Function Test</techName>
          <infoName>Test DM with dmRef, graphic, and display:none</infoName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
      <responsiblePartnerCompany>
        <enterpriseName>Test Enterprise</enterpriseName>
      </responsiblePartnerCompany>
      <originator>
        <enterpriseName>Test Originator</enterpriseName>
      </originator>
      <applicability>
        <applic>
          <displayText>
            <simplePara>All</simplePara>
          </displayText>
        </applic>
      </applicability>
      <brexDmRef>
        <dmRef>
          <dmRefIdent>
            <dmCode modelIdentCode="S1000D" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="022" infoCodeVariant="A" itemLocationCode="D"/>
          </dmRefIdent>
        </dmRef>
      </brexDmRef>
      <qualityAssurance>
        <unverified/>
      </qualityAssurance>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>Legacy Function Test Cases</title>
        <para id="para-001">
          <emphasis emphasisType="em01" style="display:none">This text has display:none and should become visible after fix.</emphasis>
        </para>
        <para id="para-002">
          Test dmRef link: <dmRef>
            <dmRefIdent>
              <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="01" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="001" infoCodeVariant="A" itemLocationCode="A"/>
            </dmRefIdent>
          </dmRef>
        </para>
        <para id="para-003">
          <figure id="fig-001">
            <title>Test Graphic</title>
            <graphic infoEntityIdent="ICN-TEST-001"/>
          </figure>
        </para>
        <para id="para-004" style="display:none">
          This entire para has display:none inline style.
        </para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

    // Use CodeMirror API to set content
    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(xml)
    }, testXml)
    await page.waitForTimeout(1000)

    // Save DM
    const saveBtn = page.locator('button:has-text("保存")')
    await saveBtn.click()
    await page.waitForTimeout(2000)

    // Extract DM_ID from URL
    const url = page.url()
    const dmIdMatch = url.match(/\/ietm\/dm-content-editor\/(\d+)/)
    expect(dmIdMatch).toBeTruthy()
    const dmId = dmIdMatch[1]

    console.log(`✅ Test DM created successfully!`)
    console.log(`   DM_ID: ${dmId}`)
    console.log(`   URL: ${url}`)
    console.log(`\n📝 Update dm-preview.spec.js with:`)
    console.log(`   const DM_ID = '${dmId}'`)

    // Verify DM is accessible
    const checkResponse = await page.request.get(`http://localhost:9999/jeecg-boot/ietm/dm-content/queryById?id=${dmId}`, {
      headers: { 'X-Access-Token': TOKEN }
    })
    expect(checkResponse.ok()).toBeTruthy()
    const dmData = await checkResponse.json()
    expect(dmData.result).toBeTruthy()
    expect(dmData.result.dm_content).toContain('display:none')
    expect(dmData.result.dm_content).toContain('<dmRef>')
    expect(dmData.result.dm_content).toContain('<graphic')

    console.log(`\n✅ DM verified in database with all test elements`)
  })
})
