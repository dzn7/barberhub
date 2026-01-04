'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { LogoMarca } from '@/components/ui/logo-marca'
import { Botao } from '@/components/ui/botao'
import {
  EditorLogo,
  ServicosMiniGestao,
  CadastroBarbeirosOnboarding,
  PreviewSite
} from '@/components/configuracao'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Store,
  Phone,
  MapPin,
  Instagram,
  Mail,
  Palette,
  Scissors,
  Users,
  ExternalLink,
  Eye,
  LayoutDashboard,
  Globe,
  Calendar,
  Settings,
  Copy,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from 'next-themes'

const PALETAS_SOFISTICADAS = [
  // Tons escuros clássicos
  { nome: 'Obsidian', descricao: 'Elegância clássica', primaria: '#09090b', secundaria: '#fafafa', destaque: '#fafafa' },
  { nome: 'Grafite', descricao: 'Minimalismo moderno', primaria: '#18181b', secundaria: '#f4f4f5', destaque: '#a1a1aa' },
  { nome: 'Midnight', descricao: 'Sofisticação noturna', primaria: '#0c0a09', secundaria: '#fafaf9', destaque: '#a8a29e' },
  { nome: 'Slate', descricao: 'Profissional discreto', primaria: '#0f172a', secundaria: '#f8fafc', destaque: '#94a3b8' },
  { nome: 'Charcoal', descricao: 'Neutro atemporal', primaria: '#171717', secundaria: '#fafafa', destaque: '#d4d4d4' },
  { nome: 'Onyx', descricao: 'Contraste marcante', primaria: '#0a0a0a', secundaria: '#ffffff', destaque: '#737373' },
  // Tons com cor
  { nome: 'Navy', descricao: 'Azul profundo', primaria: '#0c1929', secundaria: '#f0f9ff', destaque: '#38bdf8' },
  { nome: 'Forest', descricao: 'Verde floresta', primaria: '#052e16', secundaria: '#f0fdf4', destaque: '#4ade80' },
  { nome: 'Wine', descricao: 'Vinho elegante', primaria: '#1c0a0a', secundaria: '#fef2f2', destaque: '#f87171' },
  { nome: 'Royal', descricao: 'Roxo real', primaria: '#1e1033', secundaria: '#faf5ff', destaque: '#a78bfa' },
  { nome: 'Copper', descricao: 'Cobre vintage', primaria: '#1c1210', secundaria: '#fffbeb', destaque: '#f59e0b' },
  { nome: 'Ocean', descricao: 'Oceano profundo', primaria: '#0c1a1f', secundaria: '#ecfeff', destaque: '#22d3d8' },
  // Tons claros
  { nome: 'Snow', descricao: 'Branco neve', primaria: '#ffffff', secundaria: '#18181b', destaque: '#71717a' },
  { nome: 'Pearl', descricao: 'Pérola suave', primaria: '#fafafa', secundaria: '#27272a', destaque: '#a1a1aa' },
  { nome: 'Cream', descricao: 'Creme clássico', primaria: '#fffbeb', secundaria: '#292524', destaque: '#a8a29e' },
  { nome: 'Mint', descricao: 'Menta fresca', primaria: '#f0fdf4', secundaria: '#14532d', destaque: '#22c55e' },
]

const ETAPAS = [
  { id: 1, titulo: 'Identidade', icone: Store, descricao: 'Nome e logo' },
  { id: 2, titulo: 'Contato', icone: Phone, descricao: 'Telefone e redes' },
  { id: 3, titulo: 'Localização', icone: MapPin, descricao: 'Endereço' },
  { id: 4, titulo: 'Aparência', icone: Palette, descricao: 'Cores do site' },
  { id: 5, titulo: 'Serviços', icone: Scissors, descricao: 'Seus serviços' },
  { id: 6, titulo: 'Equipe', icone: Users, descricao: 'Profissionais' },
]

const TOTAL_ETAPAS = ETAPAS.length

