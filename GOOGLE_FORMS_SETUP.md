# Google Forms Integration - Setup & Deployment Guide

## Quick Start (5 Minutes)

### 1. Create Google Service Account

```bash
# Go to Google Cloud Console
https://console.cloud.google.com

# Create new project (or select existing)
# Project Name: SkillXchange Forms

# Enable APIs:
1. APIs & Services → Enable APIs and Services
2. Search "Google Forms API" → Enable
3. Search "Google Drive API" → Enable
4. Search "Google Sheets API" → Enable (optional, for advanced features)
```

### 2. Create Service Account Key

```bash
# In Google Cloud Console:
1. APIs & Services → Credentials
2. Create Credentials → Service Account
   - Service Account Name: skillxchange-forms
   - Grant roles:
     * Viewer (basic read)
     * Forms Editor (to create forms)
3. Create Key → JSON
4. Download JSON file
5. Keep safe! Add to .gitignore
```

### 3. Configure Environment

```bash
# Create .env.local in project root
cat > .env.local << 'EOF'
# Google Forms API
REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_EMAIL=your_service@your_project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Key_Here\n-----END PRIVATE KEY-----\n"

# Firebase
REACT_APP_FUNCTIONS_BASE_URL=https://us-central1-your-project.cloudfunctions.net

# Form settings
REACT_APP_FORM_RESPONSE_TIMEOUT=30000
REACT_APP_MAX_FORM_ATTACHMENT_SIZE=5242880
EOF
```

### 4. Deploy Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Deploy
firebase deploy --only functions

# Verify deployment
firebase functions:list

# Output should show:
# ✓ createAssessmentForm
# ✓ attachAssessmentForm
# ✓ getFormResponses
# ✓ submitFormAssessment
# ✓ verifyFormAccess
# ✓ removeAssessmentForm
# ✓ syncFormResponses
```

### 5. Update Firestore Indexes

Go to Firebase Console → Firestore → Indexes

**Create Index 1:**
- Collection: `formLogs`
- Fields: `bondId (Ascending)`, `timestamp (Descending)`

**Create Index 2:**
- Collection: `bonds`
- Field: `formStatus (Ascending)`

### 6. Test Integration

```javascript
// In browser console (index.html)

// Test 1: Create form
await googleFormsService.createAssessmentForm(
  'bond_123',
  'Test Assessment',
  'A test form',
  []
);

// Test 2: Verify service is loaded
console.log(googleFormsService);

// Test 3: Extract form ID
googleFormsService.extractFormId('https://docs.google.com/forms/d/1ABC123/viewform');
// Should output: '1ABC123'
```

**Done!** Google Forms integration is now active.

---

## Detailed Setup Instructions

### Step 1: Google Cloud Project Setup

#### Create Project
```bash
# Visit Google Cloud Console
https://console.cloud.google.com

# Click on project dropdown (top left)
# Click "NEW PROJECT"
# Project Name: SkillXchange
# Organization: (if applicable)
# Create
```

#### Enable Required APIs
```bash
# In Cloud Console, go to APIs & Services
# Search for these APIs and enable each:

1. Google Forms API
   - Search "forms"
   - Click "Google Forms API"
   - Click "Enable"

2. Google Drive API
   - Search "drive"
   - Click "Google Drive API"
   - Click "Enable"

3. Google Sheets API (optional)
   - Search "sheets"
   - Click "Google Sheets API"
   - Click "Enable"
```

#### Create Service Account
```bash
# APIs & Services → Credentials
# Click "Create Credentials"
# Select "Service Account"

Service Account Details:
- Service Account Name: skillxchange-forms
- Service Account ID: skillxchange-forms
- Description: Google Forms integration for SkillXchange

Grant these roles:
- Editor (full access)
  OR
- Roles needed:
  - Google Forms Viewer
  - Google Forms Editor
  - Google Drive Editor (limited)
```

#### Create and Download Key
```bash
# After creating service account:
# Click on service account name
# Go to "Keys" tab
# Click "Add Key" → Create new key
# Select JSON
# Click Create
# Key file downloads automatically

# Save as: /path/to/project/google-service-key.json
# Add to .gitignore !!!
```

### Step 2: Extract Credentials

```bash
# Open downloaded JSON file
cat google-service-key.json

# You'll see:
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key_id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "service-account@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  ...
}

# Copy these values:
# - private_key (with \n for newlines)
# - client_email
# - client_id
```

### Step 3: Configure Environment Variables

#### Create .env.local File
```bash
cd /path/to/SkillXchange
cat > .env.local << 'EOF'
# ===== GOOGLE FORMS API =====

