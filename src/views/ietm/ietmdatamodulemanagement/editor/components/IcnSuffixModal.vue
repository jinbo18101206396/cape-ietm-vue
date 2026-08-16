<template>
  <a-modal
    v-model="visible"
    title="指定 ICN 后缀"
    :width="600"
    :maskClosable="false"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="icn-suffix-modal">
      <p class="tip">请为以下图符引用指定文件后缀：</p>

      <a-form :colon="false">
        <a-form-item
          v-for="(icnInfo, index) in icnList"
          :key="index"
          :label="icnInfo"
          :label-col="{ span: 14 }"
          :wrapper-col="{ span: 10 }"
        >
          <a-select
            v-model="suffixes[index]"
            placeholder="选择后缀"
            :get-popup-container="trigger => trigger.parentNode"
          >
            <a-select-option
              v-for="ext in icnExtOptions"
              :key="ext"
              :value="ext"
            >
              {{ ext }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>

      <p class="note">提示：CGM 是 S1000D 标准推荐的矢量图格式</p>
    </div>
  </a-modal>
</template>

<script>
import { ICN_FILE_EXT } from '../utils/icnFileExt'

export default {
  name: 'IcnSuffixModal',
  data() {
    return {
      visible: false,
      icnList: [],       // 待补后缀的 ICN 清单（含【N行】标注）
      suffixes: [],      // 用户选择的后缀
      icnExtOptions: ICN_FILE_EXT  // 16种合法后缀
    }
  },
  methods: {
    /**
     * 显示弹框
     * @param {string[]} icnList - 无后缀的 ICN 清单，格式：['ICN-001【12行】', 'ICN-002【25行】']
     */
    show(icnList) {
      if (!icnList || icnList.length === 0) {
        return
      }

      this.icnList = icnList
      this.suffixes = Array(icnList.length).fill('.cgm')  // 默认 CGM
      this.visible = true
    },

    /**
     * 确定按钮
     */
    handleOk() {
      // 校验：所有后缀必须选择
      if (this.suffixes.some(s => !s || s.trim() === '')) {
        this.$message.error('需要指定所有文件的后缀。')
        return
      }

      // 校验：所有后缀必须合法
      const invalids = this.suffixes.filter(s => !ICN_FILE_EXT.includes(s.toLowerCase()))
      if (invalids.length > 0) {
        this.$message.error(`以下后缀不合法：${invalids.join(', ')}`)
        return
      }

      // 触发确定事件，传递后缀数组
      this.$emit('ok', this.suffixes)
      this.visible = false
    },

    /**
     * 取消按钮
     */
    handleCancel() {
      this.$emit('cancel')
      this.visible = false
    }
  }
}
</script>

<style scoped>
.icn-suffix-modal .tip {
  margin-bottom: 16px;
  color: rgba(0, 0, 0, 0.65);
}

.icn-suffix-modal .note {
  margin-top: 16px;
  margin-bottom: 0;
  padding: 8px 12px;
  background-color: #e6f7ff;
  border-left: 3px solid #1890ff;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

/* 表单项标签：显示完整 ICN 名称，支持换行 */
.icn-suffix-modal :deep(.ant-form-item-label) {
  white-space: normal;
  line-height: 1.5;
  text-align: left;
}

/* 紧凑布局 */
.icn-suffix-modal :deep(.ant-form-item) {
  margin-bottom: 12px;
}
</style>
