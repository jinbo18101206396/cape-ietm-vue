/**
 * Model3DViewer 扩展名格式兼容性测试
 *
 * 测试Bug修复: 后端返回的fileExt可能没有点号前缀
 *
 * @author claude
 * @date 2026-09-19
 */

import { shallowMount } from '@vue/test-utils'
import Model3DViewer from '@/views/ietm/icnmanage/modules/Model3DViewer.vue'

describe('Model3DViewer - 扩展名格式兼容性', () => {
  let wrapper

  beforeEach(() => {
    // 创建基础wrapper
    wrapper = shallowMount(Model3DViewer, {
      propsData: {
        fileUrl: 'blob:http://localhost:3000/test.wrl',
        fileExt: 'wrl'  // 无点号格式
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
    }
  })

  describe('Bug #P0-001: 文件扩展名格式不匹配', () => {
    test('应该支持无点号的扩展名（后端常见格式）', () => {
      // 模拟后端返回格式
      const testCases = [
        { input: 'wrl', expected: '.wrl' },
        { input: 'gltf', expected: '.gltf' },
        { input: 'glb', expected: '.glb' },
        { input: 'obj', expected: '.obj' },
        { input: 'stl', expected: '.stl' },
        { input: 'fbx', expected: '.fbx' },
        { input: 'dae', expected: '.dae' },
        { input: 'ply', expected: '.ply' }
      ]

      testCases.forEach(({ input, expected }) => {
        wrapper.setProps({ fileExt: input })

        // 触发loadModel
        wrapper.vm.loadModel()

        // 验证不应该显示"不支持的3D格式"错误
        expect(wrapper.vm.error).toBe(false)
        expect(wrapper.vm.errorMessage).not.toContain('不支持的3D格式')
      })
    })

    test('应该支持有点号的扩展名（标准格式）', () => {
      const testCases = [
        '.wrl',
        '.gltf',
        '.glb',
        '.obj',
        '.stl',
        '.fbx',
        '.dae',
        '.ply'
      ]

      testCases.forEach(ext => {
        wrapper.setProps({ fileExt: ext })

        wrapper.vm.loadModel()

        // 验证不应该显示错误
        expect(wrapper.vm.error).toBe(false)
        expect(wrapper.vm.errorMessage).not.toContain('不支持的3D格式')
      })
    })

    test('应该支持大小写混合的扩展名', () => {
      const testCases = [
        { input: 'WRL', expected: '.wrl' },
        { input: 'GLTF', expected: '.gltf' },
        { input: 'Obj', expected: '.obj' },
        { input: 'STL', expected: '.stl' }
      ]

      testCases.forEach(({ input }) => {
        wrapper.setProps({ fileExt: input })

        wrapper.vm.loadModel()

        expect(wrapper.vm.error).toBe(false)
      })
    })

    test('不支持的格式应该显示错误', () => {
      const unsupportedFormats = [
        'xyz',
        'abc',
        'unknown'
      ]

      unsupportedFormats.forEach(ext => {
        wrapper.setProps({ fileExt: ext })

        wrapper.vm.loadModel()

        // 应该显示错误
        expect(wrapper.vm.error).toBe(true)
        expect(wrapper.vm.errorMessage).toContain('不支持的3D格式')
      })
    })

    test('空扩展名应该回退到从URL提取', () => {
      wrapper.setProps({
        fileExt: '',
        fileUrl: 'http://example.com/model.wrl'
      })

      wrapper.vm.loadModel()

      // 应该从URL提取到.wrl
      expect(wrapper.vm.error).toBe(false)
    })

    test('URL提取的扩展名应该正常工作', () => {
      const testUrls = [
        { url: 'http://example.com/model.wrl', shouldWork: true },
        { url: 'http://example.com/model.gltf', shouldWork: true },
        { url: 'http://example.com/model.obj', shouldWork: true },
        { url: 'blob:http://localhost/abc-def.wrl', shouldWork: true },
        { url: 'http://example.com/model.unknown', shouldWork: false }
      ]

      testUrls.forEach(({ url, shouldWork }) => {
        wrapper.setProps({
          fileExt: '',
          fileUrl: url
        })

        wrapper.vm.loadModel()

        expect(wrapper.vm.error).toBe(!shouldWork)
      })
    })
  })

  describe('修复验证: 点号前缀处理', () => {
    test('extractExtFromUrl应该返回带点号的扩展名', () => {
      const testCases = [
        { url: 'http://example.com/model.wrl', expected: '.wrl' },
        { url: 'http://example.com/model.GLTF', expected: '.gltf' },
        { url: 'blob:http://localhost/test.obj', expected: '.obj' },
        { url: 'http://example.com/model.wrl?token=abc', expected: '.wrl' }
      ]

      testCases.forEach(({ url, expected }) => {
        const result = wrapper.vm.extractExtFromUrl(url)
        expect(result).toBe(expected)
      })
    })

    test('loadModel应该统一处理有无点号的扩展名', () => {
      // 测试内部ext变量的转换
      const spy = jest.spyOn(wrapper.vm, 'loadVRML')

      // 无点号 → 应该转换为有点号并匹配
      wrapper.setProps({ fileExt: 'wrl' })
      wrapper.vm.loadModel()
      expect(spy).toHaveBeenCalled()

      spy.mockClear()

      // 有点号 → 应该直接匹配
      wrapper.setProps({ fileExt: '.wrl' })
      wrapper.vm.loadModel()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('边界情况测试', () => {
    test('null扩展名应该使用URL', () => {
      wrapper.setProps({
        fileExt: null,
        fileUrl: 'http://example.com/model.wrl'
      })

      wrapper.vm.loadModel()

      expect(wrapper.vm.error).toBe(false)
    })

    test('undefined扩展名应该使用URL', () => {
      wrapper.setProps({
        fileExt: undefined,
        fileUrl: 'http://example.com/model.wrl'
      })

      wrapper.vm.loadModel()

      expect(wrapper.vm.error).toBe(false)
    })

    test('空字符串扩展名应该使用URL', () => {
      wrapper.setProps({
        fileExt: '',
        fileUrl: 'http://example.com/model.wrl'
      })

      wrapper.vm.loadModel()

      expect(wrapper.vm.error).toBe(false)
    })

    test('仅有点号的扩展名应该显示错误', () => {
      wrapper.setProps({ fileExt: '.' })

      wrapper.vm.loadModel()

      expect(wrapper.vm.error).toBe(true)
    })

    test('多个点号的扩展名应该取最后一个', () => {
      wrapper.setProps({
        fileExt: '',
        fileUrl: 'http://example.com/model.backup.wrl'
      })

      const ext = wrapper.vm.extractExtFromUrl('http://example.com/model.backup.wrl')

      expect(ext).toBe('.wrl')
    })
  })

  describe('回归测试: 所有格式', () => {
    const allFormats = [
      { ext: 'wrl', loaderMethod: 'loadVRML' },
      { ext: 'gltf', loaderMethod: 'loadGLTF' },
      { ext: 'glb', loaderMethod: 'loadGLTF' },
      { ext: 'obj', loaderMethod: 'loadOBJ' },
      { ext: 'stl', loaderMethod: 'loadSTL' },
      { ext: 'fbx', loaderMethod: 'loadFBX' },
      { ext: 'dae', loaderMethod: 'loadCollada' },
      { ext: 'ply', loaderMethod: 'loadPLY' }
    ]

    allFormats.forEach(({ ext, loaderMethod }) => {
      test(`${ext}格式应该调用${loaderMethod}方法（无点号）`, () => {
        const spy = jest.spyOn(wrapper.vm, loaderMethod)

        wrapper.setProps({ fileExt: ext })
        wrapper.vm.loadModel()

        expect(spy).toHaveBeenCalled()
        expect(wrapper.vm.error).toBe(false)
      })

      test(`${ext}格式应该调用${loaderMethod}方法（有点号）`, () => {
        const spy = jest.spyOn(wrapper.vm, loaderMethod)

        wrapper.setProps({ fileExt: '.' + ext })
        wrapper.vm.loadModel()

        expect(spy).toHaveBeenCalled()
        expect(wrapper.vm.error).toBe(false)
      })
    })
  })

  describe('性能测试', () => {
    test('点号前缀处理不应该显著影响性能', () => {
      const iterations = 1000
      const start = Date.now()

      for (let i = 0; i < iterations; i++) {
        wrapper.setProps({ fileExt: 'wrl' })
        wrapper.vm.loadModel()
      }

      const duration = Date.now() - start

      // 1000次调用应该在100ms内完成
      expect(duration).toBeLessThan(100)
    })
  })
})
