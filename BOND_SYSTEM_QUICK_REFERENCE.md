# Bond System Quick Reference

## Key Functions Map

### User Actions → Function Calls

#### Learner sends bond request
```
Click "Connect" on post/profile
├─ initiateBond(postId, tutorId)
├─ checkExistingBondRequest() [validation]
├─ showBondRequestModal()
└─ sendBondRequest(postId, tutorId) [creates bond_request doc]
```

#### Tutor receives notification
```
Badge appears on "Bond Requests" menu
├─ updateBondRequestBadge() [runs on auth change]
└─ Shows count of pending incoming requests
```

#### Tutor opens Bond Requests page
```
Click "Bond Requests" in menu
├─ switchPage('bond-requests', this)
├─ loadBondRequests()
├─ Shows: Incoming (requests TO tutor) & Outgoing (sent BY learner)
└─ Real-time updates via onSnapshot()
```

#### Tutor accepts request
```
Click "Accept" on incoming request
├─ acceptBondRequest(requestId)
├─ Creates bond doc with status='active'
├─ Updates bond_request with status='accepted'
└─ location.reload() [refreshes page]
```

#### Tutor rejects request
```
Click "Reject" on incoming request
├─ rejectBondRequest(requestId)
├─ Updates bond_request with status='rejected'
├─ NO bond document created
└─ Page reloads
```

#### Learner cancels request
```
Click "Cancel Request" on outgoing request
├─ cancelBondRequest(requestId)
├─ Deletes bond_request document
└─ Page reloads
```

#### User opens Bond History
```
Click "Bond History" in menu
├─ switchPage('bond-history', this)
├─ loadBondHistory()
├─ Shows all bonds (active/completed/broken)
└─ Real-time updates
```

#### User views bond details
```
Click "View Details" on bond card
├─ viewBondDetails(bondId)
├─ Loads bond data from Firestore
├─ Populates shared bond interface
├─ switchPage('shared-bond', null)
└─ Shows full details & actions
```

#### Tutor submits assessment
```
Click "Add Assessment" in shared interface
├─ showAssessmentForm()
├─ Prompts for score (0-100) & comment
├─ Updates bond with assessment data
└─ Refreshes view
```

#### Learner submits feedback
```
Click "Add Feedback" in shared interface
├─ showFeedbackForm()
├─ Prompts for rating (1-5) & comment
├─ Updates bond with feedback object
└─ Refreshes view
```

#### User ends active bond
```
Click "End Bond" in shared interface
├─ breakBondFromInterface() [or breakBond(bondId)]
├─ Prompts for reason
├─ Updates bond status='broken'
└─ Redirects to history
```

---

## Firestore Queries at a Glance

### Get pending requests for tutor
```javascript
db.collection('bond_requests')
  .where('tutorId', '==', currentUser)
  .where('status', '==', 'pending')
  .onSnapshot(...)
```

### Get pending requests sent by learner
```javascript
db.collection('bond_requests')
  .where('learnerId', '==', currentUser)
  .where('status', '==', 'pending')
  .onSnapshot(...)
```

### Get all active bonds
```javascript
// As tutor
db.collection('bonds')
  .where('tutorId', '==', currentUser)
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .onSnapshot(...)

// As learner
db.collection('bonds')
  .where('learnerId', '==', currentUser)
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .onSnapshot(...)
```

### Get specific bond
```javascript
db.collection('bonds').doc(bondId).get()
```

---

## UI Elements

### Menu Item
- Location: Sidebar
- Icon: `fas fa-bell`
- Text: "Bond Requests"
- Badge: `id="bond-req-badge"` (shows count)

### Pages
1. `id="bond-requests"` - Incoming & Outgoing requests
2. `id="bond-history"` - All bonds (active/completed/broken)
3. `id="shared-bond"` - Detailed bond interface

### Cards
- Request cards: Show skills, date, action buttons
- Bond cards: Show status, assessment, feedback
- Shared interface: Multi-section layout

---

## Data Flow

```
┌─────────────────────────┐
│   Learner sends         │
│   bond_request doc      │ (status: pending)
│   to Firestore          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Tutor receives        │
│   notification badge    │
│   with request count    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Tutor reviews in      │
│   "Bond Requests"       │
│   page                  │
└───────────┬─────────────┘
            │
      ┌─────┴─────┐
      ▼           ▼
┌──────────┐  ┌──────────┐
│ Accept   │  │ Reject   │
└────┬─────┘  └────┬─────┘
     │            │
     ▼            ▼
  Create       Update
  Bond Doc    Request
  (active)    (rejected)
     │
     ▼
┌─────────────────────────┐
│   Both users access     │
│   Shared Bond Interface │
│   for tutoring          │
└─────────────────────────┘
```

---

## Common Patterns

### Real-time listener (multiple docs)
```javascript
db.collection('bond_requests')
  .where('field', '==', value)
  .onSnapshot(snapshot => {
    snapshot.forEach(doc => {
      // Handle each document
    })
  })
```

### Real-time listener (single doc)
```javascript
db.collection('bonds').doc(bondId).onSnapshot(doc => {
  const data = doc.data()
  // Update UI
})
```

### Create document
```javascript
const ref = await db.collection('collection').add({
  field1: value1,
  timestamp: firebase.firestore.FieldValue.serverTimestamp()
})
return ref.id // Document ID
```

### Update document
```javascript
await db.collection('collection').doc(docId).update({
  field: newValue,
  timestamp: firebase.firestore.FieldValue.serverTimestamp()
})
```

### Delete document
```javascript
await db.collection('collection').doc(docId).delete()
```

---

## Status Values

### bond_requests
- `pending` - Awaiting tutor response
- `accepted` - Tutor accepted, bond created
- `rejected` - Tutor rejected, no bond created

### bonds
- `active` - Currently in progress
- `completed` - Finished successfully
- `broken` - Ended early by either party

---

## Role-Based Visibility

### For Tutors
- See: Incoming requests, bonds as tutor, assessment section
- Can: Accept/Reject requests, submit assessments, end bonds
- Access: "Bond Requests" menu with incoming tab

### For Learners
- See: Outgoing requests, bonds as learner, feedback section
- Can: Send requests, cancel requests, submit feedback, end bonds
- Access: "Bond Requests" menu with outgoing tab

---

## Error Handling

All functions include:
```javascript
try {
  // Main logic
} catch (error) {
  console.error('Error:', error)
  alert('User-friendly error message')
}
```

Common validations:
- ✅ User authentication
- ✅ Role verification
- ✅ Document existence
- ✅ Field value ranges
- ✅ Duplicate prevention
- ✅ Timestamp tracking

---

## Testing Checklist

- [ ] Create bond request
- [ ] See notification badge
- [ ] Accept bond request
- [ ] Verify bond created
- [ ] Open shared interface
- [ ] Submit assessment (tutor)
- [ ] Submit feedback (learner)
- [ ] End bond
- [ ] Verify bond history
- [ ] Test on mobile
- [ ] Test real-time updates
- [ ] Check console for errors

---

## File Locations

**Main Implementation**: `/public/index.html`
- Functions: Lines 2075-2700
- Pages: Lines 510-700
- Menu: Lines 240-250

**Modified File**: `/public/profile.html`
- Removed: Bond History section
- Removed: loadBondHistory() function

**Documentation**: `BOND_SYSTEM_REFACTOR_COMPLETE.md`

---

**Version**: 1.0 Complete  
**Status**: Production Ready ✅  
**Last Updated**: Current Session
