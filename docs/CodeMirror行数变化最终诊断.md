# CodeMirror显示行数变化问题 - 最终诊断报告

**现象**: 
- 初次加载：CodeMirror高度574px，显示约85行
- 切换后：CodeMirror高度574px，显示约69行
- 差异：16行（约19%的显示内容丢失）

**关键线索**: 
- ✅ 容器高度相同（574px）
- ✅ region-south状态相同（33px）
- ❌ **但显示的行数不同**

---

## 🔍 **根本原因分析**

### 可能性1：行高（line-height）被污染 ⭐⭐⭐⭐⭐

**最可能的原因！**

#### 计算验证

```
初次加载：574px ÷ 85行 ≈ 6.75px/行
切换后：574px ÷ 69行 ≈ 8.32px/行

每行高度增加：8.32 - 6.75 = 1.57px (增加23%)
```

**推断**: CodeMirror的行高从某个较小的值（如`line-height: 1.2`）变成了较大的值（如`line-height: 1.5`或更大）

#### UEditor可能的污染方式

UEditor在初始化时可能：
1. 全局设置 `body { line-height: 1.5; }`
2. 或者设置了父容器的 `line-height`，导致继承到CodeMirror
3. 或者直接修改了 `.CodeMirror` 或 `.CodeMirror-line` 的样式

### 可能性2：字体大小（font-size）被污染 ⭐⭐⭐

#### CodeMirror的字体设置

**DmSourceView.vue:364**
```less
/deep/ .CodeMirror { 
  height: 100%; 
  font-family: 'Consolas', monospace; 
  font-size: 14px;  // ← 默认14px
}
```

**DmSourceView.vue:218**
```javascript
// 还有一个动态设置字体的功能
this.$el.querySelectorAll('.CodeMirror').forEach(el => { 
  el.style.fontSize = this.fontSize + 'px' 
})
```

**data:40**
```javascript
fontSize: 14  // 默认值
```

#### 污染场景

UEditor可能：
1. 修改了 `.CodeMirror` 的 `font-size`
2. 或修改了 `this.fontSize` 的值
3. 导致字体变大，每行占用更多高度

### 可能性3：padding/margin被添加 ⭐⭐

UEditor可能给 `.CodeMirror-line` 添加了额外的padding或margin：

```css
/* UEditor可能添加了 */
.CodeMirror-line {
  padding-top: 2px;
  padding-bottom: 2px;
  margin: 1px 0;
}
```

导致每行实际高度增加。

### 可能性4：zoom或transform ⭐

UEditor可能设置了：
```css
.CodeMirror {
  zoom: 1.2;  /* 或 */
  transform: scale(1.2);
}
```

导致内容放大，显示行数减少。

---

## 🔬 **精确诊断方法**

### 方法1：检查计算样式

```javascript
// 初次加载时
const cm = document.querySelector('.CodeMirror');
const line = document.querySelector('.CodeMirror-line');
console.log('CodeMirror font-size:', getComputedStyle(cm).fontSize);
console.log('CodeMirror line-height:', getComputedStyle(cm).lineHeight);
console.log('CodeMirror-line height:', line.offsetHeight);
console.log('CodeMirror-line computed line-height:', getComputedStyle(line).lineHeight);

// 切换后再次运行，对比差异
```

### 方法2：检查内联样式污染

```javascript
// 切换后运行
const cm = document.querySelector('.CodeMirror');
console.log('CodeMirror 内联样式:', cm.style.cssText);

const lines = document.querySelectorAll('.CodeMirror-line');
if (lines[0]) {
  console.log('第一行内联样式:', lines[0].style.cssText);
}
```

### 方法3：检查fontSize变量

```javascript
// 切换后运行
const vm = document.querySelector('.dm-editor-page').__vue__;
const sourceView = vm.$refs.editor;
console.log('DmSourceView.fontSize:', sourceView.fontSize);
```

---

