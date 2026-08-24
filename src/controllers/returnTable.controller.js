const ReturnTable = require("../models/returnTable.modal");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");


// create return record
// const addReturnTableRecord = async (req, res, next) => {
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
//     const orderIDExists = order_id && await ReturnTable.findOne({ order_id });
//     if (orderIDExists) {
//       throw new ApiError(409, `${order_id} already exists, please scan a new Order ID.`);
//     }

//     // Create the return record
//     const addedRecord = await ReturnTable.create({
//       styleNumber,
//       size,
//       color,
//       channel,
//       location: "Return Table",
//       employee_name,
//       order_id,
//       with_tag
//     });

//     // Send success response with data
//     res.status(201).json(
//       new ApiResponse(201, "Return record added successfully!", addedRecord)
//     );
//   } catch (error) {
//     next(error);
//   }
// };

const addReturnTableRecord = async (req, res, next) => {
  try {
    const { styleNumber, size, color, channel, location, employee_name, order_id, with_tag } = req.body;

    // Validate required fields
    if ([styleNumber, size, color, channel, employee_name].some((field) => !field)) {
      throw new ApiError(409, "All fields are required");
    }

    // If order_id is provided, upsert (update if exists, otherwise create)
    const filter = order_id ? { order_id } : {};
    const updateData = {
      styleNumber,
      size,
      color,
      channel,
      location: location || "Return table",
      employee_name,
      order_id,
      with_tag,
    };

    const options = {
      new: true,          // return the updated document
      upsert: true,       // create if not exists
      runValidators: true // ensure schema validation
    };

    const record = await ReturnTable.findOneAndUpdate(filter, { $set: updateData }, options);

    // Send response
    const message = record.isNew ? "Return record added successfully!" : "Return record updated successfully!";
    res.status(201).json(new ApiResponse(201, message, record));
  } catch (error) {
    next(error);
  }
};




// get return record

const getReturnTableRecords = async (_, res, next) => {
  try {
    const records = await ReturnTable.find();
    if (!records) {
      throw new ApiError(409, "Records not found");
    }
    res.status(200).json(new ApiResponse(200, "Records fetched successfully", records))
  } catch (error) {
    next(error)
  }
}



const deleteReturnTableRecord = async (req, res, next) => {
  try {
    const { order_id, styleNumber, size } = req.body;

    // Validate input
    if (
      (!order_id && (!styleNumber || !size)) ||
      (styleNumber && !size) ||
      (!styleNumber && size)
    ) {
      throw new ApiError(409, "order_id or both styleNumber and size are required");
    }

    // Build dynamic query
    const query = order_id
      ? { order_id }
      : { styleNumber, size };

    const findRecord = await ReturnTable.findOne(query);

    if (!findRecord) {
      throw new ApiError(404, "Record not found");
    }

    await ReturnTable.findByIdAndDelete(findRecord._id);

    res.status(200).json(
      new ApiResponse(200, `${order_id || styleNumber + "-" + size} deleted successfully!`)
    );
  } catch (error) {
    next(error);
  }
};


module.exports = { addReturnTableRecord, getReturnTableRecords, deleteReturnTableRecord }