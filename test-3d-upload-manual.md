# 3D格式上传手工验证指南

## 📋 测试准备

### 1. 测试数据文件 ✅

已创建测试文件位置：`/d/workspace/IETM/test-data/3d-models/`

| 文件名 | 格式 | 大小 | 说明 |
|--------|------|------|------|
| test-triangle.gltf | glTF | 1KB | glTF文本格式，嵌入式三角形 |
| DamagedHelmet.glb | GLB | 3.6MB | glTF二进制格式，Three.js官方示例 |
| test-cube.obj | OBJ | 394B | Wavefront OBJ格式，立方体 |
| test-tetrahedron.stl | STL | 625B | STL ASCII格式，四面体 |
| test-pyramid.ply | PLY | 240B | PLY ASCII格式，金字塔 |
| test-triangle.wrl | VRML | 300B | VRML 2.0格式，三角形 |

### 2. 启动服务

```bash
# 终端1：启动前端开发服务
cd /d/workspace/IETM/cape-ietm-vue
npm run serve

# 终端2：确保后端服务运行
# (根据实际情况启动后端)
```

### 3. 访问应用

打开浏览器访问：`http://localhost:3000`

---

## 🧪 手工测试清单

### 测试1：IetmIcnManageForm - 新增ICN

#### 步骤

1. 登录系统
2. 导航到：图符管理 (`#/ietm/icnmanage`)
3. 点击"新增"按钮
4. 在弹窗中查看文件上传区域

#### 验证点

##### ✅ VP1.1 - accept属性检查

**操作**: 右键点击"选择文件"按钮 → 检查元素 → 查看`<input type="file">`的accept属性

**预期结果**:
```html
accept=".bmp,.jpg,.jpeg,.png,.gif,.tif,.tiff,.cgm,.svg,.swf,.mp3,.mp4,.webm,.ogg,.wrl,.smg,.gltf,.glb,.obj,.stl,.fbx,.dae,.ply"
```

**检查点**:
- [ ] 包含 `.gltf`
- [ ] 包含 `.glb`
- [ ] 包含 `.obj`
- [ ] 包含 `.stl`
- [ ] 包含 `.fbx`
- [ ] 包含 `.dae`
- [ ] 包含 `.ply`

##### ✅ VP1.2 - 提示文字检查

**操作**: 查看文件上传区域下方的提示文字

**预期结果**:
```
支持格式：图片(.bmp .jpg .jpeg .png .gif .tif .tiff .cgm .svg)、
         动画(.swf)、音视频(.mp3 .mp4 .webm .ogg)、
         3D(.wrl .smg .gltf .glb .obj .stl .fbx .dae .ply)
```

**检查点**:
- [ ] 提示文字中包含所有7种新格式

##### ✅ VP1.3 - glTF格式上传

**操作**: 点击"选择文件" → 选择 `test-triangle.gltf`

**预期结果**:
- [ ] 文件选择器中可以看到该文件（不被过滤）
- [ ] 文件成功添加到上传列表
- [ ] 显示文件名：`test-triangle.gltf`
- [ ] 显示文件图标
- [ ] **无错误提示**："不支持的文件格式"

##### ✅ VP1.4 - GLB格式上传

**操作**: 移除上一个文件 → 选择 `DamagedHelmet.glb`

**预期结果**:
- [ ] 文件成功添加
- [ ] 显示文件名：`DamagedHelmet.glb`
- [ ] **无错误提示**

##### ✅ VP1.5 - OBJ格式上传

**操作**: 选择 `test-cube.obj`

**预期结果**:
- [ ] 文件成功添加
- [ ] **无错误提示**

##### ✅ VP1.6 - STL格式上传

**操作**: 选择 `test-tetrahedron.stl`

**预期结果**:
- [ ] 文件成功添加
- [ ] **无错误提示**

##### ✅ VP1.7 - PLY格式上传

**操作**: 选择 `test-pyramid.ply`

**预期结果**:
- [ ] 文件成功添加
- [ ] **无错误提示**

##### ✅ VP1.8 - VRML格式上传（回归测试）

**操作**: 选择 `test-triangle.wrl`

**预期结果**:
- [ ] 文件成功添加（原有功能不受影响）
- [ ] **无错误提示**

##### ❌ VP1.9 - 不支持格式拒绝

**操作**: 尝试上传一个`.xyz`或`.txt`文件

**预期结果**:
- [ ] 显示错误消息："不支持的文件格式！仅支持：..."
- [ ] 文件**未添加**到上传列表

---

### 测试2：IcnUploadForm - 差异/新版上传

#### 步骤

1. 在图符管理列表中，选择一个已有ICN记录
2. 点击"差异上传"按钮（或"新版上传"）
3. 在弹窗中查看文件上传区域

#### 验证点

##### ✅ VP2.1 - accept属性检查

**预期**: 同VP1.1，包含所有7种新格式

**检查点**:
- [ ] accept属性包含 `.gltf .glb .obj .stl .fbx .dae .ply`

##### ✅ VP2.2 - 文件上传测试

**操作**: 选择 `test-triangle.gltf`

**预期结果**:
- [ ] 文件成功添加到上传列表
- [ ] **无错误提示**

---

### 测试3：IcnBatchAddModal - 批量上传

#### 步骤

1. 在图符管理页面
2. 点击"批量导入"按钮
3. 在弹窗中查看文件上传区域

#### 验证点

##### ✅ VP3.1 - accept属性检查

**预期**: 同VP1.1

