var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var schema = new Schema({
    begin: {type: Date, required: true},
    end: {type: Date, required: true},
    status: {type: Boolean},
});


module.exports = mongoose.model('Validity', schema);