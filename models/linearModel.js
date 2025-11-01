// models/linearModel.js
const { GraphQLClient, gql } = require("graphql-request");
require("dotenv").config();

/**
 * Linear API client
 * Provides methods to interact with Linear projects, issues, comments, and attachments
 */

const client = new GraphQLClient("https://api.linear.app/graphql", {
  headers: {
    Authorization: process.env.LINEAR_API_KEY,
    "Content-Type": "application/json",
  },
});

/**
 * Append Twenty Opportunity ID to project description
 * Used to track which Twenty opportunity a Linear project is linked to
 * @param {string} desc - Original description
 * @param {string} oppId - Twenty opportunity ID
 * @returns {string} Description with embedded opportunity ID
 */
function appendTwentyId(desc, oppId) {
  const cleanDesc = (desc || "").trim();
  return `${cleanDesc}\n\n[TwentyOpportunityId: ${oppId}]`;
}

/**
 * Parse Twenty Opportunity ID from project description
 * @param {string} desc - Project description
 * @returns {string|null} Opportunity ID or null if not found
 */
function parseTwentyId(desc) {
  const match = desc?.match(/\[TwentyOpportunityId: ([\w-]+)\]/);
  return match ? match[1] : null;
}

/**
 * Create Linear Project
 * @param {string} name - Project name
 * @param {string} description - Project description (includes Twenty ID)
 * @param {string|null} leadId - Linear user ID for project lead
 * @param {string|null} targetDate - Target completion date (ISO format)
 * @returns {Promise<Object>} Created project with id, url, and progress
 */
async function createProject(name, description, leadId, targetDate) {
  const mutation = `
    mutation ProjectCreate($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project {
          id
          url
          progress
          state
        }
      }
    }
  `;

  // Build input object conditionally to avoid null values
  const input = {
    teamIds: [process.env.LINEAR_TEAM_ID],
    name: name,
    description: description,
  };

  // Only add optional fields if they exist
  if (leadId) input.leadId = leadId;
  if (targetDate) input.targetDate = targetDate;

  const variables = { input };

  try {
    console.log("🚀 Creating Linear project:");
    console.log("   Name:", name);
    console.log("   Lead:", leadId ? "Yes" : "No");
    console.log("   Target Date:", targetDate || "None");

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: process.env.LINEAR_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: variables,
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error(
        "❌ Linear API errors:",
        JSON.stringify(result.errors, null, 2)
      );
      throw new Error(`Linear API Error: ${JSON.stringify(result.errors)}`);
    }

    if (!result.data?.projectCreate?.success) {
      console.error(
        "❌ Project creation failed:",
        JSON.stringify(result, null, 2)
      );
      throw new Error("Project creation was not successful");
    }

    console.log(
      "✅ Linear project created:",
      result.data.projectCreate.project.id
    );
    return result.data.projectCreate.project;
  } catch (error) {
    console.error("❌ Error creating Linear project:", error.message);
    throw error;
  }
}

/**
 * Update Linear Project
 * @param {string} id - Project ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
async function updateProject(id, updates) {
  const mutation = gql`
    mutation ($id: String!, $input: ProjectUpdateInput!) {
      projectUpdate(id: $id, input: $input) {
        success
        project {
          id
        }
      }
    }
  `;

  try {
    console.log("📝 Updating Linear project:", id);
    console.log("   Updates:", JSON.stringify(updates, null, 2));

    const result = await client.request(mutation, { id, input: updates });

    if (!result.projectUpdate.success) {
      throw new Error("Project update was not successful");
    }

    console.log("✅ Linear project updated successfully");
  } catch (error) {
    console.error("❌ Error updating Linear project:", error.message);
    throw error;
  }
}

/**
 * Get Linear Project
 * Fetches full project details including lead, progress, milestones
 * @param {string} id - Project ID
 * @returns {Promise<Object>} Project object
 */
async function getProject(id) {
  const query = gql`
    query ($id: String!) {
      project(id: $id) {
        id
        name
        description
        lead {
          id
          email
          name
        }
        targetDate
        state
        progress
        completedProjectMilestoneCount
        projectMilestoneCount
        url
        createdAt
        updatedAt
      }
    }
  `;

  try {
    const res = await client.request(query, { id });
    return res.project;
  } catch (error) {
    console.error("❌ Error fetching Linear project:", error.message);
    throw error;
  }
}

/**
 * Create Comment on Project
 * @param {string} projectId - Project ID
 * @param {string} body - Comment body (markdown supported)
 * @returns {Promise<void>}
 */
