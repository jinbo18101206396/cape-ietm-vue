/**
 * 准备测试数据 - 通过后端API修改DM状态
 */

const { test } = require('@playwright/test');

const API_BASE = 'http://localhost:9999/jeecg-boot';
const USERNAME = 'admin';
const PASSWORD = '123456';

test('准备测试数据 - 修改DM状态创建测试场景', async ({ request }) => {
  console.log('=== 开始准备测试数据 ===\n');

  // 1. 登录获取token
  console.log('步骤1: 登录系统...');
  const loginResp = await request.post(`${API_BASE}/sys/login`, {
    data: { username: USERNAME, password: PASSWORD }
  });
  const loginData = await loginResp.json();
  const token = loginData.result.token;
  console.log('✅ 登录成功\n');

  // 2. 打开项目
  console.log('步骤2: 查询并打开项目...');
  const projectListResp = await request.get(`${API_BASE}/ietmproject/ietmProject/list`, {
    headers: { 'X-Access-Token': token },
    params: { pageNo: 1, pageSize: 10 }
  });
  const projects = await projectListResp.json();

  if (projects.success && projects.result.records.length > 0) {
    const projectId = projects.result.records[0].id;
    const projectName = projects.result.records[0].name;

    await request.post(`${API_BASE}/ietmproject/ietmProject/openProject`, {
      headers: { 'X-Access-Token': token },
      data: { projectId }
    });
    console.log(`✅ 已打开项目: ${projectName}\n`);
  }

  // 3. 查询DM列表
  console.log('步骤3: 查询DM列表...');
  const dmListResp = await request.get(`${API_BASE}/ietm/datamodule/list`, {
    headers: { 'X-Access-Token': token },
    params: { pageNo: 1, pageSize: 20 }
  });
  const dmList = await dmListResp.json();

  if (!dmList.success) {
    console.log('❌ 无法获取DM列表:', dmList.message);
    return;
  }

  const dms = dmList.result.records;
  console.log(`✅ 找到 ${dms.length} 个DM\n`);

  if (dms.length < 3) {
    console.log('❌ DM数量不足（至少需要3个）');
    return;
  }

  // 4. 修改DM状态创建测试场景
  console.log('步骤4: 修改DM状态创建测试场景...\n');

  const testDms = [];

  // 场景1: 工作流未启动（找一个已签出的DM，先签入，再修改状态）
  const dm1 = dms.find(dm => dm.checkoutStatus === '0') || dms[0];
  if (dm1) {
    console.log(`场景1: 工作流未启动`);
    console.log(`  DM ID: ${dm1.id}`);
    console.log(`  DMC: ${dm1.dmcCode}`);

    // 如果已签出，先签入
    if (dm1.checkoutStatus === '1') {
      console.log('  操作: 先签入DM...');
      await request.put(`${API_BASE}/ietm/datamodule/checkin`, {
        headers: { 'X-Access-Token': token },
        data: { id: dm1.id }
      }).catch(() => console.log('  签入失败（可能权限问题）'));
    }

    // 修改状态：清空工作流字段
    console.log('  操作: 修改工作流状态（设置为NULL）...');
    const updateResp = await request.put(`${API_BASE}/ietm/datamodule/edit`, {
      headers: { 'X-Access-Token': token },
      data: {
        id: dm1.id,
        dmcCode: dm1.dmcCode,
        workflowInstanceId: null,
        workflowStep: null,
        checkoutStatus: '0'
      }
    });

    const updateResult = await updateResp.json();
    if (updateResult.success) {
      console.log('  ✅ 修改成功');
      testDms.push({ scenario: '工作流未启动', dmcCode: dm1.dmcCode, id: dm1.id });
    } else {
      console.log(`  ❌ 修改失败: ${updateResult.message}`);
    }
    console.log('');
  }

  // 场景2: 非DM编写节点
  const dm2 = dms.find(dm => dm.id !== dm1.id && dm.checkoutStatus === '0') || dms[1];
  if (dm2) {
    console.log(`场景2: 非DM编写节点`);
    console.log(`  DM ID: ${dm2.id}`);
    console.log(`  DMC: ${dm2.dmcCode}`);

    if (dm2.checkoutStatus === '1') {
      console.log('  操作: 先签入DM...');
      await request.put(`${API_BASE}/ietm/datamodule/checkin`, {
        headers: { 'X-Access-Token': token },
        data: { id: dm2.id }
      }).catch(() => {});
    }

    console.log('  操作: 修改工作流步骤为"技术审核"...');
    const updateResp = await request.put(`${API_BASE}/ietm/datamodule/edit`, {
      headers: { 'X-Access-Token': token },
      data: {
        id: dm2.id,
        dmcCode: dm2.dmcCode,
        workflowInstanceId: 'test-workflow-12345',
        workflowStep: '技术审核',
        checkoutStatus: '0'
      }
    });

    const updateResult = await updateResp.json();
    if (updateResult.success) {
      console.log('  ✅ 修改成功');
      testDms.push({ scenario: '非DM编写节点', dmcCode: dm2.dmcCode, id: dm2.id });
    } else {
      console.log(`  ❌ 修改失败: ${updateResult.message}`);
    }
    console.log('');
  }

  // 场景3: 正常状态
  const dm3 = dms.find(dm => dm.id !== dm1.id && dm.id !== dm2.id && dm.checkoutStatus === '0') || dms[2];
  if (dm3) {
    console.log(`场景3: 正常状态（应该能进入确认对话框）`);
    console.log(`  DM ID: ${dm3.id}`);
    console.log(`  DMC: ${dm3.dmcCode}`);

    if (dm3.checkoutStatus === '1') {
      console.log('  操作: 先签入DM...');
      await request.put(`${API_BASE}/ietm/datamodule/checkin`, {
        headers: { 'X-Access-Token': token },
        data: { id: dm3.id }
      }).catch(() => {});
    }

    console.log('  操作: 设置为正常工作流状态...');
    const updateResp = await request.put(`${API_BASE}/ietm/datamodule/edit`, {
      headers: { 'X-Access-Token': token },
      data: {
        id: dm3.id,
        dmcCode: dm3.dmcCode,
        workflowInstanceId: 'valid-workflow-67890',
        workflowStep: 'DM编写',
        checkoutStatus: '0'
      }
    });

    const updateResult = await updateResp.json();
    if (updateResult.success) {
      console.log('  ✅ 修改成功');
      testDms.push({ scenario: '正常状态', dmcCode: dm3.dmcCode, id: dm3.id });
    } else {
      console.log(`  ❌ 修改失败: ${updateResult.message}`);
    }
    console.log('');
  }

  // 5. 输出测试配置
  console.log('=== 测试数据准备完成 ===\n');
  console.log('测试DM配置（复制以下内容到UI测试脚本）：\n');
  console.log('const TEST_DMS = [');
  testDms.forEach(dm => {
    console.log(`  { scenario: '${dm.scenario}', dmcCode: '${dm.dmcCode}', id: '${dm.id}' },`);
  });
  console.log('];\n');

  console.log('请立即运行UI测试脚本验证！');
});
