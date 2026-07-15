-- 注意：该页面对应的前台目录为views/projectinformationcode文件夹下
-- 如果你想更改到其他目录，请修改sql中component字段对应的值


INSERT INTO sys_permission(id, parent_id, name, url, component, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_route, is_leaf, keep_alive, hidden, hide_tab, description, status, del_flag, rule_flag, create_by, create_time, update_by, update_time, internal_or_external) 
VALUES ('2026011210431790020', NULL, '项目管理-项目信息码管理', '/projectinformationcode/ietmProjectInformationCodeList', 'projectinformationcode/IetmProjectInformationCodeList', NULL, NULL, 0, NULL, '1', 0.00, 0, NULL, 1, 0, 0, 0, 0, NULL, '1', 0, 0, 'admin', '2026-01-12 10:43:02', NULL, NULL, 0);

-- 权限控制sql
-- 新增
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026011210431800021', '2026011210431790020', '添加项目管理-项目信息码管理', NULL, NULL, 0, NULL, NULL, 2, 'projectinformationcode:ietm_project_information_code:add', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-01-12 10:43:02', NULL, NULL, 0, 0, '1', 0);
-- 编辑
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026011210431800022', '2026011210431790020', '编辑项目管理-项目信息码管理', NULL, NULL, 0, NULL, NULL, 2, 'projectinformationcode:ietm_project_information_code:edit', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-01-12 10:43:02', NULL, NULL, 0, 0, '1', 0);
-- 删除
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026011210431800023', '2026011210431790020', '删除项目管理-项目信息码管理', NULL, NULL, 0, NULL, NULL, 2, 'projectinformationcode:ietm_project_information_code:delete', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-01-12 10:43:02', NULL, NULL, 0, 0, '1', 0);
-- 批量删除
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026011210431800024', '2026011210431790020', '批量删除项目管理-项目信息码管理', NULL, NULL, 0, NULL, NULL, 2, 'projectinformationcode:ietm_project_information_code:deleteBatch', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-01-12 10:43:02', NULL, NULL, 0, 0, '1', 0);
-- 导出excel
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026011210431800025', '2026011210431790020', '导出excel_项目管理-项目信息码管理', NULL, NULL, 0, NULL, NULL, 2, 'projectinformationcode:ietm_project_information_code:exportXls', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-01-12 10:43:02', NULL, NULL, 0, 0, '1', 0);
-- 导入excel
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026011210431800026', '2026011210431790020', '导入excel_项目管理-项目信息码管理', NULL, NULL, 0, NULL, NULL, 2, 'projectinformationcode:ietm_project_information_code:importExcel', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-01-12 10:43:02', NULL, NULL, 0, 0, '1', 0);