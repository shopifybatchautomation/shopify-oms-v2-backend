const PressTable = require("../models/pressTable.modal");
const ShipReturn = require("../models/shipReturn.modal");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");


// add record 
const shipReturn = async (req, res, next) => {
    try {
        const { order_id, style_number, Size } = req.body;

        // Validate input
        if (
            (!order_id && (!style_number || !Size)) ||
            (style_number && !Size) ||
            (!style_number && Size)
        ) {
            throw new ApiError(409, "order_id or both style_number and Size are required");
        }

        // Build dynamic query
        const query = order_id
            ? { order_id }
            : { styleNumber: style_number, size: Size };

        const record = await PressTable.findOne(query);
        if (!record) {
            throw new ApiError(404, `${order_id || style_number + "-" + Size}  not found.`);
        }

        //  fetching press table record and deleting from press table and added to ship record 
        const { styleNumber, size, color, employee_name, channel } = record;

        // check if record exists 
        const recordExists = await ShipReturn.findOne(query);

        if (recordExists) {
            throw new ApiError(409, `${order_id} already exists`)
        }
        const addedToShipRecord = await ShipReturn.create({
            styleNumber, size, color, location: "Shipped", employee_name, order_id: record?.order_id, channel
        })

        const prssTableRecordDelete = await PressTable.findByIdAndDelete(record._id)

        if (!prssTableRecordDelete) {
            throw new ApiError(500, "Failed to delete record from press table");
        }
        res.status(200).json(new ApiResponse(200, "Record added to ship record and deleted from press table record", addedToShipRecord));
    } catch (error) {
        next(error)
    }

}

// delete record
const deleteShippedRecord = async (req, res, next) => {
    try {
        const { _id } = req.body;
        if (!_id) {
            throw new ApiError(404, "_id required");
        }

        const deletedRecord = await ShipReturn.findByIdAndDelete(_id);
        if (!deletedRecord) {
            throw new ApiError(500, "Record not found for delete")
        }

        res.status(200).json(new ApiResponse(200, "Shipped Record Deleted Success."))
    } catch (error) {
        next(error)
    }
}



// get record

const getShippedRecord = async (req, res, next) => {
    try {
        const records = await ShipReturn.find();
        if (records.length === 0) {
            return res.status(200).json(new ApiResponse(200, "", { message: "No Record Found" }));
        }
        res.status(200).json(new ApiResponse(200, `${records.length === 1 ? "" : `${records.length} Records fetched Successfully.`}`, records));
    } catch (error) {
        next(error)
    }
}

module.exports = { shipReturn, deleteShippedRecord, getShippedRecord }