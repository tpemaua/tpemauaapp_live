var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var schema = new Schema({
    datainicio: { type: String, required: true },
    datafim: { type: String, required: true },
    idescala: {type: Schema.Types.ObjectId, ref: 'Escala', required: true},
    iduser: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    horacode: {type: String, required: true},
    indexpub: {type: Number, required: true},
    sim:{type: Boolean},
    nao:{type: Boolean},
    sub: { type: {} },
    lock: {type: Boolean},
    msg: {},
    data: {type: Date},

});


schema.index({ idescala: 1, iduser: 1, horacode: 1 }, { unique: true });
schema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model('Led', schema);