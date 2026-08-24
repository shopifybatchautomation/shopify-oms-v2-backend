const PressTable = require("../models/pressTable.modal");
const ReturnLog = require("../models/returnlog.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

//  Add a new return log
const addReturnLog = async (req, res, next) => {
    try {
        const { source, log_id, status } = req.body;
        // Validation
        if (!source || !log_id) {
            return next(new ApiError(400, "All fields are required"));
        }
        // Check if log already exists (optional but useful)
        const existing = await ReturnLog.findOne({ log_id });
        if (existing) {
            return next(new ApiError(409, "Log already exists with this log_id"));
        }
        // Create log
        const createdLog = await ReturnLog.create({ source, log_id, status });
        // Success response
        return res
            .status(201)
            .json(new ApiResponse(201, "Return log added successfully", createdLog));
    } catch (error) {
        next(error);
    }
};
//  Get return logs records (with pagination + filter by log_id)
const getReturnLogReocrd = async (req, res, next) => {
    try {
        const { log_id } = req.query;
        const query = {};
        if (log_id) {
            query.log_id = Number(log_id);
        }
        // Pagination setup

        // Fetch logs
        const logs = await PressTable.find(query)
            .sort({ createdAt: -1 })

        // Count total docs
        const totalRecords = await PressTable.countDocuments(query);
        if (!logs || logs.length === 0) {
            return next(new ApiError(404, "No return logs found"));
        }
        // Success response
        return res.status(200).json(
            new ApiResponse(200, "Return log record(s) fetched successfully", {
                totalRecords,
                data: logs,
            })
        );
    } catch (error) {
        next(error);
    }
};


//  Get return logs  (with pagination + filter by log_id)
const getReturnLog = async (req, res, next) => {
    try {
        const { log_id, page = 1, limit = 200 } = req.query;
        const query = {};
        if (log_id) {
            query.log_id = Number(log_id);
        }
        // Pagination setup
        const skip = (Number(page) - 1) * Number(limit);
        // Fetch logs
        const logs = await ReturnLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        // Count total docs
        const totalRecords = await ReturnLog.countDocuments(query);
        if (!logs || logs.length === 0) {
            return next(new ApiError(404, "No return logs found"));
        }
        // Success response
        return res.status(200).json(
            new ApiResponse(200, "Return log record(s) fetched successfully", {
                page: Number(page),
                limit: Number(limit),
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit),
                data: logs,
            })
        );
    } catch (error) {
        next(error);
    }
};



const getAllReturnRecords = async (req, res, next) => {
    try {
        const { log_ids } = req.body;

        if (!Array.isArray(log_ids) || log_ids.length === 0) {
            return res.status(400).json({ message: "log_ids array is required" });
        }

        // Convert to both types
        const numericLogIds = log_ids.map(id => Number(id));
        const stringLogIds = log_ids.map(id => String(id));

        console.log("Incoming payload:", log_ids);
        console.log("Numeric:", numericLogIds);
        console.log("String:", stringLogIds);

        const records = await PressTable.find({
            $or: [
                { log_id: { $in: numericLogIds } },
                { log_id: { $in: stringLogIds } },
            ],
        });


        res.status(200).json(
            new ApiResponse(200, "All log-ids records fetched successfully.", records)
        );
    } catch (error) {
        next(error);
    }
};



module.exports = { addReturnLog, getReturnLogReocrd, getReturnLog, getAllReturnRecords };
