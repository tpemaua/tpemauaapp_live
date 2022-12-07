var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var schema = new Schema({
    code: {type: String, required: true, unique: true},
    userId: {type: String, required: true},
});

schema.plugin(mongooseUniqueValidator);
module.exports = mongoose.model('Telegram', schema);