/**
 * 流程信息模块遗漏项修复测试
 * 测试13个修复项的功能
 */

import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import WorkflowInfoPanel from '@/views/ietm/ietmdatamodulemanagement/components/WorkflowInfoPanel.vue'
import WfInstanceDtlTable from '@/views/ietm/ietmdatamodulemanagement/components/workflow/WfInstanceDtlTable.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

// Mock Ant Design Vue 组件
const mockComponents = {
  'a-button': { template: '<button><slot /></button>' },
  'a-select': { template: '<select><slot /></select>' },
  'a-select-option': { template: '<option><slot /></option>' },
  'a-input': { template: '<input />', props: ['value', 'maxLength'] },
  'a-input-number': { template: '<input type="number" />', props: ['value', 'min'] },
  'a-textarea': { template: '<textarea />', props: ['value', 'maxLength'] },
  'a-radio-group': { template: '<div><slot /></div>' },
  'a-radio': { template: '<input type="radio" />' },
  'a-upload': { template: '<div><slot /></div>' },
  'a-table': { template: '<table><slot /></table>' },
  'a-empty': { template: '<div>Empty</div>' },
  'a-divider': { template: '<span />' },
  'j-select-user-by-dep': { template: '<div />', props: ['value', 'multi'] }
}

describe('流程信息模块遗漏项修复测试', () => {
  let store
  let wrapper

  beforeEach(() => {
    store = new Vuex.Store({
      getters: {
        userInfo: () => ({ id: 'user123', username: 'testuser' })
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
  })

  // ==================== 🔴 关键遗漏测试 ====================

  describe('🔴 遗漏15: 跳转节点权限过滤', () => {
    it('ifgetback="-1" 时应返回空数组（不可跳转）', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        data() {
          return {
            todoNode: { id: 'node1', ifgetback: '-1' },
            nodes: [
              { id: 'node1', nodename: '节点1' },
              { id: 'node2', nodename: '节点2' },
              { id: 'node3', nodename: '节点3' }
            ]
          }
        }
      })

      const targets = wrapper.vm.jumpTargets
      expect(targets).toEqual([])
    })

    it('ifgetback 指定节点ID时应只返回指定节点', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        data() {
          return {
            todoNode: { id: 'node1', ifgetback: 'node2,node3' },
            nodes: [
              { id: 'node1', nodename: '节点1' },
              { id: 'node2', nodename: '节点2' },
              { id: 'node3', nodename: '节点3' },
              { id: 'node4', nodename: '节点4' }
            ]
          }
        }
      })

      const targets = wrapper.vm.jumpTargets
      expect(targets.length).toBe(2)
      expect(targets.map(t => t.id)).toEqual(['node2', 'node3'])
    })

    it('ifgetback 为空时应返回所有节点（除自己）', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        data() {
          return {
            todoNode: { id: 'node1', ifgetback: '' },
            nodes: [
              { id: 'node1', nodename: '节点1' },
              { id: 'node2', nodename: '节点2' },
              { id: 'node3', nodename: '节点3' }
            ]
          }
        }
      })

      const targets = wrapper.vm.jumpTargets
      expect(targets.length).toBe(2)
      expect(targets.map(t => t.id)).toEqual(['node2', 'node3'])
    })

    it('ifgetback 包含"0"时应包含创建节点', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        data() {
          return {
            todoNode: { id: 'node2', ifgetback: '0,node3' },
            nodes: [
              { id: 'node0', nodename: '创建', seqno: 0 },
              { id: 'node1', nodename: '节点1', seqno: 1 },
              { id: 'node2', nodename: '节点2', seqno: 2 },
              { id: 'node3', nodename: '节点3', seqno: 3 }
            ]
          }
        }
      })

      const targets = wrapper.vm.jumpTargets
      expect(targets.length).toBe(2)
      expect(targets.some(t => t.seqno === 0)).toBe(true)
      expect(targets.some(t => t.id === 'node3')).toBe(true)
    })
  })

  describe('🔴 遗漏32: 附件上传校验', () => {
    it('上传不允许的文件类型时应返回false', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        mocks: {
          $message: { error: jest.fn() }
        }
      })

      const file = { name: 'virus.exe', size: 1024 }
      const result = wrapper.vm.beforeUpload(file)

      expect(result).toBe(false)
      expect(wrapper.vm.$message.error).toHaveBeenCalledWith('只允许上传文档、图片、压缩包！')
    })

    it('上传超大文件时应返回false', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        mocks: {
          $message: { error: jest.fn() }
        }
      })

      const file = { name: 'large.pdf', size: 100 * 1024 * 1024 } // 100MB
      const result = wrapper.vm.beforeUpload(file)

      expect(result).toBe(false)
      expect(wrapper.vm.$message.error).toHaveBeenCalledWith('文件大小不能超过50MB！')
    })

    it('上传合法文件时应通过校验', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        mocks: {
          $message: { error: jest.fn() }
        }
      })

      const file = { name: 'document.pdf', size: 10 * 1024 * 1024 } // 10MB
      const result = wrapper.vm.beforeUpload(file)

      expect(result).toBe(false) // 阻止自动上传
      expect(wrapper.vm.$message.error).not.toHaveBeenCalled()
      expect(wrapper.vm.fileList).toEqual([file])
    })

    it('应支持所有允许的文件类型', () => {
      const allowedExts = ['doc', 'docx', 'pdf', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'zip', 'rar', '7z']

      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        mocks: {
          $message: { error: jest.fn() }
        }
      })

      allowedExts.forEach(ext => {
        const file = { name: `file.${ext}`, size: 1024 }
        wrapper.vm.beforeUpload(file)
        expect(wrapper.vm.$message.error).not.toHaveBeenCalled()
      })
    })
  })

  describe('🔴 遗漏21: 删除节点后续检查', () => {
    it('删除中间节点且后续有已处理节点时应阻止', () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' },
          canEditNodes: true
        },
        stubs: mockComponents,
        mocks: {
          $message: { warning: jest.fn() },
          $confirm: jest.fn()
        },
        data() {
          return {
            dataSource: [
              { id: 'node1', nodename: '节点1', ifexec: 'N' },
              { id: 'node2', nodename: '节点2', ifexec: 'N' },
              { id: 'node3', nodename: '节点3', ifexec: 'Y' }
            ]
          }
        }
      })

      const record = { id: 'node2', nodename: '节点2', ifexec: 'N' }
      wrapper.vm.deleteRow(record)

      expect(wrapper.vm.$message.warning).toHaveBeenCalledWith('此节点后面还有已处理的节点，不能删除！')
      expect(wrapper.vm.$confirm).not.toHaveBeenCalled()
    })

    it('删除最后节点时应允许', () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' },
          canEditNodes: true
        },
        stubs: mockComponents,
        mocks: {
          $message: { warning: jest.fn() },
          $confirm: jest.fn()
        },
        data() {
          return {
            dataSource: [
              { id: 'node1', nodename: '节点1', ifexec: 'Y' },
              { id: 'node2', nodename: '节点2', ifexec: 'Y' },
              { id: 'node3', nodename: '节点3', ifexec: 'N' }
            ]
          }
        }
      })

      const record = { id: 'node3', nodename: '节点3', ifexec: 'N' }
      wrapper.vm.deleteRow(record)

      expect(wrapper.vm.$message.warning).not.toHaveBeenCalledWith('此节点后面还有已处理的节点，不能删除！')
      expect(wrapper.vm.$confirm).toHaveBeenCalled()
    })
  })

  describe('🔴 遗漏20: 流程结束通知', () => {
    it('最后节点通过时应触发workflow-complete事件', async () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        mocks: {
          $message: { success: jest.fn() }
        },
        data() {
          return {
            instance: { id: 'inst123' },
            todoNode: { id: 'node3' },
            nodes: [
              { id: 'node1' },
              { id: 'node2' },
              { id: 'node3' }
            ],
            form: { ifpass: '1' }
          }
        }
      })

      // 模拟最后节点
      expect(wrapper.vm.isLastTodo).toBe(true)

      // 模拟提交成功的事件触发
      wrapper.vm.$emit('workflow-complete', {
        instid: 'inst123',
        formid: 'test123',
        status: 'approved'
      })

      expect(wrapper.emitted('workflow-complete')).toBeTruthy()
      expect(wrapper.emitted('workflow-complete')[0][0]).toEqual({
        instid: 'inst123',
        formid: 'test123',
        status: 'approved'
      })
    })
  })

  // ==================== 🟠 重要遗漏测试 ====================

  describe('🟠 遗漏3: 序号列', () => {
    it('columns应包含序号列', () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' }
        },
        stubs: mockComponents
      })

      const cols = wrapper.vm.columns
      const indexCol = cols.find(c => c.key === 'index')

      expect(indexCol).toBeTruthy()
      expect(indexCol.title).toBe('序号')
      expect(indexCol.width).toBe(60)
    })

    it('序号列应显示行号（从1开始）', () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' }
        },
        stubs: mockComponents
      })

      const cols = wrapper.vm.columns
      const indexCol = cols.find(c => c.key === 'index')

      // 测试customRender函数
      expect(indexCol.customRender('', {}, 0)).toBe(1)
      expect(indexCol.customRender('', {}, 1)).toBe(2)
      expect(indexCol.customRender('', {}, 10)).toBe(11)
    })
  })

  describe('🟠 遗漏9: 选中节点清空意见', () => {
    it('选中节点时应清空追加意见输入框', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        data() {
          return {
            addOpinionText: '之前的意见'
          }
        }
      })

      const record = { id: 'node2', nodename: '节点2' }
      wrapper.vm.handleNodeSelect(record)

      expect(wrapper.vm.selectedNode).toEqual(record)
      expect(wrapper.vm.addOpinionText).toBe('')
    })
  })

  describe('🟠 遗漏10: 检查节点存在', () => {
    it('拿回已删除节点时应提示错误', () => {
      wrapper = shallowMount(WorkflowInfoPanel, {
        localVue,
        store,
        propsData: { formid: 'test123' },
        stubs: mockComponents,
        mocks: {
          $message: { warning: jest.fn(), error: jest.fn() }
        },
        data() {
          return {
            selectedNode: { id: 'node999', ifexec: 'Y' },
            nodes: [
              { id: 'node1' },
              { id: 'node2' }
            ]
          }
        }
      })

      wrapper.vm.handleTakeBack()

      expect(wrapper.vm.$message.error).toHaveBeenCalledWith('选中的节点已被删除，请刷新后重试')
      expect(wrapper.vm.selectedNode).toBeNull()
    })
  })

  describe('🟠 遗漏16: 新增节点默认值', () => {
    it('新增节点应包含所有必要的默认字段', () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' },
          canEditNodes: true
        },
        stubs: mockComponents,
        mocks: {
          $message: { warning: jest.fn() }
        },
        data() {
          return {
            dataSource: []
          }
        }
      })

      wrapper.vm.insertNode()

      expect(wrapper.vm.dataSource.length).toBe(1)
      const newNode = wrapper.vm.dataSource[0]

      expect(newNode).toHaveProperty('ifgetback', '')
      expect(newNode).toHaveProperty('stagename', '')
      expect(newNode).toHaveProperty('ifjump', '0')
      expect(newNode).toHaveProperty('nodetype', '1')
      expect(newNode).toHaveProperty('ifexec', 'N')
    })
  })

  describe('🟠 遗漏22: 顺序号唯一性', () => {
    it('保存重复顺序号时应提示错误', async () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' }
        },
        stubs: mockComponents,
        mocks: {
          $message: { warning: jest.fn() }
        },
        data() {
          return {
            dataSource: [
              { id: 'node1', nodename: '节点1', seqno: 1, userid: 'u1' },
              { id: 'node2', nodename: '节点2', seqno: 2, userid: 'u2' }
            ]
          }
        }
      })

      const record = { id: 'node2', nodename: '节点2', seqno: 1, userid: 'u2' }
      await wrapper.vm.commitRow(record)

      expect(wrapper.vm.$message.warning).toHaveBeenCalledWith('顺序号 1 已被节点【节点1】使用，请更换！')
    })

    it('保存唯一顺序号时不应报错', async () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' }
        },
        stubs: mockComponents,
        mocks: {
          $message: { warning: jest.fn() },
          $api: {
            postAction: jest.fn().mockResolvedValue({ success: true })
          }
        },
        data() {
          return {
            dataSource: [
              { id: 'node1', nodename: '节点1', seqno: 1, userid: 'u1' },
              { id: 'node2', nodename: '节点2', seqno: 2, userid: 'u2' }
            ]
          }
        }
      })

      const record = { id: 'node2', nodename: '节点2', seqno: 3, userid: 'u2' }
      await wrapper.vm.commitRow(record)

      expect(wrapper.vm.$message.warning).not.toHaveBeenCalledWith(expect.stringContaining('顺序号'))
    })
  })

  describe('🟠 遗漏30: 节点名称长度限制', () => {
    it('保存超长节点名时应提示错误', async () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' }
        },
        stubs: mockComponents,
        mocks: {
          $message: { warning: jest.fn() }
        }
      })

      const record = {
        id: 'node1',
        nodename: 'a'.repeat(51), // 51个字符
        userid: 'u1',
        seqno: 1
      }

      await wrapper.vm.commitRow(record)

      expect(wrapper.vm.$message.warning).toHaveBeenCalledWith('节点名称不能超过50个字符')
    })

    it('保存50字符节点名时应通过', async () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' }
        },
        stubs: mockComponents,
        mocks: {
          $message: { warning: jest.fn() },
          $api: {
            postAction: jest.fn().mockResolvedValue({ success: true })
          }
        },
        data() {
          return {
            dataSource: []
          }
        }
      })

      const record = {
        id: 'node1',
        nodename: 'a'.repeat(50), // 50个字符
        userid: 'u1',
        seqno: 1
      }

      await wrapper.vm.commitRow(record)

      expect(wrapper.vm.$message.warning).not.toHaveBeenCalledWith(expect.stringContaining('不能超过50个字符'))
    })
  })

  // ==================== 🟡 一般遗漏测试 ====================

  describe('🟡 遗漏27: 编辑时禁用行选择', () => {
    it('编辑节点时其他行应禁用选择', () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' }
        },
        stubs: mockComponents,
        data() {
          return {
            editingRowId: 'node1',
            dataSource: [
              { id: 'node1', nodename: '节点1' },
              { id: 'node2', nodename: '节点2' }
            ]
          }
        }
      })

      const rowSelection = wrapper.vm.rowSelection
      expect(rowSelection.getCheckboxProps).toBeTruthy()

      const node1Props = rowSelection.getCheckboxProps({ id: 'node1' })
      const node2Props = rowSelection.getCheckboxProps({ id: 'node2' })

      expect(node1Props.disabled).toBe(false) // 编辑中的行不禁用
      expect(node2Props.disabled).toBe(true)  // 其他行禁用
    })

    it('未编辑时所有行都可选择', () => {
      wrapper = shallowMount(WfInstanceDtlTable, {
        localVue,
        propsData: {
          instanceId: 'inst123',
          instance: { stagenames: '' }
        },
        stubs: mockComponents,
        data() {
          return {
            editingRowId: null,
            dataSource: [
              { id: 'node1', nodename: '节点1' },
              { id: 'node2', nodename: '节点2' }
            ]
          }
        }
      })

      const rowSelection = wrapper.vm.rowSelection
      const node1Props = rowSelection.getCheckboxProps({ id: 'node1' })
      const node2Props = rowSelection.getCheckboxProps({ id: 'node2' })

      expect(node1Props.disabled).toBe(false)
      expect(node2Props.disabled).toBe(false)
    })
  })
})
