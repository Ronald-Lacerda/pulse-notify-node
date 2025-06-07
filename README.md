# Service Worker App

Uma aplicação Node.js simples com Service Worker configurado.

## Estrutura do Projeto

```
├── server.js          # Servidor Express principal
├── sw.js              # Service Worker
├── package.json       # Dependências e scripts
├── Dockerfile         # Configuração Docker
├── public/
│   └── index.html     # Página principal
└── README.md          # Este arquivo
```

## Como executar localmente

1. Instalar dependências:
```bash
npm install
```

2. Iniciar o servidor:
```bash
npm start
```

3. Acessar: http://localhost:3000

## Deploy no EasyPanel

1. Faça upload dos arquivos para o EasyPanel
2. Configure a aplicação como Node.js
3. Defina a porta como 3000 (ou use a variável PORT)
4. O EasyPanel irá automaticamente executar `npm start`

## Endpoints

- `/` - Página principal
- `/sw.js` - Service Worker
- `/health` - Health check para monitoramento