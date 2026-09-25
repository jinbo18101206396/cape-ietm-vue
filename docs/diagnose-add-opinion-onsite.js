/**
 * 追加意见功能 - 现场诊断脚本
 *
 * 使用方法：
 * 1. 打开DM内容编辑页面
 * 2. 打开浏览器开发者工具（F12）
 * 3. 切换到Console标签
 * 4. 复制粘贴此脚本并回车
 * 5. 将输出结果截图或复制给开发人员
 */

(function() {
  console.clear()
  console.log('========================================')
  console.log('追加意见功能 - 现场诊断')
  console.log('========================================\n')

  const results = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    issues: [],
    warnings: [],
    data: {}
  }

  // ========================================
  // 1. 检查LocalStorage中的用户信息
  // ========================================
  console.log('【步骤1】检查LocalStorage中的用户信息')
  try {
    const userInfoKey = '__USER_INFO__'
    const userInfoStr = localStorage.getItem(userInfoKey)

    if (!userInfoStr) {
      const error = '❌ LocalStorage中没有用户信息，请重新登录'
      console.error(error)
      results.issues.push(error)
    } else {
      console.log('✅ LocalStorage中存在用户信息')

      const userInfo = JSON.parse(userInfoStr)
      console.log('  原始JSON字符串长度:', userInfoStr.length)
      console.log('  用户ID:', userInfo.id)
      console.log('  用户ID类型:', typeof userInfo.id)
      console.log('  用户名:', userInfo.username)
      console.log('  真实姓名:', userInfo.realname)

      results.data.localStorage = {
        exists: true,
        userId: userInfo.id,
        userIdType: typeof userInfo.id,
        username: userInfo.username,
        realname: userInfo.realname
      }

      // 检查ID类型
      if (typeof userInfo.id === 'number') {
        const warning = '⚠️ 警告：LocalStorage中的ID是数字类型，可能存在精度丢失'
        console.warn(warning)
        results.warnings.push(warning)

        // 检查是否是长ID
        if (String(userInfo.id).length >= 16) {
          const error = '❌ 严重：19位雪花ID以数字类型存储，精度已丢失！'
          console.error(error)
          results.issues.push(error)

          // 计算精度丢失
          const originalStr = String(userInfo.id)
          console.log('  精度丢失示例:')
          console.log('    存储值:', originalStr)
          console.log('    可能的原始值:', originalStr.slice(0, -2) + 'XX')
        }
      } else if (typeof userInfo.id === 'string') {
        console.log('✅ ID类型正确（字符串）')
      } else {
        const error = `❌ ID类型异常: ${typeof userInfo.id}`
        console.error(error)
        results.issues.push(error)
      }
    }
  } catch (e) {
    const error = `❌ 读取LocalStorage失败: ${e.message}`
    console.error(error)
    results.issues.push(error)
  }
  console.log()

  // ========================================
  // 2. 检查Vuex Store中的用户信息
  // ========================================
  console.log('【步骤2】检查Vuex Store中的用户信息')
  try {
    // 尝试多种方式获取Vue实例
    let vueApp = null

    if (window.$app) {
      vueApp = window.$app
    } else if (window.__VUE__) {
      vueApp = window.__VUE__
    } else {
      // 尝试从DOM获取
      const appEl = document.getElementById('app')
      if (appEl && appEl.__vue__) {
        vueApp = appEl.__vue__
      }
    }

    if (!vueApp) {
      const warning = '⚠️ 无法获取Vue实例，跳过Store检查'
      console.warn(warning)
      console.log('  提示：请在页面完全加载后再运行此脚本')
      results.warnings.push(warning)
    } else {
      console.log('✅ 找到Vue实例')

      const store = vueApp.$store
      if (!store) {
        const error = '❌ 无法获取Vuex Store'
        console.error(error)
        results.issues.push(error)
      } else {
        const userInfo = store.getters.userInfo

        if (!userInfo) {
          const error = '❌ Vuex Store中没有用户信息'
          console.error(error)
          results.issues.push(error)
        } else {
          console.log('✅ Vuex Store中存在用户信息')
          console.log('  用户ID:', userInfo.id)
          console.log('  用户ID类型:', typeof userInfo.id)
          console.log('  用户名:', userInfo.username)

          results.data.vuexStore = {
            exists: true,
            userId: userInfo.id,
            userIdType: typeof userInfo.id,
            username: userInfo.username
          }

          // 检查ID类型
          if (typeof userInfo.id === 'number') {
            const error = '❌ Vuex Store中的ID仍是数字类型，修复未生效！'
            console.error(error)
            results.issues.push(error)
          } else if (typeof userInfo.id === 'string') {
            console.log('✅ ID类型正确（字符串），修复已生效')
          } else {
            const error = `❌ ID类型异常: ${typeof userInfo.id}`
            console.error(error)
            results.issues.push(error)
          }

          // 比较LocalStorage和Vuex Store的ID
          if (results.data.localStorage && results.data.localStorage.userId) {
            const lsId = String(results.data.localStorage.userId)
            const storeId = String(userInfo.id)

            if (lsId === storeId) {
              console.log('✅ LocalStorage和Vuex Store的ID一致')
            } else {
              const error = `❌ ID不一致: LocalStorage=${lsId}, Vuex=${storeId}`
              console.error(error)
              results.issues.push(error)
            }
          }
        }
      }
    }
  } catch (e) {
    const error = `❌ 检查Vuex Store失败: ${e.message}`
    console.error(error)
    results.issues.push(error)
  }
  console.log()

  // ========================================
  // 3. 检查流程信息面板组件
  // ========================================
  console.log('【步骤3】检查流程信息面板组件')
  console.log('  提示：请先在页面上打开"流程信息"面板')
  try {
    // 查找WorkflowInfoPanel组件实例
    let workflowPanel = null

    if (window.$app) {
      // 递归查找组件
      function findComponent(vm, name) {
        if (vm.$options.name === name || vm.$options._componentTag === name) {
          return vm
        }
        if (vm.$children) {
          for (let child of vm.$children) {
            const found = findComponent(child, name)
            if (found) return found
          }
        }
        return null
      }

      workflowPanel = findComponent(window.$app, 'WorkflowInfoPanel')
    }

    if (!workflowPanel) {
      const warning = '⚠️ 未找到WorkflowInfoPanel组件实例'
      console.warn(warning)
      console.log('  可能原因：')
      console.log('    1. 流程信息面板未打开')
      console.log('    2. 组件名称不匹配')
      console.log('    3. 页面结构已改变')
      results.warnings.push(warning)
    } else {
      console.log('✅ 找到WorkflowInfoPanel组件')

      console.log('  currentUserId:', workflowPanel.currentUserId)
      console.log('  currentUserId类型:', typeof workflowPanel.currentUserId)
      console.log('  currentUsername:', workflowPanel.currentUsername)
      console.log('  selectedNode:', workflowPanel.selectedNode)

      results.data.component = {
        exists: true,
        currentUserId: workflowPanel.currentUserId,
        currentUserIdType: typeof workflowPanel.currentUserId,
        currentUsername: workflowPanel.currentUsername,
        hasSelectedNode: !!workflowPanel.selectedNode,
        selectedNodeUserid: workflowPanel.selectedNode ? workflowPanel.selectedNode.userid : null
      }

      // 检查currentUserId
      if (typeof workflowPanel.currentUserId !== 'string') {
        const error = '❌ 组件的currentUserId不是字符串类型，computed修复未生效！'
        console.error(error)
        results.issues.push(error)
      } else {
        console.log('✅ 组件的currentUserId类型正确')
      }

      // 检查选中的节点
      if (workflowPanel.selectedNode) {
        const node = workflowPanel.selectedNode
        console.log('  节点信息:')
        console.log('    节点名称:', node.nodename)
        console.log('    节点序号:', node.seqno)
        console.log('    处理状态:', node.ifexec)
        console.log('    处理人(userid):', node.userid)
        console.log('    处理人类型:', typeof node.userid)

        // 模拟校验逻辑
        if (!node.userid) {
          const error = '❌ 节点的userid字段为空'
          console.error(error)
          results.issues.push(error)
        } else {
          const userids = node.userid.split(',').map(u => u.trim()).filter(u => u)
          const currentUserIdStr = String(workflowPanel.currentUserId || '')
          const currentUsernameStr = String(workflowPanel.currentUsername || '')

          console.log('  解析后的处理人列表:', userids)
          console.log('  当前用户ID（转字符串后）:', currentUserIdStr)
          console.log('  当前用户名（转字符串后）:', currentUsernameStr)

          const matchById = userids.includes(currentUserIdStr)
          const matchByUsername = userids.includes(currentUsernameStr)
          const finalResult = matchById || matchByUsername

          console.log('  ID匹配结果:', matchById)
          console.log('  用户名匹配结果:', matchByUsername)
          console.log('  最终校验结果:', finalResult)

          results.data.validation = {
            nodeUserid: node.userid,
            parsedUserids: userids,
            currentUserIdStr: currentUserIdStr,
            currentUsernameStr: currentUsernameStr,
            matchById: matchById,
            matchByUsername: matchByUsername,
            finalResult: finalResult
          }

          if (!finalResult) {
            const error = '❌ 校验失败：当前用户既不在处理人ID列表中，也不在处理人用户名列表中'
            console.error(error)
            results.issues.push(error)

            console.log('  详细比较:')
            userids.forEach((uid, index) => {
              console.log(`    处理人${index + 1}: "${uid}"`)
              console.log(`      vs 当前ID: "${currentUserIdStr}" → ${uid === currentUserIdStr ? '✅匹配' : '❌不匹配'}`)
              console.log(`      vs 当前用户名: "${currentUsernameStr}" → ${uid === currentUsernameStr ? '✅匹配' : '❌不匹配'}`)

              // 详细类型和值比较
              if (uid !== currentUserIdStr && uid !== currentUsernameStr) {
                console.log(`      字符码比较（前10个字符）:`)
                for (let i = 0; i < Math.min(10, Math.max(uid.length, currentUserIdStr.length)); i++) {
                  const uidChar = uid[i] || ''
                  const idChar = currentUserIdStr[i] || ''
                  if (uidChar !== idChar) {
                    console.log(`        位置${i}: "${uidChar}"(${uidChar.charCodeAt(0)}) vs "${idChar}"(${idChar.charCodeAt(0)})`)
                  }
                }
              }
            })
          } else {
            console.log('✅ 校验通过')
          }
        }

        // 检查其他前置条件
        if (node.ifexec !== 'Y') {
          const warning = '⚠️ 当前选中的节点未处理（ifexec !== Y），无法追加意见'
          console.warn(warning)
          results.warnings.push(warning)
        }

        if (node.seqno === 0 || node.seqno === '0') {
          const warning = '⚠️ 当前选中的是创建节点，无法追加意见'
          console.warn(warning)
          results.warnings.push(warning)
        }
      } else {
        const warning = '⚠️ 未选中任何节点'
        console.warn(warning)
        results.warnings.push(warning)
      }
    }
  } catch (e) {
    const error = `❌ 检查组件失败: ${e.message}`
    console.error(error, e)
    results.issues.push(error)
  }
  console.log()

  // ========================================
  // 4. 生成诊断报告
  // ========================================
  console.log('========================================')
  console.log('诊断报告')
  console.log('========================================')

  console.log('\n【严重问题】(' + results.issues.length + '个)')
  if (results.issues.length === 0) {
    console.log('  无')
  } else {
    results.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`)
    })
  }

  console.log('\n【警告】(' + results.warnings.length + '个)')
  if (results.warnings.length === 0) {
    console.log('  无')
  } else {
    results.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`)
    })
  }

  console.log('\n【建议措施】')
  if (results.issues.length === 0 && results.warnings.length === 0) {
    console.log('  ✅ 系统状态正常，如仍有问题请联系开发人员')
  } else {
    if (results.data.localStorage && typeof results.data.localStorage.userId === 'number') {
      console.log('  1. 清除浏览器缓存（Ctrl+Shift+Delete）')
      console.log('  2. 退出系统重新登录')
      console.log('  3. 确保前端代码已更新到最新版本')
    }

    if (results.data.vuexStore && typeof results.data.vuexStore.userId === 'number') {
      console.log('  1. 前端修复未生效，请联系开发人员检查代码部署')
      console.log('  2. 检查 WorkflowInfoPanel.vue 的 currentUserId computed 是否包含 String() 转换')
    }

    if (results.data.validation && !results.data.validation.finalResult) {
      console.log('  1. 确认选择的节点确实是您处理的')
      console.log('  2. 检查后端返回的节点处理人数据是否正确')
      console.log('  3. 检查用户ID是否有前后空格或特殊字符')
    }
  }

  console.log('\n【完整数据】')
  console.log(JSON.stringify(results, null, 2))

  console.log('\n========================================')
  console.log('诊断完成')
  console.log('========================================')
  console.log('请将以上所有输出截图或复制给开发人员')

  // 将结果保存到全局变量，方便复制
  window.__DIAGNOSIS_RESULT__ = results
  console.log('\n提示：完整数据已保存到 window.__DIAGNOSIS_RESULT__')
  console.log('      可通过 copy(__DIAGNOSIS_RESULT__) 复制到剪贴板')

})()
