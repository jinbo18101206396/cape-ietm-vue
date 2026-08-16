const axios = require('axios')
const BASE_URL = 'http://localhost:9999/jeecg-boot'

async function test() {
  // 登录
  const loginRes = await axios.post(`${BASE_URL}/sys/login`, {
    username: 'admin',
    password: '123456'
  })
  const token = loginRes.data.result.token
  console.log('✅ 登录成功\n')

  // 测试list接口
  console.log('测试 /ietm/datamodule/list 接口...')
  const listRes = await axios.get(`${BASE_URL}/ietm/datamodule/list`, {
    headers: { 'X-Access-Token': token },
    params: { pageNo: 1, pageSize: 5 }
  })

  console.log('响应结构:')
  console.log(JSON.stringify(listRes.data, null, 2))
}

test().catch(err => {
  console.error('错误:', err.message)
  if (err.response) {
    console.error('响应:', err.response.data)
  }
})
