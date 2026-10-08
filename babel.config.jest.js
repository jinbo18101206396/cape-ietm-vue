/**
 * Jest专用babel配置
 * 针对Node测试环境编译（区别于主构建的@vue/app浏览器targets）
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ]
}
