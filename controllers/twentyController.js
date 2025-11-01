// controllers/twentyController.js
const crypto = require("crypto");
const twentyModel = require("../models/twentyModel");
const linearModel = require("../models/linearModel");

async function handleWebhook(req, res) {
  // 1. Validate Signature
  const timestamp = req.headers["x-twenty-webhook-timestamp"];
  const signature = req.headers["x-twenty-webhook-signature"];
  if (!timestamp || !signature) {
    return res.status(400).json({ error: "Missing headers" });
  }

  const payloadStr = JSON.stringify(req.body);
  const stringToSign = `${timestamp}:${payloadStr}`;
  const computedSig = crypto
    .createHmac("sha256", process.env.TWENTY_WEBHOOK_SECRET)
    .update(stringToSign)
    .digest("hex");

  if (computedSig !== signature) {
    console.log("Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  // 2. Parse Twenty's REAL payload
  const { eventName, record, updatedFields } = req.body;

  if (!record || !record.id) {
    return res.status(400).json({ error: "Missing record" });
  }

  // 3. Only handle opportunity updates
  if (eventName === "opportunity.updated") {
    const data = record;

    // Check if stage changed to CLOSED_WON
    if (
      updatedFields.includes("stage") &&
      data.stage === "CLOSED_WON" &&
      data.linearprojectid === "" // not already synced
    ) {
      // Get assignee email
      let assigneeEmail = null;
      if (data.pointOfContactId) {
        const person = await twentyModel.getPerson(data.pointOfContactId);
        assigneeEmail = person?.email?.[0]?.email || person?.email;
      }

      let leadId = null;
      if (assigneeEmail) {
        leadId = await linearModel.getUserIdByEmail(assigneeEmail);
      }

      // Create project
      const description = linearModel.appendTwentyId(
        data.name || "Untitled",
        data.id
      );
      const project = await linearModel.createProject(
        data.name || "Untitled Deal",
        description,
        leadId
      );

      // Update Twenty with lowercase field name
      await twentyModel.updateOpportunity(data.id, {
        linearprojectid: project.id,
        projectprogress: 0,
        deliverystatus: "INITIATED",
      });

      console.log("Project created in Linear:", project.url);
      return res
        .status(200)
        .json({ message: "Project created", url: project.url });
    }
  }

  res.status(200).json({ message: "Ignored" });
}

module.exports = { handleWebhook };
