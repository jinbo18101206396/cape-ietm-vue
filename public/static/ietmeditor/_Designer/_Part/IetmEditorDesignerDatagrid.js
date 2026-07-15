/**
 * 编辑器中用到的datagrid的增、删、改、上移、下移
 */
var indexEditing = -1, dgEditing = null, notSavedStr = '<span style="color:red" title="未保存">*</span>';;
function adddg(dg, initval, parentDatagridId, parentSavebuttonId){
	if(!S(parentDatagridId).isEmpty() && $('#'+parentDatagridId).datagrid('getSelected') == null){
		var cname = $('#'+parentDatagridId).datagrid('getColumnOption',$('#'+parentDatagridId).datagrid('getColumnFields')[0]).title;
		layer.msg('请选择一条【'+cname+'】数据。');
		return;
	}
	endEdit(dgEditing);
	var idx = dg.datagrid('getRows').length;
	var appendval ={};
	if(!S(initval).isEmpty() && initval!={}) appendval = initval;
	if(dg.datagrid('getColumnOption','saveflag')!=undefined) appendval.saveflag = notSavedStr;
	dg.datagrid('appendRow',appendval);
	dg.datagrid('selectRow', idx).datagrid('beginEdit', idx);
	indexEditing = idx;
	dgEditing = dg;
	dg.datagrid('beginEdit',dg.datagrid('getRows').length-1);
	setButtonSaveStyle(dg[0].id, false, parentSavebuttonId);//让datagrid对应的工具栏保存按钮提示为：未保存
	if(!S(parentDatagridId).isEmpty())setButtonSaveStyle(parentDatagridId, false, parentSavebuttonId);//将关联的datagrid的保存按钮置为未保存
}
function editdg(dg, parentDatagridId, parentSavebuttonId){
	endEdit();
	var row = dg.datagrid('getSelected');
	var idx = dg.datagrid('getRowIndex',row);
	dg.datagrid('beginEdit',idx);
	indexEditing = idx;
	dgEditing = dg;
	if(dg.datagrid('getColumnOption','saveflag')!=undefined)
	$.each(dg.datagrid('getColumnFields'),function(i,m){
		if(m=='saveflag') return true;
		var ed=dg.datagrid('getEditor',{index:idx, field:m});
		if(ed==null) return true;
		$(ed.target).change(function(){//编辑时如果数据有变化置该行为未保存
			if($(this).val()!=row[m]){
				row.saveflag = notSavedStr;
				setButtonSaveStyle(dg[0].id, false, parentSavebuttonId);
				if(!S(parentDatagridId).isEmpty())setButtonSaveStyle(parentDatagridId, false, parentSavebuttonId);//将关联的datagrid的保存按钮置为未保存
			}
		});
	});
}
function endEdit() {
	if (indexEditing == -1 || dgEditing == null) return true;
	if(dgEditing.datagrid('getRows').length==0) return true;
	dgEditing.datagrid('endEdit', indexEditing);
	dgEditing.datagrid('acceptChanges');
	indexEditing = -1;
    return true;
}
function deldg(dg, setSavedDatagridId, parentSavebuttonId, afterfunction){
	var row=dg.datagrid('getSelected');
	if(row==null) return;
	$.messager.confirm('确认','确定要删除该行数据么？',function(r){
		if(!r) return;
		dg.datagrid('deleteRow',dg.datagrid('getRowIndex',row));
		checkIfAllSaved(dg, setSavedDatagridId, parentSavebuttonId);
		if(typeof afterfunction=='function') afterfunction();
	});
}
function uprec(dg){ //上移
	var selectrow=dg.datagrid('getSelected');  
	var rowIndex=dg.datagrid('getRowIndex', selectrow);  
	if(rowIndex==0){  
        layer.msg('顶行无法上移!');  
    } else {  
    	dg.datagrid('deleteRow', rowIndex);//删除一行  
        rowIndex--;  
       dg.datagrid('insertRow', {  
            index:rowIndex,  
            row:selectrow  
        });  
      dg.datagrid('selectRow', rowIndex);  
    }  
}
function downrec(dg){ // 下移
	var selectrow=dg.datagrid('getSelected');  
	var rowIndex=dg.datagrid('getRowIndex', selectrow);  
	if(rowIndex==dg.datagrid('getRows').length-1){  
        layer.msg('底行无法下移!');  
    } else {  
    	dg.datagrid('deleteRow', rowIndex);//删除一行  
        rowIndex++;  
       dg.datagrid('insertRow', {  
            index:rowIndex,  
            row:selectrow  
       });  
      dg.datagrid('selectRow', rowIndex);  
    }  
}
function setButtonSaveStyle(datagridId, ifsaved, parentSavebuttonId){
	if(S(datagridId).isEmpty()) return;
	if($('#'+datagridId).datagrid('getColumnOption','saveflag')!=undefined && ifsaved)
	$.each($('#'+datagridId).datagrid('getRows'),function(i,m){
		$('#'+datagridId).datagrid('updateRow',{index:i, row:{saveflag:''}});
	});
	var savebtn=$('#' + datagridId).parent().siblings('.datagrid-toolbar').find('.icon-save');
	if(savebtn!=undefined){
		if(ifsaved) savebtn.attr({'title':''}).css('backgroundColor','');
		else savebtn.attr({'title':'未保存'}).css('backgroundColor','red');//savebtn.siblings('.l-btn-text').html('<span style="color:red">**</span>');
		if(!S(parentSavebuttonId).isEmpty()){
			if(ifsaved) $('#'+parentSavebuttonId).attr({'title':''}).css('backgroundColor','');
			else $('#'+parentSavebuttonId).attr({'title':'未保存'}).css('backgroundColor','red');
		}
	}
}
function getSaveStyle(datagridId){
	if(datagridId==undefined){//此时为全部的保存按钮
		var ifpass = true;
		$.each($('.datagrid-toolbar'),function(i,m){
			var savebtn = $(m).find('.icon-save');
			if(savebtn == undefined) return true;
			if(savebtn.css('backgroundColor')=='red' || savebtn.css('backgroundColor')=="rgb(255, 0, 0)"){
				ifpass = false;
				var dgid = $(m).siblings().children('table').attr('id');
				var cname = $('#'+dgid).datagrid('getColumnOption',$('#'+dgid).datagrid('getColumnFields')[0]).title;
				layer.msg('还有列为【'+cname+'】的数据未保存。');
				return false;
			}
		});
		return ifpass;
	} else {
		var savebtn=$('#' + datagridId).parent().siblings('.datagrid-toolbar').find('.icon-save');
		if(savebtn!=undefined)	return savebtn.css('backgroundColor')=='' || savebtn.css('backgroundColor')=='rgba(0, 0, 0, 0)';
		return true;
	}
}
function checkIfAllSaved(dg, setSavedDatagridId, parentSavebuttonId){//
	if(dg==undefined){//检查所有的保存按钮状态
		var ifpass = true;
		$.each($('.icon-save'),function(i,m){
			if($(m).css('backgroundColor')=='red' || $(m).css('backgroundColor')=="rgb(255, 0, 0)"){
				ifpass = false;
				layer.msg('还有数据未保存。');
				return false;
			}
		});
		return ifpass;
	} else if(dg.datagrid('getColumnOption','saveflag')!=undefined){
		var ifallsaved = true; 
		$.each(dg.datagrid('getRows'),function(i,m){
			if(m.saveflag==notSavedStr){
				ifallsaved = false;
				return false;
			}
		});
		if(ifallsaved) setButtonSaveStyle(dg[0].id, true);//如果所有记录均为已保存则置对应的保存按钮为已保存
		if(!S(setSavedDatagridId).isEmpty() && ifallsaved) setButtonSaveStyle(setSavedDatagridId, true);//也可置别的datagrid的保存按钮为已保存
		if(!S(parentSavebuttonId).isEmpty() && ifallsaved) $('#'+parentSavebuttonId).attr({'title':''}).css('backgroundColor','');
	}
}