const { addReturnLog, getReturnLog, getReturnLogReocrd, getAllReturnRecords } = require("../controllers/ReturnLog.controller");
const router = require("express").Router();

router.route("/create-log").post(addReturnLog);
router.route("/get-log-records").get(getReturnLogReocrd);
router.route("/get-log").get(getReturnLog);
router.route("/get-all-logs").post(getAllReturnRecords);


module.exports = router;