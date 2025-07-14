require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Configurações de performance
            maxPoolSize: 10, // Máximo de conexões simultâneas
            serverSelectionTimeoutMS: 5000, // Timeout para seleção do servidor
            socketTimeoutMS: 45000, // Timeout para operações de socket
            bufferMaxEntries: 0, // Desabilita buffering
            bufferCommands: false, // Desabilita buffering de comandos
            
            // Configurações de retry
            retryWrites: true,
            retryReads: true,
            
            // Configurações de compressão
            compressors: ['zlib'],
            
            // Configurações de heartbeat
            heartbeatFrequencyMS: 10000,
            
            // Configurações de read preference
            readPreference: 'primary'
        });

        console.log(`MongoDB conectado: ${conn.connection.host}`);
        
        // Configurar eventos de conexão
        mongoose.connection.on('error', (err) => {
            console.error('Erro na conexão MongoDB:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB desconectado');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconectado');
        });
        
    } catch (error) {
        console.error('Erro ao conectar com MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDB;