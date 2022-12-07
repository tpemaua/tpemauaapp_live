var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var User = require('./user');
var mongooseUniqueValidator = require('mongoose-unique-validator');

var schema = new Schema({
    data: {type: String, required: true},
    datashow: {type: String, required: true},
    hora: {type: String, required: true},
    diasemana: {type: String, required: true},
    code: {type: String, required: true},
    sex: {type: String, required: true},
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    datareal: {type: Date},
});


schema.index({ data: 1, diasemana: 1, user: 1}, { unique: true });

schema.plugin(mongooseUniqueValidator);

schema.post('remove', function (agenda) {
    User.findById(mongoose.Types.ObjectId(agenda.user), function (err, user) {
        user.agenda.pull(mongoose.Types.ObjectId(agenda._id));
        user.save();
    });
}); 

module.exports = mongoose.model('Agenda', schema);