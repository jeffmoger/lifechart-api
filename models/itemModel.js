const mongoose = require('mongoose');
const moment = require('moment')
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

ItemSchema
.virtual('startTime')
.get(function () {
    return (this.startTimeMillis ? moment(this.startTimeMillis).format('LL') : '');
});

module.exports = mongoose.model('Item', ItemSchema, 'item_data');