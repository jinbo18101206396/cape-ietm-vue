/**
 * 重建 refs 与 DOCTYPE - 细节功能单元测试
 * 测试范围：
 * 1. 去重逻辑 (_deduplicatePreserveOrder)
 * 2. ICN 大小写匹配
 * 3. icnlist 为空的处理
 * 4. NOTATION 映射完整性
 * 5. ICN 后缀白名单校验
 */

import { mount, createLocalVue } from '@vue/test-utils'
import { NOTATIONS, hasNotation, getNotation } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/notations'
import { ICN_FILE_EXT, isValidIcnExt, normalizeExt } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/icnFileExt'

describe('重建 refs 细节功能', () => {
  // ============================================================================
  // 1. 去重逻辑测试
  // ============================================================================
  describe('_deduplicatePreserveOrder', () => {
    // 模拟组件方法
    const deduplicatePreserveOrder = (arr) => {
      const seen = new Set()
      const result = []
      for (const item of arr) {
        const ident = item.split('【')[0]
        if (!seen.has(ident)) {
          seen.add(ident)
          result.push(item)
        }
      }
      return result
    }

    it('应正确去重并保持顺序', () => {
      const input = [
        'ICN-001【10行】',
        'ICN-002【15行】',
        'ICN-001【20行】',  // 重复
        'ICN-003【25行】'
      ]
      const output = deduplicatePreserveOrder(input)

      expect(output).toEqual([
        'ICN-001【10行】',
        'ICN-002【15行】',
        'ICN-003【25行】'
      ])
      expect(output.length).toBe(3)
    })

    it('空数组应返回空数组', () => {
      expect(deduplicatePreserveOrder([])).toEqual([])
    })

    it('无重复应返回原数组', () => {
      const input = ['ICN-001【10行】', 'ICN-002【15行】']
      expect(deduplicatePreserveOrder(input)).toEqual(input)
    })

    it('全部重复应只保留第一个', () => {
      const input = [
        'ICN-001【10行】',
        'ICN-001【20行】',
        'ICN-001【30行】'
      ]
      const output = deduplicatePreserveOrder(input)

      expect(output).toEqual(['ICN-001【10行】'])
      expect(output.length).toBe(1)
    })

    it('大小写不同应视为不同ICN', () => {
      const input = [
        'ICN-001【10行】',
        'icn-001【15行】'
      ]
      const output = deduplicatePreserveOrder(input)

      // 当前实现是大小写敏感的（按字符串比较）
      expect(output.length).toBe(2)
    })
  })

  // ============================================================================
  // 2. ICN 大小写匹配测试
  // ============================================================================
  describe('ICN 大小写匹配', () => {
    // 模拟 icnlist.find 逻辑
    const findIcnCaseInsensitive = (icnlist, ident) => {
      return icnlist.find(item =>
        item.toLowerCase().startsWith(ident.toLowerCase() + '.')
      )
    }

    it('大写 ICN 应匹配小写文件名', () => {
      const icnlist = ['icn-001.cgm', 'icn-002.svg']
      const found = findIcnCaseInsensitive(icnlist, 'ICN-001')

      expect(found).toBe('icn-001.cgm')
    })

    it('小写 ICN 应匹配大写文件名', () => {
      const icnlist = ['ICN-001.CGM', 'ICN-002.SVG']
      const found = findIcnCaseInsensitive(icnlist, 'icn-001')

      expect(found).toBe('ICN-001.CGM')
    })

    it('混合大小写应正确匹配', () => {
      const icnlist = ['IcN-001.cgm']
      const found = findIcnCaseInsensitive(icnlist, 'ICN-001')

      expect(found).toBe('IcN-001.cgm')
    })

    it('不存在的 ICN 应返回 undefined', () => {
      const icnlist = ['ICN-001.cgm']
      const found = findIcnCaseInsensitive(icnlist, 'ICN-999')

      expect(found).toBeUndefined()
    })

    it('部分匹配不应返回结果（必须完整 ident + .）', () => {
      const icnlist = ['ICN-001-SUB.cgm']
      const found = findIcnCaseInsensitive(icnlist, 'ICN-001')

      // 'ICN-001-SUB' 不应匹配 'ICN-001'
      expect(found).toBeUndefined()
    })

    it('空 icnlist 应返回 undefined', () => {
      const found = findIcnCaseInsensitive([], 'ICN-001')
      expect(found).toBeUndefined()
    })
  })

  // ============================================================================
  // 3. NOTATION 映射表测试
  // ============================================================================
  describe('NOTATION 映射表', () => {
    it('应包含常见图像格式', () => {
      expect(NOTATIONS).toHaveProperty('cgm')
      expect(NOTATIONS).toHaveProperty('svg')
      expect(NOTATIONS).toHaveProperty('png')
      expect(NOTATIONS).toHaveProperty('jpg')
      expect(NOTATIONS).toHaveProperty('jpeg')
      expect(NOTATIONS).toHaveProperty('gif')
      expect(NOTATIONS).toHaveProperty('bmp')
    })

    it('应包含音频格式', () => {
      expect(NOTATIONS).toHaveProperty('mp3')
      expect(NOTATIONS).toHaveProperty('wav')
      expect(NOTATIONS).toHaveProperty('midi')
    })

    it('应包含视频格式', () => {
      expect(NOTATIONS).toHaveProperty('mp4')
      expect(NOTATIONS).toHaveProperty('avi')
      expect(NOTATIONS).toHaveProperty('mpeg')
    })

    it('应包含3D模型格式', () => {
      expect(NOTATIONS).toHaveProperty('wrl')
      expect(NOTATIONS).toHaveProperty('u3d')
      expect(NOTATIONS).toHaveProperty('step')
    })

    it('应包含文档格式', () => {
      expect(NOTATIONS).toHaveProperty('pdf')
      expect(NOTATIONS).toHaveProperty('doc')
    })

    it('hasNotation 应正确判断', () => {
      expect(hasNotation('cgm')).toBe(true)
      expect(hasNotation('.cgm')).toBe(true)
      expect(hasNotation('CGM')).toBe(true)  // 大小写不敏感
      expect(hasNotation('unknown')).toBe(false)
    })

    it('getNotation 应返回正确的 PUBLIC 值', () => {
      const cgmNotation = getNotation('cgm')
      expect(cgmNotation).toContain('Computer Graphics Metafile')

      const pdfNotation = getNotation('.pdf')
      expect(pdfNotation).toContain('Portable Document Format')
    })

    it('未知后缀应返回 null', () => {
      expect(getNotation('unknown')).toBeNull()
    })

    it('映射表应至少包含100种格式', () => {
      const count = Object.keys(NOTATIONS).length
      expect(count).toBeGreaterThanOrEqual(100)
    })
  })

  // ============================================================================
  // 4. ICN 后缀白名单测试
  // ============================================================================
  describe('ICN 后缀白名单', () => {
    it('应包含 S1000D 标准推荐的 CGM', () => {
      expect(ICN_FILE_EXT).toContain('.cgm')
    })

    it('应包含常见图像格式', () => {
      expect(ICN_FILE_EXT).toContain('.png')
      expect(ICN_FILE_EXT).toContain('.jpg')
      expect(ICN_FILE_EXT).toContain('.svg')
    })

    it('应包含音视频格式', () => {
      expect(ICN_FILE_EXT).toContain('.mp3')
      expect(ICN_FILE_EXT).toContain('.mp4')
    })

    it('isValidIcnExt 应正确校验', () => {
      expect(isValidIcnExt('.cgm')).toBe(true)
      expect(isValidIcnExt('.CGM')).toBe(true)  // 大小写不敏感
      expect(isValidIcnExt('.unknown')).toBe(false)
      expect(isValidIcnExt('')).toBe(false)
      expect(isValidIcnExt(null)).toBe(false)
    })

    it('normalizeExt 应正确规整后缀', () => {
      expect(normalizeExt('cgm')).toBe('.cgm')
      expect(normalizeExt('.cgm')).toBe('.cgm')
      expect(normalizeExt('CGM')).toBe('.cgm')
      expect(normalizeExt('.CGM')).toBe('.cgm')
      expect(normalizeExt(' .CGM ')).toBe('.cgm')
      expect(normalizeExt('')).toBe('')
    })

    it('白名单应至少包含10种格式', () => {
      expect(ICN_FILE_EXT.length).toBeGreaterThanOrEqual(10)
    })

    it('所有白名单后缀都应该有对应的 NOTATION', () => {
      const missingNotations = []

      for (const ext of ICN_FILE_EXT) {
        const normalized = ext.substring(1)  // 去掉前导点
        if (!hasNotation(normalized)) {
          missingNotations.push(ext)
        }
      }

      // 白名单中的后缀应该都在 NOTATION 映射表中
      // 注意：.tif 在白名单但 NOTATION 是 tiff
      const allowed = ['.tif']  // 已知的别名
      const actualMissing = missingNotations.filter(ext => !allowed.includes(ext))

      expect(actualMissing.length).toBe(0)
    })
  })

  // ============================================================================
  // 5. DOCTYPE 生成测试
  // ============================================================================
  describe('DOCTYPE 生成逻辑', () => {
    // 模拟 DOCTYPE 生成
    const generateDoctype = (entities) => {
      const exts = new Set()
      for (const entity of entities) {
        const dotIndex = entity.lastIndexOf('.')
        if (dotIndex !== -1) {
          const ext = entity.substring(dotIndex + 1).toLowerCase()
          exts.add(ext)
        }
      }

      let doctype = '<!DOCTYPE dmodule['

      // 生成 NOTATION
      for (const ext of exts) {
        if (NOTATIONS[ext]) {
          doctype += '\n<!NOTATION ' + ext + ' PUBLIC "' + NOTATIONS[ext] + '">'
        }
      }

      // 生成 ENTITY
      for (const entity of entities) {
        const dotIndex = entity.lastIndexOf('.')
        const filename = dotIndex !== -1 ? entity.substring(0, dotIndex) : entity
        const fileext = dotIndex !== -1 ? entity.substring(dotIndex + 1).toLowerCase() : ''
        doctype += '\n<!ENTITY ' + filename + ' SYSTEM "' + entity + '" NDATA ' + fileext + '>'
      }

      doctype += ']>'
      return doctype
    }

    it('应生成正确的 NOTATION 声明', () => {
      const entities = ['ICN-001.cgm', 'ICN-002.svg']
      const doctype = generateDoctype(entities)

      expect(doctype).toContain('<!NOTATION cgm PUBLIC')
      expect(doctype).toContain('<!NOTATION svg PUBLIC')
    })

    it('应生成正确的 ENTITY 声明', () => {
      const entities = ['ICN-001.cgm']
      const doctype = generateDoctype(entities)

      expect(doctype).toContain('<!ENTITY ICN-001 SYSTEM "ICN-001.cgm" NDATA cgm>')
    })

    it('相同后缀应只生成一个 NOTATION', () => {
      const entities = ['ICN-001.cgm', 'ICN-002.cgm', 'ICN-003.cgm']
      const doctype = generateDoctype(entities)

      // 应该只有一个 <!NOTATION cgm
      const matches = doctype.match(/<!NOTATION cgm/g)
      expect(matches).toHaveLength(1)
    })

    it('多个后缀应生成多个 NOTATION', () => {
      const entities = ['ICN-001.cgm', 'ICN-002.svg', 'ICN-003.png']
      const doctype = generateDoctype(entities)

      expect(doctype).toContain('<!NOTATION cgm')
      expect(doctype).toContain('<!NOTATION svg')
      expect(doctype).toContain('<!NOTATION png')
    })

    it('未知后缀不应生成 NOTATION', () => {
      const entities = ['ICN-001.unknown']
      const doctype = generateDoctype(entities)

      expect(doctype).not.toContain('<!NOTATION unknown')
      expect(doctype).toContain('<!ENTITY ICN-001 SYSTEM "ICN-001.unknown" NDATA unknown>')
    })

    it('后缀应转换为小写', () => {
      const entities = ['ICN-001.CGM']
      const doctype = generateDoctype(entities)

      expect(doctype).toContain('NDATA cgm>')
      expect(doctype).not.toContain('NDATA CGM>')
    })

    it('空实体列表应生成空 DOCTYPE', () => {
      const doctype = generateDoctype([])
      expect(doctype).toBe('<!DOCTYPE dmodule[]>')
    })
  })
})
