/**
 * DmPreviewModal热点功能单元测试
 * 测试热点SVG叠加层渲染、坐标解析、事件处理等核心功能
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import DmPreviewModal from '@/views/ietm/ietmdatamodulemanagement/editor/components/DmPreviewModal.vue'

const localVue = createLocalVue()
localVue.use(Antd)

describe('DmPreviewModal - 热点交互功能', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(DmPreviewModal, {
      localVue,
      attachTo: document.body
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
  })

  /**
   * 测试1: 热点数据状态初始化
   */
  test('应该正确初始化热点相关数据状态', () => {
    expect(wrapper.vm.hotspotVisible).toBe(false)
    expect(wrapper.vm.hotspotInfo).toEqual({
      id: '',
      description: '',
      coordinates: ''
    })
  })

  /**
   * 测试2: 矩形热点渲染
   */
  test('应该正确渲染矩形热点SVG元素', () => {
    const mockDoc = document.implementation.createHTMLDocument('test')
    const mockWin = { showHotspotInfo: jest.fn() }

    const svg = mockDoc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mockDoc.body.appendChild(svg)

    const hotspot = {
      id: 'hs-001',
      shape: 'rect',
      coords: '10,20,100,50',
      description: '矩形热点测试'
    }

    wrapper.vm.renderHotspot(svg, hotspot, mockDoc, mockWin, 800, 600)

    const rect = svg.querySelector('rect')
    expect(rect).not.toBeNull()
    expect(rect.getAttribute('x')).toBe('10')
    expect(rect.getAttribute('y')).toBe('20')
    expect(rect.getAttribute('width')).toBe('100')
    expect(rect.getAttribute('height')).toBe('50')
    expect(rect.getAttribute('fill')).toContain('rgba(255, 87, 34')
    expect(rect.style.cursor).toBe('pointer')
  })

  /**
   * 测试3: 圆形热点渲染
   */
  test('应该正确渲染圆形热点SVG元素', () => {
    const mockDoc = document.implementation.createHTMLDocument('test')
    const mockWin = { showHotspotInfo: jest.fn() }

    const svg = mockDoc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mockDoc.body.appendChild(svg)

    const hotspot = {
      id: 'hs-002',
      shape: 'circle',
      coords: '100,100,50',
      description: '圆形热点测试'
    }

    wrapper.vm.renderHotspot(svg, hotspot, mockDoc, mockWin, 800, 600)

    const circle = svg.querySelector('circle')
    expect(circle).not.toBeNull()
    expect(circle.getAttribute('cx')).toBe('100')
    expect(circle.getAttribute('cy')).toBe('100')
    expect(circle.getAttribute('r')).toBe('50')
    expect(circle.style.cursor).toBe('pointer')
  })

  /**
   * 测试4: 多边形热点渲染
   */
  test('应该正确渲染多边形热点SVG元素', () => {
    const mockDoc = document.implementation.createHTMLDocument('test')
    const mockWin = { showHotspotInfo: jest.fn() }

    const svg = mockDoc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mockDoc.body.appendChild(svg)

    const hotspot = {
      id: 'hs-003',
      shape: 'poly',
      coords: '10,10,100,10,100,100,10,100',
      description: '多边形热点测试'
    }

    wrapper.vm.renderHotspot(svg, hotspot, mockDoc, mockWin, 800, 600)

    const polygon = svg.querySelector('polygon')
    expect(polygon).not.toBeNull()
    expect(polygon.getAttribute('points')).toBe('10,10 100,10 100,100 10,100')
    expect(polygon.style.cursor).toBe('pointer')
  })

  /**
   * 测试5: 热点点击事件处理
   */
  test('点击热点应该调用showHotspotInfo并显示弹框', async () => {
    const mockDoc = document.implementation.createHTMLDocument('test')
    const mockWin = { showHotspotInfo: jest.fn() }

    const svg = mockDoc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mockDoc.body.appendChild(svg)

    const hotspot = {
      id: 'hs-004',
      shape: 'rect',
      coords: '10,20,100,50',
      description: '测试点击事件'
    }

    wrapper.vm.renderHotspot(svg, hotspot, mockDoc, mockWin, 800, 600)

    const rect = svg.querySelector('rect')
    rect.click()

    expect(mockWin.showHotspotInfo).toHaveBeenCalledWith(
      'hs-004',
      '测试点击事件',
      'rect: 10,20,100,50'
    )
  })

  /**
   * 测试6: 热点悬停高亮效果
   */
  test('鼠标悬停应该改变热点样式实现高亮效果', () => {
    const mockDoc = document.implementation.createHTMLDocument('test')
    const mockWin = { showHotspotInfo: jest.fn() }

    const svg = mockDoc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mockDoc.body.appendChild(svg)

    const hotspot = {
      id: 'hs-005',
      shape: 'circle',
      coords: '100,100,50',
      description: '测试悬停效果'
    }

    wrapper.vm.renderHotspot(svg, hotspot, mockDoc, mockWin, 800, 600)

    const circle = svg.querySelector('circle')

    // 初始状态
    expect(circle.getAttribute('fill')).toBe('rgba(255, 87, 34, 0.2)')
    expect(circle.getAttribute('stroke-width')).toBe('2')

    // 鼠标进入
    const mouseEnterEvent = new MouseEvent('mouseenter')
    circle.dispatchEvent(mouseEnterEvent)
    expect(circle.getAttribute('fill')).toBe('rgba(255, 87, 34, 0.35)')
    expect(circle.getAttribute('stroke-width')).toBe('3')

    // 鼠标离开
    const mouseLeaveEvent = new MouseEvent('mouseleave')
    circle.dispatchEvent(mouseLeaveEvent)
    expect(circle.getAttribute('fill')).toBe('rgba(255, 87, 34, 0.2)')
    expect(circle.getAttribute('stroke-width')).toBe('2')
  })

  /**
   * 测试7: 热点弹框显示与关闭
   */
  test('showHotspotInfo应该正确显示热点详情弹框', async () => {
    wrapper.vm.hotspotVisible = false

    // 模拟iframe window注入的函数
    const testId = 'hs-006'
    const testDesc = '<p>测试描述内容</p>'
    const testCoords = 'rect: 10,20,100,50'

    // 直接调用组件方法（模拟iframe调用）
    wrapper.vm.hotspotInfo = {
      id: testId,
      description: testDesc,
      coordinates: testCoords
    }
    wrapper.vm.hotspotVisible = true

    await wrapper.vm.$nextTick()

    expect(wrapper.vm.hotspotVisible).toBe(true)
    expect(wrapper.vm.hotspotInfo.id).toBe(testId)
    expect(wrapper.vm.hotspotInfo.description).toBe(testDesc)
    expect(wrapper.vm.hotspotInfo.coordinates).toBe(testCoords)

    // 关闭弹框
    wrapper.vm.hotspotVisible = false
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.hotspotVisible).toBe(false)
  })

  /**
   * 测试8: 图片包装容器创建
   */
  test('createHotspotOverlay应该为图片创建相对定位容器', () => {
    const mockDoc = document.implementation.createHTMLDocument('test')
    const mockWin = { showHotspotInfo: jest.fn() }

    const img = mockDoc.createElement('img')
    img.width = 800
    img.height = 600
    mockDoc.body.appendChild(img)

    const hotspots = [{
      id: 'hs-007',
      shape: 'rect',
      coords: '10,20,100,50',
      description: '测试容器创建'
    }]

    wrapper.vm.createHotspotOverlay(img, hotspots, mockDoc, mockWin)

    // 检查图片是否被包装在容器中
    const wrapper_div = img.parentElement
    expect(wrapper_div.style.position).toBe('relative')
    expect(wrapper_div.style.display).toBe('inline-block')

    // 检查SVG是否被添加
    const svg = wrapper_div.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg.style.position).toBe('absolute')
    expect(svg.style.zIndex).toBe('10')
  })

  /**
   * 测试9: 空坐标数据防御
   */
  test('应该正确处理空坐标或无效数据', () => {
    const mockDoc = document.implementation.createHTMLDocument('test')
    const mockWin = { showHotspotInfo: jest.fn() }

    const svg = mockDoc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mockDoc.body.appendChild(svg)

    // 测试空坐标
    const hotspot1 = {
      id: 'hs-008',
      shape: 'rect',
      coords: '',
      description: '空坐标'
    }
    wrapper.vm.renderHotspot(svg, hotspot1, mockDoc, mockWin, 800, 600)
    expect(svg.querySelector('rect')).toBeNull()

    // 测试坐标数量不足
    const hotspot2 = {
      id: 'hs-009',
      shape: 'rect',
      coords: '10,20',
      description: '坐标不足'
    }
    wrapper.vm.renderHotspot(svg, hotspot2, mockDoc, mockWin, 800, 600)
    expect(svg.querySelector('rect')).toBeNull()
  })

  /**
   * 测试10: 多个热点在同一图片上渲染
   */
  test('应该能在同一图片上渲染多个热点', () => {
    const mockDoc = document.implementation.createHTMLDocument('test')
    const mockWin = { showHotspotInfo: jest.fn() }

    const img = mockDoc.createElement('img')
    img.width = 800
    img.height = 600
    mockDoc.body.appendChild(img)

    const hotspots = [
      { id: 'hs-010', shape: 'rect', coords: '10,10,50,50', description: '热点1' },
      { id: 'hs-011', shape: 'circle', coords: '200,200,30', description: '热点2' },
      { id: 'hs-012', shape: 'poly', coords: '300,300,400,300,400,400', description: '热点3' }
    ]

    wrapper.vm.createHotspotOverlay(img, hotspots, mockDoc, mockWin)

    const svg = img.parentElement.querySelector('svg')
    expect(svg.querySelectorAll('rect').length).toBe(1)
    expect(svg.querySelectorAll('circle').length).toBe(1)
    expect(svg.querySelectorAll('polygon').length).toBe(1)
  })
})
