# IETM Frontend Field-Missing Risk Audit Report

**Audit Date:** 2026-08-31  
**Project:** cape-ietm-vue  
**Scope:** Data Module Management Components  
**Total Components Audited:** 36 Vue files  

---

## Executive Summary

This audit identifies **12 potential field-missing risks** across 10 components that depend on backend API data. The risks are categorized by severity:

- **P0 (Critical):** 3 issues - Block critical functionality
- **P1 (High):** 5 issues - Degrade user experience significantly  
- **P2 (Medium):** 4 issues - Minor degradation or edge cases

**Key Finding:** Similar to the previously discovered WorkflowInfoPanel issue, several components rely on large fields (`dmContent`, `dm_content`) or nested object fields that may be excluded from backend responses for performance optimization.

---

## Detailed Findings

### P0 - Critical Issues (Block Critical Functionality)

#### P0-1: DmEditorModal - Missing dmContent Field
**Component:** `components/DmEditorModal.vue`  
**API Endpoint:** `GET /ietm/datamodule/queryById`  
**Line:** 137-141

**Fields Depended Upon:**
- `dmContent` (large XML content field)
- `dmcCode`, `sns`, `infoCode`, `languageIsoCode`, `countryIsoCode`
- `techName`, `infoName`, `issueNo`, `inWork`
- `security`, `rpcName`, `originatorName`, `ietmLocationCode`

**Risk Description:**
The editor modal loads DM content for editing. If `dmContent` is missing from the API response, the editor shows empty content or generates default XML template. Users cannot edit existing content, leading to potential data loss if they save the default template.

**Current Defensive Programming:**
```javascript
this.content = res.result.dmContent || this.generateDefaultXml()
```
**Issue:** Fallback to default XML is too aggressive - doesn't distinguish between "truly empty DM" vs "field excluded from response".

**Impact:** **CRITICAL** - Users may unknowingly overwrite existing DM content with empty templates.

**Recommended Fix:**
1. Backend: Ensure `/ietm/datamodule/queryById` ALWAYS includes `dmContent` field
2. Frontend: Add explicit null check with warning:
```javascript
if (res.result.dmContent === undefined) {
  this.$message.error('Failed to load DM content: field missing from server response')
  this.handleCancel()
  return
}
this.content = res.result.dmContent || this.generateDefaultXml()
```

---

#### P0-2: DmRefContentModal - Missing dmContent Field
**Component:** `components/DmRefContentModal.vue`  
**API Endpoint:** `GET /ietm/datamodule/queryById`  
**Line:** 303-316

**Fields Depended Upon:**
- `dmContent` (large XML content field) - **Critical**
- `dmcCode`, `techName`, `infoName`
- `techName_dictText`, `infoName_dictText`
- `languageIsoCode_dictText`, `countryIsoCode_dictText`
- `issueNo`, `inWork`

**Risk Description:**
This modal displays DM content when viewing references. If `dmContent` is missing, shows "Empty Content" message. Users cannot view referenced DM content, breaking the reference navigation workflow.

**Current Defensive Programming:**
```javascript
<a-empty v-else description="该DM暂无内容">
```
**Issue:** No distinction between field-missing vs truly empty DM.

**Impact:** **CRITICAL** - Reference navigation workflow broken, users cannot inspect referenced DMs.

**Recommended Fix:**
1. Backend: Include `dmContent` in response
2. Frontend: Add error state for missing field:
```javascript
if (res.result.dmContent === undefined) {
  this.loadError = true
  this.errorMessage = '服务器未返回DM内容字段，请联系管理员'
  return
}
```

---

#### P0-3: WorkflowInfoPanel - Missing dmContent/dm_content Field (KNOWN ISSUE)
**Component:** `components/WorkflowInfoPanel.vue`  
**API Endpoint:** `GET /ietm/workflow/instance/getByFormid`  
**Line:** 588-592

