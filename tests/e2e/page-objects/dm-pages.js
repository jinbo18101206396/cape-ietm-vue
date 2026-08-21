/**
 * 登录页面对象模型
 */
class LoginPage {
  constructor(page) {
    this.page = page;

    // 选择器
    this.usernameInput = 'input[placeholder*="账号"]';
    this.passwordInput = 'input[placeholder*="密码"]';
    this.loginButton = 'button[type="submit"]';
    this.verifyCodeInput = 'input[placeholder*="验证码"]';
  }

  /**
   * 导航到登录页
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 执行登录
   */
  async login(username = 'admin', password = 'admin') {
    await this.page.fill(this.usernameInput, username);
    await this.page.fill(this.passwordInput, password);

    // 如果有验证码，尝试输入（可能需要OCR或手动处理）
    const verifyCodeVisible = await this.page.locator(this.verifyCodeInput).isVisible({ timeout: 2000 }).catch(() => false);
    if (verifyCodeVisible) {
      console.log('⚠️  需要手动输入验证码');
      await this.page.waitForTimeout(10000); // 等待手动输入
    }

    await this.page.click(this.loginButton);

    // 等待登录成功（跳转到首页或看到用户菜单）
    await this.page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => {
      return this.page.waitForSelector('.ant-layout-header', { timeout: 5000 });
    });