/**
 * Componente de tela de sucesso após configuração
 * Design premium step-by-step sem parecer feito por IA
 */
interface TelaSucessoProps {
  tenant: {
    id: string
    slug: string
    nome: string
  }
  dados: {
    nome: string
  }
  totalServicos: number
  totalBarbeiros: number
}

function TelaSucessoConfiguracao({ tenant, dados, totalServicos, totalBarbeiros }: TelaSucessoProps) {
  const [linkCopiado, setLinkCopiado] = useState(false)
  const linkPublico = `barberhub.online/${tenant.slug}`
  
  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${linkPublico}`)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    } catch {
      // Fallback para navegadores antigos
      const input = document.createElement('input')
      input.value = `https://${linkPublico}`
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    }
  }

  const proximosPassos = [
    {
      numero: 1,
      titulo: 'Acesse o Painel Administrativo',
      descricao: 'Gerencie agendamentos, veja relatórios e configure sua barbearia',
      link: '/admin',
      textoBotao: 'Abrir Painel',
      icone: LayoutDashboard,
      destaque: true
    },
    {
      numero: 2,
      titulo: 'Veja seu Site Público',
      descricao: 'Confira como seus clientes vão ver sua página de agendamentos',
      link: `/${tenant.slug}`,
      textoBotao: 'Ver Site',
      icone: Globe,
      externo: true
    },
    {
      numero: 3,
      titulo: 'Compartilhe com Clientes',
      descricao: 'Envie o link da sua página para seus clientes agendarem',
      acao: copiarLink,
      textoBotao: linkCopiado ? 'Copiado!' : 'Copiar Link',
      icone: linkCopiado ? CheckCircle2 : Copy
    }
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Header minimalista */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/">
            <LogoMarca className="h-8" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20">

        {/* ttulo principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {dados.nome || tenant.nome} está no ar
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl">
            Sua barbearia está configurada e pronta para receber agendamentos. 
            Veja abaixo os próximos passos para começar.
          </p>
        </motion.div>

        {/* resumo da configuraçao */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">
              Resumo
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-bold text-white">{totalServicos}</p>
                <p className="text-sm text-zinc-500">Serviços</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalBarbeiros}</p>
                <p className="text-sm text-zinc-500">Profissionais</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-zinc-500 mb-1">Seu link</p>
                <div className="flex items-center gap-2">
                  <code className="text-white font-mono text-sm bg-zinc-800 px-3 py-1.5 rounded-lg flex-1 truncate">
                    {linkPublico}
                  </code>
                  <button
                    onClick={copiarLink}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Copiar link"
                  >
                    {linkCopiado ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Próximos passos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider">
            Próximos passos
          </h2>
          
          <div className="space-y-4">
            {proximosPassos.map((passo, index) => {
              const Icone = passo.icone
              
              return (
                <motion.div
                  key={passo.numero}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={`group relative bg-zinc-900/50 border rounded-2xl p-6 transition-all hover:bg-zinc-900 ${
                    passo.destaque 
                      ? 'border-white/20 hover:border-white/40' 
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Número */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      passo.destaque 
                        ? 'bg-white text-black' 
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {passo.numero}
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {passo.titulo}
                      </h3>
                      <p className="text-zinc-400 text-sm mb-4">
                        {passo.descricao}
                      </p>
                      
                      {/* Botão de ação */}
                      {passo.link ? (
                        <Link
                          href={passo.link}
                          target={passo.externo ? '_blank' : undefined}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            passo.destaque
                              ? 'bg-white text-black hover:bg-zinc-200'
                              : 'bg-zinc-800 text-white hover:bg-zinc-700'
                          }`}
                        >
                          <Icone className="w-4 h-4" />
                          {passo.textoBotao}
                          {passo.externo && <ExternalLink className="w-3 h-3 ml-1" />}
                        </Link>
                      ) : (
                        <button
                          onClick={passo.acao}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium text-sm transition-colors"
                        >
                          <Icone className={`w-4 h-4 ${linkCopiado ? 'text-emerald-500' : ''}`} />
                          {passo.textoBotao}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Badge de destaque */}
                  {passo.destaque && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-white text-black text-xs font-medium rounded-full">
                      Recomendado
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Dicas adicionais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12 pt-12 border-t border-zinc-800"
        >
          <h2 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider">
            Dicas para começar
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-zinc-900/30 rounded-xl">
              <Calendar className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium mb-1">Configure seus horários</p>
                <p className="text-xs text-zinc-500">
                  No painel, defina os dias e horários que sua barbearia funciona
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-zinc-900/30 rounded-xl">
              <Settings className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium mb-1">Personalize ainda mais</p>
                <p className="text-xs text-zinc-500">
                  Adicione fotos, ajuste preços e configure notificações
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer com suporte */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-zinc-600">
            Precisa de ajuda? Entre em contato pelo{' '}
            <a 
              href="https://wa.me/5511999999999" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              WhatsApp
            </a>
          </p>
        </motion.div>
      </main>
    </div>
  )
}

export default function ConfigurarPage() {
  const router = useRouter()
  const { user, tenant, carregando: carregandoAuth, atualizarTenant } = useAuth()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [montado, setMontado] = useState(false)
  
  useEffect(() => {
    setMontado(true)
  }, [])
  
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [totalServicos, setTotalServicos] = useState(0)
  const [totalBarbeiros, setTotalBarbeiros] = useState(0)
  const [mostrarPreviewMobile, setMostrarPreviewMobile] = useState(false)
  
  const [dados, setDados] = useState({
    nome: '',
    logo_url: '',
    telefone: '',
    whatsapp: '',
    email: '',
    instagram: '',
    endereco: '',
    cidade: '',
    estado: '',
    cor_primaria: '#18181b',
    cor_secundaria: '#f4f4f5',
    cor_destaque: '#a1a1aa',
  })

  useEffect(() => {
    if (tenant) {
      setDados({
        nome: tenant.nome || '',
        logo_url: tenant.logo_url || '',
        telefone: tenant.telefone || '',
        whatsapp: tenant.whatsapp || '',
        email: tenant.email || '',
        instagram: tenant.instagram || '',
        endereco: tenant.endereco || '',
        cidade: tenant.cidade || '',
        estado: tenant.estado || '',
        cor_primaria: tenant.cor_primaria || '#18181b',
        cor_secundaria: tenant.cor_secundaria || '#f4f4f5',
        cor_destaque: tenant.cor_destaque || '#a1a1aa',
      })
    }
  }, [tenant])

  useEffect(() => {
    if (!carregandoAuth && !user) {
      router.push('/entrar')
    }
  }, [carregandoAuth, user, router])

  const salvarDadosAtuais = async () => {
    if (!tenant) return
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          nome: dados.nome || tenant.nome,
          logo_url: dados.logo_url || null,
          cor_primaria: dados.cor_primaria,
          cor_secundaria: dados.cor_secundaria,
          cor_destaque: dados.cor_destaque,
          telefone: dados.telefone || null,
          whatsapp: dados.whatsapp || null,
          email: dados.email || tenant.email,
          endereco: dados.endereco || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          instagram: dados.instagram || null,
        })
        .eq('id', tenant.id)
      if (error) throw error
      if (atualizarTenant) {
        await atualizarTenant({ ...tenant, ...dados })
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
    }
  }

  const aplicarPaleta = (paleta: typeof PALETAS_SOFISTICADAS[0]) => {
    setDados(prev => ({
      ...prev,
      cor_primaria: paleta.primaria,
      cor_secundaria: paleta.secundaria,
      cor_destaque: paleta.destaque,
    }))
  }

  const avancar = async () => {
    if (etapaAtual < TOTAL_ETAPAS) {
      await salvarDadosAtuais()
      setEtapaAtual(etapaAtual + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const voltar = () => {
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const finalizar = async () => {
    if (!tenant) return
    setSalvando(true)
    try {
      await salvarDadosAtuais()
      setConcluido(true)
    } catch (error) {
      toast({ tipo: 'erro', mensagem: 'Erro ao finalizar configuração' })
    } finally {
      setSalvando(false)
    }
  }

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const alternarTema = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  if (carregandoAuth || !tenant) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (concluido) {
    return (
      <TelaSucessoConfiguracao 
        tenant={tenant}
        dados={dados}
        totalServicos={totalServicos}
        totalBarbeiros={totalBarbeiros}
      />
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/"><LogoMarca className="h-10" /></Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 dark:text-zinc-600 hidden sm:block">Etapa {etapaAtual} de {TOTAL_ETAPAS}</span>
            <button 
              onClick={() => setMostrarPreviewMobile(true)} 
              className="lg:hidden flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              aria-label="Ver preview do site"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            {/* Theme Toggle */}
            {montado && (
              <button
                onClick={alternarTema}
                className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                )}
              </button>
            )}
            <button onClick={() => router.push('/admin')} className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Pular</button>
          </div>
        </div>
      </header>

      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-1 bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden">
            <motion.div className="h-full bg-zinc-900 dark:bg-white" initial={{ width: 0 }} animate={{ width: `${(etapaAtual / TOTAL_ETAPAS) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
          <div className="hidden lg:flex items-center justify-between py-4">
            {ETAPAS.map((etapa) => {
              const Icone = etapa.icone
              const ativa = etapaAtual === etapa.id
              const completa = etapaAtual > etapa.id
              return (
                <button key={etapa.id} onClick={() => etapa.id < etapaAtual && setEtapaAtual(etapa.id)} disabled={etapa.id > etapaAtual} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${ativa ? 'bg-zinc-900/10 dark:bg-white/10' : completa ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${ativa ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' : completa ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-white' : 'bg-zinc-200 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600'}`}>
                    {completa ? <Check className="w-4 h-4" /> : <Icone className="w-4 h-4" />}
                  </div>
                  <div className="text-left"><p className={`text-sm font-medium ${ativa ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>{etapa.titulo}</p></div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {etapaAtual === 1 && (
                <motion.div key="etapa1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div><h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Identidade da sua barbearia</h2><p className="text-zinc-500 dark:text-zinc-400">Como seus clientes vão conhecer você</p></div>
                  <div className="space-y-6">
                    <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Nome da Barbearia *</label><input type="text" value={dados.nome} onChange={e => setDados({ ...dados, nome: e.target.value })} placeholder="Ex: Barbearia Premium" className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div>
                    <EditorLogo logoUrl={dados.logo_url} tenantId={tenant.id} onLogoChange={(url) => setDados({ ...dados, logo_url: url })} corPrimaria={dados.cor_primaria} corSecundaria={dados.cor_secundaria} />
                  </div>
                </motion.div>
              )}
              {etapaAtual === 2 && (
                <motion.div key="etapa2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div><h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Informações de contato</h2><p className="text-zinc-500 dark:text-zinc-400">Como seus clientes podem falar com você</p></div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Telefone</label><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="tel" value={dados.telefone} onChange={e => setDados({ ...dados, telefone: formatarTelefone(e.target.value) })} placeholder="(00) 0000-0000" className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">WhatsApp *</label><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="tel" value={dados.whatsapp} onChange={e => setDados({ ...dados, whatsapp: formatarTelefone(e.target.value) })} placeholder="(00) 00000-0000" className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div><p className="text-xs text-zinc-500 dark:text-zinc-600 mt-1">Usado para agendamentos</p></div>
                    </div>
                    <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">E-mail</label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="email" value={dados.email} onChange={e => setDados({ ...dados, email: e.target.value })} placeholder="contato@barbearia.com" className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div></div>
                    <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Instagram</label><div className="relative"><Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="text" value={dados.instagram} onChange={e => setDados({ ...dados, instagram: e.target.value })} placeholder="@suabarbearia" className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div></div>
                  </div>
                </motion.div>
              )}
              {etapaAtual === 3 && (
                <motion.div key="etapa3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div><h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Onde fica sua barbearia</h2><p className="text-zinc-500 dark:text-zinc-400">Ajude seus clientes a te encontrar</p></div>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Endereço completo</label><div className="relative"><MapPin className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="text" value={dados.endereco} onChange={e => setDados({ ...dados, endereco: e.target.value })} placeholder="Rua, número, bairro" className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Cidade</label><input type="text" value={dados.cidade} onChange={e => setDados({ ...dados, cidade: e.target.value })} placeholder="São Paulo" className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Estado</label><input type="text" value={dados.estado} onChange={e => setDados({ ...dados, estado: e.target.value.toUpperCase() })} placeholder="SP" maxLength={2} className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all uppercase" /></div>
                    </div>
                  </div>
                </motion.div>
              )}
              {etapaAtual === 4 && (
                <motion.div key="etapa4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div><h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Aparência do seu site</h2><p className="text-zinc-500 dark:text-zinc-400">Escolha as cores que representam sua marca</p></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PALETAS_SOFISTICADAS.map((paleta) => {
                      const selecionada = dados.cor_primaria === paleta.primaria
                      return (
                        <button key={paleta.nome} onClick={() => aplicarPaleta(paleta)} className={`relative p-4 rounded-xl border-2 transition-all ${selecionada ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                          {selecionada && <div className="absolute top-2 right-2"><Check className="w-4 h-4 text-zinc-900 dark:text-white" /></div>}
                          <div className="flex gap-2 mb-3"><div className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: paleta.primaria }} /><div className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: paleta.secundaria }} /></div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white text-left">{paleta.nome}</p><p className="text-xs text-zinc-500 text-left">{paleta.descricao}</p>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
              {etapaAtual === 5 && (
                <motion.div key="etapa5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div><h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Cadastre seus serviços</h2><p className="text-zinc-500 dark:text-zinc-400">O que sua barbearia oferece aos clientes</p></div>
                  <ServicosMiniGestao tenantId={tenant.id} limiteServicos={tenant.limite_servicos || 10} onTotalChange={setTotalServicos} />
                </motion.div>
              )}
              {etapaAtual === 6 && (
                <motion.div key="etapa6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div><h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Sua equipe de profissionais</h2><p className="text-zinc-500 dark:text-zinc-400">Cadastre os barbeiros que trabalham com você e gere os códigos de acesso</p></div>
                  <CadastroBarbeirosOnboarding tenantId={tenant.id} limiteBarbeiros={tenant.limite_barbeiros || 2} onTotalChange={setTotalBarbeiros} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              {etapaAtual > 1 ? (
                <Botao type="button" variante="fantasma" onClick={voltar} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Botao>
              ) : <div />}
              {etapaAtual < TOTAL_ETAPAS ? (
                <Botao type="button" onClick={avancar} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200">Continuar<ArrowRight className="w-4 h-4 ml-2" /></Botao>
              ) : (
                <Botao type="button" onClick={finalizar} disabled={salvando} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200">
                  {salvando ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Finalizando...</>) : (<><Check className="w-4 h-4 mr-2" />Finalizar</>)}
                </Botao>
              )}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-8"><PreviewSite dados={dados} totalServicos={totalServicos} totalBarbeiros={totalBarbeiros} /></div>
          </div>
        </div>

        {/* Modal de Preview Mobile */}
        <AnimatePresence>
          {mostrarPreviewMobile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <span className="text-white font-medium">Preview do Site</span>
                  <button
                    onClick={() => setMostrarPreviewMobile(false)}
                    className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <PreviewSite dados={dados} totalServicos={totalServicos} totalBarbeiros={totalBarbeiros} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
