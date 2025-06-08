#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnóstico do Sistema Pulso\n');

// Verifica arquivos essenciais
const essentialFiles = [
    'server.js',
    'package.json',
    'public/index.html',
    'public/subscribe.html',
    'public/admin.html',
    'public/login.html',
    'public/script.js',
    'public/admin.js',
    'public/login.js'
];

console.log('📁 Verificando arquivos essenciais:');
for (const file of essentialFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - AUSENTE`);
    }
}

// Verifica dependências
console.log('\n📦 Verificando dependências:');
const dependencies = ['express', 'cors', 'web-push', 'jsonwebtoken', 'bcrypt'];

for (const dep of dependencies) {
    try {
        require.resolve(dep);
        console.log(`✅ ${dep}`);
    } catch (error) {
        console.log(`❌ ${dep} - NÃO INSTALADO`);
    }
}

// Verifica sintaxe do server.js
console.log('\n🔧 Verificando sintaxe do server.js:');
try {
    require('./server.js');
    console.log('✅ Sintaxe do server.js está correta');
} catch (error) {
    console.log('❌ Erro na sintaxe do server.js:');
    console.log(error.message);
}

// Verifica estrutura do package.json
console.log('\n📋 Verificando package.json:');
try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Nome: ${pkg.name}`);
    console.log(`✅ Versão: ${pkg.version}`);
    console.log(`✅ Script start: ${pkg.scripts?.start || 'NÃO DEFINIDO'}`);

    const requiredDeps = ['express', 'cors', 'web-push', 'jsonwebtoken', 'bcrypt'];
    const missingDeps = requiredDeps.filter(dep => !pkg.dependencies?.[dep]);

    if (missingDeps.length > 0) {
        console.log(`❌ Dependências ausentes: ${missingDeps.join(', ')}`);
    } else {
        console.log('✅ Todas as dependências estão listadas');
    }
} catch (error) {
    console.log('❌ Erro ao ler package.json:', error.message);
}

console.log('\n🚀 Comandos para resolver problemas:');
console.log('1. Instalar dependências: npm install');
console.log('2. Instalar dependências específicas: npm install jsonwebtoken bcrypt');
console.log('3. Iniciar servidor: npm start');
console.log('4. Verificar logs: node server.js');

console.log('\n📞 Se o problema persistir:');
console.log('1. Verifique se a porta 3000 está livre');
console.log('2. Verifique os logs do console');
console.log('3. Tente reiniciar o terminal/IDE');
console.log('4. Execute: node diagnose.js');