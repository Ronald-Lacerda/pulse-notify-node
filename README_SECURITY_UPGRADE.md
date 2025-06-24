# Pulso - Upgrade de Segurança Completo

## 🔐 Visão Geral das Melhorias

Este upgrade implementa um sistema de segurança robusto para o Pulso, substituindo IDs facilmente adivinháveis por Channel IDs criptograficamente seguros e implementando um sistema hierárquico de administração.

## ✨ Principais Melhorias

### 1. Channel IDs Seguros
- **Antes**: `adminId` facilmente adivinháveis (admin_1, admin_2, etc.)
- **Depois**: Channel IDs gerados com `crypto.randomBytes()` (ex: `ch_a7f3k9m2x8q1w5e4`)
- **Benefício**: Impossível de enumerar ou adivinhar

### 2. Sistema Hierárquico
- **Super Admin**: Gerencia administradores
- **Admin**: Gerencia notificações push
- **Separação clara** de responsabilidades

### 3. Autenticação Robusta
- JWT tokens independentes para cada nível
- Validação de permissões
- Logs de segurança detalhados

## 🏗️ Arquitetura Implementada

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Super Admin   │    │      Admin      │    │     Usuário     │
│                 │    │                 │    │                 │
│ • Criar Admins  │    │ • Notificações  │    │ • Recebe Push   │
│ • Gerenciar     │───▶│ • Usuários      │───▶│ • Via Channel   │
│ • Monitorar     │    │ • Estatísticas  │    │   ID Seguro     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Estrutura de Arquivos

### Novos Arquivos Criados
```
models/
├── SuperAdmin.js              # Model do Super Admin

services/
├── superAdminService.js       # Serviços do Super Admin

public/
├── super-admin-login.html     # Login do Super Admin
├── admin-management.html      # Interface de gerenciamento
├── admin-management.js        # Lógica do gerenciamento

scripts/
├── migrate-admins.js          # Script de migração
├── test-channel-security.js   # Teste de segurança

docs/
├── ADMIN_MANAGEMENT.md        # Documentação completa
├── MIGRATION_GUIDE.md         # Guia de migração
└── README_SECURITY_UPGRADE.md # Este arquivo
```

### Arquivos Modificados
```
server.js                      # Endpoints e middleware
services/adminService.js       # Channel ID generation
models/Admin.js               # Schema com channelId
public/script.js              # Uso de channelId
public/admin.js               # Links seguros
public/documentation.html     # Card do Super Admin
```

## 🔑 Credenciais Padrão

### Super Admin
- **URL**: `/super-admin-login.html`
- **Usuário**: `superadmin`
- **Senha**: `SuperAdmin@2024!`

### Admin
- **URL**: `/login.html`
- **Usuário**: `admin`
- **Senha**: `admin123`

⚠️ **ALTERE ESSAS CREDENCIAIS EM PRODUÇÃO!**

## 🚀 Como Usar

### 1. Primeiro Acesso (Super Admin)
```bash
# 1. Inicie o servidor
npm start

# 2. Acesse o Super Admin
http://localhost:3000/super-admin-login.html

# 3. Use credenciais padrão
# 4. Crie novos administradores
```

### 2. Gerenciamento de Admins
```bash
# No painel do Super Admin:
# 1. Criar novo admin
# 2. Copiar Channel ID gerado
# 3. Compartilhar link seguro: ?channel=CHANNEL_ID
```

### 3. Uso Regular (Admin)
```bash
# 1. Login normal em /login.html
# 2. Use painel em /admin.html
# 3. Compartilhe links com Channel ID
```

## 🔒 Recursos de Segurança

### Channel ID Generation
```javascript
// Geração segura com crypto
generateChannelId() {
    return 'ch_' + crypto.randomBytes(16).toString('hex');
}
```

### JWT Authentication
```javascript
// Tokens separados para cada nível
const token = jwt.sign({
    id: admin.id,
    username: admin.username,
    isSuperAdmin: false  // ou true para Super Admin
}, JWT_SECRET, { expiresIn: '24h' });
```

