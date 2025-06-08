FROM node:18-alpine

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production

# Copia código fonte
COPY src/ ./src/

# Cria usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Muda propriedade dos arquivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expõe porta
EXPOSE 3000

# Comando para iniciar aplicação
CMD ["npm", "start"]