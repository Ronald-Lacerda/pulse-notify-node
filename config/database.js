require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Verificar se a URI do MongoDB está definida
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI não está definida no arquivo .env');
        }

        console.log('Tentando conectar ao MongoDB...');
        console.log('URI:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Log seguro da URI
        
        // Configuração simples e compatível
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000, // 10 segundos para timeout
        });

        console.log(`✅ MongoDB conectado com sucesso: ${conn.connection.host}`);
        console.log(`📊 Banco de dados: ${conn.connection.name}`);
        
        // Configurar eventos de conexão
        mongoose.connection.on('error', (err) => {
            console.error('❌ Erro na conexão MongoDB:', err.message);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB desconectado');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconectado');
        });
        
        return conn;
        
    } catch (error) {
        console.error('❌ Erro ao conectar com MongoDB:');
        console.error('Mensagem:', error.message);
        
        if (error.name === 'MongoServerSelectionError') {
            console.error('💡 Possíveis soluções:');
            console.error('   1. Verifique se o MongoDB está rodando');
            console.error('   2. Verifique a string de conexão no .env');
            console.error('   3. Verifique as credenciais de acesso');
            console.error('   4. Verifique a conectividade de rede');
        }
        
        process.exit(1);
    }
};

module.exports = connectDB;