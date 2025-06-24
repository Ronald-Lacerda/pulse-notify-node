const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class AdminService {
    // Gera um channelId seguro e único
    generateChannelId() {
        // Gera um ID de 32 caracteres usando crypto para máxima segurança
        return crypto.randomBytes(16).toString('hex');
    }

    // Buscar admin por ID
    async findById(adminId) {
        return await Admin.findOne({ adminId });
    }

    // Buscar admin por channelId
    async findByChannelId(channelId) {
        return await Admin.findOne({ channelId });
    }

    // Buscar admin por username
    async findByUsername(username) {
        return await Admin.findOne({ username });
    }

    // Criar novo admin
    async create(adminData) {
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        
        // Gera channelId se não foi fornecido
        const channelId = adminData.channelId || this.generateChannelId();
        
        const admin = new Admin({
            adminId: adminData.adminId,
            channelId: channelId,
            username: adminData.username,
            password: hashedPassword,
            name: adminData.name,
            active: adminData.active !== undefined ? adminData.active : true
        });

        return await admin.save();
    }

    // Atualizar admin
    async update(adminId, updateData) {
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }
        
        return await Admin.findOneAndUpdate(
            { adminId },
            updateData,
            { new: true }
        );
    }

    // Listar todos os admins
    async findAll() {
        return await Admin.find({}).select('-password');
    }

    // Atualizar status do admin
    async updateStatus(adminId, active) {
        return await Admin.findOneAndUpdate(
            { adminId },
            { 
                active: active,
                updatedAt: new Date()
            },
            { new: true }
        );
    }

    // Verificar senha
    async verifyPassword(admin, password) {
        return await bcrypt.compare(password, admin.password);
    }

    // Criar admin padrão se não existir
    async createDefaultAdmin() {
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        
        if (!existingAdmin) {
            const defaultAdmin = {
                adminId: 'admin1',
                channelId: this.generateChannelId(), // Gera channelId seguro
                username: 'admin',
                password: 'admin123',
                name: 'Administrador Principal',
                active: true
            };
            
            return await this.create(defaultAdmin);
        }
        
        return existingAdmin;
    }

    // Migrar admins existentes para incluir channelId
    async migrateExistingAdmins() {
        try {
            const adminsWithoutChannelId = await Admin.find({ channelId: { $exists: false } });
            
            for (const admin of adminsWithoutChannelId) {
                admin.channelId = this.generateChannelId();
                await admin.save();
                console.log(`ChannelId gerado para admin ${admin.username}: ${admin.channelId}`);
            }
            
            console.log(`Migração concluída: ${adminsWithoutChannelId.length} admins atualizados`);
        } catch (error) {
            console.error('Erro na migração de admins:', error);
        }
    }
}

module.exports = new AdminService();