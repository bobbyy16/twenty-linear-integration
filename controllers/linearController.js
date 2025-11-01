// controllers/linearController.js
const crypto = require("crypto");
const linearModel = require("../models/linearModel");
const twentyModel = require("../models/twentyModel");

/**
 * Maps Linear project states to Twenty delivery statuses
 */
const STATE_MAPPING = {
  planned: "INITIATED",
  started: "IN_PROGRESS",
  paused: "ON_HOLD",
  completed: "DELIVERED",
  canceled: "CANCELLED",
};

/**
 * Handles webhooks from Linear
 * Validates signature and syncs changes back to Twenty CRM
 */
async function handleWebhook(req, res) {
  try {
    // 1. Validate Linear webhook signature
    const signature = req.headers["linear-signature"];

    if (!signature) {
      console.warn("⚠️ Missing Linear webhook signature");
      return res.status(400).json({ error: "Missing signature" });
    }

    // Linear uses HMAC SHA256 with webhook secret
    const payloadStr = JSON.stringify(req.body);
    const computedSig = crypto
      .createHmac("sha256", process.env.LINEAR_WEBHOOK_SECRET)
      .update(payloadStr)
      .digest("hex");

    if (computedSig !== signature) {
      console.error("❌ Invalid Linear webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // 2. Parse Linear's webhook payload
    const { action, data, type, createdAt } = req.body;

    console.log(`📥 Linear webhook received: ${action} ${type}`);

    if (!data || !action) {
      return res.status(400).json({ error: "Missing webhook data" });
    }

    let projectId;
    let project;

    try {
      // 3. Determine the project ID based on webhook type
      if (type === "Issue" && action === "update") {
        projectId = data.projectId;
      } else if (type === "Project" && action === "update") {
        projectId = data.id;
      } else if (
        action === "create" &&
        ["Comment", "Attachment"].includes(type)
      ) {
        // For comments/attachments, get project from issue or directly
        projectId = data.projectId;

        // If comment/attachment is on an issue, get the issue's project
        if (!projectId && data.issueId) {
          const issue = await linearModel.getIssue(data.issueId);
          projectId = issue?.project?.id;
        }
      }

      if (!projectId) {
        return res.status(200).json({ message: "No linked project found" });
      }

      // 4. Get the Linear project and extract Twenty opportunity ID
      project = await linearModel.getProject(projectId);
      const oppId = linearModel.parseTwentyId(project.description);

      if (!oppId) {
        console.log("ℹ️ Project has no linked Twenty opportunity");
        return res.status(200).json({ message: "No linked opportunity" });
      }

      console.log(`🔗 Found linked opportunity: ${oppId}`);

      // 5. Route to appropriate handler based on webhook type
      if (action === "update" && type === "Issue") {
        return await handleIssueUpdate(projectId, oppId, project, res);
      } else if (action === "update" && type === "Project") {
        return await handleProjectUpdate(data, oppId, project, res);
      } else if (action === "create" && type === "Comment") {
        return await handleCommentCreated(data, oppId, res);
      } else if (action === "create" && type === "Attachment") {
        return await handleAttachmentCreated(data, oppId, res);
      } else if (action === "update" && type === "ProjectMilestone") {
        return await handleMilestoneUpdate(projectId, oppId, project, res);
      }

      res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      console.error("❌ Error processing Linear webhook:", error.message);
      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error("❌ Linear webhook handler error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

/**
 * Handles Linear issue updates - syncs progress to Twenty
 */
async function handleIssueUpdate(projectId, oppId, project, res) {
  try {
    console.log("🔄 Syncing issue update to Twenty opportunity");

    // Calculate progress percentage from Linear
    const progress = Math.round(project.progress * 100);

    // Map Linear state to Twenty delivery status
    const deliveryStatus = STATE_MAPPING[project.state] || "IN_PROGRESS";

    await twentyModel.updateOpportunity(oppId, {
      projectprogress: progress,
      deliverystatus: deliveryStatus,
    });

    console.log(
      `✅ Updated Twenty opportunity: ${progress}% progress, ${deliveryStatus} status`
    );
    return res.status(200).json({ message: "Issue update synced to Twenty" });
  } catch (error) {
    console.error("❌ Error syncing issue update:", error.message);
    return res.status(500).json({ error: "Failed to sync issue update" });
  }
}

/**
 * Handles Linear project updates - syncs metadata to Twenty
 */
async function handleProjectUpdate(data, oppId, project, res) {
  try {
    console.log("🔄 Syncing project update to Twenty opportunity");

    const updates = {};

    // Sync assignee (lead) to point of contact
    if (project.lead?.email) {
      try {
        const user = await twentyModel.getUserByEmail(project.lead.email);
        if (user?.id) {
          updates.pointOfContactId = user.id;
          console.log("👤 Synced assignee to Twenty");
        }
      } catch (error) {
        console.error(
          "⚠️ Could not find Twenty user for email:",
          project.lead.email
        );
      }
    }

    // Sync target date to close date
    if (project.targetDate) {
      updates.closeDate = project.targetDate;
      console.log("📅 Synced target date to Twenty");
    }

    // Sync progress
    const progress = Math.round(project.progress * 100);
    updates.projectprogress = progress;

    // Sync delivery status
    updates.deliverystatus = STATE_MAPPING[project.state] || "IN_PROGRESS";

    if (Object.keys(updates).length > 0) {
      await twentyModel.updateOpportunity(oppId, updates);
      console.log("✅ Project update synced to Twenty");
    }

    return res.status(200).json({ message: "Project update synced to Twenty" });
  } catch (error) {
    console.error("❌ Error syncing project update:", error.message);
    return res.status(500).json({ error: "Failed to sync project update" });
  }
}

/**
 * Handles Linear comment creation - syncs to Twenty as note
 */
async function handleCommentCreated(data, oppId, res) {
  try {
    console.log("💬 Syncing Linear comment to Twenty note");

    await twentyModel.createNote(oppId, data.body);

    console.log("✅ Comment synced to Twenty");
    return res.status(200).json({ message: "Comment synced to Twenty" });
  } catch (error) {
    console.error("❌ Error syncing comment:", error.message);
    return res.status(500).json({ error: "Failed to sync comment" });
  }
}

/**
 * Handles Linear attachment creation - syncs to Twenty
 */
async function handleAttachmentCreated(data, oppId, res) {
  try {
    console.log("📎 Syncing Linear attachment to Twenty");

    await twentyModel.createAttachment(oppId, {
      fileUrl: data.url,
      name: data.title || "Attachment from Linear",
    });

    console.log("✅ Attachment synced to Twenty");
    return res.status(200).json({ message: "Attachment synced to Twenty" });
  } catch (error) {
    console.error("❌ Error syncing attachment:", error.message);
    return res.status(500).json({ error: "Failed to sync attachment" });
  }
}

/**
 * Handles Linear milestone updates - syncs progress to Twenty
 */
async function handleMilestoneUpdate(projectId, oppId, project, res) {
  try {
    console.log("🎯 Syncing milestone update to Twenty");

    const progress = Math.round(project.progress * 100);

    await twentyModel.updateOpportunity(oppId, {
      projectprogress: progress,
    });

    console.log(`✅ Updated Twenty progress: ${progress}%`);
    return res
      .status(200)
      .json({ message: "Milestone update synced to Twenty" });
  } catch (error) {
    console.error("❌ Error syncing milestone:", error.message);
    return res.status(500).json({ error: "Failed to sync milestone" });
  }
}

module.exports = { handleWebhook };
