/**
 * 浏览器控制台调试脚本
 * 直接在页面中测试 paraConverter 的转换逻辑
 */

console.log('='.repeat(80));
console.log('🔍 删除线转换调试脚本');
console.log('='.repeat(80));

// 测试 1: 基础正则替换测试
console.log('\n📍 测试 1: 基础正则替换');
let testHtml = '<s>123</s>';
let testResult = testHtml
  .replace(/<s(\s[^>]*)?\>/g, '<delete>')
  .replace(/<\/s>/g, '</delete>');

console.log('输入:', testHtml);
console.log('输出:', testResult);
console.log('期望:', '<delete>123</delete>');
console.log('结果:', testResult === '<delete>123</delete>' ? '✅ 通过' : '❌ 失败');

// 测试 2: 检查是否能访问 paraConverter 模块
console.log('\n📍 测试 2: 检查模块加载');

// 尝试通过 webpack 模块系统访问
if (typeof __webpack_require__ !== 'undefined') {
  console.log('✅ Webpack 环境已加载');

  try {
    // 尝试查找 paraConverter 模块
    const moduleIds = Object.keys(__webpack_require__.c);
    console.log('已加载模块数:', moduleIds.length);

    const paraConverterModule = moduleIds.find(id => {
      const module = __webpack_require__.c[id];
      return module && module.exports &&
             (module.exports.html2para || module.exports.para2html);
    });

    if (paraConverterModule) {
      console.log('✅ 找到 paraConverter 模块:', paraConverterModule);
      const converter = __webpack_require__.c[paraConverterModule].exports;
      console.log('导出的函数:', Object.keys(converter));

      // 测试转换函数
      if (converter.html2para) {
        console.log('\n📍 测试 3: 实际调用 html2para');

        // 创建模拟的 parent 对象
        const mockParent = {
          cmnodeid: 'test',
          dmCode: 'DMC-TEST-A-00-00-00-00A-000A-A'
        };

        // 测试简单的删除线转换
        converter.html2para(mockParent, '<s>123</s>', '{}', [])
          .then(result => {
            console.log('html2para 输入:', '<s>123</s>');
            console.log('html2para 输出:', result);
            console.log('包含 <delete>:', result.includes('<delete>') ? '✅' : '❌');
            console.log('包含 </delete>:', result.includes('</delete>') ? '✅' : '❌');
          })
          .catch(err => {
            console.error('❌ html2para 调用失败:', err.message);
          });
      }
    } else {
      console.log('❌ 未找到 paraConverter 模块');
    }
  } catch (e) {
    console.error('❌ 访问模块时出错:', e.message);
  }
} else {
  console.log('⚠️  Webpack 环境未检测到');
}

// 测试 3: 检查当前页面是否有 ParaDesigner 实例
console.log('\n📍 测试 4: 检查 ParaDesigner 实例');
if (window.$PARA_DESIGNER_INSTANCES) {
  const instances = Object.keys(window.$PARA_DESIGNER_INSTANCES);
  console.log('找到实例数:', instances.length);

  instances.forEach(id => {
    console.log('实例 ID:', id);
    const instance = window.$PARA_DESIGNER_INSTANCES[id];
    if (instance && instance.ueditor) {
      console.log('  UEditor 已加载:', !!instance.ueditor);
    }
  });
} else {
  console.log('⚠️  未找到 ParaDesigner 实例');
}

console.log('\n' + '='.repeat(80));
console.log('调试完成');
console.log('='.repeat(80));
