/**
 * DM预览视觉演示 - 响应用户报告的样式问题
 *
 * 用户报告：
 * 1. 目录没序号还要用边框线框起来
 * 2. 数据限制模块是表格套表格
 * 3. 表格的标题显示不对
 * 4. 整个样式越来越难看
 *
 * 本测试实际打开浏览器，展示当前预览效果并截图
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const http = require('http')

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const DM_ID = '2084945965503942657'
const DMC = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'
const PROJECT_ID = '2078348945532030978'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''
      res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(null) }
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

let TOKEN

test.describe('DM预览视觉演示 - 用户报告问题核查', () => {
  test.beforeAll(async () => {
    const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
    if (!login || !login.result || !login.result.token) throw new Error('登录失败')
    TOKEN = login.result.token
    await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
  })

  async function openEditor(page) {
    await page.addInitScript(tok => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, TOKEN)
    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      if (!cm || !cm.CodeMirror) return false
      const el = document.querySelector('.dm-editor-page')
      return !!(el && el.__vue__)
    }, { timeout: 30000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const v = cm.getValue()
      return v && v.includes('identAndStatusSection') && v.length > 500
    }, { timeout: 30000 })
  }

  test('完整视觉演示：目录+数据限制+表格标题', async ({ page }) => {
    console.log('\n========== 开始DM预览完整演示 ==========\n')

    // 1. 打开DM编辑器
    await openEditor(page)
    console.log('✓ 已打开DM编辑器')

    // 2. 注入测试XML（包含：目录、数据限制、表格）
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="040"
                infoCodeVariant="A" itemLocationCode="D"
                learnCode="" learnEventCode=""/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2024" month="08" day="06"/>
        <dmTitle>
          <techName>测试数据模块</techName>
          <infoName>预览样式审查</infoName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
      <dataRestrictions>
        <restrictionInstructions>
          <dataDistribution>PUBLIC</dataDistribution>
          <exportControl exportControlClassification="99"/>
          <dataHandling>处理说明文本</dataHandling>
          <dataDestruction>销毁要求文本</dataDestruction>
        </restrictionInstructions>
        <restrictionInfo>
          <copyright>
            <copyrightPara>版权所有 © 2024</copyrightPara>
          </copyright>
          <policyStatement>政策声明文本内容</policyStatement>
          <dataConds>
            <dataCondPara>数据条件段落文本</dataCondPara>
          </dataConds>
        </restrictionInfo>
      </dataRestrictions>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>第一章 系统概述</title>
        <para>这是第一章的内容，介绍系统的基本概念和架构。</para>
      </levelledPara>
      <levelledPara>
        <title>第二章 技术规格</title>
        <para>本章节描述技术参数和性能指标。</para>
        <levelledPara>
          <title>第二点一节 电气参数</title>
          <para>电压、电流、功率等详细参数说明。</para>
        </levelledPara>
        <levelledPara>
          <title>第二点二节 机械参数</title>
          <para>尺寸、重量、材料等机械特性描述。</para>
        </levelledPara>
      </levelledPara>
      <levelledPara>
        <title>第三章 设备参数表</title>
        <para>下表列出了主要设备的技术参数：</para>
        <table>
          <title>设备参数对照表</title>
          <tgroup cols="3">
            <thead>
              <row>
                <entry>设备名称</entry>
                <entry>型号</entry>
                <entry>额定功率</entry>
              </row>
            </thead>
            <tbody>
              <row>
                <entry>主控单元</entry>
                <entry>MCU-2000</entry>
                <entry>500W</entry>
              </row>
              <row>
                <entry>电源模块</entry>
                <entry>PSU-1500</entry>
                <entry>1500W</entry>
              </row>
              <row>
                <entry>冷却风扇</entry>
                <entry>FAN-120</entry>
                <entry>25W</entry>
              </row>
            </tbody>
          </tgroup>
        </table>
      </levelledPara>
    </description>
  </content>
</dmodule>`

    await page.evaluate((xml) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      if (cm) {
        cm.setValue(xml)
      }
    }, testXml)

    await page.waitForTimeout(1000)
    console.log('✓ 已注入测试XML（含目录、数据限制、表格）')

    // 3. 点击预览按钮
    const previewBtn = page.locator('button:has-text("预览")')
    await previewBtn.click()
    await page.waitForTimeout(2000)

    console.log('✓ 预览弹窗已打开')

    // 6. 等待iframe加载完成
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    await modal.waitFor({ state: 'visible' })
    const iframe = modal.locator('iframe')
    await iframe.waitFor({ state: 'attached' })
    await page.waitForTimeout(1000)

    console.log('✓ iframe内容已加载')

    // 7. 检查各项关键样式
    const report = await iframe.evaluateHandle(async (frame) => {
      const doc = frame.contentDocument || frame.contentWindow.document
      await new Promise(resolve => setTimeout(resolve, 500))

      const results = {
        timestamp: new Date().toISOString(),
        issues: []
      }

      // ========== 检查1：目录序号和边框 ==========
      const tocTable = doc.querySelector('.toc-table')
      if (tocTable) {
        const tocTds = tocTable.querySelectorAll('td')
        const seqNumbers = []
        tocTds.forEach(td => {
          const text = td.textContent.trim()
          if (/^\d+(\.\d+)*$/.test(text)) {
            seqNumbers.push(text)
          }
        })

        const tdStyle = window.getComputedStyle(tocTds[0] || tocTable.querySelector('td'))
        const tableBorder = window.getComputedStyle(tocTable).borderTopStyle
        const tdBorder = tdStyle.borderTopStyle

        results.toc = {
          found: !!tocTable,
          sequenceNumbers: seqNumbers,
          sequenceCount: seqNumbers.length,
          tableBorderStyle: tableBorder,
          tdBorderStyle: tdBorder,
          hasBorder: tableBorder !== 'none' && tdBorder !== 'none'
        }

        if (seqNumbers.length === 0) {
          results.issues.push('❌ 用户问题1确认：目录没有序号')
        } else {
          results.issues.push(`✅ 目录有序号：${seqNumbers.join(', ')}`)
        }

        if (tableBorder !== 'none' || tdBorder !== 'none') {
          results.issues.push(`❌ 用户问题1确认：目录有边框（table:${tableBorder}, td:${tdBorder}）`)
        } else {
          results.issues.push('✅ 目录无边框')
        }
      } else {
        results.issues.push('⚠️  未找到目录表格（.toc-table）')
      }

      // ========== 检查2：数据限制表格嵌套 ==========
      const idStatusCells = doc.querySelectorAll('td.idStatus')
      let nestedTableCount = 0
      let tdWithTrCount = 0

      idStatusCells.forEach(cell => {
        const nestedTables = cell.querySelectorAll('table')
        nestedTableCount += nestedTables.length

        // 检查是否有非法的 <td><tr> 嵌套
        const directTrs = Array.from(cell.children).filter(child => child.tagName === 'TR')
        tdWithTrCount += directTrs.length
      })

      results.dataRestrictions = {
        idStatusCellCount: idStatusCells.length,
        nestedTableCount,
        tdWithTrCount,
        hasNesting: nestedTableCount > 0 || tdWithTrCount > 0
      }

      if (nestedTableCount > 0) {
        results.issues.push(`❌ 用户问题2确认：数据限制区有${nestedTableCount}个嵌套表格`)
      } else {
        results.issues.push('✅ 数据限制无嵌套表格')
      }

      if (tdWithTrCount > 0) {
        results.issues.push(`❌ 数据限制有非法<td><tr>嵌套（${tdWithTrCount}处）`)
      } else {
        results.issues.push('✅ 数据限制无<td><tr>非法嵌套')
      }

      // ========== 检查3：表格标题 ==========
      const tableTitle = doc.querySelector('.TableTitle')
      if (tableTitle) {
        const titleStyle = window.getComputedStyle(tableTitle)
        const nestedTableInTitle = tableTitle.querySelectorAll('table').length

        results.tableTitle = {
          found: true,
          text: tableTitle.textContent.trim(),
          textAlign: titleStyle.textAlign,
          fontStyle: titleStyle.fontStyle,
          nestedTableCount: nestedTableInTitle,
          hasNestedTable: nestedTableInTitle > 0
        }

        if (nestedTableInTitle > 0) {
          results.issues.push(`❌ 用户问题3确认：表格标题内有嵌套表格（${nestedTableInTitle}个）`)
        } else {
          results.issues.push(`✅ 表格标题正常：${tableTitle.textContent.trim()}`)
        }

        if (titleStyle.textAlign !== 'center' || titleStyle.fontStyle !== 'italic') {
          results.issues.push(`⚠️  表格标题样式异常：对齐=${titleStyle.textAlign}, 字体=${titleStyle.fontStyle}`)
        }
      } else {
        results.issues.push('⚠️  未找到表格标题（.TableTitle）')
      }

      // ========== 检查4：整体样式 ==========
      const bodyStyle = window.getComputedStyle(doc.body)
      results.bodyStyle = {
        fontFamily: bodyStyle.fontFamily,
        fontSize: bodyStyle.fontSize,
        color: bodyStyle.color
      }

      if (bodyStyle.fontFamily.includes('sans-serif') &&
          !bodyStyle.fontFamily.includes('宋体') &&
          !bodyStyle.fontFamily.includes('SimSun')) {
        results.issues.push('❌ 用户问题4线索：字体被覆盖为sans-serif，缺少中文字体')
      } else {
        results.issues.push(`✅ body字体正常：${bodyStyle.fontFamily}`)
      }

      return results
    }, await iframe.elementHandle())

    const reportData = await report.jsonValue()

    console.log('\n========== 预览样式检查报告 ==========\n')
    console.log('检查时间:', reportData.timestamp)
    console.log('\n发现的问题：')
    reportData.issues.forEach(issue => console.log(issue))

    console.log('\n详细数据：')
    console.log('- 目录（TOC）:', JSON.stringify(reportData.toc, null, 2))
    console.log('- 数据限制:', JSON.stringify(reportData.dataRestrictions, null, 2))
    console.log('- 表格标题:', JSON.stringify(reportData.tableTitle, null, 2))
    console.log('- body样式:', JSON.stringify(reportData.bodyStyle, null, 2))

    // 8. 截图保存（供用户查看）
    await modal.screenshot({
      path: path.join(__dirname, 'dm-preview-visual-demo.png'),
      fullPage: true
    })

    console.log('\n✓ 截图已保存: tests/e2e/dm-preview-visual-demo.png')
    console.log('\n========== 演示完成 ==========\n')

    // 验证：所有用户报告的问题都已修复
    expect(reportData.issues.filter(i => i.startsWith('❌ 用户问题')).length).toBe(0)

    await page.waitForTimeout(2000) // 保持预览窗口2秒供观察
  })
})
