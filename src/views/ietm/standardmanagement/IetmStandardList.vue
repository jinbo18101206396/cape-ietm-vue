<template>
  <a-card :bordered="false">
    <a-row :gutter="16">
      <a-col :span="4">
        <div class="left-tree-panel" :style="{ height: rightPanelHeight }">
        <!-- 查询区域 -->
        <div class="table-page-search-wrapper">
          <a-form layout="inline" @keyup.enter.native="searchQuery">
            <a-row :gutter="24">
            </a-row>
          </a-form>
        </div>
        <!-- 查询区域-END -->

        <!-- 操作按钮区域 - 字典数据由系统管理维护，此处不提供新增功能 -->
        <div class="table-operator" style="text-align: center; margin-bottom: 16px;">
          <!-- 字典数据请在系统字典管理中维护 -->
        </div>

        <!-- tree区域-begin -->
        <div>
          <a-spin :spinning="loading">
            <a-tree
              v-if="treeData.length > 0"
              :tree-data="treeData"
              :selected-keys="selectedKeys"
              :default-expand-all="true"
              @select="onTreeSelect">
              <template slot="title" slot-scope="item">
                <div class="tree-node-wrapper">
                  <div class="tree-node-content">
                    <template v-if="item.key === 'root'">
                      <a-icon type="folder-open" style="margin-right: 8px; color: #1890ff;" />
                      <span style="font-weight: 600;">{{ item.name }}</span>
                    </template>
                    <template v-else>
                      <a-icon type="book" style="margin-right: 8px;" />
                      <span>{{ item.name }}</span>
                    </template>
                  </div>
                  <!-- 字典数据不提供编辑删除功能，请在系统字典管理中维护 -->
                </div>
              </template>
            </a-tree>
            <a-empty v-else description="暂无数据" />
          </a-spin>
        </div>
        </div>
      </a-col>
      <a-col :span="20">
        <div ref="rightPanel">
        <IetmStandardDmtypeList :mainId="ietmStandardDmtypeMainId" />
        </div>
      </a-col>
    </a-row>

    <ietmStandard-modal ref="modalForm" @ok="modalFormOk"></ietmStandard-modal>
  </a-card>
</template>

<script>

import IetmStandardModal from './modules/IetmStandardModal'
import { getAction, deleteAction } from '@/api/manage'
import { ajaxGetDictItems } from '@/api/api'
import IetmStandardDmtypeList from './IetmStandardDmtypeList'
import '@/assets/less/TableExpand.less'

export default {
  name: 'IetmStandardList',
  components: {
    IetmStandardDmtypeList,
    IetmStandardModal
  },
  data() {
    return {
      description: '手册管理-标准管理左侧树管理页面',
      treeData: [],
      selectedKeys: [],
      selectedRowKeys: [],
      selectionRows: [],
      loading: false,
      url: {
        delete: '/standardmanagement/ietmStandard/delete'
      },
      selectedMainId: '',
      ietmStandardDmtypeMainId: '',
      rightPanelHeight: 'auto'
    }
  },
  created() {
    this.loadTreeData()
  },
  mounted() {
    this.$nextTick(() => {
      this.updateRightPanelHeight()
      window.addEventListener('resize', this.updateRightPanelHeight)
    })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateRightPanelHeight)
  },
  computed: {
  },
  methods: {
    loadTreeData() {
      this.loading = true
      ajaxGetDictItems('standard_type').then((res) => {
        if (res.success) {
          // 构建子节点 - 从字典数据映射
          const children = res.result.map(item => ({
            id: item.value,
            key: item.value,
            name: item.text,
            security_dictText: item.text,
            scopedSlots: { title: 'title' }
          }))

          // 构建根节点
          this.treeData = [{
            key: 'root',
            id: 'root',
            name: 'IETM标准',
            children: children,
            scopedSlots: { title: 'title' }
          }]

          // 默认选中第一个标准节点
          if (children.length > 0) {
            this.selectedKeys = [children[0].id]
            this.ietmStandardDmtypeMainId = children[0].id
          }
        } else {
          this.$message.error(res.message)
        }
        this.loading = false
      }).catch((err) => {
        console.error('加载字典数据失败:', err)
        this.$message.error('加载数据失败')
        this.loading = false
      })
    },
    onTreeSelect(selectedKeys, info) {
      if (selectedKeys.length > 0) {
        this.selectedKeys = selectedKeys
        // 如果选中的是根节点，清空右侧列表
        if (selectedKeys[0] === 'root') {
          this.ietmStandardDmtypeMainId = ''
        } else {
          this.ietmStandardDmtypeMainId = selectedKeys[0]
        }
      }
    },
    handleAdd() {
      this.$message.info('字典数据请在系统字典管理中添加')
    },
    handleEdit(record) {
      this.$message.info('字典数据请在系统字典管理中编辑')
    },
    handleDelete(id) {
      this.$message.warning('字典数据请在系统字典管理中删除')
    },
    modalFormOk() {
      this.loadTreeData()
    },
    updateRightPanelHeight() {
      this.$nextTick(() => {
        if (this.$refs.rightPanel) {
          const height = this.$refs.rightPanel.offsetHeight
          this.rightPanelHeight = height > 400 ? `${height}px` : '400px'
        }
      })
    }
  },
  watch: {
    ietmStandardDmtypeMainId() {
      // 当右侧内容变化时，重新计算高度
      this.$nextTick(() => {
        setTimeout(() => {
          this.updateRightPanelHeight()
        }, 300)
      })
    }
  }
}
</script>
<style scoped>
@import '~@assets/less/common.less';

.left-tree-panel {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 16px;
  background-color: #ffffff;
  min-height: 400px;
  overflow-y: auto;
}

.tree-node-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
}

.tree-node-content {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.ant-tree-node-content-wrapper:hover .tree-node-actions {
  opacity: 1;
}

.action-icon {
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 2px;
  transition: all 0.3s;
}

.edit-icon {
  color: #1890ff;
}

.edit-icon:hover {
  color: #40a9ff;
  background-color: #e6f7ff;
}

.delete-icon {
  color: #ff4d4f;
}

.delete-icon:hover {
  color: #ff7875;
  background-color: #fff1f0;
}
</style>