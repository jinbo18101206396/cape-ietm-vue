#!/usr/bin/env node
/* eslint-disable */
// 从真实源码抽取纯函数 → 生成浏览器可加载的 harness.gen.js。
// 目的：e2e 直接跑「真实源码逻辑 + 真实 CodeMirror」，而非重写副本。
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '../../..')
const EDITOR = path.join(ROOT, 'src/views/ietm/ietmdatamodulemanagement/editor')
const read = p => fs.readFileSync(p, 'utf-8')

// 按大括号配平抽取「函数/常量声明」文本
function grab(src, sig) {
  const start = src.indexOf(sig)
  if (start < 0) throw new Error('未找到: ' + sig)
  // 从签名的参数列表结束 ')' 之后再找函数体 '{'，避免默认参数 ctx={} 被当成函数体
  const parenEnd = src.indexOf(')', start)
  let i = src.indexOf('{', parenEnd), depth = 0, end = -1
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break } } }
  return src.slice(start, end + 1)
}
const line = (src, prefix) => src.split('\n').find(l => l.trim().startsWith(prefix))

const xmlTree = read(path.join(EDITOR, 'utils/xmlTree.js'))
const view    = read(path.join(EDITOR, 'components/DmSourceView.vue'))
const protect = read(path.join(EDITOR, 'utils/editorProtect.js'))

const parts = []
parts.push('// 自动生成，请勿手改。源：build-harness.js（抽取真实源码）')
parts.push('window.__SRC = (function(){')
// xmlTree
parts.push(line(xmlTree, 'const TAG ='))
parts.push(grab(xmlTree, 'function _splitGluedTags'))
parts.push(grab(xmlTree, 'export function formatXml').replace('export ', ''))
parts.push(grab(xmlTree, 'export function getnodeBylineno').replace('export ', ''))
parts.push(grab(xmlTree, 'export function getLinenoOffset').replace('export ', ''))
// editorProtect
parts.push(grab(protect, 'export function lineAtomic').replace('export ', ''))
// DmSourceView 纯函数
parts.push(grab(view, 'function _writeAttr'))
parts.push(grab(view, 'function _allowedChildSet'))
parts.push(grab(view, 'function _elementHint'))
parts.push('return { TAG, formatXml, getnodeBylineno, getLinenoOffset, lineAtomic, _writeAttr, _allowedChildSet, _elementHint }')
parts.push('})();')

const out = parts.join('\n\n')
fs.writeFileSync(path.join(__dirname, 'harness.gen.js'), out)
console.log('✓ harness.gen.js 生成，', out.length, '字符')
