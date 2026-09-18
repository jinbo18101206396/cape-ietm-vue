/**
 * 测试辅助函数
 * 提供通用的测试工具函数
 */

const path = require('path')
const fs = require('fs')
const config = require('../test-config')

/**
 * 登录到系统
 */
async function login(page, username, password) {
  await page.goto('/')

  // 检查是否已登录
  const isLoggedIn = await page.locator('.ant-layout-header').isVisible().catch(() => false)
  if (isLoggedIn) {
    console.log('用户已登录')
    return true
  }

  // 执行登录
  try {
    await page.fill('input[placeholder="请输入用户名"]', username || config.auth.username)
    await page.fill('input[placeholder="请输入密码"]', password || config.auth.password)
    await page.click('button[type="submit"]')

    // 等待登录完成
    await page.waitForSelector('.ant-layout-header', { timeout: 10000 })
    console.log('登录成功')
    return true
  } catch (error) {
    console.error('登录失败:', error.message)
    return false
  }
}

/**
 * 打开项目
 */
async function openProject(page, projectName) {
  try {
    // 点击项目菜单
    await page.click('text=项目管理')
    await page.waitForTimeout(1000)

    // 查找并打开项目
    const projectRow = page.locator(`tr:has-text("${projectName || config.project.name}")`)
    if (await projectRow.isVisible({ timeout: 5000 })) {
      await projectRow.locator('text=打开').first().click()
      await page.waitForTimeout(2000)
      console.log(`项目 "${projectName || config.project.name}" 已打开`)
      return true
    } else {
      console.warn(`未找到项目 "${projectName || config.project.name}"`)
      return false
    }
  } catch (error) {
    console.error('打开项目失败:', error.message)
    return false
  }
}

/**
 * 导航到数据模块导入页面
 */
async function navigateToImportPage(page) {
  try {
    await page.goto('/#/ietm/ietmimport/IetmDmImport')
    await page.waitForTimeout(1500)

    // 验证页面加载成功
    const pageTitle = await page.locator('.ant-card-head-title:has-text("来源数据交换凭证DDN")').isVisible({ timeout: 5000 })
    if (pageTitle) {
      console.log('导入页面加载成功')
      return true
    }
    return false
  } catch (error) {
    console.error('导航到导入页面失败:', error.message)
    return false
  }
}

/**
 * 创建有效的测试XML文件
 */
function createValidDmFile(filename, dmCode) {
  const tempDir = path.join(__dirname, '../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const filePath = path.join(tempDir, filename)

  const dmCodeParts = (dmCode || config.testData.validDmCode).split('-')
  const [modelIdentCode, systemDiffCode, systemCode, subSystemCode, subSubSystemCode, assyCode, disassyCode, disassyCodeVariant, infoCode, infoCodeVariant, itemLocationCode] = [
    dmCodeParts[0] || 'HOUXJJ00',
    dmCodeParts[1] || 'A',
    dmCodeParts[2]?.substring(0, 3) || 'AAA',
    dmCodeParts[2]?.substring(3, 5) || '00',
    dmCodeParts[3]?.substring(0, 2) || '00',
    dmCodeParts[3]?.substring(2, 3) || 'A',
    dmCodeParts[4]?.substring(0, 3) || '040',
    dmCodeParts[4]?.substring(3, 4) || 'A',
    dmCodeParts[5]?.substring(0, 3) || '040',
    dmCodeParts[5]?.substring(3, 4) || 'A',
    dmCodeParts[6] || 'A'
  ]

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/descript.xsd">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="${modelIdentCode}"
                systemDiffCode="${systemDiffCode}"
                systemCode="${systemCode}"
                subSystemCode="${subSystemCode}"
                subSubSystemCode="${subSubSystemCode}"
                assyCode="${assyCode}"
                disassyCode="${disassyCode}"
                disassyCodeVariant="${disassyCodeVariant}"
                infoCode="${infoCode}"
                infoCodeVariant="${infoCodeVariant}"
                itemLocationCode="${itemLocationCode}"/>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
        <issueInfo issueNumber="001" inWork="00"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="09" day="04"/>
        <dmTitle>
          <techName>测试数据模块</techName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
      <responsiblePartnerCompany>
        <enterpriseName>测试单位</enterpriseName>
      </responsiblePartnerCompany>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>测试内容</title>
        <para>这是一个用于测试的数据模块文件。</para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`创建测试文件: ${filePath}`)
  return filePath
}

