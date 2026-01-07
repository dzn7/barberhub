# BarberHub Mobile - Design System

## Visão Geral

Este documento descreve o design system do aplicativo mobile BarberHub, baseado no design do site web para garantir consistência visual entre plataformas.

---

## 1. Paleta de Cores

### 1.1 Base Zinc (Tailwind)

A paleta principal usa cores Zinc do Tailwind CSS:

| Token | Hex | Uso |
|-------|-----|-----|
| zinc-50 | `#fafafa` | Fundo claro secundário |
| zinc-100 | `#f4f4f5` | Fundo claro terciário |
| zinc-200 | `#e4e4e7` | Bordas claras |
| zinc-300 | `#d4d4d8` | Bordas médias |
| zinc-400 | `#a1a1aa` | Texto secundário (escuro) |
| zinc-500 | `#71717a` | Texto terciário |
| zinc-600 | `#52525b` | Bordas fortes |
| zinc-700 | `#3f3f46` | Bordas médias (escuro) |
| zinc-800 | `#27272a` | Fundo cards (escuro) |
| zinc-900 | `#18181b` | Fundo principal (escuro), botões primários (claro) |
| zinc-950 | `#09090b` | Fundo mais escuro |

### 1.2 Cores de Destaque

| Cor | Hex | Uso |
|-----|-----|-----|
| Emerald 500 | `#10b981` | Sucesso, check |
| Pink 500 | `#ec4899` | Nail Designer |
| Red 500 | `#ef4444` | Erro |
| Amber 500 | `#f59e0b` | Aviso |
| Blue 500 | `#3b82f6` | Info |

### 1.3 Tema Escuro

```typescript
{
  fundo: {
    primario: '#000000',      // Fundo principal da tela
    secundario: '#18181b',    // zinc-900
    terciario: '#27272a',     // zinc-800
    card: '#18181b',          // Cards e containers
  },
  texto: {
    primario: '#ffffff',      // Texto principal
    secundario: '#a1a1aa',    // zinc-400
    terciario: '#71717a',     // zinc-500
  },
  borda: {
    sutil: '#27272a',         // zinc-800
    media: '#3f3f46',         // zinc-700
  },
  botao: {
    fundo: '#ffffff',         // Botão primário branco
    texto: '#18181b',         // Texto do botão escuro
  }
}
```

### 1.4 Tema Claro

```typescript
{
  fundo: {
    primario: '#ffffff',      // Fundo branco
    secundario: '#fafafa',    // zinc-50
    terciario: '#f4f4f5',     // zinc-100
    card: '#ffffff',
  },
  texto: {
    primario: '#18181b',      // zinc-900
    secundario: '#71717a',    // zinc-500
    terciario: '#a1a1aa',     // zinc-400
  },
  borda: {
    sutil: '#e4e4e7',         // zinc-200
    media: '#d4d4d8',         // zinc-300
  },
  botao: {
    fundo: '#18181b',         // Botão primário escuro
    texto: '#ffffff',         // Texto do botão branco
  }
}
```

---

## 2. Tipografia

### 2.1 Tamanhos de Fonte

| Uso | Tamanho | Peso |
|-----|---------|------|
| Título principal | 24px | 700 (Bold) |
| Título secundário | 20px | 600 (Semibold) |
| Subtítulo | 16px | 500 (Medium) |
| Corpo | 14px | 400 (Regular) |
| Caption | 12px | 400 (Regular) |
| Micro | 10px | 500 (Medium) |

### 2.2 Fonte do Sistema

O app usa a fonte padrão do sistema (San Francisco no iOS, Roboto no Android).

---

## 3. Espaçamento

### 3.1 Escala Base (8px)

| Token | Valor |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 32px |
| 4xl | 40px |

### 3.2 Padding Padrão

- **Tela**: `paddingHorizontal: 20`
- **Cards**: `padding: 16`
- **Inputs**: `paddingHorizontal: 16, paddingVertical: 14`
- **Botões**: `paddingVertical: 16`

---

## 4. Componentes

### 4.1 Botão Primário

```typescript
{
  backgroundColor: cores.botao.fundo,
  paddingVertical: 16,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
}
// Tema Escuro: fundo branco, texto preto
// Tema Claro: fundo preto, texto branco
```

### 4.2 Input

