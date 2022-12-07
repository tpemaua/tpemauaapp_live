var express = require('express');


var secure = require('ssl-express-www');

var path = require('path');
const cors = require('cors');

var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var appRoutes = require('./routes/app');
var userRoutes = require('./routes/user');
var pontoRoutes = require('./routes/pontos');
var agendaRoutes = require('./routes/agendas');
var escalaRoutes = require('./routes/escalas');
var telegramRoutes = require('./routes/telegram');
var emailRoutes = require('./routes/email');




var app = express();

app.use(secure);


var uri = `mongodb+srv://${process.env.USERDATABASE}:${process.env.PASSDATABASE}@${process.env.ADRESSDATABASE}/${process.env.NAMEDATABASE}`
mongoose.connect(uri).then(result => console.log("conectado com o banco mongodb atlas"), err => console.log("erro na conexão",err));



//
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }));
app.options('*', cors()); // include before other routes
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'angular')));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  next();
});

app.use('/email', emailRoutes);
app.use('/telegram', telegramRoutes);
app.use('/escalas', escalaRoutes);
app.use('/agendas', agendaRoutes);
app.use('/pontos', pontoRoutes);
app.use('/user', userRoutes);
app.use('/', appRoutes);


// catch 404 and forward to error handler
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, "angular", "index.html"));
});


module.exports = app;
