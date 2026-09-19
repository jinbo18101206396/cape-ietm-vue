/**
 * Model3DViewer 单元测试
 *
 * 测试策略：
 * 1. 组件挂载和销毁
 * 2. 格式识别和加载器选择
 * 3. 错误处理
 * 4. 事件触发
 *
 * @date 2026-09-19
 */

import { mount } from '@vue/test-utils'
import Model3DViewer from '@/views/ietm/icnmanage/modules/Model3DViewer.vue'

// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn(() => ({ add: jest.fn(), remove: jest.fn(), traverse: jest.fn() })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
    aspect: 0,
    near: 0,
    far: 0,
    updateProjectionMatrix: jest.fn(),
    fov: 45
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement('canvas')
  })),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(() => ({ position: { set: jest.fn() } })),
  GridHelper: jest.fn(),
  AxesHelper: jest.fn(),
  Color: jest.fn(),
  Box3: jest.fn(() => ({
    setFromObject: jest.fn(() => ({
      getCenter: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
      getSize: jest.fn(() => ({ x: 1, y: 1, z: 1 }))
    }))
  })),
  Vector3: jest.fn(() => ({ x: 0, y: 0, z: 0, copy: jest.fn() })),
  Clock: jest.fn(() => ({ getDelta: jest.fn(() => 0.016) })),
  MeshPhongMaterial: jest.fn(),
  Mesh: jest.fn(() => ({ rotation: { x: 0 } })),
  DoubleSide: 2,
  AnimationMixer: jest.fn(() => ({
    update: jest.fn(),
    clipAction: jest.fn(() => ({ play: jest.fn() })),
    stopAllAction: jest.fn()
  }))
}))

jest.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: jest.fn(() => ({
    update: jest.fn(),
    dispose: jest.fn(),
    target: { copy: jest.fn() },
    enableDamping: true,
    dampingFactor: 0.05
  }))
}))

