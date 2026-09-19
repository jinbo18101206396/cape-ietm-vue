/**
 * Playwright 3D格式上传验证脚本
 * 手工执行验证P0修复效果
 */

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const testDataDir = path.join(__dirname, '../test-data/3d-models')

const testFiles = [
  { format: 'glTF', file: 'test-triangle.gltf', ext: '.gltf' },
  { format: 'GLB', file: 'DamagedHelmet.glb', ext: '.glb' },
  { format: 'OBJ', file: 'test-cube.obj', ext: '.obj' },
  { format: 'STL', file: 'test-tetrahedron.stl', ext: '.stl' },
  { format: 'PLY', file: 'test-pyramid.ply', ext: '.ply' },
  { format: 'VRML', file: 'test-triangle.wrl', ext: '.wrl' }
]

async function verifyAcceptAttribute(page) {
  console.log('\n📋 验证1: accept属性检查')
  console.log('=' .repeat(60))
  
  // 查找所有文件上传input
  const fileInputs = await page.$$('input[type="file"]')
  
  for (let i = 0; i < fileInputs.length; i++) {
    const input = fileInputs[i]
    const accept = await input.getAttribute('accept')
    
    console.log(`\n🔍 文件上传框 #${i + 1}:`)
    console.log(`   accept="${accept}"`)
    
    // 检查是否包含新格式
    const requiredFormats = ['.gltf', '.glb', '.obj', '.stl', '.fbx', '.dae', '.ply']
    const results = []
    
    for (const fmt of requiredFormats) {
      const hasFormat = accept.includes(fmt)
      results.push({ format: fmt, has: hasFormat })
      console.log(`   ${hasFormat ? '✅' : '❌'} ${fmt}`)
    }
    
    const allPresent = results.every(r => r.has)
    console.log(`\n   ${allPresent ? '✅ 全部格式已添加' : '❌ 部分格式缺失'}`)
  }
}

async function verifyUploadTips(page) {
  console.log('\n\n📋 验证2: 提示文字检查')
  console.log('=' .repeat(60))
  
  const tips = await page.$$('.upload-tips')
  
  for (let i = 0; i < tips.length; i++) {
    const tip = tips[i]
    const text = await tip.textContent()
    
    console.log(`\n🔍 提示文字 #${i + 1}:`)
    console.log(`   "${text}"`)
    
    const formats = ['gltf', 'glb', 'obj', 'stl', 'fbx', 'dae', 'ply']
    const results = []
    
    for (const fmt of formats) {
      const hasFormat = text.toLowerCase().includes(fmt)
      results.push({ format: fmt, has: hasFormat })
      console.log(`   ${hasFormat ? '✅' : '❌'} ${fmt}`)
    }
  }
}

async function verifyFileUpload(page, testFile) {
  console.log(`\n\n📋 验证3: 文件上传测试 - ${testFile.format}`)
  console.log('=' .repeat(60))
  
  const filePath = path.join(testDataDir, testFile.file)
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 测试文件不存在: ${filePath}`)
    return false
  }
  
  console.log(`📁 测试文件: ${testFile.file}`)
  console.log(`📏 文件大小: ${fs.statSync(filePath).size} bytes`)
  
  try {
    // 查找文件上传input
    const fileInput = await page.$('input[type="file"]')
    
    if (!fileInput) {
      console.log('❌ 未找到文件上传输入框')
      return false
    }
    
    // 尝试上传文件
    await fileInput.setInputFiles(filePath)
    await page.waitForTimeout(1000)
    
    // 检查是否有错误消息
    const errorMessage = await page.$('.ant-message-error')
    if (errorMessage) {
      const errorText = await errorMessage.textContent()
      console.log(`❌ 上传被拒绝: ${errorText}`)
      return false
    }
    
    // 检查文件列表
    const fileList = await page.$('.ant-upload-list')
    if (fileList) {
      const listText = await fileList.textContent()
      if (listText.includes(testFile.file)) {
        console.log(`✅ 文件成功添加到上传列表`)
        return true
      }
    }
    
    console.log(`⚠️  无法确认文件是否添加成功`)
    return false
    
  } catch (error) {
    console.log(`❌ 上传过程出错: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 启动 Playwright 3D格式上传验证')
  console.log('=' .repeat(60))
  
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    console.log('\n📱 打开应用: http://localhost:3000')
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(2000)
    
    console.log('🔑 等待登录...')
    // 如果有登录页面，这里需要填写登录逻辑
    // await page.fill('input[name="username"]', 'admin')
    // await page.fill('input[name="password"]', 'password')
    // await page.click('button[type="submit"]')
    
    console.log('\n🧭 导航到图符管理页面')
    await page.goto('http://localhost:3000/#/ietm/icnmanage')
    await page.waitForTimeout(2000)
    
    console.log('➕ 点击"新增"按钮')
    const addButton = await page.$('button:has-text("新增")')
    
    if (!addButton) {
      console.log('❌ 未找到"新增"按钮，请确认：')
      console.log('   1. 前端服务是否已启动 (npm run serve)')
      console.log('   2. 是否已登录系统')
      console.log('   3. 是否有权限访问图符管理')
      await browser.close()
      return
    }
    
    await addButton.click()
    await page.waitForTimeout(1000)
    
    // 执行验证
    await verifyAcceptAttribute(page)
    await verifyUploadTips(page)
    
    // 测试文件上传
    console.log('\n\n📋 验证3: 文件上传功能测试')
    console.log('=' .repeat(60))
    
    let successCount = 0
    let failCount = 0
    
    for (const testFile of testFiles) {
      const success = await verifyFileUpload(page, testFile)
      if (success) {
        successCount++
      } else {
        failCount++
      }
      
      // 清理：移除已添加的文件
      const removeButtons = await page.$$('.ant-upload-list-item-card-actions-btn')
      for (const btn of removeButtons) {
        await btn.click()
        await page.waitForTimeout(300)
      }
    }
    
    // 总结
    console.log('\n\n📊 测试总结')
    console.log('=' .repeat(60))
    console.log(`✅ 成功: ${successCount}/${testFiles.length}`)
    console.log(`❌ 失败: ${failCount}/${testFiles.length}`)
    
    if (failCount === 0) {
      console.log('\n🎉 所有测试通过！P0修复验证成功！')
    } else {
      console.log('\n⚠️  部分测试失败，请检查代码修改')
    }
    
  } catch (error) {
    console.error('\n❌ 测试执行出错:', error)
  } finally {
    console.log('\n⏸️  测试完成，浏览器将在5秒后关闭...')
    await page.waitForTimeout(5000)
    await browser.close()
  }
}

main().catch(console.error)
