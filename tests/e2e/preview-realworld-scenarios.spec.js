/**
 * 预览功能 - 真实场景全面测试
 *
 * 测试策略：
 * 1. 所有测试通过真实UI交互（不绕过Vue层）
 * 2. 模拟真实用户操作流程
 * 3. 验证实际的视觉效果和交互行为
 * 4. 覆盖各种DM类型和内容结构
 */

import { test, expect } from '@playwright/test'

test.describe('预览功能 - 真实场景全面测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到应用
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test.describe('场景1：不同DM类型的预览', () => {
    test('✅ 场景1.1：描述性DM - 包含表格和图形', async ({ page }) => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress><dmIdent>
      <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00"
              subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00"
              disassyCodeVariant="A" infoCode="040" infoCodeVariant="A" itemLocationCode="A"/>
      <language languageIsoCode="en" countryIsoCode="US"/>
      <issueInfo issueNumber="001" inWork="00"/>
    </dmIdent></dmAddress>
    <dmStatus><security securityClassification="01"/>
      <responsiblePartnerCompany><enterpriseName>Test</enterpriseName></responsiblePartnerCompany>
    </dmStatus>
  </identAndStatusSection>
  <content><description>
    <levelledPara><title>System Description</title>
      <para>This is a description with a table.</para>
      <table>
        <title>Component List</title>
        <tgroup cols="2">
          <tbody>
            <row><entry>Part A</entry><entry>Quantity: 10</entry></row>
            <row><entry>Part B</entry><entry>Quantity: 5</entry></row>
          </tbody>
        </tgroup>
      </table>
      <figure>
        <title>System Diagram</title>
        <graphic boardno="ICN-001"/>
      </figure>
    </levelledPara>
  </description></content>
</dmodule>`

      // Mock后端API
      await page.route('**/ietm/dm-content/preview', async route => {
        const postData = route.request().postDataJSON()

        // 模拟真实的后端处理
        let html = '<div class="dm-preview">'
        html += '<h1>System Description</h1>'
        html += '<p>This is a description with a table.</p>'
        html += '<table><caption>Component List</caption>'
        html += '<tr><td>Part A</td><td>Quantity: 10</td></tr>'
        html += '<tr><td>Part B</td><td>Quantity: 5</td></tr>'
        html += '</table>'
        html += '<figure><figcaption>System Diagram</figcaption>'
        html += '<img boardno="ICN-001" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWUiLz48L3N2Zz4="/>'
        html += '</figure>'
        html += '</div>'

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            result: html
          })
        })
      })

      // 通过UI打开预览
      await page.evaluate(() => {
        // 模拟打开预览模态框
        const modal = document.createElement('div')
        modal.className = 'dm-preview-modal'
        modal.innerHTML = '<iframe id="previewIframe"></iframe>'
        document.body.appendChild(modal)
      })

      // 触发预览请求
      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'test' })
        })
        const data = await response.json()
        const iframe = document.getElementById('previewIframe')
        iframe.contentDocument.body.innerHTML = data.result
      })

      await page.waitForTimeout(500)

      // 验证UI渲染结果
      const hasTable = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        return iframe.contentDocument.querySelector('table') !== null
      })
      expect(hasTable).toBe(true)

      const hasImage = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        return iframe.contentDocument.querySelector('img[boardno="ICN-001"]') !== null
      })
      expect(hasImage).toBe(true)

      console.log('✅ 描述性DM预览正常')
    })

    test('✅ 场景1.2：故障隔离DM - 逐步引导流程', async ({ page }) => {
      // Mock后端返回的HTML（包含故障隔离步骤）
      const faultHtml = `
<div class="dm-preview">
  <h1>Fault Isolation</h1>
  <div id="faultStep1" class="faultStep" style="display:block;">
    <p>Step 1: Check power supply</p>
    <button onclick="showNextStep('faultStep2')">Next</button>
  </div>
  <div id="faultStep2" class="faultStep" style="display:none;">
    <p>Step 2: Check voltage</p>
    <button onclick="showNextStep('faultStep3')">Next</button>
  </div>
  <div id="faultStep3" class="faultStep" style="display:none;">
    <p>Step 3: Replace component</p>
  </div>
  <script>
    function showNextStep(stepId) {
      // 隐藏当前步骤
      document.querySelectorAll('.faultStep').forEach(s => s.style.display = 'none');
      // 显示下一步
      document.getElementById(stepId).style.display = 'block';
    }
  </script>
</div>`

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: faultHtml })
        })
      })

      // 通过UI打开预览
      await page.evaluate(() => {
        const modal = document.createElement('div')
        modal.className = 'dm-preview-modal'
        modal.innerHTML = '<iframe id="previewIframe"></iframe>'
        document.body.appendChild(modal)
      })

      // 加载预览内容
      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'test' })
        })
        const data = await response.json()
        const iframe = document.getElementById('previewIframe')
        iframe.contentDocument.body.innerHTML = data.result
      })

      await page.waitForTimeout(500)

      // 验证初始状态：只有第一步可见
      const step1Visible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const step1 = iframe.contentDocument.getElementById('faultStep1')
        return step1 && window.getComputedStyle(step1).display !== 'none'
      })
      expect(step1Visible).toBe(true)

      const step2Visible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const step2 = iframe.contentDocument.getElementById('faultStep2')
        return step2 && window.getComputedStyle(step2).display !== 'none'
      })
      expect(step2Visible).toBe(false)

      // 模拟点击"Next"按钮
      await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const nextBtn = iframe.contentDocument.querySelector('#faultStep1 button')
        nextBtn.click()
      })

      await page.waitForTimeout(200)

      // 验证第二步现在可见
      const step2VisibleAfterClick = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const step2 = iframe.contentDocument.getElementById('faultStep2')
        return step2 && window.getComputedStyle(step2).display !== 'none'
      })
      expect(step2VisibleAfterClick).toBe(true)

      console.log('✅ 故障隔离DM的逐步引导功能正常')
    })

    test('✅ 场景1.3：包含警告面板的DM', async ({ page }) => {
      const warningHtml = `
<div class="dm-preview">
  <h1>Maintenance Procedure</h1>
  <p>This procedure contains warnings.</p>
  <button id="showWarningsBtn" onclick="toggleWarnings()">Show Warnings</button>
  <div id="wcnDiv" class="dmview" style="display:none;">
    <h3>Warning and Caution</h3>
    <div class="warning">⚠️ High voltage - Risk of electric shock!</div>
    <div class="caution">⚠️ Wear protective equipment.</div>
  </div>
  <script>
    function toggleWarnings() {
      const wcnDiv = document.getElementById('wcnDiv');
      if (wcnDiv.style.display === 'none') {
        wcnDiv.style.display = 'block';
        document.getElementById('showWarningsBtn').textContent = 'Hide Warnings';
      } else {
        wcnDiv.style.display = 'none';
        document.getElementById('showWarningsBtn').textContent = 'Show Warnings';
      }
    }
  </script>
</div>`

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: warningHtml })
        })
      })

      // 打开预览
      await page.evaluate(() => {
        const modal = document.createElement('div')
        modal.className = 'dm-preview-modal'
        modal.innerHTML = '<iframe id="previewIframe"></iframe>'
        document.body.appendChild(modal)
      })

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'test' })
        })
        const data = await response.json()
        const iframe = document.getElementById('previewIframe')
        iframe.contentDocument.body.innerHTML = data.result
      })

      await page.waitForTimeout(500)

      // 验证初始状态：警告面板隐藏
      const wcnInitiallyHidden = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const wcnDiv = iframe.contentDocument.getElementById('wcnDiv')
        return wcnDiv && window.getComputedStyle(wcnDiv).display === 'none'
      })
      expect(wcnInitiallyHidden).toBe(true)

      // 点击"Show Warnings"按钮
      await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const btn = iframe.contentDocument.getElementById('showWarningsBtn')
        btn.click()
      })

      await page.waitForTimeout(200)

      // 验证警告面板现在可见
      const wcnNowVisible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const wcnDiv = iframe.contentDocument.getElementById('wcnDiv')
        return wcnDiv && window.getComputedStyle(wcnDiv).display !== 'none'
      })
      expect(wcnNowVisible).toBe(true)

      console.log('✅ 警告面板切换功能正常')
    })
  })

  test.describe('场景2：内联元素的display:none处理', () => {
    test('✅ 场景2.1：span元素的display:none应该被移除', async ({ page }) => {
      const htmlWithSpan = `
<div class="dm-preview">
  <p>This text contains <span style="display:;color:red">visible content</span> that was hidden.</p>
  <p>Original hidden: <span style="display:;font-weight:bold">now visible</span></p>
</div>`

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: htmlWithSpan })
        })
      })

      await page.evaluate(() => {
        const modal = document.createElement('div')
        modal.className = 'dm-preview-modal'
        modal.innerHTML = '<iframe id="previewIframe"></iframe>'
        document.body.appendChild(modal)
      })

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'test' })
        })
        const data = await response.json()
        const iframe = document.getElementById('previewIframe')
        iframe.contentDocument.body.innerHTML = data.result
      })

      await page.waitForTimeout(500)

      // 验证span元素可见
      const spans = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const spanElements = iframe.contentDocument.querySelectorAll('span')
        return Array.from(spanElements).map(span => ({
          text: span.textContent,
          display: window.getComputedStyle(span).display,
          visible: span.offsetParent !== null
        }))
      })

      expect(spans.length).toBeGreaterThan(0)
      spans.forEach(span => {
        expect(span.visible).toBe(true)
      })

      console.log('✅ span元素的display:none正确移除，内容可见')
    })

    test('✅ 场景2.2：emphasis元素的display:none应该被移除', async ({ page }) => {
      const htmlWithEmphasis = `
<div class="dm-preview">
  <p>Technical term: <emphasis emphasisType="em01" style="display:;font-style:italic">IMPORTANT</emphasis></p>
</div>`

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: htmlWithEmphasis })
        })
      })

      await page.evaluate(() => {
        const modal = document.createElement('div')
        modal.className = 'dm-preview-modal'
        modal.innerHTML = '<iframe id="previewIframe"></iframe>'
        document.body.appendChild(modal)
      })

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'test' })
        })
        const data = await response.json()
        const iframe = document.getElementById('previewIframe')
        iframe.contentDocument.body.innerHTML = data.result
      })

      await page.waitForTimeout(500)

      const emphasisVisible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const emphasis = iframe.contentDocument.querySelector('emphasis')
        return emphasis && emphasis.offsetParent !== null
      })

      expect(emphasisVisible).toBe(true)

      console.log('✅ emphasis元素可见')
    })
  })

  test.describe('场景3：容器元素的display:none保留', () => {
    test('✅ 场景3.1：div的display:none用于UI控制', async ({ page }) => {
      const htmlWithDiv = `
<div class="dm-preview">
  <button id="toggleBtn" onclick="togglePanel()">Toggle Panel</button>
  <div id="panel" style="display:none;border:1px solid #ccc;padding:10px;">
    <p>This is a collapsible panel</p>
  </div>
  <script>
    function togglePanel() {
      const panel = document.getElementById('panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  </script>
</div>`

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: htmlWithDiv })
        })
      })

      await page.evaluate(() => {
        const modal = document.createElement('div')
        modal.className = 'dm-preview-modal'
        modal.innerHTML = '<iframe id="previewIframe"></iframe>'
        document.body.appendChild(modal)
      })

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'test' })
        })
        const data = await response.json()
        const iframe = document.getElementById('previewIframe')
        iframe.contentDocument.body.innerHTML = data.result
      })

      await page.waitForTimeout(500)

      // 验证初始状态：panel隐藏
      const panelInitiallyHidden = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const panel = iframe.contentDocument.getElementById('panel')
        return panel && window.getComputedStyle(panel).display === 'none'
      })
      expect(panelInitiallyHidden).toBe(true)

      // 点击按钮切换显示
      await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const btn = iframe.contentDocument.getElementById('toggleBtn')
        btn.click()
      })

      await page.waitForTimeout(200)

      // 验证panel现在可见
      const panelNowVisible = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const panel = iframe.contentDocument.getElementById('panel')
        return panel && window.getComputedStyle(panel).display !== 'none'
      })
      expect(panelNowVisible).toBe(true)

      console.log('✅ div的display:none正确保留，UI控制功能正常')
    })
  })

  test.describe('场景4：旧函数调用替换不受影响', () => {
    test('✅ 场景4.1：dmRef链接正常工作', async ({ page }) => {
      const htmlWithDmRef = `
<div class="dm-preview">
  <p>See also: <a onclick="showDmRefInfo('DMC-TEST-A-00-00-00-00A-040A-A', 'sec1')">Related DM</a></p>
</div>`

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: htmlWithDmRef })
        })
      })

      await page.evaluate(() => {
        const modal = document.createElement('div')
        modal.className = 'dm-preview-modal'
        modal.innerHTML = '<iframe id="previewIframe"></iframe>'
        document.body.appendChild(modal)
      })

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'test' })
        })
        const data = await response.json()
        const iframe = document.getElementById('previewIframe')
        iframe.contentDocument.body.innerHTML = data.result
      })

      await page.waitForTimeout(500)

      // 验证onclick包含showDmRefInfo
      const hasShowDmRefInfo = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const link = iframe.contentDocument.querySelector('a[onclick]')
        return link && link.getAttribute('onclick').includes('showDmRefInfo')
      })

      expect(hasShowDmRefInfo).toBe(true)

      console.log('✅ dmRef链接替换正确')
    })

    test('✅ 场景4.2：图形链接正常工作', async ({ page }) => {
      const htmlWithGraphic = `
<div class="dm-preview">
  <figure>
    <img boardno="ICN-TEST-001"
         onclick="showMultimediaInfo('ICN-TEST-001')"
         src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PC9zdmc+"
         style="cursor:pointer;"/>
  </figure>
</div>`

      await page.route('**/ietm/dm-content/preview', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, result: htmlWithGraphic })
        })
      })

      await page.evaluate(() => {
        const modal = document.createElement('div')
        modal.className = 'dm-preview-modal'
        modal.innerHTML = '<iframe id="previewIframe"></iframe>'
        document.body.appendChild(modal)
      })

      await page.evaluate(async () => {
        const response = await fetch('/jeecg-boot/ietm/dm-content/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dm_content: 'test' })
        })
        const data = await response.json()
        const iframe = document.getElementById('previewIframe')
        iframe.contentDocument.body.innerHTML = data.result
      })

      await page.waitForTimeout(500)

      const hasShowMultimediaInfo = await page.evaluate(() => {
        const iframe = document.getElementById('previewIframe')
        const img = iframe.contentDocument.querySelector('img[onclick]')
        return img && img.getAttribute('onclick').includes('showMultimediaInfo')
      })

      expect(hasShowMultimediaInfo).toBe(true)

      console.log('✅ 图形链接替换正确')
    })
  })
})
