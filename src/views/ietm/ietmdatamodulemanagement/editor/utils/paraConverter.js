/**
 * Para设计器转换工具
 * 实现XML↔HTML双向转换，覆盖9类元素
 */

import { axios } from '@/utils/request'
import { getDmcByText } from './refsBuilder'  // 🔧 2026-10-10 使用本地DMC解析函数

// ========== 常量定义 ==========

/**
 * 🔧 2026-10-10 P0-3修复: 使用Unicode私有区字符作为占位符
 * 这些字符在标准文本中基本不会出现，极大降低冲突风险
 * - U+E000-U+F8FF: 私有区 (共6400个字符)
 * - 选用: U+E001 (LF), U+E002 (CR)
 * 优于__LF__/__CR__文本标记（后者可能与用户输入冲突）
 */
const PLACEHOLDER_LF = ''  // 换行符占位符
const PLACEHOLDER_CR = ''  // 回车符占位符

// ========== XSS防护工具函数 ==========

/**
 * 🔧 修复P1-6: XML属性XSS防护
 * 对XML字符串进行安全编码，防止XSS攻击
 * @param {String} xml - 原始XML字符串
 * @returns {String} - 安全编码后的XML字符串
 */
export function escapeXmlForAttribute(xml) {
  if (!xml) return ''
  return xml
    .replace(/&/g, '&amp;')   // & 必须最先替换
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')  // 防止属性值闭合
    .replace(/'/g, '&#39;')   // 防止单引号属性值闭合
    .replace(/`/g, '&#96;')   // 防止反引号注入
    .replace(/\r/g, PLACEHOLDER_CR) // 🔧 2026-10-10 P0-3修复：使用Unicode私有区字符，极大降低冲突风险
    .replace(/\n/g, PLACEHOLDER_LF) // 🔧 2026-10-10 P0-3修复：使用Unicode私有区字符，极大降低冲突风险
}

/**
 * 反转义XML属性值
 * @param {String} escapedXml - 已编码的XML字符串
 * @returns {String} - 解码后的XML字符串
 */
function unescapeXmlAttribute(escapedXml) {
  if (!escapedXml) return ''
  return escapedXml
    .replace(/&#96;/g, '`')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(new RegExp(PLACEHOLDER_CR, 'g'), '\r')  // 🔧 2026-10-10 P0-3修复：解码回车符
    .replace(new RegExp(PLACEHOLDER_LF, 'g'), '\n')  // 🔧 2026-10-10 P0-3修复：解码换行符
    .replace(/&amp;/g, '&')    // & 必须最后替换
}

// ========== 主转换函数 ==========

/**
 * para2html转换函数（XML → HTML）
 * @param {Object} parent - Parent对象引用
 * @param {String} str - 完整的para XML字符串（包含<para>标签）
 * @returns {Promise<String>} - HTML字符串
 */
export async function para2html(parent, str) {
  if (!str || !str.trim()) return ''

  let html = str.trim()

  // §8.2.1 definitionList转table
  // 🔧 修复P0-DEFLIST: 使用[\s\S]*?代替.*?以匹配多行XML
  const deflists = html.match(/<definitionList[\s\S]*?<\/definitionList>/g)
  if (deflists != null) {
    deflists.forEach(m => {
      let html_ = m.replace(/<definitionList>/g, '<table deflist="1">')
        .replace('</definitionList>', '</table>')
        .replace(/<definitionListItem>/g, '<tr>')
        .replace(/<\/definitionListItem>/g, '</tr>')
        .replace(/<listItemTerm\/>/g, '<th></th>')
        .replace(/<listItemTerm>/g, '<th>')
        .replace(/<\/listItemTerm>/g, '</th>')
        .replace(/<listItemDefinition\/>/g, '<td></td>')
        .replace(/<listItemDefinition>/g, '<td>')
        .replace(/<\/listItemDefinition>/g, '</td>')
      html = html.replace(m, html_)
    })
  }

  // §8.3 captionGroup转table
  // 🔧 修复P0-CAPTION: 使用[\s\S]*?代替.*?以匹配多行XML
  const captions = html.match(/<captionGroup[\s\S]*?<\/captionGroup>/g)
  if (captions != null) {
    for (const m of captions) {
      const tableHtml = await convertCaptionGroupToTable(m)
      html = html.replace(m, tableHtml)
    }
  }

  // §8.2.2 基础元素转换
  html = html.replace(/<para/g, '<p')
    .replace(/<\/para>/g, '</p>')
    .replace(/<superScript>/g, '<sup>')
    .replace(/<\/superScript>/g, '</sup>')
    .replace(/<subScript>/g, '<sub>')
    .replace(/<\/subScript>/g, '</sub>')
    .replace(/<randomList/g, '<ul')
    .replace(/<\/randomList>/g, '</ul>')
    .replace(/<sequentialList/g, '<ol')
    .replace(/<\/sequentialList>/g, '</ol>')
    .replace(/<listItem/g, '<li')
    .replace(/<\/listItem>/g, '</li>')
    // 🔧 修复P0-5: warningAndCautionPara/notePara往返问题
    // 添加data-type属性标记，以便html2para还原时识别原始类型
    .replace(/<warningAndCautionPara>/g, '<p data-type="warningAndCautionPara">')
    .replace(/<\/warningAndCautionPara>/g, '</p>')
    .replace(/<notePara>/g, '<p data-type="notePara">')
    .replace(/<\/notePara>/g, '</p>')
    .replace(/<emphasis>/g, '<strong>')
    .replace(/<\/emphasis>/g, '</strong>')

  // §8.2.3 internalRef转<a>标签
  const refs = []
  str2jsons(refs, html, 'internalRef', 'internalRefId,internalRefTargetType')
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行标签
  let internalRefs = html.match(/<internalRef[\s\S]*?<\/internalRef>/g)
  if (internalRefs != null) {
    internalRefs.forEach((m, i) => {
      const ref = refs[i]
      const type = ref.internalRefTargetType || ''
      // 🔧 修复P0-4: ref.xml已在str2jsons中转义，不要重复转义
      // 🔧 修复P1-6: 对type和id应用XSS防护
      const safeType = escapeXmlForAttribute(type)
      const safeId = escapeXmlForAttribute(ref.internalRefId)
      html = html.replace(m, `<a href="javascript:void(0);" xml="${ref.xml}">【${safeType}(${safeId})】</a>`)
    })
  } else {
    internalRefs = html.match(/<internalRef[\s\S]*?\/>/g)
    if (internalRefs != null) {
      internalRefs.forEach((m, i) => {
        const ref = refs[i]
        const type = ref.internalRefTargetType || ''
        // 🔧 修复P0-4: ref.xml已在str2jsons中转义，不要重复转义
        // 🔧 修复P1-6: 对type和id应用XSS防护
        const safeType = escapeXmlForAttribute(type)
        const safeId = escapeXmlForAttribute(ref.internalRefId)
        html = html.replace(m, `<a href="javascript:void(0);" xml="${ref.xml}">【${safeType}(${safeId})】</a>`)
      })
    }
  }

  // §8.2.4 dmRef转<a>标签
  html = await getDmrefHtml(parent, html)

  // §8.2.5 symbol转<img>标签
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行标签
  let symbols = html.match(/<symbol[\s\S]*?<\/symbol>/g)
  if (symbols != null) {
    html = await tosymbol(symbols, html)
  } else {
    symbols = html.match(/<symbol[\s\S]*?\/>/g)
    if (symbols != null) {
      html = await tosymbol(symbols, html)
    }
  }

  return html
}

/**
 * html2para转换函数（HTML → XML）
 * @param {Object} parent - Parent对象引用
 * @param {String} html - UEditor的HTML内容
 * @param {String} projectParameters - 项目参数JSON字符串
 * @param {Array} allocatedUniqueids - 预分配的uniqueid数组
 * @param {Number} depth - 递归深度计数器
 * @returns {Promise<String>} - 完整的para XML字符串
 */
export async function html2para(parent, html, projectParameters, allocatedUniqueids = [], depth = 0) {
  // 修复P1-BUG-2: 递归深度限制抛出异常，避免数据污染
  // 原逻辑: return '[递归深度超限]' 会污染XML，导致数据永久丢失
  // 新逻辑: 抛出异常，阻止保存，提示用户简化para结构
  if (depth > 10) {
    throw new Error('para嵌套层级过深（超过10层），请简化内容结构后重试')
  }

  // 空内容时返回空字符串（由调用方包裹para标签）
  if (!html || !html.trim()) return ''

  // 🔧 修复CRITICAL: 剥离外层<p>标签（para2html会把外层para转成p）
  // html2para应返回不带外层para的内容，由调用方（ParaDesigner）包裹para标签
  let para = html.trim()

  // 检测并移除外层<p>标签（可能带属性）
  const outerPMatch = para.match(/^<p(\s[^>]*)?>/)
  if (outerPMatch && para.endsWith('</p>')) {
    // 移除外层<p>和</p>
    para = para.substring(outerPMatch[0].length, para.length - 4)
  }

  para = para
    .replace(/&nbsp;/g, '')
    .replace(/<br>/g, '')
    .replace(/<\/br>/g, '')
    .replace(/<br\/>/g, '')
    .replace(/\n/g, '')
    .replace(/<p><\/p>/g, '')
    .replace(/<a name=.*?><\/a>/g, '')
    .replace(/<h\d.*?>/g, '<p>')
    .replace(/<\/h\d>/g, '</p>')
    .replace(/<h.*?\/>/g, '')
    .replace(/<\/p><symbol/g, '<symbol')

  para = para.replace(/<ul.*?>/g, '<ul>')
    .replace(/<ol.*?>/g, '<ol>')
    // 修复BUG-006: 使用词边界避免误匹配<list>、<link>
    .replace(/<li(\s[^>]*)?\>/g, '<li>')
    .replace(/<span.*?>/g, '')
    .replace(/<\/span>/g, '')
    // 修复BUG-004: 使用词边界避免误匹配<para>、<pre>
    // 🔧 修复P0-5: 保留data-type属性，不要清理（后续用于识别warningAndCautionPara/notePara）
    .replace(/<p(\s+(?!data-type)[^>]*)?\>/g, '<p>')  // 清理除data-type外的其他属性
    .replace(/<\/p><ul/g, '<ul')
    .replace(/<\/p><ol/g, '<ol')

  // §9.2.2 基础元素逆转换
  // 修复BUG-002: 使用词边界避免误匹配<superScript>、<support>、<supply>
  para = para.replace(/<sup(\s[^>]*)?\>/g, '<superScript>')
    .replace(/<\/sup>/g, '</superScript>')
    // 修复BUG-003: 使用词边界避免误匹配<subScript>、<subject>、<submit>
    .replace(/<sub(\s[^>]*)?\>/g, '<subScript>')
    .replace(/<\/sub>/g, '</subScript>')
    .replace(/<\/p><ul>/g, '<ul>')
    .replace(/<\/p><ol>/g, '<ol>')
    .replace(/<\/ul><\/p>/g, '</ul>')
    .replace(/<\/ol><\/p>/g, '</ol>')
    .replace(/<\/ul><p>/g, '</ul>')
    .replace(/<\/ol><p>/g, '</ol>')
    .replace(/<li><p>/g, '<li>')
    .replace(/<\/p><\/li>/g, '</li>')
    .replace(/<ul>/g, '<randomList>')
    .replace(/<\/ul>/g, '</randomList>')
    .replace(/<ol>/g, '<sequentialList>')
    .replace(/<\/ol>/g, '</sequentialList>')
    // 🔧 修复P0-1: 暂不转换<li>，等<p>转<para>后再处理

  // 🔧 修复BUG-PARA-001: 调整替换顺序，避免para结束标签丢失
  // 关键改进：先清理table周围的<p>标签，再统一转换为<para>
  // Step 1: 清理嵌套的<p>标签（允许空格）
  para = para.replace(/<p>\s*<p>/g, '<p>')
    .replace(/<\/p>\s*<\/p>/g, '</p>')

  // Step 2: 清理table周围的<p>和</p>标签（允许空格和换行）
  para = para.replace(/<\/p>\s*<table/g, '<table')     // </p> <table
    .replace(/<p>\s*<table/g, '<table')               // <p> <table
    .replace(/<\/table>\s*<\/p>/g, '</table>')         // </table> </p>
    .replace(/<\/table>\s*<p>/g, '</table>')           // </table> <p>

  // 🔧 修复P0-5: warningAndCautionPara/notePara往返问题
  // 在<p>→<para>之前，先识别并转换带data-type的特殊para
  para = para.replace(/<p data-type="warningAndCautionPara">/g, '<warningAndCautionPara>')
    .replace(/<p data-type="notePara">/g, '<notePara>')

  // Step 3: 统一转换<p>和</p>为<para>和</para>
  para = para.replace(/<\/p>/g, '</para>')             // 先转结束标签
    .replace(/<p>/g, '<para>')                         // 再转开始标签
    .replace(/<strong>/g, '<emphasis>')
    .replace(/<\/strong>/g, '</emphasis>')

  // 🔧 修复P0-5: 将</para>转换为对应的特殊标签结束符
  para = para.replace(/<warningAndCautionPara>([\s\S]*?)<\/para>/g, '<warningAndCautionPara>$1</warningAndCautionPara>')
    .replace(/<notePara>([\s\S]*?)<\/para>/g, '<notePara>$1</notePara>')

  // 🔧 修复P0-1: listItem内para重复问题
  // 关键: 在<p>→<para>之后转换<li>，此时<li>内可能已有<para>
  // 策略: 先处理已有<para>的情况（保持不变），再处理无<para>的情况（添加<para>）

  // 处理已有<para>的<li>（不添加para）
  para = para.replace(/<li>(\s*<para>[\s\S]*?<\/para>\s*)<\/li>/g, '<listItem>$1</listItem>')

  // 处理无<para>的<li>（添加para）
  // 使用负向预查确保不匹配已处理的<listItem>
  para = para.replace(/<li>([\s\S]*?)<\/li>/g, '<listItem><para>$1</para></listItem>')

  // §9.2.3 table转definitionList
  // 🔧 修复P0-DEFLIST: 使用[\s\S]*?代替.*?以匹配多行表格内容
  // 根因：.*?默认不匹配换行符，导致多行deflist无法识别，被当成普通表格删除
  const deflists = para.match(/<table deflist="1">[\s\S]*?<\/table>/g)
  if (deflists != null) {
    deflists.forEach(m => {
      let table_ = m.replace(/<table deflist="1">/g, '<definitionList>')
        .replace(/<\/table>/g, '</definitionList>')
        .replace(/<tbody>/g, '')
        .replace(/<\/tbody>/g, '')
        // 修复BUG-007: 使用词边界避免误匹配<track>、<tree>
        .replace(/<tr(\s[^>]*)?\>/g, '<definitionListItem>')
        .replace(/<\/tr>/g, '</definitionListItem>')
        // 修复BUG-005: 使用词边界避免误匹配<thead>、<thread>
        .replace(/<th(\s[^>]*)?\>/g, '<listItemTerm>')
        .replace(/<\/th>/g, '</listItemTerm>')

      // 🔧 修复P0-2: definitionList内para重复问题
      // 关键: <td>内可能已有<para>（因为前面<p>→<para>已执行）
      // 策略: 先处理已有<para>的<td>，再处理无<para>的<td>

      // 处理已有<para>的<td>（不添加para）
      // 🔧 修复CRITICAL: 使用+量词匹配一个或多个para，避免多para时留下残留标签
      table_ = table_.replace(/<td(\s[^>]*)?>(\s*(?:<para>[\s\S]*?<\/para>\s*)+)<\/td>/g, '<listItemDefinition>$2</listItemDefinition>')

      // 处理无<para>的<td>（添加para）
      // 🔧 修复边界bug: 属性组改为可选(\s[^>]*)?，避免裸<td>(无属性)不匹配残留标签
      table_ = table_.replace(/<td(\s[^>]*)?>([\s\S]*?)<\/td>/g, '<listItemDefinition><para>$2</para></listItemDefinition>')

      para = para.replace(m, table_)
    })
  }

  // §9.2.4 table转captionGroup
  // 🔧 修复P0-CAPTION-REVERSE: 使用[\s\S]*?代替.*?以匹配多行HTML
  const captions = para.match(/<table caption="1">[\s\S]*?<\/table>/g)
  if (captions != null) {
    captions.forEach(m => {
      para = para.replace(m, convertTableToCaptionGroup(m, parent, depth))
    })
  }

  // §9.2.5 处理普通table（对标旧系统：删除而不是转换）
  // 🔥 旧系统逻辑：Para中不支持普通table，只支持definitionList和captionGroup
  // 旧系统代码：para.replace(/<table.*?<\/table>/g,'').replace(/<table.*?\/>/g,'')
  // 匹配不含deflist或caption标记的普通HTML table，直接删除
  const normalTables = para.match(/<table(?![^>]*(?:deflist|caption)="1")[^>]*>[\s\S]*?<\/table>/g)
  if (normalTables != null) {
    console.warn('[html2para] 发现', normalTables.length, '个普通表格，将被删除（对标旧系统：Para不支持普通表格）')
    normalTables.forEach((m, idx) => {
      console.warn(`[html2para] 删除表格 ${idx + 1}/${normalTables.length}:`, m.substring(0, 100))
      para = para.replace(m, '')
    })
    console.warn('[html2para] ⚠️ 提示：Para中应使用definitionList（定义列表）而不是普通表格')
  }

  // 同时删除自闭合的table标签
  para = para.replace(/<table(?![^>]*(?:deflist|caption)="1")[^>]*>.*?\/>/g, '')

  // §9.2.7 公式（kfformula）转symbol
  const formula = para.match(/<img class="kfformula".*?\/>/g)
  if (formula != null) {
    para = para.replace(/<\/para><para><img class="kfformula">/g, '<img class="kfformula">')
    let newformulaCnt = 0

    for (const m of formula) {
      // 情况1：已存在的公式（有xml属性）
      if (m.indexOf(' xml="') > 0) {
        const match = m.match(/xml="([^"]+)"/)
        if (match) {
          // 🔧 修复P1-6: 使用统一的反转义函数
          const formulaxml = unescapeXmlAttribute(match[1])
          para = para.replace(m, formulaxml)
        }
      }
      // 情况2：新公式 → 自动生成ICN
      else {
        try {
          // §13.3 构建ICN元数据
          const json = {
            variantcode: 'A',
            securityclassification: '02',
            issueno: '001',
            secretLevel: '1',
            cmnodeid: parent.cmnodeid
          }

          // 🔧 修复P0-01: 从项目参数获取originator和rpc（添加异常处理）
          try {
            const projparam = JSON.parse(projectParameters)
            const ori = projparam.originator
            if (ori && ori.length > 0) json.originator = ori[0].code
            const rpc = projparam.rpc
            if (rpc && rpc.length > 0) json.rpc = rpc[0].code1
          } catch (e) {
            console.error('解析项目参数失败:', e, 'projectParameters:', projectParameters)
            // 继续执行，使用默认值（已在json对象中设置）
          }

          // 🔧 修复P1-1: 从DM名称解析SNS（添加数组长度验证）
          const nameArr = parent.dmCode.split('-')
          if (nameArr.length < 6) {
            console.error('dmCode格式错误，长度不足:', parent.dmCode, '数组长度:', nameArr.length)
            throw new Error(`dmCode格式错误: ${parent.dmCode}，预期至少6段，实际${nameArr.length}段`)
          }
          json.sns = nameArr[1] + '-' + nameArr[2] + '-' + nameArr[3] + '-' + nameArr[4] + '-' + nameArr[5]

          // 设置文件内容
          json.filecontent = m

          // 🔧 修复P1-2: 使用预分配的uniqueid（添加验证和一致性保证）
          const uniqueid_ = allocatedUniqueids.shift()
          if (!uniqueid_) {
            console.error('uniqueid分配不足，已使用数量:', newformulaCnt, '剩余数量:', allocatedUniqueids.length)
            throw new Error('uniqueid分配不足，请检查后端分配逻辑')
          }
          json.uniqueid = uniqueid_
          json.filename = '公式' + uniqueid_ + '.png'

          // 拼接ICN编码
          const icn = `ICN-${json.sns}-${json.rpc}-${json.originator}-${uniqueid_}-A-001-01`
          json.icn = icn

          // 读取图片尺寸
          const srcMatch = m.match(/src="([^"]+)"/)
          if (srcMatch) {
            const img = new Image()
            // 🔧 修复P1-3: Image对象内存泄漏（添加事件监听器清理）
            let cleanupHandlers = null

            try {
              await new Promise((resolve, reject) => {
                const onload = () => {
                  resolve()
                }
                const onerror = () => {
                  reject(new Error('图片加载失败'))
                }

                img.onload = onload
                img.onerror = onerror

                // 保存清理函数
                cleanupHandlers = () => {
                  img.onload = null
                  img.onerror = null
                  img.src = '' // 释放图片引用
                }

                img.src = srcMatch[1]
              })

              // 替换为symbol标签
              const symbolXml = `<symbol infoEntityIdent="${icn}" reproductionWidth="${img.width}" reproductionHeight="${img.height}" reproductionScale="100"></symbol>`
              para = para.replace(m, symbolXml)
              newformulaCnt++
            } catch (err) {
              console.error('公式图片加载失败:', err)
              // 降级：保留原公式，使用默认尺寸
              const symbolXml = `<symbol infoEntityIdent="${icn}" reproductionWidth="100" reproductionHeight="50" reproductionScale="100"></symbol>`
              para = para.replace(m, symbolXml)
              newformulaCnt++
            } finally {
              // 🔧 修复P1-3: 清理Image对象事件监听器
              if (cleanupHandlers) {
                cleanupHandlers()
              }
            }

            // 异步保存到ICN库
            try {
              // 🔧 修复P1-4: axios请求添加超时（10秒）
              await axios.post('/jeecg-boot/ietm/icn/save-formula', { data: JSON.stringify(json) }, { timeout: 10000 })
            } catch (err) {
              console.error('保存公式ICN失败:', err)
              // 超时错误特殊提示
              if (err.code === 'ECONNABORTED') {
                throw new Error('保存公式ICN超时（10秒），请检查网络连接或联系管理员')
              }
              throw new Error('保存公式ICN失败，请重试：' + (err.message || '未知错误'))
            }
          }
        } catch (error) {
          console.error('公式转ICN失败:', error)
        }
      }
    }

    // 返回新公式计数
    if (newformulaCnt > 0) {
      parent.newformulaCnt = newformulaCnt
    }
  }

  // §9.2.6 <img>标签还原为symbol
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行属性
  let imgs = para.match(/<img[\s\S]*?\/>/g)
  if (imgs != null) {
    imgs.forEach(m => {
      const match = m.match(/xml="([^"]+)"/)
      if (match) {
        // 🔧 修复P1-6: 使用统一的反转义函数（包含完整的实体解码）
        const imgxml = unescapeXmlAttribute(match[1])
        para = para.replace(m, imgxml)
      }
    })
  }

  // §9.2.5 <a>标签还原为internalRef/dmRef
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行<a>标签
  let anchors = para.match(/<a[\s\S]*?<\/a>/g)
  if (anchors != null) {
    anchors.forEach(m => {
      const match = m.match(/xml="([^"]+)"/)
      if (match) {
        // 🔧 修复P1-6: 使用统一的反转义函数（包含完整的实体解码）
        const anchorxml = unescapeXmlAttribute(match[1])
        para = para.replace(m, anchorxml)
      } else {
        // 🔧 修复P0-DATALOSS-1: 处理被手动修改的<a>标签（无xml属性）
        // 根因：用户在UEditor中手动编辑文本时，xml属性会丢失
        // 症状：保存后para内容消失
        // 检测逻辑：如果<a>标签没有xml属性，但文本包含【引用/内部引用等标记，说明被破坏了

        const textMatch = m.match(/>([^<]+)<\/a>/)
        const linkText = textMatch ? textMatch[1] : ''

        // 识别这是否是被破坏的特殊元素
        const isDmRef = linkText.includes('引用') && (linkText.includes('DMC') || linkText.includes('DM'))
        const isInternalRef = linkText.includes('内部引用')
        const isSymbol = linkText.includes('图符')

        if (isDmRef || isInternalRef || isSymbol) {
          // 🔧 P0-WARN-1: 输出详细诊断日志，帮助用户定位问题
          console.error(
            '[html2para] 🚨 P0-DATALOSS风险：检测到被手动修改的引用元素\n' +
            `  └─ 链接文本: "${linkText}"\n` +
            `  └─ 原始HTML: ${m.substring(0, 80)}...\n` +
            `  └─ 根因: 用户在UEditor中手动修改文本，导致xml属性丢失\n` +
            `  └─ 后果: 保存后该元素会被当作普通文本处理，原始XML结构丢失\n` +
            `  └─ 建议: 删除此元素，使用工具栏"DM引用"/"内部引用"/"图符"按钮重新插入`
          )

          // 降级处理：宁可保留普通<a>标签，也不要让数据完全丢失
          // 前端会进行额外检查（见下一步的ParaDesigner验证）
          // 这里只记录错误，让<a>标签保持原样进入XML
          // para不替换m，相当于保留原HTML（最终会被当作普通链接处理）
        }
        // 其他普通<a>标签也保留原样
      }
    })
  }

  return para
}

