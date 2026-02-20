# Bond System - API Reference

## Core Bond Management Functions

### Bond Creation & Initialization

#### `initiateBond(postId, tutorId)`
**Entry point for bond creation workflow**

```javascript
initiateBond(postId, tutorId)
```

**Parameters:**
- `postId` (string): ID of the post where Connect was clicked
- `tutorId` (string): User ID of the post author (tutor)

**Returns:** void (shows confirmation modal)

**Behavior:**
1. Validates user is logged in
2. Prevents bonding with self
3. Checks for existing active bonds between users
4. Shows confirmation modal with tutor/learner information
5. Calls `createBond()` on user confirmation

**Throws:** Alert messages to user on errors

**Example:**
```javascript
// Called from Connect button
<button onclick="initiateBond('post123', 'john_doe')">
  <i class="fas fa-handshake"></i> Connect
</button>
```

---

#### `createBond(postId, tutorId)`
**Creates new bond document in Firestore**

```javascript
createBond(postId, tutorId)
```

**Parameters:**
- `postId` (string): Post ID
- `tutorId` (string): Tutor's user ID

**Returns:** Promise (resolves when document created)

**Creates Firestore Document:**
```javascript
{
  postId: string,
  tutorId: string,
  learnerId: string,
  skillOffered: string,
  skillLearned: string,
  status: 'active',
  createdAt: serverTimestamp(),
  completedAt: null,
  assessmentScore: null,
  assessmentSubmittedBy: null,
  assessmentSubmittedAt: null,
  feedback: null,
  bondBreakReason: null
}
```

**Side Effects:**
- Creates document in 'bonds' collection
- Reloads page to display bond in history

**Error Handling:**
- Validates post exists
- Shows alert on creation failure
- Logs errors to console

---

### Assessment Management

#### `showAssessmentModal(bondId)`
**Displays assessment form for tutor**

```javascript
showAssessmentModal(bondId)
```

**Parameters:**
- `bondId` (string): Bond document ID

**Returns:** void (creates modal DOM element)

**Modal Features:**
- Interactive score slider (0-100)
- Real-time score display
- Optional feedback textarea
- Submit/Cancel buttons

**User Interactions:**
- Slider shows: Poor (0) → Good (50) → Excellent (100)
- Text input for assessment notes
- Color gradient slider for visual feedback

**Triggers:** `submitAssessment()` on submit

---

#### `submitAssessment(bondId, score)`
**Saves tutor assessment to bond**

```javascript
submitAssessment(bondId, score)
```

**Parameters:**
- `bondId` (string): Bond document ID
- `score` (number): Assessment score 0-100

**Returns:** Promise

**Validations:**
- ✅ Score is number between 0-100
- ✅ Current user is bond's tutor
- ✅ Bond exists and is active
- ✅ Assessment not already submitted

**Firestore Update:**
```javascript
{
  assessmentScore: parseInt(score),
  assessmentSubmittedBy: tutorId,
  assessmentSubmittedAt: serverTimestamp()
}
```

**Side Effects:**
- Updates bond document
- Makes feedback visible to learner
- Refreshes page to show updated status

**Error Messages:**
- "Invalid score between 0 and 100"
- "Only the tutor can submit assessment"
- "Bond not found"
- "Failed to submit assessment"

---

### Feedback Management

#### `showFeedbackModal(bondId)`
**Displays feedback form for learner**

```javascript
showFeedbackModal(bondId)
```

**Parameters:**
- `bondId` (string): Bond document ID

**Returns:** void (creates modal DOM element)

**Modal Features:**
- 5-star interactive rating selector
- Optional comment textarea
- Star highlighting on click
- Submit/Cancel buttons

**User Interactions:**
- Click stars to select 1-5 rating
- Type feedback comment
- Visual star highlighting feedback

**Triggers:** `submitFeedback()` on submit

---

#### `submitFeedback(bondId, rating, comment)`
**Saves learner feedback to bond**

```javascript
submitFeedback(bondId, rating, comment)
```

**Parameters:**
- `bondId` (string): Bond document ID
- `rating` (number): Star rating 1-5
- `comment` (string): Feedback text

**Returns:** Promise

