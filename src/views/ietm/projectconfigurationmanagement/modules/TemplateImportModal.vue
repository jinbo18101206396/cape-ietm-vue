<template>
  <a-modal
    :width="900"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="取消"
    :bodyStyle="{ padding: '24px', height: '550px', overflow: 'auto' }">

    <!-- 自定义标题，包含提示语 -->
    <template slot="title">
      <span>{{ title }}</span>
      <span style="margin-left: 16px; color: #ff4d4f; font-size: 12px; font-weight: normal;">
        只能向空项目导入（只有根节点）
      </span>
    </template>

    <a-spin :spinning="confirmLoading">
      <!-- 当前项目标准和装备类型在同一行 -->
      <div style="margin-bottom: 16px; display: flex; align-items: center;">
        <!-- 左侧：当前项目标准 -->
        <div v-if="model.ietmStandard" style="flex-shrink: 0;">
          <span style="font-weight: 500; color: #666;">当前项目标准：</span>
          <span style="color: #1890ff; font-weight: 500;">{{ model.ietmStandard }}</span>
        </div>

        <!-- 右侧：装备类型 -->
        <div style="margin-left: 40px; display: flex; align-items: center;">
          <span style="font-weight: 500; margin-right: 8px;">装备类型：</span>
          <j-dict-select-tag
            v-model="model.equipmentType"
            placeholder="请选择装备类型"
            dictCode="equipment_type"
            @change="handleEquipmentTypeChange"
            style="width: 200px;" />
        </div>
      </div>

      <!-- 构型树展示 -->
      <div>
        <div style="border: 1px solid #d9d9d9; border-radius: 4px; overflow: hidden;">
          <a-table
            ref="table"
            size="middle"
            rowKey="id"
            class="j-table-force-nowrap"
            :columns="columns"
            :dataSource="templateData"
            :pagination="false"
            :loading="templateLoading"
            :scroll="{ x: true, y: 400 }"
            :expandedRowKeys="expandedRowKeys"
            @expand="handleExpand">
          </a-table>
        </div>
        <!-- 节点统计 -->
        <div v-if="templateData.length > 0" style="margin-top: 8px; color: #999; font-size: 12px;">
          该模板共 {{ getTotalNodeCount() }} 个节点
        </div>
      </div>

    </a-spin>
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import JDictSelectTag from '@/components/dict/JDictSelectTag.vue'

