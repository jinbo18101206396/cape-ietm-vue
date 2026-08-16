/**
 * Setup: Create test DM via API for preview testing
 * Data prep via API, validation via UI
 */
const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const API_BASE = 'http://localhost:9999/jeecg-boot'
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NTUwOTg0MjUsInVzZXJuYW1lIjoiYWRtaW4ifQ.G_ryx3_rLyhZG7c0OPkHdBYBykIC-pxpwEMaVLt_EJo'

const TEST_XML = `<?xml version="1.0" encoding="UTF-8"?>
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
          <techName>PREVIEW_LEGACY_TEST</techName>
          <infoName>Test DM for legacy function fixes</infoName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
      <responsiblePartnerCompany>
        <enterpriseName>Test</enterpriseName>
      </responsiblePartnerCompany>
      <originator>
        <enterpriseName>Test</enterpriseName>
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
          <emphasis emphasisType="em01" style="display:none">Hidden text with display:none - should become visible</emphasis>
        </para>
        <para id="para-002">
          Test dmRef: <dmRef>
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
          This entire para has display:none inline style
        </para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

test.describe('Setup: Create Test DM via API', () => {
  test('Create test DM and verify via UI', async ({ page, request }) => {
    // Step 1: Get available projects
    const projectsResp = await request.get(`${API_BASE}/ietm/dm-project/list`, {
      headers: { 'X-Access-Token': TOKEN }
    })

    if (!projectsResp.ok()) {
      const errorText = await projectsResp.text()
      console.error(`Projects API failed (${projectsResp.status()}): ${errorText}`)
    }

    const projectsData = await projectsResp.json()
    console.log(`Projects response:`, JSON.stringify(projectsData, null, 2))
    console.log(`Found ${projectsData.result?.records?.length || 0} projects`)

    if (!projectsData.result?.records?.length) {
      throw new Error('No projects available in system')
    }

    const projectId = projectsData.result.records[0].id
    console.log(`Using project: ${projectId}`)

    // Step 2: Get DM types
    const typesResp = await request.get(`${API_BASE}/ietm/dm-type/list`, {
      headers: { 'X-Access-Token': TOKEN }
    })
    expect(typesResp.ok()).toBeTruthy()
    const typesData = await typesResp.json()

    if (!typesData.result?.records?.length) {
      throw new Error('No DM types available')
    }

    const dmType = typesData.result.records[0].dm_type
    console.log(`Using DM type: ${dmType}`)

    // Step 3: Create DM via API
    const createResp = await request.post(`${API_BASE}/ietm/dm-content/add`, {
      headers: {
        'X-Access-Token': TOKEN,
        'Content-Type': 'application/json'
      },
      data: {
        projectId: projectId,
        techName: 'PREVIEW_LEGACY_TEST',
        infoName: 'Test DM for legacy function fixes',
        dmType: dmType,
        languageIsoCode: 'zh',
        countryIsoCode: 'CN',
        security: '01',
        schema: 'S1000D40',
        dmContent: TEST_XML
      }
    })

    expect(createResp.ok()).toBeTruthy()
    const createData = await createResp.json()
    expect(createData.success).toBeTruthy()

    const dmId = createData.result.id
    const dmc = createData.result.dmc
    console.log(`\n✅ Test DM created via API`)
    console.log(`   DM_ID: ${dmId}`)
    console.log(`   DMC: ${dmc}`)

    // Step 4: Verify DM is accessible and has test content
    const queryResp = await request.get(`${API_BASE}/ietm/dm-content/queryById?id=${dmId}`, {
      headers: { 'X-Access-Token': TOKEN }
    })
    expect(queryResp.ok()).toBeTruthy()
    const dmData = await queryResp.json()
    expect(dmData.result.dm_content).toContain('display:none')
    expect(dmData.result.dm_content).toContain('<dmRef>')
    expect(dmData.result.dm_content).toContain('<graphic')
    console.log(`✅ DM verified in database with all test elements`)

    // Step 5: Verify DM is accessible via UI
    await page.goto(`${BASE}/ietm/dm-content-editor/${dmId}?mode=edit&dmc=${encodeURIComponent(dmc)}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Wait for CodeMirror to load
    const editor = page.locator('.CodeMirror')
    await expect(editor).toBeVisible({ timeout: 15000 })
    console.log(`✅ DM editor loaded successfully in UI`)

    // Verify XML content in editor
    const editorContent = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(editorContent).toContain('PREVIEW_LEGACY_TEST')
    expect(editorContent).toContain('display:none')
    console.log(`✅ DM content verified in editor`)

    console.log(`\n📝 Update dm-preview.spec.js with:`)
    console.log(`   const DM_ID = '${dmId}'`)
    console.log(`   const DMC = '${dmc}'`)
    console.log(`   const PROJECT_ID = '${projectId}'`)
  })
})
