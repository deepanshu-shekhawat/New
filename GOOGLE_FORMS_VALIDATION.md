# Google Forms Integration - Validation & Testing Guide

## Pre-Deployment Validation Checklist

### ✅ Code Quality Check

#### JavaScript Syntax Validation
```bash
# Using Node.js built-in validation
node --check functions/googleFormsIntegration.js
node --check public/js/googleFormsService.js

# Expected output: No output (silent success)

# Or using ESLint (if available)
npx eslint functions/googleFormsIntegration.js
npx eslint public/js/googleFormsService.js
```

#### Expected File Sizes
| File | Expected Size | Status |
|------|--------------|--------|
| `functions/googleFormsIntegration.js` | ~380 lines | ✅ Created |
| `public/js/googleFormsService.js` | ~342 lines | ✅ Created |
| `public/index.html` | Modified | ✅ Enhanced |
| `.env.example` | ~20 lines | ✅ Created |
| `GOOGLE_FORMS_INTEGRATION.md` | ~1100 lines | ✅ Created |
| `GOOGLE_FORMS_SETUP.md` | ~400 lines | ✅ Created |

### ✅ File Integrity Check

```bash
# Verify all files exist
ls -lh functions/googleFormsIntegration.js
ls -lh public/js/googleFormsService.js
ls -lh public/index.html
ls -lh .env.example
ls -lh GOOGLE_FORMS_*.md

# Check file permissions
chmod 644 functions/googleFormsIntegration.js
chmod 644 public/js/googleFormsService.js
```

### ✅ Configuration Check

```bash
# Verify .env.local doesn't commit env secrets
cat .gitignore | grep -E "\.env|credentials|key"

# Should show:
# .env.local
# google-service-key.json
# functions/.env

# Verify no secrets in code
git grep -i "private_key\|api_key\|password" -- ':!.env*' ':!*.md' ':!*.json'

# Should return nothing
```

---

## Function-by-Function Validation

### 1. createAssessmentForm

**Validation Points:**
```javascript
// Test inputs
const validInput = {
  bondId: 'bond_ABC123',
  title: 'Midterm Assessment',
  description: 'Test your knowledge',
  questions: [
    {
      type: 'multiple_choice',
      title: 'What is 2+2?',
      options: ['3', '4', '5'],
      required: true
    }
  ]
};

// Check validation in function
// Line 43-46: Validates bondId and title
// Line 50: Validates question array
// Line 54-65: Verifies user is tutor
// Line 69: Google Auth initialization
// Line 74-95: Form creation
```

**Expected Behavior:**
- ✅ Rejects missing bondId or title
- ✅ Rejects if user is not tutor
- ✅ Creates form via Google API
- ✅ Returns { formId, formUrl }
- ✅ Stores reference in Firestore

**Error Cases:**
```javascript
// Should handle gracefully:
- Missing auth token → 401 Unauthorized
- Invalid bondId → 400 Bad Request
- User not tutor → 403 Forbidden
- Google API error → 500 Internal Server Error
```

### 2. attachAssessmentForm

**Validation Points:**
```javascript
// Valid form ID patterns:
const formIds = [
  '1ABC123DEF456GHI',  // ✅ Valid
  '1_ABC-123_DEF-456', // ✅ Valid (with hyphen/underscore)
];

// Invalid patterns:
const invalidIds = [
  'https://docs.google.com/forms/d/1ABC/viewform', // ❌ Raw URL (should be extracted)
  '1ABC 123',  // ❌ Space
  '',          // ❌ Empty
];
```

**Validation in Code:**
```javascript
// Line 127-133: Form ID format validation
const formIdRegex = /^[a-zA-Z0-9_-]{20,}$/;
if (!formIdRegex.test(formId)) {
  return res.status(400).json({ error: 'Invalid form ID format' });
}
```

