import { linearService } from "../services/linear-service.js";

export const linearWebhookController = {
  async handleWebhook(req, res) {
    try {
      const { type, action, data } = req.body;

      if (type === "Project" && action === "update") {
        await linearService.handleProjectUpdate(data);
      } else if (type === "Issue" && action === "update") {
        await linearService.handleIssueUpdate(data);
      } else if (type === "Comment" && action === "create") {
        await linearService.handleCommentCreated(data);
      } else if (type === "Attachment" && action === "create") {
        await linearService.handleAttachmentCreated(data);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error(`[Linear Webhook] Error handling webhook:`, error.message);
      res.status(500).json({ error: "Error handling webhook" });
    }
  },
};
