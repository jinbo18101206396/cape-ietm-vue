-- 前置条件修复 - 测试数据准备脚本（达梦数据库）

-- 1. 查找可用的测试DM（至少需要3个未签出的DM）
SELECT id, dmc_code, workflow_instance_id, workflow_step, checkout_status, tech_name
FROM ietm_data_module
WHERE checkout_status = '0'  -- 未签出
ORDER BY create_time DESC
LIMIT 10;

-- 记录上面查询结果中的3个DM ID和DMC代码，然后执行下面的修改

-- 2. 创建测试场景1：工作流未启动
-- 替换 'YOUR_DM_ID_1' 为实际的DM ID
UPDATE ietm_data_module
SET workflow_instance_id = NULL,
    workflow_step = NULL,
    checkout_status = '0',
    update_time = SYSDATE
WHERE id = 'YOUR_DM_ID_1';

-- 验证修改
SELECT id, dmc_code, workflow_instance_id, workflow_step, checkout_status
FROM ietm_data_module
WHERE id = 'YOUR_DM_ID_1';

-- 3. 创建测试场景2：非DM编写节点
-- 替换 'YOUR_DM_ID_2' 为实际的DM ID
UPDATE ietm_data_module
SET workflow_instance_id = 'test-workflow-12345',
    workflow_step = '技术审核',  -- 不是"DM编写"
    checkout_status = '0',
    update_time = SYSDATE
WHERE id = 'YOUR_DM_ID_2';

-- 验证修改
SELECT id, dmc_code, workflow_instance_id, workflow_step, checkout_status
FROM ietm_data_module
WHERE id = 'YOUR_DM_ID_2';

-- 4. 创建测试场景3：正常状态
-- 替换 'YOUR_DM_ID_3' 为实际的DM ID
UPDATE ietm_data_module
SET workflow_instance_id = 'valid-workflow-67890',
    workflow_step = 'DM编写',
    checkout_status = '0',
    update_time = SYSDATE
WHERE id = 'YOUR_DM_ID_3';

-- 验证修改
SELECT id, dmc_code, workflow_instance_id, workflow_step, checkout_status
FROM ietm_data_module
WHERE id = 'YOUR_DM_ID_3';

-- 5. 记录测试DM信息（用于Playwright测试）
SELECT
    id,
    dmc_code,
    workflow_instance_id,
    workflow_step,
    checkout_status,
    CASE
        WHEN workflow_instance_id IS NULL THEN 'TEST1_NO_WORKFLOW'
        WHEN workflow_step = '技术审核' THEN 'TEST2_WRONG_STEP'
        WHEN workflow_step = 'DM编写' THEN 'TEST3_VALID'
    END as test_scenario
FROM ietm_data_module
WHERE id IN ('YOUR_DM_ID_1', 'YOUR_DM_ID_2', 'YOUR_DM_ID_3')
ORDER BY test_scenario;

-- 6. 测试完成后，恢复数据（可选）
/*
UPDATE ietm_data_module
SET workflow_instance_id = 'normal-workflow-id',
    workflow_step = 'DM编写',
    checkout_status = '0',
    update_time = SYSDATE
WHERE id IN ('YOUR_DM_ID_1', 'YOUR_DM_ID_2', 'YOUR_DM_ID_3');
*/