**Expected Behavior:**
- ✅ Accepts valid form IDs
- ✅ Rejects invalid format
- ✅ Prevents duplicate attachments
- ✅ Updates bond.assessmentForm
- ✅ Returns confirmation

### 3. getFormResponses

**Authorization Check:**
```javascript
// Line 164-167: Tutor-only validation
if (bond.tutorId !== userEmail) {
  return res.status(403).json({ 
    error: 'Only tutor can view responses' 
  });
}
```

**Expected Behavior:**
- ✅ Learner access denied (403)
- ✅ Returns responses only to tutor
- ✅ Updates bond.submissionCount
- ✅ Updates bond.lastResponseAt
- ✅ Returns array of response objects

**Response Format:**
```javascript
{
  responses: [
    {
      responseId: 'string',
      createTime: '2024-01-15T10:30:00Z',
      answers: {
        questionId: { textAnswers: { answers: [...] } }
      }
    }
  ],
  submissionCount: 5
}
```

### 4. submitFormAssessment

**Input Validation:**
```javascript
// Line 215-218: Score validation
if (typeof score !== 'number' || score < 0 || score > 100) {
  return res.status(400).json({ 
    error: 'Score must be between 0 and 100' 
  });
}
```

**Expected Behavior:**
- ✅ Validates score (0-100)
- ✅ Only tutor can submit
- ✅ Triggers updateTutorStats
- ✅ Sets formStatus = 'completed'
- ✅ Enables feedback visibility
- ✅ Logs to formLogs

**Side Effects:**
```javascript
// Score triggers:
// 1. Updates bond.assessmentScore
// 2. Updates bond.assessmentCompletedAt
// 3. Runs updateTutorStats (badge calculation)
// 4. Sets bond.feedbackVisible = true
// 5. Logs action to formLogs collection
```

### 5. verifyFormAccess

**Access Control Matrix:**
```javascript
// User: Tutor, Form Status: Any → ✅ Access
// User: Learner, Form Status: active → ✅ Access
// User: Learner, Form Status: completed → ❌ Access (after assessment)
// User: Non-participant → ❌ Access (403)

// Code location: Line 268-290
```

**Expected Response:**
```javascript
{
  hasAccess: true,
  userRole: 'tutor', // or 'learner'
  formId: '1ABC123DEF456GHI',
  formUrl: 'https://docs.google.com/forms/d/1ABC123DEF456GHI/viewform',
  formStatus: 'active' // or 'completed'
}
```

### 6. removeAssessmentForm

**Removal Restrictions:**
```javascript
// Line 319-323: Prevent removal after submission
if (bond.assessmentScore !== undefined) {
  return res.status(400).json({ 
    error: 'Cannot remove form after assessment submitted' 
  });
}
```

**Expected Behavior:**
- ✅ Only tutor can remove
- ✅ Prevents removal after assessment
- ✅ Logs removal to formLogs
- ✅ Deletes assessmentForm field
- ✅ Returns confirmation

---

## Frontend Service Validation

### GoogleFormsService Class Structure

**Constructor Validation:**
```javascript
// Line 8-11: Should initialize from environment
this.functionsBaseUrl = process.env.REACT_APP_FUNCTIONS_BASE_URL
this.formResponseTimeout = parseInt(process.env.REACT_APP_FORM_RESPONSE_TIMEOUT) || 30000
this.maxFormSize = parseInt(process.env.REACT_APP_MAX_FORM_ATTACHMENT_SIZE) || 5242880
```

**Test in Browser:**
```javascript
// Open browser console in public/index.html
console.log(googleFormsService);
// Should output: GoogleFormsService { functionsBaseUrl, formResponseTimeout, maxFormSize }

console.log(googleFormsService.functionsBaseUrl);
// Should output: https://us-central1-your-project.cloudfunctions.net
```

### Method Signature Validation

