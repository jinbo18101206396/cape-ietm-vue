/**
 * 通过API创建测试DM数据
 */

const { test, expect } = require('@playwright/test');

test('通过API创建测试DM', async ({ request, page }) => {
  console.log('\n=== 步骤1: 登录获取token ===');

  const loginResponse = await request.post('http://localhost:9999/sys/login', {
    data: {
      username: 'admin',
      password: '123456'
    }
  });

  const loginData = await loginResponse.json();
  console.log('登录结果:', loginData.success ? '成功' : '失败');

  if (!loginData.success) {
    console.log('登录失败，无法创建测试数据');
    return;
  }

  const token = loginData.result.token;
  console.log('Token:', token.substring(0, 50) + '...');

  // 尝试查询现有DM
  console.log('\n=== 步骤2: 查询现有DM ===');
  const listResponse = await request.get('http://localhost:9999/ietm/ietmDataModule/list', {
    headers: {
      'X-Access-Token': token
    },
    params: {
      pageNo: 1,
      pageSize: 10
    }
  });

  const listData = await listResponse.json();
  console.log('查询结果:', listData.success ? '成功' : '失败');
  console.log('现有DM数量:', listData.result?.records?.length || 0);

  if (listData.result?.records?.length > 0) {
    console.log('\n✓ 数据库已有DM记录，可以直接使用');
    const firstDm = listData.result.records[0];
    console.log('第一个DM信息:');
    console.log('  ID:', firstDm.id);
    console.log('  DMC:', firstDm.dmCode || 'N/A');
    console.log('  标题:', firstDm.techName || 'N/A');
    console.log('  签出状态:', firstDm.checkoutStatus);
    return;
  }

  // 尝试创建新DM
  console.log('\n=== 步骤3: 创建测试DM ===');

  const newDm = {
    projectId: '1', // 假设项目ID为1
    dmCode: 'DMC-TEST-001',
    modelIdentCode: 'TEST',
    systemDiffCode: '001',
    systemCode: 'A',
    subSystemCode: '00',
    subSubSystemCode: 'A',
    assyCode: '00',
    disassyCode: '0',
    disassyCodeVariant: 'A',
    infoCode: '001',
    infoCodeVariant: 'A',
    itemLocationCode: 'A',
    techName: '测试DM模块',
    securityClassification: 'unclassified',
    language: 'zh',
    issueType: 'N',
    issueNumber: '001',
    inWork: '01',
    standardType: 'S1000D4.2',
    dmType: 'description'
  };

  console.log('尝试创建DM，数据:', JSON.stringify(newDm, null, 2).substring(0, 300));

  const createResponse = await request.post('http://localhost:9999/ietm/ietmDataModule/add', {
    headers: {
      'X-Access-Token': token,
      'Content-Type': 'application/json'
    },
    data: newDm
  });

  const createData = await createResponse.json();
  console.log('\n创建结果:', createData.success ? '成功' : '失败');

  if (createData.success) {
    console.log('✓ 测试DM创建成功');
    console.log('  新DM ID:', createData.result?.id || createData.result);
  } else {
    console.log('✗ 创建失败:', createData.message);
    console.log('  详细信息:', JSON.stringify(createData, null, 2).substring(0, 500));

    // 可能需要先创建项目
    console.log('\n=== 步骤4: 尝试查询项目列表 ===');
    const projectResponse = await request.get('http://localhost:9999/ietm/ietmProject/list', {
      headers: {
        'X-Access-Token': token
      },
      params: {
        pageNo: 1,
        pageSize: 10
      }
    });

    const projectData = await projectResponse.json();
    console.log('项目查询结果:', projectData.success ? '成功' : '失败');
    console.log('项目数量:', projectData.result?.records?.length || 0);

    if (projectData.result?.records?.length > 0) {
      const firstProject = projectData.result.records[0];
      console.log('第一个项目信息:');
      console.log('  ID:', firstProject.id);
      console.log('  名称:', firstProject.projectName);
      console.log('  标准:', firstProject.standardType);

      // 使用实际项目ID重新创建DM
      newDm.projectId = firstProject.id;
      console.log('\n=== 步骤5: 使用实际项目ID重新创建DM ===');

      const retryResponse = await request.post('http://localhost:9999/ietm/ietmDataModule/add', {
        headers: {
          'X-Access-Token': token,
          'Content-Type': 'application/json'
        },
        data: newDm
      });

      const retryData = await retryResponse.json();
      console.log('重试结果:', retryData.success ? '成功' : '失败');

      if (retryData.success) {
        console.log('✓ 测试DM创建成功');
      } else {
        console.log('✗ 仍然失败:', retryData.message);
      }
    }
  }
});
