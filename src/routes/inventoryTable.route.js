const express = require("express");
const { saveSessionProducts, deleteSessionProducts, getInventoryTableRecords, deleteSingleSessionProduct } = require("../controllers/inventoryTable.controller");
const router = express.Router();

router.route("/get-records").get(getInventoryTableRecords);
router.route("/inventory/save").post(saveSessionProducts);
router.route("/inventory/delete").post(deleteSessionProducts);
router.route("/inventory/ship").post(deleteSingleSessionProduct);

module.exports = router;