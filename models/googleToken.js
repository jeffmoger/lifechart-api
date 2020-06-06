const mongoose = require('mongoose');
const { Schema } = mongoose;

const TokenSchema = new Schema(
  {
  access_token: {type: String},
  refresh_token: {type: String},
  userID: {type: Schema.Types.ObjectId, ref: 'users', required: true},
  scope: {type: String},
  token_type: {type: String},
  expiry_date: {type: Number},
  createdAt: Number,
  updatedAt: Number
  },
  {
  // Make Mongoose use Unix time (seconds since Jan 1, 1970)
  timestamps: { currentTime: () => Math.floor(Date.now() / 1000)}
  }
);


module.exports = mongoose.model('Tokens', TokenSchema, 'tokens');