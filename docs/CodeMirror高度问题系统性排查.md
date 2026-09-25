# CodeMirror高度问题 - 系统性深度排查

## 📊 **已知数据汇总**

### 诊断数据对比

| 指标 | 初次加载 | 切换后 | 差异 |
|------|---------|--------|------|
| CodeMirror容器 | 574px | 574px | 无变化 |
| **CodeMirror-scroll** | **624px** | **350px** | **-274px ❌** |
| CodeMirror-sizer | 974px | 613px | -361px |
| 第一行高度 | 21px | 14px | -7px（修复成功） |
| 可见行数 | 26行 | 26行 | 无变化 |
| clientHeight | 574px | 300px | -274px ❌ |

### 关键发现

**最重要的线索**：
```
视口显示范围: {clientHeight: 574}  // 初次加载
视口显示范围: {clientHeight: 300}  // 切换后
```

**clientHeight从574px降到300px！** 这说明CodeMirror内部认为可用高度只有300px。

---

## 🔍 **深度分析：clientHeight为何变成300px？**

### 可能性1：父容器高度被固定为300px ⭐⭐⭐⭐⭐

某个父容器的高度被设置为300px，导致CodeMirror无法获取正确的可用空间。

**检查对象**：
- `.source-pane`
- `.ant-tabs-tabpane-active`
- `.ant-tabs-content`
- `.view-tabs`
- `.region-center`

### 可能性2：CodeMirror的初始化参数错误

CodeMirror在初始化时可能使用了错误的高度参数。

**检查**: `DmSourceView.vue:67`
```javascript
cm.setSize('100%', '100%')
```

### 可能性3：CodeMirror的内部状态被污染

CodeMirror实例的内部状态（如 `display.wrapper.clientHeight`）被修改。

### 可能性4：UEditor设置了全局CSS规则

UEditor可能添加了影响所有元素的全局CSS规则。

---

## 🔬 **诊断脚本（精确定位）**

### 脚本1：检查父容器链的高度

```javascript
// 在切换后运行
const cm = document.querySelector('.CodeMirror');
let el = cm;
const chain = [];

while (el && el !== document.body) {
  const computed = getComputedStyle(el);
  chain.push({
    tag: el.tagName,
    class: el.className,
    offsetHeight: el.offsetHeight,
    clientHeight: el.clientHeight,
    computedHeight: computed.height,
    computedMaxHeight: computed.maxHeight,
    inlineHeight: el.style.height,
    inlineMaxHeight: el.style.maxHeight
  });
  el = el.parentElement;
}

console.table(chain);

// 预期：找到某个父容器的高度是300px或被限制
```

### 脚本2：检查CodeMirror实例的内部状态

```javascript
// 在切换后运行
const editor = document.querySelector('.dm-editor-page').__vue__.$refs.editor.getEditor();

console.log('==== CodeMirror内部状态 ====');
console.log('display.wrapper:', editor.display.wrapper.offsetHeight);
console.log('display.wrapper.clientHeight:', editor.display.wrapper.clientHeight);
console.log('display.scroller:', editor.display.scroller.offsetHeight);
console.log('display.sizer:', editor.display.sizer.offsetHeight);
console.log('display.lineSpace:', editor.display.lineSpace.offsetHeight);

// 检查是否有高度相关的选项
console.log('options.height:', editor.options.height);
console.log('options.viewportMargin:', editor.options.viewportMargin);
```

### 脚本3：对比初次加载和切换后的所有父容器

```javascript
// === 初次加载时运行并保存 ===
window.normalContainers = [];
let el = document.querySelector('.CodeMirror');
while (el && el !== document.body) {
  window.normalContainers.push({
    className: el.className,
    offsetHeight: el.offsetHeight,
    clientHeight: el.clientHeight,
    style: el.style.cssText
  });
  el = el.parentElement;
}

// === 切换后运行并对比 ===
let el2 = document.querySelector('.CodeMirror');
let i = 0;
console.log('==== 父容器对比 ====');
while (el2 && el2 !== document.body) {
  const normal = window.normalContainers[i];
  const current = {
    className: el2.className,
    offsetHeight: el2.offsetHeight,
    clientHeight: el2.clientHeight,
    style: el2.style.cssText
  };
  
  if (normal.offsetHeight !== current.offsetHeight) {
    console.log(`\n🔴 ${normal.className || 'unnamed'}`);
    console.log('  正常:', normal.offsetHeight, 'px');
    console.log('  当前:', current.offsetHeight, 'px');
    console.log('  样式:', current.style);
  }
  
  el2 = el2.parentElement;
  i++;
}
```

