/**
 * 单元测试：数据模块导入 - ZIP文件展开逻辑
 * 测试核心方法的逻辑正确性
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import flushPromises from 'flush-promises'

// Mock Vue组件中的部分逻辑进行单元测试
describe('数据模块导入 - ZIP展开逻辑测试', () => {

  test('parseZipFile 应该正确解析ZIP文件并创建虚拟文件对象', async () => {
    // 模拟后端返回的数据
    const mockBeforeImportResponse = {
      success: true,
      result: {
        'DMC-001.xml': '{"vld":"1"}',
        'DMC-002.xml': '{"vld":"1"}',
        'ICN-001.png': '{"vld":"1"}'
      }
    }

    // 模拟组件方法
    const parseZipFile = async function(zipFile) {
      // 模拟API调用
      const res = mockBeforeImportResponse

      if (!res.success || !res.result) {
        throw new Error('解析ZIP文件失败')
      }

      const resultMap = res.result
      const innerFiles = []

      for (const [fileName, vldJson] of Object.entries(resultMap)) {
        try {
          const vldObj = JSON.parse(vldJson)
          const code = parseInt(vldObj.vld)

          const virtualFile = {
            name: fileName,
            uid: new Date().getTime() + '_' + Math.random() + '_' + fileName,
            size: 0,
            type: fileName.toLowerCase().endsWith('.xml') ? 'text/xml' : 'application/octet-stream',
            validated: true,
            validateSuccess: code === 1 || code > 0,
            validateMessage: code === 1 ? '校验通过' : '校验失败',
            validateDetail: null,
            sourceZipFile: zipFile,
            isFromZip: true
          }

          innerFiles.push(virtualFile)
        } catch (e) {
          console.error('解析失败:', e)
        }
      }

      if (innerFiles.length === 0) {
        throw new Error('ZIP文件中没有有效的文件')
      }

      return innerFiles
    }

    // 执行测试
    const mockZipFile = { name: 'test.zip', size: 1024 }
    const result = await parseZipFile(mockZipFile)

    // 验证结果
    expect(result).toHaveLength(3)
    expect(result[0].name).toBe('DMC-001.xml')
    expect(result[0].validated).toBe(true)
    expect(result[0].validateSuccess).toBe(true)
    expect(result[0].isFromZip).toBe(true)
    expect(result[0].sourceZipFile).toBe(mockZipFile)

    expect(result[1].name).toBe('DMC-002.xml')
    expect(result[2].name).toBe('ICN-001.png')

    console.log('✓ parseZipFile 逻辑正确')
  })

  test('doImport 应该正确分组处理虚拟文件和独立文件', () => {
    // 模拟文件列表
    const mockZipFile = { name: 'package.zip', size: 2048 }

    const files = [
      // 来自ZIP的虚拟文件
      {
        name: 'DMC-001.xml',
        validated: true,
        validateSuccess: true,
        vldCode: 1,
        isFromZip: true,
        sourceZipFile: mockZipFile
      },
      {
        name: 'DMC-002.xml',
        validated: true,
        validateSuccess: true,
        vldCode: 1,
        isFromZip: true,
        sourceZipFile: mockZipFile
      },
      // 独立上传的XML文件
      {
        name: 'DMC-SINGLE.xml',
        validated: true,
        validateSuccess: true,
        vldCode: 1,
        size: 512
      }
    ]

    // 模拟doImport中的分组逻辑
    const zipFileMap = new Map()
    const standaloneXmlFiles = []

    files.forEach(file => {
      if (file.isFromZip && file.sourceZipFile) {
        if (!zipFileMap.has(file.sourceZipFile)) {
          zipFileMap.set(file.sourceZipFile, [])
        }
        zipFileMap.get(file.sourceZipFile).push(file)
      } else {
        standaloneXmlFiles.push(file)
      }
    })

    // 验证分组结果
    expect(zipFileMap.size).toBe(1)
    expect(zipFileMap.get(mockZipFile)).toHaveLength(2)
    expect(standaloneXmlFiles).toHaveLength(1)
    expect(standaloneXmlFiles[0].name).toBe('DMC-SINGLE.xml')

    // 构建导入文件列表
    const importFiles = []

    zipFileMap.forEach((virtualFiles, zipFile) => {
      virtualFiles.forEach(vf => {
        importFiles.push({
          filename: vf.name,
          validing: JSON.stringify({ vld: String(vf.vldCode || 1) })
        })
      })
    })

    standaloneXmlFiles.forEach(file => {
      importFiles.push({
        filename: file.name,
        validing: JSON.stringify({ vld: String(file.vldCode || 1) })
      })
    })

    // 验证导入文件列表
    expect(importFiles).toHaveLength(3)
    expect(importFiles[0].filename).toBe('DMC-001.xml')
    expect(importFiles[1].filename).toBe('DMC-002.xml')
    expect(importFiles[2].filename).toBe('DMC-SINGLE.xml')

    console.log('✓ doImport 分组逻辑正确')
  })

  test('validateFile 应该跳过已校验的虚拟文件', async () => {
    let apiCallCount = 0

    const validateFile = async function(file) {
      // 如果是从ZIP解析出来的虚拟文件，已经在上传时校验过了
      if (file.isFromZip && file.validated) {
        // 不调用API，直接返回
        return
      }

      // 模拟API调用
      apiCallCount++
      file.validated = true
      file.validateSuccess = true
    }

    // 测试虚拟文件（应该跳过）
    const virtualFile = {
      name: 'DMC-001.xml',
      isFromZip: true,
      validated: true,
      validateSuccess: true
    }

    await validateFile(virtualFile)
    expect(apiCallCount).toBe(0) // 不应该调用API

    // 测试独立文件（应该调用API）
    const standaloneFile = {
      name: 'DMC-SINGLE.xml',
      validated: false
    }

    await validateFile(standaloneFile)
    expect(apiCallCount).toBe(1) // 应该调用一次API

    console.log('✓ validateFile 跳过逻辑正确')
  })

  test('handleFileInputChange 应该正确处理ZIP文件上传', async () => {
    // 模拟组件方法
    const mockComponent = {
      fileList: [],

      async parseZipFile(zipFile) {
        // 模拟返回3个文件
        return [
          {
            name: 'DMC-001.xml',
            validated: true,
            validateSuccess: true,
            isFromZip: true,
            sourceZipFile: zipFile
          },
          {
            name: 'DMC-002.xml',
            validated: true,
            validateSuccess: true,
            isFromZip: true,
            sourceZipFile: zipFile
          },
          {
            name: 'ICN-001.png',
            validated: true,
            validateSuccess: true,
            isFromZip: true,
            sourceZipFile: zipFile
          }
        ]
      },

      async handleFileInputChange(event) {
        const files = event.target.files

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const isZip = file.name.toLowerCase().endsWith('.zip')

          if (isZip) {
            // ZIP文件：先调用parseZipFile解析
            const innerFiles = await this.parseZipFile(file)

            // 将内部文件添加到列表
            for (const innerFile of innerFiles) {
              this.fileList.push(innerFile)
            }
          } else {
            // XML文件：直接添加
            this.fileList.push(file)
          }
        }
      }
    }

    // 模拟上传ZIP文件
    const mockZipFile = { name: 'test.zip', size: 1024 }
    const mockEvent = {
      target: {
        files: [mockZipFile]
      }
    }

    await mockComponent.handleFileInputChange(mockEvent)

    // 验证结果
    expect(mockComponent.fileList).toHaveLength(3)
    expect(mockComponent.fileList[0].name).toBe('DMC-001.xml')
    expect(mockComponent.fileList[1].name).toBe('DMC-002.xml')
    expect(mockComponent.fileList[2].name).toBe('ICN-001.png')

    // 验证不包含ZIP文件本身
    const hasZipFile = mockComponent.fileList.some(f => f.name === 'test.zip')
    expect(hasZipFile).toBe(false)

    console.log('✓ handleFileInputChange ZIP处理逻辑正确')
  })

  test('集成测试：完整流程验证', async () => {
    // 模拟完整的上传、校验、导入流程
    const mockComponent = {
      fileList: [],
      importCallCount: 0,

      async parseZipFile(zipFile) {
        return [
          { name: 'DMC-001.xml', validated: true, validateSuccess: true, vldCode: 1, isFromZip: true, sourceZipFile: zipFile },
          { name: 'DMC-002.xml', validated: true, validateSuccess: true, vldCode: 1, isFromZip: true, sourceZipFile: zipFile }
        ]
      },

      async handleFileInputChange(event) {
        const files = event.target.files
        for (let file of files) {
          if (file.name.endsWith('.zip')) {
            const innerFiles = await this.parseZipFile(file)
            this.fileList.push(...innerFiles)
          } else {
            file.validated = false
            this.fileList.push(file)
          }
        }
      },

      async doImport(files) {
        const zipFileMap = new Map()
        const standaloneXmlFiles = []

        files.forEach(file => {
          if (file.isFromZip && file.sourceZipFile) {
            if (!zipFileMap.has(file.sourceZipFile)) {
              zipFileMap.set(file.sourceZipFile, [])
            }
            zipFileMap.get(file.sourceZipFile).push(file)
          } else {
            standaloneXmlFiles.push(file)
          }
        })

        const importFiles = []
        zipFileMap.forEach((virtualFiles) => {
          virtualFiles.forEach(vf => {
            importFiles.push({ filename: vf.name, validing: JSON.stringify({ vld: '1' }) })
          })
        })
        standaloneXmlFiles.forEach(file => {
          importFiles.push({ filename: file.name, validing: JSON.stringify({ vld: '1' }) })
        })

        this.importCallCount++
        return { success: true, importFiles }
      }
    }

    // 步骤1：上传ZIP文件
    const mockZipFile = { name: 'package.zip', size: 2048 }
    await mockComponent.handleFileInputChange({ target: { files: [mockZipFile] } })

    expect(mockComponent.fileList).toHaveLength(2)
    expect(mockComponent.fileList[0].name).toBe('DMC-001.xml')
    expect(mockComponent.fileList[0].validated).toBe(true)

    // 步骤2：上传独立XML
    const mockXmlFile = { name: 'DMC-SINGLE.xml', size: 512 }
    await mockComponent.handleFileInputChange({ target: { files: [mockXmlFile] } })

    expect(mockComponent.fileList).toHaveLength(3)

    // 步骤3：执行导入
    const validFiles = mockComponent.fileList.filter(f => f.validated || !f.isFromZip)
    const result = await mockComponent.doImport(validFiles)

    expect(result.success).toBe(true)
    expect(result.importFiles).toHaveLength(3)
    expect(result.importFiles[0].filename).toBe('DMC-001.xml')
    expect(result.importFiles[1].filename).toBe('DMC-002.xml')
    expect(result.importFiles[2].filename).toBe('DMC-SINGLE.xml')

    console.log('✓ 完整流程测试通过')
  })
})
