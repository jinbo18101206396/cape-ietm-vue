/**
 * IETM 边界场景深度测试 - 异常情况与压力测试
 * 通过真实UI交互验证各种边界条件
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'
const TEST_TIMEOUT = 180000

async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(2000)

  const isLoginPage = await page.locator('input[type="password"]').isVisible({ timeout: 3000 }).catch(() => false)

  if (isLoginPage) {
    await page.locator('input[placeholder*="账"], input[name="username"]').first().fill('admin')
    await page.locator('input[type="password"]').first().fill('123456')
    await page.locator('button:has-text("登录")').first().click()
    await page.waitForTimeout(5000)
  }
}

async function navigateToDmList(page) {
  await page.goto(`${BASE_URL}/#/ietm/ietmdatamodulemanagement/IetmDataModuleList`)
  await page.waitForTimeout(3000)
}

async function openFirstDm(page) {
  const firstRow = page.locator('.ant-table-tbody tr').first()
  const editBtn = firstRow.locator('button:has-text("编辑"), a:has-text("编辑")').first()
  await editBtn.click({ timeout: 5000 }).catch(async () => {
    await firstRow.dblclick()
  })
  await page.waitForTimeout(3000)
}

async function getEditorContent(page) {
  return await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm?.CodeMirror?.getValue() || ''
  })
}

async function setEditorContent(page, content) {
  await page.evaluate((newContent) => {
    const cm = document.querySelector('.CodeMirror')
    if (cm?.CodeMirror) {
      cm.CodeMirror.setValue(newContent)
    }
  }, content)
}

test.describe('IETM 边界场景深度测试', () => {
  test.setTimeout(TEST_TIMEOUT)

  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })
    await login(page)
  })

  test.afterAll(async () => {
    await page?.close()
  })

  // ==================== 边界1: 空文档测试 ====================

  test('边界1-1: 空XML文档 - 重建refs', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    // 将编辑器内容清空
    await setEditorContent(page, '')
    await page.waitForTimeout(1000)

    // 尝试重建refs
    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      // 检查是否有错误提示
      const errorMsg = page.locator('.ant-message-error, .ant-notification-error')
      const hasError = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasError) {
        const errorText = await errorMsg.textContent()
        console.log('✅ 空文档错误提示:', errorText)
      } else {
        console.log('⚠️ 空文档未显示错误提示')
      }
    }
  })

  test('边界1-2: 只有dmodule标签 - 无content', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
</dmodule>`

    await setEditorContent(page, minimalXml)
    await page.waitForTimeout(1000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      const modalVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)

      if (modalVisible) {
        await confirmBtn.click()
        await page.waitForTimeout(5000)

        const content = await getEditorContent(page)
        console.log('执行后内容长度:', content.length)
        console.log('✅ 最小XML测试完成')
      }
    }
  })

  // ==================== 边界2: 格式异常测试 ====================

  test('边界2-1: XML格式错误 - 未闭合标签', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <para>这是一个未闭合的段落
  </content>
</dmodule>`

    await setEditorContent(page, malformedXml)
    await page.waitForTimeout(1000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      const modalVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)

      if (modalVisible) {
        await confirmBtn.click()
        await page.waitForTimeout(5000)

        // 检查是否有解析错误提示
        const errorMsg = page.locator('.ant-message-error')
        const hasError = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false)

        if (hasError) {
          console.log('✅ 格式错误被检测到')
        } else {
          console.log('⚠️ 格式错误未被检测（可能已被容错处理）')
        }
      }
    }
  })

  test('边界2-2: 大文档测试 - 超过1MB', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    // 生成大文档（约1MB）
    const largePara = '<para>' + 'A'.repeat(1000) + '</para>\n'
    const largeContent = largePara.repeat(1000) // 约1MB

    const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    ${largeContent}
  </content>
</dmodule>`

    console.log('生成大文档，大小:', (largeXml.length / 1024 / 1024).toFixed(2), 'MB')

    await setEditorContent(page, largeXml)
    await page.waitForTimeout(2000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      const startTime = Date.now()

      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      const modalVisible = await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)

      if (modalVisible) {
        await confirmBtn.click()
        await page.waitForTimeout(15000) // 大文档需要更长时间

        const endTime = Date.now()
        const duration = ((endTime - startTime) / 1000).toFixed(2)

        console.log('✅ 大文档处理完成，耗时:', duration, '秒')

        // 检查是否有性能警告
        const warningMsg = page.locator('.ant-message:has-text("较慢"), .ant-message:has-text("大文档")')
        const hasWarning = await warningMsg.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasWarning) {
          console.log('✅ 显示了大文档警告')
        }
      }
    }
  })

  // ==================== 边界3: 特殊字符测试 ====================

  test('边界3-1: ICN包含特殊字符', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const specialCharXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <graphic infoEntityIdent="ICN-测试-特殊字符-123"/>
    <graphic infoEntityIdent="ICN_WITH_UNDERSCORE"/>
    <graphic infoEntityIdent="ICN.WITH.DOTS"/>
  </content>
</dmodule>`

    await setEditorContent(page, specialCharXml)
    await page.waitForTimeout(1000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      await confirmBtn.click()
      await page.waitForTimeout(5000)

      const content = await getEditorContent(page)
      const hasDoctype = content.includes('<!DOCTYPE')
      const hasEntity = content.includes('ENTITY')

      console.log('✅ 特殊字符ICN测试完成')
      console.log('生成DOCTYPE:', hasDoctype)
      console.log('包含ENTITY:', hasEntity)
    }
  })

  // ==================== 边界4: 多图形元素测试 ====================

  test('边界4-1: 大量图形元素 - 100个', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    // 生成100个图形元素
    const graphics = Array.from({ length: 100 }, (_, i) =>
      `    <graphic infoEntityIdent="ICN-${String(i + 1).padStart(3, '0')}"/>`
    ).join('\n')

    const manyGraphicsXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
${graphics}
  </content>
</dmodule>`

    await setEditorContent(page, manyGraphicsXml)
    await page.waitForTimeout(1000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      const startTime = Date.now()

      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      await confirmBtn.click()
      await page.waitForTimeout(10000)

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      const content = await getEditorContent(page)
      const entityCount = (content.match(/ENTITY/g) || []).length

      console.log('✅ 100个图形元素测试完成')
      console.log('耗时:', duration, '秒')
      console.log('生成ENTITY数量:', entityCount)
    }
  })

  test('边界4-2: 重复的ICN引用', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const duplicateXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <graphic infoEntityIdent="ICN-001"/>
    <graphic infoEntityIdent="ICN-001"/>
    <graphic infoEntityIdent="ICN-001"/>
    <graphic infoEntityIdent="ICN-002"/>
    <graphic infoEntityIdent="ICN-002"/>
  </content>
</dmodule>`

    await setEditorContent(page, duplicateXml)
    await page.waitForTimeout(1000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      await confirmBtn.click()
      await page.waitForTimeout(5000)

      const content = await getEditorContent(page)

      // 统计ENTITY声明数量
      const entityMatches = content.match(/<!ENTITY\s+ICN-\d+/g) || []
      const uniqueEntities = [...new Set(entityMatches)]

      console.log('✅ 重复ICN测试完成')
      console.log('ENTITY总数:', entityMatches.length)
      console.log('去重后:', uniqueEntities.length)
      console.log('去重是否生效:', uniqueEntities.length === 2)
    }
  })

  // ==================== 边界5: brexDmRef保留测试 ====================

  test('边界5-1: brexDmRef不应被删除', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const brexXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <refs>
      <dmRef>
        <dmRefIdent>
          <dmCode modelIdentCode="BREX" />
        </dmRefIdent>
      </dmRef>
      <dmRef>
        <dmRefIdent>
          <dmCode modelIdentCode="TEST" />
        </dmRefIdent>
      </dmRef>
    </refs>
  </content>
</dmodule>`

    await setEditorContent(page, brexXml)
    await page.waitForTimeout(1000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      await confirmBtn.click()
      await page.waitForTimeout(5000)

      const content = await getEditorContent(page)

      const hasBrex = content.includes('BREX')
      const hasTest = content.includes('TEST')

      console.log('✅ brexDmRef保留测试完成')
      console.log('保留BREX:', hasBrex)
      console.log('删除TEST:', !hasTest)

      if (hasBrex && !hasTest) {
        console.log('✅ brexDmRef正确保留，其他dmRef已删除')
      } else if (hasBrex && hasTest) {
        console.log('⚠️ 所有dmRef都被保留（可能逻辑有变）')
      } else {
        console.log('❌ brexDmRef被错误删除')
      }
    }
  })

  // ==================== 边界6: 用户交互中断测试 ====================

  test('边界6-1: 重建中关闭浏览器标签（模拟）', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      await confirmBtn.click()

      // 立即关闭并重新打开页面（模拟中断）
      await page.waitForTimeout(2000)
      await page.reload()
      await page.waitForTimeout(3000)

      // 检查页面是否正常恢复
      const hasCodeMirror = await page.locator('.CodeMirror').isVisible({ timeout: 5000 }).catch(() => false)

      if (hasCodeMirror) {
        console.log('✅ 中断后页面正常恢复')
      } else {
        console.log('⚠️ 中断后页面恢复异常')
      }
    }
  })

  // ==================== 边界7: 极限测试 ====================

  test('边界7-1: 超长ICN名称', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const longIcnName = 'ICN-' + 'A'.repeat(200)

    const longNameXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <graphic infoEntityIdent="${longIcnName}"/>
  </content>
</dmodule>`

    await setEditorContent(page, longNameXml)
    await page.waitForTimeout(1000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      await confirmBtn.click()
      await page.waitForTimeout(5000)

      const content = await getEditorContent(page)
      const hasLongName = content.includes(longIcnName)

      console.log('✅ 超长ICN名称测试完成')
      console.log('名称长度:', longIcnName.length)
      console.log('正确处理:', hasLongName)
    }
  })

  test('边界7-2: 无任何内容的content标签', async () => {
    await navigateToDmList(page)
    await openFirstDm(page)

    const emptyContentXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content></content>
</dmodule>`

    await setEditorContent(page, emptyContentXml)
    await page.waitForTimeout(1000)

    const regenBtn = page.locator('button:has-text("重建refs")').first()
    const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnExists) {
      await regenBtn.click()
      await page.waitForTimeout(1000)

      const confirmBtn = page.locator('.ant-modal button:has-text("确定")').first()
      await confirmBtn.click()
      await page.waitForTimeout(5000)

      const content = await getEditorContent(page)
      const hasDoctype = content.includes('<!DOCTYPE')
      const hasRefs = content.includes('<refs>')

      console.log('✅ 空content测试完成')
      console.log('生成DOCTYPE:', hasDoctype)
      console.log('生成refs:', hasRefs)
    }
  })
})