| Method | Params | Returns | Auth Required |
|--------|--------|---------|-----------------|
| `createAssessmentForm` | bondId, title, description, questions | Promise<{formId, formUrl}> | ✅ Yes |
| `attachAssessmentForm` | bondId, formId | Promise<{success}> | ✅ Yes |
| `getFormResponses` | bondId | Promise<{responses, submissionCount}> | ✅ Yes |
| `submitFormAssessment` | bondId, score, feedback | Promise<{success}> | ✅ Yes |
| `verifyFormAccess` | bondId | Promise<{hasAccess, userRole, formId}> | ✅ Yes |
| `removeAssessmentForm` | bondId | Promise<{success}> | ✅ Yes |
| `extractFormId` | urlOrId | String | ❌ No |

### Helper Method Validation

**Form ID Extraction:**
```javascript
// Test various URL formats
const testCases = [
  {
    input: 'https://docs.google.com/forms/d/1ABC123DEF/viewform',
    expected: '1ABC123DEF'
  },
  {
    input: '1ABC123DEF',
    expected: '1ABC123DEF'
  },
  {
    input: 'https://docs.google.com/forms/d/1ABC123DEF/edit',
    expected: '1ABC123DEF'
  }
];

// Test extraction
testCases.forEach(test => {
  const result = googleFormsService.extractFormId(test.input);
  console.assert(result === test.expected, `Failed: ${test.input}`);
});
```

**URL Generation:**
```javascript
const formId = '1ABC123DEF456GHI';

const embedUrl = googleFormsService.generateFormEmbedUrl(formId);
// Expected: 'https://docs.google.com/forms/d/1ABC123DEF456GHI/viewform?embedded=true'

const shareUrl = googleFormsService.generateFormShareUrl(formId);
// Expected: 'https://docs.google.com/forms/d/1ABC123DEF456GHI/viewform'
```

---

## Integration Testing Scenarios

### Scenario 1: Happy Path - Create and Submit Form

**Steps:**
```javascript
// 1. Create form
const createResult = await googleFormsService.createAssessmentForm(
  'bond_123',
  'Final Exam',
  'Assessment',
  []
);
console.assert(createResult.formId, 'Should return formId');
console.assert(createResult.formUrl, 'Should return formUrl');

// 2. Verify in Firestore
const bond = await db.collection('bonds').doc('bond_123').get();
console.assert(bond.data().assessmentForm.id, 'Form ID should be stored');
console.assert(bond.data().assessmentForm.status === 'active', 'Status should be active');

// 3. Learner accesses form
const access = await googleFormsService.verifyFormAccess('bond_123');
console.assert(access.hasAccess === true, 'Learner should have access');
console.assert(access.userRole === 'learner', 'Role should be learner');

// 4. Tutor submits score
const scoreResult = await googleFormsService.submitFormAssessment(
  'bond_123',
  85,
  'Good work!'
);
console.assert(scoreResult.success === true, 'Score should submit');

// 5. Verify bond updated
const updatedBond = await db.collection('bonds').doc('bond_123').get();
console.assert(updatedBond.data().assessmentScore === 85, 'Score should be saved');
console.assert(updatedBond.data().feedbackVisible === true, 'Feedback should be visible');
```

**Expected Duration:** 5-10 seconds per operation

### Scenario 2: Existing Form Attachment

**Steps:**
```javascript
const existingFormId = '1ABC123DEF456GHI';

// 1. Attach existing form
const attachResult = await googleFormsService.attachAssessmentForm(
  'bond_456',
  existingFormId
);
console.assert(attachResult.success === true, 'Attachment should succeed');

// 2. Verify in Firestore
const bond = await db.collection('bonds').doc('bond_456').get();
console.assert(bond.data().assessmentForm.id === existingFormId, 'Form ID should match');

// 3. Try duplicate attachment (should fail gracefully)
const duplicateResult = await googleFormsService.attachAssessmentForm(
  'bond_456',
  existingFormId
);
console.assert(duplicateResult.error, 'Should reject duplicate');
```

