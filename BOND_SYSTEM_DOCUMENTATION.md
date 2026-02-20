# Bond System - Complete Skill Exchange Workflow

## Overview

The Bond System is a structured peer-to-peer skill exchange partnership framework that manages the complete lifecycle of skill learning between tutors and learners on the SkillXchange platform.

## Key Features

### 1. **Bond Creation & Lifecycle**

#### States
- **Active**: Bond is ongoing, assessment and feedback can be submitted
- **Completed**: Bond finished successfully, assessment submitted, feedback received
- **Bond Break**: Mutual discontinuation, skips assessment requirement

#### Workflow
```
User clicks "Connect" button on a post
    ↓
Confirm Bond Creation Modal appears
    ↓
Bond created in Firestore (tutorId, learnerId, skillsData)
    ↓
Bond transitions to ACTIVE state
    ↓
Tutor submits Assessment (0-100 score)
    ↓
Learner submits Feedback (1-5 stars + comment)
    ↓
Tutor marks as COMPLETED
    ↓
Badges calculated and awarded
```

### 2. **Assessment System**

**Who**: Only the tutor can submit assessment
**When**: After course content is delivered (tutor initiates)
**How**: 0-100 scale score with optional feedback

```javascript
submitAssessment(bondId, score)
- Validates score is 0-100
- Only tutor can submit
- Stores assessment metadata
- Triggers feedback visibility
```

**Features:**
- Interactive slider for score selection
- Optional assessment feedback/notes
- Visual score display (0=Poor, 50=Good, 100=Excellent)
- Real-time feedback visibility gating

### 3. **Feedback System**

**Who**: Only the learner can submit feedback
**When**: After assessment is submitted (learner must wait)
**Visibility**: Initially hidden, shown only after assessment submission

```javascript
submitFeedback(bondId, rating, comment)
- Validates rating is 1-5 stars
- Only learner can submit
- Rating contributes to tutor's average rating
- Comment shown only after assessment
- Locked until assessment is complete
```

**Features:**
- 5-star interactive rating system
- Detailed comment field
- Automatic visibility toggle based on assessment completion
- Contributes to tutor badge calculations

### 4. **Bond Break (Mutual Discontinuation)**

**Trigger**: Either user can initiate
**Requirement**: Mutual agreement (both users must confirm)
**Result**: Status changes to BOND_BREAK, assessment skipped

```javascript
initiateBondBreak(bondId, reason)
- Shows confirmation modal
- Accepts optional break reason
- Both parties notified
- Assessment requirement waived
- Allows optional feedback even without assessment
```

**Features:**
- Reason tracking for analytics
- Optional feedback still available
- Prevents concurrent bond creation
- Graceful exit without penalty

### 5. **Badge System**

Badges are automatically awarded based on completed courses and learner ratings.

#### Badge Tiers

| Badge | Requirement | Appearance |
|-------|-------------|-----------|
| **Silver** 🥈 | 5+ completed courses & avg rating ≥ 3.5 | Gray medal |
| **Gold** 🥇 | 10+ completed courses & avg rating ≥ 3.5 | Gold medal |
| **Platinum** 💎 | 15+ completed courses & avg rating ≥ 3.5 | Blue crown |

```javascript
calculateBadges(tutorId)
- Counts completed bonds (status='completed')
- Calculates average rating from visible feedback
- Awards badges if thresholds met
- Updates user profile with badges array
- Badges display on tutor profile
```

**Features:**
- Dynamic calculation on bond completion
- Rating threshold of 3.5+ required
- Cumulative course counting
- Visual badge icons in profiles

### 6. **Bond History Tracking**

**Location**: User Profile → "Bond History" Section
**Shows**: All bonds (tutor perspective)
**Fields**: 
- Skills exchanged (offered ↔ learned)
- Learner username
- Bond status with visual indicator
- Creation date
- Assessment score (if completed)
- Learner rating (if submitted)

```javascript
loadBondHistory()
- Fetches all bonds where user is tutor
- Real-time updates via onSnapshot listener
- Displays in descending creation order
- Shows assessment and feedback status
- Color-coded status badges
```

## Data Model

### Bonds Collection (Firestore)

