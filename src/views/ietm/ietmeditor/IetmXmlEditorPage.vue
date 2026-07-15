<template>
  <a-layout class="main-layout">
    <!-- 左侧树形结构（15%） -->
    <a-layout-sider
      v-if="isTreeVisible"
      width="20%"
      class="left-sider"
      :style="{ minWidth: '120px', maxWidth: '300px' }"
    >
      <a-tree
        :tree-data="treeData"
        default-expand-all
        class="tree-container"
        @select="onTreeSelect"
        :selectedKeys="selectedKeys"
        v-model:selectedKeys="selectedKeys"
      >
        <template #title="{ title, textContent }">
          <span>
            {{ title }}
            <span v-if="textContent" style="margin-left: 8px; color: black;">{{ textContent }}</span>
          </span>
        </template>
      </a-tree>
    </a-layout-sider>

    <!-- 右侧内容区域（80%） -->
    <a-layout class="right-layout">
      <!-- 上部工具栏（5%） -->
      <a-layout-header class="toolbar">
        <a-row type="flex" align="middle" justify="space-between">
          <a-col :span="8" class="select-group">
            <a-button @click="toggleTreeVisibility" class="toolbar-button" :title="isTreeVisible ? '隐藏树' : '显示树'">
                <a-icon :type="isTreeVisible ? 'menu-fold' : 'menu-unfold'" />
              </a-button>
                <a-button @click="handleFormat" class="toolbar-button" title="刷新DM树">
                <a-icon type="reload" />
              </a-button>
            <a-select v-model="theme" class="select-item">
            <a-select-option value="default">选择主题</a-select-option>
              <a-select-option value="3024-day">3024-day</a-select-option>
              <a-select-option value="3024-night">3024-night</a-select-option>
              <a-select-option value="abcdef">abcdef</a-select-option>
              <a-select-option value="ambiance">ambiance</a-select-option>
              <a-select-option value="base16-dark">base16-dark</a-select-option>
              <a-select-option value="base16-light">base16-light</a-select-option>
              <a-select-option value="bespin">bespin</a-select-option>
              <a-select-option value="blackboard">blackboard</a-select-option>
              <a-select-option value="cobalt">cobalt</a-select-option>
              <a-select-option value="colorforth">colorforth</a-select-option>
              <a-select-option value="dracula">dracula</a-select-option>
              <a-select-option value="duotone-dark">duotone-dark</a-select-option>
              <a-select-option value="duotone-light">duotone-light</a-select-option>
              <a-select-option value="eclipse">eclipse</a-select-option>
              <a-select-option value="elegant">elegant</a-select-option>
              <a-select-option value="erlang-dark">erlang-dark</a-select-option>
              <a-select-option value="gruvbox-dark">gruvbox-dark</a-select-option>
              <a-select-option value="hopscotch">hopscotch</a-select-option>
              <a-select-option value="icecoder">icecoder</a-select-option>
              <a-select-option value="idea">idea</a-select-option>
              <a-select-option value="isotope">isotope</a-select-option>
              <a-select-option value="lesser-dark">lesser-dark</a-select-option>
              <a-select-option value="liquibyte">liquibyte</a-select-option>
              <a-select-option value="lucario">lucario</a-select-option>
              <a-select-option value="material">material</a-select-option>
              <a-select-option value="mbo">mbo</a-select-option>
              <a-select-option value="mdn-like">mdn-like</a-select-option>
              <a-select-option value="midnight">midnight</a-select-option>
              <a-select-option value="monokai">monokai</a-select-option>
              <a-select-option value="neat">neat</a-select-option>
              <a-select-option value="neo">neo</a-select-option>
              <a-select-option value="night">night</a-select-option>
              <a-select-option value="oceanic-next">oceanic-next</a-select-option>
              <a-select-option value="panda-syntax">panda-syntax</a-select-option>
              <a-select-option value="paraiso-dark">paraiso-dark</a-select-option>
              <a-select-option value="paraiso-light">paraiso-light</a-select-option>
              <a-select-option value="pastel-on-dark">pastel-on-dark</a-select-option>
              <a-select-option value="railscasts">railscasts</a-select-option>
              <a-select-option value="rubyblue">rubyblue</a-select-option>
              <a-select-option value="seti">seti</a-select-option>
              <a-select-option value="shadowfox">shadowfox</a-select-option>
              <a-select-option value="solarized">solarized</a-select-option>
              <a-select-option value="ssms">ssms</a-select-option>
              <a-select-option value="the-matrix">the-matrix</a-select-option>
              <a-select-option value="tomorrow-night-bright">tomorrow-night-bright</a-select-option>
              <a-select-option value="tomorrow-night-eighties">tomorrow-night-eighties</a-select-option>
              <a-select-option value="ttcn">ttcn</a-select-option>
              <a-select-option value="twilight">twilight</a-select-option>
              <a-select-option value="vibrant-ink">vibrant-ink</a-select-option>
              <a-select-option value="xq-dark">xq-dark</a-select-option>
              <a-select-option value="xq-light">xq-light</a-select-option>
              <a-select-option value="yeti">yeti</a-select-option>
              <a-select-option value="zenburn">zenburn</a-select-option>
            </a-select>

            <a-select v-model="language" class="select-item">
              <a-select-option value="zh-CN">中文</a-select-option>
              <a-select-option value="en-US">English</a-select-option>
            </a-select>
          </a-col>

          <a-col :span="16" class="button-group">
            <div class="button-container">
              <a-button @click="handleFormat" class="toolbar-button" title="格式化">
                <a-icon type="interaction" />
              </a-button>
              <a-button @click="toggleExpand" class="toolbar-button" :title="isExpanded ? '折叠当前行' : '展开当前行'">
             <a-icon type="plus-square" />
              </a-button>
              <a-button @click="handleMigrate" class="toolbar-button" title="迁出">
                <a-icon type="export" />
              </a-button>
              <a-button @click="handleSearch" class="toolbar-button" title="查找">
                <a-icon type="search" />
              </a-button>
              <a-button @click="handleList" class="toolbar-button" title="对象列表">
                <a-icon type="ordered-list" />
              </a-button>
              <a-button @click="handlePreview" class="toolbar-button" title="预览">
                <a-icon type="eye" />
              </a-button>
              <a-button @click="zoomIn" class="toolbar-button" title="放大字">
                <a-icon type="zoom-in" />
              </a-button>
              <a-button @click="zoomOut" class="toolbar-button" title="缩小字">
                <a-icon type="zoom-out" />
              </a-button>
              <a-button @click="validate" class="toolbar-button" title="校验">
                <a-icon type="check-circle" />
              </a-button>
              <a-button @click="exportData" class="toolbar-button" title="导出">
                <a-icon type="download" />
              </a-button>
              <a-button @click="handleLog" class="toolbar-button" title="工作日志">
                <a-icon type="file-text" />
              </a-button>
            </div>
          </a-col>
        </a-row>
      </a-layout-header>

      <!-- 下部内容区域（95%） -->
      <a-layout-content class="content-area">
        <div class="content-wrapper" :style="{ fontSize: fontSize + 'px' }">
          <textarea id="editor"></textarea>
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script>

