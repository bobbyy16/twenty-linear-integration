// routes/webhookRoutes.js
const express = require("express");
const router = express.Router();
const twentyController = require("../controllers/twentyController");
const linearController = require("../controllers/linearController");

/**
 * Webhook Routes
 *
 * POST /webhook/twenty - Receives webhooks from Twenty CRM
 * POST /webhook/linear - Receives webhooks from Linear
 */

// Twenty CRM webhook endpoint
router.post("/twenty", twentyController.handleWebhook);

// Linear webhook endpoint
router.post("/linear", linearController.handleWebhook);

// Health check endpoint for webhooks
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Webhook service is running",
    endpoints: {
      twenty: "/webhook/twenty",
      linear: "/webhook/linear",
    },
  });
});

module.exports = router;
