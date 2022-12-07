var mongoose = require('mongoose');
const Schema = require('mongoose').Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var schema = new Schema({
    message_id: {type: Number, required: true},
    datareal: {type: Date, required: true}
});

schema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model('Subhist', schema);