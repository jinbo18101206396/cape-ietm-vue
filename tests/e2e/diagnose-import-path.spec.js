/**
 * 诊断导入文件路径问题
 *
 * 目标：对比导入和导出的文件路径格式差异
 */

const { test, expect } = require('@playwright/test');

test.describe('诊断导入文件路径问题', () => {
  test('分析ICN和资源文件的路径格式', async ({ request }) => {
    const API_BASE = 'http://localhost:9999';

    console.log('\n========== 开始路径诊断 ==========\n');

    // 1. 查询现有ICN记录
    console.log('📋 步骤1：查询现有ICN记录...');
    const icnResponse = await request.get(`${API_BASE}/icnmanage/ietmIcnManage/list`, {
      params: { pageNo: 1, pageSize: 5 }
    });
    const icnData = await icnResponse.json();

    if (icnData.success && icnData.result.records.length > 0) {
      console.log(`✅ 找到 ${icnData.result.records.length} 条ICN记录\n`);

      for (let i = 0; i < Math.min(3, icnData.result.records.length); i++) {
        const icn = icnData.result.records[i];
        console.log(`ICN记录 ${i + 1}:`);
        console.log(`  - ICN编码: ${icn.icn}`);
        console.log(`  - ICN ID: ${icn.id}`);
        console.log(`  - 构型节点ID: ${icn.cmNodeId}`);

        // 查询附件信息
        const attachResponse = await request.get(`${API_BASE}/sys/common/attachment/list`, {
          params: { pid: icn.id }
        });
        const attachData = await attachResponse.json();

        if (attachData.success && attachData.result.length > 0) {
          const att = attachData.result[0];
          console.log(`  - 附件ID: ${att.id}`);
          console.log(`  - 文件名: ${att.fileName}`);
          console.log(`  - fileKey: ${att.fileKey}`);
          console.log(`  - 文件类型: ${att.fileType}`);

          // 尝试访问预览接口
          const previewResponse = await request.get(`${API_BASE}/icnmanage/ietmIcnManage/preview/${icn.id}`);
          const previewData = await previewResponse.json();

          if (previewData.success) {
            console.log(`  - 预览URL: ${previewData.result.fileUrl}`);
            console.log(`  - 预览类型: ${previewData.result.previewType}`);

            // 尝试访问文件
            if (previewData.result.fileUrl) {
              const fileResponse = await request.get(`${API_BASE}${previewData.result.fileUrl}`);
              console.log(`  - 文件访问状态: ${fileResponse.status()} ${fileResponse.statusText()}`);

              if (!fileResponse.ok()) {
                console.log(`  ❌ 文件访问失败！`);
              } else {
                console.log(`  ✅ 文件访问成功`);
              }
            }
          } else {
            console.log(`  ❌ 预览接口失败: ${previewData.message}`);
          }
        } else {
          console.log(`  ⚠️ 该ICN没有附件记录`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️ 没有找到ICN记录');
    }

    // 2. 查询现有DM记录和资源文件
    console.log('\n📋 步骤2：查询现有DM和资源文件...');
    const dmResponse = await request.get(`${API_BASE}/ietm/datamodule/list`, {
      params: { pageNo: 1, pageSize: 5 }
    });
    const dmData = await dmResponse.json();

    if (dmData.success && dmData.result.records.length > 0) {
      console.log(`✅ 找到 ${dmData.result.records.length} 条DM记录\n`);

      for (let i = 0; i < Math.min(3, dmData.result.records.length); i++) {
        const dm = dmData.result.records[i];
        console.log(`DM记录 ${i + 1}:`);
        console.log(`  - DMC编码: ${dm.dmcCode}`);
        console.log(`  - DM ID: ${dm.id}`);
        console.log(`  - 构型节点ID: ${dm.cmNodeId}`);

        // 查询资源文件
        const resourceResponse = await request.get(`${API_BASE}/ietm/datamodule/queryDmResources`, {
          params: { dmId: dm.id }
        });
        const resourceData = await resourceResponse.json();

        if (resourceData.success && resourceData.result.length > 0) {
          console.log(`  - 资源文件数量: ${resourceData.result.length}`);

          for (let j = 0; j < Math.min(2, resourceData.result.length); j++) {
            const res = resourceData.result[j];
            console.log(`    资源 ${j + 1}:`);
            console.log(`      - 资源名称: ${res.resourceName}`);
            console.log(`      - 文件名: ${res.fileName}`);
            console.log(`      - filePath: ${res.filePath}`);

            // 构建下载URL并测试访问
            if (res.filePath) {
              const encodedPath = res.filePath.split('/').map(p => encodeURIComponent(p)).join('/');
              const downloadUrl = `/sys/common/static/${encodedPath}`;
              console.log(`      - 下载URL: ${downloadUrl}`);

              const fileResponse = await request.get(`${API_BASE}${downloadUrl}`);
              console.log(`      - 文件访问状态: ${fileResponse.status()} ${fileResponse.statusText()}`);

              if (!fileResponse.ok()) {
                console.log(`      ❌ 文件访问失败！`);
              } else {
                console.log(`      ✅ 文件访问成功`);
              }
            }
          }
        } else {
          console.log(`  ⚠️ 该DM没有资源文件`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️ 没有找到DM记录');
    }

    console.log('\n========== 路径诊断完成 ==========\n');

    // 3. 输出问题分析
    console.log('📊 问题分析：');
    console.log('');
    console.log('ICN文件路径格式：');
    console.log('  导出时：DdnPackageBuilder在ietm_attachment表中查询attachment.fileKey');
    console.log('  导入时：IetmDmImportServiceImpl保存为 "project/{projectId}/icn/{fileName}"');
    console.log('  预览时：IetmIcnManageServiceImpl从fileKey读取，期望相对路径');
    console.log('');
    console.log('资源文件路径格式：');
    console.log('  导出时：DdnPackageBuilder在ietm_dm_comment表中查询filePath');
    console.log('  导入时：IetmDmImportServiceImpl保存为 "project/{projectId}/dm_resource/{fileName}"');
    console.log('  下载时：前端通过 /sys/common/static/{filePath} 访问');
    console.log('');
    console.log('⚠️ 潜在问题：');
    console.log('  1. ICN的fileKey可能不是相对路径格式');
    console.log('  2. viewFile接口的extractFileName()可能解析路径错误');
    console.log('  3. 导入时保存的路径格式与导出时读取的格式可能不一致');
  });
});
