# Bot WhatsApp BarberHub

Sistema multi-tenant de notificações automáticas via WhatsApp para o BarberHub.

## 🚀 Funcionalidades

- ✉️ **Confirmação de agendamentos** - Envia automaticamente quando cliente agenda
- 📱 **Notificação para barbeiros** - Avisa o profissional sobre novos clientes
- ⏰ **Lembretes automáticos** - 1 hora antes do horário agendado
- ❌ **Notificação de cancelamentos** - Quando agendamento é cancelado
- 🔄 **Notificação de remarcações** - Quando data/hora é alterada
- 🎉 **Boas-vindas para novos tenants** - Quando cadastram WhatsApp

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Supabase
- Conta no Fly.io

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
PORT=8080
NODE_ENV=production
BOT_NAME=BarberHub
HORARIO_INICIO_LEMBRETES=08:00
HORARIO_FIM_LEMBRETES=22:00
```

## 🚀 Deploy no Fly.io

### 1. Instalar Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh
```

### 2. Login no Fly.io

```bash
fly auth login
```

### 3. Criar aplicação

```bash
fly apps create bot-barberhub
```

### 4. Criar volume para persistir credenciais

```bash
fly volumes create auth_data --size 1 --region gru
```

### 5. Configurar secrets

```bash
fly secrets set SUPABASE_URL="https://euoexutuawrqxhlqtkud.supabase.co"
fly secrets set SUPABASE_SERVICE_KEY="sua_service_key_aqui"
```

### 6. Deploy

```bash
fly deploy
```

### 7. Ver logs

```bash
fly logs
```

### 8. Acessar QR Code

Acesse `https://bot-barberhub.fly.dev/health/qr` para ver o QR Code.

## 💰 Custos Fly.io

O bot está configurado para rodar dentro do **free tier** ($5/mês):

| Recurso | Configuração | Custo |
|---------|--------------|-------|
| VM | shared-cpu-1x 256MB | ~$1.94/mês |
| Volume | 1GB | ~$0.15/mês |
| Egress | <100GB | Grátis |
| **Total** | | **~$2.09/mês** |

## 📁 Estrutura

```
bot-barberhub/
├── src/
│   ├── config/
│   │   └── database.js      # Conexão Supabase
│   ├── services/
│   │   ├── whatsapp.js      # Conexão Baileys
│   │   ├── notificacoes.js  # Envio de mensagens
│   │   ├── realtime.js      # Supabase Realtime
│   │   └── lembretes.js     # Sistema de lembretes
│   ├── routes/
│   │   └── health.js        # Health check
│   ├── utils/
│   │   ├── logger.js        # Logger
│   │   ├── templates.js     # Templates de mensagens
│   │   └── telefone.js      # Formatação de telefone
│   └── index.js             # Entrada principal
├── Dockerfile               # Container otimizado
├── fly.toml                 # Configuração Fly.io
├── package.json
└── README.md
```

## 🔌 Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | Info básica do bot |
| `/health` | GET | Status completo |
| `/health/qr` | GET | QR Code para conexão |

## 📱 Fluxo de Notificações

1. **Novo Agendamento (INSERT)**
   - Cliente recebe confirmação
   - Barbeiro recebe notificação

2. **Cancelamento (UPDATE status='cancelado')**
   - Cliente recebe aviso de cancelamento

3. **Remarcação (UPDATE data_hora)**
   - Cliente recebe nova data/hora

4. **Lembrete (Cron a cada 15min)**
   - Cliente recebe lembrete 1h antes

5. **Novo Tenant (UPDATE whatsapp)**
   - Proprietário recebe boas-vindas

## 🛡️ Segurança

- Credenciais armazenadas em secrets do Fly.io
- Volume persistente para auth do WhatsApp
- Container roda como usuário não-root
- Health checks automáticos

## 📝 Licença

MIT
