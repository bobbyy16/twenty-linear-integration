import { twentyService } from "../services/twenty-service.js";

export const twentyWebhookController = {
  async handleWebhook(req, res) {
    try {
      const { eventName, record } = req.body;

      if (eventName === "opportunity.updated") {
        await twentyService.handleOpportunityUpdate(record);
      } else if (eventName === "note.created") {
        await twentyService.handleNoteCreated(record);
      } else if (eventName === "attachment.created") {
        await twentyService.handleAttachmentCreated(record);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Twenty Webhook Error]", error);
      res.status(500).json({ error: error.message });
    }
  },
};
