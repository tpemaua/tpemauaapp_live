var mongoose = require('mongoose');
var User2 = require('./user');
var Circuito = require('./circuito');
var Congregation = require('./congregation');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');



const userSchema = new Schema({
    firstName: {type: String, capitalize: true, required: true},
    lastName: {type: String, capitalize: true, required: true},
    password: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    congregation: {type: Schema.Types.ObjectId, ref: 'Congregation'},
    circuito: {type: Schema.Types.ObjectId, ref: 'Circuito'},
    mobilephone: {type: Number},
    phone: {type: Number},
    datebirth: {type: Date, required: true},
    responsable: {type: Schema.Types.ObjectId, ref: 'User2'},
    conjuge: {type: Schema.Types.ObjectId, ref: 'User2'},
    sex: {type: String, required: true},
    privilege: {type: String, required: true},
    eldermail: {type: String, required: true},
    config: [],
    released: {type: Boolean }, 
    lastday: {type: Date},
    role:{type: String },
    agenda: [{type: Schema.Types.ObjectId, ref: 'Agenda'}],
    escala: [{type: Schema.Types.ObjectId, ref: 'Escala'}],
    telegram: {type: String },
    vezesmes: {type: String },
    contavezes: {type: Number},
    mesescalado: {type: Number},

}, {timestamps: true, versionKey: false},
);




userSchema.plugin(mongooseUniqueValidator);

module.exports = mongoose.model('User', userSchema);