export default {
  data() {
    return {
      id: 'null',
      name: '',
      type: '',
      cancheckout: '',
      editor: null,
      linenoOffset: 3, //<dmodule所在的行号
      xmlData: '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '\n' +
        '<dmodule xmlns:dc="http://www.purl.org/dc/elements/1.1/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/descript.xsd">\n' +
        '  <identAndStatusSection>\n' +
        '    <dmAddress>\n' +
        '      <dmIdent>\n' +
        '        <dmCode modelIdentCode="wwgTest" systemDiffCode="A" systemCode="20" subSystemCode="1" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="001" infoCodeVariant="A" itemLocationCode="A"></dmCode>\n' +
        '        <language countryIsoCode="CN" languageIsoCode="zh"></language>\n' +
        '        <issueInfo issueNumber="000" inWork="01"></issueInfo>\n' +
        '      </dmIdent>\n' +
        '      <dmAddressItems>\n' +
        '        <issueDate year="2026" month="03" day="23"></issueDate>\n' +
        '        <dmTitle>\n' +
        '          <techName>留用</techName>\n' +
        '          <infoName>扉页</infoName>\n' +
        '        </dmTitle>\n' +
        '      </dmAddressItems>\n' +
        '    </dmAddress>\n' +
        '    <dmStatus issueType="new">\n' +
        '      <security securityClassification="01"></security>\n' +
        '      <dataRestrictions>\n' +
        '        <restrictionInstructions>\n' +
        '          <dataDistribution></dataDistribution>\n' +
        '          <exportControl>\n' +
        '            <exportRegistrationStmt>\n' +
        '              <simplePara></simplePara>\n' +
        '            </exportRegistrationStmt>\n' +
        '          </exportControl>\n' +
        '          <dataHandling></dataHandling>\n' +
        '          <dataDestruction></dataDestruction>\n' +
        '          <dataDisclosure>搜索</dataDisclosure>\n' +
        '        </restrictionInstructions>\n' +
        '        <restrictionInfo>\n' +
        '          <copyright>\n' +
        '            <copyrightPara></copyrightPara>\n' +
        '          </copyright>\n' +
        '          <policyStatement>多大</policyStatement>\n' +
        '          <dataConds></dataConds>\n' +
        '        </restrictionInfo>\n' +
        '      </dataRestrictions>\n' +
        '      <responsiblePartnerCompany enterpriseCode="30101">\n' +
        '        <enterpriseName>责任单位1</enterpriseName>\n' +
        '      </responsiblePartnerCompany>\n' +
        '      <originator enterpriseCode="ORIG1">\n' +
        '        <enterpriseName>创作单位1</enterpriseName>\n' +
        '      </originator>\n' +
        '      <applic>\n' +
        '        <displayText>\n' +
        '          <simplePara></simplePara>\n' +
        '        </displayText>\n' +
        '      </applic>\n' +
        '      <brexDmRef>\n' +
        '        <dmRef xlink:type="simple" xlink:actuate="onRequest" xlink:show="replace" xlink:href="">\n' +
        '          <dmRefIdent>\n' +
        '            <dmCode modelIdentCode="DEFAULT" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="022" infoCodeVariant="A" itemLocationCode="D"></dmCode>\n' +
        '          </dmRefIdent>\n' +
        '        </dmRef>\n' +
        '      </brexDmRef>\n' +
        '      <qualityAssurance>\n' +
        '        <unverified></unverified>\n' +
        '      </qualityAssurance>\n' +
        '      <reasonForUpdate>\n' +
        '        <simplePara></simplePara>\n' +
        '      </reasonForUpdate>\n' +
        '    </dmStatus>\n' +
        '  </identAndStatusSection>\n' +
        '  <content>\n' +
        '    <description></description>\n' +
        '  </content>\n' +
        '</dmodule>',

      treeData: [], // 初始为空，在 mounted 中通过 updateTree() 生成
      theme: 'default',
      language: 'zh-CN',
      isExpanded: true,
      isTreeVisible: true, // 控制左侧树结构的显示状态
      fontSize: 16,
      contentText: `这是示例内容区域\n可以显示多行代码或文本\n支持字体大小调整功能`,
      currentMarker: null,
      selectedKeys: [], // 存储选中的树节点 keys
      en2cnmap: {}, // 英文到中文的映射
      cn2enmap: {}, // 中文到英文的映射
    };
  },
  created() {
    // 从 URL 查询参数获取数据
    this.id = this.$route.query.id || 'null';
    this.name = this.$route.query.name || '';
    this.type = this.$route.query.type || '';
    this.cancheckout = this.$route.query.cancheckout || '';

    // 加载 en_cn.js 文件
    this.loadEnCnMap();
  },
  methods: {
    // 加载 en_cn.js 文件
    loadEnCnMap() {
      try {
        // 直接使用空对象作为默认值
        this.en2cnmap = {};
        this.cn2enmap = {};
        console.log('Using empty objects for en2cnmap and cn2enmap');

        // 尝试加载外部 en_cn.js
        const script = document.createElement('script');
        script.src = '/static/ietmeditor/res/en_cn.js';
        script.onload = () => {
          try {
            if (window.en2cnmap__ && typeof window.en2cnmap__ === 'object') {
              this.en2cnmap = window.en2cnmap__;
              console.log('Loaded en2cnmap__:', this.en2cnmap);
            }
            if (window.cn2enmap__ && typeof window.cn2enmap__ === 'object') {
              this.cn2enmap = window.cn2enmap__;
              console.log('Loaded cn2enmap__:', this.cn2enmap);
            }
            this.updateTree();
            // 地图加载完成后应用编辑器覆盖层
            this.applyEditorI18nOverlay();
          } catch (e) {
            console.error('Error processing en_cn.js:', e);
          }
        };
        script.onerror = () => {
          console.error('Failed to load en_cn.js');
          this.updateTree();
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading en_cn.js:', error);
        // 发生错误时设置为空对象
        this.en2cnmap = {};
        this.cn2enmap = {};
        this.updateTree();
      }
    },
    // 解析 XML 并生成树结构
    parseXmlToTree(xmlString) {
      try {
        const self = this;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
          return [{ title: '解析错误', key: 'error' }];
        }

        const rootElement = xmlDoc.documentElement;
        if (!rootElement) {
          return [{ title: '无根元素', key: 'no-root' }];
        }

        // 预先按行分割，用于定位标签行号
        const lines = xmlString.split('\n');

        // 记录每个 tagName 已匹配到第几次，用于区分同名标签
        const tagOccurrenceMap = {};

        // 递归生成树节点
        function generateTree(node, parentKey = 'root', index = 0) {
          const nodeKey = parentKey === 'root' ? `root-${Date.now()}` : `${parentKey}-${index}`;
          const originalTagName = node.tagName;
          let nodeTitle = originalTagName;

          if (self.language === 'zh-CN' && self.en2cnmap[originalTagName]) {
            nodeTitle = self.en2cnmap[originalTagName];
          }

          // 提取节点的直接文本内容（不包括子节点的文本）
          let textContent = '';
          for (let i = 0; i < node.childNodes.length; i++) {
            const childNode = node.childNodes[i];
            if (childNode.nodeType === 3) { // TEXT_NODE
              const text = childNode.nodeValue.trim();
              if (text) {
                textContent += text;
              }
            }
          }

          // 定位该节点在编辑器中的行号（第 N 次出现）
          if (!tagOccurrenceMap[originalTagName]) {
            tagOccurrenceMap[originalTagName] = 0;
          }
          const occurrenceIndex = tagOccurrenceMap[originalTagName];
          tagOccurrenceMap[originalTagName]++;

          const lineInfo = self.findTagLineByOccurrence(lines, originalTagName, occurrenceIndex);

          const children = [];
          let childIndex = 0;
          for (let i = 0; i < node.childNodes.length; i++) {
            const childNode = node.childNodes[i];
            if (childNode.nodeType === 1) {
              children.push(generateTree(childNode, nodeKey, childIndex));
              childIndex++;
            }
          }

          return {
            title: nodeTitle,
            key: nodeKey,
            tagName: originalTagName,
            textContent: textContent, // 保存文本内容
            lineNo: lineInfo ? lineInfo.lineNo : -1,
            startCh: lineInfo ? lineInfo.startCh : 0,
            endCh: lineInfo ? lineInfo.endCh : 0,
            closeLineNo: lineInfo ? lineInfo.closeLineNo : -1,
            closeCh: lineInfo ? lineInfo.closeCh : 0,
            children: children.length > 0 ? children : undefined
          };
        }

        const tree = generateTree(rootElement);
        return [tree];
      } catch (error) {
        console.error('解析 XML 时出错:', error);
        return [{ title: '解析错误', key: 'catch-error' }];
      }
    },

    // 找到 tagName 第 occurrenceIndex 次出现的行号和字符位置
    findTagLineByOccurrence(lines, tagName, occurrenceIndex) {
      const pattern = new RegExp(`<${tagName}(?=[\\s>/]|$)`);
      let count = 0;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(pattern);
        if (match) {
          if (count === occurrenceIndex) {
            const fullTagMatch = lines[i].match(new RegExp(`<${tagName}[^>]*>`));
            const startCh = match.index;
            const endCh = fullTagMatch ? match.index + fullTagMatch[0].length : match.index + match[0].length;
            // 同时查找对应的结束标签位置
            const closeInfo = this.findClosingTag(lines, tagName, i, startCh);
            return { lineNo: i, startCh, endCh, closeLineNo: closeInfo.lineNo, closeCh: closeInfo.ch };
          }
          count++;
        }
      }
      return null;
    },

    // 从 fromLine 开始，找与开始标签匹配的结束标签（处理同名嵌套）
    findClosingTag(lines, tagName, fromLine, fromCh) {
      const openPattern = new RegExp(`<${tagName}(?=[\\s>/]|$)`);
      const closePattern = new RegExp(`<\\/${tagName}\\s*>`);
      const selfClosePattern = new RegExp(`<${tagName}[^>]*/>`);

      // 先检查开始标签是否是自闭合
      const firstLine = lines[fromLine];
      const selfCloseMatch = firstLine.match(new RegExp(`<${tagName}[^>]*/>`));
      if (selfCloseMatch && selfCloseMatch.index === fromCh) {
        return { lineNo: fromLine, ch: selfCloseMatch.index + selfCloseMatch[0].length };
      }

      let depth = 1;
      // 从开始标签所在行开始扫描（跳过开始标签本身）
      for (let i = fromLine; i < lines.length; i++) {
        const line = lines[i];
        const searchFrom = i === fromLine ? fromCh + 1 : 0;
        const segment = line.slice(searchFrom);

        // 在当前行片段中逐个匹配开/闭标签，按出现顺序处理
        const tokens = [];
        let m;
        const openRe = new RegExp(`<${tagName}(?=[\\s>/]|$)`, 'g');
        const closeRe = new RegExp(`<\\/${tagName}\\s*>`, 'g');
        const selfRe = new RegExp(`<${tagName}[^>]*/>`, 'g');

        openRe.lastIndex = 0; closeRe.lastIndex = 0; selfRe.lastIndex = 0;

        while ((m = openRe.exec(segment)) !== null) tokens.push({ pos: m.index + searchFrom, type: 'open' });
        while ((m = closeRe.exec(segment)) !== null) tokens.push({ pos: m.index + searchFrom, type: 'close', len: m[0].length });
        while ((m = selfRe.exec(segment)) !== null) tokens.push({ pos: m.index + searchFrom, type: 'self' });

        tokens.sort((a, b) => a.pos - b.pos);

        for (const tok of tokens) {
          if (tok.type === 'open') {
            depth++;
          } else if (tok.type === 'close') {
            depth--;
            if (depth === 0) {
              return { lineNo: i, ch: tok.pos + tok.len };
            }
          }
          // self-close 不影响 depth
        }
      }
      // 未找到结束标签（自闭合或格式问题），返回开始行末尾
      return { lineNo: fromLine, ch: lines[fromLine].length };
    },

    // 更新树结构
    updateTree() {
      this.treeData = this.parseXmlToTree(this.xmlData);
    },

    // 切换树的显示/隐藏状态
    toggleTreeVisibility() {
      this.isTreeVisible = !this.isTreeVisible;
    },

    onTreeSelect(selectedKeys, event) {
      this.selectedKeys = selectedKeys;
      if (selectedKeys && selectedKeys.length > 0 && this.editor) {
        this.highlightCorrespondingTag(selectedKeys[0]);
      }
    },

    // 高亮显示对应的 XML 标签及其完整内容
    highlightCorrespondingTag(key) {
      const node = this.findTreeNode(this.treeData, key);
      if (!node || node.lineNo < 0) return;

      // 清除上一次高亮（markText）
      if (this.currentMarker) {
        this.currentMarker.clear();
        this.currentMarker = null;
      }

      const { lineNo, closeLineNo } = node;
      const endLine = closeLineNo >= 0 ? closeLineNo : lineNo;

      // 整行高亮：从开始标签行行首到结束标签行行尾
      const endLineLength = this.editor.getLine(endLine).length;
      this.currentMarker = this.editor.markText(
        { line: lineNo, ch: 0 },
        { line: endLine, ch: endLineLength },
        { className: 'highlight-tag' }
      );

      // 滚动到开始标签行，居中显示
      this.editor.scrollIntoView({ line: lineNo, ch: 0 }, 150);
      this.editor.setCursor({ line: lineNo, ch: 0 });
      this.editor.focus();
    },

    // 查找树节点
    findTreeNode(nodes, key) {
      for (const node of nodes) {
        if (node.key === key) {
          return node;
        }
        if (node.children) {
          const found = this.findTreeNode(node.children, key);
          if (found) {
            return found;
          }
        }
      }
      return null;
    },

    // 应用中文标签标注到编辑器（使用 markText replacedWith）
    applyEditorI18nOverlay() {
      if (!this.editor) return;
      this.removeEditorI18nOverlay();
      if (this.language !== 'zh-CN') return;

      const en2cn = this.en2cnmap;
      const doc = this.editor.getDoc();
      const markers = [];
      const lineCount = doc.lineCount();

      // 动态读取当前主题 cm-tag 的实际渲染颜色
      const probe = document.createElement('span');
      probe.className = 'cm-tag';
      probe.style.visibility = 'hidden';
      probe.style.position = 'absolute';
      this.editor.getWrapperElement().appendChild(probe);
      const tagColor = window.getComputedStyle(probe).color;
      probe.remove();

      for (let lineNo = 0; lineNo < lineCount; lineNo++) {
        const lineText = doc.getLine(lineNo);
        const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9_\-:.]*)/g;
        let match;
        while ((match = tagPattern.exec(lineText)) !== null) {
          const tagName = match[1];
          const cnLabel = en2cn[tagName];
          if (!cnLabel) continue;

          const prefixLen = match[0].length - tagName.length;
          const tagStart = match.index + prefixLen;
          const tagEnd = tagStart + tagName.length;

          const span = document.createElement('span');
          span.className = 'cm-i18n-tag-label';
          span.style.color = tagColor; // 与当前主题 cm-tag 颜色一致
          span.textContent = cnLabel;
          span.title = tagName;
          span.dataset.line = lineNo;

          const marker = doc.markText(
            { line: lineNo, ch: tagStart },
            { line: lineNo, ch: tagEnd },
            { replacedWith: span, handleMouseEvents: true }
          );
          markers.push(marker);
        }
      }
      this._i18nMarkers = markers;
    },

    // 移除编辑器中文标注
    removeEditorI18nOverlay() {
      if (this._i18nMarkers && this._i18nMarkers.length) {
        this._i18nMarkers.forEach(m => m.clear());
        this._i18nMarkers = [];
      }
    },

    handleFormat() {
    },
    toggleExpand() {
      this.isExpanded = !this.isExpanded
    },
    handleMigrate() { /* 实现迁出逻辑 */
    },
    handleSearch() { /* 实现查找逻辑 */
    },
    handleList() { /* 实现对象列表逻辑 */
    },
    handlePreview() { /* 实现预览逻辑 */
    },
    zoomIn() {
      this.fontSize += 2
    },
    zoomOut() {
      this.fontSize = Math.max(12, this.fontSize - 2)
    },
    validate() { /* 实现校验逻辑 */
    },
    exportData() { /* 实现导出逻辑 */
    },
    handleLog() { /* 实现工作日志逻辑 */
    },
  },
  mounted() {
    // 定义缺失的函数
    window.completeIfAfterLt = function(cm) {
      // 实现 XML 标签自动完成功能
      var pos = cm.getCursor();
      var tok = cm.getTokenAt(pos);
      if (tok.string.charAt(0) === '<' && tok.end === pos.ch) {
        cm.replaceSelection('/');
        return CodeMirror.Pass;
      }
      return CodeMirror.Pass;
    };

    window.completeIfInTag = function(cm) {
      // 实现 XML 标签内自动完成功能
      var pos = cm.getCursor();
      var tok = cm.getTokenAt(pos);
      if (tok.type === 'tag') {
        return CodeMirror.Pass;
      }
      return CodeMirror.Pass;
    };

    window.save = function(todb) {
      // 实现保存功能
      console.log('Save function called with todb:', todb);
      // 这里可以添加实际的保存逻辑
    };

    window.undo = function(cm) {
      // 实现撤销功能
      cm.undo();
    };

    window.doDelete = function(cm) {
      // 实现删除功能
      var range = cm.getSelection();
      if (range) {
        cm.replaceSelection('');
      } else {
        var pos = cm.getCursor();
        cm.deleteCharAt(pos);
      }
    };

    try {
      this.editor = window.CodeMirror.fromTextArea(document.getElementById("editor"), {
        mode : "xml",
        lineNumbers : true,
        showCursorWhenSelecting : true,
        lineWrapping : true, // 启用自动换行，去除水平滚动条
        styleActiveLine : true,
        autoMatchParens : true,
        foldGutter: true,
        matchTags : {
          bothTags : true
        },
        extraKeys : {
          "Ctrl-J" : "toMatchingTag",
          "'/''" : window.completeIfAfterLt,
          "' '" : window.completeIfInTag,
          "'='" : window.completeIfInTag,
          "Ctrl-S" : function(cm){window.save('1')},
          "Ctrl-Z" : window.undo,
          "Ctrl-D" : window.doDelete,
          "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); }
        },
        gutters : [ "CodeMirror-linenumbers","CodeMirror-foldgutter" ], // 移除自定义的 dmGutter
        highlightSelectionMatches: {showToken: /\w/, annotateScrollbar: true},
        theme: this.theme,
        indentUnit: 2,
        tabSize: 2
      });

      // 设置编辑器宽度和高度
      this.editor.setSize('100%', '100%');

      // 确保编辑器内容完全可见
      this.editor.refresh();

      this.editor.setValue(this.xmlData);

      // DOM 渲染完成后再 refresh 一次，确保 gutter 宽度和内容 margin 正确计算
      this.$nextTick(() => {
        setTimeout(() => {
          this.editor.refresh();
        }, 50);
      });
      // 编辑器内容变化时重新应用中文标注
      this.editor.on('change', () => {
        if (this.language === 'zh-CN') {
          clearTimeout(this._i18nDebounce);
          this._i18nDebounce = setTimeout(() => {
            this.applyEditorI18nOverlay();
          }, 300);
        }
      });

    } catch (error) {
      console.error('初始化 CodeMirror 编辑器时出错:', error);
    }

    // 更新树结构
    this.updateTree();

  },
  beforeDestroy() {
  },
  watch: {
    theme(newTheme) {
      if (this.editor) {
        this.editor.setOption('theme', newTheme);
        // 主题变化后重新应用中文标注（颜色需跟随新主题）
        this.$nextTick(() => this.applyEditorI18nOverlay());
      }
    },
    language(newLanguage) {
      // 当语言变化时，重新生成树结构
      this.updateTree();
      // 更新编辑器标签国际化覆盖层
      this.applyEditorI18nOverlay();
    }
  },
};
</script>

