# Bond System - Visual Implementation Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SKILLXCHANGE BOND SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐                    ┌──────────────────────┐
│   USER INTERFACES    │                    │ FIRESTORE DATABASE   │
├──────────────────────┤                    ├──────────────────────┤
│                      │                    │                      │
│ 1. Connect Button    │ ──► initiateBond() │  bonds/              │
│    (Post Cards)      │                    │  ├─ postId           │
│                      │                    │  ├─ tutorId          │
│ 2. Assessment Modal  │ ──► submitAssess() │  ├─ learnerId        │
│    (0-100 slider)    │                    │  ├─ status           │
│                      │                    │  ├─ assessment       │
│ 3. Feedback Modal    │ ──► submitFeedback │  └─ feedback         │
│    (5-star rating)   │                    │                      │
│                      │                    │ users/ (enhanced)    │
│ 4. Bond Break Modal  │ ──► confirmBreak() │  ├─ badges[]         │
│    (confirmation)    │                    │  ├─ completedCount   │
│                      │                    │  └─ avgRating        │
│ 5. Bond Details      │ ──► showDetails()  │                      │
│    (info + actions)  │                    │                      │
│                      │                    │                      │
│ 6. Bond History      │ ◄──► onSnapshot()  │                      │
│    (real-time list)  │     (real-time)    │                      │
│                      │                    │                      │
└──────────────────────┘                    └──────────────────────┘
         ▲                                            ▲
         │                          ┌────────────────┘
         └──────────────────────────┤
                         AUTHENTICATION
                      (localStorage sx_user)
```

## Bond Lifecycle State Machine

```
                    ┌──────────────────────────────────────┐
                    │    BOND CREATION                     │
                    │  initiateBond() called               │
                    │  Bond added to Firestore             │
                    └──────────────────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────────────┐
                    │         STATUS: ACTIVE               │
                    │  - Assessment not yet submitted      │
                    │  - Feedback form hidden              │
                    │  - Both users can continue/break     │
                    └──────────────────────────────────────┘
                        │                            │
                        │                            │
        ┌───────────────┘                            └──────────────┐
        │                                                           │
        ▼                                                           ▼
┌──────────────────────┐                          ┌──────────────────────┐
│ ASSESSMENT PATH      │                          │ BOND BREAK PATH      │
├──────────────────────┤                          ├──────────────────────┤
│ Tutor submits        │                          │ Either user          │
│ assessment (0-100)   │                          │ initiates break      │
│ → assessment saved   │                          │ → status changed     │
│ → feedback visible   │                          │ → assessment waived  │
│                      │                          │ → feedback optional  │
└──────────────────────┘                          └──────────────────────┘
        │                                                    │
        ▼                                                    ▼
┌──────────────────────┐                          ┌──────────────────────┐
│ Learner submits      │                          │   STATUS: BOND_BREAK │
│ feedback (1-5 stars) │                          │                      │
│ → feedback saved     │                          │ - Assessment skipped │
│ → tutor can complete │                          │ - Feedback optional  │
└──────────────────────┘                          │ - Can create new     │
        │                                          │   bonds with others  │
        ▼                                          │                      │
┌──────────────────────┐                          └──────────────────────┘
│ Tutor marks complete │                                    │
│ → status = COMPLETED │                                    │
│ → stats calculated   │                                    │
│ → badges awarded     │                                    │
└──────────────────────┘                                    │
        │                                                    │
        ▼                                                    ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  STATUS: COMPLETED   │                          │     STATUS: COMPLETE │
│                      │                          │                      │
│ - Assessment visible │                          │ - Bond finished      │
│ - Feedback visible   │                          │ - No stats updated   │
│ - Rating counted     │                          │ - No badges awarded  │
│ - Stats updated      │                          │ - Feedback optional  │
│ - Badges awarded     │                          │                      │
└──────────────────────┘                          └──────────────────────┘
```

## Assessment & Feedback Visibility Flow

```
BOND CREATED (ACTIVE)
│
├─ Learner opens bond → No feedback form visible ❌
│  (because: assessment not yet submitted)
│
│  Tutor submits assessment (85 score)
│  └─ assessmentScore: 85
│     assessmentSubmittedAt: timestamp
│     ✅ Assessment saved in Firestore
│
├─ Now: Learner opens bond → Feedback form appears ✅
│       (because: assessment submitted)
│
│  Learner submits feedback (5 stars + comment)
│  └─ feedback: {
│       rating: 5,
│       comment: "Great!",
│       isVisible: true,
│       submittedAt: timestamp
│     }
│
├─ Both: Open bond → See assessment + feedback ✅
│
│  Tutor clicks "Mark Completed"
│  └─ status: "completed"
│     completedAt: timestamp
│
└─ System: Runs updateTutorStats()
   ├─ Counts completed courses: 1
   ├─ Calculates average rating: 5.0
   ├─ Determines badges: Silver ✅
   └─ Updates user profile
