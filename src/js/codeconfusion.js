import { uploadAction,downFile } from '@api/manage'
import Vue from 'vue'
export const CodeConfusion={
  methods:{
    handleFormReset:function(){
      const that = this;
      that.$refs.mark.value = "";
      that.$refs.file.value= null;
    },
    handleCodeConfusion: function () {
      const that = this;
      if(!this.validateForm()){
        return;
      }
      let formData = this.buildFormParam();
      Vue.prototype.$setLoading(true);
      uploadAction(this.url.startConfusion,formData).then((res)=>{
        if(res.success){
          that.$message.success(res.message);
          that.$emit('ok');
        }else{
          that.$message.warning(res.message);
        }
        Vue.prototype.$setLoading(false);
        this.handleFormReset();
        this.loadData({});
      }).finally(() => {
        that.confirmLoading = false;
      })
    },
    handleDownload:function(record){
      this.generateDownloadContent(this.url.downloadFile,{id: record.id},record.fileName);
    },
    validateForm:function(){
      const that = this;
      let file = that.$refs.file.files[0];
      if(!file){
        that.$message.warning("必须选择要混淆的文件包")
        return false;
      }
      return true;
    },
    buildFormParam:function(){
      const that = this;
      let formData = new FormData();
      let file = that.$refs.file.files[0];
      formData.append("file",file);
      formData.append("remark",that.$refs.mark.value);

      return formData;
    }

  }
}