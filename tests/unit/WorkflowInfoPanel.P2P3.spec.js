/**
 * 工作流信息面板 P2/P3 级修复单元测试
 * 测试范围：P2-1, P2-3, P2-4, P3-1, P3-2, P3-3
 */

import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import WorkflowInfoPanel from '@/views/ietm/ietmdatamodulemanagement/components/WorkflowInfoPanel.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

describe('WorkflowInfoPanel - P2/P3 级修复', () => {
  let wrapper
  let store
  let mockRouter

  beforeEach(() => {
    // Mock Vuex store
    store = new Vuex.Store({
      getters: {
        userInfo: () => ({
          id: 'user123',
          username: 'testuser',
          realname: '测试用户'
        })
      }
    })

    // Mock Vue Router
    mockRouter = {
      back: jest.fn()
    }

    wrapper = shallowMount(WorkflowInfoPanel, {
      localVue,
      store,
      propsData: {
        formid: 'test-form-id'
      },
      mocks: {
        $router: mockRouter,
        $message: {
          success: jest.fn(),
          error: jest.fn(),
          warning: jest.fn(),
          info: jest.fn()
        },
        $confirm: jest.fn((config) => {
          config.onOk && config.onOk()
        })
      },
      stubs: {
        'wf-instance-dtl-table': true,
        'a-button': true,
        'a-select': true,
        'a-select-option': true,
        'a-input': true,
        'a-textarea': true,
        'a-radio-group': true,
        'a-radio': true,
        'a-upload': true
      }
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  // ==================== P2-3: 拿回按钮动态显隐 ====================
  describe('P2-3: 拿回按钮动态显隐', () => {
    test('流程结束后拿回按钮应隐藏', () => {
      wrapper.setData({
        instance: { id: 'inst1', status: '2', createBy: 'user123' },
        nodes: [
          { id: 'node1', ifexec: 'Y', userid: 'user123' }
        ]
      })

      expect(wrapper.vm.hasGetbackNode).toBe(false)
    })

    test('有自己已处理的节点时拿回按钮应显示', () => {
      wrapper.setData({
        instance: { id: 'inst1', status: '1', createBy: 'user123' },
        nodes: [
          { id: 'node1', ifexec: 'Y', userid: 'user123' }
        ]
      })

      expect(wrapper.vm.hasGetbackNode).toBe(true)
    })

    test('没有自己已处理的节点时拿回按钮应隐藏', () => {
      wrapper.setData({
        instance: { id: 'inst1', status: '1', createBy: 'user123' },
        nodes: [
          { id: 'node1', ifexec: 'N', userid: 'user123' },
          { id: 'node2', ifexec: 'Y', userid: 'other-user' }
        ]
      })

      expect(wrapper.vm.hasGetbackNode).toBe(false)
    })

    test('支持用户名匹配（username）', () => {
      wrapper.setData({
        instance: { id: 'inst1', status: '1', createBy: 'user123' },
        nodes: [
          { id: 'node1', ifexec: 'Y', userid: 'testuser' }
        ]
      })

      expect(wrapper.vm.hasGetbackNode).toBe(true)
    })

    test('支持多处理人节点（逗号分隔）', () => {
      wrapper.setData({
        instance: { id: 'inst1', status: '1', createBy: 'user123' },
        nodes: [
          { id: 'node1', ifexec: 'Y', userid: 'other1,user123,other2' }
        ]
      })

      expect(wrapper.vm.hasGetbackNode).toBe(true)
    })
  })

  // ==================== P3-1: 钩子命名兼容 ====================
  describe('P3-1: 钩子命名兼容', () => {
    test('emitCompat 应同时触发 kebab-case 和驼峰命名事件', () => {
      const emitSpy = jest.spyOn(wrapper.vm, '$emit')
      window.parent.testHook = jest.fn()

      wrapper.vm.emitCompat('test-event', 'testHook', { data: 'test' })

      expect(emitSpy).toHaveBeenCalledWith('test-event', { data: 'test' })
      expect(window.parent.testHook).toHaveBeenCalledWith({ data: 'test' })

      delete window.parent.testHook
    })

    test('旧钩子返回 false 应阻止操作', () => {
      window.parent.beforeTest = jest.fn(() => false)

      const result = wrapper.vm.emitCompat('before-test', 'beforeTest')

      expect(result).toBe(false)
      delete window.parent.beforeTest
    })

    test('旧钩子不存在时不应报错', () => {
      expect(() => {
        wrapper.vm.emitCompat('test-event', 'nonExistentHook', { data: 'test' })
      }).not.toThrow()
    })
  })

  // ==================== P3-2: 提交后自动关闭 ====================
  describe('P3-2: 提交后自动关闭', () => {
    test('closeafterexec=true 时提交成功后应调用 router.back()', async () => {
      wrapper.setProps({ closeafterexec: true })
      wrapper.setData({
        instance: { id: 'inst1', status: '1' },
        todoNode: { id: 'node1', nodename: '审核节点' },
        nodes: [{ id: 'node1', nodename: '审核节点' }]
      })

      // Mock doSubmit 的成功分支
      wrapper.vm.$refs.dtlTable = { hasUnsavedChanges: () => false }
      const mockUploadAction = jest.fn(() => Promise.resolve({ success: true }))
      wrapper.vm.uploadAction = mockUploadAction

      // 等待 setTimeout
      jest.useFakeTimers()
      await wrapper.vm.doSubmit()
      jest.runAllTimers()

      expect(mockRouter.back).toHaveBeenCalled()
      jest.useRealTimers()
    })

    test('closeafterexec=false 时提交成功后不应关闭', async () => {
      wrapper.setProps({ closeafterexec: false })
      wrapper.setData({
        instance: { id: 'inst1', status: '1' },
        todoNode: { id: 'node1', nodename: '审核节点' },
        nodes: [{ id: 'node1', nodename: '审核节点' }]
      })

      wrapper.vm.$refs.dtlTable = { hasUnsavedChanges: () => false }
      const mockUploadAction = jest.fn(() => Promise.resolve({ success: true }))
      wrapper.vm.uploadAction = mockUploadAction

      jest.useFakeTimers()
      await wrapper.vm.doSubmit()
      jest.runAllTimers()

      expect(mockRouter.back).not.toHaveBeenCalled()
      jest.useRealTimers()
    })

    test('closeafterexec="1" 字符串格式应生效', async () => {
      wrapper.setProps({ closeafterexec: '1' })
      wrapper.setData({
        instance: { id: 'inst1', status: '1' },
        todoNode: { id: 'node1', nodename: '审核节点' },
        nodes: [{ id: 'node1', nodename: '审核节点' }]
      })

      wrapper.vm.$refs.dtlTable = { hasUnsavedChanges: () => false }
      const mockUploadAction = jest.fn(() => Promise.resolve({ success: true }))
      wrapper.vm.uploadAction = mockUploadAction

      jest.useFakeTimers()
      await wrapper.vm.doSubmit()
      jest.runAllTimers()

      expect(mockRouter.back).toHaveBeenCalled()
      jest.useRealTimers()
    })
  })

  // ==================== P3-3: 重启流程参数 ====================
  describe('P3-3: 重启流程参数', () => {
    test('restartflow=false 时流程结束后不可编辑节点', () => {
      wrapper.setProps({ restartflow: false })
      wrapper.setData({
        instance: { id: 'inst1', status: '2', createBy: 'user123' },
        todoNode: null,
        nodes: []
      })

      expect(wrapper.vm.canEditNodes).toBe(false)
    })

    test('restartflow=true 且是编制人时流程结束后可编辑节点', () => {
      wrapper.setProps({ restartflow: true })
      wrapper.setData({
        instance: { id: 'inst1', status: '2', createBy: 'user123' },
        todoNode: null,
        nodes: []
      })

      expect(wrapper.vm.canEditNodes).toBe(true)
    })

    test('restartflow="1" 字符串格式应生效', () => {
      wrapper.setProps({ restartflow: '1' })
      wrapper.setData({
        instance: { id: 'inst1', status: '2', createBy: 'user123' },
        todoNode: null,
        nodes: []
      })

      expect(wrapper.vm.canEditNodes).toBe(true)
    })

    test('restartflow=true 但不是编制人时不可编辑节点', () => {
      wrapper.setProps({ restartflow: true })
      wrapper.setData({
        instance: { id: 'inst1', status: '2', createBy: 'other-user' },
        todoNode: null,
        nodes: []
      })

      expect(wrapper.vm.canEditNodes).toBe(false)
    })

    test('restartflow=true 但流程未结束时正常编辑权限不受影响', () => {
      wrapper.setProps({ restartflow: true })
      wrapper.setData({
        instance: { id: 'inst1', status: '1', createBy: 'user123' },
        todoNode: { id: 'node1' },
        nodes: [{ id: 'node1' }]
      })

      expect(wrapper.vm.canEditNodes).toBe(true)
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    test('P2-3 + P3-1: 拿回成功后应触发兼容钩子', async () => {
      window.parent.afterGetBackSuccess = jest.fn()
      const emitSpy = jest.spyOn(wrapper.vm, '$emit')

      wrapper.setData({
        instance: { id: 'inst1', status: '1' },
        selectedNode: { id: 'node1', ifexec: 'Y' },
        nodes: [{ id: 'node1', ifexec: 'Y', userid: 'user123' }]
      })

      const mockPostAction = jest.fn(() => Promise.resolve({ success: true }))
      wrapper.vm.postAction = mockPostAction

      await wrapper.vm.handleTakeBack()

      expect(emitSpy).toHaveBeenCalledWith('after-get-back', expect.any(Object))
      expect(window.parent.afterGetBackSuccess).toHaveBeenCalled()

      delete window.parent.afterGetBackSuccess
    })
  })
})