/**
 * 创建无效的测试XML文件
 */
function createInvalidDmFile(filename) {
  const tempDir = path.join(__dirname, '../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const filePath = path.join(tempDir, filename)
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<invalid>
  <data>这是一个无效的XML文件</data>
</invalid>`

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`创建无效测试文件: ${filePath}`)
  return filePath
}

/**
 * 创建测试图片文件
 */
function createTestImageFile(filename, extension) {
  const tempDir = path.join(__dirname, '../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const filePath = path.join(tempDir, filename)

  // 创建一个最小的PNG文件 (1x1像素)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ])

  fs.writeFileSync(filePath, pngBuffer)
  console.log(`创建测试图片文件: ${filePath}`)
  return filePath
}

/**
 * 上传文件到系统
 */
async function uploadFile(page, filePath) {
  try {
    // 点击上传按钮
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)

    // 选择文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
    await page.waitForTimeout(500)

    // 确认上传
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    console.log(`文件已上传: ${path.basename(filePath)}`)
    return true
  } catch (error) {
    console.error('上传文件失败:', error.message)
    return false
  }
}

/**
 * 校验文件
 */
async function validateFiles(page) {
  try {
    await page.click('button:has-text("校验")')
    console.log('开始校验文件...')

    // 等待校验完成（等待进度提示消失）
    await page.waitForTimeout(3000)

    // 检查校验结果
    const successMsg = await page.locator('.ant-message-success').isVisible({ timeout: 2000 }).catch(() => false)
    const warningMsg = await page.locator('.ant-message-warning').isVisible({ timeout: 2000 }).catch(() => false)

    if (successMsg) {
      console.log('校验成功')
      return true
    } else if (warningMsg) {
      console.log('校验部分失败')
      return true
    } else {
      console.log('校验状态未知')
      return false
    }
  } catch (error) {
    console.error('校验文件失败:', error.message)
    return false
  }
}

/**
 * 导入文件
 */
async function importFiles(page) {
  try {
    const importBtn = page.locator('button:has-text("导入")')
    await importBtn.click()
    console.log('开始导入文件...')

    // 等待导入完成
    await page.waitForTimeout(3000)

    // 检查导入结果对话框
    const resultModal = await page.locator('.ant-modal:has-text("导入结果")').isVisible({ timeout: 5000 }).catch(() => false)

    if (resultModal) {
      console.log('导入完成，结果对话框已显示')
      return true
    } else {
      console.log('导入可能失败或未显示结果')
      return false
    }
  } catch (error) {
    console.error('导入文件失败:', error.message)
    return false
  }
}

/**
 * 清理临时文件
 */
function cleanupTempFiles() {
  const tempDir = path.join(__dirname, '../temp')
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir)
    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(tempDir, file))
      } catch (error) {
        console.error(`删除文件失败: ${file}`, error.message)
      }
    })
    console.log('临时文件已清理')
  }
}

/**
 * 等待API请求完成
 */
async function waitForApiRequest(page, urlPattern, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`API请求超时: ${urlPattern}`))
    }, timeout)

    page.on('response', async response => {
      if (response.url().includes(urlPattern)) {
        clearTimeout(timer)
        const data = await response.json().catch(() => null)
        resolve({ status: response.status(), data })
      }
    })
  })
}

module.exports = {
  login,
  openProject,
  navigateToImportPage,
  createValidDmFile,
  createInvalidDmFile,
  createTestImageFile,
  uploadFile,
  validateFiles,
  importFiles,
  cleanupTempFiles,
  waitForApiRequest
}
