const mongoose = require('mongoose');
const { Schema } = mongoose;

const FitSchema = new Schema(
    {
        userID: {type: Schema.Types.ObjectId, ref: 'users', required: true},
        dataTypeName: {type: String},
        originDataSourceId: {type: String},
        startTimeMillis: {type: Number},
        endTimeMillis: {type: Number},
        eventDate: {type: Date},
        startTimeNanos: {type: Number},
        endTimeNanos: {type: Number},
        value: {type: Array},
        createdAt: Number,
        updatedAt: Number
    },
{
    // Make Mongoose use Unix time (seconds since Jan 1, 1970)
    timestamps: { currentTime: () => Math.floor(Date.now() / 1000)}
    }
);

module.exports = mongoose.model('Fit', FitSchema, 'fit_data');