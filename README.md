# Barber Hub - Landing Page

Landing page profissional para o Barber Hub, sistema completo de gestão para barbearias.

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS 3.4** - Framework CSS utility-first
- **shadcn/ui** - Componentes de UI reutilizáveis
- **Framer Motion** - Animações e transições suaves
- **Lucide React** - Ícones modernos e consistentes
- **next-themes** - Alternância de tema dark/light

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar servidor de produção
npm start
```

## 🎨 Características

- ✅ Design responsivo e mobile-first
- ✅ Tema dark/light com transições suaves
- ✅ Animações otimizadas com Framer Motion
- ✅ Performance excepcional (Core Web Vitals otimizados)
- ✅ SEO otimizado com metadata completa
- ✅ Acessibilidade WCAG AA
- ✅ Código 100% em português brasileiro
- ✅ Componentes modulares e reutilizáveis
- ✅ TypeScript para segurança de tipos

## 📁 Estrutura do Projeto

```
barberhub/
├── app/                      # App Router do Next.js
│   ├── layout.tsx           # Layout raiz
│   ├── page.tsx             # Página inicial
│   └── globals.css          # Estilos globais
├── components/
│   ├── layout/              # Componentes de layout
│   │   ├── cabecalho.tsx
│   │   ├── rodape.tsx
│   │   └── alternador-tema.tsx
│   ├── secoes/              # Seções da landing page
│   │   ├── secao-hero.tsx
│   │   ├── secao-recursos.tsx
│   │   ├── secao-beneficios.tsx
│   │   ├── secao-demonstracao.tsx
│   │   └── secao-contato.tsx
│   ├── ui/                  # Componentes UI base
│   │   ├── botao.tsx
│   │   └── cartao.tsx
│   └── provedores/          # Context providers
│       └── provedor-tema.tsx
├── lib/
│   └── utils.ts             # Funções utilitárias
└── public/                  # Assets estáticos

## 🎯 Seções da Landing Page

1. **Hero** - Apresentação impactante com CTAs principais
2. **Recursos** - Funcionalidades principais do sistema
3. **Benefícios** - Vantagens competitivas e valor agregado
4. **Demonstração** - Preview visual da interface
5. **Contato** - Canais de comunicação e CTA final

## 🌐 Deploy

O projeto está pronto para deploy em:

- **Vercel** (recomendado)
- **Netlify**
- **AWS Amplify**
- Qualquer plataforma que suporte Next.js

```bash
# Deploy na Vercel
vercel

# Ou conecte seu repositório Git para deploy automático
```

## 📱 Responsividade

Breakpoints otimizados para:
- Mobile: 320px - 640px
- Tablet: 641px - 1024px
- Desktop: 1025px+
- Ultra-wide: 1920px+

## ♿ Acessibilidade

- Navegação completa por teclado
- ARIA labels apropriados
- Contraste WCAG AA/AAA
- Suporte a leitores de tela
- Respeita prefers-reduced-motion

## 🎨 Personalização

### Cores

Edite as variáveis CSS em `app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  /* ... */
}
```

### Conteúdo

Todos os textos estão nos componentes das seções em `components/secoes/`.

## 📄 Licença

Projeto proprietário - Barber Hub © 2024

## 👨‍💻 Desenvolvido com

Código limpo, semântico e seguindo as melhores práticas de desenvolvimento web moderno.
