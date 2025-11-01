// controllers/twentyController.js
const crypto = require("crypto");
const twentyModel = require("../models/twentyModel");
const linearModel = require("../models/linearModel");

/**
 * Handles webhooks from Twenty CRM
 * Validates signature and creates Linear projects when opportunities close
 */
async function handleWebhook(req, res) {
  try {
    // 1. Validate Signature
    const timestamp = req.headers["x-twenty-webhook-timestamp"];
    const signature = req.headers["x-twenty-webhook-signature"];

    if (!timestamp || !signature) {
      console.warn("⚠️ Missing webhook headers");
      return res.status(400).json({ error: "Missing headers" });
    }

    const payloadStr = JSON.stringify(req.body);
    const stringToSign = `${timestamp}:${payloadStr}`;
    const computedSig = crypto
      .createHmac("sha256", process.env.TWENTY_WEBHOOK_SECRET)
      .update(stringToSign)
      .digest("hex");

    if (computedSig !== signature) {
      console.error("❌ Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // 2. Parse Twenty's payload
    const { eventName, record, updatedFields } = req.body;

    if (!record || !record.id) {
      return res.status(400).json({ error: "Missing record data" });
    }

    console.log(
      `📥 Twenty webhook received: ${eventName} for opportunity ${record.id}`
    );

    // 3. Handle opportunity creation (CLOSED_WON -> Create Linear Project)
    if (eventName === "opportunity.updated") {
      return await handleOpportunityUpdate(record, updatedFields, res);
    }

    // 4. Handle note creation (sync to Linear as comment)
    if (eventName === "note.created" && record.opportunityId) {
      return await handleNoteCreated(record, res);
    }

    // 5. Handle attachment creation (sync to Linear)
    if (eventName === "attachment.created" && record.opportunityId) {
      return await handleAttachmentCreated(record, res);
    }

    res.status(200).json({ message: "Webhook received, no action needed" });
  } catch (error) {
    console.error("❌ Webhook handler error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

/**
 * Handles opportunity updates from Twenty
 * Creates Linear project when stage changes to CLOSED_WON
 */
async function handleOpportunityUpdate(data, updatedFields, res) {
  // Check if stage changed to CLOSED_WON and not already synced
  console.log(data);

  if (
    updatedFields.includes("stage") &&
    data.stage === "CLOSED_WON" &&
    (!data.linearprojectid || data.linearprojectid === "")
  ) {
    console.log("✨ Processing CLOSED_WON opportunity:", data.id);

    // Get assignee email from point of contact
    let assigneeEmail = null;
    let leadId = null;

    if (data.pointOfContactId) {
      try {
        const person = await twentyModel.getPerson(data.pointOfContactId);
        assigneeEmail = person?.email?.[0]?.email || person?.email;
        console.log("👤 Found assignee email:", assigneeEmail);

        if (assigneeEmail) {
          leadId = await linearModel.getUserIdByEmail(assigneeEmail);
          console.log("👤 Found Linear user ID:", leadId);
        }
      } catch (error) {
        console.error("⚠️ Error fetching assignee:", error.message);
      }
    }

    try {
      // Create Linear project with Twenty opportunity ID embedded
      const description = linearModel.appendTwentyId(
        data.name || "Untitled",
        data.id
      );

      console.log("🚀 Creating Linear project:", {
        name: data.name || "Untitled Deal",
        hasLead: !!leadId,
        targetDate: data.closeDate || null,
      });

      const project = await linearModel.createProject(
        data.name || "Untitled Deal",
        description,
        leadId,
        data.closeDate || null // Use closeDate as targetDate
      );

      console.log("✅ Linear project created:", project.id);

      // Update Twenty opportunity with Linear project ID
      await twentyModel.updateOpportunity(data.id, {
        linearprojectid: project.id,
        projectprogress: 0,
        deliverystatus: "INITIATED",
      });

      console.log("✅ Twenty opportunity updated with Linear project ID");

      return res.status(200).json({
        message: "Project created successfully",
        url: project.url,
        projectId: project.id,
      });
    } catch (error) {
      console.error("❌ Failed to create Linear project:", error.message);
      return res.status(500).json({
        error: "Failed to create Linear project",
        details: error.message,
        opportunityId: data.id,
      });
    }
  }

  // Handle other opportunity updates (sync back to Linear if project exists)
  if (data.linearprojectid && updatedFields.length > 0) {
    return await syncOpportunityToLinear(data, updatedFields, res);
  }

  return res.status(200).json({ message: "No action needed" });
}

/**
 * Syncs Twenty opportunity changes back to Linear project
 */
async function syncOpportunityToLinear(opportunity, updatedFields, res) {
  try {
    const updates = {};

    // Sync name changes
    if (updatedFields.includes("name") && opportunity.name) {
      updates.name = opportunity.name;
    }

    // Sync close date to target date
    if (updatedFields.includes("closeDate") && opportunity.closeDate) {
      updates.targetDate = opportunity.closeDate;
    }

    // Sync point of contact to lead
    if (
      updatedFields.includes("pointOfContactId") &&
      opportunity.pointOfContactId
    ) {
      try {
        const person = await twentyModel.getPerson(
          opportunity.pointOfContactId
        );
        const email = person?.email?.[0]?.email || person?.email;
        if (email) {
          const leadId = await linearModel.getUserIdByEmail(email);
          if (leadId) updates.leadId = leadId;
        }
      } catch (error) {
        console.error("⚠️ Error syncing lead:", error.message);
      }
    }

    if (Object.keys(updates).length > 0) {
      console.log("🔄 Syncing Twenty changes to Linear:", updates);
      await linearModel.updateProject(opportunity.linearprojectid, updates);
      console.log("✅ Linear project updated from Twenty");
    }

    return res.status(200).json({ message: "Synced to Linear" });
  } catch (error) {
    console.error("❌ Error syncing to Linear:", error.message);
    return res.status(500).json({ error: "Sync failed" });
  }
}

/**
 * Handles note creation in Twenty - syncs to Linear as comment
 */
async function handleNoteCreated(note, res) {
  try {
    const opportunity = await twentyModel.getOpportunity(note.opportunityId);

    if (!opportunity?.linearprojectid) {
      return res.status(200).json({ message: "No linked Linear project" });
    }

    console.log(
      "💬 Syncing note to Linear project:",
      opportunity.linearprojectid
    );
    await linearModel.createComment(
      opportunity.linearprojectid,
      note.content || note.body
    );

    console.log("✅ Note synced to Linear");
    return res.status(200).json({ message: "Note synced to Linear" });
  } catch (error) {
    console.error("❌ Error syncing note:", error.message);
    return res.status(500).json({ error: "Failed to sync note" });
  }
}

/**
 * Handles attachment creation in Twenty - syncs to Linear
 */
async function handleAttachmentCreated(attachment, res) {
  try {
    const opportunity = await twentyModel.getOpportunity(
      attachment.opportunityId
    );

    if (!opportunity?.linearprojectid) {
      return res.status(200).json({ message: "No linked Linear project" });
    }

    console.log(
      "📎 Syncing attachment to Linear project:",
      opportunity.linearprojectid
    );
    await linearModel.createAttachment(
      opportunity.linearprojectid,
      attachment.fileUrl || attachment.url,
      attachment.name || attachment.title || "Attachment"
    );

    console.log("✅ Attachment synced to Linear");
    return res.status(200).json({ message: "Attachment synced to Linear" });
  } catch (error) {
    console.error("❌ Error syncing attachment:", error.message);
    return res.status(500).json({ error: "Failed to sync attachment" });
  }
}

module.exports = { handleWebhook };
