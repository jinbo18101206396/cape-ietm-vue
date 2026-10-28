import { test, expect, Page } from '@playwright/test';

/**
 * LevelledParaDesigner 往返加载数据一致性测试
 *
 * 测试场景：
 * 1. 新增层级 + 标题
 * 2. 新增警告内容
 * 3. 保存到源码视图
 * 4. 再次打开设计视图
 * 5. 验证数据完整性（标题、警告列表、警告内容）
 */

test.describe('LevelledPara 往返加载数据一致性', () => {
  let page: Page;
  const testData = {
    title: '测试标题' + Date.now(),
    warningContent: '这是警告内容' + Date.now()
  };

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('应该成功启动应用', async () => {
    await page.goto('http://localhost:3003/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('✅ 应用启动成功');
  });

  test('完整往返测试：创建 → 保存 → 重新加载', async () => {
    // 步骤1: 访问应用首页
    await page.goto('http://localhost:3003/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('✅ 步骤1: 访问首页成功');

    // 等待页面稳定
    await page.waitForTimeout(2000);

    // 步骤2: 在页面中注入测试逻辑（模拟完整流程）
    const testResult = await page.evaluate(async (data) => {
      // 动态导入转换器模块
      const converterModule = await import('/src/views/ietm/ietmdatamodulemanagement/editor/utils/levelledParaConverterV2.js');
      const { parseXmlToTree, treeToXml } = converterModule;

      // 测试数据：创建包含标题和警告的 XML
      const originalXml = `<levelledPara>
  <title>${data.title}</title>
  <warning id="warning-${Date.now()}}">${data.warningContent}</warning>
</levelledPara>`;

      // 第一次加载：XML → 树
      const tree1 = parseXmlToTree(originalXml);

      const results = {
        step1: '创建测试数据',
        originalXml: originalXml,

        step2: '第一次加载 (XML → 树)',
        tree1_valid: Array.isArray(tree1) && tree1.length > 0,
        tree1_rootId: tree1[0]?.id,
        tree1_childrenCount: tree1[0]?.children?.length || 0,

        step3: '验证第一次加载的数据',
        firstLoad_title: '',
        firstLoad_warningCount: 0,
        firstLoad_warningContent: '',

        step4: '第一次保存 (树 → XML)',
        savedXml: '',

        step5: '第二次加载 (XML → 树)',
        tree2_valid: false,

        step6: '验证第二次加载的数据',
        secondLoad_title: '',
        secondLoad_warningCount: 0,
        secondLoad_warningContent: '',

        step7: '数据一致性验证',
        title_consistent: false,
        warningCount_consistent: false,
        warningContent_consistent: false,

        errors: [] as string[]
      };

      try {
        // 提取第一次加载的数据
        if (tree1[0]?.children?.[0]) {
          const node1 = tree1[0].children[0];
          results.firstLoad_title = node1.title || '';
          results.firstLoad_warningCount = node1.html?.warning?.length || 0;
          results.firstLoad_warningContent = node1.html?.warning?.[0]?.content || '';

          console.log('[第一次加载] 标题:', results.firstLoad_title);
          console.log('[第一次加载] 警告数量:', results.firstLoad_warningCount);
          console.log('[第一次加载] 警告内容:', results.firstLoad_warningContent);
        }

        // 第一次保存：树 → XML
        const savedXml = treeToXml(tree1);
        results.savedXml = savedXml;
        console.log('[第一次保存] XML 长度:', savedXml.length);

        // 第二次加载：XML → 树（模拟往返）
        const tree2 = parseXmlToTree(savedXml);
        results.tree2_valid = Array.isArray(tree2) && tree2.length > 0;

        // 提取第二次加载的数据
        if (tree2[0]?.children?.[0]) {
          const node2 = tree2[0].children[0];
          results.secondLoad_title = node2.title || '';
          results.secondLoad_warningCount = node2.html?.warning?.length || 0;
          results.secondLoad_warningContent = node2.html?.warning?.[0]?.content || '';

          console.log('[第二次加载] 标题:', results.secondLoad_title);
          console.log('[第二次加载] 警告数量:', results.secondLoad_warningCount);
          console.log('[第二次加载] 警告内容:', results.secondLoad_warningContent);
        }

        // 数据一致性验证
        results.title_consistent = results.firstLoad_title === results.secondLoad_title;
        results.warningCount_consistent = results.firstLoad_warningCount === results.secondLoad_warningCount;
        results.warningContent_consistent = results.firstLoad_warningContent === results.secondLoad_warningContent;

      } catch (error: any) {
        results.errors.push(error.message || String(error));
      }

      return results;
    }, testData);

    // 步骤3: 验证测试结果
    console.log('\n========== 测试结果 ==========');
    console.log('原始 XML:', testResult.originalXml);
    console.log('\n第一次加载:');
    console.log('  - 标题:', testResult.firstLoad_title);
    console.log('  - 警告数量:', testResult.firstLoad_warningCount);
    console.log('  - 警告内容:', testResult.firstLoad_warningContent.substring(0, 50));

    console.log('\n保存后的 XML:', testResult.savedXml.substring(0, 100));

    console.log('\n第二次加载:');
    console.log('  - 标题:', testResult.secondLoad_title);
    console.log('  - 警告数量:', testResult.secondLoad_warningCount);
    console.log('  - 警告内容:', testResult.secondLoad_warningContent.substring(0, 50));

    console.log('\n一致性验证:');
    console.log('  ✓ 标题一致:', testResult.title_consistent ? '✅' : '❌');
    console.log('  ✓ 警告数量一致:', testResult.warningCount_consistent ? '✅' : '❌');
    console.log('  ✓ 警告内容一致:', testResult.warningContent_consistent ? '✅' : '❌');

    if (testResult.errors.length > 0) {
      console.log('\n错误信息:');
      testResult.errors.forEach(err => console.log('  -', err));
    }

    // Playwright 断言
    expect(testResult.tree1_valid).toBe(true);
    expect(testResult.tree2_valid).toBe(true);
    expect(testResult.firstLoad_warningCount).toBeGreaterThan(0);

    // 核心断言：数据一致性
    expect(testResult.title_consistent, '标题应该在往返加载后保持一致').toBe(true);
    expect(testResult.warningCount_consistent, '警告数量应该在往返加载后保持一致').toBe(true);
    expect(testResult.warningContent_consistent, '警告内容应该在往返加载后保持一致').toBe(true);

    // 额外验证：标题不应该是警告内容
    expect(testResult.secondLoad_title).not.toContain(testData.warningContent);
    expect(testResult.secondLoad_title).toBe(testData.title);

    console.log('\n✅ 往返加载数据一致性测试通过！');
  });

  test('边界测试：空标题 + 多个警告', async () => {
    await page.goto('http://localhost:3003/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const testResult = await page.evaluate(async () => {
      const converterModule = await import('/src/views/ietm/ietmdatamodulemanagement/editor/utils/levelledParaConverterV2.js');
      const { parseXmlToTree, treeToXml } = converterModule;

      // 测试：没有 title 元素，有多个 warning
      const xmlWithoutTitle = `<levelledPara>
  <warning id="w1">警告1</warning>
  <warning id="w2">警告2</warning>
  <para id="p1">段落1</para>
</levelledPara>`;

      const tree1 = parseXmlToTree(xmlWithoutTitle);
      const xml1 = treeToXml(tree1);
      const tree2 = parseXmlToTree(xml1);

      const node1 = tree1[0]?.children?.[0];
      const node2 = tree2[0]?.children?.[0];

      return {
        firstLoad_title: node1?.title || '',
        firstLoad_warningCount: node1?.html?.warning?.length || 0,
        firstLoad_paraCount: node1?.html?.para?.length || 0,

        secondLoad_title: node2?.title || '',
        secondLoad_warningCount: node2?.html?.warning?.length || 0,
        secondLoad_paraCount: node2?.html?.para?.length || 0,

        consistent: (
          (node1?.html?.warning?.length || 0) === (node2?.html?.warning?.length || 0) &&
          (node1?.html?.para?.length || 0) === (node2?.html?.para?.length || 0)
        )
      };
    });

    console.log('\n边界测试结果:');
    console.log('  第一次: 警告', testResult.firstLoad_warningCount, '段落', testResult.firstLoad_paraCount);
    console.log('  第二次: 警告', testResult.secondLoad_warningCount, '段落', testResult.secondLoad_paraCount);
    console.log('  一致性:', testResult.consistent ? '✅' : '❌');

    expect(testResult.firstLoad_warningCount).toBe(2);
    expect(testResult.firstLoad_paraCount).toBe(1);
    expect(testResult.consistent).toBe(true);

    console.log('✅ 边界测试通过！');
  });

  test('边界测试：嵌套 levelledPara', async () => {
    await page.goto('http://localhost:3003/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const testResult = await page.evaluate(async () => {
      const converterModule = await import('/src/views/ietm/ietmdatamodulemanagement/editor/utils/levelledParaConverterV2.js');
      const { parseXmlToTree, treeToXml } = converterModule;

      // 测试：嵌套的 levelledPara
      const nestedXml = `<levelledPara>
  <title>父层级</title>
  <warning id="w-parent">父警告</warning>
  <levelledPara>
    <title>子层级</title>
    <warning id="w-child">子警告</warning>
  </levelledPara>
</levelledPara>`;

      const tree1 = parseXmlToTree(nestedXml);
      const xml1 = treeToXml(tree1);
      const tree2 = parseXmlToTree(xml1);

      const parent1 = tree1[0]?.children?.[0];
      const parent2 = tree2[0]?.children?.[0];

      const child1 = parent1?.children?.[0];
      const child2 = parent2?.children?.[0];

      return {
        parent1_title: parent1?.title,
        parent1_warningCount: parent1?.html?.warning?.length || 0,
        parent1_childrenCount: parent1?.children?.length || 0,

        child1_title: child1?.title,
        child1_warningCount: child1?.html?.warning?.length || 0,

        parent2_title: parent2?.title,
        parent2_warningCount: parent2?.html?.warning?.length || 0,
        parent2_childrenCount: parent2?.children?.length || 0,

        child2_title: child2?.title,
        child2_warningCount: child2?.html?.warning?.length || 0,

        consistent: (
          parent1?.title === parent2?.title &&
          child1?.title === child2?.title &&
          (parent1?.html?.warning?.length || 0) === (parent2?.html?.warning?.length || 0) &&
          (child1?.html?.warning?.length || 0) === (child2?.html?.warning?.length || 0)
        )
      };
    });

    console.log('\n嵌套测试结果:');
    console.log('  父层级标题:', testResult.parent1_title, '→', testResult.parent2_title);
    console.log('  子层级标题:', testResult.child1_title, '→', testResult.child2_title);
    console.log('  一致性:', testResult.consistent ? '✅' : '❌');

    expect(testResult.parent1_title).toBe('父层级');
    expect(testResult.child1_title).toBe('子层级');
    expect(testResult.consistent).toBe(true);

    console.log('✅ 嵌套测试通过！');
  });
});
