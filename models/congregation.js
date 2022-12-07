var mongoose = require('mongoose');
const Schema = require('mongoose').Schema;
mongoose.Promise = global.Promise;

var mongooseUniqueValidator = require('mongoose-unique-validator');

var schema = new Schema({
    nome: {type: String, required: true},
    circuit: {type: String, required: true}
});

schema.index({ nome: 1, circuit: 1 }, { unique: true });

schema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model('Congregation', schema);