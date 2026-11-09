/**
 * DM预览上标样式诊断脚本
 *
 * 在浏览器控制台中运行此脚本，诊断上标样式问题
 */

console.log('===== DM预览上标样式诊断 =====\n');

// 1. 检查是否在预览弹出框页面
const modal = document.querySelector('.ant-modal:has-text("DM内容预览")') ||
              document.querySelector('.ant-modal-wrap');

if (!modal) {
  console.error('❌ 未找到预览弹出框，请先打开预览');
  console.log('提示：点击编辑器工具栏的"预览"按钮');
} else {
  console.log('✓ 找到预览弹出框');

  // 2. 检查iframe
  const iframe = modal.querySelector('iframe');
  if (!iframe) {
    console.error('❌ 未找到iframe元素');
  } else {
    console.log('✓ 找到iframe元素');

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const iframeBody = iframeDoc.body;

      if (!iframeBody) {
        console.error('❌ 无法访问iframe内容');
      } else {
        console.log('✓ 可以访问iframe内容\n');

        // 3. 检查是否有sup标签
        const supElements = iframeDoc.querySelectorAll('sup');
        console.log(`📊 找到 ${supElements.length} 个 <sup> 标签`);

        if (supElements.length === 0) {
          console.warn('⚠️  没有找到<sup>标签');
          console.log('可能原因：');
          console.log('  1. 后端返回的HTML中没有<superScript>标签');
          console.log('  2. 前端转换逻辑未执行');
          console.log('  3. 该DM内容中确实没有上标');

          // 检查是否有superScript标签（未转换）
          const bodyHTML = iframeBody.innerHTML;
          if (bodyHTML.includes('<superScript>') || bodyHTML.includes('superScript')) {
            console.error('❌ 发现未转换的<superScript>标签！');
            console.log('   前端转换逻辑可能未生效，需要重新编译');
          }
        } else {
          console.log('\n逐个检查<sup>元素的样式：\n');

          supElements.forEach((sup, index) => {
            const styles = window.getComputedStyle(sup);
            const text = sup.textContent;

            console.log(`--- <sup> #${index + 1}: "${text}" ---`);
            console.log(`  vertical-align: ${styles.verticalAlign}`);
            console.log(`  font-size: ${styles.fontSize}`);
            console.log(`  line-height: ${styles.lineHeight}`);

            // 验证样式是否正确
            const isCorrect =
              styles.verticalAlign === 'super' &&
              parseFloat(styles.fontSize) < parseFloat(window.getComputedStyle(sup.parentElement).fontSize);

            if (isCorrect) {
              console.log(`  ✅ 样式正确`);
            } else {
              console.log(`  ❌ 样式错误`);
              if (styles.verticalAlign !== 'super') {
                console.log(`     问题：vertical-align 应该是 'super'，实际是 '${styles.verticalAlign}'`);
              }
            }
            console.log('');
          });

          // 4. 检查CSS规则是否存在
          console.log('📋 检查CSS样式表中的sup规则：\n');
          let foundSupRule = false;

          Array.from(iframeDoc.styleSheets).forEach((sheet, sheetIndex) => {
            try {
              Array.from(sheet.cssRules || []).forEach((rule, ruleIndex) => {
                if (rule.selectorText === 'sup') {
                  foundSupRule = true;
                  console.log(`✓ 找到sup样式规则（styleSheet #${sheetIndex}, rule #${ruleIndex}）：`);
                  console.log(`  vertical-align: ${rule.style.verticalAlign}`);
                  console.log(`  font-size: ${rule.style.fontSize}`);
                  console.log(`  line-height: ${rule.style.lineHeight}`);
                }
              });
            } catch (e) {
              // CORS或其他问题，跳过
            }
          });

          if (!foundSupRule) {
            console.error('❌ 未找到sup的CSS规则！');
            console.log('原因：CSS样式未注入到iframe中');
            console.log('解决：需要重新编译前端或强制刷新浏览器');
          }
        }
      }
    } catch (e) {
      console.error('❌ 访问iframe内容时出错：', e.message);
      console.log('可能是跨域问题或iframe未加载完成');
    }
  }
}

console.log('\n===== 诊断完成 =====');
console.log('\n💡 如果发现问题，请尝试：');
console.log('1. 在终端中重启前端服务：npm run serve');
console.log('2. 在浏览器中按 Ctrl+Shift+R 强制刷新');
console.log('3. 重新打开预览弹出框');
console.log('4. 再次运行此诊断脚本');
