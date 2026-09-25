/**
 * gutterMarker.js 单元测试
 * 测试gutter图标工具的核心函数
 */

import {
  DESIGN_ELEMENTS,
  NO_DESIGN_PARENT,
  makeDesignMarker,
  canShowDesignMarker,
  refreshGutterMarkers
} from '@/views/ietm/ietmdatamodulemanagement/editor/utils/gutterMarker'

describe('gutterMarker.js 单元测试', () => {

  // ==================== 常量测试 ====================

  describe('常量定义', () => {
    test('DESIGN_ELEMENTS应包含28种元素', () => {
      expect(DESIGN_ELEMENTS).toHaveLength(28)
      expect(DESIGN_ELEMENTS).toContain('para')
      expect(DESIGN_ELEMENTS).toContain('table')
      expect(DESIGN_ELEMENTS).toContain('figure')
    })

    test('NO_DESIGN_PARENT应包含5种黑名单父元素', () => {
      expect(NO_DESIGN_PARENT).toHaveLength(5)
      expect(NO_DESIGN_PARENT).toContain('title')
      expect(NO_DESIGN_PARENT).toContain('warning')
      expect(NO_DESIGN_PARENT).toContain('caution')
      expect(NO_DESIGN_PARENT).toContain('note')
      expect(NO_DESIGN_PARENT).toContain('emphasis')
    })
  })

  // ==================== makeDesignMarker函数测试 ====================

  describe('makeDesignMarker - 创建图标DOM', () => {
    test('应返回HTMLElement对象', () => {
      const marker = makeDesignMarker('para', 10, jest.fn())
      expect(marker).toBeInstanceOf(HTMLElement)
      expect(marker.tagName).toBe('DIV')
      expect(marker.className).toBe('gutter-design-marker')
    })

    test('应包含正确的DOM结构', () => {
      const marker = makeDesignMarker('para', 10, jest.fn())

      // 检查子元素结构
      const link = marker.querySelector('.gutter-design-link')
      expect(link).toBeTruthy()
      expect(link.tagName).toBe('A')
      expect(link.href).toContain('javascript:void(0)')

      const icon = link.querySelector('.fa-pencil')
      expect(icon).toBeTruthy()
      expect(icon.className).toContain('fa fa-pencil')
    })

    test('英文模式应显示英文title', () => {
      const marker = makeDesignMarker('para', 10, jest.fn(), 'en', {})
      const link = marker.querySelector('.gutter-design-link')
      expect(link.title).toBe('设计视图【para】')
    })

    test('中文模式应显示中文title', () => {
      const en2cnElem = { para: '段落' }
      const marker = makeDesignMarker('para', 10, jest.fn(), 'cn', en2cnElem)
      const link = marker.querySelector('.gutter-design-link')
      expect(link.title).toBe('设计视图【段落】')
    })

    test('中文映射不存在时应回退到英文', () => {
      const marker = makeDesignMarker('para', 10, jest.fn(), 'cn', {})
      const link = marker.querySelector('.gutter-design-link')
      expect(link.title).toBe('设计视图【para】')
    })

    test('点击图标应触发onClick回调', () => {
      const onClick = jest.fn()
      const marker = makeDesignMarker('para', 10, onClick)
      const link = marker.querySelector('.gutter-design-link')

      link.click()

      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick).toHaveBeenCalledWith(10, 'para')
    })

    test('onClick回调不是函数时不应报错', () => {
      const marker = makeDesignMarker('para', 10, null)
      const link = marker.querySelector('.gutter-design-link')

      expect(() => link.click()).not.toThrow()
    })
  })

  // ==================== canShowDesignMarker函数测试 ====================

  describe('canShowDesignMarker - 判断是否显示图标', () => {
    test('para元素应返回true', () => {
      const node = { text: 'para', id: 1, pid: 0 }
      const result = canShowDesignMarker('para', node, [])
      expect(result).toBe(true)
    })

    test('table元素一期应返回false（仅支持para）', () => {
      const node = { text: 'table', id: 1, pid: 0 }
      const result = canShowDesignMarker('table', node, [])
      expect(result).toBe(false)
    })

    test('不在DESIGN_ELEMENTS中的元素应返回false', () => {
      const node = { text: 'content', id: 1, pid: 0 }
      const result = canShowDesignMarker('content', node, [])
      expect(result).toBe(false)
    })

    test('title下的para子元素应返回false（黑名单父元素）', () => {
      const nodeList = [
        { text: 'title', id: 1, pid: 0 },
        { text: 'para', id: 2, pid: 1 }
      ]
      const paraNode = nodeList[1]
      const result = canShowDesignMarker('para', paraNode, nodeList)
      expect(result).toBe(false)
    })

    test('warning下的para子元素应返回false', () => {
      const nodeList = [
        { text: 'warning', id: 1, pid: 0 },
        { text: 'para', id: 2, pid: 1 }
      ]
      const paraNode = nodeList[1]
      const result = canShowDesignMarker('para', paraNode, nodeList)
      expect(result).toBe(false)
    })

    test('caution下的para子元素应返回false', () => {
      const nodeList = [
        { text: 'caution', id: 1, pid: 0 },
        { text: 'para', id: 2, pid: 1 }
      ]
      const paraNode = nodeList[1]
      const result = canShowDesignMarker('para', paraNode, nodeList)
      expect(result).toBe(false)
    })

    test('note下的para子元素应返回false', () => {
      const nodeList = [
        { text: 'note', id: 1, pid: 0 },
        { text: 'para', id: 2, pid: 1 }
      ]
      const paraNode = nodeList[1]
      const result = canShowDesignMarker('para', paraNode, nodeList)
      expect(result).toBe(false)
    })

    test('emphasis下的para子元素应返回false', () => {
      const nodeList = [
        { text: 'emphasis', id: 1, pid: 0 },
        { text: 'para', id: 2, pid: 1 }
      ]
      const paraNode = nodeList[1]
      const result = canShowDesignMarker('para', paraNode, nodeList)
      expect(result).toBe(false)
    })

    test('正常父元素下的para应返回true', () => {
      const nodeList = [
        { text: 'description', id: 1, pid: 0 },
        { text: 'para', id: 2, pid: 1 }
      ]
      const paraNode = nodeList[1]
      const result = canShowDesignMarker('para', paraNode, nodeList)
      expect(result).toBe(true)
    })

    test('node为null应不报错', () => {
      const result = canShowDesignMarker('para', null, [])
      expect(result).toBe(true) // para在DESIGN_ELEMENTS中
    })

    test('nodeList为空应不报错', () => {
      const node = { text: 'para', id: 1, pid: 0 }
      const result = canShowDesignMarker('para', node, [])
      expect(result).toBe(true)
    })

    test('父元素不存在应返回true（找不到父元素视为无限制）', () => {
      const node = { text: 'para', id: 2, pid: 999 }
      const nodeList = [{ text: 'description', id: 1, pid: 0 }]
      const result = canShowDesignMarker('para', node, nodeList)
      expect(result).toBe(true)
    })
  })

  // ==================== refreshGutterMarkers函数测试 ====================

  describe('refreshGutterMarkers - 刷新gutter图标', () => {
    let mockCm

    beforeEach(() => {
      mockCm = {
        clearGutter: jest.fn(),
        setGutterMarker: jest.fn(),
        lineCount: jest.fn(() => 100)
      }
    })

    test('应先清空dmGutter', () => {
      refreshGutterMarkers(mockCm, [], 1, jest.fn(), 'en', {})
      expect(mockCm.clearGutter).toHaveBeenCalledWith('dmGutter')
    })

    test('cm为null应不报错', () => {
      expect(() => {
        refreshGutterMarkers(null, [], 1, jest.fn(), 'en', {})
      }).not.toThrow()
    })

    test('nodeList为null应不报错', () => {
      expect(() => {
        refreshGutterMarkers(mockCm, null, 1, jest.fn(), 'en', {})
      }).not.toThrow()
    })

    test('nodeList不是数组应不报错', () => {
      expect(() => {
        refreshGutterMarkers(mockCm, 'invalid', 1, jest.fn(), 'en', {})
      }).not.toThrow()
    })

    test('空nodeList应只清空gutter', () => {
      refreshGutterMarkers(mockCm, [], 1, jest.fn(), 'en', {})
      expect(mockCm.clearGutter).toHaveBeenCalledTimes(1)
      expect(mockCm.setGutterMarker).not.toHaveBeenCalled()
    })

    test('应为para元素设置gutter标记', () => {
      const nodeList = [
        { text: 'para', id: 1, pid: 0, attributes: { lineno: 5 } }
      ]
      const linenoOffset = 3

      refreshGutterMarkers(mockCm, nodeList, linenoOffset, jest.fn(), 'en', {})

      // lineno=5, offset=3 => cmLine = 5 + 3 - 2 = 6
      expect(mockCm.setGutterMarker).toHaveBeenCalledTimes(1)
      expect(mockCm.setGutterMarker.mock.calls[0][0]).toBe(6)
      expect(mockCm.setGutterMarker.mock.calls[0][1]).toBe('dmGutter')
      expect(mockCm.setGutterMarker.mock.calls[0][2]).toBeInstanceOf(HTMLElement)
    })

    test('应跳过非para元素', () => {
      const nodeList = [
        { text: 'content', id: 1, pid: 0, attributes: { lineno: 3 } },
        { text: 'para', id: 2, pid: 1, attributes: { lineno: 5 } }
      ]

      refreshGutterMarkers(mockCm, nodeList, 1, jest.fn(), 'en', {})

      // 只有para元素设置标记
      expect(mockCm.setGutterMarker).toHaveBeenCalledTimes(1)
    })

    test('应跳过黑名单父元素下的para', () => {
      const nodeList = [
        { text: 'title', id: 1, pid: 0, attributes: { lineno: 3 } },
        { text: 'para', id: 2, pid: 1, attributes: { lineno: 4 } },
        { text: 'description', id: 3, pid: 0, attributes: { lineno: 6 } },
        { text: 'para', id: 4, pid: 3, attributes: { lineno: 7 } }
      ]

      refreshGutterMarkers(mockCm, nodeList, 1, jest.fn(), 'en', {})

      // 只为description下的para设置标记（title下的para被过滤）
      expect(mockCm.setGutterMarker).toHaveBeenCalledTimes(1)
    })

    test('应跳过lineno为null的节点', () => {
      const nodeList = [
        { text: 'para', id: 1, pid: 0, attributes: { lineno: null } },
        { text: 'para', id: 2, pid: 0, attributes: { lineno: 5 } }
      ]

      refreshGutterMarkers(mockCm, nodeList, 1, jest.fn(), 'en', {})

      expect(mockCm.setGutterMarker).toHaveBeenCalledTimes(1)
    })

    test('应跳过lineno < 1的节点', () => {
      const nodeList = [
        { text: 'para', id: 1, pid: 0, attributes: { lineno: 0 } },
        { text: 'para', id: 2, pid: 0, attributes: { lineno: -1 } },
        { text: 'para', id: 3, pid: 0, attributes: { lineno: 5 } }
      ]

      refreshGutterMarkers(mockCm, nodeList, 1, jest.fn(), 'en', {})

      expect(mockCm.setGutterMarker).toHaveBeenCalledTimes(1)
    })

    test('应跳过cmLine < 0的节点', () => {
      const nodeList = [
        { text: 'para', id: 1, pid: 0, attributes: { lineno: 1 } }
      ]
      const linenoOffset = 1
      // cmLine = 1 + 1 - 2 = 0 (有效)

      refreshGutterMarkers(mockCm, nodeList, linenoOffset, jest.fn(), 'en', {})

      expect(mockCm.setGutterMarker).toHaveBeenCalled()

      // cmLine = 1 + 0 - 2 = -1 (无效)
      mockCm.setGutterMarker.mockClear()
      refreshGutterMarkers(mockCm, nodeList, 0, jest.fn(), 'en', {})

      expect(mockCm.setGutterMarker).not.toHaveBeenCalled()
    })

    test('应跳过cmLine >= lineCount的节点', () => {
      mockCm.lineCount = jest.fn(() => 10)

      const nodeList = [
        { text: 'para', id: 1, pid: 0, attributes: { lineno: 100 } }
      ]
      const linenoOffset = 1
      // cmLine = 100 + 1 - 2 = 99 > 10

      refreshGutterMarkers(mockCm, nodeList, linenoOffset, jest.fn(), 'en', {})

      expect(mockCm.setGutterMarker).not.toHaveBeenCalled()
    })

    test('应跳过没有attributes的节点', () => {
      const nodeList = [
        { text: 'para', id: 1, pid: 0 }, // 无attributes
        { text: 'para', id: 2, pid: 0, attributes: { lineno: 5 } }
      ]

      refreshGutterMarkers(mockCm, nodeList, 1, jest.fn(), 'en', {})

      expect(mockCm.setGutterMarker).toHaveBeenCalledTimes(1)
    })

    test('应跳过text为空的节点', () => {
      const nodeList = [
        { text: '', id: 1, pid: 0, attributes: { lineno: 5 } },
        { text: 'para', id: 2, pid: 0, attributes: { lineno: 6 } }
      ]

      refreshGutterMarkers(mockCm, nodeList, 1, jest.fn(), 'en', {})

      expect(mockCm.setGutterMarker).toHaveBeenCalledTimes(1)
    })
  })

  // ==================== 行号换算测试 ====================

  describe('行号换算逻辑', () => {
    test('验证行号换算公式：cmLine = lineno + offset - 2', () => {
      const mockCm = {
        clearGutter: jest.fn(),
        setGutterMarker: jest.fn(),
        lineCount: jest.fn(() => 100)
      }

      const testCases = [
        { lineno: 1, offset: 1, expected: 0 },   // 1 + 1 - 2 = 0
        { lineno: 5, offset: 3, expected: 6 },   // 5 + 3 - 2 = 6
        { lineno: 10, offset: 5, expected: 13 }, // 10 + 5 - 2 = 13
        { lineno: 1, offset: 10, expected: 9 }   // 1 + 10 - 2 = 9
      ]

      testCases.forEach(({ lineno, offset, expected }) => {
        const nodeList = [
          { text: 'para', id: 1, pid: 0, attributes: { lineno } }
        ]

        mockCm.setGutterMarker.mockClear()
        refreshGutterMarkers(mockCm, nodeList, offset, jest.fn(), 'en', {})

        expect(mockCm.setGutterMarker).toHaveBeenCalledWith(
          expected,
          'dmGutter',
          expect.any(HTMLElement)
        )
      })
    })
  })
})
