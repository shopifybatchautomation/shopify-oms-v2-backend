const mongoose = require("mongoose");

const returnLogSchema = new mongoose.Schema({
    source: {
        type: String,
        required: true,

    },
    log_id: {
        type: Number,
        required: true,
        unique: true,
    },
    status: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
});

const ReturnLog = mongoose.model("ReturnLog", returnLogSchema);
module.exports = ReturnLog;
