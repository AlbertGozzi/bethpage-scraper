const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const teeTimeSchema = new Schema({
    _id: String,
    course: String,
    date: String,
    time: String,
    holes: Number,
    players: Number,
})

const TeeTime = mongoose.model('TeeTime', teeTimeSchema);

module.exports = TeeTime;