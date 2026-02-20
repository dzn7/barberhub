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
  Moon,
  Hand
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { obterTerminologia } from '@/lib/configuracoes-negocio'

import { TipoNegocio, ehTipoNegocioFeminino } from '@/lib/tipos-negocio'

/**
 * Paletas de cores para Barbearias (tons masculinos e neutros)
 */
const PALETAS_BARBEARIA = [
  { nome: 'Obsidian', descricao: 'Elegância clássica', primaria: '#09090b', secundaria: '#fafafa', destaque: '#18181b' },
  { nome: 'Grafite', descricao: 'Minimalismo moderno', primaria: '#18181b', secundaria: '#f4f4f5', destaque: '#27272a' },
  { nome: 'Slate', descricao: 'Profissional discreto', primaria: '#0f172a', secundaria: '#f8fafc', destaque: '#334155' },
  { nome: 'Snow', descricao: 'Branco neve', primaria: '#ffffff', secundaria: '#09090b', destaque: '#18181b' },
]

/**
 * Paletas de cores para Nail Designers
 */
const PALETAS_NAIL_DESIGNER = [
  { nome: 'Rose Quartz', descricao: 'Minimalista rosa', primaria: '#fff1f2', secundaria: '#09090b', destaque: '#be185d' },
  { nome: 'Pearl White', descricao: 'Clássico e limpo', primaria: '#ffffff', secundaria: '#18181b', destaque: '#ec4899' },
  { nome: 'Soft Nude', descricao: 'Neutro elegante', primaria: '#fafaf9', secundaria: '#1c1917', destaque: '#d6d3d1' },
  { nome: 'Midnight Rose', descricao: 'Contraste moderno', primaria: '#09090b', secundaria: '#fff1f2', destaque: '#f43f5e' },
]

/**
 * Paletas de cores para Lash Designers
 */
const PALETAS_LASH_DESIGNER = [
  { nome: 'Lavender', descricao: 'Suave e moderno', primaria: '#faf5ff', secundaria: '#09090b', destaque: '#7c3aed' },
  { nome: 'Dark Violet', descricao: 'Profundo e luxuoso', primaria: '#0f172a', secundaria: '#f8fafc', destaque: '#8b5cf6' },
  { nome: 'Pure Silk', descricao: 'Branco acetinado', primaria: '#ffffff', secundaria: '#09090b', destaque: '#a855f7' },
  { nome: 'Slate Velvet', descricao: 'Cinza aveludado', primaria: '#f8fafc', secundaria: '#0f172a', destaque: '#475569' },
]

/**
 * Paletas de cores para Cabeleireiras
 */
const PALETAS_CABELEIREIRA = [
  { nome: 'Platinum', descricao: 'Frio e sofisticado', primaria: '#f1f5f9', secundaria: '#0f172a', destaque: '#64748b' },
  { nome: 'Classic Noir', descricao: 'Preto e branco', primaria: '#ffffff', secundaria: '#000000', destaque: '#171717' },
  { nome: 'Blush Sand', descricao: 'Areia elegante', primaria: '#fafaf9', secundaria: '#1c1917', destaque: '#a8a29e' },
  { nome: 'Dark Teal', descricao: 'Contraste único', primaria: '#042f2e', secundaria: '#f0fdfa', destaque: '#0d9488' },
]

/**
 * Retorna as paletas de cores baseadas no tipo de negócio
 */
function obterPaletas(tipoNegocio: TipoNegocio | undefined) {
  if (tipoNegocio === 'nail_designer') return PALETAS_NAIL_DESIGNER
  if (tipoNegocio === 'lash_designer') return PALETAS_LASH_DESIGNER
  if (tipoNegocio === 'cabeleireira') return PALETAS_CABELEIREIRA
  return PALETAS_BARBEARIA
}

/**
 * Retorna as etapas do onboarding baseadas no tipo de negócio
 */
