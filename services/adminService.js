const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');

class AdminService {
    // Buscar admin por ID
    async findById(adminId) {
        return await Admin.findOne({ adminId });
    }

    // Buscar admin por username
    async findByUsername(username) {
        return await Admin.findOne({ username });
    }

    // Criar novo admin
    async create(adminData) {
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        
        const admin = new Admin({
            adminId: adminData.adminId,
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
                username: 'admin',
                password: 'admin123',
                name: 'Administrador Principal',
                active: true
            };
            
            return await this.create(defaultAdmin);
        }
        
        return existingAdmin;
    }
}

module.exports = new AdminService();