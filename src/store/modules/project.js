import { getAction, postAction } from '@/api/manage'

const project = {
  state: {
    currentProject: null
  },

  mutations: {
    SET_CURRENT_PROJECT: (state, project) => {
      state.currentProject = project
    },
    CLEAR_CURRENT_PROJECT: (state) => {
      state.currentProject = null
    }
  },

  actions: {
    // 加载当前项目
    LoadCurrentProject({ commit }) {
      return new Promise((resolve, reject) => {
        getAction('/ietmproject/ietmProject/getCurrentProject')
          .then(res => {
            if (res.success && res.result) {
              commit('SET_CURRENT_PROJECT', res.result)
              resolve(res.result)
            } else {
              resolve(null)
            }
          })
          .catch(error => {
            console.error('加载当前项目失败:', error)
            reject(error)
          })
      })
    },

    // 打开项目
    OpenProject({ commit }, projectData) {
      return new Promise((resolve, reject) => {
        postAction('/ietmproject/ietmProject/openProject', {
          projectId: projectData.id
        })
          .then(res => {
            if (res.success) {
              commit('SET_CURRENT_PROJECT', res.result)
              resolve(res.result)
            } else {
              reject(res.message || '打开项目失败')
            }
          })
          .catch(error => {
            console.error('打开项目失败:', error)
            reject(error)
          })
      })
    },

    // 关闭项目
    CloseProject({ commit }) {
      return new Promise((resolve, reject) => {
        postAction('/ietmproject/ietmProject/closeProject')
          .then(res => {
            if (res.success) {
              commit('CLEAR_CURRENT_PROJECT')
              resolve()
            } else {
              reject(res.message || '关闭项目失败')
            }
          })
          .catch(error => {
            console.error('关闭项目失败:', error)
            reject(error)
          })
      })
    }
  }
}

export default project
