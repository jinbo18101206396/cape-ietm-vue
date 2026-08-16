#!/usr/bin/env node
/**
 * 快速验证脚本 - 检查关键API是否可达
 */

const http = require('http')

const BASE_URL = 'localhost'
const FRONTEND_PORT = 3004
const BACKEND_PORT = 9999

const tests = [
  { name: '前端首页', port: FRONTEND_PORT, path: '/', method: 'GET' },
  { name: '后端健康检查', port: BACKEND_PORT, path: '/jeecg-boot/sys/common/health', method: 'GET' },
  { name: 'DM列表API', port: BACKEND_PORT, path: '/jeecg-boot/ietm/datamodule/list', method: 'GET' },
  { name: '字典API', port: BACKEND_PORT, path: '/jeecg-boot/sys/dict/getDictItems/dm_type', method: 'GET' }
]

console.log('='.repeat(80))
console.log('IETM 服务快速验证')
console.log('='.repeat(80))
console.log()

async function checkEndpoint(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_URL,
      port: test.port,
      path: test.path,
      method: test.method,
      timeout: 5000
    }

    const req = http.request(options, (res) => {
      resolve({
        name: test.name,
        port: test.port,
        status: res.statusCode,
        ok: res.statusCode >= 200 && res.statusCode < 400
      })
    })

    req.on('error', (err) => {
      resolve({
        name: test.name,
        port: test.port,
        status: 0,
        ok: false,
        error: err.message
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({
        name: test.name,
        port: test.port,
        status: 0,
        ok: false,
        error: 'Timeout'
      })
    })

    req.end()
  })
}

async function runTests() {
  const results = []

  for (const test of tests) {
    const result = await checkEndpoint(test)
    results.push(result)

    const status = result.ok ? '✅' : '❌'
    const detail = result.ok ? `HTTP ${result.status}` : (result.error || `HTTP ${result.status}`)
    console.log(`${status} ${result.name.padEnd(20)} [端口 ${result.port}] - ${detail}`)
  }

  console.log()
  console.log('='.repeat(80))

  const passed = results.filter(r => r.ok).length
  const total = results.length

  console.log(`总计: ${passed}/${total} 通过`)

  if (passed === total) {
    console.log('✅ 所有服务正常')
  } else {
    console.log('⚠️ 部分服务不可达')
  }

  console.log('='.repeat(80))

  process.exit(passed === total ? 0 : 1)
}

runTests()
