function para2html(parent_, paraxml){
	if(S(paraxml).isEmpty()) return '';
	if(parent_.locale=='cn') paraxml = parent_.toEnXml(paraxml);
	var html=paraxml.trim().replace(/\n/g,'').replace(/>(\s*)</g,'><');
	var deflists = html.match(/<definitionList.*?<\/definitionList>/g);//para中有定义列表
	if(deflists != null)
		$.each(deflists, function(i,m){
			var html__ = m.replace(/<definitionList>/g,'<table deflist="1">').replace('</definitionList>','</table>')
			.replace(/<definitionListItem>/g,'<tr>').replace(/<\/definitionListItem>/g,'</tr>')
			.replace(/<listItemTerm\/>/g,'<th></th>').replace(/<listItemTerm>/g,'<th>').replace(/<\/listItemTerm>/g,'</th>')
			.replace(/<listItemDefinition\/>/g,'<td></td>').replace(/<listItemDefinition>/g,'<td>').replace(/<\/listItemDefinition>/g,'</td>')
			html = html.replace(m, html__);
		});
	var captions = html.match(/<captionGroup.*?<\/captionGroup>/g);//para中有面板组
	if(captions != null)
		$.each(captions,function(i,m){
			var xmlstr = $($.parseXML(m));
			var colstyles=[], colnames=[];//每列的样式、名称
			$.each(xmlstr.find('colspec'),function(i,m){
				colnames.push($(m).attr('colname'));
				var style='';
				var align = $(m).attr('align');
				if(!S(align).isEmpty()) style += 'text-align:' + align + ';';
				var width=$(m).attr('colwidth');
				if(!S(width).isEmpty() && width.trim()!='*') style += 'width:' + width + ';';
				colstyles.push(style);
			});
			var tbodystr = '';
			$.each(xmlstr.find('captionRow'),function(i,m){//表体
				tbodystr += '<tr>' + getCaptionRow(m, colstyles, colnames) + '</tr>';
			})
			html = html.replace(m, '<table caption="1">' + tbodystr + '</table>');
		});
	html = html.replace(/<para/g,'<p').replace(/<\/para>/g,'</p>')
		.replace(/<superScript>/g,'<sup>').replace(/<\/superScript>/g,'</sup>')
		.replace(/<subScript>/g,'<sub>').replace(/<\/subScript>/g,'</sub>')
		.replace(/<randomList/g,'<ul').replace(/<\/randomList>/g,'</ul>')
		.replace(/<sequentialList/g,'<ol').replace(/<\/sequentialList>/g,'</ol>')
		.replace(/<listItem/g,'<li').replace(/<\/listItem>/g,'</li>')
		.replace(/<warningAndCautionPara>/g,'<p>').replace(/<\/warningAndCautionPara>/g,'</p>')
		.replace(/<notePara>/g,'<p>').replace(/<\/notePara>/g,'</p>')
		.replace(/<emphasis>/g,'<strong>').replace(/<\/emphasis>/g,'</strong>');
	//内部引用
	var refs=[];
	str2jsons(refs,html,'internalRef','internalRefId,internalRefTargetType');
	var internalRefs = html.match(/<internalRef.*?>(.*?)<\/internalRef>/g);
	if (internalRefs != null){
		$.each(internalRefs,function(i,m){
			var ref=refs[i];
			html=html.replace(m,"<a href=\"javascript:void(0);\" xml=\""+ref.xml+"\">【"+(S(ref.internalRefTargetType).isEmpty()?"":ref.internalRefTargetType)+"("+ref.internalRefId+")】</a>");
		});
	} else {
		internalRefs = html.match(/<internalRef.*?\/>/g);
		if (internalRefs != null){
			$.each(internalRefs,function(i,m){
				var ref=refs[i];
				html=html.replace(m,"<a href=\"javascript:void(0);\" xml=\""+ref.xml+"\">【"+(S(ref.internalRefTargetType).isEmpty()?"":ref.internalRefTargetType)+"("+ref.internalRefId+")】</a>");
			});
		}
	}
	//dm引用
	html=getDmrefHtml(parent_, html);
	//图符<symbol>
	var symbols = html.match(/<symbol.*?>(.*?)<\/symbol>/g);
	if(symbols != null) html = tosymbol(symbols, html);
	else {
		symbols = html.match(/<symbol.*?\/>/g);
		if(symbols != null) html = tosymbol(symbols, html);
	}	
	return html;
}
function getCaptionRow(row, colstyles, colnames){
	var rowstr = '';
	$.each($(row).find('captionEntry'), function(j, n) {
		var entrystr = $.browser.msie? n.xml.trim() : $(n).html().trim();
		var text = '';
		$.each($($.parseXML(entrystr)).find('captionLine'),function(i,m){
			text += '\r\n' + $(m).text();
		});
		if(text != '') text = text.substr(2);
		text += para2html(null, $($.parseXML(entrystr)).find('captionText').text());
		var namest = $(n).attr('namest');
		var nameend = $(n).attr('nameend');
		var colspan = 1, colspanstr = '';
		if (!S(namest).isEmpty() && !S(nameend).isEmpty() && namest != nameend) colspan = $.inArray(nameend, colnames) - $.inArray(namest, colnames) + 1;
		if(colspan >1) colspanstr = " colspan=" + colspan;
		var morerows = $(n).attr('morerows'), rowspan = 1, rowspanstr = '';
		if(!S(morerows).isEmpty() && morerows != '0') rowspan = morerows - 0 + 1;
		if(rowspan >1) rowspanstr = " rowspan=" + rowspan;
		var style=colstyles[j];
		if(S(style).isEmpty())	style = '';
		else style = ' style="' + style + '"';
		rowstr += "<td" + colspanstr + rowspanstr + style + ">" + text	+ "</td>";
	});
	return rowstr;
}
function tosymbol(symbols, html){
	$.each(symbols, function(i,m){
		$.ajax({
			async:false,
			url:'platform/ietm/csdb/ietmicn/IetmIcnController/operation/getIcnContent',
			type:'post',
			data:{icn: $($.parseXML(m)).find('symbol').attr('infoEntityIdent')},
			dataType:'json',
			success:function(r){
				if(r==null)return;
				if(r.formula!=undefined && r.formula!=null) html = html.replace(m, r.formula.replace('class="kfformula"', 
						'class="kfformula" xml="' + m.replace(/"/g,"`").replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&/g,'&amp;') + '"'));//公式图符已在数据库中就不能再生成icn了
				else{
					html = html.replace(m, '<img src="avicit/ietm/csdb/ietmicn/tmpICN/' 
							+ r.dto.id + r.dto.filename.substr(r.dto.filename.lastIndexOf('.')).toLowerCase() 
							+ '" xml="' + m.replace(/"/g,"`").replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&/g,'&amp;') + '"></img>');
				}
			}
		});
	});
	return html;
}
//解析字符串，根据标签tag得到其多个属性值的json数组
function str2jsons(jsonArr,str,tag,attrs){
	if(S(str).isEmpty()) return '';
	if(!(jsonArr instanceof Array)) return;
	var startidx=str.indexOf('<'+tag),endidx=str.indexOf('</'+tag);
	if(startidx>-1){
		if(endidx == -1) endidx = str.indexOf('/>')+2;
		else endidx = endidx+tag.length+3;
		var str1=str.substring(startidx,endidx);
		var json={xml: str1.replace(/"/g,"`").replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&/g,'&amp;')};//转义特殊字符
		$.each(attrs.split(','),function(i,m){
			var attrval=$(str1).attr(m);
			if(attrval!=undefined && attrval!=null){
				json[m]=attrval;
			}
		});
		jsonArr.push(json);
		str1=str.substr(endidx);//得到余下的字符串再取属性值
		if(str1.length>0){//递归得到下一个json
			str2jsons(jsonArr,str1,tag,attrs);
		}
	}
}
//解析dm引用
function getDmrefHtml(parent_, html){
	var refs = html.match(/<dmRef.*?>(.*?)<\/dmRef>/g);
	if(refs != null)
	$.each(refs,function(i,m){
		var dmjson=parent_.getDmcByText(m);//传入字符串得到dmc
		if(!S(dmjson).isEmpty()) html=html.replace(m,'<a href="javascript:void(0);" xml="'+dmjson.xml.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&/g,'&amp;')+'">【引用'+dmjson.dmc+'】</a>');
	});
	return html;
}
function getDmrefText(parent_, html){
	var refs = html.match(/<dmRef.*?>(.*?)<\/dmRef>/g);
	if(refs != null)
	$.each(refs,function(i,m){
		var dmjson=parent_.getDmcByText(m);//传入字符串得到dmc
		if(!S(dmjson).isEmpty()) html=html.replace(m,'【引用'+dmjson.dmc+'】');
	});
	return html;
}
//小写转驼峰(xml字符串转为XML，再取节点的html()则全变为小写，需要转回来)--用$.parseXML()解析XML就没有这个问题，所有现在不用此function了
function lower2camel(parent_, str){
	if(S(str).isEmpty()) return '';
	var map = parent_.lowercamelMap;
	var matchs = str.match(/<\/(.*?)>/g);
	if(matchs != null)
	$.each($.unique(matchs), function(i, m) {
		var tag = m.replace('</', '').replace('>', '');
		var cameltag = map[tag];
		if(cameltag!= undefined && map!=cameltag) str = str.replace(new RegExp('<' + tag + '>', 'g'), '<' + cameltag + '>')
			.replace(new RegExp('<' + tag + ' ', 'g'), '<' + cameltag + ' ')
			.replace(new RegExp('</' + tag + '>', 'g'),	'</' + cameltag + '>');
	});
	matchs = str.match(/(\S*)=/g);
	if(matchs != null)
	$.each($.unique(matchs), function(i, m) {
		var tag = m.replace('=', '');
		var cameltag = map[tag];
		if(map[tag]!= undefined && map!=cameltag) str = str.replace(new RegExp(' ' + tag + '=', 'g'), ' ' + cameltag	+ '=');
	});
	return str;
}
function html2para(parent_, html, paraName){
	if(S(html).isEmpty()) return '';
	var para=html.trim().replace(/&nbsp;/g,'').replace(/<br>/g,'').replace(/<\/br>/g,'').replace(/<br\/>/g,'').replace(/\n/g,'').replace(/<p><\/p>/g,'')
	.replace(/<a name=.*?><\/a>/g,'')	//<a name=.*?><\/a>是由word中的标题拷贝来的
	.replace(/<h\d.*?>/g,'<p>').replace(/<\/h\d>/g,'</p>').replace(/<h.*?\/>/g,'').replace(/<\/p><symbol/g,'<symbol');//去掉空格回车空行图片表格
	para=para.replace(/<ul.*?>/g,'<ul>').replace(/<ol.*?>/g,'<ol>').replace(/<li.*?>/g,'<li>').replace(/<span.*?>/g,'').replace(/<\/span>/g,'')
		.replace(/<p.*?>/g,'<p>').replace(/<\/p><ul/g,'<ul').replace(/<\/p><ol/g,'<ol');//去掉有序列表无序列表的格式、span的样式
	//替换上标sup-->superScript,下标sub-->subScript,无序列表ul-->randomList,有序列表ol-->sequentialList,列表项li-->listItem,强调strong-->emphasis
	para=para.replace(/<sup/g,'<superScript').replace(/<\/sup>/g,'</superScript>')
		.replace(/<sub/g,'<subScript').replace(/<\/sub>/g,'</subScript>')
		.replace(/<\/p><ul>/g,'<ul>').replace(/<\/p><ol>/g,'<ol>')
		.replace(/<\/ul><\/p>/g,'</ul>').replace(/<\/ol><\/p>/g,'</ol>')
		.replace(/<\/ul><p>/g,'</ul>').replace(/<\/ol><p>/g,'</ol>')
		.replace(/<li><p>/g,'<li>').replace(/<\/p><\/li>/g,'</li>')
		.replace(/<ul>/g,'<randomList>').replace(/<\/ul>/g,'</randomList>')
		.replace(/<ol>/g,'<sequentialList>').replace(/<\/ol>/g,'</sequentialList>')
		.replace(/<li>/g,'<listItem><para>').replace(/<\/li>/g,'</para></listItem>')
		.replace(/<\/table><p>/g,'</table>').replace(/<\/p><p><table>/g,'<table>').replace(/<\/p><table/g,'<table').replace(/<\/table><\/p>/g,'</table>')
		.replace(/<p>/g,'<para>').replace(/<\/p>/g,'</para>')
		.replace(/<strong>/g,'<emphasis>').replace(/<\/strong>/g,'</emphasis>');
	var deflists = para.match(/<table deflist="1">.*?<\/table>/g);
	if(deflists != null)
		$.each(deflists, function(i,m){
			var table__ = m.replace(/<table deflist="1">/g,'<definitionList>')
			.replace(/<\/table>/g,'</definitionList>').replace(/<tbody>/g,'').replace(/<\/tbody>/g,'')
			.replace(/<tr.*?>/g,'<definitionListItem>').replace(/<\/tr>/g,'</definitionListItem>')
			.replace(/<th.*?>/g,'<listItemTerm>').replace(/<\/th>/g,'</listItemTerm>')
			.replace(/<\/para><\/td>/g,'<\/td>').replace(/<td.*?>/g,'<listItemDefinition><para>').replace(/<\/td>/g,'</para></listItemDefinition>');
			para = para.replace(m,table__);
		});
	var captions = para.match(/<table caption="1">.*?<\/table>/g);//处理面板组
	if(captions != null)
	$.each(captions, function(i,m){
		m = m.replace(/<\/para><\/td>/g,'<\/td>');
		var cols=[];
		$.each($($.parseXML(m)).find('tr'),function(i,m){
			var tds = $(m).find('td');
			if(tds.length > cols.length) cols = tds;
		});
		var table__ ="<captionGroup cols=\"###◀colcnt▶###\">";
		var colcnt=0;
		$.each(cols,function(i,m){
			colcnt++;
			table__+="<colspec colname=\"col"+(i+1)+"\"></colspec>";
		});
		var tbody = '';
		$.each($($.parseXML(m)).find('tr'),function(i,m){
			tbody += '<captionRow>';
			$.each($(m).find('td'),function(j,n){
				tbody += getCaptionEntry(j,n);
			});    			
			tbody += '</captionRow>';
		});
		table__ += '<captionBody>' + tbody + '</captionBody></captionGroup>';
		table__=table__.replace('###◀colcnt▶###',colcnt).replace(/<thead><\/thead>/g,'').replace(/<tfoot><\/tfoot>/g,'').replace(/<row><\/row>/g,'');
		para = para.replace(m, table__);
	});
	para = para.replace(/<table.*?<\/table>/g,'').replace(/<table.*?\/>/g,'');
	//处理公式(用symbol元素)
	var formula = para.match(/<img class="kfformula".*?\/>/g);
	if(formula != null){
		para = para.replace(/<\/p><p><img class="kfformula">/g,'<img class="kfformula">');
		var newformulaCnt = 0;
		$.each(formula,function(i,m){
			if(m.indexOf(' xml="') >0){//数据库中已经存在的图符公式
				var formulaxml = $($.parseXML(m)).find('img').attr('xml');
				if(formulaxml != undefined && formulaxml != null)
					para = para.replace(m, formulaxml.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/`/g,'"'));
			} else{
				var json={variantcode:'A', securityclassification:'02', issueno:'001', secretLevel:'1', cmnodeid:parent_.cmnodeid};
				var projparam = JSON.parse(parent_.projectParameters);
				var ori=projparam.originator;
				if(ori.length>0) json.originator = ori[0].code;
				var rpc=projparam.rpc;
				if(rpc.length>0) json.rpc = rpc[0].code1;
				var nameArr=parent_.name.split('-');
				json.sns=nameArr[1]+'-'+nameArr[2]+'-'+nameArr[3]+nameArr[4]+nameArr[5];
				json.filecontent = m;
				var uniqueid_ = S(parent_.uniqueid - 0 + newformulaCnt + '').padLeft(5, '0').s;;
				json.uniqueid = uniqueid_;
				json.filename = '公式' + uniqueid_+'.png';
				var icn = 'ICN-'+json.sns+'-'+json.rpc+'-'+json.originator+'-'+uniqueid_+'-A-001-01';
				json.icn = icn;
				var img = new Image();
				img.src = m.substring(m.indexOf('src=')+5,m.indexOf("\" data-latex"));
				para=para.replace(m,'<symbol infoEntityIdent="'+icn+'" reproductionWidth="'+img.width+'" reproductionHeight="'+img.height+'" reproductionScale="100"></symbol>');
				newformulaCnt++;
				$.ajax({//保存为icn
					url: 'platform/ietm/csdb/ietmicn/IetmIcnController/operation/save/null',
					type: 'post',
					data: {data: JSON.stringify(json)},
					dataType: 'json',
					success: function(r){
					}
				});
			}
		});
		parent_.uniqueid = parent_.uniqueid -0 + newformulaCnt;
	}
	//处理图符(img-->symbol)
	var imgs = para.match(/<img.*?<\/img>/g);
	if(imgs != null){
		imgs = para.match(/<img.*?\/>/g);
		if(imgs != null){
			$.each(imgs, function(i,m){
				var imgxml = $($.parseXML(m)).find('img').attr('xml');
				if(imgxml != undefined && imgxml != null)
					para = para.replace(m, imgxml.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/`/g,'"'));
			});
		}
	}
	para = para.replace(/<img.*?<\/img>/g,'').replace(/<img.*?\/>/g,'');
	paraElem = '<para>', endparaElem = '</para>';
	if(!S(paraName).isEmpty()){
		paraElem = '<' + paraName + '>';
		endparaElem = '</' + paraName + '>';
	}
	var matchs=para.match(/<a.*?>(.*?)<\/a>/g);
	if(matchs!=null)
	$.each(matchs,function(i,m){
		//将a标签整个替换为其xml属性值(以及把转义字符再转回来)
		var xml__ = $($.parseXML(m)).find('a').attr('xml');
		if(xml__!=undefined && xml__ != null)para=para.replace(m,xml__.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/`/g,'"').replace(/xlink_/g,'xlink:'));
	});
	para = para.replace(/<para><\/para>/g,'').replace(/<para><para>/g,'<para>').replace(/<\/para><\/para>/g,'</para>').replace(/<a.*?>(.*?)<\/a>/g,'').replace(/<table.*?<\/table>/g,'').replace(/<table.*?\/>/g,'');//最后处理下
	if(!S(para).startsWith(paraElem)) para = paraElem + para;//如果不是<para>开始的就加上
	if(!S(para).endsWith(endparaElem)) para += endparaElem;//如果不是</para>结尾的就加上
	//if(parent_.locale=='cn') para = parent_.toCnXml(para);//不在此转换英文，统一由调用者转换
	return para;
}
function getCaptionEntry(j,n){
	var entrystr = '';
	if($(n).css('display')=='none') return '';
	var colspan=$(n).attr('colspan');
	var rowspan=$(n).attr('rowspan');
	var colidx=j-0+1;
	var text=html2para(parent, $.browser.msie?n.xml:$(n).html()).replace(/<para>/g,'<captionLine>').replace(/<\/para>/g,'</captionLine>');
	if(text==undefined)text=n.textContent.trim();
	if((S(colspan).isEmpty() || colspan=='1') && (S(rowspan).isEmpty() || rowspan=='1')){
		entrystr+="<captionEntry colname=\"col"+colidx+"\"><caption>"+text+"</caption></captionEntry>";
	} else {//有跨行跨列
		entrystr+="<entry colname=\"col"+colidx+"\"";
		if(!S(colspan).isEmpty() && colspan!='1'){
			entrystr+=" namest=\"col"+colidx+"\" nameend=\"col"+(colspan-0+j)+"\"";
		}
		if (!S(rowspan).isEmpty() && rowspan!='1'){
			entrystr+=" morerows=\""+rowspan+"\"";
		}
		entrystr+="><caption>"+text+"</caption></captionEntry>";
	}
	return entrystr;
}