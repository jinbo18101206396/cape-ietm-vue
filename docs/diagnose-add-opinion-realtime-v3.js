/**
 * 追加意见功能 - 实时深度诊断脚本 v3
 *
 * 使用方法：
 * 1. 打开DM内容编辑页面
 * 2. 在"流程信息"面板中选择一个节点
 * 3. 打开浏览器Console（F12）
 * 4. 复制粘贴此脚本并回车
 * 5. 查看详细诊断结果
 */

(function() {
  console.clear()
  console.log('%c========================================', 'color: blue; font-weight: bold')
  console.log('%c追加意见功能 - 实时深度诊断 v3', 'color: blue; font-weight: bold')
  console.log('%c========================================', 'color: blue; font-weight: bold')
  console.log('')

  const report = {
    timestamp: new Date().toLocaleString('zh-CN'),
    issues: [],
    warnings: [],
    info: [],
    debug: {}
  }

  // ========================================
  // 步骤1: 检查Vue应用
  // ========================================
  console.log('%c【步骤1】检查Vue应用实例', 'color: green; font-weight: bold')

  let app = null
  if (window.$app) {
    app = window.$app
    console.log('✅ 找到Vue应用实例 (window.$app)')
  } else if (document.getElementById('app').__vue__) {
    app = document.getElementById('app').__vue__
    console.log('✅ 找到Vue应用实例 (document.getElementById)')
  } else {
    console.error('❌ 无法找到Vue应用实例')
    report.issues.push('无法找到Vue应用实例')
    return
  }

  // ========================================
  // 步骤2: 查找WorkflowInfoPanel组件
  // ========================================
  console.log('')
  console.log('%c【步骤2】查找WorkflowInfoPanel组件', 'color: green; font-weight: bold')

  function findComponent(vm, name) {
    if (!vm) return null
    if (vm.$options && (vm.$options.name === name || vm.$options._componentTag === name)) {
      return vm
    }
    if (vm.$children && vm.$children.length > 0) {
      for (let child of vm.$children) {
        const found = findComponent(child, name)
        if (found) return found
      }
    }
    return null
  }

  const panel = findComponent(app, 'WorkflowInfoPanel')

  if (!panel) {
    console.error('❌ 未找到WorkflowInfoPanel组件')
    console.log('提示：请确保"流程信息"面板已打开')
    report.issues.push('未找到WorkflowInfoPanel组件 - 流程信息面板可能未打开')
    return
  }

  console.log('✅ 找到WorkflowInfoPanel组件')
  report.debug.componentFound = true

  // ========================================
  // 步骤3: 检查用户信息
  // ========================================
  console.log('')
  console.log('%c【步骤3】检查当前用户信息', 'color: green; font-weight: bold')

  const currentUserId = panel.currentUserId
  const currentUsername = panel.currentUsername

  console.log('currentUserId:', currentUserId)
  console.log('currentUserId类型:', typeof currentUserId)
  console.log('currentUsername:', currentUsername)
  console.log('currentUsername类型:', typeof currentUsername)

  report.debug.currentUserId = currentUserId
  report.debug.currentUserIdType = typeof currentUserId
  report.debug.currentUsername = currentUsername

  // 检查用户ID类型
  if (typeof currentUserId !== 'string' && currentUserId !== null) {
    console.error('❌ currentUserId不是字符串类型！修复未生效')
    report.issues.push(`currentUserId类型错误：${typeof currentUserId}，应该是string`)
  } else if (typeof currentUserId === 'string') {
    console.log('✅ currentUserId类型正确（string）')
    report.info.push('currentUserId类型正确')
  }

  if (!currentUserId && !currentUsername) {
    console.error('❌ 用户ID和用户名都为空！')
    report.issues.push('用户ID和用户名都为空')
  }

  // ========================================
  // 步骤4: 检查选中的节点
  // ========================================
  console.log('')
  console.log('%c【步骤4】检查选中的节点', 'color: green; font-weight: bold')

  const selectedNode = panel.selectedNode

  if (!selectedNode) {
    console.error('❌ 未选中任何节点')
    console.log('提示：请在"流程信息"面板中点击选择一个节点')
    report.issues.push('未选中任何节点')
    return
  }

  console.log('✅ 已选中节点')
  console.log('节点信息:')
  console.log('  - 节点名称:', selectedNode.nodename)
  console.log('  - 节点序号:', selectedNode.seqno)
  console.log('  - 处理状态:', selectedNode.ifexec)
  console.log('  - 处理人(userid):', selectedNode.userid)
  console.log('  - 处理人类型:', typeof selectedNode.userid)

  report.debug.selectedNode = {
    nodename: selectedNode.nodename,
    seqno: selectedNode.seqno,
    ifexec: selectedNode.ifexec,
    userid: selectedNode.userid,
    useridType: typeof selectedNode.userid
  }

  // 检查前置条件
  let canProceed = true

  if (selectedNode.ifexec !== 'Y') {
    console.error('❌ 节点未处理（ifexec !== Y）')
    report.issues.push('选中的节点未处理，只能对已处理的节点追加意见')
    canProceed = false
  } else {
    console.log('✅ 节点已处理')
  }

  if (selectedNode.seqno === 0 || selectedNode.seqno === '0') {
    console.error('❌ 选中的是创建节点（seqno = 0）')
    report.issues.push('创建节点不能追加意见')
    canProceed = false
  } else {
    console.log('✅ 不是创建节点')
  }

  if (!selectedNode.userid) {
    console.error('❌ 节点的userid字段为空')
    report.issues.push('节点的userid字段为空，后端数据异常')
    canProceed = false
  } else {
    console.log('✅ 节点有处理人信息')
  }

  if (!canProceed) {
    console.log('')
    console.log('%c前置条件检查失败，无法继续', 'color: red; font-weight: bold')
    return
  }

  // ========================================
  // 步骤5: 详细的处理人校验
  // ========================================
  console.log('')
  console.log('%c【步骤5】处理人校验（核心逻辑）', 'color: green; font-weight: bold')

  // 解析处理人列表
  const userid = selectedNode.userid
  console.log('原始userid字段:', JSON.stringify(userid))

  const userids = userid.split(',').map(u => u.trim()).filter(u => u)
  console.log('解析后的处理人列表:', userids)
  console.log('处理人数量:', userids.length)

  // 显示每个处理人
  userids.forEach((uid, index) => {
    console.log(`  处理人${index + 1}: "${uid}" (长度: ${uid.length})`)
  })

  // 转换当前用户信息
  const currentUserIdStr = String(currentUserId || '')
  const currentUsernameStr = String(currentUsername || '')

  console.log('')
  console.log('当前用户信息（转字符串后）:')
  console.log('  currentUserIdStr:', JSON.stringify(currentUserIdStr))
  console.log('  长度:', currentUserIdStr.length)
  console.log('  currentUsernameStr:', JSON.stringify(currentUsernameStr))
  console.log('  长度:', currentUsernameStr.length)

  // 逐个比较
  console.log('')
  console.log('逐个比较:')

  let matchById = false
  let matchByUsername = false
  let matchDetails = []

  userids.forEach((uid, index) => {
    const idMatch = uid === currentUserIdStr
    const nameMatch = uid === currentUsernameStr

    console.log(`处理人${index + 1}: "${uid}"`)
    console.log(`  vs currentUserId: "${currentUserIdStr}" → ${idMatch ? '✅ 匹配' : '❌ 不匹配'}`)
    console.log(`  vs currentUsername: "${currentUsernameStr}" → ${nameMatch ? '✅ 匹配' : '❌ 不匹配'}`)

    if (idMatch) {
      matchById = true
      matchDetails.push(`ID匹配: ${uid}`)
    }
    if (nameMatch) {
      matchByUsername = true
      matchDetails.push(`用户名匹配: ${uid}`)
    }

    // 如果不匹配，详细比较
    if (!idMatch && !nameMatch) {
      console.log('  详细比较:')

      // 比较与ID
      if (uid.length !== currentUserIdStr.length) {
        console.log(`    长度不同: ${uid.length} vs ${currentUserIdStr.length}`)
      } else {
        for (let i = 0; i < uid.length; i++) {
          if (uid[i] !== currentUserIdStr[i]) {
            console.log(`    位置${i}不同: "${uid[i]}"(${uid.charCodeAt(i)}) vs "${currentUserIdStr[i]}"(${currentUserIdStr.charCodeAt(i)})`)
          }
        }
      }

      // 比较与用户名
      if (uid.length !== currentUsernameStr.length) {
        console.log(`    用户名长度不同: ${uid.length} vs ${currentUsernameStr.length}`)
      }
    }
  })

  const finalResult = matchById || matchByUsername

  console.log('')
  console.log('%c校验结果:', 'font-weight: bold')
  console.log('  ID匹配:', matchById ? '✅ 是' : '❌ 否')
  console.log('  用户名匹配:', matchByUsername ? '✅ 是' : '❌ 否')
  console.log('  最终结果:', finalResult ? '✅ 通过' : '❌ 失败')

  if (matchDetails.length > 0) {
    console.log('  匹配详情:', matchDetails.join(', '))
  }

  report.debug.validation = {
    userids: userids,
    currentUserIdStr: currentUserIdStr,
    currentUsernameStr: currentUsernameStr,
    matchById: matchById,
    matchByUsername: matchByUsername,
    finalResult: finalResult
  }

  // ========================================
  // 步骤6: 调用实际的校验方法
  // ========================================
  console.log('')
  console.log('%c【步骤6】调用组件的isCurrentUserNode方法', 'color: green; font-weight: bold')

  const actualResult = panel.isCurrentUserNode(selectedNode)
  console.log('组件方法返回:', actualResult ? '✅ true' : '❌ false')

  if (actualResult !== finalResult) {
    console.error('⚠️ 警告：手动计算结果与组件方法不一致！')
    report.warnings.push('手动计算与组件方法结果不一致')
  }

  // ========================================
  // 步骤7: 根因分析
  // ========================================
  console.log('')
  console.log('%c【步骤7】根因分析', 'color: green; font-weight: bold')

  if (!finalResult) {
    console.error('❌ 校验失败的原因分析:')

    // 原因1: 用户ID/用户名都不在处理人列表中
    if (!matchById && !matchByUsername) {
      console.error('  1. 当前用户的ID和用户名都不在节点处理人列表中')
      console.error('     - 节点处理人:', userids.join(', '))
      console.error('     - 当前用户ID:', currentUserIdStr)
      console.error('     - 当前用户名:', currentUsernameStr)
      report.issues.push('当前用户不在节点处理人列表中')

      // 可能的子原因
      console.log('')
      console.log('  可能的原因:')

      // 子原因1: 选错了节点
      console.log('  a) 选错了节点')
      console.log('     解决: 确认选择的节点"处理人"列中显示的是您的名字')

      // 子原因2: 后端数据错误
      console.log('  b) 后端数据错误')
      console.log('     解决: 联系管理员检查数据库中的userid字段')

      // 子原因3: 精度丢失（但已转字符串）
      if (currentUserIdStr.length >= 16) {
        console.log('  c) ID精度可能已丢失（19位雪花ID）')
        console.log(`     当前ID: ${currentUserIdStr}`)
        console.log('     解决: 清除浏览器缓存后重新登录')
        report.warnings.push('检测到长ID，可能存在精度丢失')
      }

      // 子原因4: 类型问题（虽然已转字符串）
      if (typeof currentUserId !== 'string') {
        console.log('  d) currentUserId类型仍不是字符串')
        console.log(`     当前类型: ${typeof currentUserId}`)
        console.log('     解决: 前端代码修复未生效，需要更新代码')
        report.issues.push('currentUserId类型错误，修复未生效')
      }
    }
  } else {
    console.log('✅ 校验通过！功能应该正常工作')
    report.info.push('校验通过')
  }

  // ========================================
  // 步骤8: 生成报告
  // ========================================
  console.log('')
  console.log('%c========================================', 'color: blue; font-weight: bold')
  console.log('%c诊断报告', 'color: blue; font-weight: bold')
  console.log('%c========================================', 'color: blue; font-weight: bold')

  console.log('')
  console.log('%c【严重问题】' + report.issues.length + '个', 'color: red; font-weight: bold')
  if (report.issues.length === 0) {
    console.log('  无')
  } else {
    report.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`)
    })
  }

  console.log('')
  console.log('%c【警告】' + report.warnings.length + '个', 'color: orange; font-weight: bold')
  if (report.warnings.length === 0) {
    console.log('  无')
  } else {
    report.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`)
    })
  }

  console.log('')
  console.log('%c【建议操作】', 'color: green; font-weight: bold')

  if (report.issues.length === 0 && report.warnings.length === 0) {
    console.log('  ✅ 校验通过，追加意见功能应该正常')
    console.log('  如果仍有问题，请刷新页面后重试')
  } else {
    console.log('  请根据以上分析采取对应措施:')

    if (report.issues.includes('当前用户不在节点处理人列表中')) {
      console.log('  1. 确认选择的节点确实是您处理的')
      console.log('  2. 查看节点"处理人"列是否显示您的名字')
      console.log('  3. 如果不是，请选择正确的节点')
    }

    if (report.warnings.includes('检测到长ID，可能存在精度丢失')) {
      console.log('  1. 清除浏览器缓存（Ctrl+Shift+Delete）')
      console.log('  2. 退出系统重新登录')
      console.log('  3. 确保前端代码已更新')
    }

    if (report.issues.includes('currentUserId类型错误，修复未生效')) {
      console.log('  1. 确认前端代码已部署最新版本')
      console.log('  2. 强制刷新页面（Ctrl+F5）')
      console.log('  3. 清除浏览器缓存')
    }

    if (report.issues.includes('未找到WorkflowInfoPanel组件 - 流程信息面板可能未打开')) {
      console.log('  1. 确保"流程信息"面板已打开')
      console.log('  2. 重新运行诊断脚本')
    }
  }

  // 保存到全局变量
  window.__DIAGNOSIS_V3__ = report
  console.log('')
  console.log('诊断数据已保存到: window.__DIAGNOSIS_V3__')
  console.log('可使用 copy(__DIAGNOSIS_V3__) 复制到剪贴板')

  console.log('')
  console.log('%c========================================', 'color: blue; font-weight: bold')
  console.log('%c诊断完成', 'color: blue; font-weight: bold')
  console.log('%c========================================', 'color: blue; font-weight: bold')

})()
