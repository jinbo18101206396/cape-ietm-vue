#!/usr/bin/env node

const http = require('http')

// 登录
const loginData = JSON.stringify({username:'admin',password:'123456',captcha:''})
const loginReq = http.request({
  hostname:'localhost',
  port:9999,
  path:'/jeecg-boot/sys/login',
  method:'POST',
  headers:{'Content-Type':'application/json'}
}, res => {
  let body = ''
  res.on('data', chunk => body += chunk)
  res.on('end', () => {
    const token = JSON.parse(body).result.token

    // 加载 DM
    const dmReq = http.request({
      hostname:'localhost',
      port:9999,
      path:'/jeecg-boot/ietm/dm-content/load/2083556266365288450',
      method:'GET',
      headers:{'X-Access-Token':token}
    }, res2 => {
      let data = ''
      res2.on('data', chunk => data += chunk)
      res2.on('end', () => {
        const json = JSON.parse(data)
        const xml = json.result.xml

        console.log('\n╔════════════════════════════════════════════════════════════╗')
        console.log('║     验证保存的内容是否正确                                ║')
        console.log('╚════════════════════════════════════════════════════════════╝\n')

        console.log('版本号:', json.result.version)
        console.log('XML 长度:', xml.length, '字符')
        console.log('XML 行数:', xml.split('\n').length, '行\n')

        console.log('内容验证：')
        console.log('─────────────────────────────────────────────────────────')

        if (xml.includes('<部件名称>GJB6600测试验证</部件名称>')) {
          console.log('✅ <部件名称> 内容已正确保存：GJB6600测试验证')
        } else if (xml.includes('<部件名称/>')) {
          console.log('⚠️  <部件名称> 为空（未保存修改）')
        } else {
          console.log('❓ <部件名称> 状态未知')
        }

        if (xml.includes('<信息名称>功能验证测试</信息名称>')) {
          console.log('✅ <信息名称> 内容已正确保存：功能验证测试')
        } else if (xml.includes('<信息名称/>')) {
          console.log('⚠️  <信息名称> 为空（未保存修改）')
        } else {
          console.log('❓ <信息名称> 状态未知')
        }

        console.log('─────────────────────────────────────────────────────────')

        // 提取并显示 <数据模块名称> 片段
        const start = xml.indexOf('<数据模块名称>')
        if (start > 0) {
          const end = xml.indexOf('</数据模块名称>') + 18
          console.log('\nXML 片段预览：')
          console.log(xml.substring(start, end))
        }

        console.log('\n════════════════════════════════════════════════════════════\n')
      })
    })
    dmReq.end()
  })
})

loginReq.write(loginData)
loginReq.end()
