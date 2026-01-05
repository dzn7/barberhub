# Terminologia Dinâmica - Sistema Multi-Negócio

## Visão Geral

O sistema BarberHub suporta múltiplos tipos de negócio de beleza, adaptando automaticamente toda a terminologia, ícones, cores e textos baseado no `tipo_negocio` do tenant.

## Tipos de Negócio Suportados

| Tipo | Identificador | Profissional | Estabelecimento | Emoji |
|------|---------------|--------------|-----------------|-------|
| Barbearia | `barbearia` | Barbeiro(s) | Barbearia | ✂️ |
| Nail Designer | `nail_designer` | Nail Designer(s) | Estúdio | 💅 |

---

## Arquivos Principais

### 1. `lib/tipos-negocio.ts`
Define os tipos TypeScript e interfaces:
- `TipoNegocio` - Union type dos tipos suportados
- `Terminologia` - Interface completa com todos os termos
- `CategoriaServico` - Categorias de serviços por tipo
- `TIPOS_NEGOCIO_DISPONIVEIS` - Lista de tipos disponíveis

### 2. `lib/configuracoes-negocio.ts`
Contém todas as configurações e funções utilitárias:

```typescript
// Funções exportadas
obterTerminologia(tipo)           // Retorna terminologia completa
obterCategoriasServicos(tipo)     // Retorna categorias de serviços
obterTermoProfissional(tipo)      // Retorna "Barbeiro" ou "Nail Designer"
obterTermoEstabelecimento(tipo)   // Retorna "Barbearia" ou "Estúdio"
obterIconePrincipal(tipo)         // Retorna nome do ícone Lucide
obterCoresSugeridas(tipo)         // Retorna paleta de cores
obterEspecialidadesSugeridas(tipo)// Retorna array de especialidades
obterEmojiPrincipal(tipo)         // Retorna ✂️ ou 💅
obterTextosNotificacao(tipo)      // Retorna textos para WhatsApp
```

### 3. `hooks/useTerminologia.ts`
Hook React para acessar terminologia no contexto do tenant atual:

```typescript
const { terminologia, tipoNegocio, ehNail } = useTerminologia();

// Uso
<h1>Gestão de {terminologia.profissional.plural}</h1>
```

---

## Componentes Adaptados

### TIER S (Crítico)
| Componente | Arquivo | Adaptações |
|------------|---------|------------|
| Gestão de Profissionais | `GestaoBarbeiros.tsx` | Títulos, botões, métricas, especialidades, mensagem WhatsApp |
| Configurações | `ConfiguracaoBarbearia.tsx` | Labels, placeholders, títulos |
| Modal Agendamento | `ModalNovoAgendamento.tsx` | Label do profissional |
| Onboarding | `app/configurar/page.tsx` | Etapas, dicas, paletas de cores |

### TIER A (Importante)
| Componente | Arquivo | Adaptações |
|------------|---------|------------|
| Calendário Agendamentos | `CalendarioAgendamentos.tsx` | Notificação de cancelamento |
| Modal Remarcação | `ModalRemarcacao.tsx` | Notificação de remarcação |
| Calendário Semanal | `CalendarioSemanalNovo.tsx` | Notificação de cancelamento |

### TIER B (Desejável)
| Componente | Arquivo | Adaptações |
|------------|---------|------------|
| Página Pública | `app/[slug]/page.tsx` | Textos dinâmicos |
| Dashboard Admin | `app/admin/page.tsx` | Métricas dinâmicas |

---

## Especialidades por Tipo

### Barbearia
- Corte Masculino, Degradê, Barba, Pigmentação
- Química, Corte Infantil, Tratamento Capilar
- Sobrancelha, Relaxamento, Platinado

### Nail Designer
- Alongamento em Gel, Fibra de Vidro, Nail Art
- Esmaltação em Gel, Francesinha, Decoração 3D
- Manicure Russa, Banho de Gel, Unhas de Porcelana, Spa dos Pés

---

## Paletas de Cores

### Barbearia (Tons Masculinos)
- Obsidian, Grafite, Midnight, Navy, Forest, Wine, Copper

### Nail Designer (Tons Femininos)
- Nude, Blush, Rose Gold, Champagne, Burgundy, Mauve, Lavanda, Coral

---

## Como Usar

### Em Componentes React

```tsx
import { useTerminologia } from '@/hooks/useTerminologia';

function MeuComponente() {
  const { terminologia, tipoNegocio } = useTerminologia();
  const ehNail = tipoNegocio === 'nail_designer';
  
  return (
    <div>
      <h1>Gestão de {terminologia.profissional.plural}</h1>
      <button>
        Nov{ehNail ? 'a' : 'o'} {terminologia.profissional.singular}
      </button>
    </div>
  );
}
```

### Fora do Contexto React

```typescript
import { obterTerminologia, obterEmojiPrincipal } from '@/lib/configuracoes-negocio';

const tipo = tenant.tipo_negocio;
const terminologia = obterTerminologia(tipo);
const emoji = obterEmojiPrincipal(tipo);

const mensagem = `${emoji} ${terminologia.profissional.singular}: João`;
```

---

## Mensagens WhatsApp

As mensagens de notificação agora usam terminologia dinâmica:

### Cancelamento
```
❌ *Agendamento Cancelado*

Olá [Cliente]!

Seu agendamento foi cancelado:
📅 *Data:* [data]
💅 *Serviço:* [serviço]
👤 *Nail Designer:* [profissional]

Se desejar reagendar, entre em contato.

_[Nome do Estúdio]_
```

### Remarcação
```
🔄 *Agendamento Remarcado*

Olá [Cliente]!

📅 *Nova Data:* [data]
💅 *Serviço:* [serviço]
👤 *Nail Designer:* [profissional]
💰 *Valor:* R$ [valor]

_[Nome do Estúdio]_
```

---

## Adicionando Novo Tipo de Negócio

1. Adicionar ao union type em `tipos-negocio.ts`:
```typescript
export type TipoNegocio = 'barbearia' | 'nail_designer' | 'novo_tipo'
```

2. Criar constantes em `configuracoes-negocio.ts`:
```typescript
const ESPECIALIDADES_NOVO: string[] = [...]
const CATEGORIAS_NOVO: CategoriaServico[] = [...]
const TERMINOLOGIA_NOVO: Terminologia = {...}
```

3. Atualizar o mapa `CONFIGURACOES`

4. Adicionar paletas em `app/configurar/page.tsx`

5. Adicionar opção em `SeletorTipoNegocio.tsx`

---

## Testes

Execute os testes de configuração:
```bash
npx vitest run lib/__tests__/configuracoes-negocio.test.ts
```

---

## Checklist de Manutenção

Ao adicionar novos componentes com textos fixos:

- [ ] Verificar se usa "barbeiro/barbearia" fixo
- [ ] Substituir por `terminologia.profissional` ou `terminologia.estabelecimento`
- [ ] Ajustar gênero (o/a, novo/nova) quando necessário
- [ ] Usar emoji dinâmico em notificações
- [ ] Testar com ambos os tipos de negócio
