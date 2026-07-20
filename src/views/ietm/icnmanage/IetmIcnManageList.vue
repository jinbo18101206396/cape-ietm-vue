<template>
  <div class="icn-manage-container">
    <a-card :bordered="false" :body-style="{ padding: '16px' }">
      <!-- 工具栏 -->
      <div class="toolbar-wrapper">
        <a-space :size="8">
          <!-- 新增 -->
          <a-button type="primary" icon="plus" @click="handleAdd">新增</a-button>

          <!-- 批量新增 -->
          <a-button type="primary" icon="plus-square" @click="handleBatchAdd">批量新增</a-button>

          <!-- 相关文件 -->
          <a-button type="primary" icon="file-add" @click="handleUploadRelated" :disabled="selectedRowKeys.length !== 1">相关文件</a-button>

          <!-- 差异上传 -->
          <a-button type="primary" icon="diff" @click="handleUploadDiff" :disabled="selectedRowKeys.length !== 1">差异上传</a-button>

          <!-- 新版上传 -->
          <a-button type="primary" icon="cloud-upload" @click="handleUploadNew" :disabled="selectedRowKeys.length !== 1">新版上传</a-button>

          <!-- 浏览 -->
          <a-button type="primary" icon="eye" @click="handleView" :disabled="selectedRowKeys.length !== 1">浏览</a-button>

          <!-- 引用 -->
          <a-button type="primary" icon="link" @click="handleReference" :disabled="selectedRowKeys.length !== 1">引用</a-button>

          <!-- 下载 -->
          <a-button type="primary" icon="download" @click="handleDownload" :disabled="selectedRowKeys.length !== 1">下载</a-button>
        </a-space>
      </div>

      <!-- 左右分栏布局 -->
      <a-row :gutter="16" class="content-row">
        <!-- 左侧：构型树 -->
        <a-col :span="6">
          <a-card size="small" class="tree-card">
            <div slot="title" class="card-title">
              <a-icon type="apartment" style="margin-right: 8px;" />
              构型树
            </div>
            <div slot="extra" class="code-rule-tip">
              编码规则：A-00-0-0-00-00-A
            </div>

            <!-- 操作区域 -->
            <div class="tree-actions">
              <a-checkbox v-model="showChildIcn" @change="handleShowChildIcnChange">
                显示子节点的ICN
              </a-checkbox>
              <div class="tree-buttons">
                <a-button size="small" icon="calculator" @click="handleCalculate">计算</a-button>
                <a-button size="small" icon="clear" @click="handleClearCache">清除</a-button>
              </div>
            </div>

            <!-- 构型树 -->
            <div class="tree-scroll-wrap">
              <a-tree
                :tree-data="treeData"
                :load-data="onLoadTreeData"
                :expanded-keys="expandedKeys"
                :selected-keys="selectedTreeKeys"
                @select="onTreeSelect"
                @expand="onTreeExpand"
                :show-icon="false"
              >
                <template #title="{ title }">
                  <span>{{ title }}</span>
                </template>
              </a-tree>
            </div>
          </a-card>
        </a-col>

        <!-- 右侧：ICN列表 -->
        <a-col :span="18">
          <a-card size="small" class="list-card">
            <div slot="title" class="card-title">
              <a-icon type="database" style="margin-right: 8px;" />
              ICN实体列表
            </div>
            <a-table
              ref="table"
              rowKey="id"
              :columns="columns"
              :data-source="dataSource"
              :pagination="ipagination"
              :loading="loading"
              :row-selection="{
                type: 'radio',
                selectedRowKeys: selectedRowKeys,
                onChange: onSelectChange
              }"
              :customRow="customRow"
              @change="handleTableChange"
              size="middle"
              bordered
            >
              <!-- ICN编码 -->
              <span slot="icn" slot-scope="text, record">
                <a @click="handleViewDetail(record)">{{ text }}</a>
              </span>

              <!-- 密级 -->
              <span slot="security" slot-scope="text">
                <a-tag :color="getSecurityColor(text)">
                  {{ getSecurityText(text) }}
                </a-tag>
              </span>

              <!-- 操作 -->
              <span slot="action" slot-scope="text, record">
                <a @click="handleEdit(record)">编辑</a>
                <a-divider type="vertical" />
                <a-dropdown>
                  <a class="ant-dropdown-link" @click="e => e.preventDefault()">
                    更多 <a-icon type="down" />
                  </a>
                  <a-menu slot="overlay">
                    <a-menu-item>
                      <a @click="handleViewDetail(record)">详情</a>
                    </a-menu-item>
                    <a-menu-item>
                      <a-popconfirm title="确定删除吗?" @confirm="() => handleDeleteOne(record.id)">
                        <a style="color: red;">删除</a>
                      </a-popconfirm>
                    </a-menu-item>
                  </a-menu>
                </a-dropdown>
              </span>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </a-card>

    <!-- 新增/编辑弹窗 -->
    <icn-manage-modal ref="modalForm" @ok="modalFormOk" />

    <!-- 批量新增弹窗 -->
    <icn-batch-add-modal ref="batchAddModal" @ok="modalFormOk" />

    <!-- 上传弹窗 -->
    <icn-upload-modal ref="uploadModal" @ok="modalFormOk" />

    <!-- 详情弹窗 -->
    <icn-info-modal ref="infoModal" />

    <!-- 引用关系弹窗 -->
    <icn-reference-modal ref="referenceModal" @view-detail="handleViewDetail" />

    <!-- 播放器组件 -->
    <play-video ref="playVideo" />
    <play-audio ref="playAudio" />
    <play-img ref="playImg" />
  </div>
