function guid(){
	//return new Date().getTime().toString(32);
	function S4() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}
//校验是否有特殊字符
function validstr(str){
	var regEn = /[`~!@#$%^&*()--+<>=?:"{},.\/;'[\]]/im;
	var regCn = /[·！#￥（——）：；“”‘、，|《。》？、【】[\]]/im;
	if(regEn.test(str) || regCn.test(str)) {
    	return false;
	}
	return true;
}
/*判断文件是否存在*/
function fileExists(url){
	var isExists;
	$.ajax({
		url:url,
		async:false,
		type:'HEAD',
		error:function(){
			isExists=0;
		},
		success:function(){
			isExists=1;
		}
	});
	if(isExists==1) return true;
	else return false;
}

/*  只返回目标节点的第一级子节点，具体的用法和getChildren方法是一样的 */
$.extend($.fn.tree.methods,{
    getLeafChildren:function(jq, params){
        var nodes = [];
        $(params).next().children().children("div.tree-node").each(function(){
            nodes.push($(jq[0]).tree('getNode',this));
        });
        return nodes;
    }
});

//获取节点级别
$.extend($.fn.tree.methods, {
    getLevel:function(jq,target){
        var l = $(target).parentsUntil("ul.tree","ul");
        return l.length+1;
    }
});

//让tree和treegrid一样支持用id和parentId构造出树节点
//用法：$('#tree').tree({parentField:"_parentId",textFiled:"text",idFiled:"id"});
$.fn.tree.defaults.loadFilter = function (data, parent) {
	var opt = $(this).data().tree.options;
	var idFiled,textFiled,parentField;
	if (opt.parentField){
		idFiled = opt.idFiled || 'id';
		textFiled = opt.textFiled || 'text';
		parentField = opt.parentField;
		var i,l,treeData = [],tmpMap = [];
		for(i = 0, l = data.length; i < l; i++) {
			tmpMap[data[i][idFiled]] = data[i];
		}
		for(i = 0, l = data.length; i < l; i++) {
			var d=data[i],dp=d[parentField];
			if (tmpMap[dp] && d[idFiled] != dp) {
				if (!tmpMap[dp]['children'])
					tmpMap[dp]['children'] = [];
				d['text'] = d[textFiled];
				tmpMap[dp]['children'].push(d);
			} else {
				d['text'] = d[textFiled];
				treeData.push(d);
			}
		}
		return treeData;
	}
	return data;
};

//让treegrid只取一级子节点(getChildren方法是取所有子节点)
$.extend($.fn.treegrid.methods,	{
	getLeafChildren : function(jq, params) {
		var nodes_ = [];
		if (jq && params) {
			var node = $(jq).treegrid("find", params);
			if (node && node.children) {
				for ( var i = 0, len = node.children.length; i < len; i++) {
					var tempNode = node.children[i];
					nodes_.push(tempNode);
				}
			}
		}
		return nodes_;
	}
});

/**
 * 根据xml形成树
 * @param tree
 * @param nodes 树节点数组
 * @param xmlstr xml文本
 * @param idField id字段
 * @param parentField 父字段
 * @param textField 文本字段
 * @param rootElementName 根节点名称
 * @returns
 */
function getTreeNodesfromXml(tree, nodes, xmlstr, idField, parentField, textField, rootElementName){
	if(tree==undefined || tree==null || S(xmlstr).isEmpty() || S(idField).isEmpty() 
			|| S(parentField).isEmpty() || S(textField).isEmpty() || S(rootElementName).isEmpty()) return nodes;
	var rootnode ={};
	rootnode[idField] = '0';
	rootnode[parentField] = '-1';
	rootnode[textField] = rootElementName;
	rootnode.attributes = {attrval:'{}', name:rootElementName, path:'/'+rootElementName};
	nodes.push(rootnode);
	var xml = null;
	try{
		xmlstr = xmlstr.replace(new RegExp('<'+rootElementName+'.*?>'),'<'+rootElementName+'>').substr(xmlstr.indexOf('<'+rootElementName)).replace(/xlink:/g,'xlink_').replace(/rdf:/g,'rdf_').replace(/dc:/g,'dc_');
		xml=$($.parseXML(xmlstr));//只取根元素以后的(即不包括<?xml?>和<!DOCTYPE>)以及去掉根元素的各属性，否则IE下报错
	}catch(e){
		layer.msg('解析XML出现错误。');
		return;
	}
	loopnode(idField, parentField, textField, nodes, xml.find(rootElementName), '0', '/' + rootElementName);
	var lineno = 0, prevPath = rootElementName;
	$.each(nodes, function(i,m){
		if (lineno == 0) {
			lineno++;
			return true;
		}
		lineno++;
		var thisPath = m.attributes.path;
		var prevPathLength = prevPath.split("/").length;
		var thisPathLength = thisPath.split("/").length;
		if (thisPathLength < prevPathLength) {
			lineno += prevPathLength - thisPathLength;
		}
		m.attributes.lineno = lineno;
		prevPath = thisPath;
	});
	return nodes;
}
//递归xml节点形成树节点(包括id、pid、text、属性)	
function loopnode(idField, parentField, textField, nodes, parentElement, pid, path){
	$.each(parentElement[0].childNodes, function(i,m){
		if(m.nodeName=='#text') return true;
		var ifcomment = m.nodeName=='#comment';//如果是注释节点20190310
		var nulltagname = m.tagName == undefined;
		var node={};
		var thisid = guid();
		node[idField] = thisid;
		node[parentField] = pid;
		var ifchild = $(m).children().length>0;
		var text = "";
		if(ifcomment) text = "##comment##";
		else if(nulltagname) text = "##" + m.nodeName + "##";
		else text = m.tagName;
		var text_ = "<span style='color:#008080'>" + text + "</span>";
		node[textField] = !ifcomment && !nulltagname? text_ + (ifchild? "" : " " + $(m).text().trim().replace(/\n/g,'').substring(0,30)) : text_;
		attrval = {};
		if(!ifcomment && m.attributes!=undefined && m.attributes!=null)
		$.each(m.attributes,function(j,n){
			attrval[n.name] = n.value;
		});
		node.attributes = {name:text, path: path, attrval:JSON.stringify(attrval)};
		nodes.push(node);
		if(ifchild) loopnode(idField, parentField, textField, nodes, $(m), thisid, path + '/' + m.tagName);
	});
}
//根据英文树节点形成中文树节点
function getCnNodeList(nodeList, idField, parentField, textField){
	var cnNodeList=[];
	$.each(nodeList, function(i,m){
		var cnnode = {};
		cnnode[idField] = m[idField];
		cnnode[parentField] = m[parentField];
		cnnode.attributes = m.attributes;
		var nodeArr = m[textField].replace("<span style='color:#008080'>", "").replace("</span>", "").split(" ");
		var nodeName = nodeArr[0];
		var nodeText = "";
		if (nodeArr.length == 2) {
			nodeText = " " + nodeArr[1];
		}
		var cnName = en2cnElem[nodeName];
		if (S(cnName).isEmpty()) cnName = nodeName;
		cnnode[textField] = "<span style='color:#008080'>" + cnName + "</span>" + nodeText;
		cnNodeList.push(cnnode);
	});
	return cnNodeList;
}