# From service account JSON:
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...(your key)...YI2wIDAQAB\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_ID=1234567890

# For React frontend (OAuth, if using):
REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=your_client_secret (for backend only)

# ===== FIREBASE =====
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# ===== CLOUD FUNCTIONS =====
REACT_APP_FUNCTIONS_BASE_URL=https://us-central1-your-project.cloudfunctions.net

# ===== FORM SETTINGS =====
REACT_APP_FORM_RESPONSE_TIMEOUT=30000
REACT_APP_MAX_FORM_ATTACHMENT_SIZE=5242880
EOF
```

#### Verify .gitignore
```bash
# Make sure .env.local is in .gitignore
cat .gitignore | grep -i "env"

# Should see: .env.local
# If not, add it:
echo ".env.local" >> .gitignore
echo "google-service-key.json" >> .gitignore
```

### Step 4: Setup Cloud Functions

#### Install Dependencies
```bash
cd functions

# Check package.json has these:
npm list googleapis
npm list google-auth-library
npm list cors

# If missing:
npm install googleapis@118.0.0 --save
npm install google-auth-library --save
npm install cors --save
```

#### Update functions/index.js
```javascript
// Make sure these are exported:

const functions = require('firebase-functions');
const googleFormsIntegration = require('./googleFormsIntegration');

// Export all functions
exports.createAssessmentForm = googleFormsIntegration.createAssessmentForm;
exports.attachAssessmentForm = googleFormsIntegration.attachAssessmentForm;
exports.getFormResponses = googleFormsIntegration.getFormResponses;
exports.submitFormAssessment = googleFormsIntegration.submitFormAssessment;
exports.verifyFormAccess = googleFormsIntegration.verifyFormAccess;
exports.removeAssessmentForm = googleFormsIntegration.removeAssessmentForm;
exports.syncFormResponses = googleFormsIntegration.syncFormResponses;
```

#### Deploy Functions
```bash
# From project root
firebase deploy --only functions

# Should see:
# ✓ createAssessmentForm
# ✓ attachAssessmentForm
# ✓ getFormResponses
# ✓ submitFormAssessment
# ✓ verifyFormAccess
# ✓ removeAssessmentForm
# ✓ syncFormResponses

# Get URLs:
firebase functions:list
```

### Step 5: Setup Firestore Indexes

#### Index 1: Form Logs
```
Collection: formLogs
Fields to index:
- bondId (Ascending)
- timestamp (Descending)

Scope: Collection
```

#### Index 2: Bonds Form Status
```
Collection: bonds
Field: formStatus (Ascending)

Scope: Collection
```

#### Index 3: Form Response Tracking
```
Collection: formLogs
Fields:
- userId (Ascending)
- action (Ascending)
- timestamp (Descending)
```

### Step 6: Firestore Security Rules

Add to Firestore Rules:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Form Logs - only authenticated users can read/write their own logs
    match /formLogs/{document=**} {
      allow create: if request.auth != null;
      allow read: if request.auth.uid == resource.data.userId;
      allow list: if request.auth != null && 
                     request.query.filters.fieldFilter.field.fieldPath == 'bondId';
    }

    // Bonds - existing rules remain
    // Add form-specific rules:
    match /bonds/{bondId} {
      allow read: if request.auth != null &&
                     (request.auth.token.email == resource.data.tutorId ||
                      request.auth.token.email == resource.data.learnerId);
      
      allow update: if request.auth != null &&
                       (request.auth.token.email == resource.data.tutorId ||
                        request.auth.token.email == resource.data.learnerId);
    }
  }
}
```

### Step 7: Test Integration

#### Test Form Creation
```javascript
// Browser console in index.html

const bondId = 'test_bond_123';
const title = 'Test Assessment';
const description = 'Test form description';
const questions = [
  {
    type: 'multiple_choice',
    title: 'Test Question?',
    options: ['Yes', 'No'],
    required: true
  }
];

googleFormsService.createAssessmentForm(bondId, title, description, questions)
  .then(result => {
    console.log('Form created:', result);
    console.log('Form URL:', result.formUrl);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

#### Test Form Attachment
```javascript
const bondId = 'test_bond_123';
const formId = '1ABC123DEF456GHI'; // From Google Forms URL