// ========== 辅助函数 ==========

/**
 * captionGroup转换辅助函数
 */
async function convertCaptionGroupToTable(captionXml) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(captionXml, 'text/xml')
  const colspecs = xmlDoc.querySelectorAll('colspec')
  const colstyles = []
  const colnames = []

  // 1. 解析colspec
  colspecs.forEach(spec => {
    colnames.push(spec.getAttribute('colname'))
    let style = ''
    const align = spec.getAttribute('align')
    if (align) style += `text-align:${align};`
    const width = spec.getAttribute('colwidth')
    if (width && width.trim() !== '*') style += `width:${width};`
    colstyles.push(style)
  })

  // 2. 转换captionRow
  const rows = xmlDoc.querySelectorAll('captionRow')
  let tbodystr = ''
  for (const row of rows) {
    tbodystr += '<tr>' + await getCaptionRow(row, colstyles, colnames) + '</tr>'
  }

  // 3. 生成HTML表格
  return `<table caption="1">${tbodystr}</table>`
}

/**
 * getCaptionRow辅助函数
 */
async function getCaptionRow(row, colstyles, colnames) {
  let rowstr = ''
  const entries = row.querySelectorAll('captionEntry')

  for (const entry of entries) {
    const serializer = new XMLSerializer()
    const entrystr = serializer.serializeToString(entry).trim()

    // 1. 处理captionLine
    let text = ''
    const parser = new DOMParser()
    const entryDoc = parser.parseFromString(entrystr, 'text/xml')
    const lines = entryDoc.querySelectorAll('captionLine')
    lines.forEach(line => {
      text += '\r\n' + line.textContent
    })
    if (text) text = text.substring(2)

    // 2. 处理captionText（递归）
    const captionTexts = entryDoc.querySelectorAll('captionText')
    for (const ct of captionTexts) {
      text += await para2html(null, ct.textContent)
    }

    // 3. 处理跨列
    const namest = entry.getAttribute('namest')
    const nameend = entry.getAttribute('nameend')
    let colspan = 1
    let colspanstr = ''
    if (namest && nameend && namest !== nameend) {
      const startIdx = colnames.indexOf(namest)
      const endIdx = colnames.indexOf(nameend)
      if (startIdx === -1 || endIdx === -1) {
        console.error(`[captionGroup] 跨列计算失败: namest=${namest} 或 nameend=${nameend} 不在colspec中`)
        colspan = 1
      } else if (startIdx > endIdx) {
        console.error(`[captionGroup] 跨列顺序错误: namest索引(${startIdx}) > nameend索引(${endIdx})`)
        colspan = 1
      } else {
        colspan = endIdx - startIdx + 1
      }
    }
    if (colspan > 1) colspanstr = ` colspan="${colspan}"`

    // 4. 处理跨行
    const morerows = entry.getAttribute('morerows')
    let rowspan = 1
    let rowspanstr = ''
    if (morerows && morerows !== '0') {
      rowspan = parseInt(morerows) + 1
    }
    if (rowspan > 1) rowspanstr = ` rowspan="${rowspan}"`

    // 5. 应用列样式
    const j = Array.from(entries).indexOf(entry)
    let style = colstyles[j] || ''
    if (style) style = ` style="${style}"`

    rowstr += `<td${colspanstr}${rowspanstr}${style}>${text}</td>`
  }

  return rowstr
}

