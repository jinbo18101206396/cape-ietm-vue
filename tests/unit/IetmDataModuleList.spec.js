/**
 * 按钮状态单元测试
 * 测试文件: IetmDataModuleList.spec.js
 *
 * 运行测试: npm run test:unit
 */

import { mount } from '@vue/test-utils'
import IetmDataModuleList from '@/views/ietm/ietmdatamodulemanagement/IetmDataModuleList.vue'

describe('IetmDataModuleList - 按钮状态测试', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(IetmDataModuleList, {
      mocks: {
        $store: {
          getters: {
            userInfo: { username: 'testuser' }
          }
        }
      }
    })
  })

  afterEach(() => {
    wrapper.destroy()
  })

  // ========================================
  // 测试套件1：删除按钮状态
  // ========================================
  describe('删除按钮 - canDeleteRecord', () => {
    it('未启动流程+未签出 → 应可删除', () => {
      const record = {
        workflowStatus: null,
        checkoutUser: null
      }
      expect(wrapper.vm.canDeleteRecord(record)).toBe(true)
    })

    it('进行中('1') → 应不可删除', () => {
      const record = {
        workflowStatus: '1',
        checkoutUser: null
      }
      expect(wrapper.vm.canDeleteRecord(record)).toBe(false)
    })

    it('已结束('0')+未签出 → 应可删除', () => {
      const record = {
        workflowStatus: '0',
        checkoutUser: null
      }
      expect(wrapper.vm.canDeleteRecord(record)).toBe(true)
    })

    it('已终止('9')+未签出 → 应可删除', () => {
      const record = {
        workflowStatus: '9',
        checkoutUser: null
      }
      expect(wrapper.vm.canDeleteRecord(record)).toBe(true)
    })

    it('已签出 → 应不可删除', () => {
      const record = {
        workflowStatus: '0',
        checkoutUser: 'otheruser'
      }
      expect(wrapper.vm.canDeleteRecord(record)).toBe(false)
    })
  })

  // ========================================
  // 测试套件2：启动流程按钮状态
  // ========================================
  describe('启动流程按钮 - canStartWorkflow', () => {
    it('未选中记录 → 应禁用', () => {
      wrapper.vm.selectedRows = []
      expect(wrapper.vm.canStartWorkflow).toBe(false)
    })

    it('未启动流程(null) → 应启用', () => {
      wrapper.vm.selectedRows = [{ workflowStatus: null }]
      expect(wrapper.vm.canStartWorkflow).toBe(true)
    })

    it('进行中('1') → 应禁用', () => {
      wrapper.vm.selectedRows = [{ workflowStatus: '1' }]
      expect(wrapper.vm.canStartWorkflow).toBe(false)
    })

    it('已撤销('2') → 应禁用', () => {
      wrapper.vm.selectedRows = [{ workflowStatus: '2' }]
      expect(wrapper.vm.canStartWorkflow).toBe(false)
    })

    it('已结束('0') → 应启用', () => {
      wrapper.vm.selectedRows = [{ workflowStatus: '0' }]
      expect(wrapper.vm.canStartWorkflow).toBe(true)
    })

    it('已终止('9') → 应启用', () => {
      wrapper.vm.selectedRows = [{ workflowStatus: '9' }]
      expect(wrapper.vm.canStartWorkflow).toBe(true)
    })

    it('批量-部分进行中 → 应禁用', () => {
      wrapper.vm.selectedRows = [
        { workflowStatus: null },
        { workflowStatus: '1' }  // 有进行中
      ]
      expect(wrapper.vm.canStartWorkflow).toBe(false)
    })

    it('批量-全部可启动 → 应启用', () => {
      wrapper.vm.selectedRows = [
        { workflowStatus: null },
        { workflowStatus: '0' },
        { workflowStatus: '9' }
      ]
      expect(wrapper.vm.canStartWorkflow).toBe(true)
    })
  })

  // ========================================
  // 测试套件3：签出按钮状态
  // ========================================
  describe('签出按钮 - buttonStates.canCheckOut', () => {
    it('未启动流程 → 应禁用', () => {
      const record = {
        workflowStatus: null,
        workflowInstanceId: null,
        workflowStep: null,
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckOut).toBe(false)
    })

    it('进行中+DM编写节点+未签出+未发布 → 应启用', () => {
      const record = {
        workflowStatus: '1',
        workflowInstanceId: 'wf-123',
        workflowStep: 'DM编写',
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckOut).toBe(true)
    })

    it('进行中+非DM编写节点 → 应禁用', () => {
      const record = {
        workflowStatus: '1',
        workflowInstanceId: 'wf-123',
        workflowStep: '校对',
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckOut).toBe(false)
    })

    it('已结束 → 应禁用', () => {
      const record = {
        workflowStatus: '0',
        workflowInstanceId: 'wf-123',
        workflowStep: null,
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckOut).toBe(false)
    })

    it('已终止 → 应禁用', () => {
      const record = {
        workflowStatus: '9',
        workflowInstanceId: 'wf-123',
        workflowStep: null,
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckOut).toBe(false)
    })

    it('已发布 → 应禁用', () => {
      const record = {
        workflowStatus: '1',
        workflowInstanceId: 'wf-123',
        workflowStep: 'DM编写',
        checkoutUser: null,
        versionType: '1'  // 已发布
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckOut).toBe(false)
    })

    it('已被签出 → 应禁用', () => {
      const record = {
        workflowStatus: '1',
        workflowInstanceId: 'wf-123',
        workflowStep: 'DM编写',
        checkoutUser: 'otheruser',  // 已签出
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckOut).toBe(false)
    })
  })

  // ========================================
  // 测试套件4：编辑属性按钮状态
  // ========================================
  describe('编辑属性按钮 - buttonStates.canEditProp', () => {
    it('未启动流程 → 应禁用', () => {
      const record = {
        workflowInstanceId: null,
        workflowStep: null,
        checkoutUser: null
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canEditProp).toBe(false)
    })

    it('进行中+DM编写节点+未被他人签出 → 应启用', () => {
      const record = {
        workflowInstanceId: 'wf-123',
        workflowStep: 'DM编写',
        checkoutUser: null
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canEditProp).toBe(true)
    })

    it('进行中+DM编写节点+本人签出 → 应启用', () => {
      const record = {
        workflowInstanceId: 'wf-123',
        workflowStep: 'DM编写',
        checkoutUser: 'testuser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canEditProp).toBe(true)
    })

    it('进行中+DM编写节点+他人签出 → 应禁用', () => {
      const record = {
        workflowInstanceId: 'wf-123',
        workflowStep: 'DM编写',
        checkoutUser: 'otheruser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canEditProp).toBe(false)
    })

    it('进行中+非DM编写节点 → 应禁用', () => {
      const record = {
        workflowInstanceId: 'wf-123',
        workflowStep: '校对',
        checkoutUser: null
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canEditProp).toBe(false)
    })

    it('已结束 → 应禁用', () => {
      const record = {
        workflowInstanceId: 'wf-123',
        workflowStep: null,
        checkoutUser: null
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canEditProp).toBe(false)
    })
  })

  // ========================================
  // 测试套件5：发布按钮状态
  // ========================================
  describe('发布按钮 - buttonStates.canPublish', () => {
    it('未启动流程 → 应禁用', () => {
      const record = {
        workflowStatus: null,
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canPublish).toBe(false)
    })

    it('进行中 → 应禁用', () => {
      const record = {
        workflowStatus: '1',
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canPublish).toBe(false)
    })

    it('已结束+未签出+未发布 → 应启用', () => {
      const record = {
        workflowStatus: '0',
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canPublish).toBe(true)
    })

    it('已终止 → 应禁用', () => {
      const record = {
        workflowStatus: '9',
        checkoutUser: null,
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canPublish).toBe(false)
    })

    it('已发布 → 应禁用', () => {
      const record = {
        workflowStatus: '0',
        checkoutUser: null,
        versionType: '1'  // 已发布
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canPublish).toBe(false)
    })

    it('已签出 → 应禁用', () => {
      const record = {
        workflowStatus: '0',
        checkoutUser: 'testuser',  // 已签出
        versionType: '0'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canPublish).toBe(false)
    })
  })

  // ========================================
  // 测试套件6：重启流程按钮状态
  // ========================================
  describe('重启流程按钮 - buttonStates.canRestartWorkflow', () => {
    it('未启动流程 → 应禁用', () => {
      const record = {
        workflowStatus: null,
        issueNo: '001',
        inWork: '00',
        createBy: 'testuser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canRestartWorkflow).toBe(false)
    })

    it('进行中 → 应禁用', () => {
      const record = {
        workflowStatus: '1',
        issueNo: '001',
        inWork: '00',
        createBy: 'testuser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canRestartWorkflow).toBe(false)
    })

    it('已结束+已发布+自己创建 → 应启用', () => {
      const record = {
        workflowStatus: '0',
        issueNo: '002',
        inWork: '00',
        createBy: 'testuser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canRestartWorkflow).toBe(true)
    })

    it('已终止+已发布+自己创建 → 应启用', () => {
      const record = {
        workflowStatus: '9',
        issueNo: '002',
        inWork: '00',
        createBy: 'testuser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canRestartWorkflow).toBe(true)
    })

    it('已结束+未发布 → 应禁用', () => {
      const record = {
        workflowStatus: '0',
        issueNo: '001',
        inWork: '01',  // 未发布
        createBy: 'testuser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canRestartWorkflow).toBe(false)
    })

    it('已结束+已发布+他人创建 → 应禁用', () => {
      const record = {
        workflowStatus: '0',
        issueNo: '002',
        inWork: '00',
        createBy: 'otheruser'  // 他人创建
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canRestartWorkflow).toBe(false)
    })
  })

  // ========================================
  // 测试套件7：签入/取消签出按钮状态
  // ========================================
  describe('签入和取消签出按钮', () => {
    it('签入-本人已签出 → 应启用', () => {
      const record = {
        checkoutUser: 'testuser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckIn).toBe(true)
    })

    it('签入-他人已签出 → 应禁用', () => {
      const record = {
        checkoutUser: 'otheruser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckIn).toBe(false)
    })

    it('签入-未签出 → 应禁用', () => {
      const record = {
        checkoutUser: null
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCheckIn).toBe(false)
    })

    it('取消签出-本人已签出 → 应启用', () => {
      const record = {
        checkoutUser: 'testuser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCancelCheckOut).toBe(true)
    })

    it('取消签出-他人已签出 → 应禁用', () => {
      const record = {
        checkoutUser: 'otheruser'
      }
      wrapper.vm.selectedRows = [record]
      wrapper.vm.updateButtonStates()
      expect(wrapper.vm.buttonStates.canCancelCheckOut).toBe(false)
    })
  })

  // ========================================
  // 测试套件8：校验按钮状态
  // ========================================
  describe('校验按钮 - buttonStates.canValidate', () => {
    it('任何状态都应启用', () => {
      const states = [
        { workflowStatus: null },
        { workflowStatus: '1' },
        { workflowStatus: '0' },
        { workflowStatus: '9' }
      ]

      states.forEach(record => {
        wrapper.vm.selectedRows = [record]
        wrapper.vm.updateButtonStates()
        expect(wrapper.vm.buttonStates.canValidate).toBe(true)
      })
    })
  })
})
