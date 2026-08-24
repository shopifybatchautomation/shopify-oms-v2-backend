const express = require("express");
const { shipReturn, deleteShippedRecord, getShippedRecord } = require("../controllers/shipReturn.controller");
const router = express.Router();

router.route("/ship").post(shipReturn);
router.route("/delete-shipped-record").post(deleteShippedRecord);
router.route("/").get(getShippedRecord)


module.exports = router;