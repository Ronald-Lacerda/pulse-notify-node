/**
 * Script de teste para enviar notificações
 * Execute: node test-notifications.js
 */

const SERVER_URL = 'http://localhost:3000';

/**
 * Testa envio de notificação para todos os usuários
 */
async function testBroadcastNotification() {
    try {
        console.log('🚀 Testando notificação broadcast...');
        
        const response = await fetch(`${SERVER_URL}/api/notify-all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: '🎉 Teste de Broadcast',
                body: 'Esta é uma notificação de teste enviada para todos os usuários!',
                url: '/',
                tag: 'test-broadcast'
            })
        });

        if (!response.ok) {
            throw new Error(`Erro: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Resultado:', result);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

/**
 * Lista usuários registrados
 */
async function listUsers() {
    try {
        console.log('📋 Listando usuários...');
        
        const response = await fetch(`${SERVER_URL}/api/users`);
        
        if (!response.ok) {
            throw new Error(`Erro: ${response.status}`);
        }

        const data = await response.json();
        console.log('👥 Usuários encontrados:', data.total);
        console.log('✅ Usuários ativos:', data.active);
        
        if (data.users.length > 0) {
            console.log('\n📝 Lista de usuários:');
            data.users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.userId}`);
                console.log(`   Status: ${user.active ? '✅ Ativo' : '❌ Inativo'}`);
                console.log(`   Plataforma: ${user.platform || 'N/A'}`);
                console.log(`   Registrado: ${new Date(user.registeredAt).toLocaleString('pt-BR')}`);
                console.log('');
            });
        }
        
        return data.users;
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return [];
    }
}

/**
 * Testa envio para usuário específico
 */
async function testSpecificUserNotification(userId) {
    try {
        console.log(`🎯 Testando notificação para usuário: ${userId}`);
        
        const response = await fetch(`${SERVER_URL}/api/notify/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: '🎯 Notificação Personalizada',
                body: `Olá! Esta notificação foi enviada especificamente para você (${userId})`,
                url: '/',
                tag: 'test-personal'
            })
        });

        if (!response.ok) {
            throw new Error(`Erro: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Resultado:', result);
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

/**
 * Função principal
 */
async function main() {
    console.log('🧪 Iniciando testes de notificação...\n');
    
    // Lista usuários
    const users = await listUsers();
    
    if (users.length === 0) {
        console.log('⚠️  Nenhum usuário encontrado. Registre-se primeiro em http://localhost:3000');
        return;
    }
    
    // Aguarda um pouco
    console.log('⏳ Aguardando 3 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Testa broadcast
    await testBroadcastNotification();
    
    // Aguarda um pouco
    console.log('\n⏳ Aguardando 5 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Testa notificação específica para o primeiro usuário ativo
    const activeUsers = users.filter(user => user.active);
    if (activeUsers.length > 0) {
        await testSpecificUserNotification(activeUsers[0].userId);
    }
    
    console.log('\n🎉 Testes concluídos!');
}

// Verifica se está sendo executado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testBroadcastNotification,
    listUsers,
    testSpecificUserNotification
};