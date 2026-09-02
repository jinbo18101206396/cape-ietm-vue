/**
 * ICN引用弹窗单元测试
 * 测试优化后的布局和功能
 */

import { mount } from '@vue/test-utils'
import IcnReferenceModal from '@/views/ietm/icnmanage/modules/IcnReferenceModal.vue'

describe('IcnReferenceModal 布局优化测试', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(IcnReferenceModal, {
      stubs: {
        'a-modal': true,
        'a-spin': true,
        'a-descriptions': true,
        'a-descriptions-item': true,
        'a-tag': true,
        'a-row': true,
        'a-col': true,
        'a-icon': true,
        'a-tabs': true,
        'a-tab-pane': true,
        'a-table': true,
        'a-alert': true,
        'a-empty': true,
        'a-badge': true,
        'a-button': true,
        'a-tooltip': true
      }
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  // TC-01: 测试弹窗宽度优化
  test('TC-01: 弹窗宽度应为1200px', () => {
    const modal = wrapper.find({ name: 'a-modal' })
    expect(modal.exists()).toBe(true)
    expect(modal.attributes('width')).toBe('1200')
  })

  // TC-02: 测试当前ICN信息区字段完整性
  test('TC-02: 当前ICN信息应包含7个字段', () => {
    const mockRecord = {
      id: 'test-id-001',
      icn: 'ICN-TEST-001',
      fileName: 'test.jpg',
      icnType: 'graphic',
      issueNo: '001',
      security: 0,
      security_dictText: '公开',
      createTime: '2026-08-31 10:00:00',
      originatorName: '测试单位'
    }

    wrapper.vm.show(mockRecord)

    expect(wrapper.vm.currentIcnCode).toBe('ICN-TEST-001')
    expect(wrapper.vm.currentFileName).toBe('test.jpg')
    expect(wrapper.vm.currentIcnType).toBe('graphic')
    expect(wrapper.vm.currentIssueNo).toBe('001')
    expect(wrapper.vm.currentSecurity).toBe(0)
    expect(wrapper.vm.currentSecurityText).toBe('公开')
    expect(wrapper.vm.currentCreateTime).toBe('2026-08-31 10:00:00')
    expect(wrapper.vm.currentOriginatorName).toBe('测试单位')
  })

  // TC-03: 测试ICN类型颜色映射
  test('TC-03: ICN类型颜色映射正确', () => {
    expect(wrapper.vm.getIcnTypeColor('graphic')).toBe('blue')
    expect(wrapper.vm.getIcnTypeColor('multimedia')).toBe('green')
    expect(wrapper.vm.getIcnTypeColor('symbol')).toBe('orange')
    expect(wrapper.vm.getIcnTypeColor('hotspot')).toBe('purple')
    expect(wrapper.vm.getIcnTypeColor('unknown')).toBe('default')
  })

  // TC-04: 测试密级颜色映射
  test('TC-04: 密级颜色映射正确', () => {
    expect(wrapper.vm.getSecurityColor(0)).toBe('green')
    expect(wrapper.vm.getSecurityColor(1)).toBe('blue')
    expect(wrapper.vm.getSecurityColor(2)).toBe('orange')
    expect(wrapper.vm.getSecurityColor(3)).toBe('red')
    expect(wrapper.vm.getSecurityColor(4)).toBe('volcano')
    expect(wrapper.vm.getSecurityColor(5)).toBe('magenta')
  })

  // TC-05: 测试密级文本映射
  test('TC-05: 密级文本映射正确', () => {
    expect(wrapper.vm.getSecurityText(0)).toBe('公开')
    expect(wrapper.vm.getSecurityText(1)).toBe('内部')
    expect(wrapper.vm.getSecurityText(2)).toBe('秘密')
    expect(wrapper.vm.getSecurityText(3)).toBe('机密')
    expect(wrapper.vm.getSecurityText(4)).toBe('绝密')
    expect(wrapper.vm.getSecurityText(5)).toBe('特级')
    expect(wrapper.vm.getSecurityText(99)).toBe('-')
  })

  // TC-06: 测试ICN引用表格列数
  test('TC-06: ICN引用表格应包含9列', () => {
    expect(wrapper.vm.referenceColumns.length).toBe(9)

    const columnTitles = wrapper.vm.referenceColumns.map(col => col.title)
    expect(columnTitles).toContain('序号')
    expect(columnTitles).toContain('ICN编码')
    expect(columnTitles).toContain('文件名称')
    expect(columnTitles).toContain('ICN类型')
    expect(columnTitles).toContain('版本号')
    expect(columnTitles).toContain('密级')
    expect(columnTitles).toContain('责任单位')
    expect(columnTitles).toContain('创建时间')
    expect(columnTitles).toContain('操作')
  })

  // TC-07: 测试DM引用表格列数
  test('TC-07: DM引用表格应包含9列', () => {
    expect(wrapper.vm.dmReferenceColumns.length).toBe(9)

    const columnTitles = wrapper.vm.dmReferenceColumns.map(col => col.title)
    expect(columnTitles).toContain('序号')
    expect(columnTitles).toContain('DM编码')
    expect(columnTitles).toContain('DM标题')
    expect(columnTitles).toContain('信息名称')
    expect(columnTitles).toContain('DM类型')
    expect(columnTitles).toContain('版本')
    expect(columnTitles).toContain('密级')
    expect(columnTitles).toContain('创建时间')
    expect(columnTitles).toContain('操作')
  })

  // TC-08: 测试表格操作列固定在右侧
  test('TC-08: 表格操作列应固定在右侧', () => {
    const icnActionColumn = wrapper.vm.referenceColumns.find(col => col.title === '操作')
    expect(icnActionColumn.fixed).toBe('right')

    const dmActionColumn = wrapper.vm.dmReferenceColumns.find(col => col.title === '操作')
    expect(dmActionColumn.fixed).toBe('right')
  })

  // TC-09: 测试弹窗关闭时清空所有字段
  test('TC-09: 弹窗关闭时应清空所有字段', () => {
    const mockRecord = {
      id: 'test-id-001',
      icn: 'ICN-TEST-001',
      fileName: 'test.jpg',
      icnType: 'graphic',
      issueNo: '001',
      security: 0,
      originatorName: '测试单位'
    }

    wrapper.vm.show(mockRecord)
    expect(wrapper.vm.currentIcnCode).toBe('ICN-TEST-001')

    wrapper.vm.handleCancel()

    expect(wrapper.vm.currentIcnId).toBe('')
    expect(wrapper.vm.currentIcnCode).toBe('')
    expect(wrapper.vm.currentFileName).toBe('')
    expect(wrapper.vm.currentIcnType).toBe('')
    expect(wrapper.vm.currentIssueNo).toBe('')
    expect(wrapper.vm.currentSecurity).toBe(null)
    expect(wrapper.vm.currentSecurityText).toBe('')
    expect(wrapper.vm.currentCreateTime).toBe('')
    expect(wrapper.vm.currentOriginatorName).toBe('')
  })

  // TC-10: 测试兼容传入ID字符串
  test('TC-10: 应兼容传入ID字符串的调用方式', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

    wrapper.vm.show('test-id-001')

    expect(wrapper.vm.currentIcnId).toBe('test-id-001')
    expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ 传入的是ID字符串，推荐传递完整的record对象')

    consoleWarnSpy.mockRestore()
  })
})
