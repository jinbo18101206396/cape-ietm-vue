/**
 * 组件单元测试：数据模块导入 - ZIP展开功能
 *
 * 测试策略：
 * 1. 直接测试Vue组件的方法
 * 2. Mock API响应
 * 3. 验证数据流转和UI状态
 * 4. 不依赖完整的应用环境
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import flushPromises from 'flush-promises'
import IetmDmImport from '@/views/ietm/ietmimport/IetmDmImport.vue'

const localVue = createLocalVue()
localVue.use(Antd)

// Mock API模块
jest.mock('@/api/manage', () => ({
  postAction: jest.fn()
}))

const { postAction } = require('@/api/manage')

describe('数据模块导入 - ZIP展开功能单元测试', () => {
  let wrapper

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks()

    // Mock Vue原型方法
    localVue.prototype.$message = {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      loading: jest.fn(() => jest.fn()) // 返回hide函数
    }

    localVue.prototype.$confirm = jest.fn()

    // 挂载组件
    wrapper = mount(IetmDmImport, {
      localVue,
      stubs: {
        'j-dict-select-tag': true,
        'a-card': true,
        'a-form-model': true,
        'a-form-model-item': true,
        'a-input': true,
        'a-select': true,
        'a-select-option': true,
        'a-date-picker': true,
        'a-table': true,
        'a-space': true,
        'a-button': true,
        'a-alert': true
      },
      data() {
        return {
          currentProjectId: 'test-project-001',
          currentProjectInfo: {
            id: 'test-project-001',
            name: '测试项目',
            parameters: '{}'
          }
        }
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
  })

  // ==================== 核心功能测试 ====================

  test('功能1: parseZipFile 应该正确解析ZIP并创建虚拟文件对象', async () => {
    console.log('\n=== 功能1: parseZipFile 解析测试 ===')

    // Mock API响应
    postAction.mockResolvedValue({
      success: true,
      result: {
        files: [
          {
            fileName: 'DMC-001.xml',
            fileType: 'DM',
            resultCode: '1',
            resultMessage: '校验通过',
            dmcCode: 'DMC-001',
            tempFilePath: '/tmp/file1.xml',
            xmlContent: '<dmodule>...</dmodule>'
          },
          {
            fileName: 'DMC-002.xml',
            fileType: 'DM',
            resultCode: '1',
            resultMessage: '校验通过',
            dmcCode: 'DMC-002',
            tempFilePath: '/tmp/file2.xml',
            xmlContent: '<dmodule>...</dmodule>'
          },
          {
            fileName: 'ICN-001.PNG',
            fileType: 'ICN',
            resultCode: '1',
            resultMessage: '校验通过',
            tempFilePath: '/tmp/icn1.png'
          }
        ]
      }
    })

    // 创建模拟ZIP文件
    const mockZipFile = new File(['zip content'], 'test.zip', { type: 'application/zip' })

    // 调用parseZipFile
    const result = await wrapper.vm.parseZipFile(mockZipFile)

    // 验证API调用
    expect(postAction).toHaveBeenCalledTimes(1)
    expect(postAction).toHaveBeenCalledWith(
      '/ietm/ietmimport/validate',
      expect.any(Object),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )

    // 验证返回的虚拟文件对象
    expect(result).toHaveLength(3)

    // 验证第一个XML文件
    expect(result[0].name).toBe('DMC-001.xml')
    expect(result[0].validated).toBe(true)
    expect(result[0].validateSuccess).toBe(true)
    expect(result[0].validateMessage).toBe('校验通过')
    expect(result[0].isFromZip).toBe(true)
    expect(result[0].sourceZipFile).toBe(mockZipFile)
    expect(result[0].dmcCode).toBe('DMC-001')

    // 验证第二个XML文件
    expect(result[1].name).toBe('DMC-002.xml')
    expect(result[1].isFromZip).toBe(true)

    // 验证ICN文件
    expect(result[2].name).toBe('ICN-001.PNG')
    expect(result[2].type).toBe('application/octet-stream')
    expect(result[2].isFromZip).toBe(true)

    console.log('✓ parseZipFile 正确解析ZIP并创建虚拟文件对象')
  })

  test('功能2: handleFileInputChange 应该展开ZIP为多个文件', async () => {
    console.log('\n=== 功能2: handleFileInputChange ZIP展开测试 ===')

    // Mock parseZipFile
    const mockVirtualFiles = [
      {
        name: 'DMC-001.xml',
        validated: true,
        validateSuccess: true,
        isFromZip: true,
        sourceZipFile: {}
      },
      {
        name: 'DMC-002.xml',
        validated: true,
        validateSuccess: true,
        isFromZip: true,
        sourceZipFile: {}
      }
    ]

    wrapper.vm.parseZipFile = jest.fn().mockResolvedValue(mockVirtualFiles)

    // 初始fileList为空
    expect(wrapper.vm.fileList).toHaveLength(0)

    // 模拟上传ZIP文件
    const mockZipFile = new File(['zip content'], 'test.zip', { type: 'application/zip' })
    const mockEvent = {
      target: {
        files: [mockZipFile],
        value: 'test.zip'
      }
    }

    // 调用handleFileInputChange
    await wrapper.vm.handleFileInputChange(mockEvent)
    await flushPromises()

    // 验证parseZipFile被调用
    expect(wrapper.vm.parseZipFile).toHaveBeenCalledWith(mockZipFile)

    // 验证fileList包含2个虚拟文件
    expect(wrapper.vm.fileList).toHaveLength(2)
    expect(wrapper.vm.fileList[0].name).toBe('DMC-001.xml')
    expect(wrapper.vm.fileList[1].name).toBe('DMC-002.xml')

    // 验证不包含ZIP文件本身
    const hasZipFile = wrapper.vm.fileList.some(f => f.name === 'test.zip')
    expect(hasZipFile).toBe(false)

    console.log('✓ ZIP文件被正确展开为多个虚拟文件')
  })

  test('功能3: handleFileInputChange 应该正常处理独立XML文件', async () => {
    console.log('\n=== 功能3: handleFileInputChange XML文件测试 ===')

    // Mock postAction (用于校验)
    postAction.mockResolvedValue({
      success: true,
      result: { files: [] }
    })

    // 初始fileList为空
    expect(wrapper.vm.fileList).toHaveLength(0)

    // 模拟上传XML文件
    const mockXmlFile = new File(['xml content'], 'DMC-SINGLE.xml', { type: 'text/xml' })
    Object.defineProperty(mockXmlFile, 'size', { value: 1024 })
    Object.defineProperty(mockXmlFile, 'lastModified', { value: Date.now() })

    const mockEvent = {
      target: {
        files: [mockXmlFile],
        value: 'DMC-SINGLE.xml'
      }
    }

    // 调用handleFileInputChange
    await wrapper.vm.handleFileInputChange(mockEvent)
    await flushPromises()

    // 验证fileList包含1个XML文件
    expect(wrapper.vm.fileList).toHaveLength(1)
    expect(wrapper.vm.fileList[0].name).toBe('DMC-SINGLE.xml')
    expect(wrapper.vm.fileList[0].validated).toBe(false) // XML文件初始未校验
    expect(wrapper.vm.fileList[0].isFromZip).toBeUndefined() // 不是来自ZIP

    console.log('✓ 独立XML文件被正确添加到列表')
  })

  test('功能4: validateFile 应该跳过已校验的虚拟文件', async () => {
    console.log('\n=== 功能4: validateFile 跳过逻辑测试 ===')

    // 虚拟文件（来自ZIP，已校验）
    const virtualFile = {
      name: 'DMC-001.xml',
      isFromZip: true,
      validated: true,
      validateSuccess: true
    }

    // 调用validateFile
    await wrapper.vm.validateFile(virtualFile)

    // 验证API没有被调用
    expect(postAction).not.toHaveBeenCalled()

    console.log('✓ 虚拟文件跳过校验，没有调用API')
  })

  test('功能5: validateFile 应该校验独立XML文件', async () => {
    console.log('\n=== 功能5: validateFile XML校验测试 ===')

    // Mock API响应
    postAction.mockResolvedValue({
      success: true,
      result: {
        files: [
          {
            fileName: 'DMC-SINGLE.xml',
            fileType: 'DM',
            resultCode: '1',
            resultMessage: '校验通过',
            dmcCode: 'DMC-SINGLE',
            tempFilePath: '/tmp/single.xml',
            xmlContent: '<dmodule>...</dmodule>'
          }
        ]
      }
    })

    // 独立XML文件
    const xmlFile = new File(['xml content'], 'DMC-SINGLE.xml', { type: 'text/xml' })
    const fileObj = {
      name: 'DMC-SINGLE.xml',
      validated: false,
      sourceFile: xmlFile
    }

    // 调用validateFile
    await wrapper.vm.validateFile(fileObj)

    // 验证API被调用
    expect(postAction).toHaveBeenCalledTimes(1)

    // 验证文件状态被更新
    expect(fileObj.validated).toBe(true)
    expect(fileObj.validateSuccess).toBe(true)
    expect(fileObj.validateMessage).toBe('校验通过')
    expect(fileObj.vldCode).toBe(1)

    console.log('✓ 独立XML文件被正确校验')
  })

  test('功能6: doImport 应该正确分组处理文件', async () => {
    console.log('\n=== 功能6: doImport 分组逻辑测试 ===')

    // 准备测试数据
    const mockZipFile = new File(['zip'], 'test.zip', { type: 'application/zip' })

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
      // 独立XML文件
      {
        name: 'DMC-SINGLE.xml',
        validated: true,
        validateSuccess: true,
        vldCode: 1,
        size: 512
      }
    ]

    // 设置DDN信息
    wrapper.vm.ddnInfo = {
      modelic: '测试型号',
      security: '01',
      sender: '测试单位',
      issueDate: '2026-09-04',
      year: '2026'
    }

    // Mock API
    postAction.mockResolvedValue({
      success: true,
      message: '导入成功',
      result: { importCount: 3 }
    })

    // 调用doImport
    await wrapper.vm.doImport(files)
    await flushPromises()

    // 验证API被调用
    expect(postAction).toHaveBeenCalledTimes(1)

    // 获取调用参数
    const callArgs = postAction.mock.calls[0]
    const formData = callArgs[1]

    // 验证files参数包含3个文件名
    const filesJson = formData.get('files')
    const filesArray = JSON.parse(filesJson)
    expect(filesArray).toHaveLength(3)

    const fileNames = filesArray.map(f => f.filename)
    expect(fileNames).toContain('DMC-001.xml')
    expect(fileNames).toContain('DMC-002.xml')
    expect(fileNames).toContain('DMC-SINGLE.xml')

    // 验证upfilename使用ZIP文件名
    const upfilename = formData.get('upfilename')
    expect(upfilename).toBe('test.zip')

    console.log('✓ doImport 正确分组并构建导入请求')
  })

  // ==================== 边界测试 ====================

  test('边界1: parseZipFile 应该处理空ZIP', async () => {
    console.log('\n=== 边界1: 空ZIP处理 ===')

    // Mock空文件列表响应
    postAction.mockResolvedValue({
      success: true,
      result: { files: [] }
    })

    const mockZipFile = new File([''], 'empty.zip', { type: 'application/zip' })

    // 调用parseZipFile应该抛出异常
    await expect(wrapper.vm.parseZipFile(mockZipFile)).rejects.toThrow('ZIP文件中没有有效的文件')

    console.log('✓ 空ZIP文件被正确拒绝')
  })

  test('边界2: handleFileInputChange 应该跳过重复文件', async () => {
    console.log('\n=== 边界2: 重复文件处理 ===')

    // Mock parseZipFile
    wrapper.vm.parseZipFile = jest.fn().mockResolvedValue([
      { name: 'DMC-001.xml', validated: true, isFromZip: true }
    ])

    // 第一次上传
    const mockZipFile1 = new File(['zip'], 'test.zip', { type: 'application/zip' })
    await wrapper.vm.handleFileInputChange({
      target: { files: [mockZipFile1], value: '' }
    })
    await flushPromises()

    expect(wrapper.vm.fileList).toHaveLength(1)

    // 第二次上传相同文件
    const mockZipFile2 = new File(['zip'], 'test2.zip', { type: 'application/zip' })
    await wrapper.vm.handleFileInputChange({
      target: { files: [mockZipFile2], value: '' }
    })
    await flushPromises()

    // 重复的文件应该被跳过
    expect(wrapper.vm.fileList).toHaveLength(1)
    expect(wrapper.vm.$message.warning).toHaveBeenCalled()

    console.log('✓ 重复文件被正确跳过')
  })

  test('边界3: handleFileInputChange 应该拒绝超大文件', async () => {
    console.log('\n=== 边界3: 超大文件处理 ===')

    // 创建超过1GB的文件
    const mockLargeFile = new File(['large'], 'large.zip', { type: 'application/zip' })
    Object.defineProperty(mockLargeFile, 'size', { value: 2 * 1024 * 1024 * 1024 }) // 2GB

    await wrapper.vm.handleFileInputChange({
      target: { files: [mockLargeFile], value: '' }
    })
    await flushPromises()

    // 文件不应该被添加
    expect(wrapper.vm.fileList).toHaveLength(0)
    expect(wrapper.vm.$message.error).toHaveBeenCalledWith(
      expect.stringContaining('大小超过1GB')
    )

    console.log('✓ 超大文件被正确拒绝')
  })

  test('边界4: handleFileInputChange 应该拒绝非法文件类型', async () => {
    console.log('\n=== 边界4: 非法文件类型处理 ===')

    // 创建非XML/ZIP文件
    const mockInvalidFile = new File(['text'], 'test.txt', { type: 'text/plain' })

    await wrapper.vm.handleFileInputChange({
      target: { files: [mockInvalidFile], value: '' }
    })
    await flushPromises()

    // 文件不应该被添加
    expect(wrapper.vm.fileList).toHaveLength(0)
    expect(wrapper.vm.$message.error).toHaveBeenCalledWith(
      expect.stringContaining('格式不支持')
    )

    console.log('✓ 非法文件类型被正确拒绝')
  })

  test('边界5: validateFile 应该处理API错误', async () => {
    console.log('\n=== 边界5: API错误处理 ===')

    // Mock API错误
    postAction.mockRejectedValue(new Error('网络错误'))

    const xmlFile = new File(['xml'], 'test.xml', { type: 'text/xml' })
    const fileObj = {
      name: 'test.xml',
      validated: false,
      sourceFile: xmlFile
    }

    // 调用validateFile不应该抛出异常
    await expect(wrapper.vm.validateFile(fileObj)).resolves.not.toThrow()

    // 文件状态应该标记为失败
    expect(fileObj.validated).toBe(true)
    expect(fileObj.validateSuccess).toBe(false)
    expect(fileObj.validateMessage).toContain('网络错误')

    console.log('✓ API错误被正确处理')
  })

  test('边界6: doImport 应该处理混合文件来源', async () => {
    console.log('\n=== 边界6: 混合文件来源处理 ===')

    const mockZip1 = new File(['zip1'], 'test1.zip', { type: 'application/zip' })
    const mockZip2 = new File(['zip2'], 'test2.zip', { type: 'application/zip' })

    const files = [
      // 来自第一个ZIP
      { name: 'DMC-001.xml', validated: true, validateSuccess: true, vldCode: 1, isFromZip: true, sourceZipFile: mockZip1 },
      // 来自第二个ZIP
      { name: 'DMC-002.xml', validated: true, validateSuccess: true, vldCode: 1, isFromZip: true, sourceZipFile: mockZip2 },
      // 独立XML
      { name: 'DMC-003.xml', validated: true, validateSuccess: true, vldCode: 1 }
    ]

    wrapper.vm.ddnInfo = {
      modelic: 'TEST',
      security: '01',
      sender: 'TEST',
      issueDate: '2026-09-04',
      year: '2026'
    }

    postAction.mockResolvedValue({ success: true, result: {} })

    await wrapper.vm.doImport(files)
    await flushPromises()

    const callArgs = postAction.mock.calls[0]
    const formData = callArgs[1]
    const filesJson = formData.get('files')
    const filesArray = JSON.parse(filesJson)

    // 所有文件都应该被包含
    expect(filesArray).toHaveLength(3)

    // upfilename应该使用第一个ZIP
    const upfilename = formData.get('upfilename')
    expect(upfilename).toBe('test1.zip')

    console.log('✓ 混合文件来源被正确处理')
  })

  // ==================== 集成场景测试 ====================

  test('集成场景: 完整上传-校验-导入流程', async () => {
    console.log('\n=== 集成场景: 完整流程测试 ===')

    // 1. 上传ZIP文件
    wrapper.vm.parseZipFile = jest.fn().mockResolvedValue([
      { name: 'DMC-001.xml', validated: true, validateSuccess: true, vldCode: 1, isFromZip: true, sourceZipFile: {} },
      { name: 'DMC-002.xml', validated: true, validateSuccess: true, vldCode: 1, isFromZip: true, sourceZipFile: {} }
    ])

    const mockZipFile = new File(['zip'], 'test.zip', { type: 'application/zip' })
    await wrapper.vm.handleFileInputChange({
      target: { files: [mockZipFile], value: '' }
    })
    await flushPromises()

    expect(wrapper.vm.fileList).toHaveLength(2)
    console.log('  ✓ 步骤1: ZIP文件上传并展开')

    // 2. 校验（虚拟文件应该跳过）
    await wrapper.vm.validateFile(wrapper.vm.fileList[0])
    expect(postAction).not.toHaveBeenCalled()
    console.log('  ✓ 步骤2: 虚拟文件跳过校验')

    // 3. 上传独立XML
    const mockXmlFile = new File(['xml'], 'DMC-SINGLE.xml', { type: 'text/xml' })
    Object.defineProperty(mockXmlFile, 'size', { value: 1024 })
    Object.defineProperty(mockXmlFile, 'lastModified', { value: Date.now() })

    await wrapper.vm.handleFileInputChange({
      target: { files: [mockXmlFile], value: '' }
    })
    await flushPromises()

    expect(wrapper.vm.fileList).toHaveLength(3)
    console.log('  ✓ 步骤3: 添加独立XML文件')

    // 4. 校验独立XML
    postAction.mockResolvedValue({
      success: true,
      result: {
        files: [
          {
            fileName: 'DMC-SINGLE.xml',
            fileType: 'DM',
            resultCode: '1',
            resultMessage: '校验通过',
            dmcCode: 'DMC-SINGLE',
            tempFilePath: '/tmp/single.xml',
            xmlContent: '<dmodule>...</dmodule>'
          }
        ]
      }
    })

    await wrapper.vm.validateFile(wrapper.vm.fileList[2])
    expect(postAction).toHaveBeenCalled()
    expect(wrapper.vm.fileList[2].validated).toBe(true)
    console.log('  ✓ 步骤4: 独立XML文件校验通过')

    // 5. 导入
    wrapper.vm.ddnInfo = {
      modelic: 'TEST',
      security: '01',
      sender: 'TEST',
      issueDate: '2026-09-04',
      year: '2026'
    }

    postAction.mockResolvedValue({ success: true, result: {} })

    const validFiles = wrapper.vm.fileList.filter(f => f.validated && f.validateSuccess)
    await wrapper.vm.doImport(validFiles)
    await flushPromises()

    expect(postAction).toHaveBeenCalled()
    console.log('  ✓ 步骤5: 导入请求发送成功')

    console.log('✓ 完整流程测试通过')
  })
})
