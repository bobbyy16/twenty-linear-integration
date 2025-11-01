const { GraphQLClient, gql } = require("graphql-request");
require("dotenv").config();

const client = new GraphQLClient("https://api.linear.app/graphql", {
  headers: { Authorization: process.env.LINEAR_API_KEY },
});

// Append/Parse Twenty ID
function appendTwentyId(desc, oppId) {
  return `${desc || ""}\n[TwentyOpportunityId: ${oppId}]`;
}

function parseTwentyId(desc) {
  const match = desc?.match(/\[TwentyOpportunityId: (\w+)\]/);
  return match ? match[1] : null;
}

// Create Project
async function createProject(name, description, leadId, targetDate) {
  const mutation = gql`
    mutation ($input: ProjectCreateInput!) {
      projectCreate(input: $input) {
        success
        project {
          id
          url
          percentCompleted
        }
      }
    }
  `;
  const variables = {
    input: {
      teamIds: [process.env.LINEAR_TEAM_ID],
      name,
      description,
      leadId,
      targetDate,
    },
  };
  const res = await client.request(mutation, variables);
  return res.projectCreate.project;
}

// Update Project
async function updateProject(id, updates) {
  const mutation = gql`
    mutation ($id: String!, $input: ProjectUpdateInput!) {
      projectUpdate(id: $id, input: $input) {
        success
      }
    }
  `;
  await client.request(mutation, { id, input: updates });
}

// Get Project
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
        }
        targetDate
        state
        percentCompleted
        issues {
          totalCount
          completedCount
        }
      }
    }
  `;
  const res = await client.request(query, { id });
  return res.project;
}

// Create Comment (on project)
async function createComment(projectId, body) {
  const mutation = gql`
    mutation ($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        success
      }
    }
  `;
  await client.request(mutation, { input: { projectId, body } });
}

// Create Attachment
async function createAttachment(projectId, url, title) {
  const mutation = gql`
    mutation ($input: AttachmentCreateInput!) {
      attachmentCreate(input: $input) {
        success
      }
    }
  `;
  await client.request(mutation, { input: { projectId, url, title } });
}

// Get User ID by Email
async function getUserIdByEmail(email) {
  const query = gql`
    query ($filter: UserFilter) {
      users(filter: $filter) {
        nodes {
          id
          email
        }
      }
    }
  `;
  const res = await client.request(query, { filter: { email: { eq: email } } });
  return res.users.nodes[0]?.id;
}

// Get Issue (for attachments/comments on issues)
async function getIssue(id) {
  const query = gql`
    query ($id: String!) {
      issue(id: $id) {
        id
        project {
          id
        }
      }
    }
  `;
  const res = await client.request(query, { id });
  return res.issue;
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
};
