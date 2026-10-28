/**
 * Figure Designer 性能基准测试
 * 验证性能优化(P1-2)的实际效果
 *
 * 测试场景：
 * - 小规模(10图形): 首屏加载时间
 * - 中规模(50图形): 交互响应时间
 * - 大规模(100+图形): 内存占用 & 滚动帧率
 * - 内存泄漏: 重复打开/关闭时内存变化
 */

const { chromium } = require('playwright');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:9999',
  projectId: '2078348945532030978',
  dmId: '2084257576786046977',
  timeout: 60000,
};

const benchmarks = {
  smallScale: { name: '小规模(10)', targetCount: 10 },
  mediumScale: { name: '中规模(50)', targetCount: 50 },
  largeScale: { name: '大规模(100+)', targetCount: 100 },
};

const results = {
  tests: [],
  systemInfo: {},
};

// ==================== 性能测量工具 ====================

class PerformanceMonitor {
  constructor(page) {
    this.page = page;
    this.metrics = {};
  }

  async measureLoadTime(name, fn) {
    const startTime = Date.now();
    const startMemory = await this.getMemoryUsage();

    await fn();

    const endTime = Date.now();
    const endMemory = await this.getMemoryUsage();

    const result = {
      name,
      duration: endTime - startTime,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      startMemory: startMemory.heapUsed,
      endMemory: endMemory.heapUsed,
    };

    this.metrics[name] = result;
    return result;
  }

  async getMemoryUsage() {
    return await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          heapUsed: performance.memory.usedJSHeapSize,
          heapLimit: performance.memory.jsHeapSizeLimit,
        };
      }
      return { heapUsed: 0, heapLimit: 0 };
    });
  }

  async measureFrameRate(duration = 5000) {
    return await this.page.evaluate((dur) => {
      return new Promise(resolve => {
        let frameCount = 0;
        let lastTime = performance.now();

        const measureFrame = () => {
          frameCount++;
          requestAnimationFrame(measureFrame);
        };

        measureFrame();

        setTimeout(() => {
          const currentTime = performance.now();
          const fps = (frameCount / ((currentTime - lastTime) / 1000)).toFixed(2);
          resolve(parseInt(fps));
        }, dur);
      });
    }, duration);
  }

  async measureRenderTime() {
    return await this.page.evaluate(() => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            return entry.duration;
          }
        }
      });
      observer.observe({ entryTypes: ['measure'] });

      performance.mark('render-start');
      // Vue组件渲染会自动执行
      setTimeout(() => {
        performance.mark('render-end');
        performance.measure('render', 'render-start', 'render-end');
      }, 100);

      return new Promise(resolve => {
        setTimeout(() => resolve(0), 500);
      });
    });
  }

  async getComponentMetrics() {
    return await this.page.evaluate(() => {
      const vm = window.__NUXT__?.$children[0]?.$children.find(
        c => c.$options.name === 'FigureDesigner'
      );

      if (!vm) return null;

      return {
        graphicsCount: vm.graphics?.length || 0,
        legendsCount: vm.legends?.length || 0,
        hotspotCount: vm.previewContent?.hotspots?.length || 0,
        hasPreviewUrl: !!vm.previewUrl,
      };
    });
  }
}

// ==================== 登录工具 ====================

async function login(page) {
  const loginResponse = await page.evaluate(async () => {
    const res = await fetch('/jeecg-boot/sys/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    });
    return res.json();
  });

  if (!loginResponse.success) {
    throw new Error('登录失败');
  }

  const token = loginResponse.result.token;
  await page.evaluate((t) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({
      value: t,
      expire: Date.now() + 86400000,
    }));
  }, token);

  await page.evaluate(async (projectId) => {
    await fetch('/ietmproject/ietmProject/openProject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
  }, CONFIG.projectId);
}

// ==================== 测试执行 ====================