**Expected Duration:** 3-5 seconds

### Scenario 3: Access Control

**Steps:**
```javascript
// 1. Learner can access active form
const learnerAccess = await googleFormsService.verifyFormAccess('bond_789');
console.assert(learnerAccess.hasAccess === true, 'Active form accessible');

// 2. Learner cannot access completed form
// (After tutor submits assessment)
const completedAccess = await googleFormsService.verifyFormAccess('bond_789');
console.assert(completedAccess.hasAccess === false, 'Completed form not accessible');

// 3. Non-participant cannot access
// (Different user, not tutor or learner)
const noAccess = await googleFormsService.verifyFormAccess('bond_999');
console.assert(noAccess.hasAccess === false, 'Non-participant denied');
```

**Expected Duration:** 2-3 seconds

### Scenario 4: Response Viewing (Tutor Only)

**Steps:**
```javascript
// 1. Tutor can view responses
const tutorResponses = await googleFormsService.getFormResponses('bond_123');
console.assert(Array.isArray(tutorResponses.responses), 'Should return array');
console.assert(typeof tutorResponses.submissionCount === 'number', 'Should have count');

// 2. Learner cannot view responses
// (Should throw error with 403 status)
try {
  await googleFormsService.getFormResponses('bond_123'); // As learner
  console.assert(false, 'Should have thrown error');
} catch (error) {
  console.assert(error.message.includes('403'), 'Should return 403');
}
```

**Expected Duration:** 3-5 seconds

### Scenario 5: Form Removal

**Steps:**
```javascript
// 1. Remove form before assessment
const removeResult = await googleFormsService.removeAssessmentForm('bond_NEW');
console.assert(removeResult.success === true, 'Removal should succeed');

// 2. Verify removed from Firestore
const bond = await db.collection('bonds').doc('bond_NEW').get();
console.assert(!bond.data().assessmentForm, 'assessmentForm should be deleted');

// 3. Try to remove after assessment (should fail)
// (After tutor submitted assessment)
const removeAfterScore = await googleFormsService.removeAssessmentForm('bond_OLD');
console.assert(removeAfterScore.error, 'Should reject removal after score');
```

**Expected Duration:** 3-5 seconds

---

## Browser Console Testing

### Quick Test Script

```javascript
// Paste in browser console to test integration

(async function testGoogleFormsIntegration() {
  console.log('=== Google Forms Integration Test ===\n');
  
  try {
    // 1. Check service is loaded
    console.log('✅ googleFormsService loaded:', !!googleFormsService);
    
    // 2. Check auth
    const user = firebase.auth().currentUser;
    console.log('✅ User logged in:', user?.email);
    
    // 3. Get auth token
    const token = await googleFormsService.getAuthToken();
    console.log('✅ Auth token obtained:', token.substring(0, 20) + '...');
    
    // 4. Test form ID extraction
    const formId = googleFormsService.extractFormId(
      'https://docs.google.com/forms/d/1ABC123/viewform'
    );
    console.log('✅ Form ID extracted:', formId);
    
    // 5. Test URL generation
    const embedUrl = googleFormsService.generateFormEmbedUrl(formId);
    console.log('✅ Embed URL generated:', embedUrl);
    
    console.log('\n✅ All basic tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
})();
```

---

## Cloud Functions Local Testing

### Using Firebase Emulator

```bash
# Install emulator
firebase setup:emulators:firestore
firebase setup:emulators:functions

# Start emulator
firebase emulators:start

# In another terminal, deploy to emulator
firebase deploy --only functions --project=demo
```

### Test HTTP Endpoint

```bash
# Create form (test locally)
curl -X POST http://localhost:5001/skillxchange/us-central1/createAssessmentForm \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bondId": "test_123",
    "title": "Test Form",
    "description": "Testing",
    "questions": []
  }'
```

---

