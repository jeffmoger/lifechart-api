const mongoose = require('mongoose');
const { Schema } = mongoose;

const SymptomSchema = new Schema(
  {
  userID: {type: Schema.Types.ObjectId, ref: 'users', required: true},
  symptom: {type: String},
  active: {type: Boolean, default: true},
  show: {type: Boolean, default: true},
  createdAt: Number,
  updatedAt: Number
  },
  {
  // Make Mongoose use Unix time (seconds since Jan 1, 1970)
  timestamps: { currentTime: () => Math.floor(Date.now() / 1000)}
  }
);


module.exports = mongoose.model('Symptom', SymptomSchema, 'symptom_list');