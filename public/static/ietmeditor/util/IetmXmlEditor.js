/*$.extend($.fn.validatebox.defaults.rules, {
	REGEX : {
		validator : function(value, param) {
			var regex = param[0];
			var re = new RegExp(regex);
			return re.test(value);
		},
		message : "验证规则为{0}, {1}"
	}
});*/
import S from './string'
import default_designer_sett from '../res/designer_sett'
import CodeMirror from '../codemirror'
var tree;
var url = 'platform/ietm/editor/ietmeditor/IetmEditorController/operation/';
var locale = 'en';
var enTreeNodes, cnTreeNodes;
var enXml;
var en2cnElem, en2cnAttr;
var cn2enElem, cn2enAttr;
var nodeList=[], cnNodeList=[];
var designsett;
var schema, cnSchema;
var xmltype_;
var linenoOffset = 3;// 行号偏移量
var editorcursorFlag = false;// 点击编辑器内文字的标志
var gutterName = 'xmlGutter';
$(function() {
	if(S(designsett).isEmpty()){
		$("<script>").attr({type: "text/javascript",src: 'avicit/ietm/editor/ietmeditor/res/designer_sett.js'}).appendTo("head");
		designsett = default_designer_sett;
	} else {
		designsett = JSON.parse(designsett);
	}
/*	$('body').layout('panel','west').panel({
		onExpand:function(){
			$('#treeBtn').attr({'title':'隐藏'+xmltype.toUpperCase()+'树'}).linkbutton({'iconCls':'fa-chevron-left'});
		},
		onCollapse:function(){
			$('#treeBtn').attr({'title':'显示'+xmltype.toUpperCase()+'树'}).linkbutton({'iconCls':'fa-chevron-right'});
		}
	});
	tree = $('#dmtree');
	xmltype_ = xmltype;
	selectTheme();
	$('#en_cn').combobox({
		onSelect : function(r) {
			xmltype_ = getLocaleName(xmltype);
			selectEnCn(r.value);
		}
	});*/

/*	editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
		mode : "xml",
		lineNumbers : true,
		showCursorWhenSelecting : true,
		lineWrapping : true,
		styleActiveLine : true,
		autoMatchParens : true,
		foldGutter: true,
		matchTags : {
			bothTags : true
		},
		extraKeys : {
			"Ctrl-J" : "toMatchingTag",
			"'/'" : completeIfAfterLt,
			"' '" : completeIfInTag,
			"'='" : completeIfInTag,
			"Ctrl-Z" : undo,
			"Ctrl-D" : doDelete,
			"Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); }
		},
		gutters : [ "CodeMirror-linenumbers","CodeMirror-foldgutter", gutterName]
	});*/
/*	editor.setSize('100%', '100%');
	editor.setSelection({
		line : 0,
		ch : 0
	});
	$.ajax({
		url : url + 'editor/' + xmltype + '/' + id,
		type : 'post',
		data: {data: JSON.stringify({dtd: xsdschema})},
		dataType : 'json',
		success : function(r) {
			if (r.flag != 'success'){
				if(!S(r.msg).isEmpty()) layer.alert(r.msg);
				return;
			}
			schema = r.schema;
			cnSchema = r.cnSchema;
			en2cnElem = r.en2cnElem;
			cn2enElem = r.cn2enElem;
			enXml = r.xml;

			getTreeNodesfromXml(tree, nodeList, r.xml,'id','_parentId','text',xmltype);
			tree.tree({parentField:'_parentId', textFiled:'text', idFiled:'id', data: nodeList});
			cnNodeList = getCnNodeList(nodeList, 'id','_parentId','text');

			editor.setOption("hintOptions", {
				schemaInfo : r.schema
			});
			editor.setValue(r.xml);
			formateDM();
			editor.focus();
			xmltype_ = getLocaleName(xmltype);
		}
	});*/
/*	tree.tree({
		onLoadSuccess:function(node,data){
			$(".tree-icon,.tree-file").removeClass("tree-icon tree-file");
			$(".tree-icon,.tree-folder").removeClass("tree-icon tree-folder tree-folder-open tree-folder-closed");
		},
		onDblClick : function(){
			editorcursorFlag = false;
		},
		onSelect : function(node) {
			if (node == null || node.target == null	|| tree.tree('getParent', node.target) == null)
				return;

			// editor定位
			if (!editorcursorFlag
					&& node.attributes.lineno != undefined) {
				var lineno = node.attributes.lineno + linenoOffset - 1;
				var begintagidx = editor.getLine(lineno).indexOf('<');
				editor.setCursor({
					line : lineno,
					ch : begintagidx + 2
				});
				editorcursorFlag = false;
			}
			previewOnSelectnode(node);
		}
	});*/
/*	editor.on("cursorActivity", function(cm) {
		// 找到dm元素为dmRef的，加链接，点击链接显示DM信息
		$.each($("span.cm-tag:contains(" + getLocaleName('dmRef') + ")"), function(i, m) {
			if ($(m).prev().text() == '<'
					&& $(m).next().text() == 'xlink:type') {
				// 该dmRef元素对应的行号
				var lineno = $(this).parent().parent().parent().find('.CodeMirror-linenumber').text();
				editor.setGutterMarker(lineno - 1, gutterName,	makeMarker("dmRef", lineno - 1));
			}
		});
		var lineno = editor.getCursor().line; // 光标所在行
		var currnode = getnodeBylineno(lineno);
		if (currnode != null) {
			editorcursorFlag = true;
			tree.tree('select', currnode.target);
			tree.tree('scrollTo', currnode.target);
			editorcursorFlag = false;
		}
		//设计视图图标
		var marker = document.createElement("div");
		marker.innerHTML = "<a title='PM设计视图' onclick=\"todesign()\" href=\"javascript:void(0);\"><span class='fa fa-pencil' /></a>";
		editor.setGutterMarker(findLineno(getLocaleName('content')), gutterName, marker);
	});
	editorKeyEvent();

	if(S(name).startsWith('PM')){
		$('a[iconCls=fa-external-link-square]').css('display','');
		$('a[iconCls=fa-desktop]').css('display','');
	}
	if(xmltype != 'dmodule') $('a[iconCls=fa-file-text-o]').css('display','none');//目前只dm有工作日志*/
});
function showhidewest(){
	var panel = $('body').layout('panel', 'west');
	if(panel.panel("options").width==0){
		panel.panel("resize",{width:300});
		$('#westBtn').attr({'title':'隐藏'+uppertype+'树'}).linkbutton({'iconCls':'fa-chevron-left'});
	} else {
		panel.panel("resize",{width:0});
		$('#westBtn').attr({'title':'显示'+uppertype+'树'}).linkbutton({'iconCls':'fa-chevron-right'});
	}
	$('body').layout();
}
function openattr(){
	var node = tree.tree('getSelected');
	if(node == null) return;
	if(toAttrTableHtml(node)){
		setTimeout(function(){
			$('#attrTable .easyui-combobox').combobox({width:$("#attrTable td").eq(1).width()});
		},100);
		$('#attrdlg').dialog('open');
	} else layer.msg('此元素无属性可设置。');
}
// 保存dm文件
function saveDmfile() {
	save('0');// 此时只保存dm文件不保存到数据库中
}
function refreshTree(){
	var nodeId = '0';
	if(tree.tree('getSelected') != null) nodeId = tree.tree('getSelected').id;
	var editorValue = editor.doc.getValue();
	nodeList = [];
	if(editorValue.indexOf('<'+xmltype+' ') > -1 || editorValue.indexOf('<'+xmltype+'>') > -1){ //此处判断中英文，未直接用locale因undo时locale可能不对
		locale = 'en';
		$('#en_cn').combobox('setValue','en');
	} else {
		editorValue = toEnXml(editorValue);
		locale= 'cn';
		$('#en_cn').combobox('setValue','cn');
	}
	getTreeNodesfromXml(tree, nodeList, editorValue,'id','_parentId','text',xmltype);
	cnNodeList = getCnNodeList(nodeList, 'id','_parentId','text');
	tree.tree({parentField:'_parentId', textFiled:'text', idFiled:'id', data: locale=='cn'?cnNodeList : nodeList});
	var node = tree.tree('find', nodeId);
	if(node != null){
		editorcursorFlag = true;
		tree.tree('select', node.target);
	}
}
// 保存:todb为1是真正保存到数据库中
function save(todb,onlytree){
	editor.save();
	var editorValue = editor.doc.getValue();
	if (locale == 'cn') editorValue = toEnXml(editorValue);
	var nodeId = '0';
	if(tree.tree('getSelected') != null) nodeId = tree.tree('getSelected').id;
	$.ajax({
		url : url + 'save/' + xmltype + '/' + id,
		data : {data : editorValue,	todb : todb},
		type : 'post',
		dataType : 'json',
		success : function(r) {
			if (r.flag != 'success') return;
			formateDM();
			refreshTree();
			if (todb == '1'){
				setSaveStyle(true)
				layer.msg('保存成功。');
			}
		}
	});
}
//签入
function checkin(){
	layer.confirm('确定该PM要签入？真的确定？',function(idx){
		layer.close(idx);
		savedFlag=false;
		save("1");
		//签入
		$.ajax({
 			url : 'platform/ietm/csdb/ietmpm/IetmPmController/operation/checkin/'+id,
 			type : 'post',
 			dataType : 'json',
 			success : function(r) {
 				window.open('avicit/ietm/editor/ietmeditor/IetmXmlViewer.jsp?type=pm&id='+id,'_self');
 				//将标签页的标题更改为浏览
 				var tabtitle = top.$('#tabs').find('.tabs-selected').find('.tabs-title');
 				tabtitle.html(tabtitle.html().replace('编辑','浏览'));
 				//让"出版物管理"执行此刷新同步签入签出状态
 				$.each(top.$('#tabs').tabs('tabs'), function(i,m){
 					var iframe = $(m).find('iframe')[0];
 					if(iframe.src.indexOf('IetmPmInfo') > 0){
 						iframe.contentWindow.reload();
 					}
 				});
 				//刷新首页待办
 				var objs = top.$('#tabs').tabs('getTab', 0).find('iframe').contents().find('iframe');
				objs.each(function() {
					if (this.src.indexOf("WfInstanceTodo.jsp") > 0) {
						this.src = this.src;
					}
				});
			}
		});
	});
}
function todesign(){
	$('#designdlg iframe').attr('src','avicit/ietm/editor/ietmeditor/_Designer/IetmEditorDesigner'+xmltype.toUpperCase()+'.jsp');
	$('#designdlg').dialog({width:1000, height:$(window).height()-50}).dialog('open');
}
function preview(){
	var data = pmtreeData();
	$('#pmtree1').tree({
		parentField:'_parentId',
		textFiled:'text',
		idFiled:'id',
		data:data.nodes,
		onSelect:function(node){
			var iframe = $("#previewDialog").find("iframe")[0];
			var ibody = $(iframe.contentWindow.document.body);
			ibody.empty();
			if(node == null || node.dm == undefined) return;
			var index = layer.load();
			$.ajax({
				url : 'platform/ietm/csdb/ietmdm/IetmDmController/operation/preview/null',
				type : 'post',
				data : {dmc : node.text.split('/')[0].trim()},
				dataType : 'json',
				success : function(r) {
					layer.close(index);
					if(r.flag != 'success') return;
					ibody.append(r.html.replace(/href="#/g,'href="avicit/ietp/previewDm.jsp#'));
				}
			});
			//$('#previewDialog').find('iframe')[0].src='avicit/ietm/csdb/ietmdm/preview/previewDm.jsp?dmc='+node.text;
		}
	});
	$('#previewDialog').dialog('open');
	return;

	$.messager.progress({title:"预览PM",msg:"正在处理……",text:""});
	$.ajax({
		url : 'platform/ietm/csdb/ietmpm/IetmPmController/operation/wordview/'+id,
		type : 'post',
		data : {data: editor.doc.getValue()},
		dataType : 'json',
		success : function(r) {
			$.messager.progress('close');
			if(r.flag=='null'){
				layer.msg('DM内容为空。');
				return;
			}
			var filename=(xmltype=='dmodule'?'avicit/ietm/csdb/ietmdm/DmFile/':'avicit/ietm/csdb/ietmpm/PmFile/') + id + ($.browser.msie?'.swf':'.pdf');
			$('#previewDialog').find('iframe')[0].src=filename;
			$('#previewDialog').dialog('open');
		}
	});
}
function downloadWord(){
	window.open('platform/ietm/utils/controller/IetmCommonController/download/avicit|ietm|csdb|ietmpm|PmFile/' + id + '/' + 'docx');
}
function topmtree(){//形成pm结构树
	var data = pmtreeData();
	//$('#pmtree').treegrid({data:data.nodes});
	$('#pmtree').treegrid({
		data: {"total":data.nodes.length + 1, "rows":data.nodes},
		onDblClickCell:function(field, row){
			if(field=='upnew') $('#pmtree').treegrid('update',{id:row.id, row:{upnew:row.upnew=='1'?'':'1'}});
		},
		onHeaderContextMenu:function(e,field){
			e.preventDefault();
			if(field=='upnew') $('#menu1').menu('show', {left:e.pageX, top:e.pageY});
		},
		onClickRow: function(row){
			edit();
		}
	});
	$('#pmstruc').val(data.struc);
	$('#treetb .easyui-linkbutton:eq(1)').linkbutton('disable');
	$('#treetb .easyui-linkbutton:eq(3)').linkbutton('disable');
	setTimeout(function(){$('#pmtreedlg .easyui-layout').layout('collapse','east')},500);
	$('#pmtreedlg').dialog({width:1000, height:$(window).height()-50}).dialog('open');
}
function pmtreeData(){//形成pm结构树
	var content_=getLocaleName('content');
	var line0=findLineno(content_,0),line1=findLineno('/'+content_,0);
	if(line0==-1 || line1==-1) return;
	var str=editor.getRange({line:line0,ch:0},{line:line1,ch:editor.getLine(line1).length});
	if(locale=='cn'){
		str=toEnXml(str);
	}
	var xml=$($.parseXML(str.replace(/:/g,'_')));
	var nodes=[];
	$.each(xml.find('pmEntry'),function(i,m){
		if($(m).parent()[0].tagName=='content') childrows(nodes,$(m),'-1');
	});
	var treestruc = $.format(str.replace(/\n/g,'').replace(/<dmRef(.*?)<\/dmRef>/g,'').replace('<content>','').replace('</content>',''), {step:2}).trim();
	return {nodes:nodes, struc:treestruc};
}
function childrows(nodes, pmentry, id){
	var title=pmentry.children('pmEntryTitle').text();
	if(S(title).isEmpty()) title="（默认标题）";
	var uid = guid();
	nodes.push({id:uid, _parentId:id, text:title});
	$.each(pmentry.children('dmRef'),function(i,m){
		var dmjson=getDmcByText($.browser.msie? $(m)[0].xml : $(m).html());
		nodes.push({id:guid(), _parentId:uid, text:dmjson.dmc + '/' + dmjson.dmtitle + '/' + dmjson.issuedate, dm:dmjson});
	});
	$.each(pmentry.children('pmEntry'),function(i,m){
		childrows(nodes,$(m), uid);
	});
}
function getnew_pub(n_p){//取得最新版/发布版
	var tgdata = $('#pmtree').treegrid('getData');
	if(tgdata.length == 0){
		layer.msg('还没有PM条目，无需保存。');
		return;
	}
	$.each(tgdata, function(i,m){
		var text=m.text;
		if(text.indexOf('DM')==0 && $('#pmtree').treegrid('getChildren',m.id).length==0){
			new_pub(n_p, m);
		}
		else {
			if(m.children != undefined && m.children.length > 0)
			$.each(m.children, function(j,n){
				new_pub(n_p, n);
			})
		}
	});
	$('#treetb .easyui-linkbutton:eq('+(n_p=='0'?1:3)+')').linkbutton('enable');
}
function new_pub(n_p, child){
	if(child.dm == undefined) return;
	$.ajax({
		url:'ietm/csdb/ietmdm/IetmDmController/operation/getIetmDmsByPage',
		type:'post',
		data:{param:'{"dmc":"'+child.dm.dmc.split('_')[0]+'","'+(n_p=='0'?'islatest':'islatestissue')+'":"1"}'},
		dataType:'json',
		success:function(r){
			if(r.rows.length ==0) return;
			var newver = r.rows[0].issueno+'-'+r.rows[0].inwork + '/' + formateDate(r.rows[0].issuedate);
			var issue = child.dm.issue;
			var issuedate = child.dm.issuedate;
			//无版本号和版本日期的不显示最新版 版本号或版本日期与最新版不一致的才显示
			if((!S(issue).isEmpty() || !S(child.dm.issuedate).isEmpty()) && child.dm.issuedate != formateDate(r.rows[0].issuedate)
					&& (issue.split('-')[0] != r.rows[0].issueno || issue.split('-')[1] != r.rows[0].inwork)){//版本号不一致的才显示
				if(n_p == '0')$('#pmtree').treegrid('update',{id:child.id, row:{newest:newver, upnew:'1'}});
				else if(n_p=='1'){
					var pubs = [{value:'',text:'-请选择-'}], pubver = '';
					$.each(r.rows,function(i,m){
						var issue = m.issueno + '-' + m.inwork;
						pubver += ',' + issue;
						pubs.push({value:issue, text:issue});
					});
					if(pubver != '') pubver = pubver.substr(1);
					$('#pmtree').treegrid('update',{id:child.id, row:{pubver:pubver, pubs:pubs}});
				}
			}
		}
	});
}
function formatupnew(value,row,idx){
	if(!S(row.newest).isEmpty()) return value=='1'?'<span style="color:red;font-size:16px;font-weight:bold">是</span>':'否';
	return '';
}
function setall(val){
	$.each($('#pmtree').treegrid('getData'),function(i,m){
		setone(m, val);
	});
}
function setone(row, val){
	if(!S(row.newest).isEmpty()) $('#pmtree').treegrid('update',{id:row.id, row:{upnew: val}});
	if(row.children != undefined && row.children.length > 0)
	$.each(row.children, function(i,m){
		setone(m, val);
	});
}
var idEditing = '', isEndEdit = true;
function edit(){
	endEdit();
	var row =  $('#pmtree').treegrid('getSelected');
	if(row.pubs != undefined && row.pubs != null){
		var idEditing = row.id;
		$('#pmtree').treegrid('beginEdit',idEditing);
		var ed = $('#pmtree').treegrid('getEditor', {id:idEditing, field:'pubver'});
		$(ed.target).combobox({data: row.pubs});
	}
}
function endEdit() {
	if (idEditing == '') return true;
	if($('#pmtree').treegrid('getData').length==0) return true;
	$('#pmtree').treegrid('endEdit', idEditing).treegrid('unselect',idEditing);
	idEditing = '';
    return true;
}
var saveStr = '';
function up2new_pub(n_p){//更新到最新版(只有已经指定了版本并且有升级的最新版才执行)
	$.messager.confirm('确认','确定要更新到'+(n_p=='0'?'最新版':'指定发布版')+'么？',function(r){
		if(!r) return;
		var tgdata = $('#pmtree').treegrid('getData');
		if(tgdata.length == 0){
			layer.msg('还没有PM条目，无需保存。');
			return;
		}
		saveStr='';
		$.each(tgdata,function(i,m){
			loopup(n_p, m);
		})
		var content_=getLocaleName('content'), fromline=findLineno(content_,0), toline=findLineno('/'+content_,0);
		editor.replaceRange(saveStr,{line:fromline-0+1,ch:0},{line:toline,ch:0});
		saveDmfile();
		layer.msg('更新到'+(n_p=='0'?'最新版':'指定发布版')+'成功。');
	});
}
function loopup(n_p, row){
	if(row.dm == undefined){
		saveStr += '<pmEntry>';
		if(!S(row.text).isEmpty()) saveStr += '<pmEntryTitle>'+row.text+'</pmEntryTitle>';
		if(row.children != undefined && row.children.length>0)
		$.each(row.children, function(i,m){
			loopup(n_p, m);
		});
		saveStr += '</pmEntry>';
	} else if(row.dm != undefined && row.dm != null){
		var dmjson = row.dm;
		if(n_p == '0'){
			var newest = row.newest;
			if(!S(newest).isEmpty()){
				if(!S(dmjson.issue).isEmpty()) dmjson.dmc = dmjson.dmc.replace('_'+dmjson.issue, '_'+newest.split('/')[0]);
				dmjson.issuedate = !S(dmjson.issuedate).isEmpty()? newest.split('/')[1] : '';
			}
		} else if(n_p == '1'){
			endEdit();
			var pubver = row.pubver;
			if(!S(pubver).isEmpty()){
				if(!S(dmjson.issue).isEmpty()) dmjson.dmc = dmjson.dmc.replace('_'+dmjson.issue, '_'+pubver);
				dmjson.issuedate = !S(dmjson.issuedate).isEmpty()? pubver : '';
			}
		}
		if(dmjson.dmtitle != undefined){
			var title = dmjson.dmtitle.split(' ');
			dmjson.techname = title[0];
			dmjson.infoname = title[1];
		}
		saveStr += getDmrefByDmc(row.dm.dmc, dmjson);
	}
}
function guid(){
	function S4() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}