export default {
  name: 'TemplateImportModal',
  components: {
    JDictSelectTag
  },
  data() {
    return {
      title: '从模板导入',
      visible: false,
      confirmLoading: false,
      templateLoading: false,
      model: {
        projectId: '',
        ietmStandard: '',  // 项目的IETM标准
        equipmentType: undefined  // 装备类型
      },
      templateData: [],
      expandedRowKeys: [],
      columns: [
        {
          title: '编码',
          align: 'center',
          width: 150,
          dataIndex: 'code'
        },
        {
          title: '标题',
          align: 'center',
          width: 350,
          dataIndex: 'title'
        },
        {
          title: '序号',
          align: 'center',
          width: 50,
          dataIndex: 'seq'
        },
        {
          title: '路径',
          align: 'center',
          width: 200,
          dataIndex: 'way'
        }
      ],
      url: {
        importFromTemplate: '/projectconfigurationmanagement/ietmProjectConfigurationManagement/importFromTemplate'
      }
    }
  },
  methods: {
    /**
     * 打开模态框
     * @param {String} projectId - 项目ID
     * @param {String} ietmStandard - 项目的IETM标准
     */
    show(projectId, ietmStandard) {
      this.visible = true
      this.model.projectId = projectId
      this.model.ietmStandard = ietmStandard
      this.templateData = []
      this.expandedRowKeys = []

      if (!ietmStandard) {
        this.$message.warning('当前项目未配置IETM标准')
        return
      }

      // 获取装备类型字典的第一项作为默认值
      this.loadDefaultEquipmentType()
    },

    /**
     * 加载装备类型字典并设置默认值为第一项
     */
    loadDefaultEquipmentType() {
      // 通过API获取字典项
      getAction('/sys/dict/getDictItems/equipment_type').then(res => {
        if (res.success && res.result && res.result.length > 0) {
          // 默认选中第一项
          const firstItem = res.result[0]
          this.model.equipmentType = firstItem.value
          console.log('装备类型默认选中:', firstItem.value, firstItem.text)

          // 自动加载该装备类型的模板数据
          this.loadTemplateRootData()
        } else {
          this.$message.warning('未找到装备类型字典数据')
        }
      }).catch(err => {
        console.error('获取装备类型字典失败:', err)
        this.$message.error('获取装备类型失败')
      })
    },

    /**
     * 装备类型改变时触发
     */
    handleEquipmentTypeChange(value) {
      console.log('装备类型改变:', value)
      if (value) {
        this.loadTemplateRootData()
      } else {
        this.templateData = []
        this.expandedRowKeys = []
      }
    },

    /**
     * 加载模板根节点数据并自动展开所有子节点
     * ✅ 优化：使用 hasQuery=true 一次性加载所有数据
     */
    loadTemplateRootData() {
      if (!this.model.ietmStandard) {
        return
      }

      if (!this.model.equipmentType) {
        this.$message.warning('请先选择装备类型')
        return
      }

      this.templateLoading = true
      const startTime = Date.now()

      // ✅ 优化：一次性加载所有数据（hasQuery=true）
      getAction('/ietmstandardconfigurationmanagement/ietmStandardConfigurationManagement/rootList', {
        standard: this.model.ietmStandard,
        equipmentType: this.model.equipmentType,
        // ✅ 修复：不传 pid 参数，让后端返回所有节点
        // pid: '0',  // ❌ 删除此行，这会导致后端只返回根节点
        hasQuery: 'true'  // ✅ 关键参数：一次性返回所有数据
      }).then(res => {
        console.log('📦 接口返回原始数据:', res)

        if (res.success) {
          const allNodes = res.result.records || []
          console.log('✅ 一次性加载所有节点:', allNodes.length, '个节点')
          console.log('📊 节点详情:', allNodes.map(n => ({
            id: n.id,
            pid: n.pid,
            code: n.code,
            title: n.title,
            hasChild: n.hasChild
          })))
          console.log('⏱️ 加载耗时:', Date.now() - startTime, 'ms')

          if (allNodes.length === 0) {
            this.$message.warning('该标准暂无模板数据')
            this.templateData = []
            this.templateLoading = false
            return
          }

          // ✅ 构建树形结构
          console.log('🌲 开始构建树形结构...')
          this.templateData = this.buildTree(allNodes, '0')
          console.log('🌲 树形结构构建结果:', this.templateData)

          // ✅ 自动展开所有节点
          this.expandAllNodes(this.templateData)

          console.log('✅ 树形结构构建完成，总耗时:', Date.now() - startTime, 'ms')
        } else {
          this.$message.warning(res.message || '查询模板构型失败')
          this.templateData = []
        }
      }).catch(err => {
        console.error('加载模板失败:', err)
        this.$message.error('加载模板失败')
        this.templateData = []
      }).finally(() => {
        this.templateLoading = false
      })
    },

    /**
     * 构建树形结构
     * @param {Array} nodes - 扁平化的节点数组
     * @param {String} parentId - 父节点ID
     * @returns {Array} 树形结构数组
     */
    buildTree(nodes, parentId) {
      console.log('🔧 buildTree 调用:', {
        totalNodes: nodes.length,
        parentId: parentId,
        parentIdType: typeof parentId,
        sampleNodes: nodes.slice(0, 3).map(n => ({
          id: n.id,
          pid: n.pid,
          pidType: typeof n.pid,
          code: n.code,
          title: n.title
        }))
      })

      const result = []

      nodes.forEach(node => {
        // ✅ 修复：统一转换为字符串进行比较，避免类型不匹配
        const nodePid = String(node.pid)
        const compareParentId = String(parentId)

        if (nodePid === compareParentId) {
          console.log('✅ 找到子节点:', {
            id: node.id,
            pid: node.pid,
            pidType: typeof node.pid,
            code: node.code,
            title: node.title
          })
          // 递归查找子节点
          const children = this.buildTree(nodes, node.id)
          if (children.length > 0) {
            console.log(`  └─ 为节点 ${node.id} 添加 ${children.length} 个子节点`)
            this.$set(node, 'children', children)
          }
          result.push(node)
        }
      })

      console.log(`🔧 buildTree 完成，parentId=${parentId}，找到 ${result.length} 个节点`)
      return result
    },

    /**
     * 自动展开所有节点
     */
    expandAllNodes(nodes) {
      const expandKeys = []
      const collectKeys = (items) => {
        items.forEach(item => {
          if (item.children && item.children.length > 0) {
            expandKeys.push(item.id)
            collectKeys(item.children)
          }
        })
      }
      collectKeys(nodes)
      this.expandedRowKeys = expandKeys
      console.log('自动展开的节点ID:', expandKeys)
    },

    /**
     * 展开/收起节点
     */
    handleExpand(expanded, record) {
      if (expanded) {
        // 展开节点，添加到expandedRowKeys
        if (!this.expandedRowKeys.includes(record.id)) {
          this.expandedRowKeys.push(record.id)
        }
      } else {
        // 收起节点，从expandedRowKeys中移除
        this.expandedRowKeys = this.expandedRowKeys.filter(key => key !== record.id)
      }
    },

    /**
     * 获取总节点数（递归统计）
     */
    getTotalNodeCount() {
      let count = 0
      const countNodes = (nodes) => {
        nodes.forEach(node => {
          count++
          if (node.children && node.children.length > 0) {
            countNodes(node.children)
          }
        })
      }
      countNodes(this.templateData)
      return count
    },

    /**
     * 确定按钮
     */
    handleOk() {
      // 校验1：必须选择装备类型
      if (!this.model.equipmentType) {
        this.$message.warning('请选择装备类型！')
        return
      }

      // 校验2：模板构型树必须有数据
      if (!this.templateData || this.templateData.length === 0) {
        this.$message.warning('该装备类型暂无模板数据，无法导入！')
        return
      }

      // 确认导入
      this.$confirm({
        title: '确认导入',
        content: `即将导入选定装备类型的模板构型数据到当前项目，是否继续？`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          this.doImport()
        }
      })
    },

    /**
     * 执行导入
     */
    doImport() {
      this.confirmLoading = true
      postAction(this.url.importFromTemplate, {
        projectId: this.model.projectId,
        standard: this.model.ietmStandard,
        equipType: this.model.equipmentType  // 后端接口接收的参数名是 equipType
      }).then(res => {
        if (res.success) {
          this.$message.success(res.message || '导入成功')
          this.handleCancel()
          this.$emit('ok')
        } else {
          this.$message.error(res.message || '导入失败')
        }
      }).finally(() => {
        this.confirmLoading = false
      })
    },

    /**
     * 取消按钮
     */
    handleCancel() {
      this.visible = false
      this.model = {
        projectId: '',
        ietmStandard: '',
        equipmentType: undefined  // ✅ 修复：字段名改为 equipmentType
      }
      this.templateData = []
      this.expandedRowKeys = []
    }
  }
}
</script>

<style scoped>
</style>
