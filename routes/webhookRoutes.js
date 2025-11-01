import express from "express";
import {
  validateTwentyWebhook,
  validateLinearWebhook,
} from "../middleware/webhookValidator.js";
import { twentyWebhookController } from "../controllers/twentyController.js";
import { linearWebhookController } from "../controllers/linearController.js";

const router = express.Router();

router.post(
  "/twenty",
  validateTwentyWebhook,
  twentyWebhookController.handleWebhook
);

router.post(
  "/linear",
  validateLinearWebhook,
  linearWebhookController.handleWebhook
);

export default router;