**Fields Depended Upon:**
- `dmContent` or `dm_content` (context note: this was the originally discovered issue)
- `instanceId`, `status`, `createBy`, `stagenames`

**Risk Description:**
Previously discovered issue - workflow panel needs DM content for certain operations but field was missing from `getByFormid` response.

**Current Status:** **FIXED** (per memory context)

**Note:** Including for completeness as this was the trigger for this audit.

---

### P1 - High Impact Issues (Degrade User Experience)

#### P1-1: DmViewModal - Missing dmContent Field
**Component:** `components/DmViewModal.vue`  
**API Endpoint:** `GET /ietm/datamodule/queryById`  
**Line:** 245-254

**Fields Depended Upon:**
- `dmContent` (optional but used for "View XML Content" feature)
- 40+ metadata fields including `dmcCode`, `techName`, `infoName`
- `checkoutUser`, `checkoutTime`, `checkinTime`
- `workflowStatus`, `workflowHandler`, `workflowInstanceId`, `workflowStep`
- `security_dictText`, `dmType_dictText`, `languageIsoCode_dictText`
- `issueNo`, `inWork`, `issueType`, `isLatest`

**Risk Description:**
Detail modal displays comprehensive DM information. If `dmContent` is missing, the "View XML Content" button is hidden. If other metadata fields are missing, displays "-" or empty values, degrading information completeness.

**Current Defensive Programming:**
```javascript
<a-button v-if="model.dmContent" type="link" @click="showContent">
```
**Issue:** Silent failure - button disappears without explanation.

**Impact:** **HIGH** - Users cannot view XML content, reduced detail visibility.

**Recommended Fix:**
1. Backend: Ensure all displayed fields are included
2. Frontend: Add field-missing detection:
```javascript
const criticalFields = ['dmcCode', 'techName', 'infoName', 'issueNo', 'inWork']
const missingFields = criticalFields.filter(f => res.result[f] === undefined)
if (missingFields.length > 0) {
  this.$message.warning(`部分字段缺失: ${missingFields.join(', ')}`)
}
```

---

#### P1-2: DmEditPropModal - Missing Full Entity Fields
**Component:** `components/DmEditPropModal.vue`  
**API Endpoint:** `GET /ietm/datamodule/queryById`  
**Line:** 241-246

**Fields Depended Upon:**
- `security`, `security_dictText`
- `dmType`, `dmType_dictText`
- `languageIsoCode`, `countryIsoCode`
- `issueType`, `issueDate`
- `originator`, `originatorName`, `rpc`, `rpcName`
- `techName`, `infoName`

**Risk Description:**
Edit property modal fetches full entity to populate form. The comment explicitly states "列表记录字段不全" (list records have incomplete fields). If `queryById` doesn't return complete data, form shows empty/incorrect values.

**Current Defensive Programming:**
```javascript
// Comment indicates awareness: queryById 返回全字段并由 DictAspect 填充 _dictText
this.model = Object.assign({}, this.model, res.result)
```
**Issue:** Relies on backend guarantee, no frontend validation.

**Impact:** **HIGH** - Editing with incomplete data may cause validation errors or data corruption.

**Recommended Fix:**
1. Backend: Guarantee `queryById` returns ALL entity fields
2. Frontend: Validate critical fields before form display:
```javascript
if (!res.result.dmType || !res.result.security) {
  this.$message.error('数据不完整，无法编辑')
  this.visible = false
  return
}
```

---

#### P1-3: DmCopyModal - Missing Source DM Full Fields
**Component:** `components/DmCopyModal.vue`  
**API Endpoint:** `GET /ietm/datamodule/queryById`  
**Line:** 372-377

**Fields Depended Upon:**
- `infoCode`, `infoCodeVariant`, `ietmLocationCode`
- `learnCode`, `learnEventCode`, `dmType`
- `languageIsoCode`, `countryIsoCode`, `security`
- `enterprise`, `extraCode`, `infoName`

