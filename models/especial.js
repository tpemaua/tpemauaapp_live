var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var schema = new Schema({
    begin: {type: Date, required: true},
    end: {type: Date, required: true},
    circuito: {type: String, required: true},
    nome: {type: String, required: true}
});


module.exports = mongoose.model('Especial', schema);