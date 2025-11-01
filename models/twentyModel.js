// models/twentyModel.js
const axios = require("axios");
require("dotenv").config();

/**
 * Twenty CRM API client
 * Provides methods to interact with opportunities, people, notes, and attachments
 */

// Create axios instance with proper configuration
const twentyAPI = axios.create({
  baseURL: process.env.TWENTY_API_URL || "https://api.twenty.com",
  headers: {
    Authorization: `Bearer ${process.env.TWENTY_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for better error handling
twentyAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ Twenty API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
);

/**
 * Get Person by ID
 * @param {string} personId - The Twenty person ID
 * @returns {Promise<Object>} Person object with email and other details
 */
async function getPerson(personId) {
  try {
    console.log("📞 Fetching person from Twenty:", personId);
    const response = await twentyAPI.get(`/rest/people/${personId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching person from Twenty:", error.message);
    throw error;
  }
}

/**
 * Get User by Email
 * Used to find Twenty users when syncing assignees from Linear
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function getUserByEmail(email) {
  try {
    console.log("🔍 Searching for Twenty user by email:", email);

    // Twenty API might use different endpoints for users vs people
    // Adjust based on your Twenty instance API structure
    const response = await twentyAPI.get(`/rest/people`, {
      params: {
        filter: JSON.stringify({
          email: { eq: email },
        }),
      },
    });

    const users = response.data?.data || response.data;

    if (Array.isArray(users) && users.length > 0) {
      console.log("✅ Found Twenty user:", users[0].id);
      return users[0];
    }

    console.log("⚠️ No Twenty user found for email:", email);
    return null;
  } catch (error) {
    console.error("Error finding user by email:", error.message);
    // Don't throw - return null to allow process to continue
    return null;
  }
}

/**
 * Update Opportunity
 * @param {string} opportunityId - The Twenty opportunity ID
 * @param {Object} updates - Fields to update (use lowercase field names)
 * @returns {Promise<Object>} Updated opportunity object
 */
async function updateOpportunity(opportunityId, updates) {
  try {
    console.log("📝 Updating Twenty opportunity:", opportunityId);
    console.log("   Updates:", JSON.stringify(updates, null, 2));

    const response = await twentyAPI.patch(
      `/rest/opportunities/${opportunityId}`,
      updates
    );

    console.log("✅ Twenty opportunity updated successfully");
    return response.data;
  } catch (error) {
    console.error("❌ Error updating Twenty opportunity");
    throw error;
  }
}

/**
 * Get Opportunity by ID
 * @param {string} opportunityId - The Twenty opportunity ID
 * @returns {Promise<Object>} Opportunity object
 */
async function getOpportunity(opportunityId) {
  try {
    console.log("📊 Fetching opportunity from Twenty:", opportunityId);
    const response = await twentyAPI.get(
      `/rest/opportunities/${opportunityId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching opportunity from Twenty:", error.message);
    throw error;
  }
}

/**
 * Create Note
 * Syncs comments from Linear to Twenty as notes
 * @param {string} opportunityId - The Twenty opportunity ID
 * @param {string} content - Note content/body
 * @returns {Promise<Object>} Created note object
 */
async function createNote(opportunityId, content) {
  try {
    console.log("📝 Creating note in Twenty for opportunity:", opportunityId);

    const response = await twentyAPI.post(`/rest/notes`, {
      opportunityId: opportunityId,
      content: content,
      body: content, // Some APIs use 'body' instead of 'content'
      title: "Note from Linear", // Optional title
    });

    console.log("✅ Note created in Twenty");
    return response.data;
  } catch (error) {
    console.error("Error creating note in Twenty:", error.message);
    throw error;
  }
}

/**
 * Create Attachment
 * Syncs attachments from Linear to Twenty
 * @param {string} opportunityId - The Twenty opportunity ID
 * @param {Object} attachmentData - Attachment details
 * @param {string} attachmentData.fileUrl - URL of the file
 * @param {string} attachmentData.name - Name/title of the attachment
 * @returns {Promise<Object>} Created attachment object
 */
async function createAttachment(opportunityId, attachmentData) {
  try {
    console.log(
      "📎 Creating attachment in Twenty for opportunity:",
      opportunityId
    );

    const response = await twentyAPI.post(`/rest/attachments`, {
      opportunityId: opportunityId,
      fileUrl: attachmentData.fileUrl,
      url: attachmentData.fileUrl, // Some APIs use 'url' instead
      name: attachmentData.name,
      title: attachmentData.name, // Some APIs use 'title' instead
      type: "url", // Attachment type
    });

    console.log("✅ Attachment created in Twenty");
    return response.data;
  } catch (error) {
    console.error("Error creating attachment in Twenty:", error.message);
    throw error;
  }
}

/**
 * Get all opportunities with optional filtering
 * @param {Object} filter - Filter criteria
 * @returns {Promise<Array>} Array of opportunities
 */
async function getOpportunities(filter = {}) {
  try {
    const response = await twentyAPI.get(`/rest/opportunities`, {
      params: filter,
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error("Error fetching opportunities:", error.message);
    throw error;
  }
}

/**
 * Search opportunities by Linear project ID
 * @param {string} linearProjectId - The Linear project ID
 * @returns {Promise<Object|null>} Opportunity object or null
 */
async function getOpportunityByLinearId(linearProjectId) {
  try {
    const response = await twentyAPI.get(`/rest/opportunities`, {
      params: {
        filter: JSON.stringify({
          linearprojectid: { eq: linearProjectId },
        }),
      },
    });

    const opportunities = response.data?.data || response.data;

    if (Array.isArray(opportunities) && opportunities.length > 0) {
      return opportunities[0];
    }

    return null;
  } catch (error) {
    console.error("Error finding opportunity by Linear ID:", error.message);
    return null;
  }
}

/**
 * Health check - tests Twenty API connection
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection() {
  try {
    console.log("🔌 Testing Twenty API connection...");
    const response = await twentyAPI.get("/rest/opportunities?limit=1");
    console.log("✅ Twenty API connection successful");
    return true;
  } catch (error) {
    console.error("❌ Twenty API connection failed:", error.message);
    return false;
  }
}

module.exports = {
  getPerson,
  getUserByEmail,
  updateOpportunity,
  getOpportunity,
  getOpportunities,
  getOpportunityByLinearId,
  createNote,
  createAttachment,
  testConnection,
};
