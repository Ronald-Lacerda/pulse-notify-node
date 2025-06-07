# Sistema de Notificações Push - Pulso

Um sistema completo de notificações push com autenticação de administradores e links compartilháveis.

## 🚀 Funcionalidades

### Para Usuários
- **Subscrição Simples**: Registro automático de notificações push
- **Links Compartilháveis**: Cada admin possui um link único para captar usuários
- **Multiplataforma**: Funciona em desktop e mobile
- **Offline Ready**: Service Worker para funcionamento offline

### Para Administradores
- **Autenticação Segura**: Sistema de login com JWT
- **Painel de Controle**: Interface completa para gerenciar usuários e notificações
- **Links Personalizados**: Cada admin tem um link único para compartilhar
- **Gestão de Usuários**: Visualizar, filtrar e remover usuários
- **Envio de Notificações**: Individual ou broadcast para todos os usuários
- **Rastreamento**: Acompanhar qual admin captou cada usuário

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- NPM ou Yarn

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd projeto-pulso
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as chaves VAPID**
```bash
npx web-push generate-vapid-keys
```

4. **Atualize as chaves no arquivo `server.js`**
```javascript
const VAPID_KEYS = {
    publicKey: 'SUA_CHAVE_PUBLICA_AQUI',
    privateKey: 'SUA_CHAVE_PRIVADA_AQUI'
};
```

5. **Inicie o servidor**
```bash
npm start
```

6. **Acesse o sistema**
- Página principal: http://localhost:3000
- Login admin: http://localhost:3000/login.html
- Painel admin: http://localhost:3000/admin.html
- Teste de autenticação: http://localhost:3000/test-auth.html
- **📚 Documentação das Rotas: http://localhost:3000/documentation.html**

## 📚 Documentação Interativa

O sistema inclui uma página de documentação completa acessível em:
- http://localhost:3000/documentation.html
- http://localhost:3000/docs
- http://localhost:3000/documentation

### Funcionalidades da Documentação:
- **Visualização de todas as rotas**: Frontend e APIs organizadas por categoria
- **Testes integrados**: Teste APIs diretamente da interface
- **Exemplos de código**: Payloads e respostas para cada endpoint
- **Navegação intuitiva**: Links diretos para cada página do sistema
- **Informações de autenticação**: Detalhes sobre tokens e proteção de rotas

## 👤 Administrador Padrão

O sistema cria automaticamente um administrador padrão:
- **Usuário**: `admin`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere essas credenciais em produção!

## 🔐 Sistema de Autenticação

### Login de Administrador
- Endpoint: `POST /api/admin/login`
- Retorna: Token JWT válido por 24 horas
- Credenciais são verificadas com bcrypt

### Proteção de Rotas
Todas as rotas administrativas requerem autenticação:
- `GET /api/users` - Listar usuários
- `POST /api/notify/:userId` - Enviar notificação individual
- `POST /api/notify-all` - Enviar broadcast
- `DELETE /api/users/:userId` - Remover usuário
- `GET /api/admin/list` - Listar administradores
- `POST /api/admin/create` - Criar novo administrador

## 🔗 Links Compartilháveis

Cada administrador possui um link único no formato:
```
http://localhost:3000/?admin=ADMIN_ID
```

Quando um usuário acessa este link e se registra, ele fica associado ao administrador correspondente.

## 📊 Estrutura de Dados

### Usuários (subscriptions.json)
```json
{
  "user_123": {
    "subscription": { /* dados da subscrição push */ },
    "adminId": "admin1",
    "userAgent": "Mozilla/5.0...",
    "platform": "desktop",
    "language": "pt-BR",
    "timezone": "America/Sao_Paulo",
    "registeredAt": "2024-01-01T10:00:00.000Z",
    "lastSeen": "2024-01-01T10:00:00.000Z",
    "lastNotificationSent": "2024-01-01T11:00:00.000Z",
    "active": true
  }
}
```

### Administradores (admins.json)
```json
{
  "admin1": {
    "id": "admin1",
    "username": "admin",
    "password": "$2b$10$...", // hash bcrypt
    "name": "Administrador Principal",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "active": true
  }
}
```

## 🌐 API Endpoints

### Públicos
- `GET /api/vapid-public-key` - Chave pública VAPID
- `POST /api/subscribe` - Registrar subscrição
- `POST /api/admin/login` - Login de administrador

### Autenticados (requerem Bearer token)
- `POST /api/admin/validate` - Validar token
- `GET /api/admin/list` - Listar administradores
- `POST /api/admin/create` - Criar administrador
- `GET /api/users` - Listar usuários
- `DELETE /api/users/:userId` - Remover usuário
- `POST /api/notify/:userId` - Notificação individual
- `POST /api/notify-all` - Broadcast

## 🔧 Configuração Avançada

### Variáveis de Ambiente
```bash
PORT=3000
JWT_SECRET=sua_chave_secreta_super_segura
```

### Personalização
- **Ícones**: Substitua os ícones em `public/icons/`
- **Cores**: Modifique as classes Tailwind nos arquivos HTML
- **Textos**: Edite os textos diretamente nos arquivos

## 📱 Como Usar

### Para Administradores

1. **Acesse o login**: http://localhost:3000/login.html
2. **Faça login** com suas credenciais
3. **Copie seu link compartilhável** do painel
4. **Compartilhe o link** com seus usuários
5. **Gerencie usuários** e envie notificações pelo painel

### Para Usuários

1. **Acesse o link** fornecido pelo administrador
2. **Clique em "Ativar Notificações"**
3. **Permita notificações** no navegador
4. **Pronto!** Você receberá notificações deste administrador

## 🛡️ Segurança

- **Senhas**: Hash bcrypt com salt 10
- **JWT**: Tokens com expiração de 24 horas
- **CORS**: Configurado para desenvolvimento
- **Validação**: Middleware de autenticação em todas as rotas protegidas

## 🚀 Deploy em Produção

1. **Configure variáveis de ambiente**
2. **Use HTTPS** (obrigatório para push notifications)
3. **Configure CORS** adequadamente
4. **Use banco de dados** em vez de arquivos JSON
5. **Configure logs** e monitoramento
6. **Altere credenciais padrão**

## 📝 Logs

O sistema registra:
- Logins de administradores
- Registros de usuários
- Envios de notificações
- Erros e falhas de entrega

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Use a página de teste: http://localhost:3000/test-auth.html
3. Consulte a documentação da API
4. Abra uma issue no repositório