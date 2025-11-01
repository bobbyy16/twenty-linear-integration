// index.js
const express = require("express");
const dotenv = require("dotenv");
const webhookRoutes = require("./routes/webhookRoutes");
const linearModel = require("./models/linearModel");
const twentyModel = require("./models/twentyModel");

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "LINEAR_API_KEY",
  "LINEAR_TEAM_ID",
  "TWENTY_API_KEY",
  "TWENTY_BASE_URL",
  "TWENTY_WEBHOOK_SECRET",
  "LINEAR_WEBHOOK_SECRET",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((envVar) => console.error(`   - ${envVar}`));
  process.exit(1);
}

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Home route - friendly landing page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Twenty ↔️ Linear Sync</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          margin: 0;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 20px;
        }
        .status {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
        }
        .endpoint {
          background: rgba(0, 0, 0, 0.2);
          padding: 10px;
          border-radius: 5px;
          margin: 10px 0;
          font-family: 'Courier New', monospace;
        }
        img {
          max-width: 300px;
          border-radius: 10px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Twenty ↔️ Linear Sync</h1>
        <img src="https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif" alt="Success" />
        
        <div class="status">
          <h2>✅ Service Running</h2>
          <p>Two-way sync is active and ready!</p>
        </div>
        
        <div class="status">
          <h3>Webhook Endpoints:</h3>
          <div class="endpoint">POST /webhook/twenty</div>
          <div class="endpoint">POST /webhook/linear</div>
          <div class="endpoint">GET /webhook/health</div>
        </div>

        <div class="status">
          <h3>Features:</h3>
          <ul style="text-align: left; display: inline-block;">
            <li>✨ Auto-create Linear projects from closed deals</li>
            <li>🔄 Sync progress & status changes</li>
            <li>💬 Sync comments bidirectionally</li>
            <li>📎 Sync attachments both ways</li>
            <li>👤 Sync assignees & leads</li>
            <li>📅 Sync due dates & target dates</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Webhook routes
app.use("/webhook", webhookRoutes);

// Test endpoint to verify API connections
app.get("/test-connections", async (req, res) => {
  console.log("🧪 Testing API connections...");

  const results = {
    linear: { status: "unknown", details: null },
    twenty: { status: "unknown", details: null },
  };

  // Test Linear
  try {
    const linearOk = await linearModel.testConnection();
    results.linear.status = linearOk ? "connected" : "failed";

    if (linearOk) {
      const teams = await linearModel.getTeams();
      results.linear.details = {
        teams: teams.map((t) => ({ id: t.id, name: t.name, key: t.key })),
        configuredTeamId: process.env.LINEAR_TEAM_ID,
      };
    }
  } catch (error) {
    results.linear.status = "error";
    results.linear.details = error.message;
  }

  // Test Twenty
  try {
    const twentyOk = await twentyModel.testConnection();
    results.twenty.status = twentyOk ? "connected" : "failed";

    if (twentyOk) {
      results.twenty.details = {
        apiUrl: process.env.TWENTY_API_URL,
      };
    }
  } catch (error) {
    results.twenty.status = "error";
    results.twenty.details = error.message;
  }

  const allOk =
    results.linear.status === "connected" &&
    results.twenty.status === "connected";

  res.status(allOk ? 200 : 500).json({
    success: allOk,
    message: allOk ? "All connections successful!" : "Some connections failed",
    results,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "This endpoint does not exist",
    availableEndpoints: [
      "GET /",
      "GET /webhook/health",
      "GET /test-connections",
      "POST /webhook/twenty",
      "POST /webhook/linear",
    ],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Twenty ↔️ Linear Sync Server Started");
  console.log("=".repeat(60));
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`🔗 Webhook endpoints:`);
  console.log(`   - Twenty: http://localhost:${PORT}/webhook/twenty`);
  console.log(`   - Linear: http://localhost:${PORT}/webhook/linear`);
  console.log(`🧪 Test connections: http://localhost:${PORT}/test-connections`);
  console.log("=".repeat(60) + "\n");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n👋 SIGINT received. Shutting down gracefully...");
  process.exit(0);
});
