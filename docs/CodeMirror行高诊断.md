# CodeMirror行高问题诊断

请在浏览器控制台运行以下脚本：

## 初次加载时运行

```javascript
const cm = document.querySelector('.CodeMirror');
const cmScroll = cm.querySelector('.CodeMirror-scroll');
const cmSizer = cm.querySelector('.CodeMirror-sizer');
const lines = cm.querySelectorAll('.CodeMirror-line');

console.log('==== 初次加载 - CodeMirror详细状态 ====');
console.log('CodeMirror容器:', cm.offsetHeight, 'px');
console.log('CodeMirror-scroll:', cmScroll.offsetHeight, 'px');
console.log('CodeMirror-sizer:', cmSizer.offsetHeight, 'px');
console.log('可见行数:', lines.length);
if (lines.length > 0) {
  console.log('第一行高度:', lines[0].offsetHeight, 'px');
  console.log('最后一行高度:', lines[lines.length - 1].offsetHeight, 'px');
}

// 获取CodeMirror实例
const editor = document.querySelector('.dm-editor-page').__vue__.$refs.editor.getEditor();
console.log('总行数:', editor.lineCount());
console.log('视口显示范围:', editor.getScrollInfo());
```

## 切换后运行

```javascript
const cm = document.querySelector('.CodeMirror');
const cmScroll = cm.querySelector('.CodeMirror-scroll');
const cmSizer = cm.querySelector('.CodeMirror-sizer');
const lines = cm.querySelectorAll('.CodeMirror-line');

console.log('==== 切换后 - CodeMirror详细状态 ====');
console.log('CodeMirror容器:', cm.offsetHeight, 'px');
console.log('CodeMirror-scroll:', cmScroll.offsetHeight, 'px');
console.log('CodeMirror-sizer:', cmSizer.offsetHeight, 'px');
console.log('可见行数:', lines.length);
if (lines.length > 0) {
  console.log('第一行高度:', lines[0].offsetHeight, 'px');
  console.log('最后一行高度:', lines[lines.length - 1].offsetHeight, 'px');
}

const editor = document.querySelector('.dm-editor-page').__vue__.$refs.editor.getEditor();
console.log('总行数:', editor.lineCount());
console.log('视口显示范围:', editor.getScrollInfo());
```

请将两次的输出结果发给我！
