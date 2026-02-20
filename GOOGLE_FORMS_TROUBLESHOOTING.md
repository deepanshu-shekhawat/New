# Google Forms Integration - Troubleshooting Quick Reference

## 🚨 Critical Issues & Immediate Fixes

### Cloud Functions Won't Deploy

**Error: "Cannot find module 'googleapis'"**
```bash
# ✅ Fix:
cd functions
npm install googleapis@118.0.0 --save
firebase deploy --only functions
```

**Error: "GOOGLE_PRIVATE_KEY is not defined"**
```bash
# ✅ Fix:
1. Check .env.local exists in project root
2. Verify format: GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
3. Note: Use literal \n characters, not actual newlines
4. Restart Firebase emulator or redeploy functions
```

**Error: "The service account used by Cloud Build does not have necessary permissions"**
```bash
# ✅ Fix:
gcloud projects get-iam-policy YOUR_PROJECT_ID
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=serviceAccount:YOUR_SERVICE_ACCOUNT@appspot.gserviceaccount.com \
  --role=roles/editor
```

---

### Google Forms API Errors

**Error: "The caller does not have permission"**
```
Service account doesn't have Forms API access

✅ Fix:
1. Google Cloud Console → IAM & Admin
2. Find service account
3. Click Edit
4. Add roles:
   - Editor (or)
   - Google Forms API User
   - Google Drive API Editor
5. Wait 1-2 minutes for propagation
6. Try again
```

**Error: "API is not enabled"**
```
Google Forms API not enabled in Google Cloud

✅ Fix:
1. Google Cloud Console → APIs & Services
2. Search "Google Forms API"
3. Click Enable
4. Search "Google Drive API"  
5. Click Enable
6. Wait 2-3 minutes
```

**Error: "Invalid API key"**
```
Credentials are malformed

✅ Fix:
1. Check GOOGLE_PRIVATE_KEY format exactly:
   - Should start with -----BEGIN PRIVATE KEY-----
   - Should end with -----END PRIVATE KEY-----
   - Each line break represented as \n
2. Re-download key from Google Cloud Console
3. Update .env.local
4. Redeploy functions
```

---

### Frontend Errors

**Error: "googleFormsService is not defined"**
```javascript
Service module not loaded in HTML

✅ Fix in public/index.html:
Add before closing body tag:
<script src="./js/googleFormsService.js"></script>

Check file exists: ls -la public/js/googleFormsService.js
```

**Error: "fetch failed to call Cloud Function"**
```
REACT_APP_FUNCTIONS_BASE_URL incorrect

✅ Fix:
1. .env.local check: cat .env.local | grep FUNCTIONS_BASE_URL
2. Should match your Firebase project:
   REACT_APP_FUNCTIONS_BASE_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net
3. For local dev:
   REACT_APP_FUNCTIONS_BASE_URL=http://localhost:5001/skillxchange/us-central1
4. Restart dev server after changing
5. Clear browser cache: Ctrl+Shift+Delete
```

**Error: "Authorization header missing"**
```
Firebase auth token not being sent

✅ Fix in googleFormsService.js:
Ensure every fetch includes:
headers: {
  'Authorization': `Bearer ${token}`
}

Or verify user is logged in:
firebase.auth().currentUser should not be null
```

---

### Firestore Issues

**Error: "Permission denied" when reading forms**
```
Firestore security rules blocking access

✅ Fix:
1. Firebase Console → Firestore → Rules
2. Add rules for formLogs collection:
   match /formLogs/{document=**} {
     allow create: if request.auth != null;
     allow read: if request.auth.uid == resource.data.userId;
   }
3. Deploy rules:
   firebase deploy --only firestore:rules
4. Verify: Check bond document can be read by participants
```

**Error: "Index not found" when querying bonds**
```
Missing Firestore composite index

✅ Fix:
1. Check error message for index URL
2. Click link in error to create index automatically
3. Or manually:
   - Firestore → Indexes → Create Index
   - Collection: bonds
   - Fields: bondId ↑, createdAt ↓
   - Create
4. Wait 5-10 minutes for index build
```

**Error: "Document not found" after form creation**
```
Form metadata not saved to Firestore

✅ Fix:
Check Cloud Function logs:
firebase functions:log --function=createAssessmentForm

Look for Firestore write operation
Verify bonds collection exists
Ensure bond document exists before attaching form
```

---

### Access Control Issues

