const plugins = []

// 生产环境移除 console
if (process.env.NODE_ENV === 'production') {
  plugins.push([
    'transform-remove-console',
    {
      // 保留 console.error 和 console.warn，仅移除 log、info、debug
      exclude: ['error', 'warn']
    }
  ])
}

module.exports = {
  presets: [
    ['@vue/app',
     { useBuiltIns: 'entry' }]
  ],
  plugins: plugins
}
