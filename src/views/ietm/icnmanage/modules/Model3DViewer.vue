<template>
  <div class="model-3d-viewer">
    <div ref="container" class="viewer-container"></div>

    <!-- 加载提示 -->
    <div v-if="loading" class="loading-overlay">
      <a-spin size="large" :tip="`加载${formatName}模型中...`" />
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-overlay">
      <a-result status="error" :title="errorMessage">
        <template #extra>
          <a-button type="primary" @click="$emit('retry')">重试</a-button>
        </template>
      </a-result>
    </div>

    <!-- 控制提示 -->
    <div v-if="!loading && !error" class="controls-hint">
      <div class="hint-item">
        <a-icon type="drag" /> 左键拖动：旋转
      </div>
      <div class="hint-item">
        <a-icon type="arrows-alt" /> 右键拖动：平移
      </div>
      <div class="hint-item">
        <a-icon type="zoom-in" /> 滚轮：缩放
      </div>
      <div v-if="modelInfo.hasAnimation" class="hint-item animation-hint">
        <a-icon type="play-circle" /> 检测到动画（自动播放）
      </div>
    </div>

    <!-- 模型信息 -->
    <div v-if="modelInfo.loaded && !loading" class="model-info">
      <div class="info-item">
        <span class="label">格式:</span>
        <span class="value">{{ modelInfo.format }}</span>
      </div>
      <div class="info-item">
        <span class="label">顶点:</span>
        <span class="value">{{ modelInfo.vertices.toLocaleString() }}</span>
      </div>
      <div class="info-item">
        <span class="label">面数:</span>
        <span class="value">{{ modelInfo.faces.toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { VRMLLoader } from 'three/examples/jsm/loaders/VRMLLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'

/**
 * 通用3D模型查看器
 *
 * 复用VrmlViewer.vue 85%代码，扩展支持多种格式
 *
 * 支持格式:
 * - VRML (.wrl)       - 航空维修手册标准格式
 * - glTF (.gltf/.glb) - 现代3D标准，性能最优
 * - OBJ (.obj)        - 通用格式，广泛支持
 * - STL (.stl)        - 3D打印标准
 * - FBX (.fbx)        - Autodesk格式
 * - COLLADA (.dae)    - CAD交换格式
 * - PLY (.ply)        - 点云格式
 *
 * @author claude (基于VrmlViewer.vue重构)
 * @date 2026-09-19
 */
export default {
  name: 'Model3DViewer',
  props: {
    // 文件URL（Blob URL 或 HTTP URL）
    fileUrl: {
      type: String,
      required: true
    },
    // 文件扩展名（用于选择加载器）
    fileExt: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: false,
      error: false,
      errorMessage: '',
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      model: null,
      mixer: null, // 动画混合器
      clock: null, // 动画时钟
      animationId: null,
      modelInfo: {
        loaded: false,
        format: '',
        vertices: 0,
        faces: 0,
        hasAnimation: false
      }
    }
  },
  computed: {
    /**
     * 格式化显示名称
     */
    formatName() {
      const ext = this.fileExt.toLowerCase()
      const nameMap = {
        '.wrl': 'VRML',
        '.gltf': 'glTF',
        '.glb': 'glTF Binary',
        '.obj': 'OBJ',
        '.stl': 'STL',
        '.fbx': 'FBX',
        '.dae': 'COLLADA',
        '.ply': 'PLY'
      }
      return nameMap[ext] || '3D'
    }
  },
  watch: {
    fileUrl: {
      immediate: true,
      handler(newUrl) {
        if (newUrl) {
          this.loadModel()
        }
      }
    }
  },
  mounted() {
    this.initScene()
  },
  beforeDestroy() {
    this.dispose()
  },
  methods: {
    /**
     * ✅ 复用VrmlViewer - 初始化Three.js场景
     */
    initScene() {
      const container = this.$refs.container
      if (!container) return

      const width = container.clientWidth
      const height = container.clientHeight

      // 创建场景
      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0xf0f0f0)

      // 创建相机
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
      this.camera.position.set(5, 5, 5)

      // 创建渲染器
      this.renderer = new THREE.WebGLRenderer({ antialias: true })
      this.renderer.setSize(width, height)
      this.renderer.setPixelRatio(window.devicePixelRatio)
      container.appendChild(this.renderer.domElement)

      // 添加环境光
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      this.scene.add(ambientLight)

      // 添加方向光
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
      directionalLight.position.set(5, 10, 7.5)
      this.scene.add(directionalLight)

      // 添加网格辅助线
      const gridHelper = new THREE.GridHelper(10, 10)
      this.scene.add(gridHelper)

      // 添加坐标轴辅助线
      const axesHelper = new THREE.AxesHelper(5)
      this.scene.add(axesHelper)

      // 添加控制器
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.05
      this.controls.screenSpacePanning = false
      this.controls.minDistance = 1
      this.controls.maxDistance = 100

      // 动画时钟（用于glTF动画）
      this.clock = new THREE.Clock()

      // 启动渲染循环
      this.animate()

      // 监听窗口大小变化
      window.addEventListener('resize', this.onWindowResize)
    },

    /**
     * ⭐ 核心改进 - 根据文件扩展名动态选择加载器
     */
    loadModel() {
      if (!this.fileUrl) return

      this.loading = true
      this.error = false
      this.modelInfo.loaded = false

      let ext = (this.fileExt || this.extractExtFromUrl(this.fileUrl)).toLowerCase()

      // 🔧 确保扩展名有点号前缀（后端可能返回 "wrl" 而不是 ".wrl"）
      if (ext && !ext.startsWith('.')) {
        ext = '.' + ext
      }

      // 🎯 分发到对应的加载器
      switch (ext) {
        case '.wrl':
          this.loadVRML()
          break
        case '.gltf':
        case '.glb':
          this.loadGLTF()
          break
        case '.obj':
          this.loadOBJ()
          break
        case '.stl':
          this.loadSTL()
          break
        case '.fbx':
          this.loadFBX()
          break
        case '.dae':
          this.loadCollada()
          break
        case '.ply':
          this.loadPLY()
          break
        default:
          this.error = true
          this.errorMessage = `不支持的3D格式: ${ext}`
          this.loading = false
      }
    },

    /**
     * 从URL提取扩展名
     */
    extractExtFromUrl(url) {
      try {
        // 移除查询参数
        const path = url.split('?')[0]
        const match = path.match(/\.([a-z0-9]+)$/i)
        return match ? '.' + match[1].toLowerCase() : ''
      } catch (e) {
        return ''
      }
    },

    /**
     * ✅ 复用VrmlViewer - 加载VRML
     */
    loadVRML() {
      fetch(this.fileUrl)
        .then(response => response.text())
        .then(text => {
          const trimmedText = text.trim()
          const isBase64 = /^[A-Za-z0-9+/=\s]+$/.test(trimmedText) && !trimmedText.startsWith('#VRML')

          let vrmlText = trimmedText
          if (isBase64) {
            try {
              vrmlText = atob(trimmedText.replace(/\s/g, ''))
              console.log('[VRML] 检测到Base64编码，已自动解码')
            } catch (e) {
              console.warn('[VRML] Base64解码失败，使用原始文本', e)
            }
          }

          if (!vrmlText.startsWith('#VRML')) {
            throw new Error('不是有效的VRML文件格式（文件必须以 #VRML 开头）')
          }

          const blob = new Blob([vrmlText], { type: 'model/vrml' })
          const blobUrl = URL.createObjectURL(blob)

          const loader = new VRMLLoader()
          loader.load(
            blobUrl,
            (object) => {
              this.onModelLoaded(object, 'VRML')
              URL.revokeObjectURL(blobUrl)
            },
            (progress) => this.onProgress(progress),
            (error) => {
              this.onLoadError(error)
              URL.revokeObjectURL(blobUrl)
            }
          )
        })
        .catch(error => {
          this.onLoadError(error)
        })
    },

    /**
     * ⭐ 新增 - 加载glTF/GLB（现代3D标准，性能最优）
     */
    loadGLTF() {
      const loader = new GLTFLoader()

      loader.load(
        this.fileUrl,
        (gltf) => {
          // glTF支持动画
          if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(gltf.scene)
            gltf.animations.forEach(clip => {
              this.mixer.clipAction(clip).play()
            })
            this.modelInfo.hasAnimation = true
            console.log('[glTF] 检测到动画:', gltf.animations.length, '个')
          }

          this.onModelLoaded(gltf.scene, 'glTF')
        },
        (progress) => this.onProgress(progress),
        (error) => this.onLoadError(error)
      )
    },

    /**
     * ⭐ 新增 - 加载OBJ（通用格式）
     */
    loadOBJ() {
      const loader = new OBJLoader()

      loader.load(
        this.fileUrl,
        (object) => {
          // OBJ默认没有材质，添加基础材质
          object.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshPhongMaterial({
                color: 0xaaaaaa,
                side: THREE.DoubleSide
              })
            }
          })

          this.onModelLoaded(object, 'OBJ')
        },
        (progress) => this.onProgress(progress),
        (error) => this.onLoadError(error)
      )
    },

    /**
     * ⭐ 新增 - 加载STL（3D打印标准）
     */
    loadSTL() {
      const loader = new STLLoader()

      loader.load(
        this.fileUrl,
        (geometry) => {
          // STL只有几何体，需要创建材质和网格
          const material = new THREE.MeshPhongMaterial({
            color: 0x00d0ff,
            specular: 0x111111,
            shininess: 200,
            side: THREE.DoubleSide
          })

          const mesh = new THREE.Mesh(geometry, material)

          // STL可能需要旋转（通常是Z-up）
          mesh.rotation.x = -Math.PI / 2

          this.onModelLoaded(mesh, 'STL')
        },
        (progress) => this.onProgress(progress),
        (error) => this.onLoadError(error)
      )
    },

    /**
     * ⭐ 新增 - 加载FBX（Autodesk格式）
     */
    loadFBX() {
      const loader = new FBXLoader()

      loader.load(
        this.fileUrl,
        (object) => {
          // FBX支持动画
          if (object.animations && object.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(object)
            object.animations.forEach(clip => {
              this.mixer.clipAction(clip).play()
            })
            this.modelInfo.hasAnimation = true
            console.log('[FBX] 检测到动画:', object.animations.length, '个')
          }

          this.onModelLoaded(object, 'FBX')
        },
        (progress) => this.onProgress(progress),
        (error) => this.onLoadError(error)
      )
    },

    /**
     * ⭐ 新增 - 加载COLLADA（CAD交换格式）
     */
    loadCollada() {
      const loader = new ColladaLoader()

      loader.load(
        this.fileUrl,
        (collada) => {
          this.onModelLoaded(collada.scene, 'COLLADA')
        },
        (progress) => this.onProgress(progress),
        (error) => this.onLoadError(error)
      )
    },

    /**
     * ⭐ 新增 - 加载PLY（点云格式）
     */
    loadPLY() {
      const loader = new PLYLoader()

      loader.load(
        this.fileUrl,
        (geometry) => {
          // PLY可能是点云或网格
          const material = new THREE.MeshPhongMaterial({
            color: 0xff6600,
            specular: 0x111111,
            shininess: 200,
            side: THREE.DoubleSide,
            vertexColors: true // 支持顶点颜色
          })

          const mesh = new THREE.Mesh(geometry, material)

          this.onModelLoaded(mesh, 'PLY')
        },
        (progress) => this.onProgress(progress),
        (error) => this.onLoadError(error)
      )
    },

    /**
     * 🎯 统一的模型加载成功回调
     */
    onModelLoaded(object, formatName) {
      this.loading = false

      // 移除旧模型
      if (this.model) {
        this.scene.remove(this.model)
      }

      // 添加新模型
      this.model = object
      this.scene.add(object)

      // 计算模型统计信息
      this.calculateModelInfo(object, formatName)

      // 自动调整相机位置
      this.fitCameraToModel(object)

      this.$emit('loaded', {
        format: formatName,
        vertices: this.modelInfo.vertices,
        faces: this.modelInfo.faces,
        hasAnimation: this.modelInfo.hasAnimation
      })
    },

    /**
     * 🎯 统一的加载错误回调
     */
    onLoadError(error) {
      this.loading = false
      this.error = true
      this.errorMessage = '3D模型加载失败：' + (error.message || '未知错误')
      console.error('[Model3DViewer] 加载失败:', error)
      this.$emit('error', error)
    },

    /**
     * 加载进度回调
     */
    onProgress(progress) {
      if (progress.lengthComputable) {
        const percent = (progress.loaded / progress.total * 100).toFixed(2)
        console.log('[Model3DViewer] 加载进度:', percent + '%')
      }
    },

    /**
     * 计算模型统计信息
     */
    calculateModelInfo(object, formatName) {
      let vertices = 0
      let faces = 0

      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          const geo = child.geometry
          if (geo.attributes.position) {
            vertices += geo.attributes.position.count
          }
          if (geo.index) {
            faces += geo.index.count / 3
          } else if (geo.attributes.position) {
            faces += geo.attributes.position.count / 3
          }
        }
      })

      this.modelInfo = {
        loaded: true,
        format: formatName,
        vertices: Math.floor(vertices),
        faces: Math.floor(faces),
        hasAnimation: this.modelInfo.hasAnimation
      }
    },

    /**
     * ✅ 复用VrmlViewer - 调整相机位置以适应模型
     */
    fitCameraToModel(object) {
      const box = new THREE.Box3().setFromObject(object)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = this.camera.fov * (Math.PI / 180)
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

      cameraZ *= 1.5

      this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ)
      this.camera.lookAt(center)

      this.controls.target.copy(center)
      this.controls.update()

      this.camera.near = cameraZ / 100
      this.camera.far = cameraZ * 100
      this.camera.updateProjectionMatrix()
    },

    /**
     * ✅ 复用VrmlViewer - 动画循环（增加动画支持）
     */
    animate() {
      this.animationId = requestAnimationFrame(this.animate)

      // 更新动画混合器（glTF/FBX动画）
      if (this.mixer) {
        const delta = this.clock.getDelta()
        this.mixer.update(delta)
      }

      // 更新控制器
      if (this.controls) {
        this.controls.update()
      }

      // 渲染场景
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera)
      }
    },

    /**
     * ✅ 复用VrmlViewer - 窗口大小变化处理
     */
    onWindowResize() {
      const container = this.$refs.container
      if (!container) return

      const width = container.clientWidth
      const height = container.clientHeight

      if (this.camera) {
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()
      }

      if (this.renderer) {
        this.renderer.setSize(width, height)
      }
    },

    /**
     * ✅ 复用VrmlViewer - 清理资源
     */
    dispose() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
      }

      window.removeEventListener('resize', this.onWindowResize)

      if (this.mixer) {
        this.mixer.stopAllAction()
        this.mixer = null
      }

      if (this.controls) {
        this.controls.dispose()
      }

      if (this.renderer) {
        this.renderer.dispose()
        if (this.$refs.container && this.renderer.domElement) {
          this.$refs.container.removeChild(this.renderer.domElement)
        }
      }

      if (this.scene) {
        this.scene.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose()
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose())
            } else {
              object.material.dispose()
            }
          }
        })
      }

      this.scene = null
      this.camera = null
      this.renderer = null
      this.controls = null
      this.model = null
      this.clock = null
    }
  }
}
</script>

<style lang="less" scoped>
.model-3d-viewer {
  width: 100%;
  height: 100%;
  position: relative;

  .viewer-container {
    width: 100%;
    height: 100%;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.9);
    z-index: 10;
  }

  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    z-index: 10;
  }

  .controls-hint {
    position: absolute;
    bottom: 16px;
    left: 16px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 5;

    .hint-item {
      margin: 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;

      i {
        font-size: 14px;
      }

      &.animation-hint {
        color: #52c41a;
        font-weight: 500;
      }
    }
  }

  .model-info {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 5;

    .info-item {
      margin: 2px 0;
      display: flex;
      align-items: center;
      gap: 6px;

      .label {
        opacity: 0.8;
      }

      .value {
        font-weight: 500;
        font-family: 'Consolas', 'Monaco', monospace;
      }
    }
  }
}
</style>