```

## Badge Award Flowchart

```
Bond Marked as Completed
│
├─► completeBond(bondId)
│   │
│   ├─► updateTutorStats(tutorId)
│   │   │
│   │   ├─► Query Firestore
│   │   │   "Get all completed bonds for this tutor"
│   │   │
│   │   ├─► Count Completed Bonds
│   │   │   Example: 7 courses completed
│   │   │
│   │   ├─► Calculate Average Rating
│   │   │   Ratings: [5, 5, 4, 5, 4, 4, 5]
│   │   │   Average: 4.57 (≥ 3.5 ✓)
│   │   │
│   │   ├─► Determine Eligible Badges
│   │   │   ├─ 5+ courses? YES (7 ≥ 5) ✓
│   │   │   ├─ Rating ≥ 3.5? YES (4.57 ≥ 3.5) ✓
│   │   │   └─► Award SILVER 🥈
│   │   │
│   │   ├─► 10+ courses? NO (7 < 10) ✗
│   │   ├─► 15+ courses? NO (7 < 15) ✗
│   │   │
│   │   └─► Update user profile
│   │       badges: ['silver']
│   │       completedCourses: 7
│   │       averageRating: 4.57
│   │
│   └─► Page reloads
│       → Profile shows 🥈 Silver badge
│       → Bond History shows badge
│
└─► COMPLETE ✓
```

## Role-Based Authorization Matrix

```
┌─────────────────────┬──────────────┬──────────────┬──────────┐
│ ACTION              │ TUTOR        │ LEARNER      │ BOTH     │
├─────────────────────┼──────────────┼──────────────┼──────────┤
│ Submit Assessment   │ ✅ ALLOWED   │ ❌ BLOCKED   │          │
│ (0-100 score)       │              │ "Only tutor  │          │
│                     │              │  can assess" │          │
├─────────────────────┼──────────────┼──────────────┼──────────┤
│ Submit Feedback     │ ❌ BLOCKED   │ ✅ ALLOWED   │          │
│ (1-5 stars)         │ "Only        │              │          │
│                     │ learner      │              │          │
│                     │ can review"  │              │          │
├─────────────────────┼──────────────┼──────────────┼──────────┤
│ Mark Completed      │ ✅ ALLOWED   │ ❌ BLOCKED   │          │
│                     │              │ "Only tutor  │          │
│                     │              │  can finish" │          │
├─────────────────────┼──────────────┼──────────────┼──────────┤
│ Initiate Break      │ ✅ ALLOWED   │ ✅ ALLOWED   │          │
│                     │              │              │          │
├─────────────────────┼──────────────┼──────────────┼──────────┤
│ View Bond Details   │ ✅ ALLOWED   │ ✅ ALLOWED   │ ✓        │
│                     │              │              │ Both own │
├─────────────────────┼──────────────┼──────────────┼──────────┤
│ Create Bond         │ Can't bond    │ Can click    │ ✓        │
│                     │ with self     │ connect      │ Validates│
└─────────────────────┴──────────────┴──────────────┴──────────┘
```

## Real-Time Update Architecture

```
PROFILE PAGE LOADS
│
├─► loadBondHistory()
│   │
│   ├─► Get current user (localStorage)
│   │
│   ├─► Set up Firestore listener
│   │   db.collection('bonds')
│   │     .where('tutorId', '==', userId)
│   │     .onSnapshot(snapshot => {
│   │       // This runs ONCE immediately
│   │       // AND every time data changes
│   │     })
│   │
│   └─► Render bond list
│       ├─ Bond 1: ACTIVE (tutor assessment pending)
│       ├─ Bond 2: ACTIVE (learner feedback pending)
│       ├─ Bond 3: COMPLETED (assessment: 85, feedback: 5⭐)
│       └─ Bond 4: BOND_BREAK (assessment waived)
│
USER SUBMITS ASSESSMENT IN ANOTHER TAB
│
├─► Firestore updates bond document
│   assessmentScore: 85
│   assessmentSubmittedAt: timestamp
│
└─► onSnapshot listener triggered AUTOMATICALLY
    │
    ├─► Refreshes bond list
    │   (No page refresh needed!)
    │
    └─► Bond 1 now shows:
        ✅ Assessment Score: 85/100
