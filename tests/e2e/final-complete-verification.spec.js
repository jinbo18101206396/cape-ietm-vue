/**
 * 完整的端到端验证 - 自动化完成所有检查
 * 无需用户配合，直接打开浏览器、清除缓存、打开预览、截图
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const http = require('http')

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT_ID = '2078348945532030978'

function apiReq(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + urlPath, { method, headers: h }, res => {
      let d = ''
      res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(d) }
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

let TOKEN

test.describe('完整验证 - 用户DMC预览效果', () => {
  test.beforeAll(async () => {
    const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
    if (!login || !login.result || !login.result.token) throw new Error('登录失败')
    TOKEN = login.result.token
    await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
  })

  test('完整验证流程', async ({ page, context }) => {
    console.log('\n========================================')
    console.log('DM预览完整验证 - 自动化执行')
    console.log('========================================\n')

    // 1. 清除所有缓存
    console.log('1. 清除浏览器缓存...')
    await context.clearCookies()
    await context.clearPermissions()
    console.log('   ✓ 缓存已清除\n')

    // 2. 注入token并打开编辑器
    console.log('2. 打开DM编辑器...')
    await page.addInitScript(tok => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({
        value: tok,
        expire: Date.now() + 7 * 864e5
      }))
    }, TOKEN)

    // 使用第一个可用的DM
    const DM_ID = '2084945965503942657'
    const DMC = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'

    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`, {
      waitUntil: 'domcontentloaded'
    })

    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror
    }, { timeout: 30000 })

    console.log('   ✓ 编辑器已加载\n')

    // 3. 等待DM内容加载完成
    console.log('3. 等待DM内容加载...')
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      if (!cm || !cm.CodeMirror) return false
      const v = cm.CodeMirror.getValue()
      return v && v.includes('identAndStatusSection') && v.length > 500
    }, { timeout: 30000 })
    console.log('   ✓ DM内容已加载\n')

    // 4. 注入测试XML（包含所有问题场景）
    console.log('4. 注入测试XML（含目录、数据限制、表格）...')
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="02"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="007"
                infoCodeVariant="A" itemLocationCode="A"/>
        <language countryIsoCode="CN" languageIsoCode="zh"/>
        <issueInfo issueNumber="001" inWork="03"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="08" day="07"/>
        <dmTitle>
          <techName>用户DMC验证</techName>
          <infoName>DMC-ZB1-A-02-00-00-00A-007A-A_001-03_ZH-CN</infoName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus issueType="new">
      <security securityClassification="01"/>
      <dataRestrictions>
        <restrictionInstructions>
          <dataDistribution>公开分发说明文本</dataDistribution>
          <dataHandling>标准处理流程说明</dataHandling>
          <dataDestruction>按规定销毁要求</dataDestruction>
        </restrictionInstructions>
        <restrictionInfo>
          <copyright>
            <copyrightPara>版权所有 © 2026 某某公司</copyrightPara>
          </copyright>
          <policyStatement>遵循公司保密政策和数据安全规范</policyStatement>
          <dataConds>
            <dataCondPara>数据使用条件和限制说明</dataCondPara>
          </dataConds>
        </restrictionInfo>
      </dataRestrictions>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>第一章 系统概述</title>
        <para>本章介绍系统的基本架构、功能模块和工作原理。</para>
      </levelledPara>
      <levelledPara>
        <title>第二章 技术参数</title>
        <para>本章详细说明各项技术指标和性能参数。</para>
        <levelledPara>
          <title>2.1 电气参数</title>
          <para>电压、电流、功率等电气特性参数说明。</para>
        </levelledPara>
        <levelledPara>
          <title>2.2 机械参数</title>
          <para>尺寸、重量、材料等机械特性参数说明。</para>
        </levelledPara>
      </levelledPara>
      <levelledPara>
        <title>第三章 设备清单</title>
        <para>以下表格列出了主要设备的详细信息：</para>
        <table>
          <title>主要设备参数对照表</title>
          <tgroup cols="4">
            <thead>
              <row>
                <entry>设备名称</entry>
                <entry>型号规格</entry>
                <entry>数量</entry>
                <entry>备注</entry>
              </row>
            </thead>
            <tbody>
              <row>
                <entry>主控单元</entry>
                <entry>MCU-2000</entry>
                <entry>1</entry>
                <entry>核心控制器</entry>
              </row>
              <row>
                <entry>电源模块</entry>
                <entry>PSU-1500</entry>
                <entry>2</entry>
                <entry>冗余配置</entry>
              </row>
              <row>
                <entry>冷却风扇</entry>
                <entry>FAN-120</entry>
                <entry>4</entry>
                <entry>散热系统</entry>
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
      cm.setValue(xml)
    }, testXml)

    await page.waitForTimeout(1000)
    console.log('   ✓ 测试XML已注入\n')

    // 5. 点击预览按钮
    console.log('5. 打开预览弹窗...')
    await page.locator('button:has-text("预览")').click()
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })

    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    const iframe = modal.locator('iframe')
    await iframe.waitFor({ state: 'attached' })

    // 等待iframe内容加载
    await page.waitForFunction(() => {
      const iframe = document.querySelector('.ant-modal iframe')
      return iframe && iframe.contentDocument &&
             iframe.contentDocument.body &&
             iframe.contentDocument.body.innerHTML.length > 500
    }, { timeout: 10000 })

    await page.waitForTimeout(1000)
    console.log('   ✓ 预览弹窗已打开\n')

    // 6. 截图
    console.log('6. 截图预览效果...')
    await modal.screenshot({
      path: path.join(__dirname, 'final-verification-screenshot.png'),
      fullPage: true
    })
    console.log('   ✓ 截图已保存: tests/e2e/final-verification-screenshot.png\n')

    // 7. 详细分析预览HTML
    console.log('7. 分析预览HTML结构...')
    const analysis = await iframe.evaluate(() => {
      const doc = iframe.contentDocument || iframe.contentWindow.document
      const results = {
        timestamp: new Date().toISOString(),
        issues: [],
        passed: []
      }

      // 检查1：目录TOC
      const tocTable = doc.querySelector('.toc-table')
      if (tocTable) {
        const tocTds = tocTable.querySelectorAll('td')
        const sequences = []
        tocTds.forEach(td => {
          const text = td.textContent.trim()
          if (/^\d+(\.\d+)*$/.test(text)) {
            sequences.push(text)
          }
        })

        const tdStyle = window.getComputedStyle(tocTds[0] || doc.querySelector('.toc-table td'))
        const tableBorder = window.getComputedStyle(tocTable).borderTopStyle

        results.toc = {
          found: true,
          hasClass: true,
          sequences: sequences,
          seqCount: sequences.length,
          tdBorder: tdStyle.borderTopStyle,
          tableBorder: tableBorder
        }

        if (sequences.length > 0) {
          results.passed.push(`✅ 目录有序号: ${sequences.slice(0, 5).join(', ')}`)
        } else {
          results.issues.push('❌ 目录没有序号')
        }

        if (tdStyle.borderTopStyle === 'none' && tableBorder === 'none') {
          results.passed.push('✅ 目录无边框')
        } else {
          results.issues.push(`❌ 目录有边框 (td:${tdStyle.borderTopStyle}, table:${tableBorder})`)
        }
      } else {
        results.issues.push('❌ 未找到.toc-table')
      }

      // 检查2：数据限制
      const idStatusCells = doc.querySelectorAll('td.idStatus')
      let nestedCount = 0
      let tdTrCount = 0

      idStatusCells.forEach(cell => {
        nestedCount += cell.querySelectorAll('table').length
        const directTrs = Array.from(cell.children).filter(c => c.tagName === 'TR')
        tdTrCount += directTrs.length
      })

      results.dataRestrictions = {
        cellCount: idStatusCells.length,
        nestedTables: nestedCount,
        tdWithTr: tdTrCount
      }

      if (nestedCount === 0 && tdTrCount === 0) {
        results.passed.push('✅ 数据限制无嵌套表格')
      } else {
        results.issues.push(`❌ 数据限制有嵌套 (tables:${nestedCount}, td>tr:${tdTrCount})`)
      }

      // 检查3：表格标题
      const tableTitle = doc.querySelector('.TableTitle')
      if (tableTitle) {
        const style = window.getComputedStyle(tableTitle)
        const nestedTable = tableTitle.querySelectorAll('table').length

        results.tableTitle = {
          found: true,
          text: tableTitle.textContent.trim(),
          textAlign: style.textAlign,
          fontStyle: style.fontStyle,
          nestedTable: nestedTable
        }

        if (nestedTable === 0) {
          results.passed.push(`✅ 表格标题正确: ${tableTitle.textContent.trim()}`)
        } else {
          results.issues.push(`❌ 表格标题有嵌套表格`)
        }

        if (style.textAlign === 'center' && style.fontStyle === 'italic') {
          results.passed.push('✅ 表格标题样式正确 (居中+斜体)')
        }
      }

      // 检查4：body字体
      const bodyStyle = window.getComputedStyle(doc.body)
      results.bodyFont = bodyStyle.fontFamily

      if (bodyStyle.fontFamily.includes('宋体') || bodyStyle.fontFamily.includes('SimSun')) {
        results.passed.push(`✅ 字体正常: ${bodyStyle.fontFamily}`)
      } else {
        results.issues.push(`❌ 字体异常: ${bodyStyle.fontFamily}`)
      }

      return results
    })

    console.log('\n========================================')
    console.log('验证结果')
    console.log('========================================\n')

    console.log('【通过的检查】')
    analysis.passed.forEach(p => console.log('  ' + p))

    if (analysis.issues.length > 0) {
      console.log('\n【发现的问题】')
      analysis.issues.forEach(i => console.log('  ' + i))
    } else {
      console.log('\n✅ 所有检查全部通过！')
    }

    console.log('\n【详细数据】')
    console.log('目录:', JSON.stringify(analysis.toc, null, 2))
    console.log('数据限制:', JSON.stringify(analysis.dataRestrictions, null, 2))
    console.log('表格标题:', JSON.stringify(analysis.tableTitle, null, 2))
    console.log('body字体:', analysis.bodyFont)

    console.log('\n========================================')
    console.log('验证完成')
    console.log('========================================\n')

    console.log('截图位置: D:\\workspace\\IETM\\cape-ietm-vue\\tests\\e2e\\final-verification-screenshot.png')

    // 断言
    expect(analysis.issues.length).toBe(0)

    // 保持窗口2秒供观察
    await page.waitForTimeout(2000)
  })
})
