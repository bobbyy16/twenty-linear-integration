import dotenv from "dotenv";

dotenv.config();

export const config = {
  twenty: {
    apiKey: process.env.TWENTY_API_KEY,
    baseUrl: process.env.TWENTY_BASE_URL,
    webhookSecret: process.env.TWENTY_WEBHOOK_SECRET,
  },
  linear: {
    apiKey: process.env.LINEAR_API_KEY,
    teamId: process.env.LINEAR_TEAM_ID,
    webhookSecret: process.env.LINEAR_WEBHOOK_SECRET,
  },
  port: process.env.PORT || 8080,
};

export const validateConfig = () => {
  const required = [
    "TWENTY_API_KEY",
    "TWENTY_BASE_URL",
    "TWENTY_WEBHOOK_SECRET",
    "LINEAR_API_KEY",
    "LINEAR_TEAM_ID",
    "LINEAR_WEBHOOK_SECRET",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
};