**Validations:**
- ✅ Rating is number 1-5
- ✅ Current user is bond's learner
- ✅ Bond exists
- ✅ Assessment submitted (for active bonds)
- ✅ Feedback not already submitted

**Firestore Update:**
```javascript
{
  feedback: {
    rating: parseInt(rating),
    comment: comment,
    submittedAt: serverTimestamp(),
    isVisible: isAssessmentSubmitted || bond.status === 'bond_break'
  }
}
```

**Visibility Rules:**
- Active bonds: feedback only visible after assessment
- Bond break bonds: feedback always visible
- Completed bonds: feedback always visible

**Side Effects:**
- Updates bond feedback
- Page refreshes to show status
- Contributes to tutor rating calculation

**Error Messages:**
- "Please provide a rating between 1 and 5 stars"
- "Only the learner can submit feedback"
- "Bond not found"
- "Failed to submit feedback"

---

#### `selectRating(rating)`
**Helper function for 5-star selector**

```javascript
selectRating(rating)
```

**Parameters:**
- `rating` (number): 1-5 star rating

**Returns:** void (updates DOM)

**Behavior:**
- Highlights selected number of stars
- Updates hidden input with selected rating
- Provides visual feedback

---

### Bond Completion

#### `completeBond(bondId)`
**Marks bond as completed and triggers badge calculation**

```javascript
completeBond(bondId)
```

**Parameters:**
- `bondId` (string): Bond document ID

**Returns:** Promise

**Validations:**
- ✅ Current user is bond's tutor
- ✅ Bond exists and is active
- ✅ Assessment score exists
- ✅ Feedback received

**Firestore Update:**
```javascript
{
  status: 'completed',
  completedAt: serverTimestamp()
}
```

**Triggers:**
- `updateTutorStats(tutorId)` to calculate badges
- Page refresh

**Error Messages:**
- "Only the tutor can complete the bond"
- "Bond cannot be completed in its current state"
- "Bond not found"
- "Failed to complete bond"

---

### Bond Break Management

#### `initiateBondBreak(bondId, reason = '')`
**Shows confirmation modal for breaking bond**

```javascript
initiateBondBreak(bondId, reason = '')
```

**Parameters:**
- `bondId` (string): Bond document ID
- `reason` (string, optional): Reason for break

**Returns:** void (shows modal)

**Behavior:**
1. Fetches current bond from Firestore
2. Validates bond is active
3. Shows break confirmation modal
4. Allows entering optional reason
5. Calls `confirmBondBreak()` on confirmation

---

#### `showBondBreakModal(bondId, defaultReason = '')`
**Displays bond break confirmation UI**

```javascript
showBondBreakModal(bondId, defaultReason = '')
```

**Parameters:**
- `bondId` (string): Bond document ID
- `defaultReason` (string): Pre-filled reason text

**Returns:** void (creates modal DOM)

**Modal Features:**
- Confirmation message
- Optional break reason textarea
- Confirm/Cancel buttons

---

#### `confirmBondBreak(bondId, reason)`
**Executes bond break in Firestore**

```javascript
confirmBondBreak(bondId, reason)
```

**Parameters:**
- `bondId` (string): Bond document ID
- `reason` (string): Reason for break

**Returns:** Promise

**Firestore Update:**
```javascript
{
  status: 'bond_break',
  bondBreakReason: reason,
  completedAt: serverTimestamp()
}
```

**Effects:**
- Changes bond status to 'bond_break'
- Records break reason and timestamp
- Assessment requirement waived
- Feedback still allowed (optional)
- Page refreshes

**Error Messages:**
- "Bond not found"
- "Failed to discontinue bond"

---

### Bond History & Tracking

#### `loadBondHistory()`
**Loads and displays bond history for current user**

```javascript
loadBondHistory()
```

**Returns:** void (populates DOM, sets up listener)

**Behavior:**
1. Gets current user from localStorage
2. Queries bonds where user is tutor
3. Sets up real-time onSnapshot listener
4. Updates #bond-history-container with HTML
5. Listens for changes automatically

**Real-Time Features:**
- Automatically updates on any bond change
- Removes old data when bonds change
- Handles empty states

**Displays:**
- Bond skills (offered ↔ learned)
- Learner username
- Status badge (colored)
- Creation date
- Assessment score (if submitted)
- Feedback rating and comment (if visible)

