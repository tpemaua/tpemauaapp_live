var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var schema = new Schema({
    code: {type: String, required: true},
    hora: {type: String, required: true},
});


module.exports = mongoose.model('Hora', schema);