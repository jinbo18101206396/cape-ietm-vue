<template>
  <a-modal
    title="复制项目"
    :width="1200"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="关闭"
    :bodyStyle="{ height: '600px', overflowY: 'auto' }">

    <a-spin :spinning="confirmLoading">
      <a-row style="margin-bottom: 16px" type="flex" align="middle">
        <!-- 左侧：选择来源项目 -->
        <a-col :span="12">
          <a-form-model ref="form" :model="model" :label-col="{span: 8}" :wrapper-col="{span: 16}">
            <a-form-model-item label="选择来源项目" prop="sourceProjectId" style="margin-bottom: 0">
              <a-select v-model="model.sourceProjectId" placeholder="请选择来源项目"
                        @change="handleSourceChange" style="width: 100%">
                <a-select-option v-for="item in projectList" :key="item.id" :value="item.id">
                  {{ item.name }}
                </a-select-option>
              </a-select>
            </a-form-model-item>
          </a-form-model>
        </a-col>

        <!-- 右侧：当前选中项目 -->
        <a-col :span="12">
          <a-form-model :label-col="{span: 8}" :wrapper-col="{span: 16}">
            <a-form-model-item label="当前选中项目" style="margin-bottom: 0">
              <a-tag color="blue" style="font-size: 13px; padding: 4px 11px">
                {{ targetProjectName || '未知项目' }}
              </a-tag>
            </a-form-model-item>
          </a-form-model>
        </a-col>
      </a-row>

      <a-tabs v-model="activeKey" v-if="model.sourceProjectId">
        <a-tab-pane key="code" tab="项目信息码">
          <a-row :gutter="16">
            <a-col :span="11">
              <a-card size="small" title="来源项目信息码" :bordered="true">
                <a-table
                  size="small"
                  :columns="infocodeColumns"
                  :data-source="sourceInfocodeList"
                  :row-key="record => record.id"
                  :row-selection="{selectedRowKeys: selectedInfocodeKeys, onChange: onInfocodeSelectChange}"
                  :pagination="false"
                  :scroll="{ y: 400 }"
                  :loading="sourceInfocodeLoading"
                  bordered>
                  <span slot="customTitle">
                    <a-icon type="database" /> 信息码列表
                  </span>
                </a-table>
              </a-card>
            </a-col>

            <a-col :span="2" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding-top: 120px;">
              <a-tooltip title="复制选中的信息码">
                <a-button type="primary" icon="right" @click="copySelectedInfocode"
                          :disabled="selectedInfocodeKeys.length === 0"
                          style="margin-bottom: 10px; white-space: nowrap;">
                  复制选中
                </a-button>
              </a-tooltip>
              <a-tooltip title="复制所有信息码">
                <a-button type="primary" icon="double-right" @click="copyAllInfocode"
                          :disabled="sourceInfocodeList.length === 0"
                          style="white-space: nowrap;">
                  全部复制
                </a-button>
              </a-tooltip>
            </a-col>

            <a-col :span="11">
              <a-card size="small" title="当前项目信息码" :bordered="true">
                <a-button slot="extra" type="link" icon="reload" @click="loadTargetInfocode" size="small">
                  刷新
                </a-button>
                <a-table
                  size="small"
                  :columns="infocodeColumns"
                  :data-source="targetInfocodeList"
                  :pagination="false"
                  :scroll="{ y: 400 }"
                  :loading="targetInfocodeLoading"
                  bordered>
                </a-table>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>

        <a-tab-pane key="config" tab="项目构型">
          <a-row :gutter="16">
            <a-col :span="11">
              <a-card size="small" title="来源项目构型" :bordered="true" :bodyStyle="{ height: '400px', overflowY: 'auto' }">
                <a-spin :spinning="sourceConfigLoading">
                  <a-tree
                    v-if="sourceConfigTree.length > 0"
                    :tree-data="sourceConfigTree"
                    :default-expand-all="true"
                    :show-icon="true">
                    <a-icon slot="folder" type="folder" />
                    <a-icon slot="file" type="file" />
                  </a-tree>
                  <a-empty v-else description="暂无构型数据" />
                </a-spin>
              </a-card>
            </a-col>

            <a-col :span="2" style="display: flex; flex-direction: column; justify-content: center; align-items: center; padding-top: 120px;">
              <a-tooltip title="复制所有构型">
                <a-button type="primary" icon="double-right" @click="copyAllConfig"
                          :disabled="sourceConfigTree.length === 0"
                          style="white-space: nowrap;">
                  全部复制
                </a-button>
              </a-tooltip>
            </a-col>

            <a-col :span="11">
              <a-card size="small" title="当前项目构型" :bordered="true" :bodyStyle="{ height: '400px', overflowY: 'auto' }">
                <a-button slot="extra" type="link" icon="reload" @click="loadTargetConfig" size="small">
                  刷新
                </a-button>
                <a-spin :spinning="targetConfigLoading">
                  <a-tree
                    v-if="targetConfigTree.length > 0"
                    :tree-data="targetConfigTree"
                    :default-expand-all="true"
                    :show-icon="true">
                    <a-icon slot="folder" type="folder" />
                    <a-icon slot="file" type="file" />
                  </a-tree>
                  <a-empty v-else description="暂无构型数据" />
                </a-spin>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>
      </a-tabs>

      <a-empty v-else description="请先选择来源项目" style="margin-top: 50px;" />
    </a-spin>

  </a-modal>
