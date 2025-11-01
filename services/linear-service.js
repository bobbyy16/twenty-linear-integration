import { linearApi } from "./linear-api.js";
import { twentyApi } from "./twenty-api.js";
import { syncService } from "./sync-service.js";
import {
  twentyFieldMappings,
  syncStatusValues,
} from "../config/fieldMappings.js";

export const linearService = {
  async handleProjectUpdate(data) {
    try {
      console.log(
        "[Linear → Raw Project Payload]",
        JSON.stringify(data, null, 2)
      );

      const { id, status, targetDate } = data;
      const opportunityId = await syncService.extractTwentyIdFromLinear(id);

      if (!opportunityId) {
        console.log(`[Linear Service] No linked opportunity for project ${id}`);
        return;
      }

      // Normalize state name (case-insensitive, fallback safe)
      let stateName = "backlog";
      if (status) {
        if (typeof status === "string") stateName = status.toLowerCase();
        else if (status.name) stateName = status.name.toLowerCase();
      }

      console.log(`[Linear Service] Detected stateName = ${stateName}`);

      // --- Mapping (with fuzzy matching and fallbacks) ---
      const linearToTwentyDeliveryMap = {
        backlog: "INITIATED",
        planned: "INITIATED",
        "in progress": "IN_PROGRESS",
        started: "IN_PROGRESS",
        done: "DELIVERED",
        completed: "DELIVERED",
        finished: "DELIVERED",
        cancelled: "CANCELLED",
        canceled: "CANCELLED",
        archived: "CANCELLED",
      };

      const linearProgressByState = {
        backlog: 0,
        planned: 0.1,
        "in progress": 0.4,
        started: 0.4,
        done: 1.0,
        completed: 1.0,
        finished: 1.0,
        cancelled: 0,
        canceled: 0,
        archived: 0,
      };

      // Try exact match or fuzzy partial match
      const matchedKey =
        Object.keys(linearToTwentyDeliveryMap).find((key) =>
          stateName.includes(key)
        ) || "backlog";

      const deliveryStatus = linearToTwentyDeliveryMap[matchedKey];
      const projectProgress = linearProgressByState[matchedKey] ?? 0;

      const updatePayload = {
        [twentyFieldMappings.linearProjectId]: id,
        [twentyFieldMappings.deliveryStatus]: deliveryStatus,
        [twentyFieldMappings.projectProgress]: projectProgress,
        [twentyFieldMappings.syncStatus]: syncStatusValues.SYNCED,
      };

      if (targetDate) updatePayload[twentyFieldMappings.closeDate] = targetDate;

      console.log("[Linear → Twenty] Payload:", updatePayload);

      await twentyApi.updateOpportunity(opportunityId, updatePayload);

      console.log(
        `[Linear Service] ✅ Synced project (${stateName}) → ${deliveryStatus} (${
          projectProgress * 100
        }%)`
      );
    } catch (error) {
      console.error("[Linear Service] ❌ Error in handleProjectUpdate:", error);
      throw error;
    }
  },

  async handleIssueUpdate(data) {
    try {
      const { projectId } = data;
      const opportunityId = await syncService.extractTwentyIdFromLinear(
        projectId
      );
      if (!opportunityId) return;

      console.log(
        `[Linear Service] Issue update detected — recalculating progress`
      );

      const issues = await linearApi.getProjectIssues(projectId);
      const completedCount = issues.filter((i) => i.completedAt).length;
      const progress =
        issues.length > 0
          ? Math.round((completedCount / issues.length) * 100)
          : 0;

      const projectProgress = progress / 100;

      const updatePayload = {
        [twentyFieldMappings.projectProgress]: projectProgress,
        [twentyFieldMappings.syncStatus]: syncStatusValues.SYNCED,
      };

      await twentyApi.updateOpportunity(opportunityId, updatePayload);

      console.log(
        `[Linear Service] ✅ Updated issue-based progress to ${progress}%`
      );
    } catch (error) {
      console.error("[Linear Service] ❌ Error handling issue update:", error);
      throw error;
    }
  },

  async handleCommentCreated(data) {
    try {
      const { projectId, body } = data;

      const opportunityId = await syncService.extractTwentyIdFromLinear(
        projectId
      );
      if (!opportunityId) return;

      console.log(`[Linear Service] Syncing Linear comment → Twenty note`);
      await twentyApi.createNote(opportunityId, body);

      console.log(`[Linear Service] ✅ Comment synced`);
    } catch (error) {
      console.error("[Linear Service] ❌ Error handling comment:", error);
      throw error;
    }
  },

  async handleAttachmentCreated(data) {
    try {
      const { projectId, url, name } = data;

      const opportunityId = await syncService.extractTwentyIdFromLinear(
        projectId
      );
      if (!opportunityId) return;

      console.log(`[Linear Service] Syncing attachment → Twenty`);
      await twentyApi.createAttachment(opportunityId, url, name);

      console.log(`[Linear Service] ✅ Attachment synced`);
    } catch (error) {
      console.error("[Linear Service] ❌ Error handling attachment:", error);
      throw error;
    }
  },
};
