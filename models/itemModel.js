const mongoose = require('mongoose');
const { Schema } = mongoose;

const ItemSchema = new Schema(
    {
        userID: {type: Schema.Types.ObjectId, ref: 'users', required: true},
        dataTypeName: {type: String},
        startTimeMillis: {type: Number},
        endTimeMillis: {type: Number},
        value: {type: Array},
        note: {type: String},
        createdAt: Number,
        updatedAt: Number
    },
{
    // Make Mongoose use Unix time (seconds since Jan 1, 1970)
    timestamps: { currentTime: () => Math.floor(Date.now() / 1000)}
    }
);

module.exports = mongoose.model('Item', ItemSchema, 'item_data');