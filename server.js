import express from "express";
import bodyParser from "body-parser";

import webhookRoutes from "./routes/webhookRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { validateConfig } from "./config/env.js";

validateConfig();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

app.use("/webhooks", webhookRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
