var default_designer_sett = {
    "common": {
        "autosavetime": "10",
        "validdmBeforesave": "false",
        "toRefsAndDoctypeBeforesave" : "false",
        "popupPreview": "false"
    },
    "tocodes": [{
        "ele1": "",
        "ele2": "para,,,",
        "name": "段落",
        "valid": "1"
    }, {
        "ele1": "definitionListItem,",
        "ele2": "listItemTerm,,,;listItemDefinition,,para,",
        "name": "图例",
        "valid": "1"
    }],
    "proced":{
    	"natoStockNumber_title": "北约码",
    	"natoStockNumber_checked": "false",
    	"manufacturerCode_title": "厂商码",
    	"manufacturerCode_checked": "true",
    	"partNumber_title": "部件码",
    	"partNumber_checked": "true",
    	"serialNumber_title": "序列码",
    	"serialNumber_checked": "false"
    },
    "ipc40": {
        "rows": [{
            "name": "目录号",
            "elem": "catalogSeqNumber",
            "attr": "catalogItemNumber",
            "width": "10"
        }, {
            "name": "条目顺序码",
            "elem": "catalogSeqNumber/itemSequenceNumber",
            "attr": "itemSeqNumberValue",
            "width": "10"
        }, {
            "name": "数量",
            "elem": "catalogSeqNumber/itemSequenceNumber/quantityPerNextHigherAssy",
            "attr": "",
            "width": "5"
        }, {
            "name": "厂商码",
            "elem": "catalogSeqNumber/itemSequenceNumber/manufacturerCode",
            "attr": "",
            "width": "20"
        }, {
            "name": "部件码",
            "elem": "catalogSeqNumber/itemSequenceNumber/partNumber",
            "attr": "",
            "width": "15"
        }, {
            "name": "层级",
            "elem": "catalogSeqNumber",
            "attr": "indenture",
            "width": "5"
        }, {
            "name": "名称",
            "elem": "catalogSeqNumber/itemSequenceNumber/partIdentSegment/descrForPart",
            "attr": "",
            "width": "30"
        }, {
            "name": "单位",
            "elem": "catalogSeqNumber/itemSequenceNumber/partIdentSegment/unitOfIssue",
            "attr": "",
            "width": "5"
        }]
    }
}