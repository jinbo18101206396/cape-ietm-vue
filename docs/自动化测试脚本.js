/**
 * 视图切换高度问题自动化测试脚本
 *
 * 使用方法：
 * 1. 打开DM编辑器页面
 * 2. 打开浏览器控制台（F12 → Console）
 * 3. 复制整个脚本并粘贴到控制台
 * 4. 按回车执行
 * 5. 查看测试结果
 */

(function() {
  'use strict';

  // 测试配置
  const CONFIG = {
    // 高度容差（像素）
    HEIGHT_TOLERANCE: 5,

    // 高度范围（相对于viewport的比例）
    MIN_HEIGHT_RATIO: 0.5,
    MAX_HEIGHT_RATIO: 0.9,

    // 等待时间（毫秒）
    WAIT_TIME: 100,

    // 颜色
    COLORS: {
      PASS: '#4CAF50',
      FAIL: '#F44336',
      SKIP: '#FF9800',
      INFO: '#2196F3'
    }
  };

  // 测试结果收集器
  class TestResults {
    constructor() {
      this.tests = [];
      this.passed = 0;
      this.failed = 0;
      this.skipped = 0;
    }

    add(name, passed, details, error = null) {
      this.tests.push({ name, passed, details, error });
      if (passed === null) {
        this.skipped++;
      } else if (passed) {
        this.passed++;
      } else {
        this.failed++;
      }
    }

    get total() {
      return this.tests.length;
    }

    get passRate() {
      const effective = this.passed + this.failed;
      return effective > 0 ? (this.passed / effective * 100).toFixed(1) : 0;
    }
  }

  // 测试工具函数
  const TestUtils = {
    // 等待
    wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // 获取元素
    getElement(selector) {
      return document.querySelector(selector);
    },

    // 获取元素高度
    getHeight(element) {
      return element ? element.offsetHeight : 0;
    },

    // 获取计算样式
    getComputedStyle(element) {
      return element ? window.getComputedStyle(element) : null;
    },

    // 检查flex样式
    checkFlexStyle(element, expected) {
      if (!element) return { valid: false, reason: '元素不存在' };

      const styles = this.getComputedStyle(element);
      const checks = {
        display: styles.display === expected.display,
        flex: expected.flex ? styles.flex.includes(expected.flex) : true,
        minHeight: expected.minHeight ? styles.minHeight === expected.minHeight : true,
        flexDirection: expected.flexDirection ? styles.flexDirection === expected.flexDirection : true
      };

      const invalid = Object.entries(checks).filter(([key, valid]) => !valid);

      return {
        valid: invalid.length === 0,
        reason: invalid.length > 0 ? `不匹配的属性: ${invalid.map(([k]) => k).join(', ')}` : '全部匹配',
        styles: {
          display: styles.display,
          flex: styles.flex,
          minHeight: styles.minHeight,
          flexDirection: styles.flexDirection
        }
      };
    },

    // 检查高度是否在合理范围
    checkHeightInRange(height, viewportHeight, minRatio, maxRatio) {
      const ratio = height / viewportHeight;
      const valid = ratio >= minRatio && ratio <= maxRatio;
      return {
        valid,
        ratio: (ratio * 100).toFixed(1),
        reason: valid ? '高度正常' : `高度比例${(ratio * 100).toFixed(1)}%超出范围[${minRatio * 100}%, ${maxRatio * 100}%]`
      };
    }
  };

  // 日志输出
  const Logger = {
    group(title, color = CONFIG.COLORS.INFO) {
      console.log('%c' + '═'.repeat(60), `color: ${color}`);
      console.log('%c' + title, `color: ${color}; font-size: 16px; font-weight: bold;`);
      console.log('%c' + '═'.repeat(60), `color: ${color}`);
    },

    test(name, status) {
      const icon = status === null ? '⚠️' : (status ? '✅' : '❌');
      const color = status === null ? CONFIG.COLORS.SKIP : (status ? CONFIG.COLORS.PASS : CONFIG.COLORS.FAIL);
      console.log(`%c${icon} ${name}`, `color: ${color}; font-weight: bold;`);
    },

    detail(text) {
      console.log(`   ${text}`);
    },

    error(text) {
      console.log(`%c   ⚠️ ${text}`, `color: ${CONFIG.COLORS.FAIL}`);
    },

    summary(results) {
      console.log('');
      this.group('测试结果汇总', CONFIG.COLORS.INFO);
      console.log(`总计: ${results.total} 个测试`);
      console.log(`%c通过: ${results.passed}`, `color: ${CONFIG.COLORS.PASS}; font-weight: bold;`);
      console.log(`%c失败: ${results.failed}`, `color: ${CONFIG.COLORS.FAIL}; font-weight: bold;`);
      console.log(`%c跳过: ${results.skipped}`, `color: ${CONFIG.COLORS.SKIP}; font-weight: bold;`);
      console.log(`通过率: ${results.passRate}%`);
      console.log('%c' + '═'.repeat(60), `color: ${CONFIG.COLORS.INFO}`);
    }
  };

  // 单元测试
  const UnitTests = {
    // UT-001: CSS样式验证
    async testDesignViewContainerCSS(results) {
      const testName = 'UT-001: design-view-container CSS样式验证';

      try {
        const container = TestUtils.getElement('.design-view-container');

        if (!container) {
          results.add(testName, null, '设计视图容器未找到（需要先进入设计视图）');
          Logger.test(testName, null);
          Logger.detail('提示: 请先点击铅笔图标进入设计视图');
          return;
        }

        const check = TestUtils.checkFlexStyle(container, {
          display: 'flex',
          flex: '1',
          minHeight: '0px',
          flexDirection: 'column'
        });

        results.add(testName, check.valid, check.reason);
        Logger.test(testName, check.valid);
        Logger.detail(`display: ${check.styles.display}`);
        Logger.detail(`flex: ${check.styles.flex}`);
        Logger.detail(`min-height: ${check.styles.minHeight}`);
        Logger.detail(`flex-direction: ${check.styles.flexDirection}`);

        if (!check.valid) {
          Logger.error(check.reason);
        }
      } catch (error) {
        results.add(testName, false, '测试异常', error.message);
        Logger.test(testName, false);
        Logger.error(error.message);
      }
    },

    // UT-002: source-pane CSS验证
    async testSourcePaneCSS(results) {
      const testName = 'UT-002: source-pane CSS样式验证';

      try {
        const pane = TestUtils.getElement('.source-pane');

        if (!pane) {
          results.add(testName, null, '源码视图容器未找到（需要在源码视图）');
          Logger.test(testName, null);
          Logger.detail('提示: 请切换到源码视图');
          return;
        }

        const check = TestUtils.checkFlexStyle(pane, {
          display: 'flex',
          flex: '1',
          minHeight: '0px',
          flexDirection: 'column'
        });

        results.add(testName, check.valid, check.reason);
        Logger.test(testName, check.valid);
        Logger.detail(`display: ${check.styles.display}`);
        Logger.detail(`flex: ${check.styles.flex}`);
        Logger.detail(`min-height: ${check.styles.minHeight}`);

        if (!check.valid) {
          Logger.error(check.reason);
        }
      } catch (error) {
        results.add(testName, false, '测试异常', error.message);
        Logger.test(testName, false);
        Logger.error(error.message);
      }
    },

    // UT-003: CodeMirror高度验证
    async testCodeMirrorHeight(results) {
      const testName = 'UT-003: CodeMirror高度验证';

      try {
        const editor = TestUtils.getElement('.CodeMirror');

        if (!editor) {
          results.add(testName, null, 'CodeMirror未找到');
          Logger.test(testName, null);
          Logger.detail('提示: 确保在源码视图');
          return;
        }

        const height = TestUtils.getHeight(editor);
        const viewportHeight = window.innerHeight;
        const check = TestUtils.checkHeightInRange(
          height,
          viewportHeight,
          CONFIG.MIN_HEIGHT_RATIO,
          CONFIG.MAX_HEIGHT_RATIO
        );

        results.add(testName, check.valid, check.reason);
        Logger.test(testName, check.valid);
        Logger.detail(`CodeMirror高度: ${height}px`);
        Logger.detail(`Viewport高度: ${viewportHeight}px`);
        Logger.detail(`高度比例: ${check.ratio}%`);

        if (!check.valid) {
          Logger.error(check.reason);
        }
      } catch (error) {
        results.add(testName, false, '测试异常', error.message);
        Logger.test(testName, false);
        Logger.error(error.message);
      }
    },

    // UT-004: ParaDesigner高度验证
    async testParaDesignerHeight(results) {
      const testName = 'UT-004: ParaDesigner高度验证';

      try {
        const designer = TestUtils.getElement('.para-designer');

        if (!designer) {
          results.add(testName, null, 'ParaDesigner未找到（需要在设计视图）');
          Logger.test(testName, null);
          Logger.detail('提示: 请进入设计视图');
          return;
        }

        const height = TestUtils.getHeight(designer);
        const parentHeight = TestUtils.getHeight(designer.parentElement);
        const fillRatio = (height / parentHeight * 100).toFixed(1);
        const valid = (height / parentHeight) > 0.95;

        results.add(testName, valid, `填充比例: ${fillRatio}%`);
        Logger.test(testName, valid);
        Logger.detail(`ParaDesigner高度: ${height}px`);
        Logger.detail(`容器高度: ${parentHeight}px`);
        Logger.detail(`填充比例: ${fillRatio}%`);

        if (!valid) {
          Logger.error(`填充比例${fillRatio}%小于95%`);
        }
      } catch (error) {
        results.add(testName, false, '测试异常', error.message);
        Logger.test(testName, false);
        Logger.error(error.message);
      }
    }
  };

  // 回归测试
  const RegressionTests = {
    // RT-001: 检查铅笔图标显示
    async testGutterIcons(results) {
      const testName = 'RT-001: 铅笔图标显示检查';

      try {
        const icons = document.querySelectorAll('.gutter-pencil-icon');
        const valid = icons.length > 0;

        results.add(testName, valid, `找到${icons.length}个铅笔图标`);
        Logger.test(testName, valid);
        Logger.detail(`铅笔图标数量: ${icons.length}`);

        if (!valid) {
          Logger.error('未找到铅笔图标，检查是否有para元素');
        }
      } catch (error) {
        results.add(testName, false, '测试异常', error.message);
        Logger.test(testName, false);
        Logger.error(error.message);
      }
    },

    // RT-002: 检查工具栏显示
    async testToolbar(results) {
      const testName = 'RT-002: 工具栏显示检查';

      try {
        const toolbar = TestUtils.getElement('.editor-toolbar');
        const valid = toolbar !== null;

        results.add(testName, valid, valid ? '工具栏正常显示' : '工具栏未找到');
        Logger.test(testName, valid);

        if (valid) {
          const buttons = toolbar.querySelectorAll('.ant-btn');
          Logger.detail(`工具栏按钮数量: ${buttons.length}`);
        } else {
          Logger.error('工具栏未找到');
        }
      } catch (error) {
        results.add(testName, false, '测试异常', error.message);
        Logger.test(testName, false);
        Logger.error(error.message);
      }
    },

    // RT-003: 检查视图页签
    async testViewTabs(results) {
      const testName = 'RT-003: 视图页签检查';

      try {
        const tabs = TestUtils.getElement('.view-tabs');
        const valid = tabs !== null;

        results.add(testName, valid, valid ? '视图页签正常' : '视图页签未找到');
        Logger.test(testName, valid);

        if (valid) {
          const designTab = document.querySelector('.view-tabs [data-node-key="design"]');
          const sourceTab = document.querySelector('.view-tabs [data-node-key="source"]');
          Logger.detail(`设计视图页签: ${designTab ? '存在' : '不存在'}`);
          Logger.detail(`源码视图页签: ${sourceTab ? '存在' : '不存在'}`);
        } else {
          Logger.error('视图页签未找到');
        }
      } catch (error) {
        results.add(testName, false, '测试异常', error.message);
        Logger.test(testName, false);
        Logger.error(error.message);
      }
    }
  };

  // 主测试运行器
  async function runAllTests() {
    const results = new TestResults();

    Logger.group('视图切换高度问题 - 自动化测试', CONFIG.COLORS.INFO);
    console.log('测试开始时间:', new Date().toLocaleString());
    console.log('');

    // 单元测试
    Logger.group('单元测试 (Unit Tests)', CONFIG.COLORS.INFO);
    await UnitTests.testSourcePaneCSS(results);
    await TestUtils.wait(CONFIG.WAIT_TIME);
    await UnitTests.testDesignViewContainerCSS(results);
    await TestUtils.wait(CONFIG.WAIT_TIME);
    await UnitTests.testCodeMirrorHeight(results);
    await TestUtils.wait(CONFIG.WAIT_TIME);
    await UnitTests.testParaDesignerHeight(results);
    console.log('');

    // 回归测试
    Logger.group('回归测试 (Regression Tests)', CONFIG.COLORS.INFO);
    await RegressionTests.testGutterIcons(results);
    await TestUtils.wait(CONFIG.WAIT_TIME);
    await RegressionTests.testToolbar(results);
    await TestUtils.wait(CONFIG.WAIT_TIME);
    await RegressionTests.testViewTabs(results);
    console.log('');

    // 输出汇总
    Logger.summary(results);

    // 详细结果
    console.log('');
    Logger.group('详细测试结果', CONFIG.COLORS.INFO);
    console.table(results.tests.map(t => ({
      '测试名称': t.name,
      '状态': t.passed === null ? '跳过' : (t.passed ? '通过' : '失败'),
      '详情': t.details
    })));

    // 返回结果供后续使用
    return results;
  }

  // 执行测试
  console.clear();
  runAllTests().then(results => {
    console.log('');
    console.log('%c测试完成！', 'color: #4CAF50; font-size: 18px; font-weight: bold;');

    if (results.failed > 0) {
      console.log('%c发现问题，请检查失败的测试项', 'color: #F44336; font-weight: bold;');
    } else if (results.skipped > 0) {
      console.log('%c部分测试被跳过，请按提示操作后重新测试', 'color: #FF9800; font-weight: bold;');
    } else {
      console.log('%c所有测试通过！✨', 'color: #4CAF50; font-weight: bold;');
    }
  }).catch(error => {
    console.error('测试执行失败:', error);
  });

})();
