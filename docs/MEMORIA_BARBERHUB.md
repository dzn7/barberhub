# Memória técnica — BarberHub (Next.js + Supabase)

> Documento interno para entendimento do sistema “como está hoje”.
>
> Escopo: **somente leitura** (não altera nada no Supabase). Consolida o que existe no código e no schema `public` do Postgres.

## 1) Visão geral

O BarberHub é um SaaS multi-tenant (multi-negócio) onde cada “negócio” é um `tenant` identificado por `slug`.

- **Frontend público**: páginas por `slug` (ex.: `/{slug}`) com listagem de serviços, profissionais, portfólio e fluxo de agendamento.
- **Admin do tenant**: `/admin` (painel do proprietário) para gerir agenda, serviços, profissionais, clientes, configurações e finanças.
- **Super Admin**: `/dzndev` (painel SaaS) para gestão global do produto.
- **Backend**: Supabase (Postgres) como fonte de verdade + rotas API do Next.js para integrações sensíveis (Mercado Pago, métricas administrativas, upload/R2).
- **Bot WhatsApp**: serviço separado (`bot-barberhub/`) rodando em Fly.io; escuta eventos e envia mensagens via WhatsApp (Baileys).

## 2) Estrutura do repositório

- `app/`: Next.js App Router (público, admin, APIs)
- `components/`: componentes de UI e módulos de domínio (agenda, dashboard, superadmin etc.)
- `contexts/`: providers de tema e autenticação
- `lib/`: integrações (Supabase client, Mercado Pago, PWA, utils)
- `docs/`: documentação (pagamentos, terminologia etc.)
- `bot-barberhub/`: serviço Node/Express do bot de notificações WhatsApp
- `workers/`: pasta de workers (observação: está excluída do `tsconfig.json`)

## 3) Rotas principais (Next.js)

### Público

- `app/page.tsx`: landing do SaaS
- `app/[slug]/page.tsx`: home pública do tenant
- `app/[slug]/agendar/page.tsx`: fluxo de agendamento do tenant
- `app/[slug]/manifest.ts`: manifest PWA dinâmico por tenant

Pontos importantes:
- O layout do tenant (`app/[slug]/layout.tsx`) aplica tema (cores) a partir do registro `tenants` e registra SW/PWA.
- No agendamento, datas/horas são convertidas para UTC antes de gravar (uso de timezone “Brasília”).

### Admin (tenant)

- `app/admin/layout.tsx` e `app/admin/page.tsx`: shell e dashboard do proprietário
- Módulos de gestão ficam majoritariamente em `components/dashboard/*` e `components/configuracao/*`.

### Área de “colaborador” / barbeiro

- Existem rotas e componentes para fluxo “barbeiro” (ex.: criação de agendamento com o barbeiro pré-selecionado), além de login separado em `app/colaborador/entrar/page.tsx`.

### Super Admin (SaaS)

- `app/dzndev/page.tsx`: painel global
- Componentes em `components/superadmin/*`

### Rotas API (Next)

- Pagamentos:
  - `app/api/pagamentos/criar/route.ts` (cria PIX e grava em `pagamentos`)
  - `app/api/pagamentos/status/route.ts` (consulta e atualiza `pagamentos` / ativa plano)
  - `app/api/pagamentos/webhook/route.ts` (webhook MP)
- Upload/R2:
  - `app/api/upload/route.ts`
  - `app/api/gerar-icones-pwa/route.ts`
- Admin SaaS:
  - `app/api/admin/metricas/route.ts`
  - `app/api/admin/usuarios-auth/route.ts`

Observação: várias dessas rotas usam `SUPABASE_SERVICE_ROLE_KEY` para operar com privilégios elevados.

## 4) Multi-tenancy (conceito e implementação)

O `tenant` é a unidade central.

- Tabelas de domínio quase sempre possuem `tenant_id` e FKs para `tenants(id)`.
- A navegação pública usa `slug` para localizar `tenants`.
- O admin do tenant obtém `tenant` via contexto de autenticação (carrega `proprietarios` e o `tenant` associado).

### Criação de tenant (onboarding/registro)

No cadastro (`app/registrar/page.tsx`), após criar o usuário no Supabase Auth, o app chama RPC:

- `rpc('criar_novo_tenant', { p_slug, p_nome, p_email, p_telefone, p_user_id, p_tipo_negocio })`

Tipos oficiais de `p_tipo_negocio`/`tenants.tipo_negocio`:
- `barbearia`
- `nail_designer`
- `lash_designer`
- `cabeleireira`

A função do banco (ver seção de “funções”) cria:
- registro em `tenants`
- registro em `proprietarios` (vinculando `auth.uid()`/`user_id` ao tenant)
- registro padrão em `configuracoes_barbearia`
- serviços exemplo + categorias exemplo

