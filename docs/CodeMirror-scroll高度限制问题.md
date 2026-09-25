# CodeMirror高度问题 - 终极根因确认

## 🎯 **问题确认**

### 诊断数据对比

| 指标 | 初次加载 | 切换后 | 分析 |
|------|---------|--------|------|
| CodeMirror容器 | 574px | 574px | ✅ 相同 |
| **CodeMirror-scroll** | **624px** | **350px** | ❌ **被限制了！** |
| CodeMirror-sizer | 974px | 613px | ⚠️ 减小 |
| 第一行高度 | 21px | 14px | ✅ 修复成功 |
| 可见行数 | 26行 | 26行 | 相同 |
| 总行数 | 89行 | 89行 | 相同 |

### 根本原因

**`.CodeMirror-scroll` 的高度被限制为350px！**

原因：
1. 初次加载时：`.CodeMirror-scroll` 高度624px > 容器574px（正常，内容可滚动）
2. 切换后：`.CodeMirror-scroll` 高度被限制为350px < 容器574px（异常！）

这导致即使容器有574px的空间，CodeMirror内容区域只能显示350px。

---

## 🐛 **可能的污染源**

### 污染源1：max-height被设置

UEditor可能设置了：
```css
.CodeMirror-scroll {
  max-height: 350px !important;
}
```

### 污染源2：height被固定

UEditor可能设置了：
```javascript
document.querySelector('.CodeMirror-scroll').style.height = '350px';
```

### 污染源3：父容器被污染

某个父容器的样式导致 `.CodeMirror-scroll` 无法正常扩展。

---

## 🛠️ **最终修复方案**

### 在onViewTabChange中添加对`.CodeMirror-scroll`的重置

```javascript
// 在清理CodeMirror元素样式时，特别处理CodeMirror-scroll
const cmScroll = this.$el.querySelector('.CodeMirror-scroll');
if (cmScroll) {
  cmScroll.style.height = '';
  cmScroll.style.minHeight = '';
  cmScroll.style.maxHeight = '';  // ← 关键！清除max-height限制
  cmScroll.style.overflow = '';
}
```

---

## 📊 **预期修复效果**

修复后：
- CodeMirror容器：574px
- CodeMirror-scroll：应该回到600px+（由内容决定）
- 第一行高度：14px（已修复）
- 可见行数：574 ÷ 14 ≈ 41行（而不是当前的26行）

---

## ✅ **验证方法**

修复后运行：
```javascript
const cmScroll = document.querySelector('.CodeMirror-scroll');
console.log('CodeMirror-scroll高度:', cmScroll.offsetHeight);
console.log('CodeMirror-scroll计算样式:', getComputedStyle(cmScroll).height);
console.log('CodeMirror-scroll max-height:', getComputedStyle(cmScroll).maxHeight);
console.log('CodeMirror-scroll内联样式:', cmScroll.style.cssText);

// 预期：
// CodeMirror-scroll高度: 600+ px
// max-height: none
```