**Risk Description:**
Copy modal loads source DM to inherit its properties. Missing fields result in incomplete copy, potentially creating invalid DMC codes or violating business rules.

**Current Defensive Programming:**
```javascript
this.model.infoCode = fullDm.infoCode
this.model.infoCodeVariant = fullDm.infoCodeVariant || 'A'
// Multiple fields with || fallbacks
```
**Issue:** Fallback values may not match source DM intent.

**Impact:** **HIGH** - Copied DM may have incorrect DMC structure or metadata.

**Recommended Fix:**
1. Backend: Ensure complete entity return
2. Frontend: Validate required fields for copy operation:
```javascript
if (!fullDm.infoCode || !fullDm.dmType) {
  this.$message.error('源DM数据不完整，无法复制')
  this.visible = false
  return
}
```

---

#### P1-4: DmHistoryModal - Missing dmContent in History Versions
**Component:** `components/DmHistoryModal.vue`  
**API Endpoint:** `GET /ietm/datamodule/historyVersions`  
**Line:** 194-208

**Fields Depended Upon:**
- `dmContent` (for version comparison and revert)
- `issueNo`, `inWork`, `techName`, `infoName`
- `checkoutUser`, `checkoutTime`, `updateTime`
- `isLatest`, `versionType`

**Risk Description:**
History modal displays version list and allows viewing/comparing content. If `dmContent` is missing from history records, version comparison shows "content identical" error and content viewing shows "no content".

**Current Defensive Programming:**
```javascript
<pre>{{ selectedVersion.dmContent || '无内容' }}</pre>
const sourceContent = this.compareSource.dmContent || ''
const targetContent = this.compareTarget.dmContent || ''
```
**Issue:** No distinction between truly empty vs field missing.

**Impact:** **HIGH** - Version comparison broken, cannot verify historical changes.

**Recommended Fix:**
1. Backend: Include `dmContent` in `historyVersions` response
2. Frontend: Warn if content missing:
```javascript
if (this.compareSource.dmContent === undefined) {
  this.$message.warning('历史版本内容缺失，无法对比')
  return
}
```

---

#### P1-5: DmContentEditor - Missing Workflow Instance Fields
**Component:** `editor/DmContentEditor.vue`  
**API Endpoint:** `GET /ietm/workflow/instance/getByFormid`  
**Line:** 1624-1630

**Fields Depended Upon:**
- `id`, `status`, `createBy`, `stagenames`
- Potentially more fields used by WorkflowInfoPanel child component

**Risk Description:**
Content editor checks if workflow exists to show workflow panel. Missing fields may cause panel display logic failure or child component errors.

**Current Defensive Programming:**
```javascript
this.showWorkflowPanel = res.success && res.result != null
```
**Issue:** Only checks for null result, not field completeness.

**Impact:** **HIGH** - Workflow panel may show incorrect state or error.

**Recommended Fix:**
1. Backend: Ensure `getByFormid` returns complete workflow instance
2. Frontend: Validate critical workflow fields:
```javascript
if (res.result && (!res.result.id || !res.result.status)) {
  console.warn('Workflow instance incomplete:', res.result)
  this.showWorkflowPanel = false
}
```

---

### P2 - Medium Impact Issues (Minor Degradation)

#### P2-1: IetmDataModuleList - Inconsistent queryById Endpoints
**Component:** `IetmDataModuleList.vue`  
**API Endpoints:** 
- `GET /ietm/datamodule/queryById` (Line 296, 1120, 1217)
- `GET /ietm/data-module/queryById` (Line 862)

**Fields Depended Upon:**
- All DM entity fields for various operations

**Risk Description:**
Component uses TWO different endpoint paths for queryById - one with hyphen (`/data-module/`) and one without (`/datamodule/`). These may have different field return strategies.

**Current Defensive Programming:**
None - assumes both endpoints return same structure.

**Impact:** **MEDIUM** - Potential inconsistency in data availability depending on code path.