/**
 * dmRef转换辅助函数
 * 🔧 2026-10-10 修复P0: 改用本地getDmcByText解析，不依赖后端接口
 */
export async function getDmrefHtml(parent, html) {
  // 🔧 2026-10-10 修复P0: 使用[\s\S]代替.以匹配多行dmRef标签
  const refs = html.match(/<dmRef[\s\S]*?<\/dmRef>/g)

  if (refs != null) {

    for (const m of refs) {
      try {
        // 🔧 修复P0: 使用本地getDmcByText函数（refsBuilder.js）代替后端API
        const dmjson = getDmcByText(m)

        if (dmjson && dmjson.dmc) {
          // 🔧 2026-10-10 修复：保留原始格式，使用匹配到的原始m而非dmjson.xml
          // dmjson.xml经过trim()处理，会丢失换行和缩进
          const originalXml = m  // 保留原始多行格式
          const escapedXml = escapeXmlForAttribute(originalXml)
          const safeDmc = escapeXmlForAttribute(dmjson.dmc)
          const safeTitle = escapeXmlForAttribute(dmjson.dmtitle || '')

          // 显示格式：【引用DMC: 标题】
          const displayText = safeTitle ? `${safeDmc}: ${safeTitle}` : safeDmc
          html = html.replace(m, `<a href="javascript:void(0);" xml="${escapedXml}">【引用${displayText}】</a>`)
          console.log('[getDmrefHtml] ✅ 转换成功:', displayText)
        } else {
          // 解析失败，使用fallback
          console.warn('[getDmrefHtml] ⚠️ 本地解析失败，使用fallback显示')
          const fallbackText = extractDmRefTitle(m)
          const escapedXml = escapeXmlForAttribute(m)
          html = html.replace(m, `<a href="javascript:void(0);" xml="${escapedXml}" style="color: orange;">【引用DM: ${fallbackText}】</a>`)
        }
      } catch (error) {
        console.error('[getDmrefHtml] ❌ 转换dmRef失败:', error)

        // 🔧 失败时使用fallback，避免dmRef标签在UEditor中不可见
        const fallbackText = extractDmRefTitle(m)
        const escapedXml = escapeXmlForAttribute(m)
        html = html.replace(m, `<a href="javascript:void(0);" xml="${escapedXml}" style="color: red;">【引用DM解析失败: ${fallbackText}】</a>`)
      }
    }
  }
  return html
}

