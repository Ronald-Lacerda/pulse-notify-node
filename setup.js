/**
 * Script de configuração automática
 * Execute: node setup.js
 */

const fs = require('fs').promises;
const { execSync } = require('child_process');
const path = require('path');

async function setup() {
    console.log('🚀 Configurando sistema de notificações...\n');

    try {
        // 1. Gerar chaves VAPID
        console.log('🔑 Gerando chaves VAPID...');
        const vapidOutput = execSync('npx web-push generate-vapid-keys', { encoding: 'utf8' });
        
        // Extrair chaves do output
        const publicKeyMatch = vapidOutput.match(/Public Key:\s*(.+)/);
        const privateKeyMatch = vapidOutput.match(/Private Key:\s*(.+)/);
        
        if (!publicKeyMatch || !privateKeyMatch) {
            throw new Error('Não foi possível extrair as chaves VAPID');
        }
        
        const publicKey = publicKeyMatch[1].trim();
        const privateKey = privateKeyMatch[1].trim();
        
        console.log('✅ Chaves VAPID geradas com sucesso!');
        
        // 2. Atualizar server.js
        console.log('📝 Atualizando server.js...');
        
        let serverContent = await fs.readFile('server.js', 'utf8');
        
        // Substituir chaves VAPID
        serverContent = serverContent.replace(
            /publicKey: 'SUA_CHAVE_PUBLICA_VAPID_AQUI'/,
            `publicKey: '${publicKey}'`
        );
        
        serverContent = serverContent.replace(
            /privateKey: 'SUA_CHAVE_PRIVADA_VAPID_AQUI'/,
            `privateKey: '${privateKey}'`
        );
        
        await fs.writeFile('server.js', serverContent);
        console.log('✅ server.js atualizado!');
        
        // 3. Criar arquivo .env
        console.log('📄 Criando arquivo .env...');
        
        const envContent = `# Configurações do servidor
PORT=3000
NODE_ENV=development

# Chaves VAPID
VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_EMAIL=seu-email@exemplo.com
`;
        
        await fs.writeFile('.env', envContent);
        console.log('✅ Arquivo .env criado!');
        
        // 4. Criar diretório de logs
        console.log('📁 Criando diretório de logs...');
        try {
            await fs.mkdir('logs', { recursive: true });
            console.log('✅ Diretório de logs criado!');
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            console.log('✅ Diretório de logs já existe!');
        }
        
        // 5. Criar arquivo de exemplo de configuração
        console.log('📋 Criando arquivo de configuração de exemplo...');
        
        const configExample = `/**
 * Configurações da aplicação
 */

module.exports = {
    // URL do servidor (ajuste conforme necessário)
    SERVER_URL: window.location.origin;,

    // Configurações de notificação
    notification: {
        icon: 'https://placehold.co/192x192/1e293b/ffffff?text=P',
        badge: 'https://placehold.co/72x72/1e293b/ffffff?text=P',
        defaultTag: 'pulso-notification',
        requireInteraction: false
    },
    
    // Configurações de usuário
    user: {
        // Prefixo para IDs de usuário
        idPrefix: 'user_',
        
        // Campos adicionais para coletar
        collectFields: [
            'userAgent',
            'language',
            'platform',
            'timezone',
            'url'
        ]
    },
    
    // Configurações de segmentação
    segments: {
        ios: (userData) => userData.platform && userData.platform.includes('iPhone'),
        android: (userData) => userData.platform && userData.platform.includes('Android'),
        recent: (userData) => {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return new Date(userData.registeredAt) > dayAgo;
        },
        portuguese: (userData) => userData.language && userData.language.startsWith('pt')
    }
};`;
        
        await fs.writeFile('config.example.js', configExample);
        console.log('✅ Arquivo de configuração de exemplo criado!');
        
        // 6. Mostrar resumo
        console.log('\n🎉 Configuração concluída com sucesso!\n');
        
        console.log('📋 Resumo:');
        console.log(`   ✅ Chave pública VAPID: ${publicKey.substring(0, 20)}...`);
        console.log(`   ✅ Chave privada VAPID: ${privateKey.substring(0, 20)}...`);
        console.log('   ✅ Arquivo server.js atualizado');
        console.log('   ✅ Arquivo .env criado');
        console.log('   ✅ Diretório de logs criado');
        console.log('   ✅ Arquivo de configuração de exemplo criado');
        
        console.log('\n🚀 Próximos passos:');
        console.log('   1. Edite o arquivo .env e configure seu email');
        console.log('   2. Execute: npm start');
        console.log('   3. Acesse: http://localhost:3000');
        console.log('   4. Teste as notificações!');
        
        console.log('\n📚 URLs importantes:');
        console.log('   🏠 Página principal: http://localhost:3000');
        console.log('   ⚙️  Painel admin: http://localhost:3000/admin.html');
        
        console.log('\n🧪 Para testar:');
        console.log('   node test-notifications.js');
        
    } catch (error) {
        console.error('❌ Erro durante a configuração:', error.message);
        process.exit(1);
    }
}

// Verifica se está sendo executado diretamente
if (require.main === module) {
    setup();
}

module.exports = { setup };