describe('Model3DViewer.vue', () => {
  let wrapper

  beforeEach(() => {
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16))
    global.cancelAnimationFrame = jest.fn()
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
    jest.clearAllMocks()
  })

  describe('组件生命周期', () => {
    it('应该正确挂载组件', () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf',
          fileExt: '.gltf'
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.vm.scene).not.toBeNull()
      expect(wrapper.vm.camera).not.toBeNull()
      expect(wrapper.vm.renderer).not.toBeNull()
    })

    it('应该在销毁时清理资源', () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      const disposeSpy = jest.spyOn(wrapper.vm, 'dispose')
      wrapper.destroy()

      expect(disposeSpy).toHaveBeenCalled()
      expect(global.cancelAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('格式识别', () => {
    const testCases = [
      { ext: '.wrl', format: 'VRML', method: 'loadVRML' },
      { ext: '.gltf', format: 'glTF', method: 'loadGLTF' },
      { ext: '.glb', format: 'glTF Binary', method: 'loadGLTF' },
      { ext: '.obj', format: 'OBJ', method: 'loadOBJ' },
      { ext: '.stl', format: 'STL', method: 'loadSTL' },
      { ext: '.fbx', format: 'FBX', method: 'loadFBX' },
      { ext: '.dae', format: 'COLLADA', method: 'loadCollada' },
      { ext: '.ply', format: 'PLY', method: 'loadPLY' }
    ]

    testCases.forEach(({ ext, format, method }) => {
      it(`应该识别 ${ext} 格式为 ${format}`, () => {
        wrapper = mount(Model3DViewer, {
          propsData: {
            fileUrl: `http://example.com/model${ext}`,
            fileExt: ext
          }
        })

        expect(wrapper.vm.formatName).toBe(format)
      })

      it(`应该为 ${ext} 调用正确的加载器 ${method}`, () => {
        wrapper = mount(Model3DViewer, {
          propsData: {
            fileUrl: `http://example.com/model${ext}`,
            fileExt: ext
          }
        })

        const methodSpy = jest.spyOn(wrapper.vm, method)
        wrapper.vm.loadModel()

        expect(methodSpy).toHaveBeenCalled()
      })
    })

    it('应该自动从URL提取扩展名', () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/path/to/model.gltf?token=abc'
        }
      })

      const ext = wrapper.vm.extractExtFromUrl(wrapper.vm.fileUrl)
      expect(ext).toBe('.gltf')
    })

    it('不支持的格式应该显示错误', async () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.xyz',
          fileExt: '.xyz'
        }
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.vm.error).toBe(true)
      expect(wrapper.vm.errorMessage).toContain('不支持的3D格式')
    })
  })

  describe('加载状态', () => {
    it('加载中应该显示加载指示器', async () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf',
          fileExt: '.gltf'
        }
      })

      wrapper.vm.loading = true
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.loading-overlay').exists()).toBe(true)
      expect(wrapper.find('.a-spin').exists()).toBe(true)
    })

    it('加载错误应该显示错误信息', async () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      wrapper.vm.error = true
      wrapper.vm.errorMessage = '加载失败'
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.error-overlay').exists()).toBe(true)
      expect(wrapper.text()).toContain('加载失败')
    })

    it('加载成功应该显示控制提示', async () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      wrapper.vm.loading = false
      wrapper.vm.error = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.controls-hint').exists()).toBe(true)
      expect(wrapper.text()).toContain('左键拖动')
      expect(wrapper.text()).toContain('右键拖动')
      expect(wrapper.text()).toContain('滚轮')
    })
  })

  describe('事件触发', () => {
    it('加载成功应该触发 loaded 事件', () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      const mockObject = { name: 'TestModel' }
      wrapper.vm.onModelLoaded(mockObject, 'glTF')

      expect(wrapper.emitted().loaded).toBeTruthy()
      expect(wrapper.emitted().loaded[0][0]).toMatchObject({
        format: 'glTF',
        hasAnimation: false
      })
    })

    it('加载失败应该触发 error 事件', () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      const mockError = new Error('Load failed')
      wrapper.vm.onLoadError(mockError)

      expect(wrapper.emitted().error).toBeTruthy()
      expect(wrapper.emitted().error[0][0]).toBe(mockError)
    })

    it('点击重试按钮应该触发 retry 事件', async () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      wrapper.vm.error = true
      await wrapper.vm.$nextTick()

      const retryButton = wrapper.find('.error-overlay button')
      retryButton.trigger('click')

      expect(wrapper.emitted().retry).toBeTruthy()
    })
  })

  describe('模型统计信息', () => {
    it('应该正确计算模型顶点和面数', () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      const mockObject = {
        traverse: jest.fn((callback) => {
          // 模拟一个包含2个网格的模型
          callback({
            isMesh: true,
            geometry: {
              attributes: { position: { count: 1000 } },
              index: { count: 3000 }
            }
          })
          callback({
            isMesh: true,
            geometry: {
              attributes: { position: { count: 500 } },
              index: { count: 1500 }
            }
          })
        })
      }

      wrapper.vm.calculateModelInfo(mockObject, 'glTF')

      expect(wrapper.vm.modelInfo.vertices).toBe(1500) // 1000 + 500
      expect(wrapper.vm.modelInfo.faces).toBe(1500) // (3000 + 1500) / 3
      expect(wrapper.vm.modelInfo.format).toBe('glTF')
    })

    it('加载后应该显示模型信息', async () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      wrapper.vm.modelInfo = {
        loaded: true,
        format: 'glTF',
        vertices: 12345,
        faces: 5678,
        hasAnimation: false
      }
      wrapper.vm.loading = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.model-info').exists()).toBe(true)
      expect(wrapper.text()).toContain('glTF')
      expect(wrapper.text()).toContain('12,345') // 数字格式化
      expect(wrapper.text()).toContain('5,678')
    })
  })

  describe('动画支持', () => {
    it('检测到动画应该显示动画提示', async () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      wrapper.vm.modelInfo.hasAnimation = true
      wrapper.vm.loading = false
      wrapper.vm.error = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.animation-hint').exists()).toBe(true)
      expect(wrapper.text()).toContain('检测到动画')
    })

    it('动画循环应该更新mixer', () => {
      wrapper = mount(Model3DViewer, {
        propsData: {
          fileUrl: 'http://example.com/model.gltf'
        }
      })

      const mockMixer = {
        update: jest.fn()
      }
      wrapper.vm.mixer = mockMixer
      wrapper.vm.animate()

      expect(mockMixer.update).toHaveBeenCalled()
    })
  })
})
