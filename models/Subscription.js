const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    subscription: {
        endpoint: {
            type: String,
            required: true
        },
        expirationTime: {
            type: Date,
            default: null
        },
        keys: {
            auth: {
                type: String,
                required: true
            },
            p256dh: {
                type: String,
                required: true
            }
        }
    },
    adminId: {
        type: String,
        ref: 'Admin'
    },
    userAgent: String,
    url: String,
    language: String,
    platform: String,
    timezone: String,
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    lastNotificationSent: Date,
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Subscription', subscriptionSchema);