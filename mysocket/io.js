var newsocket = null;

module.exports = {

  start: function(io) {
      io.on('connection', function(socket) {
          socket.on('message', function(message) {
              logger.log('info',message.value);
              socket.emit('ditConsumer',message.value);
              console.log('from console',message.value);
          });
      });
      newsocket = io;
    },

  myio: function(){
    return newsocket;
  }
  
}