**Learner can see form responses (shouldn't be possible)**
```
Authorization check missing

✅ Fix in googleFormsIntegration.js:
Line ~164: Verify this check exists:
if (bond.tutorId !== userEmail) {
  return res.status(403).json({ 
    error: 'Only tutor can view responses' 
  });
}

If missing, add it back
Redeploy: firebase deploy --only functions
```

**Tutor cannot remove form after assessment**
```
This is intentional - prevents data loss

✅ Verify intended behavior:
- Before assessment: ✅ Can remove
- After assessment: ❌ Cannot remove (protection)

If need to remove after assessment:
Use Firestore console to manually delete assessmentForm field
```

---

## 🔍 Diagnostic Commands

### Check Cloud Functions Status

```bash
# List all functions
firebase functions:list

# Check specific function
firebase functions:list | grep createAssessmentForm

# View function logs (real-time)
firebase functions:log

# View specific function logs
firebase functions:log --function=createAssessmentForm

# View errors only
firebase functions:log | grep ERROR

# Export logs to file
firebase functions:log --limit 500 > debug.log
```

### Check Environment Variables

```bash
# Verify .env.local exists
cat .env.local

# Check specific variable
grep REACT_APP_FUNCTIONS_BASE_URL .env.local

# Verify no secrets in code
git grep "private_key" -- ':!.env*'
git grep "client_secret" -- ':!.env*'
```

### Check Firestore Data

```bash
# Using Firebase CLI
firebase firestore:inspect

# Or manually:
# Firebase Console → Firestore
# 1. Find bonds collection
# 2. Look for assessmentForm subdocument
# 3. Check formLogs collection exists
# 4. Verify entries have timestamp, userId, action
```

### Check Service Account Permissions

```bash
# List service account roles
gcloud iam service-accounts get-iam-policy \
  skillxchange-forms@YOUR_PROJECT.iam.gserviceaccount.com

# Grant additional roles if needed
gcloud projects add-iam-policy-binding YOUR_PROJECT \
  --member=serviceAccount:skillxchange-forms@YOUR_PROJECT.iam.gserviceaccount.com \
  --role=roles/editor
```

---

## 📋 Testing Checklist Before Going Live

```
Frontend Tests:
☐ googleFormsService.js loads without errors
☐ Browser console: console.log(googleFormsService) returns object
☐ All 12 service methods are callable
☐ Form ID extraction works (test with real URL)
☐ URL generation works (test embed and share URLs)

Backend Tests:
☐ All 6 Cloud Functions deployed successfully
☐ firebase functions:list shows all functions
☐ No errors in Cloud Function logs
☐ Each function returns proper response format

Authentication Tests:
☐ User must be logged in to use service
☐ Invalid token returns 401
☐ Missing auth header returns 401
☐ Valid token allows access

Authorization Tests:
☐ Tutor can create form
☐ Tutor can attach form
☐ Tutor can view responses
☐ Learner cannot view responses (403)
☐ Learner can access active form
☐ Learner cannot access completed form
☐ Non-participants cannot access form

Database Tests:
☐ Form created → saved to bond.assessmentForm
☐ Form attached → ID stored in Firestore
☐ Score submitted → bond.assessmentScore updated
☐ Submission → logged to formLogs collection
☐ Feedback visible → bond.feedbackVisible set to true

Integration Tests:
☐ Create form → Attach form → Submit score → Verify all updates
☐ Score submission → updateTutorStats called
☐ Badge calculation → triggered by score
☐ Feedback → visible to learner after assessment

Performance Tests:
☐ Create form: < 10 seconds
☐ Get responses: < 10 seconds
☐ Verify access: < 2 seconds
☐ Submit score: < 3 seconds
☐ No timeout errors
☐ No memory leaks in Cloud Functions

Security Tests:
☐ Secrets not in code/logs
☐ .env.local in .gitignore
☐ CORS properly configured
☐ No plaintext passwords logged
☐ Form links not shared insecurely
```

---

## 📞 When to Escalate

**Contact Google Cloud Support if:**
- Service account creation fails
- API enablement doesn't work after 1 hour
- Persistent 403/401 from Google API despite correct permissions

**Contact Firebase Support if:**
- Cloud Functions won't deploy
- Firestore writes failing with 1000+ errors
- Security rules deployment fails

**Check Documentation if:**
- Unsure about Firestore rules syntax → Firebase Docs
- Unsure about API endpoint format → GOOGLE_FORMS_INTEGRATION.md
- Unsure about environment setup → GOOGLE_FORMS_SETUP.md

---

## 🎯 Resolution Workflow

**Step 1: Identify Error Type**
- Is it from Cloud Functions (see logs)?
- Is it from browser (see console)?
- Is it from Firestore (see data)?

**Step 2: Check Recent Changes**
- Did you deploy functions?
- Did you update .env.local?
- Did you enable APIs?

**Step 3: Verify Prerequisites**
- Is Firebase project created?
- Is service account created?
- Are APIs enabled?
- Is .env.local configured?

**Step 4: Check Logs**
```bash
firebase functions:log
# Look for error messages with line numbers
# Search for specific function name
```

**Step 5: Test in Isolation**
```javascript
// Test each function separately
await googleFormsService.createAssessmentForm('test', 'Test', 'Test', []);
// Did this work?

await googleFormsService.extractFormId('https://...');
// Did this work?
```

**Step 6: Clean and Restart**
```bash
# Clear everything and restart fresh
rm .env.local
npm cache clean --force
firebase emulators:start --force
# Reconfigure .env.local
# Redeploy functions
```

---

## 📊 Common Error Codes

| Code | Meaning | Common Cause | Quick Fix |
|------|---------|--------------|-----------|
| 400 | Bad Request | Invalid input | Check request format |
| 401 | Unauthorized | Missing/invalid token | Login and retry |
| 403 | Forbidden | Not permitted (tutor-only) | Switch to tutor account |
| 404 | Not Found | Resource missing | Check bond ID exists |
| 500 | Server Error | Cloud Function crashed | Check function logs |
| TIMEOUT | Request timeout | API taking too long | Increase timeout or check network |

---

## 🔗 Quick Links

- [Google Cloud Console](https://console.cloud.google.com)
- [Firebase Console](https://console.firebase.google.com)
- [Google Forms API Docs](https://developers.google.com/forms/api)
- [Cloud Functions Docs](https://cloud.google.com/functions/docs)
- [Firestore Rules](https://firebase.google.com/docs/firestore/security/start)

---

**Last Updated:** 2024  
**Status:** Production Ready  
**Difficulty:** Intermediate  

**Need more help?** Check GOOGLE_FORMS_INTEGRATION.md or GOOGLE_FORMS_SETUP.md

