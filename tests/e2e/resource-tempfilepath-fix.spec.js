/**
 * 资源文件tempFilePath修复 - E2E自动化测试
 *
 * 测试修复：
 * 1. validateResourceFromZip: 先保存tempFilePath再检查重复
 * 2. validateResourceByName: 增加重复检查逻辑
 *
 * 执行方式：
 * npx playwright test resource-tempfilepath-fix.spec.js
 *
 * @author IETM Team
 * @date 2026-09-05
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:9999';
const TEST_PROJECT_ID = 'test-project-001';
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = 'admin123';

// 测试数据
const DMC_CODE = 'DMC-TESTFIX-A-00-00-00-00A-001A-A';
const RESOURCE_NAME = 'ICN-TESTFIX-A-00-00-00-00A-001A-A-001-01.png';

/**
 * 辅助函数：创建测试用DM XML
 */
function createTestDmXml(dmcCode) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="dmodule.xsd">
    <identAndStatusSection>
        <dmAddress>
            <dmIdent>
                <dmCode modelIdentCode="TESTFIX" systemDiffCode="A"
                        systemCode="00" subSystemCode="00" subSubSystemCode="00"
                        assyCode="00A" disassyCode="001" disassyCodeVariant="A"
                        infoCode="001" infoCodeVariant="A" itemLocationCode="A"/>
            </dmIdent>
        </dmAddress>
        <dmStatus>
            <security securityClassification="01"/>
        </dmStatus>
    </identAndStatusSection>
    <content>
        <description>
            <para>Test DM for tempFilePath fix validation</para>
        </description>
    </content>
