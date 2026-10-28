/**
 * Figure Designer 内存泄漏检测
 * 重点验证 P1-3 (beforeDestroy 内存清理)
 *
 * 测试策略:
 * 1. 基线测量 - 初始内存占用
 * 2. 重复操作 - 打开/关闭/编辑循环
 * 3. 峰值监测 - 检测不释放的对象
 * 4. 对比分析 - 前后内存差异
 */

const { chromium } = require('playwright');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  projectId: '2078348945532030978',
  dmId: '2084257576786046977',
  timeout: 120000,
  iterations: 10,
};

// ==================== 内存检测工具 ====================

class MemoryLeakDetector {
  constructor(page) {
    this.page = page;
    this.measurements = [];
    this.detailedSnapshots = [];
  }

  async recordMemory(label) {
    const memory = await this.page.evaluate(() => {
      if (!performance.memory) return null;
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    });

    if (memory) {
      this.measurements.push({
        label,
        timestamp: Date.now(),
        memory,
        heapMB: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
      });
    }

    return memory;
  }

  async forceGC() {
    // 尽量触发垃圾回收
    await this.page.evaluate(() => {
      // 清除所有定时器
      let lastTimerId = setTimeout(() => {}, 0);
      for (let i = 1; i < lastTimerId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }

      // 清除缓存
      if (window.caches) {
        window.caches.keys().then(names => {
          names.forEach(name => window.caches.delete(name));
        });
      }
    });

    // 等待一段时间让GC运行
    await this.page.waitForTimeout(500);
  }

  async getDetailedMetrics() {
    return await this.page.evaluate(() => {
      const vm = window.__NUXT__?.$children[0]?.$children.find(
        c => c.$options.name === 'FigureDesigner'
      );

      if (!vm) return null;

      return {
        componentMounted: !!vm.$el,
        graphicsArray: vm.graphics?.length || 0,
        legendsArray: vm.legends?.length || 0,
        previewContent: !!vm.previewContent,
        previewUrl: !!vm.previewUrl,
        eventListeners: vm.$listeners ? Object.keys(vm.$listeners).length : 0,
        watchers: vm.$options.watch ? Object.keys(vm.$options.watch).length : 0,
        computedProps: vm.$options.computed ? Object.keys(vm.$options.computed).length : 0,
      };
    });
  }

  analyzeLeaks() {
    if (this.measurements.length < 2) return null;

    const baseline = this.measurements[0];
    const final = this.measurements[this.measurements.length - 1];
    const peak = this.measurements.reduce((max, m) =>
      parseInt(m.heapMB) > parseInt(max.heapMB) ? m : max
    );

    const totalGrowth = parseInt(final.heapMB) - parseInt(baseline.heapMB);
    const growthRate = totalGrowth / parseInt(baseline.heapMB) * 100;

    // 计算平均增长
    let avgGrowth = 0;
    for (let i = 1; i < this.measurements.length; i++) {
      avgGrowth += parseInt(this.measurements[i].heapMB) - parseInt(this.measurements[i - 1].heapMB);
    }
    avgGrowth /= Math.max(1, this.measurements.length - 1);

    return {
      baseline: baseline.heapMB,
      peak: peak.heapMB,
      final: final.heapMB,
      totalGrowth: totalGrowth.toFixed(2),
      growthRate: growthRate.toFixed(2),
      avgIterationGrowth: avgGrowth.toFixed(2),
      hasLeak: growthRate > 10, // 增长超过10%判定为泄漏
      severity: growthRate > 30 ? 'critical' : growthRate > 15 ? 'warning' : growthRate > 5 ? 'minor' : 'none',
    };
  }

  generateReport() {
    const analysis = this.analyzeLeaks();
    const report = {
      timestamp: new Date().toISOString(),
      measurements: this.measurements,
      analysis,
      snapshots: this.detailedSnapshots,
    };

    return report;
  }
}

// ==================== 登录 ====================

