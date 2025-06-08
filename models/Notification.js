const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        required: true,
        unique: true
    },
    adminId: {
        type: String,
        required: true,
        ref: 'Admin'
    },
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    icon: String,
    url: String,
    tag: {
        type: String,
        default: 'pulso-notification'
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    sent: {
        type: Number,
        default: 0
    },
    failed: {
        type: Number,
        default: 0
    },
    totalUsers: {
        type: Number,
        default: 0
    },
    trackingIds: [{
        type: String
    }],
    isResend: {
        type: Boolean,
        default: false
    },
    originalNotificationId: {
        type: String,
        ref: 'Notification'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);