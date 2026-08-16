const { test, expect } = require('@playwright/test')
const http = require('http')

// 历史版本数据完整性检查测试
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978'
const DM_NODE_TITLE = '02-项目自定义'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => { d += c }); res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve({ raw: d }) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败: ' + JSON.stringify(l))
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT }, TOKEN)
})

async function injectToken(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
}

async function openListRealDm(page) {
  await injectToken(page)
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  await page.locator('.ant-tree-title', { hasText: DM_NODE_TITLE })
    .filter({ hasText: /^02-项目自定义$/ }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
}

test.describe('DM历史版本·数据完整性检查', () => {
  test.setTimeout(120000)

  test('数据检查1：后端API返回字段完整性', async () => {
    // 获取列表第一条DM
    const listResp = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=1', null, TOKEN)

    console.log('\n=== 列表API响应 ===')
    console.log('success:', listResp.success)
    console.log('message:', listResp.message)

    if (!listResp.success || !listResp.result || !listResp.result.records) {
      console.log('列表API调用失败或无数据')
      return
    }

    const firstDm = listResp.result.records[0]
    console.log('\n=== 第一条DM数据 ===')
    console.log('id:', firstDm.id)
    console.log('dmcCode:', firstDm.dmcCode)
    console.log('sns:', firstDm.sns)
    console.log('infoCode:', firstDm.infoCode)
    console.log('infoCodeVariant:', firstDm.infoCodeVariant)

    // 调用历史版本API
    const historyResp = await apiReq(
      'GET',
      `/ietm/datamodule/historyVersions?sns=${firstDm.sns}&infoCode=${firstDm.infoCode}&infoCodeVariant=${firstDm.infoCodeVariant || ''}`,
      null,
      TOKEN
    )

    console.log('\n=== 历史版本API响应 ===')
    console.log('success:', historyResp.success)
    console.log('记录数:', historyResp.result ? historyResp.result.length : 0)

    if (historyResp.result && historyResp.result.length > 0) {
      console.log('\n=== 历史版本记录字段检查 ===')

      historyResp.result.forEach((record, index) => {
        console.log(`\n--- 记录${index + 1} ---`)
        console.log('id:', record.id)
        console.log('dmcCode:', record.dmcCode)
        console.log('techName:', record.techName)
        console.log('infoName:', record.infoName)
        console.log('issueNo:', record.issueNo)
        console.log('inWork:', record.inWork)
        console.log('versionType:', record.versionType)
        console.log('issueDate:', record.issueDate)
        console.log('createBy:', record.createBy)
        console.log('checkoutUser:', record.checkoutUser)
        console.log('checkoutTime:', record.checkoutTime)
        console.log('isLatest:', record.isLatest)

        // 检查必填字段
        expect(record.id).toBeTruthy()
        expect(record.dmcCode).toBeTruthy()
        expect(record.issueNo).toBeTruthy()
        expect(record.inWork).toBeTruthy()
      })
    }
  })

  test('数据检查2：前端页面显示完整性', async ({ page }) => {
    await openListRealDm(page)

    // 选中第一行并点击历史版本
    const firstRow = page.locator('.ant-table-row').first()
    await firstRow.locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(500)

    const historyBtn = page.locator('button').filter({ hasText: /^历史版本$/ })
    await historyBtn.click()
    await page.waitForTimeout(1000)

    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })
    await modal.waitFor({ state: 'visible', timeout: 10000 })

    // 获取表头
    const headers = await modal.locator('thead th').allTextContents()
    console.log('\n=== 前端表头 ===')
    console.log('表头列表:', headers)
    console.log('列数:', headers.length)

    // 检查表格数据行
    const rowCount = await modal.locator('.ant-table-row').count()
    console.log('\n=== 表格数据 ===')
    console.log('数据行数:', rowCount)

    if (rowCount > 0) {
      // 获取第一行数据
      const firstDataRow = modal.locator('.ant-table-row').first()

      // 获取所有单元格内容
      const cells = await firstDataRow.locator('td').allTextContents()
      console.log('\n=== 第一行数据（所有列） ===')
      cells.forEach((cell, index) => {
        console.log(`列${index + 1}:`, cell.trim())
      })

      // 检查关键字段是否为空
      console.log('\n=== 字段非空检查 ===')

      // DMC列（索引2，因为前面有签出图标列和选择框列）
      const dmcCell = await firstDataRow.locator('td').nth(2).textContent()
      console.log('DMC:', dmcCell.trim())
      expect(dmcCell.trim()).not.toBe('')

      // 技术名称列（索引3）
      const techNameCell = await firstDataRow.locator('td').nth(3).textContent()
      console.log('技术名称:', techNameCell.trim())

      // 信息名称列（索引4）
      const infoNameCell = await firstDataRow.locator('td').nth(4).textContent()
      console.log('信息名称:', infoNameCell.trim())

      // 版本列（索引5）
      const versionCell = await firstDataRow.locator('td').nth(5).textContent()
      console.log('版本:', versionCell.trim())
      expect(versionCell.trim()).not.toBe('')

      // 版本类型列（索引6）
      const versionTypeCell = await firstDataRow.locator('td').nth(6).textContent()
      console.log('版本类型:', versionTypeCell.trim())

      // 版本日期列（索引7）
      const issueDateCell = await firstDataRow.locator('td').nth(7).textContent()
      console.log('版本日期:', issueDateCell.trim())

      // 创建人列（索引8）
      const createByCell = await firstDataRow.locator('td').nth(8).textContent()
      console.log('创建人:', createByCell.trim())

      // 截图保存
      await page.screenshot({
        path: 'test-results/history-data-check.png',
        fullPage: true
      })
      console.log('\n截图已保存: test-results/history-data-check.png')
    }
  })

  test('数据检查3：对比后端API与前端显示的一致性', async ({ page }) => {
    // 先获取后端数据
    const listResp = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=1', null, TOKEN)
    if (!listResp.success || !listResp.result.records || listResp.result.records.length === 0) {
      console.log('无DM数据，跳过')
      return
    }

    const firstDm = listResp.result.records[0]
    const historyResp = await apiReq(
      'GET',
      `/ietm/datamodule/historyVersions?sns=${firstDm.sns}&infoCode=${firstDm.infoCode}&infoCodeVariant=${firstDm.infoCodeVariant || ''}`,
      null,
      TOKEN
    )

    console.log('\n=== 后端数据 ===')
    console.log('历史版本记录数:', historyResp.result ? historyResp.result.length : 0)

    if (!historyResp.result || historyResp.result.length === 0) {
      console.log('无历史版本数据')
      return
    }

    const backendFirstRecord = historyResp.result[0]
    console.log('后端第一条记录:')
    console.log('  DMC:', backendFirstRecord.dmcCode)
    console.log('  技术名称:', backendFirstRecord.techName)
    console.log('  信息名称:', backendFirstRecord.infoName)
    console.log('  版本号:', `${backendFirstRecord.issueNo}-${backendFirstRecord.inWork}`)
    console.log('  版本类型:', backendFirstRecord.versionType)
    console.log('  版本日期:', backendFirstRecord.issueDate)
    console.log('  创建人:', backendFirstRecord.createBy)

    // 打开前端页面
    await openListRealDm(page)
    const firstRow = page.locator('.ant-table-row').first()
    await firstRow.locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(500)

    const historyBtn = page.locator('button').filter({ hasText: /^历史版本$/ })
    await historyBtn.click()
    await page.waitForTimeout(1000)

    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })
    await modal.waitFor({ state: 'visible', timeout: 10000 })

    // 获取前端第一行数据
    const firstDataRow = modal.locator('.ant-table-row').first()

    const frontendDmc = await firstDataRow.locator('td').nth(2).textContent()
    const frontendTechName = await firstDataRow.locator('td').nth(3).textContent()
    const frontendInfoName = await firstDataRow.locator('td').nth(4).textContent()
    const frontendVersion = await firstDataRow.locator('td').nth(5).textContent()
    const frontendVersionType = await firstDataRow.locator('td').nth(6).textContent()
    const frontendIssueDate = await firstDataRow.locator('td').nth(7).textContent()
    const frontendCreateBy = await firstDataRow.locator('td').nth(8).textContent()

    console.log('\n=== 前端显示 ===')
    console.log('前端第一行数据:')
    console.log('  DMC:', frontendDmc.trim())
    console.log('  技术名称:', frontendTechName.trim())
    console.log('  信息名称:', frontendInfoName.trim())
    console.log('  版本:', frontendVersion.trim())
    console.log('  版本类型:', frontendVersionType.trim())
    console.log('  版本日期:', frontendIssueDate.trim())
    console.log('  创建人:', frontendCreateBy.trim())

    console.log('\n=== 数据一致性对比 ===')

    // DMC对比
    const dmcMatch = frontendDmc.includes(backendFirstRecord.dmcCode)
    console.log('DMC一致性:', dmcMatch ? '✅' : '❌')

    // 版本号对比
    const expectedVersion = `${backendFirstRecord.issueNo}-${backendFirstRecord.inWork}`
    const versionMatch = frontendVersion.includes(expectedVersion)
    console.log('版本号一致性:', versionMatch ? '✅' : '❌', `期望:${expectedVersion}`)

    // 技术名称对比（可能为空）
    if (backendFirstRecord.techName) {
      const techNameMatch = frontendTechName.includes(backendFirstRecord.techName)
      console.log('技术名称一致性:', techNameMatch ? '✅' : '❌')
    } else {
      console.log('技术名称: 后端为空')
    }

    // 信息名称对比（可能为空）
    if (backendFirstRecord.infoName) {
      const infoNameMatch = frontendInfoName.includes(backendFirstRecord.infoName)
      console.log('信息名称一致性:', infoNameMatch ? '✅' : '❌')
    } else {
      console.log('信息名称: 后端为空')
    }

    // 基本断言
    expect(dmcMatch).toBeTruthy()
    expect(versionMatch).toBeTruthy()
  })

  test('数据检查4：空字段处理验证', async ({ page }) => {
    await openListRealDm(page)

    const firstRow = page.locator('.ant-table-row').first()
    await firstRow.locator('.ant-checkbox-input').check({ force: true })
    await page.waitForTimeout(500)

    const historyBtn = page.locator('button').filter({ hasText: /^历史版本$/ })
    await historyBtn.click()
    await page.waitForTimeout(1000)

    const modal = page.locator('.ant-modal-content').filter({ has: page.locator('text=/历史版本/') })
    await modal.waitFor({ state: 'visible', timeout: 10000 })

    const rowCount = await modal.locator('.ant-table-row').count()
    console.log('\n=== 空字段处理检查 ===')
    console.log('总行数:', rowCount)

    for (let i = 0; i < Math.min(rowCount, 3); i++) {
      console.log(`\n--- 第${i + 1}行 ---`)
      const row = modal.locator('.ant-table-row').nth(i)

      const issueDate = await row.locator('td').nth(7).textContent()
      const createBy = await row.locator('td').nth(8).textContent()

      console.log('版本日期:', issueDate.trim() || '(空)')
      console.log('创建人:', createBy.trim() || '(空)')

      // 检查是否有未处理的null/undefined显示
      const allCells = await row.locator('td').allTextContents()
      const hasNullDisplay = allCells.some(cell =>
        cell.includes('null') ||
        cell.includes('undefined') ||
        cell.includes('NaN')
      )

      if (hasNullDisplay) {
        console.log('⚠️ 发现未处理的null/undefined显示')
      } else {
        console.log('✅ 无null/undefined显示问题')
      }
    }
  })
})
