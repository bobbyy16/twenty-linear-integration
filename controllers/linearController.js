const linearModel = require("../models/linearModel");
const twentyModel = require("../models/twentyModel");

async function handleWebhook(req, res) {
  const { action, data } = req.body;

  let projectId;
  let project;

  try {
    if (action === "update" && data.type === "Issue") {
      projectId = data.projectId;
    } else if (action === "update" && data.type === "Project") {
      projectId = data.id;
    } else if (
      action === "create" &&
      ["Comment", "Attachment"].includes(data.type)
    ) {
      projectId =
        data.projectId ||
        (await linearModel.getIssue(data.issueId))?.project?.id;
    }

    if (!projectId) {
      return res.status(200).json({ message: "No linked project" });
    }

    project = await linearModel.getProject(projectId);
    const oppId = linearModel.parseTwentyId(project.description);
    if (!oppId) {
      return res.status(200).json({ message: "No linked opportunity" });
    }

    if (action === "update" && data.type === "Issue") {
      // Sync progress
      await twentyModel.updateOpportunity(oppId, {
        ProjectProgress: project.percentCompleted,
        DeliveryStatus:
          project.state === "completed" ? "Delivered" : "In Progress",
      });
    } else if (action === "update" && data.type === "Project") {
      // Sync assignee, due date, status
      const assigneeEmail = project.lead?.email;
      const assignee = await twentyModel.getUserByEmail(assigneeEmail);
      await twentyModel.updateOpportunity(oppId, {
        assigneeId: assignee?.id,
        closeDate: project.targetDate,
        DeliveryStatus: project.state,
      });
    } else if (action === "create" && data.type === "Comment") {
      // Sync comment
      await twentyModel.createNote({ body: data.body, opportunityId: oppId });
    } else if (action === "create" && data.type === "Attachment") {
      // Sync attachment
      await twentyModel.createAttachment({
        fileUrl: data.url,
        name: data.title,
        opportunityId: oppId,
      });
    }

    res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("Linear webhook error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { handleWebhook };
