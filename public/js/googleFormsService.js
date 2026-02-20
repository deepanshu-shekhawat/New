/**
 * Google Forms Service Module
 * Handles all client-side Google Forms integration
 * Location: public/js/googleFormsService.js
 */

class GoogleFormsService {
  constructor() {
    this.functionsBaseUrl = process.env.REACT_APP_FUNCTIONS_BASE_URL || 'http://localhost:5001/skillxchange/us-central1';
    this.formResponseTimeout = parseInt(process.env.REACT_APP_FORM_RESPONSE_TIMEOUT) || 30000;
    this.maxFormSize = parseInt(process.env.REACT_APP_MAX_FORM_ATTACHMENT_SIZE) || 5242880;
  }

  /**
   * Get authentication token for API calls
   */
  async getAuthToken() {
    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return await user.getIdToken();
  }

  /**
   * Create a new Google Form for assessment
   * @param {string} bondId - Bond document ID
   * @param {string} title - Form title
   * @param {string} description - Form description
   * @param {Array} questions - Array of question objects
   * @returns {Promise<Object>} Created form data
   */
  async createAssessmentForm(bondId, title, description, questions = []) {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.functionsBaseUrl}/createAssessmentForm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bondId,
          title,
          description,
          questions
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create form');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating assessment form:', error);
      throw error;
    }
  }

  /**
   * Attach existing Google Form to bond
   * @param {string} bondId - Bond document ID
   * @param {string} formId - Google Form ID
   * @returns {Promise<Object>} Attachment confirmation
   */
  async attachAssessmentForm(bondId, formId) {
    try {
      // Validate form ID format
      if (!formId || !/^[a-zA-Z0-9_-]+$/.test(formId)) {
        throw new Error('Invalid form ID format');
      }

      const token = await this.getAuthToken();

      const response = await fetch(`${this.functionsBaseUrl}/attachAssessmentForm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bondId,
          formId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to attach form');
      }

      return await response.json();
    } catch (error) {
      console.error('Error attaching assessment form:', error);
      throw error;
    }
  }

  /**
   * Get form responses for a bond (tutor only)
   * @param {string} bondId - Bond document ID
   * @returns {Promise<Array>} Form responses
   */
  async getFormResponses(bondId) {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.functionsBaseUrl}/getFormResponses/${bondId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get form responses');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting form responses:', error);
      throw error;
    }
  }

  /**
   * Submit assessment score after reviewing responses
   * @param {string} bondId - Bond document ID
   * @param {number} score - Assessment score (0-100)
   * @param {string} feedback - Optional tutor feedback
   * @returns {Promise<Object>} Submission confirmation
   */
  async submitFormAssessment(bondId, score, feedback = '') {
    try {
      if (score < 0 || score > 100) {
        throw new Error('Score must be between 0 and 100');
      }

      const token = await this.getAuthToken();

      const response = await fetch(`${this.functionsBaseUrl}/submitFormAssessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bondId,
          score,
          feedback
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit assessment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting assessment:', error);
      throw error;
    }
  }

  /**
   * Verify user has access to form in bond
   * @param {string} bondId - Bond document ID
   * @returns {Promise<Object>} Access verification result
   */
  async verifyFormAccess(bondId) {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.functionsBaseUrl}/verifyFormAccess/${bondId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying form access:', error);
      return { hasAccess: false, error: error.message };
    }
  }

  /**
   * Remove form from bond
   * @param {string} bondId - Bond document ID
   * @returns {Promise<Object>} Removal confirmation
   */
  async removeAssessmentForm(bondId) {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.functionsBaseUrl}/removeAssessmentForm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bondId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove form');
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing form:', error);
      throw error;
    }
  }

  /**
   * Generate form embed URL for viewing in iframe
   * @param {string} formId - Google Form ID
   * @returns {string} Embeddable form URL
   */
  generateFormEmbedUrl(formId) {
    if (!formId) return '';
    return `https://docs.google.com/forms/d/e/${formId}/viewform?embedded=true`;
  }

  /**
   * Generate shareable form URL
   * @param {string} formId - Google Form ID
   * @returns {string} Shareable form URL
   */
  generateFormShareUrl(formId) {
    if (!formId) return '';
    return `https://docs.google.com/forms/d/${formId}/viewform`;
  }

  /**
   * Extract form ID from various URL formats
   * @param {string} urlOrId - Form URL or ID
   * @returns {string|null} Extracted form ID
   */
  extractFormId(urlOrId) {
    if (!urlOrId) return null;

    // If already looks like a form ID
    if (/^[a-zA-Z0-9_-]+$/.test(urlOrId)) {
      return urlOrId;
    }

    // Try to extract from URL
    const match = urlOrId.match(/forms\/d\/e?([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Create predefined assessment questions
   * @param {string} type - Type of assessment (coding, essay, multiple_choice, etc.)
   * @returns {Array} Pre-configured questions
   */
  createTemplateQuestions(type = 'general') {
    const templates = {
      general: [
        {
          type: 'multiple_choice',
          title: 'How would you rate the learning experience?',
          options: ['Excellent', 'Good', 'Average', 'Poor'],
          required: true
        },
        {
          type: 'long_answer',
          title: 'What are the key concepts you learned?',
          required: true
        }
      ],
      coding: [
        {
          type: 'long_answer',
          title: 'Write a simple function to [task]',
          required: true
        },
        {
          type: 'multiple_choice',
          title: 'What is the time complexity of your solution?',
          options: ['O(1)', 'O(n)', 'O(n log n)', 'O(n²)'],
          required: true
        },
        {
          type: 'short_answer',
          title: 'Explain your approach',
          required: true
        }
      ],
      essay: [
        {
          type: 'long_answer',
          title: 'Essay Question',
          required: true
        },
        {
          type: 'multiple_choice',
          title: 'How well did you understand the topic?',
          options: ['Fully', 'Mostly', 'Partially', 'Not at all'],
          required: true
        }
      ]
    };

    return templates[type] || templates.general;
  }

  /**
   * Track form submission event
   * @param {string} bondId - Bond document ID
   * @param {string} formId - Form ID
   * @param {string} action - Action type (submitted, viewed, started, etc.)
   */
  async trackFormEvent(bondId, formId, action) {
    try {
      await db.collection('formLogs').add({
        bondId,
        formId,
        action,
        userId: firebase.auth().currentUser?.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.warn('Failed to track form event:', error);
    }
  }
}

// Export service instance
const googleFormsService = new GoogleFormsService();