    console.log('✅ 登录成功');
  }

  /**
   * 检查是否已登录
   */
  async isLoggedIn() {
    try {
      await this.page.waitForSelector('.ant-layout-header', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 数据模块管理页面对象模型
 */
class DataModuleListPage {
  constructor(page) {
    this.page = page;

    // 选择器
    this.menuItem = 'text=数据模块管理';
    this.copyButton = 'button:has-text("复制")';
    this.copyNewButton = 'button:has-text("复制新建")';
    this.tableRow = '.ant-table-tbody tr';
    this.checkbox = '.ant-checkbox-input';
    this.treeNode = '.ant-tree-node-content-wrapper';
    this.modal = '.ant-modal';
    this.modalOkButton = '.ant-modal-footer button.ant-btn-primary';
    this.messageSuccess = '.ant-message-success';
    this.messageError = '.ant-message-error';
  }

  /**
   * 导航到数据模块管理页面
   */
  async goto() {
    // 点击菜单项
    await this.page.click(this.menuItem);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    console.log('✅ 进入数据模块管理页面');
  }

  /**
   * 选择构型树节点
   */
  async selectTreeNode(nodeName) {
    const node = this.page.locator(this.treeNode, { hasText: nodeName }).first();
    await node.waitFor({ state: 'visible', timeout: 5000 });
    await node.click();
    await this.page.waitForTimeout(1000);
    console.log(`✅ 选择了树节点: ${nodeName}`);
  }

  /**
   * 选择表格第一行
   */
  async selectFirstRow() {
    const firstRow = this.page.locator(this.tableRow).first();
    await firstRow.waitFor({ state: 'visible', timeout: 5000 });

    const checkbox = firstRow.locator(this.checkbox).first();
    await checkbox.check();
    await this.page.waitForTimeout(500);
    console.log('✅ 选择了第一行数据');
  }

  /**
   * 点击复制按钮
   */
  async clickCopyButton() {
    await this.page.click(this.copyButton);
    await this.page.waitForTimeout(500);
    console.log('✅ 点击了复制按钮');
  }

  /**
   * 点击复制新建按钮
   */
  async clickCopyNewButton() {
    await this.page.click(this.copyNewButton);
    await this.page.waitForTimeout(1000);
    console.log('✅ 点击了复制新建按钮');
  }

  /**
   * 等待成功消息
   */
  async waitForSuccessMessage(text) {
    await this.page.waitForSelector(this.messageSuccess, { timeout: 5000 });
    const message = await this.page.locator(this.messageSuccess).textContent();
    console.log(`✅ 成功消息: ${message}`);
    return message.includes(text);
  }

  /**
   * 检查错误消息
   */
  async hasErrorMessage() {
    try {
      await this.page.waitForSelector(this.messageError, { timeout: 2000 });
      const message = await this.page.locator(this.messageError).textContent();
      console.log(`❌ 错误消息: ${message}`);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 复制DM弹窗对象模型
 */
class DmCopyModal {
  constructor(page) {
    this.page = page;

    // 选择器
    this.modal = '.ant-modal:has-text("复制")';
    this.snsInput = 'input[placeholder*="SNS"]';
    this.techNameInput = 'input[placeholder*="技术名称"]';
    this.infoCodeInput = 'input[placeholder*="信息码"]';
    this.infoCodeVariantInput = 'input[placeholder*="信息码变体"]';
    this.locationCodeSelect = '.ant-select:has-text("位置码")';
    this.learnCodeInput = 'input[placeholder*="学习码"]';
    this.learnEventCodeInput = 'input[placeholder*="学习事件码"]';
    this.infoNameInput = 'input[placeholder*="信息名称"]';
    this.dmcPreview = 'input[value*="DMC-"]';
    this.okButton = '.ant-modal-footer button.ant-btn-primary';
    this.cancelButton = '.ant-modal-footer button:not(.ant-btn-primary)';
  }

  /**
   * 等待弹窗出现
   */
  async waitForModal() {
    await this.page.waitForSelector(this.modal, { timeout: 5000 });
    await this.page.waitForTimeout(1000); // 等待数据加载
    console.log('✅ 复制DM弹窗已打开');
  }

  /**
   * 获取SNS值
   */
  async getSNS() {
    const value = await this.page.locator(this.snsInput).inputValue();
    console.log(`📋 SNS: ${value}`);
    return value;
  }

  /**
   * 获取技术名称
   */
  async getTechName() {
    const value = await this.page.locator(this.techNameInput).inputValue();
    console.log(`📋 技术名称: ${value}`);
    return value;
  }

  /**
   * 修改信息码
   */
  async setInfoCode(code) {
    await this.page.fill(this.infoCodeInput, code);
    await this.page.waitForTimeout(300);
    console.log(`✏️  设置信息码: ${code}`);
  }

  /**
   * 修改信息码变体
   */
  async setInfoCodeVariant(variant) {
    await this.page.fill(this.infoCodeVariantInput, variant);
    await this.page.waitForTimeout(300);
    console.log(`✏️  设置信息码变体: ${variant}`);
  }

  /**
   * 设置学习码
   */
  async setLearnCode(code) {
    await this.page.fill(this.learnCodeInput, code);
    await this.page.waitForTimeout(300);
    console.log(`✏️  设置学习码: ${code}`);
  }

  /**
   * 设置学习事件码
   */
  async setLearnEventCode(code) {
    await this.page.fill(this.learnEventCodeInput, code);
    await this.page.waitForTimeout(300);
    console.log(`✏️  设置学习事件码: ${code}`);
  }

  /**
   * 获取DMC预览
   */
  async getDmcPreview() {
    const value = await this.page.locator(this.dmcPreview).inputValue();
    console.log(`🔍 DMC预览: ${value}`);
    return value;
  }

  /**
   * 点击确定按钮
   */
  async clickOk() {
    await this.page.click(this.okButton);
    await this.page.waitForTimeout(500);
    console.log('✅ 点击了确定按钮');
  }

  /**
   * 点击取消按钮
   */
  async clickCancel() {
    await this.page.click(this.cancelButton);
    await this.page.waitForTimeout(500);
    console.log('✅ 点击了取消按钮');
  }

  /**
   * 检查弹窗是否关闭
   */
  async isClosed() {
    try {
      await this.page.waitForSelector(this.modal, { state: 'detached', timeout: 3000 });
      console.log('✅ 弹窗已关闭');
      return true;
    } catch {
      console.log('⚠️  弹窗仍然打开');
      return false;
    }
  }
}

module.exports = {
  LoginPage,
  DataModuleListPage,
  DmCopyModal
};