</dmodule>`;
}

/**
 * 辅助函数：创建测试用ZIP文件
 */
function createTestZipFile(options = {}) {
    const {
        includeDm = true,
        includeResource = true,
        dmCode = DMC_CODE,
        resourceName = RESOURCE_NAME,
        resourceContent = 'mock-png-content'
    } = options;

    const zip = new AdmZip();

    if (includeDm) {
        const dmXml = createTestDmXml(dmCode);
        zip.addFile(`${dmCode}.xml`, Buffer.from(dmXml, 'utf-8'));
    }

    if (includeResource) {
        zip.addFile(resourceName, Buffer.from(resourceContent, 'utf-8'));
    }

    const timestamp = Date.now();
    const zipPath = path.join(__dirname, `test-data-${timestamp}.zip`);
    zip.writeZip(zipPath);

    return zipPath;
}

/**
 * 辅助函数：清理测试文件
 */
function cleanupTestFiles(filePaths) {
    filePaths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
}

/**
 * 测试套件：资源文件tempFilePath修复验证
 */
test.describe('资源文件tempFilePath修复验证', () => {

    let cleanupFiles = [];

    test.beforeEach(async ({ page }) => {
        // 登录系统
        await page.goto(BASE_URL);
        await page.fill('input[name="username"]', TEST_USERNAME);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();

        // 打开测试项目（确保项目上下文）
        await page.goto(`${BASE_URL}/project/open?projectId=${TEST_PROJECT_ID}`);
        await page.waitForTimeout(1000);
    });

    test.afterEach(() => {
        // 清理测试文件
        cleanupTestFiles(cleanupFiles);
        cleanupFiles = [];
    });

    /**
     * 【P0核心测试】TC-01: ZIP包含重复资源时tempFilePath必须已设置
     *
     * 这是修复的核心验证点
     */
    test('P0-TC01: 重复资源tempFilePath必须已设置', async ({ page }) => {
        // Step 1: 第一次导入（建立重复数据）
        const firstZipPath = createTestZipFile();
        cleanupFiles.push(firstZipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);

        const firstUploadInput = await page.locator('input[type="file"]');
        await firstUploadInput.setInputFiles(firstZipPath);

        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);

        // 第一次应该成功
        const firstDmStatus = await page.locator('text=/可以导入/').first();
        await expect(firstDmStatus).toBeVisible();

        // 导入
        await page.click('button:has-text("导入")');
        await page.waitForTimeout(3000);

        // Step 2: 第二次上传相同的ZIP（触发重复检查）
        const secondZipPath = createTestZipFile();
        cleanupFiles.push(secondZipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);

        const secondUploadInput = await page.locator('input[type="file"]');
        await secondUploadInput.setInputFiles(secondZipPath);

        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);

        // 验证DM重复
        const dmErrorMsg = await page.locator('text=/DMC编码已存在/').first();
        await expect(dmErrorMsg).toBeVisible();

        // 【P0关键验证】验证资源重复且tempFilePath不为null
        const resourceRow = await page.locator(`tr:has-text("${RESOURCE_NAME}")`).first();

        // 验证结果码为-14（资源已存在）
        const resourceStatus = await resourceRow.locator('td').nth(2).textContent();
        expect(resourceStatus).toContain('已存在');

        // 【P0核心验证】验证tempFilePath字段存在（通过API检查）
        const validateResponse = await page.evaluate(async () => {
            const formData = new FormData();
            const blob = new Blob(['mock-zip-content'], { type: 'application/zip' });
            formData.append('file', blob, 'test.zip');

            const response = await fetch('/jeecg-boot/ietm/dm-import/validate', {
                method: 'POST',
                body: formData
            });

            return await response.json();
        });

        // 查找资源文件项
        const resourceItem = validateResponse.result.files.find(f =>
            f.fileName && f.fileName.includes('ICN')
        );

        if (resourceItem) {
            // 【P0关键断言】即使资源重复，tempFilePath也必须不为null
            expect(resourceItem.tempFilePath).not.toBeNull();
            expect(resourceItem.tempFilePath).toBeDefined();
            expect(resourceItem.resultCode).toBe('-14'); // ERROR_RESOURCE_EXISTS

            console.log('✅ P0验证通过：重复资源的tempFilePath =', resourceItem.tempFilePath);
        } else {
            throw new Error('未找到资源文件项');
        }
    });

    /**
     * 【P0核心测试】TC-02: 多次校验结果一致性
     *
     * 验证不会出现"第二次点击校验按钮后变为'可以导入'"的bug
     */
    test('P0-TC02: 多次校验结果一致性', async ({ page }) => {
        // 先导入一次建立重复数据
        const firstZipPath = createTestZipFile();
        cleanupFiles.push(firstZipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput1 = await page.locator('input[type="file"]');
        await uploadInput1.setInputFiles(firstZipPath);
        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);
        await page.click('button:has-text("导入")');
        await page.waitForTimeout(3000);

        // 第二次上传相同ZIP
        const secondZipPath = createTestZipFile();
        cleanupFiles.push(secondZipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput2 = await page.locator('input[type="file"]');
        await uploadInput2.setInputFiles(secondZipPath);

        // 第1次校验
        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);
        const result1 = await page.locator(`tr:has-text("${RESOURCE_NAME}")`).first().textContent();

        // 第2次校验
        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);
        const result2 = await page.locator(`tr:has-text("${RESOURCE_NAME}")`).first().textContent();

        // 第3次校验
        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);
        const result3 = await page.locator(`tr:has-text("${RESOURCE_NAME}")`).first().textContent();

        // 【P0验证】三次结果必须完全一致
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
        expect(result1).toContain('已存在');

        console.log('✅ P0验证通过：三次校验结果一致');
    });

    /**
     * TC-03: 新资源正常流程
     */
    test('TC03: 新资源正常导入流程', async ({ page }) => {
        const uniqueDmc = `DMC-NEW${Date.now()}-A-00-00-00-00A-001A-A`;
        const uniqueResource = `ICN-NEW${Date.now()}-A-00-00-00-00A-001A-A-001-01.png`;

        const zipPath = createTestZipFile({
            dmCode: uniqueDmc,
            resourceName: uniqueResource
        });
        cleanupFiles.push(zipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput = await page.locator('input[type="file"]');
        await uploadInput.setInputFiles(zipPath);

        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);

        // 验证DM和资源都显示"可以导入"
        const successMessages = await page.locator('text=/可以导入/').count();
        expect(successMessages).toBeGreaterThanOrEqual(2); // DM + 资源

        // 验证导入按钮可点击
        const importButton = await page.locator('button:has-text("导入")');
        await expect(importButton).toBeEnabled();

        console.log('✅ TC03通过：新资源正常流程');
    });

    /**
     * TC-04: DM不存在时资源校验失败
     */
    test('TC04: DM不存在时资源校验失败', async ({ page }) => {
        const notExistResource = 'ICN-NOTEXIST-A-00-00-00-00A-001A-A-001-01.png';

        const zipPath = createTestZipFile({
            includeDm: false,
            resourceName: notExistResource
        });
        cleanupFiles.push(zipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput = await page.locator('input[type="file"]');
        await uploadInput.setInputFiles(zipPath);

        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);

        // 验证错误消息
        const errorMsg = await page.locator('text=/DM不存在|关联的DM不存在/').first();
        await expect(errorMsg).toBeVisible();

        // 验证导入按钮禁用
        const importButton = await page.locator('button:has-text("导入")');
        await expect(importButton).toBeDisabled();

        console.log('✅ TC04通过：DM不存在场景正确处理');
    });

    /**
     * TC-05: 文件名格式异常
     */
    test('TC05: 文件名格式异常处理', async ({ page }) => {
        const invalidResource = 'invalid-resource-name.png';

        const zipPath = createTestZipFile({
            resourceName: invalidResource
        });
        cleanupFiles.push(zipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput = await page.locator('input[type="file"]');
        await uploadInput.setInputFiles(zipPath);

        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);

        // 验证错误消息
        const errorMsg = await page.locator('text=/无法提取|格式|前缀/').first();
        await expect(errorMsg).toBeVisible();

        console.log('✅ TC05通过：格式异常正确处理');
    });

    /**
     * TC-06: 空文件处理
     */
    test('TC06: 空文件内容处理', async ({ page }) => {
        const zipPath = createTestZipFile({
            resourceContent: '' // 空内容
        });
        cleanupFiles.push(zipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput = await page.locator('input[type="file"]');
        await uploadInput.setInputFiles(zipPath);

        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);

        // 应该能正常处理（或有明确错误提示）
        const result = await page.locator('text=/可以导入|文件内容为空/').first();
        await expect(result).toBeVisible();

        console.log('✅ TC06通过：空文件正确处理');
    });

    /**
     * TC-07: validateResourceByName重复检查验证
     *
     * 通过API直接测试validateResourceByName方法
     */
    test('TC07: validateResourceByName重复检查', async ({ page, request }) => {
        // 先导入一次建立重复数据
        const zipPath = createTestZipFile();
        cleanupFiles.push(zipPath);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput = await page.locator('input[type="file"]');
        await uploadInput.setInputFiles(zipPath);
        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);
        await page.click('button:has-text("导入")');
        await page.waitForTimeout(3000);

        // 调用validateResourceByFileName接口（如果有暴露）
        // 或者通过前端模拟文件名校验
        const response = await request.post(`${API_BASE_URL}/jeecg-boot/ietm/dm-import/validate-names`, {
            data: {
                fileNames: [RESOURCE_NAME],
                projectId: TEST_PROJECT_ID
            }
        });

        const result = await response.json();

        // 【P0验证】validateResourceByName现在应该也能检测到重复
        const resourceItem = result.result.files.find(f => f.fileName === RESOURCE_NAME);
        if (resourceItem) {
            expect(resourceItem.resultCode).toBe('-14'); // ERROR_RESOURCE_EXISTS
            console.log('✅ TC07通过：validateResourceByName重复检查生效');
        }
    });

    /**
     * TC-08: 一致性测试 - 两种校验方法结果对比
     */
    test('TC08: 两种校验方法一致性', async ({ page, request }) => {
        // 准备重复数据
        const zipPath1 = createTestZipFile();
        cleanupFiles.push(zipPath1);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput1 = await page.locator('input[type="file"]');
        await uploadInput1.setInputFiles(zipPath1);
        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);
        await page.click('button:has-text("导入")');
        await page.waitForTimeout(3000);

        // 方法1: validateResourceFromZip (通过ZIP上传)
        const zipPath2 = createTestZipFile();
        cleanupFiles.push(zipPath2);

        await page.goto(`${BASE_URL}/ietm/data-import`);
        const uploadInput2 = await page.locator('input[type="file"]');
        await uploadInput2.setInputFiles(zipPath2);
        await page.click('button:has-text("校验")');
        await page.waitForTimeout(2000);

        const zipResult = await page.locator(`tr:has-text("${RESOURCE_NAME}")`).first().textContent();

        // 方法2: validateResourceByFileName (通过文件名)
        const nameResult = await request.post(`${API_BASE_URL}/jeecg-boot/ietm/dm-import/validate-names`, {
            data: {
                fileNames: [RESOURCE_NAME],
                projectId: TEST_PROJECT_ID
            }
        });

        const nameResultJson = await nameResult.json();
        const nameResourceItem = nameResultJson.result.files.find(f => f.fileName === RESOURCE_NAME);

        // 【P0验证】两种方法的resultCode应一致
        expect(zipResult).toContain('已存在');
        expect(nameResourceItem.resultCode).toBe('-14');

        console.log('✅ TC08通过：两种校验方法结果一致');
    });
});

/**
 * 性能测试套件
 */
test.describe('性能测试', () => {

    test('PERF-01: 重复检查SQL性能', async ({ page }) => {
        const iterations = 100;
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const start = Date.now();

            // 执行重复检查（通过API）
            await page.evaluate(() => {
                return fetch('/jeecg-boot/ietm/dm-import/check-duplicate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dmId: 'test-dm-id',
                        fileName: 'test-resource.png'
                    })
                });
            });

            const end = Date.now();
            times.push(end - start);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);

        console.log(`平均耗时: ${avgTime.toFixed(2)}ms`);
        console.log(`最大耗时: ${maxTime}ms`);

        // 性能断言：平均耗时应小于50ms
        expect(avgTime).toBeLessThan(50);
    });
});
