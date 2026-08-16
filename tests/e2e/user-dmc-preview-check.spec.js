/**
 * 直接测试用户提供的DMC预览效果
 * DMC: DMC-ZB1-A-02-00-00-00A-007A-A_001-03_ZH-CN
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const http = require('http')

const API = 'http://localhost:9999/jeecg-boot'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
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

// 模拟用户DMC的标准XML
const USER_DM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
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
          <techName>用户实际DM技术名称</techName>
          <infoName>描述信息</infoName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus issueType="new">
      <security securityClassification="01"/>
      <dataRestrictions>
        <restrictionInstructions>
          <dataDistribution>公开分发</dataDistribution>
          <dataHandling>标准处理流程</dataHandling>
          <dataDestruction>按规定销毁</dataDestruction>
        </restrictionInstructions>
        <restrictionInfo>
          <copyright>
            <copyrightPara>版权所有 © 2026</copyrightPara>
          </copyright>
          <policyStatement>遵循公司保密政策</policyStatement>
          <dataConds>
            <dataCondPara>数据使用条件说明</dataCondPara>
          </dataConds>
        </restrictionInfo>
      </dataRestrictions>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>第一章 系统概述</title>
        <para>本章介绍系统的基本架构和功能模块。</para>
      </levelledPara>
      <levelledPara>
        <title>第二章 技术参数</title>
        <para>本章详细说明各项技术指标。</para>
        <levelledPara>
          <title>2.1 电气参数</title>
          <para>电压、电流、功率等电气特性。</para>
        </levelledPara>
        <levelledPara>
          <title>2.2 机械参数</title>
          <para>尺寸、重量、材料等机械特性。</para>
        </levelledPara>
      </levelledPara>
      <levelledPara>
        <title>第三章 设备清单</title>
        <para>以下表格列出了主要设备信息：</para>
        <table>
          <title>主要设备参数表</title>
          <tgroup cols="3">
            <thead>
              <row>
                <entry>设备名称</entry>
                <entry>型号规格</entry>
                <entry>数量</entry>
              </row>
            </thead>
            <tbody>
              <row>
                <entry>控制单元</entry>
                <entry>MCU-2000</entry>
                <entry>1</entry>
              </row>
              <row>
                <entry>电源模块</entry>
                <entry>PSU-1500</entry>
                <entry>2</entry>
              </row>
            </tbody>
          </tgroup>
        </table>
      </levelledPara>
    </description>
  </content>
</dmodule>`

let TOKEN

test.describe('用户DMC预览效果验证', () => {
  test.beforeAll(async () => {
    const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
    if (!login || !login.result || !login.result.token) throw new Error('登录失败')
    TOKEN = login.result.token
  })

  test('验证用户DMC的预览效果', async () => {
    console.log('\n========== 验证用户DMC预览 ==========')
    console.log('DMC:', 'DMC-ZB1-A-02-00-00-00A-007A-A_001-03_ZH-CN')

    // 1. 调用预览API
    console.log('\n1. 调用预览API...')
    const previewHtml = await apiReq('POST', '/ietm/dm-content/preview', {
      xml: USER_DM_XML
    }, TOKEN)

    if (typeof previewHtml !== 'string') {
      throw new Error('预览API返回非HTML: ' + JSON.stringify(previewHtml))
    }

    console.log('✓ 预览HTML长度:', previewHtml.length)

    // 2. 分析HTML结构
    console.log('\n2. 分析HTML结构...')

    const issues = []

    // 检查TOC表格class
    const hasTocTable = /<table[^>]*class="toc-table"/.test(previewHtml)
    console.log('✓ TOC表格class:', hasTocTable ? 'toc-table ✅' : '❌ 缺少toc-table')
    if (!hasTocTable) {
      issues.push('TOC表格缺少toc-table class')
    }

    // 检查TOC CSS规则
    const hasTocCss = /\.toc-table[^{]*\{[^}]*border:\s*none/.test(previewHtml)
    console.log('✓ TOC CSS规则:', hasTocCss ? 'border:none ✅' : '❌ 缺少去边框规则')
    if (!hasTocCss) {
      issues.push('CSS中缺少.toc-table去边框规则')
    }

    // 检查序号
    const seqPattern = /<td[^>]*>\s*(\d+(?:\.\d+)?)\s*<\/td>/g
    const sequences = []
    let match
    while ((match = seqPattern.exec(previewHtml)) !== null && sequences.length < 10) {
      if (match[1].match(/^\d+(\.\d+)?$/)) {
        sequences.push(match[1])
      }
    }
    console.log('✓ 检测到的序号:', sequences.length > 0 ? sequences.slice(0, 5).join(', ') + ' ✅' : '❌ 未检测到序号')
    if (sequences.length === 0) {
      issues.push('目录中未检测到序号')
    }

    // 检查表格标题嵌套
    const hasNestedTitleTable = /<table[^>]*class="tabletitle"/.test(previewHtml)
    console.log('✓ 表格标题嵌套:', hasNestedTitleTable ? '❌ 存在.tabletitle嵌套' : '正常 ✅')
    if (hasNestedTitleTable) {
      issues.push('表格标题使用了嵌套的table.tabletitle')
    }

    // 检查数据限制嵌套
    const dataRestNested = /<td[^>]*class="idStatus"[^>]*>[\s\S]{0,200}<table/.test(previewHtml)
    console.log('✓ 数据限制嵌套:', dataRestNested ? '❌ 存在嵌套表格' : '正常 ✅')
    if (dataRestNested) {
      issues.push('数据限制区域存在嵌套表格')
    }

    // 3. 保存HTML供检查
    const fs = require('fs')
    const outputPath = path.join(__dirname, 'user-dmc-preview.html')
    fs.writeFileSync(outputPath, previewHtml, 'utf-8')
    console.log('\n3. 预览HTML已保存:', outputPath)

    // 4. 总结
    console.log('\n========== 检查结果 ==========')
    if (issues.length === 0) {
      console.log('✅ 所有检查通过，预览样式正常')
    } else {
      console.log('❌ 发现以下问题:')
      issues.forEach(issue => console.log('  - ' + issue))
    }

    console.log('\n请用浏览器打开以下文件查看实际效果:')
    console.log(path.resolve(outputPath))
    console.log('\n如果该文件显示正常，但你浏览器中看到的有问题，')
    console.log('说明是浏览器缓存问题，请按 Ctrl+Shift+R 硬刷新。')
    console.log('=====================================\n')

    // 断言
    expect(issues.length).toBe(0)
  })
})
