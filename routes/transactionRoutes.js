const express = require("express");
const router = express.Router();
const { order, verify } = require("../controller/transactionsController")

router.post("/order", order);

router.post("/verify", verify);

module.exports = router