/**
 * 从dmRef XML中提取标题作为fallback显示
 */
function extractDmRefTitle(dmRefXml) {
  try {
    // 尝试提取techName和infoName
    const techNameMatch = dmRefXml.match(/<techName>(.*?)<\/techName>/)
    const infoNameMatch = dmRefXml.match(/<infoName>(.*?)<\/infoName>/)

    if (techNameMatch && infoNameMatch) {
      return `${techNameMatch[1]}-${infoNameMatch[1]}`
    } else if (techNameMatch) {
      return techNameMatch[1]
    } else if (infoNameMatch) {
      return infoNameMatch[1]
    }

    // 如果没有标题，提取dmCode作为标识
    const modelIdentMatch = dmRefXml.match(/modelIdentCode="([^"]+)"/)
    const systemCodeMatch = dmRefXml.match(/systemCode="([^"]+)"/)
    const infoCodeMatch = dmRefXml.match(/infoCode="([^"]+)"/)

    if (modelIdentMatch && systemCodeMatch && infoCodeMatch) {
      return `${modelIdentMatch[1]}-${systemCodeMatch[1]}-${infoCodeMatch[1]}`
    }

    return 'DM'
  } catch (e) {
    return 'DM'
  }
}

/**
 * symbol转换辅助函数
 */
