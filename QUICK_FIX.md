# 🚨 Solução Rápida para Erro 404

Se você está recebendo erro 404 no endpoint `/api/admin/login`, siga estes passos:

## 🔧 Passo 1: Instalar Dependências

```bash
npm install jsonwebtoken bcrypt
```

Ou execute o script automático:
```bash
node install-deps.js
```

## 🔍 Passo 2: Verificar Diagnóstico

```bash
node diagnose.js
```

## 🚀 Passo 3: Reiniciar o Servidor

1. **Pare o servidor** (Ctrl+C se estiver rodando)
2. **Inicie novamente**:
```bash
npm start
```

## 🧪 Passo 4: Testar

1. **Acesse**: http://localhost:3000/test-auth.html
2. **Clique em "Fazer Login"**
3. **Verifique se funciona**

## 🔧 Passo 5: Verificar Logs

Se ainda não funcionar, verifique os logs do servidor:
- Procure por erros de módulos não encontrados
- Verifique se todas as dependências foram instaladas
- Confirme que o servidor está rodando na porta 3000

## 📋 Checklist de Verificação

- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor reiniciado
- [ ] Porta 3000 livre
- [ ] Sem erros no console
- [ ] Arquivos `server.js` e `package.json` corretos

## 🆘 Se Nada Funcionar

1. **Delete node_modules**:
```bash
rm -rf node_modules
npm install
```

2. **Teste com servidor simples**:
```bash
node test-server.js
```
Acesse: http://localhost:3001/test

3. **Verifique versão do Node.js**:
```bash
node --version
```
(Requer Node.js 14+)

## 📞 Comandos Úteis

```bash
# Diagnóstico completo
npm run diagnose

# Instalar dependências
npm run install-deps

# Servidor de teste
npm run test-server

# Gerar chaves VAPID
npm run generate-vapid
```