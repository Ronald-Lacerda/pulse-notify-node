const connectDB = require('../config/database');
const adminService = require('../services/adminService');
const subscriptionService = require('../services/subscriptionService');
const notificationService = require('../services/notificationService');
const clickService = require('../services/clickService');

async function testConnection() {
    try {
        console.log('🔄 Testando conexão com MongoDB...');
        
        // Conecta ao banco
        await connectDB();
        console.log('✅ Conexão com MongoDB estabelecida!');
        
        // Testa serviços
        console.log('\n🔄 Testando serviços...');
        
        // Teste Admin Service
        console.log('- Testando AdminService...');
        await adminService.createDefaultAdmin();
        const admins = await adminService.findAll();
        console.log(`  ✅ ${admins.length} admin(s) encontrado(s)`);
        
        // Teste Subscription Service
        console.log('- Testando SubscriptionService...');
        const activeSubscriptions = await subscriptionService.findAllActive();
        console.log(`  ✅ ${activeSubscriptions.length} subscrição(ões) ativa(s) encontrada(s)`);
        
        // Teste Notification Service
        console.log('- Testando NotificationService...');
        const stats = await notificationService.getStats();
        console.log(`  ✅ ${stats.total} notificação(ões) no histórico`);
        
        // Teste Click Service
        console.log('- Testando ClickService...');
        const clickStats = await clickService.getGeneralStats();
        console.log(`  ✅ ${clickStats.total} clique(s) registrado(s)`);
        
        console.log('\n🎉 Todos os testes passaram! O sistema está pronto para uso.');
        console.log('\n📋 Resumo:');
        console.log(`- Administradores: ${admins.length}`);
        console.log(`- Subscrições ativas: ${activeSubscriptions.length}`);
        console.log(`- Notificações enviadas: ${stats.total}`);
        console.log(`- Cliques registrados: ${clickStats.total}`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
        process.exit(1);
    }
}

testConnection();