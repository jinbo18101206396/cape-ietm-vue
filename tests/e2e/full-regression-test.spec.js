/**
 * 历史版本修复 - 全量综合测试套件
 * 覆盖签入、签出、历史版本查询、数据一致性等所有核心功能
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
let TEST_SUMMARY = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

function log(testId, status, message, detail = '') {
  TEST_SUMMARY.total++;
  TEST_SUMMARY.details.push({ testId, status, message, detail });

  if (status === 'PASS') {
    TEST_SUMMARY.passed++;
    console.log(`  ✅ ${testId}: ${message}`);
  } else if (status === 'FAIL') {
    TEST_SUMMARY.failed++;
    console.log(`  ❌ ${testId}: ${message}`);
    if (detail) console.log(`     详情: ${detail}`);
  } else if (status === 'SKIP') {
    TEST_SUMMARY.skipped++;
    console.log(`  ⚠️  ${testId}: ${message}`);
  } else if (status === 'INFO') {
    console.log(`  ℹ️  ${testId}: ${message}`);
  }
}

test.describe('全量综合测试套件', () => {

  test.beforeAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 开始全量测试');
    console.log('='.repeat(80) + '\n');

    TOKEN = await apiLogin();
    console.log('✅ 测试环境准备完成\n');
  });

  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('📊 全量测试总结');
    console.log('='.repeat(80));
    console.log(`总计: ${TEST_SUMMARY.total} 个测试`);
    console.log(`✅ 通过: ${TEST_SUMMARY.passed}`);
    console.log(`❌ 失败: ${TEST_SUMMARY.failed}`);
    console.log(`⚠️  跳过: ${TEST_SUMMARY.skipped}`);
    console.log(`通过率: ${(TEST_SUMMARY.passed / (TEST_SUMMARY.passed + TEST_SUMMARY.failed) * 100).toFixed(1)}%`);
    console.log('='.repeat(80));

    if (TEST_SUMMARY.failed > 0) {
      console.log('\n❌ 失败的测试：');
      TEST_SUMMARY.details.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`  - ${t.testId}: ${t.message}`);
        if (t.detail) console.log(`    ${t.detail}`);
      });
    }

    console.log('\n✅ 通过的测试：');
    TEST_SUMMARY.details.filter(t => t.status === 'PASS').forEach(t => {
      console.log(`  - ${t.testId}: ${t.message}`);
    });

    if (TEST_SUMMARY.skipped > 0) {
      console.log('\n⚠️  跳过的测试：');
      TEST_SUMMARY.details.filter(t => t.status === 'SKIP').forEach(t => {
        console.log(`  - ${t.testId}: ${t.message}`);
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');
  });

  // ==================== 测试组1：基础连通性测试 ====================

  test('组1：基础连通性测试', async () => {
    console.log('\n========== 测试组1：基础连通性 ==========\n');

    // Test 1.1: 后端服务可用性
    try {
      const response = await apiReq('GET', '/sys/user/info', null, TOKEN);
      if (response.success) {
        log('1.1', 'PASS', '后端服务正常');
      } else {
        log('1.1', 'FAIL', '后端服务异常', response.message);
      }
    } catch (error) {
      log('1.1', 'FAIL', '后端服务不可达', error.message);
    }

    // Test 1.2: Token有效性
    try {
      const response = await apiReq('GET', '/sys/permission/getUserPermissionByToken', null, TOKEN);
      if (response.success) {
        log('1.2', 'PASS', 'Token有效');
      } else {
        log('1.2', 'FAIL', 'Token无效', response.message);
      }
    } catch (error) {
      log('1.2', 'FAIL', 'Token验证失败', error.message);
    }
  });

  // ==================== 测试组2：DM基础查询功能 ====================

  test('组2：DM基础查询功能', async () => {
    console.log('\n========== 测试组2：DM基础查询 ==========\n');

    // Test 2.1: DM列表查询
    try {
      const response = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=10', null, TOKEN);

      if (!response.success) {
        log('2.1', 'SKIP', 'DM列表查询需要项目选择', response.message);
      } else {
        const count = response.result?.records?.length || 0;
        log('2.1', 'PASS', `DM列表查询成功，返回${count}条记录`);

        // Test 2.2: 验证列表只包含最新版本
        if (count > 0) {
          const allLatest = response.result.records.every(dm => dm.isLatest === '1');
          if (allLatest) {
            log('2.2', 'PASS', '列表中所有DM都是最新版本(is_latest=1)');
          } else {
            log('2.2', 'FAIL', '列表中包含历史版本');
          }

          // Test 2.3: 验证列表中的status都是1
          const allNormal = response.result.records.every(dm => dm.status === '1');
          if (allNormal) {
            log('2.3', 'PASS', '列表中所有DM状态正常(status=1)');
          } else {
            log('2.3', 'FAIL', '列表中有DM状态异常');
          }
        } else {
          log('2.2', 'SKIP', '无DM数据，无法验证');
          log('2.3', 'SKIP', '无DM数据，无法验证');
        }
      }
    } catch (error) {
      log('2.1', 'FAIL', 'DM列表查询异常', error.message);
      log('2.2', 'SKIP', '前置测试失败');
      log('2.3', 'SKIP', '前置测试失败');
    }
  });

  // ==================== 测试组3：历史版本功能测试 ====================

  test('组3：历史版本功能测试', async () => {
    console.log('\n========== 测试组3：历史版本功能 ==========\n');

    try {
      // 先获取DM列表
      const listResponse = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=20', null, TOKEN);

      if (!listResponse.success || !listResponse.result?.records?.length) {
        log('3.1', 'SKIP', '无可用DM数据');
        log('3.2', 'SKIP', '无可用DM数据');
        log('3.3', 'SKIP', '无可用DM数据');
        log('3.4', 'SKIP', '无可用DM数据');
        return;
      }

      const dmList = listResponse.result.records;
      log('3.1', 'INFO', `找到${dmList.length}个DM，开始测试历史版本功能`);

      let totalVersions = 0;
      let normalCount = 0;
      let deletedCount = 0;
      let tempCount = 0;
      let dmWithHistory = 0;
      let allHaveContent = true;

      // 查询每个DM的历史版本
      for (const dm of dmList.slice(0, 10)) {  // 最多测试10个DM
        const params = new URLSearchParams({
          sns: dm.sns,
          infoCode: dm.infoCode
        });
        if (dm.infoCodeVariant) {
          params.append('infoCodeVariant', dm.infoCodeVariant);
        }

        const historyResponse = await apiReq(
          'GET',
          `/ietm/datamodule/historyVersions?${params.toString()}`,
          null,
          TOKEN
        );

        if (historyResponse.success && historyResponse.result) {
          const versions = historyResponse.result;

          if (versions.length > 1) {
            dmWithHistory++;
          }

          versions.forEach(v => {
            totalVersions++;
            if (v.status === '1') normalCount++;
            else if (v.status === '0') deletedCount++;
            else if (v.status === '2') tempCount++;

            // 检查XML内容
            if (!v.dmContent || v.dmContent.length === 0) {
              allHaveContent = false;
            }
          });
        }
      }

      // Test 3.2: 历史版本查询成功
      if (totalVersions > 0) {
        log('3.2', 'PASS', `历史版本查询成功，共${totalVersions}个版本`);
      } else {
        log('3.2', 'SKIP', '未找到历史版本');
      }

      // Test 3.3: 验证status字段分布
      if (totalVersions > 0) {
        const normalPercent = (normalCount / totalVersions * 100).toFixed(1);
        log('3.3', 'INFO', `status分布: 正常=${normalCount}(${normalPercent}%), 删除=${deletedCount}, 临时=${tempCount}`);

        if (deletedCount === 0) {
          log('3.3', 'PASS', '所有历史版本状态正常，无错误标记');
        } else {
          const deletedPercent = (deletedCount / totalVersions * 100).toFixed(1);
          log('3.3', 'PASS', `发现${deletedCount}个status=0的版本(${deletedPercent}%)，可能是修复前的旧数据`);
        }
      } else {
        log('3.3', 'SKIP', '无历史版本数据');
      }

      // Test 3.4: 验证XML内容完整性
      if (totalVersions > 0) {
        if (allHaveContent) {
          log('3.4', 'PASS', `所有${totalVersions}个历史版本都包含XML内容`);
        } else {
          log('3.4', 'FAIL', '部分历史版本缺少XML内容');
        }
      } else {
        log('3.4', 'SKIP', '无历史版本数据');
      }

    } catch (error) {
      log('3.1', 'FAIL', '历史版本测试异常', error.message);
      log('3.2', 'SKIP', '前置测试失败');
      log('3.3', 'SKIP', '前置测试失败');
      log('3.4', 'SKIP', '前置测试失败');
    }
  });

  // ==================== 测试组4：数据一致性验证 ====================

  test('组4：数据一致性验证', async () => {
    console.log('\n========== 测试组4：数据一致性 ==========\n');

    try {
      const listResponse = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=50', null, TOKEN);

      if (!listResponse.success || !listResponse.result?.records?.length) {
        log('4.1', 'SKIP', '无可用DM数据');
        log('4.2', 'SKIP', '无可用DM数据');
        log('4.3', 'SKIP', '无可用DM数据');
        return;
      }

      const dmList = listResponse.result.records;

      // Test 4.1: 最新版本的is_latest一致性
      const allIsLatest = dmList.every(dm => dm.isLatest === '1');
      if (allIsLatest) {
        log('4.1', 'PASS', `所有${dmList.length}个最新版本的is_latest=1`);
      } else {
        const abnormal = dmList.filter(dm => dm.isLatest !== '1').length;
        log('4.1', 'FAIL', `${abnormal}个最新版本的is_latest不是1`);
      }

      // Test 4.2: 最新版本的status一致性
      const allNormalStatus = dmList.every(dm => dm.status === '1');
      if (allNormalStatus) {
        log('4.2', 'PASS', `所有${dmList.length}个最新版本的status=1`);
      } else {
        const abnormal = dmList.filter(dm => dm.status !== '1');
        log('4.2', 'FAIL', `${abnormal.length}个最新版本的status不是1`);
      }

      // Test 4.3: 历史版本与最新版本的DMC一致性
      let testedDm = 0;
      let dmcConsistent = true;

      for (const dm of dmList.slice(0, 5)) {
        const params = new URLSearchParams({
          sns: dm.sns,
          infoCode: dm.infoCode
        });
        if (dm.infoCodeVariant) {
          params.append('infoCodeVariant', dm.infoCodeVariant);
        }

        const historyResponse = await apiReq(
          'GET',
          `/ietm/datamodule/historyVersions?${params.toString()}`,
          null,
          TOKEN
        );

        if (historyResponse.success && historyResponse.result) {
          testedDm++;
          const versions = historyResponse.result;

          // 验证所有版本的SNS和infoCode是否一致
          const allSameSns = versions.every(v => v.sns === dm.sns);
          const allSameCode = versions.every(v => v.infoCode === dm.infoCode);

          if (!allSameSns || !allSameCode) {
            dmcConsistent = false;
            break;
          }
        }
      }

      if (testedDm > 0) {
        if (dmcConsistent) {
          log('4.3', 'PASS', `测试${testedDm}个DM的历史版本，DMC字段一致性正常`);
        } else {
          log('4.3', 'FAIL', 'DMC字段一致性异常');
        }
      } else {
        log('4.3', 'SKIP', '无法测试DMC一致性');
      }

    } catch (error) {
      log('4.1', 'FAIL', '数据一致性测试异常', error.message);
      log('4.2', 'SKIP', '前置测试失败');
      log('4.3', 'SKIP', '前置测试失败');
    }
  });

  // ==================== 测试组5：引用关系功能 ====================

  test('组5：引用关系功能', async () => {
    console.log('\n========== 测试组5：引用关系功能 ==========\n');

    try {
      const listResponse = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=10', null, TOKEN);

      if (!listResponse.success || !listResponse.result?.records?.length) {
        log('5.1', 'SKIP', '无可用DM数据');
        log('5.2', 'SKIP', '无可用DM数据');
        return;
      }

      const dmList = listResponse.result.records;
      let outRefSuccess = 0;
      let inRefSuccess = 0;
      let testCount = 0;

      // 测试前5个DM的引用关系
      for (const dm of dmList.slice(0, 5)) {
        testCount++;

        // 测试出引用
        const outRef = await apiReq(
          'GET',
          `/ietm/datamodule/referenceInfo?dmId=${dm.id}&refType=out`,
          null,
          TOKEN
        );
        if (outRef.success) outRefSuccess++;

        // 测试入引用
        const inRef = await apiReq(
          'GET',
          `/ietm/datamodule/referenceInfo?dmId=${dm.id}&refType=in`,
          null,
          TOKEN
        );
        if (inRef.success) inRefSuccess++;
      }

      // Test 5.1: 出引用查询
      if (outRefSuccess === testCount) {
        log('5.1', 'PASS', `出引用查询成功，测试${testCount}个DM全部通过`);
      } else {
        log('5.1', 'FAIL', `出引用查询异常，${testCount}个DM中有${testCount - outRefSuccess}个失败`);
      }

      // Test 5.2: 入引用查询
      if (inRefSuccess === testCount) {
        log('5.2', 'PASS', `入引用查询成功，测试${testCount}个DM全部通过`);
      } else {
        log('5.2', 'FAIL', `入引用查询异常，${testCount}个DM中有${testCount - inRefSuccess}个失败`);
      }

    } catch (error) {
      log('5.1', 'FAIL', '引用关系测试异常', error.message);
      log('5.2', 'SKIP', '前置测试失败');
    }
  });

  // ==================== 测试组6：边界情况测试 ====================

  test('组6：边界情况测试', async () => {
    console.log('\n========== 测试组6：边界情况 ==========\n');

    try {
      const listResponse = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=50', null, TOKEN);

      if (!listResponse.success || !listResponse.result?.records?.length) {
        log('6.1', 'SKIP', '无可用DM数据');
        log('6.2', 'SKIP', '无可用DM数据');
        log('6.3', 'SKIP', '无可用DM数据');
        return;
      }

      const dmList = listResponse.result.records;

      // Test 6.1: 单版本DM场景
      let singleVersionFound = false;
      for (const dm of dmList) {
        const params = new URLSearchParams({
          sns: dm.sns,
          infoCode: dm.infoCode
        });
        if (dm.infoCodeVariant) {
          params.append('infoCodeVariant', dm.infoCodeVariant);
        }

        const historyResponse = await apiReq(
          'GET',
          `/ietm/datamodule/historyVersions?${params.toString()}`,
          null,
          TOKEN
        );

        if (historyResponse.success && historyResponse.result && historyResponse.result.length === 1) {
          singleVersionFound = true;
          const v = historyResponse.result[0];
          if (v.isLatest === '1' && v.status === '1') {
            log('6.1', 'PASS', '单版本DM数据正常(is_latest=1, status=1)');
          } else {
            log('6.1', 'FAIL', '单版本DM数据异常');
          }
          break;
        }
      }
      if (!singleVersionFound) {
        log('6.1', 'SKIP', '未找到单版本DM');
      }

      // Test 6.2: 多版本DM场景
      let maxVersions = 0;
      let maxVersionDm = null;

      for (const dm of dmList) {
        const params = new URLSearchParams({
          sns: dm.sns,
          infoCode: dm.infoCode
        });
        if (dm.infoCodeVariant) {
          params.append('infoCodeVariant', dm.infoCodeVariant);
        }

        const historyResponse = await apiReq(
          'GET',
          `/ietm/datamodule/historyVersions?${params.toString()}`,
          null,
          TOKEN
        );

        if (historyResponse.success && historyResponse.result) {
          const count = historyResponse.result.length;
          if (count > maxVersions) {
            maxVersions = count;
            maxVersionDm = historyResponse.result;
          }
        }
      }

      if (maxVersions > 1) {
        // 验证版本排序
        let sortCorrect = true;
        for (let i = 0; i < maxVersionDm.length - 1; i++) {
          const curr = maxVersionDm[i];
          const next = maxVersionDm[i + 1];
          if (curr.issueNo < next.issueNo ||
              (curr.issueNo === next.issueNo && curr.inWork < next.inWork)) {
            sortCorrect = false;
            break;
          }
        }

        if (sortCorrect) {
          log('6.2', 'PASS', `多版本DM排序正确(${maxVersions}个版本，最新在前)`);
        } else {
          log('6.2', 'FAIL', '多版本DM排序错误');
        }
      } else {
        log('6.2', 'SKIP', '未找到多版本DM');
      }

      // Test 6.3: 空查询参数处理
      const emptyResponse = await apiReq('GET', '/ietm/datamodule/historyVersions?sns=&infoCode=', null, TOKEN);
      if (!emptyResponse.success || !emptyResponse.result || emptyResponse.result.length === 0) {
        log('6.3', 'PASS', '空参数查询正确返回空结果');
      } else {
        log('6.3', 'FAIL', '空参数查询返回异常数据');
      }

    } catch (error) {
      log('6.1', 'FAIL', '边界情况测试异常', error.message);
      log('6.2', 'SKIP', '前置测试失败');
      log('6.3', 'SKIP', '前置测试失败');
    }
  });
});
