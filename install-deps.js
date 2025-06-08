#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Instalando dependências do sistema Pulso...\n');

try {
    // Verifica se o package.json existe
    if (!fs.existsSync('package.json')) {
        console.error('❌ Arquivo package.json não encontrado!');
        process.exit(1);
    }

    // Instala as dependências
    console.log('📦 Instalando dependências npm...');
    execSync('npm install', { stdio: 'inherit' });

    console.log('\n✅ Dependências instaladas com sucesso!');

    // Verifica se as dependências críticas estão instaladas
    const criticalDeps = ['express', 'cors', 'web-push', 'jsonwebtoken', 'bcrypt'];
    console.log('\n🔍 Verificando dependências críticas...');

    for (const dep of criticalDeps) {
        try {
            require.resolve(dep);
            console.log(`✅ ${dep} - OK`);
        } catch (error) {
            console.log(`❌ ${dep} - ERRO`);
            console.log(`   Tentando instalar ${dep}...`);
            execSync(`npm install ${dep}`, { stdio: 'inherit' });
        }
    }

    console.log('\n🎉 Todas as dependências estão instaladas!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Execute: npm start');
    console.log('2. Acesse: http://localhost:3000');
    console.log('3. Login admin: http://localhost:3000/login.html');
    console.log('   Usuário: admin');
    console.log('   Senha: admin123');

} catch (error) {
    console.error('❌ Erro durante a instalação:', error.message);
    process.exit(1);
}