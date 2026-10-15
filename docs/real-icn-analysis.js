/**
 * 真实ICN格式分析
 *
 * 示例: ICN-ZBBM02-A-A11000-C-JB301-00004-A-001-01
 *
 * 段落分解（10段）：
 * 1.  ICN          - 固定前缀
 * 2.  ZBBM02       - modelIdentCode (机型识别代码)
 * 3.  A            - systemDiffCode (系统差异代码)
 * 4.  A11000       - 系统/子系统/子子系统代码合并（6位）
 * 5.  C            - ??? (originator? 还是其他?)
 * 6.  JB301        - ??? (rpc? 还是责任单位?)
 * 7.  00004        - uniqueId (5位补零)
 * 8.  A            - ???
 * 9.  001          - 固定
 * 10. 01           - 固定
 *
 * 对比旧系统代码逻辑：
 * var icn = 'ICN-'+json.sns+'-'+json.rpc+'-'+json.originator+'-'+uniqueid_+'-A-001-01';
 *           ICN   {3段SNS}    {rpc}     {originator}      {uniqueId}   A   001  01
 *           ICN   ZBBM02-A-A11000  JB301    C              00004       A   001  01
 *
 * 推断：
 * - json.sns = "ZBBM02-A-A11000" (3段)
 * - json.rpc = "JB301"
 * - json.originator = "C"
 * - uniqueid_ = "00004"
 * - 固定段 = "A-001-01"
 *
 * 关键发现：
 * 1. 旧系统代码中的 json.rpc 对应第5段 "JB301"，不是 "C"
 * 2. 旧系统代码中的 json.originator 对应第6段 "C"，不是第8段的 "A"
 * 3. 第8段的 "A" 是硬编码的固定值
 *
 * 等等！代码顺序不对！
 * 让我重新对比：
 *
 * 代码: 'ICN-'+json.sns+'-'+json.rpc+'-'+json.originator+'-'+uniqueid_+'-A-001-01'
 * 实际: ICN-ZBBM02-A-A11000-C-JB301-00004-A-001-01
 *
 * 如果按代码顺序：
 * - json.sns = "ZBBM02-A-A11000" ✓
 * - json.rpc = "C" ??? 这不对，C应该是originator
 * - json.originator = "JB301" ??? 这也不对
 *
 * 问题：代码中的拼接顺序与实际ICN不匹配！
 */

// 真实ICN格式对比
const realIcn = 'ICN-ZBBM02-A-A11000-C-JB301-00004-A-001-01'
const parts = realIcn.split('-')

console.log('实际ICN分段:')
parts.forEach((part, idx) => {
  console.log(`  第${idx + 1}段: ${part}`)
})