```javascript
{
  id: string,                          // Auto-generated document ID
  postId: string,                      // Reference to post that initiated bond
  tutorId: string,                     // User teaching the skill
  learnerId: string,                   // User learning the skill
  skillOffered: string,                // Skill being taught
  skillLearned: string,                // Skill being learned
  status: 'active' | 'completed' | 'bond_break',
  
  // Timeline
  createdAt: timestamp,                // Bond creation time
  completedAt: timestamp,              // Bond completion/break time
  
  // Assessment (tutor-submitted)
  assessmentScore: number (0-100),     // Null until submitted
  assessmentSubmittedBy: string,       // tutorId
  assessmentSubmittedAt: timestamp,    // Null until submitted
  
  // Feedback (learner-submitted)
  feedback: {
    rating: 1-5,                       // Star rating
    comment: string,                   // Written feedback
    submittedAt: timestamp,            // When feedback submitted
    isVisible: boolean                 // False until assessment submitted
  },
  
  // Bond Break Info
  bondBreakReason: string              // Optional reason for break
}
```

## Core Functions

### Bond Creation

```javascript
initiateBond(postId, tutorId)
```
- Entry point from "Connect" button
- Validates user is not creating bond with self
- Checks for existing active bonds
- Shows confirmation modal
- Calls createBond() on confirmation

```javascript
createBond(postId, tutorId)
```
- Creates new bond document in Firestore
- Sets initial status to 'active'
- Extracts skills from post data
- Stores creation timestamp
- Triggers page refresh to show bond in history

### Assessment Management

```javascript
showAssessmentModal(bondId)
```
- Shows interactive assessment form (tutor only)
- 0-100 score slider with visual feedback
- Optional assessment notes field
- Calls submitAssessment() on submit

```javascript
submitAssessment(bondId, score)
```
- Validates score 0-100
- Confirms user is tutor
- Updates bond with assessment score
- Records submission timestamp
- Triggers feedback visibility (learner can now see)

### Feedback Management

```javascript
showFeedbackModal(bondId)
```
- Shows interactive feedback form (learner only)
- 5-star rating selector
- Comment text area
- Calls submitFeedback() on submit

```javascript
submitFeedback(bondId, rating, comment)
```
- Validates rating 1-5
- Confirms user is learner
- Checks assessment is submitted (if bond still active)
- Updates bond feedback with comment
- Sets visibility based on assessment status
- Contributes to tutor rating calculation

### Bond Completion

```javascript
completeBond(bondId)
```
- Marks bond as 'completed' (tutor only)
- Sets completedAt timestamp
- Triggers updateTutorStats()
- Increments completed course count
- Recalculates badges

### Bond Break

```javascript
initiateBondBreak(bondId, reason)
```
- Shows break confirmation modal
- Accepts optional reason string
- Calls confirmBondBreak() on confirmation

```javascript
confirmBondBreak(bondId, reason)
```
- Changes status to 'bond_break'
- Records reason and timestamp
- Allows optional feedback even without assessment
- Prevents new concurrent bonds for users

### Statistics & Badges

```javascript
updateTutorStats(tutorId)
```
- Counts completed bonds (status='completed')
- Calculates average rating from visible feedback
- Determines which badges to award
- Updates user profile document
- Triggers badge display on profile

```javascript
calculateBadges(completedCount, avgRating)
```
- Returns array of badge types earned
- Checks: 5+ courses → 'silver'
- Checks: 10+ courses → 'gold'
- Checks: 15+ courses → 'platinum'
- Only awards if avgRating ≥ 3.5

```javascript
displayBadges(badges = [])
```
- Returns HTML icon string for badges
- Renders on user profile
- Shows tooltips with requirements

## UI Components

### 1. Connect Button (Post Card)
```html
<button onclick="initiateBond('${data.id}', '${data.author}')">
  <i class="fas fa-handshake"></i> Connect
</button>
```
- Positioned between Message and Like buttons
- Handshake icon
- Brand color styling
- Triggers bond creation workflow

### 2. Bond Creation Modal
- Confirmation of users involved (tutor/learner)
- Warning about exclusive exchange
- Cancel/Create buttons

### 3. Assessment Modal
- 0-100 score slider
- Visual score display
- Optional feedback textarea
- Submit/Cancel buttons

### 4. Feedback Modal
- 5-star interactive rating
- Comment textarea
- Submit/Cancel buttons

### 5. Bond Break Modal
- Confirmation message
- Optional break reason textarea
- Confirm/Cancel buttons

### 6. Bond Details Modal
- Full bond information display
- Status with visual indicator
- Assessment score (if submitted)
- Learner feedback (if visible)
- Action buttons based on status and role
  - Tutor: Assessment button, Mark Completed, Break Bond
  - Learner: Feedback button, Break Bond

### 7. Bond History Section (Profile)
- Handshake icon header
- List of all bonds (tutor view)
- Status badges (Active/Completed/Bond Break)
- Skill exchange display
- Creation date
- Assessment score display
- Feedback rating and comment
- Real-time updates via onSnapshot

