# DM 引用修复测试验证指南

## 📋 测试前准备

1. **确认开发服务器运行**
   ```bash
   cd D:/workspace/IETM/cape-ietm-vue
   npm run serve
   ```
   等待显示：`DONE  Compiled successfully`

2. **打开浏览器**
   - 访问：http://localhost:3000
   - 登录系统

## 🧪 完整测试步骤

### 步骤1：打开编辑器页面
- URL：`http://localhost:3000/ietm/dm-content-editor/2115071394537517057?mode=edit&dmc=DMC-ZB1-A-05-00-00-00A-007A-A_001-01_zh-CN`
- **验证**：页面正常加载，显示源码视图

### 步骤2：确认源码编辑器可见
- **验证**：可以看到 XML 源码
- **检查**：找到第69行的 `<levelledPara>` 标签

### 步骤3：进入设计视图
- **操作**：点击第69行左侧的铅笔图标 (✎)
- **验证**：页面切换到设计视图，左侧显示树形结构

### 步骤4：选择树节点
- **操作**：在左侧树中点击"层级1"节点
- **验证**：节点被选中（高亮显示）

### 步骤5：打开警告 tab
- **操作**：右侧面板点击"警告"tab
- **验证**：显示警告列表（可能为空或有现有项）

### 步骤6：增加新项
- **操作**：点击"增加"按钮
- **验证**：弹出"添加警告"对话框，显示 UEditor 编辑器

### 步骤7：插入 DM 引用
- **操作**：在 UEditor 工具栏中点击"DM引用"按钮
- **验证**：弹出"引用DM"对话框，显示 DM 列表

### 步骤8：选择 DM
- **操作**：
  1. 勾选第一个 DM（DMC-ZB1-A-00-00-00-00A-007A-A_zh-CN）
  2. 点击对话框底部的"确定"按钮
- **验证**：对话框关闭，编辑器中显示"【DM引用】"

### 步骤9：保存编辑
- **操作1**：点击"添加警告"对话框的"确定"按钮
- **验证1**：对话框关闭，警告列表中增加一行
- **操作2**：点击顶部工具栏的"保存"按钮
- **验证2**：显示保存成功提示

### 步骤10：验证 XML 格式 ✅
- **操作**：切换到"源码视图"tab
- **验证位置**：找到第72行附近的 `<warning>` 标签
- **✅ 期望结果**：
  ```xml
  <warning id="warning-xxxxx">
    <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest">
      <dmRefIdent>
        <dmCode modelIdentCode="ZB1" systemDiffCode="A" systemCode="00" .../>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
      </dmRefIdent>
      <dmRefAddressItems>
        <dmTitle>
          <techName>说明（总论）</techName>
          <infoName>符号清单</infoName>
        </dmTitle>
      </dmRefAddressItems>
    </dmRef>
  </warning>
  ```
  
- **❌ 错误格式（如果修复失败）**：
  ```xml
  <warning id="warning-xxxxx">&lt;dmRef xlink:type="simple"...&gt;&lt;/dmRef&gt;</warning>
  ```

### 步骤11：验证警告列表显示 ✅
- **操作**：切换回"设计视图"，选择"层级1"，打开"警告"tab
- **✅ 期望结果**：
  - 警告列表中显示：`【引用DMC-ZB1-A-00-00-00-00A-007A-A_zh-CN: 说明（总论） 符号清单】`
  - 或显示："加载中..." 然后变为格式化文本
  
- **❌ 错误显示（如果修复失败）**：
  ```
  <dmRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest"> <dmRefIdent><dmCode modelIdentCode="ZB1"...
  ```

## 🐛 故障排查

### 问题1：警告列表仍显示原始 XML

**可能原因**：
1. ConvertedContent 组件未加载
2. para2html 转换失败
3. 浏览器缓存

**排查步骤**：
1. 打开浏览器开发者工具 (F12)
2. 查看 Console 标签页
3. 查找以下错误信息：
   - `[ConvertedContent] 转换失败`
   - `para2html` 相关错误
   - Vue 组件错误

**解决方法**：
1. 强制刷新页面 (Ctrl+Shift+R / Cmd+Shift+R)
2. 清除浏览器缓存
3. 重启开发服务器

### 问题2：XML 中 dmRef 被转义

**可能原因**：
1. `html2para` 未被调用
2. `hasDmOrInternalRef` 检测失败
3. UEditor 返回的内容格式不正确

**排查步骤**：
1. 打开浏览器控制台
2. 查找调试日志：
   - `===== saveContentEditor DEBUG START =====`
   - `hasDmOrInternalRef:`
   - `html2para返回结果:`

**解决方法**：
- 检查 LevelledParaDesigner.vue 的 `saveContentEditor` 方法
- 确认 `hasDmOrInternalRef` 检测逻辑

### 问题3：显示"加载中..."不消失

**可能原因**：
1. `para2html` 函数执行超时
2. Parent 对象传递错误
3. 异步转换卡住

**排查步骤**：
1. 检查控制台是否有错误
2. 检查网络请求是否正常

**解决方法**：
- 刷新页面重试
- 检查 Parent 计算属性是否正确

## 📊 预期成果

修复成功后，应该满足以下条件：

1. ✅ **警告列表显示**：格式化的引用文本，而非 XML 标签
2. ✅ **XML 格式正确**：`<dmRef>` 作为子元素，而非转义文本
3. ✅ **编辑器正常**：可以插入、编辑、保存 DM 引用
4. ✅ **往返转换**：XML ↔ HTML 双向转换无损

## 📝 修复的代码文件

**文件位置**：
`D:/workspace/IETM/cape-ietm-vue/src/views/ietm/ietmdatamodulemanagement/editor/components/LevelledParaDesigner.vue`

**修改内容**：
1. 添加 ConvertedContent 异步组件（第376-425行）
2. 注册组件（第440行）
3. 更新模板（第100行及其他 content slot）

**关键代码**：
```vue
<ConvertedContent 
  v-if="text && (text.includes('<dmRef') || text.includes('<internalRef'))" 
  :content="text" 
  :parent="Parent" 
/>
```

---

**测试完成后请报告结果！** 🎯
