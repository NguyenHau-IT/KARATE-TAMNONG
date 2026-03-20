var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var bacDaiRouter = require('./routes/bacDai');
var voSinhRouter = require('./routes/voSinh');
var usersRouter = require('./routes/users');
var buoiHocRouter = require('./routes/buoiHoc');
var diemDanhRouter = require('./routes/diemDanh');
var lopVoRouter = require('./routes/lopVo');
var vangMatRouter = require('./routes/vangMat');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/bac-dai', bacDaiRouter);
app.use('/vo-sinh', voSinhRouter);
app.use('/users', usersRouter);
app.use('/lop-vo', lopVoRouter);
app.use('/buoi-hoc', buoiHocRouter);
app.use('/diem-danh', diemDanhRouter);
app.use('/vang-mat', vangMatRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
