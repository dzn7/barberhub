# Análise Completa do Painel Admin Web - BarberHub

## Sumário
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Design System](#design-system)
4. [Estrutura de Dados (Supabase)](#estrutura-de-dados-supabase)
5. [Componentes Dashboard](#componentes-dashboard)
6. [Navegação e Abas](#navegação-e-abas)
7. [Contextos e Hooks](#contextos-e-hooks)
8. [Endpoints e Queries](#endpoints-e-queries)
9. [Funcionalidades por Módulo](#funcionalidades-por-módulo)

---

## Visão Geral

O painel admin web (`/admin`) é o centro de controle completo para gestão de barbearias e estúdios de nail designer. Oferece:

- **Multi-tenant**: Cada estabelecimento tem seu próprio espaço isolado
- **Terminologia dinâmica**: Adapta textos para "Barbeiro" ou "Nail Designer"
- **Modo claro/escuro**: Design system completo com suporte a temas
- **PWA dinâmico**: Manifest personalizado por tenant com logo e cores

---

## Arquitetura

### Estrutura de Arquivos Web
```
app/admin/
├── layout.tsx          # Layout com AuthProvider e ManifestDinâmico
├── page.tsx            # Dashboard principal com todas as abas (1086 linhas)
├── barbeiros/page.tsx  # Rota alternativa
└── servicos/page.tsx   # Rota alternativa

components/dashboard/
├── GestaoAgendamentos.tsx      # Visualização lista/semanal
├── GestaoFinanceira.tsx        # Receitas e despesas
├── GestaoServicos.tsx          # CRUD de serviços
├── GestaoBarbeiros.tsx         # CRUD de profissionais + tokens
├── GestaoEstoque.tsx           # Produtos e inventário
├── GestaoComissoes.tsx         # Comissões por profissional
├── GestaoUsuarios.tsx          # Usuários admin
├── GestaoHorarios.tsx          # Horários de funcionamento
├── GestaoHorariosAvancada.tsx  # Bloqueios e exceções
├── AtendimentosPresenciais.tsx # Registro de walk-ins
├── RemarcacaoAgendamento.tsx   # Remarcação de agendamentos
├── ConfiguracaoBarbearia.tsx   # Identidade visual e dados
├── Relatorios.tsx              # Relatórios e exportação
├── CalendarioSemanalNovo.tsx   # Calendário estilo Google
├── CalendarioAgendamentos.tsx  # Lista de agendamentos
├── TelaTesteExpirado.tsx       # Tela quando trial expira
└── GuiaAcessoBarbeiros.tsx     # Guia de tokens de acesso
```

### Provedores e Contextos
```typescript
// Hierarquia de provedores
<ProvedorTema>           // Tema claro/escuro
  <AuthProvider>         // Autenticação + tenant
    <AdminLayoutInner>   // Verificação de auth
      <ManifestDinamicoAdmin />  // PWA dinâmico
      {children}
    </AdminLayoutInner>
  </AuthProvider>
</ProvedorTema>
```

---

## Design System

### Paleta de Cores (Zinc)

```typescript
// Modo Escuro (padrão)
const CORES_ESCURO = {
  fundo: {
    primario: '#000000',
    secundario: '#18181b',  // zinc-900
    terciario: '#27272a',   // zinc-800
    card: '#18181b',
  },
  texto: {
    primario: '#ffffff',
    secundario: '#a1a1aa',  // zinc-400
    terciario: '#71717a',   // zinc-500
  },
  borda: {
    sutil: '#27272a',       // zinc-800
    media: '#3f3f46',       // zinc-700
    forte: '#52525b',       // zinc-600
  },
  botao: {
    fundo: '#ffffff',
    texto: '#18181b',
  }
}

// Modo Claro
const CORES_CLARO = {
  fundo: {
    primario: '#ffffff',
    secundario: '#fafafa',  // zinc-50
    terciario: '#f4f4f5',   // zinc-100
    card: '#ffffff',
  },
  texto: {
    primario: '#18181b',    // zinc-900
    secundario: '#71717a',  // zinc-500
    terciario: '#a1a1aa',   // zinc-400
  },
  borda: {
    sutil: '#e4e4e7',       // zinc-200
    media: '#d4d4d8',       // zinc-300
    forte: '#a1a1aa',       // zinc-400
  },
  botao: {
    fundo: '#18181b',
    texto: '#ffffff',
  }
}
```

### Classes CSS Comuns (Tailwind)

```css
/* Backgrounds */
bg-zinc-50 dark:bg-zinc-950     /* Fundo principal */
bg-white dark:bg-zinc-900       /* Cards */
bg-zinc-100 dark:bg-zinc-800    /* Inputs, toggles */

/* Textos */
text-zinc-900 dark:text-white   /* Títulos */
text-zinc-600 dark:text-zinc-400 /* Texto secundário */
text-zinc-500 dark:text-zinc-500 /* Texto terciário */

/* Bordas */
border-zinc-200 dark:border-zinc-800

/* Botões Primários */
bg-zinc-900 dark:bg-white 
text-white dark:text-black
hover:bg-zinc-800 dark:hover:bg-zinc-100

/* Botões Secundários */
bg-zinc-100 dark:bg-zinc-800
text-zinc-700 dark:text-zinc-300
```

### Componentes de UI

| Componente | Biblioteca | Uso |
|------------|------------|-----|
| Tabs | @radix-ui/themes | Navegação por abas |
| Button | @radix-ui/themes | Botões |
| TextField | @radix-ui/themes | Inputs de texto |
| TextArea | @radix-ui/themes | Áreas de texto |
| Select | @radix-ui/themes | Selects |
| Motion | framer-motion | Animações |
| Icons | lucide-react | Ícones |

### Animações (Framer Motion)

```typescript
// Animação de entrada
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}

// Menu mobile
initial={{ opacity: 0, height: 0 }}
animate={{ opacity: 1, height: "auto" }}
exit={{ opacity: 0, height: 0 }}
```

---

## Estrutura de Dados (Supabase)

### Tabelas Principais

#### `tenants`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| slug | text | URL única |
| nome | text | Nome do estabelecimento |
| tipo_negocio | enum | 'barbearia' \| 'nail_designer' |
| logo_url | text | URL da logo |
| cor_primaria | text | Cor hex |
| cor_secundaria | text | Cor hex |
| cor_destaque | text | Cor hex |
| telefone | text | Telefone |
| whatsapp | text | WhatsApp |
| email | text | Email |
| endereco | text | Endereço completo |
| cidade | text | Cidade |
| estado | text | UF |
| instagram | text | @usuario |
| plano | enum | 'trial' \| 'basico' \| 'profissional' |
| trial_inicio | timestamptz | Início do trial |
| trial_fim | timestamptz | Fim do trial |
| ativo | boolean | Status |

#### `barbeiros`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| nome | text | Nome completo |
| email | text | Email |
| telefone | text | Telefone |
| especialidades | text[] | Lista de especialidades |
| foto_url | text | URL da foto |
| comissao_percentual | numeric | % de comissão (default: 40) |
| token_acesso | text | Token único de 8 caracteres |
| token_ativo | boolean | Token habilitado |
| ativo | boolean | Status |
| is_proprietario | boolean | É admin? |

#### `servicos`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| nome | text | Nome do serviço |
| descricao | text | Descrição |
| duracao | integer | Duração em minutos |
| preco | numeric | Preço |
| categoria | text | Categoria |
| ordem_exibicao | integer | Ordem |
| preco_anterior | numeric | Histórico de preço |
| ativo | boolean | Status |

#### `agendamentos`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| cliente_id | uuid | FK → clientes |
| barbeiro_id | uuid | FK → barbeiros |
| servico_id | uuid | FK → servicos |
| data_hora | timestamptz | Data e hora |
| status | enum | 'pendente' \| 'confirmado' \| 'concluido' \| 'cancelado' |
| observacoes | text | Observações |

#### `transacoes`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| tipo | enum | 'receita' \| 'despesa' |
| categoria | enum | 'luz' \| 'agua' \| 'aluguel' \| 'produtos' \| etc |
| descricao | text | Descrição |
| valor | numeric | Valor |
| data | date | Data |
| forma_pagamento | enum | 'dinheiro' \| 'pix' \| 'debito' \| 'credito' |
| barbeiro_id | uuid | FK → barbeiros (opcional) |

#### `produtos`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| nome | text | Nome |
| categoria | text | Categoria |
| quantidade_estoque | integer | Estoque atual |
| quantidade_minima | integer | Estoque mínimo (alerta) |
| preco_compra | numeric | Preço de compra |
| preco_venda | numeric | Preço de venda |
| fornecedor | text | Fornecedor |

#### `horarios_disponiveis`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| barbeiro_id | uuid | FK → barbeiros |
| dia_semana | integer | 0-6 (dom-sab) |
| hora_inicio | time | Início |
| hora_fim | time | Fim |
| ativo | boolean | Status |

#### `atendimentos_presenciais`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| barbeiro_id | uuid | FK → barbeiros |
| servico_id | uuid | FK → servicos |
| cliente_nome | text | Nome do cliente |
| valor | numeric | Valor cobrado |
| data | timestamptz | Data/hora |
| forma_pagamento | enum | Forma de pagamento |

---

## Navegação e Abas

### Abas Principais (8 total)

| Aba | Ícone | Descrição |
|-----|-------|-----------|
| Visão Geral | TrendingUp | Dashboard com métricas e gráficos |
| Agendamentos | Calendar | Gestão de agenda (3 sub-abas) |
| Financeiro | DollarSign | Receitas e despesas |
| Equipe | Users | Profissionais e comissões (3 sub-abas) |
| Serviços | Scissors | Gestão de serviços |
| Estoque | Package | Produtos e inventário |
| Relatórios | BarChart3 | Relatórios e exportação |
| Configurações | Settings | Barbearia, horários, acessos (3 sub-abas) |

### Sub-abas

**Agendamentos:**
- Agenda (lista/semanal)
- Atendimentos Presenciais
- Remarcação

**Equipe:**
- Barbeiros/Nail Designers
- Usuários
- Comissões

**Configurações:**
- Barbearia (identidade visual)
- Horários
- Acesso Barbeiros (tokens)

---

## Contextos e Hooks

### AuthContext
```typescript
interface AuthContextData {
  user: User | null
  session: Session | null
  proprietario: Proprietario | null
  tenant: Tenant | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<{ erro?: string }>
  sair: () => Promise<void>
  atualizarTenant: (dados: Partial<Tenant>) => Promise<{ erro?: string }>
  recarregar: () => Promise<void>
}
```

### useTerminologia
```typescript
interface UseTerminologiaRetorno {
  tipoNegocio: TipoNegocio
  terminologia: Terminologia
  profissional: (plural?: boolean, comArtigo?: boolean) => string
  estabelecimento: (comArtigo?: boolean) => string
  icone: string
  cores: Terminologia['cores']
  categorias: Terminologia['categoriasServicos']
  ehBarbearia: boolean
  ehNailDesigner: boolean
}
```

---

## Endpoints e Queries

### Queries Supabase por Módulo

#### Métricas Dashboard
```typescript
// Agendamentos do período
supabase
  .from('agendamentos')
  .select('*, servicos(preco), barbeiros(nome)')
  .eq('tenant_id', tenant.id)
  .in('status', ['confirmado', 'concluido'])
  .gte('data_hora', inicioMes)
  .lte('data_hora', fimMes)

// Transações
supabase
  .from('transacoes')
  .select('valor')
  .eq('tenant_id', tenant.id)
  .eq('tipo', 'receita' | 'despesa')
  .gte('data', inicio)
  .lte('data', fim)
```

#### Serviços
```typescript
// Listar
supabase
  .from('servicos')
  .select('*')
  .eq('tenant_id', tenant.id)
  .order('nome')

// Atualizar
supabase
  .from('servicos')
  .update({ nome, preco, duracao, descricao })
  .eq('id', servicoId)
  .eq('tenant_id', tenant.id)
```

#### Barbeiros
```typescript
// Listar ativos
supabase
  .from('barbeiros')
  .select('*')
  .eq('tenant_id', tenant.id)
  .eq('ativo', true)
  .order('nome')

// Criar
supabase
  .from('barbeiros')
  .insert([{ tenant_id, nome, email, telefone, especialidades, comissao_percentual, token_acesso }])
```

#### Estoque
```typescript
// Listar produtos
supabase
  .from('produtos')
  .select('*')
  .eq('ativo', true)
  .order('nome')

// Criar produto
supabase
  .from('produtos')
  .insert([{ nome, categoria, quantidade_estoque, quantidade_minima, preco_compra, preco_venda, fornecedor }])
```

---

## Funcionalidades por Módulo

### 1. Visão Geral
- Cards de métricas: Receita, Atendimentos, Ticket Médio, Despesas, Lucro
- Filtros de período: Hoje, Semana, Mês, Ano, Geral, Personalizado
- Gráfico de receita dos últimos 7 dias
- Gráfico de atendimentos por profissional

### 2. Agendamentos
- Visualização lista (CalendarioAgendamentos)
- Visualização semanal estilo Google Calendar (CalendarioSemanalNovo)
- Atendimentos presenciais (walk-ins)
- Remarcação de agendamentos com histórico

### 3. Financeiro
- Registro de receitas e despesas
- Categorias de despesa: luz, água, aluguel, internet, marketing, produtos, etc.
- Formas de pagamento: dinheiro, pix, débito, crédito, transferência
- Métricas: receitas, despesas, lucro líquido, margem

### 4. Equipe
- CRUD de profissionais com foto e especialidades
- Comissões percentuais personalizadas
- Geração de tokens de acesso (8 caracteres)
- Envio de token via WhatsApp
- Gestão de usuários admin

### 5. Serviços
- CRUD de serviços
- Campos: nome, descrição, preço, duração, categoria
- Histórico de alterações de preço
- Ordenação personalizada

### 6. Estoque
- CRUD de produtos
- Alertas de estoque mínimo
- Margem de lucro automática
- Categorias de produtos

### 7. Relatórios
- Exportação de dados
- Filtros por período
- Relatórios de desempenho

### 8. Configurações
- **Barbearia**: Nome, logo, cores, contato, endereço
- **Horários**: Horários de funcionamento, bloqueios
- **Acesso**: Guia de tokens para profissionais

---

## Plano de Implementação Mobile

### Fase 1: Infraestrutura Base
1. Criar contexto de autenticação mobile compatível
2. Implementar hook useTerminologia mobile
3. Configurar sistema de cores/temas
4. Criar componentes UI base (Card, Input, Button, Modal)

### Fase 2: Dashboard Principal
1. Tela de visão geral com métricas
2. Cards de estatísticas
3. Filtros de período
4. Gráficos simplificados

### Fase 3: Gestão de Agendamentos
1. Lista de agendamentos
2. Visualização por dia/semana
3. Detalhes do agendamento
4. Confirmação/cancelamento

### Fase 4: Gestão Financeira
1. Lista de transações
2. Formulário de nova transação
3. Filtros e categorias
4. Métricas financeiras

### Fase 5: Gestão de Equipe
1. Lista de profissionais
2. Formulário de cadastro/edição
3. Geração e compartilhamento de tokens
4. Gestão de comissões

### Fase 6: Gestão de Serviços
1. Lista de serviços
2. Formulário de cadastro/edição
3. Reordenação
4. Ativação/desativação

### Fase 7: Gestão de Estoque
1. Lista de produtos
2. Alertas de estoque baixo
3. Formulário de cadastro/edição
4. Movimentações

### Fase 8: Configurações
1. Dados do estabelecimento
2. Upload de logo
3. Configuração de cores
4. Horários de funcionamento

---

*Documentação gerada em: Janeiro 2026*
*Versão: 1.0*
