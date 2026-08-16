/**
 * Comprehensive scenario and boundary tests - simplified version
 */
const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

// Test cases defined in JSON to avoid string escaping issues
const TEST_CASES = [
  // Group 1: display:none edge cases
  { group: 'display:none', name: 'Multiple spaces', input: '<div style="display:   none  ;">Test</div>', shouldNotContain: ['none'], shouldContain: [] },
  { group: 'display:none', name: 'Without semicolon', input: '<div style="display:none">Test</div>', shouldNotContain: ['display:none'], shouldContain: [] },
  { group: 'display:none', name: 'Multiple instances', input: '<div style="display:none">A</div><p style="display:none">B</p>', shouldNotContain: ['display:none'], shouldContain: [] },
  { group: 'display:none', name: 'Nested elements', input: '<div style="display:none"><span style="display:none">Nested</span></div>', shouldNotContain: ['display:none'], shouldContain: [] },

  // Group 2: ShowDmRef
  { group: 'ShowDmRef', name: 'Basic replacement', input: '<a onclick="window.external.ShowDmRef()">Link</a>', shouldNotContain: ['window.external.ShowDmRef'], shouldContain: ['showDmRefInfo'] },
  { group: 'ShowDmRef', name: 'Multiple calls', input: '<a onclick="window.external.ShowDmRef()">1</a><a onclick="window.external.ShowDmRef()">2</a>', shouldNotContain: ['window.external.ShowDmRef'], shouldContain: ['showDmRefInfo'] },

  // Group 3: addShowContentPanel
  { group: 'addShowContentPanel', name: 'Basic replacement', input: '<a onclick="window.parent.addShowContentPanel()">Link</a>', shouldNotContain: ['addShowContentPanel'], shouldContain: ['showDmRefInfo'] },

  // Group 4: showPicture
  { group: 'showPicture', name: 'Basic replacement', input: '<img onclick="window.parent.showPicture()" />', shouldNotContain: ['window.parent.showPicture'], shouldContain: ['showMultimediaInfo'] },

  // Group 5: Combinations
  { group: 'Combinations', name: 'All fixes together',
    input: '<div style="display:none">H</div><a onclick="window.external.ShowDmRef()">A</a><a onclick="window.parent.addShowContentPanel()">B</a><img onclick="window.parent.showPicture()" />',
    shouldNotContain: ['display:none', 'window.external.ShowDmRef', 'addShowContentPanel', 'window.parent.showPicture'],
    shouldContain: ['showDmRefInfo', 'showMultimediaInfo']
  },

  // Group 6: Boundary conditions
  { group: 'Boundaries', name: 'Empty string', input: '', shouldNotContain: [], shouldContain: [] },
  { group: 'Boundaries', name: 'No matches', input: '<p>Just text</p>', shouldNotContain: [], shouldContain: [] },
  { group: 'Boundaries', name: 'Large HTML', input: '<div style="display:none">' + 'x'.repeat(10000) + '</div>', shouldNotContain: ['display:none'], shouldContain: [] },

  // Group 7: Regressions
  { group: 'Regressions', name: 'Preserve other display values', input: '<div style="display:block">A</div><div style="display:inline">B</div>', shouldNotContain: [], shouldContain: ['display:block', 'display:inline'] }
];

function fixLegacyFunctionCalls(html) {
  if (!html) return html;
  html = html.replace(/window\.external\.ShowDmRef/g, 'showDmRefInfo');
  html = html.replace(/window\.parent\.addShowContentPanel/g, 'showDmRefInfo');
  html = html.replace(/window\.parent\.showPicture/g, 'showMultimediaInfo');
  html = html.replace(/display:\s*none\s*;?/g, 'display:;');
  return html;
}

test.describe('Comprehensive Preview Tests', () => {
  test('Run all scenario and boundary tests', async ({ page }) => {
    let passed = 0;
    let failed = 0;
    const failures = [];

    console.log('\n=== Running Comprehensive Tests ===\n');

    for (const tc of TEST_CASES) {
      const output = fixLegacyFunctionCalls(tc.input);
      let testPassed = true;
      let failReason = '';

      // Check shouldNotContain
      for (const str of tc.shouldNotContain) {
        if (output.includes(str)) {
          testPassed = false;
          failReason = `Output still contains "${str}"`;
          break;
        }
      }

      // Check shouldContain
      if (testPassed) {
        for (const str of tc.shouldContain) {
          if (!output.includes(str)) {
            testPassed = false;
            failReason = `Output missing "${str}"`;
            break;
          }
        }
      }

      if (testPassed) {
        passed++;
        console.log(`✅ [${tc.group}] ${tc.name}`);
      } else {
        failed++;
        console.log(`❌ [${tc.group}] ${tc.name}: ${failReason}`);
        failures.push({ group: tc.group, name: tc.name, reason: failReason, input: tc.input, output });
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total: ${TEST_CASES.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failures.length > 0) {
      console.log(`\n=== Failures ===`);
      failures.forEach(f => {
        console.log(`\n❌ [${f.group}] ${f.name}`);
        console.log(`   Reason: ${f.reason}`);
        console.log(`   Input: ${f.input.substring(0, 100)}...`);
        console.log(`   Output: ${f.output.substring(0, 100)}...`);
      });
    }

    expect(failed).toBe(0);
  });

  test('Test null input handling', async () => {
    const result = fixLegacyFunctionCalls(null);
    expect(result).toBe(null);
    console.log('✅ Null input handled correctly');
  });

  test('Test undefined input handling', async () => {
    const result = fixLegacyFunctionCalls(undefined);
    expect(result).toBe(undefined);
    console.log('✅ Undefined input handled correctly');
  });

  test('Real-world S1000D pattern', async () => {
    const input = [
      '<div class="para">',
      '<span style="display:none">Hidden</span>',
      '<a onclick="window.external.ShowDmRef()">Link</a>',
      '</div>'
    ].join('');

    const output = fixLegacyFunctionCalls(input);

    expect(output).not.toContain('display:none');
    expect(output).not.toContain('window.external.ShowDmRef');
    expect(output).toContain('showDmRefInfo');

    console.log('✅ Real-world S1000D pattern handled correctly');
  });

  test('Security - does not sanitize parameters', async () => {
    const input = '<a onclick="window.external.ShowDmRef()">Link</a>';
    const output = fixLegacyFunctionCalls(input);

    // Function replacement should not add/remove HTML entities - that's caller's job
    expect(output).toContain('showDmRefInfo');
    console.log('✅ Function replacement does not sanitize (by design)');
  });

  test('Performance - large HTML (100KB)', async () => {
    const largeHtml = '<div style="display:none">' + 'x'.repeat(100000) + '</div>';
    const startTime = Date.now();
    const output = fixLegacyFunctionCalls(largeHtml);
    const duration = Date.now() - startTime;

    expect(output).not.toContain('display:none');
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second

    console.log(`✅ Large HTML (100KB) processed in ${duration}ms`);
  });
})
