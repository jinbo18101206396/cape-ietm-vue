-- 注意：该页面对应的前台目录为views/projectconfigurationmanagement文件夹下
-- 如果你想更改到其他目录，请修改sql中component字段对应的值


INSERT INTO sys_permission(id, parent_id, name, url, component, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_route, is_leaf, keep_alive, hidden, hide_tab, description, status, del_flag, rule_flag, create_by, create_time, update_by, update_time, internal_or_external) 
VALUES ('2026021011321360270', NULL, '项目管理-项目构型管理', '/projectconfigurationmanagement/ietmProjectConfigurationManagementList', 'projectconfigurationmanagement/IetmProjectConfigurationManagementList', NULL, NULL, 0, NULL, '1', 0.00, 0, NULL, 1, 0, 0, 0, 0, NULL, '1', 0, 0, 'admin', '2026-02-10 11:32:27', NULL, NULL, 0);

-- 权限控制sql
-- 新增
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026021011321360271', '2026021011321360270', '添加项目管理-项目构型管理', NULL, NULL, 0, NULL, NULL, 2, 'projectconfigurationmanagement:ietm_project_configuration_management:add', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-02-10 11:32:27', NULL, NULL, 0, 0, '1', 0);
-- 编辑
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026021011321360272', '2026021011321360270', '编辑项目管理-项目构型管理', NULL, NULL, 0, NULL, NULL, 2, 'projectconfigurationmanagement:ietm_project_configuration_management:edit', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-02-10 11:32:27', NULL, NULL, 0, 0, '1', 0);
-- 删除
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026021011321360273', '2026021011321360270', '删除项目管理-项目构型管理', NULL, NULL, 0, NULL, NULL, 2, 'projectconfigurationmanagement:ietm_project_configuration_management:delete', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-02-10 11:32:27', NULL, NULL, 0, 0, '1', 0);
-- 批量删除
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026021011321360274', '2026021011321360270', '批量删除项目管理-项目构型管理', NULL, NULL, 0, NULL, NULL, 2, 'projectconfigurationmanagement:ietm_project_configuration_management:deleteBatch', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-02-10 11:32:27', NULL, NULL, 0, 0, '1', 0);
-- 导出excel
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026021011321360275', '2026021011321360270', '导出excel_项目管理-项目构型管理', NULL, NULL, 0, NULL, NULL, 2, 'projectconfigurationmanagement:ietm_project_configuration_management:exportXls', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-02-10 11:32:27', NULL, NULL, 0, 0, '1', 0);
-- 导入excel
INSERT INTO sys_permission(id, parent_id, name, url, component, is_route, component_name, redirect, menu_type, perms, perms_type, sort_no, always_show, icon, is_leaf, keep_alive, hidden, hide_tab, description, create_by, create_time, update_by, update_time, del_flag, rule_flag, status, internal_or_external)
VALUES ('2026021011321360276', '2026021011321360270', '导入excel_项目管理-项目构型管理', NULL, NULL, 0, NULL, NULL, 2, 'projectconfigurationmanagement:ietm_project_configuration_management:importExcel', '1', NULL, 0, NULL, 1, 0, 0, 0, NULL, 'admin', '2026-02-10 11:32:27', NULL, NULL, 0, 0, '1', 0);