</template>

<script>
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import IcnManageModal from './modules/IetmIcnManageModal'
import IcnUploadModal from './modules/IcnUploadModal'
import IcnInfoModal from './modules/IcnInfoModal'
import IcnBatchAddModal from './modules/IcnBatchAddModal'
import IcnReferenceModal from './modules/IcnReferenceModal'
import PlayVideo from '@/views/ietm/playertool/playVideo'
import PlayAudio from '@/views/ietm/playertool/playAudio'
import PlayImg from '@/views/ietm/playertool/playImg'
import { getAction, deleteAction, postAction } from '@/api/manage'

export default {
  name: 'IetmIcnManageList',
  mixins: [JeecgListMixin],
  components: {
    IcnManageModal,
    IcnUploadModal,
    IcnInfoModal,
    IcnBatchAddModal,
    IcnReferenceModal,
    PlayVideo,
    PlayAudio,
    PlayImg
  },
  data() {
    return {
      // 列表相关
      url: {
        list: '/icnmanage/ietmIcnManage/listWithAttachments',
        delete: '/icnmanage/ietmIcnManage/delete',
        deleteBatch: '/icnmanage/ietmIcnManage/deleteBatch',
        exportXlsUrl: '/icnmanage/ietmIcnManage/exportXls',
        getProjectInfo: '/icnmanage/ietmIcnManage/getProjectInfo',
        // 构型树接口（与项目构型管理页面保持一致）
        getCurrentProject: '/ietmproject/ietmProject/getCurrentProject',
        treeRootList: '/projectconfigurationmanagement/ietmProjectConfigurationManagement/rootList',
        treeChildList: '/projectconfigurationmanagement/ietmProjectConfigurationManagement/childList'
      },
      columns: [
        {
          title: '序号',
          dataIndex: '',
          key: 'rowIndex',
          width: 60,
          align: 'center',
          customRender: (text, record, index) => {
            return index + 1
          }
        },
        {
          title: 'ICN',
          dataIndex: 'icn',
          width: 300,
          align: 'center',
          scopedSlots: { customRender: 'icn' }
        },
        {
          title: '文件名称',
          dataIndex: 'fileName',
          width: 200,
          align: 'center',
          customRender: (text, record) => {
            // 后端返回的是单个附件对象，不是数组
            return (record.ietmAttachment && record.ietmAttachment.fileName) || '-'
          }
        },
        {
          title: '版本号',
          dataIndex: 'issueNo',
          width: 100,
          align: 'center'
        },
        {
          title: '密级',
          dataIndex: 'security',
          width: 100,
          align: 'center',
          scopedSlots: { customRender: 'security' }
        },
        {
          title: '文件大小',
          dataIndex: 'fileSize',
          width: 120,
          align: 'center',
          customRender: (text, record) => {
            // 后端返回的是单个附件对象，不是数组
            const bytes = record.ietmAttachment && record.ietmAttachment.fileSize
            return bytes ? this.formatFileSize(bytes) : '-'
          }
        },
        {
          title: '创建日期',
          dataIndex: 'createTime',
          width: 120,
          align: 'center',
          customRender: (text) => {
            return text ? text.substring(0, 10) : '-'
          }
        },
        {
          title: '创建人',
          dataIndex: 'createBy',
          width: 120,
          align: 'center'
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: 150,
          align: 'center',
          scopedSlots: { customRender: 'action' }
        }
      ],
      dataSource: [],
      selectedRowKeys: [],
      selectedRows: [],

      // 构型树相关
      treeData: [],
      expandedKeys: [],
      selectedTreeKeys: [],
      currentCmnodeId: '',
      // 当前项目信息
      currentProjectId: '',
      currentProjectInfo: null,
      // 构型树操作
      showChildIcn: false
    }
  },
  created() {
    this.loadTreeData()
  },
  methods: {
    // 加载构型树（先获取当前项目，再加载根节点）
    loadTreeData() {
      getAction(this.url.getCurrentProject).then(res => {
        if (res.success && res.result) {
          this.currentProjectId = res.result.projectId
          this.currentProjectInfo = res.result
          this.loadTreeRootNodes()
        } else {
          this.$message.warning('未打开任何项目，请先在首页打开项目')
          this.treeData = []
        }
      }).catch(() => {
        this.$message.error('获取当前项目失败')
      })
    },

    // 加载构型树根节点
    loadTreeRootNodes() {
      getAction(this.url.treeRootList, { projectId: this.currentProjectId }).then(res => {
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
              dataRef: item
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
              // 根节点没有子节点，直接选中根节点
              this.selectedTreeKeys = [rootNode.key]
              this.currentCmnodeId = rootNode.key
              this.loadData()
            }
          }
        }
      })
    },

    // 加载一级子节点并自动选中第一个
    loadFirstLevelNodes(rootNode) {
      getAction(this.url.treeChildList, {
        parentId: rootNode.key,
        projectId: this.currentProjectId
      }).then(res => {
        if (res.success && res.result.records && res.result.records.length > 0) {
          // 只保留直接子节点
          const directChildren = res.result.records.filter(item => item.pid === rootNode.key)

          const children = directChildren.map(item => ({
            title: item.code + '-' + item.title,
            key: item.id,
            isLeaf: item.hasChild !== '1',
            dataRef: item
          }))

          // 关键：将 children 挂载到 treeData 的节点对象上（不是 dataRef）
          rootNode.children = children
          rootNode.dataRef.children = children

          // 触发树重新渲染
          this.treeData = [...this.treeData]

          // 展开根节点
          this.expandedKeys = [rootNode.key]

          // 加载第一个一级节点的子节点（二级节点）
          if (children.length > 0) {
            const firstChild = children[0]
            this.loadSecondLevelNodes(firstChild, rootNode.key).then(() => {
              // 使用 $nextTick 确保 DOM 更新后再选中节点
              this.$nextTick(() => {
                // 自动选中第一个一级节点
                this.selectedTreeKeys = [firstChild.key]
                this.currentCmnodeId = firstChild.key
                this.loadData()
              })
            })
          }
        } else {
          // 没有子节点，选中根节点
          this.selectedTreeKeys = [rootNode.key]
          this.currentCmnodeId = rootNode.key
          this.loadData()
        }
      }).catch(() => {
        // 加载失败，选中根节点
        this.selectedTreeKeys = [rootNode.key]
        this.currentCmnodeId = rootNode.key
        this.loadData()
      })
    },

    // 加载二级节点
    loadSecondLevelNodes(firstChildNode, rootKey) {
      return new Promise(resolve => {
        // 如果一级节点是叶子节点，直接返回
        if (firstChildNode.isLeaf) {
          resolve()
          return
        }

        getAction(this.url.treeChildList, {
          parentId: firstChildNode.key,
          projectId: this.currentProjectId
        }).then(res => {
          if (res.success && res.result.records && res.result.records.length > 0) {
            const directChildren = res.result.records.filter(item => item.pid === firstChildNode.key)

            const children = directChildren.map(item => ({
              title: item.code + '-' + item.title,
              key: item.id,
              isLeaf: item.hasChild !== '1',
              dataRef: item
            }))

            // 将二级节点挂载到一级节点上
            firstChildNode.children = children
            firstChildNode.dataRef.children = children

            // 触发树重新渲染
            this.treeData = [...this.treeData]

            // 展开根节点和第一个一级节点
            this.expandedKeys = [rootKey, firstChildNode.key]
          }
          resolve()
        }).catch(() => {
          resolve()
        })
      })
    },

    // 树节点选择
    onTreeSelect(selectedKeys, e) {
      if (selectedKeys.length > 0) {
        this.selectedTreeKeys = selectedKeys
        this.currentCmnodeId = selectedKeys[0]
        this.loadData()
      }
    },

    // 树节点展开
    onTreeExpand(expandedKeys) {
      this.expandedKeys = expandedKeys
    },

    // 按需加载子节点（与项目构型管理页面保持一致）
    onLoadTreeData(treeNode) {
      return new Promise(resolve => {
        // 已加载过子节点，无需再次加载
        if (treeNode.dataRef.children && treeNode.dataRef.children.length > 0) {
          resolve()
          return
        }
        const nodeId = treeNode.eventKey
        getAction(this.url.treeChildList, {
          parentId: nodeId,
          projectId: this.currentProjectId
        }).then(res => {
          if (res.success && res.result.records && res.result.records.length > 0) {
            // 只保留 pid === nodeId 的直接子节点
            // 同时过滤掉根节点自身（childList 接口会把父节点也返回）
            const directChildren = res.result.records.filter(item => item.pid === nodeId)
            const children = directChildren.map(item => ({
              title: item.code + '-' + item.title,
              key: item.id,
              isLeaf: item.hasChild !== '1',
              dataRef: item
            }))

            // 关键：同时更新 treeNode 和 dataRef 的 children
            treeNode.dataRef.children = children

            // 找到 treeData 中对应的节点并更新其 children
            const updateNodeChildren = (nodes) => {
              for (let node of nodes) {
                if (node.key === nodeId) {
                  node.children = children
                  return true
                }
                if (node.children && node.children.length > 0) {
                  if (updateNodeChildren(node.children)) {
                    return true
                  }
                }
              }
              return false
            }
            updateNodeChildren(this.treeData)

            // 触发树重新渲染
            this.treeData = [...this.treeData]
          }
          resolve()
        }).catch(() => {
          resolve()
        })
      })
    },

    // 加载ICN列表
    loadData(arg) {
      if (!this.currentCmnodeId) {
        // 未选择构型节点时，安静返回（不弹提示）
        this.loading = false
        this.dataSource = []
        this.selectedRowKeys = []
        this.selectedRows = []
        return
      }

      this.loading = true
      const params = {
        cmnodeId: this.currentCmnodeId,
        includeChildren: this.showChildIcn ? '1' : '0',
        ...this.queryParam
      }

      getAction(this.url.list, params).then(res => {
        if (res.success) {
          this.dataSource = res.result
          // 清空选中状态，避免旧数据ID残留
          this.selectedRowKeys = []
          this.selectedRows = []
        } else {
          this.$message.error(res.message)
        }
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },

    // 显示子节点ICN勾选变化
    handleShowChildIcnChange(e) {
      this.showChildIcn = e.target.checked
      this.loadData()
    },

    // 表格选择变化
    onSelectChange(selectedRowKeys, selectedRows) {
      this.selectedRowKeys = [...selectedRowKeys]
      this.selectedRows = [...selectedRows]
    },

    // 自定义行属性，实现点击行选中
    customRow(record) {
      return {
        style: {
          cursor: 'pointer'
        },
        on: {
          click: () => {
            // 如果点击的是已选中的行，不做处理（保持选中状态）
            if (this.selectedRowKeys[0] === record.id) {
              return
            }
            // 点击行时选中该行
            this.selectedRowKeys = [record.id]
            this.selectedRows = [record]
          }
        }
      }
    },

    // 获取当前选中的记录（处理 selectedRows 不同步的情况）
    getSelectedRecord() {
      if (this.selectedRowKeys.length !== 1) {
        return null
      }

      // 尝试从 selectedRows 获取记录
      let record = this.selectedRows[0]

      // 如果 selectedRows 不同步，从 dataSource 中查找
      if (!record && this.selectedRowKeys[0]) {
        record = this.dataSource.find(item => item.id === this.selectedRowKeys[0])
      }

      return record
    },

    // 新增
    handleAdd() {
      if (!this.currentCmnodeId) {
        this.$message.warning('请先选择构型节点')
        return
      }
      // 检查是否选择了根节点（根节点的 pid 为 '0'）
      const currentNode = this.findNodeById(this.treeData, this.currentCmnodeId)
      if (currentNode && currentNode.dataRef && currentNode.dataRef.pid === '0') {
        this.$message.warning('不能在根节点下新增ICN，请选择子节点')
        return
      }
      this.$refs.modalForm.add(this.currentCmnodeId, this.currentProjectInfo)
      this.$refs.modalForm.title = '新增ICN'
    },

    // 递归查找树节点
    findNodeById(nodes, id) {
      for (let node of nodes) {
        if (node.key === id) return node
        if (node.children && node.children.length > 0) {
          const found = this.findNodeById(node.children, id)
          if (found) return found
        }
      }
      return null
    },

    // 批量新增
    handleBatchAdd() {
      if (!this.currentCmnodeId) {
        this.$message.warning('请先选择构型节点')
        return
      }

      // 检查是否为根节点
      const currentNode = this.findNodeById(this.treeData, this.currentCmnodeId)
      if (currentNode && currentNode.dataRef && currentNode.dataRef.pid === '0') {
        this.$message.warning('不能在根节点下批量新增ICN，请选择子节点')
        return
      }

      // 获取当前节点名称
      const nodeName = currentNode ? currentNode.title : ''
      this.$refs.batchAddModal.show(this.currentCmnodeId, nodeName, this.currentProjectInfo)
    },

    // 编辑
    handleEdit(record) {
      this.$refs.modalForm.edit(record)
      this.$refs.modalForm.title = '编辑ICN'
    },

    // 相关文件上传
    handleUploadRelated() {
      if (this.selectedRowKeys.length !== 1) {
        this.$message.warning('请选择一条记录')
        return
      }

      const record = this.getSelectedRecord()
      if (!record) {
        this.$message.warning('请选择一个ICN！')
        return
      }
      this.$refs.uploadModal.showRelated(record)
    },

    // 差异上传
    handleUploadDiff() {
      if (this.selectedRowKeys.length !== 1) {
        this.$message.warning('请选择一条记录')
        return
      }

      const record = this.getSelectedRecord()
      if (!record) {
        this.$message.warning('请选择一个ICN！')
        return
      }
      this.$refs.uploadModal.showDiff(record)
    },

    // 新版上传
    handleUploadNew() {
      if (this.selectedRowKeys.length !== 1) {
        this.$message.warning('请选择一条记录')
        return
      }

      const record = this.getSelectedRecord()
      if (!record) {
        this.$message.warning('请选择一个ICN！')
        return
      }
      this.$refs.uploadModal.showNew(record)
    },

    // 删除单条
    handleDeleteOne(id) {
      deleteAction(this.url.delete, { id }).then(res => {
        if (res.success) {
          this.$message.success(res.message)
          this.loadData()
        } else {
          this.$message.error(res.message)
        }
      })
    },

    // 批量删除
    handleDelete() {
      if (this.selectedRowKeys.length === 0) {
        this.$message.warning('请选择要删除的记录')
        return
      }

      this.$confirm({
        title: '确认删除',
        content: `确定删除选中的 ${this.selectedRowKeys.length} 条记录吗？`,
        onOk: () => {
          deleteAction(this.url.deleteBatch, { ids: this.selectedRowKeys.join(',') }).then(res => {
            if (res.success) {
              this.$message.success(res.message)
              this.loadData()
              this.selectedRowKeys = []
              this.selectedRows = []
            } else {
              this.$message.error(res.message)
            }
          })
        }
      })
    },

    // 查看详情
    handleViewDetail(record) {
      this.$refs.infoModal.show(record)
    },

    // 浏览文件
    handleView() {
      if (this.selectedRowKeys.length !== 1) {
        this.$message.warning('请选择一条记录')
        return
      }

      const record = this.getSelectedRecord()

      // 检查记录是否存在
      if (!record) {
        this.$message.warning('请选择一个ICN！')
        return
      }

      // 检查是否有实体文件
      if (!record.ietmAttachment || !record.ietmAttachment.fileName) {
        this.$message.warning('该ICN没有关联的实体文件')
        return
      }

      const fileName = record.ietmAttachment.fileName
      const fileKey = record.ietmAttachment.fileKey

      // 根据文件扩展名判断文件类型
      const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

      // 构造文件访问URL（根据实际后端配置调整）
      // 检查是否有 nocached 标志，如果有则添加时间戳参数避免缓存
      const nocached = window.localStorage.getItem('icn_nocached')
      let fileUrl = `${window._CONFIG['domianURL']}/sys/common/static/${fileKey}`
      if (nocached === '1') {
        fileUrl += `?t=${new Date().getTime()}`
        // 使用后清除标志
        window.localStorage.removeItem('icn_nocached')
      }

      if (ext === '.mp4' || ext === '.avi' || ext === '.mov' || ext === '.webm' || ext === '.ogg' ||
          ext === '.wmv' || ext === '.rm' || ext === '.mpg') {
        // 视频文件
        this.$refs.playVideo.show(fileUrl, fileName)
      } else if (ext === '.mp3' || ext === '.wav' || ext === '.m4a') {
        // 音频文件
        this.$refs.playAudio.show(fileUrl, fileName)
      } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.bmp' || ext === '.svg' || ext === '.tif' || ext === '.tiff') {
        // 图片文件（扩展支持svg、tif、tiff）
        this.$refs.playImg.show(fileUrl, fileName)
      } else if (ext === '.cgm') {
        // CGM图形文件
        this.$message.info('CGM格式需要专用查看器，正在准备打开...')
        window.open(fileUrl, '_blank')
      } else if (ext === '.wrl') {
        // VRML 3D模型
        this.$message.info('VRML 3D模型需要专用查看器，正在准备打开...')
        window.open(fileUrl, '_blank')
      } else if (ext === '.swf') {
        // Flash动画（注意：现代浏览器已不支持Flash）
        this.$message.warning('Flash格式(.swf)已不被现代浏览器支持，建议转换为其他格式')
      } else if (ext === '.smg') {
        // SMG格式
        this.$message.info('SMG格式需要专用查看器，正在准备打开...')
        window.open(fileUrl, '_blank')
      } else {
        // 其他文件类型，提示不支持预览
        this.$message.warning(`不支持预览 ${ext} 格式的文件，请使用下载功能`)
      }
    },

    // 引用关系
    handleReference() {
      if (this.selectedRowKeys.length !== 1) {
        this.$message.warning('请选择一条记录')
        return
      }

      const record = this.getSelectedRecord()
      if (!record) {
        this.$message.warning('请选择一个ICN！')
        return
      }
      this.$refs.referenceModal.show(record)
    },

    // 下载文件
    handleDownload() {
      if (this.selectedRowKeys.length !== 1) {
        this.$message.warning('请选择一条记录')
        return
      }

      const record = this.getSelectedRecord()

      // 检查记录是否存在
      if (!record) {
        this.$message.warning('请选择一个ICN！')
        return
      }

      // 检查是否有实体文件
      if (!record.ietmAttachment || !record.ietmAttachment.fileKey) {
        this.$message.warning('该ICN没有关联的实体文件')
        return
      }

      const fileName = record.ietmAttachment.fileName
      const fileKey = record.ietmAttachment.fileKey

      // 构造下载URL
      const downloadUrl = `${window._CONFIG['domianURL']}/sys/common/download/${fileKey}`

      // 创建隐藏的a标签触发下载
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      this.$message.success('开始下载文件')
    },

    // 弹窗确认回调
    modalFormOk(eventData) {
      // 如果是新版上传，设置 nocached 标志确保下次预览获取最新文件
      if (eventData && eventData.uploadType === 'new') {
        // 设置全局 nocached 标志，确保文件预览时不使用缓存
        window.localStorage.setItem('icn_nocached', '1')
        // 也可以通过查询参数传递给预览页面
        console.log('新版上传完成，已设置 nocached 标志')
      }
      this.loadData()
    },

    // 获取密级颜色
    getSecurityColor(security) {
      const colorMap = { 1: 'green', 2: 'blue', 3: 'orange', 4: 'red' }
      return colorMap[security] || 'default'
    },

    // 获取密级文本
    getSecurityText(security) {
      const textMap = { 1: '公开', 2: '内部', 3: '秘密', 4: '机密' }
      return textMap[security] || '未知'
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
    },

    // 计算所有DM的引用信息
    handleCalculate() {
      this.$message.info('计算功能开发中...')
    },

    // 清除预览时形成的文件缓存
    handleClearCache() {
      this.$message.info('清除缓存功能开发中...')
    }
  }
}
</script>

