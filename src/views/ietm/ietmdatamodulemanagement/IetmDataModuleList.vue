<template>
  <div class="ietm-dm-container">
    <a-card :bordered="false" :body-style="{ padding: '16px' }">
      <!-- 工具栏-->
      <div class="toolbar-wrapper">
        <a-space :size="8" :wrap="true">
          <a-button type="primary" icon="plus" @click="handleAdd">新建</a-button>
          <a-button type="primary" icon="copy" @click="handleCopy" :disabled="selectedRowKeys.length !== 1">复制</a-button>
          <a-button type="primary" icon="copy" @click="handleCopyNew" :disabled="!copyId">复制新建</a-button>
          <a-button v-if="canShowDeleteButton" type="danger" icon="delete" @click="handleDelete()" :disabled="!canBatchDelete">删除</a-button>
          <a-button type="primary" icon="deployment-unit" @click="handleStartWorkflow" :disabled="!hasSelected">启动流程</a-button>
          <a-button type="primary" icon="edit" @click="handleEditProp" :disabled="!buttonStates.canEditProp">编辑</a-button>
          <a-button type="primary" icon="export" @click="handleCheckOut" :disabled="!buttonStates.canCheckOut">签出</a-button>
          <a-button type="primary" icon="close-circle" @click="handleCancelCheckOut" :disabled="!buttonStates.canCancelCheckOut">取消签出</a-button>
          <a-button type="primary" icon="edit" @click="handleEditDmContent" :disabled="selectedRowKeys.length !== 1">浏览或编辑DM内容</a-button>
          <a-button type="primary" icon="import" @click="handleCheckIn" :disabled="!buttonStates.canCheckIn">签入</a-button>
          <a-button type="primary" icon="eye" @click="handlePreview" :disabled="selectedRowKeys.length !== 1">预览</a-button>
          <a-button type="primary" icon="check-circle" @click="handleValidate" :disabled="!buttonStates.canValidate">校验</a-button>
          <a-button type="primary" icon="history" @click="handleHistory" :disabled="selectedRowKeys.length !== 1">历史版本</a-button>
          <a-button type="primary" icon="apartment" @click="handleReference" :disabled="selectedRowKeys.length !== 1">引用关系</a-button>
          <a-button type="primary" icon="rocket" @click="handlePublish" :disabled="!buttonStates.canPublish">发布</a-button>
          <a-button type="primary" icon="reload" @click="handleRestartWorkflow" :disabled="selectedRowKeys.length !== 1">重启流程</a-button>
        </a-space>
      </div>

      <!-- 左右分栏布局 -->
      <a-row :gutter="16" class="content-row">
        <!-- 左侧：构型树 -->
        <a-col :span="6">
          <a-card size="small" class="tree-card">
            <div slot="title" class="card-title">
              <a-icon type="apartment" style="margin-right: 8px;" />
              构型树            </div>
            <div slot="extra" class="code-rule-tip">
              编码规则：A-00-0-0-00-00-A
            </div>

            <config-tree @select="onTreeSelect" @paste-success="handlePasteSuccess" />
          </a-card>
        </a-col>

        <!-- 右侧：数据模块列表+ 资源列表 -->
        <a-col :span="18">
          <!-- 数据模块列表卡片 -->
          <a-card size="small" class="list-card">
            <div slot="title" class="card-title">
              <a-icon type="database" style="margin-right: 8px;" />
              数据模块列表
              <span v-if="currentTreeNode" style="margin-left: 12px; font-size: 13px; font-weight: normal; color: #8c8c8c;">
                <a-icon type="folder" style="margin-right: 4px;" />
                {{ currentTreeNode.nodeName }}
              </span>
            </div>

            <!-- 空状态提示-->
            <div v-if="!currentTreeNode" class="empty-hint">
              <a-empty description="">
                <span slot="description">
                  <a-icon type="folder-open" style="font-size: 48px; color: #bfbfbf; margin-bottom: 16px;" />
                  <p style="font-size: 16px; color: #595959; margin-bottom: 8px;">请先选择项目或构型节点</p>
                  <p style="font-size: 14px; color: #8c8c8c;">在左侧树中选择一个项目或节点，查看对应的数据模块</p>
                </span>
              </a-empty>
            </div>

            <!-- 数据表格 -->
            <a-table
              v-else
              ref="table"
              size="middle"
              :columns="columns"
              :dataSource="dataSource"
              :pagination="ipagination"
              :loading="loading"
              :rowSelection="{
                selectedRowKeys: selectedRowKeys,
                onChange: onSelectChange,
                type: 'checkbox',
                fixed: true,
                columnWidth: 50,
                getCheckboxProps: record => ({
                  props: {
                    disabled: false
                  }
                })
              }"
              :scroll="{ x: true }"
              :locale="{ emptyText: '暂无数据' }"
              rowKey="id"
              @change="handleTableChange"
              bordered
            >
              <span slot="dmcCode" slot-scope="text, record">
                <a @click="handleViewDmcDetail(record)" style="color: #1890ff; font-family: monospace; cursor: pointer;">
                  {{ text }}
                </a>
              </span>

              <span slot="versionInfo" slot-scope="text, record">
                <a-tag color="blue">{{ record.issueNo }}-{{ record.inWork }}</a-tag>
                <a-tag v-if="record.versionType === '1'" color="purple">
                  <a-icon type="check-circle" /> 已发布                </a-tag>
              </span>

              <span slot="checkoutStatus" slot-scope="text, record">
                <!-- 自己签出：绿色勾选，可签入/取消签出 -->
                <a-tooltip
                  v-if="record.checkoutUser && record.checkoutUser === currentUser"
                  :title="`您已签出（可编辑）\n时间：${record.checkoutTime || ''}`">
                  <a-icon type="check-circle" style="font-size: 18px; color: #52c41a;" />
                </a-tooltip>
                <!-- 他人签出：红色锁，不可操作 -->
                <a-tooltip
                  v-else-if="record.checkoutUser"
                  :title="`已被【${record.checkoutUser}】签出\n时间：${record.checkoutTime || ''}`">
                  <a-icon type="lock" style="font-size: 18px; color: #ff4d4f;" />
                </a-tooltip>
                <!-- 已签入/未签出：灰色锁，可签出 -->
                <a-tooltip v-else title="已签入，可签出">
                  <a-icon type="lock" style="font-size: 18px; color: #d9d9d9;" />
                </a-tooltip>
              </span>

              <span slot="workflowStatus" slot-scope="text, record">
                <a-tag v-if="!record.workflowStatus_dictText || record.workflowStatus_dictText === '未启动'" color="blue">
                  <a-icon type="clock-circle" /> {{ record.workflowStatus_dictText || '未启动' }}
                </a-tag>
                <a-tag v-else-if="record.workflowStatus_dictText === '进行中'" color="orange">
                  <a-icon type="loading" /> {{ record.workflowStatus_dictText }}
                </a-tag>
                <a-tag v-else-if="record.workflowStatus_dictText === '已结束'" color="green">
                  <a-icon type="check-circle" /> {{ record.workflowStatus_dictText }}
                </a-tag>
                <a-tag v-else color="cyan">{{ record.workflowStatus_dictText }}</a-tag>
              </span>

            </a-table>
          </a-card>

          <!-- DM资源列表卡片 -->
          <a-card size="small" class="resource-card" style="margin-top: 16px;">
            <div slot="title" class="card-title">
              <a-icon type="file" style="margin-right: 8px;" />
              DM资源列表
            </div>
            <div slot="extra">
              <a-space :size="8">
                <a-button size="small" type="primary" icon="plus" @click="handleAddResource" :disabled="!currentSelectedDm">
                  添加资源
                </a-button>
              </a-space>
            </div>

            <!-- 资源表格 - 始终显示表头 -->
            <a-table
              ref="resourceTable"
              size="small"
              :columns="resourceColumns"
              :dataSource="resourceDataSource"
              :pagination="false"
              :loading="resourceLoading"
              :rowSelection="currentSelectedDm ? { type: 'radio', selectedRowKeys: selectedResourceKeys, onChange: onResourceSelectChange } : null"
              :scroll="{ x: true }"
              :locale="{ emptyText: currentSelectedDm ? 'No resources, please click Add Resource button' : 'Please select a data module first' }"
              rowKey="id"
              bordered
            >
              <span slot="action" slot-scope="text, record">
                <a @click="handleDownloadResource(record)">
                  <a-icon type="download" /> 下载
                </a>
                <a-divider type="vertical" />
                <a @click="handleEditResource(record)">
                  <a-icon type="edit" /> 编辑
                </a>
                <a-divider type="vertical" />
                <a @click="handleDeleteResource(record)" style="color: red;">
                  <a-icon type="delete" /> 删除
                </a>
              </span>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </a-card>

    <!-- 所有弹窗组件-->
    <data-module-form-modal ref="formModal" @ok="loadData" />
    <dm-view-modal ref="viewModal" />
    <dm-preview-modal ref="previewModal" />
    <dm-history-modal ref="historyModal" />
    <dm-reference-modal ref="referenceModal" />
    <dm-editor-modal ref="editorModal" @ok="handleEditorModalOk" />
    <dm-diff-modal ref="diffModal" />
    <dm-workflow-modal ref="workflowModal" @ok="loadData" />
    <dm-validation-modal ref="validationModal" />
    <dm-copy-modal ref="copyModal" @ok="loadData" />
    <dm-resource-modal ref="resourceModal" @ok="handleResourceModalOk" />
    <dm-edit-prop-modal ref="editPropModal" @ok="handleEditPropModalOk" />
    <batch-start-flow-modal ref="batchStartFlowModal" @ok="loadData" @mock-updated="handleMockFlowUpdated" />
    <!-- DmImportModal 已删除：无 UI 入口，属于死代码 -->
  </div>
