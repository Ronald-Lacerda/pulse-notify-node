# Sistema de Logs - Pulso Notify

## Visão Geral

O sistema de logs foi implementado para substituir os `console.log` por um sistema robusto de logging no banco de dados MongoDB. Isso permite melhor rastreabilidade, auditoria e análise dos eventos do sistema.

## Estrutura do Log

Cada log contém as seguintes informações:

```javascript
{
    level: 'info' | 'warning' | 'error' | 'security',
    message: 'Mensagem descritiva do evento',
    category: 'auth' | 'notification' | 'admin' | 'subscription' | 'tracking' | 'system',
    userId: 'ID do usuário (opcional)',
    adminId: 'ID do admin (opcional)',
    metadata: { /* dados adicionais específicos do evento */ },
    timestamp: Date,
    ip: 'IP da requisição (opcional)',
    userAgent: 'User Agent da requisição (opcional)'
}
```

## Níveis de Log

### 1. **info**
- Eventos normais do sistema
- Logins bem-sucedidos
- Criação/modificação de recursos
- Envio de notificações

### 2. **warning**
- Situações que merecem atenção mas não são críticas
- Tentativas de acesso a recursos inexistentes
- Operações que falharam mas foram recuperadas

### 3. **error**
- Erros do sistema
- Falhas em operações críticas
- Problemas de conectividade

### 4. **security**
- Eventos relacionados à segurança
- Tentativas de acesso inválido
- Logins de Super Admin
- Alterações críticas no sistema

## Categorias de Log

### 1. **auth** - Autenticação
- Logins de admins
- Validações de token
- Tentativas de acesso negado

### 2. **notification** - Notificações
- Envio de notificações
- Reenvio de notificações
- Estatísticas de entrega

### 3. **admin** - Administração
- Criação de novos admins
- Alteração de status de admins
- Operações administrativas

### 4. **subscription** - Subscrições
- Registro de novos usuários
- Remoção de usuários
- Alterações de status

### 5. **tracking** - Rastreamento
- Cliques em links de rastreamento
- Estatísticas de engajamento

### 6. **system** - Sistema
- Limpeza de logs
- Manutenção do sistema
- Operações de infraestrutura

## Eventos Importantes Logados

### Segurança
- ✅ Tentativas de acesso com channelId inválido
- ✅ Logins de Super Admin
- ✅ Criação de admins por Super Admin
- ✅ Alterações de status por Super Admin

### Autenticação
- ✅ Logins de admins bem-sucedidos
- ✅ Tentativas de login falharam (via console.error)

### Administração
- ✅ Criação de novos admins
- ✅ Alteração de status de admins
- ✅ Remoção de usuários

### Notificações
- ✅ Envio de notificações (com estatísticas)
- ✅ Reenvio de notificações
- ✅ Links de rastreamento criados

### Rastreamento
- ✅ Cliques em links de rastreamento
- ✅ Dados de engajamento

## APIs para Gerenciamento de Logs

### Visualizar Logs (Super Admin)
```
GET /api/super-admin/logs?category=auth&limit=100
GET /api/super-admin/logs?level=security&limit=50
GET /api/super-admin/logs?limit=200
```

### Limpar Logs Antigos (Super Admin)
```
DELETE /api/super-admin/logs/cleanup
Body: { "daysToKeep": 30 }
```

## Uso do LogService

### Importação
```javascript
const logService = require('./services/logService');
```

### Métodos Principais

#### Log Simples
```javascript
await logService.info('Mensagem', 'categoria', { dados: 'extras' });
await logService.warning('Aviso', 'categoria', { dados: 'extras' });
await logService.error('Erro', 'categoria', { dados: 'extras' });
await logService.security('Evento de segurança', 'categoria', { dados: 'extras' });
```

#### Log com Contexto
```javascript
// Com usuário
await logService.logWithUser('info', 'Mensagem', 'categoria', userId, metadata);

// Com admin
await logService.logWithAdmin('info', 'Mensagem', 'categoria', adminId, metadata);

// Com requisição HTTP
await logService.logWithRequest('info', 'Mensagem', 'categoria', req, metadata);
```

## Benefícios

1. **Auditoria Completa**: Todos os eventos importantes são registrados com timestamp e contexto
2. **Rastreabilidade**: Possível rastrear ações por usuário, admin ou categoria
3. **Segurança**: Logs de segurança separados para análise de tentativas de acesso
4. **Performance**: Logs assíncronos que não impactam a performance da aplicação
5. **Manutenção**: Sistema de limpeza automática de logs antigos
6. **Análise**: Possibilidade de criar dashboards e relatórios baseados nos logs

## Limpeza Automática

O sistema inclui funcionalidade para limpeza automática de logs antigos:
- Padrão: mantém logs dos últimos 30 dias
- Configurável via API
- Executado apenas por Super Admins

## Considerações de Performance

- Logs são salvos de forma assíncrona
- Em caso de erro no sistema de log, a aplicação continua funcionando
- Índices otimizados para consultas rápidas por timestamp, categoria e nível
- Limpeza automática previne crescimento excessivo do banco

## Migração dos Console.log

### Removidos Completamente
- ❌ Logs de debug de endpoints
- ❌ Logs de dados recebidos em requisições
- ❌ Logs de compatibilidade
- ❌ Logs verbosos de inicialização

### Mantidos como Console.error
- ✅ Erros críticos do sistema
- ✅ Erros de conexão com banco
- ✅ Falhas em operações essenciais

### Convertidos para Banco
- ✅ Todos os eventos de segurança
- ✅ Logins e autenticação
- ✅ Operações administrativas
- ✅ Envio de notificações
- ✅ Rastreamento de cliques

## Próximos Passos

1. Implementar dashboard de logs no painel do Super Admin
2. Adicionar alertas automáticos para eventos críticos
3. Implementar exportação de logs para análise externa
4. Criar relatórios automáticos de segurança