<style scoped>
/* 从 public 目录引入 CodeMirror 样式 */
@import url('/static/ietmeditor/CodeMirror/lib/codemirror.css');
@import url('/static/ietmeditor/CodeMirror/addon/hint/show-hint.css');
@import url('/static/ietmeditor/CodeMirror/addon/fold/foldgutter.css');
@import url('/static/ietmeditor/CodeMirror/addon/dialog/dialog.css');
/* 引入所有主题样式 */
@import url('/static/ietmeditor/CodeMirror/theme/3024-day.css');
@import url('/static/ietmeditor/CodeMirror/theme/3024-night.css');
@import url('/static/ietmeditor/CodeMirror/theme/abcdef.css');
@import url('/static/ietmeditor/CodeMirror/theme/ambiance.css');
@import url('/static/ietmeditor/CodeMirror/theme/base16-dark.css');
@import url('/static/ietmeditor/CodeMirror/theme/base16-light.css');
@import url('/static/ietmeditor/CodeMirror/theme/bespin.css');
@import url('/static/ietmeditor/CodeMirror/theme/blackboard.css');
@import url('/static/ietmeditor/CodeMirror/theme/cobalt.css');
@import url('/static/ietmeditor/CodeMirror/theme/colorforth.css');
@import url('/static/ietmeditor/CodeMirror/theme/dracula.css');
@import url('/static/ietmeditor/CodeMirror/theme/duotone-dark.css');
@import url('/static/ietmeditor/CodeMirror/theme/duotone-light.css');
@import url('/static/ietmeditor/CodeMirror/theme/eclipse.css');
@import url('/static/ietmeditor/CodeMirror/theme/elegant.css');
@import url('/static/ietmeditor/CodeMirror/theme/erlang-dark.css');
@import url('/static/ietmeditor/CodeMirror/theme/gruvbox-dark.css');
@import url('/static/ietmeditor/CodeMirror/theme/hopscotch.css');
@import url('/static/ietmeditor/CodeMirror/theme/icecoder.css');
@import url('/static/ietmeditor/CodeMirror/theme/idea.css');
@import url('/static/ietmeditor/CodeMirror/theme/isotope.css');
@import url('/static/ietmeditor/CodeMirror/theme/lesser-dark.css');
@import url('/static/ietmeditor/CodeMirror/theme/liquibyte.css');
@import url('/static/ietmeditor/CodeMirror/theme/lucario.css');
@import url('/static/ietmeditor/CodeMirror/theme/material.css');
@import url('/static/ietmeditor/CodeMirror/theme/mbo.css');
@import url('/static/ietmeditor/CodeMirror/theme/mdn-like.css');
@import url('/static/ietmeditor/CodeMirror/theme/midnight.css');
@import url('/static/ietmeditor/CodeMirror/theme/monokai.css');
@import url('/static/ietmeditor/CodeMirror/theme/neat.css');
@import url('/static/ietmeditor/CodeMirror/theme/neo.css');
@import url('/static/ietmeditor/CodeMirror/theme/night.css');
@import url('/static/ietmeditor/CodeMirror/theme/oceanic-next.css');
@import url('/static/ietmeditor/CodeMirror/theme/panda-syntax.css');
@import url('/static/ietmeditor/CodeMirror/theme/paraiso-dark.css');
@import url('/static/ietmeditor/CodeMirror/theme/paraiso-light.css');
@import url('/static/ietmeditor/CodeMirror/theme/pastel-on-dark.css');
@import url('/static/ietmeditor/CodeMirror/theme/railscasts.css');
@import url('/static/ietmeditor/CodeMirror/theme/rubyblue.css');
@import url('/static/ietmeditor/CodeMirror/theme/seti.css');
@import url('/static/ietmeditor/CodeMirror/theme/shadowfox.css');
@import url('/static/ietmeditor/CodeMirror/theme/solarized.css');
@import url('/static/ietmeditor/CodeMirror/theme/ssms.css');
@import url('/static/ietmeditor/CodeMirror/theme/the-matrix.css');
@import url('/static/ietmeditor/CodeMirror/theme/tomorrow-night-bright.css');
@import url('/static/ietmeditor/CodeMirror/theme/tomorrow-night-eighties.css');
@import url('/static/ietmeditor/CodeMirror/theme/ttcn.css');
@import url('/static/ietmeditor/CodeMirror/theme/twilight.css');
@import url('/static/ietmeditor/CodeMirror/theme/vibrant-ink.css');
@import url('/static/ietmeditor/CodeMirror/theme/xq-dark.css');
@import url('/static/ietmeditor/CodeMirror/theme/xq-light.css');
@import url('/static/ietmeditor/CodeMirror/theme/yeti.css');
@import url('/static/ietmeditor/CodeMirror/theme/zenburn.css');