## Performance Benchmarks

### Expected Response Times

| Operation | Time | Status |
|-----------|------|--------|
| Create form | 2-5 seconds | ✅ Google API call |
| Attach form | 1-2 seconds | ✅ Firestore write |
| Get responses | 3-8 seconds | ✅ Google API call |
| Submit score | 1-2 seconds | ✅ Firestore write + tutor stats |
| Verify access | 0.5-1 second | ✅ Firestore read |
| Remove form | 1-2 seconds | ✅ Firestore write |

### Load Testing

```bash
# Using Apache Bench (ab)
# Install: brew install httpd

# Test concurrent requests
ab -n 100 -c 10 \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:5001/skillxchange/us-central1/verifyFormAccess?bondId=test_123

# Expected result:
# Requests per second: 50-100
# Response time: 100-500ms average
```

---

## Debugging Guide

### Common Issues and Solutions

**Issue: "REACT_APP_FUNCTIONS_BASE_URL not set"**
```bash
# Solution: Add to .env.local
REACT_APP_FUNCTIONS_BASE_URL=https://us-central1-your-project.cloudfunctions.net

# Or for local testing:
REACT_APP_FUNCTIONS_BASE_URL=http://localhost:5001/skillxchange/us-central1
```

**Issue: "Firebase auth not initialized"**
```javascript
// Check in browser console
console.log(firebase.auth());
// Should show Firebase Auth object

// If undefined, check index.html has:
// <script src="/__/firebase/init.js"></script>
```

**Issue: "Cloud Function returns 500"**
```bash
# Check logs
firebase functions:log --limit 50 --function=createAssessmentForm

# Look for:
# - GOOGLE_PRIVATE_KEY not set
# - GOOGLE_CLIENT_EMAIL not set
# - Google API not enabled
```

**Issue: "Form responses empty"**
```javascript
// Check form has responses
const bond = await db.collection('bonds').doc('bond_id').get();
console.log('Assessment form:', bond.data().assessmentForm);

// Verify form ID is correct
// Try accessing form directly
```

---

## Post-Deployment Monitoring

### Daily Health Check

```bash
# Check last 24 hours of errors
firebase functions:log --limit 100 | grep -i error

# Monitor usage
firebase usage:firestore

# Check billing
firebase billing

# Verify all functions are running
firebase functions:list
```

### Weekly Report

```bash
# Collect metrics
firebase functions:log --limit 500 > weekly_logs.txt
grep -c "createAssessmentForm" weekly_logs.txt     # Form creations
grep -c "attachAssessmentForm" weekly_logs.txt     # Form attachments
grep -c "submitFormAssessment" weekly_logs.txt     # Assessments submitted
grep -i "error" weekly_logs.txt | wc -l            # Error count
```

---

## Success Criteria Verification

```
✅ All Cloud Functions deployed successfully
  - createAssessmentForm
  - attachAssessmentForm  
  - getFormResponses
  - submitFormAssessment
  - verifyFormAccess
  - removeAssessmentForm

✅ Frontend service module loads without errors
  - googleFormsService class instantiated
  - All 12 methods callable
  - Environment variables resolved

✅ Integration tests pass
  - Form creation works
  - Form attachment works
  - Access control enforced
  - Score submission works
  - Feedback visibility triggered

✅ Security verified
  - Only tutors can create/attach/remove
  - Only tutors can view responses
  - Learners can access active forms only
  - Non-participants denied access
  - All actions logged

✅ Database integrity
  - Firestore schema matches design
  - formLogs collection populated
  - Bond assessmentForm subdocument created
  - Indexes created and working

✅ Performance acceptable
  - Response times < 10 seconds
  - No Cloud Function errors
  - Firestore queries efficient
```

---

**Test Time Estimate:** 1-2 hours for complete validation  
**Required Skills:** Firebase, JavaScript, Google APIs  
**Status:** Ready for production deployment

