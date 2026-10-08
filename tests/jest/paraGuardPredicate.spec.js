// Para行号漂移守卫的判定式回归测试
// 背景：源码直接编辑后树lineno陈旧→双击para打开错行→保存时repeat(-1)崩溃/写错位置损坏数据。
// 修复在两处.vue方法内加守卫(jest无法加载.vue,故此处锁定与生产逐字一致的判定式逻辑)：
//   1) ParaDesigner.setcontent 入口：目标行既无<para又无</para> → 抛错拒绝载入
//   2) ParaDesigner.handleSave replaceRange前：目标行无<para开始标签 → 抛错拒绝保存
// 说明：build已验证.vue接线正确；本测试锁定判定式对各类行内容的真值，防未来回归。

// —— 与 ParaDesigner.vue:setcontent 逐字一致的判定 ——
function setcontentGuardRejects(line, paraName) {
  if (line == null) return true // 已有的越界守卫
  return line.indexOf('<' + paraName) === -1 && line.indexOf('</' + paraName + '>') === -1
}

// —— 与 ParaDesigner.vue:handleSave 逐字一致的判定 ——
function handleSaveGuardRejects(line, paraName) {
  return line == null || line.indexOf('<' + paraName) === -1
}

describe('setcontent入口守卫：只放行真正的para边界行', () => {
  const P = 'para'
  test.each([
    ['<para>',                       false, '开始标签行(单/多行开始)'],
    ['  <para id="x">内容</para>',    false, '带缩进带id的单行para'],
    ['</para>',                       false, '结束标签行(多行para结束,靠向上搜索)'],
    ['    </para>',                   false, '带缩进的结束行'],
  ])('放行: %s', (line, _rej, _desc) => {
    expect(setcontentGuardRejects(line, P)).toBe(false)
  })

  test.each([
    ['',                    true,  '空行(行号漂移最常见落点)'],
    ['   ',                 true,  '纯空白行'],
    ['<title>标题</title>', true,  '别的元素行'],
    ['一些普通文字',          true,  '纯内容行(无标签)'],
    [null,                  true,  '越界返回null'],
  ])('拦截: %s', (line, _rej, _desc) => {
    expect(setcontentGuardRejects(line, P)).toBe(true)
  })
})

describe('handleSave兜底守卫：replaceRange前必须是<para开始标签', () => {
  const P = 'para'
  test('开始标签行放行', () => {
    expect(handleSaveGuardRejects('<para>', P)).toBe(false)
    expect(handleSaveGuardRejects('  <para id="a">x</para>', P)).toBe(false)
  })
  test('仅结束标签行被拦截(开始标签未在此行→从此行replaceRange会残留旧<para>)', () => {
    expect(handleSaveGuardRejects('</para>', P)).toBe(true)
  })
  test('空行/内容行/null被拦截(正是导致indexOf(<)=-1→repeat(-1)崩溃的行)', () => {
    expect(handleSaveGuardRejects('', P)).toBe(true)
    expect(handleSaveGuardRejects('<title>x</title>', P)).toBe(true)
    expect(handleSaveGuardRejects(null, P)).toBe(true)
  })
})

describe('GJB中文标准locale一致性(getLocaleName(para)返回中文名)', () => {
  const P = '内容' // 假定中文para名
  test('中文开始标签行放行', () => {
    expect(setcontentGuardRejects('<内容>文本</内容>', P)).toBe(false)
    expect(handleSaveGuardRejects('<内容>文本</内容>', P)).toBe(false)
  })
  test('英文<para>在中文locale下被拦截(证明locale不匹配会被守卫捕获,非误放)', () => {
    expect(setcontentGuardRejects('<para>x</para>', P)).toBe(true)
  })
})

describe('崩溃根因直证：拦截的行正是indexOf(<)可能=-1的行', () => {
  // 复现 handleSave: const rawIndent = getLine(lineno).indexOf('<')
  test('空行indexOf(<)=-1 → 若无守卫会传入repeat(-1)崩溃', () => {
    expect(''.indexOf('<')).toBe(-1)
    // 守卫在此之前就拦截了空行
    expect(handleSaveGuardRejects('', 'para')).toBe(true)
  })
})
