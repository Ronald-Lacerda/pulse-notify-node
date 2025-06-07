require('dotenv').config();
const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// Arquivo para armazenar subscrições (em produção, use um banco de dados)
const SUBSCRIPTIONS_FILE = path.join(__dirname, 'subscriptions.json');
const ADMINS_FILE = path.join(__dirname, 'admins.json');

// Chave secreta para JWT (em produção, use uma variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Carrega administradores do arquivo
 */
async function loadAdmins() {
    try {
        const data = await fs.readFile(ADMINS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Arquivo de administradores não encontrado, criando com admin padrão...');
        // Cria admin padrão
        const defaultAdmins = {
            'admin1': {
                id: 'admin1',
                username: 'admin',
                password: await bcrypt.hash('admin123', 10), // senha: admin123
                name: 'Administrador Principal',
                createdAt: new Date().toISOString(),
                active: true
            }
        };
        await saveAdmins(defaultAdmins);
        return defaultAdmins;
    }
}

/**
 * Salva administradores no arquivo
 */
async function saveAdmins(admins) {
    try {
        await fs.writeFile(ADMINS_FILE, JSON.stringify(admins, null, 2));
        console.log('Administradores salvos com sucesso');
    } catch (error) {
        console.error('Erro ao salvar administradores:', error);
    }
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
 * Carrega subscrições do arquivo
 */
async function loadSubscriptions() {
    try {
        const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Arquivo de subscrições não encontrado, criando novo...');
        return {};
    }
}

/**
 * Salva subscrições no arquivo
 */
async function saveSubscriptions(subscriptions) {
    try {
        await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
        console.log('Subscrições salvas com sucesso');
    } catch (error) {
        console.error('Erro ao salvar subscrições:', error);
    }
}

/**
 * Endpoint para registrar nova subscrição
 */
app.post('/api/subscribe', async (req, res) => {
    try {
        const { userId, adminId, subscription, userAgent, timestamp, url, language, platform, timezone } = req.body;

        // Debug: log dos dados recebidos
        console.log('=== DEBUG SUBSCRIBE ENDPOINT ===');
        console.log('Dados recebidos:', {
            userId,
            adminId,
            url,
            userAgent: userAgent?.substring(0, 50) + '...'
        });
        console.log('================================');

        if (!userId || !subscription) {
            return res.status(400).json({ 
                error: 'userId e subscription são obrigatórios' 
            });
        }

        // Carrega subscrições existentes
        const subscriptions = await loadSubscriptions();

        // Registra ou atualiza a subscrição do usuário
        subscriptions[userId] = {
            subscription,
            adminId: adminId || null, // ID do administrador responsável
            userAgent,
            timestamp,
            url,
            language,
            platform,
            timezone,
            registeredAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            active: true
        };

        // Salva no arquivo
        await saveSubscriptions(subscriptions);

        console.log(`Usuário ${userId} registrado/atualizado com sucesso${adminId ? ` (Admin: ${adminId})` : ''}`);

        res.json({ 
            success: true, 
            message: 'Subscrição registrada com sucesso',
            userId: userId,
            adminId: adminId
        });

    } catch (error) {
        console.error('Erro ao registrar subscrição:', error);
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

        const admins = await loadAdmins();
        const admin = Object.values(admins).find(a => a.username === username && a.active);

        if (!admin) {
            return res.status(401).json({ 
                error: 'Usuário não encontrado ou inativo' 
            });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.status(401).json({ 
                error: 'Senha incorreta' 
            });
        }

        // Gera token JWT
        const token = jwt.sign(
            { 
                id: admin.id, 
                username: admin.username,
                name: admin.name 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`Admin ${username} fez login com sucesso`);

        res.json({
            success: true,
            token: token,
            adminId: admin.id,
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
        const admins = await loadAdmins();
        const admin = admins[req.admin.id];

        if (!admin || !admin.active) {
            return res.status(401).json({ 
                error: 'Administrador não encontrado ou inativo' 
            });
        }

        res.json({
            success: true,
            admin: {
                id: admin.id,
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

        const admins = await loadAdmins();
        
        // Verifica se o usuário já existe
        const existingAdmin = Object.values(admins).find(a => a.username === username);
        if (existingAdmin) {
            return res.status(400).json({ 
                error: 'Usuário já existe' 
            });
        }

        // Gera ID único
        const adminId = 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Cria novo admin
        admins[adminId] = {
            id: adminId,
            username: username,
            password: hashedPassword,
            name: name,
            createdAt: new Date().toISOString(),
            createdBy: req.admin.id,
            active: true
        };

        await saveAdmins(admins);

        console.log(`Novo admin criado: ${username} (ID: ${adminId})`);

        res.json({
            success: true,
            message: 'Administrador criado com sucesso',
            adminId: adminId
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
        const admins = await loadAdmins();

        // Remove senhas dos dados retornados
        const safeAdmins = {};
        Object.keys(admins).forEach(id => {
            const admin = admins[id];
            safeAdmins[id] = {
                id: admin.id,
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

// ==================== ROTAS PROTEGIDAS ====================

/**
 * Endpoint para listar usuários (protegido)
 */
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const subscriptions = await loadSubscriptions();
        const users = Object.entries(subscriptions).map(([userId, userData]) => ({
            userId,
            ...userData
        }));

        const activeUsers = users.filter(user => user.active);

        res.json({
            success: true,
            total: users.length,
            active: activeUsers.length,
            users: users
        });

    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ 
            error: 'Erro ao carregar usuários' 
        });
    }
});

/**
 * Endpoint para remover usuário (protegido)
 */
app.delete('/api/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const subscriptions = await loadSubscriptions();

        if (!subscriptions[userId]) {
            return res.status(404).json({ 
                error: 'Usuário não encontrado' 
            });
        }

        delete subscriptions[userId];
        await saveSubscriptions(subscriptions);

        console.log(`Usuário ${userId} removido por admin ${req.admin.username}`);

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
 * Endpoint para enviar notificação para usuário específico (protegido)
 */
app.post('/api/notify/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { title, body, icon, url, tag } = req.body;

        if (!title || !body) {
            return res.status(400).json({ 
                error: 'title e body são obrigatórios' 
            });
        }

        const subscriptions = await loadSubscriptions();
        const userSubscription = subscriptions[userId];

        if (!userSubscription || !userSubscription.active) {
            return res.status(404).json({ 
                error: 'Usuário não encontrado ou inativo' 
            });
        }

        const notificationPayload = JSON.stringify({
            title,
            body,
            icon: icon || 'https://placehold.co/192x192/1e293b/ffffff?text=P',
            url: url || '/',
            tag: tag || 'pulso-notification',
            timestamp: Date.now()
        });

        await webpush.sendNotification(
            userSubscription.subscription,
            notificationPayload
        );

        // Atualiza último envio
        subscriptions[userId].lastNotificationSent = new Date().toISOString();
        await saveSubscriptions(subscriptions);

        console.log(`Notificação enviada para usuário ${userId} por admin ${req.admin.username}`);

        res.json({ 
            success: true, 
            message: 'Notificação enviada com sucesso' 
        });

    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        
        // Se a subscrição é inválida, marca como inativa
        if (error.statusCode === 410 || error.statusCode === 404) {
            const subscriptions = await loadSubscriptions();
            if (subscriptions[req.params.userId]) {
                subscriptions[req.params.userId].active = false;
                await saveSubscriptions(subscriptions);
                console.log(`Usuário ${req.params.userId} marcado como inativo`);
            }
        }

        res.status(500).json({ 
            error: 'Erro ao enviar notificação' 
        });
    }
});

/**
 * Endpoint para enviar notificação para todos os usuários (protegido)
 */
app.post('/api/notify-all', authenticateToken, async (req, res) => {
    try {
        const { title, body, icon, url, tag } = req.body;

        if (!title || !body) {
            return res.status(400).json({ 
                error: 'title e body são obrigatórios' 
            });
        }

        const subscriptions = await loadSubscriptions();
        const activeUsers = Object.entries(subscriptions)
            .filter(([_, userData]) => userData.active);

        if (activeUsers.length === 0) {
            return res.json({ 
                success: true, 
                message: 'Nenhum usuário ativo encontrado',
                sent: 0,
                failed: 0
            });
        }

        const notificationPayload = JSON.stringify({
            title,
            body,
            icon: icon || 'https://placehold.co/192x192/1e293b/ffffff?text=P',
            url: url || '/',
            tag: tag || 'pulso-notification',
            timestamp: Date.now()
        });

        let sent = 0;
        let failed = 0;

        // Envia notificações em paralelo
        const promises = activeUsers.map(async ([userId, userData]) => {
            try {
                await webpush.sendNotification(
                    userData.subscription,
                    notificationPayload
                );

                // Atualiza último envio
                subscriptions[userId].lastNotificationSent = new Date().toISOString();
                sent++;

            } catch (error) {
                console.error(`Erro ao enviar para ${userId}:`, error);
                failed++;

                // Se a subscrição é inválida, marca como inativa
                if (error.statusCode === 410 || error.statusCode === 404) {
                    subscriptions[userId].active = false;
                    console.log(`Usuário ${userId} marcado como inativo`);
                }
            }
        });

        await Promise.all(promises);
        await saveSubscriptions(subscriptions);

        console.log(`Broadcast enviado por admin ${req.admin.username}: ${sent} sucessos, ${failed} falhas`);

        res.json({
            success: true,
            message: `Notificação enviada para ${sent} usuários`,
            sent: sent,
            failed: failed
        });

    } catch (error) {
        console.error('Erro no broadcast:', error);
        res.status(500).json({ 
            error: 'Erro ao enviar notificações' 
        });
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota para documentação
app.get('/documentation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'documentation.html'));
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

// Rota para login
app.get('/ios-instructions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ios-instructions.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log('\n📚 DOCUMENTAÇÃO DAS ROTAS:');
    console.log(`🔗 http://localhost:${PORT}/documentation`);
    console.log('\n📄 Páginas disponíveis:');
    console.log('- GET  / (página principal)');
    console.log('- GET  /subscribe (página de inscrição)');
    console.log('- GET  /login.html (login administrativo)');
    console.log('- GET  /admin.html (painel administrativo)');
    console.log('- GET  /test-auth.html (teste de autenticação)');
    console.log('- GET  /ios-instructions.html (instruções iOS)');
    console.log('- GET  /main.html (documentação das rotas)');
    console.log('\n🔌 APIs públicas:');
    console.log('- GET  /api/vapid-public-key');
    console.log('- POST /api/subscribe');
    console.log('\n🔐 APIs de autenticação:');
    console.log('- POST /api/admin/login');
    console.log('- POST /api/admin/validate (protegido)');
    console.log('- POST /api/admin/create (protegido)');
    console.log('- GET  /api/admin/list (protegido)');
    console.log('\n🛡️  APIs protegidas (requerem autenticação):');
    console.log('- GET  /api/users');
    console.log('- DELETE /api/users/:userId');
    console.log('- POST /api/notify/:userId');
    console.log('- POST /api/notify-all');
    console.log('\n💡 Credenciais padrão: admin / admin123');
});

module.exports = app;