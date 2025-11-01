import { twentyApi } from "./twenty-api.js";
import { linearApi } from "./linear-api.js";
import { syncService } from "./sync-service.js";
import {
  twentyFieldMappings,
  stageValues,
  deliveryStatusValues,
} from "../config/fieldMappings.js";

export const twentyService = {
  async handleOpportunityUpdate(data) {
    try {
      const id = data.id;

      const stage = data[twentyFieldMappings.stage];
      const name = data[twentyFieldMappings.name];
      const closeDate = data[twentyFieldMappings.closeDate];
      const pointOfContact = data[twentyFieldMappings.pointOfContact];
      const linearProjectId = data[twentyFieldMappings.linearProjectId];

      if (stage === stageValues.CLOSED_WON && !linearProjectId) {
        let leadId = null;

        if (pointOfContact?.email) {
          const linearUser = await linearApi.getUserByEmail(
            pointOfContact.email
          );
          leadId = linearUser?.id;
        }

        const project = await linearApi.createProject({
          name,
          description: `Deal: ${name}\n[TwentyOpportunityId: ${id}]`,
          targetDate: closeDate,
          leadId,
          teamId: process.env.LINEAR_TEAM_ID,
        });

        await twentyApi.updateOpportunity(id, {
          [twentyFieldMappings.linearProjectId]: project.id,
          [twentyFieldMappings.projectProgress]: "0",
          [twentyFieldMappings.deliveryStatus]: deliveryStatusValues.INITIATED,
          [twentyFieldMappings.syncStatus]: "synced",
        });
      }

      if (linearProjectId) {
        await syncService.syncTwentyToLinear(id, data, linearProjectId);
      }
    } catch (error) {
      console.error(`[Twenty Service] Error:`, error.message);
      throw error;
    }
  },

  async handleNoteCreated(data) {
    try {
      const body = data.body;
      const opportunityId = data.opportunityId;

      // Get opportunity to find linked Linear project
      const opportunity = await twentyApi.getOpportunity(opportunityId);
      const linearProjectId = opportunity[twentyFieldMappings.linearProjectId];

      if (linearProjectId) {
        console.log(
          `[Twenty Service] Syncing note to Linear project: ${linearProjectId}`
        );
        await linearApi.createComment(linearProjectId, body);
      } else {
        console.log(
          `[Twenty Service] No Linear project linked, skipping note sync`
        );
      }
    } catch (error) {
      console.error(
        `[Twenty Service] Error handling note creation:`,
        error.message
      );
      throw error;
    }
  },

  async handleAttachmentCreated(data) {
    try {
      const externalUrl = data.externalUrl;
      const name = data.name;
      const opportunityId = data.opportunityId;

      // Get opportunity to find linked Linear project
      const opportunity = await twentyApi.getOpportunity(opportunityId);
      const linearProjectId = opportunity[twentyFieldMappings.linearProjectId];

      if (linearProjectId) {
        console.log(
          `[Twenty Service] Syncing attachment to Linear project: ${linearProjectId}`
        );
        // Create a comment with the attachment link
        await linearApi.createComment(
          linearProjectId,
          `📎 Attachment: [${name}](${externalUrl})`
        );
      } else {
        console.log(
          `[Twenty Service] No Linear project linked, skipping attachment sync`
        );
      }
    } catch (error) {
      console.error(
        `[Twenty Service] Error handling attachment creation:`,
        error.message
      );
      throw error;
    }
  },
};
