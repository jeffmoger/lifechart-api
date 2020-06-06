const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Users = require('../models/userModel');

const passportJWT = require("passport-jwt");
const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;




passport.use(new LocalStrategy({
  usernameField: 'user[email]',
  passwordField: 'user[password]',
}, (email, password, done) => {
  Users.findOne({ email })
    .then((user) => {
      if(!user || !user.validatePassword(password)) {
        return done(null, false, { errors: { 'email or password': 'is invalid' } });
      }
      return done(null, user);
    }).catch(done);
}));



passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey   : process.env.JWT_SECRET
},
function (jwtPayload, done) {

  //find the user in db if needed. This functionality may be omitted if you store everything you'll need in JWT payload.
  return Users.findOneById(jwtPayload.id)
      .then(user => {
          return done(null, user);
      })
      .catch(err => {
          return done(err);
      });
  }
));



/*
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Users.findById(id, function(err, user) {
    done(err, user.id);
  });
});

*/