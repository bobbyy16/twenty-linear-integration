import { linearApi } from "./linear-api.js";
import { twentyApi } from "./twenty-api.js";
import {
  twentyFieldMappings,
  deliveryStatusValues,
} from "../config/fieldMappings.js";

export const syncService = {
  async extractTwentyIdFromLinear(projectId) {
    try {
      const project = await linearApi.getProject(projectId);
      const match = project.description?.match(
        /\[TwentyOpportunityId: ([^\]]+)\]/
      );
      return match ? match[1] : null;
    } catch (error) {
      console.error("[Sync Service] Error extracting Twenty ID:", error);
      return null;
    }
  },

  mapLinearStateToTwenty(linearState) {
    const stateMap = {
      backlog: deliveryStatusValues.ON_HOLD,
      planned: deliveryStatusValues.INITIATED,
      started: deliveryStatusValues.IN_PROGRESS,
      completed: deliveryStatusValues.COMPLETED,
      cancelled: deliveryStatusValues.CANCELLED,
    };
    return stateMap[linearState] || deliveryStatusValues.IN_PROGRESS;
  },

  async syncTwentyToLinear(opportunityId, data, linearProjectId) {
    try {
      await linearApi.getProject(linearProjectId);

      const projectProgress = data[twentyFieldMappings.projectProgress];
      const deliveryStatus = data[twentyFieldMappings.deliveryStatus];
      const closeDate = data[twentyFieldMappings.closeDate];

      const updatePayload = {};

      if (deliveryStatus) {
        const linearState = this.mapTwentyStateToLinear(deliveryStatus);
        updatePayload.state = linearState;
      }

      if (closeDate) {
        updatePayload.targetDate = closeDate;
      }

      if (Object.keys(updatePayload).length > 0) {
        await linearApi.updateProject(linearProjectId, updatePayload);
      }

      await twentyApi.updateOpportunity(opportunityId, {
        [twentyFieldMappings.syncStatus]: "synced",
      });
    } catch (error) {
      await twentyApi.updateOpportunity(opportunityId, {
        [twentyFieldMappings.syncStatus]: "error",
      });
      throw error;
    }
  },

  mapTwentyStateToLinear(twentyStatus) {
    const stateMap = {
      [deliveryStatusValues.ON_HOLD]: "backlog",
      [deliveryStatusValues.INITIATED]: "planned",
      [deliveryStatusValues.IN_PROGRESS]: "started",
      [deliveryStatusValues.COMPLETED]: "completed",
      [deliveryStatusValues.CANCELLED]: "cancelled",
    };
    return stateMap[twentyStatus] || "started";
  },

  async syncLinearToTwenty(opportunityId, linearData) {
    try {
      const { state, progress, targetDate } = linearData;

      const updatePayload = {};

      if (state) {
        updatePayload[twentyFieldMappings.deliveryStatus] =
          this.mapLinearStateToTwenty(state);
      }

      if (progress !== undefined) {
        updatePayload[twentyFieldMappings.projectProgress] =
          progress.toString();
      }

      if (targetDate) {
        updatePayload[twentyFieldMappings.closeDate] = targetDate;
      }

      if (Object.keys(updatePayload).length > 0) {
        await twentyApi.updateOpportunity(opportunityId, updatePayload);
      }

      await twentyApi.updateOpportunity(opportunityId, {
        [twentyFieldMappings.syncStatus]: "synced",
      });
    } catch (error) {
      throw error;
    }
  },
};
