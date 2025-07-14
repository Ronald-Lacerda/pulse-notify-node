const mongoose = require('mongoose');

// Schema para logs do sistema
const logSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['info', 'warning', 'error', 'security'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true // ex: 'auth', 'notification', 'admin', 'subscription'
    },
    userId: {
        type: String,
        default: null
    },
    adminId: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ip: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    }
});

// Índices para melhor performance
logSchema.index({ timestamp: -1 });
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ category: 1, timestamp: -1 });
logSchema.index({ adminId: 1, timestamp: -1 });
logSchema.index({ userId: 1, timestamp: -1 });
// Índices compostos para consultas mais complexas
logSchema.index({ category: 1, level: 1, timestamp: -1 });
logSchema.index({ adminId: 1, category: 1, timestamp: -1 });
// Índice TTL para limpeza automática (opcional - 90 dias)
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 dias

const Log = mongoose.model('Log', logSchema);

class LogService {
    /**
     * Cria um novo log no banco de dados
     */
    async create(logData) {
        try {
            const log = new Log(logData);
            await log.save();
            return log;
        } catch (error) {
            // Em caso de erro no log, apenas imprime no console para não quebrar a aplicação
            console.error('Erro ao salvar log no banco:', error);
            return null;
        }
    }

    /**
     * Log de informação
     */
    async info(message, category, metadata = {}) {
        return this.create({
            level: 'info',
            message,
            category,
            metadata
        });
    }

    /**
     * Log de aviso
     */
    async warning(message, category, metadata = {}) {
        return this.create({
            level: 'warning',
            message,
            category,
            metadata
        });
    }

    /**
     * Log de erro
     */
    async error(message, category, metadata = {}) {
        return this.create({
            level: 'error',
            message,
            category,
            metadata
        });
    }

    /**
     * Log de segurança
     */
    async security(message, category, metadata = {}) {
        return this.create({
            level: 'security',
            message,
            category,
            metadata
        });
    }

    /**
     * Log com contexto de usuário
     */
    async logWithUser(level, message, category, userId, metadata = {}) {
        return this.create({
            level,
            message,
            category,
            userId,
            metadata
        });
    }

    /**
     * Log com contexto de admin
     */
    async logWithAdmin(level, message, category, adminId, metadata = {}) {
        return this.create({
            level,
            message,
            category,
            adminId,
            metadata
        });
    }

    /**
     * Log com contexto de requisição HTTP
     */
    async logWithRequest(level, message, category, req, metadata = {}) {
        return this.create({
            level,
            message,
            category,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            metadata: {
                ...metadata,
                url: req.originalUrl,
                method: req.method
            }
        });
    }

    /**
     * Busca logs por categoria
     */
    async findByCategory(category, limit = 100) {
        try {
            return await Log.find({ category })
                .sort({ timestamp: -1 })
                .limit(Math.min(limit, 500)) // Limita máximo de 500 registros
                .lean()
                .maxTimeMS(10000); // Timeout de 10 segundos
        } catch (error) {
            console.error('Erro ao buscar logs por categoria:', error);
            return [];
        }
    }

    /**
     * Busca logs por admin
     */
    async findByAdminId(adminId, limit = 100) {
        try {
            return await Log.find({ adminId })
                .sort({ timestamp: -1 })
                .limit(Math.min(limit, 500)) // Limita máximo de 500 registros
                .lean()
                .maxTimeMS(10000); // Timeout de 10 segundos
        } catch (error) {
            console.error('Erro ao buscar logs por admin:', error);
            return [];
        }
    }

    /**
     * Busca logs por nível
     */
    async findByLevel(level, limit = 100) {
        try {
            return await Log.find({ level })
                .sort({ timestamp: -1 })
                .limit(Math.min(limit, 500)) // Limita máximo de 500 registros
                .lean()
                .maxTimeMS(10000); // Timeout de 10 segundos
        } catch (error) {
            console.error('Erro ao buscar logs por nível:', error);
            return [];
        }
    }

    /**
     * Busca logs recentes
     */
    async findRecent(limit = 50) {
        try {
            return await Log.find({})
                .sort({ timestamp: -1 })
                .limit(Math.min(limit, 500)) // Limita máximo de 500 registros
                .lean()
                .maxTimeMS(10000); // Timeout de 10 segundos
        } catch (error) {
            console.error('Erro ao buscar logs recentes:', error);
            return [];
        }
    }

    /**
     * Busca logs com paginação e filtros otimizados
     */
    async findWithPagination(filters = {}, page = 1, limit = 50) {
        try {
            const skip = (page - 1) * limit;
            const maxLimit = Math.min(limit, 100); // Máximo 100 por página
            
            let query = {};
            
            // Aplicar filtros
            if (filters.category) query.category = filters.category;
            if (filters.level) query.level = filters.level;
            if (filters.adminId) query.adminId = filters.adminId;
            if (filters.userId) query.userId = filters.userId;
            
            // Filtro de data (últimos N dias)
            if (filters.days) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - parseInt(filters.days));
                query.timestamp = { $gte: cutoffDate };
            }

            // Buscar logs com paginação
            const logs = await Log.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(maxLimit)
                .lean()
                .maxTimeMS(15000); // Timeout de 15 segundos

            // Contar total (com timeout menor para não travar)
            const total = await Log.countDocuments(query).maxTimeMS(5000);

            return {
                logs,
                pagination: {
                    page,
                    limit: maxLimit,
                    total,
                    pages: Math.ceil(total / maxLimit)
                }
            };
        } catch (error) {
            console.error('Erro ao buscar logs com paginação:', error);
            return {
                logs: [],
                pagination: { page: 1, limit: 50, total: 0, pages: 0 }
            };
        }
    }

    /**
     * Remove logs antigos (limpeza automática)
     */
    async cleanOldLogs(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const result = await Log.deleteMany({
                timestamp: { $lt: cutoffDate }
            });
            
            return result.deletedCount;
        } catch (error) {
            console.error('Erro ao limpar logs antigos:', error);
            return 0;
        }
    }
}

module.exports = new LogService();