No cadastro web, o tema visual muda conforme tipo:
- `barbearia`: tom neutro atual
- `nail_designer`, `lash_designer`, `cabeleireira`: variação rosa suave (segmento feminino)

## 5) Modelo de dados (Supabase / Postgres — schema `public`)

Abaixo uma visão “por domínio” das tabelas existentes em `public`.

### Núcleo SaaS

- `tenants`: dados do negócio (slug, nome, contato, cores, plano, trial, limites, ícones PWA)
- `proprietarios`: mapeia usuário do Supabase Auth (`user_id`) ao tenant e papel (enum `role_usuario`)

Defaults e comportamento notável (via defaults do banco):
- `tenants.plano` default `trial`
- `tenants.trial_inicio` default `now()` e `tenants.trial_fim` default `now() + 14 days`
- `tenants.*cor*` possuem defaults (cores hex em texto)

### Agenda

- `agendamentos`: agendamentos (cliente, profissional, serviço, status, datas de transição, avaliação)
- `historico_agendamentos`: trilha simples de alterações (data/hora anterior/nova)
- `horarios_bloqueados`: bloqueios por data/hora (manual e possivelmente outros tipos)
- `horarios_disponiveis`: disponibilidade semanal por profissional

### Pessoas

- `clientes`
- `barbeiros` (inclui `token_acesso` e flags como `token_ativo`, `is_proprietario`)

### Catálogo

- `servicos`
- `precos_barbeiro`: preço/duração por (barbeiro, serviço)

### Conteúdo / Portfólio

- `trabalhos` (imagens e contador `curtidas`)
- `categorias_trabalhos`
- `curtidas_trabalhos` (controle por IP; unique `(trabalho_id, ip_address)`)
- `comentarios_trabalhos`
- `avaliacoes_publicas`

### Configuração

- `configuracoes`: chave/valor (jsonb)
- `configuracoes_barbearia`: horário de funcionamento, intervalos, flags, etc.
- `historico_configuracoes`

### Financeiro e assinatura

- `pagamentos` (PIX Mercado Pago)
- `assinaturas` (estado de assinatura/plano)
- `transacoes` (enum `tipo_transacao`, categoria, forma_pagamento)
- `comissoes` (comissão de profissional)

### Estoque

- `produtos`
- `movimentacoes_estoque`

### Admin interno

- `usuarios_admin`: tabela de usuários internos “do tenant” (separada do Supabase Auth)

### Integração WhatsApp/bot

- `notificacoes_enviadas`: log/controle de envios
- `whatsapp_auth`: armazenamento de credenciais/estado do WhatsApp (sequência `whatsapp_auth_id_seq`)

## 6) Enums (Postgres)

Enums relevantes existentes (valores observados):
- `forma_pagamento`: dinheiro, pix, debito, credito, transferencia
- `status_agendamento`: pendente, confirmado, concluido, cancelado
- `plano_assinatura`: trial, basico, profissional, enterprise
- `status_assinatura`: ativa, pendente, cancelada, expirada, suspensa
- `role_usuario`: super_admin, owner, admin, manager, operator
- `tipo_transacao` / `categoria_despesa` / `tipo_movimentacao`: usados no financeiro/estoque

## 7) Funções (RPC) e triggers

### Funções (schema `public`)

Funções observadas e relevantes:

- `criar_novo_tenant(...) RETURNS uuid` (**SECURITY DEFINER**)
  - valida slug único
  - cria tenant
  - cria proprietário (se `p_user_id` não nulo)
  - cria `configuracoes_barbearia`
  - cria serviços e categorias exemplo
  - possui versão com `p_tipo_negocio` com seed por tipo:
    - `barbearia`
    - `nail_designer`
    - `lash_designer`
    - `cabeleireira`

- `usuario_pertence_tenant(tid uuid) RETURNS boolean` (**SECURITY DEFINER**)
  - retorna `EXISTS` em `proprietarios` com `user_id = auth.uid()` e `tenant_id = tid`

- `obter_tenant_id_usuario() RETURNS uuid` (**SECURITY DEFINER**)
  - busca `tenant_id` em `proprietarios` para `auth.uid()`

- `incrementar_curtidas(trabalho_uuid uuid)` / `decrementar_curtidas(trabalho_uuid uuid)` (**SECURITY DEFINER**)
  - atualizam o contador `trabalhos.curtidas`

### Triggers

Triggers observadas (tendência geral):
- triggers de “timestamp” em tabelas com `criado_em/atualizado_em`
- automações pós-update em `agendamentos` (criar comissão, criar transação)
- automação pós-insert em `movimentacoes_estoque` (atualizar estoque)

