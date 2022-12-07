const app = require("./app");
const debug = require("debug")("tpeglobal");
const http = require("http");


const normalizePort = val => {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
};

const onError = error => {
  if (error.syscall !== "listen") {
    throw error;
  }
  const bind = typeof addr == "string" ? "pipe " + addr : "port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListening = () => {
  const addr = server.address();
  const bind = typeof addr == "string" ? "pipe " + addr : "port " + port;
  console.log("Listening on " + bind);
  debug("Listening on " + bind);
};



const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const server = http.createServer(app);

//init io socket
var io = require('socket.io')(server);
var consumer = require('./routes/escalas.js');
consumer.start(io);
var consumer2 = require('./routes/telegram.js');
consumer2.pass(io);
var consumer3 = require('./routes/email.js');
consumer3.pass(io);
//end io socket


server.on("error", onError);
server.on("listening", onListening);
server.listen(port);
