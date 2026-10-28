/**
 * multimediaConverter.js 单元测试
 * 测试覆盖：XML↔Object转换、数据验证、multimediaType检测、中英文转换
 */

import {
  multimedia2object,
  object2multimedia,
  validateMultimedia,
  detectMultimediaType,
  toCnMultimediaXml,
  toEnMultimediaXml
} from '@/views/ietm/ietmdatamodulemanagement/editor/utils/multimediaConverter'

describe('multimediaConverter.js', () => {

  // ============ multimedia2object() 测试 ============

  describe('multimedia2object()', () => {
    it('应成功解析完整的multimedia XML', async () => {
      const xml = `
        <multimedia id="mm-001">
          <title>测试视频</title>
          <multimediaObject xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest"
                           infoEntityIdent="ICN-001" multimediaType="video">
            <hotspot applicationStructureIdent="aps-001" applicationStructureName="引擎" id="hs-001"/>
          </multimediaObject>
        </multimedia>
      `

      const result = await multimedia2object(null, xml)

      expect(result.title).toBe('测试视频')
      expect(result.id).toBe('mm-001')
      expect(result.multimediaObjects).toHaveLength(1)
      expect(result.multimediaObjects[0].icn).toBe('ICN-001')
      expect(result.multimediaObjects[0].multimediaType).toBe('video')
      expect(result.multimediaObjects[0].hotspots).toHaveLength(1)
      expect(result.multimediaObjects[0].hotspots[0].apsid).toBe('aps-001')
      expect(result.multimediaObjects[0].hotspots[0].name).toBe('引擎')
      expect(result.multimediaObjects[0].hotspots[0].id).toBe('hs-001')
    })

    it('应成功解析不带id属性的multimedia', async () => {
      const xml = `
        <multimedia>
          <title>简单多媒体</title>
        </multimedia>
      `
      const result = await multimedia2object(null, xml)
      expect(result.title).toBe('简单多媒体')
      expect(result.id).toBe('')
      expect(result.multimediaObjects).toHaveLength(0)
    })

    it('应成功解析多个multimediaObject', async () => {
      const xml = `
        <multimedia id="mm-002">
          <title>多对象测试</title>
          <multimediaObject xlink:type="simple" infoEntityIdent="ICN-VIDEO-001" multimediaType="video"/>
          <multimediaObject xlink:type="simple" infoEntityIdent="ICN-3D-001" multimediaType="3D"/>
          <multimediaObject xlink:type="simple" infoEntityIdent="ICN-CGM-001"/>
        </multimedia>
      `
      const result = await multimedia2object(null, xml)
      expect(result.multimediaObjects).toHaveLength(3)
      expect(result.multimediaObjects[0].multimediaType).toBe('video')
      expect(result.multimediaObjects[1].multimediaType).toBe('3D')
      expect(result.multimediaObjects[2].multimediaType).toBe('')
    })

    it('应拒绝空XML字符串', async () => {
      await expect(multimedia2object(null, '')).rejects.toThrow('XML内容不能为空')
      await expect(multimedia2object(null, '   ')).rejects.toThrow('XML内容不能为空')
    })

    it('应拒绝无multimedia元素的XML', async () => {
      const xml = '<root><title>无效</title></root>'
      await expect(multimedia2object(null, xml)).rejects.toThrow('未找到<multimedia>元素')
    })

    it('应拒绝无title元素的XML', async () => {
      const xml = '<multimedia id="mm-001"></multimedia>'
      await expect(multimedia2object(null, xml)).rejects.toThrow('Multimedia标题(title)不能为空')
    })

    it('应正确提取hotspot的所有属性', async () => {
      const xml = `
        <multimedia>
          <title>热点测试</title>
          <multimediaObject infoEntityIdent="ICN-CGM-001">
            <hotspot applicationStructureIdent="aps-001" applicationStructureName="部件A" id="hs-001"/>
            <hotspot applicationStructureIdent="aps-002" applicationStructureName="部件B"/>
          </multimediaObject>
        </multimedia>
      `
      const result = await multimedia2object(null, xml)
      expect(result.multimediaObjects[0].hotspots).toHaveLength(2)
      expect(result.multimediaObjects[0].hotspots[1].id).toBe('')
    })
  })

  // ============ object2multimedia() 测试 ============

  describe('object2multimedia()', () => {
    it('应成功生成完整的multimedia XML', async () => {
      const obj = {
        title: '测试多媒体',
        id: 'mm-001',
        multimediaObjects: [
          {
            icn: 'ICN-VIDEO-001',
            filename: 'video.mp4',
            multimediaType: 'video',
            hotspots: []
          }
        ]
      }

      const xml = await object2multimedia(null, obj)

      expect(xml).toContain('<multimedia id="mm-001">')
      expect(xml).toContain('<title>测试多媒体</title>')
      expect(xml).toContain('infoEntityIdent="ICN-VIDEO-001"')
      expect(xml).toContain('multimediaType="video"')
      expect(xml).toContain('xlink:type="simple"')
      expect(xml).toContain('xlink:show="replace"')
      expect(xml).toContain('xlink:actuate="onRequest"')
    })

    it('应正确处理不带id的multimedia', async () => {
      const obj = {
        title: '简单多媒体',
        id: '',
        multimediaObjects: []
      }

      const xml = await object2multimedia(null, obj)
      expect(xml).toContain('<multimedia>')
      expect(xml).not.toContain('id=')
    })

    it('应自动检测multimediaType（从filename）', async () => {
      const obj = {
        title: '自动检测',
        multimediaObjects: [
          {
            icn: 'ICN-001',
            filename: 'test.mp4',
            multimediaType: '',
            hotspots: []
          }
        ]
      }

      const xml = await object2multimedia(null, obj)
      expect(xml).toContain('multimediaType="video"')
    })

    it('应生成带hotspot的multimediaObject', async () => {
      const obj = {
        title: '热点测试',
        multimediaObjects: [
          {
            icn: 'ICN-CGM-001',
            filename: 'diagram.cgm',
            multimediaType: '',
            hotspots: [
              { apsid: 'aps-001', name: '部件A', id: 'hs-001' },
              { apsid: 'aps-002', name: '部件B', id: '' }
            ]
          }
        ]
      }

      const xml = await object2multimedia(null, obj)
      expect(xml).toContain('<hotspot applicationStructureIdent="aps-001" applicationStructureName="部件A" id="hs-001"/>')
      expect(xml).toContain('<hotspot applicationStructureIdent="aps-002" applicationStructureName="部件B"/>')
      expect(xml).toContain('</multimediaObject>')
    })

    it('应生成自闭合的multimediaObject（无hotspot）', async () => {
      const obj = {
        title: '无热点',
        multimediaObjects: [
          {
            icn: 'ICN-VIDEO-001',
            filename: 'video.mp4',
            multimediaType: 'video',
            hotspots: []
          }
        ]
      }

      const xml = await object2multimedia(null, obj)
      expect(xml).toMatch(/<multimediaObject[^>]+\/>/)
    })

    it('应正确转义XML特殊字符', async () => {
      const obj = {
        title: 'Title with <tag> & "quotes"',
        id: 'id-with-\'apostrophe\'',
        multimediaObjects: []
      }

      const xml = await object2multimedia(null, obj)
      expect(xml).toContain('&lt;tag&gt;')
      expect(xml).toContain('&amp;')
      expect(xml).toContain('&quot;')
      expect(xml).toContain('&apos;')
    })

    it('应拒绝空对象', async () => {
      await expect(object2multimedia(null, null)).rejects.toThrow('multimediaObj不能为空')
    })
  })

  // ============ validateMultimedia() 测试 ============

  describe('validateMultimedia()', () => {
    it('应通过有效的multimedia对象', () => {
      const obj = {
        title: '有效多媒体',
        multimediaObjects: [
          {
            icn: 'ICN-001',
            hotspots: []
          }
        ]
      }

      const result = validateMultimedia(obj)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应拒绝空对象', () => {
      const result = validateMultimedia(null)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('multimediaObj不能为空')
    })

    it('应拒绝空标题', () => {
      const obj = { title: '', multimediaObjects: [{ icn: 'ICN-001' }] }
      const result = validateMultimedia(obj)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Multimedia标题必填')
    })

    it('应拒绝超长标题', () => {
      const obj = {
        title: 'a'.repeat(201),
        multimediaObjects: [{ icn: 'ICN-001' }]
      }
      const result = validateMultimedia(obj)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Multimedia标题长度不能超过200个字符')
    })

    it('应拒绝空的multimediaObjects数组', () => {
      const obj = { title: '标题', multimediaObjects: [] }
      const result = validateMultimedia(obj)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('至少需要添加一个多媒体对象')
    })

    it('应拒绝空ICN', () => {
      const obj = {
        title: '标题',
        multimediaObjects: [{ icn: '', hotspots: [] }]
      }
      const result = validateMultimedia(obj)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('第1个多媒体对象的ICN编码不能为空')
    })

    it('应验证hotspot的apsid和name', () => {
      const obj = {
        title: '标题',
        multimediaObjects: [
          {
            icn: 'ICN-001',
            hotspots: [
              { apsid: '', name: '部件A', id: '' },
              { apsid: 'aps-002', name: '', id: '' }
            ]
          }
        ]
      }
      const result = validateMultimedia(obj)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('第1个对象的第1个热点的应用结构标识(apsid)不能为空')
      expect(result.errors).toContain('第1个对象的第2个热点的名称不能为空')
    })
  })

  // ============ detectMultimediaType() 测试 ============

  describe('detectMultimediaType()', () => {
    it('应识别视频格式', () => {
      expect(detectMultimediaType('video.mp4')).toBe('video')
      expect(detectMultimediaType('video.avi')).toBe('video')
      expect(detectMultimediaType('video.wmv')).toBe('video')
      expect(detectMultimediaType('video.mov')).toBe('video')
      expect(detectMultimediaType('video.rm')).toBe('video')
      expect(detectMultimediaType('video.mpg')).toBe('video')
      expect(detectMultimediaType('video.webm')).toBe('video')
    })

    it('应识别音频格式（标记为video）', () => {
      expect(detectMultimediaType('audio.mp3')).toBe('video')
    })

    it('应识别3D模型格式', () => {
      expect(detectMultimediaType('model.wrl')).toBe('3D')
      expect(detectMultimediaType('model.smg')).toBe('3D')
      expect(detectMultimediaType('model.swf')).toBe('3D')
    })

    it('应返回空字符串（图像格式）', () => {
      expect(detectMultimediaType('image.cgm')).toBe('')
      expect(detectMultimediaType('image.jpg')).toBe('')
      expect(detectMultimediaType('image.png')).toBe('')
      expect(detectMultimediaType('image.bmp')).toBe('')
      expect(detectMultimediaType('image.gif')).toBe('')
      expect(detectMultimediaType('image.svg')).toBe('')
    })

    it('应处理大小写不敏感', () => {
      expect(detectMultimediaType('VIDEO.MP4')).toBe('video')
      expect(detectMultimediaType('Model.WRL')).toBe('3D')
      expect(detectMultimediaType('Image.CGM')).toBe('')
    })

    it('应处理无扩展名或空文件名', () => {
      expect(detectMultimediaType('noextension')).toBe('')
      expect(detectMultimediaType('')).toBe('')
      expect(detectMultimediaType(null)).toBe('')
    })

    it('应返回空字符串（未知格式）', () => {
      expect(detectMultimediaType('file.unknown')).toBe('')
      expect(detectMultimediaType('document.pdf')).toBe('')
    })
  })

  // ============ 中英文转换测试 ============

  describe('toCnMultimediaXml() 和 toEnMultimediaXml()', () => {
    const enXml = `<multimedia id="mm-001">
<title>测试标题</title>
<multimediaObject xlink:type="simple" infoEntityIdent="ICN-001" multimediaType="video">
<hotspot applicationStructureIdent="aps-001" applicationStructureName="部件A" id="hs-001"/>
</multimediaObject>
</multimedia>`

    const cnXml = `<多媒体 id="mm-001">
<标题>测试标题</标题>
<多媒体对象 xlink:type="simple" 信息实体标识="ICN-001" 多媒体类型="video">
<热点 应用结构标识="aps-001" 应用结构名称="部件A" id="hs-001"/>
</多媒体对象>
</多媒体>`

    it('应将英文标签转换为中文', () => {
      const result = toCnMultimediaXml(enXml)
      expect(result).toContain('<多媒体')
      expect(result).toContain('<标题>')
      expect(result).toContain('<多媒体对象')
      expect(result).toContain('<热点')
      expect(result).toContain('信息实体标识=')
      expect(result).toContain('多媒体类型=')
      expect(result).toContain('应用结构标识=')
      expect(result).toContain('应用结构名称=')
    })

    it('应将中文标签转换为英文', () => {
      const result = toEnMultimediaXml(cnXml)
      expect(result).toContain('<multimedia')
      expect(result).toContain('<title>')
      expect(result).toContain('<multimediaObject')
      expect(result).toContain('<hotspot')
      expect(result).toContain('infoEntityIdent=')
      expect(result).toContain('multimediaType=')
      expect(result).toContain('applicationStructureIdent=')
      expect(result).toContain('applicationStructureName=')
    })

    it('应支持往返转换（英→中→英）', () => {
      const cn = toCnMultimediaXml(enXml)
      const backToEn = toEnMultimediaXml(cn)
      expect(backToEn).toBe(enXml)
    })

    it('应支持往返转换（中→英→中）', () => {
      const en = toEnMultimediaXml(cnXml)
      const backToCn = toCnMultimediaXml(en)
      expect(backToCn).toBe(cnXml)
    })
  })
})
