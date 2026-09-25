/**
 * DmContentEditor 组件单元测试
 * 测试问题3修复：保存后自动返回源码视图
 */

import { mount, createLocalVue } from '@vue/test-utils'
import DmContentEditor from '@/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue'
import Vuex from 'vuex'

const localVue = createLocalVue()
localVue.use(Vuex)

// Mock子组件
const DmSourceViewStub = {
  name: 'DmSourceView',
  template: '<div class="dm-source-view-stub"></div>',
  methods: {
    getEditor: jest.fn(() => ({
      refresh: jest.fn(),
      getLine: jest.fn(),
      getValue: jest.fn(() => '<dmodule></dmodule>')
    })),
    locateLine: jest.fn()
  }
}

const ParaDesignerStub = {
  name: 'ParaDesigner',
  template: '<div class="para-designer-stub"></div>',
  props: ['lineno', 'editor'],
  data() {
    return {
      ueditorReady: true
    }
  },
  methods: {
    setcontent: jest.fn()
  }
}

describe('DmContentEditor.vue - 问题3修复测试', () => {
  let wrapper
  let store

  beforeEach(() => {
    store = new Vuex.Store({
      state: {},
      getters: {},
      modules: {}
    })

    wrapper = mount(DmContentEditor, {
      localVue,
      store,
      propsData: {
        id: 'test-dm-id',
        readonly: false
      },
      stubs: {
        'dm-source-view': DmSourceViewStub,
        'para-designer': ParaDesignerStub,
        'dm-structure-tree': true,
        'dm-attr-panel': true,
        'dm-validate-panel': true,
        'dm-preview-modal': true,
        'dm-node-preview-modal': true,
        'ietm-dm-ref-dialog': true,
        'ietm-symbol-dialog': true,
        'ietm-interref-dialog': true,
        'dm-id-list-modal': true,
        'a-spin': { template: '<div><slot/></div>' },
        'a-tabs': {
          template: '<div><slot/></div>',
          props: ['activeKey']
        },
        'a-tab-pane': { template: '<div><slot/></div>' },
        'a-button': { template: '<button @click="$listeners.click"><slot/></button>' },
        'a-select': { template: '<select><slot/></select>' },
        'a-select-option': { template: '<option><slot/></option>' },
        'a-icon': { template: '<i></i>' },
        'a-modal': { template: '<div><slot/></div>' },
        'a-form': { template: '<form><slot/></form>' },
        'a-form-item': { template: '<div><slot/></div>' },
        'a-input-number': { template: '<input type="number"/>' }
      },
      mocks: {
        $http: {
          get: jest.fn(() => Promise.resolve({ data: { success: true, result: {} } })),
          post: jest.fn(() => Promise.resolve({ data: { success: true, result: {} } }))
        },
        $message: {
          success: jest.fn(),
          error: jest.fn(),
          warning: jest.fn(),
          info: jest.fn()
        },
        $route: {
          query: { id: 'test-dm-id' }
        }
      },
      data() {
        return {
          content: '<dmodule><content><description><para id="p1">测试</para></description></content></dmodule>',
          nodeList: [],
          schema: {},
          dmc: 'DMC-TEST',
          viewMode: 'source',
          paraDesignerVisible: false,
          paraLineno: null,
          treeVisible: true,
          attrVisible: true,
          dirty: false,
          saving: false
        }
      }
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  describe('问题3核心修复：自动返回源码视图', () => {
    it('TC-U17: onParaSave应该是async函数', () => {
      expect(wrapper.vm.onParaSave.constructor.name).toBe('AsyncFunction')
    })

    it('TC-U18: 保存后应自动切换viewMode为source', async () => {
      // 模拟在设计视图
      wrapper.vm.viewMode = 'design'
      wrapper.vm.paraDesignerVisible = true
      wrapper.vm.treeVisible = false
      wrapper.vm.attrVisible = false

      // Mock doSave方法
      wrapper.vm.doSave = jest.fn(() => Promise.resolve())

      // 触发保存
      await wrapper.vm.onParaSave()

      // 验证视图切换
      expect(wrapper.vm.viewMode).toBe('source')
    })

    it('TC-U19: 保存后应关闭ParaDesigner', async () => {
      wrapper.vm.viewMode = 'design'
      wrapper.vm.paraDesignerVisible = true
      wrapper.vm.doSave = jest.fn(() => Promise.resolve())

      await wrapper.vm.onParaSave()

      expect(wrapper.vm.paraDesignerVisible).toBe(false)
    })

    it('TC-U20: 保存后应显示左侧树', async () => {
      wrapper.vm.viewMode = 'design'
      wrapper.vm.treeVisible = false
      wrapper.vm.doSave = jest.fn(() => Promise.resolve())

      await wrapper.vm.onParaSave()

      expect(wrapper.vm.treeVisible).toBe(true)
    })

    it('TC-U21: 保存后应显示右侧属性面板（编辑模式）', async () => {
      wrapper.vm.viewMode = 'design'
      wrapper.vm.attrVisible = false
      wrapper.vm.readonly = false
      wrapper.vm.doSave = jest.fn(() => Promise.resolve())

      await wrapper.vm.onParaSave()

      expect(wrapper.vm.attrVisible).toBe(true)
    })

    it('TC-U22: 保存后不应显示属性面板（只读模式）', async () => {
      wrapper.vm.viewMode = 'design'
      wrapper.vm.attrVisible = false
      wrapper.vm.readonly = true
      wrapper.vm.doSave = jest.fn(() => Promise.resolve())

      await wrapper.vm.onParaSave()

      expect(wrapper.vm.attrVisible).toBe(false)
    })

    it('TC-U23: 保存后应调用CodeMirror.refresh()', async () => {
      wrapper.vm.viewMode = 'design'
      wrapper.vm.doSave = jest.fn(() => Promise.resolve())

      const mockRefresh = jest.fn()
      wrapper.vm.$refs.editor = {
        getEditor: () => ({ refresh: mockRefresh })
      }

      await wrapper.vm.onParaSave()
      await wrapper.vm.$nextTick()

      expect(mockRefresh).toHaveBeenCalled()
    })

    it('TC-U24: 保存前应等待doSave完成', async () => {
      let saveResolved = false
      wrapper.vm.doSave = jest.fn(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            saveResolved = true
            resolve()
          }, 100)
        })
      })

      wrapper.vm.viewMode = 'design'
      const savePromise = wrapper.vm.onParaSave()

      // 保存未完成时，视图应该还在design
      expect(wrapper.vm.viewMode).toBe('design')
      expect(saveResolved).toBe(false)

      await savePromise

      // 保存完成后，视图应该切换到source
      expect(wrapper.vm.viewMode).toBe('source')
      expect(saveResolved).toBe(true)
    })

    it('TC-U25: 保存应设置dirty标志', async () => {
      wrapper.vm.dirty = false
      wrapper.vm.doSave = jest.fn(() => Promise.resolve())

      await wrapper.vm.onParaSave()

      expect(wrapper.vm.dirty).toBe(true)
    })
  })

  describe('问题1相关：onViewTabChange测试', () => {
    it('TC-U26: 切换到源码视图应调用CodeMirror.refresh()', async () => {
      const mockRefresh = jest.fn()
      wrapper.vm.$refs.editor = {
        getEditor: () => ({ refresh: mockRefresh })
      }

      wrapper.vm.onViewTabChange('source')
      await wrapper.vm.$nextTick()

      expect(mockRefresh).toHaveBeenCalled()
    })

    it('TC-U27: 切换到源码视图应关闭ParaDesigner', () => {
      wrapper.vm.paraDesignerVisible = true

      wrapper.vm.onViewTabChange('source')

      expect(wrapper.vm.paraDesignerVisible).toBe(false)
    })

    it('TC-U28: 切换到源码视图应显示左侧树', () => {
      wrapper.vm.treeVisible = false

      wrapper.vm.onViewTabChange('source')

      expect(wrapper.vm.treeVisible).toBe(true)
    })

    it('TC-U29: 切换到源码视图应显示属性面板（编辑模式）', () => {
      wrapper.vm.attrVisible = false
      wrapper.vm.readonly = false

      wrapper.vm.onViewTabChange('source')

      expect(wrapper.vm.attrVisible).toBe(true)
    })
  })

  describe('打开设计视图流程', () => {
    it('TC-U30: _openParaDesigner应设置viewMode为design', () => {
      wrapper.vm._openParaDesigner(5)

      expect(wrapper.vm.viewMode).toBe('design')
    })

    it('TC-U31: _openParaDesigner应设置paraLineno', () => {
      wrapper.vm._openParaDesigner(10)

      expect(wrapper.vm.paraLineno).toBe(10)
    })

    it('TC-U32: _openParaDesigner应显示ParaDesigner', () => {
      wrapper.vm.paraDesignerVisible = false

      wrapper.vm._openParaDesigner(5)

      expect(wrapper.vm.paraDesignerVisible).toBe(true)
    })

    it('TC-U33: _openParaDesigner应隐藏左侧树和属性面板', () => {
      wrapper.vm.treeVisible = true
      wrapper.vm.attrVisible = true

      wrapper.vm._openParaDesigner(5)

      expect(wrapper.vm.treeVisible).toBe(false)
      expect(wrapper.vm.attrVisible).toBe(false)
    })

    it('TC-U34: 双击para节点应打开设计视图', () => {
      const spyOpen = jest.spyOn(wrapper.vm, '_openParaDesigner')
      const mockNode = {
        text: 'para',
        lineno: 8,
        attributes: {}
      }

      wrapper.vm.onTreeDblClick(mockNode)

      expect(spyOpen).toHaveBeenCalledWith(8)
    })

    it('TC-U35: 双击非para节点应提示不支持', () => {
      const mockNode = {
        text: 'title',
        lineno: 3,
        attributes: {}
      }

      wrapper.vm.onTreeDblClick(mockNode)

      expect(wrapper.vm.$message.info).toHaveBeenCalledWith('仅支持para元素的设计视图编辑')
    })
  })

  describe('gutter图标点击', () => {
    it('TC-U36: 点击para的gutter图标应打开设计视图', () => {
      const spyOpen = jest.spyOn(wrapper.vm, '_openParaDesigner')
      const mockNode = {
        text: 'para',
        lineno: 5,
        attributes: {}
      }

      wrapper.vm.onGutterClick({ line: 4, node: mockNode, elemName: 'para' })

      expect(spyOpen).toHaveBeenCalled()
    })

    it('TC-U37: 只读模式下点击gutter图标应提示', () => {
      wrapper.vm.readonly = true
      const mockNode = {
        text: 'para',
        lineno: 5,
        attributes: {}
      }

      wrapper.vm.onGutterClick({ line: 4, node: mockNode, elemName: 'para' })

      expect(wrapper.vm.$message.info).toHaveBeenCalledWith('浏览模式下无法编辑，请先签出该DM')
    })
  })

  describe('完整流程测试', () => {
    it('TC-U38: 完整流程：打开设计视图 → 编辑 → 保存 → 返回源码视图', async () => {
      const mockRefresh = jest.fn()
      wrapper.vm.$refs.editor = {
        getEditor: () => ({ refresh: mockRefresh }),
        locateLine: jest.fn()
      }
      wrapper.vm.doSave = jest.fn(() => Promise.resolve())

      // 1. 初始状态：源码视图
      expect(wrapper.vm.viewMode).toBe('source')
      expect(wrapper.vm.paraDesignerVisible).toBe(false)

      // 2. 打开设计视图
      wrapper.vm._openParaDesigner(5)
      expect(wrapper.vm.viewMode).toBe('design')
      expect(wrapper.vm.paraDesignerVisible).toBe(true)
      expect(wrapper.vm.treeVisible).toBe(false)
      expect(wrapper.vm.attrVisible).toBe(false)

      // 3. 保存（模拟ParaDesigner触发save事件）
      await wrapper.vm.onParaSave()

      // 4. 验证返回源码视图
      expect(wrapper.vm.viewMode).toBe('source')
      expect(wrapper.vm.paraDesignerVisible).toBe(false)
      expect(wrapper.vm.treeVisible).toBe(true)
      expect(wrapper.vm.attrVisible).toBe(true)
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
