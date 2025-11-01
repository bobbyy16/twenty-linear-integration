import crypto from "crypto";
import { config } from "../config/env.js";

export const validateTwentyWebhook = (req, res, next) => {
  const secret = config.twenty.webhookSecret;

  if (!secret) {
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  const signature = req.headers["x-twenty-webhook-signature"];
  const timestamp = req.headers["x-twenty-webhook-timestamp"];

  if (!signature || !timestamp) {
    return res.status(400).json({ error: "Missing webhook headers" });
  }

  try {
    const rawBody = JSON.stringify(req.body);

    const stringToSign = `${timestamp}:${rawBody}`;
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(stringToSign)
      .digest("hex");

    if (computedSignature !== signature) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Internal validation error" });
  }
};

export const validateLinearWebhook = (req, res, next) => {
  next();
};
