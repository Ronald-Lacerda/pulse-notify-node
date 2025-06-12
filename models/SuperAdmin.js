const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
    superAdminId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    active: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Índices para performance (removendo duplicatas)
superAdminSchema.index({ active: 1 });

// Middleware para atualizar updatedAt
superAdminSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Método para verificar se a conta está bloqueada
superAdminSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Método para incrementar tentativas de login
superAdminSchema.methods.incLoginAttempts = function() {
    // Se já passou do tempo de bloqueio, resetar
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Bloquear após 5 tentativas por 30 minutos
    if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
        updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutos
    }
    
    return this.updateOne(updates);
};

// Método para resetar tentativas de login
superAdminSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
    });
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);