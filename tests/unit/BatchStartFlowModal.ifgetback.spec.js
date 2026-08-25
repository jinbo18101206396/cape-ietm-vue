/**
 * 批量启动流程 - 可跳转节点修复测试
 * 对标：旧系统 IncludeInstanceAdd.jsp + 新系统 WfInstanceDtlTable.vue
 *
 * 测试范围：
 * 1. getJumpableNodes - 动态节点列表加载
 * 2. onIfgetbackChange - 互斥性校验
 * 3. parseIfgetback - 数据解析
 * 4. prepareNodeDataForSubmit - 提交前转换
 * 5. formatIfgetback - 显示格式化
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import BatchStartFlowModal from '@/views/ietm/ietmdatamodulemanagement/components/BatchStartFlowModal.vue'

const localVue = createLocalVue()
localVue.use(Antd)

describe('BatchStartFlowModal - 可跳转节点修复测试', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(BatchStartFlowModal, {
      localVue,
      propsData: {
        visible: true
      },
      data() {
        return {
          nodeList: [
            { id: '001', nodename: '创建节点', seqno: 0, nodetype: '0', _isNew: false },
            { id: '002', nodename: 'DM审核', seqno: 1, nodetype: '1', _isNew: false },
            { id: '003', nodename: 'DM签批', seqno: 2, nodetype: '2', _isNew: false }
          ]
        }
      },
      mocks: {
        $message: {
          success: jest.fn(),
          error: jest.fn(),
          warning: jest.fn()
        }
      }
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  describe('getJumpableNodes - 动态节点列表', () => {
    it('应排除当前节点自身', () => {
      const record = { id: '002' }
      const jumpable = wrapper.vm.getJumpableNodes(record)

      expect(jumpable).toHaveLength(2)
      expect(jumpable.map(n => n.id)).toEqual(['001', '003'])
      expect(jumpable.map(n => n.nodename)).toEqual(['创建节点', 'DM签批'])
    })

    it('应排除未保存的新节点（_isNew=true）', () => {
      wrapper.setData({
        nodeList: [
          { id: '001', nodename: '创建节点', _isNew: false },
          { id: '002', nodename: 'DM审核', _isNew: false },
          { id: 'temp_003', nodename: '新节点', _isNew: true }
        ]
      })

      const record = { id: '001' }
      const jumpable = wrapper.vm.getJumpableNodes(record)

      expect(jumpable).toHaveLength(1)
      expect(jumpable[0].id).toBe('002')
    })

    it('当只有一个节点时，应返回空数组', () => {
      wrapper.setData({
        nodeList: [
          { id: '001', nodename: '创建节点', _isNew: false }
        ]
      })

      const record = { id: '001' }
      const jumpable = wrapper.vm.getJumpableNodes(record)

      expect(jumpable).toHaveLength(0)
    })
  })

  describe('onIfgetbackChange - 互斥性校验', () => {
    it('选择《不限制》时应互斥其他选项', () => {
      const record = { ifgetback: '' }

      wrapper.vm.onIfgetbackChange(record, ['__UNLIMITED__', '001'])

      expect(record.ifgetback).toBe('__UNLIMITED__')
      expect(wrapper.vm.$message.warning).toHaveBeenCalledWith('选择《不限制》时，不能再选择其他节点')
    })

    it('选择《不可跳转》时应互斥其他选项', () => {
      const record = { ifgetback: '' }

      wrapper.vm.onIfgetbackChange(record, ['__NO_JUMP__', '002'])

      expect(record.ifgetback).toBe('__NO_JUMP__')
      expect(wrapper.vm.$message.warning).toHaveBeenCalledWith('选择《不可跳转》时，不能再选择其他节点')
    })

    it('可以多选多个普通节点', () => {
      const record = { ifgetback: '' }

      wrapper.vm.onIfgetbackChange(record, ['001', '002', '003'])

      expect(record.ifgetback).toBe('001,002,003')
    })

    it('清空选择时应设置为空字符串', () => {
      const record = { ifgetback: '001,002' }

      wrapper.vm.onIfgetbackChange(record, [])

      expect(record.ifgetback).toBe('')
    })

    it('传入null或undefined时应设置为空字符串', () => {
      const record = { ifgetback: '001' }

      wrapper.vm.onIfgetbackChange(record, null)

      expect(record.ifgetback).toBe('')
    })
  })

  describe('parseIfgetback - 数据解析（数据库→UI）', () => {
    it('空值应解析为《不限制》', () => {
      expect(wrapper.vm.parseIfgetback('')).toEqual(['__UNLIMITED__'])
      expect(wrapper.vm.parseIfgetback(null)).toEqual(['__UNLIMITED__'])
      expect(wrapper.vm.parseIfgetback(undefined)).toEqual(['__UNLIMITED__'])
    })

    it('__NO_JUMP__应解析为数组', () => {
      expect(wrapper.vm.parseIfgetback('__NO_JUMP__')).toEqual(['__NO_JUMP__'])
    })

    it('-1（旧格式）应解析为__NO_JUMP__', () => {
      expect(wrapper.vm.parseIfgetback('-1')).toEqual(['__NO_JUMP__'])
    })

    it('__UNLIMITED__应解析为数组', () => {
      expect(wrapper.vm.parseIfgetback('__UNLIMITED__')).toEqual(['__UNLIMITED__'])
    })

    it('应正确解析逗号分隔的节点ID', () => {
      expect(wrapper.vm.parseIfgetback('001,002,003')).toEqual(['001', '002', '003'])
    })

    it('应正确处理ID中的空格', () => {
      expect(wrapper.vm.parseIfgetback(' 001 , 002 , 003 ')).toEqual(['001', '002', '003'])
    })

    it('应过滤掉空字符串项', () => {
      expect(wrapper.vm.parseIfgetback('001,,003')).toEqual(['001', '003'])
    })
  })

  describe('prepareNodeDataForSubmit - 提交前转换（UI→后端）', () => {
    it('__UNLIMITED__应转换为空字符串', () => {
      const node = { id: '001', ifgetback: '__UNLIMITED__', nodename: '创建节点' }
      const prepared = wrapper.vm.prepareNodeDataForSubmit(node)

      expect(prepared.ifgetback).toBe('')
    })

    it('__NO_JUMP__应转换为-1', () => {
      const node = { id: '001', ifgetback: '__NO_JUMP__', nodename: '创建节点' }
      const prepared = wrapper.vm.prepareNodeDataForSubmit(node)

      expect(prepared.ifgetback).toBe('-1')
    })

    it('节点ID列表应保持不变', () => {
      const node = { id: '001', ifgetback: '002,003', nodename: '创建节点' }
      const prepared = wrapper.vm.prepareNodeDataForSubmit(node)

      expect(prepared.ifgetback).toBe('002,003')
    })

    it('应返回新对象，不修改原对象', () => {
      const node = { id: '001', ifgetback: '__UNLIMITED__', nodename: '创建节点' }
      const prepared = wrapper.vm.prepareNodeDataForSubmit(node)

      expect(prepared).not.toBe(node)
      expect(node.ifgetback).toBe('__UNLIMITED__')
      expect(prepared.ifgetback).toBe('')
    })
  })

  describe('formatIfgetback - 显示格式化', () => {
    it('空值应显示为《不限制》', () => {
      expect(wrapper.vm.formatIfgetback('')).toBe('《不限制》')
      expect(wrapper.vm.formatIfgetback('__UNLIMITED__')).toBe('《不限制》')
    })

    it('__NO_JUMP__应显示为《不可跳转》', () => {
      expect(wrapper.vm.formatIfgetback('__NO_JUMP__')).toBe('《不可跳转》')
    })

    it('-1（旧格式）应显示为《不可跳转》', () => {
      expect(wrapper.vm.formatIfgetback('-1')).toBe('《不可跳转》')
    })

    it('0应显示为《创建》', () => {
      expect(wrapper.vm.formatIfgetback('0')).toBe('《创建》')
    })

    it('应将节点ID转换为节点名称', () => {
      const result = wrapper.vm.formatIfgetback('001,002')
      expect(result).toBe('创建节点, DM审核')
    })

    it('应处理混合格式（特殊标记+节点ID）', () => {
      const result = wrapper.vm.formatIfgetback('0,002,003')
      expect(result).toBe('《创建》, DM审核, DM签批')
    })

    it('未找到的节点ID应原样显示', () => {
      const result = wrapper.vm.formatIfgetback('999')
      expect(result).toBe('999')
    })
  })

  describe('集成测试 - 完整数据流', () => {
    it('场景1: 用户选择《不限制》', () => {
      const record = { id: '001', ifgetback: '' }

      // 1. UI操作：选择《不限制》
      wrapper.vm.onIfgetbackChange(record, ['__UNLIMITED__'])
      expect(record.ifgetback).toBe('__UNLIMITED__')

      // 2. 提交前转换
      const prepared = wrapper.vm.prepareNodeDataForSubmit(record)
      expect(prepared.ifgetback).toBe('') // 后端格式

      // 3. 显示格式化
      expect(wrapper.vm.formatIfgetback(record.ifgetback)).toBe('《不限制》')
    })

    it('场景2: 用户选择《不可跳转》', () => {
      const record = { id: '001', ifgetback: '' }

      wrapper.vm.onIfgetbackChange(record, ['__NO_JUMP__'])
      expect(record.ifgetback).toBe('__NO_JUMP__')

      const prepared = wrapper.vm.prepareNodeDataForSubmit(record)
      expect(prepared.ifgetback).toBe('-1')

      expect(wrapper.vm.formatIfgetback(record.ifgetback)).toBe('《不可跳转》')
    })

    it('场景3: 用户选择多个节点', () => {
      const record = { id: '001', ifgetback: '' }

      wrapper.vm.onIfgetbackChange(record, ['002', '003'])
      expect(record.ifgetback).toBe('002,003')

      const prepared = wrapper.vm.prepareNodeDataForSubmit(record)
      expect(prepared.ifgetback).toBe('002,003')

      expect(wrapper.vm.formatIfgetback(record.ifgetback)).toBe('DM审核, DM签批')
    })

    it('场景4: 加载旧数据（空字符串表示不限制）', () => {
      const parsed = wrapper.vm.parseIfgetback('')
      expect(parsed).toEqual(['__UNLIMITED__'])

      expect(wrapper.vm.formatIfgetback('')).toBe('《不限制》')
    })

    it('场景5: 加载旧数据（-1表示不可跳转）', () => {
      const parsed = wrapper.vm.parseIfgetback('-1')
      expect(parsed).toEqual(['__NO_JUMP__'])

      expect(wrapper.vm.formatIfgetback('-1')).toBe('《不可跳转》')
    })
  })
})
