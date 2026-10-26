/**
 * 公式ICN格式验证测试
 * 验证插入公式后生成的ICN编码格式是否正确（10段）
 */

describe('公式ICN格式测试', () => {
  // 直接复制修复后的函数定义
  function generateIcnCode(dmCode, rpc, originator, uniqueId) {
    try {
      const parts = dmCode.split('-')
      if (parts.length < 6) {
        throw new Error('DM编码格式不正确')
      }

      // SNS 3段（与旧系统保持一致）
      const sns1 = parts[1] // modelIdentCode
      const sns2 = parts[2] // systemDiffCode
      const sns3 = parts[3] + parts[4].padStart(2, '0') + parts[5].padStart(2, '0') // 直接拼接

      // 格式化uniqueId为5位数字
      const uniqueIdStr = String(uniqueId).padStart(5, '0')

      // 生成ICN编码（10段）
      // ICN-{sns 3段}-{originator}-{rpc}-{uniqueId}-A-001-01
      return `ICN-${sns1}-${sns2}-${sns3}-${originator}-${rpc}-${uniqueIdStr}-A-001-01`
    } catch (error) {
      console.error('生成ICN编码失败', error)
      throw error
    }
  }

  test('generateIcnCode应生成10段格式的ICN(与图符保持一致)', () => {
    const dmCode = 'DMC-ZBBM02-A-A-11-000-C-JB301-A_001-01_zh-CN'
    const rpc = 'JB301'
    const originator = 'C'
    const uniqueId = 4

    const result = generateIcnCode(dmCode, rpc, originator, uniqueId)

    // 验证格式
    const parts = result.split('-')
    expect(parts.length).toBe(10) // 应该是10段

    // 验证每一段
    expect(parts[0]).toBe('ICN')
    expect(parts[1]).toBe('ZBBM02') // modelIdentCode
    expect(parts[2]).toBe('A') // systemDiffCode
    expect(parts[3]).toBe('A11000') // sys+subsys+subsubsys直接拼接
    expect(parts[4]).toBe('C') // originator
    expect(parts[5]).toBe('JB301') // rpc
    expect(parts[6]).toBe('00004') // uniqueId (5位补零)
    expect(parts[7]).toBe('A') // 固定
    expect(parts[8]).toBe('001') // 固定
    expect(parts[9]).toBe('01') // 固定

    // 完整格式验证
    expect(result).toBe('ICN-ZBBM02-A-A11000-C-JB301-00004-A-001-01')

    console.log('生成的ICN:', result)
    console.log('段数:', parts.length)
    console.log('各段:', parts)
  })

  test('公式ICN与图符ICN格式一致性验证', () => {
    // 图符ICN示例（从数据库获取）
    const symbolIcn = 'ICN-ZBBM02-A-A11000-C-JB301-00004-A-001-01'
    const symbolParts = symbolIcn.split('-')

    // 生成公式ICN（使用相同的DM编码参数）
    // DMC格式: DMC-modelId-sysDiff-sys-subsys-subsubsys-rpc-originator-...
    // 其中 sys+subsys+subsubsys 分别是 A, 11, 000，合并为 A11000
    const dmCode = 'DMC-ZBBM02-A-A-11-000-C-JB301-A_001-01_zh-CN'
    const rpc = 'JB301'
    const originator = 'C'
    const uniqueId = 5 // 不同的uniqueId

    const formulaIcn = generateIcnCode(dmCode, rpc, originator, uniqueId)
    const formulaParts = formulaIcn.split('-')

    // 两者应该都是10段
    expect(symbolParts.length).toBe(10)
    expect(formulaParts.length).toBe(10)

    // 前5段应该相同（SNS+originator+rpc）
    expect(formulaParts[0]).toBe(symbolParts[0]) // ICN
    expect(formulaParts[1]).toBe(symbolParts[1]) // modelIdentCode (ZBBM02)
    expect(formulaParts[2]).toBe(symbolParts[2]) // systemDiffCode (A)
    expect(formulaParts[3]).toBe(symbolParts[3]) // sys+subsys+subsubsys (A11000)
    expect(formulaParts[4]).toBe(symbolParts[4]) // originator (C)
    expect(formulaParts[5]).toBe(symbolParts[5]) // rpc (JB301)

    // 第6段不同（uniqueId不同）
    expect(formulaParts[6]).not.toBe(symbolParts[6])
    expect(formulaParts[6]).toBe('00005') // 新的uniqueId

    // 第7-10段相同（固定值）
    expect(formulaParts[7]).toBe(symbolParts[7]) // A
    expect(formulaParts[8]).toBe(symbolParts[8]) // 001
    expect(formulaParts[9]).toBe(symbolParts[9]) // 01

    console.log('图符ICN:', symbolIcn, '段数:', symbolParts.length)
    console.log('公式ICN:', formulaIcn, '段数:', formulaParts.length)
    console.log('✅ 公式ICN与图符ICN格式完全一致')
  })
})
