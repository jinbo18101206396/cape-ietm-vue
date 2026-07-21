<template>
  <div class="vrml-viewer">
    <div ref="container" class="viewer-container"></div>

    <!-- 加载提示 -->
    <div v-if="loading" class="loading-overlay">
      <a-spin size="large" tip="加载3D模型中..." />
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
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { VRMLLoader } from 'three/examples/jsm/loaders/VRMLLoader'

export default {
  name: 'VrmlViewer',
  props: {
    // 文件URL（Blob URL 或 HTTP URL）
    fileUrl: {
      type: String,
      required: true
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
      animationId: null
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
     * 初始化 Three.js 场景
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

      // 启动渲染循环
      this.animate()

      // 监听窗口大小变化
      window.addEventListener('resize', this.onWindowResize)
    },

    /**
     * 加载 VRML 模型
     */
    loadModel() {
      if (!this.fileUrl) return

      this.loading = true
      this.error = false

      const loader = new VRMLLoader()

      loader.load(
        this.fileUrl,
        (object) => {
          // 加载成功
          this.loading = false

          // 移除旧模型
          if (this.model) {
            this.scene.remove(this.model)
          }

          // 添加新模型
          this.model = object
          this.scene.add(object)

          // 自动调整相机位置以适应模型
          this.fitCameraToModel(object)

          this.$emit('loaded')
        },
        (progress) => {
          // 加载进度
          if (progress.lengthComputable) {
            const percent = (progress.loaded / progress.total * 100).toFixed(2)
            console.log('加载进度:', percent + '%')
          }
        },
        (error) => {
          // 加载失败
          this.loading = false
          this.error = true
          this.errorMessage = '3D模型加载失败：' + (error.message || '未知错误')
          console.error('VRML加载失败:', error)
          this.$emit('error', error)
        }
      )
    },

    /**
     * 调整相机位置以适应模型
     */
    fitCameraToModel(object) {
      // 计算模型包围盒
      const box = new THREE.Box3().setFromObject(object)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      // 计算模型最大尺寸
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = this.camera.fov * (Math.PI / 180)
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

      // 添加一些边距
      cameraZ *= 1.5

      // 设置相机位置
      this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ)
      this.camera.lookAt(center)

      // 更新控制器目标点
      this.controls.target.copy(center)
      this.controls.update()

      // 设置相机的近远平面
      this.camera.near = cameraZ / 100
      this.camera.far = cameraZ * 100
      this.camera.updateProjectionMatrix()
    },

    /**
     * 动画循环
     */
    animate() {
      this.animationId = requestAnimationFrame(this.animate)

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
     * 窗口大小变化处理
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
     * 清理资源
     */
    dispose() {
      // 停止动画循环
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
      }

      // 移除窗口监听
      window.removeEventListener('resize', this.onWindowResize)

      // 清理控制器
      if (this.controls) {
        this.controls.dispose()
      }

      // 清理渲染器
      if (this.renderer) {
        this.renderer.dispose()
        if (this.$refs.container && this.renderer.domElement) {
          this.$refs.container.removeChild(this.renderer.domElement)
        }
      }

      // 清理场景中的对象
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

      // 清空引用
      this.scene = null
      this.camera = null
      this.renderer = null
      this.controls = null
      this.model = null
    }
  }
}
</script>

<style lang="less" scoped>
.vrml-viewer {
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
    }
  }
}
</style>
