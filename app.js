require('dotenv').config();
const createError = require('http-errors'),
      express = require('express'),
      path = require('path'),
      morgan = require('morgan'),
      mongoose = require('mongoose'),
      cors = require('cors');

const indexRouter = require('./routes/index');

const app = express();

app.use(morgan('dev'));
mongoose.set('toJSON', { getters: true, virtuals: true, versionKey: false });
mongoose.set('toObject', { getters: true, virtuals: true, versionKey: false });

//Set up mongoose connection
const mongoDB = process.env.MONGODB;
mongoose.connect(mongoDB, { 
  useNewUrlParser: true,
  useUnifiedTopology: true, 
  useCreateIndex: true,
  useFindAndModify: false
 });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "https://localhost"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


//Use Routes
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.json(err);
});

module.exports = app;
