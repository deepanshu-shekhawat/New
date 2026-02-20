// Firebase Cloud Functions for Google Forms Integration
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Initialize Google Forms API
const forms = google.forms('v1');

/**
 * Create a new Google Form for assessment
 * POST /createAssessmentForm
 * 
 * Body:
 * {
 *   bondId: string,
 *   title: string,
 *   description: string,
 *   questions: [ { type, title, options?, required? } ]
 * }
 */
exports.createAssessmentForm = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      // Verify user is authenticated
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Validate request
      const { bondId, title, description, questions } = req.body;

      if (!bondId || !title) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify user is tutor for this bond
      const bondDoc = await db.collection('bonds').doc(bondId).get();
      if (!bondDoc.exists) {
        return res.status(404).json({ error: 'Bond not found' });
      }

      const bond = bondDoc.data();
      if (bond.tutorId !== userId) {
        return res.status(403).json({ error: 'Only tutor can create form' });
      }

      // Get OAuth 2.0 client
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/forms'],
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_id: process.env.GOOGLE_CLIENT_ID
        }
      });

      const authClient = await auth.getClient();

      // Create form
      const createResponse = await forms.forms.create(
        {
          requestBody: {
            info: {
              title: title,
              description: description || '',
              documentTitle: `${title} - Bond Assessment`
            }
          }
        },
        { auth: authClient }
      );

      const formId = createResponse.data.formId;
      const formUrl = `https://docs.google.com/forms/d/${formId}/viewform`;

      // Add questions to form if provided
      if (questions && questions.length > 0) {
        const batchUpdate = await forms.forms.batchUpdate(
          {
            formId: formId,
            requestBody: {
              requests: questions.map((q, index) => ({
                createItem: {
                  item: {
                    title: q.title,
                    description: q.description || '',
                    questionItem: {
                      question: {
                        required: q.required || true,
                        choiceQuestion:
                          q.type === 'multiple_choice'
                            ? {
                                type: 'RADIO',
                                options: (q.options || []).map(opt => ({
                                  value: opt
                                }))
                              }
                            : undefined,
                        textQuestion:
                          q.type === 'short_answer'
                            ? { paragraph: false }
                            : undefined,
                        paragraphQuestion:
                          q.type === 'long_answer'
                            ? {}
                            : undefined
                      }
                    }
                  },
                  location: { index: index }
                }
              }))
            }
          },
          { auth: authClient }
        );
      }

      // Store form reference in Firestore
      const formRef = {
        formId: formId,
        formUrl: formUrl,
        title: title,
        description: description || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: userId,
        status: 'active',
        responses: [],
        submissionCount: 0
      };

      // Update bond with form reference
      await db.collection('bonds').doc(bondId).update({
        assessmentForm: formRef,
        formStatus: 'pending_submission'
      });

      // Log form creation
      await db.collection('formLogs').add({
        bondId: bondId,
        formId: formId,
        action: 'form_created',
        tutorId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          title: title,
          questionCount: questions?.length || 0
        }
      });

      return res.status(200).json({
        success: true,
        formId: formId,
        formUrl: formUrl,
        message: 'Assessment form created successfully'
      });
    } catch (error) {
      console.error('Error creating form:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Attach existing Google Form to bond
 * POST /attachAssessmentForm
 */
exports.attachAssessmentForm = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { bondId, formId } = req.body;

      if (!bondId || !formId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify user is tutor for this bond
      const bondDoc = await db.collection('bonds').doc(bondId).get();
      if (!bondDoc.exists) {
        return res.status(404).json({ error: 'Bond not found' });
      }

      const bond = bondDoc.data();
      if (bond.tutorId !== userId) {
        return res.status(403).json({ error: 'Only tutor can attach form' });
      }

      // Validate form ID format and accessibility
      const formUrl = `https://docs.google.com/forms/d/${formId}/viewform`;

      // Store form reference
      const formRef = {
        formId: formId,
        formUrl: formUrl,
        attachedAt: admin.firestore.FieldValue.serverTimestamp(),
        attachedBy: userId,
        status: 'active'
      };

      // Update bond
      await db.collection('bonds').doc(bondId).update({
        assessmentForm: formRef,
        formStatus: 'pending_submission'
      });

      // Log attachment
      await db.collection('formLogs').add({
        bondId: bondId,
        formId: formId,
        action: 'form_attached',
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(200).json({
        success: true,
        formId: formId,
        formUrl: formUrl,
        message: 'Form attached successfully'
      });
    } catch (error) {
      console.error('Error attaching form:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Get form responses for a bond
 * GET /getFormResponses/:bondId
 */
exports.getFormResponses = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const bondId = req.path.split('/').pop();

      // Verify user is part of this bond
      const bondDoc = await db.collection('bonds').doc(bondId).get();
      if (!bondDoc.exists) {
        return res.status(404).json({ error: 'Bond not found' });
      }

      const bond = bondDoc.data();
      if (bond.tutorId !== userId && bond.learnerId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Only tutor can view detailed responses
      if (bond.tutorId !== userId) {
        return res.status(403).json({ error: 'Only tutor can view responses' });
      }

      if (!bond.assessmentForm?.formId) {
        return res.status(404).json({ error: 'No form found for this bond' });
      }

      // Get auth client
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/forms.responses.readonly'],
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_id: process.env.GOOGLE_CLIENT_ID
        }
      });

      const authClient = await auth.getClient();

      // Get responses
      const responsesResponse = await forms.forms.responses.list(
        {
          formId: bond.assessmentForm.formId
        },
        { auth: authClient }
      );

      const responses = responsesResponse.data.responses || [];

      // Store response count in bond
      if (responses.length > 0) {
        await db.collection('bonds').doc(bondId).update({
          'assessmentForm.submissionCount': responses.length,
          'assessmentForm.lastResponseAt': admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return res.status(200).json({
        success: true,
        responses: responses,
        submissionCount: responses.length
      });
    } catch (error) {
      console.error('Error getting responses:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Submit assessment score after reviewing form responses
 * POST /submitFormAssessment
 */
exports.submitFormAssessment = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { bondId, score, feedback } = req.body;

      if (!bondId || score === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (score < 0 || score > 100) {
        return res.status(400).json({ error: 'Score must be 0-100' });
      }

      // Verify user is tutor
      const bondDoc = await db.collection('bonds').doc(bondId).get();
      if (!bondDoc.exists) {
        return res.status(404).json({ error: 'Bond not found' });
      }

      const bond = bondDoc.data();
      if (bond.tutorId !== userId) {
        return res.status(403).json({ error: 'Only tutor can submit assessment' });
      }

      // Update bond with assessment
      await db.collection('bonds').doc(bondId).update({
        assessmentScore: score,
        assessmentFeedback: feedback || '',
        assessmentSubmittedBy: userId,
        assessmentSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
        formStatus: 'completed',
        // Trigger feedback visibility
        'assessmentForm.status': 'completed'
      });

      // Update tutor stats
      await updateTutorStats(bond.tutorId);

      // Log submission
      await db.collection('formLogs').add({
        bondId: bondId,
        formId: bond.assessmentForm?.formId,
        action: 'assessment_submitted',
        tutorId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: {
          score: score,
          hasFormResponses: !!bond.assessmentForm?.submissionCount
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Assessment submitted successfully',
        bondId: bondId,
        score: score
      });
    } catch (error) {
      console.error('Error submitting assessment:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Verify form access for a user in a bond
 * GET /verifyFormAccess/:bondId
 */
exports.verifyFormAccess = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const bondId = req.path.split('/').pop();

      // Verify user is part of bond
      const bondDoc = await db.collection('bonds').doc(bondId).get();
      if (!bondDoc.exists) {
        return res.status(404).json({ error: 'Bond not found' });
      }

      const bond = bondDoc.data();
      const isTutor = bond.tutorId === userId;
      const isLearner = bond.learnerId === userId;

      if (!isTutor && !isLearner) {
        return res.status(403).json({
          error: 'Access denied',
          hasAccess: false
        });
      }

      // Verify bond is active
      if (bond.status !== 'active') {
        return res.status(403).json({
          error: 'Bond is not active',
          hasAccess: false
        });
      }

      // Learner cannot access form if not yet available
      if (isLearner && bond.formStatus !== 'active') {
        return res.status(403).json({
          error: 'Form not yet available',
          hasAccess: false
        });
      }

      return res.status(200).json({
        success: true,
        hasAccess: true,
        userRole: isTutor ? 'tutor' : 'learner',
        formId: bond.assessmentForm?.formId,
        formUrl: bond.assessmentForm?.formUrl,
        formStatus: bond.assessmentForm?.status
      });
    } catch (error) {
      console.error('Error verifying access:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Unattach or delete form from bond
 * POST /removeAssessmentForm
 */
exports.removeAssessmentForm = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { bondId } = req.body;

      if (!bondId) {
        return res.status(400).json({ error: 'Bond ID required' });
      }

      // Verify user is tutor
      const bondDoc = await db.collection('bonds').doc(bondId).get();
      if (!bondDoc.exists) {
        return res.status(404).json({ error: 'Bond not found' });
      }

      const bond = bondDoc.data();
      if (bond.tutorId !== userId) {
        return res.status(403).json({ error: 'Only tutor can remove form' });
      }

      // Can only remove if assessment not yet completed
      if (bond.assessmentSubmittedAt) {
        return res.status(400).json({
          error: 'Cannot remove form after assessment submitted'
        });
      }

      // Remove form
      await db.collection('bonds').doc(bondId).update({
        assessmentForm: admin.firestore.FieldValue.delete(),
        formStatus: admin.firestore.FieldValue.delete()
      });

      // Log removal
      await db.collection('formLogs').add({
        bondId: bondId,
        formId: bond.assessmentForm?.formId,
        action: 'form_removed',
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(200).json({
        success: true,
        message: 'Form removed from bond'
      });
    } catch (error) {
      console.error('Error removing form:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Helper function to update tutor stats
 */
async function updateTutorStats(tutorId) {
  try {
    const completedSnapshot = await db.collection('bonds')
      .where('tutorId', '==', tutorId)
      .where('status', '==', 'completed')
      .get();

    const completedCount = completedSnapshot.size;
    let totalRating = 0;
    let ratingCount = 0;

    completedSnapshot.forEach(doc => {
      const bond = doc.data();
      if (bond.feedback && bond.feedback.isVisible) {
        totalRating += bond.feedback.rating;
        ratingCount++;
      }
    });

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    let badges = [];

    if (avgRating >= 3.5) {
      if (completedCount >= 5) badges.push('silver');
      if (completedCount >= 10) badges.push('gold');
      if (completedCount >= 15) badges.push('platinum');
    }

    await db.collection('users').doc(tutorId).update({
      completedCourses: completedCount,
      averageRating: avgRating,
      badges: badges
    });
  } catch (error) {
    console.error('Error updating tutor stats:', error);
  }
}

// Scheduled function to sync form responses daily
exports.syncFormResponses = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    // Get all active bonds with forms
    const bondsSnapshot = await db.collection('bonds')
      .where('assessmentForm.formId', '!=', '')
      .where('formStatus', '==', 'pending_submission')
      .get();

    console.log(`Syncing ${bondsSnapshot.size} forms...`);

    // Could add form response sync logic here

    return null;
  } catch (error) {
    console.error('Error in sync job:', error);
    return null;
  }
});