</template>

<script>
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import { getAction, postAction, deleteAction } from '@/api/manage'
import { Empty } from 'ant-design-vue'
import DataModuleFormModal from './components/DataModuleFormModal'
import DmViewModal from './components/DmViewModal'
import DmPreviewModal from './editor/components/DmPreviewModal'
import DmHistoryModal from './components/DmHistoryModal'
import DmReferenceModal from './components/DmReferenceModal'
import DmEditorModal from './components/DmEditorModal'
import DmDiffModal from './components/DmDiffModal'
import DmWorkflowModal from './components/DmWorkflowModal'
import DmValidationModal from './components/DmValidationModal'
import DmCopyModal from './components/DmCopyModal'
import DmResourceModal from './components/DmResourceModal'
import DmEditPropModal from './components/DmEditPropModal'
import BatchStartFlowModal from './components/BatchStartFlowModal'
import ConfigTree from './components/ConfigTree'
// DmImportModal 已删除：无 UI 入口，属于死代码

export default {
  name: 'IetmDataModuleList',
  mixins: [JeecgListMixin],
  components: {
    DataModuleFormModal,
    DmViewModal,
    DmPreviewModal,
    DmHistoryModal,
    DmReferenceModal,
    DmEditorModal,
    DmDiffModal,
    DmWorkflowModal,
    DmValidationModal,
    DmCopyModal,
    DmResourceModal,
    DmEditPropModal,
    BatchStartFlowModal,
    ConfigTree
  },
  data() {
    return {
      // 禁用mixin的自动加载，等待选择树节点后再加载
      disableMixinCreated: true,
      description: 'IETM数据模块管理',
      columns: [
        { title: '', align: 'center', dataIndex: 'checkoutUser', width: 60, fixed: 'left',
          scopedSlots: { customRender: 'checkoutStatus' } },
        { title: 'DMC', align: 'center', dataIndex: 'dmcCode', width: 380,
          scopedSlots: { customRender: 'dmcCode' } },
        { title: '技术名称', align: 'center', dataIndex: 'techName', width: 200, ellipsis: true },
        { title: '信息名称', align: 'center', dataIndex: 'infoName', width: 200, ellipsis: true },
        { title: 'DM类型', align: 'center', dataIndex: 'dmType_dictText', width: 100 },
        { title: '版本', align: 'center', dataIndex: 'versionInfo', width: 100,
          scopedSlots: { customRender: 'versionInfo' } },
        { title: '版本类型', align: 'center', dataIndex: 'issueType', width: 90,
          customRender: (text) => {
            // 直接显示数据库中的issueType字段值（S1000D标准）
            return text || '-'
          }
        },
        { title: '版本日期', align: 'center', dataIndex: 'issueDate', width: 120,
          customRender: (text) => {
            return text ? (typeof text === 'string' ? text.substring(0, 10) : text) : '-'
          }
        },
        { title: '密级', align: 'center', dataIndex: 'security_dictText', width: 100 },
        { title: '流程当前步骤', align: 'center', dataIndex: 'workflowStep', width: 120, ellipsis: true, fixed: 'right' },
        { title: '流程状态', align: 'center', dataIndex: 'workflowStatus_dictText', width: 100, fixed: 'right',
          scopedSlots: { customRender: 'workflowStatus' } }
      ],
      url: {
        list: '/ietm/datamodule/list',
        delete: '/ietm/datamodule/delete',
        deleteBatch: '/ietm/datamodule/batchDelete',
        queryById: '/ietm/datamodule/queryById',
        checkOut: '/ietm/datamodule/checkOut',
        cancelCheckOut: '/ietm/datamodule/cancelCheckOut',
        checkIn: '/ietm/datamodule/checkIn',
        publish: '/ietm/datamodule/publish',
        copyDm: '/ietm/datamodule/copyDm',
        copyAndCreateDm: '/ietm/datamodule/copyAndCreateDm'
      },
      queryParam: {},
      selectedRowKeys: [],
      selectedRows: [],
      buttonStates: {
        canCheckOut: false,
        canCheckIn: false,
        canCancelCheckOut: false,
        canEdit: false,
        canPublish: false,
        canEditContent: false,
        canValidate: false,
        canEditProp: false
      },
      // 树选择相关
      currentTreeNode: null,
      // 复制DM相关
      copyId: null, // 被复制DM的ID
      copiedRecord: null, // 被复制DM的完整记录
      // DM资源列表相关
      resourceColumns: [
        { title: '#', dataIndex: '', key: 'rowIndex', width: 50, align: 'center',
          customRender: (t, r, index) => parseInt(index) + 1 },
        { title: '资源名称', align: 'center', dataIndex: 'resourceName', width: 200, ellipsis: true },
        { title: '文件名称', align: 'center', dataIndex: 'fileName', width: 250, ellipsis: true },
        { title: '说明', align: 'center', dataIndex: 'remark', width: 300, ellipsis: true },
        { title: '操作人', align: 'center', dataIndex: 'operator', width: 100 },
        { title: '操作时间', align: 'center', dataIndex: 'operateTime', width: 150,
          customRender: (text) => text ? text.substring(0, 10) : '' },
        { title: '操作', dataIndex: 'action', align: 'center', fixed: 'right', width: 200,
          scopedSlots: { customRender: 'action' } }
      ],
      resourceDataSource: [],
      resourceLoading: false,
      selectedResourceKeys: [],
      currentSelectedDm: null,
      currentSelectedResource: null,
      // Ant Design Empty组件的简单图标
      simpleImage: Empty.PRESENTED_IMAGE_SIMPLE,
      // Mock模式：流程状态更新缓存
      mockFlowUpdates: {} // { dmId: { workflowStep, workflowStatus, workflowStatus_dictText } }
    }
  },
  computed: {
    hasSelected() {
      return this.selectedRowKeys.length > 0
    },
    // 当前选中的单条记录
    currentRecord() {
      return this.selectedRows.length === 1 ? this.selectedRows[0] : null
    },
    // 当前登录用户
    currentUser() {
      return (this.$store.getters.userInfo && this.$store.getters.userInfo.username) || 'admin'
    },
    // 所有选中记录是否均可删除（用于工具栏批量删除按钮）
    canBatchDelete() {
      if (this.selectedRows.length === 0) return false
      // 管理员可以删除所有可删除的记录
      const isAdmin = this.currentUser === 'admin'
      if (isAdmin) {
        return this.selectedRows.every(record => this.canDeleteRecord(record))
      }
      // 普通用户只能删除自己创建的记录
      return this.selectedRows.every(
        record => this.canDeleteRecord(record) && record.createBy === this.currentUser
      )
    },
    // 所有选中记录的创建者是否都是当前用户（用于控制删除按钮可见性）
    canShowDeleteButton() {
      if (this.selectedRows.length === 0) return false
      // 管理员可以删除所有记录，普通用户只能删除自己创建的记录
      const isAdmin = this.currentUser === 'admin' // 或根据实际角色判断
      if (isAdmin) return true
      return this.selectedRows.every(record => record.createBy === this.currentUser)
    },
  },
  watch: {
    selectedRows: {
      handler(newVal) {
        this.updateButtonStates()
      },
      immediate: true
    }
  },
  methods: {
    // 重写 JeecgListMixin 的loadData 方法，添加参数校验守卫
    loadData(arg) {

      // 守卫：如果没有选中树节点（projectId 或cmNodeId为空），不允许查询
      if (!this.queryParam.projectId && !this.queryParam.cmNodeId) {
        console.warn('【loadData守卫拦截】projectId和cmNodeId都为空，跳过加载')
        this.dataSource = []
        this.loading = false
        this.ipagination.total = 0
        return Promise.resolve()
      }

      // 参数合法，调用mixin 的原始loadData
      // 注意：不能用 this.$options.mixins[0].methods.loadData，因为mixin 可能有多个
      // 正确做法：直接访问JeecgListMixin 的实例
      if (!arg) {
        arg = 1
      }
      this.ipagination.current = arg
      var params = this.getQueryParams()
      this.loading = true
      return getAction(this.url.list, params).then((res) => {
        if (res.success) {
          this.dataSource = res.result.records || res.result

          // 🔧 Mock模式：应用缓存的流程状态更新
          if (Object.keys(this.mockFlowUpdates).length > 0) {
            console.log('🔧 Mock模式：应用流程状态更新到列表数据')
            this.dataSource.forEach(record => {
              if (this.mockFlowUpdates[record.id]) {
                Object.assign(record, this.mockFlowUpdates[record.id])
                console.log(`✅ 更新记录 ${record.dmCode}:`, this.mockFlowUpdates[record.id])
              }
            })
          }

          if (res.result.total) {
            this.ipagination.total = res.result.total
          } else {
            this.ipagination.total = 0
          }
        } else {
          // 后端返回success=false，显示错误信息
          console.error('【loadData后端返回错误】message:', res.message)
          this.$message.error(res.message || '加载数据失败')
          this.dataSource = []
          this.ipagination.total = 0
        }
        this.loading = false
        return res
      }).catch((err) => {
        this.$message.error('加载数据失败，请检查网络连接')
        this.loading = false
        throw err
      })
    },

    // 🔧 Mock模式：处理流程启动后的状态更新
    handleMockFlowUpdated(data) {
      console.log('🔧 Mock模式：记录流程状态更新', data)
      // 记录需要更新的DM ID和状态
      data.dmIds.forEach(id => {
        this.mockFlowUpdates[id] = {
          workflowStep: data.workflowStep,
          workflowStatus: data.workflowStatus,
          workflowStatus_dictText: data.workflowStatus_dictText
        }
      })
      console.log('🔧 Mock更新缓存:', this.mockFlowUpdates)
    },

    handleAdd() {
      // 检查是否选择了树节点
      if (!this.currentTreeNode) {
        this.$message.warning('请先在左侧树中选择一个构型节点')
        return
      }

      // 传递当前选中的项目ID和构型节点ID
      this.$refs.formModal.add({
        projectId: this.currentTreeNode.projectId,
        cmNodeId: this.currentTreeNode.nodeId,
        cmNodePath: this.currentTreeNode.nodePath,
        cmNodeName: this.currentTreeNode.nodeName
        // SNS不再通过参数传递，改为前端调用API获取
      })
    },
    handleEdit(record) {
      if (!record && this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }
      const id = record ? record.id : this.selectedRowKeys[0]
      this.$refs.formModal.edit({ id })
    },
    handleView(record) {
      if (!record && this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }
      const id = record ? record.id : this.selectedRowKeys[0]
      this.$refs.viewModal.show(id)
    },
    handleHistory(record) {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }

      let data = null
      if (record && record.id && typeof record.id === 'string') {
        data = record
      } else if (this.selectedRows.length > 0 && this.selectedRows[0].id) {
        data = this.selectedRows[0]
      } else if (this.selectedRowKeys.length > 0) {
        data = this.dataSource.find(item => item.id === this.selectedRowKeys[0])
      }

      if (!data) {
        this.$message.error('无法获取DM信息，请重新选择')
        return
      }

      // 在系统Tab页签中打开历史版本页面
      this.$router.push({
        path: '/ietm/dm-history',
        query: {
          dmcCode: data.dmcCode || '',
          projectId: data.projectId || '',
          sns: data.sns || '',
          infoCode: data.infoCode || '',
          infoCodeVariant: data.infoCodeVariant || '',
          ietmLocationCode: data.ietmLocationCode || ''
        }
      })
    },
    handleReference(record) {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }

      let data = null
      if (record && record.id && typeof record.id === 'string') {
        data = record
      } else if (this.selectedRows.length > 0 && this.selectedRows[0].id) {
        data = this.selectedRows[0]
      } else if (this.selectedRowKeys.length > 0) {
        data = this.dataSource.find(item => item.id === this.selectedRowKeys[0])
      }

      if (!data) {
        this.$message.error('无法获取DM信息，请重新选择')
        return
      }

      this.$refs.referenceModal.show(data)
    },
    handleCopy(record) {
      // 复制DM：仅标记操作（存储copyId）
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }

      // 获取DM数据：优先从selectedRows，然后从dataSource查找
      let data = null

      // 如果record是有效的DM对象（有id属性），使用它
      if (record && record.id && typeof record.id === 'string') {
        data = record
      }
      // 否则从selectedRows获取
      else if (this.selectedRows.length > 0 && this.selectedRows[0].id) {
        data = this.selectedRows[0]
      }
      // 最后从dataSource中根据selectedRowKeys查找
      else if (this.selectedRowKeys.length > 0) {
        const selectedId = this.selectedRowKeys[0]
        data = this.dataSource.find(item => item.id === selectedId)
      }

      // 防御性检查：确保data和data.id存在
      if (!data || !data.id) {
        this.$message.error('无法获取DM信息，请重新选择')
        console.error('handleCopy: 无法找到选中的DM', {
          recordIsEvent: record instanceof Event,
          selectedRows: this.selectedRows,
          selectedRowKeys: this.selectedRowKeys,
          dataSourceLength: this.dataSource.length
        })
        return
      }

      // 问题3修复：复制DM为纯前端操作，不发起后台请求
      this.copyId = data.id
      this.copiedRecord = { ...data }
      this.$message.success('复制成功')
    },
    handleCopyNew(record) {
      // 复制新建DM：检查是否已复制，弹出表单
      if (!this.copyId || !this.copiedRecord) {
        this.$message.warning('请先点击"复制DM"按钮选择要复制的DM')
        return
      }

      if (!this.currentTreeNode) {
        this.$message.warning('请选择要复制到哪个构型节点下')
        return
      }

      // 打开复制新建DM表单弹窗
      this.$refs.copyModal.show(
        this.copiedRecord,
        1,
        {
          id: this.currentTreeNode.nodeId,  // 使用nodeId，不是id
          nodeName: this.currentTreeNode.nodeName
        }
      )
    },
    /**
     * @deprecated 无 UI 入口，已被 handleEdit 替代
     */
    handleDmContent(record) {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }

      let data = null
      if (record && record.id && typeof record.id === 'string') {
        data = record
      } else if (this.selectedRows.length > 0 && this.selectedRows[0].id) {
        data = this.selectedRows[0]
      } else if (this.selectedRowKeys.length > 0) {
        data = this.dataSource.find(item => item.id === this.selectedRowKeys[0])
      }

      if (!data) {
        this.$message.error('无法获取DM信息，请重新选择')
        return
      }

      this.$refs.editorModal.show(data)
    },

    // 浏览或编辑DM内容（工具栏按钮）
    handleEditDmContent() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }

      // 获取选中的DM数据
      let data = null
      if (this.selectedRows.length > 0 && this.selectedRows[0].id) {
        data = this.selectedRows[0]
      } else if (this.selectedRowKeys.length > 0) {
        data = this.dataSource.find(item => item.id === this.selectedRowKeys[0])
      }

      if (!data || !data.id) {
        this.$message.error('无法获取DM信息，请重新选择')
        return
      }

      // 判断模式：如果是当前用户签出，则为编辑模式；否则为浏览模式
      const isMyCheckOut = data.checkoutUser && data.checkoutUser === this.currentUser
      const mode = isMyCheckOut ? 'edit' : 'browse'

      // 在系统Tab页签中打开编辑器（西区=导航树，中区=编辑器，东区=属性和元素区）
      this.$router.push({
        path: `/ietm/dm-content-editor/${data.id}`,
        query: {
          mode: mode,
          dmc: data.dmc || ''
        }
      })
    },

    handlePreview(record) {
      // 工具栏调用时 record 是 MouseEvent，不是真实数据对象，需忽略
      if (!record || typeof record.id === 'undefined') {
        record = null
      }

      if (!record && this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }

      // 从 record 或 selectedRows 获取完整的数据对象
      let data = record
      if (!data && this.selectedRows.length > 0) {
        data = this.selectedRows[0]
      } else if (!data && this.selectedRowKeys.length > 0) {
        // selectedRows 为空时从 dataSource 中查找
        data = this.dataSource.find(item => item.id === this.selectedRowKeys[0])
      }

      if (!data || !data.id) {
        this.$message.error('无法获取记录信息')
        return
      }

      // 调用后端预览接口，获取HTML后打开预览弹窗
      const hideLoading = this.$message.loading('正在生成预览...', 0)
      getAction(`/ietm/datamodule/preview/${data.id}`)
        .then(res => {
          hideLoading()

          if (!res.success) {
            this.$message.error('预览请求失败')
            return
          }

          const result = res.result
          if (!result) {
            this.$message.error('预览返回数据为空')
            return
          }

          // XSL 文件缺失
          if (result.flag === 'noxsl') {
            this.$message.warning('无解析引擎，无法预览')
            return
          }

          // 内容为空（后端判断）
          if (result.flag === 'null' || !result.html) {
            this.$message.info('DM内容为空，无法预览')
            return
          }

          // 其他失败情况
          if (result.flag !== 'success') {
            this.$message.warning('预览生成失败：' + (result.message || '未知错误'))
            return
          }

          // 成功：显示预览弹窗
          this.$refs.previewModal.show(result.html)
        })
        .catch(err => {
          hideLoading()
          this.$message.error('预览失败：' + (err.message || '网络错误'))
        })
    },
    handleValidate(record) {
      // 工具栏调用时 record 是 MouseEvent，不是真实数据对象，需忽略
      if (!record || typeof record.id === 'undefined') {
        record = null
      }

      if (!record && this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }

      // 从 record 或 selectedRows 获取完整的数据对象
      let data = record
      if (!data && this.selectedRows.length > 0) {
        data = this.selectedRows[0]
      } else if (!data && this.selectedRowKeys.length > 0) {
        // selectedRows 为空时从 dataSource 中查找
        data = this.dataSource.find(item => item.id === this.selectedRowKeys[0])
      }

      if (!data || !data.id) {
        this.$message.error('无法获取记录信息')
        return
      }

      this.$refs.validationModal.show(data.id)
    },
    // 批量启动流程（符合需求文档第8.1节）
    handleStartWorkflow() {
      // 1. 检查是否有勾选记录
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请勾选数据来启动流程')
        return
      }

      // 2. 获取所有勾选的记录
      const selectedRecords = this.dataSource.filter(item =>
        this.selectedRowKeys.includes(item.id)
      )

      // 3. 检查每条记录是否允许启动流程
      for (let i = 0; i < selectedRecords.length; i++) {
        const record = selectedRecords[i]

        // 调试输出：查看实际的状态值
        console.log(`记录${i + 1} - DMC: ${record.dmcCode || record.dmc}`)
        console.log(`  status值:`, record.status, `(类型: ${typeof record.status})`, `- 含义：0=已删除，1=正常`)
        console.log(`  workflowStatus值:`, record.workflowStatus, `(类型: ${typeof record.workflowStatus})`, `- 含义：null=未启动，0=已结束，1=流转中，2=已撤销`)

        // status状态检查：0=已删除，1=正常
        if (record.status == '0' || record.status === 0) {
          this.$message.warning(`第${i + 1}条数据【${record.dmcCode || record.dmc}】已删除，无法启动流程`)
          return
        }

        // workflowStatus流程状态检查：
        // null或空=未启动流程：可以启动
        // 0=流程已结束：可以重新启动
        // 1=流转中：不允许启动新流程
        // 2=已撤销：需要先处理
        if (record.workflowStatus == '1' || record.workflowStatus === 1) {
          this.$message.warning(`第${i + 1}条数据【${record.dmcCode || record.dmc}】处于审批中，无法启动新流程`)
          return
        }

        if (record.workflowStatus == '2' || record.workflowStatus === 2) {
          this.$message.warning(`第${i + 1}条数据【${record.dmcCode || record.dmc}】流程已撤销，请先处理后再启动`)
          return
        }

        // workflowStatus = null/空/0 都允许启动流程
      }

      // 4. 打开批量启动流程弹窗
      // 传递完整的记录信息，用于生成insttitleparam
      this.$refs.batchStartFlowModal.show(selectedRecords)
    },
    handleRestartWorkflow(record) {
      if (!record && this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一条记录')
        return
      }
      const id = record ? record.id : this.selectedRowKeys[0]
      this.$confirm({
        title: '确认重启',
        content: '确定要重启工作流吗？',
        onOk: () => {
          postAction('/ietm/datamodule/restartWorkflow', { id, processKey: 'dm_review' }).then(res => {
            if (res.success) {
              this.$message.success('工作流重启成功')
              this.loadData()
            }
          })
        }
      })
    },
    // 判断是否为初始版本（issueNo=001 且inWork=00）→ 执行物理删除
    isInitialVersion(record) {
      return record.issueNo === '001' && record.inWork === '00'
    },
    // 获取删除确认标题（区分物理删除和逻辑删除）
    getDeleteConfirmTitle(record) {
      return this.isInitialVersion(record) ? '确定要删除该DM？（初始版本，将被彻底删除）' : '该DM已发布，确定要删除？（将被标记为已删除，数据保留'
    },
    // 判断记录是否可删除（用于操作列状态控制）
    canDeleteRecord(record) {
      const isCheckedOut = !!record.checkoutUser
      const hasActiveWorkflow = record.workflowStatus && record.workflowStatus !== 'ended'
      return !isCheckedOut && !hasActiveWorkflow
    },
    handleDelete(record) {
      // 如果传入了record，说明是从操作列点击的，已经有popconfirm确认
      if (record) {
        deleteAction(this.url.delete, { id: record.id }).then(res => {
          if (res.success) {
            // 直接从 dataSource 中移除，避免刷新整个列表
            const index = this.dataSource.findIndex(item => item.id === record.id)
            if (index !== -1) {
              this.dataSource.splice(index, 1)
              this.ipagination.total = Math.max(0, (this.ipagination.total || 0) - 1)
            }
            const deleteType = this.isInitialVersion(record) ? '物理删除' : '逻辑删除'
            this.$message.success(`删除成功（{deleteType}）`)
            this.onClearSelected()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        }).catch(err => {
          // const errorMsg = err.response?.data?.message || err.message || '操作失败，请重试'
          // this.$message.error(errorMsg)
        })
        return
      }

      // 从工具栏点击的，需要弹出确认框
      const that = this
      // 计算删除类型分布
      const physicalCount = that.selectedRows.filter(r => that.isInitialVersion(r)).length
      const logicalCount = that.selectedRows.length - physicalCount
      const countDesc = physicalCount > 0 && logicalCount > 0
        ? `其中 ${physicalCount} 条将被彻底删除，${logicalCount} 条将被标记删除`
        : physicalCount > 0
          ? `全部 ${physicalCount} 条将被彻底删除，不可恢复`
          : `全部 ${logicalCount} 条将被标记删除，数据保留`
      this.$confirm({
        title: '确认删除',
        content: `确定要删除选中的 ${that.selectedRows.length} 条记录吗？${countDesc}`,
        onOk() {
          const ids = that.selectedRowKeys.join(',')
          deleteAction(that.url.deleteBatch, { ids }).then(res => {
            if (res.success) {
              const result = res.result
              if (result && result.failCount > 0) {
                // 部分失败的情况
                that.$warning({
                  title: '批量删除完成',
                  content: `成功删除 {result.successCount} 条，失败删除 {result.failCount} 条。点击"查看详情"查看失败原因。`,
                  okText: '查看详情',
                  cancelText: '关闭',
                  onOk() {
                    // 显示失败详情
                    that.$error({
                      title: '删除失败的记录',
                      content: result.failMessages.join('\n'),
                      width: 600
                    })
                  }
                })
              } else {
                // 全部成功
                const count = result ? result.successCount : that.selectedRowKeys.length
                that.$message.success(`删除成功（共 ${count} 条）`)
              }
              that.loadData()
              that.onClearSelected()
            } else {
              that.$message.error(res.message || '删除失败')
            }
          }).catch(err => {
            // const errorMsg = err.response?.data?.message || err.message || '删除操作失败，请重试'
            // that.$message.error(errorMsg)
          })
        }
      })
    },
    handleCheckOut() {
      const id = this.selectedRowKeys[0]
      const record = this.selectedRows[0]

      // 前置校验：工作流已启动
      if (!record.workflowInstanceId) {
        this.$message.warning('该DM还未启动流程，不能签出')
        return
      }

      // 前置校验：当前节点为DM编写
      if (record.workflowStep !== 'DM编写') {
        this.$message.warning('当前流程节点不是"DM编写"，不能签出')
        return
      }

      const currentVer = `${record.issueNo || '001'}-${record.inWork || '00'}`
      const nextInWork = String(parseInt(record.inWork || '00') + 1).padStart(2, '0')
      const nextVer = `${record.issueNo || '001'}-${nextInWork}`

      // 签出前二次确认
      this.$confirm({
        title: '签出确认',
        content: h => h('div', [
          h('p', { style: 'margin-bottom: 12px' }, '确定要签出该数据模块吗？'),
          h('p', { style: 'margin-bottom: 4px' }, [
            h('span', { style: 'color: #8c8c8c' }, '当前版本：'),
            h('b', currentVer)
          ]),
          h('p', { style: 'margin-bottom: 12px' }, [
            h('span', { style: 'color: #8c8c8c' }, '签出后版本：'),
            h('b', { style: 'color: #1890ff' }, nextVer)
          ]),
          h('p', { style: 'color: #faad14; font-size: 12px; margin-bottom: 0' },
            '签出后原版本将自动保留为历史版本。')
        ]),
        onOk: () => {
          // 第一阶段：查询最新状态
          getAction(`${this.url.queryById}?id=${id}`)
            .then(queryRes => {
              if (!queryRes.success || !queryRes.result) {
                this.$message.error('获取最新状态失败')
                return
              }

              const latestRecord = queryRes.result

              // 校验最新状态：是否已被签出
              if (latestRecord.checkoutUser) {
                this.$message.error(`该DM已被 ${latestRecord.checkoutUser} 签出`)
                this.loadData() // 刷新列表显示最新状态
                return
              }

              // 校验最新状态：工作流已启动
              if (!latestRecord.workflowInstanceId) {
                this.$message.error('该DM还未启动流程')
                this.loadData()
                return
              }

              // 校验最新状态：当前节点为DM编写
              if (latestRecord.workflowStep !== 'DM编写') {
                this.$message.error('当前流程节点不是"DM编写"')
                this.loadData()
                return
              }

              // 第二阶段：执行签出
              postAction(`${this.url.checkOut}?id=${id}`)
                .then(res => {
                  if (res.success) {
                    this.$message.success('签出成功！新版本已生成，原版本已保留为历史版本')
                    this.onClearSelected() // 清空旧选中，避免 selectedRows 持有过期数据
                    this.loadData().then(() => {
                      // 数据加载完成后，重新选中该记录并更新按钮状态
                      const newRecord = this.dataSource.find(item => item.id === id)
                      if (newRecord) {
                        this.selectedRowKeys = [newRecord.id]
                        this.selectedRows = [newRecord]
                        this.updateButtonStates()
                      }
                    })
                  } else {
                    this.$message.error(res.message || '签出失败')
                  }
                })
                .catch(() => this.$message.error('签出失败，请稍后重试'))
            })
            .catch(() => this.$message.error('获取最新状态失败，请稍后重试'))
        }
      })
    },
    handleCancelCheckOut() {
      const id = this.selectedRowKeys[0]

      // 取消签出前二次确认
      this.$confirm({
        title: '取消签出确认',
        content: '确定要取消签出吗？\n\n当前工作版本将被删除，并恢复到签出前的原版本。\n此操作不可撤销！',
        okType: 'danger',
        onOk: () => {
          postAction(`${this.url.cancelCheckOut}?id=${id}`)
            .then(res => {
              if (res.success) {
                this.$message.success('取消签出成功！已恢复到原版本')
                this.onClearSelected() // 清空旧选中
                this.loadData()
              } else {
                this.$message.error(res.message || '取消签出失败')
              }
            })
            .catch(() => this.$message.error('取消签出失败，请稍后重试'))
        }
      })
    },
    handleCheckIn() {
      const id = this.selectedRowKeys[0]

      this.$confirm({
        title: '签入',
        content: '确定要签入当前数据模块吗',
        onOk: () => {
          // 第一阶段：查询最新状态
          getAction(`${this.url.queryById}?id=${id}`)
            .then(queryRes => {
              if (!queryRes.success || !queryRes.result) {
                this.$message.error('获取最新状态失败')
                return
              }

              const latestRecord = queryRes.result

              // 校验最新状态：是否已签出
              if (!latestRecord.checkoutUser) {
                this.$message.error('该DM未被签出')
                this.loadData() // 刷新列表显示最新状态
                return
              }

              // 校验最新状态：是否本人签出
              if (latestRecord.checkoutUser !== this.currentUser) {
                this.$message.error(`该DM已被 ${latestRecord.checkoutUser} 签出，只能签入自己签出的数据模块`)
                this.loadData()
                return
              }

              // 第二阶段：执行签入
              postAction(`${this.url.checkIn}?id=${id}`)
                .then(res => {
                  if (res.success) {
                    this.$message.success('签入成功')
                    this.onClearSelected() // 清空旧选中
                    this.loadData()
                  } else {
                    this.$message.error(res.message || '签入失败')
                  }
                })
                .catch(() => {
                  this.$message.error('签入失败，请稍后重试')
                })
            })
            .catch(() => this.$message.error('获取最新状态失败，请稍后重试'))
        }
      })
    },
    handlePublish() {
      const that = this
      this.$confirm({
        title: '确认发布',
        content: '发布后将升级版本号并重置inwork，确定要发布吗？',
        onOk() {
          postAction(that.url.publish, { id: that.selectedRowKeys[0] })
            .then(res => {
              if (res.success) {
                that.$message.success('发布成功')
                that.onClearSelected() // 清空旧选中
                that.loadData()
              } else {
                that.$message.error(res.message || '发布失败')
              }
            })
            .catch(() => that.$message.error('发布失败，请稍后重试'))
        }
      })
    },
    onClearSelected() {
      this.selectedRowKeys = []
      this.selectedRows = []
      this.currentSelectedDm = null
      this.clearResourceList()
      this.updateButtonStates()
    },
    searchQuery() {
      if (!this.queryParam.searchText) {
        this.loadData(1)
        return
      }
      this.loading = true
      postAction('/ietm/datamodule/searchDm', {
        keyword: this.queryParam.searchText,
        projectId: this.queryParam.projectId,  // 补全：限制在当前项目内搜索
        cmNodeId: this.queryParam.cmNodeId      // 补全：可选节点过滤
      }).then(res => {
        if (res.success) {
          this.dataSource = res.result
          this.ipagination.total = res.result.length
          this.$message.success(`搜索到{res.result.length}条记录`)
        }
      }).finally(() => {
        this.loading = false
      })
    },
    // 更新按钮状态
    updateButtonStates() {
      if (!this.currentRecord) {
        // 未选中或多选
        this.buttonStates = {
          canCheckOut: false,
          canCheckIn: false,
          canCancelCheckOut: false,
          canEdit: false,
          canDelete: false,
          canPublish: false,
          canEditContent: false,
          canValidate: false,
          canEditProp: false
        }
        return
      }

      const record = this.currentRecord
      const isCheckedOut = !!record.checkoutUser
      const isMyCheckOut = record.checkoutUser === this.currentUser
      const isPublished = record.versionType === '1' // 已发布
      const isInWorkflow = record.workflowStatus && record.workflowStatus !== 'ended'
      const hasWorkflowStarted = !!record.workflowInstanceId // 工作流已启动
      const isDmWriteStep = record.workflowStep === 'DM编写' // 当前节点为DM编写

      this.buttonStates = {
        // 签出：未签出 且未发布 且未被他人签出
        // 注意：工作流相关校验在handleCheckOut方法中进行，避免按钮状态过于严格
        canCheckOut: !isCheckedOut && !isPublished,

        // 签入：本人已签出
        canCheckIn: isCheckedOut && isMyCheckOut,

        // 取消签出：本人已签出
        canCancelCheckOut: isCheckedOut && isMyCheckOut,

        // 编辑：未签出 且未发布
        canEdit: !isCheckedOut && !isPublished,


        // 发布：未签出 且未发布、工作流已结束
        canPublish: !isCheckedOut && !isPublished && !isInWorkflow,

        // DM内容：本人已签出
        canEditContent: isCheckedOut && isMyCheckOut,

        // 校验：任何状态都可以
        canValidate: true,

        // 编辑属性：工作流已启动或有流程节点 + 节点为DM编写 + 未被他人签出
        canEditProp: (hasWorkflowStarted || isDmWriteStep) && isDmWriteStep && (!record.checkoutUser || record.checkoutUser === this.currentUser)
      }
    },
    // 树节点选择
    // 管理资源
    handleManageResources() {
      if (this.selectedRowKeys.length !== 1) {
        this.$message.warning('请选择一条记录')
        return
      }

      const record = this.selectedRows[0]
      this.$refs.resourceModal.show(record.id, record.techName || record.dmc)
    },
    // 查看DMC详情
    handleViewDmcDetail(record) {
      this.$refs.editPropModal.show(record, true) // 第二个参数 true 表示查看模式
    },
    // 编辑DM属性（技术名称、信息名称）
    handleEditProp() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择一个DM')
        return
      }
      const record = this.selectedRows[0]

      // 前置校验1：工作流相关（放宽条件：有 workflowStep 即可，不强制要求 workflowInstanceId）
      // 原因：某些历史数据或测试场景下，workflowInstanceId 可能为空，但 workflowStep 有值
      if (!record.workflowInstanceId && !record.workflowStep) {
        this.$message.warning('还没有启动流程，不能编辑DM属性。')
        return
      }
      // 前置校验2：当前节点为 DM编写
      if (record.workflowStep !== 'DM编写') {
        this.$message.warning(`流程状态不是DM编写状态（当前：${record.workflowStep || '无'}），不能编辑DM属性。`)
        return
      }
      // 前置校验3：未被其他用户签出
      if (record.checkoutUser && record.checkoutUser !== this.currentUser) {
        this.$message.warning(`该DM已由【${record.checkoutUser}】签出，不能编辑DM属性。`)
        return
      }
      this.$refs.editPropModal.show(record, false) // 第二个参数 false 表示编辑模式
    },
    // 编辑属性modal确认后回调（重新选中记录并更新按钮状态）
    handleEditPropModalOk() {
      const id = this.selectedRowKeys.length > 0 ? this.selectedRowKeys[0] : null
      if (!id) {
        this.loadData()
        return
      }

      this.loadData().then(() => {
        // 数据加载完成后，重新选中该记录并更新按钮状态
        const updatedRecord = this.dataSource.find(item => item.id === id)
        if (updatedRecord) {
          this.selectedRowKeys = [updatedRecord.id]
          this.selectedRows = [updatedRecord]
          this.currentSelectedDm = updatedRecord
          this.updateButtonStates()
          // 如果之前加载了资源列表，也需要刷新
          if (this.resourceDataSource.length > 0) {
            this.loadResourceList(updatedRecord.id)
          }
        }
      })
    },
    // DM内容编辑器modal确认后回调（重新选中记录并更新按钮状态）
    handleEditorModalOk() {
      const id = this.selectedRowKeys.length > 0 ? this.selectedRowKeys[0] : null
      if (!id) {
        this.loadData()
        return
      }

      this.loadData().then(() => {
        // 数据加载完成后，重新选中该记录并更新按钮状态
        const updatedRecord = this.dataSource.find(item => item.id === id)
        if (updatedRecord) {
          this.selectedRowKeys = [updatedRecord.id]
          this.selectedRows = [updatedRecord]
          this.currentSelectedDm = updatedRecord
          this.updateButtonStates()
          // 如果之前加载了资源列表，也需要刷新
          if (this.resourceDataSource.length > 0) {
            this.loadResourceList(updatedRecord.id)
          }
        }
      })
    },

    /**
     * @deprecated 导入功能无 UI 入口，importModal 组件未定义
     */
    handleImport() {
      this.$refs.importModal.show()
    },
    /**
     * @deprecated 导出功能无 UI 入口，且 URL 硬编码前缀，建议使用后端统一导出接口
     */
    handleExport() {
      const selectedIds = this.selectedRowKeys
      if (!selectedIds || selectedIds.length === 0) {
        this.$message.warning('请先选择要导出的数据模块')
        return
      }

      const that = this
      this.$confirm({
        title: '确认导出',
        content: `确定要导出选中的 ${selectedIds.length} 个数据模块吗？`,
        onOk() {
          // 调用后端导出接口
          const url = `/jeecg-boot/ietm/datamodule/exportXml?ids=${selectedIds.join(',')}`
          window.open(url, '_blank')
          that.$message.success('导出任务已提交，请稍后')
        }
      })
    },
    // 树节点选择事件
    onTreeSelect(node) {

      // 验证节点数据
      if (!node || !node.projectId || !node.nodeId) {
        console.warn('树节点数据不完整:', node)
        this.$message.warning('节点数据不完整，请重新选择')
        return
      }

      this.currentTreeNode = node

      // 清空之前的查询参数（保持响应式）
      Object.keys(this.queryParam).forEach(key => {
        delete this.queryParam[key]
      })

      // 设置必需的查询参数
      this.$set(this.queryParam, 'projectId', node.projectId)
      this.$set(this.queryParam, 'cmNodeId', node.nodeId)

      // 设置可选的查询参数（showChildren不依赖nodePath，后端用CONNECT BY层级查询）
      if (node.showChildren) {
        this.$set(this.queryParam, 'showChildren', true)
      }


      // 清空DM选择和资源列表（onClearSelected 内部已调用 clearResourceList）
      this.onClearSelected()

      // 重新加载数据
      this.loadData(1)
    },
    // 粘贴节点DM成功后刷新列表
    handlePasteSuccess() {
      console.log('粘贴节点DM成功，刷新列表')
      // 刷新当前列表
      this.loadData(1)
    },
    // DM列表行选择变化
    onSelectChange(selectedRowKeys, selectedRows) {
      this.selectedRowKeys = selectedRowKeys
      this.selectedRows = selectedRows

      // 单选时加载资源列表
      if (selectedRows.length === 1) {
        this.currentSelectedDm = selectedRows[0]
        this.loadResourceList(selectedRows[0].id)
      } else {
        this.currentSelectedDm = null
        this.clearResourceList()
      }

      // 更新按钮状态
      this.updateButtonStates()
    },
    // 加载DM资源列表
    loadResourceList(dmId) {
      if (!dmId) {
        this.clearResourceList()
        return
      }

      this.resourceLoading = true

      getAction('/ietm/datamodule/queryDmResources', { dmId: dmId })
        .then(res => {
          if (res.success) {
            this.resourceDataSource = res.result || []
          } else {
            this.$message.error(res.message || '加载资源列表失败')
            this.clearResourceList()
          }
        })
        .catch(err => {
          console.error('加载资源列表异常:', err)
          this.$message.error('加载资源列表异常')
          this.clearResourceList()
        })
        .finally(() => {
          this.resourceLoading = false
        })
    },
    // 清空资源列表
    clearResourceList() {
      this.resourceDataSource = []
      this.selectedResourceKeys = []
      this.currentSelectedResource = null
    },
    // 资源列表行选择
    onResourceSelectChange(selectedRowKeys, selectedRows) {
      this.selectedResourceKeys = selectedRowKeys
      this.currentSelectedResource = selectedRows.length > 0 ? selectedRows[0] : null
    },
    // 添加资源
    handleAddResource() {
      if (!this.currentSelectedDm) {
        this.$message.warning('请先选择一条数据模块记录')
        return
      }
      this.$refs.resourceModal.add(this.currentSelectedDm.id, this.currentSelectedDm.dmcCode)
    },
    // 资源模态框确认回调
    handleResourceModalOk() {
      // 刷新当前选中DM的资源列表
      if (this.currentSelectedDm) {
        this.loadResourceList(this.currentSelectedDm.id)
      }
    },
    // 编辑资源说明
    handleEditResource(record) {
      const resource = record || this.currentSelectedResource
      if (!resource) {
        this.$message.warning('请选择一条资源记录')
        return
      }
      this.$refs.resourceModal.edit(resource)
    },
    // 删除资源（保留文件）
    handleDeleteResource(record) {
      const resource = record || this.currentSelectedResource
      if (!resource) {
        this.$message.warning('请选择一条资源记录')
        return
      }

      const that = this
      this.$confirm({
        title: '确认删除',
        content: `确定要删除资源${resource.resourceName}"吗？（文件将保留）`,
        onOk() {
          deleteAction('/ietm/datamodule/deleteDmResource', { id: resource.id }).then(res => {
            if (res.success) {
              that.$message.success('删除成功')
              that.loadResourceList(that.currentSelectedDm.id)
            } else {
              that.$message.error(res.message || '删除失败')
            }
          }).catch(err => {
            console.error('删除资源异常:', err)
            that.$message.error('删除资源异常')
          })
        }
      })
    },
    // 下载资源文件
    handleDownloadResource(record) {

      if (!record || !record.filePath) {
        this.$message.warning('文件信息不完整，无法下载')
        return
      }

      // 构造下载URL - 需要对路径进行 URL 编码
      // 注意：不要添加/jeecg-boot 前缀，因为axios 的baseURL 已经包含了
      const pathParts = record.filePath.split('/')
      const encodedPath = pathParts.map(part => encodeURIComponent(part)).join('/')
      const url = `/sys/common/static/${encodedPath}`
      const fileName = record.fileName || 'download'


      // 显示下载提示
      const hide = this.$message.loading('正在下载文件...', 0)

      // 使用 axios 的blob 方式下载文件
      this.$http({
        url: url,
        method: 'GET',
        responseType: 'blob'  // 关键：以二进制方式接收数据
      }).then(response => {
        hide()

        // 判断 response 是标准axios 响应还是已经被拦截器处理过的 Blob
        let blob
        if (response instanceof Blob) {
          // 响应已经是Blob 对象（被拦截器处理过）// console.log('响应已是Blob对象，直接使用)
          blob = response
        } else if (response.data instanceof Blob) {
          // 标准 axios 响应，data 是Blob
          blob = response.data
        } else if (response.data) {
          // data 存在但不是Blob，尝试创建Blob
          blob = new Blob([response.data])
        } else {
          // 完全没有数据
          console.error('响应数据无效！response:', response)
          this.$message.error('下载失败：响应数据为空')
          return
        }


        // 创建临时 URL
        const downloadUrl = window.URL.createObjectURL(blob)

        // 创建隐藏的a 标签并触发下载
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()

        // 清理
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)

        this.$message.success('下载成功')
      }).catch(err => {
        hide()
        console.error('========== 下载失败详情 ==========')
        console.error('错误对象:', err)
        console.error('错误响应:', err.response)
        if (err.response) {
          console.error('响应状态:', err.response.status)
          console.error('响应数据:', err.response.data)
          console.error('响应头:', err.response.headers)

          // 如果响应是Blob 类型且content-type 是JSON，读取错误信息
          if (err.response.data instanceof Blob && err.response.headers['content-type'] === 'application/json') {
            const reader = new FileReader()
            reader.onload = () => {
              try {
                const errorData = JSON.parse(reader.result)
                console.error('错误详情JSON:', errorData)
                this.$message.error('下载失败：' + (errorData.message || '文件不存在'))
              } catch (e) {
                console.error('解析错误信息失败:', e)
              }
            }
            reader.readAsText(err.response.data)
          }
        }
        console.error('===================================')

        if (err.response && err.response.status === 404) {
          this.$message.error('文件不存在或已被删除')
        } else {
          this.$message.error('下载失败：' + (err.message || '网络异常'))
        }
      })
    },
    // 格式化文件大小
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '-'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
    }
  }
}
</script>


