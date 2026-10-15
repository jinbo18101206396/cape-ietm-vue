/**
 * Para公式转换工具 - Jest单元测试
 *
 * 验证公式在HTML↔XML转换过程中的完整性
 */

// ===== 模拟的paraConverter函数 =====

function extractFormulaImages(htmlContent) {
  if (!htmlContent) return [];
  const matches = htmlContent.match(/<img class="kfformula"[^>]*>/g);
  return matches || [];
}

function extractXmlAttribute(formulaImg) {
  const match = formulaImg.match(/xml="([^"]+)"/);
  return match ? match[1] : null;
}

function unescapeXmlAttribute(escapedXml) {
  if (!escapedXml) return '';
  return escapedXml
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function escapeXmlForAttribute(xml) {
  if (!xml) return '';
  return xml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formulaHtmlToXmlSymbol(formulaImg, icn, width, height) {
  const escapedFormula = escapeXmlForAttribute(formulaImg);
  return `<symbol infoEntityIdent="${icn}" reproductionWidth="${width}" reproductionHeight="${height}" reproductionScale="100" xml="${escapedFormula}"></symbol>`;
}

function symbolXmlToFormulaHtml(symbolXml) {
  const xmlMatch = symbolXml.match(/xml="([^"]*(?:&[^;]+;[^"]*)*)"/);
  if (!xmlMatch) return null;
  const formulaImg = unescapeXmlAttribute(xmlMatch[1]);
  return formulaImg;
}

function html2paraWithFormulas(html, cmnodeid, dmCode) {
  if (!html) return { xml: '', formulaCount: 0 };

  let xml = html;
  const formulaImages = extractFormulaImages(html);
  let newFormulaCount = 0;

  for (const formulaImg of formulaImages) {
    const xmlAttr = extractXmlAttribute(formulaImg);

    if (xmlAttr) {
      const unescaped = unescapeXmlAttribute(xmlAttr);
      xml = xml.replace(formulaImg, unescaped);
    } else {
      const icn = `ICN-TEST-A-TEST-${++newFormulaCount}-A-001-01`;
      const symbolTag = formulaHtmlToXmlSymbol(formulaImg, icn, 100, 50);
      xml = xml.replace(formulaImg, symbolTag);
    }
  }

  return { xml, formulaCount: newFormulaCount };
}

function para2htmlWithFormulas(xml) {
  if (!xml) return '';

  let html = xml;
  const symbols = html.match(/<symbol[^>]*>[\s\S]*?<\/symbol>/g) || [];

  for (const symbol of symbols) {
    const xmlMatch = symbol.match(/xml="([^"]*(?:&[^;]+;[^"]*)*)"/);
    if (xmlMatch) {
      const formulaImg = unescapeXmlAttribute(xmlMatch[1]);
      html = html.replace(symbol, formulaImg);
    }
  }

  return html;
}

// ===== Jest 单元测试 =====

describe('Para公式编辑功能 - 代码级单元测试', () => {
  const mockFormulaImg = '<img class="kfformula" src="data:image/png;base64,iVBORw0K..." width="100" height="50" />';
  const mockFormulaImgWithXml = `<img class="kfformula" src="data:image/png;base64,..." xml="&lt;symbol infoEntityIdent=&quot;ICN-TEST&quot;&gt;&lt;/symbol&gt;" />`;
  const mockSymbolXml = `<symbol infoEntityIdent="ICN-TEST-A-TEST-1-A-001-01" reproductionWidth="100" reproductionHeight="50" reproductionScale="100" xml="&lt;img class=&quot;kfformula&quot; src=&quot;data:image/png;base64,...&quot; /&gt;"></symbol>`;

  // ========== 第1组：HTML解析能力 ==========
  describe('【第1组】HTML中的公式提取', () => {
    test('T1.1: 应从HTML中正确提取单个kfformula标签', () => {
      const html = `<p>计算公式：${mockFormulaImg}</p>`;
      const formulas = extractFormulaImages(html);

      expect(formulas).toHaveLength(1);
      expect(formulas[0]).toContain('kfformula');
      expect(formulas[0]).toContain('src=');
      expect(formulas[0]).toContain('width="100"');
      expect(formulas[0]).toContain('height="50"');
    });

    test('T1.2: 应从HTML中正确提取多个kfformula标签', () => {
      const html = `<p>
        公式1：${mockFormulaImg}
        公式2：${mockFormulaImg}
        公式3：${mockFormulaImg}
      </p>`;
      const formulas = extractFormulaImages(html);

      expect(formulas).toHaveLength(3);
      formulas.forEach(f => {
        expect(f).toContain('kfformula');
      });
    });

    test('T1.3: HTML不含公式时应返回空数组', () => {
      const html = '<p>这是普通文本，没有公式</p>';
      const formulas = extractFormulaImages(html);

      expect(formulas).toHaveLength(0);
    });

    test('T1.4: 应忽略格式错误的img标签', () => {
      const html = '<p>这是<img broken>标签</p>';
      const formulas = extractFormulaImages(html);

      expect(formulas).toHaveLength(0);
    });
  });

  // ========== 第2组：XML属性处理 ==========
  describe('【第2组】XML属性的转义/反转义', () => {
    test('T2.1: 应正确转义XML特殊字符', () => {
      const original = '<symbol test="value">内容</symbol>';
      const escaped = escapeXmlForAttribute(original);

      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
      expect(escaped).toContain('&quot;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
    });

    test('T2.2: 应正确反转义XML属性值', () => {
      const escaped = '&lt;symbol&gt;&lt;/symbol&gt;';
      const original = unescapeXmlAttribute(escaped);

      expect(original).toBe('<symbol></symbol>');
    });

    test('T2.3: 转义→反转义应得到原始值（往返一致性）', () => {
      const original = '<symbol test="value">内容</symbol>';
      const escaped = escapeXmlForAttribute(original);
      const restored = unescapeXmlAttribute(escaped);

      expect(restored).toBe(original);
    });

    test('T2.4: 应处理包含特殊字符的xml属性', () => {
      const original = '&<>"\'`';
      const escaped = escapeXmlForAttribute(original);
      const restored = unescapeXmlAttribute(escaped);

      expect(restored).toBe(original);
    });

    test('T2.5: 新公式img标签中不应有xml属性', () => {
      const xml = extractXmlAttribute(mockFormulaImg);

      expect(xml).toBeNull();
    });

    test('T2.6: 已保存的公式img标签应有xml属性', () => {
      const xml = extractXmlAttribute(mockFormulaImgWithXml);

      expect(xml).toBeTruthy();
      expect(xml).toContain('symbol');
    });
  });

  // ========== 第3组：公式HTML→XML转换 ==========
  describe('【第3组】公式HTML转XML（设计→源码）', () => {
    test('T3.1: 应将公式img转换为symbol标签', () => {
      const icn = 'ICN-TEST-A-TEST-1-A-001-01';
      const symbol = formulaHtmlToXmlSymbol(mockFormulaImg, icn, 100, 50);

      expect(symbol).toContain('symbol');
      expect(symbol).toContain(`infoEntityIdent="${icn}"`);
      expect(symbol).toContain('reproductionWidth="100"');
      expect(symbol).toContain('reproductionHeight="50"');
      expect(symbol).toContain('reproductionScale="100"');
      expect(symbol).toContain('xml="');
    });

    test('T3.2: 公式img中的特殊字符应被转义', () => {
      const formulaWithSpecialChars = '<img class="kfformula" data-test="value&<>" />';
      const symbol = formulaHtmlToXmlSymbol(formulaWithSpecialChars, 'ICN-TEST', 100, 50);

      // xml属性应包含转义的标签
      expect(symbol).toContain('&lt;img');
      expect(symbol).toContain('&gt;');
      expect(symbol).toContain('&amp;');
    });

    test('T3.3: Symbol标签应包含原始公式的完整信息', () => {
      const symbol = formulaHtmlToXmlSymbol(mockFormulaImg, 'ICN-TEST', 200, 80);

      // 能否从symbol中恢复原始公式
      const xmlMatch = symbol.match(/xml="([^"]*(?:&[^;]+;[^"]*)*)"/);
      expect(xmlMatch).toBeTruthy();

      const formulaImg = unescapeXmlAttribute(xmlMatch[1]);
      expect(formulaImg).toContain('kfformula');
      expect(formulaImg).toContain('src=');
    });

    test('T3.4: 新公式应生成正确的symbol标签', () => {
      const html = `<p>公式：${mockFormulaImg}</p>`;
      const { xml, formulaCount } = html2paraWithFormulas(html, 'NODE-ID', 'DM-CODE');

      expect(xml).toContain('symbol');
      expect(xml).toContain('infoEntityIdent=');
      expect(formulaCount).toBe(1);
    });

    test('T3.5: 多个新公式应都转换为symbol标签', () => {
      const html = `<p>
        公式1：${mockFormulaImg}
        公式2：${mockFormulaImg}
      </p>`;
      const { xml, formulaCount } = html2paraWithFormulas(html, 'NODE-ID', 'DM-CODE');

      const symbolCount = (xml.match(/<symbol/g) || []).length;
      expect(symbolCount).toBe(2);
      expect(formulaCount).toBe(2);
    });

    test('T3.6: 已保存的公式应保留xml属性', () => {
      const html = `<p>公式：${mockFormulaImgWithXml}</p>`;
      const { xml, formulaCount } = html2paraWithFormulas(html, 'NODE-ID', 'DM-CODE');

      expect(xml).toContain('symbol');
      expect(xml).toContain('xml="');
      expect(formulaCount).toBe(0); // 不计新公式
    });
  });

  // ========== 第4组：公式XML→HTML转换 ==========
  describe('【第4组】公式XML转HTML（源码→设计）', () => {
    test('T4.1: 应将symbol标签转换回公式img', () => {
      const symbol = `<symbol infoEntityIdent="ICN-TEST" xml="&lt;img class=&quot;kfformula&quot; src=&quot;data:image/png&quot; /&gt;"></symbol>`;
      const formulaImg = symbolXmlToFormulaHtml(symbol);

      expect(formulaImg).toBeTruthy();
      expect(formulaImg).toContain('img');
      expect(formulaImg).toContain('kfformula');
      expect(formulaImg).toContain('src=');
    });

    test('T4.2: 不含xml属性的symbol应返回null', () => {
      const symbol = '<symbol infoEntityIdent="ICN-TEST"></symbol>';
      const formulaImg = symbolXmlToFormulaHtml(symbol);

      expect(formulaImg).toBeNull();
    });

    test('T4.3: 应保留转义后的特殊字符', () => {
      const symbol = `<symbol xml="&lt;img data=&quot;value&amp;test&quot; /&gt;"></symbol>`;
      const formulaImg = symbolXmlToFormulaHtml(symbol);

      expect(formulaImg).toContain('<img');
      expect(formulaImg).toContain('&');
      expect(formulaImg).toContain('"');
    });

    test('T4.4: XML转HTML后应能正确提取公式数量', () => {
      const xml = `<p>
        ${mockSymbolXml}
        ${mockSymbolXml}
      </p>`;
      const html = para2htmlWithFormulas(xml);

      const formulas = extractFormulaImages(html);
      expect(formulas).toHaveLength(2);
    });
  });

  // ========== 第5组：往返转换一致性（关键验证） ==========
  describe('【第5组】往返转换一致性（关键）', () => {
    test('T5.1: 新公式设计→源码→设计完整循环，公式应完整保留', () => {
      // 第1步：设计视图HTML（新公式）
      const designHtml = `<p>计算公式：${mockFormulaImg}</p>`;

      // 第2步：HTML→XML保存
      const { xml: sourceXml, formulaCount } = html2paraWithFormulas(
        designHtml,
        'NODE-ID',
        'DM-CODE'
      );

      expect(formulaCount).toBe(1);
      expect(sourceXml).toContain('symbol');
      expect(sourceXml).toContain('xml="');

      // 第3步：XML→HTML回到设计
      const designHtmlRestored = para2htmlWithFormulas(sourceXml);

      // 验证：公式应完整恢复
      const formulas = extractFormulaImages(designHtmlRestored);
      expect(formulas).toHaveLength(1);
      expect(formulas[0]).toContain('kfformula');
      expect(formulas[0]).toContain('src=');
    });

    test('T5.2: 已保存的公式在往返中应保持xml属性', () => {
      // 设计视图HTML（已保存的公式）
      const designHtml = `<p>公式：${mockFormulaImgWithXml}</p>`;

      // HTML→XML
      const { xml: sourceXml, formulaCount } = html2paraWithFormulas(
        designHtml,
        'NODE-ID',
        'DM-CODE'
      );

      expect(formulaCount).toBe(0);
      expect(sourceXml).toContain('xml="');

      // XML→HTML
      const designHtmlRestored = para2htmlWithFormulas(sourceXml);

      // 验证：xml属性应保留
      expect(designHtmlRestored).toContain('xml="');
    });

    test('T5.3: 多个公式（新旧混合）在往返中应全部完整', () => {
      // 设计视图：3个公式（2个新，1个已保存）
      const designHtml = `<p>
        新公式1：${mockFormulaImg}
        已保存：${mockFormulaImgWithXml}
        新公式2：${mockFormulaImg}
      </p>`;

      // HTML→XML
      const { xml: sourceXml, formulaCount } = html2paraWithFormulas(
        designHtml,
        'NODE-ID',
        'DM-CODE'
      );

      expect(formulaCount).toBe(2);
      const symbolCount = (sourceXml.match(/<symbol/g) || []).length;
      expect(symbolCount).toBe(3);

      // XML→HTML
      const designHtmlRestored = para2htmlWithFormulas(sourceXml);

      // 验证：3个公式都应恢复
      const formulas = extractFormulaImages(designHtmlRestored);
      expect(formulas).toHaveLength(3);

      // 验证：已保存的公式应保留xml属性
      expect(designHtmlRestored).toContain('xml="');
    });

    test('T5.4: 公式在往返中不应丢失任何属性', () => {
      // 原始公式属性
      const formulaWithAttrs = `<img class="kfformula" src="data:image/png;base64,..." width="150" height="75" data-id="test-123" />`;
      const designHtml = `<p>${formulaWithAttrs}</p>`;

      // 转换循环
      const { xml: sourceXml } = html2paraWithFormulas(designHtml, 'ID', 'CODE');
      const designHtmlRestored = para2htmlWithFormulas(sourceXml);

      // 验证：关键属性应保留
      expect(designHtmlRestored).toContain('kfformula');
      expect(designHtmlRestored).toContain('src=');
      expect(designHtmlRestored).toContain('width=');
      expect(designHtmlRestored).toContain('height=');
    });

    test('T5.5: 连续多次转换应保持稳定', () => {
      const originalHtml = `<p>公式：${mockFormulaImg}</p>`;

      // 第1次循环
      const { xml: xml1 } = html2paraWithFormulas(originalHtml, 'ID', 'CODE');
      const html1 = para2htmlWithFormulas(xml1);

      // 第2次循环
      const { xml: xml2 } = html2paraWithFormulas(html1, 'ID', 'CODE');
      const html2 = para2htmlWithFormulas(xml2);

      // 第3次循环
      const { xml: xml3 } = html2paraWithFormulas(html2, 'ID', 'CODE');
      const html3 = para2htmlWithFormulas(xml3);

      // 验证：公式数量应保持一致
      const formulas1 = extractFormulaImages(html1);
      const formulas2 = extractFormulaImages(html2);
      const formulas3 = extractFormulaImages(html3);

      expect(formulas1).toHaveLength(1);
      expect(formulas2).toHaveLength(1);
      expect(formulas3).toHaveLength(1);
    });
  });

  // ========== 第6组：边界情况处理 ==========
  describe('【第6组】边界情况和容错能力', () => {
    test('T6.1: HTML为null/undefined应正确处理', () => {
      const { xml: xml1 } = html2paraWithFormulas(null, 'ID', 'CODE');
      const { xml: xml2 } = html2paraWithFormulas(undefined, 'ID', 'CODE');

      expect(xml1).toBe('');
      expect(xml2).toBe('');
    });

    test('T6.2: HTML为空字符串应正确处理', () => {
      const { xml } = html2paraWithFormulas('', 'ID', 'CODE');

      expect(xml).toBe('');
    });

    test('T6.3: XML为null/undefined应正确处理', () => {
      const html1 = para2htmlWithFormulas(null);
      const html2 = para2htmlWithFormulas(undefined);

      expect(html1).toBe('');
      expect(html2).toBe('');
    });

    test('T6.4: 包含HTML标签的公式应正确转义', () => {
      const formulaWithHtml = '<img class="kfformula" onclick="alert(1)" />';
      const symbol = formulaHtmlToXmlSymbol(formulaWithHtml, 'ICN', 100, 50);

      // onclick应被转义，不能直接执行
      expect(symbol).toContain('&lt;img');
      expect(symbol).not.toContain('onclick="alert');
    });

    test('T6.5: 包含国际字符的公式应正确处理', () => {
      const formulaWithIntl = '<img class="kfformula" data-formula="中文+数学符号" />';
      const symbol = formulaHtmlToXmlSymbol(formulaWithIntl, 'ICN', 100, 50);

      expect(symbol).toContain('symbol');
      expect(symbol).toContain('xml="');

      // 恢复
      const restored = symbolXmlToFormulaHtml(symbol);
      expect(restored).toContain('中文');
    });

    test('T6.6: 嵌套的特殊字符应正确处理', () => {
      const complex = '&lt;&gt;&quot;&amp;';
      const escaped = escapeXmlForAttribute(complex);
      const unescaped = unescapeXmlAttribute(escaped);

      expect(unescaped).toBe(complex);
    });
  });

  // ========== 第7组：数据完整性验证 ==========
  describe('【第7组】数据完整性（最终验证）', () => {
    test('T7.1: 公式不应在任何转换步骤中丢失', () => {
      const formulas = [
        mockFormulaImg,
        mockFormulaImg,
        mockFormulaImgWithXml
      ];

      for (const formula of formulas) {
        const html = `<p>${formula}</p>`;

        // HTML → XML → HTML
        const { xml } = html2paraWithFormulas(html, 'ID', 'CODE');
        const restored = para2htmlWithFormulas(xml);

        // 验证公式数量
        const extractedFormulas = extractFormulaImages(restored);
        expect(extractedFormulas.length).toBeGreaterThan(0);
      }
    });

    test('T7.2: 公式属性不应在转换中损坏', () => {
      const formula = '<img class="kfformula" src="data:image/png;base64,abc123" width="200" height="100" />';
      const html = `<p>${formula}</p>`;

      const { xml } = html2paraWithFormulas(html, 'ID', 'CODE');
      const restored = para2htmlWithFormulas(xml);

      // 恢复的公式应包含原始属性
      expect(restored).toContain('kfformula');
      expect(restored).toContain('data:image/png');
      expect(restored).toContain('200');
      expect(restored).toContain('100');
    });

    test('T7.3: 非公式内容不应受到影响', () => {
      const html = '<p>普通文本<strong>加粗</strong>和公式${mockFormulaImg}结束</p>';

      const { xml } = html2paraWithFormulas(html, 'ID', 'CODE');
      const restored = para2htmlWithFormulas(xml);

      // 普通内容应保留
      expect(restored).toContain('普通文本');
      expect(restored).toContain('加粗');
      expect(restored).toContain('结束');
    });
  });
});
