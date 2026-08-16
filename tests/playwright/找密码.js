/**
 * 测试多个常见密码组合
 */
const axios = require('axios')
const BASE_URL = 'http://localhost:9999/jeecg-boot'

async function tryLogin() {
  const passwords = ['admin123', 'Admin@123', '123456', 'admin', 'password']

  for (const pwd of passwords) {
    try {
      console.log(`尝试密码: ${pwd}`)
      const res = await axios.post(`${BASE_URL}/sys/login`, {
        username: 'admin',
        password: pwd
      })
      if (res.data.success) {
        console.log(`\n✅ 登录成功！正确密码是: ${pwd}`)
        console.log(`Token: ${res.data.result.token}`)
        return
      }
    } catch (err) {
      // continue
    }
  }
  console.log('\n❌ 所有常见密码都失败了')
}

tryLogin()