## Role-Based Authorization

### Tutor Can:
- Submit assessment (only once)
- Mark bond as completed (after assessment submitted)
- Initiate bond break
- View bond history with assessment scores
- Receive badges based on completed courses

### Learner Can:
- Submit feedback (only after assessment submitted)
- Initiate bond break
- Leave feedback even on bond break
- Help tutor earn badges through ratings

### Both Can:
- View bond details
- Agree to bond creation
- Agree to bond break

## Real-Time Features

### Real-Time Bond History
```javascript
db.collection('bonds')
  .where('tutorId', '==', currentUser)
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => {
    // Updates automatically on any bond change
  });
```

### Real-Time Bond Details
Bond details modal fetches latest data on each open, ensuring fresh status information.

## Validation & Error Handling

### Bond Creation
- ✅ User must be logged in
- ✅ Cannot bond with self
- ✅ Cannot have multiple active bonds with same user
- ✅ Post must exist in database

### Assessment Submission
- ✅ Score must be 0-100
- ✅ Only tutor can submit
- ✅ Bond must exist and be active
- ✅ Can only submit once per bond

### Feedback Submission
- ✅ Rating must be 1-5
- ✅ Only learner can submit
- ✅ Bond must exist
- ✅ Assessment must be submitted first (if bond active)
- ✅ Can only submit once per bond

### Bond Completion
- ✅ Only tutor can complete
- ✅ Assessment must be submitted
- ✅ Feedback must be received
- ✅ Bond must be active

## Integration Points

### Firestore Collections Used
- `bonds` - All bond data
- `users` - Tutor stats, badges, rating
- `questions` - Post skill data

### Firebase Features Used
- Firestore documents and collections
- Server timestamps
- onSnapshot listeners
- Document update operations

### Local Storage
- `sx_user` - Currently logged-in username

## Future Enhancements

1. **Payment System**: Add optional payment for premium tutoring
2. **Scheduling**: Calendar integration for tutoring sessions
3. **Chat History**: Messages linked to specific bonds
4. **Review Visibility**: Option for learners to make reviews public
5. **Dispute Resolution**: Mediation for bond conflicts
6. **Skill Verification**: Admin approval of high-level skill claims
7. **Recommendations**: ML-based tutor matching
8. **Analytics Dashboard**: Tutor performance insights

## Testing Scenarios

### Scenario 1: Successful Bond Completion
1. Learner clicks Connect on post
2. Bond created (tutorId/learnerId assigned)
3. Tutor submits assessment (score 80)
4. Learner submits feedback (5 stars)
5. Tutor marks completed
6. Tutor stats updated, badges checked

### Scenario 2: Bond Break Without Assessment
1. Bond created and active
2. Either party initiates break
3. Both agree to break
4. Assessment skipped
5. Optional feedback allowed
6. Bond marked as bond_break

### Scenario 3: Multiple Bonds (One Active)
1. First bond active
2. Cannot create second bond until first is completed or broken
3. After first completes, can create new bond

## Troubleshooting

**Issue**: "You already have an active bond with this user"
- **Cause**: Active bond exists from previous creation
- **Fix**: Complete or break existing bond first

**Issue**: Feedback won't submit
- **Cause**: Assessment not yet submitted
- **Fix**: Tutor must submit assessment first

**Issue**: Badges not appearing
- **Cause**: Rating average < 3.5 or not enough courses
- **Fix**: Check rating calculation and completed course count

**Issue**: Bond Break option missing
- **Cause**: Bond is not active
- **Fix**: Only active bonds can be broken

## Database Security Rules

```javascript
// Bonds Collection
match /bonds/{document=**} {
  // Users can read their own bonds
  allow read: if request.auth.uid != null && 
    (resource.data.tutorId == request.auth.token.email ||
     resource.data.learnerId == request.auth.token.email);
  
  // Only tutors can submit assessment
  allow update: if request.auth.token.email == resource.data.tutorId &&
    !request.resource.data.diff(resource.data).changedKeys().hasAll(['assessmentScore']);
  
  // Only learners can submit feedback
  allow update: if request.auth.token.email == resource.data.learnerId &&
    !request.resource.data.diff(resource.data).changedKeys().hasAll(['feedback']);
}
```

## Performance Notes

- Bond history uses real-time listener (consider limiting to 50 recent bonds)
- Assessment/feedback modals fetch fresh data each time (ensure indexes)
- Badge calculation runs on bond completion (consider async calculation)
- Consider caching frequently accessed bond data

---

**Version**: 1.0  
**Last Updated**: 2024  
**Status**: Production Ready
