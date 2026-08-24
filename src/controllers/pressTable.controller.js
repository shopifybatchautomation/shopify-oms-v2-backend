const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const PressTable = require("../models/pressTable.modal");
const ReturnTable = require("../models/returnTable.modal");
const ReturnLog = require("../models/returnlog.model");

// get records 
const getPressTableRecords = async (_, res, next) => {
  try {
    const records = await PressTable.find();
    if (!records) {
      throw new ApiError(404, "Recods not found!.");
    }
    res.status(200).json(new ApiResponse(200, "Records fetched successfully", records));
  } catch (error) {
    next(error)
  }
}

// create record 

// const createPressTableRecord = async (req, res, next) => {
//   try {
//     const { styleNumber, size, color, channel, employee_name, order_id, with_tag } = req.body;

//     // Check for missing fields
//     if (
//       [styleNumber, size, color, channel, employee_name].some(
//         (field) => !field
//       )
//     ) {
//       throw new ApiError(409, "All fields are required");
//     }

//     // Check if order_id already exists
//     const orderIDExists = order_id && await PressTable.findOne({ order_id });
//     if (orderIDExists) {
//       throw new ApiError(409, `${order_id} already exists, please scan a new Order ID.`);
//     }

//     // Create the press table record
//     const addedRecord = await PressTable.create({
//       styleNumber,
//       size,
//       color,
//       channel,
//       location: "Press Table",
//       employee_name,
//       order_id,
//       with_tag
//     });

//     // Delete matching record from return table
//     const returnTableRecord = await ReturnTable.findOne({ order_id });
//     if (!returnTableRecord) {
//       return res.status(201).json(new ApiResponse(201, "Record not found in return table but Added in Press Table", addedRecord));
//     }

//     const deletedRecord = await ReturnTable.findByIdAndDelete(returnTableRecord._id);
//     if (!deletedRecord) {
//       throw new ApiError(500, "Failed to delete from Return Table");
//     }

//     // Send success response
//     res.status(201).json(
//       new ApiResponse(
//         201,
//         "Record added to Press Table and deleted from Return Table.",
//         addedRecord
//       )
//     );
//   } catch (error) {
//     next(error);
//   }
// };

const createPressTableRecord = async (req, res, next) => {
  try {
    const logId = Number(Date.now());
    let records = req.body; // Can be one object or array

    if (!Array.isArray(records)) {
      records = [records];
    }

    // Validate required fields
    for (const record of records) {
      const { styleNumber, size, color, channel, employee_name, order_id, location } = record;
      if ([styleNumber, size, channel, employee_name, order_id].some((f) => !f)) {
        throw new ApiError(409, "All fields are required in each record");
      }
    }

    // Collect order IDs (non-empty only)
    const orderIds = records.map((r) => r.order_id).filter(Boolean);

    // Find already existing order IDs in PressTable
    const existingOrders = await PressTable.find({
      order_id: { $in: orderIds },
    }).lean();

    const existingIds = new Set(existingOrders.map((r) => r.order_id));
    // Filter out records that already exist
    const newRecords = records.filter(
      (r) => r.order_id && !existingIds.has(r.order_id)
    );

    if (newRecords.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, "All order IDs already exist, nothing to add."));
    }

    // Prepare bulk upsert operations for new records only
    const bulkOps = newRecords.map((record) => ({
      updateOne: {
        filter: { order_id: record.order_id },
        update: {
          $set: {
            styleNumber: record.styleNumber,
            size: record.size,
            color: record.color || "other",
            channel: record.channel,
            employee_name: record.employee_name,
            with_tag: record.with_tag || false,
            // location: record.location || "",
            location: "Press table",
            log_id: record.log_id || logId
          },
        },
        upsert: true,
      },
    }));

    // Perform bulk write (insert or update)
    await PressTable.bulkWrite(bulkOps, { ordered: false });

    // create return logs for processed return orders 
    const logPayload = {
      source: "Return",
      log_id: logId,
      status: { processed: 0, pending: newRecords.length, total: newRecords.length }
    }

    await ReturnLog.create(logPayload)

    // Delete matching records from ReturnTable (for only newly added ones)
    const deletedRecords = await ReturnTable.deleteMany({
      order_id: { $in: newRecords.map((r) => r.order_id) },
    });

    // Prepare response message
    res.status(201).json(
      new ApiResponse(201, {
        message: `${newRecords.length} record(s) added to Press Table, ${deletedRecords.deletedCount} removed from Return Table.`,
        skipped: existingIds.size,
      })
    );
  } catch (error) {
    next(error);
  }
};

const deletePressTableRecord = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      throw new ApiError(409, "order_id required");
    }
    const findRecord = await PressTable.findOne({ order_id });
    if (!findRecord) {
      throw new ApiError(404, `${order_id} not found`);
    }
    await PressTable.findByIdAndDelete(findRecord._id);
    res.status(200).json(new ApiResponse(200, `${order_id} deleted successfully.`));

  } catch (error) {
    next(error)
  }
}

// *************************** bulk delete order ids *****************************
const bulkDeleteRecordsFromPressTable = async (req, res, next) => {
  try {
    const { order_ids } = req.body;

    // Validate payload
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return next(new ApiError(400, "order_ids must be a non-empty array"));
    }

    // Delete all records where order_id is in order_ids array
    const result = await PressTable.deleteMany({
      order_id: { $in: order_ids },
    });

    // Send response
    return res.status(200).json(new ApiResponse(200, "All matching order_ids deleted successfully.", result));

  } catch (error) {
    next(error);
  }
};


module.exports = { getPressTableRecords, createPressTableRecord, deletePressTableRecord, bulkDeleteRecordsFromPressTable };