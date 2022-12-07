var mongoose = require('mongoose');
const Schema = require('mongoose').Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var schema = new Schema({
    titulo: {type: String, required: true, unique: true},
    mensagem: {type: String, required: true},
    avisado: {type: Boolean},
    avisadoemail: {type: Boolean}
});

schema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model('Anuncio', schema);