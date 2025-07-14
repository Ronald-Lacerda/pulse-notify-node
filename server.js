require('dotenv').config();
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const path = require('path');
const jwt = require('jsonwebtoken');

// Importar configuração do banco de dados e serviços
const connectDB = require('./config/database');
const adminService = require('./services/adminService');
const superAdminService = require('./services/superAdminService');
const subscriptionService = require('./services/subscriptionService');
const notificationService = require('./services/notificationService');
const clickService = require('./services/clickService');
const logService = require('./services/logService');

const app = express();
const PORT = process.env.PORT;

// Executar migração de admins e criar super admin após conectar ao banco
setTimeout(async () => {
    try {
        await adminService.migrateExistingAdmins();
        await adminService.createDefaultAdmin();
        await superAdminService.createDefaultSuperAdmin();
    } catch (error) {
        console.error('Erro na inicialização dos admins:', error);
    }
}, 2000); // Aguarda 2 segundos para garantir que a conexão com o banco esteja estabelecida

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Middleware de timeout global para APIs
app.use('/api', (req, res, next) => {
    // Timeout de 30 segundos para todas as rotas da API
    req.setTimeout(30000, () => {
        const err = new Error('Request timeout');
        err.status = 408;
        next(err);
    });
    next();
});

// Configuração VAPID (você precisa gerar essas chaves)
// Execute: npx web-push generate-vapid-keys
const VAPID_KEYS = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
};

webpush.setVapidDetails(
    'mailto:' + process.env.VAPID_EMAIL,
    VAPID_KEYS.publicKey,
    VAPID_KEYS.privateKey
);

// Chave secreta para JWT (em produção, use uma variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Gera ID único para rastreamento
 */
function generateTrackingId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Gera ID único para notificações
 */
function generateNotificationId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Middleware de autenticação
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, admin) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.admin = admin;
        next();
    });
}

/**
 * Middleware de autenticação para Super Admin
 */
function authenticateSuperAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, superAdmin) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        
        // Verificar se é realmente um super admin
        if (!superAdmin.isSuperAdmin) {
            return res.status(403).json({ error: 'Acesso negado: Super Admin requerido' });
        }
        
        req.superAdmin = superAdmin;
        next();
    });
}

/**
 * Middleware de autenticação para páginas web (Super Admin)
 * Verifica token no localStorage via cookie ou redireciona para login
 */
function authenticateSuperAdminPage(req, res, next) {
    // Para páginas web, vamos servir uma página que verifica o token via JavaScript
    // Se não houver token válido, a própria página redirecionará para login
    
    // Servir a página e deixar o JavaScript do frontend fazer a verificação
    next();
}

/**
 * Endpoint para registrar nova subscrição
 */
