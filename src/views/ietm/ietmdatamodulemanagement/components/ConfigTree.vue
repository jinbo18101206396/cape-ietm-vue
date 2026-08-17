<template>
  <div class="config-tree-container">
    <!-- 树工具栏：显示子节点checkbox + 三功能按钮 -->
    <div class="tree-toolbar">
      <div class="toolbar-left">
        <a-checkbox v-model="showChildren" @change="onShowChildrenChange">
          显示子节点DM
        </a-checkbox>
      </div>

      <div class="toolbar-right">
        <a-tooltip title="复制节点DM">
          <a-button size="small" icon="copy" @click="handleCopyNode" :disabled="!currentNode">
            复制
          </a-button>
        </a-tooltip>
        <a-tooltip title="粘贴节点DM">
          <a-button size="small" icon="snippets" @click="handlePasteNode" :disabled="!copiedNodeId || !currentNode">
            粘贴
          </a-button>
        </a-tooltip>
        <a-tooltip title="计算所有DM的引用信息">
          <a-button size="small" icon="calculator" @click="handleCalcRefInfo" :disabled="treeData.length === 0">
            计算引用
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- 构型树 -->
    <div class="tree-content">
      <a-spin :spinning="loading">
        <a-tree
          v-if="treeData.length > 0"
          :tree-data="treeData"
          :expanded-keys="expandedKeys"
          :selected-keys="selectedKeys"
          :load-data="onLoadData"
          :show-icon="false"
          :replace-fields="replaceFields"
          @select="onSelect"
          @expand="onExpand"
        >
          <template slot="title" slot-scope="{ title }">
            <span>{{ title }}</span>
          </template>
        </a-tree>

        <a-empty v-else description="暂无数据" />
      </a-spin>
    </div>
  </div>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import Vue from 'vue'

