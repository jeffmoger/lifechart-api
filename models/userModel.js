const mongoose = require('mongoose');
const crypto = require('crypto');
var moment = require('moment')
const jwt = require('jsonwebtoken');

const { Schema } = mongoose;

const days_token_valid = 14;

function generateTokenExpiryDate(days) {
  const today = new Date();
  const expirationDate = new Date(today);
  expirationDate.setDate(today.getDate() + days);
  return parseInt(expirationDate.getTime() / 1000, 10)
}

const UsersSchema = new Schema(
  {
  first_name: {type: String},
  family_name: {type: String},
  date_of_birth: {type: Date},
  email: {type: String},
  weight: {type: Number},
  daily_calorie_goal: {type: Number},
  weight_goal: {type: Number},
  googleId: {type: Number},
  googleFit: {type: Boolean, default: false},
  dataSourceIds: {type: Array},
  picture: {type: String},
  email_verified: {type: Boolean},
  hash: {type: String},
  salt: {type: String},
  createdAt: Number,
  updatedAt: Number
  },
  {
  // Make Mongoose use Unix time (seconds since Jan 1, 1970)
  timestamps: { currentTime: () => Math.floor(Date.now() / 1000)}
  }
);

// Virtual for full name
UsersSchema
.virtual('name')
.get(function () {
  var fullname = '';
  if (this.first_name && this.family_name) {
    fullname = this.family_name + ', ' + this.first_name
  }
  if (!this.first_name || !this.family_name) {
    fullname = '';
  }

  return fullname;
});


UsersSchema
.virtual('date_of_birth_formatted')
.get(function () {
  return (this.date_of_birth ? moment(this.date_of_birth).format('LL') : '');
});

UsersSchema.methods.setPassword = function(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UsersSchema.methods.validatePassword = function(password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

UsersSchema.methods.generateJWT = function() {
  return jwt.sign({
    email: this.email,
    first_name: this.first_name,
    id: this._id,
    exp: generateTokenExpiryDate(days_token_valid),
  }, process.env.JWT_SECRET);
}

UsersSchema.methods.toAuthJSON = function() {
  return {
    id: this._id,
    email: this.email,
    token: this.generateJWT(),
    exp: generateTokenExpiryDate(days_token_valid),
    googleFit: this.googleFit,
    dataSourceIds: this.dataSourceIds
  };
};

module.exports = mongoose.model('Users', UsersSchema, 'users');