Essas automações indicam que parte das regras de negócio (financeiro/comissão/estoque) está no banco.

## 8) RLS e políticas (atenção)

Há políticas cadastradas (`pg_policies`) seguindo o padrão:
- leitura pública para entidades públicas do tenant (ex.: `tenants` ativos, `servicos` ativos, `barbeiros` ativos, `trabalhos` ativos)
- gestão por proprietário condicionada por `usuario_pertence_tenant(tenant_id)`

**Porém**, na inspeção do catálogo (`pg_tables.rowsecurity`), o RLS aparece como:
- `precos_barbeiro`: **RLS habilitado**
- demais tabelas: **RLS desabilitado**

Implicação: políticas existentes **não são aplicadas** quando RLS está desligado na tabela. Isso é um ponto crítico para revisar com cuidado no projeto (ver seção “Riscos”).

## 9) Realtime / replica identity

Para Realtime, uma nuance importante é o `REPLICA IDENTITY`:
- `tenants` e `agendamentos`: `relreplident = 'f'` (FULL)
- a maioria das demais tabelas: `relreplident = 'd'` (DEFAULT)

FULL costuma aumentar o payload de eventos de UPDATE (inclui linha inteira). Isso é relevante para custo/latência e para a forma como o bot/superadmin detectam “antes/depois”.

## 10) Integrações

### Supabase

- Cliente do frontend em `lib/supabase.ts` (PKCE + persistência de sessão)
- Uso de Service Role nas rotas API para:
  - criar/atualizar cobranças
  - acessar Supabase Auth Admin (listar/excluir usuários)
  - métricas administrativas

### Mercado Pago (PIX)

- Integração central em `lib/mercado-pago.ts`
- Fluxo: `criar` → grava em `pagamentos` → `status/webhook` atualiza `pagamentos` e ajusta estado do `tenant`
- Detalhes do MP também estão em `docs/INTEGRACAO_PAGAMENTOS.md`

### Cloudflare R2 (uploads)

- `app/api/upload/route.ts`: recebe arquivo via form-data, valida tipo/tamanho, envia ao R2
- `app/api/gerar-icones-pwa/route.ts`: gera `192x192` e `512x512` via `sharp` e sobe no R2

### Bot WhatsApp (Fly.io)

Pasta `bot-barberhub/`:
- Express server com rotas de health e envio de mensagens
- Escuta mudanças (Realtime/polling) em:
  - `tenants` (boas-vindas quando WhatsApp é cadastrado)
  - `agendamentos` (confirmação, cancelamento, remarcação)
- Terminologia dinâmica por tipo de negócio (`barbearia`, `nail_designer`, `lash_designer`, `cabeleireira`)
- Registra idempotência/status em `notificacoes_enviadas`

## 11) Variáveis de ambiente (principais)

Aplicação Next.js (tendência):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BOT_URL` (fallback observado para URL do Fly)
- Credenciais/keys do Mercado Pago (idealmente aqui)
- Variáveis de R2 (`CLOUDFLARE_R2_*`)

Bot (`bot-barberhub`): ver `bot-barberhub/README.md` para lista completa.

## 12) Riscos e pontos de atenção (técnicos)

1) **RLS aparentemente desabilitado na maioria das tabelas**
   - As policies existem, mas sem RLS ligado não protegem dados. Isso impacta isolamento entre tenants.

2) **Credenciais hardcoded / segredos no código**
   - Existem trechos com credenciais/headers estáticos (ex.: header admin e credenciais do painel superadmin; e fallback de MP no código). Isso deve ser tratado como risco de segurança.

3) **Service Role em rotas API**
   - Correto para operações administrativas, mas exige validação robusta do caller (authn/authz). Atualmente há endpoints protegidos por header simples.

4) **Super Admin (`/dzndev`)**
   - O login é feito no client e usa valores fixos no código (e sessionStorage). É prático, porém frágil.

## 13) Onde mexer quando for evoluir

- UX/fluxo de agendamento: `app/[slug]/agendar/page.tsx` + `components/agendamento/*`
- Gestão do tenant (admin): `app/admin/page.tsx` + `components/dashboard/*`
- Onboarding (mini-gestão): `components/configuracao/BarbeirosMiniGestao.tsx`, `components/configuracao/ServicosMiniGestao.tsx`
- Cobrança: `app/api/pagamentos/*` + `lib/mercado-pago.ts`
- Upload/ícones: `app/api/upload/route.ts`, `app/api/gerar-icones-pwa/route.ts`
- Bot: `bot-barberhub/src/services/*`

## 14) Referências internas

- `docs/INTEGRACAO_PAGAMENTOS.md`
- `docs/TERMINOLOGIA_DINAMICA.md`
- `PLANO_NAIL_DESIGNER.md`
