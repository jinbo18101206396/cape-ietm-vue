/**
 * MainProcedureDesigner 测试启动脚本
 *
 * 功能：
 * 1. 检查前端服务是否运行
 * 2. 运行 Playwright 测试
 * 3. 生成友好的测试报告
 */

const { spawn } = require('child_process');
const http = require('http');

const CONFIG = {
  frontendURL: 'http://localhost:3000',
  testCommand: 'npx playwright test tests/mainprocedure-dialog-regression.spec.js',
  maxRetries: 30,
  retryInterval: 1000,
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查服务是否可用
function checkService(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 302);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// 等待服务启动
async function waitForService(url, maxRetries, retryInterval) {
  log(`\n🔍 检查前端服务: ${url}`, 'cyan');

  for (let i = 1; i <= maxRetries; i++) {
    const isAvailable = await checkService(url);

    if (isAvailable) {
      log(`✅ 前端服务已就绪！`, 'green');
      return true;
    }

    process.stdout.write(`\r⏳ 等待服务启动... (${i}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }

  log(`\n❌ 前端服务未启动，请先运行: npm run serve`, 'red');
  return false;
}

// 运行测试
function runTests(command, args = []) {
  return new Promise((resolve, reject) => {
    log(`\n🚀 启动测试...`, 'blue');
    log(`命令: ${command} ${args.join(' ')}`, 'cyan');

    const testProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    testProcess.on('exit', (code) => {
      if (code === 0) {
        log(`\n✅ 测试全部通过！`, 'green');
        resolve();
      } else {
        log(`\n❌ 测试失败，退出码: ${code}`, 'red');
        reject(new Error(`Test failed with code ${code}`));
      }
    });

    testProcess.on('error', (err) => {
      log(`\n❌ 测试运行错误: ${err.message}`, 'red');
      reject(err);
    });
  });
}

// 主函数
async function main() {
  log('\n========================================', 'blue');
  log('  MainProcedureDesigner 自动化测试', 'blue');
  log('========================================\n', 'blue');

  // 1. 检查前端服务
  const isServiceReady = await waitForService(
    CONFIG.frontendURL,
    CONFIG.maxRetries,
    CONFIG.retryInterval
  );

  if (!isServiceReady) {
    log('\n💡 提示: 请在另一个终端运行以下命令启动服务:', 'yellow');
    log('   cd D:\\workspace\\IETM\\cape-ietm-vue', 'yellow');
    log('   npm run serve\n', 'yellow');
    process.exit(1);
  }

  // 2. 运行测试
  try {
    const args = process.argv.slice(2); // 获取额外参数
    const [command, ...commandArgs] = CONFIG.testCommand.split(' ');

    await runTests(command, [...commandArgs, ...args]);

    log('\n📊 查看测试报告:', 'cyan');
    log('   npm run test:e2e:report\n', 'cyan');

  } catch (error) {
    log('\n🐛 调试建议:', 'yellow');
    log('   1. 使用调试模式: npm run test:mainprocedure:debug', 'yellow');
    log('   2. 使用可视化模式: npm run test:mainprocedure:headed', 'yellow');
    log('   3. 查看测试文档: tests/mainprocedure-test-README.md\n', 'yellow');
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  log(`\n❌ 未捕获的异常: ${err.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  log(`\n❌ 未处理的Promise拒绝: ${err.message}`, 'red');
  process.exit(1);
});

// 运行主函数
main();
