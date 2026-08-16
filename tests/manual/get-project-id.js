/**
 * 获取可用的项目ID
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:9999'
const API_PREFIX = '/jeecg-boot'

async function login() {
  const response = await axios.post(`${BASE_URL}${API_PREFIX}/sys/login`, {
    username: 'admin',
    password: '123456'
  })
  return response.data.result.token
}

async function getProjects(token) {
  const response = await axios.get(`${BASE_URL}${API_PREFIX}/ietmproject/ietmProject/list`, {
    headers: { 'X-Access-Token': token },
    params: { pageNo: 1, pageSize: 10 }
  })
  return response.data.result
}

async function main() {
  try {
    console.log('获取项目列表...')
    const token = await login()
    const projects = await getProjects(token)

    console.log('\n可用项目:')
    if (projects && projects.records) {
      projects.records.forEach((p, i) => {
        console.log(`  [${i+1}] ID: ${p.id} | 名称: ${p.projectName} | 编号: ${p.projectNo}`)
      })

      if (projects.records.length > 0) {
        console.log(`\n建议使用第一个项目ID: ${projects.records[0].id}`)
      }
    } else {
      console.log('  (无项目)')
    }
  } catch (error) {
    console.error('错误:', error.message)
  }
}

main()
