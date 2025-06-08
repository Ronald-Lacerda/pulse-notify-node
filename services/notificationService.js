const Notification = require('../models/Notification');

class NotificationService {
    // Criar nova notificação
    async create(notificationData) {
        const notification = new Notification(notificationData);
        return await notification.save();
    }

    // Buscar notificação por ID
    async findById(notificationId) {
        return await Notification.findOne({ notificationId });
    }

    // Buscar notificações por adminId
    async findByAdminId(adminId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        
        const notifications = await Notification.find({ adminId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const total = await Notification.countDocuments({ adminId });
        
        return {
            notifications,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    // Atualizar estatísticas da notificação
    async updateStats(notificationId, stats) {
        return await Notification.findOneAndUpdate(
            { notificationId },
            {
                sent: stats.sent,
                failed: stats.failed,
                totalUsers: stats.totalUsers,
                trackingIds: stats.trackingIds
            },
            { new: true }
        );
    }

    // Adicionar tracking ID
    async addTrackingId(notificationId, trackingId) {
        return await Notification.findOneAndUpdate(
            { notificationId },
            { $push: { trackingIds: trackingId } },
            { new: true }
        );
    }

    // Buscar últimas notificações
    async findRecent(limit = 5, adminId = null) {
        const filter = adminId ? { adminId } : {};
        
        return await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    // Contar notificações por admin
    async countByAdminId(adminId) {
        return await Notification.countDocuments({ adminId });
    }

    // Buscar notificações com filtros
    async findWithFilters(filters = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        
        const notifications = await Notification.find(filters)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const total = await Notification.countDocuments(filters);
        
        return {
            notifications,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    // Estatísticas gerais
    async getStats(adminId = null) {
        const filter = adminId ? { adminId } : {};
        
        const totalNotifications = await Notification.countDocuments(filter);
        const totalSent = await Notification.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$sent' } } }
        ]);
        const totalFailed = await Notification.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$failed' } } }
        ]);

        return {
            totalNotifications,
            totalSent: totalSent[0]?.total || 0,
            totalFailed: totalFailed[0]?.total || 0
        };
    }
}

module.exports = new NotificationService();