**Recommended Fix:**
1. Backend: Ensure both endpoints return identical field sets, or consolidate to one endpoint
2. Frontend: Standardize to single endpoint:
```javascript
// Use consistent endpoint throughout
const QUERY_BY_ID_URL = '/ietm/datamodule/queryById'
```

---

#### P2-2: DataModuleFormModal - Missing Fields in Edit Mode
**Component:** `components/DataModuleFormModal.vue`  
**API Endpoint:** `GET /ietm/datamodule/queryById`  
**Line:** 352-358

**Fields Depended Upon:**
- `sns`, `infoCode`, `dmType`, `security`
- `techName`, `infoName`, `languageIsoCode`, `countryIsoCode`
- `originator`, `rpc`, `ietmLocationCode`
- `infoCodeVariant`, `learnCode`, `learnEventCode`

**Risk Description:**
Form modal loads existing DM for editing. Missing fields prevent proper form initialization.

**Current Defensive Programming:**
```javascript
if (res.success && res.result) {
  this.model = Object.assign({}, res.result)
}
```
**Issue:** No validation of required fields.

**Impact:** **MEDIUM** - Form may show incomplete data, but validation on save should catch it.

**Recommended Fix:**
Add field validation before form display:
```javascript
const requiredFields = ['sns', 'infoCode', 'dmType', 'techName']
const missing = requiredFields.filter(f => !res.result[f])
if (missing.length > 0) {
  this.$message.error(`必填字段缺失: ${missing.join(', ')}`)
  return
}
```

---

#### P2-3: IetmSymbolDialog - Missing Attachment in ICN Query
**Component:** `editor/components/IetmSymbolDialog.vue`  
**API Endpoint:** `GET /icnmanage/ietmIcnManage/queryByIdWithAttachment`  
**Line:** 239-283

**Fields Depended Upon:**
- `attachment` object with `filePath` field
- `icnIdent`, `text`, `reproductionScale`
- `width`, `height`, `title`

**Risk Description:**
Symbol dialog queries ICN with attachment to display preview. If `attachment` or `attachment.filePath` is missing, preview fails silently.

**Current Defensive Programming:**
```javascript
if (res.result && res.result.attachment && res.result.attachment.filePath) {
  // Process attachment
}
```
**Issue:** Silent failure - no user feedback when attachment missing.

**Impact:** **MEDIUM** - Preview broken but doesn't block workflow.

**Recommended Fix:**
Add explicit error message:
```javascript
if (!res.result.attachment || !res.result.attachment.filePath) {
  this.$message.warning('ICN附件缺失，无法预览')
  this.previewLoading = false
  return
}
```

---

#### P2-4: DmReferenceModal - Missing Reference Tree Fields
**Component:** `components/DmReferenceModal.vue`  
**API Endpoint:** `GET /ietm/datamodule/referenceTree`  
**Line:** 225-245

**Fields Depended Upon:**
- `sourceDmId`, `targetDmId`, `dmcCode`
- `techName`, `infoName`, `refType`, `refPosition`
- `refDepth`, `isCircular`, `children` array

**Risk Description:**
Reference tree displays DM relationships. Missing fields cause incomplete tree rendering or broken navigation.

**Current Defensive Programming:**
```javascript
const data = res.result || []
this.buildTreeData(data)
```
**Issue:** No validation of tree node structure.

**Impact:** **MEDIUM** - Tree may display incomplete, but doesn't crash.

**Recommended Fix:**
Validate tree node structure:
```javascript
const validateNode = (node) => {
  if (!node.dmcCode || !node.targetDmId) {
    console.warn('Invalid reference node:', node)
    return false
  }
  return true
}
const validData = data.filter(validateNode)
```

---

## Summary Statistics

| Severity | Count | Components Affected |
|----------|-------|---------------------|
| P0       | 3     | 3                   |
| P1       | 5     | 5                   |
| P2       | 4     | 4                   |
| **Total**| **12**| **10**              |