</template>

<script>
import { getAction, postAction } from '@/api/manage'

export default {
  name: 'IetmCopyProjectModal',
  data() {
    return {
      visible: false,
      confirmLoading: false,
      activeKey: 'code',
      targetProjectId: '',
      targetProjectName: '',
      model: {
        sourceProjectId: ''
      },
      projectList: [],
      selectedInfocodeKeys: [],
      sourceInfocodeList: [],
      targetInfocodeList: [],
      sourceConfigTree: [],
      targetConfigTree: [],
      sourceInfocodeLoading: false,
      targetInfocodeLoading: false,
      sourceConfigLoading: false,
      targetConfigLoading: false,
      infocodeColumns: [
        {
          title: '编码',
          dataIndex: 'code',
          width: '40%',
          ellipsis: true
        },
        {
          title: '数据模块类型',
          dataIndex: 'dmtypeName',
          width: '60%',
          ellipsis: true
        }
      ]
    }
  },
  methods: {
    show(targetProjectId, targetProjectName) {
      this.visible = true;
      this.targetProjectId = targetProjectId;
      this.targetProjectName = targetProjectName || '';
      this.loadProjectList();
      this.loadTargetInfocode();
      this.loadTargetConfig();
    },

    handleCancel() {
      this.visible = false;
      this.model = { sourceProjectId: '' };
      this.selectedInfocodeKeys = [];
      this.sourceInfocodeList = [];
      this.targetInfocodeList = [];
      this.sourceConfigTree = [];
      this.targetConfigTree = [];
      this.activeKey = 'code';
    },

    handleOk() {
      this.$message.success('复制操作已完成！');
      this.handleCancel();
      this.$emit('ok');
    },

    loadProjectList() {
      getAction('/ietmproject/ietmProject/listData').then(res => {
        if (res.success) {
          this.projectList = res.result.filter(item => item.id !== this.targetProjectId);
          // 默认选中第一项
          if (this.projectList.length > 0) {
            this.model.sourceProjectId = this.projectList[0].id;
            this.handleSourceChange(this.projectList[0].id);
          }
        } else {
          this.$message.error(res.message || '加载项目列表失败！');
        }
      });
    },

    handleSourceChange(value) {
      this.selectedInfocodeKeys = [];
      this.loadSourceInfocode(value);
      this.loadSourceConfig(value);
    },

    loadSourceInfocode(projectId) {
      this.sourceInfocodeLoading = true;
      // 调用接口加载来源项目信息码
      getAction('/projectinformationcode/ietmProjectInformationCode/list', { projectId }).then(res => {
        this.sourceInfocodeLoading = false;
        if (res.success) {
          this.sourceInfocodeList = res.result.records || res.result || [];
        } else {
          this.sourceInfocodeList = [];
        }
      }).catch(err => {
        this.sourceInfocodeLoading = false;
        this.sourceInfocodeList = [];
      });
    },

    loadTargetInfocode() {
      this.targetInfocodeLoading = true;
      // 调用接口加载目标项目信息码
      getAction('/projectinformationcode/ietmProjectInformationCode/list', { projectId: this.targetProjectId }).then(res => {
        this.targetInfocodeLoading = false;
        if (res.success) {
          this.targetInfocodeList = res.result.records || res.result || [];
        } else {
          this.targetInfocodeList = [];
        }
      }).catch(() => {
        this.targetInfocodeLoading = false;
        this.targetInfocodeList = [];
      });
    },

    loadSourceConfig(projectId) {
      this.sourceConfigLoading = true;
      // 调用接口加载来源项目构型树
      getAction('/projectconfigurationmanagement/ietmProjectConfigurationManagement/getTreeList', { projectId }).then(res => {
        this.sourceConfigLoading = false;
        if (res.success) {
          this.sourceConfigTree = res.result || [];
        } else {
          this.sourceConfigTree = [];
        }
      }).catch(() => {
        this.sourceConfigLoading = false;
        this.sourceConfigTree = [];
      });
    },

    loadTargetConfig() {
      this.targetConfigLoading = true;
      // 调用接口加载目标项目构型树
      getAction('/projectconfigurationmanagement/ietmProjectConfigurationManagement/getTreeList', { projectId: this.targetProjectId }).then(res => {
        this.targetConfigLoading = false;
        if (res.success) {
          this.targetConfigTree = res.result || [];
        } else {
          this.targetConfigTree = [];
        }
      }).catch(() => {
        this.targetConfigLoading = false;
        this.targetConfigTree = [];
      });
    },

    onInfocodeSelectChange(selectedRowKeys) {
      this.selectedInfocodeKeys = selectedRowKeys;
    },

    copySelectedInfocode() {
      if (this.selectedInfocodeKeys.length === 0) {
        this.$message.warning('请选择要复制的信息码！');
        return;
      }
      this.confirmLoading = true;
      // 调用接口复制选中的信息码
      postAction('/projectinformationcode/ietmProjectInformationCode/copy', {
        sourceProjectId: this.model.sourceProjectId,
        targetProjectId: this.targetProjectId,
        infocodeIds: this.selectedInfocodeKeys
      }).then(res => {
        this.confirmLoading = false;
        if (res.success) {
          this.$message.success('信息码复制成功！');
          this.loadTargetInfocode();
          this.selectedInfocodeKeys = [];
        } else {
          this.$message.error(res.message || '信息码复制失败！');
        }
      }).catch(() => {
        this.confirmLoading = false;
        this.$message.error('信息码复制失败！');
      });
    },

    copyAllInfocode() {
      if (!this.model.sourceProjectId) {
        this.$message.warning('请先选择来源项目！');
        return;
      }
      if (this.sourceInfocodeList.length === 0) {
        this.$message.warning('来源项目暂无信息码数据！');
        return;
      }
      this.confirmLoading = true;
      // 调用接口复制所有信息码
      postAction('/projectinformationcode/ietmProjectInformationCode/copyAll', {
        sourceProjectId: this.model.sourceProjectId,
        targetProjectId: this.targetProjectId
      }).then(res => {
        this.confirmLoading = false;
        if (res.success) {
          this.$message.success('所有信息码复制成功！');
          this.loadTargetInfocode();
        } else {
          this.$message.error(res.message || '信息码复制失败！');
        }
      }).catch(() => {
        this.confirmLoading = false;
        this.$message.error('信息码复制失败！');
      });
    },

    copyAllConfig() {
      if (!this.model.sourceProjectId) {
        this.$message.warning('请先选择来源项目！');
        return;
      }
      if (this.sourceConfigTree.length === 0) {
        this.$message.warning('来源项目暂无构型数据！');
        return;
      }
      this.confirmLoading = true;
      // 调用接口复制所有构型
      postAction('/projectconfigurationmanagement/ietmProjectConfigurationManagement/copyAll', {
        sourceProjectId: this.model.sourceProjectId,
        targetProjectId: this.targetProjectId
      }).then(res => {
        this.confirmLoading = false;
        if (res.success) {
          this.$message.success('项目构型复制成功！');
          this.loadTargetConfig();
        } else {
          this.$message.error(res.message || '构型复制失败！');
        }
      }).catch(() => {
        this.confirmLoading = false;
        this.$message.error('构型复制失败！');
      });
    }
  }
}
</script>

<style scoped>
.ant-table {
  font-size: 12px;
}
</style>
