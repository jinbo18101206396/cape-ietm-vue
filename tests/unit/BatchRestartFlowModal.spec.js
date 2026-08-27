import { shallowMount, createLocalVue } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import BatchRestartFlowModal from '@/views/ietm/ietmdatamodulemanagement/components/BatchRestartFlowModal.vue'

const localVue = createLocalVue()
localVue.use(Antd)

describe('BatchRestartFlowModal - 前端修复验证', () => {
  let wrapper

  beforeEach(() => {
    wrapper = shallowMount(BatchRestartFlowModal, {
      localVue,
      mocks: {
        $t: (key) => key
      },
      stubs: {
        'a-modal': true,
        'a-form': true,
        'a-form-item': true,
        'a-input': true,
        'a-textarea': true,
        'a-select': true,
        'a-button': true,
        'a-icon': true,
        'a-table': true
      }
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  /**
   * TC-H002-01: ifgetback应该是数组类型
   */
  test('H-002修复: ifgetback初始化为数组', () => {
    expect(wrapper.vm.model.ifgetback).toEqual([])
    expect(Array.isArray(wrapper.vm.model.ifgetback)).toBe(true)
  })

  /**
   * TC-H002-02: 添加节点时ifgetback应该初始化为数组
   */
  test('H-002修复: 添加节点时ifgetback为数组', () => {
    wrapper.vm.handleAddNode()

    const nodes = wrapper.vm.model.nodes
    expect(nodes.length).toBeGreaterThan(0)

    const lastNode = nodes[nodes.length - 1]
    expect(Array.isArray(lastNode.ifgetback)).toBe(true)
    expect(lastNode.ifgetback).toEqual([])
  })

  /**
   * TC-H002-03: 提交前ifgetback数组应该转换为逗号分隔字符串
   */
  test('H-002修复: 提交时数组转字符串', async () => {
    // 模拟添加节点并选择多个值
    wrapper.vm.handleAddNode()
    wrapper.vm.model.nodes[0].ifgetback = ['1', '2']

    // 模拟选择DM数据
    wrapper.vm.selectedRowKeys = ['dm_001']
    wrapper.vm.selectionRows = [
      { id: 'dm_001', dm_name: 'DM1', workflow_instance_id: 'inst_001' }
    ]

    // 填充必填字段
    wrapper.vm.model.batchId = 'test_batch'
    wrapper.vm.model.reason = '测试原因'

    // 模拟API调用
    wrapper.vm.$http = {
      post: jest.fn().mockResolvedValue({
        success: true,
        message: '成功'
      })
    }

    // 触发提交
    await wrapper.vm.handleOk()

    // 验证提交的数据
    expect(wrapper.vm.$http.post).toHaveBeenCalled()
    const submitData = wrapper.vm.$http.post.mock.calls[0][1]

    // ifgetback应该被转换为逗号分隔的字符串
    expect(submitData.nodes[0].ifgetback).toBe('1,2')
    expect(typeof submitData.nodes[0].ifgetback).toBe('string')
  })

  /**
   * TC-H002-04: 空数组应该转为空字符串
   */
  test('H-002修复: 空数组转空字符串', async () => {
    wrapper.vm.handleAddNode()
    wrapper.vm.model.nodes[0].ifgetback = []

    wrapper.vm.selectedRowKeys = ['dm_001']
    wrapper.vm.selectionRows = [
      { id: 'dm_001', dm_name: 'DM1', workflow_instance_id: 'inst_001' }
    ]

    wrapper.vm.model.batchId = 'test_batch'
    wrapper.vm.model.reason = '测试原因'

    wrapper.vm.$http = {
      post: jest.fn().mockResolvedValue({
        success: true,
        message: '成功'
      })
    }

    await wrapper.vm.handleOk()

    const submitData = wrapper.vm.$http.post.mock.calls[0][1]
    expect(submitData.nodes[0].ifgetback).toBe('')
  })

  /**
   * TC-C003-01: NODE_TYPE常量定义存在
   */
  test('C-003修复: NODE_TYPE常量定义', () => {
    // 从组件源码中提取NODE_TYPE常量
    const source = wrapper.vm.$options.__file || ''

    // 验证常量在data中的使用
    wrapper.vm.handleAddNode()
    const node = wrapper.vm.model.nodes[0]

    // 应该使用常量而非魔术数字
    expect(node.nodetype).toBeDefined()
    expect(['0', '1']).toContain(node.nodetype)
  })

  /**
   * TC-C003-02: 创建节点使用正确的nodetype
   */
  test('C-003修复: 创建节点nodetype=0', () => {
    wrapper.vm.handleAddNode()

    const node = wrapper.vm.model.nodes[0]
    expect(node.nodetype).toBe('0') // 创建节点
    expect(node.seqno).toBe(0) // 序号为0
  })

  /**
   * TC-C003-03: 普通节点使用正确的nodetype
   */
  test('C-003修复: 普通节点nodetype=1', () => {
    // 先添加创建节点
    wrapper.vm.handleAddNode()

    // 再添加普通节点
    wrapper.vm.handleAddNode()

    const nodes = wrapper.vm.model.nodes
    expect(nodes[0].nodetype).toBe('0') // 第一个是创建节点
    expect(nodes[1].nodetype).toBe('1') // 第二个是普通节点
  })

  /**
   * TC-边界-01: 节点顺序号自动递增
   */
  test('边界测试: 节点顺序号正确递增', () => {
    wrapper.vm.handleAddNode() // seqno = 0
    wrapper.vm.handleAddNode() // seqno = 1
    wrapper.vm.handleAddNode() // seqno = 2

    const nodes = wrapper.vm.model.nodes
    expect(nodes[0].seqno).toBe(0)
    expect(nodes[1].seqno).toBe(1)
    expect(nodes[2].seqno).toBe(2)
  })

  /**
   * TC-边界-02: 删除节点后重新添加顺序号正确
   */
  test('边界测试: 删除节点后顺序号连续', () => {
    wrapper.vm.handleAddNode() // seqno = 0
    wrapper.vm.handleAddNode() // seqno = 1
    wrapper.vm.handleAddNode() // seqno = 2

    // 删除第二个节点
    wrapper.vm.handleDelNode(1)

    const nodes = wrapper.vm.model.nodes
    expect(nodes.length).toBe(2)
    expect(nodes[0].seqno).toBe(0)
    expect(nodes[1].seqno).toBe(1) // 应该重新编号
  })

  /**
   * TC-数据结构-01: 提交数据格式正确
   */
  test('数据结构: 提交数据包含所有必需字段', async () => {
    wrapper.vm.handleAddNode()
    wrapper.vm.model.nodes[0].nodename = '审批节点'
    wrapper.vm.model.nodes[0].userid = 'user123'
    wrapper.vm.model.nodes[0].useridname = '张三'
    wrapper.vm.model.nodes[0].ifgetback = ['1']

    wrapper.vm.selectedRowKeys = ['dm_001']
    wrapper.vm.selectionRows = [
      { id: 'dm_001', dm_name: 'DM1', workflow_instance_id: 'inst_001' }
    ]

    wrapper.vm.model.batchId = 'batch_123'
    wrapper.vm.model.reason = '重启测试'
    wrapper.vm.model.ifurgent = '1'

    wrapper.vm.$http = {
      post: jest.fn().mockResolvedValue({
        success: true,
        message: '成功'
      })
    }

    await wrapper.vm.handleOk()

    const submitData = wrapper.vm.$http.post.mock.calls[0][1]

    // 验证必需字段
    expect(submitData.batchId).toBe('batch_123')
    expect(submitData.reason).toBe('重启测试')
    expect(submitData.ifurgent).toBe('1')
    expect(submitData.dataList).toHaveLength(1)
    expect(submitData.nodes).toHaveLength(1)

    // 验证dataList结构
    expect(submitData.dataList[0]).toHaveProperty('dmId')
    expect(submitData.dataList[0]).toHaveProperty('oldInstanceId')

    // 验证nodes结构
    expect(submitData.nodes[0]).toHaveProperty('seqno')
    expect(submitData.nodes[0]).toHaveProperty('nodename')
    expect(submitData.nodes[0]).toHaveProperty('nodetype')
    expect(submitData.nodes[0]).toHaveProperty('userid')
    expect(submitData.nodes[0]).toHaveProperty('useridname')
    expect(submitData.nodes[0]).toHaveProperty('ifgetback')
  })

  /**
   * TC-性能-01: 大量节点处理
   */
  test('性能测试: 处理多个节点', () => {
    // 添加10个节点
    for (let i = 0; i < 10; i++) {
      wrapper.vm.handleAddNode()
    }

    expect(wrapper.vm.model.nodes).toHaveLength(10)

    // 验证每个节点的ifgetback都是数组
    wrapper.vm.model.nodes.forEach((node, index) => {
      expect(Array.isArray(node.ifgetback)).toBe(true)
      expect(node.seqno).toBe(index)
    })
  })
})
