var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var schema = new Schema({
    idescala: {type: String, required: true},
    iduser: {type: String, required: true},
    idhora: {type: String, required: true},
    hash: {type: String, required: true},
});

schema.index({ idescala: 1, iduser: 1, idhora: 1 }, { unique: true });

schema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model('Emailconfirm', schema);