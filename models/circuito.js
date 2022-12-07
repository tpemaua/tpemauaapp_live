var mongoose = require('mongoose');
const Schema = require('mongoose').Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var schema = new Schema({
    nome: {type: String, required: true, unique: true}
});

schema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model('Circuito', schema);