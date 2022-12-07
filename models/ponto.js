var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var schema = new Schema({
    name: {type: String, required: true},
    npubs: {type: Number, required: true},
    date: {type: String },
    config: [[{type: String}]],
    address: {type: String },
    obs: {type: String },
    fileimg: {type: String},
    link: {type: String }
});



module.exports = mongoose.model('Ponto', schema);
