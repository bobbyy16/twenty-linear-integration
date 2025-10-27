const express = require("express");
const dotenv = require("dotenv");
const webhookRoutes = require("./routes/webhookRoutes");

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
            <html>
              <head><title>Success!</title></head>
              <body style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
                <h1>You did it!</h1>
                <img src="https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif" alt="Cool kid doing thumbs up" />
              </body>
            </html>
          `);
});

app.use("/webhook", webhookRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port http://localhost:${PORT}`)
);
