const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
    trackingId: {
        type: String,
        required: true,
        unique: true
    },
    originalUrl: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true,
        ref: 'Subscription'
    },
    adminId: {
        type: String,
        required: true,
        ref: 'Admin'
    },
    notificationTitle: {
        type: String,
        required: true
    },
    clicked: {
        type: Boolean,
        default: false
    },
    clickedAt: Date,
    userAgent: String,
    ip: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Click', clickSchema);