/deep/ .ant-layout-header {
  padding: 0 10px;
}

.main-layout {
  height: 100vh;
  display: flex;
}

.left-sider {
  background: #fff;
  border-right: 1px solid #e8e8e8;
  overflow: auto;
}

.right-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 0 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e8e8e8;
  min-height: 60px;
  display: flex;
  align-items: center;
}

.select-group {
  display: flex;
  gap: 12px;
}

.select-item {
  width: 200px;
}

.button-group {
  display: flex;
  align-items: center;
}

.button-container {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-button {
  min-width: 40px;
  width: 40px;
  height: 32px;
  padding: 0;
  font-size: 16px;
  border: none;
  background: transparent;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-button:hover {
  background: #f0f0f0;
  color: #1890ff;
  border-radius: 4px;
}

.content-area {
  flex: 1;
  overflow: auto;
}

.content-wrapper {
  height: 100%;
  overflow: auto;
  background: #fff;
  border-radius: 4px;
  padding: 0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 确保 CodeMirror 编辑器能够完全显示 */
:deep(.CodeMirror) {
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  padding-left: 0 !important;
  margin-left: 0 !important;
}

:deep(.CodeMirror-scroll) {
  min-width: 100% !important;
  padding-left: 0 !important;
  margin-left: 0 !important;
}

/* 调整 CodeMirror 行的内边距 */
:deep(.CodeMirror-line) {
  padding-left: 4px !important;
}

/* foldgutter 列与内容区不重叠 */
:deep(.CodeMirror-foldgutter) {
  width: 18px;
}

:deep(.CodeMirror-gutters) {
  z-index: 3;
}

.content-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Menlo, Monaco, Consolas, monospace;
  line-height: 1.6;
  color: #333;
}

/* 高亮标签样式 */
:deep(.highlight-tag) {
  background-color: #e6f4ff !important;
  border-left: 3px solid #1890ff !important;
  display: block !important;
  border-radius: 0 !important;
}

/* 编辑器中文标签标注样式：颜色由 JS 动态读取当前主题 cm-tag 色注入 */
:deep(.cm-i18n-tag-label) {
  font-size: 0.92em;
  font-family: inherit;
  cursor: default;
  line-height: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

/* 中文 span 的 matchTags 配对高亮，与 CodeMirror-matchingtag 保持一致 */
:deep(.cm-i18n-tag-label.cm-tag-match-active) {
  background: rgba(255, 150, 0, .3) !important;
}

.tree-container {
  height: 100%;
  padding: 16px;
  overflow: auto;
}

/* 确保树节点文本不被截断 */
:deep(.ant-tree-node-content-wrapper) {
  white-space: normal !important;
  word-break: break-all !important;
  min-width: 100%;
}

:deep(.ant-tree-treenode) {
  white-space: normal !important;
  word-break: break-all !important;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .select-item {
    width: 90px;
  }

  .toolbar-button {
    min-width: 60px;
    padding: 4px 8px;
    font-size: 12px;
  }
}

@media (max-width: 992px) {
  .left-sider {
    display: none;
  }

  .button-container {
    flex-direction: column;
  }

  .select-group {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