export default {
  name: 'ConfigTree',
  data() {
    return {
      loading: false,
      showChildren: true,
      treeData: [],
      expandedKeys: [],
      selectedKeys: [],
      replaceFields: {
        title: 'title',
        key: 'key',
        children: 'children'
      },
      currentNode: null,
      currentProjectId: '',
      currentProjectInfo: null,
      _isDestroyed: false,  // 销毁标记，防止组件销毁后异步回调修改状态
      // 复制粘贴状态
      copiedNodeId: null,
      copiedNodeData: null
    }
  },
  mounted() {
    this.loadTreeData()
  },
  beforeDestroy() {
    this._isDestroyed = true
  },
  methods: {
    // 加载构型树（先获取当前项目，再加载根节点）
    loadTreeData() {
      this.loading = true
      getAction('/ietmproject/ietmProject/getCurrentProject')
        .then(res => {
          if (this._isDestroyed) return
          if (res.success && res.result) {
            this.currentProjectId = res.result.projectId
            this.currentProjectInfo = res.result
            this.loadTreeRootNodes()
          } else {
            this.$message.warning('未打开任何项目，请先在首页打开项目')
            this.treeData = []
            this.loading = false
          }
        })
        .catch(err => {
          if (this._isDestroyed) return
          console.error('获取当前项目失败', err)
          this.$message.error('获取当前项目失败')
          this.loading = false
        })
    },

    // 加载构型树根节点
    loadTreeRootNodes() {
      getAction('/projectconfigurationmanagement/ietmProjectConfigurationManagement/rootList', {
        projectId: this.currentProjectId
      })
        .then(res => {
          if (this._isDestroyed) return
          if (res.success) {
            const records = res.result.records || []
            this.treeData = records.map(item => {
              // 根节点（pid=0）展示装备代码+项目名
              const titleText = item.pid === '0'
                ? (this.currentProjectInfo.equipmentCode || item.code) + '-' + (this.currentProjectInfo.projectName || item.title)
                : item.code + '-' + item.title
              return {
                title: titleText,
                key: item.id,
                isLeaf: item.hasChild !== '1',
                isRoot: item.pid === '0',  // 直接标记根节点，避免后续嵌套 dataRef 判断
                dataRef: item,
                projectId: this.currentProjectId,
                nodeId: item.id,
                nodeName: item.title,
                nodePath: item.nodePath,
                nodeType: 'node',
                sns: item.code
              }
            })

            // 默认展开根节点，并加载一级子节点
            if (this.treeData.length > 0) {
              const rootNode = this.treeData[0]
              this.expandedKeys = [rootNode.key]

              // 加载根节点的子节点（一级节点）
              if (rootNode.dataRef.hasChild === '1') {
                this.loadFirstLevelNodes(rootNode)
              } else {
                // 根节点没有子节点，不选中任何节点
                console.warn('根节点没有子节点')
                this.loading = false
                this.$message.warning('构型树没有子节点，请联系管理员添加')
              }
            } else {
              this.loading = false
            }
          }
        })
        .catch(err => {
          console.error('加载构型树失败', err)
          this.$message.error('加载构型树失败')
          this.loading = false
        })
    },

    // 加载一级子节点并自动选中第一个
    loadFirstLevelNodes(rootNode) {
      getAction('/projectconfigurationmanagement/ietmProjectConfigurationManagement/childList', {
        parentId: rootNode.key,
        projectId: this.currentProjectId
      })
        .then(res => {
          if (this._isDestroyed) return
          if (res.success && res.result.records && res.result.records.length > 0) {
            const directChildren = res.result.records.filter(item => String(item.pid) === String(rootNode.key))

            const children = directChildren.map(item => ({
              title: item.code + '-' + item.title,
              key: item.id,
              isLeaf: item.hasChild !== '1',
              isRoot: false,
              dataRef: item,
              projectId: this.currentProjectId,
              nodeId: item.id,
              nodeName: item.title,
              nodePath: item.nodePath,
              nodeType: 'node',
              sns: item.code
            }))

            rootNode.children = children
            rootNode.dataRef.children = children
            this.treeData = [...this.treeData]
            this.expandedKeys = [rootNode.key]

            // 加载第一个一级节点的子节点（二级节点）
            if (children.length > 0) {
              const firstChild = children[0]
              this.loadSecondLevelNodes(firstChild, rootNode.key).then(() => {
                this.$nextTick(() => {
                  // 自动选中第一个一级节点
                  this.selectedKeys = [firstChild.key]
                  this.currentNode = firstChild
                  this.emitSelect(firstChild)
                  this.loading = false
                })
              })
            } else {
              this.loading = false
            }
          } else {
            // 没有子节点，不选中任何节点
            console.warn('根节点没有有效的子节点')
            this.loading = false
            this.$message.warning('构型树没有子节点，请联系管理员添加')
          }
        })
        .catch(err => {
          console.error('加载一级节点失败', err)
          // 加载失败，不选中任何节点
          this.loading = false
          this.$message.error('加载一级节点失败')
        })
    },

    // 加载二级节点
    loadSecondLevelNodes(firstChildNode, rootKey) {
      return new Promise(resolve => {
        if (firstChildNode.isLeaf) {
          resolve()
          return
        }

        getAction('/projectconfigurationmanagement/ietmProjectConfigurationManagement/childList', {
          parentId: firstChildNode.key,
          projectId: this.currentProjectId
        })
          .then(res => {
            if (res.success && res.result.records && res.result.records.length > 0) {
              const directChildren = res.result.records.filter(item => String(item.pid) === String(firstChildNode.key))

              const children = directChildren.map(item => ({
                title: item.code + '-' + item.title,
                key: item.id,
                isLeaf: item.hasChild !== '1',
                dataRef: item,
                projectId: this.currentProjectId,
                nodeId: item.id,
                nodeName: item.title,
                nodePath: item.nodePath,
                nodeType: 'node',
                sns: item.code  // ← 添加 SNS 字段
              }))

              firstChildNode.children = children
              firstChildNode.dataRef.children = children
              this.treeData = [...this.treeData]
              this.expandedKeys = [rootKey, firstChildNode.key]
            }
            resolve()
          })
          .catch(() => {
            resolve()
          })
      })
    },

    // 异步加载子节点
    onLoadData(treeNode) {
      return new Promise(resolve => {
        if (treeNode.dataRef.children && treeNode.dataRef.children.length > 0) {
          resolve()
          return
        }

        const { key } = treeNode.dataRef

        getAction('/projectconfigurationmanagement/ietmProjectConfigurationManagement/childList', {
          parentId: key,
          projectId: this.currentProjectId
        })
          .then(res => {
            if (res.success && res.result.records) {
              const directChildren = res.result.records.filter(item => String(item.pid) === String(key))

              const children = directChildren.map(item => ({
                title: item.code + '-' + item.title,
                key: item.id,
                isLeaf: item.hasChild !== '1',
                dataRef: item,
                projectId: this.currentProjectId,
                nodeId: item.id,
                nodeName: item.title,
                nodePath: item.nodePath,
                nodeType: 'node',
                sns: item.code  // ← 添加 SNS 字段
              }))

              treeNode.dataRef.children = children
              this.treeData = [...this.treeData]
            }
            resolve()
          })
          .catch(() => {
            resolve()
          })
      })
    },

    // 节点选择事件
    onSelect(selectedKeys, e) {
      if (selectedKeys.length === 0) return

      const node = e.node.dataRef

      // 使用 isRoot 标记阻止根节点选择，比依赖嵌套 dataRef.pid 更可靠
      if (node.isRoot) {
        this.$message.warning('不能选择根节点，请选择子节点')
        this.selectedKeys = this.currentNode ? [this.currentNode.key] : []
        return
      }

      this.selectedKeys = selectedKeys
      this.currentNode = node
      this.emitSelect(node)
    },

    // 触发父组件的选择事件
    emitSelect(node) {
      if (node.isRoot) {
        console.warn('阻止根节点触发选择事件')
        return
      }

      this.$emit('select', {
        projectId: node.projectId || this.currentProjectId,
        nodeId: node.nodeId || node.key,
        nodeName: node.nodeName || node.title,
        nodePath: node.nodePath,
        nodeType: node.nodeType || 'node',
        sns: node.sns || (node.dataRef && node.dataRef.code) || '',
        cmNodeId: node.nodeId || node.key,  // 补全：构型节点ID
        techName: node.nodeName || node.title,  // 补全：技术名称（与 nodeName 一致）
        showChildren: this.showChildren
      })
    },

    // 展开/收起事件
    onExpand(expandedKeys) {
      this.expandedKeys = expandedKeys
    },

    // 显示子节点切换
    onShowChildrenChange(e) {
      if (this.currentNode) {
        this.emitSelect(this.currentNode)
      }
    },

    // 复制节点DM
    handleCopyNode() {
      if (!this.currentNode) {
        this.$message.warning('请先选择一个节点')
        return
      }
      this.copiedNodeId = this.currentNode.nodeId
      this.copiedNodeData = { ...this.currentNode }
      this.$message.success(`已复制节点"${this.currentNode.nodeName}"`)
    },

    // 粘贴节点DM
    handlePasteNode() {
      if (!this.copiedNodeId) {
        this.$message.warning('请先复制一个节点')
        return
      }
      if (!this.currentNode) {
        this.$message.warning('请选择目标节点')
        return
      }
      if (this.copiedNodeId === this.currentNode.nodeId) {
        this.$message.warning('不能粘贴到相同节点')
        return
      }

      const modal = this.$confirm({
        title: '确认粘贴',
        content: `确定要将"${this.copiedNodeData.nodeName}"下的所有DM复制到"${this.currentNode.nodeName}"吗？`,
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          return new Promise((resolve, reject) => {
            getAction('/ietm/datamodule/batchCopyToNode', {
              sourceCmNodeId: this.copiedNodeId,
              targetCmNodeId: this.currentNode.nodeId,
              targetCmNodeName: this.currentNode.nodeName
            })
              .then(res => {
                if (res.success) {
                  this.$message.success(res.message || '粘贴成功')
                  this.$emit('paste-success')
                  resolve()
                } else {
                  this.$message.error(res.message || '粘贴失败')
                  reject()
                }
              })
              .catch(err => {
                console.error('粘贴节点DM失败', err)
                this.$message.error('粘贴失败')
                reject()
              })
          })
        }
      })
    },

    // 计算引用信息
    handleCalcRefInfo() {
      if (!this.currentProjectId) {
        this.$message.warning('未打开任何项目')
        return
      }

      const modal = this.$confirm({
        title: '确认计算引用',
        content: '确定要计算所有DM的引用信息吗？这可能需要较长时间。',
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          return new Promise((resolve, reject) => {
            const hide = this.$message.loading('正在计算引用信息...', 0)
            postAction('/ietm/datamodule/calcref/all', {})
              .then(res => {
                hide()
                if (res.success) {
                  this.$message.success('计算引用信息成功')
                  resolve()
                } else {
                  this.$message.error(res.message || '计算失败')
                  reject()
                }
              })
              .catch(err => {
                hide()
                console.error('计算引用信息失败', err)
                this.$message.error('计算失败')
                reject()
              })
          })
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
.config-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;

  // 树工具栏
  .tree-toolbar {
    padding: 10px 12px;
    margin-bottom: 12px;
    background: #fafafa;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 40px;

    .toolbar-left {
      flex-shrink: 0;

      .ant-checkbox-wrapper {
        font-size: 13px;
        color: #262626;
      }
    }

    .toolbar-right {
      display: flex;
      gap: 8px;
      flex-shrink: 0;

      .ant-btn {
        height: 28px;
        padding: 0 12px;
        font-size: 12px;
        border-radius: 2px;
        transition: all 0.3s;

        &:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        &[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }

  // 树内容区域
  .tree-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: auto;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    padding: 8px;
    background: #fff;

    // 树节点样式优化
    ::v-deep .ant-tree {
      .ant-tree-node-content-wrapper {
        line-height: 28px;
        border-radius: 2px;
        transition: all 0.2s;

        &:hover {
          background-color: #e6f7ff;
        }
      }

      .ant-tree-node-selected {
        .ant-tree-node-content-wrapper {
          background-color: #bae7ff;
        }
      }

      .ant-tree-title {
        font-size: 13px;
      }
    }

    // 滚动条样式
    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 3px;

      &:hover {
        background: #bfbfbf;
      }
    }
  }
}
</style>
