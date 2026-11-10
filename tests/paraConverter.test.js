/**
 * paraConverter.js 格式标签转换测试套件
 * 测试目标：验证HTML ↔ S1000D双向转换的正确性
 */

// 模拟测试环境
const testCases = {
  // 测试用例组A: HTML → S1000D 转换
  html2para: [
    {
      name: 'A1: 粗体 <b> → <emphasis emph="em01">',
      input: '<p><b>粗体文本</b></p>',
      expected: '<para><emphasis emph="em01">粗体文本</emphasis></para>',
      priority: 'P0'
    },
    {
      name: 'A2: 粗体 <strong> → <emphasis emph="em01">',
      input: '<p><strong>粗体文本</strong></p>',
      expected: '<para><emphasis emph="em01">粗体文本</emphasis></para>',
      priority: 'P0'
    },
    {
      name: 'A3: 斜体 <i> → <emphasis emph="em02">',
      input: '<p><i>斜体文本</i></p>',
      expected: '<para><emphasis emph="em02">斜体文本</emphasis></para>',
      priority: 'P0'
    },
    {
      name: 'A4: 斜体 <em> → <emphasis emph="em02">',
      input: '<p><em>斜体文本</em></p>',
      expected: '<para><emphasis emph="em02">斜体文本</emphasis></para>',
      priority: 'P0'
    },
    {
      name: 'A5: 下划线 <u> → <emphasis emph="em03">',
      input: '<p><u>下划线文本</u></p>',
      expected: '<para><emphasis emph="em03">下划线文本</emphasis></para>',
      priority: 'P0'
    },
    {
      name: 'A6: 删除线 <s> → <delete>',
      input: '<p><s>删除线文本</s></p>',
      expected: '<para><delete>删除线文本</delete></para>',
      priority: 'P0'
    },
    {
      name: 'A7: 删除线 <del> → <delete>',
      input: '<p><del>删除线文本</del></p>',
      expected: '<para><delete>删除线文本</delete></para>',
      priority: 'P0'
    },
    {
      name: 'A8: 删除线 <strike> → <delete>',
      input: '<p><strike>删除线文本</strike></p>',
      expected: '<para><delete>删除线文本</delete></para>',
      priority: 'P0'
    },
    {
      name: 'A9: 高亮 <mark> → <emphasis emph="em04">',
      input: '<p><mark>高亮文本</mark></p>',
      expected: '<para><emphasis emph="em04">高亮文本</emphasis></para>',
      priority: 'P0'
    },
    {
      name: 'A10: 插入 <ins> → <emphasis emph="em03">',
      input: '<p><ins>插入文本</ins></p>',
      expected: '<para><emphasis emph="em03">插入文本</emphasis></para>',
      priority: 'P1'
    },
    {
      name: 'A11: 嵌套标签 <b><i>',
      input: '<p><b><i>粗斜体</i></b></p>',
      expected: '<para><emphasis emph="em01"><emphasis emph="em02">粗斜体</emphasis></emphasis></para>',
      priority: 'P0'
    },
    {
      name: 'A12: 嵌套标签 <u><s>',
      input: '<p><u><s>下划删除</s></u></p>',
      expected: '<para><emphasis emph="em03"><delete>下划删除</delete></emphasis></para>',
      priority: 'P1'
    },
    {
      name: 'A13: 多层嵌套 <b><i><u>',
      input: '<p><b><i><u>三重格式</u></i></b></p>',
      expected: '<para><emphasis emph="em01"><emphasis emph="em02"><emphasis emph="em03">三重格式</emphasis></emphasis></emphasis></para>',
      priority: 'P1'
    },
    {
      name: 'A14: 混合文本',
      input: '<p>前文<b>中间</b>后文</p>',
      expected: '<para>前文<emphasis emph="em01">中间</emphasis>后文</para>',
      priority: 'P0'
    },
    {
      name: 'A15: 空标签处理',
      input: '<p><b></b></p>',
      expected: '<para><emphasis emph="em01"></emphasis></para>',
      priority: 'P2'
    },
    {
      name: 'A16: 带属性的标签',
      input: '<p><strong class="test" style="color:red">文本</strong></p>',
      expected: '<para><emphasis emph="em01">文本</emphasis></para>',
      priority: 'P1'
    }
  ],

  // 测试用例组B: S1000D → HTML 转换
  para2html: [
    {
      name: 'B1: <emphasis emph="em01"> → <strong>',
      input: '<para><emphasis emph="em01">粗体</emphasis></para>',
      expected: '<p><strong>粗体</strong></p>',
      priority: 'P0'
    },
    {
      name: 'B2: <emphasis emph="bold"> → <strong>',
      input: '<para><emphasis emph="bold">粗体</emphasis></para>',
      expected: '<p><strong>粗体</strong></p>',
      priority: 'P1'
    },
    {
      name: 'B3: <emphasis emph="em02"> → <em>',
      input: '<para><emphasis emph="em02">斜体</emphasis></para>',
      expected: '<p><em>斜体</em></p>',
      priority: 'P0'
    },
    {
      name: 'B4: <emphasis emph="italic"> → <em>',
      input: '<para><emphasis emph="italic">斜体</emphasis></para>',
      expected: '<p><em>斜体</em></p>',
      priority: 'P1'
    },
    {
      name: 'B5: <emphasis emph="em03"> → <u>',
      input: '<para><emphasis emph="em03">下划线</emphasis></para>',
      expected: '<p><u>下划线</u></p>',
      priority: 'P0'
    },
    {
      name: 'B6: <emphasis emph="underscr"> → <u>',
      input: '<para><emphasis emph="underscr">下划线</emphasis></para>',
      expected: '<p><u>下划线</u></p>',
      priority: 'P1'
    },
    {
      name: 'B7: <emphasis emph="em04"> → <mark>',
      input: '<para><emphasis emph="em04">高亮</emphasis></para>',
      expected: '<p><mark>高亮</mark></p>',
      priority: 'P0'
    },
    {
      name: 'B8: <emphasis emph="em05"> → <s>',
      input: '<para><emphasis emph="em05">删除</emphasis></para>',
      expected: '<p><s>删除</s></p>',
      priority: 'P1'
    },
    {
      name: 'B9: <emphasis> (无属性) → <strong>',
      input: '<para><emphasis>粗体</emphasis></para>',
      expected: '<p><strong>粗体</strong></p>',
      priority: 'P0'
    },
    {
      name: 'B10: <delete> → <s>',
      input: '<para><delete>删除线</delete></para>',
      expected: '<p><s>删除线</s></p>',
      priority: 'P0'
    },
    {
      name: 'B11: 嵌套emphasis',
      input: '<para><emphasis emph="em01"><emphasis emph="em02">粗斜体</emphasis></emphasis></para>',
      expected: '<p><strong><em>粗斜体</em></strong></p>',
      priority: 'P0'
    },
    {
      name: 'B12: 带其他属性的emphasis',
      input: '<para><emphasis emph="em01" applicRefId="app01">文本</emphasis></para>',
      expected: '<p><strong>文本</strong></p>',
      priority: 'P1'
    },
    {
      name: 'B13: 空emphasis',
      input: '<para><emphasis emph="em02"></emphasis></para>',
      expected: '<p><em></em></p>',
      priority: 'P2'
    }
  ],

  // 测试用例组C: 往返一致性
  roundtrip: [
    {
      name: 'C1: 粗体往返',
      start: '<p><b>粗体</b></p>',
      s1000d: '<para><emphasis emph="em01">粗体</emphasis></para>',
      end: '<p><strong>粗体</strong></p>',
      visual: '粗体显示',
      priority: 'P0'
    },
    {
      name: 'C2: 斜体往返',
      start: '<p><i>斜体</i></p>',
      s1000d: '<para><emphasis emph="em02">斜体</emphasis></para>',
      end: '<p><em>斜体</em></p>',
      visual: '斜体显示',
      priority: 'P0'
    },
    {
      name: 'C3: 下划线往返',
      start: '<p><u>下划线</u></p>',
      s1000d: '<para><emphasis emph="em03">下划线</emphasis></para>',
      end: '<p><u>下划线</u></p>',
      visual: '下划线显示',
      priority: 'P0'
    },
    {
      name: 'C4: 删除线往返',
      start: '<p><s>删除线</s></p>',
      s1000d: '<para><delete>删除线</delete></para>',
      end: '<p><s>删除线</s></p>',
      visual: '删除线显示',
      priority: 'P0'
    },
    {
      name: 'C5: 高亮往返',
      start: '<p><mark>高亮</mark></p>',
      s1000d: '<para><emphasis emph="em04">高亮</emphasis></para>',
      end: '<p><mark>高亮</mark></p>',
      visual: '高亮显示',
      priority: 'P0'
    },
    {
      name: 'C6: 嵌套格式往返',
      start: '<p><b><i>粗斜体</i></b></p>',
      s1000d: '<para><emphasis emph="em01"><emphasis emph="em02">粗斜体</emphasis></emphasis></para>',
      end: '<p><strong><em>粗斜体</em></strong></p>',
      visual: '粗斜体显示',
      priority: 'P0'
    }
  ]
};

console.log('格式标签转换测试套件已加载');
console.log('测试用例统计:');
console.log('  - HTML → S1000D:', testCases.html2para.length, '个');
console.log('  - S1000D → HTML:', testCases.para2html.length, '个');
console.log('  - 往返一致性:', testCases.roundtrip.length, '个');
console.log('  总计:', testCases.html2para.length + testCases.para2html.length + testCases.roundtrip.length, '个测试用例');
