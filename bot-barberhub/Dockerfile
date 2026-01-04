# Dockerfile otimizado para Fly.io free tier
# Bot WhatsApp BarberHub - Minimal footprint

FROM node:20-alpine

# Instalar dependências mínimas necessárias
RUN apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Diretório de trabalho
WORKDIR /app

# Copiar package.json primeiro (cache de dependências)
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production --ignore-scripts \
    && npm cache clean --force

# Copiar código fonte
COPY src/ ./src/

# Criar diretório para autenticação
RUN mkdir -p /app/auth_info && chmod 777 /app/auth_info

# Expor porta
EXPOSE 8080

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Comando de inicialização
CMD ["node", "src/index.js"]
