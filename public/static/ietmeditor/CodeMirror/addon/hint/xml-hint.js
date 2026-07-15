// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var Pos = CodeMirror.Pos;

  function getHints(cm, options) {
    var tags = options && options.schemaInfo;
    var quote = (options && options.quoteChar) || '"';
    if (!tags) return;
    var cur = cm.getCursor(), token = cm.getTokenAt(cur);
    if(token.type=="meta") return;//xiaowd
    if (token.end > cur.ch) {
      token.end = cur.ch;
      token.string = token.string.slice(0, cur.ch - token.start);
    }
    var inner = CodeMirror.innerMode(cm.getMode(), token.state);
    if (inner.mode.name != "xml") return;
    var result = [], replaceToken = false, prefix;
    var tag = /\btag\b/.test(token.type) && !/>$/.test(token.string);
    var tagName = tag && /^\w/.test(token.string), tagStart;

    if (tagName) {
      var before = cm.getLine(cur.line).slice(Math.max(0, token.start - 2), token.start);
      var tagType = /<\/$/.test(before) ? "close" : /<$/.test(before) ? "open" : null;
      if (tagType) tagStart = token.start - (tagType == "close" ? 2 : 1);
    } else if (tag && token.string == "<") {
      tagType = "open";
    } else if (tag && token.string == "</") {
      tagType = "close";
    }

    if (!tag && !inner.state.tagName || tagType) {
      if (tagName)
        prefix = token.string;
      replaceToken = tagType;
      var cx = inner.state.context, curTag = cx && tags[cx.tagName];
      var childList = cx ? curTag && curTag.children : tags["!top"];

      //在元素tag上回车则弹出提示 xiaowd add
      var hintattrFlag = token.type=='tag';
      if(hintattrFlag){
    	//得出已经有的属性
        var existedAttrs=[];
  		var tokens=cm.getLineTokens(cm.getCursor().line);
  		$.each(tokens,function(i,m){
  			if(m.type=='attribute'){
  				existedAttrs.push(m.string);
  			}
  		});
    	  curTag=tags[token.state.tagName];
    	  if(curTag==null) return;
    	  childList=[];
    	  for(var attr in curTag.attrs){
    		  if($.inArray(attr,existedAttrs)==-1)//已经有的属性就不要出来提示了
    		  childList.push(attr);
    	  }
      }
      var hinttype='';//1叶节点弹出子节点,2叶节点弹出同级节点,3有下级节点弹出子节点,4有下级节点弹出同级节点
      var selectednode=tree.tree('getSelected'),nodename,childnodes=[];
      if(selectednode==null) return;
      if(tree.tree('isLeaf',selectednode.target)){//如果是叶节点
    	  //如果在当前行最后回车,弹出同级节点,取出其父节点的直接子节点
    	  if(token.end==cm.getLine(cur.line).length){
    		  hinttype = '2';
	    	  var pnode=tree.tree('getParent',selectednode.target);
	    	  $.each(tree.tree('getLeafChildren',pnode.target), function(i,m){
	    		  childnodes.push(m.attributes.name);
	    	  });
	    	  nodename=pnode.attributes.name;
    	  } else {
    		  hinttype = '1';
    		  nodename = selectednode.attributes.name;
    	  }
      } else {//如当前节点有下级节点
    	  //如果在当前行最后回车,弹出同级节点,取出其父节点的直接子节点
    	  if(token.end==cm.getLine(cur.line).length && cm.getLine(cur.line).indexOf('</') > -1){
    		  hinttype = '4';
    		  var pnode=tree.tree('getParent',selectednode.target);
	    	  $.each(tree.tree('getLeafChildren',pnode.target), function(i,m){
	    		  childnodes.push(m.attributes.name);
	    	  });
	    	  nodename=pnode.attributes.name;
    	  } else {//节点开始tag后回车弹出子节点
    		  hinttype = '3';
	    	  $.each(tree.tree('getLeafChildren',selectednode.target),function(i,m){
	    		  childnodes.push(m.attributes.name);
	    	  });
	    	  nodename=selectednode.attributes.name;
    	  }
      }
      var redresult = [];//需要红色显示的子元素 --20200424 add
      // end of add

      if (childList && tagType != "close") {
        for (var i = 0; i < childList.length; ++i) if (!prefix || childList[i].lastIndexOf(prefix, 0) == 0){
        	// 原只有一句result.push("<"+childList[i]);改为以下(已存在的必选子节点不能出现)20181113
        	var child=childList[i];
        	var enElem=locale=='cn'?cn2enElem[child]:child, setelem=schema[nodename].setelem;
        	if(childnodes.length == 0){
        		result.push("<" + child + ">");
        		if(setelem[enElem].minocc == '1'&& $.inArray(enElem,childnodes) == -1) redresult.push("<" + child + ">");
        	} else {
        		var canpush = true;
        		if(setelem!=undefined && setelem[enElem]!=undefined){
        			var choices = [];//该元素的choice子元素(只能出现一个) 20200326
        			for(var key in setelem) if(setelem[key].ifchoice == 'true' && setelem[key].maxocc=='1') choices.push(key);
        			if (choices.length > 0 && $.inArray(child, choices) > -1){
        				$.each(childnodes, function(j,n){
        					if($.inArray(n, choices)>-1){
        						canpush = false;
        						return false;
        					}
        				});
        			}
        			if(canpush && setelem[enElem].maxocc!=undefined && setelem[enElem].maxocc=='1' && $.inArray(enElem,childnodes)>-1) canpush = false;
        		}
        		if(canpush){
        			result.push("<" + child + ">");
        			if(setelem[enElem]!=undefined && setelem[enElem].minocc != undefined && setelem[enElem].minocc == '1' && $.inArray(enElem,childnodes) == -1) redresult.push("<" + child + ">");
        		}
        	}
        }
        if(hintattrFlag)  result=childList;
      } else if (tagType != "close") {
    	//没有子元素时应该啥也不做，注释掉以下，待验证 xiaowd 20180430
        //for (var name in tags)
        //  if (tags.hasOwnProperty(name) && name != "!top" && name != "!attrs" && (!prefix || name.lastIndexOf(prefix, 0) == 0))
        //    result.push("<" + name);
      }
      //xiaowd comment：封闭标签在show-hint中处理，此处不能出现了
      //if (cx && (!prefix || tagType == "close" && cx.tagName.lastIndexOf(prefix, 0) == 0))
      //  result.push("</" + cx.tagName + ">");
    } else {
      // Attribute completion
      var curTag = tags[inner.state.tagName], attrs = curTag && curTag.attrs;
      var globalAttrs = tags["!attrs"];
      if (!attrs && !globalAttrs) return;
      if (!attrs) {
        attrs = globalAttrs;
      } else if (globalAttrs) { // Combine tag-local and global attributes
        var set = {};
        for (var nm in globalAttrs) if (globalAttrs.hasOwnProperty(nm)) set[nm] = globalAttrs[nm];
        for (var nm in attrs) if (attrs.hasOwnProperty(nm)) set[nm] = attrs[nm];
        attrs = set;
      }
      if (token.type == "string" || token.string == "=") { // A value
        var before = cm.getRange(Pos(cur.line, Math.max(0, cur.ch - 60)),
                                 Pos(cur.line, token.type == "string" ? token.start : token.end));
        var atName = before.match(/([^\s\u00a0=<>\"\']+)=$/), atValues;
        if (!atName || !attrs.hasOwnProperty(atName[1]) || !(atValues = attrs[atName[1]])) return;
        if (typeof atValues == 'function') atValues = atValues.call(this, cm); // Functions can be used to supply values for autocomplete widget
        if (token.type == "string") {
          prefix = token.string;
          var n = 0;
          if (/['"]/.test(token.string.charAt(0))) {
            quote = token.string.charAt(0);
            prefix = token.string.slice(1);
            n++;
          }
          var len = token.string.length;
          if (/['"]/.test(token.string.charAt(len - 1))) {
            quote = token.string.charAt(len - 1);
            prefix = token.string.substr(n, len - 2);
          }
          replaceToken = true;
        }
        for (var i = 0; i < atValues.length; ++i) if (!prefix || atValues[i].lastIndexOf(prefix, 0) == 0)
          result.push(quote + atValues[i] + quote);
      } else { // An attribute name
        if (token.type == "attribute") {
          prefix = token.string;
          replaceToken = true;
        }
        //得出已经有的属性 xiaowd add
        var existedAttrs=[];
		var tokens=cm.getLineTokens(cm.getCursor().line);
		$.each(tokens,function(i,m){
			if(m.type=='attribute'){
				existedAttrs.push(m.string);
			}
		});// end of add
        for (var attr in attrs){
        	if (attrs.hasOwnProperty(attr) && (!prefix || attr.lastIndexOf(prefix, 0) == 0)){
        		if(locale=='cn') attr=en2cnElem[attr];//
        		if ($.inArray(attr,existedAttrs)==-1)//已经有的属性就不要出来提示了 xiaowd add
        			result.push(attr);
        	}
        }
      }
    }
    return {
      list: $.unique(result),
      redresult: $.unique(redresult), // 20200424add
      from: replaceToken ? Pos(cur.line, tagStart == null ? token.start : tagStart) : cur,
      to: replaceToken ? Pos(cur.line, token.end) : cur
    };
  }

  CodeMirror.registerHelper("hint", "xml", getHints);
});
