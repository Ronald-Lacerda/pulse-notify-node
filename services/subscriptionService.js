const Subscription = require('../models/Subscription');

class SubscriptionService {
    // Buscar subscrição por userId
    async findByUserId(userId) {
        return await Subscription.findOne({ userId });
    }

    // Criar ou atualizar subscrição
    async createOrUpdate(subscriptionData) {
        const existingSubscription = await this.findByUserId(subscriptionData.userId);
        
        if (existingSubscription) {
            // Atualizar subscrição existente
            Object.assign(existingSubscription, {
                ...subscriptionData,
                lastSeen: new Date()
            });
            return await existingSubscription.save();
        } else {
            // Criar nova subscrição
            const subscription = new Subscription({
                ...subscriptionData,
                registeredAt: new Date(),
                lastSeen: new Date(),
                active: true
            });
            return await subscription.save();
        }
    }

    // Buscar subscrições ativas por adminId
    async findActiveByAdminId(adminId) {
        return await Subscription.find({ 
            adminId, 
            active: true 
        });
    }

    // Buscar todas as subscrições ativas
    async findAllActive() {
        return await Subscription.find({ active: true });
    }

    // Atualizar última notificação enviada
    async updateLastNotificationSent(userId, date = new Date()) {
        return await Subscription.findOneAndUpdate(
            { userId },
            { 
                lastNotificationSent: date,
                lastSeen: new Date()
            },
            { new: true }
        );
    }

    // Desativar subscrição
    async deactivate(userId) {
        return await Subscription.findOneAndUpdate(
            { userId },
            { active: false },
            { new: true }
        );
    }

    // Contar subscrições por admin
    async countByAdminId(adminId) {
        return await Subscription.countDocuments({ 
            adminId, 
            active: true 
        });
    }

    // Listar subscrições com paginação
    async findWithPagination(page = 1, limit = 10, adminId = null) {
        const skip = (page - 1) * limit;
        const filter = adminId ? { adminId, active: true } : { active: true };
        
        const subscriptions = await Subscription.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const total = await Subscription.countDocuments(filter);
        
        return {
            subscriptions,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }
}

module.exports = new SubscriptionService();