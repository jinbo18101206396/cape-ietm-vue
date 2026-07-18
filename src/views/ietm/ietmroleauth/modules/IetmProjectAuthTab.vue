<template>
  <div>
    <a-row :gutter="16">
      <!-- 左侧：项目列表 -->
      <a-col :span="10">
        <a-card title="手册项目列表">
          <a-alert message="选择手册项目在右侧查看和赋予权限" type="info" show-icon class="panel-alert" />
          <a-table
            ref="projectTable"
            size="middle"
            bordered
            rowKey="id"
            :columns="projectColumns"
            :dataSource="projectList"
            :pagination="projectPagination"
            :loading="projectLoading"
            :customRow="customProjectRow"
            :rowClassName="getProjectRowClass">
            <template slot="radio" slot-scope="text, record">
              <a-radio :checked="selectedProjectId === record.id" @click="handleProjectSelect(record)" />
            </template>
          </a-table>
        </a-card>
      </a-col>

      <!-- 右侧：授权列表 -->
      <a-col :span="14">
        <a-card title="角色授权配置">
          <!-- 操作按钮 -->
          <div class="table-operator">
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
  name: 'IetmProjectAuthTab',
  data() {
    return {
      projectColumns: [
        { title: '', dataIndex: 'radio', width: 50, align: 'center', scopedSlots: { customRender: 'radio' } },
        { title: '项目名称', dataIndex: 'name', width: 200, ellipsis: true, align: 'center' },
        { title: '装备编码', dataIndex: 'equipmentCode', width: 120, align: 'center' },
        { title: 'IETM标准', dataIndex: 'ietmStandard', width: 100, align: 'center' }
      ],
      authColumns: [
        { title: '角色', dataIndex: 'roleId', align: 'center', customHeaderCell: () => ({ style: { textAlign: 'center' } }), scopedSlots: { customRender: 'roleId' } },
        { title: '浏览权限', dataIndex: 'canRead', align: 'center', customHeaderCell: () => ({ style: { textAlign: 'center' } }), scopedSlots: { customRender: 'canRead' } },
        { title: '编辑权限', dataIndex: 'canEdit', align: 'center', customHeaderCell: () => ({ style: { textAlign: 'center' } }), scopedSlots: { customRender: 'canEdit' } },
        { title: '备注', dataIndex: 'note', align: 'center', customHeaderCell: () => ({ style: { textAlign: 'center' } }), scopedSlots: { customRender: 'note' } }
      ],
      projectList: [],
      authList: [],
      projectLoading: false,
      authLoading: false,
      selectedProjectId: '',
      selectedRowKeys: [],
      roleList: [],
      projectPagination: {
        current: 1,
        pageSize: 10,
        showTotal: total => `共 ${total} 条`,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100']
      },
      url: {
        listProject: '/ietmproject/ietmProject/listData',
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
    // 下拉选项过滤
    filterOption(input, option) {
      return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
    },
    // 加载项目列表
    loadProjectList() {
      this.projectLoading = true
      getAction(this.url.listProject).then(res => {
        if (res.success) {
          this.projectList = res.result || []
        } else {
          this.$message.error(res.message || '加载项目列表失败')
        }
      }).catch(err => {
        this.$message.error('加载项目列表失败：' + err.message)
      }).finally(() => {
        this.projectLoading = false
      })
    },
    // 加载授权列表
    loadAuthList(projectId) {
      this.authLoading = true
      getAction(this.url.listAuth, { objType: '1', objId: projectId }).then(res => {
        if (res.success) {
          this.authList = (res.result || []).map(item => ({
            ...item,
            editable: false
          }))
          console.log('加载的授权列表:', this.authList)
          if (this.authList.length > 0) {
            console.log('第一条记录ID:', this.authList[0].id, '类型:', typeof this.authList[0].id)
          }
        } else {
          this.$message.error(res.message || '加载授权列表失败')
        }
      }).catch(err => {
        this.$message.error('加载授权列表失败：' + err.message)
      }).finally(() => {
        this.authLoading = false
      })
    },
    // 项目选择
    handleProjectSelect(record) {
      this.selectedProjectId = record.id
      this.loadAuthList(record.id)
      this.selectedRowKeys = []
    },
    // 项目行点击
    customProjectRow(record) {
      return {
        on: {
          click: () => {
            this.handleProjectSelect(record)
          }
        }
      }
    },
    // 项目行样式
    getProjectRowClass(record) {
      return record.id === this.selectedProjectId ? 'selected-row' : ''
    },
    // 选择变化
    onSelectChange(selectedRowKeys) {
      this.selectedRowKeys = selectedRowKeys
    },
    // 添加
    handleAdd() {
      if (!this.selectedProjectId) {
        this.$message.warning('请先选择一个手册项目！')
        return
      }
      this.authList.unshift({
        id: 'new_' + new Date().getTime(),
        roleId: '',
        objType: '1',
        objId: this.selectedProjectId,
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
        this.$message.warning('请先选择一个手册项目！')
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

      // 保存数据
      const saveData = this.authList.map(item => {
        const { editable, isNew, roleName, projectName, objName, ...data } = item
        return data
      })

      postAction(this.url.batchSave, saveData).then(res => {
        if (res.success) {
          this.$message.success('保存成功！')
          this.loadAuthList(this.selectedProjectId)
          this.selectedRowKeys = []
        } else {
          this.$message.error(res.message || '保存失败！')
        }
      }).catch(err => {
        this.$message.error('保存失败：' + err.message)
      })
    },
    // 删除
    handleDelete() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择要删除的记录！')
        return
      }

      console.log('=== 删除角色授权 ===')
      console.log('选中的记录ID:', this.selectedRowKeys)

      this.$confirm({
        title: '确认删除',
        content: '确定要删除选中的授权记录吗？',
        onOk: () => {
          // 不再过滤'new_'开头的ID，统一发送到后端删除
          const ids = this.selectedRowKeys.join(',')
          console.log('删除的ID:', ids)

          console.log('发送删除请求:', this.url.deleteBatch, { ids })
          deleteAction(this.url.deleteBatch, { ids }).then(res => {
            console.log('删除响应:', res)
            if (res.success) {
              this.$message.success('删除成功！')
              this.loadAuthList(this.selectedProjectId)
              this.selectedRowKeys = []
            } else {
              this.$message.error(res.message || '删除失败！')
            }
          }).catch(err => {
            console.error('删除失败:', err)
            this.$message.error('删除失败：' + err.message)
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.selected-row {
  background-color: #e6f7ff;
  cursor: pointer;
}

.panel-alert {
  margin-bottom: 16px;
}

.table-operator {
  margin-bottom: 16px;
}
</style>