### Logs de Segurança
```javascript
// Logs detalhados para auditoria
console.log(`🔐 SUPER ADMIN LOGIN: ${username}`);
console.log(`🔐 SEGURANÇA: ChannelId ${channelId} resolvido`);
```

## 📊 APIs Implementadas

### Super Admin Endpoints
```
POST   /api/super-admin/login           # Login
POST   /api/super-admin/validate        # Validar token
POST   /api/super-admin/create-admin    # Criar admin
GET    /api/super-admin/admins          # Listar admins
PATCH  /api/super-admin/admin/:id/status # Alterar status
```

### Admin Endpoints (mantidos)
```
POST   /api/admin/login                 # Login
POST   /api/admin/validate              # Validar token
GET    /api/users                       # Listar usuários
POST   /api/notify-all                  # Enviar notificações
```

### Public Endpoints (melhorados)
```
POST   /api/subscribe                   # Aceita channelId
GET    /api/channel/:channelId/validate # Validar channelId
```

## 🔄 Migração Automática

### O que acontece automaticamente:
1. **Admins existentes** recebem Channel IDs
2. **Super Admin padrão** é criado
3. **Compatibilidade** com URLs antigas mantida
4. **Logs** de migração são gerados

### Verificação da migração:
```bash
# Verifique os logs do servidor:
# ✅ Migração de admins executada
# ✅ Super Admin criado
# ✅ Channel IDs gerados
```

## 🧪 Testes de Segurança

### Script de Teste
```bash
node test-channel-security.js
```

### O que é testado:
- Geração de Channel IDs únicos
- Impossibilidade de adivinhação
- Validação de endpoints
- Autenticação de níveis

## 📈 Benefícios Implementados

### Segurança
- ✅ Channel IDs impossíveis de adivinhar
- ✅ Autenticação hierárquica
- ✅ Logs de auditoria
- ✅ Validação de permissões

### Usabilidade
- ✅ Interface intuitiva para Super Admin
- ✅ Migração transparente
- ✅ Compatibilidade mantida
- ✅ Feedback visual completo

### Manutenibilidade
- ✅ Código bem estruturado
- ✅ Documentação completa
- ✅ Testes automatizados
- ✅ Scripts de migração

## 🔧 Configuração de Produção

### Variáveis de Ambiente
```bash
# .env
JWT_SECRET=sua_chave_super_secreta_aqui_min_32_chars
MONGODB_URI=mongodb://localhost:27017/pulso
PORT=3000
NODE_ENV=production
```

### Checklist de Segurança
- [ ] Alterar credenciais padrão
- [ ] Configurar HTTPS
- [ ] Definir JWT_SECRET forte
- [ ] Configurar logs de produção
- [ ] Backup do banco de dados
- [ ] Monitoramento de acesso

## 📚 Documentação Adicional

- **[ADMIN_MANAGEMENT.md](./ADMIN_MANAGEMENT.md)**: Guia completo do sistema
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)**: Processo de migração
- **Interface**: Acesse `/documentation.html` no navegador

## 🆘 Suporte e Troubleshooting

### Problemas Comuns

1. **Token inválido**
   ```bash
   # Solução: Limpar localStorage e fazer login novamente
   localStorage.clear();
   ```

2. **Channel ID não funciona**
   ```bash
   # Verificar logs do servidor
   # Confirmar migração executada
   # Testar com script de teste
   ```

3. **Super Admin não acessa**
   ```bash
   # Verificar se foi criado na inicialização
   # Usar credenciais padrão corretas
   # Verificar logs de erro
   ```

## 🎯 Próximos Passos Recomendados

1. **Alterar credenciais padrão**
2. **Configurar HTTPS**
3. **Implementar rate limiting**
4. **Adicionar 2FA (opcional)**
5. **Configurar backup automático**

---

## 🏆 Resumo do Upgrade

Este upgrade transforma o Pulso de um sistema com IDs facilmente adivinháveis em uma plataforma robusta e segura, com:

- **Channel IDs criptograficamente seguros**
- **Sistema hierárquico de administração**
- **Autenticação JWT robusta**
- **Interface moderna e intuitiva**
- **Logs de segurança detalhados**
- **Migração automática e transparente**

O sistema agora está pronto para uso em produção com segurança empresarial! 🚀