# Use a imagem oficial do Node.js
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências
RUN npm install --only=production

# Copiar o resto dos arquivos
COPY . .

# Expor a porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]