```typescript
{
  backgroundColor: cores.fundo.card,
  borderWidth: 1,
  borderColor: cores.borda.sutil,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: cores.texto.primario,
}
```

### 4.3 Card de Seleção

```typescript
// Não selecionado
{
  borderWidth: 2,
  borderColor: cores.borda.sutil,
  backgroundColor: cores.fundo.card,
  borderRadius: 12,
  padding: 16,
}

// Selecionado (Barbearia)
{
  borderColor: cores.zinc[900], // ou '#ffffff' no modo escuro
  backgroundColor: 'rgba(255, 255, 255, 0.05)', // modo escuro
}

// Selecionado (Nail Designer)
{
  borderColor: '#ec4899',
  backgroundColor: 'rgba(236, 72, 153, 0.08)',
}
```

### 4.4 Barra de Progresso

```typescript
// Container
{
  backgroundColor: cores.fundo.secundario,
  height: 4,
}

// Progresso
{
  height: 4,
  width: `${(etapaAtual / totalEtapas) * 100}%`,
  backgroundColor: ehEscuro ? '#ffffff' : cores.zinc[900],
}
```

---

## 5. Ícones

Usamos `@expo/vector-icons` com o set `Ionicons`.

### 5.1 Ícones Comuns

| Ação | Ícone |
|------|-------|
| Voltar | `arrow-back` |
| Avançar | `arrow-forward` |
| Check | `checkmark` |
| Erro | `alert-circle` |
| Negócio | `business-outline` |
| Pessoa | `person-outline` |
| Email | `mail-outline` |
| Telefone | `call-outline` |
| Senha | `lock-closed-outline` |
| Sol (tema) | `sunny-outline` |
| Lua (tema) | `moon-outline` |

---

## 6. Imagens

### 6.1 Tipos de Negócio

| Tipo | Arquivo | Tamanho Exibição |
|------|---------|------------------|
| Barbearia | `assets/images/barber.png` | 48x48 (seleção), 80x80 (destaque) |
| Nail Designer | `assets/images/naildesign.png` | 48x48 (seleção), 80x80 (destaque) |

### 6.2 Logo

| Arquivo | Uso | Tamanho |
|---------|-----|---------|
| `assets/images/logo.png` | Header | 120x40 |

---

## 7. Fluxo de Registro

### 7.1 Etapas

1. **Etapa 1**: Tipo de negócio + Nome do estabelecimento + Nome do proprietário
2. **Etapa 2**: Email + Telefone
3. **Etapa 3**: Senha + Confirmação de senha

### 7.2 Integração Supabase

**IMPORTANTE**: Usar a função RPC `criar_novo_tenant` ao invés de inserts manuais.

```typescript
const { data: tenantId, error } = await supabase.rpc('criar_novo_tenant', {
  p_slug: slug,
  p_nome: nomeEstabelecimento,
  p_email: email,
  p_telefone: telefone,
  p_user_id: userId,
  p_tipo_negocio: tipoNegocio
});
```

A função RPC cria automaticamente:
- Tenant
- Proprietário vinculado ao user_id
- Configurações padrão
- Serviços de exemplo baseados no tipo de negócio
- Categorias de trabalhos

---

## 8. Animações

### 8.1 Transições

- **Duração padrão**: 200-300ms
- **Easing**: `ease-out` para entradas, `ease-in` para saídas

### 8.2 Feedback Tátil (Haptics)

```typescript
import * as Haptics from 'expo-haptics';

// Sucesso
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Erro
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Toque leve
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

---

## 9. Estados

### 9.1 Loading

- Usar `ActivityIndicator` com cor do botão
- Desabilitar interação durante carregamento

### 9.2 Erro

```typescript
{
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  borderRadius: 12,
  padding: 16,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
}
```

### 9.3 Sucesso

```typescript
{
  backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald
  // ...similar ao erro
}
```

---

## 10. Acessibilidade

- Contraste mínimo 4.5:1 para texto
- Áreas de toque mínimo 44x44 pontos
- Labels descritivos em todos os campos
- Suporte a VoiceOver/TalkBack

---

## 11. Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `src/constants/cores.ts` | Definição de cores e temas |
| `src/contexts/TemaContext.tsx` | Contexto de tema |
| `app/(auth)/onboarding.tsx` | Tela de onboarding |
| `app/(auth)/registro.tsx` | Tela de registro |

---

## Changelog

- **v1.0** - Design system inicial baseado no web
