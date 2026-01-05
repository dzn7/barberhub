# 🎯 Plano de Implementação: Expansão para Nail Designers

> **Objetivo:** Adaptar o sistema BarberHub para suportar tanto Barbearias quanto Nail Designers (e futuramente outros tipos de negócios de beleza).

---

## 📋 Checklist de Implementação

### Fase 1: Infraestrutura Base ✅
- [x] **1.1** Criar migração SQL para adicionar `tipo_negocio` na tabela `tenants`
- [x] **1.2** Criar tipo enum `TipoNegocio` em TypeScript
- [x] **1.3** Criar constantes de configuração por tipo de negócio (`lib/configuracoes-negocio.ts`)
- [x] **1.4** Criar hook `useTerminologia` para textos dinâmicos

### Fase 2: Cadastro e Onboarding ✅
- [x] **2.1** Adaptar página `/registrar` com seleção de tipo de negócio
- [ ] **2.2** Adaptar página `/configurar` (onboarding) para usar terminologia correta
- [x] **2.3** Criar componente `SeletorTipoNegocio`

### Fase 3: Dashboard Administrativo ✅
- [x] **3.1** Adaptar `AuthContext` para incluir `tipo_negocio` do tenant (via interface Tenant)
- [x] **3.2** Adaptar componentes de gestão para usar terminologia dinâmica
- [ ] **3.3** Adaptar categorias de serviços por tipo de negócio (opcional)

### Fase 4: Página Pública do Cliente ✅
- [x] **4.1** Adaptar página `[slug]/page.tsx` para usar terminologia e ícones condicionais
- [ ] **4.2** Adaptar página `[slug]/agendar/page.tsx` (textos já genéricos)

### Fase 5: Painel do Profissional ✅
- [x] **5.1** Adaptar `/barbeiro` com ícones condicionais
- [x] **5.2** Adaptar `BarbeiroAuthContext` para incluir `tipo_negocio`

### Fase 6: Testes e Validação ✅
- [x] **6.1** Criar testes unitários para tipos de negócio
- [x] **6.2** Criar testes para constantes de configuração
- [x] **6.3** Build passou sem erros
- [ ] **6.4** Testar fluxo completo manualmente

---

## 📁 Estrutura de Arquivos a Criar

```
lib/
├── tipos-negocio.ts           # Tipos e enums
├── configuracoes-negocio.ts   # Constantes por tipo de negócio
└── __tests__/
    ├── tipos-negocio.test.ts
    └── configuracoes-negocio.test.ts

hooks/
├── useTerminologia.tsx        # Hook para textos dinâmicos
└── __tests__/
    └── useTerminologia.test.tsx

components/
└── comum/
    └── SeletorTipoNegocio.tsx # Componente de seleção
```

---

## 🗃️ Migração do Banco de Dados

```sql
-- Adicionar coluna tipo_negocio
ALTER TABLE tenants 
ADD COLUMN tipo_negocio TEXT DEFAULT 'barbearia' 
CHECK (tipo_negocio IN ('barbearia', 'nail_designer'));

-- Renomear limite_barbeiros para limite_profissionais
ALTER TABLE tenants 
RENAME COLUMN limite_barbeiros TO limite_profissionais;
```

---

## 📊 Mapeamento de Terminologia

| Contexto | Barbearia | Nail Designer |
|----------|-----------|---------------|
| Profissional (singular) | Barbeiro | Nail Designer |
| Profissional (plural) | Barbeiros | Nail Designers |
| Estabelecimento | Barbearia | Estúdio de Unhas |
| Serviço exemplo | Corte de cabelo | Alongamento em gel |
| Ícone principal | Scissors (✂️) | Sparkles (✨) |
| Cor tema sugerida | #18181b | #ec4899 |

---

## 🧪 Testes Automatizados

### Testes Unitários
1. `useTerminologia` - Retorna terminologia correta por tipo
2. `configuracoes-negocio` - Categorias corretas por tipo
3. `SeletorTipoNegocio` - Renderiza opções corretamente

### Testes de Integração
1. Fluxo de cadastro com tipo Nail Designer
2. Dashboard exibe terminologia correta
3. Página pública usa textos corretos

---

## 📅 Estimativa de Tempo

| Fase | Estimativa |
|------|------------|
| Fase 1 | 2h |
| Fase 2 | 2h |
| Fase 3 | 3h |
| Fase 4 | 1h |
| Fase 5 | 1h |
| Fase 6 | 2h |
| **Total** | **~11h** |

---

## ✅ Progresso

**Última atualização:** $(date)

| Fase | Status | Progresso |
|------|--------|-----------|
| Fase 1 | 🔄 Em andamento | 0% |
| Fase 2 | ⏳ Pendente | 0% |
| Fase 3 | ⏳ Pendente | 0% |
| Fase 4 | ⏳ Pendente | 0% |
| Fase 5 | ⏳ Pendente | 0% |
| Fase 6 | ⏳ Pendente | 0% |

---

## 📝 Notas de Implementação

- Manter compatibilidade retroativa (tenants existentes = barbearia)
- Componentes máximo 500 linhas
- Nomenclatura 100% em português brasileiro
- Código modular e reutilizável
