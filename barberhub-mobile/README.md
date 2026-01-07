# BarberHub Mobile

Aplicativo mobile do BarberHub para gestão de barbearias - React Native/Expo.

## 📱 Funcionalidades

### Autenticação
- **Onboarding** - Apresentação do app para novos usuários
- **Login por Email** - Para proprietários
- **Login por Token** - Acesso rápido para profissionais
- **Registro** - Criação de nova barbearia

### Painel Admin
- **Dashboard** - Métricas, receitas e próximos agendamentos
- **Agendamentos** - Lista, confirmação e gestão de horários
- **Serviços** - CRUD de serviços oferecidos
- **Equipe** - Gestão de barbeiros/profissionais com tokens
- **Configurações** - Ajustes da barbearia e conta

### Integrações
- **WhatsApp Bot** - Notificações automáticas
- **Mercado Pago** - Pagamentos PIX
- **Cloudflare R2** - Upload de imagens

## 🚀 Instalação

```bash
# Clone o repositório
cd barberhub-mobile

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Baixe as fontes (opcional - se não tiver)
npx expo install expo-font

# Inicie o app
npm start
```

## 📦 Dependências Principais

| Pacote | Versão | Descrição |
|--------|--------|-----------|
| expo | ~52.0.0 | Framework |
| expo-router | ~4.0.9 | Navegação |
| react-native-reanimated | ~3.16.1 | Animações |
| @supabase/supabase-js | ^2.39.0 | Backend |
| nativewind | ^4.0.1 | Estilos |
| zustand | ^4.4.7 | Estado global |

## 📁 Estrutura

```
barberhub-mobile/
├── app/                    # Rotas (Expo Router)
│   ├── (auth)/            # Telas de autenticação
│   │   ├── onboarding.tsx
│   │   ├── login.tsx
│   │   ├── registro.tsx
│   │   └── login-token.tsx
│   ├── (admin)/           # Painel administrativo
│   │   ├── dashboard.tsx
│   │   ├── agendamentos.tsx
│   │   ├── servicos.tsx
│   │   ├── barbeiros.tsx
│   │   └── configuracoes.tsx
│   ├── _layout.tsx        # Layout raiz
│   └── index.tsx          # Redirecionamento
├── src/
│   ├── components/        # Componentes reutilizáveis
│   │   └── ui/           # Botao, Input, Card, Avatar
│   ├── constants/         # Cores, config
│   ├── services/          # Supabase, Bot, MercadoPago
│   ├── stores/            # Zustand (autenticacao)
│   ├── types/             # TypeScript types
│   └── styles/            # CSS global
├── assets/
│   ├── images/           # Ícones e splash
│   └── fonts/            # Fontes customizadas
└── app.json              # Config Expo
```

## 🎨 Design System

### Cores
```typescript
primaria: '#d4af37'      // Dourado
secundaria: '#1a1a2e'    // Azul escuro
fundo: '#0f0f1a'         // Preto
sucesso: '#10b981'
erro: '#ef4444'
```

### Componentes
- `Botao` - Variantes: primario, secundario, outline, ghost, perigo
- `Input` - Com ícones, senha, erro
- `Card` - Variantes: padrao, destaque, sutil
- `Avatar` - Com fallback para iniciais

## 📲 Build para Play Store

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Build Android
eas build --platform android --profile production

# Submit para Play Store
eas submit --platform android
```

## ⚙️ Variáveis de Ambiente

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_key
EXPO_PUBLIC_R2_PUBLIC_URL=https://xxx.r2.dev
EXPO_PUBLIC_MP_PUBLIC_KEY=sua_key_mp
```

## 📄 Licença

Proprietário - BarberHub © 2024