async function createComment(projectId, body) {
  const mutation = gql`
    mutation ($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
        comment {
          id
        }
      }
    }
  `;

  try {
    console.log("💬 Creating comment on Linear project:", projectId);
    const result = await client.request(mutation, {
      input: { projectId, body },
    });

    if (!result.commentCreate.success) {
      throw new Error("Comment creation was not successful");
    }

    console.log("✅ Comment created successfully");
  } catch (error) {
    console.error("❌ Error creating Linear comment:", error.message);
    throw error;
  }
}

/**
 * Create Attachment on Project
 * @param {string} projectId - Project ID
 * @param {string} url - Attachment URL
 * @param {string} title - Attachment title
 * @returns {Promise<void>}
 */
async function createAttachment(projectId, url, title) {
  const mutation = gql`
    mutation ($input: AttachmentCreateInput!) {
      attachmentCreate(input: $input) {
        success
        attachment {
          id
        }
      }
    }
  `;

  try {
    console.log("📎 Creating attachment on Linear project:", projectId);
    const result = await client.request(mutation, {
      input: { projectId, url, title },
    });

    if (!result.attachmentCreate.success) {
      throw new Error("Attachment creation was not successful");
    }

    console.log("✅ Attachment created successfully");
  } catch (error) {
    console.error("❌ Error creating Linear attachment:", error.message);
    throw error;
  }
}

/**
 * Get Linear User ID by Email
 * @param {string} email - User email address
 * @returns {Promise<string|null>} User ID or null if not found
 */
async function getUserIdByEmail(email) {
  const query = gql`
    query ($filter: UserFilter) {
      users(filter: $filter) {
        nodes {
          id
          email
          name
        }
      }
    }
  `;

  try {
    const res = await client.request(query, {
      filter: { email: { eq: email } },
    });

    const user = res.users.nodes[0];
    if (user) {
      console.log("✅ Found Linear user:", user.name, user.email);
      return user.id;
    }

    console.log("⚠️ No Linear user found for email:", email);
    return null;
  } catch (error) {
    console.error("❌ Error fetching Linear user by email:", error.message);
    throw error;
  }
}

/**
 * Get Linear Issue
 * Used to find project ID when webhooks reference issues
 * @param {string} id - Issue ID
 * @returns {Promise<Object>} Issue object with project reference
 */
async function getIssue(id) {
  const query = gql`
    query ($id: String!) {
      issue(id: $id) {
        id
        title
        project {
          id
          name
        }
        state {
          name
        }
      }
    }
  `;

  try {
    const res = await client.request(query, { id });
    return res.issue;
  } catch (error) {
    console.error("❌ Error fetching Linear issue:", error.message);
    throw error;
  }
}

/**
 * Get Available Teams
 * Helper function to list all teams (useful for setup/debugging)
 * @returns {Promise<Array>} Array of team objects
 */
async function getTeams() {
  const query = gql`
    query {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `;

  try {
    const res = await client.request(query);
    return res.teams.nodes;
  } catch (error) {
    console.error("❌ Error fetching Linear teams:", error.message);
    throw error;
  }
}

/**
 * Test Linear API Connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    console.log("🔌 Testing Linear API connection...");
    const teams = await getTeams();
    console.log(
      `✅ Linear API connection successful. Found ${teams.length} teams.`
    );
    return true;
  } catch (error) {
    console.error("❌ Linear API connection failed:", error.message);
    return false;
  }
}

/**
 * Get Project by Twenty Opportunity ID
 * Searches for a project with the opportunity ID in its description
 * @param {string} opportunityId - Twenty opportunity ID
 * @returns {Promise<Object|null>} Project object or null
 */
async function getProjectByOpportunityId(opportunityId) {
  const query = gql`
    query ($filter: ProjectFilter) {
      projects(filter: $filter) {
        nodes {
          id
          name
          description
          progress
          state
        }
      }
    }
  `;

  try {
    // Search for projects containing the opportunity ID
    const res = await client.request(query, {
      filter: {
        description: { contains: `[TwentyOpportunityId: ${opportunityId}]` },
      },
    });

    return res.projects.nodes[0] || null;
  } catch (error) {
    console.error("❌ Error searching for project:", error.message);
    return null;
  }
}

module.exports = {
  createProject,
  updateProject,
  getProject,
  createComment,
  createAttachment,
  getUserIdByEmail,
  appendTwentyId,
  parseTwentyId,
  getIssue,
  getTeams,
  testConnection,
  getProjectByOpportunityId,
};
