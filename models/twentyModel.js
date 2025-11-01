const axios = require("axios");
require("dotenv").config();

const twentyApi = axios.create({
  baseURL: process.env.TWENTY_BASE_URL,
  headers: { Authorization: `Bearer ${process.env.TWENTY_API_KEY}` },
});

// Get Opportunity
async function getOpportunity(id) {
  try {
    const { data } = await twentyApi.get(`/opportunities/${id}`);
    return data;
  } catch (err) {
    console.error("Failed to fetch opportunity:", err.message);
    return null;
  }
}

// Update Opportunity
async function updateOpportunity(id, data) {
  await twentyApi.patch(`/opportunities/${id}`, data);
}

// Create Note (for comments)
async function createNote({ body, opportunityId }) {
  await twentyApi.post("/notes", {
    body,
    linkedRecordIds: { opportunityId },
    linkedRecordType: "Opportunity",
  });
}

// Create Attachment
async function createAttachment({ opportunityId, fileUrl, name }) {
  await twentyApi.post("/attachments", {
    fileUrl,
    name,
    linkedRecordIds: { opportunityId },
    linkedRecordType: "Opportunity",
  });
}

// Get User by Email (for assignee mapping)
async function getUserByEmail(email) {
  const { data } = await twentyApi.get("/people", {
    filter: { email_eq: email },
  });
  return data.people[0]; // Assume first match
}

async function getPerson(id) {
  try {
    const { data } = await twentyApi.get(`/people/${id}`);
    return data;
  } catch (err) {
    console.error("Failed to get person:", err.message);
    return null;
  }
}

module.exports = {
  getOpportunity,
  updateOpportunity,
  createNote,
  createAttachment,
  getUserByEmail,
  getPerson,
};
