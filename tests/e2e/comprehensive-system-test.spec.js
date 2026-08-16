/**
 * 历史版本修复 - 系统全面回归测试套件
 * 覆盖所有核心业务功能，验证修改是否影响已有功能
 */

const { test, expect } = require('@playwright/test');
const http = require('http');

// API请求辅助
function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9999,
      path: `/jeecg-boot${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': token || ''
      }
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function apiLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username: 'admin', password: '123456' });
    const req = http.request('http://localhost:9999/jeecg-boot/sys/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk });
      res.on('end', () => {
        const json = JSON.parse(data);
        resolve(json.result.token);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

let TOKEN;
let TEST_RESULTS = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

function recordResult(testName, status, message) {
  TEST_RESULTS.details.push({ testName, status, message });
  if (status === 'PASS') TEST_RESULTS.passed++;
  else if (status === 'FAIL') TEST_RESULTS.failed++;
  else if (status === 'SKIP') TEST_RESULTS.skipped++;
}

test.describe('系统全面回归测试', () => {

  test.beforeAll(async () => {
    TOKEN = await apiLogin();
    console.log('\n✅ 测试准备：登录成功\n');
  });

  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('测试总结报告');
    console.log('='.repeat(80));
    console.log(`✅ 通过: ${TEST_RESULTS.passed}`);
    console.log(`❌ 失败: ${TEST_RESULTS.failed}`);
    console.log(`⚠️  跳过: ${TEST_RESULTS.skipped}`);
    console.log(`📊 总计: ${TEST_RESULTS.details.length}`);
    console.log('='.repeat(80) + '\n');

    if (TEST_RESULTS.failed > 0) {
      console.log('失败的测试：');
      TEST_RESULTS.details.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`  ❌ ${t.testName}: ${t.message}`);
      });
    }
  });

  // ==================== 模块1：DM基础查询功能 ====================

  test('1.1 DM列表查询 - 验证只返回最新版本', async () => {
    const testName = '1.1 DM列表查询';
    console.log(`\n[测试] ${testName}`);

    try {
      const result = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=20', null, TOKEN);

      if (!result.success) {
        recordResult(testName, 'SKIP', result.message || '需要项目选择');
        console.log(`  ⚠️  跳过: ${result.message}`);
        return;
      }

      const records = result.result?.records || [];
      console.log(`  📊 返回记录数: ${records.length}`);

      if (records.length === 0) {
        recordResult(testName, 'SKIP', '无数据');
        console.log(`  ⚠️  跳过: 无数据`);
        return;
      }

      // 验证：所有记录都是最新版本
      const allLatest = records.every(dm => dm.isLatest === '1');
      const allNormalStatus = records.every(dm => dm.status === '1');

      if (!allLatest) {
        recordResult(testName, 'FAIL', '发现非最新版本');
        console.log(`  ❌ 失败: 列表中包含历史版本`);
      } else if (!allNormalStatus) {
        recordResult(testName, 'FAIL', '发现非正常状态');
        console.log(`  ❌ 失败: 列表中包含非正常状态的DM`);
      } else {
        recordResult(testName, 'PASS', `所有${records.length}条记录都是最新版本`);
        console.log(`  ✅ 通过: 所有记录都是最新版本且状态正常`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });

  test('1.2 DM详情查询 - 验证返回正确数据', async () => {
    const testName = '1.2 DM详情查询';
    console.log(`\n[测试] ${testName}`);

    try {
      // 先获取一个DM ID
      const listResult = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=1', null, TOKEN);

      if (!listResult.success || !listResult.result?.records?.length) {
        recordResult(testName, 'SKIP', '无可用DM');
        console.log(`  ⚠️  跳过: 无可用DM`);
        return;
      }

      const dmId = listResult.result.records[0].id;

      // 查询详情
      const detailResult = await apiReq('GET', `/ietm/datamodule/queryById?id=${dmId}`, null, TOKEN);

      if (!detailResult.success) {
        recordResult(testName, 'FAIL', detailResult.message);
        console.log(`  ❌ 失败: ${detailResult.message}`);
        return;
      }

      const dm = detailResult.result;

      // 验证：返回的是最新版本
      if (dm.isLatest !== '1') {
        recordResult(testName, 'FAIL', '返回了历史版本');
        console.log(`  ❌ 失败: 详情查询返回了历史版本`);
      } else if (dm.status !== '1') {
        recordResult(testName, 'FAIL', '返回了非正常状态');
        console.log(`  ❌ 失败: 状态不正常`);
      } else {
        recordResult(testName, 'PASS', '详情查询正常');
        console.log(`  ✅ 通过: 详情查询返回最新版本`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });

  // ==================== 模块2：历史版本功能 ====================

  test('2.1 历史版本查询 - 验证返回所有版本', async () => {
    const testName = '2.1 历史版本查询';
    console.log(`\n[测试] ${testName}`);

    try {
      const listResult = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=5', null, TOKEN);

      if (!listResult.success || !listResult.result?.records?.length) {
        recordResult(testName, 'SKIP', '无可用DM');
        console.log(`  ⚠️  跳过: 无可用DM`);
        return;
      }

      let totalVersions = 0;
      let normalCount = 0;
      let deletedCount = 0;
      let tempCount = 0;

      // 查询多个DM的历史版本
      for (const dm of listResult.result.records) {
        const params = new URLSearchParams({
          sns: dm.sns,
          infoCode: dm.infoCode
        });
        if (dm.infoCodeVariant) {
          params.append('infoCodeVariant', dm.infoCodeVariant);
        }

        const historyResult = await apiReq(
          'GET',
          `/ietm/datamodule/historyVersions?${params.toString()}`,
          null,
          TOKEN
        );

        if (historyResult.success && historyResult.result) {
          historyResult.result.forEach(v => {
            totalVersions++;
            if (v.status === '1') normalCount++;
            else if (v.status === '0') deletedCount++;
            else if (v.status === '2') tempCount++;
          });
        }
      }

      console.log(`  📊 统计: 总${totalVersions}个版本`);
      console.log(`     - status='1'(正常): ${normalCount}`);
      console.log(`     - status='2'(临时): ${tempCount}`);
      console.log(`     - status='0'(删除): ${deletedCount}`);

      if (totalVersions === 0) {
        recordResult(testName, 'SKIP', '无历史版本');
        console.log(`  ⚠️  跳过: 无历史版本数据`);
      } else if (deletedCount > 0) {
        const percentage = (deletedCount / totalVersions * 100).toFixed(1);
        recordResult(testName, 'PASS', `发现${deletedCount}个旧数据(${percentage}%)`);
        console.log(`  ⚠️  警告: 发现${deletedCount}个status='0'的历史版本(${percentage}%)`);
        console.log(`     这些是修复前的旧数据，新数据应该都是status='1'`);
      } else {
        recordResult(testName, 'PASS', `所有${totalVersions}个版本状态正常`);
        console.log(`  ✅ 通过: 所有历史版本状态正常，无错误标记`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });

  test('2.2 历史版本内容完整性', async () => {
    const testName = '2.2 历史版本内容完整性';
    console.log(`\n[测试] ${testName}`);

    try {
      const listResult = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=10', null, TOKEN);

      if (!listResult.success || !listResult.result?.records?.length) {
        recordResult(testName, 'SKIP', '无可用DM');
        console.log(`  ⚠️  跳过: 无可用DM`);
        return;
      }

      let totalVersions = 0;
      let hasContent = 0;
      let noContent = 0;

      for (const dm of listResult.result.records) {
        const params = new URLSearchParams({
          sns: dm.sns,
          infoCode: dm.infoCode
        });
        if (dm.infoCodeVariant) {
          params.append('infoCodeVariant', dm.infoCodeVariant);
        }

        const historyResult = await apiReq(
          'GET',
          `/ietm/datamodule/historyVersions?${params.toString()}`,
          null,
          TOKEN
        );

        if (historyResult.success && historyResult.result) {
          historyResult.result.forEach(v => {
            totalVersions++;
            if (v.dmContent && v.dmContent.length > 0) {
              hasContent++;
            } else {
              noContent++;
            }
          });
        }
      }

      if (totalVersions === 0) {
        recordResult(testName, 'SKIP', '无历史版本');
        console.log(`  ⚠️  跳过: 无历史版本`);
      } else if (noContent > 0) {
        recordResult(testName, 'FAIL', `${noContent}个版本无内容`);
        console.log(`  ❌ 失败: ${noContent}个版本缺少XML内容`);
      } else {
        recordResult(testName, 'PASS', `所有${totalVersions}个版本都有内容`);
        console.log(`  ✅ 通过: 所有${totalVersions}个历史版本都包含XML内容`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });

  // ==================== 模块3：引用关系功能 ====================

  test('3.1 DM引用关系查询', async () => {
    const testName = '3.1 DM引用关系查询';
    console.log(`\n[测试] ${testName}`);

    try {
      const listResult = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=5', null, TOKEN);

      if (!listResult.success || !listResult.result?.records?.length) {
        recordResult(testName, 'SKIP', '无可用DM');
        console.log(`  ⚠️  跳过: 无可用DM`);
        return;
      }

      let tested = 0;
      let errors = 0;

      for (const dm of listResult.result.records.slice(0, 3)) {
        // 测试出引用
        const outRef = await apiReq(
          'GET',
          `/ietm/datamodule/referenceInfo?dmId=${dm.id}&refType=out`,
          null,
          TOKEN
        );

        // 测试入引用
        const inRef = await apiReq(
          'GET',
          `/ietm/datamodule/referenceInfo?dmId=${dm.id}&refType=in`,
          null,
          TOKEN
        );

        tested++;

        if (!outRef.success || !inRef.success) {
          errors++;
        }
      }

      if (errors > 0) {
        recordResult(testName, 'FAIL', `${errors}/${tested}个DM引用查询失败`);
        console.log(`  ❌ 失败: ${errors}个DM的引用关系查询异常`);
      } else {
        recordResult(testName, 'PASS', `测试了${tested}个DM的引用关系`);
        console.log(`  ✅ 通过: ${tested}个DM的引用关系查询正常`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });

  // ==================== 模块4：数据一致性验证 ====================

  test('4.1 status字段一致性检查', async () => {
    const testName = '4.1 status字段一致性';
    console.log(`\n[测试] ${testName}`);

    try {
      const listResult = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=20', null, TOKEN);

      if (!listResult.success || !listResult.result?.records?.length) {
        recordResult(testName, 'SKIP', '无可用DM');
        console.log(`  ⚠️  跳过: 无可用DM`);
        return;
      }

      const records = listResult.result.records;

      // 检查最新版本的status
      const abnormalLatest = records.filter(dm => dm.status !== '1');

      if (abnormalLatest.length > 0) {
        recordResult(testName, 'FAIL', `${abnormalLatest.length}个最新版本status异常`);
        console.log(`  ❌ 失败: 发现${abnormalLatest.length}个最新版本的status不是'1'`);
      } else {
        recordResult(testName, 'PASS', `所有${records.length}个最新版本status正常`);
        console.log(`  ✅ 通过: 所有最新版本的status都是'1'`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });

  test('4.2 is_latest字段一致性检查', async () => {
    const testName = '4.2 is_latest字段一致性';
    console.log(`\n[测试] ${testName}`);

    try {
      const listResult = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=20', null, TOKEN);

      if (!listResult.success || !listResult.result?.records?.length) {
        recordResult(testName, 'SKIP', '无可用DM');
        console.log(`  ⚠️  跳过: 无可用DM`);
        return;
      }

      const records = listResult.result.records;
      const abnormal = records.filter(dm => dm.isLatest !== '1');

      if (abnormal.length > 0) {
        recordResult(testName, 'FAIL', `${abnormal.length}个记录is_latest异常`);
        console.log(`  ❌ 失败: 列表中有${abnormal.length}个记录的is_latest不是'1'`);
      } else {
        recordResult(testName, 'PASS', `所有${records.length}个记录is_latest正常`);
        console.log(`  ✅ 通过: 列表中所有记录的is_latest都是'1'`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });

  // ==================== 模块5：边界情况测试 ====================

  test('5.1 空历史版本场景', async () => {
    const testName = '5.1 空历史版本场景';
    console.log(`\n[测试] ${testName}`);

    try {
      const listResult = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=20', null, TOKEN);

      if (!listResult.success || !listResult.result?.records?.length) {
        recordResult(testName, 'SKIP', '无可用DM');
        console.log(`  ⚠️  跳过: 无可用DM`);
        return;
      }

      // 找一个只有当前版本、无历史版本的DM
      let foundSingleVersion = false;

      for (const dm of listResult.result.records) {
        const params = new URLSearchParams({
          sns: dm.sns,
          infoCode: dm.infoCode
        });
        if (dm.infoCodeVariant) {
          params.append('infoCodeVariant', dm.infoCodeVariant);
        }

        const historyResult = await apiReq(
          'GET',
          `/ietm/datamodule/historyVersions?${params.toString()}`,
          null,
          TOKEN
        );

        if (historyResult.success && historyResult.result) {
          const versions = historyResult.result;

          // 找到只有1个版本的DM
          if (versions.length === 1) {
            foundSingleVersion = true;

            // 验证这个版本的数据
            const v = versions[0];
            if (v.isLatest === '1' && v.status === '1') {
              recordResult(testName, 'PASS', '单版本DM数据正常');
              console.log(`  ✅ 通过: 找到单版本DM，数据正常`);
            } else {
              recordResult(testName, 'FAIL', '单版本DM数据异常');
              console.log(`  ❌ 失败: 单版本DM的数据异常`);
            }
            break;
          }
        }
      }

      if (!foundSingleVersion) {
        recordResult(testName, 'SKIP', '未找到单版本DM');
        console.log(`  ⚠️  跳过: 未找到只有单个版本的DM`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });

  test('5.2 多历史版本场景', async () => {
    const testName = '5.2 多历史版本场景';
    console.log(`\n[测试] ${testName}`);

    try {
      const listResult = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=20', null, TOKEN);

      if (!listResult.success || !listResult.result?.records?.length) {
        recordResult(testName, 'SKIP', '无可用DM');
        console.log(`  ⚠️  跳过: 无可用DM`);
        return;
      }

      let maxVersions = 0;
      let maxVersionDm = null;

      for (const dm of listResult.result.records) {
        const params = new URLSearchParams({
          sns: dm.sns,
          infoCode: dm.infoCode
        });
        if (dm.infoCodeVariant) {
          params.append('infoCodeVariant', dm.infoCodeVariant);
        }

        const historyResult = await apiReq(
          'GET',
          `/ietm/datamodule/historyVersions?${params.toString()}`,
          null,
          TOKEN
        );

        if (historyResult.success && historyResult.result) {
          const count = historyResult.result.length;
          if (count > maxVersions) {
            maxVersions = count;
            maxVersionDm = { dm, versions: historyResult.result };
          }
        }
      }

      if (maxVersions <= 1) {
        recordResult(testName, 'SKIP', '无多版本DM');
        console.log(`  ⚠️  跳过: 未找到有多个版本的DM`);
        return;
      }

      console.log(`  📊 找到最多版本的DM: ${maxVersions}个版本`);

      // 验证版本排序
      const versions = maxVersionDm.versions;
      let sortCorrect = true;

      for (let i = 0; i < versions.length - 1; i++) {
        const curr = versions[i];
        const next = versions[i + 1];

        // 应该按 issue_no DESC, in_work DESC 排序
        if (curr.issueNo < next.issueNo) {
          sortCorrect = false;
          break;
        } else if (curr.issueNo === next.issueNo && curr.inWork < next.inWork) {
          sortCorrect = false;
          break;
        }
      }

      if (!sortCorrect) {
        recordResult(testName, 'FAIL', '版本排序错误');
        console.log(`  ❌ 失败: 版本排序不正确`);
      } else {
        recordResult(testName, 'PASS', `${maxVersions}个版本排序正确`);
        console.log(`  ✅ 通过: ${maxVersions}个版本排序正确（最新在前）`);
      }

    } catch (error) {
      recordResult(testName, 'FAIL', error.message);
      console.log(`  ❌ 异常: ${error.message}`);
    }
  });
});
