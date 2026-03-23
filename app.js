var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var { attachCurrentUser, requireRoles } = require('./middlewares/auth');

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var bacDaiRouter = require('./routes/bacDai');
var voSinhRouter = require('./routes/voSinh');
var usersRouter = require('./routes/users');
var buoiHocRouter = require('./routes/buoiHoc');
var diemDanhRouter = require('./routes/diemDanh');
var lopVoRouter = require('./routes/lopVo');
var vangMatRouter = require('./routes/vangMat');
var checkInPinRouter = require('./routes/checkInPin');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(attachCurrentUser);

app.use('/auth', authRouter);
app.use('/', indexRouter);
app.use('/bac-dai', requireRoles(['admin', 'huan_luyen_vien']), bacDaiRouter);
app.use('/vo-sinh', requireRoles(['admin', 'huan_luyen_vien']), voSinhRouter);
app.use('/users', requireRoles(['admin']), usersRouter);
app.use('/lop-vo', requireRoles(['admin', 'huan_luyen_vien']), lopVoRouter);
app.use('/buoi-hoc', requireRoles(['admin', 'huan_luyen_vien']), buoiHocRouter);
app.use('/diem-danh', requireRoles(['admin', 'huan_luyen_vien']), diemDanhRouter);
app.use('/vang-mat', requireRoles(['admin', 'huan_luyen_vien']), vangMatRouter);
app.use('/check-in-pin', requireRoles(['admin', 'huan_luyen_vien', 'vo_sinh']), checkInPinRouter);

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
