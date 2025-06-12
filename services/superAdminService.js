const SuperAdmin = require('../models/SuperAdmin');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class SuperAdminService {
    // Buscar super admin por ID
    async findById(superAdminId) {
        return await SuperAdmin.findOne({ superAdminId });
    }

    // Buscar super admin por username
    async findByUsername(username) {
        return await SuperAdmin.findOne({ username: username.toLowerCase() });
    }

    // Criar novo super admin
    async create(superAdminData) {
        const hashedPassword = await bcrypt.hash(superAdminData.password, 12); // Salt rounds mais alto para super admin
        
        const superAdmin = new SuperAdmin({
            superAdminId: superAdminData.superAdminId,
            username: superAdminData.username.toLowerCase(),
            password: hashedPassword,
            name: superAdminData.name,
            email: superAdminData.email,
            active: superAdminData.active !== undefined ? superAdminData.active : true
        });

        return await superAdmin.save();
    }

    // Atualizar super admin
    async update(superAdminId, updateData) {
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 12);
        }
        
        if (updateData.username) {
            updateData.username = updateData.username.toLowerCase();
        }
        
        return await SuperAdmin.findOneAndUpdate(
            { superAdminId },
            updateData,
            { new: true }
        );
    }

    // Listar todos os super admins
    async findAll() {
        return await SuperAdmin.find({}).select('-password');
    }

    // Verificar senha
    async verifyPassword(superAdmin, password) {
        return await bcrypt.compare(password, superAdmin.password);
    }

    // Autenticar super admin
    async authenticate(username, password) {
        const superAdmin = await this.findByUsername(username);
        
        if (!superAdmin) {
            return { success: false, error: 'Credenciais inválidas' };
        }

        if (!superAdmin.active) {
            return { success: false, error: 'Conta desativada' };
        }

        if (superAdmin.isLocked()) {
            return { success: false, error: 'Conta temporariamente bloqueada devido a muitas tentativas de login' };
        }

        const isValidPassword = await this.verifyPassword(superAdmin, password);
        
        if (!isValidPassword) {
            await superAdmin.incLoginAttempts();
            return { success: false, error: 'Credenciais inválidas' };
        }

        // Reset login attempts on successful login
        await superAdmin.resetLoginAttempts();
        
        return { 
            success: true, 
            superAdmin: {
                superAdminId: superAdmin.superAdminId,
                username: superAdmin.username,
                name: superAdmin.name,
                email: superAdmin.email
            }
        };
    }

    // Criar super admin padrão se não existir
    async createDefaultSuperAdmin() {
        const existingSuperAdmin = await SuperAdmin.findOne({ username: 'superadmin' });
        
        if (!existingSuperAdmin) {
            const defaultSuperAdmin = {
                superAdminId: 'superadmin_1',
                username: 'superadmin',
                password: 'SuperAdmin@2024!', // Senha mais complexa
                name: 'Super Administrador',
                email: 'superadmin@pulso.local',
                active: true
            };
            
            const created = await this.create(defaultSuperAdmin);
            console.log('🔐 Super Admin padrão criado:');
            console.log('   Username: superadmin');
            console.log('   Password: SuperAdmin@2024!');
            console.log('   ⚠️  ALTERE A SENHA PADRÃO IMEDIATAMENTE!');
            
            return created;
        }
        
        return existingSuperAdmin;
    }

    // Alterar senha
    async changePassword(superAdminId, currentPassword, newPassword) {
        const superAdmin = await SuperAdmin.findOne({ superAdminId });
        
        if (!superAdmin) {
            return { success: false, error: 'Super Admin não encontrado' };
        }

        const isValidCurrentPassword = await this.verifyPassword(superAdmin, currentPassword);
        
        if (!isValidCurrentPassword) {
            return { success: false, error: 'Senha atual incorreta' };
        }

        // Validar nova senha
        if (newPassword.length < 8) {
            return { success: false, error: 'Nova senha deve ter pelo menos 8 caracteres' };
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        
        await SuperAdmin.findOneAndUpdate(
            { superAdminId },
            { 
                password: hashedNewPassword,
                updatedAt: new Date()
            }
        );

        return { success: true, message: 'Senha alterada com sucesso' };
    }

    // Ativar/desativar super admin
    async updateStatus(superAdminId, active) {
        return await SuperAdmin.findOneAndUpdate(
            { superAdminId },
            { 
                active: active,
                updatedAt: new Date()
            },
            { new: true }
        );
    }

    // Gerar ID único para super admin
    generateSuperAdminId() {
        return 'superadmin_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    }

    // Estatísticas de segurança
    async getSecurityStats() {
        const total = await SuperAdmin.countDocuments();
        const active = await SuperAdmin.countDocuments({ active: true });
        const locked = await SuperAdmin.countDocuments({ 
            lockUntil: { $gt: new Date() } 
        });
        
        return {
            total,
            active,
            inactive: total - active,
            locked
        };
    }
}

module.exports = new SuperAdminService();