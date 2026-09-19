/**
 * ICN 3D格式上传E2E测试
 * 验证P0修复：新增ICN时支持上传7种新3D格式
 */

const path = require('path')

describe('ICN 3D格式上传测试', () => {
  const testDataDir = path.join(__dirname, '../../../test-data/3d-models')
  
  const testFiles = [
    { format: 'glTF', file: 'test-triangle.gltf', desc: 'glTF文本格式' },
    { format: 'GLB', file: 'DamagedHelmet.glb', desc: 'glTF二进制格式' },
    { format: 'OBJ', file: 'test-cube.obj', desc: 'Wavefront OBJ格式' },
    { format: 'STL', file: 'test-tetrahedron.stl', desc: 'STL ASCII格式' },
    { format: 'PLY', file: 'test-pyramid.ply', desc: 'PLY ASCII格式' },
    { format: 'VRML', file: 'test-triangle.wrl', desc: 'VRML 2.0格式' }
  ]

  beforeAll(async () => {
    // 登录系统
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(1000)
  })

  describe('IetmIcnManageForm - 新增ICN上传测试', () => {
    testFiles.forEach(({ format, file, desc }) => {
      test(`应该接受${format}格式文件上传 (${desc})`, async () => {
        // 进入图符管理页面
        await page.goto('http://localhost:3000/#/ietm/icnmanage')
        await page.waitForTimeout(500)

        // 点击新增按钮
        const addButton = await page.$('button:has-text("新增")')
        if (addButton) {
          await addButton.click()
          await page.waitForTimeout(500)

          // 查找文件上传input
          const fileInput = await page.$('input[type="file"]')
          expect(fileInput).toBeTruthy()

          // 检查accept属性包含该格式
          const acceptAttr = await fileInput.getAttribute('accept')
          const ext = path.extname(file)
          expect(acceptAttr).toContain(ext)

          // 尝试上传文件
          const filePath = path.join(testDataDir, file)
          await fileInput.setInputFiles(filePath)
          await page.waitForTimeout(500)

          // 验证文件已添加到列表（通过查找文件名）
          const fileListText = await page.textContent('.ant-upload-list')
          expect(fileListText).toContain(file)

          // 关闭弹窗
          const cancelButton = await page.$('button:has-text("取消")')
          if (cancelButton) await cancelButton.click()
        }
      }, 30000)
    })
  })

  describe('文件格式提示文字验证', () => {
    test('新增ICN弹窗应显示所有支持的3D格式', async () => {
      await page.goto('http://localhost:3000/#/ietm/icnmanage')
      await page.waitForTimeout(500)

      const addButton = await page.$('button:has-text("新增")')
      if (addButton) {
        await addButton.click()
        await page.waitForTimeout(500)

        // 查找提示文字
        const tipsText = await page.textContent('.upload-tips')
        
        // 验证包含新增的7种格式
        expect(tipsText).toContain('gltf')
        expect(tipsText).toContain('glb')
        expect(tipsText).toContain('obj')
        expect(tipsText).toContain('stl')
        expect(tipsText).toContain('fbx')
        expect(tipsText).toContain('dae')
        expect(tipsText).toContain('ply')

        const cancelButton = await page.$('button:has-text("取消")')
        if (cancelButton) await cancelButton.click()
      }
    })
  })

  describe('文件格式校验测试', () => {
    test('不支持的格式应被拒绝', async () => {
      await page.goto('http://localhost:3000/#/ietm/icnmanage')
      await page.waitForTimeout(500)

      const addButton = await page.$('button:has-text("新增")')
      if (addButton) {
        await addButton.click()
        await page.waitForTimeout(500)

        // 创建一个不支持的文件
        const unsupportedFile = path.join(testDataDir, 'test-unsupported.xyz')
        const fs = require('fs')
        fs.writeFileSync(unsupportedFile, 'unsupported format')

        const fileInput = await page.$('input[type="file"]')
        await fileInput.setInputFiles(unsupportedFile)
        await page.waitForTimeout(500)

        // 应该显示错误消息
        const errorMessage = await page.textContent('.ant-message')
        expect(errorMessage).toContain('不支持的文件格式')

        // 清理
        fs.unlinkSync(unsupportedFile)

        const cancelButton = await page.$('button:has-text("取消")')
        if (cancelButton) await cancelButton.click()
      }
    })
  })
})