function obterEtapas(tipoNegocio: TipoNegocio | undefined) {
  const tipoAtual = tipoNegocio || 'barbearia'
  const terminologia = obterTerminologia(tipoAtual)
  const ehSegmentoFeminino = ehTipoNegocioFeminino(tipoAtual)
  const estabelecimento = terminologia.estabelecimento.singular.toLowerCase()
  const artigoEstabelecimento = terminologia.estabelecimento.artigo === 'a' ? 'da' : 'do'
  const pronomeEstabelecimento = terminologia.estabelecimento.artigo === 'a' ? 'sua' : 'seu'
  const profissionais = terminologia.profissional.plural.toLowerCase()
  const profissional = terminologia.profissional.singular.toLowerCase()
  const pronomeClientes = ehSegmentoFeminino ? 'suas clientes' : 'seus clientes'
  const cadaProfissional = ehSegmentoFeminino ? 'cada uma' : 'cada um'

  return [
    {
      id: 1,
      titulo: 'Identidade',
      icone: Store,
      descricao: 'Nome e logo',
      tituloCompleto: `Identidade ${artigoEstabelecimento} ${pronomeEstabelecimento} ${estabelecimento}`,
      subtitulo: 'Vamos começar pelo básico: como clientes vão conhecer seu trabalho',
      tempoEstimado: '1 min',
      dicas: [
        `Use o nome oficial ${artigoEstabelecimento} ${pronomeEstabelecimento} ${estabelecimento}`,
        'A logo aparecerá no site e nos agendamentos',
        'Você pode alterar depois a qualquer momento'
      ]
    },
    {
      id: 2,
      titulo: 'Contato',
      icone: Phone,
      descricao: 'Telefone e redes',
      tituloCompleto: 'Informações de contato',
      subtitulo: `Como ${pronomeClientes} podem entrar em contato com você`,
      tempoEstimado: '1 min',
      dicas: [
        'O WhatsApp é essencial para receber notificações de agendamentos',
        'Instagram é ótimo para mostrar seu portfólio e atrair novos agendamentos',
        'E-mail é usado para comunicações importantes'
      ]
    },
    {
      id: 3,
      titulo: 'Localização',
      icone: MapPin,
      descricao: 'Endereço',
      tituloCompleto: `Onde fica ${pronomeEstabelecimento} ${estabelecimento}`,
      subtitulo: `Ajude ${pronomeClientes} a te encontrarem facilmente`,
      tempoEstimado: '30 seg',
      dicas: [
        'Endereço completo facilita a navegação GPS',
        'Inclua referências se necessário',
        'Cidade e estado ajudam em buscas locais'
      ]
    },
    {
      id: 4,
      titulo: 'Aparência',
      icone: Palette,
      descricao: 'Cores do site',
      tituloCompleto: 'Aparência do seu site',
      subtitulo: 'Escolha as cores que representam a identidade da sua marca',
      tempoEstimado: '30 seg',
      dicas: ehSegmentoFeminino ? [
        'Cores suaves transmitem delicadeza e sofisticação',
        'Tons rosados e nude são populares no segmento',
        'Veja o preview ao lado para conferir como ficará'
      ] : [
        'Cores escuras passam sofisticação',
        'Cores claras são mais leves e modernas',
        'Veja o preview ao lado para conferir como ficará'
      ]
    },
    {
      id: 5,
      titulo: 'Serviços',
      icone: ehSegmentoFeminino ? Hand : Scissors,
      descricao: 'Seus serviços',
      tituloCompleto: 'Cadastre seus serviços',
      subtitulo: `Defina o que ${pronomeEstabelecimento} ${estabelecimento} oferece, com preço e duração`,
      tempoEstimado: '2-3 min',
      dicas: [
        'Adicione os principais serviços que você oferece',
        'A duração ajuda a organizar a agenda automaticamente',
        'Você pode adicionar ou editar serviços depois no painel'
      ]
    },
    {
      id: 6,
      titulo: 'Equipe',
      icone: Users,
      descricao: 'Profissionais',
      tituloCompleto: 'Sua equipe de profissionais',
      subtitulo: `Cadastre ${terminologia.profissional.artigoPlural} ${profissionais} e gere códigos de acesso para ${cadaProfissional}`,
      tempoEstimado: '2-3 min',
      dicas: [
        `Cada ${profissional} recebe um código único de acesso`,
        'Cada profissional verá apenas os próprios agendamentos',
        'Você pode gerenciar comissões pelo painel admin'
      ]
    },
  ]
}

type EtapaOnboarding = ReturnType<typeof obterEtapas>[0]

