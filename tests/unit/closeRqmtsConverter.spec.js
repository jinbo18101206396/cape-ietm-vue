/**
 * closeRqmts XML 转换器单元测试
 *
 * @author IETM Team
 * @date 2026-11-14
 */

import { closeRqmts2object, object2closeRqmts } from '../closeRqmtsConverter'

describe('closeRqmtsConverter', () => {

  // ========== closeRqmts2object 测试 ==========

  describe('closeRqmts2object', () => {

    it('应正确解析无必要条件（noConds）', async () => {
      const xml = `
        <closeRqmts>
          <reqCondGroup>
            <noConds></noConds>
          </reqCondGroup>
        </closeRqmts>
      `

      const obj = await closeRqmts2object(null, xml)

      expect(obj.hasConditions).toBe(false)
      expect(obj.conditions).toHaveLength(0)
    })

    it('应正确解析空closeRqmts标签', async () => {
      const xml = '<closeRqmts></closeRqmts>'

      const obj = await closeRqmts2object(null, xml)

      expect(obj.hasConditions).toBe(false)
      expect(obj.conditions).toHaveLength(0)
    })

    it('应正确解析无引用条件（reqCondNoRef）', async () => {
      const xml = `
        <closeRqmts>
          <reqCondGroup>
            <reqCondNoRef>
              <reqCond>清理工作区域</reqCond>
            </reqCondNoRef>
          </reqCondGroup>
        </closeRqmts>
      `

      const obj = await closeRqmts2object(null, xml)

      expect(obj.hasConditions).toBe(true)
      expect(obj.conditions).toHaveLength(1)
      expect(obj.conditions[0].type).toBe(1)
      expect(obj.conditions[0].xml).toContain('清理工作区域')
      expect(obj.conditions[0].ref).toBe('')
      expect(obj.conditions[0].refData).toBeNull()
    })

    it('应正确解析DM引用条件（reqCondDm）', async () => {
      const xml = `
        <closeRqmts>
          <reqCondGroup>
            <reqCondDm>
              <reqCond>参考维护手册</reqCond>
              <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
                <dmRefIdent>
                  <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00"
                          subSystemCode="0" subSubSystemCode="0" assyCode="00"
                          disassyCode="00" disassyCodeVariant="A" infoCode="000"
                          infoCodeVariant="A" itemLocationCode="A"/>
                  <issueInfo issueNumber="000" inWork="01"/>
                  <language languageIsoCode="zh" countryIsoCode="CN"/>
                </dmRefIdent>
              </dmRef>
            </reqCondDm>
          </reqCondGroup>
        </closeRqmts>
      `

      const obj = await closeRqmts2object(null, xml)

      expect(obj.hasConditions).toBe(true)
      expect(obj.conditions).toHaveLength(1)
      expect(obj.conditions[0].type).toBe(2)
      expect(obj.conditions[0].xml).toContain('参考维护手册')
      expect(obj.conditions[0].ref).toContain('DMC-TEST')
      expect(obj.conditions[0].refData).not.toBeNull()
      expect(obj.conditions[0].refData.modelIdentCode).toBe('TEST')
    })

    it('应正确解析PM引用条件（reqCondPm）', async () => {
      const xml = `
        <closeRqmts>
          <reqCondGroup>
            <reqCondPm>
              <reqCond>查阅出版模块</reqCond>
              <pmRef>
                <pmRefIdent>
                  <pmCode modelIdentCode="SAMPLE" pmIssuer="AVICI" pmNumber="00005" pmVolume="02"/>
                  <issueInfo issueNumber="000" inWork="01"/>
                  <language languageIsoCode="zh" countryIsoCode="CN"/>
                </pmRefIdent>
              </pmRef>
            </reqCondPm>
          </reqCondGroup>
        </closeRqmts>
      `

      const obj = await closeRqmts2object(null, xml)

      expect(obj.hasConditions).toBe(true)
      expect(obj.conditions).toHaveLength(1)
      expect(obj.conditions[0].type).toBe(3)
      expect(obj.conditions[0].ref).toContain('PMC-SAMPLE')
      expect(obj.conditions[0].refData).not.toBeNull()
      expect(obj.conditions[0].refData.pmIssuer).toBe('AVICI')
    })

    it('应正确解析外部出版物条件（reqCondExternalPub）', async () => {
      const xml = `
        <closeRqmts>
          <reqCondGroup>
            <reqCondExternalPub>
              <reqCond>参考外部文档</reqCond>
            </reqCondExternalPub>
          </reqCondGroup>
        </closeRqmts>
      `

      const obj = await closeRqmts2object(null, xml)

      expect(obj.hasConditions).toBe(true)
      expect(obj.conditions).toHaveLength(1)
      expect(obj.conditions[0].type).toBe(4)
      expect(obj.conditions[0].ref).toBe('')
    })

    it('应正确解析多种条件混合', async () => {
      const xml = `
        <closeRqmts>
          <reqCondGroup>
            <reqCondNoRef>
              <reqCond>条件1</reqCond>
            </reqCondNoRef>
            <reqCondDm>
              <reqCond>条件2</reqCond>
              <dmRef>
                <dmRefIdent>
                  <dmCode modelIdentCode="M1" systemDiffCode="A" systemCode="28"
                          subSystemCode="6" subSubSystemCode="0" assyCode="04"
                          disassyCode="00" disassyCodeVariant="A" infoCode="520"
                          infoCodeVariant="A" itemLocationCode="A"/>
                </dmRefIdent>
              </dmRef>
            </reqCondDm>
            <reqCondNoRef>
              <reqCond>条件3</reqCond>
            </reqCondNoRef>
          </reqCondGroup>
        </closeRqmts>
      `

      const obj = await closeRqmts2object(null, xml)

      expect(obj.hasConditions).toBe(true)
      expect(obj.conditions).toHaveLength(3)
      expect(obj.conditions[0].type).toBe(1)
      expect(obj.conditions[1].type).toBe(2)
      expect(obj.conditions[2].type).toBe(1)
    })

    it('应处理空XML抛出异常', async () => {
      await expect(closeRqmts2object(null, '')).rejects.toThrow('XML内容不能为空')
    })

    it('应处理格式错误的XML抛出异常', async () => {
      const invalidXml = '<closeRqmts><reqCondGroup>'
      await expect(closeRqmts2object(null, invalidXml)).rejects.toThrow()
    })

    it('应处理缺少closeRqmts元素的XML', async () => {
      const xml = '<dmodule><content></content></dmodule>'
      await expect(closeRqmts2object(null, xml)).rejects.toThrow('找不到<closeRqmts>元素')
    })

    it('应兼容缺少reqCondGroup的旧数据', async () => {
      const xml = '<closeRqmts></closeRqmts>'

      const obj = await closeRqmts2object(null, xml)

      expect(obj.hasConditions).toBe(false)
      expect(obj.conditions).toHaveLength(0)
    })
  })

  // ========== object2closeRqmts 测试 ==========

  describe('object2closeRqmts', () => {

    it('应正确生成无必要条件XML', async () => {
      const obj = {
        hasConditions: false,
        conditions: []
      }

      const xml = await object2closeRqmts(null, obj)

      expect(xml).toContain('<closeRqmts>')
      expect(xml).toContain('<reqCondGroup>')
      expect(xml).toContain('<noConds>')
      expect(xml).toContain('</closeRqmts>')
    })

    it('应正确生成无引用条件XML', async () => {
      const obj = {
        hasConditions: true,
        conditions: [
          { type: 1, xml: '<para>清理工作区域</para>', ref: '', refData: null }
        ]
      }

      const xml = await object2closeRqmts(null, obj)

      expect(xml).toContain('<reqCondNoRef>')
      expect(xml).toContain('<reqCond>')
      expect(xml).toContain('清理工作区域')
      expect(xml).toContain('</reqCondNoRef>')
    })

    it('应正确生成DM引用条件XML', async () => {
      const obj = {
        hasConditions: true,
        conditions: [
          {
            type: 2,
            xml: '<para>参考维护手册</para>',
            ref: 'DMC-TEST-A-00-00-00-00A-000A-A',
            refData: {
              modelIdentCode: 'TEST',
              systemDiffCode: 'A',
              systemCode: '00',
              subSystemCode: '0',
              subSubSystemCode: '0',
              assyCode: '00',
              disassyCode: '00',
              disassyCodeVariant: 'A',
              infoCode: '000',
              infoCodeVariant: 'A',
              itemLocationCode: 'A',
              issueNumber: '000',
              inWork: '01',
              languageIsoCode: 'zh',
              countryIsoCode: 'CN'
            }
          }
        ]
      }

      const xml = await object2closeRqmts(null, obj)

      expect(xml).toContain('<reqCondDm>')
      expect(xml).toContain('<reqCond>参考维护手册</reqCond>')
      expect(xml).toContain('<dmRef')
      expect(xml).toContain('modelIdentCode="TEST"')
      expect(xml).toContain('</reqCondDm>')
    })

    it('应正确生成PM引用条件XML', async () => {
      const obj = {
        hasConditions: true,
        conditions: [
          {
            type: 3,
            xml: '<para>查阅出版模块</para>',
            ref: 'PMC-SAMPLE-AVICI-00005-02',
            refData: {
              modelIdentCode: 'SAMPLE',
              pmIssuer: 'AVICI',
              pmNumber: '00005',
              pmVolume: '02',
              issueNumber: '000',
              inWork: '01',
              languageIsoCode: 'zh',
              countryIsoCode: 'CN'
            }
          }
        ]
      }

      const xml = await object2closeRqmts(null, obj)

      expect(xml).toContain('<reqCondPm>')
      expect(xml).toContain('<reqCond>查阅出版模块</reqCond>')
      expect(xml).toContain('<pmRef>')
      expect(xml).toContain('pmIssuer="AVICI"')
      expect(xml).toContain('</reqCondPm>')
    })

    it('应正确生成外部出版物条件XML', async () => {
      const obj = {
        hasConditions: true,
        conditions: [
          { type: 4, xml: '<para>参考外部文档</para>', ref: '', refData: null }
        ]
      }

      const xml = await object2closeRqmts(null, obj)

      expect(xml).toContain('<reqCondExternalPub>')
      expect(xml).toContain('<reqCond>参考外部文档</reqCond>')
      expect(xml).toContain('</reqCondExternalPub>')
    })

    it('应正确生成多条件混合XML', async () => {
      const obj = {
        hasConditions: true,
        conditions: [
          { type: 1, xml: '<para>条件1</para>', ref: '' },
          { type: 1, xml: '<para>条件2</para>', ref: '' },
          { type: 1, xml: '<para>条件3</para>', ref: '' }
        ]
      }

      const xml = await object2closeRqmts(null, obj)

      expect(xml).toContain('条件1')
      expect(xml).toContain('条件2')
      expect(xml).toContain('条件3')
      expect((xml.match(/<reqCondNoRef>/g) || []).length).toBe(3)
    })

    it('应正确处理特殊字符（XSS防护）', async () => {
      const obj = {
        hasConditions: true,
        conditions: [
          { type: 1, xml: '<para><script>alert("xss")</script></para>', ref: '' }
        ]
      }

      const xml = await object2closeRqmts(null, obj)

      expect(xml).toContain('&lt;script&gt;')
      expect(xml).toContain('&lt;/script&gt;')
      expect(xml).not.toContain('<script>')
    })

    it('应处理DM引用数据不完整抛出异常', async () => {
      const obj = {
        hasConditions: true,
        conditions: [
          {
            type: 2,
            xml: '<para>测试</para>',
            refData: {} // 缺少 modelIdentCode
          }
        ]
      }

      await expect(object2closeRqmts(null, obj)).rejects.toThrow('DM引用数据不完整')
    })

    it('应处理PM引用数据不完整抛出异常', async () => {
      const obj = {
        hasConditions: true,
        conditions: [
          {
            type: 3,
            xml: '<para>测试</para>',
            refData: {} // 缺少 modelIdentCode
          }
        ]
      }

      await expect(object2closeRqmts(null, obj)).rejects.toThrow('PM引用数据不完整')
    })
  })

  // ========== 双向转换一致性测试 ==========

  describe('双向转换一致性', () => {

    it('XML→Object→XML 应保持数据一致性（无必要条件）', async () => {
      const originalXml = `<closeRqmts>
  <reqCondGroup>
    <noConds></noConds>
  </reqCondGroup>
</closeRqmts>`

      const obj = await closeRqmts2object(null, originalXml)
      const newXml = await object2closeRqmts(null, obj)

      expect(newXml).toContain('<noConds>')
    })

    it('XML→Object→XML 应保持数据一致性（有条件）', async () => {
      const originalXml = `<closeRqmts>
  <reqCondGroup>
    <reqCondNoRef>
      <reqCond>清理工作区域</reqCond>
    </reqCondNoRef>
  </reqCondGroup>
</closeRqmts>`

      const obj = await closeRqmts2object(null, originalXml)
      const newXml = await object2closeRqmts(null, obj)

      expect(newXml).toContain('清理工作区域')
      expect(newXml).toContain('<reqCondNoRef>')
    })
  })
})
