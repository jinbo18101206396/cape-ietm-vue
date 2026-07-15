<template>
  <j-modal
    :title="title"
    :width="900"
    :visible="ruleModalVisible"
    :maskClosable="false"
    switchFullscreen
    @ok="handleOk"
    :okButtonProps="{ class:{'jee-hidden': disableSubmit} }"
    @cancel="handleCancel">

    <div>
      <a-table
        :columns="columns"
        :data-source="dataSource"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
        class="custom-table"
      />
    </div>
  </j-modal>
</template>

<script>

export default {
  name: 'IetmCodeRuleModal',
  components: {},
  data() {
    return {
      title: '',
      width: 900,
      ruleModalVisible: false,
      disableSubmit: false,

      rows: [
        ['方案：', 'AAAA', '000', '0', '0', '0000', '00', 'AAA'],
        ['类型：', '区分码', '系统', '子系统', '子子系统', '部件', '拆分码', '拆分码变量'],
        ['宽度：', 3, 3, 1, 1, 2, 2, 2]
      ],
      dataSource: [], // 转换后的对象数组
      dynamicRow0: [] // 用于存储第一行动态生成的数据
    }
  },
  created() {
    this.dataSource = this.rows.map((row, index) => {
      const obj = {};
      row.forEach((value, i) => {
        obj[`col${i}`] = value;
      });
      obj.key = `row${index}`; // 必须的 key
      return obj;
    });

    this.dynamicRow0 = this.rows[0];
  },
  computed: {
    columns() {
      const cols = [];
      for (let i = 0; i < 8; i++) {
        cols.push({
          title: '',
          dataIndex: `col${i}`,
          key: `col${i}`,
          align: 'center',
          customRender: (text, record, index) => {
            const colIndex = i;
            const rowIndex = index;

            if (rowIndex === 0) {
              if (colIndex === 0) {
                return record[`col${colIndex}`]; // 左侧表头
              } else {
                const width = this.rows[2][colIndex];
                const originalData = this.rows[0][colIndex];
                return originalData.slice(0, width);
              }
            } else if (rowIndex === 1) {
              if (colIndex === 0) {
                return record[`col${colIndex}`]; // 左侧表头
              } else {
                return this.rows[1][colIndex]; // 静态数据
              }
            } else if (rowIndex === 2) {
              if (colIndex === 0) {
                return record[`col${colIndex}`]; // 左侧表头
              } else {
                // 第三行数据列渲染为下拉框
                let options = [];
                let disabled = false;

                if (colIndex === 1) {
                  options = [4, 3, 2, 1];
                } else if (colIndex === 2) {
                  options = [3, 2];
                } else if (colIndex === 3) {
                  options = [1];
                  disabled = true;
                } else if (colIndex === 4) {
                  options = [1];
                  disabled = true;
                } else if (colIndex === 5) {
                  options = [4, 2];
                } else if (colIndex === 6) {
                  options = [2];
                  disabled = true;
                } else if (colIndex === 7) {
                  options = [3, 2, 1];
                  disabled = false;
                }

                return (
                  <a-select
                    value={record[`col${colIndex}`]}
                    disabled={disabled}
                    onChange={(value) => this.handleWidthChange(colIndex, value)}
                  >
                    {options.map(option => (
                      <a-select-option key={option} value={option}>
                        {option} {disabled ? '' : ''}
                      </a-select-option>
                    ))}
                  </a-select>
                );
              }
            }
          }
        });
      }
      return cols;
    }
  },
  methods: {
    handleWidthChange(colIndex, value) {
      this.rows[2][colIndex] = value;
      // 重新计算第一行的动态数据
      this.dynamicRow0 = this.rows[0].map((cell, idx) => {
        const width = this.rows[2][idx];
        return cell.slice(0, width);
      });
      // 更新 dataSource（保持表格渲染正确）
      this.dataSource = this.rows.map((row, index) => {
        const obj = {};
        row.forEach((value, i) => {
          obj[`col${i}`] = value;
        });
        obj.key = `row${index}`;
        return obj;
      });
    },
    close() {
      this.$emit('close');
      this.ruleModalVisible = false;
    },
    handleOk() {
      let ruleCode = "";
      this.dynamicRow0.forEach(p => {
        if (p != "" && p != "方案："){
          ruleCode = ruleCode + p + "-";
        }
      })
      this.$emit("getRuleCode", ruleCode.trim().slice(0,-1));
      this.ruleModalVisible = false;
    },
    submitCallback() {
      this.$emit('ok');
      this.ruleModalVisible = false;
    },
    handleCancel() {
      this.close()
    }
  }
}
</script>

<style scoped>
/* 自定义列宽保持一致 */
.ant-table-cell {
  white-space: nowrap;
  padding: 8px 12px;
}
</style>
