const Click = require('../models/Click');

class ClickService {
    // Criar novo registro de click
    async create(clickData) {
        const click = new Click(clickData);
        return await click.save();
    }

    // Buscar click por tracking ID
    async findByTrackingId(trackingId) {
        return await Click.findOne({ trackingId });
    }

    // Registrar click
    async registerClick(trackingId, clickData) {
        return await Click.findOneAndUpdate(
            { trackingId },
            {
                clicked: true,
                clickedAt: new Date(),
                userAgent: clickData.userAgent,
                ip: clickData.ip
            },
            { new: true }
        );
    }

    // Buscar clicks por adminId
    async findByAdminId(adminId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        
        const clicks = await Click.find({ adminId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const total = await Click.countDocuments({ adminId });
        
        return {
            clicks,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    // Buscar clicks por userId
    async findByUserId(userId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        
        const clicks = await Click.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        const total = await Click.countDocuments({ userId });
        
        return {
            clicks,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    // Estatísticas de clicks por admin
    async getStatsByAdminId(adminId) {
        const totalClicks = await Click.countDocuments({ adminId });
        const clickedCount = await Click.countDocuments({ 
            adminId, 
            clicked: true 
        });
        const notClickedCount = totalClicks - clickedCount;
        const clickRate = totalClicks > 0 ? (clickedCount / totalClicks) * 100 : 0;

        return {
            totalClicks,
            clickedCount,
            notClickedCount,
            clickRate: Math.round(clickRate * 100) / 100
        };
    }

    // Estatísticas gerais
    async getGeneralStats() {
        const totalClicks = await Click.countDocuments();
        const clickedCount = await Click.countDocuments({ clicked: true });
        const notClickedCount = totalClicks - clickedCount;
        const clickRate = totalClicks > 0 ? (clickedCount / totalClicks) * 100 : 0;

        return {
            totalClicks,
            clickedCount,
            notClickedCount,
            clickRate: Math.round(clickRate * 100) / 100
        };
    }

    // Clicks recentes
    async findRecent(limit = 10, adminId = null) {
        const filter = adminId ? { adminId } : {};
        
        return await Click.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    // Clicks por período
    async findByDateRange(startDate, endDate, adminId = null) {
        const filter = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };
        
        if (adminId) {
            filter.adminId = adminId;
        }
        
        return await Click.find(filter).sort({ createdAt: -1 });
    }

    // Contar clicks por admin
    async countByAdminId(adminId) {
        return await Click.countDocuments({ adminId });
    }
}

module.exports = new ClickService();