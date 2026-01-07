# TODO - Implementação Painel Admin Mobile

## Fase 1: Infraestrutura Base ✅
- [x] Contexto de autenticação (`AuthContext`)
- [x] Sistema de cores (`cores.ts`)
- [x] Componentes base (`Card`, `Button`)
- [ ] Hook `useTerminologia` mobile
- [ ] Componentes UI adicionais (`Modal`, `Input`, `Select`)

## Fase 2: Dashboard Principal
- [ ] Refatorar `dashboard.tsx` para usar design system correto
- [ ] Cards de métricas (Receita, Atendimentos, Ticket Médio, Lucro)
- [ ] Filtros de período (Hoje, Semana, Mês, Ano)
- [ ] Gráficos simplificados
- [ ] Pull-to-refresh

## Fase 3: Navegação por Abas
- [ ] Tab Navigator com 5 abas principais
  - Dashboard
  - Agendamentos
  - Serviços
  - Equipe
  - Configurações
- [ ] Ícones Ionicons
- [ ] Badge de notificações

## Fase 4: Gestão de Agendamentos
- [ ] Lista de agendamentos do dia/semana
- [ ] Filtro por data
- [ ] Filtro por status (pendente, confirmado, concluído, cancelado)
- [ ] Filtro por profissional
- [ ] Modal de detalhes do agendamento
- [ ] Ações: confirmar, cancelar, remarcar

## Fase 5: Gestão de Serviços
- [ ] Lista de serviços com preço e duração
- [ ] Formulário de novo serviço
- [ ] Edição inline de preço
- [ ] Ativação/desativação
- [ ] Reordenação por drag-and-drop

## Fase 6: Gestão de Equipe
- [ ] Lista de profissionais com foto
- [ ] Formulário de cadastro/edição
- [ ] Upload de foto com crop
- [ ] Comissão percentual
- [ ] Especialidades (chips)
- [ ] Token de acesso
- [ ] Compartilhar token via WhatsApp

## Fase 7: Gestão Financeira
- [ ] Cards de resumo (receitas, despesas, lucro)
- [ ] Lista de transações
- [ ] Filtros por tipo e período
- [ ] Formulário de nova transação
- [ ] Categorias de despesa

## Fase 8: Configurações
- [ ] Dados do estabelecimento
- [ ] Upload de logo
- [ ] Seletor de paleta de cores
- [ ] Horários de funcionamento
- [ ] Integração WhatsApp

## Componentes Reutilizáveis Necessários
- [ ] `CardMetrica` - Card com ícone, título, valor e tendência
- [ ] `ListaVazia` - Estado vazio com ilustração
- [ ] `SkeletonLoader` - Loading skeleton
- [ ] `ModalConfirmacao` - Modal de confirmação de ação
- [ ] `ModalFormulario` - Modal com formulário
- [ ] `SeletorData` - Seletor de data nativo
- [ ] `ChipSeletor` - Seletor de chips (especialidades)
- [ ] `AvatarUpload` - Upload de imagem com crop
- [ ] `GraficoBarras` - Gráfico de barras simples
- [ ] `GraficoPizza` - Gráfico de pizza simples

## Queries Supabase (serviços mobile)
- [ ] `servicoAgendamentos.ts`
- [ ] `servicoFinanceiro.ts`
- [ ] `servicoServicos.ts`
- [ ] `servicoBarbeiros.ts`
- [ ] `servicoProdutos.ts`
- [ ] `servicoMetricas.ts`

## Prioridade de Implementação
1. **ALTA**: Dashboard, Agendamentos, Serviços
2. **MÉDIA**: Equipe, Financeiro
3. **BAIXA**: Estoque, Relatórios detalhados

---
*Atualizado em: Janeiro 2026*
