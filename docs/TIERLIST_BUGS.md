# 🐛 Tierlist de Bugs e Erros - BarberHub

**Data da Análise:** 06/01/2026  
**Escopo:** Componentes, API Routes, Fluxo de Pagamentos  
**Excluído:** RLS (Row Level Security)

---

## 🔴 TIER S - CRÍTICOS (Devem ser corrigidos imediatamente)

### 1. GestaoFinanceira.tsx - Falta de filtro por tenant_id
**Arquivo:** `components/dashboard/GestaoFinanceira.tsx`  
**Linha:** 76-98  
**Descrição:** O componente busca transações SEM filtrar por `tenant_id`, expondo dados financeiros de TODOS os tenants.  
**Impacto:** Vazamento de dados financeiros entre tenants (violação de segurança)  
**Correção:** Adicionar `useAuth()` e filtrar `.eq('tenant_id', tenant.id)`

### 2. GestaoFinanceira.tsx - Insert sem tenant_id
**Arquivo:** `components/dashboard/GestaoFinanceira.tsx`  
**Linha:** 129-143  
**Descrição:** Ao salvar transação, não inclui `tenant_id` no insert.  
**Impacto:** Transações podem não ser associadas ao tenant correto  
**Correção:** Adicionar `tenant_id: tenant.id` no objeto de insert

---

## 🟠 TIER A - ALTOS (Devem ser corrigidos em breve)

### 3. CardMetrica.tsx - Classes Tailwind dinâmicas não funcionam
**Arquivo:** `components/dashboard/CardMetrica.tsx`  
**Linha:** 29-30  
**Descrição:** Usa template strings para classes Tailwind (`bg-${cor}-100`), que não são compiladas corretamente pelo Tailwind purge.  
**Impacto:** Cores não aparecem corretamente em produção  
**Correção:** Usar objeto de mapeamento para classes ou safelist no Tailwind

### 4. ModalRemarcacao.tsx - Horário fixo 08:00-18:00
**Arquivo:** `components/dashboard/ModalRemarcacao.tsx`  
**Linha:** 187-190  
**Descrição:** Horários de funcionamento hardcoded (08:00-18:00) ignorando configuração do tenant.  
**Impacto:** Não respeita horários personalizados da barbearia  
**Correção:** Buscar configuração de horários do tenant

### 5. CalendarioSemanalNovo.tsx - HORAS_DIA fixo
**Arquivo:** `components/dashboard/CalendarioSemanalNovo.tsx`  
**Linha:** 43  
**Descrição:** Array de horas fixo (7h-20h) não respeita configuração do tenant.  
**Impacto:** Calendário mostra horários que podem não ser de funcionamento  
**Correção:** Buscar horários de funcionamento da configuração

---

## 🟡 TIER B - MÉDIOS (Devem ser corrigidos quando possível)

### 6. GestaoEstoque - Componente não encontrado/não usado
**Arquivo:** Referenciado mas não existe ou está vazio  
**Descrição:** Importado no dashboard mas pode não funcionar corretamente  
**Impacto:** Funcionalidade de estoque pode estar quebrada  
**Correção:** Verificar se componente existe e funciona

### 7. Notificações WhatsApp - URL hardcoded
**Arquivo:** Vários componentes  
**Linha:** BOT_URL = 'https://bot-barberhub.fly.dev'  
**Descrição:** URL do bot hardcoded em múltiplos arquivos  
**Impacto:** Difícil manutenção, não funciona em ambientes diferentes  
**Correção:** Mover para variável de ambiente

### 8. CalendarioAgendamentos.tsx - Uso de alert() nativo
**Arquivo:** `components/dashboard/CalendarioAgendamentos.tsx`  
**Linha:** 365, 427, 430  
**Descrição:** Usa `alert()` nativo em vez de toast/modal do sistema  
**Impacto:** UX inconsistente, não segue design system  
**Correção:** Substituir por toast system

### 9. ModalRemarcacao.tsx - Uso de alert() nativo
**Arquivo:** `components/dashboard/ModalRemarcacao.tsx`  
**Linha:** 220, 249, 254  
**Descrição:** Usa `alert()` nativo para feedback  
**Impacto:** UX inconsistente  
**Correção:** Substituir por toast/modal

---

## 🟢 TIER C - BAIXOS (Melhorias de qualidade)

### 10. Console.log em produção
**Arquivos:** Múltiplos componentes  
**Descrição:** Vários `console.log` deixados em código de produção  
**Impacto:** Performance leve, poluição de console  
**Correção:** Remover ou usar logger condicional

### 11. Dependências em useEffect sem exaustão
**Arquivos:** Alguns componentes  
**Descrição:** Alguns useEffect não têm todas dependências listadas  
**Impacto:** Pode causar comportamentos inesperados  
**Correção:** Adicionar dependências faltantes

### 12. Tipagem any em múltiplos lugares
**Arquivos:** Vários componentes  
**Descrição:** Uso de `any` em vez de tipos específicos  
**Impacto:** Perda de type safety  
**Correção:** Definir interfaces apropriadas

### 13. localStorage sem verificação de SSR
**Arquivos:** Alguns componentes  
**Descrição:** Acesso a localStorage pode falhar em SSR  
**Impacto:** Erro em hydration  
**Correção:** Verificar `typeof window !== 'undefined'`

---

## 🔵 TIER D - COSMÉTICOS (Nice to have)

### 14. Textos misturando português/inglês
**Arquivos:** Alguns componentes  
**Descrição:** Variáveis em inglês com textos em português  
**Impacto:** Inconsistência de nomenclatura  
**Correção:** Padronizar para português brasileiro

### 15. Componentes sem memoização
**Arquivos:** Listas grandes de cards  
**Descrição:** Componentes de lista sem React.memo  
**Impacto:** Re-renders desnecessários  
**Correção:** Adicionar memo onde apropriado

---

## 📊 Resumo

| Tier | Quantidade | Prioridade |
|------|------------|------------|
| S - Críticos | 2 | Imediata |
| A - Altos | 2 | Alta |
| B - Médios | 4 | Média |
| C - Baixos | 4 | Baixa |
| D - Cosméticos | 2 | Opcional |
| **Total** | **14** | - |

---

## ✅ Ações Recomendadas

1. **Urgente:** Corrigir bugs Tier S (vazamento de dados financeiros)
2. **Próxima Sprint:** Corrigir Tier A (UX e configurações)
3. **Backlog:** Tier B e C
4. **Opcional:** Tier D

---

## 🔧 Fluxo de Pagamentos - Análise

### Status: ✅ Funcional

O fluxo de pagamentos está implementado corretamente:

1. **Trial termina** → Cliente vê tela de bloqueio ao acessar /admin
2. **Botão "Pagar com PIX"** → Abre modal com QR Code do Mercado Pago
3. **Cliente paga** → Webhook recebe notificação
4. **Sistema atualiza** → Salva dia_cobranca, calcula próximo pagamento
5. **Plano ativado** → trial_fim = próximo mês (mesmo dia)

### Pontos de Atenção:
- Webhook precisa URL pública configurada no Mercado Pago
- Worker Cloudflare serve como backup para verificar pagamentos pendentes
- Credenciais do Mercado Pago estão configuradas no código (mover para .env em produção)
