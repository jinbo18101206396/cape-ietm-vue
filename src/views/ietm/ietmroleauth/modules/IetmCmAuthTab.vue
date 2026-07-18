<template>
  <div>
    <a-row :gutter="16">
      <!-- 左侧：项目选择和构型树 -->
      <a-col :span="10">
        <a-card title="构型树" :bordered="false" class="cm-tree-card">
          <!-- 项目选择 -->
          <div style="margin-bottom: 16px">
            <a-form layout="inline">
              <a-form-item label="手册项目" style="margin-bottom: 0;">
                <a-select
                  v-model="selectedProjectId"
                  placeholder="请选择项目"
                  style="width: 280px"
                  @change="handleProjectChange"
                  show-search
                  :filter-option="filterOption">
                  <a-select-option v-for="item in projectList" :key="item.id" :value="item.id">
                    {{ item.name }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </div>

          <!-- 构型树 -->
          <div class="tree-wrapper">
            <a-tree
              v-if="treeData.length > 0"
              :tree-data="treeData"
              :replace-fields="replaceFields"
              @select="onTreeSelect"
              :selectedKeys="selectedKeys"
              :expanded-keys="expandedKeys"
              @expand="onTreeExpand"
            />
            <a-empty v-else description="请先选择项目" />
          </div>
        </a-card>
      </a-col>

      <!-- 右侧：授权列表 -->
      <a-col :span="14">
        <a-card title="角色授权配置" :bordered="false">
          <!-- 操作按钮 -->
          <div class="table-operator" style="margin-bottom: 16px">
            <a-button @click="handleAdd" type="primary" icon="plus">添加</a-button>
            <a-button @click="handleSave" type="primary" icon="save">保存</a-button>
            <a-button @click="handleDelete" type="danger" icon="delete" :disabled="selectedRowKeys.length === 0">删除</a-button>
          </div>

          <!-- 授权表格 -->
          <a-table
            ref="authTable"
            size="middle"
            bordered
            rowKey="id"
            :columns="authColumns"
            :dataSource="authList"
            :pagination="false"
            :loading="authLoading"
            :rowSelection="{selectedRowKeys: selectedRowKeys, onChange: onSelectChange}">

            <template slot="roleId" slot-scope="text, record">
              <a-select
                v-if="record.editable"
                v-model="record.roleId"
                placeholder="请选择角色"
                style="width: 100%"
                show-search
                :filter-option="filterOption">
                <a-select-option
                  v-for="role in filteredRoles"
                  :key="role.value"
                  :value="role.value">
                  {{ role.text }}
                </a-select-option>
              </a-select>
              <span v-else>{{ record.roleName }}</span>
            </template>

            <template slot="canRead" slot-scope="text, record">
              <a-select
                v-if="record.editable"
                v-model="record.canRead"
                placeholder="请选择"
                style="width: 100%">
                <a-select-option value="Y">是</a-select-option>
                <a-select-option value="N">否</a-select-option>
              </a-select>
              <span v-else>{{ text === 'Y' ? '是' : '否' }}</span>
            </template>

            <template slot="canEdit" slot-scope="text, record">
              <a-select
                v-if="record.editable"
                v-model="record.canEdit"
                placeholder="请选择"
                style="width: 100%">
                <a-select-option value="Y">是</a-select-option>
                <a-select-option value="N">否</a-select-option>
              </a-select>
              <span v-else>{{ text === 'Y' ? '是' : '否' }}</span>
            </template>

            <template slot="note" slot-scope="text, record">
              <a-input
                v-if="record.editable"
                v-model="record.note"
                placeholder="请输入备注"
              />
              <span v-else>{{ text }}</span>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { getAction, postAction, deleteAction } from '@/api/manage'

export default {
  name: 'IetmCmAuthTab',
  data() {
    return {
      authColumns: [
        { title: '角色', dataIndex: 'roleId', align: 'center', customHeaderCell: () => ({ style: { textAlign: 'center' } }), scopedSlots: { customRender: 'roleId' } },
        { title: '浏览权限', dataIndex: 'canRead', align: 'center', customHeaderCell: () => ({ style: { textAlign: 'center' } }), scopedSlots: { customRender: 'canRead' } },
        { title: '编辑权限', dataIndex: 'canEdit', align: 'center', customHeaderCell: () => ({ style: { textAlign: 'center' } }), scopedSlots: { customRender: 'canEdit' } },
        { title: '备注', dataIndex: 'note', align: 'center', customHeaderCell: () => ({ style: { textAlign: 'center' } }), scopedSlots: { customRender: 'note' } }
      ],
      projectList: [],
      treeData: [],
      authList: [],
      authLoading: false,
      selectedProjectId: undefined,
      selectedNodeId: '',
      selectedKeys: [],
      selectedRowKeys: [],
      expandedKeys: [],
      currentLeafNodes: [], // 当前选中非叶节点下的所有叶子节点
      roleList: [],
      replaceFields: {
        children: 'children',
        title: 'title',
        key: 'key'
      },
      url: {
        listProject: '/ietmproject/ietmProject/listData',
        getCmTree: '/projectconfigurationmanagement/ietmProjectConfigurationManagement/getTreeList',
        listAuth: '/ietmroleauth/ietmRoleauth/listWithNames',
        batchSave: '/ietmroleauth/ietmRoleauth/batchSave',
        deleteBatch: '/ietmroleauth/ietmRoleauth/deleteBatch',
        getRoles: '/sys/dict/getDictItems/sys_role,role_name,id'
      }
    }
  },
  computed: {
    filteredRoles() {
      // 过滤掉管理员角色
      return this.roleList.filter(role => {
        return role.text !== '管理员' && role.value !== 'admin'
      })
    }
  },
  created() {
    this.loadProjectList()
    this.loadRoles()
  },
  methods: {
    // 加载角色列表
    loadRoles() {
      getAction(this.url.getRoles).then(res => {
        if (res.success) {
          this.roleList = res.result || []
        }
      })
    },
    // 加载项目列表
    loadProjectList() {
      getAction(this.url.listProject).then(res => {
        if (res.success) {
          this.projectList = res.result || []
          // 默认选中第一项
          if (this.projectList.length > 0) {
            this.selectedProjectId = this.projectList[0].id
            this.handleProjectChange(this.selectedProjectId)
          }
        } else {
          this.$message.error(res.message || '加载项目列表失败')
        }
      }).catch(err => {
        this.$message.error('加载项目列表失败：' + err.message)
      })
    },
    // 项目切换
    handleProjectChange(projectId) {
      this.selectedKeys = []
      this.selectedNodeId = ''
      this.authList = []
      this.selectedRowKeys = []
      if (projectId) {
        this.loadCmTree(projectId)
      } else {
        this.treeData = []
      }
    },
    // 加载构型树
    loadCmTree(projectId) {
      getAction(this.url.getCmTree, { projectId: projectId }).then(res => {
        if (res.success) {
          this.treeData = this.markLeafNodes(res.result || [])
          // 获取前两级节点的key，用于默认展开
          this.expandedKeys = this.getFirstTwoLevelKeys(this.treeData)
        } else {
          this.$message.error(res.message || '加载构型树失败')
        }
      }).catch(err => {
        this.$message.error('加载构型树失败：' + err.message)
      })
    },
    // 标记叶节点
    markLeafNodes(treeData) {
      return treeData.map(node => {
        const newNode = { ...node }
        if (newNode.children && newNode.children.length > 0) {
          newNode.children = this.markLeafNodes(newNode.children)
          newNode.isLeaf = false
        } else {
          newNode.isLeaf = true
        }
        return newNode
      })
    },
    // 获取前两级节点的key
    getFirstTwoLevelKeys(treeData, level = 1) {
      let keys = []
      if (level <= 2) {
        treeData.forEach(node => {
          keys.push(node.key)
          if (node.children && node.children.length > 0 && level < 2) {
            keys = keys.concat(this.getFirstTwoLevelKeys(node.children, level + 1))
          }
        })
      }
      return keys
    },
    // 树节点展开/收起
    onTreeExpand(expandedKeys) {
      this.expandedKeys = expandedKeys
    },
    // 树节点选择
    onTreeSelect(selectedKeys, e) {
      if (selectedKeys.length > 0) {
        this.selectedKeys = selectedKeys
        const selectedNode = e.node.dataRef

        // 判断是否是叶节点
        const isLeaf = !selectedNode.children || selectedNode.children.length === 0

        if (isLeaf) {
          // 叶节点：清空批量授权状态，直接显示该节点的授权列表
          this.currentLeafNodes = []
          this.selectedNodeId = selectedKeys[0]
          this.loadAuthList(this.selectedNodeId)
        } else {
          // 非叶节点：递归获取所有叶子节点
          const leafNodes = this.collectLeafNodes(selectedNode)
          if (leafNodes.length > 0) {
            // 设置当前选中节点，用于后续保存
            this.selectedNodeId = selectedKeys[0]
            this.currentLeafNodes = leafNodes
            // 显示一个空列表，用户可以添加角色
            this.authList = []
          } else {
            this.$message.warning('该节点下没有叶子节点！')
          }
        }
      }
    },
    // 递归收集所有叶子节点
    collectLeafNodes(node) {
      let leafNodes = []
      if (!node.children || node.children.length === 0) {
        // 叶节点
        leafNodes.push(node)
      } else {
        // 递归子节点
        node.children.forEach(child => {
          leafNodes = leafNodes.concat(this.collectLeafNodes(child))
        })
      }
      return leafNodes
    },
    // 加载授权列表
    loadAuthList(nodeId) {
      this.authLoading = true
      getAction(this.url.listAuth, { objType: '2', objId: nodeId }).then(res => {
        if (res.success) {
          this.authList = (res.result || []).map(item => ({
            ...item,
            editable: false
          }))
        } else {
          this.$message.error(res.message || '加载授权列表失败')
        }
      }).catch(err => {
        this.$message.error('加载授权列表失败：' + err.message)
      }).finally(() => {
        this.authLoading = false
      })
    },
    // 选择变化
    onSelectChange(selectedRowKeys) {
      this.selectedRowKeys = selectedRowKeys
    },
    // 过滤项目选项
    filterOption(input, option) {
      return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
    },
    // 添加
    handleAdd() {
      if (!this.selectedProjectId) {
        this.$message.warning('请先选择项目！')
        return
      }
      if (!this.selectedNodeId) {
        this.$message.warning('请先选择构型节点！')
        return
      }
      this.authList.unshift({
        id: 'new_' + new Date().getTime(),
        roleId: '',
        objType: '2',
        objId: this.selectedNodeId,
        projectId: this.selectedProjectId,
        canRead: 'Y',
        canEdit: 'N',
        note: '',
        editable: true,
        isNew: true
      })
    },
    // 保存
    handleSave() {
      if (!this.selectedProjectId) {
        this.$message.warning('请先选择项目！')
        return
      }
      if (!this.selectedNodeId) {
        this.$message.warning('请先选择构型节点！')
        return
      }

      // 验证
      const editableList = this.authList.filter(item => item.editable || item.isNew)
      if (editableList.length === 0) {
        this.$message.warning('没有要保存的数据！')
        return
      }

      for (let item of editableList) {
        if (!item.roleId) {
          this.$message.error('请选择角色！')
          return
        }
      }

      // 检查重复
      const roleIds = this.authList.map(item => item.roleId)
      if (roleIds.length !== new Set(roleIds).size) {
        this.$message.error('角色不能重复！')
        return
      }

      // 判断是否为批量叶子节点授权
      if (this.currentLeafNodes && this.currentLeafNodes.length > 0) {
        // 批量为所有叶子节点授权
        this.batchSaveToLeafNodes()
      } else {
        // 单节点保存
        this.saveSingleNode()
      }
    },
    // 单节点保存
    saveSingleNode() {
      const saveData = this.authList.map(item => {
        const { editable, isNew, roleName, projectName, objName, ...data } = item
        return data
      })

      postAction(this.url.batchSave, saveData).then(res => {
        if (res.success) {
          this.$message.success('保存成功！')
          this.loadAuthList(this.selectedNodeId)
          this.selectedRowKeys = []
        } else {
          this.$message.error(res.message || '保存失败！')
        }
      }).catch(err => {
        this.$message.error('保存失败：' + err.message)
      })
    },
    // 批量保存到叶子节点
    batchSaveToLeafNodes() {
      this.$confirm({
        title: '批量授权确认',
        content: `将为该节点下的 ${this.currentLeafNodes.length} 个叶子节点批量授权，确定继续吗？`,
        onOk: () => {
          const loading = this.$message.loading('正在批量授权...', 0)

          // 为每个叶子节点创建授权记录
          const allSaveData = []
          this.currentLeafNodes.forEach(leafNode => {
            this.authList.forEach(authItem => {
              const { editable, isNew, roleName, projectName, objName, id, ...data } = authItem
              allSaveData.push({
                ...data,
                objId: leafNode.key,
                projectId: this.selectedProjectId,
                objType: '2'
              })
            })
          })

          postAction(this.url.batchSave, allSaveData).then(res => {
            loading()
            if (res.success) {
              this.$message.success(`批量授权成功！共为 ${this.currentLeafNodes.length} 个叶子节点授权`)
              // 清空当前叶子节点列表
              this.currentLeafNodes = []
              this.authList = []
              this.selectedRowKeys = []
            } else {
              this.$message.error(res.message || '批量授权失败！')
            }
          }).catch(err => {
            loading()
            this.$message.error('批量授权失败：' + err.message)
          })
        }
      })
    },
    // 删除
    handleDelete() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择要删除的记录！')
        return
      }

      this.$confirm({
        title: '确认删除',
        content: '确定要删除选中的授权记录吗？',
        onOk: () => {
          // 不再过滤'new_'开头的ID，统一发送到后端删除
          const ids = this.selectedRowKeys.join(',')

          deleteAction(this.url.deleteBatch, { ids }).then(res => {
            if (res.success) {
              this.$message.success('删除成功！')
              this.loadAuthList(this.selectedNodeId)
              this.selectedRowKeys = []
            } else {
              this.$message.error(res.message || '删除失败！')
            }
          }).catch(err => {
            this.$message.error('删除失败：' + err.message)
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.table-operator {
  margin-bottom: 16px;
}

.cm-tree-card {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.cm-tree-card /deep/ .ant-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* 隐藏滚动条但保留滚动功能 */
.tree-wrapper::-webkit-scrollbar {
  width: 6px;
}

.tree-wrapper::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 3px;
}

.tree-wrapper::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