---

## 🎯 **推测：最可能的问题**

基于 `clientHeight: 300` 这个精确值，我推测：

### 推测A：某个父容器被设置为300px

可能是：
- `.source-pane { height: 300px !important; }`
- `.ant-tabs-tabpane-active { max-height: 300px; }`
- `.region-center { height: 300px; }`

### 推测B：CodeMirror的viewportMargin选项

CodeMirror有一个 `viewportMargin` 选项，控制渲染的行数。如果这个值被改变，可能导致显示异常。

**检查**: `DmSourceView.vue:44-66`

### 推测C：UEditor添加了全局CSS

UEditor可能在 `<style>` 标签中添加了：
```css
.ant-tabs-tabpane-active {
  height: 300px !important;
}
```

---

## 🛠️ **进一步修复方案**

### 方案1：强制重置所有祖先容器的高度

```javascript
// 在onViewTabChange中
let el = this.$el.querySelector('.CodeMirror');
while (el && el !== this.$el) {
  el.style.height = '';
  el.style.minHeight = '';
  el.style.maxHeight = '';
  el = el.parentElement;
}
```

### 方案2：强制CodeMirror重新计算尺寸

```javascript
// 在onViewTabChange中
if (this.$refs.editor && this.$refs.editor.getEditor()) {
  const cm = this.$refs.editor.getEditor();
  
  // 方法1：setSize
  cm.setSize('100%', '100%');
  
  // 方法2：刷新
  cm.refresh();
  
  // 方法3：强制重新测量
  setTimeout(() => {
    cm.setSize(null, null);  // 清除尺寸
    cm.setSize('100%', '100%');  // 重新设置
    cm.refresh();
  }, 300);
}
```

### 方案3：检查并移除UEditor添加的style标签

```javascript
// 在onViewTabChange中
// 移除UEditor可能添加的style标签
document.querySelectorAll('style').forEach(style => {
  if (style.textContent.includes('CodeMirror') || 
      style.textContent.includes('ant-tabs')) {
    console.warn('移除疑似UEditor添加的样式:', style.textContent.substring(0, 100));
    style.remove();
  }
});
```

---

## 📝 **请执行诊断**

由于问题仍然存在，说明我之前的修复不够深入。

**请在浏览器控制台运行以下脚本**：

### 步骤1：初次加载时运行

```javascript
// 保存正常状态
window.normalContainers = [];
let el = document.querySelector('.CodeMirror');
while (el && el !== document.body) {
  window.normalContainers.push({
    tag: el.tagName,
    className: el.className,
    offsetHeight: el.offsetHeight,
    clientHeight: el.clientHeight,
    computedHeight: getComputedStyle(el).height,
    inlineHeight: el.style.height
  });
  el = el.parentElement;
}
console.log('正常状态已保存，共', window.normalContainers.length, '层容器');
```

### 步骤2：切换后运行

```javascript
// 对比异常状态
let el2 = document.querySelector('.CodeMirror');
let i = 0;
console.log('==== 容器高度对比 ====\n');
while (el2 && el2 !== document.body && i < window.normalContainers.length) {
  const normal = window.normalContainers[i];
  const current = {
    tag: el2.tagName,
    className: el2.className,
    offsetHeight: el2.offsetHeight,
    clientHeight: el2.clientHeight,
    computedHeight: getComputedStyle(el2).height,
    inlineHeight: el2.style.height
  };
  
  if (normal.offsetHeight !== current.offsetHeight || 
      normal.clientHeight !== current.clientHeight) {
    console.log(`🔴 [${i}] ${current.tag}.${current.className.split(' ')[0]}`);
    console.log('   offsetHeight:', normal.offsetHeight, '→', current.offsetHeight);
    console.log('   clientHeight:', normal.clientHeight, '→', current.clientHeight);
    console.log('   computed:', normal.computedHeight, '→', current.computedHeight);
    console.log('   inline:', normal.inlineHeight, '→', current.inlineHeight);
    console.log('');
  }
  
  el2 = el2.parentElement;
  i++;
}
```

**请将输出结果发给我**，我会根据具体的容器高度变化来精确定位问题。
