const express = require("express");
const router = express.Router();
const {getAllVans, getQueryVans, getVans} = require("../controller/vansController")

router.post("/getHostVans", getAllVans);

router.get("/uservans", getQueryVans)

router.get("/vans", getVans)


module.exports = router