```

## Modal Interaction Flow

```
USER CLICKS "CONNECT" BUTTON
│
└─► initiateBond(postId, tutorId)
    │
    ├─► Validate user logged in
    ├─► Validate not self-bond
    ├─► Check existing bonds
    │
    └─► showBondConfirmModal()
        │
        ├─ Display modal with:
        │  ├─ "Tutor: john_doe"
        │  ├─ "Learner: jane_smith"
        │  └─ "Create Bond" / "Cancel" buttons
        │
        ├─ User clicks "Create Bond"
        │  │
        │  └─► createBond(postId, tutorId)
        │      │
        │      ├─► Add to Firestore
        │      ├─► Set status: "active"
        │      ├─► Record createdAt
        │      │
        │      └─► Page reloads
        │          └─► Bond appears in history
        │
        └─ User clicks "Cancel"
           └─► Modal closes, nothing changes
```

## Data Flow: From Click to Firestore

```
┌──────────────────────────────────────────────────────────────┐
│ USER INTERACTION LAYER                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  User clicks "Submit Assessment" button                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ MODAL & UI LAYER                                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  showAssessmentModal(bondId) creates form:                 │
│  ├─ Score slider: 0-100 (visual feedback)                  │
│  ├─ Notes textarea (optional)                              │
│  ├─ "Submit Assessment" button                             │
│  └─ Calls: submitAssessment(bondId, score)                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ VALIDATION LAYER                                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  submitAssessment() validates:                             │
│  ✓ Score between 0-100                                    │
│  ✓ Current user is tutor                                  │
│  ✓ Bond exists and is active                              │
│  ✓ No assessment already submitted                         │
│                                                              │
│  If ANY check fails:                                        │
│  → Show alert to user                                      │
│  → Stop execution                                          │
│  → Return without database write                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                    (All validations pass)
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ DATABASE WRITE LAYER                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  db.collection('bonds').doc(bondId).update({               │
│    assessmentScore: 85,                                    │
│    assessmentSubmittedBy: 'john_doe',                      │
│    assessmentSubmittedAt: serverTimestamp()                │
│  })                                                         │
│                                                              │
│  └─► Firestore receives update                            │
│      └─► Document modified in database                     │
│          └─► Timestamp recorded                            │
│              └─► Real-time listeners triggered             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ REAL-TIME SYNC LAYER                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  onSnapshot() listener(s) triggered:                        │
│                                                              │
│  Profile page (if open):                                   │
│  └─► Bond History updates → shows assessment score        │
│                                                              │
│  Learner's device (if bond open):                          │
│  └─► Feedback form becomes visible                         │
│                                                              │
│  This ALL happens automatically                             │
│  WITHOUT page refresh!                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ USER FEEDBACK LAYER                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  alert("Assessment submitted successfully!")               │
│  → Page reloads                                            │
│  → Bond History shows new assessment                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Function Call Dependency Graph

```
INDEX.HTML FUNCTIONS:

initiateBond()
  ├─► checkExistingBond()
  └─► showBondConfirmModal()
      └─► createBond()
          ├─► Firebase: doc(postId).get()
          └─► Firebase: collection('bonds').add()

submitAssessment()
  ├─► Validate score 0-100
  ├─► Firebase: doc(bondId).get()
  └─► Firebase: doc(bondId).update()

submitFeedback()
  ├─► Validate rating 1-5
  ├─► Firebase: doc(bondId).get()
  └─► Firebase: doc(bondId).update()

completeBond()
  ├─► Firebase: doc(bondId).get()
  ├─► Firebase: doc(bondId).update()
  └─► updateTutorStats()
      ├─► Firebase: collection('bonds').where(...).get()
      ├─► calculateBadges()
      └─► Firebase: doc(userId).update()

initiateBondBreak()
  └─► showBondBreakModal()
      └─► confirmBondBreak()
          └─► Firebase: doc(bondId).update()

showBondDetails()
  ├─► Firebase: doc(bondId).get()
  ├─► showAssessmentModal()
  │   └─► submitAssessment()
  ├─► showFeedbackModal()
  │   └─► submitFeedback()
  └─► completeBond()

PROFILE.HTML FUNCTIONS:

loadBondHistory()
  ├─► Firebase: collection('bonds').where(...).onSnapshot()
  └─► Real-time render updates
```

## User Experience Flow - Happy Path

