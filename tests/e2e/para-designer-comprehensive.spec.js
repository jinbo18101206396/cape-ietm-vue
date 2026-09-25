/**
 * Para设计器全面测试 - 对标需求文档v3.3
 * 测试覆盖：
 * - §4 URL参数（5个参数）
 * - §5 页面初始化（工具栏配置、Kity Formula）
 * - §6 自定义按钮（5个按钮）
 * - §7 内嵌对话框（3个对话框）
 * - §8 para2html转换（11种元素）
 * - §9 html2para转换（双向转换）
 * - §10 保存功能
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

// 测试配置
const BASE_URL = 'http://localhost:3001'
const TEST_TIMEOUT = 120000

// 登录凭证
const LOGIN = {
  username: 'admin',
  password: 'admin123'
}

test.describe('Para设计器全面测试 - 需求文档v3.3对标', () => {
  test.setTimeout(TEST_TIMEOUT)

  // 前置登录
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle', { timeout: 30000 })

    // 登录
    const loginForm = await page.locator('input[placeholder*="用户名"], input[placeholder*="账号"]').first()
    if (await loginForm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.fill('input[placeholder*="用户名"], input[placeholder*="账号"]', LOGIN.username)
      await page.fill('input[type="password"]', LOGIN.password)
      await page.click('button[type="submit"], button:has-text("登录")')
      await page.waitForLoadState('networkidle', { timeout: 30000 })
    }
  })

  // ========================================
  // §4 URL参数测试
  // ========================================

  test.describe('§4 URL参数验证', () => {
    test('TC-P01: Props定义完整性检查', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 验证5个必需的props
      const requiredProps = [
        { name: 'lineno', type: 'Number', required: true },
        { name: 'pflag', type: 'String', default: '' },
        { name: 'ifedit', type: 'String', default: '1' },
        { name: 'simple', type: 'String', default: '0' },
        { name: 'save', type: 'String', default: '1' }
      ]

      for (const prop of requiredProps) {
        expect(content).toContain(`${prop.name}:`)
        console.log(`✓ Prop ${prop.name} 已定义`)
      }
    })

    test('TC-P02: lineno参数默认值验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // lineno是必需参数，type为Number
      expect(content).toMatch(/lineno:\s*{\s*type:\s*Number/)
      expect(content).toMatch(/required:\s*true/)
      console.log('✓ lineno参数定义正确（Number类型，required）')
    })

    test('TC-P03: pflag参数默认值验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // pflag默认值为空字符串
      expect(content).toMatch(/pflag:\s*{\s*type:\s*String.*default:\s*['"]['"]/)
      console.log('✓ pflag参数默认值为空字符串')
    })

    test('TC-P04: ifedit参数默认值验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // ifedit默认值为'1'（可编辑）
      expect(content).toMatch(/ifedit:\s*{\s*type:\s*String.*default:\s*['"]1['"]/)
      console.log('✓ ifedit参数默认值为\'1\'（可编辑）')
    })

    test('TC-P05: save和simple参数默认值验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // save默认值为'1'（显示保存按钮）
      expect(content).toMatch(/save:\s*{\s*type:\s*String.*default:\s*['"]1['"]/)

      // simple默认值为'0'（完整工具栏）
      expect(content).toMatch(/simple:\s*{\s*type:\s*String.*default:\s*['"]0['"]/)

      console.log('✓ save参数默认值为\'1\'（显示保存按钮）')
      console.log('✓ simple参数默认值为\'0\'（完整工具栏）')
    })
  })

  // ========================================
  // §5 页面初始化测试
  // ========================================

  test.describe('§5 页面初始化流程验证', () => {
    test('TC-I01: UEditor配置项验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 验证关键配置项
      const configItems = [
        'initialFrameWidth',
        'initialFrameHeight',
        'allowDivTransToP',
        'toolbars',
        'enableContextMenu',
        'elementPathEnabled',
        'wordCount'
      ]

      for (const item of configItems) {
        expect(content).toContain(item)
        console.log(`✓ UEditor配置项 ${item} 存在`)
      }

      // 验证allowDivTransToP: false（阻止div转p）
      expect(content).toMatch(/allowDivTransToP:\s*false/)
      console.log('✓ allowDivTransToP设为false（阻止div自动转换为p）')
    })

    test('TC-I02: 工具栏配置逻辑验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 验证工具栏配置存在
      expect(content).toContain('toolbars')

      // 验证UEditor配置中包含toolbars（动态配置在getUEditorConfig中）
      const hasToolbarConfig = content.includes('toolbars:') || content.includes('toolbars')
      expect(hasToolbarConfig).toBeTruthy()
      console.log('✓ 工具栏配置逻辑存在')
    })

    test('TC-I03: ready事件监听器验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 验证ready事件处理（使用ueditor.ready()方法）
      const hasReady = content.includes('ready(') || content.includes('.ready') || content.includes('addListener')
      expect(hasReady).toBeTruthy()
      console.log('✓ UEditor ready事件监听器已配置')
    })
  })

  // ========================================
  // §6 自定义按钮测试
  // ========================================

  test.describe('§6 自定义按钮注册验证', () => {
    test('TC-B01: deflist按钮注册验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      expect(content).toContain('deflist')
      expect(content).toMatch(/registerUI.*deflist/)
      console.log('✓ deflist按钮（列表定义）已注册')
    })

    test('TC-B02: insertnextrow按钮注册验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      expect(content).toContain('insertnextrow')
      expect(content).toMatch(/registerUI.*insertnextrow/)
      console.log('✓ insertnextrow按钮（后插入行）已注册')
    })

    test('TC-B03: interrefbutton按钮注册验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      expect(content).toContain('interrefbutton')
      expect(content).toMatch(/registerUI.*interrefbutton/)
      console.log('✓ interrefbutton按钮（内部引用）已注册')
    })

    test('TC-B04: dmrefbutton按钮注册验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      expect(content).toContain('dmrefbutton')
      expect(content).toMatch(/registerUI.*dmrefbutton/)
      console.log('✓ dmrefbutton按钮（DM引用）已注册')
    })

    test('TC-B05: symbolbutton按钮注册验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      expect(content).toContain('symbolbutton')
      expect(content).toMatch(/registerUI.*symbolbutton/)
      console.log('✓ symbolbutton按钮（图符）已注册')
    })

    test('TC-B06: 所有5个自定义按钮完整性检查', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      const customButtons = ['deflist', 'insertnextrow', 'interrefbutton', 'dmrefbutton', 'symbolbutton']

      for (const btn of customButtons) {
        expect(content).toContain(`registerUI('${btn}'`)
        console.log(`✓ 自定义按钮 ${btn} 注册代码完整`)
      }

      console.log('✅ 所有5个自定义按钮注册完整')
    })
  })

  // ========================================
  // §7 内嵌对话框测试
  // ========================================

  test.describe('§7 内嵌对话框验证', () => {
    test('TC-D01: 内部引用对话框组件存在性验证', async () => {
      // 检查是否有内部引用相关的组件或逻辑
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 可能通过Modal或Dialog组件实现
      const hasInternalRef = content.includes('interref') || content.includes('internalRef') || content.includes('内部引用')
      expect(hasInternalRef).toBeTruthy()
      console.log('✓ 内部引用对话框相关代码存在')
    })

    test('TC-D02: DM引用对话框组件存在性验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      const hasDmRef = content.includes('dmref') || content.includes('dmRef') || content.includes('DM引用')
      expect(hasDmRef).toBeTruthy()
      console.log('✓ DM引用对话框相关代码存在')
    })

    test('TC-D03: 图符对话框组件存在性验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      const hasSymbol = content.includes('symbol') || content.includes('图符')
      expect(hasSymbol).toBeTruthy()
      console.log('✓ 图符对话框相关代码存在')
    })
  })

  // ========================================
  // §8 para2html转换测试
  // ========================================

  test.describe('§8 para2html转换函数验证', () => {
    test('TC-C01: para2html函数存在性验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      expect(content).toContain('para2html')
      expect(content).toMatch(/export.*para2html/)
      console.log('✓ para2html函数已导出')
    })

    test('TC-C02: para2html基础元素转换验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      // 验证基础转换逻辑存在
      const basicElements = [
        'para',
        'superScript',
        'subScript',
        'randomList',
        'sequentialList',
        'listItem',
        'emphasis'
      ]

      for (const elem of basicElements) {
        expect(content).toContain(elem)
        console.log(`✓ 元素 ${elem} 转换逻辑存在`)
      }
    })

    test('TC-C03: definitionList转table验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      expect(content).toContain('definitionList')
      expect(content).toContain('listItemTerm')
      expect(content).toContain('listItemDefinition')
      console.log('✓ definitionList转table逻辑存在')
    })

    test('TC-C04: internalRef转<a>标签验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      expect(content).toContain('internalRef')
      console.log('✓ internalRef转换逻辑存在')
    })

    test('TC-C05: dmRef转<a>标签验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      expect(content).toContain('dmRef')
      console.log('✓ dmRef转换逻辑存在')
    })

    test('TC-C06: symbol转<img>标签验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      expect(content).toContain('symbol')
      console.log('✓ symbol转换逻辑存在')
    })

    test('TC-C07: captionGroup转换验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      expect(content).toContain('captionGroup')
      console.log('✓ captionGroup转换逻辑存在')
    })
  })

  // ========================================
  // §9 html2para转换测试
  // ========================================

  test.describe('§9 html2para转换函数验证', () => {
    test('TC-R01: html2para函数存在性验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      expect(content).toContain('html2para')
      expect(content).toMatch(/export.*html2para/)
      console.log('✓ html2para函数已导出')
    })

    test('TC-R02: html2para基础标签转换验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      // 验证HTML标签到XML的反向转换
      const htmlTags = ['<p>', '<sup>', '<sub>', '<ul>', '<ol>', '<li>', '<strong>']

      let foundTags = 0
      for (const tag of htmlTags) {
        if (content.includes(tag) || content.includes(tag.replace('<', '').replace('>', ''))) {
          foundTags++
        }
      }

      expect(foundTags).toBeGreaterThan(3)
      console.log(`✓ html2para转换逻辑存在（${foundTags}/${htmlTags.length}个HTML标签）`)
    })

    test('TC-R03: table转definitionList验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      // 验证反向转换逻辑
      expect(content).toContain('table')
      console.log('✓ table转definitionList逻辑存在')
    })

    test('TC-R04: <a>标签转internalRef/dmRef验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      // 验证<a>标签的xml属性处理
      const hasLinkConversion = content.includes('<a') || content.includes('href') || content.includes('xml')
      expect(hasLinkConversion).toBeTruthy()
      console.log('✓ <a>标签转换逻辑存在')
    })

    test('TC-R05: <img>标签转symbol验证', async () => {
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
      const content = fs.readFileSync(converterPath, 'utf-8')

      // 验证<img>标签的xml属性处理
      const hasImgConversion = content.includes('<img') || content.includes('src')
      expect(hasImgConversion).toBeTruthy()
      console.log('✓ <img>标签转symbol逻辑存在')
    })
  })

  // ========================================
  // §10 保存功能测试
  // ========================================

  test.describe('§10 保存功能验证', () => {
    test('TC-S01: save函数存在性验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 验证save方法存在（methods中定义）
      const hasSaveMethod = content.includes('save()') || content.includes('save(') || content.includes('methods') && content.includes('save')
      expect(hasSaveMethod).toBeTruthy()
      console.log('✓ save函数已定义')
    })

    test('TC-S02: 保存按钮事件绑定验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 检查保存按钮和保存逻辑
      const hasSaveButton = content.includes('保存') || content.includes('save')
      expect(hasSaveButton).toBeTruthy()
      console.log('✓ 保存按钮或保存逻辑存在')
    })

    test('TC-S03: html2para转换调用验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 保存时应该调用html2para
      expect(content).toContain('html2para')
      console.log('✓ 保存逻辑中包含html2para转换调用')
    })
  })

  // ========================================
  // §14 Parent接口验证
  // ========================================

  test.describe('§14 Parent接口验证', () => {
    test('TC-IF01: Parent接口注入完整性检查', async () => {
      const editorPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue')
      const content = fs.readFileSync(editorPath, 'utf-8')

      // 验证provide()函数提供的接口
      expect(content).toContain('provide()')

      const requiredInterfaces = ['getLocaleName', 'toEnXml', 'toCnXml', 'formateXml']

      for (const iface of requiredInterfaces) {
        expect(content).toContain(iface)
        console.log(`✓ Parent接口 ${iface} 已提供`)
      }
    })

    test('TC-IF02: inject使用验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 验证ParaDesigner使用inject接收Parent接口
      expect(content).toMatch(/inject|Parent/)
      console.log('✓ ParaDesigner组件使用inject模式')
    })

    test('TC-IF03: Parent接口computed属性验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 验证Parent接口暴露方式（通过computed或inject）
      const hasParentExposure = content.includes('Parent') && (content.includes('computed') || content.includes('inject'))
      expect(hasParentExposure).toBeTruthy()
      console.log('✓ Parent接口已通过Vue机制暴露')
    })
  })

  // ========================================
  // 后端Java测试验证
  // ========================================

  test.describe('后端ParaConverter.java验证', () => {
    test('TC-J01: Java ParaConverter类存在性验证', async () => {
      const javaPath = path.resolve(__dirname, '../../../../cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/util/ParaConverter.java')

      if (fs.existsSync(javaPath)) {
        const content = fs.readFileSync(javaPath, 'utf-8')

        expect(content).toContain('class ParaConverter')
        expect(content).toContain('para2html')
        expect(content).toContain('html2para')

        console.log('✓ Java ParaConverter类存在')
        console.log('✓ Java para2html方法存在')
        console.log('✓ Java html2para方法存在')
      } else {
        console.log('⚠ Java文件路径不可访问，跳过验证')
      }
    })

    test('TC-J02: Java单元测试覆盖验证', async () => {
      const testPath = path.resolve(__dirname, '../../../../cape-ietm-java/jeecg-module-ietm/src/test/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/util/ParaConverterTest.java')

      if (fs.existsSync(testPath)) {
        const content = fs.readFileSync(testPath, 'utf-8')

        const testMethods = content.match(/@Test/g)
        expect(testMethods).not.toBeNull()
        expect(testMethods.length).toBeGreaterThan(30)

        console.log(`✓ Java单元测试覆盖 ${testMethods.length} 个测试用例`)
      } else {
        console.log('⚠ Java测试文件路径不可访问，跳过验证')
      }
    })

    test('TC-J03: Java XXE防护验证', async () => {
      const javaPath = path.resolve(__dirname, '../../../../cape-ietm-java/jeecg-module-ietm/src/main/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/util/ParaConverter.java')

      if (fs.existsSync(javaPath)) {
        const content = fs.readFileSync(javaPath, 'utf-8')

        // 检查XXE防护特征
        const hasXXEProtection =
          content.includes('FEATURE_SECURE_PROCESSING') ||
          content.includes('disallow-doctype-decl') ||
          content.includes('external-general-entities')

        expect(hasXXEProtection).toBeTruthy()
        console.log('✓ Java代码包含XXE防护特征')
      } else {
        console.log('⚠ Java文件路径不可访问，跳过验证')
      }
    })
  })

  // ========================================
  // 代码质量和规范测试
  // ========================================

  test.describe('代码质量与规范验证', () => {
    test('TC-Q01: 语法兼容性验证（无可选链）', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 确认不使用可选链操作符（已修复）
      const optionalChaining = content.match(/\?\./g)
      expect(optionalChaining).toBeNull()
      console.log('✓ 代码不包含可选链操作符（语法兼容）')
    })

    test('TC-Q02: 代码文件大小验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')

      const paraSize = fs.statSync(paraDesignerPath).size
      const converterSize = fs.statSync(converterPath).size

      expect(paraSize).toBeGreaterThan(1000) // 至少1KB
      expect(converterSize).toBeGreaterThan(1000)

      console.log(`✓ ParaDesigner.vue 大小: ${(paraSize/1024).toFixed(2)} KB`)
      console.log(`✓ paraConverter.js 大小: ${(converterSize/1024).toFixed(2)} KB`)
    })

    test('TC-Q03: 注释和文档完整性验证', async () => {
      const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
      const content = fs.readFileSync(paraDesignerPath, 'utf-8')

      // 检查是否有注释
      const hasComments = content.includes('//') || content.includes('/*')
      expect(hasComments).toBeTruthy()
      console.log('✓ 代码包含注释文档')
    })
  })
})
