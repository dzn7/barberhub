# BarberHub - Sistema SaaS Multi-Tenant

## 🚀 Configuração Rápida

### 1. Instalar dependências
```bash
cd barberhub
npm install
```

### 2. Configurar variáveis de ambiente
O arquivo `.env.local` já está configurado com as credenciais do Supabase.

### 3. Iniciar o servidor
```bash
npm run dev
```
O servidor iniciará na porta **3001** (http://localhost:3001)

---

## 📁 Estrutura do Projeto

```
barberhub/
├── app/
│   ├── page.tsx              # Landing page principal
│   ├── registrar/page.tsx    # Página de registro (14 dias trial)
│   ├── entrar/page.tsx       # Página de login
│   ├── admin/
│   │   ├── layout.tsx        # Layout protegido por autenticação
│   │   ├── page.tsx          # Dashboard do proprietário
│   │   ├── servicos/         # Gerenciar serviços
│   │   └── barbeiros/        # Gerenciar barbeiros
│   └── api/
│       └── upload/route.ts   # API de upload para Cloudflare R2
├── contexts/
│   └── AuthContext.tsx       # Contexto de autenticação
├── lib/
│   ├── supabase.ts          # Cliente Supabase
│   └── types.ts             # Tipos TypeScript
└── components/
    └── ...                   # Componentes da landing page
```

---

## 🔐 Fluxo de Autenticação

### Registro (14 dias grátis)
1. Usuário acessa `/registrar`
2. Preenche: nome da barbearia, slug, dados pessoais, senha
3. Sistema cria:
   - Usuário no Supabase Auth
   - Tenant (barbearia) com trial de 14 dias
   - Proprietário vinculado ao tenant
   - Configurações padrão
   - Barbeiro exemplo e serviços iniciais
4. Redireciona para `/admin` com modal de boas-vindas

### Login
1. Usuário acessa `/entrar`
2. Insere email e senha
3. Redireciona para `/admin`

---

## 🎨 Painel Admin (`/admin`)

### Funcionalidades:
- **Personalização visual**: Logo, cores (primária, secundária, destaque)
- **Informações**: Nome, telefone, WhatsApp, endereço, redes sociais
- **Gerenciamento**:
  - Serviços (nome, descrição, duração, preço, categoria)
  - Barbeiros (nome, email, telefone, especialidades, comissão, foto)
  - Agendamentos (visualização)
  - Horários de funcionamento

### Upload de Imagens
- Integração com **Cloudflare R2**
- Suporte para: JPEG, PNG, WebP, GIF
- Tamanho máximo: 5MB
- Armazenamento organizado por tenant

---

## 🔗 URLs do Sistema

| Rota | Descrição |
|------|-----------|
| `/` | Landing page do SaaS |
| `/registrar` | Criar conta (14 dias grátis) |
| `/entrar` | Login do proprietário |
| `/admin` | Painel administrativo |
| `/admin/servicos` | Gerenciar serviços |
| `/admin/barbeiros` | Gerenciar barbeiros |
| `/{slug}` | Página pública da barbearia |
| `/{slug}/agendar` | Agendamento online |

---

## 📊 Banco de Dados (Supabase)

### Tabelas Principais:
- `tenants` - Barbearias cadastradas
- `proprietarios` - Donos das barbearias
- `assinaturas` - Planos e pagamentos
- `barbeiros` - Profissionais
- `servicos` - Catálogo de serviços
- `clientes` - Base de clientes
- `agendamentos` - Reservas
- `configuracoes_barbearia` - Horários e preferências

### RLS (Row Level Security):
- Todas as tabelas protegidas por tenant_id
- Isolamento completo entre barbearias
- Políticas de leitura pública para dados necessários ao agendamento

---

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **Estilização**: Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth)
- **Storage**: Cloudflare R2
- **Componentes**: Radix UI, Lucide Icons

---

## 📝 Próximos Passos

1. [ ] Implementar página de configuração de horários
2. [ ] Adicionar sistema de notificações (WhatsApp/Email)
3. [ ] Criar dashboard com métricas
4. [ ] Implementar sistema de pagamento (Stripe/Mercado Pago)
5. [ ] Adicionar relatórios financeiros