<style lang="less" scoped>
.icn-manage-container {
  padding: 0;

  // 工具栏样式
  .toolbar-wrapper {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e8e8e8;

    // 按钮统一样式
    /deep/ .ant-btn {
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

    // 按钮间隙（通过a-space的size属性控制，这里作为备用）
    /deep/ .ant-space-item {
      margin-right: 8px !important;
    }
  }

  // 内容行
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

    /deep/ .ant-card-head {
      border-bottom: 1px solid #e8e8e8;
      background: #fafafa;
      padding: 0 16px;
      min-height: 42px;
    }

    /deep/ .ant-card-body {
      flex: 1;
      overflow: hidden;
      padding: 12px;
      display: flex;
      flex-direction: column;
    }
  }

  // 树操作区域
  .tree-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #f5f7fa;
    border-radius: 4px;

    .ant-checkbox-wrapper {
      font-size: 13px;
    }

    .tree-buttons {
      display: flex;
      gap: 8px;
    }
  }

  // 树滚动区域
  .tree-scroll-wrap {
    flex: 1;
    overflow-y: auto;
    overflow-x: auto;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    padding: 8px;
    background: #fff;

    // 树节点样式优化
    /deep/ .ant-tree {
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

  // 列表卡片
  .list-card {
    height: calc(100vh - 230px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    /deep/ .ant-card-head {
      border-bottom: 1px solid #e8e8e8;
      background: #fafafa;
      padding: 0 16px;
      min-height: 42px;
    }

    /deep/ .ant-card-body {
      flex: 1;
      overflow: hidden;
      padding: 12px;
      display: flex;
      flex-direction: column;
    }

    /deep/ .ant-table-wrapper {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .ant-spin-nested-loading {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;

        .ant-spin-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;

          .ant-table {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;

            .ant-table-content {
              flex: 1;
              overflow: auto;
            }
          }
        }
      }
    }

    // 表格样式优化
    /deep/ .ant-table {
      .ant-table-thead > tr > th {
        background: #fafafa;
        font-weight: 500;
        color: #262626;
        padding: 12px 8px;
      }

      .ant-table-tbody > tr > td {
        padding: 10px 8px;
      }

      .ant-table-tbody > tr:hover {
        background: #e6f7ff;
      }

      // ICN链接样式
      a {
        color: #1890ff;
        transition: color 0.2s;

        &:hover {
          color: #40a9ff;
        }
      }

      // 操作栏样式
      .ant-dropdown-link {
        color: #1890ff;
        cursor: pointer;

        &:hover {
          color: #40a9ff;
        }
      }
    }
  }
}
</style>