<style lang="less" scoped>
.ietm-dm-container {
  padding: 0;

  // 工具栏样式
  .toolbar-wrapper {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e8e8e8;

    ::v-deep .ant-space {
      width: 100%;
    }

    // 按钮统一样式
    ::v-deep .ant-btn {
      padding: 0 15px;
      height: 32px;
      font-size: 14px;
      border-radius: 2px;

      // 禁用状态样式
      &[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

  // 内容区
  .content-row {
    margin-top: 0;
  }

  // 卡片标题统一样式
  .card-title {
    font-size: 14px;
    font-weight: 500;
    color: #262626;

    .anticon {
      color: #1890ff;
    }
  }

  // 编码规则提示
  .code-rule-tip {
    font-size: 12px;
    color: #8c8c8c;
    background: #f5f5f5;
    padding: 2px 8px;
    border-radius: 2px;
  }

  // 构型树卡片
  .tree-card {
    height: calc(100vh - 230px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    ::v-deep .ant-card-head {
      border-bottom: 1px solid #e8e8e8;
      background: #fafafa;
      padding: 0 16px;
      min-height: 42px;
    }

    ::v-deep .ant-card-body {
      flex: 1;
      overflow: hidden;
      padding: 12px;
      display: flex;
      flex-direction: column;
    }
  }

  // 列表卡片
  .list-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    ::v-deep .ant-card-head {
      border-bottom: 1px solid #e8e8e8;
      background: #fafafa;
      padding: 0 16px;
      min-height: 42px;
    }

    ::v-deep .ant-card-body {
      padding: 12px;
    }

    // 表格选中行高亮
    ::v-deep .ant-table-tbody > tr.ant-table-row-selected > td {
      background-color: #e6f7ff !important;
    }

    // 表格行悬浮效果
    ::v-deep .ant-table-tbody > tr:hover > td {
      background-color: #fafafa;
    }

    // 复选框列固定样式优化
    ::v-deep .ant-table-selection-column {
      text-align: center;
      padding-left: 8px !important;
      padding-right: 8px !important;
    }

    // 复选框样式优化
    ::v-deep .ant-checkbox-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  // 资源列表卡片
  .resource-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    ::v-deep .ant-card-head {
      border-bottom: 1px solid #e8e8e8;
      background: #fafafa;
      padding: 0 16px;
      min-height: 42px;
    }

    ::v-deep .ant-card-body {
      padding: 12px;
    }
  }

  // 空状态提示
  .empty-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
  }

  .empty-hint-small {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 150px;
    text-align: center;
  }

  // 表格滚动优化
  ::v-deep .ant-table-wrapper {
    .ant-table {
      font-size: 13px;
    }

    .ant-table-thead > tr > th {
      background: #fafafa;
      font-weight: 600;
      padding: 12px 8px;
    }

    .ant-table-tbody > tr > td {
      padding: 8px;
    }

    .ant-table-tbody > tr:hover > td {
      background: #e6f7ff !important;
    }

    .ant-table-row-selected > td {
      background: #bae7ff !important;
    }
  }

  // 表头居中对齐
  ::v-deep .ant-table-thead > tr > th {
    text-align: center !important;
    font-weight: 600;
    background: #fafafa;
  }

  // 表格横向滚动条样式
  ::v-deep .ant-table-body {
    &::-webkit-scrollbar {
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    &::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;

      &:hover {
        background: #555;
      }
    }
  }
  }
}
</style>