app.post('/api/subscribe', async (req, res) => {
    try {
        const { userId, adminId, channelId, subscription, active, userAgent, timestamp, url, language, platform, timezone } = req.body;



        if (!userId || !subscription) {
            return res.status(400).json({ 
                error: 'userId e subscription são obrigatórios' 
            });
        }

        // Resolve adminId a partir do channelId se fornecido
        let resolvedAdminId = adminId;
        if (channelId && !adminId) {
            const admin = await adminService.findByChannelId(channelId);
            if (admin) {
                resolvedAdminId = admin.adminId;
                // Log de segurança - resolução de channelId
                await logService.security(
                    `ChannelId ${channelId} resolvido para adminId: ${resolvedAdminId} (Admin: ${admin.name})`,
                    'subscription',
                    { channelId, adminId: resolvedAdminId, adminName: admin.name }
                );
            } else {
                // Log de segurança importante - tentativa de acesso inválido
                await logService.security(
                    `ChannelId ${channelId} não encontrado - possível tentativa de acesso inválido`,
                    'subscription',
                    { channelId, ip: req.ip, userAgent: req.get('User-Agent') }
                );
            }
        } else if (adminId && !channelId) {
            // Compatibilidade com formato antigo
        }

        // Criar ou atualizar subscrição usando o serviço
        const subscriptionData = {
            userId,
            subscription,
            adminId: resolvedAdminId || null,
            active: active !== undefined ? active : true, // Usa o valor enviado ou true por padrão
            userAgent,
            url,
            language,
            platform,
            timezone
        };

        await subscriptionService.createOrUpdate(subscriptionData);

        res.json({ 
            success: true, 
            message: 'Subscrição registrada com sucesso',
            userId: userId,
            adminId: resolvedAdminId,
            channelId: channelId,
            active: subscriptionData.active
        });

    } catch (error) {
        console.error('Erro ao registrar subscrição:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para atualizar status da subscrição
 */
app.put('/api/subscription/status', async (req, res) => {
    try {
        const { userId, adminId, active, timestamp } = req.body;



        if (!userId || active === undefined) {
            return res.status(400).json({ 
                error: 'userId e active são obrigatórios' 
            });
        }

        // Busca a subscrição existente
        const subscription = await subscriptionService.findByUserId(userId);
        
        if (!subscription) {
            return res.status(404).json({ 
                error: 'Subscrição não encontrada' 
            });
        }

        // Atualiza o status da subscrição
        const updatedSubscription = await subscriptionService.updateStatus(userId, active);

        res.json({ 
            success: true, 
            message: `Subscrição ${active ? 'ativada' : 'desativada'} com sucesso`,
            userId: userId,
            adminId: adminId,
            active: active,
            updatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erro ao atualizar status da subscrição:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});



/**
 * Endpoint para obter chave pública VAPID
 */
app.get('/api/vapid-public-key', (req, res) => {
    res.json({ 
        publicKey: VAPID_KEYS.publicKey 
    });
});

/**
 * Endpoint para validar channelId (útil para debug)
 */
app.get('/api/channel/:channelId/validate', async (req, res) => {
    try {
        const { channelId } = req.params;
        
        if (!channelId) {
            return res.status(400).json({ 
                error: 'channelId é obrigatório' 
            });
        }

        const admin = await adminService.findByChannelId(channelId);
        
        if (!admin || !admin.active) {
            return res.status(404).json({ 
                error: 'Canal não encontrado ou inativo' 
            });
        }

        res.json({
            success: true,
            channel: {
                channelId: admin.channelId,
                adminId: admin.adminId,
                name: admin.name,
                active: admin.active
            }
        });

    } catch (error) {
        console.error('Erro ao validar channelId:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

// ==================== ROTAS DE AUTENTICAÇÃO ====================

/**
 * Endpoint para login de administrador
 */
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Usuário e senha são obrigatórios' 
            });
        }

        const admin = await adminService.findByUsername(username);

        if (!admin || !admin.active) {
            return res.status(401).json({ 
                error: 'Usuário não encontrado ou inativo' 
            });
        }

        const passwordMatch = await adminService.verifyPassword(admin, password);
        if (!passwordMatch) {
            return res.status(401).json({ 
                error: 'Senha incorreta' 
            });
        }

        // Gera token JWT
        const token = jwt.sign(
            { 
                id: admin.adminId, 
                username: admin.username,
                name: admin.name 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log importante de login - salvar no banco
        await logService.logWithAdmin(
            'info',
            `Admin ${username} fez login com sucesso`,
            'auth',
            admin.adminId,
            { username, ip: req.ip, userAgent: req.get('User-Agent') }
        );

        res.json({
            success: true,
            token: token,
            adminId: admin.adminId,
            channelId: admin.channelId,
            username: admin.username,
            name: admin.name
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para validar token
 */
app.post('/api/admin/validate', authenticateToken, async (req, res) => {
    try {
        const admin = await adminService.findById(req.admin.id);

        if (!admin || !admin.active) {
            return res.status(401).json({ 
                error: 'Administrador não encontrado ou inativo' 
            });
        }

        res.json({
            success: true,
            admin: {
                id: admin.adminId,
                channelId: admin.channelId,
                username: admin.username,
                name: admin.name
            }
        });

    } catch (error) {
        console.error('Erro na validação:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para criar novo administrador (protegido)
 */
app.post('/api/admin/create', authenticateToken, async (req, res) => {
    try {
        const { username, password, name } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ 
                error: 'Usuário, senha e nome são obrigatórios' 
            });
        }

        // Verifica se o usuário já existe
        const existingAdmin = await adminService.findByUsername(username);
        if (existingAdmin) {
            return res.status(400).json({ 
                error: 'Usuário já existe' 
            });
        }

        // Gera ID único
        const adminId = 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Cria novo admin
        const newAdmin = await adminService.create({
            adminId,
            username,
            password,
            name,
            active: true
        });

        // Log importante de criação de admin - salvar no banco
        await logService.logWithAdmin(
            'info',
            `Novo admin criado: ${username} (ID: ${adminId}, Channel: ${newAdmin.channelId})`,
            'admin',
            req.admin.id,
            { 
                newAdminId: adminId, 
                newAdminUsername: username, 
                channelId: newAdmin.channelId,
                createdBy: req.admin.username
            }
        );

        res.json({
            success: true,
            message: 'Administrador criado com sucesso',
            adminId: adminId,
            channelId: newAdmin.channelId
        });

    } catch (error) {
        console.error('Erro ao criar admin:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para listar administradores (protegido)
 */
app.get('/api/admin/list', authenticateToken, async (req, res) => {
    try {
        const admins = await adminService.findAll();

        // Converte para o formato esperado pelo frontend
        const safeAdmins = {};
        admins.forEach(admin => {
            safeAdmins[admin.adminId] = {
                id: admin.adminId,
                channelId: admin.channelId,
                username: admin.username,
                name: admin.name,
                createdAt: admin.createdAt,
                active: admin.active
            };
        });

        res.json({
            success: true,
            admins: safeAdmins
        });

    } catch (error) {
        console.error('Erro ao listar admins:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para ativar/desativar administrador (protegido)
 */
app.patch('/api/admin/:adminId/status', authenticateToken, async (req, res) => {
    try {
        const { adminId } = req.params;
        const { active } = req.body;

        if (typeof active !== 'boolean') {
            return res.status(400).json({ 
                error: 'Status ativo deve ser um valor booleano' 
            });
        }

        // Não permitir desativar o próprio admin
        if (adminId === req.admin.id && !active) {
            return res.status(400).json({ 
                error: 'Não é possível desativar sua própria conta' 
            });
        }

        const admin = await adminService.findById(adminId);
        if (!admin) {
            return res.status(404).json({ 
                error: 'Administrador não encontrado' 
            });
        }

        // Atualizar status
        await adminService.updateStatus(adminId, active);

        // Log importante de alteração de status - salvar no banco
        await logService.logWithAdmin(
            'info',
            `Admin ${adminId} ${active ? 'ativado' : 'desativado'} por ${req.admin.username}`,
            'admin',
            req.admin.id,
            { 
                targetAdminId: adminId, 
                newStatus: active,
                changedBy: req.admin.username
            }
        );

        res.json({
            success: true,
            message: `Administrador ${active ? 'ativado' : 'desativado'} com sucesso`
        });

    } catch (error) {
        console.error('Erro ao atualizar status do admin:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

// ==================== ROTAS DE SUPER ADMIN ====================

/**
 * Endpoint para login de Super Admin
 */
app.post('/api/super-admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Usuário e senha são obrigatórios' 
            });
        }

        const superAdmin = await superAdminService.findByUsername(username);

        if (!superAdmin || !superAdmin.active) {
            return res.status(401).json({ 
                error: 'Super Admin não encontrado ou inativo' 
            });
        }

        const passwordMatch = await superAdminService.verifyPassword(superAdmin, password);
        if (!passwordMatch) {
            return res.status(401).json({ 
                error: 'Senha incorreta' 
            });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: superAdmin.superAdminId, 
                username: superAdmin.username,
                isSuperAdmin: true
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Log importante de login de super admin - salvar no banco
        await logService.security(
            `Super Admin login: ${username} (ID: ${superAdmin.superAdminId})`,
            'auth',
            { 
                superAdminId: superAdmin.superAdminId,
                username,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.json({
            success: true,
            token: token,
            superAdmin: {
                id: superAdmin.superAdminId,
                username: superAdmin.username,
                name: superAdmin.name
            }
        });

    } catch (error) {
        console.error('Erro no login do Super Admin:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para validar token de Super Admin
 */
app.post('/api/super-admin/validate', authenticateSuperAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            superAdmin: {
                id: req.superAdmin.id,
                username: req.superAdmin.username
            }
        });
    } catch (error) {
        console.error('Erro na validação do Super Admin:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para criar novo administrador (Super Admin)
 */
app.post('/api/super-admin/create-admin', authenticateSuperAdmin, async (req, res) => {
    try {
        const { username, password, name } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ 
                error: 'Usuário, senha e nome são obrigatórios' 
            });
        }

        // Verifica se o usuário já existe
        const existingAdmin = await adminService.findByUsername(username);
        if (existingAdmin) {
            return res.status(400).json({ 
                error: 'Usuário já existe' 
            });
        }

        // Gera ID único
        const adminId = 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Cria novo admin
        const newAdmin = await adminService.create({
            adminId,
            username,
            password,
            name,
            active: true
        });

        // Log importante de criação de admin por super admin - salvar no banco
        await logService.security(
            `Super Admin: Novo admin criado por ${req.superAdmin.username}: ${username} (ID: ${adminId}, Channel: ${newAdmin.channelId})`,
            'admin',
            { 
                superAdminId: req.superAdmin.id,
                superAdminUsername: req.superAdmin.username,
                newAdminId: adminId,
                newAdminUsername: username,
                channelId: newAdmin.channelId
            }
        );

        res.json({
            success: true,
            message: 'Administrador criado com sucesso',
            adminId: adminId,
            channelId: newAdmin.channelId
        });

    } catch (error) {
        console.error('Erro ao criar admin via Super Admin:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para listar administradores (Super Admin)
 */
app.get('/api/super-admin/admins', authenticateSuperAdmin, async (req, res) => {
    try {
        const admins = await adminService.findAll();

        // Converte para o formato esperado pelo frontend
        const safeAdmins = {};
        admins.forEach(admin => {
            safeAdmins[admin.adminId] = {
                id: admin.adminId,
                channelId: admin.channelId,
                username: admin.username,
                name: admin.name,
                createdAt: admin.createdAt,
                active: admin.active
            };
        });

        // Log de acesso à lista de admins por super admin

        res.json({
            success: true,
            admins: safeAdmins
        });

    } catch (error) {
        console.error('Erro ao listar admins via Super Admin:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para ativar/desativar administrador (Super Admin)
 */
app.patch('/api/super-admin/admin/:adminId/status', authenticateSuperAdmin, async (req, res) => {
    try {
        const { adminId } = req.params;
        const { active } = req.body;

        if (typeof active !== 'boolean') {
            return res.status(400).json({ 
                error: 'Status ativo deve ser um valor booleano' 
            });
        }

        const admin = await adminService.findById(adminId);
        if (!admin) {
            return res.status(404).json({ 
                error: 'Administrador não encontrado' 
            });
        }

        // Atualizar status
        await adminService.updateStatus(adminId, active);

        // Log importante de alteração de status por super admin - salvar no banco
        await logService.security(
            `Super Admin: Admin ${adminId} ${active ? 'ativado' : 'desativado'} por ${req.superAdmin.username}`,
            'admin',
            { 
                superAdminId: req.superAdmin.id,
                superAdminUsername: req.superAdmin.username,
                targetAdminId: adminId,
                newStatus: active
            }
        );

        res.json({
            success: true,
            message: `Administrador ${active ? 'ativado' : 'desativado'} com sucesso`
        });

    } catch (error) {
        console.error('Erro ao atualizar status do admin via Super Admin:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    }
});

/**
 * Endpoint para visualizar logs do sistema (Super Admin)
 */
app.get('/api/super-admin/logs', authenticateSuperAdmin, async (req, res) => {
    // Definir timeout para a requisição
    req.setTimeout(30000); // 30 segundos
    
    try {
        const { 
            category, 
            level, 
            adminId, 
            userId, 
            days, 
            page = 1, 
            limit = 50 
        } = req.query;

        // Usar nova função paginada para melhor performance
        const result = await logService.findWithPagination({
            category,
            level,
            adminId,
            userId,
            days
        }, parseInt(page), parseInt(limit));

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        
        // Verificar se é erro de timeout
        if (error.name === 'MongooseError' && error.message.includes('timeout')) {
            res.status(408).json({ 
                error: 'Timeout na consulta de logs. Tente usar filtros mais específicos ou reduza o limite.',
                code: 'TIMEOUT'
            });
        } else {
            res.status(500).json({ 
                error: 'Erro ao buscar logs',
                code: 'INTERNAL_ERROR'
            });
        }
    }
});

/**
 * Endpoint para limpar logs antigos (Super Admin)
 */
app.delete('/api/super-admin/logs/cleanup', authenticateSuperAdmin, async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;
        const deletedCount = await logService.cleanOldLogs(parseInt(daysToKeep));

        // Log da limpeza
        await logService.security(
            `Limpeza de logs executada por ${req.superAdmin.username}: ${deletedCount} logs removidos (mantidos últimos ${daysToKeep} dias)`,
            'system',
            { 
                superAdminId: req.superAdmin.id,
                superAdminUsername: req.superAdmin.username,
                deletedCount,
                daysToKeep
            }
        );

        res.json({
            success: true,
            message: `${deletedCount} logs antigos removidos`,
            deletedCount: deletedCount
        });

    } catch (error) {
        console.error('Erro ao limpar logs:', error);
        res.status(500).json({ 
            error: 'Erro ao limpar logs' 
        });
    }
});

// ==================== ROTAS PROTEGIDAS ====================

/**
 * Endpoint para listar usuários do admin logado (protegido)
 */
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const subscriptions = await subscriptionService.findActiveByAdminId(req.admin.id);
        
        // Converte para o formato esperado pelo frontend
        const adminUsers = subscriptions.map(sub => ({
            userId: sub.userId,
            subscription: sub.subscription,
            adminId: sub.adminId,
            userAgent: sub.userAgent,
            url: sub.url,
            language: sub.language,
            platform: sub.platform,
            timezone: sub.timezone,
            registeredAt: sub.registeredAt,
            lastSeen: sub.lastSeen,
            lastNotificationSent: sub.lastNotificationSent,
            active: sub.active
        }));

        const activeUsers = adminUsers.filter(user => user.active);
        
        // Calcula usuários novos nas últimas 24 horas
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const newUsers24h = adminUsers.filter(user => {
            if (!user.registeredAt) return false;
            const registeredDate = new Date(user.registeredAt);
            return registeredDate >= twentyFourHoursAgo;
        });

        res.json({
            success: true,
            total: adminUsers.length,
            active: activeUsers.length,
            newUsers24h: newUsers24h.length,
            users: adminUsers
        });

    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ 
            error: 'Erro ao carregar usuários' 
        });
    }
});

/**
 * Endpoint para remover usuário do admin logado (protegido)
 */
app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const subscription = await subscriptionService.findByUserId(userId);

        if (!subscription) {
            return res.status(404).json({ 
                error: 'Usuário não encontrado' 
            });
        }

        // Verifica se o usuário pertence ao admin logado
        if (subscription.adminId !== req.admin.id) {
            return res.status(403).json({ 
                error: 'Você não tem permissão para remover este usuário' 
            });
        }

        await subscriptionService.deactivate(userId);

        // Log importante de remoção de usuário - salvar no banco
        await logService.logWithAdmin(
            'info',
            `Usuário ${userId} removido por admin ${req.admin.username}`,
            'subscription',
            req.admin.id,
            { 
                removedUserId: userId,
                removedBy: req.admin.username
            }
        );

        res.json({ 
            success: true, 
            message: 'Usuário removido com sucesso' 
        });

    } catch (error) {
        console.error('Erro ao remover usuário:', error);
        res.status(500).json({ 
            error: 'Erro ao remover usuário' 
        });
    }
});

/**
 * Endpoint para enviar notificação para todos os usuários do admin (protegido)
 */
app.post('/api/notify-all', authenticateToken, async (req, res) => {
    try {
        const { title, body, icon, url, tag } = req.body;

        if (!title || !body) {
            return res.status(400).json({ 
                error: 'title e body são obrigatórios' 
            });
        }

        // Busca usuários ativos do administrador logado
        const subscriptions = await subscriptionService.findActiveByAdminId(req.admin.id);

        if (subscriptions.length === 0) {
            return res.json({ 
                success: true, 
                message: 'Nenhum usuário ativo encontrado para este administrador',
                sent: 0,
                failed: 0
            });
        }

        let sent = 0;
        let failed = 0;
        const trackingIds = [];
        const notificationId = generateNotificationId();

        // Envia notificações em paralelo
        const promises = subscriptions.map(async (subscription) => {
            try {
                let finalUrl = url || '/';
                let trackingId = null;

                // Se uma URL foi fornecida, cria um link de rastreamento para cada usuário
                if (url && url.trim() !== '') {
                    trackingId = generateTrackingId();
                    finalUrl = `${req.protocol}://${req.get('host')}/track/${trackingId}`;
                    
                    // Salva dados de rastreamento no MongoDB
                    await clickService.create({
                        trackingId,
                        originalUrl: url,
                        userId: subscription.userId,
                        adminId: req.admin.id,
                        notificationTitle: title,
                        clicked: false,
                        clickedAt: null
                    });
                    trackingIds.push(trackingId);
                }

                const notificationPayload = JSON.stringify({
                    title,
                    body,
                    icon: icon || 'https://placehold.co/192x192/1e293b/ffffff?text=P',
                    url: finalUrl,
                    tag: tag || 'pulso-notification',
                    timestamp: Date.now()
                });

                await webpush.sendNotification(
                    subscription.subscription,
                    notificationPayload
                );

                // Atualiza último envio
                await subscriptionService.updateLastNotificationSent(subscription.userId);
                sent++;

            } catch (error) {
                console.error(`Erro ao enviar para ${subscription.userId}:`, error);
                failed++;

                // Se a subscrição é inválida, marca como inativa
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await subscriptionService.deactivate(subscription.userId);
                }
            }
        });

        await Promise.all(promises);
        
        // Salva histórico da notificação no MongoDB
        await notificationService.create({
            notificationId,
            adminId: req.admin.id,
            title,
            body,
            icon: icon || 'https://placehold.co/192x192/1e293b/ffffff?text=P',
            url: url || null,
            tag: tag || 'pulso-notification',
            sent,
            failed,
            totalUsers: subscriptions.length,
            trackingIds
        });

        // Log importante de envio de notificação - salvar no banco
        await logService.logWithAdmin(
            'info',
            `Notificação enviada por admin ${req.admin.username} para seus usuários: ${sent} sucessos, ${failed} falhas${trackingIds.length > 0 ? ` (${trackingIds.length} links de rastreamento criados)` : ''}`,
            'notification',
            req.admin.id,
            { 
                notificationId,
                title,
                sent,
                failed,
                totalUsers: subscriptions.length,
                trackingLinksCreated: trackingIds.length,
                hasUrl: !!url
            }
        );

        res.json({
            success: true,
            message: `Notificação enviada para ${sent} usuários`,
            sent: sent,
            failed: failed,
            trackingIds: trackingIds,
            notificationId: notificationId
        });

    } catch (error) {
        console.error('Erro no envio:', error);
        res.status(500).json({ 
            error: 'Erro ao enviar notificações' 
        });
    }
});

/**
 * Endpoint para listar notificações do admin logado (protegido)
 */
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await notificationService.findByAdminId(req.admin.id, 1, 50);
        
        // Converte para o formato esperado pelo frontend
        const adminNotifications = result.notifications.map(notification => ({
            id: notification.notificationId,
            adminId: notification.adminId,
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            url: notification.url,
            tag: notification.tag,
            sentAt: notification.sentAt,
            sent: notification.sent,
            failed: notification.failed,
            totalUsers: notification.totalUsers,
            trackingIds: notification.trackingIds,
            isResend: notification.isResend,
            originalNotificationId: notification.originalNotificationId
        }));

        res.json({
            success: true,
            notifications: adminNotifications
        });

    } catch (error) {
        console.error('Erro ao listar notificações:', error);
        res.status(500).json({ 
            error: 'Erro ao carregar notificações' 
        });
    }
});

/**
 * Endpoint para reenviar notificação (protegido)
 */
app.post('/api/notifications/:notificationId/resend', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const originalNotification = await notificationService.findById(notificationId);
        
        if (!originalNotification) {
            return res.status(404).json({ 
                error: 'Notificação não encontrada' 
            });
        }

        // Verifica se a notificação pertence ao admin logado
        if (originalNotification.adminId !== req.admin.id) {
            return res.status(403).json({ 
                error: 'Você não tem permissão para reenviar esta notificação' 
            });
        }

        // Reenvia usando os mesmos dados da notificação original
        const { title, body, icon, url, tag } = originalNotification;
        
        // Busca usuários ativos do administrador logado
        const subscriptions = await subscriptionService.findActiveByAdminId(req.admin.id);

        if (subscriptions.length === 0) {
            return res.json({ 
                success: true, 
                message: 'Nenhum usuário ativo encontrado para este administrador',
                sent: 0,
                failed: 0
            });
        }

        let sent = 0;
        let failed = 0;
        const trackingIds = [];
        const newNotificationId = generateNotificationId();

        // Envia notificações em paralelo
        const promises = subscriptions.map(async (subscription) => {
            try {
                let finalUrl = url || '/';
                let trackingId = null;

                // Se uma URL foi fornecida, cria um link de rastreamento para cada usuário
                if (url && url.trim() !== '') {
                    trackingId = generateTrackingId();
                    finalUrl = `${req.protocol}://${req.get('host')}/track/${trackingId}`;
                    
                    // Salva dados de rastreamento no MongoDB
                    await clickService.create({
                        trackingId,
                        originalUrl: url,
                        userId: subscription.userId,
                        adminId: req.admin.id,
                        notificationTitle: title,
                        clicked: false,
                        clickedAt: null
                    });
                    trackingIds.push(trackingId);
                }

                const notificationPayload = JSON.stringify({
                    title,
                    body,
                    icon: icon,
                    url: finalUrl,
                    tag: tag,
                    timestamp: Date.now()
                });

                await webpush.sendNotification(
                    subscription.subscription,
                    notificationPayload
                );

                // Atualiza último envio
                await subscriptionService.updateLastNotificationSent(subscription.userId);
                sent++;

            } catch (error) {
                console.error(`Erro ao reenviar para ${subscription.userId}:`, error);
                failed++;

                // Se a subscrição é inválida, marca como inativa
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await subscriptionService.deactivate(subscription.userId);
                }
            }
        });

        await Promise.all(promises);
        
        // Salva histórico da nova notificação (reenvio) no MongoDB
        await notificationService.create({
            notificationId: newNotificationId,
            adminId: req.admin.id,
            title,
            body,
            icon,
            url,
            tag,
            sent,
            failed,
            totalUsers: subscriptions.length,
            trackingIds,
            isResend: true,
            originalNotificationId: notificationId
        });

        // Log importante de reenvio de notificação - salvar no banco
        await logService.logWithAdmin(
            'info',
            `Notificação reenviada por admin ${req.admin.username}: ${sent} sucessos, ${failed} falhas`,
            'notification',
            req.admin.id,
            { 
                originalNotificationId: notificationId,
                newNotificationId,
                title,
                sent,
                failed,
                totalUsers: subscriptions.length,
                isResend: true
            }
        );

        res.json({
            success: true,
            message: `Notificação reenviada para ${sent} usuários`,
            sent: sent,
            failed: failed,
            trackingIds: trackingIds,
            notificationId: newNotificationId
        });

    } catch (error) {
        console.error('Erro ao reenviar notificação:', error);
        res.status(500).json({ 
            error: 'Erro ao reenviar notificação' 
        });
    }
});

/**
 * Endpoint para rastreamento de cliques
 */
app.get('/track/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;
        const click = await clickService.findByTrackingId(trackingId);

        if (!click) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Link não encontrado</title>
                    <meta charset="UTF-8">
                </head>
                <body>
                    <h1>Link não encontrado</h1>
                    <p>Este link de rastreamento não existe ou expirou.</p>
                </body>
                </html>
            `);
        }

        // Registra o clique
        if (!click.clicked) {
            await clickService.registerClick(trackingId, {
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress
            });
            
            // Log importante de clique registrado - manter para auditoria
        }

        // Página de redirecionamento imperceptível
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecionando...</title>
                <meta charset="UTF-8">
                <meta http-equiv="refresh" content="0;url=${click.originalUrl}">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background-color: #f5f5f5;
                    }
                    .loading {
                        text-align: center;
                    }
                    .spinner {
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #3498db;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                <script>
                    // Redirecionamento via JavaScript como fallback
                    setTimeout(function() {
                        window.location.href = '${click.originalUrl}';
                    }, 100);
                </script>
            </head>
            <body>
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Redirecionando...</p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Erro no rastreamento:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Erro</title>
                <meta charset="UTF-8">
            </head>
            <body>
                <h1>Erro interno</h1>
                <p>Ocorreu um erro ao processar o redirecionamento.</p>
            </body>
            </html>
        `);
    }
});

/**
 * Endpoint para obter estatísticas de cliques (protegido)
 */
app.get('/api/clicks/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await clickService.getStatsByAdminId(req.admin.id);
        const recentClicks = await clickService.findRecent(10, req.admin.id);
        
        res.json({
            success: true,
            stats: {
                total: stats.totalClicks,
                clicked: stats.clickedCount,
                clickRate: stats.clickRate,
                recentClicks: recentClicks.map(click => ({
                    trackingId: click.trackingId,
                    originalUrl: click.originalUrl,
                    userId: click.userId,
                    notificationTitle: click.notificationTitle,
                    clickedAt: click.clickedAt,
                    userAgent: click.userAgent
                }))
            }
        });

    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({ 
            error: 'Erro ao obter estatísticas' 
        });
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota para documentação (protegida - requer Super Admin)
app.get('/documentation', authenticateSuperAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'documentation.html'));
});

// Rota para gerenciamento de administradores (protegida - requer Super Admin)
app.get('/admin-management', authenticateSuperAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-management.html'));
});

// Rota para subscribe
app.get('/subscribe', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'subscribe.html'));
});

// Rota para painel administrativo
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Rota para login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota para login do super admin
app.get('/super-admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'super-admin-login.html'));
});

// Rota para instruções iOS
app.get('/ios-instructions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ios-instructions.html'));
});

// Inicia o servidor
async function startServer() {
    try {
        // Conecta ao MongoDB
        await connectDB();

        // Cria admin padrão se não existir
        await adminService.createDefaultAdmin();

        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`Acesse: http://localhost:${PORT}`);
        });
        
    } catch (error) {
        console.error('Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

startServer();

// Handler de erro global para timeouts
app.use((err, req, res, next) => {
    if (err.status === 408 || err.message === 'Request timeout') {
        res.status(408).json({
            error: 'Request timeout - A operação demorou mais que o esperado',
            code: 'TIMEOUT',
            suggestion: 'Tente novamente com filtros mais específicos'
        });
    } else {
        console.error('Erro não tratado:', err);
        res.status(500).json({
            error: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

module.exports = app;