interface CabecalhoEtapaProps {
  etapa: EtapaOnboarding
  etapaAtual: number
  totalEtapas: number
}

function CabecalhoEtapa({ etapa, etapaAtual, totalEtapas }: CabecalhoEtapaProps) {
  const Icone = etapa.icone
  const percentual = Math.round((etapaAtual / totalEtapas) * 100)

  return (
    <div className="mb-8 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Passo {etapaAtual} de {totalEtapas}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{percentual}% concluído</p>
        </div>
        <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full bg-zinc-900 dark:bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${percentual}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Icone className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              {etapa.tituloCompleto}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base">
              {etapa.subtitulo}
            </p>
          </div>
        </div>
        <div className="mt-5 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Nesta etapa você vai:
          </p>
          <ul className="space-y-2">
            {etapa.dicas.map((dica, index) => (
              <li key={index} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                • {dica}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * Componente de tela de sucesso após configuração
 * Design acolhedor, explicativo e celebratório
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
  tipoNegocio?: TipoNegocio
}

/**
 * Ícone de check animado para celebração
 */
function IconeCheckAnimado() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.2
      }}
      className="relative"
    >
      {/* Círculo externo com gradiente sutil */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 flex items-center justify-center">
        {/* Círculo interno */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
          className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25"
        >
          {/* Check mark animado */}
          <motion.svg
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="w-7 h-7 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        </motion.div>
      </div>

      {/* Pulso sutil */}
      <motion.div
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: 1.5, opacity: 0 }}
        transition={{ delay: 0.8, duration: 1, repeat: 2 }}
        className="absolute inset-0 rounded-full bg-emerald-400/30"
      />
    </motion.div>
  )
}

/**
 * Passo estilo Notificação/Stepper (Design clean e animado)
 */
interface NotificationStepProps {
  numero: number
  titulo: string
  descricao: string
  link?: string
  acao?: () => void
  textoBotao: string
  icone: React.ElementType
  externo?: boolean
  destaque?: boolean
  delay: number
}

function PassoInovador({
  numero,
  titulo,
  descricao,
  link,
  acao,
  textoBotao,
  icone: Icone,
  externo,
  destaque,
  delay
}: NotificationStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ delay: delay || 0, duration: 0.5, ease: "easeOut" }}
      className="relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 py-16 border-b border-zinc-100 dark:border-zinc-900/50 last:border-0 group overflow-hidden"
    >
      {/* Giant Number Watermark */}
      <div className="absolute -left-10 md:left-0 top-0 md:-top-16 text-[180px] md:text-[240px] font-black tracking-tighter text-zinc-50 dark:text-zinc-900/30 z-0 select-none pointer-events-none transition-all duration-700 ease-out group-hover:scale-105 group-hover:text-zinc-100 dark:group-hover:text-zinc-900/60 mix-blend-multiply dark:mix-blend-lighten">
        0{numero}
      </div>

      {/* Floating Icon */}
      <div className="relative z-10 hidden md:flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-800 dark:to-zinc-900 shadow-2xl shadow-zinc-200/50 dark:shadow-black/60 group-hover:shadow-emerald-500/10 transition-all duration-500 ring-1 ring-zinc-200/50 dark:ring-zinc-800">
        <Icone className={`w-10 h-10 ${destaque ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'} group-hover:scale-110 transition-transform duration-500`} />
      </div>

      <div className="relative z-10 flex-1 max-w-2xl px-4 md:px-0 mt-8 md:mt-0">
        <h3 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight leading-[1.1]">
          {titulo}
        </h3>
        <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
          {descricao}
        </p>
      </div>

      <div className="relative z-10 px-4 md:px-0 mt-6 md:mt-0 w-full md:w-auto">
        {link ? (
          <Link
            href={link}
            target={externo ? '_blank' : undefined}
            className={`flex items-center justify-center gap-3 px-8 py-5 rounded-full font-bold text-base transition-all duration-300 w-full md:w-auto
              ${destaque
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-2xl shadow-zinc-900/20 dark:shadow-white/10'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:scale-105'}`}
          >
            {textoBotao}
            {externo ? <ExternalLink className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          </Link>
        ) : (
          <button
            onClick={acao}
            className={`flex items-center justify-center gap-3 px-8 py-5 rounded-full font-bold text-base transition-all duration-300 w-full md:w-auto hover:scale-105
               bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800`}
          >
            {Icone !== Copy && <Icone className="w-5 h-5" />}
            {textoBotao}
          </button>
        )}
      </div>
    </motion.div>
  )
}