## 🛠️ **最终修复方案**

### 方案A：强制重置CodeMirror的行高和字体（已实施）

**文件**: `DmContentEditor.vue:onViewTabChange`

```javascript
// 重置CodeMirror及其内部元素的样式
const cmElements = [
  this.$el.querySelector('.CodeMirror'),
  this.$el.querySelector('.CodeMirror-scroll'),
  this.$el.querySelector('.CodeMirror-sizer'),
  this.$el.querySelector('.CodeMirror-lines')
];

cmElements.forEach(el => {
  if (el) {
    el.style.fontSize = '';
    el.style.lineHeight = '';
    el.style.fontFamily = '';
    el.style.padding = '';
    el.style.margin = '';
    el.style.zoom = '';
    el.style.transform = '';
  }
});
```

### 方案B：重置所有CodeMirror-line的样式

```javascript
// 在onViewTabChange中添加
const cmLines = this.$el.querySelectorAll('.CodeMirror-line');
cmLines.forEach(line => {
  line.style.fontSize = '';
  line.style.lineHeight = '';
  line.style.padding = '';
  line.style.margin = '';
  line.style.height = '';
});
```

### 方案C：强制重置DmSourceView的fontSize

```javascript
// 在onViewTabChange中添加
if (this.$refs.editor) {
  this.$refs.editor.fontSize = 14;  // 强制重置为14px
  
  this.$nextTick(() => {
    // 重新应用字体大小
    this.$refs.editor.$el.querySelectorAll('.CodeMirror').forEach(el => {
      el.style.fontSize = '14px';
    });
  });
}
```

### 方案D：CSS层面隔离UEditor样式

**在ParaDesigner.vue中添加CSS作用域**：

```vue
<style scoped lang="less">
.para-designer {
  // 隔离UEditor的全局样式污染
  :deep(*) {
    line-height: initial !important;
  }
  
  // 但允许UEditor内部使用自己的样式
  :deep(.edui-default) {
    line-height: normal;
  }
}
</style>
```

---

## 📊 **推荐实施顺序**

1. **立即实施**: 方案B（重置CodeMirror-line样式）
2. **次优先**: 方案C（重置fontSize变量）
3. **长期方案**: 方案D（CSS隔离）

---

## 🎯 **预期效果**

修复后，切换时应该：
1. CodeMirror高度保持574px
2. 显示行数保持约85行
3. 每行高度约6.75px
4. 无论切换多少次都稳定

---

## 📝 **验证方法**

### 快速验证

```javascript
// 切换后立即运行
const cm = document.querySelector('.CodeMirror');
const lines = document.querySelectorAll('.CodeMirror-line');
console.log('容器高度:', cm.offsetHeight);
console.log('可见行数:', lines.length);
console.log('第一行高度:', lines[0].offsetHeight);
console.log('理论行高:', cm.offsetHeight / lines.length);

// 应该输出类似：
// 容器高度: 574
// 可见行数: 85  ← 关键！应该回到85行
// 第一行高度: 约6-7
// 理论行高: 约6.75
```

---

## 🚨 **如果问题仍然存在**

说明污染来源更深层，可能需要：

1. **检查全局CSS污染**
   ```javascript
   // 检查body的line-height
   console.log('body line-height:', getComputedStyle(document.body).lineHeight);
   ```

2. **检查UEditor是否修改了CodeMirror原型**
   ```javascript
   console.log('CodeMirror.defaults:', window.CodeMirror.defaults);
   ```

3. **检查是否有全局事件监听器在干扰**
   ```javascript
   console.log('CodeMirror事件:', window.CodeMirror.on);
   ```

4. **最极端的方案：在切换时完全销毁并重建CodeMirror**
   ```javascript
   // 销毁旧实例
   const oldCm = this.$refs.editor.getEditor();
   oldCm.toTextArea();
   
   // 重新创建
   this.$refs.editor.mounted();
   ```
