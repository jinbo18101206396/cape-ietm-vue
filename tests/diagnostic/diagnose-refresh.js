// 诊断脚本：检查 refresh 是否被调用

// 1. 先拦截 CodeMirror 的 refresh 方法
const cm = document.querySelector('.CodeMirror').CodeMirror;
const originalRefresh = cm.refresh.bind(cm);
let refreshCount = 0;

cm.refresh = function() {
  refreshCount++;
  console.log(`[诊断] refresh() 被调用 - 第 ${refreshCount} 次`);
  console.trace('调用堆栈');
  return originalRefresh();
};

console.log('✅ 已安装 refresh 拦截器');
console.log('现在请：');
console.log('1. 双击左侧树的 para 节点进入设计视图');
console.log('2. 点击底部"源码视图"标签');
console.log('3. 观察控制台是否有 "[诊断] refresh() 被调用" 的输出');