function TelaSucessoConfiguracao({ tenant, dados, totalServicos, totalBarbeiros, tipoNegocio }: TelaSucessoProps) {
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [mostrarPassos, setMostrarPassos] = useState(false)
  const linkPublico = `barberhub.online/${tenant.slug}`
  const tipoAtual = tipoNegocio || 'barbearia'
  const terminologia = obterTerminologia(tipoAtual)
  const ehSegmentoFeminino = ehTipoNegocioFeminino(tipoAtual)
  const estabelecimento = terminologia.estabelecimento.singular.toLowerCase()
  const artigoEstabelecimento = terminologia.estabelecimento.artigo
  const possessivoEstabelecimento = artigoEstabelecimento === 'a' ? 'sua' : 'seu'
  const possessivoEstabelecimentoCapitalizado = `${possessivoEstabelecimento.charAt(0).toUpperCase()}${possessivoEstabelecimento.slice(1)}`
  const contracaoEstabelecimento = artigoEstabelecimento === 'a' ? 'da' : 'do'
  const pronomeClientes = ehSegmentoFeminino ? 'suas clientes' : 'seus clientes'
  const clienteSingular = ehSegmentoFeminino ? 'uma cliente' : 'um cliente'
  const nomeNegocio = dados.nome || tenant.nome

  // Scroll para o topo ao montar o componente
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const timer = setTimeout(() => {
      setMostrarPassos(true)
      setTimeout(() => {
        document.getElementById('sucesso-passos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }, 1800)
    return () => clearTimeout(timer)
  }, [])

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://${linkPublico}`)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 3000)
    } catch {
      const input = document.createElement('input')
      input.value = `https://${linkPublico}`
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black transition-colors">
      {/* Header minimalista */}
      <header className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/">
            <LogoMarca className="h-8" />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 md:py-16 relative z-10 overflow-hidden">
        {/* Seção central épica de celebração */}
        <motion.div
          className="text-center flex flex-col items-center justify-center relative"
          initial={false}
          animate={{ minHeight: mostrarPassos ? '15vh' : '80vh' }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        >
          {mostrarPassos && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 dark:via-black/50 to-white dark:to-black z-[-1] pointer-events-none"
            />
          )}

          {/* Ícone gigante */}
          <motion.div
            className="flex justify-center mb-6"
            animate={{
              scale: mostrarPassos ? 0.7 : 1,
              y: mostrarPassos ? 0 : 20
            }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            <IconeCheckAnimado />
          </motion.div>

          {/* Headline Monumental */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 mb-4 tracking-tight leading-tight">
              Tudo pronto!
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto text-lg md:text-xl font-medium tracking-tight">
              Sua página está no ar. O processo de agendamento agora é elegante e automático.
            </p>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {mostrarPassos && (
            <motion.div
              id="sucesso-passos"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="pt-8 md:pt-16 pb-20"
            >

              {/* O Link em formato de Browser Bar Ultra-minimalista */}
              <div className="max-w-3xl mx-auto mb-20">
                <p className="text-center text-xs md:text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-5">Link de Agendamento</p>
                <div className="relative group cursor-pointer" onClick={copiarLink}>
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-full blur opacity-20 group-hover:opacity-30 transition duration-500" />
                  <div className="relative flex items-center bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 rounded-full p-2 pl-6 pr-3 shadow-xl transition-all hover:scale-[1.01]">
                    <span className="text-emerald-500 mr-3">
                      <Globe className="w-5 h-5 md:w-6 md:h-6" />
                    </span>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-lg md:text-2xl font-medium text-zinc-900 dark:text-white truncate">
                        {linkPublico}
                      </p>
                    </div>
                    <div className={`ml-4 px-5 py-3 rounded-full font-bold text-xs md:text-sm text-white transition-all
                      ${linkCopiado ? 'bg-emerald-500' : 'bg-zinc-900 dark:bg-zinc-800'}`}>
                      {linkCopiado ? 'Copiado!' : 'Copiar'}
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex justify-center gap-10 opacity-80">
                  <div className="text-center">
                    <p className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white leading-none">{totalServicos}</p>
                    <p className="text-zinc-500 font-medium tracking-tight mt-1 uppercase text-xs">Serviços</p>
                  </div>
                  <div className="w-px bg-zinc-200 dark:bg-zinc-800"></div>
                  <div className="text-center">
                    <p className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white leading-none">{totalBarbeiros}</p>
                    <p className="text-zinc-500 font-medium tracking-tight mt-1 uppercase text-xs">Profissionais</p>
                  </div>
                </div>
              </div>

              {/* Steps Inovadores sem cards */}
              <div className="flex flex-col gap-8 md:gap-0 relative">
                <PassoInovador
                  numero={1}
                  titulo="Painel de Controle"
                  descricao="Acesse seu painel para ver os agendamentos pipocando, o faturamento e defina suas folgas ou novos serviços."
                  link="/admin"
                  textoBotao="Acessar o Painel"
                  icone={LayoutDashboard}
                  destaque={true}
                  delay={0.1}
                />

                <PassoInovador
                  numero={2}
                  titulo="Veja a Experiência"
                  descricao="Acesse sua página pública e veja como os seus clientes realizarão agendamentos de forma limpa e atual."
                  link={`/${tenant.slug}`}
                  textoBotao="Ir para minha tela"
                  icone={Eye}
                  externo={true}
                  delay={0.2}
                />

                <PassoInovador
                  numero={3}
                  titulo="Compartilhe seu Link"
                  descricao="Coloque o seu link na bio do Instagram e dispare no WhatsApp. Deixe o sistema gerenciar sua agenda por você."
                  acao={copiarLink}
                  textoBotao={linkCopiado ? "Link copiado!" : "Copiar meu Link"}
                  icone={linkCopiado ? Check : Copy}
                  destaque={false}
                  delay={0.3}
                />
              </div>

              {/* Footer com suporte */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center md:text-left flex flex-col items-center mt-32"
              >
                <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 font-medium tracking-tight">
                    Ainda com aquele frio na barriga?
                  </p>
                  <p className="text-sm text-zinc-500 mb-6">
                    A gente tá aqui. Chame a qualquer hora.
                  </p>
                  <a
                    href="https://wa.me/5511999999999"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex justify-center items-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-white dark:bg-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 shadow hover:shadow-md transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Falar com a Equipe
                  </a>
                </div>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
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

  // Obtém etapas e paletas dinâmicas baseadas no tipo de negócio
  const tipoNegocio = tenant?.tipo_negocio as TipoNegocio | undefined
  const ETAPAS = obterEtapas(tipoNegocio)
  const PALETAS = obterPaletas(tipoNegocio)
  const TOTAL_ETAPAS = ETAPAS.length
  const ehSegmentoFeminino = ehTipoNegocioFeminino(tipoNegocio)
  const tipoNegocioAtual: TipoNegocio = tipoNegocio || 'barbearia'
  const terminologiaNegocio = obterTerminologia(tipoNegocioAtual)
  const artigoNomeEstabelecimento = terminologiaNegocio.estabelecimento.artigo === 'a' ? 'da' : 'do'
  const nomeEstabelecimento = terminologiaNegocio.estabelecimento.singular
  const placeholderNomePorTipo: Record<TipoNegocio, string> = {
    barbearia: 'Ex: Barbearia Premium',
    nail_designer: 'Ex: Estúdio Bella Nails',
    lash_designer: 'Ex: Estúdio Bella Cílios',
    cabeleireira: 'Ex: Salão Bella'
  }
  const placeholderEmailPorTipo: Record<TipoNegocio, string> = {
    barbearia: 'contato@barbeariapremium.com',
    nail_designer: 'contato@estudiobellanails.com',
    lash_designer: 'contato@estudiobellacilios.com',
    cabeleireira: 'contato@salaobella.com'
  }
  const placeholderInstagramPorTipo: Record<TipoNegocio, string> = {
    barbearia: '@barbeariapremium',
    nail_designer: '@estudiobellanails',
    lash_designer: '@estudiobellacilios',
    cabeleireira: '@salaobella'
  }
  const visualPorTipo: Record<TipoNegocio, {
    destaque: string
    destaqueSuave: string
    bgClass: string
    titulo: string
    subtitulo: string
  }> = {
    barbearia: {
      destaque: '#18181b',
      destaqueSuave: '#e4e4e7',
      bgClass: 'bg-zinc-50 dark:bg-zinc-950',
      titulo: 'Configure seu negócio com clareza',
      subtitulo: 'Fluxo guiado para publicar sua página de agendamento com uma aparência profissional.'
    },
    nail_designer: {
      destaque: '#be185d',
      destaqueSuave: '#fbcfe8',
      bgClass: 'bg-pink-50 dark:bg-zinc-950',
      titulo: 'Deixe sua marca visual impecável',
      subtitulo: 'Monte um perfil elegante do seu estúdio e publique com identidade própria.'
    },
    lash_designer: {
      destaque: '#7c3aed',
      destaqueSuave: '#ddd6fe',
      bgClass: 'bg-violet-50 dark:bg-zinc-950',
      titulo: 'Crie uma presença premium para seu estúdio',
      subtitulo: 'Organize dados, serviços e equipe em um fluxo objetivo e fácil de usar.'
    },
    cabeleireira: {
      destaque: '#0f766e',
      destaqueSuave: '#99f6e4',
      bgClass: 'bg-teal-50 dark:bg-zinc-950',
      titulo: 'Organize seu salão em poucos passos',
      subtitulo: 'Defina identidade, serviços e equipe com uma experiência simples e planejada.'
    }
  }
  const visualAtual = visualPorTipo[tipoNegocioAtual]

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
    icone_pwa_192: '',
    icone_pwa_512: '',
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
        icone_pwa_192: tenant.icone_pwa_192 || '',
        icone_pwa_512: tenant.icone_pwa_512 || '',
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
          icone_pwa_192: dados.icone_pwa_192 || null,
          icone_pwa_512: dados.icone_pwa_512 || null,
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

  const aplicarPaleta = (paleta: typeof PALETAS_BARBEARIA[0]) => {
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

  const classeInputBase = 'w-full px-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-white/20 focus:border-zinc-500 dark:focus:border-zinc-500 transition-all'
  const classeInputComIcone = `w-full pl-12 pr-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-white/20 focus:border-zinc-500 dark:focus:border-zinc-500 transition-all`

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
        tipoNegocio={tipoNegocioAtual}
      />
    )
  }

  return (
    <div className={`min-h-screen transition-colors ${visualAtual.bgClass}`}>
      <header className="border-b border-zinc-200/80 dark:border-zinc-800 bg-white/85 dark:bg-black/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/"><LogoMarca className="h-10" /></Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarPreviewMobile(true)}
              className="lg:hidden inline-flex items-center gap-2 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              aria-label="Ver preview do site"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            {montado && (
              <button
                onClick={alternarTema}
                className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                )}
              </button>
            )}
            <button onClick={() => router.push('/admin')} className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              Pular
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{visualAtual.titulo}</h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-1">{visualAtual.subtitulo}</p>
        </div>
      </header>

      <div className="border-b border-zinc-200/70 dark:border-zinc-800 bg-white/75 dark:bg-black/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <div className="h-2 bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full"
              style={{ backgroundColor: visualAtual.destaque }}
              initial={{ width: 0 }}
              animate={{ width: `${(etapaAtual / TOTAL_ETAPAS) * 100}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
          <div className="hidden lg:grid grid-cols-6 gap-2">
            {ETAPAS.map((etapa) => {
              const Icone = etapa.icone
              const ativa = etapaAtual === etapa.id
              const completa = etapaAtual > etapa.id
              return (
                <button
                  key={etapa.id}
                  onClick={() => etapa.id < etapaAtual && setEtapaAtual(etapa.id)}
                  disabled={etapa.id > etapaAtual}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${ativa
                    ? 'border-zinc-400 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                    : completa
                      ? 'border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-900'
                      : 'border-zinc-200/60 dark:border-zinc-800/70 bg-transparent opacity-60 cursor-not-allowed'
                    }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!ativa && !completa ? 'bg-zinc-200 dark:bg-zinc-800' : ''}`}
                    style={{ backgroundColor: ativa ? visualAtual.destaque : completa ? visualAtual.destaqueSuave : undefined }}
                  >
                    {completa ? (
                      <Check className="w-4 h-4 text-zinc-900" />
                    ) : (
                      <Icone className={`w-4 h-4 ${ativa ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} style={ativa ? { color: '#fff' } : undefined} />
                    )}
                  </div>
                  <p className={`text-sm font-medium ${ativa ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {etapa.titulo}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 pb-28 sm:pb-10">
        <div className="grid lg:grid-cols-5 gap-8 xl:gap-10">
          <div className="lg:col-span-3">
            <div className="rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/85 backdrop-blur-sm p-4 sm:p-6 lg:p-7">
              <AnimatePresence mode="wait">
                {etapaAtual === 1 && (
                  <motion.div key="etapa1" initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: 10 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }} exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: -10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                    <CabecalhoEtapa etapa={ETAPAS[0]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          Use o nome que você quer mostrar ao público. Esse nome aparecerá no site, no link de agendamento e em mensagens de confirmação.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          {`Nome ${artigoNomeEstabelecimento} ${nomeEstabelecimento} *`}
                        </label>
                        <input
                          type="text"
                          value={dados.nome}
                          onChange={e => setDados({ ...dados, nome: e.target.value })}
                          placeholder={placeholderNomePorTipo[tipoNegocioAtual]}
                          className={classeInputBase}
                        />
                      </div>
                      <EditorLogo
                        logoUrl={dados.logo_url}
                        tenantId={tenant.id}
                        onLogoChange={(url, iconesPwa) =>
                          setDados({ ...dados, logo_url: url, icone_pwa_192: iconesPwa?.icone_192 || '', icone_pwa_512: iconesPwa?.icone_512 || '' })
                        }
                        corPrimaria={dados.cor_primaria}
                        corSecundaria={dados.cor_secundaria}
                        tipoNegocio={tipoNegocioAtual}
                      />
                    </div>
                  </motion.div>
                )}
                {etapaAtual === 2 && (
                  <motion.div key="etapa2" initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: 10 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }} exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: -10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                    <CabecalhoEtapa etapa={ETAPAS[1]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          Preencha ao menos WhatsApp para começar a receber mensagens automáticas de confirmação e lembrete.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Telefone</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                            <input
                              type="tel"
                              value={dados.telefone}
                              onChange={e => setDados({ ...dados, telefone: formatarTelefone(e.target.value) })}
                              placeholder="(00) 0000-0000"
                              className={classeInputComIcone}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">WhatsApp *</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                            <input
                              type="tel"
                              value={dados.whatsapp}
                              onChange={e => setDados({ ...dados, whatsapp: formatarTelefone(e.target.value) })}
                              placeholder="(00) 00000-0000"
                              className={classeInputComIcone}
                            />
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Campo principal para receber agendamentos.</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">E-mail</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                          <input
                            type="email"
                            value={dados.email}
                            onChange={e => setDados({ ...dados, email: e.target.value })}
                            placeholder={placeholderEmailPorTipo[tipoNegocioAtual]}
                            className={classeInputComIcone}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Instagram</label>
                        <div className="relative">
                          <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            value={dados.instagram}
                            onChange={e => setDados({ ...dados, instagram: e.target.value })}
                            placeholder={placeholderInstagramPorTipo[tipoNegocioAtual]}
                            className={classeInputComIcone}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {etapaAtual === 3 && (
                  <motion.div key="etapa3" initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: 10 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }} exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: -10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                    <CabecalhoEtapa etapa={ETAPAS[2]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          Endereço completo melhora o encontro pelo mapa e reduz dúvidas no dia do atendimento.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Endereço completo</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                          <input
                            type="text"
                            value={dados.endereco}
                            onChange={e => setDados({ ...dados, endereco: e.target.value })}
                            placeholder="Rua, número e bairro"
                            className={classeInputComIcone}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Cidade</label>
                          <input
                            type="text"
                            value={dados.cidade}
                            onChange={e => setDados({ ...dados, cidade: e.target.value })}
                            placeholder="São Paulo"
                            className={classeInputBase}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Estado</label>
                          <input
                            type="text"
                            value={dados.estado}
                            onChange={e => setDados({ ...dados, estado: e.target.value.toUpperCase() })}
                            placeholder="SP"
                            maxLength={2}
                            className={`${classeInputBase} uppercase`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {etapaAtual === 4 && (
                  <motion.div key="etapa4" initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: 10 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }} exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: -10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                    <CabecalhoEtapa etapa={ETAPAS[3]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          Escolha um estilo visual para o seu site. Você pode trocar essa paleta depois no painel sem perder nada.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PALETAS.map((paleta) => {
                          const selecionada = dados.cor_primaria === paleta.primaria
                          return (
                            <button
                              key={paleta.nome}
                              onClick={() => aplicarPaleta(paleta)}
                              className={`relative p-4 rounded-2xl border text-left transition-all ${selecionada
                                ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                                }`}
                            >
                              {selecionada && (
                                <div className="absolute top-3 right-3">
                                  <Check className="w-4 h-4 text-zinc-900 dark:text-white" />
                                </div>
                              )}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: paleta.primaria }} />
                                <div className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: paleta.secundaria }} />
                                <div className="w-8 h-8 rounded-lg border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: paleta.destaque }} />
                              </div>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{paleta.nome}</p>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{paleta.descricao}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
                {etapaAtual === 5 && (
                  <motion.div key="etapa5" initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: 10 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }} exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: -10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                    <CabecalhoEtapa etapa={ETAPAS[4]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4 mb-5">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Cadastre primeiro os serviços principais. Você pode ajustar valores e duração com calma depois no painel.
                      </p>
                    </div>
                    <ServicosMiniGestao tenantId={tenant.id} onTotalChange={setTotalServicos} tipoNegocio={tipoNegocioAtual} />
                  </motion.div>
                )}
                {etapaAtual === 6 && (
                  <motion.div key="etapa6" initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: 10 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }} exit={{ opacity: 0, filter: 'blur(8px)', scale: 0.98, y: -10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
                    <CabecalhoEtapa etapa={ETAPAS[5]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4 mb-5">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Cadastre a equipe que vai atender. Cada profissional recebe acesso próprio para ver agenda e comissões.
                      </p>
                    </div>
                    <CadastroBarbeirosOnboarding tenantId={tenant.id} onTotalChange={setTotalBarbeiros} tipoNegocio={tipoNegocioAtual} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:flex justify-between mt-6 px-1">
              {etapaAtual > 1 ? (
                <Botao type="button" variante="fantasma" onClick={voltar} className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-zinc-700 rounded-xl px-5 py-2.5">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Botao>
              ) : <div />}
              {etapaAtual < TOTAL_ETAPAS ? (
                <Botao type="button" onClick={avancar} className="text-white rounded-xl px-6 py-2.5" style={{ backgroundColor: visualAtual.destaque }}>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Botao>
              ) : (
                <Botao type="button" onClick={finalizar} disabled={salvando} className="text-white rounded-xl px-6 py-2.5" style={{ backgroundColor: visualAtual.destaque }}>
                  {salvando ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Finalizando...</>) : (<><Check className="w-4 h-4 mr-2" />Finalizar</>)}
                </Botao>
              )}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-8 space-y-3">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/80 p-4">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Pré-visualização em tempo real</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                  Tudo que você altera aqui já aparece no modelo ao lado.
                </p>
              </div>
              <PreviewSite dados={dados} totalServicos={totalServicos} totalBarbeiros={totalBarbeiros} tipoNegocio={tipoNegocioAtual} />
            </div>
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
                  <PreviewSite dados={dados} totalServicos={totalServicos} totalBarbeiros={totalBarbeiros} tipoNegocio={tipoNegocioAtual} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navegação fixa no mobile */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            {etapaAtual > 1 ? (
              <button
                type="button"
                onClick={voltar}
                className="px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-[50px]" />
            )}

            {etapaAtual < TOTAL_ETAPAS ? (
              <button
                type="button"
                onClick={avancar}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium"
                style={{ backgroundColor: visualAtual.destaque }}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={finalizar}
                disabled={salvando}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium disabled:opacity-60"
                style={{ backgroundColor: visualAtual.destaque }}
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Finalizar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
