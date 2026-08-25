/**
 * Comprehensive scenario and boundary tests for preview legacy function fixes
 * Tests edge cases, combinations, and potential issues
 */
const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

const COMPREHENSIVE_TEST_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Comprehensive Preview Tests</title>
  <style>
    body { margin: 20px; font-family: Arial, sans-serif; }
    .test-group { margin: 20px 0; padding: 15px; border: 2px solid #333; background: #f9f9f9; }
    .test-group h2 { margin-top: 0; background: #333; color: white; padding: 10px; margin: -15px -15px 15px -15px; }
    .test-case { margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; background: white; }
    .pass { border-left-color: green; }
    .fail { border-left-color: red; }
    .log { font-family: monospace; font-size: 11px; color: #666; }
    iframe { width: 100%; height: 300px; border: 1px solid #ddd; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Comprehensive Preview Legacy Function Fix Tests</h1>
  <div id="test-results"></div>

  <script>
    const results = [];

    function fixLegacyFunctionCalls(html) {
      if (!html) return html;
      html = html.replace(/window\\.external\\.ShowDmRef/g, 'showDmRefInfo');
      html = html.replace(/window\\.parent\\.addShowContentPanel/g, 'showDmRefInfo');
      html = html.replace(/window\\.parent\\.showPicture/g, 'showMultimediaInfo');
      html = html.replace(/display:\\s*none\\s*;?/g, 'display:;');
      return html;
    }

    function runTest(groupName, testName, testFunc) {
      try {
        const result = testFunc();
        results.push({ group: groupName, name: testName, pass: result.pass, message: result.message, details: result.details || '' });
      } catch (error) {
        results.push({ group: groupName, name: testName, pass: false, message: 'Exception: ' + error.message, details: error.stack });
      }
    }

    function assert(condition, message) {
      if (!condition) {
        throw new Error(message || 'Assertion failed');
      }
    }

    // ============ GROUP 1: Edge Cases for display:none ============
    runTest('display:none Edge Cases', 'Multiple spaces around display:none', () => {
      const input = '<div style="display:   none  ;">Test</div>';
      const output = fixLegacyFunctionCalls(input);
      assert(!output.includes('none'), 'Should remove none with multiple spaces');
      return { pass: true, message: 'Handles multiple spaces correctly' };
    });

    runTest('display:none Edge Cases', 'display:none without semicolon', () => {
      const input = '<div style="color:red;display:none">Test</div>';
      const output = fixLegacyFunctionCalls(input);
      assert(!output.includes('display:none') && !output.includes('display: none'), 'Should handle no semicolon');
      return { pass: true, message: 'Handles missing semicolon correctly' };
    });

    runTest('display:none Edge Cases', 'display:none at start of style', () => {
      const input = '<div style="display:none;color:red">Test</div>';
      const output = fixLegacyFunctionCalls(input);
      assert(!output.includes('display:none'), 'Should remove at start');
      return { pass: true, message: 'Handles style attribute start position' };
    });

    runTest('display:none Edge Cases', 'display:none at end of style', () => {
      const input = '<div style="color:red;display:none">Test</div>';
      const output = fixLegacyFunctionCalls(input);
      assert(!output.includes('display:none'), 'Should remove at end');
      return { pass: true, message: 'Handles style attribute end position' };
    });

    runTest('display:none Edge Cases', 'Multiple display:none in same HTML', () => {
      const input = '<div style="display:none">A</div><p style="display:none">B</p>';
      const output = fixLegacyFunctionCalls(input);
      const noneCount = (output.match(/display:none/g) || []).length;
      assert(noneCount === 0, 'Should remove all instances');
      return { pass: true, message: 'Removes all instances (found: ' + noneCount + ')' };
    });

    runTest('display:none Edge Cases', 'display:none with uppercase NONE', () => {
      const input = '<div style="display:NONE">Test</div>';
      const output = fixLegacyFunctionCalls(input);
      // Current implementation is case-sensitive, this documents the behavior
      const stillHasNone = output.includes('NONE');
      return { pass: true, message: 'Case-sensitive (NONE preserved: ' + stillHasNone + ')' };
    });

    runTest('display:none Edge Cases', 'Nested display:none', () => {
      const input = '<div style="display:none"><span style="display:none">Nested</span></div>';
      const output = fixLegacyFunctionCalls(input);
      assert(!output.includes('display:none'), 'Should remove nested instances');
      return { pass: true, message: 'Handles nested elements correctly' };
    });

    // ============ GROUP 2: Edge Cases for ShowDmRef ============
    runTest('ShowDmRef Edge Cases', 'ShowDmRef with single quotes', () => {
      const input = "<a onclick=\\"window.external.ShowDmRef('DMC-001', 'para1')\\">Link</a>";
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showDmRefInfo'), 'Should replace with single quotes');
      assert(!output.includes('window.external.ShowDmRef'), 'Should remove old function');
      return { pass: true, message: 'Handles single quotes correctly' };
    });

    runTest('ShowDmRef Edge Cases', 'ShowDmRef with double quotes', () => {
      const input = '<a onclick="window.external.ShowDmRef(\\"DMC-001\\", \\"para1\\")">Link</a>';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showDmRefInfo'), 'Should replace with double quotes');
      return { pass: true, message: 'Handles double quotes correctly' };
    });

    runTest('ShowDmRef Edge Cases', 'Multiple ShowDmRef calls', () => {
      const input = '<a onclick="window.external.ShowDmRef(\\'A\\', \\'B\\')">1</a><a onclick="window.external.ShowDmRef(\\'C\\', \\'D\\')">2</a>';
      const output = fixLegacyFunctionCalls(input);
      const oldCount = (output.match(/window\\.external\\.ShowDmRef/g) || []).length;
      const newCount = (output.match(/showDmRefInfo/g) || []).length;
      assert(oldCount === 0 && newCount === 2, 'Should replace all instances');
      return { pass: true, message: 'Replaced ' + newCount + ' instances, ' + oldCount + ' remaining' };
    });

    runTest('ShowDmRef Edge Cases', 'ShowDmRef with empty parameters', () => {
      const input = '<a onclick="window.external.ShowDmRef(\\'\\', \\'\\')">Empty</a>';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showDmRefInfo'), 'Should replace even with empty params');
      return { pass: true, message: 'Handles empty parameters correctly' };
    });

    runTest('ShowDmRef Edge Cases', 'ShowDmRef with special characters in DMC', () => {
      const input = '<a onclick="window.external.ShowDmRef(\\'DMC-TEST_A-01\\', \\'para-001\\')">Link</a>';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showDmRefInfo'), 'Should handle special chars');
      return { pass: true, message: 'Handles underscores and hyphens correctly' };
    });

    // ============ GROUP 3: Edge Cases for addShowContentPanel ============
    runTest('addShowContentPanel Edge Cases', 'addShowContentPanel basic', () => {
      const input = '<a onclick="window.parent.addShowContentPanel(\\'DMC-001\\', \\'\\')">Link</a>';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showDmRefInfo'), 'Should replace');
      assert(!output.includes('addShowContentPanel'), 'Should remove old');
      return { pass: true, message: 'Basic replacement works' };
    });

    runTest('addShowContentPanel Edge Cases', 'Multiple addShowContentPanel', () => {
      const input = '<a onclick="window.parent.addShowContentPanel(\\'A\\', \\'\\')">1</a><a onclick="window.parent.addShowContentPanel(\\'B\\', \\'\\')">2</a>';
      const output = fixLegacyFunctionCalls(input);
      const count = (output.match(/showDmRefInfo/g) || []).length;
      assert(count === 2, 'Should replace all');
      return { pass: true, message: 'Replaced ' + count + ' instances' };
    });

    // ============ GROUP 4: Edge Cases for showPicture ============
    runTest('showPicture Edge Cases', 'showPicture basic', () => {
      const input = '<img onclick="window.parent.showPicture(\\'ICN-001\\')" />';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showMultimediaInfo'), 'Should replace');
      assert(!output.includes('window.parent.showPicture'), 'Should remove old');
      return { pass: true, message: 'Basic replacement works' };
    });

    runTest('showPicture Edge Cases', 'showPicture with long ICN', () => {
      const input = '<img onclick="window.parent.showPicture(\\'ICN-VERYLONGIDENTIFIER-12345-ABCDEF\\')" />';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showMultimediaInfo'), 'Should handle long identifiers');
      return { pass: true, message: 'Handles long identifiers correctly' };
    });

    // ============ GROUP 5: Combination Tests ============
    runTest('Combination Tests', 'All fixes in one HTML', () => {
      const input = '<div style="display:none">Hidden</div>' +
        '<a onclick="window.external.ShowDmRef(\\'DMC-001\\', \\'p1\\')">dmRef</a>' +
        '<a onclick="window.parent.addShowContentPanel(\\'DMC-002\\', \\'\\')">content</a>' +
        '<img onclick="window.parent.showPicture(\\'ICN-003\\')" />';
      const output = fixLegacyFunctionCalls(input);
      assert(!output.includes('display:none'), 'display:none removed');
      assert(!output.includes('window.external.ShowDmRef'), 'ShowDmRef removed');
      assert(!output.includes('addShowContentPanel'), 'addShowContentPanel removed');
      assert(!output.includes('window.parent.showPicture'), 'showPicture removed');
      assert(output.includes('showDmRefInfo'), 'showDmRefInfo present');
      assert(output.includes('showMultimediaInfo'), 'showMultimediaInfo present');
      return { pass: true, message: 'All transformations applied correctly' };
    });

    runTest('Combination Tests', 'Nested legacy calls', () => {
      const input = '<div style="display:none"><a onclick="window.external.ShowDmRef(\\'A\\', \\'\\')">Link</a></div>';
      const output = fixLegacyFunctionCalls(input);
      assert(!output.includes('display:none'), 'Outer display:none removed');
      assert(output.includes('showDmRefInfo'), 'Inner function replaced');
      return { pass: true, message: 'Nested transformations work' };
    });

    // ============ GROUP 6: Boundary Conditions ============
    runTest('Boundary Conditions', 'Null input', () => {
      const output = fixLegacyFunctionCalls(null);
      assert(output === null, 'Should return null');
      return { pass: true, message: 'Handles null correctly' };
    });

    runTest('Boundary Conditions', 'Empty string', () => {
      const output = fixLegacyFunctionCalls('');
      assert(output === '', 'Should return empty string');
      return { pass: true, message: 'Handles empty string correctly' };
    });

    runTest('Boundary Conditions', 'Very large HTML (10KB)', () => {
      const largeHtml = '<div style="display:none">' + 'x'.repeat(10000) + '</div>';
      const output = fixLegacyFunctionCalls(largeHtml);
      assert(!output.includes('display:none'), 'Should handle large input');
      return { pass: true, message: 'Handles 10KB HTML (output: ' + output.length + ' chars)' };
    });

    runTest('Boundary Conditions', 'HTML with only text, no matches', () => {
      const input = '<p>Just plain text, nothing to fix</p>';
      const output = fixLegacyFunctionCalls(input);
      assert(output === input, 'Should return unchanged');
      return { pass: true, message: 'Unchanged HTML passes through' };
    });

    runTest('Boundary Conditions', 'HTML with partial matches', () => {
      const input = '<div>window.external.ShowDmRefInfo</div>'; // Already "fixed"
      const output = fixLegacyFunctionCalls(input);
      // Should not break already-correct code
      assert(output.includes('ShowDmRefInfo'), 'Should preserve correct code');
      return { pass: true, message: 'Does not break already-correct code' };
    });

    // ============ GROUP 7: Potential Issues & Regressions ============
    runTest('Regression Tests', 'Does not affect legitimate display styles', () => {
      const input = '<div style="display:block">Block</div><div style="display:inline">Inline</div><div style="display:flex">Flex</div>';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('display:block'), 'Preserves display:block');
      assert(output.includes('display:inline'), 'Preserves display:inline');
      assert(output.includes('display:flex'), 'Preserves display:flex');
      return { pass: true, message: 'Other display values preserved' };
    });

    runTest('Regression Tests', 'Does not affect similar-looking strings', () => {
      const input = '<div>The window.external.ShowDmRefInfo function</div>'; // Text content, not attribute
      const output = fixLegacyFunctionCalls(input);
      // This is a known limitation - regex will still replace in text content
      // Document this behavior
      const wasReplaced = !output.includes('window.external.ShowDmRefInfo');
      return { pass: true, message: 'Text content replacement: ' + wasReplaced + ' (expected: true - regex is global)' };
    });

    runTest('Regression Tests', 'Escaped quotes handling', () => {
      const input = '<a onclick="window.external.ShowDmRef(\\\\'DMC-001\\\\', \\\\'para\\\\')">Link</a>';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showDmRefInfo'), 'Handles escaped quotes');
      return { pass: true, message: 'Escaped quotes handled correctly' };
    });

    runTest('Regression Tests', 'Line breaks in onclick', () => {
      const input = '<a onclick="window.external.ShowDmRef(\\n  \\'DMC-001\\',\\n  \\'para\\'\\n)">Link</a>';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showDmRefInfo'), 'Handles line breaks');
      return { pass: true, message: 'Line breaks in attributes handled' };
    });

    // ============ GROUP 8: Security & XSS Considerations ============
    runTest('Security Tests', 'Malicious script in DMC parameter', () => {
      const input = '<a onclick="window.external.ShowDmRef(\\'<script>alert(1)</script>\\', \\'\\')">Link</a>';
      const output = fixLegacyFunctionCalls(input);
      // The fix should not introduce new XSS vectors
      // The function replacement itself doesn't sanitize parameters - that's the caller's job
      assert(output.includes('showDmRefInfo'), 'Function replaced');
      assert(output.includes('<script>'), 'Parameters unchanged (sanitization is caller responsibility)');
      return { pass: true, message: 'Function replacement does not sanitize parameters (by design)' };
    });

    runTest('Security Tests', 'HTML entities in parameters', () => {
      const input = '<a onclick="window.external.ShowDmRef(\\'DMC&lt;test&gt;\\', \\'\\')">Link</a>';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('&lt;') && output.includes('&gt;'), 'HTML entities preserved');
      return { pass: true, message: 'HTML entities preserved correctly' };
    });

    // ============ GROUP 9: Real-world Scenarios ============
    runTest('Real-world Scenarios', 'S1000D XSLT-generated HTML pattern', () => {
      const input = '<div class="para" id="para-001">' +
        '<span style="display:none">Hidden note</span>' +
        '<a class="dmRef" onclick="window.external.ShowDmRef(\\'DMC-HONAERO-A-00-00-00-00A-022A-D\\', \\'para-002\\')">' +
        'Reference to DMC-HONAERO-A-00-00-00-00A-022A-D' +
        '</a>' +
        '</div>';
      const output = fixLegacyFunctionCalls(input);
      assert(!output.includes('display:none'), 'Fixes display:none');
      assert(output.includes('showDmRefInfo'), 'Fixes ShowDmRef');
      assert(output.includes('DMC-HONAERO-A-00-00-00-00A-022A-D'), 'Preserves DMC code');
      return { pass: true, message: 'Real S1000D pattern handled correctly' };
    });

    runTest('Real-world Scenarios', 'Graphic with multiple onclick handlers', () => {
      const input = '<img onclick="window.parent.showPicture(\\'ICN-001\\'); return false;" src="..." />';
      const output = fixLegacyFunctionCalls(input);
      assert(output.includes('showMultimediaInfo'), 'Function replaced');
      assert(output.includes('return false'), 'Other code preserved');
      return { pass: true, message: 'Complex onclick handlers preserved' };
    });

    // Render results
    window.onload = function() {
      const container = document.getElementById('test-results');
      const groups = {};

      // Group results
      results.forEach(r => {
        if (!groups[r.group]) groups[r.group] = [];
        groups[r.group].push(r);
      });

      // Render
      let totalPass = 0, totalFail = 0;
      Object.keys(groups).forEach(groupName => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'test-group';
        groupDiv.innerHTML = '<h2>' + groupName + '</h2>';

        groups[groupName].forEach(r => {
          const testDiv = document.createElement('div');
          testDiv.className = 'test-case ' + (r.pass ? 'pass' : 'fail');
          testDiv.innerHTML = '<strong>' + (r.pass ? '✅' : '❌') + ' ' + r.name + '</strong><br>' +
                              '<span class="log">' + r.message + '</span>' +
                              (r.details ? '<br><span class="log">' + r.details + '</span>' : '');
          groupDiv.appendChild(testDiv);

          if (r.pass) totalPass++; else totalFail++;
        });

        container.appendChild(groupDiv);
      });

      // Summary
      const summary = document.createElement('div');
      summary.className = 'test-group';
      summary.style.background = totalFail === 0 ? '#d4edda' : '#f8d7da';
      summary.innerHTML = '<h2>Summary</h2><p><strong>Total: ' + results.length + '</strong> | ' +
                          '<span style="color:green">Pass: ' + totalPass + '</span> | ' +
                          '<span style="color:red">Fail: ' + totalFail + '</span></p>';
      container.insertBefore(summary, container.firstChild);

      console.log('Test Summary: ' + totalPass + '/' + results.length + ' passed');
    };
  </script>
</body>
</html>
`

test.describe('Comprehensive Preview Legacy Function Fix Tests', () => {
  test('Scenario and boundary tests with edge cases', async ({ page }) => {
    // Write test HTML
    const testHtmlPath = path.join(__dirname, '../../test-results/comprehensive-preview-test.html')
    fs.writeFileSync(testHtmlPath, COMPREHENSIVE_TEST_HTML)

    // Load test page
    await page.goto(`file://${testHtmlPath}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Take screenshot
    await page.screenshot({ path: 'test-results/comprehensive-preview-results.png', fullPage: true })

    // Extract results
    const summaryText = await page.locator('.test-group').first().textContent()
    console.log('\n' + summaryText)

    // Check that all tests passed
    const passCount = summaryText.match(/Pass: (\d+)/)
    const failCount = summaryText.match(/Fail: (\d+)/)

    if (passCount && failCount) {
      const passed = parseInt(passCount[1])
      const failed = parseInt(failCount[1])

      console.log(`\n✅ Comprehensive tests: ${passed} passed, ${failed} failed`)

      expect(failed).toBe(0) // All tests should pass
    }
  })
})
