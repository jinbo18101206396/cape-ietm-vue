/**
 * UEditor配置工具
 * 提供3种工具栏模式：完整、简化、只读
 */

/**
 * 获取UEditor配置
 * @param {Object} options - 配置选项
 * @param {String} options.ifedit - 是否可编辑（1=可编辑，0=只读）
 * @param {String} options.simple - 是否简化工具栏（1=简化，0=完整）
 * @param {String} options.locale - 语言（en/cn）
 * @param {Boolean} options.readonly - 是否只读
 * @returns {Object} - UEditor配置对象
 */
export function getUEditorConfig(options = {}) {
  const { ifedit = '1', simple = '0', locale = 'en', readonly = false } = options

  // §5.2.1 完整工具栏（编辑模式）
  const fullToolbar = [
    [
      'source', '|',
      'undo', 'redo', '|',
      'bold', 'italic', 'underline', 'fontborder', 'strikethrough', 'superscript', 'subscript', '|',
      'forecolor', 'backcolor', 'insertorderedlist', 'insertunorderedlist', '|',
      'rowspacingtop', 'rowspacingbottom', 'lineheight', '|',
      'customstyle', 'paragraph', 'fontfamily', 'fontsize', '|',
      'directionalityltr', 'directionalityrtl', 'indent', '|',
      'justifyleft', 'justifycenter', 'justifyright', 'justifyjustify', '|',
      'touppercase', 'tolowercase', '|',
      'link', 'unlink', '|',
      'imagenone', 'imageleft', 'imageright', 'imagecenter', '|',
      'simpleupload', 'insertimage', 'emotion', 'scrawl', 'insertvideo', 'music', 'attachment', 'map', 'gmap', 'insertframe', 'insertcode', 'webapp', 'pagebreak', 'template', 'background', '|',
      'horizontal', 'date', 'time', 'spechars', 'snapscreen', 'wordimage', '|',
      'inserttable', 'deletetable', 'insertparagraphbeforetable', 'insertrow', 'deleterow', 'insertcol', 'deletecol', 'mergecells', 'mergeright', 'mergedown', 'splittocells', 'splittorows', 'splittocols', 'charts', '|',
      'print', 'preview', 'searchreplace', 'drafts', 'help', '|',
      // 自定义按钮
      'deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton', '|',
      'kityformula'
    ]
  ]

  // §5.2.2 简化工具栏（简单模式）
  const simpleToolbar = [
    [
      'undo', 'redo', '|',
      'bold', 'italic', 'underline', '|',
      'forecolor', 'backcolor', '|',
      'insertorderedlist', 'insertunorderedlist', '|',
      'justifyleft', 'justifycenter', 'justifyright', '|',
      'link', 'unlink', '|',
      'simpleupload', 'insertimage', '|',
      'inserttable', 'insertrow', 'insertcol', 'mergecells', '|',
      // 自定义按钮
      'deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton', '|',
      'kityformula'
    ]
  ]

  // §5.2.3 只读工具栏（浏览模式）
  const readonlyToolbar = [[]]

  // 根据模式选择工具栏
  let toolbars
  if (readonly || ifedit === '0') {
    toolbars = readonlyToolbar
  } else if (simple === '1') {
    toolbars = simpleToolbar
  } else {
    toolbars = fullToolbar
  }

  // 返回配置对象
  return {
    toolbars,
    // 其他配置项
    lang: locale === 'cn' ? 'zh-cn' : 'en',
    initialFrameWidth: '100%',
    initialFrameHeight: 500,
    autoHeightEnabled: false,
    autoFloatEnabled: false,
    enableAutoSave: false,
    saveInterval: 500000,
    imageScaleEnabled: true,
    allowDivTransToP: false,  // 关键：阻止div转p
    maximumWords: 100000000,
    // Kity Formula插件配置
    kityformulaImagePath: '/static/ueditor/kityformula-plugin',
    kityformulaImageRender: 'latex'
  }
}

/**
 * 加载UEditor静态资源
 * @returns {Promise} - 加载完成的Promise
 */
export function loadUEditor() {
  return new Promise((resolve, reject) => {
    // 检查UEditor是否已加载
    if (window.UE) {
      resolve()
      return
    }

    // 动态加载UEditor脚本
    const script = document.createElement('script')
    script.src = '/static/ueditor/ueditor.all.min.js'
    script.onload = () => {
      // 加载配置文件
      const configScript = document.createElement('script')
      configScript.src = '/static/ueditor/ueditor.config.js'
      configScript.onload = () => {
        // 加载Kity Formula插件
        const kfScript = document.createElement('script')
        kfScript.src = '/static/ueditor/kityformula-plugin/kityformula-plugin.js'
        kfScript.onload = () => {
          resolve()
        }
        kfScript.onerror = () => {
          console.error('加载Kity Formula插件失败')
          resolve()  // 即使插件加载失败，也继续
        }
        document.head.appendChild(kfScript)
      }
      configScript.onerror = reject
      document.head.appendChild(configScript)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/**
 * 注册自定义按钮
 * 注意：实际按钮注册在ParaDesigner.vue的registerCustomButtons方法中
 * 这里仅提供配置支持
 */
export const customButtons = {
  deflist: {
    title: '列表定义',
    icon: 'deflist',
    index: 20
  },
  insertnextrow: {
    title: '后插入行',
    icon: 'insertnextrow',
    index: 21
  },
  interrefbutton: {
    title: '内部引用',
    icon: 'interrefbutton',
    index: 25
  },
  dmrefbutton: {
    title: 'DM引用',
    icon: 'dmrefbutton',
    index: 26
  },
  symbolbutton: {
    title: '图符',
    icon: 'symbolbutton',
    index: 27
  }
}
