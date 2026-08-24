const express = require("express");
const { getPressTableRecords, createPressTableRecord, deletePressTableRecord, bulkDeleteRecordsFromPressTable } = require("../controllers/pressTable.controller");
const router = express.Router();

router.route("/get-records").get(getPressTableRecords);
router.route("/add-record").post(createPressTableRecord);
router.route("/delete-record").delete(deletePressTableRecord);
router.route("/bulk_delete").delete(bulkDeleteRecordsFromPressTable);

module.exports = router;