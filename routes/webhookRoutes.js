const express = require("express");
const router = express.Router();
const twentyController = require("../controllers/twentyController");
const linearController = require("../controllers/linearController");

router.post("/twenty", twentyController.handleWebhook);
router.post("/linear", linearController.handleWebhook);

module.exports = router;