**检查点**:
- [ ] accept属性包含所有7种新格式

##### ✅ VP3.2 - 提示文字检查

**预期结果**:
```
支持格式：bmp, jpg, png, gif, tif, cgm, svg, mp3, mp4, wrl, smg, gltf, glb, obj, stl, fbx, dae, ply 等
```

**检查点**:
- [ ] 提示文字中包含 `gltf, glb, obj, stl, fbx, dae, ply`

##### ✅ VP3.3 - 多文件批量上传

**操作**: 同时选择多个文件：
- `test-triangle.gltf`
- `test-cube.obj`
- `test-tetrahedron.stl`

**预期结果**:
- [ ] 所有3个文件都成功添加到列表
- [ ] 显示3个文件项
- [ ] **无错误提示**

---

## 🎯 端到端测试（E2E）

### 测试4：上传 → 保存 → 预览完整流程

#### 步骤

1. **上传阶段**
   - 点击"新增ICN"
   - 填写必填字段（如果有）
   - 上传 `test-triangle.gltf` 文件
   - 点击"确定"保存

2. **等待处理**
   - 等待后端处理完成
   - 确认保存成功消息

3. **预览阶段**
   - 在ICN列表中找到刚才创建的记录
   - 点击该记录的"预览"按钮

#### 验证点

##### ✅ VP4.1 - 上传成功

**检查点**:
- [ ] 显示成功消息："保存成功"（或类似）
- [ ] ICN列表中出现新记录

##### ✅ VP4.2 - Model3DViewer正常打开

**检查点**:
- [ ] Model3DViewer弹窗打开
- [ ] 无错误提示："不支持的3D格式"
- [ ] 无错误提示："该文件类型不支持在线预览"

##### ✅ VP4.3 - 3D模型正常加载

**检查点**:
- [ ] 看到3D场景（非空白）
- [ ] 看到三角形几何体
- [ ] 可以旋转/缩放模型
- [ ] 显示格式标签："glTF"
- [ ] 显示模型统计信息（顶点数、面数等）

---

## 📊 测试结果汇总表

| 测试编号 | 测试项 | 结果 | 备注 |
|---------|--------|------|------|
| VP1.1 | IetmIcnManageForm - accept属性 | ⬜ |  |
| VP1.2 | IetmIcnManageForm - 提示文字 | ⬜ |  |
| VP1.3 | 上传glTF格式 | ⬜ |  |
| VP1.4 | 上传GLB格式 | ⬜ |  |
| VP1.5 | 上传OBJ格式 | ⬜ |  |
| VP1.6 | 上传STL格式 | ⬜ |  |
| VP1.7 | 上传PLY格式 | ⬜ |  |
| VP1.8 | 上传VRML格式（回归） | ⬜ |  |
| VP1.9 | 拒绝不支持格式 | ⬜ |  |
| VP2.1 | IcnUploadForm - accept属性 | ⬜ |  |
| VP2.2 | IcnUploadForm - 文件上传 | ⬜ |  |
| VP3.1 | IcnBatchAddModal - accept属性 | ⬜ |  |
| VP3.2 | IcnBatchAddModal - 提示文字 | ⬜ |  |
| VP3.3 | 批量上传多文件 | ⬜ |  |
| VP4.1 | E2E - 上传成功 | ⬜ |  |
| VP4.2 | E2E - 预览器打开 | ⬜ |  |
| VP4.3 | E2E - 模型正常加载 | ⬜ |  |

**图例**: ⬜ 未测试 | ✅ 通过 | ❌ 失败 | ⚠️ 部分通过

---

## 🤖 自动化测试（可选）

如果手工测试通过，可以运行自动化脚本进一步验证：

```bash
cd /d/workspace/IETM/cape-ietm-vue

# 方式1：运行Playwright自动化脚本
node playwright-3d-upload-verify.js

# 方式2：运行Jest E2E测试
npm run test:e2e -- tests/e2e/icn-upload-3d-formats.spec.js
```

---

## 📝 测试报告模板

测试完成后，填写以下报告：

```
# 3D格式上传功能验证报告

**测试日期**: 2026-09-19
**测试人员**: [姓名]
**测试环境**: 
  - 前端: http://localhost:3000
  - 后端: [后端地址]
  - 浏览器: Chrome/Firefox/Safari [版本]

## 测试结果

- ✅ 通过: [X]/17
- ❌ 失败: [X]/17
- ⚠️  部分通过: [X]/17

## 详细结果

[粘贴上方测试结果汇总表]

## 发现的问题

1. [问题描述]
   - 严重性: P0/P1/P2
   - 复现步骤: ...
   - 截图: [附件]

## 结论

- [ ] ✅ 所有测试通过，功能正常，可以部署
- [ ] ❌ 存在缺陷，需要修复后重新测试
- [ ] ⚠️  部分功能异常，需要进一步调查

**测试人签名**: ___________
**日期**: 2026-09-19
```

---

## 🚨 注意事项

1. **浏览器开发者工具**: 建议全程打开Console，监控是否有JavaScript错误
2. **网络请求**: 使用Network面板查看文件上传请求是否成功
3. **后端日志**: 如果上传失败，检查后端日志确认原因
4. **文件大小**: DamagedHelmet.glb为3.6MB，上传时间可能较长
5. **权限问题**: 确保测试账号有权限访问图符管理和上传文件

---

**测试指南版本**: v1.0  
**创建日期**: 2026-09-19  
**最后更新**: 2026-09-19
