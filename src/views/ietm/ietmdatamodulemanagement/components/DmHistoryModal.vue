<template>
  <a-modal
    title="历史版本"
    :width="1000"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <!-- 顶部信息 -->
      <a-alert
        :message="`当前查看：${currentDmc}`"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 版本列表 -->
      <a-table
        :columns="columns"
        :dataSource="dataSource"
        :pagination="false"
        size="small"
        rowKey="id"
      >
        <span slot="versionInfo" slot-scope="text, record">
          <a-tag color="blue">{{ record.issueNo }}-{{ record.inWork }}</a-tag>
          <a-tag v-if="record.isLatest === '1'" color="green">当前版本</a-tag>
          <a-tag v-if="record.versionType === '1'" color="purple">已发布</a-tag>
        </span>

        <span slot="checkoutInfo" slot-scope="text, record">
          <div v-if="record.checkoutUser">
            <a-icon type="user" /> {{ record.checkoutUser }}
            <br />
            <a-icon type="clock-circle" /> {{ record.checkoutTime }}
          </div>
          <span v-else>-</span>
        </span>

        <span slot="action" slot-scope="text, record">
          <a @click="handleView(record)">查看</a>
          <a-divider type="vertical" />
          <a-dropdown>
            <a>更多 <a-icon type="down" /></a>
            <a-menu slot="overlay">
              <a-menu-item>
                <a @click="handleCompare(record)">对比</a>
              </a-menu-item>
              <a-menu-item>
                <a @click="handleRevert(record)">回退</a>
              </a-menu-item>
              <a-menu-item>
                <a @click="handleExport(record)">导出</a>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>
      </a-table>
    </a-spin>

    <!-- 版本详情抽屉 -->
    <a-drawer
      title="版本详情"
      :width="600"
      :visible="drawerVisible"
      @close="drawerVisible = false"
    >
      <a-descriptions bordered size="small" :column="1">
        <a-descriptions-item label="版本号">
          <a-tag color="blue">{{ selectedVersion.issueNo }}-{{ selectedVersion.inWork }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="技术名称">
          {{ selectedVersion.techName_dictText || selectedVersion.techName }}
        </a-descriptions-item>
        <a-descriptions-item label="信息名称">
          {{ selectedVersion.infoName_dictText || selectedVersion.infoName }}
        </a-descriptions-item>
        <a-descriptions-item label="操作类型">
          {{ selectedVersion.operationType }}
        </a-descriptions-item>
        <a-descriptions-item label="操作用户">
          {{ selectedVersion.checkoutUser || selectedVersion.updateBy }}
        </a-descriptions-item>
        <a-descriptions-item label="操作时间">
          {{ selectedVersion.checkinTime || selectedVersion.updateTime }}
        </a-descriptions-item>
        <a-descriptions-item label="变更说明">
          {{ selectedVersion.remark || '-' }}
        </a-descriptions-item>
      </a-descriptions>

      <a-divider>DM内容</a-divider>
      <pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 12px; border-radius: 4px;">{{ selectedVersion.dmContent || '无内容' }}</pre>
    </a-drawer>

    <!-- 版本对比抽屉 -->
    <a-drawer
      title="版本对比"
      :width="900"
      :visible="compareDrawerVisible"
      @close="compareDrawerVisible = false"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-card title="源版本" size="small">
            <p><strong>版本号：</strong>{{ compareSource.issueNo }}-{{ compareSource.inWork }}</p>
            <p><strong>操作时间：</strong>{{ compareSource.updateTime }}</p>
          </a-card>
        </a-col>
        <a-col :span="12">
          <a-card title="目标版本" size="small">
            <p><strong>版本号：</strong>{{ compareTarget.issueNo }}-{{ compareTarget.inWork }}</p>
            <p><strong>操作时间：</strong>{{ compareTarget.updateTime }}</p>
          </a-card>
        </a-col>
      </a-row>

      <a-divider>内容对比</a-divider>
      <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; max-height: 500px; overflow: auto;">
        <p style="color: #999;">提示：绿色表示新增，红色表示删除</p>
        <pre>{{ diffResult }}</pre>
      </div>
    </a-drawer>
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'

export default {
  name: 'DmHistoryModal',
  data() {
    return {
      visible: false,
      loading: false,
      currentDmc: '',
      currentDmId: '',
      columns: [
        {
          title: '版本号',
          dataIndex: 'versionInfo',
          width: 150,
          scopedSlots: { customRender: 'versionInfo' }
        },
        {
          title: '技术名称',
          dataIndex: 'techName_dictText',
          ellipsis: true
        },
        {
          title: '信息名称',
          dataIndex: 'infoName_dictText',
          ellipsis: true
        },
        {
          title: '签出信息',
          dataIndex: 'checkoutInfo',
          width: 180,
          scopedSlots: { customRender: 'checkoutInfo' }
        },
        {
          title: '更新时间',
          dataIndex: 'updateTime',
          width: 150
        },
        {
          title: '操作',
          dataIndex: 'action',
          width: 150,
          fixed: 'right',
          scopedSlots: { customRender: 'action' }
        }
      ],
      dataSource: [],
      drawerVisible: false,
      selectedVersion: {},
      compareDrawerVisible: false,
      compareSource: {},
      compareTarget: {},
      diffResult: ''
    }
  },
  methods: {
    // 显示弹窗
    show(record) {
      this.visible = true
      this.currentDmc = record.dmcCode || `${record.issueNo}-${record.inWork}`
      this.currentDmId = record.id
      this.loadHistoryVersions(record.sns, record.infoCode, record.infoCodeVariant)
    },

    // 加载历史版本
    loadHistoryVersions(sns, infoCode, infoCodeVariant) {
      this.loading = true
      getAction('/ietm/datamodule/historyVersions', {
        sns,
        infocode: infoCode,
        infocodevariant: infoCodeVariant
      }).then(res => {
        if (res.success) {
          this.dataSource = res.result || []
        } else {
          this.$message.error(res.message || '加载历史版本失败')
        }
      }).finally(() => {
        this.loading = false
      })
    },

    // 查看版本详情
    handleView(record) {
      this.selectedVersion = record
      this.drawerVisible = true
    },

    // 版本对比
    handleCompare(record) {
      // 默认与当前版本对比
      const currentVersion = this.dataSource.find(item => item.isLatest === '1')
      if (!currentVersion) {
        this.$message.warning('未找到当前版本')
        return
      }

      this.compareSource = record
      this.compareTarget = currentVersion
      this.compareDraerVisible = true

      // 执行对比
      this.performCompare()
    },

    // 执行版本对比
    performCompare() {
      const sourceContent = this.compareSource.dmContent || ''
      const targetContent = this.compareTarget.dmContent || ''

      // 简单的文本对比（实际项目中应使用diff库）
      if (sourceContent === targetContent) {
        this.diffResult = '两个版本内容完全相同'
      } else {
        this.diffResult = `源版本内容：\n${sourceContent}\n\n目标版本内容：\n${targetContent}`
      }
    },

    // 回退到指定版本
    handleRevert(record) {
      const that = this
      this.$confirm({
        title: '确认回退',
        content: `确定要回退到版本 ${record.issueNo}-${record.inWork} 吗？这将创建一个新版本。`,
        onOk() {
          postAction('/ietm/datamodule/revert', {
            id: that.currentDmId,
            targetVersionId: record.id
          }).then(res => {
            if (res.success) {
              that.$message.success('回退成功')
              that.loadHistoryVersions(record.sns, record.infoCode, record.infoCodeVariant)
              that.$emit('ok')
            } else {
              that.$message.error(res.message || '回退失败')
            }
          })
        }
      })
    },

    // 导出指定版本
    handleExport(record) {
      window.open(`/ietm/datamodule/exportXml?id=${record.id}`)
    },

    // 关闭弹窗
    handleCancel() {
      this.visible = false
      this.dataSource = []
      this.drawerVisible = false
      this.compareDrawerVisible = false
    }
  }
}
</script>

<style scoped>
.ant-table-small {
  font-size: 12px;
}
</style>