**HTML Structure:**
```html
<div id="bond-history-container">
  <!-- Auto-populated with bonds -->
</div>
```

---

#### `showBondDetails(bondId)`
**Shows comprehensive bond information modal**

```javascript
showBondDetails(bondId)
```

**Parameters:**
- `bondId` (string): Bond document ID

**Returns:** Promise (resolves when modal shown)

**Modal Contents:**
- Bond ID and close button
- Skills exchange display
- Tutor/Learner usernames
- Status indicator with visual badge
- Creation date
- Assessment score (if submitted)
- Learner feedback (if visible)
- Role-based action buttons

**Action Buttons (Conditional):**

**Tutor (if active, assessment not submitted):**
- "Submit Assessment" → calls `showAssessmentModal()`

**Learner (if active, assessment submitted, feedback not submitted):**
- "Submit Feedback" → calls `showFeedbackModal()`

**Tutor (if active, both assessment and feedback submitted):**
- "Mark Completed" → calls `completeBond()`

**Both Users (any active bond):**
- "Break Bond" → calls `initiateBondBreak()`

---

### Statistics & Badge Management

#### `updateTutorStats(tutorId)`
**Calculates completion count, rating, and awards badges**

```javascript
updateTutorStats(tutorId)
```

**Parameters:**
- `tutorId` (string): User ID of tutor

**Returns:** Promise

**Calculation Process:**
1. Counts bonds where status='completed'
2. Sums ratings from visible feedback
3. Calculates average rating
4. Determines earned badges
5. Updates user document

**Badge Determination:**
```javascript
if (avgRating >= 3.5) {
  if (completedCount >= 5) badges.push('silver');
  if (completedCount >= 10) badges.push('gold');
  if (completedCount >= 15) badges.push('platinum');
}
```

**Firestore Update (users collection):**
```javascript
{
  completedCourses: number,
  averageRating: number,
  badges: ['silver', 'gold', ...]
}
```

**Requirements:**
- Must have avg rating ≥ 3.5
- Must have minimum courses (5/10/15)
- Badges only awarded once requirements met

---

#### `calculateBadges(completedCount, avgRating)`
**Helper to determine which badges to award**

```javascript
calculateBadges(completedCount, avgRating)
```

**Parameters:**
- `completedCount` (number): Number of completed bonds
- `avgRating` (number): Average feedback rating

**Returns:** array of badge strings

**Badge Thresholds:**
| Badge | Min Courses | Min Rating |
|-------|------------|-----------|
| silver | 5 | 3.5 |
| gold | 10 | 3.5 |
| platinum | 15 | 3.5 |

**Example Return Values:**
```javascript
[]                           // No badges yet
['silver']                   // 5 courses
['silver', 'gold']           // 10 courses
['silver', 'gold', 'platinum'] // 15 courses
```

---

#### `displayBadges(badges = [])`
**Converts badge array to HTML icons**

```javascript
displayBadges(badges = [])
```

**Parameters:**
- `badges` (array): Array of badge strings

**Returns:** HTML string with badge icons

**Badge Icons:**
| Badge | Icon | Title |
|-------|------|-------|
| silver | 🥈 medal (gray) | Silver - 5 courses |
| gold | 🥇 medal (yellow) | Gold - 10 courses |
| platinum | 💎 crown (blue) | Platinum - 15 courses |

**Example:**
```javascript
displayBadges(['silver', 'gold'])
// Returns: '<i class="fas fa-medal text-gray-400 text-xl"...></i> <i class="fas fa-medal text-yellow-500 text-xl"...></i>'
```

---

## Helper Functions

#### `checkExistingBond(postId, tutorId, learnerId)`
**Checks if active bond exists between users**

```javascript
checkExistingBond(postId, tutorId, learnerId)
```

**Parameters:**
- `postId` (string): Post ID
- `tutorId` (string): Tutor user ID
- `learnerId` (string): Learner user ID

**Returns:** Promise<boolean>

**Behavior:**
- Queries bonds collection
- Filters by postId and status='active'
- Returns true if any active bond exists
- Returns false if none found

---

## UI Helper - showBondConfirmModal

#### `showBondConfirmModal(postId, tutorId)`
**Displays initial bond confirmation modal**

```javascript
showBondConfirmModal(postId, tutorId)
```

