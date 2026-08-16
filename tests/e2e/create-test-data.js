/**
 * Create test DM using playwright's storageState to persist login
 */
const { chromium } = require('playwright')

async function createTestData() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate and wait for any auto-login
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Capture all storage and cookies
    const storage = await context.storageState()
    console.log('Storage state:', JSON.stringify(storage, null, 2))

    // Try to extract token from any source
    const tokenSources = await page.evaluate(() => {
      const sources = {}

      // Check all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        sources[`localStorage.${key}`] = localStorage.getItem(key)
      }

      // Check all sessionStorage keys
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        sources[`sessionStorage.${key}`] = sessionStorage.getItem(key)
      }

      // Check cookies
      sources.cookies = document.cookie

      return sources
    })

    console.log('\nToken sources:', JSON.stringify(tokenSources, null, 2))

    // Try making an API call through the page context
    const apiResult = await page.evaluate(async () => {
      try {
        const response = await fetch('/jeecg-boot/ietm/dm-project/list', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        const data = await response.json()
        return { ok: response.ok, status: response.status, data }
      } catch (error) {
        return { error: error.message }
      }
    })

    console.log('\nAPI call result:', JSON.stringify(apiResult, null, 2))

    // If API call works, try to create project and DM
    if (apiResult.ok) {
      console.log('\n✅ Can make authenticated API calls!')

      // Create project
      const createProject = await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-project/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: 'TEST_PREVIEW_PROJECT_' + Date.now(),
            projectCode: 'TEST_PREVIEW'
          })
        })
        return { ok: response.ok, status: response.status, data: await response.json() }
      })

      console.log('Create project result:', JSON.stringify(createProject, null, 2))

      if (createProject.ok && createProject.data.success) {
        const projectId = createProject.data.result.id
        console.log(`✅ Project created: ${projectId}`)

        // Create DM
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
          <techName>PREVIEW_TEST</techName>
          <infoName>Test</infoName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
      <responsiblePartnerCompany><enterpriseName>Test</enterpriseName></responsiblePartnerCompany>
      <originator><enterpriseName>Test</enterpriseName></originator>
      <applicability><applic><displayText><simplePara>All</simplePara></displayText></applic></applicability>
      <brexDmRef><dmRef><dmRefIdent><dmCode modelIdentCode="S1000D" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="022" infoCodeVariant="A" itemLocationCode="D"/></dmRefIdent></dmRef></brexDmRef>
      <qualityAssurance><unverified/></qualityAssurance>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>Test</title>
        <para id="p1"><emphasis emphasisType="em01" style="display:none">Hidden text</emphasis></para>
        <para id="p2">Test dmRef: <dmRef><dmRefIdent><dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="01" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="001" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></para>
        <para id="p3"><figure id="fig1"><title>Test</title><graphic infoEntityIdent="ICN-001"/></figure></para>
        <para id="p4" style="display:none">Hidden para</para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

        const createDm = await page.evaluate(async (projectId, dmContent) => {
          const response = await fetch('/jeecg-boot/ietm/dm-content/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              techName: 'PREVIEW_TEST',
              infoName: 'Test DM for preview',
              dmType: 'descript',
              languageIsoCode: 'zh',
              countryIsoCode: 'CN',
              security: '01',
              schema: 'S1000D40',
              dmContent
            })
          })
          return { ok: response.ok, status: response.status, data: await response.json() }
        }, projectId, testXml)

        console.log('Create DM result:', JSON.stringify(createDm, null, 2))

        if (createDm.ok && createDm.data.success) {
          const dmId = createDm.data.result.id
          const dmc = createDm.data.result.dmc
          console.log(`\n🎉 SUCCESS! Test DM created:`)
          console.log(`   DM_ID: ${dmId}`)
          console.log(`   DMC: ${dmc}`)
          console.log(`   PROJECT_ID: ${projectId}`)
          console.log(`\n📝 Update dm-preview.spec.js with these values`)
        }
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await page.waitForTimeout(3000)
    await browser.close()
  }
}

createTestData().catch(console.error)
