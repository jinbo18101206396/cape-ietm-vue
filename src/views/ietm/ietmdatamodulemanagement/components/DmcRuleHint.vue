<template>
  <a-card size="small" title="DMC编码规则" :bordered="false" style="margin-bottom: 10px;">
    <div class="dmc-rule-content">
      <a-alert
        message="DMC编码规则说明"
        description="DMC由11段组成，自动生成，格式如下："
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 10px;"
      />

      <a-collapse :bordered="false" default-active-key="1">
        <a-collapse-panel key="1" header="查看详细规则">
          <div class="rule-section">
            <h4>DMC = SCHEMA-SNS-INFOCODE-VARIANT-LOCATION-[LEARN]-ORIGINATOR-SCHEMA-YEAR-ISSUENO-INWORK</h4>

            <a-descriptions :column="1" size="small" bordered style="margin-top: 10px;">
              <a-descriptions-item label="第1段 SCHEMA">
                模式代码，固定值："SCHEMA"
              </a-descriptions-item>

              <a-descriptions-item label="第2段 SNS">
                系统编号码（System Number），如：S1000D
              </a-descriptions-item>

              <a-descriptions-item label="第3段 INFOCODE">
                信息码（3位），如：001、002
              </a-descriptions-item>

              <a-descriptions-item label="第4段 VARIANT">
                信息码变量（A-Z大写），可选
              </a-descriptions-item>

              <a-descriptions-item label="第5段 LOCATION">
                IETM位置码（A/B/C/D/T），可选
              </a-descriptions-item>

              <a-descriptions-item label="第6段 LEARN">
                学习码（000-999）+ 事件码（A-Z），可选，用[]标识
              </a-descriptions-item>

              <a-descriptions-item label="第7段 ORIGINATOR">
                发行方代码（责任单位代码）
              </a-descriptions-item>

              <a-descriptions-item label="第8段 SCHEMA">
                固定文本"SCHEMA"
              </a-descriptions-item>

              <a-descriptions-item label="第9段 YEAR">
                变更年代码（年份后2位），如：26表示2026年
              </a-descriptions-item>

              <a-descriptions-item label="第10段 ISSUENO">
                发行编号（001-999）
              </a-descriptions-item>

              <a-descriptions-item label="第11段 INWORK">
                在编编号（00-99）
              </a-descriptions-item>
            </a-descriptions>

            <div style="margin-top: 10px;">
              <h4>示例：</h4>
              <a-tag color="blue" style="font-family: monospace; padding: 5px 10px;">
                SCHEMA-S1000D-001-A-C-[001A]-ORG001-SCHEMA-26-001-00
              </a-tag>
            </div>

            <div style="margin-top: 10px;">
              <h4>版本号规则：</h4>
              <ul>
                <li><strong>签入</strong>：INWORK +1（00→01→...→99）</li>
                <li><strong>发布</strong>：ISSUENO +1，INWORK 重置为00</li>
                <li><strong>边界</strong>：INWORK达到99必须先发布，ISSUENO上限999</li>
              </ul>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </a-card>
</template>

<script>
export default {
  name: 'DmcRuleHint'
}
</script>

<style lang="less" scoped>
.dmc-rule-content {
  .rule-section {
    h4 {
      color: #1890ff;
      margin: 10px 0;
      font-weight: 600;
    }

    ul {
      padding-left: 20px;
      li {
        margin: 5px 0;
        line-height: 1.8;
      }
    }
  }
}
</style>
