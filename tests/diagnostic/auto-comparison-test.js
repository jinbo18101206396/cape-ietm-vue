/**
 * 自动化对比测试脚本
 *
 * 使用 Puppeteer 控制浏览器，自动执行两种场景并对比结果
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runComprehensiveTest() {
  console.log('启动自动化对比测试...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    // 1. 登录
    console.log('1. 登录系统...');
    await page.goto('http://localhost:3000/user/login');
    await page.type('input[placeholder="账号"]', 'admin');
    await page.type('input[placeholder="密码"]', 'admin');
    await page.click('button:has-text("登录")');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('   ✓ 登录成功\n');

    // 2. 进入数据模块列表
    console.log('2. 进入数据模块列表...');
    await page.goto('http://localhost:3000/ietm/IetmDataModuleManagementIndex');
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 });
    console.log('   ✓ 列表加载完成\n');

    // 加载验证脚本
    const verificationScript = fs.readFileSync(
      path.join(__dirname, 'comprehensive-verification.js'),
      'utf-8'
    );

    // ========================================
    // 场景A：直接进入源码视图
    // ========================================
    console.log('========================================');
    console.log('场景A：直接进入源码视图');
    console.log('========================================\n');

    console.log('3. 点击第一个 DM 的"浏览或编辑DM内容"...');
    await page.click('.ant-table-tbody tr:first-child button:has-text("浏览或编辑DM内容")');

    // 等待编辑器加载
    await page.waitForSelector('.CodeMirror', { timeout: 15000 });
    await page.waitForTimeout(1000); // 等待完全渲染
    console.log('   ✓ 编辑器已加载\n');

    console.log('4. 运行验证脚本（直接进入）...');
    const directResult = await page.evaluate((script) => {
      eval(script);
      // 自动保存为 'direct'
      window.__cmVerification = window.__cmVerification || {};
      window.__cmVerification.direct = window.__cmVerification.direct || (() => {
        const cm = document.querySelector('.CodeMirror').CodeMirror;
        const gutters = document.querySelector('.CodeMirror-gutters');
        const foldGutter = document.querySelector('.CodeMirror-foldgutter');
        const scroll = document.querySelector('.CodeMirror-scroll');
        const firstLine = document.querySelector('.CodeMirror-line');

        return {
          layout: {
            guttersWidth: gutters.offsetWidth,
            foldGutterLeft: foldGutter.offsetLeft,
            scrollHeight: scroll.offsetHeight
          },
          textMetrics: {
            lineHeight: firstLine.offsetHeight,
            charWidth: cm.defaultCharWidth()
          },
          internalState: {
            cachedCharWidth: cm.display.cachedCharWidth,
            cachedTextHeight: cm.display.cachedTextHeight
          }
        };
      })();
      return window.__cmVerification.direct;
    }, verificationScript);

    console.log('   直接进入结果:');
    console.log('   - Gutters 宽度:', directResult.layout.guttersWidth);
    console.log('   - 折叠列位置:', directResult.layout.foldGutterLeft);
    console.log('   - Scroll 高度:', directResult.layout.scrollHeight);
    console.log('   - 行高:', directResult.textMetrics.lineHeight);
    console.log('   - 字符宽度:', directResult.textMetrics.charWidth);
    console.log('   ✓ 验证完成\n');

    // ========================================
    // 场景B：从设计视图切换到源码视图
    // ========================================
    console.log('========================================');
    console.log('场景B：从设计视图切换到源码视图');
    console.log('========================================\n');

    console.log('5. 双击 para 进入设计视图...');
    await page.waitForSelector('.ztree li:has-text("para")', { timeout: 5000 });
    const paraNode = await page.$('.ztree li span.node_name:has-text("para")');
    await paraNode.click({ clickCount: 2 });

    // 等待设计视图加载
    await page.waitForSelector('.para-designer', { timeout: 5000 });
    await page.waitForTimeout(500);
    console.log('   ✓ 已进入设计视图\n');

    console.log('6. 点击"源码视图"标签切换回源码视图...');
    await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")');

    // 等待切换完成和 rebuildEditor 执行
    await page.waitForTimeout(1000);
    console.log('   ✓ 已切换回源码视图\n');

    console.log('7. 运行验证脚本（切换进入）...');
    const switchedResult = await page.evaluate((script) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror;
      const gutters = document.querySelector('.CodeMirror-gutters');
      const foldGutter = document.querySelector('.CodeMirror-foldgutter');
      const scroll = document.querySelector('.CodeMirror-scroll');
      const firstLine = document.querySelector('.CodeMirror-line');

      window.__cmVerification = window.__cmVerification || {};
      window.__cmVerification.switched = {
        layout: {
          guttersWidth: gutters.offsetWidth,
          foldGutterLeft: foldGutter.offsetLeft,
          scrollHeight: scroll.offsetHeight
        },
        textMetrics: {
          lineHeight: firstLine.offsetHeight,
          charWidth: cm.defaultCharWidth()
        },
        internalState: {
          cachedCharWidth: cm.display.cachedCharWidth,
          cachedTextHeight: cm.display.cachedTextHeight
        }
      };
      return window.__cmVerification.switched;
    }, verificationScript);

    console.log('   切换进入结果:');
    console.log('   - Gutters 宽度:', switchedResult.layout.guttersWidth);
    console.log('   - 折叠列位置:', switchedResult.layout.foldGutterLeft);
    console.log('   - Scroll 高度:', switchedResult.layout.scrollHeight);
    console.log('   - 行高:', switchedResult.textMetrics.lineHeight);
    console.log('   - 字符宽度:', switchedResult.textMetrics.charWidth);
    console.log('   ✓ 验证完成\n');

    // ========================================
    // 对比分析
    // ========================================
    console.log('========================================');
    console.log('📊 对比分析');
    console.log('========================================\n');

    const tolerance = {
      width: 5,
      height: 50,
      position: 2,
      charWidth: 1,
      lineHeight: 2
    };

    const comparisons = [
      {
        name: 'Gutters 宽度',
        direct: directResult.layout.guttersWidth,
        switched: switchedResult.layout.guttersWidth,
        tolerance: tolerance.width
      },
      {
        name: '折叠列位置',
        direct: directResult.layout.foldGutterLeft,
        switched: switchedResult.layout.foldGutterLeft,
        tolerance: tolerance.position
      },
      {
        name: 'Scroll 高度',
        direct: directResult.layout.scrollHeight,
        switched: switchedResult.layout.scrollHeight,
        tolerance: tolerance.height
      },
      {
        name: '行高',
        direct: directResult.textMetrics.lineHeight,
        switched: switchedResult.textMetrics.lineHeight,
        tolerance: tolerance.lineHeight
      },
      {
        name: '字符宽度',
        direct: directResult.textMetrics.charWidth,
        switched: switchedResult.textMetrics.charWidth,
        tolerance: tolerance.charWidth
      },
      {
        name: '缓存字符宽度',
        direct: directResult.internalState.cachedCharWidth,
        switched: switchedResult.internalState.cachedCharWidth,
        tolerance: tolerance.charWidth
      },
      {
        name: '缓存文本高度',
        direct: directResult.internalState.cachedTextHeight,
        switched: switchedResult.internalState.cachedTextHeight,
        tolerance: tolerance.lineHeight
      }
    ];

    let allPassed = true;
    const issues = [];

    comparisons.forEach(comp => {
      const diff = Math.abs(comp.direct - comp.switched);
      const pass = diff <= comp.tolerance;
      const icon = pass ? '✅' : '❌';

      console.log(`${icon} ${comp.name}:`);
      console.log(`   直接进入: ${comp.direct}`);
      console.log(`   切换进入: ${comp.switched}`);
      console.log(`   差异: ${diff.toFixed(2)} (容差: ${comp.tolerance})`);
      console.log('');

      if (!pass) {
        allPassed = false;
        issues.push({
          name: comp.name,
          direct: comp.direct,
          switched: comp.switched,
          diff: diff,
          tolerance: comp.tolerance
        });
      }
    });

    // ========================================
    // 总结
    // ========================================
    console.log('========================================');
    console.log('📋 测试总结');
    console.log('========================================\n');

    if (allPassed) {
      console.log('🎉 完美！两种进入方式完全一致！');
      console.log('所有测量指标都在容差范围内。\n');
    } else {
      console.log('❌ 发现', issues.length, '项不一致！\n');
      console.log('问题列表:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.name}`);
        console.log(`   差异: ${issue.diff.toFixed(2)} (超出容差 ${issue.tolerance})`);
        console.log(`   直接进入: ${issue.direct}`);
        console.log(`   切换进入: ${issue.switched}`);
        console.log('');
      });
    }

    // 保存结果到文件
    const reportPath = path.join(__dirname, '../test-results/comparison-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      passed: allPassed,
      directResult,
      switchedResult,
      comparisons,
      issues
    }, null, 2));

    console.log('测试报告已保存:', reportPath);
    console.log('\n========================================\n');

    return { passed: allPassed, issues };

  } catch (error) {
    console.error('测试执行出错:', error);
    throw error;
  } finally {
    // 保持浏览器打开以便检查
    console.log('浏览器保持打开状态，按任意键关闭...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      browser.close();
      process.exit(0);
    });
  }
}

// 运行测试
runComprehensiveTest().catch(console.error);
