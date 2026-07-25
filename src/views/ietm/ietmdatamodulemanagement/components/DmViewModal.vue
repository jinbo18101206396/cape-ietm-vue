<template>
  <a-modal
    title="数据模块详情"
    :width="1200"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <a-descriptions bordered size="small" :column="2">
        <!-- 基本信息 -->
        <a-descriptions-item label="DMC编码" :span="2">
          <a-tag color="blue" style="font-family: monospace;">{{ model.dmcCode }}</a-tag>
        </a-descriptions-item>

        <a-descriptions-item label="技术名称">
          {{ model.techName_dictText || model.techName }}
        </a-descriptions-item>
        <a-descriptions-item label="信息名称">
          {{ model.infoName_dictText || model.infoName }}
        </a-descriptions-item>

        <a-descriptions-item label="技术名称(英文)">
          {{ model.techNameEn || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="信息名称(英文)">
          {{ model.infoNameEn || '-' }}
        </a-descriptions-item>

        <!-- 版本信息 -->
        <a-descriptions-item label="版本号">
          <a-tag color="blue">{{ model.issueNo }}-{{ model.inWork }}</a-tag>
          <a-tag v-if="model.isLatest === '1'" color="green">最新版本</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="版本类型">
          <a-badge v-if="model.versionType === '1'" status="success" text="已发布" />
          <a-badge v-else status="processing" text="草稿" />
        </a-descriptions-item>

        <!-- DMC编码详情 -->
        <a-descriptions-item label="Schema">
          {{ model.schema || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="SNS编号">
          {{ model.sns || '-' }}
        </a-descriptions-item>

        <a-descriptions-item label="信息代码">
          {{ model.infoCode || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="信息代码变体">
          {{ model.infoCodeVariant || '-' }}
        </a-descriptions-item>

        <a-descriptions-item label="IETM位置码">
          {{ model.ietmLocationCode || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="学习码">
          {{ model.learnCode || '-' }}
        </a-descriptions-item>

        <a-descriptions-item label="学习事件码">
          {{ model.learnEventCode || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="变更年份">
          {{ model.yearOfChange || '-' }}
        </a-descriptions-item>

        <a-descriptions-item label="序列号">
          {{ model.seqNo || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="语言/国家">
          {{ model.languageIsoCode_dictText || model.languageIsoCode || '-' }} / {{ model.countryIsoCode_dictText || model.countryIsoCode || '-' }}
        </a-descriptions-item>

        <!-- 责任信息 -->
        <a-descriptions-item label="发行方代码">
          {{ model.originator || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="发行方名称">
          {{ model.originatorName || '-' }}
        </a-descriptions-item>

        <a-descriptions-item label="责任伙伴公司码">
          {{ model.rpc || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="责任单位名称">
          {{ model.rpcName || '-' }}
        </a-descriptions-item>

        <!-- 项目信息 -->
        <a-descriptions-item label="项目名称">
          {{ model.projectName || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="构型节点">
          {{ model.cmNodeName || '-' }}
        </a-descriptions-item>

        <!-- 签出状态 -->
        <a-descriptions-item label="签出状态">
          <a-tag v-if="model.checkoutUser" color="orange">
            <a-icon type="lock" /> 已签出 ({{ model.checkoutUser }})
          </a-tag>
          <a-tag v-else color="green">
            <a-icon type="unlock" /> 可用
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="签出时间">
          {{ model.checkoutTime || '-' }}
        </a-descriptions-item>

        <a-descriptions-item label="签入时间">
          {{ model.checkinTime || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="发布日期">
          {{ model.publishDate || '-' }}
        </a-descriptions-item>

        <!-- 工作流信息 -->
        <a-descriptions-item label="工作流状态">
          <a-badge v-if="model.workflowStatus === '1'" status="processing" text="审批中" />
          <a-badge v-else-if="model.workflowStatus === '2'" status="success" text="已通过" />
          <a-badge v-else-if="model.workflowStatus === '3'" status="error" text="已拒绝" />
          <a-badge v-else status="default" text="未提交" />
        </a-descriptions-item>
        <a-descriptions-item label="当前处理人">
          {{ model.workflowHandler || '-' }}
        </a-descriptions-item>

        <a-descriptions-item label="工作流实例ID">
          {{ model.workflowInstanceId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="当前流程节点">
          {{ model.workflowStep || '-' }}
        </a-descriptions-item>

        <!-- 其他信息 -->
        <a-descriptions-item label="DM类型">
          {{ model.dmType_dictText || model.dmType || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="密级">
          <a-tag>{{ model.security_dictText || model.security || '0' }}</a-tag>
        </a-descriptions-item>

        <a-descriptions-item label="出引用数量">
          {{ model.refCount || 0 }}
        </a-descriptions-item>
        <a-descriptions-item label="入引用数量">
          {{ model.refedCount || 0 }}
        </a-descriptions-item>

        <a-descriptions-item label="关联资源数量">
          {{ model.resourceCount || 0 }}
        </a-descriptions-item>
        <a-descriptions-item label="附件数量">
          {{ model.attachmentCount || 0 }}
        </a-descriptions-item>

        <!-- 系统信息 -->
        <a-descriptions-item label="创建人">
          {{ model.createBy || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ model.createTime || '-' }}
        </a-descriptions-item>

        <a-descriptions-item label="更新人">
          {{ model.updateBy || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="更新时间">
          {{ model.updateTime || '-' }}
        </a-descriptions-item>

        <!-- DM内容 -->
        <a-descriptions-item label="DM内容" :span="2">
          <a-button v-if="model.dmContent" type="link" @click="showContent">
            <a-icon type="file-text" /> 查看XML内容
          </a-button>
          <span v-else>-</span>
        </a-descriptions-item>
      </a-descriptions>

      <!-- 底部操作按钮 -->
      <div style="margin-top: 16px; text-align: right;">
        <a-space>
          <a-button @click="handlePrint">
            <a-icon type="printer" /> 打印
          </a-button>
          <a-button type="primary" @click="handleExport">
            <a-icon type="download" /> 导出
          </a-button>
          <a-button @click="handleCancel">关闭</a-button>
        </a-space>
      </div>
    </a-spin>

    <!-- XML内容查看弹窗 -->
    <a-modal
      title="DM内容（XML）"
      :width="900"
      :visible="contentVisible"
      :footer="null"
      @cancel="contentVisible = false"
    >
      <pre style="max-height: 600px; overflow: auto; background: #f5f5f5; padding: 16px; border-radius: 4px;">{{ model.dmContent }}</pre>
    </a-modal>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
  name: 'DmViewModal',
  data() {
    return {
      visible: false,
      loading: false,
      contentVisible: false,
      model: {}
    }
  },
  methods: {
    show(id) {
      this.visible = true
      this.loading = true
      this.model = {}

      getAction('/ietm/datamodule/queryById', { id }).then(res => {
        if (res.success) {
          this.model = res.result
        } else {
          this.$message.error(res.message || '加载失败')
          this.handleCancel()
        }
      }).finally(() => {
        this.loading = false
      })
    },

    showContent() {
      this.contentVisible = true
    },

    handlePrint() {
      window.print()
    },

    handleExport() {
      const id = this.model.id
      window.open(`/api/ietm/datamodule/exportXml?id=${id}`, '_blank')
    },

    handleCancel() {
      this.visible = false
      this.contentVisible = false
      this.model = {}
    }
  }
}
</script>

<style scoped>
.ant-descriptions-item-label {
  font-weight: 500;
}
</style>
