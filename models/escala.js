var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');
var Users = require('./user');
var User = require('./user');
mongoose.Promise = global.Promise;

var schema = new Schema({
  dia: { type: String, required: true, unique: true },
  diasemana: { type: String, required: true },
  datainicio: { type: String, required: true },
  datafim: { type: String, required: true },
  data: { type: Date, required: true },
  hora: { type: [], required: true },
  pontos: { type: [], required: true }
});


schema.plugin(mongooseUniqueValidator);




module.exports = mongoose.model('Escala', schema);