async function tosymbol(symbols, html) {
  console.log('[tosymbol] 输入symbols数量:', symbols.length)

  // 构建后端 API 基地址
  const apiBaseUrl = window._CONFIG['domianURL'] || '/jeecg-boot'
  console.log('[tosymbol] apiBaseUrl:', apiBaseUrl)

  // 并行加载所有图符
  const promises = symbols.map(async (m) => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(m, 'text/xml')
      const icn = doc.querySelector('symbol').getAttribute('infoEntityIdent')
      console.log('[tosymbol] 处理ICN:', icn)

      // 🔧 2026-10-10 修复：前端路径错误（/ietm/icn-manage → /icnmanage/ietmIcnManage）
      // 根因：paraConverter.js 使用了错误的API路径，导致一直404
      // 现已改用正确路径并恢复 queryByIcnCode + viewFile 优化
      let imgSrc = null
      try {
        // 调用后端接口获取 ICN 信息（含 fileKey）
        const icnInfo = await fetch(`${apiBaseUrl}/icnmanage/ietmIcnManage/queryByIcnCode?icn=${encodeURIComponent(icn)}`, {
          headers: {
            'X-Access-Token': localStorage.getItem('pro__Access-Token') ? JSON.parse(localStorage.getItem('pro__Access-Token')).value : ''
          }
        }).then(r => r.json())

        if (icnInfo.success && icnInfo.result && icnInfo.result.ietmAttachment && icnInfo.result.ietmAttachment.fileKey) {
          // 使用 viewFile 端点（性能更好）
          const fileKey = icnInfo.result.ietmAttachment.fileKey
          imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/viewFile?fileKey=${encodeURIComponent(fileKey)}`
          console.log('[tosymbol] 通过 fileKey 生成 URL:', imgSrc)
        } else {
          console.warn('[tosymbol] ICN数据不完整，fallback到view:', icnInfo.result ? 'ietmAttachment为null' : 'result为null')
          throw new Error('ICN附件缺失')
        }
      } catch (e) {
        console.warn('[tosymbol] queryByIcnCode失败，fallback到view:', e.message)
        // Fallback: 直接访问 view/{icnCode}（有占位图逻辑）
        imgSrc = `${apiBaseUrl}/icnmanage/ietmIcnManage/view/${icn}`
      }
      console.log('[tosymbol] 最终URL:', imgSrc)

      console.log('[tosymbol] 最终图片 URL:', imgSrc)

      // 🔧 修复P1-6: 使用统一的XSS防护函数
      // 🔧 2026-10-10: 添加图片尺寸限制，避免显示过大（300x200）
      const safeXml = escapeXmlForAttribute(m)
      const replacement = `<img src="${imgSrc}" xml="${safeXml}" style="max-width: 300px; max-height: 200px; width: auto; height: auto;">`
      console.log('[tosymbol] 替换内容长度:', replacement.length)

      return {
        search: m,
        replace: replacement
      }
    } catch (error) {
      console.error('[tosymbol] 加载图符失败:', error)
      return null
    }
  })

  // 等待所有请求完成
  const results = await Promise.all(promises)
  console.log('[tosymbol] 返回结果数量:', results.filter(Boolean).length)

  // 批量替换
  results.filter(Boolean).forEach(({ search, replace }) => {
    console.log('[tosymbol] 执行替换...')
    html = html.replace(search, replace)
  })

  console.log('[tosymbol] 转换完成，输出 HTML 长度:', html.length)
  return html
}

/**
 * convertTableToCaptionGroup辅助函数
 * 🔧 修复P0-6: 从HTML table重建完整的captionGroup结构（包含colspec/colspan/rowspan）
 */
function convertTableToCaptionGroup(tableHtml, parent, depth) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(tableHtml, 'text/xml')
    const rows = doc.querySelectorAll('tr')

    if (rows.length === 0) {
      console.warn('[convertTableToCaptionGroup] 未找到<tr>行，使用简化转换')
      return tableHtml
        .replace(/<table caption="1">/g, '<captionGroup>')
        .replace(/<\/table>/g, '</captionGroup>')
        .replace(/<tr.*?>/g, '<captionRow>')
        .replace(/<\/tr>/g, '</captionRow>')
        .replace(/<td.*?>/g, '<captionEntry><captionLine>')
        .replace(/<\/td>/g, '</captionLine></captionEntry>')
    }

    // 1. 从第一行的单元格提取列信息，生成colspec
    const firstRow = rows[0]
    const firstCells = firstRow.querySelectorAll('td, th')
    let colspecs = ''
    let colIndex = 1

    firstCells.forEach((cell) => {
      const colname = `col${colIndex}`
      const style = cell.getAttribute('style') || ''

      let colspec = `<colspec colname="${colname}"`

      // 提取width
      const widthMatch = style.match(/width:\s*([^;]+)/)
      if (widthMatch) {
        colspec += ` colwidth="${widthMatch[1].trim()}"`
      }

      // 提取align
      const alignMatch = style.match(/text-align:\s*([^;]+)/)
      if (alignMatch) {
        colspec += ` align="${alignMatch[1].trim()}"`
      }

      colspec += '/>'
      colspecs += colspec + '\n'
      colIndex++
    })

    // 2. 转换所有行
    let captionRows = ''
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th')
      let captionEntries = ''
      let currentColIndex = 1

      cells.forEach((cell) => {
        let entry = '<captionEntry'

        // 处理跨列（colspan → namest/nameend）
        const colspan = cell.getAttribute('colspan')
        if (colspan && parseInt(colspan) > 1) {
          const colspanNum = parseInt(colspan)
          entry += ` namest="col${currentColIndex}" nameend="col${currentColIndex + colspanNum - 1}"`
          currentColIndex += colspanNum
        } else {
          currentColIndex++
        }

        // 处理跨行（rowspan → morerows）
        const rowspan = cell.getAttribute('rowspan')
        if (rowspan && parseInt(rowspan) > 1) {
          const morerows = parseInt(rowspan) - 1
          entry += ` morerows="${morerows}"`
        }

        entry += '>'

        // 提取内容
        const content = cell.textContent || ''
        entry += `<captionLine>${content}</captionLine>`

        entry += '</captionEntry>'
        captionEntries += entry
      })

      captionRows += `<captionRow>${captionEntries}</captionRow>\n`
    })

    // 3. 组装完整的captionGroup
    return `<captionGroup>\n${colspecs}${captionRows}</captionGroup>`

  } catch (error) {
    console.error('[convertTableToCaptionGroup] 转换失败:', error)
    // 降级：使用简化实现
    return tableHtml
      .replace(/<table caption="1">/g, '<captionGroup>')
      .replace(/<\/table>/g, '</captionGroup>')
      .replace(/<tr.*?>/g, '<captionRow>')
      .replace(/<\/tr>/g, '</captionRow>')
      .replace(/<td.*?>/g, '<captionEntry><captionLine>')
      .replace(/<\/td>/g, '</captionLine></captionEntry>')
  }
}

/**
 * str2jsons辅助函数
 */
function str2jsons(jsonArr, str, tag, attrs) {
  if (!str || !str.trim()) return ''
  if (!(jsonArr instanceof Array)) return

  const startidx = str.indexOf(`<${tag}`)
  const endidx = str.indexOf(`</${tag}`)

  if (startidx > -1) {
    let endIdx
    if (endidx > -1) {
      // 🔧 修复P0-4: 有结束标签，包含完整的<tag>...</tag>
      endIdx = endidx + tag.length + 3  // </${tag}>的长度
    } else {
      // 自闭合标签，查找 />
      const selfCloseIdx = str.indexOf('/>', startidx)
      if (selfCloseIdx > -1) {
        endIdx = selfCloseIdx + 2
      } else {
        // 未找到结束标签，跳过
        console.warn(`[str2jsons] 未找到<${tag}>的结束标签或自闭合标记`)
        return
      }
    }

    const str1 = str.substring(startidx, endIdx)

    // 🔧 修复P0-3&P0-4: 使用统一的转义函数（正确的转义顺序）
    const json = {
      xml: escapeXmlForAttribute(str1)
    }

    attrs.split(',').forEach(attr => {
      const match = str1.match(new RegExp(`${attr}="([^"]+)"`))
      if (match) json[attr] = match[1]
    })

    jsonArr.push(json)

    const remaining = str.substring(endIdx)
    if (remaining.length > 0) {
      str2jsons(jsonArr, remaining, tag, attrs)
    }
  }
}
