# Bot WhatsApp BarberHub

Sistema multi-tenant de notificações automáticas via WhatsApp para o BarberHub.
Gerenciado com PM2.

## 🚀 Funcionalidades

- ✉️ **Confirmação de agendamentos** - Envia automaticamente quando cliente agenda
- 📱 **Notificação para barbeiros** - Avisa o profissional sobre novos clientes
- ⏰ **Lembretes automáticos** - 1 hora antes do horário agendado
- ❌ **Notificação de cancelamentos** - Quando agendamento é cancelado
- 🔄 **Notificação de remarcações** - Quando data/hora é alterada
- 🎉 **Boas-vindas para novos tenants** - Quando cadastram WhatsApp
- 🔔 **Lista de espera** - Notifica interessados quando horário é liberado

## 📋 Pré-requisitos

- Node.js 18+
- PM2 instalado globalmente (`npm install -g pm2`)
- Conta no Supabase

## 🛠️ Instalação Local

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Iniciar em desenvolvimento
npm run dev
```

## 🔧 Variáveis de Ambiente

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key
PORT=3001
NODE_ENV=production
BOT_NAME=BarberHub
HORARIO_INICIO_LEMBRETES=08:00
HORARIO_FIM_LEMBRETES=22:00
```

## 🚀 Deploy com PM2

### 1. Instalar PM2 globalmente

```bash
npm install -g pm2
```

### 2. Configurar variáveis de ambiente

```bash
# No servidor, criar arquivo .env
cp .env.example .env
nano .env
```

### 3. Iniciar o bot

```bash
# Usando npm scripts
npm run pm2:start

# Ou diretamente
pm2 start ecosystem.config.js
```

### 4. Comandos úteis PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs barberhub-bot

# Reiniciar
pm2 restart barberhub-bot

# Parar
pm2 stop barberhub-bot

# Monitoramento
pm2 monit

# Salvar estado (para reiniciar após reboot)
pm2 save

# Configurar startup automático
pm2 startup
```

### 5. Acessar QR Code

Acesse `http://seu-servidor:3001/health/qr` para ver o QR Code.

## 📁 Estrutura

```
bot-barberhub/
├── src/
│   ├── config/
│   │   └── database.js       # Conexão Supabase
│   ├── services/
│   │   ├── whatsapp.js       # Conexão Baileys
│   │   ├── notificacoes.js   # Envio de mensagens
│   │   ├── realtime.js       # Supabase Realtime
│   │   ├── lembretes.js      # Sistema de lembretes
│   │   └── lista-espera.js   # Notificação lista de espera
│   ├── routes/
│   │   ├── health.js         # Health check
│   │   └── mensagens.js      # API de mensagens
│   ├── utils/
│   │   ├── logger.js         # Logger
│   │   ├── templates.js      # Templates de mensagens
│   │   ├── telefone.js       # Formatação de telefone
│   │   └── terminologia.js   # Termos por tipo de negócio
│   └── index.js              # Entrada principal
├── logs/                     # Logs do PM2
├── auth_info/                # Credenciais WhatsApp (persistentes)
├── ecosystem.config.js       # Configuração PM2
├── package.json
└── README.md
```

## 🔌 Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | Info básica do bot |
| `/health` | GET | Status completo |
| `/health/qr` | GET | QR Code para conexão |
| `/api/mensagens/enviar` | POST | Enviar mensagem manual |

## 📱 Fluxo de Notificações

1. **Novo Agendamento (INSERT)**
   - Cliente recebe confirmação
   - Barbeiro recebe notificação

2. **Cancelamento (UPDATE status='cancelado')**
   - Cliente recebe aviso de cancelamento
   - Interessados na lista de espera são notificados

3. **Remarcação (UPDATE data_hora)**
   - Cliente recebe nova data/hora

4. **Lembrete (Cron a cada 15min)**
   - Cliente recebe lembrete 1h antes

5. **Novo Tenant (UPDATE whatsapp)**
   - Proprietário recebe boas-vindas

6. **Horário Liberado (Cancelamento detectado)**
   - Clientes na lista de espera são notificados

## 🛡️ Segurança

- Credenciais armazenadas em arquivo .env
- Diretório auth_info/ com credenciais WhatsApp persistentes
- Logs centralizados no diretório logs/
- Health checks via endpoint /health

## 📝 Licença

MIT
