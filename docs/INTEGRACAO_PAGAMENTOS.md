# Integração de Pagamentos PIX - BarberHub

## Visão Geral

Sistema de pagamentos via PIX integrado com **Mercado Pago** e verificação automática via **Cloudflare Workers**.

---

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   /dzndev       │────▶│  API Pagamentos  │────▶│  Mercado Pago   │
│  (Admin Panel)  │     │  /api/pagamentos │     │     API         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │    Supabase      │◀────│   Webhook MP    │
                        │   (pagamentos)   │     │                 │
                        └──────────────────┘     └─────────────────┘
                               ▲
                               │
                        ┌──────────────────┐
                        │ Cloudflare Worker│
                        │ (verificação)    │
                        └──────────────────┘
```

---

## Configuração

### 1. Variáveis de Ambiente (.env.local)

```bash
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (já existentes)
NEXT_PUBLIC_SUPABASE_URL=https://euoexutuawrqxhlqtkud.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URL pública (para webhooks)
NEXT_PUBLIC_URL=https://barberhub.online
```

### 2. Obter Access Token do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Crie uma aplicação ou use existente
3. Vá em **Credenciais de Produção**
4. Copie o **Access Token**

### 3. Configurar Webhook no Mercado Pago

1. No painel do desenvolvedor, vá em **Webhooks**
2. Adicione URL: `https://barberhub.online/api/pagamentos/webhook`
3. Selecione eventos: `payment`

---

## Cloudflare Worker

### Instalação

```bash
cd workers/verificar-pagamentos

# Instalar dependências
npm install @cloudflare/workers-types

# Configurar secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put MERCADO_PAGO_ACCESS_TOKEN

# Deploy
wrangler deploy
```

### Configuração (wrangler.toml)

```toml
name = "barberhub-verificar-pagamentos"
main = "index.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["*/5 * * * *"]  # Executa a cada 5 minutos
```

---

## API Routes

### POST /api/pagamentos/criar

Cria um novo pagamento PIX.

**Request:**
```json
{
  "tenantId": "uuid-do-tenant",
  "plano": "basico",
  "criadoPor": "admin"
}
```

**Response:**
```json
{
  "sucesso": true,
  "pagamentoId": "123456789",
  "qrCodeBase64": "base64...",
  "copiaCola": "00020126...",
  "dataExpiracao": "2024-01-01T12:30:00Z",
  "valor": 39.90
}
```

### GET /api/pagamentos/status

Consulta status de um pagamento.

**Query params:**
- `pagamentoId` - ID do pagamento no Mercado Pago
- `tenantId` - ID do tenant (alternativa)

**Response:**
```json
{
  "status": "pendente|aprovado|rejeitado|expirado",
  "valor": 39.90,
  "dataCriacao": "2024-01-01T12:00:00Z",
  "dataExpiracao": "2024-01-01T12:30:00Z"
}
```

### POST /api/pagamentos/webhook

Recebe notificações do Mercado Pago (chamado automaticamente).

---

## Tabela no Supabase

```sql
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  mercado_pago_id TEXT UNIQUE,
  qr_code TEXT,
  qr_code_base64 TEXT,
  copia_cola TEXT,
  valor NUMERIC(10,2),
  plano TEXT DEFAULT 'basico',
  status TEXT CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado', 'expirado')),
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  data_expiracao TIMESTAMPTZ,
  data_pagamento TIMESTAMPTZ,
  metadados JSONB
);
```

---

## Fluxo de Pagamento

1. **Admin gera PIX** no /dzndev
2. **API cria pagamento** no Mercado Pago
3. **QR Code exibido** no modal
4. **Usuário paga** via app do banco
5. **Webhook notifica** a API
6. **Plano ativado** automaticamente
7. **Worker verifica** pagamentos pendentes (backup)

---

## Valor do Plano

**R$ 39,90/mês** - Valor único para todos os planos.

---

## Componentes Criados

| Arquivo | Descrição |
|---------|-----------|
| `lib/mercado-pago.ts` | Serviço de integração com MP |
| `app/api/pagamentos/criar/route.ts` | API para criar PIX |
| `app/api/pagamentos/webhook/route.ts` | Webhook do MP |
| `app/api/pagamentos/status/route.ts` | Consulta de status |
| `components/pagamentos/ModalPagamentoPix.tsx` | Modal com QR Code |
| `workers/verificar-pagamentos/` | Worker Cloudflare |

---

## Teste Local

1. Use ngrok para expor localhost: `ngrok http 3000`
2. Configure webhook no MP com URL do ngrok
3. Gere PIX pelo /dzndev
4. Use conta de teste do MP para pagar

---

## Produção

1. Configure variáveis de ambiente na Vercel
2. Deploy do Worker no Cloudflare
3. Configure webhook com URL de produção
4. Teste com valores reais (centavos primeiro)
