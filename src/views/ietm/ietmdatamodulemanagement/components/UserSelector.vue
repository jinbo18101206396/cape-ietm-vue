<template>
  <a-modal
    title="选择处理人"
    :width="900"
    :visible="visible"
    @ok="handleOk"
    @cancel="handleCancel"
    :bodyStyle="{ maxHeight: '55vh', overflowY: 'auto', padding: '16px' }"
  >
    <a-tabs v-model="activeTab" type="card">
      <!-- 用户选择 -->
      <a-tab-pane key="user" tab="选择用户">
        <a-input-search
          v-model="searchText.user"
          placeholder="搜索用户名"
          style="margin-bottom: 12px"
          @search="handleSearch('user')"
          enter-button
        />
        <a-table
          :columns="userColumns"
          :data-source="filteredUsers"
          :row-selection="{
            selectedRowKeys: selectedKeys.user,
            onChange: (keys, rows) => onSelectionChange('user', keys, rows)
          }"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 550 }"
          size="small"
          rowKey="id"
          :bordered="true"
          :customRow="(record) => ({
            on: {
              click: () => handleRowClick('user', record)
            }
          })"
        >
          <template slot="realname" slot-scope="text, record">
            <a-icon type="user" style="margin-right: 4px;" />
            {{ text }}
          </template>
        </a-table>
      </a-tab-pane>

      <!-- 部门选择 -->
      <a-tab-pane key="dept" tab="选择部门">
        <a-input-search
          v-model="searchText.dept"
          placeholder="搜索部门名称"
          style="margin-bottom: 12px"
          @search="handleSearch('dept')"
          enter-button
        />
        <a-table
          :columns="deptColumns"
          :data-source="filteredDepts"
          :row-selection="{
            selectedRowKeys: selectedKeys.dept,
            onChange: (keys, rows) => onSelectionChange('dept', keys, rows)
          }"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 550 }"
          size="small"
          rowKey="id"
          :bordered="true"
          :customRow="(record) => ({
            on: {
              click: () => handleRowClick('dept', record)
            }
          })"
        >
          <template slot="departName" slot-scope="text, record">
            <a-icon type="apartment" style="margin-right: 4px;" />
            {{ text }}
          </template>
        </a-table>
      </a-tab-pane>

      <!-- 角色选择 -->
      <a-tab-pane key="role" tab="选择角色">
        <a-input-search
          v-model="searchText.role"
          placeholder="搜索角色名称"
          style="margin-bottom: 12px"
          @search="handleSearch('role')"
          enter-button
        />
        <a-table
          :columns="roleColumns"
          :data-source="filteredRoles"
          :row-selection="{
            selectedRowKeys: selectedKeys.role,
            onChange: (keys, rows) => onSelectionChange('role', keys, rows)
          }"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 550 }"
          size="small"
          rowKey="id"
          :bordered="true"
          :customRow="(record) => ({
            on: {
              click: () => handleRowClick('role', record)
            }
          })"
        >
          <template slot="roleName" slot-scope="text, record">
            <a-icon type="team" style="margin-right: 4px;" />
            {{ text }}
          </template>
        </a-table>
      </a-tab-pane>

      <!-- 岗位选择 -->
      <a-tab-pane key="position" tab="选择岗位">
        <a-input-search
          v-model="searchText.position"
          placeholder="搜索岗位名称"
          style="margin-bottom: 12px"
          @search="handleSearch('position')"
          enter-button
        />
        <a-table
          :columns="positionColumns"
          :data-source="filteredPositions"
          :row-selection="{
            selectedRowKeys: selectedKeys.position,
            onChange: (keys, rows) => onSelectionChange('position', keys, rows)
          }"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 550 }"
          size="small"
          rowKey="id"
          :bordered="true"
          :customRow="(record) => ({
            on: {
              click: () => handleRowClick('position', record)
            }
          })"
        >
          <template slot="positionName" slot-scope="text, record">
            <a-icon type="idcard" style="margin-right: 4px;" />
            {{ text }}
          </template>
        </a-table>
      </a-tab-pane>

      <!-- 群组选择 -->
      <a-tab-pane key="group" tab="选择群组">
        <a-input-search
          v-model="searchText.group"
          placeholder="搜索群组名称"
          style="margin-bottom: 12px"
          @search="handleSearch('group')"
          enter-button
        />
        <a-table
          :columns="groupColumns"
          :data-source="filteredGroups"
          :row-selection="{
            selectedRowKeys: selectedKeys.group,
            onChange: (keys, rows) => onSelectionChange('group', keys, rows)
          }"
          :pagination="{ pageSize: 10 }"
          :scroll="{ x: 550 }"
          size="small"
          rowKey="id"
          :bordered="true"
          :customRow="(record) => ({
            on: {
              click: () => handleRowClick('group', record)
            }
          })"
        >
          <template slot="groupName" slot-scope="text, record">
            <a-icon type="cluster" style="margin-right: 4px;" />
            {{ text }}
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'UserSelector',
  data() {
    return {
      visible: false,
      activeTab: 'user',
      confirmLoading: false,

      // 数据源
      users: [],
      depts: [],
      roles: [],
      positions: [],
      groups: [],

      // 搜索文本
      searchText: {
        user: '',
        dept: '',
        role: '',
        position: '',
        group: ''
      },

      // 选中的keys
      selectedKeys: {
        user: [],
        dept: [],
        role: [],
        position: [],
        group: []
      },

      // 选中的记录
      selectedRecords: {
        user: [],
        dept: [],
        role: [],
        position: [],
        group: []
      },

      // 表格列定义
      userColumns: [
        { title: '用户名', dataIndex: 'username', width: 150, align: 'center' },
        { title: '姓名', dataIndex: 'realname', width: 150, align: 'center', scopedSlots: { customRender: 'realname' } },
        { title: '部门', dataIndex: 'orgCodeTxt', width: 200, align: 'center' }
      ],
      deptColumns: [
        { title: '部门编码', dataIndex: 'orgCode', width: 200, align: 'center' },
        { title: '部门名称', dataIndex: 'departName', width: 300, align: 'center', scopedSlots: { customRender: 'departName' } }
      ],
      roleColumns: [
        { title: '角色编码', dataIndex: 'roleCode', width: 200, align: 'center' },
        { title: '角色名称', dataIndex: 'roleName', width: 300, align: 'center', scopedSlots: { customRender: 'roleName' } }
      ],
      positionColumns: [
        { title: '岗位编码', dataIndex: 'code', width: 200, align: 'center' },
        { title: '岗位名称', dataIndex: 'name', width: 300, align: 'center', scopedSlots: { customRender: 'positionName' } }
      ],
      groupColumns: [
        { title: '群组编码', dataIndex: 'groupCode', width: 200, align: 'center' },
        { title: '群组名称', dataIndex: 'groupName', width: 300, align: 'center', scopedSlots: { customRender: 'groupName' } }
      ],

      // 回调函数
      onConfirm: null
    }
  },

  computed: {
    // 过滤后的数据
    filteredUsers() {
      const text = this.searchText.user.toLowerCase()
      return text
        ? this.users.filter(u => (u.realname || '').toLowerCase().includes(text) || (u.username || '').toLowerCase().includes(text))
        : this.users
    },
    filteredDepts() {
      const text = this.searchText.dept.toLowerCase()
      return text ? this.depts.filter(d => (d.departName || '').toLowerCase().includes(text)) : this.depts
    },
    filteredRoles() {
      const text = this.searchText.role.toLowerCase()
      return text ? this.roles.filter(r => (r.roleName || '').toLowerCase().includes(text)) : this.roles
    },
    filteredPositions() {
      const text = this.searchText.position.toLowerCase()
      return text ? this.positions.filter(p => (p.name || '').toLowerCase().includes(text)) : this.positions
    },
    filteredGroups() {
      const text = this.searchText.group.toLowerCase()
      return text ? this.groups.filter(g => (g.groupName || '').toLowerCase().includes(text)) : this.groups
    },

    // 已选择项汇总
    selectedItems() {
      const items = []
      this.selectedRecords.user.forEach(u => items.push({ type: 'user', id: u.id, name: u.realname, record: u }))
      this.selectedRecords.dept.forEach(d => items.push({ type: 'dept', id: d.id, name: d.departName, record: d }))
      this.selectedRecords.role.forEach(r => items.push({ type: 'role', id: r.id, name: r.roleName, record: r }))
      this.selectedRecords.position.forEach(p => items.push({ type: 'position', id: p.id, name: p.name, record: p }))
      this.selectedRecords.group.forEach(g => items.push({ type: 'group', id: g.id, name: g.groupName, record: g }))
      return items
    },

    // 总选中数量
    totalSelectedCount() {
      return this.selectedItems.length
    }
  },

  methods: {
    // 打开选择器
    show(onConfirm, preSelectedData) {
      this.visible = true
      this.onConfirm = onConfirm

      // 重置选择
      this.selectedKeys = { user: [], dept: [], role: [], position: [], group: [] }
      this.selectedRecords = { user: [], dept: [], role: [], position: [], group: [] }

      // 加载数据
      this.loadUsers()
      this.loadDepts()
      this.loadRoles()
      this.loadPositions()
      this.loadGroups()

      // 恢复预选数据
      if (preSelectedData) {
        this.restoreSelection(preSelectedData)
      }
    },

    // 加载用户列表
    loadUsers() {
      // 真实接口调用
      getAction('/sys/user/list', { pageNo: 1, pageSize: 1000 })
        .then(res => {
          if (res.success) {
            this.users = res.result.records || []
          }
        })
        .catch(err => {
          console.error('加载用户失败', err)
          this.$message.error('加载用户列表失败')
        })
    },

    // 加载部门列表
    loadDepts() {
      // 使用部门树形接口，并扁平化数据
      getAction('/sys/sysDepart/queryTreeList', {})
        .then(res => {
          if (res.success) {
            // 递归扁平化树形结构
            this.depts = this.flattenDeptTree(res.result || [])
          }
        })
        .catch(err => {
          console.error('加载部门失败', err)
          this.$message.error('加载部门列表失败')
        })
    },

    // 递归扁平化部门树
    flattenDeptTree(treeData) {
      const result = []
      const flatten = (nodes) => {
        nodes.forEach(node => {
          result.push({
            id: node.id || node.key,
            orgCode: node.orgCode || '',
            departName: node.title || node.departName || ''
          })
          if (node.children && node.children.length > 0) {
            flatten(node.children)
          }
        })
      }
      flatten(treeData)
      return result
    },

    // 加载角色列表
    loadRoles() {
      // 真实接口
      getAction('/sys/role/list', { pageNo: 1, pageSize: 1000 })
        .then(res => {
          if (res.success) {
            this.roles = res.result.records || []
          }
        })
        .catch(err => {
          console.error('加载角色失败', err)
          this.$message.error('加载角色列表失败')
        })
    },

    // 加载岗位列表
    loadPositions() {
      // 真实接口
      getAction('/sys/position/list', { pageNo: 1, pageSize: 1000 })
        .then(res => {
          if (res.success) {
            this.positions = res.result.records || []
          }
        })
        .catch(err => {
          console.error('加载岗位失败', err)
          this.$message.error('加载岗位列表失败')
        })
    },

    // 加载群组列表
    loadGroups() {
      // 群组功能暂不支持，设置为空数组
      // 如果后端有群组接口，可以在此调用
      this.groups = []
    },

    // 搜索
    handleSearch(type) {
      // 搜索逻辑在computed中实现
    },

    // 选择变化
    onSelectionChange(type, selectedRowKeys, selectedRows) {
      this.selectedKeys[type] = selectedRowKeys
      this.selectedRecords[type] = selectedRows
    },

    // 点击行选中/取消选中
    handleRowClick(type, record) {
      const recordId = record.id
      const index = this.selectedKeys[type].indexOf(recordId)

      if (index > -1) {
        // 已选中，取消选中
        this.selectedKeys[type].splice(index, 1)
        this.selectedRecords[type] = this.selectedRecords[type].filter(r => r.id !== recordId)
      } else {
        // 未选中，添加选中
        this.selectedKeys[type].push(recordId)
        this.selectedRecords[type].push(record)
      }
    },

    // 移除已选项
    handleRemove(item) {
      const type = item.type
      this.selectedKeys[type] = this.selectedKeys[type].filter(k => k !== item.id)
      this.selectedRecords[type] = this.selectedRecords[type].filter(r => r.id !== item.id)
    },

    // 确定
    handleOk() {
      const result = this.buildResult()
      if (this.onConfirm) {
        this.onConfirm(result)
      }
      this.handleCancel()
    },

    // 取消
    handleCancel() {
      this.visible = false
    },

    // 构建结果
    buildResult() {
      const userids = []
      const useridnames = []

      // 用户
      this.selectedRecords.user.forEach(u => {
        userids.push(u.id)
        useridnames.push(u.realname)
      })

      // 部门（前缀dpt_）
      this.selectedRecords.dept.forEach(d => {
        userids.push('dpt_' + d.id)
        useridnames.push('[' + d.departName + ']')
      })

      // 角色（前缀rol_）
      this.selectedRecords.role.forEach(r => {
        userids.push('rol_' + r.id)
        useridnames.push('{' + r.roleName + '}')
      })

      // 岗位（前缀pst_）
      this.selectedRecords.position.forEach(p => {
        userids.push('pst_' + p.id)
        useridnames.push('(' + p.name + ')')
      })

      // 群组（前缀grp_）
      this.selectedRecords.group.forEach(g => {
        userids.push('grp_' + g.id)
        useridnames.push('‹' + g.groupName + '›')
      })

      return {
        userid: userids.join(','),
        useridname: useridnames.join(',')
      }
    },

    // 恢复预选
    restoreSelection(data) {
      // TODO: 根据传入的userid/useridname解析并恢复选择状态
      // 需要解析前缀（dpt_/rol_/pst_/grp_）并匹配到对应的记录
    },

    // 获取标签颜色
    getTagColor(type) {
      const colorMap = {
        user: 'blue',
        dept: 'green',
        role: 'orange',
        position: 'purple',
        group: 'cyan'
      }
      return colorMap[type] || 'default'
    },

    // 获取标签前缀
    getTagPrefix(type) {
      const prefixMap = {
        user: '',
        dept: '[部门] ',
        role: '[角色] ',
        position: '[岗位] ',
        group: '[群组] '
      }
      return prefixMap[type] || ''
    }
  }
}
</script>

<style scoped>
.ant-tag {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 表格行鼠标悬停效果 */
::v-deep .ant-table-tbody > tr {
  cursor: pointer;
}

::v-deep .ant-table-tbody > tr:hover {
  background-color: #e6f7ff;
}
</style>
