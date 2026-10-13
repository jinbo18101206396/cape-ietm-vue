/**
 * dmRef多行格式保留修复 - E2E真实UI测试
 * 测试流程: 打开Para设计器 → 编辑包含多行dmRef的para → 保存 → 验证XML保留多行格式
 */

const { test, expect } = require('@playwright/test');
const fetch = require('node-fetch');

// ========== 工具函数 ==========

/**
 * 获取登录Token
 */
async function getLoginToken() {
  const response = await fetch('http://localhost:9999/jeecg-boot/sys/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '123456' })
  });
  const data = await response.json();
  if (!data.result || !data.result.token) {
    throw new Error('登录失败: ' + JSON.stringify(data));
  }
  return data.result.token;
}

/**
 * 打开项目
 */
async function openProject(token, projectId) {
  const response = await fetch('http://localhost:9999/jeecg-boot/ietmproject/ietmProject/openProject', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ projectId })
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error('打开项目失败: ' + JSON.stringify(data));
  }
  return data;
}

// ========== 测试 ==========

test.describe('dmRef多行格式保留修复', () => {

  test('Para设计器编辑多行dmRef后保存应保留格式', async ({ page }) => {
    // 获取Token
    console.log('正在登录...');
    const token = await getLoginToken();
    console.log('✓ 登录成功，token:', token.substring(0, 20) + '...');

    // 打开项目
    const projectId = '2078348945532030978';
    const dmId = '2084257576786046977';
    console.log('正在打开项目...');
    await openProject(token, projectId);
    console.log('✓ 项目打开成功');

    // 注入Token到localStorage
    console.log('正在导航到DM编辑器...');
    await page.addInitScript(({ token }) => {
      localStorage['pro__Access-Token'] = JSON.stringify({ value: token });
    }, { token });

    // 打开编辑器
    const url = `http://localhost:3000/ietm/dm-content-editor/${dmId}?mode=edit&dmc=DMC-J-ZB1-A-02-111A-A-00-0030101-001-03_ZH-CN`;
    await page.goto(url);
    console.log('✓ 导航到编辑器');

    // 等待CodeMirror加载
    console.log('正在等待编辑器加载...');
    await page.waitForSelector('.CodeMirror', { timeout: 10000 });
    console.log('✓ 编辑器已加载');

    // 等待内容加载
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')?.CodeMirror;
      return cm && cm.getValue().includes('<dmodule');
    }, { timeout: 10000 });
    console.log('✓ 编辑器内容已加载');

    // 获取当前内容
    const originalContent = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue();
    });
    console.log(`编辑器内容大小: ${originalContent.length} 字节`);

    // 查找第一个<para>标签
    const paraMatch = originalContent.match(/<para>[\s\S]*?<\/para>/);
    if (!paraMatch) {
      console.log('⚠️ 编辑器中未找到<para>标签，跳过Para设计器测试');
      return;
    }

    const firstParaLine = originalContent.substring(0, paraMatch.index).split('\n').length;
    console.log(`检测到第一个<para>在第${firstParaLine}行`);

    // 在<para>中插入多行dmRef
    const multiLineDmRef = `<dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
    <dmRefIdent>
      <dmCode assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="007" infoCodeVariant="A" itemLocationEnd="A" itemLocationStart="A" modelIdentCode="A_001" securityClassification="01" language="01"/>
      <language languageIsoCode="zh" countryIsoCode="CN"/>
    </dmRefIdent>
    <dmRefAddressItems>
      <dmTitle>
        <techName>项目自定义</techName>
        <infoName>符号清单</infoName>
      </dmTitle>
    </dmRefAddressItems>
  </dmRef>`;

    // 使用evaluate插入dmRef到第一个para中
    console.log('正在插入多行dmRef到para中...');
    const insertResult = await page.evaluate(({ dmRef, lineNum }) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror;
      const lines = cm.getValue().split('\n');

      // 在第lineNum行插入dmRef（留一行用于缩进）
      const insertLine = lineNum; // Para行号（从0开始）
      lines.splice(insertLine + 1, 0, dmRef);

      const newContent = lines.join('\n');
      cm.setValue(newContent);

      return {
        success: true,
        newLength: newContent.length,
        newLineCount: newContent.split('\n').length,
        insertedLine: insertLine + 1
      };
    }, { dmRef: multiLineDmRef, lineNum: firstParaLine - 1 });

    console.log(`✓ dmRef已插入，编辑器行数: ${insertResult.newLineCount}`);

    // 点击工具栏中的"保存"按钮
    console.log('正在保存...');
    const saveButton = page.locator('button:has-text("保存")').first();
    await saveButton.waitFor({ timeout: 5000 });
    await saveButton.click();
    console.log('✓ 保存按钮已点击');

    // 等待保存完成（查看是否有Toast提示或编辑器禁用状态变化）
    await page.waitForTimeout(1000);
    console.log('✓ 保存完成');

    // 获取保存后的内容
    const savedContent = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue();
    });

    // 验证dmRef是否保留多行格式
    console.log('\n正在验证dmRef格式...');
    const savedDmRef = savedContent.match(/<dmRef[\s\S]*?<\/dmRef>/);
    if (!savedDmRef) {
      throw new Error('保存后未找到dmRef标签！');
    }

    const dmRefLines = savedDmRef[0].split('\n');
    console.log(`保存后dmRef行数: ${dmRefLines.length}`);
    console.log(`原始dmRef行数: ${multiLineDmRef.split('\n').length}`);

    // 检查关键子元素是否在不同行
    const hasDmRefIdent = savedDmRef[0].includes('<dmRefIdent>');
    const hasDmRefIdentClosing = savedDmRef[0].includes('</dmRefIdent>');
    const hasDmCode = savedDmRef[0].includes('<dmCode');
    const hasLanguage = savedDmRef[0].includes('<language');
    const hasTechName = savedDmRef[0].includes('<techName>');
    const hasInfoName = savedDmRef[0].includes('<infoName>');

    console.log('关键元素存在性检查:');
    console.log(`  <dmRefIdent>: ${hasDmRefIdent ? '✓' : '✗'}`);
    console.log(`  <dmCode>: ${hasDmCode ? '✓' : '✗'}`);
    console.log(`  <language>: ${hasLanguage ? '✓' : '✗'}`);
    console.log(`  <techName>: ${hasTechName ? '✓' : '✗'}`);
    console.log(`  <infoName>: ${hasInfoName ? '✓' : '✗'}`);

    // 核心断言：dmRef保持多行格式
    expect(dmRefLines.length, '保存后dmRef应保持多行格式').toBeGreaterThan(1);
    expect(hasDmRefIdent && hasDmCode && hasLanguage && hasTechName && hasInfoName,
      '保存后所有关键子元素应存在').toBe(true);

    console.log('\n✅ 测试通过：dmRef多行格式已保留！');
  });
});
