var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var schema = new Schema({
    feriado: {type: String, required: true},
    data: {type: String, required: true},
    datashow: {type: String, required: true},
});


module.exports = mongoose.model('Feriado', schema);