googleFormsService.attachAssessmentForm(bondId, formId)
  .then(result => {
    console.log('Form attached:', result);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

#### Check Cloud Function Logs
```bash
firebase functions:log

# Or in Firebase Console:
# Cloud Functions → Select function → Logs
```

---

## Troubleshooting

### "GOOGLE_PRIVATE_KEY not found"
**Solution:**
```bash
# Check .env.local exists and has content
cat .env.local

# Ensure private key includes literal \n:
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Restart dev server after adding env vars
```

### "Failed to authenticate with Google API"
**Solution:**
```bash
# Verify service account email has proper permissions
# In Google Cloud Console:
1. Go to IAM & Admin
2. Find your service account
3. Edit it
4. Add roles:
   - Editor
   - Google Forms Editor
5. Save and try again
```

### "Cloud Functions deployment fails"
**Solution:**
```bash
# Check Node version
node --version  # Should be 18+

# Clear dependencies and reinstall
cd functions
rm -rf node_modules package-lock.json
npm install

# Deploy again
firebase deploy --only functions

# Check logs
firebase functions:log
```

### "Forms API not enabled"
**Solution:**
```bash
# In Google Cloud Console:
1. APIs & Services → Library
2. Search "Google Forms API"
3. Click Enable

# Wait 1-2 minutes for changes to propagate
```

### "Access denied when creating form"
**Solution:**
```bash
# Service account needs Forms Editor role
# In Google Cloud Console:
1. IAM & Admin → Service Accounts
2. Click your service account
3. Edit → Add Role
4. Search "Forms" → Select "Viewer" and "Editor" roles
5. Save

# Or use a broader role like "Editor" for testing
```

### "Form URL is invalid"
**Solution:**
```bash
# Ensure form ID is correct format
const formId = googleFormsService.extractFormId(urlInput);
console.log('Extracted ID:', formId);

// Should be alphanumeric with hyphens/underscores only
// Example: 1ABC123DEF456GHI
```

---

## Verification Checklist

After setup, verify everything works:

```
☐ .env.local created with credentials
☐ Google Cloud APIs enabled (Forms, Drive)
☐ Service account created and key downloaded
☐ Cloud Functions deployed successfully
☐ Firestore indexes created
☐ googleFormsService.js loaded in browser
☐ Test form creation works
☐ Test form attachment works
☐ Form appears in bond interface
☐ Learner can access form
☐ Tutor can view responses
☐ Assessment score saves correctly
☐ Feedback visibility triggered
☐ No errors in Cloud Function logs
☐ No errors in browser console
```

---

## Production Deployment

### Before Going Live

1. **Security Review**
   ```bash
   # Ensure secrets not in code
   git grep "private_key" -- ':!.env.*'
   
   # Should return nothing
   ```

2. **Test All Flows**
   - Create form
   - Attach form
   - Learner submits
   - Tutor reviews
   - Score submission
   - Feedback visibility

3. **Monitor Logs**
   - Check Cloud Functions logs for errors
   - Monitor Firestore usage
   - Check Auth token usage

4. **Performance Test**
   - Create 10+ forms
   - Get responses with 100+ submissions
   - Verify response times < 5 seconds

5. **Load Test**
   - Simulate 100 concurrent form access
   - Check Cloud Function scaling
   - Monitor costs

### Deployment Steps

```bash
# 1. Verify all code is committed
git status

# 2. Deploy Cloud Functions
firebase deploy --only functions

# 3. Deploy frontend
npm run build
firebase deploy --only hosting

# 4. Verify deployment
firebase functions:list

# 5. Monitor for 24 hours
firebase functions:log --limit 50
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor Cloud Function errors
- Check Firestore usage
- Review form logs for issues

**Monthly:**
- Backup form data
- Review quota usage
- Update dependencies
- Test disaster recovery

**Quarterly:**
- Review security configuration
- Update API credentials (rotation)
- Performance optimization
- Cost analysis

### Updating Credentials

```bash
# Every 90 days, rotate credentials
# In Google Cloud Console:

1. IAM & Admin → Service Accounts
2. Select service account
3. Keys tab → Add Key
4. Create new JSON key
5. Download new key
6. Update .env.local
7. Redeploy Cloud Functions
8. Delete old key

# Verify in Cloud Function logs that new key works
```

---

## Support & Resources

### Useful Links
- [Google Forms API Docs](https://developers.google.com/forms/api)
- [Google Cloud Console](https://console.cloud.google.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions Logging](https://cloud.google.com/functions/docs/monitoring/logging)

### Debugging Commands

```bash
# View all logs
firebase functions:log

# View specific function
firebase functions:log --function=createAssessmentForm

# View with filter
firebase functions:log --limit 100 | grep "error"

# Export logs
firebase functions:log --limit 500 > functions.log
```

---

**Setup Time**: ~30 minutes  
**Difficulty**: Intermediate  
**Status**: Production Ready  

Questions? Check GOOGLE_FORMS_INTEGRATION.md for detailed API reference.
