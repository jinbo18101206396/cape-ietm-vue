<template>
  <a-modal
    title="版本对比"
    :width="1200"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-row :gutter="16" style="margin-bottom: 16px;">
      <a-col :span="12">
        <a-select v-model="sourceVersion" placeholder="请选择源版本" style="width: 100%;" @change="loadDiff">
          <a-select-option v-for="v in versionList" :key="v.id" :value="v.id">
            {{ v.issueNo }}-{{ v.inWork }} ({{ v.updateTime }})
          </a-select-option>
        </a-select>
      </a-col>
      <a-col :span="12">
        <a-select v-model="targetVersion" placeholder="请选择目标版本" style="width: 100%;" @change="loadDiff">
          <a-select-option v-for="v in versionList" :key="v.id" :value="v.id">
            {{ v.issueNo }}-{{ v.inWork }} ({{ v.updateTime }})
          </a-select-option>
        </a-select>
      </a-col>
    </a-row>

    <a-spin :spinning="loading">
      <div style="border: 1px solid #d9d9d9; border-radius: 4px; padding: 16px; background: #f5f5f5; min-height: 500px;">
        <pre v-if="diffContent">{{ diffContent }}</pre>
        <a-empty v-else description="请选择两个版本进行对比" />
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'

export default {
  name: 'DmDiffModal',
  data() {
    return {
      visible: false,
      loading: false,
      versionList: [],
      sourceVersion: undefined,
      targetVersion: undefined,
      diffContent: ''
    }
  },
  methods: {
    show(dmId) {
      this.visible = true
      this.loadVersions(dmId)
    },
    loadVersions(dmId) {
      // TODO: 加载版本列表
      this.versionList = []
    },
    loadDiff() {
      if (!this.sourceVersion || !this.targetVersion) return
      
      this.loading = true
      postAction('/ietm/datamodule/compareVersions', {
        sourceVersion: this.sourceVersion,
        targetVersion: this.targetVersion
      }).then(res => {
        if (res.success) {
          this.diffContent = res.result.diff || '无差异'
        }
      }).finally(() => {
        this.loading = false
      })
    },
    handleCancel() {
      this.visible = false
    }
  }
}
</script>