**Parameters:**
- `postId` (string): Post ID
- `tutorId` (string): Tutor user ID

**Returns:** void (creates modal)

**Modal Features:**
- Shows both users (tutor/learner)
- Warns about exclusive exchange
- Create/Cancel buttons
- Glass-panel styled UI

---

## Data Structures

### Bond Document
```javascript
{
  // IDs and References
  id: string,                    // Auto-generated
  postId: string,
  tutorId: string,
  learnerId: string,
  
  // Skills
  skillOffered: string,
  skillLearned: string,
  
  // Status
  status: 'active' | 'completed' | 'bond_break',
  
  // Timeline
  createdAt: Timestamp,
  completedAt: Timestamp | null,
  
  // Assessment (Tutor)
  assessmentScore: number (0-100) | null,
  assessmentSubmittedBy: string | null,
  assessmentSubmittedAt: Timestamp | null,
  
  // Feedback (Learner)
  feedback: {
    rating: 1-5,
    comment: string,
    submittedAt: Timestamp,
    isVisible: boolean
  } | null,
  
  // Break Info
  bondBreakReason: string | null
}
```

### User Stats (in users collection)
```javascript
{
  completedCourses: number,
  averageRating: number,
  badges: [
    'silver' | 'gold' | 'platinum'
  ]
}
```

---

## Error Codes & Messages

### Bond Creation Errors
| Error | Cause | Solution |
|-------|-------|----------|
| "Please log in to create a bond" | Not authenticated | Login required |
| "You can't create a bond with yourself" | tutorId === learnerId | Select different user |
| "You already have an active bond with this user" | Active bond exists | Complete/break first |
| "Post not found" | postId invalid | Refresh page |

### Assessment Errors
| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid score between 0 and 100" | Score out of range | Enter 0-100 |
| "Only the tutor can submit assessment" | Wrong role | Login as tutor |
| "Bond not found" | bondId invalid | Refresh |

### Feedback Errors
| Error | Cause | Solution |
|-------|-------|----------|
| "Please provide rating 1-5 stars" | Invalid rating | Select 1-5 stars |
| "Only the learner can submit feedback" | Wrong role | Login as learner |
| "Bond not found" | bondId invalid | Refresh |

### Completion Errors
| Error | Cause | Solution |
|-------|-------|----------|
| "Only tutor can complete" | Wrong role | Login as tutor |
| "Bond cannot be completed" | Status not active | Check bond status |
| "Bond not found" | bondId invalid | Refresh |

---

## Example Usage

### Create a Bond
```javascript
// User clicks Connect button on a post
initiateBond('post_abc123', 'tutor_john');

// Modal shows, user confirms
// → createBond() is called
// → Bond document created
// → Page reloads
```

### Submit Assessment
```javascript
// Tutor opens bond details modal
showBondDetails('bond_xyz789');

// Tutor clicks "Submit Assessment"
showAssessmentModal('bond_xyz789');

// Tutor selects 85, clicks Submit
submitAssessment('bond_xyz789', 85);

// Assessment saved, learner can now give feedback
```

### Submit Feedback
```javascript
// Learner opens bond details modal
showBondDetails('bond_xyz789');

// Learner clicks "Submit Feedback"
showFeedbackModal('bond_xyz789');

// Learner selects 5 stars, adds comment, clicks Submit
submitFeedback('bond_xyz789', 5, 'Great teaching!');

// Feedback saved, tutor can complete bond
```

### Complete Bond & Award Badges
```javascript
// Tutor clicks "Mark Completed"
completeBond('bond_xyz789');

// System runs:
// → updateTutorStats('tutor_john')
// → Counts completed bonds: 5
// → Calculates avg rating: 4.2
// → Awards: 'silver' badge (5 courses + 4.2 rating)
// → Updates user profile
// → Page reloads showing new badge
```

### Break Bond
```javascript
// Either user clicks "Break Bond"
initiateBondBreak('bond_xyz789', 'Scheduling conflict');

// Modal shows, user confirms
// → confirmBondBreak() is called
// → Status changed to 'bond_break'
// → Assessment skipped
// → Optional feedback allowed
// → Page reloads
```

---

**API Version**: 1.0  
**Last Updated**: 2024  
**Status**: Complete
