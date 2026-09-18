/**
 * 组件单元测试：数据模块导入 - 空数据显示表头
 *
 * 测试策略：
 * 1. 直接测试Vue组件的渲染
 * 2. 验证表格在不同数据状态下的行为
 * 3. 不绕过Vue层，测试真实DOM结构
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import IetmDmImport from '@/views/ietm/ietmimport/IetmDmImport.vue'

const localVue = createLocalVue()
localVue.use(Antd)

// Mock API模块
jest.mock('@/api/manage', () => ({
  postAction: jest.fn()
}))

const { postAction } = require('@/api/manage')

describe('数据模块导入 - 空数据显示表头测试', () => {
  let wrapper

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock Vue原型方法
    localVue.prototype.$message = {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      loading: jest.fn(() => jest.fn())
    }

    localVue.prototype.$confirm = jest.fn()

    // 挂载组件
    wrapper = mount(IetmDmImport, {
      localVue,
      stubs: {
        'j-dict-select-tag': true
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

  test('场景1: 初始状态应该显示表头', async () => {
    console.log('\n=== 场景1: 初始状态应该显示表头 ===')

    // 初始状态，fileList为空
    expect(wrapper.vm.fileList).toHaveLength(0)

    // 查找表格组件
    const table = wrapper.findComponent({ name: 'ATable' })
    expect(table.exists()).toBe(true)

    // 验证表格props
    expect(table.props('dataSource')).toEqual([])
    expect(table.props('columns')).toBeDefined()
    expect(table.props('locale')).toEqual({
      emptyText: '暂无文件，请点击"选择文件"按钮添加'
    })

    console.log('✓ 表格组件存在')
    console.log('✓ 表格dataSource为空数组')
    console.log('✓ 表格locale.emptyText已设置')
  })

  test('场景2: 空数据时不应该显示Alert组件', async () => {
    console.log('\n=== 场景2: 空数据时不应该显示Alert组件 ===')

    // fileList为空
    expect(wrapper.vm.fileList).toHaveLength(0)

    // 查找Alert组件（修改前的逻辑）
    const alerts = wrapper.findAllComponents({ name: 'AAlert' })

    // 过滤出"暂无文件"相关的Alert
    const emptyAlert = alerts.filter(alert => {
      const messageProps = alert.props('message')
      return messageProps && messageProps.includes('暂无文件')
    })

    expect(emptyAlert.length).toBe(0)

    console.log('✓ 不存在"暂无文件"的Alert组件')
    console.log('✓ 修改成功：已移除条件渲染的Alert')
  })

  test('场景3: 表格始终渲染，不使用v-if/v-else', async () => {
    console.log('\n=== 场景3: 表格始终渲染 ===')

    // 空数据状态
    wrapper.vm.fileList = []
    await wrapper.vm.$nextTick()

    const tableEmpty = wrapper.findComponent({ name: 'ATable' })
    expect(tableEmpty.exists()).toBe(true)
    console.log('✓ 空数据时表格存在')

    // 有数据状态
    wrapper.vm.fileList = [
      { uid: '1', name: 'test.xml', validated: true, validateSuccess: true }
    ]
    await wrapper.vm.$nextTick()

    const tableWithData = wrapper.findComponent({ name: 'ATable' })
    expect(tableWithData.exists()).toBe(true)
    console.log('✓ 有数据时表格存在')

    console.log('✓ 表格在任何状态下都渲染')
  })

  test('场景4: 表格columns属性正确配置', async () => {
    console.log('\n=== 场景4: 表格columns配置验证 ===')

    const table = wrapper.findComponent({ name: 'ATable' })
    const columns = table.props('columns')

    expect(columns).toBeDefined()
    expect(Array.isArray(columns)).toBe(true)
    expect(columns.length).toBeGreaterThan(0)

    // 验证必要的列存在
    const columnTitles = columns.map(col => col.title)
    console.log('  表格列:', columnTitles.join(', '))

    // 至少应该包含：序号、文件名、校验状态、操作
    expect(columns.some(col => col.title && col.title.includes('序号'))).toBe(true)
    expect(columns.some(col => col.title && col.title.includes('文件名'))).toBe(true)

    console.log('✓ 表头列配置正确')
  })

  test('场景5: 添加文件后表格正常显示数据', async () => {
    console.log('\n=== 场景5: 添加文件后显示数据 ===')

    // Mock parseZipFile
    wrapper.vm.parseZipFile = jest.fn().mockResolvedValue([
      {
        name: 'DMC-001.xml',
        uid: 'file1',
        validated: true,
        validateSuccess: true,
        validateMessage: '校验通过',
        isFromZip: true
      }
    ])

    // 初始为空
    expect(wrapper.vm.fileList).toHaveLength(0)

    // 模拟上传ZIP文件
    const mockZipFile = new File(['zip'], 'test.zip', { type: 'application/zip' })
    Object.defineProperty(mockZipFile, 'size', { value: 1024 })

    await wrapper.vm.handleFileInputChange({
      target: { files: [mockZipFile], value: '' }
    })
    await wrapper.vm.$nextTick()

    // 验证文件已添加
    expect(wrapper.vm.fileList).toHaveLength(1)

    // 验证表格dataSource
    const table = wrapper.findComponent({ name: 'ATable' })
    expect(table.props('dataSource')).toHaveLength(1)
    expect(table.props('dataSource')[0].name).toBe('DMC-001.xml')

    console.log('✓ 文件添加成功')
    console.log('✓ 表格dataSource更新')
    console.log('✓ 数据正常显示')
  })

  test('场景6: 清空列表后表头仍然显示', async () => {
    console.log('\n=== 场景6: 清空列表后表头仍显示 ===')

    // 先添加一些文件
    wrapper.vm.fileList = [
      { uid: '1', name: 'test1.xml', validated: true },
      { uid: '2', name: 'test2.xml', validated: true }
    ]
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.fileList).toHaveLength(2)
    console.log('  添加2个文件')

    // 清空列表
    wrapper.vm.handleClear()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.fileList).toHaveLength(0)
    console.log('  列表已清空')

    // 验证表格仍然存在
    const table = wrapper.findComponent({ name: 'ATable' })
    expect(table.exists()).toBe(true)
    expect(table.props('dataSource')).toEqual([])
    expect(table.props('locale').emptyText).toBe('暂无文件，请点击"选择文件"按钮添加')

    console.log('✓ 表格组件仍然存在')
    console.log('✓ 空状态提示正确显示')
  })

  test('场景7: 移除所有文件后表头仍然显示', async () => {
    console.log('\n=== 场景7: 移除所有文件后表头仍显示 ===')

    // 添加1个文件
    wrapper.vm.fileList = [
      { uid: '1', name: 'test.xml', validated: true }
    ]
    await wrapper.vm.$nextTick()

    // 移除文件
    wrapper.vm.handleRemove({ uid: '1' })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.fileList).toHaveLength(0)

    // 验证表格仍然存在
    const table = wrapper.findComponent({ name: 'ATable' })
    expect(table.exists()).toBe(true)
    expect(table.props('dataSource')).toEqual([])

    console.log('✓ 文件移除成功')
    console.log('✓ 表格仍然显示')
  })

  // ==================== 边界测试 ====================

  test('边界1: 多次添加和清空，表格状态正确', async () => {
    console.log('\n=== 边界1: 多次添加和清空 ===')

    const table = wrapper.findComponent({ name: 'ATable' })

    // 循环3次
    for (let i = 1; i <= 3; i++) {
      // 添加文件
      wrapper.vm.fileList = [{ uid: `${i}`, name: `test${i}.xml` }]
      await wrapper.vm.$nextTick()

      expect(table.exists()).toBe(true)
      expect(table.props('dataSource')).toHaveLength(1)
      console.log(`  第${i}次添加: 表格显示正常`)

      // 清空
      wrapper.vm.fileList = []
      await wrapper.vm.$nextTick()

      expect(table.exists()).toBe(true)
      expect(table.props('dataSource')).toHaveLength(0)
      console.log(`  第${i}次清空: 表格仍然显示`)
    }

    console.log('✓ 多次操作后表格状态正确')
  })

  test('边界2: 大量数据和空数据切换', async () => {
    console.log('\n=== 边界2: 大量数据和空数据切换 ===')

    const table = wrapper.findComponent({ name: 'ATable' })

    // 添加100个文件
    const largeDataSet = Array.from({ length: 100 }, (_, i) => ({
      uid: `file-${i}`,
      name: `DMC-${String(i).padStart(3, '0')}.xml`,
      validated: true
    }))

    wrapper.vm.fileList = largeDataSet
    await wrapper.vm.$nextTick()

    expect(table.props('dataSource')).toHaveLength(100)
    console.log('  添加100个文件: 表格显示正常')

    // 清空为空数组
    wrapper.vm.fileList = []
    await wrapper.vm.$nextTick()

    expect(table.exists()).toBe(true)
    expect(table.props('dataSource')).toEqual([])
    expect(table.props('locale').emptyText).toBeDefined()

    console.log('✓ 大量数据切换到空数据: 表格正确显示')
  })

  test('边界3: 快速连续操作', async () => {
    console.log('\n=== 边界3: 快速连续操作 ===')

    // 快速添加、清空、再添加
    wrapper.vm.fileList = [{ uid: '1', name: 'test1.xml' }]
    wrapper.vm.fileList = []
    wrapper.vm.fileList = [{ uid: '2', name: 'test2.xml' }]
    wrapper.vm.fileList = []

    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent({ name: 'ATable' })
    expect(table.exists()).toBe(true)
    expect(table.props('dataSource')).toEqual([])

    console.log('✓ 快速连续操作后状态正确')
  })

  // ==================== 回归测试 ====================

  test('回归1: 确认Alert组件已被移除', async () => {
    console.log('\n=== 回归1: 确认Alert组件已移除 ===')

    // 查找所有Alert组件
    const allAlerts = wrapper.findAllComponents({ name: 'AAlert' })

    // 检查是否有显示"暂无文件"的Alert
    let hasEmptyAlert = false
    allAlerts.wrappers.forEach(alert => {
      const message = alert.props('message')
      if (message && typeof message === 'string' && message.includes('暂无文件')) {
        hasEmptyAlert = true
      }
    })

    expect(hasEmptyAlert).toBe(false)

    console.log('✓ 已确认移除条件渲染的Alert')
  })

  test('回归2: 表格props完整性检查', async () => {
    console.log('\n=== 回归2: 表格props完整性 ===')

    const table = wrapper.findComponent({ name: 'ATable' })

    // 验证必要的props
    expect(table.props('columns')).toBeDefined()
    expect(table.props('dataSource')).toBeDefined()
    expect(table.props('pagination')).toBeDefined()
    expect(table.props('loading')).toBeDefined()
    expect(table.props('size')).toBe('middle')
    expect(table.props('bordered')).toBe(true)
    expect(table.props('rowKey')).toBeDefined()
    expect(table.props('locale')).toEqual({
      emptyText: '暂无文件，请点击"选择文件"按钮添加'
    })

    console.log('✓ 所有必要的props都已配置')
  })

  test('回归3: 与ZIP展开功能的兼容性', async () => {
    console.log('\n=== 回归3: 与ZIP展开功能兼容 ===')

    // Mock parseZipFile
    wrapper.vm.parseZipFile = jest.fn().mockResolvedValue([
      { name: 'DMC-001.xml', uid: '1', validated: true, isFromZip: true },
      { name: 'DMC-002.xml', uid: '2', validated: true, isFromZip: true },
      { name: 'ICN-001.PNG', uid: '3', validated: true, isFromZip: true }
    ])

    // 初始为空，表格显示
    const table = wrapper.findComponent({ name: 'ATable' })
    expect(table.exists()).toBe(true)
    expect(table.props('dataSource')).toEqual([])
    console.log('  初始状态: 表格显示，数据为空')

    // 上传ZIP文件
    const mockZipFile = new File(['zip'], 'test.zip', { type: 'application/zip' })
    Object.defineProperty(mockZipFile, 'size', { value: 2048 })

    await wrapper.vm.handleFileInputChange({
      target: { files: [mockZipFile], value: '' }
    })
    await wrapper.vm.$nextTick()

    // ZIP展开为3个文件
    expect(wrapper.vm.fileList).toHaveLength(3)
    expect(table.props('dataSource')).toHaveLength(3)
    console.log('  ZIP展开: 3个文件显示在表格中')

    // 清空
    wrapper.vm.handleClear()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.fileList).toHaveLength(0)
    expect(table.exists()).toBe(true)
    expect(table.props('dataSource')).toEqual([])
    console.log('  清空后: 表格仍显示，数据为空')

    console.log('✓ 与ZIP展开功能完全兼容')
  })

  // ==================== 集成测试 ====================

  test('集成: 完整用户流程', async () => {
    console.log('\n=== 集成: 完整用户流程 ===')

    const table = wrapper.findComponent({ name: 'ATable' })

    // 1. 初始状态
    expect(wrapper.vm.fileList).toHaveLength(0)
    expect(table.exists()).toBe(true)
    expect(table.props('dataSource')).toEqual([])
    console.log('✓ 步骤1: 初始状态正确')

    // 2. 添加独立XML文件
    const xmlFile = new File(['xml'], 'single.xml', { type: 'text/xml' })
    Object.defineProperty(xmlFile, 'size', { value: 512 })
    Object.defineProperty(xmlFile, 'lastModified', { value: Date.now() })

    await wrapper.vm.handleFileInputChange({
      target: { files: [xmlFile], value: '' }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.fileList).toHaveLength(1)
    expect(table.props('dataSource')).toHaveLength(1)
    console.log('✓ 步骤2: 添加XML文件成功')

    // 3. 上传ZIP文件
    wrapper.vm.parseZipFile = jest.fn().mockResolvedValue([
      { name: 'DMC-001.xml', uid: 'z1', validated: true, isFromZip: true },
      { name: 'DMC-002.xml', uid: 'z2', validated: true, isFromZip: true }
    ])

    const zipFile = new File(['zip'], 'test.zip', { type: 'application/zip' })
    Object.defineProperty(zipFile, 'size', { value: 2048 })

    await wrapper.vm.handleFileInputChange({
      target: { files: [zipFile], value: '' }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.fileList).toHaveLength(3)
    expect(table.props('dataSource')).toHaveLength(3)
    console.log('✓ 步骤3: 添加ZIP文件成功，总共3个文件')

    // 4. 移除一个文件
    wrapper.vm.handleRemove(wrapper.vm.fileList[0])
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.fileList).toHaveLength(2)
    expect(table.props('dataSource')).toHaveLength(2)
    console.log('✓ 步骤4: 移除文件成功，剩余2个')

    // 5. 清空所有文件
    wrapper.vm.handleClear()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.fileList).toHaveLength(0)
    expect(table.exists()).toBe(true)
    expect(table.props('dataSource')).toEqual([])
    expect(table.props('locale').emptyText).toBe('暂无文件，请点击"选择文件"按钮添加')
    console.log('✓ 步骤5: 清空后表格仍显示，空状态正确')

    console.log('✓ 完整流程测试通过')
  })
})