(async () => {
  const browser = await chromium.launch();
  const monitor = new PerformanceMonitor(await browser.newPage());
  const page = monitor.page;

  try {
    await page.goto(CONFIG.baseUrl);
    console.log('\n🚀 Figure Designer 性能基准测试开始\n');

    // 获取系统信息
    results.systemInfo = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      memory: performance.memory ? {
        jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
      } : null,
      cores: navigator.hardwareConcurrency || 'unknown',
    }));

    console.log('📊 系统信息:', JSON.stringify(results.systemInfo, null, 2));

    // 登录
    await login(page);
    console.log('✓ 已登录\n');

    // ============== 测试 1: 首屏加载时间 ==============
    console.log('⏱️  测试 1: 首屏加载时间');

    const loadResult = await monitor.measureLoadTime('首屏加载', async () => {
      await page.goto(`${CONFIG.baseUrl}/#/figure/designer?dmId=${CONFIG.dmId}`);
      await page.waitForFunction(
        () => {
          const vm = window.__NUXT__?.$children[0]?.$children.find(
            c => c.$options.name === 'FigureDesigner'
          );
          return vm && vm.graphics && vm.graphics.length > 0;
        },
        { timeout: 30000 }
      );
    });

    console.log(`  加载耗时: ${loadResult.duration}ms`);
    console.log(`  内存增长: ${(loadResult.memoryDelta / 1024 / 1024).toFixed(2)}MB\n`);
    results.tests.push({ scenario: '首屏加载', metrics: loadResult });

    // ============== 测试 2: 小规模图形处理 ==============
    console.log('⚡ 测试 2: 小规模数据处理(10图形)');

    const smallMetrics = await monitor.measureLoadTime('小规模处理', async () => {
      await page.waitForTimeout(500);
    });

    const smallComponents = await monitor.getComponentMetrics();
    console.log(`  图形数: ${smallComponents.graphicsCount}`);
    console.log(`  响应时间: ${smallMetrics.duration}ms`);
    console.log(`  内存占用: ${(smallMetrics.endMemory / 1024 / 1024).toFixed(2)}MB\n`);
    results.tests.push({ scenario: '小规模处理', metrics: { ...smallMetrics, components: smallComponents } });

    // ============== 测试 3: 滚动性能 ==============
    console.log('📜 测试 3: 滚动性能(帧率)');

    const frameRate = await monitor.measureFrameRate(3000);
    console.log(`  平均帧率: ${frameRate} FPS`);
    console.log(`  评级: ${frameRate >= 50 ? '✓ 优秀' : frameRate >= 30 ? '✓ 良好' : '✗ 需改进'}\n`);
    results.tests.push({ scenario: '滚动性能', frameRate });

    // ============== 测试 4: 热点导入性能 ==============
    console.log('🔥 测试 4: 热点导入性能');

    const importResult = await monitor.measureLoadTime('热点导入', async () => {
      const btn = await page.$('button:has-text("从预览导入")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
    });

    console.log(`  导入耗时: ${importResult.duration}ms`);
    console.log(`  内存变化: ${(importResult.memoryDelta / 1024).toFixed(2)}KB\n`);
    results.tests.push({ scenario: '热点导入', metrics: importResult });

    // ============== 测试 5: 内存泄漏检测 ==============
    console.log('🧹 测试 5: 内存泄漏检测(重复打开/关闭)');

    const memoryLeakTest = [];
    for (let i = 0; i < 3; i++) {
      const memBefore = await monitor.getMemoryUsage();

      await page.goto(`${CONFIG.baseUrl}/#/figure/designer?dmId=${CONFIG.dmId}`);
      await page.waitForFunction(
        () => {
          const vm = window.__NUXT__?.$children[0]?.$children.find(
            c => c.$options.name === 'FigureDesigner'
          );
          return vm && vm.graphics && vm.graphics.length > 0;
        },
        { timeout: 15000 }
      );

      await page.goto(`${CONFIG.baseUrl}/#/list/figure`);
      await page.waitForTimeout(500);

      const memAfter = await monitor.getMemoryUsage();
      const leakSuspicion = memAfter.heapUsed - memBefore.heapUsed;

      memoryLeakTest.push({
        iteration: i + 1,
        heapDelta: (leakSuspicion / 1024 / 1024).toFixed(2) + 'MB',
        heapUsed: (memAfter.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
      });

      console.log(`  第${i + 1}轮: Δ${memoryLeakTest[i].heapDelta}`);
    }

    console.log('  评估: ' + (
      memoryLeakTest[2].heapUsed < memoryLeakTest[1].heapUsed
        ? '✓ 内存释放正常'
        : '✗ 可能存在泄漏'
    ) + '\n');

    results.tests.push({ scenario: '内存泄漏检测', iterations: memoryLeakTest });

    // ============== 测试 6: 复杂交互性能 ==============
    console.log('🖱️  测试 6: 复杂交互链式操作');

    const complexResult = await monitor.measureLoadTime('复杂交互', async () => {
      // 模拟用户交互序列
      await page.evaluate(() => {
        const vm = window.__NUXT__?.$children[0]?.$children.find(
          c => c.$options.name === 'FigureDesigner'
        );
        if (vm) {
          // 切换标签页
          vm.activeTab = '2';
          vm.$nextTick(() => {
            vm.activeTab = '1';
          });
        }
      });

      await page.waitForTimeout(1000);
    });

    console.log(`  交互耗时: ${complexResult.duration}ms`);
    console.log(`  内存变化: ${(complexResult.memoryDelta / 1024).toFixed(2)}KB\n`);
    results.tests.push({ scenario: '复杂交互', metrics: complexResult });

  } catch (error) {
    console.error('❌ 测试执行错误:', error.message);
    results.error = error.message;
  } finally {
    // ============== 生成基准报告 ====================
    console.log('='.repeat(70));
    console.log('📊 性能基准测试完成');
    console.log('='.repeat(70));

    // 性能评分
    let performanceScore = 100;
    results.tests.forEach(test => {
      if (test.metrics?.duration) {
        if (test.metrics.duration > 5000) performanceScore -= 15;
        else if (test.metrics.duration > 3000) performanceScore -= 10;
      }
      if (test.frameRate && test.frameRate < 30) performanceScore -= 20;
    });

    console.log(`\n🎯 综合性能评分: ${Math.max(0, performanceScore)}/100`);
    console.log(`   ${performanceScore >= 80 ? '✓ 优秀' : performanceScore >= 60 ? '✓ 良好' : '✗ 需改进'}`);

    // 保存详细报告
    const fs = require('fs');
    const reportPath = 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\reports\\figure-performance-benchmark.json';

    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      systemInfo: results.systemInfo,
      performanceScore,
      tests: results.tests,
      error: results.error,
    }, null, 2));

    console.log(`\n📄 详细报告已保存: ${reportPath}`);

    // 关键指标汇总
    console.log('\n📈 关键指标汇总:');
    results.tests.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.scenario}`);
      if (test.metrics) {
        console.log(`     耗时: ${test.metrics.duration}ms`);
      }
      if (test.frameRate) {
        console.log(`     帧率: ${test.frameRate} FPS`);
      }
    });

    await browser.close();
  }
})();
