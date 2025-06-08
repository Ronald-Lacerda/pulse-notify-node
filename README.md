# Pulso Notify - Sistema de Notificações Push com MongoDB

Sistema completo de notificações push web com painel administrativo e persistência em MongoDB.

## 🚀 Funcionalidades

- ✅ Notificações push web
- ✅ Painel administrativo completo
- ✅ Múltiplos administradores
- ✅ Rastreamento de cliques
- ✅ Estatísticas detalhadas
- ✅ Persistência em MongoDB
- ✅ Autenticação JWT
- ✅ Interface responsiva

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- MongoDB (local ou remoto)
- Navegador com suporte a Service Workers

## 🛠️ Instalação

1. **Clone o repositório:**
```bash
git clone <url-do-repositorio>
cd pulso-notify
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure o MongoDB:**

   **Opção A - MongoDB Local:**
   - Instale o MongoDB em sua máquina
   - Inicie o serviço MongoDB
   - O sistema conectará automaticamente em `mongodb://localhost:27017/pulso-notify`

   **Opção B - MongoDB Remoto (MongoDB Atlas):**
   - Crie uma conta no MongoDB Atlas
   - Crie um cluster e obtenha a string de conexão
   - Defina a variável de ambiente:
   ```bash
   export MONGODB_URI="mongodb+srv://usuario:senha@cluster.mongodb.net/pulso-notify"
   ```

4. **Configure as chaves VAPID (opcional):**
```bash
# Se você quiser usar suas próprias chaves VAPID
export VAPID_PUBLIC_KEY="sua-chave-publica"
export VAPID_PRIVATE_KEY="sua-chave-privada"
export VAPID_EMAIL="seu-email@exemplo.com"
```

5. **Execute a migração (se você tem dados em JSON):**
```bash
npm run migrate
```

6. **Inicie o servidor:**
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🗄️ Migração de Dados

Se você já possui dados em arquivos JSON do sistema anterior, execute o script de migração:

```bash
npm run migrate
```

Este script irá:
- Conectar ao MongoDB
- Ler os arquivos JSON existentes (admins.json, subscriptions.json, notifications.json, clicks.json)
- Migrar todos os dados para o MongoDB
- Manter a compatibilidade com os dados existentes

## 🔧 Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `PORT` | Porta do servidor | `3000` |
| `MONGODB_URI` | String de conexão MongoDB | `mongodb://localhost:27017/pulso-notify` |
| `JWT_SECRET` | Chave secreta para JWT | Gerada automaticamente |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID | Gerada automaticamente |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID | Gerada automaticamente |
| `VAPID_EMAIL` | Email para VAPID | `mailto:admin@exemplo.com` |

### Estrutura do Banco de Dados

O sistema utiliza as seguintes coleções no MongoDB:

- **admins**: Administradores do sistema
- **subscriptions**: Inscrições de usuários
- **notifications**: Histórico de notificações enviadas
- **clicks**: Rastreamento de cliques em links

## 🚀 Uso

### Acesso ao Sistema

1. **Página Principal:** `http://localhost:3000`
2. **Painel Admin:** `http://localhost:3000/admin`
3. **Documentação:** `http://localhost:3000/documentation`

### Credenciais Padrão

- **Usuário:** `admin`
- **Senha:** `admin123`

### API Endpoints

#### Públicos
- `GET /api/vapid-public-key` - Chave pública VAPID
- `POST /api/subscribe` - Registrar inscrição

#### Autenticação
- `POST /api/admin/login` - Login de administrador
- `POST /api/admin/validate` - Validar token
- `POST /api/admin/create` - Criar administrador
- `GET /api/admin/list` - Listar administradores

#### Protegidos (requerem autenticação)
- `GET /api/users` - Listar usuários
- `DELETE /api/users/:userId` - Remover usuário
- `POST /api/notify-all` - Enviar notificação para todos
- `GET /api/notifications` - Listar notificações
- `POST /api/notifications/:id/resend` - Reenviar notificação
- `GET /api/clicks/stats` - Estatísticas de cliques

## 📊 Funcionalidades Avançadas

### Rastreamento de Cliques
- Links em notificações são automaticamente rastreados
- Estatísticas detalhadas de taxa de cliques
- Histórico completo de interações

### Múltiplos Administradores
- Cada admin vê apenas seus próprios usuários
- Isolamento completo de dados entre admins
- Controle de acesso baseado em JWT

### Estatísticas em Tempo Real
- Total de usuários ativos
- Novos usuários nas últimas 24h
- Taxa de cliques por notificação
- Histórico completo de envios

## 🔒 Segurança

- Autenticação JWT com expiração
- Senhas criptografadas com bcrypt
- Isolamento de dados entre administradores
- Validação de entrada em todos os endpoints

## 🐛 Solução de Problemas

### MongoDB não conecta
```bash
# Verifique se o MongoDB está rodando
sudo systemctl status mongod

# Ou inicie o serviço
sudo systemctl start mongod
```

### Erro de permissões
```bash
# Certifique-se de que o usuário tem permissões no diretório
chmod -R 755 .
```

### Notificações não funcionam
- Verifique se o site está sendo servido via HTTPS (necessário para Service Workers)
- Confirme se as chaves VAPID estão configuradas corretamente
- Teste em um navegador compatível (Chrome, Firefox, Edge)

## 📝 Logs

O sistema gera logs detalhados para:
- Conexões de usuários
- Envio de notificações
- Erros de autenticação
- Operações do banco de dados

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no repositório ou entre em contato através do email configurado nas chaves VAPID.