```
Day 1:
┌─────────────────────────────────────────┐
│ Learner Jane Opens SkillXchange          │
├─────────────────────────────────────────┤
│ 1. Browses posts                        │
│ 2. Finds tutor John's post              │
│    "Teaching Python for Beginners"      │
│ 3. Clicks "Connect" button              │
│    🤝 Icon appears                      │
│ 4. Confirms bond creation               │
│ 5. Bond created! Status: ACTIVE         │
│                                         │
│ She sees in her profile:                │
│ "Bonded with John: Python ↔ Web Design" │
└─────────────────────────────────────────┘

Day 3:
┌─────────────────────────────────────────┐
│ Tutor John Reviews Bonds                │
├─────────────────────────────────────────┤
│ 1. Goes to Profile → Bond History       │
│ 2. Sees Jane's active bond              │
│ 3. Clicks "Submit Assessment"           │
│ 4. Slides to 85 (good progress)         │
│ 5. Submits assessment                   │
│                                         │
│ Jane's app updates automatically:       │
│ ✅ Feedback form now visible            │
└─────────────────────────────────────────┘

Day 4:
┌─────────────────────────────────────────┐
│ Learner Jane Reviews John               │
├─────────────────────────────────────────┤
│ 1. Opens bond details                   │
│ 2. Sees assessment: 85/100 ✓            │
│ 3. Now sees feedback form ✅            │
│ 4. Clicks 5 stars (excellent!)          │
│ 5. Types: "John is an amazing teacher"  │
│ 6. Submits feedback                     │
│                                         │
│ John's app updates automatically:       │
│ ✅ "Mark Completed" button now visible  │
└─────────────────────────────────────────┘

Day 4 (later):
┌─────────────────────────────────────────┐
│ Tutor John Finishes Bond                │
├─────────────────────────────────────────┤
│ 1. Opens bond                           │
│ 2. Sees assessment: 85 ✓                │
│ 3. Sees feedback: 5⭐ ✓                 │
│ 4. Clicks "Mark Completed"              │
│ 5. Bond status: COMPLETED               │
│                                         │
│ System automatically:                   │
│ • Counts courses: 1                     │
│ • Calculates rating: 5.0                │
│ • Checks: 1 course + 5.0 rating        │
│ • Result: 🥈 Silver badge! (5+ needed) │
│ • Waits for 5 courses...                │
│                                         │
│ John's profile updated:                 │
│ 🥈 Silver badge (4 more courses needed)│
└─────────────────────────────────────────┘
```

## Component Location Map

```
┌────────────────────────────────────────┐
│         index.html                     │
├────────────────────────────────────────┤
│                                        │
│ Feed Section (renderFeed)             │
│ ├─ Each Post Card                     │
│ │  ├─ Message Button                  │
│ │  ├─ Connect Button ← NEW             │
│ │  └─ Like Button                      │
│ │      onclick="initiateBond(...)"    │
│ │      Shows → Bond Confirm Modal     │
│ │                                     │
│ └─ Bond Modals (dynamically created)  │
│    ├─ Bond Creation Modal             │
│    ├─ Assessment Modal                │
│    ├─ Feedback Modal                  │
│    ├─ Bond Break Modal                │
│    └─ Bond Details Modal              │
│                                        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│         profile.html                   │
├────────────────────────────────────────┤
│                                        │
│ Profile Header                         │
│ ├─ User Info                          │
│ ├─ Edit Button                        │
│ └─ Badges Display ← Uses displayBadges()
│                                        │
│ About Me Section                       │
│ ├─ Bio                                │
│ └─ University                         │
│                                        │
│ Recent Activity Section                │
│ ├─ User's posts                       │
│ └─ Post previews                      │
│                                        │
│ Bond History Section ← NEW             │
│ ├─ Handshake icon                     │
│ ├─ Real-time bond list                │
│ │  ├─ Bond 1: ACTIVE                  │
│ │  ├─ Bond 2: COMPLETED               │
│ │  └─ Bond 3: BOND_BREAK              │
│ └─ onSnapshot listener updates        │
│    (automatic refresh)                │
│                                        │
│ Projects Section                       │
│ ├─ User's projects                    │
│ └─ Project cards                      │
│                                        │
└────────────────────────────────────────┘
```

## Firestore Document Creation Timeline

```
User clicks "Connect" on John's post
│
t=0ms: initiateBond('post123', 'john_doe')
       └─ Checks user authenticated
       └─ Checks not self-bond
       └─ Checks existing bonds

t=50ms: showBondConfirmModal()
        └─ Modal displays on screen

t=200ms: User confirms creation

t=210ms: createBond('post123', 'john_doe')
         └─ Queries post data
         └─ Extracts skills

t=250ms: Firebase: add to 'bonds' collection
         
t=300ms: Document created in Firestore:
         ┌───────────────────────────────┐
         │ bonds/auto_doc_id             │
         ├───────────────────────────────┤
         │ postId: "post123"             │
         │ tutorId: "john_doe"           │
         │ learnerId: "jane_smith"       │
         │ skillOffered: "Python"        │
         │ skillLearned: "Web Design"    │
         │ status: "active"              │
         │ createdAt: 1234567890         │
         │ ... (other fields null)       │
         └───────────────────────────────┘

t=320ms: Page reloads

t=400ms: Profile shows new bond:
         "Bond with John: Python ↔ Web Design"
         Status: 🔵 Active
         Created: Today
```

---

This visual guide complements the technical documentation with diagrams and flowcharts for better understanding of the Bond System architecture and workflows.
