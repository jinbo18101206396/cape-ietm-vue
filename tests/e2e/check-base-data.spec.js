// 检查数据库中的项目、构型节点等基础数据
import { test } from '@playwright/test'

const API_BASE = 'http://127.0.0.1:9999/jeecg-boot'
const TEST_USER = { username: 'admin', password: '123456' }

test('检查基础数据', async ({ request }) => {
  const loginResp = await request.post(`${API_BASE}/sys/login`, {
    data: TEST_USER
  })
  const token = loginData.result.token
  console.log('✅ 登录成功')

  // 尝试各种可能的查询接口
  const endpoints = [
    '/ietm/project/list',
    '/ietm/ietmProject/list',
    '/ietm/cmNode/list',
    '/ietm/configManagement/list'
  ]

  for (const endpoint of endpoints) {
    console.log(`\n查询: ${endpoint}`)
    try {
      const resp = await request.get(`${API_BASE}${endpoint}?pageNo=1&pageSize=10`, {
        headers: { 'X-Access-Token': token }
      })

      if (resp.status() === 200) {
        const data = await resp.json()
        if (data.success) {
          console.log(`  ✅ 成功 (total=${data.result?.total || data.result?.length || 0})`)

          if (data.result?.records?.length > 0) {
            console.log(`  前3条记录:`)
            data.result.records.slice(0, 3).forEach((r, i) => {
              console.log(`    ${i+1}. ID=${r.id}, Name=${r.projectName || r.nodeName || r.name || 'N/A'}`)
            })
          } else if (Array.isArray(data.result) && data.result.length > 0) {
            console.log(`  前3条记录:`)
            data.result.slice(0, 3).forEach((r, i) => {
              console.log(`    ${i+1}. ID=${r.id}, Name=${r.projectName || r.nodeName || r.name || 'N/A'}`)
            })
          }
        } else {
          console.log(`  ⚠️ 失败: ${data.message}`)
        }
      } else if (resp.status() === 404) {
        console.log(`  ⚠️ 404 Not Found`)
      } else {
        console.log(`  ⚠️ HTTP ${resp.status()}`)
      }
    } catch (e) {
      console.log(`  ❌ 异常: ${e.message}`)
    }
  }

  console.log('\n===========================================')
  console.log('结论: 需要先通过UI或其他方式创建项目和构型节点')
  console.log('===========================================')
})