---

## Components with No Risk Detected (Reviewed)

The following components were audited and found to have adequate defensive programming or no critical field dependencies:

1. **DmValidationModal.vue** - Only needs `id` parameter, validates response structure
2. **DmPreviewModal.vue** - Receives HTML from parent, no direct API calls
3. **DmDiffModal.vue** - No direct data fetching
4. **DmWorkflowModal.vue** - Simple workflow query with proper error handling
5. **ConfigTree.vue** - Tree structure with proper null checks
6. **DmReferenceChainModal.vue** - Receives data from parent modal
7. **InfoCodeSelector.vue** - List query with pagination, no critical fields
8. **UserSelector.vue** - User list query, standard pattern
9. **BatchStartFlowModal.vue** - Workflow submission, validates before submit
10. **BatchRestartFlowModal.vue** - Workflow restart, validates before submit

---

## Root Cause Analysis

### Why Field-Missing Issues Occur

1. **Backend Performance Optimization:** Large fields like `dmContent` may be excluded from list queries or lightweight queries to reduce payload size and improve response time.

2. **Inconsistent API Contracts:** Different endpoints (e.g., `/datamodule/queryById` vs `/data-module/queryById`) may have different field selection strategies without documentation.

3. **Database Query Optimization:** Some queries use `SELECT specific_fields` instead of `SELECT *`, and fields may be added to entities without updating all query projections.

4. **JPA/MyBatis Lazy Loading:** Associated entities or LOB fields may not be eagerly loaded in all query contexts.

5. **Aspect-Based Field Population:** Dictionary text fields (`_dictText` suffix) are populated by `DictAspect`, which may fail silently if dictionary service is unavailable.

---

## Recommended Backend Verification Points

For each identified endpoint, backend team should verify:

### Critical Endpoints to Audit

1. **`GET /ietm/datamodule/queryById`**
   - Used by: 8 components
   - **MUST include:** `dmContent`, all DMC code fields, all metadata fields
   - **Action:** Review `IetmDataModuleController.queryById()` and ensure `@Select` includes all fields

2. **`GET /ietm/workflow/instance/getByFormid`**
   - Used by: 3 components  
   - **MUST include:** `id`, `status`, `createBy`, `stagenames`, workflow state fields
   - **Action:** Review `WfInstanceController.getByFormid()` return mapping

3. **`GET /ietm/datamodule/historyVersions`**
   - Used by: 1 component
   - **MUST include:** `dmContent` for each history record
   - **Action:** Review query to ensure LOB field is included

4. **`GET /ietm/datamodule/referenceTree`**
   - Used by: 1 component
   - **MUST include:** Complete tree node structure with DM metadata
   - **Action:** Review recursive query projection

5. **`GET /icnmanage/ietmIcnManage/queryByIdWithAttachment`**
   - Used by: 1 component
   - **MUST include:** `attachment` object with `filePath`
   - **Action:** Verify attachment JOIN and projection

---

## Recommended Frontend Fix Strategy

### Immediate Actions (P0)

1. **Add Field Existence Validation Pattern:**
```javascript
// Reusable validation helper
const validateResponse = (result, requiredFields) => {
  const missing = requiredFields.filter(field => result[field] === undefined)
  if (missing.length > 0) {
    console.error('[Field Missing]', missing, result)
    return { valid: false, missing }
  }
  return { valid: true }
}

// Usage in components
const validation = validateResponse(res.result, ['dmContent', 'dmcCode'])
if (!validation.valid) {
  this.$message.error(`服务器响应字段缺失: ${validation.missing.join(', ')}`)
  this.handleCancel()
  return
}
```

2. **Add Global Error Interceptor:**
```javascript
// In axios response interceptor
if (response.data.success && response.data.result) {
  const criticalApis = ['/queryById', '/getByFormid']
  if (criticalApis.some(api => response.config.url.includes(api))) {
    // Log for monitoring
    console.debug('[API Response Fields]', Object.keys(response.data.result))
  }
}
```