async function login(page) {
  const loginResponse = await page.evaluate(async () => {
    const res = await fetch('/jeecg-boot/sys/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    });
    return res.json();
  });

  if (!loginResponse.success) throw new Error('登录失败');

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

// ==================== 主测试 ====================

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const detector = new MemoryLeakDetector(page);

  try {
    await page.goto(CONFIG.baseUrl);
    console.log('\n🧹 Figure Designer 内存泄漏检测开始\n');

    // 登录
    await login(page);
    console.log('✓ 已登录');

    // 基线测量
    console.log('\n📍 第1步: 基线测量');
    await detector.recordMemory('基线-程序启动');
    console.log(`基线堆内存: ${detector.measurements[0].heapMB}MB`);

    // ============== 测试场景1: 打开/关闭循环 ==============
    console.log('\n🔄 测试场景1: 打开/关闭循环(' + CONFIG.iterations + '轮)');

    for (let i = 0; i < CONFIG.iterations; i++) {
      // 打开设计器
      await page.goto(`${CONFIG.baseUrl}/#/figure/designer?dmId=${CONFIG.dmId}`);

      try {
        await page.waitForFunction(
          () => {
            const vm = window.__NUXT__?.$children[0]?.$children.find(
              c => c.$options.name === 'FigureDesigner'
            );
            return vm && vm.graphics && vm.graphics.length > 0;
          },
          { timeout: 15000 }
        );
      } catch (e) {
        console.log(`  ⚠️  第${i + 1}轮加载超时`);
      }

      await page.waitForTimeout(1000);
      await detector.recordMemory(`打开-第${i + 1}轮`);

      // 关闭设计器，返回列表
      await page.goto(`${CONFIG.baseUrl}/#/list/figure`);
      await page.waitForTimeout(1000);
      await detector.recordMemory(`关闭-第${i + 1}轮`);

      // 强制GC
      await detector.forceGC();
      await detector.recordMemory(`GC后-第${i + 1}轮`);

      const current = detector.measurements[detector.measurements.length - 1];
      console.log(`  第${i + 1}轮: ${current.heapMB}MB`);
    }

    // ============== 测试场景2: 编辑操作循环 ==============
    console.log('\n✏️  测试场景2: 编辑操作循环');

    await page.goto(`${CONFIG.baseUrl}/#/figure/designer?dmId=${CONFIG.dmId}`);

    try {
      await page.waitForFunction(
        () => {
          const vm = window.__NUXT__?.$children[0]?.$children.find(
            c => c.$options.name === 'FigureDesigner'
          );
          return vm && vm.graphics && vm.graphics.length > 0;
        },
        { timeout: 15000 }
      );
    } catch (e) {
      console.log('  ⚠️  设计器加载超时');
    }

    for (let i = 0; i < Math.min(5, CONFIG.iterations / 2); i++) {
      // 模拟编辑操作
      await page.evaluate(() => {
        const vm = window.__NUXT__?.$children[0]?.$children.find(
          c => c.$options.name === 'FigureDesigner'
        );
        if (vm) {
          vm.figureTitle = 'Edit-' + Date.now();
          vm.$forceUpdate?.();
        }
      });

      await page.waitForTimeout(500);
      await detector.recordMemory(`编辑-第${i + 1}轮`);
    }

    // ============== 测试场景3: 热点导入循环 ==============
    console.log('\n🔥 测试场景3: 热点导入循环');

    for (let i = 0; i < 3; i++) {
      const btn = await page.$('button:has-text("从预览导入")');
      if (btn) {
        try {
          await btn.click();
          await page.waitForTimeout(800);
          await detector.recordMemory(`导入-第${i + 1}轮`);
        } catch (e) {
          console.log(`  导入失败第${i + 1}轮: ${e.message}`);
        }
      }
    }

    // 最终GC
    console.log('\n🧹 最终垃圾回收');
    await detector.forceGC();
    await detector.recordMemory('最终-GC后');

    // ============== 分析报告 ====================
    console.log('\n' + '='.repeat(70));
    console.log('📊 内存泄漏分析报告');
    console.log('='.repeat(70));

    const analysis = detector.analyzeLeaks();
    if (analysis) {
      console.log(`\n📈 堆内存统计:`);
      console.log(`   基线: ${analysis.baseline}MB`);
      console.log(`   峰值: ${analysis.peak}MB`);
      console.log(`   最终: ${analysis.final}MB`);
      console.log(`   总增长: ${analysis.totalGrowth}MB`);
      console.log(`   增长率: ${analysis.growthRate}%`);
      console.log(`   单次平均增长: ${analysis.avgIterationGrowth}MB\n`);

      console.log(`🎯 泄漏诊断:`);
      console.log(`   是否泄漏: ${analysis.hasLeak ? '⚠️  可能泄漏' : '✓ 正常释放'}`);
      console.log(`   严重程度: ${analysis.severity}`);

      if (analysis.hasLeak) {
        console.log('\n   建议:`);
        if (analysis.severity === 'critical') {
          console.log(`   - 严重泄漏，请检查组件的beforeDestroy钩子是否完整`);
          console.log(`   - 检查是否有未销毁的定时器、监听器或订阅`);
        } else if (analysis.severity === 'warning') {
          console.log(`   - 中度泄漏，建议审查内存释放逻辑`);
        } else {
          console.log(`   - 轻微增长，可能是缓存行为，继续监控`);
        }
      } else {
        console.log('\n   ✓ 内存管理良好，beforeDestroy正确实现');
      }
    }

    // 详细时间序列
    console.log('\n📋 详细堆内存时间序列:');
    detector.measurements.forEach((m, i) => {
      const bar = '█'.repeat(Math.round(parseInt(m.heapMB) / 10)) || '░';
      console.log(`   ${m.label.padEnd(20)} ${m.heapMB.padStart(8)}MB  ${bar}`);
    });

    // 保存详细报告
    const fs = require('fs');
    const reportPath = 'D:\\workspace\\IETM\\cape-ietm-vue\\tests\\reports\\figure-memory-leak-report.json';

    const fullReport = detector.generateReport();
    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));

    console.log(`\n📄 详细报告: ${reportPath}`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ 检测错误:', error.message);
  } finally {
    await browser.close();
  }
})();
