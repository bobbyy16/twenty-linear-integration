import axios from "axios";
import { config } from "../config/env.js";

// Create reusable axios instance for Twenty
const twentyClient = axios.create({
  baseURL: config.twenty.baseUrl,
  headers: {
    Authorization: `Bearer ${config.twenty.apiKey}`,
    "Content-Type": "application/json",
  },
});

export const twentyApi = {
  // 🔹 Get one opportunity by ID
  async getOpportunity(id) {
    try {
      const response = await twentyClient.get(`/rest/opportunities/${id}`);
      return response.data.data.opportunity;
    } catch (error) {
      console.error(
        `[Twenty API] ❌ Error getting opportunity ${id}:`,
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Update an opportunity safely
  async updateOpportunity(id, data) {
    try {
      // ✅ Only allow fields that exist in Twenty
      const allowedFields = [
        "name",
        "closeDate",
        "deliverystatus",
        "projectprogress",
        "stageId",
        "description",
        "amount",
        "probability",
        "nextStep",
        "ownerId",
        "dealSource",
      ];

      // Filter invalid fields to prevent 400 BadRequest errors
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowedFields.includes(key))
      );

      console.log(
        `[Twenty API] Updating opportunity ${id} with:`,
        filteredData
      );

      const response = await twentyClient.patch(
        `/rest/opportunities/${id}`,
        filteredData
      );

      console.log(`[Twenty API] ✅ Updated successfully`);
      return response.data?.data?.opportunity || response.data;
    } catch (error) {
      const details =
        error.response?.data?.messages || error.response?.data || error.message;
      console.error(`[Twenty API] ❌ Error updating opportunity:`, details);
      throw error;
    }
  },

  // 🔹 Get opportunities (with optional stage filter)
  async getOpportunitiesByStage(stage) {
    try {
      const response = await twentyClient.get("/rest/opportunities");
      const allOpportunities = response.data.data.opportunities;
      return allOpportunities.filter((opp) => opp.stage === stage);
    } catch (error) {
      console.error(
        `[Twenty API] ❌ Error getting opportunities by stage:`,
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Create a note
  async createNote(opportunityId, content) {
    try {
      console.log(
        `[Twenty API] Creating note for opportunity ${opportunityId}`
      );
      const response = await twentyClient.post("/rest/notes", {
        body: content,
        opportunityId,
      });
      return response.data;
    } catch (error) {
      console.error(
        `[Twenty API] ❌ Error creating note:`,
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Get notes for an opportunity
  async getNotes(opportunityId) {
    try {
      const response = await twentyClient.get("/rest/notes");
      const allNotes = response.data.data.notes;
      return allNotes.filter((note) => note.opportunityId === opportunityId);
    } catch (error) {
      console.error(
        `[Twenty API] ❌ Error getting notes:`,
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Create attachment
  async createAttachment(opportunityId, url, name) {
    try {
      console.log(
        `[Twenty API] Creating attachment for opportunity ${opportunityId}`
      );
      const response = await twentyClient.post("/rest/attachments", {
        opportunityId,
        externalUrl: url,
        name,
      });
      return response.data;
    } catch (error) {
      console.error(
        `[Twenty API] ❌ Error creating attachment:`,
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Get attachments
  async getAttachments(opportunityId) {
    try {
      const response = await twentyClient.get("/rest/attachments");
      const allAttachments = response.data.data.attachments;
      return allAttachments.filter(
        (att) => att.opportunityId === opportunityId
      );
    } catch (error) {
      console.error(
        `[Twenty API] ❌ Error getting attachments:`,
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Get all users
  async getUsers() {
    try {
      const response = await twentyClient.get("/rest/users");
      return response.data.data.users;
    } catch (error) {
      console.error(
        `[Twenty API] ❌ Error getting users:`,
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // 🔹 Get user by email
  async getUserByEmail(email) {
    try {
      const users = await this.getUsers();
      return users.find((u) => u.email === email);
    } catch (error) {
      console.error(
        `[Twenty API] ❌ Error getting user by email:`,
        error.message
      );
      throw error;
    }
  },
};