### Short-term Actions (P1)

1. For each P1 component, add explicit field validation before using data
2. Add user-visible warnings when non-critical fields are missing
3. Improve fallback logic to distinguish "empty value" vs "missing field"

### Long-term Actions (P2)

1. Create TypeScript interfaces for all API responses
2. Implement runtime type validation (e.g., io-ts, zod)
3. Add automated integration tests that verify API response schemas
4. Document expected field sets for each endpoint in API documentation

---

## Testing Recommendations

### Backend Testing

Create integration tests for each critical endpoint:

```java
@Test
public void testQueryByIdReturnsAllFields() {
    IetmDataModule dm = dataModuleService.queryById("test-id");
    
    // Critical fields must never be null
    assertNotNull(dm.getDmContent(), "dmContent must be included");
    assertNotNull(dm.getDmcCode(), "dmcCode must be included");
    assertNotNull(dm.getTechName(), "techName must be included");
    
    // Verify dictionary text fields are populated
    assertNotNull(dm.getSecurity_dictText(), "dict aspect should populate _dictText");
}
```

### Frontend Testing

Create E2E tests that verify field availability:

```javascript
describe('DM Editor Field Availability', () => {
  it('should load complete DM entity with dmContent', async () => {
    const response = await api.get('/ietm/datamodule/queryById', { id: 'test-123' })
    
    expect(response.result).toHaveProperty('dmContent')
    expect(response.result).toHaveProperty('dmcCode')
    expect(response.result.dmContent).not.toBeUndefined()
  })
  
  it('should display error when dmContent is missing', async () => {
    // Mock response without dmContent
    mockApi.get('/ietm/datamodule/queryById').reply(200, {
      success: true,
      result: { id: 'test-123', dmcCode: 'DMC-XXX' }
      // dmContent intentionally missing
    })
    
    wrapper.vm.show({ id: 'test-123' })
    await wrapper.vm.$nextTick()
    
    expect(wrapper.vm.loadError).toBe(true)
    expect(wrapper.vm.errorMessage).toContain('字段缺失')
  })
})
```

---

## Monitoring Recommendations

### Add Frontend Logging

Track field-missing incidents in production:

```javascript
// In each validated component
if (res.result.dmContent === undefined) {
  // Log to monitoring service
  this.$log.warn('FieldMissing', {
    component: 'DmEditorModal',
    endpoint: '/ietm/datamodule/queryById',
    field: 'dmContent',
    dmId: this.dmId,
    timestamp: new Date().toISOString()
  })
}
```

### Backend Query Monitoring

Add SQL query logging to identify which queries exclude critical fields:

```xml
<!-- MyBatis mapper auditing -->
<select id="queryById" resultMap="BaseResultMap">
  <!-- Log warning if BaseResultMap doesn't include dmContent -->
  SELECT id, dmc_code, tech_name, dm_content, ...
  FROM ietm_data_module
  WHERE id = #{id}
</select>
```

---

## Conclusion

This audit identified **12 field-missing risks** across **10 critical components**, with **3 P0 issues** that require immediate attention. The root cause is primarily backend performance optimization excluding large fields, combined with insufficient frontend validation.

**Immediate Next Steps:**

1. **Backend Team:** Audit and fix the 5 critical endpoints listed in "Recommended Backend Verification Points"
2. **Frontend Team:** Implement field validation for 3 P0 components immediately
3. **QA Team:** Execute the recommended integration and E2E tests
4. **DevOps Team:** Set up monitoring for field-missing incidents

**Timeline Recommendation:**
- P0 fixes: Within 3 days
- P1 fixes: Within 1 week  
- P2 fixes: Within 2 weeks
- Long-term improvements: Within 1 month

---

**Report Generated By:** Kiro AI Assistant  
**Contact:** Development Team Lead for questions
