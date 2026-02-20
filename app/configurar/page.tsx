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
  { nome: 'Obsidian', descricao: 'Elegância clássica', primaria: '#09090b', secundaria: '#fafafa', destaque: '#fafafa' },
  { nome: 'Grafite', descricao: 'Minimalismo moderno', primaria: '#18181b', secundaria: '#f4f4f5', destaque: '#a1a1aa' },
  { nome: 'Midnight', descricao: 'Sofisticação noturna', primaria: '#0c0a09', secundaria: '#fafaf9', destaque: '#a8a29e' },
  { nome: 'Slate', descricao: 'Profissional discreto', primaria: '#0f172a', secundaria: '#f8fafc', destaque: '#94a3b8' },
  { nome: 'Charcoal', descricao: 'Neutro atemporal', primaria: '#171717', secundaria: '#fafafa', destaque: '#d4d4d4' },
  { nome: 'Onyx', descricao: 'Contraste marcante', primaria: '#0a0a0a', secundaria: '#ffffff', destaque: '#737373' },
  { nome: 'Navy', descricao: 'Azul profundo', primaria: '#0c1929', secundaria: '#f0f9ff', destaque: '#38bdf8' },
  { nome: 'Forest', descricao: 'Verde floresta', primaria: '#052e16', secundaria: '#f0fdf4', destaque: '#4ade80' },
  { nome: 'Wine', descricao: 'Vinho elegante', primaria: '#1c0a0a', secundaria: '#fef2f2', destaque: '#f87171' },
  { nome: 'Copper', descricao: 'Cobre vintage', primaria: '#1c1210', secundaria: '#fffbeb', destaque: '#f59e0b' },
  { nome: 'Snow', descricao: 'Branco neve', primaria: '#ffffff', secundaria: '#18181b', destaque: '#71717a' },
  { nome: 'Pearl', descricao: 'Pérola suave', primaria: '#fafafa', secundaria: '#27272a', destaque: '#a1a1aa' },
]

/**
 * Paletas de cores para Nail Designers (tons femininos, elegantes e sofisticados)
 */
const PALETAS_NAIL = [
  { nome: 'Nude', descricao: 'Elegância natural', primaria: '#faf5f0', secundaria: '#1c1917', destaque: '#d4a574' },
  { nome: 'Blush', descricao: 'Rosa suave', primaria: '#fdf2f8', secundaria: '#1f1f1f', destaque: '#f9a8d4' },
  { nome: 'Rose Gold', descricao: 'Luxo atemporal', primaria: '#1a1a1a', secundaria: '#fefefe', destaque: '#d4a574' },
  { nome: 'Champagne', descricao: 'Sofisticação leve', primaria: '#fffbeb', secundaria: '#292524', destaque: '#d4a574' },
  { nome: 'Burgundy', descricao: 'Vinho sofisticado', primaria: '#1c0a0a', secundaria: '#fef2f2', destaque: '#be123c' },
  { nome: 'Mauve', descricao: 'Roxo delicado', primaria: '#faf5ff', secundaria: '#1e1033', destaque: '#c084fc' },
  { nome: 'Terracota', descricao: 'Terra elegante', primaria: '#fef3c7', secundaria: '#292524', destaque: '#c2410c' },
  { nome: 'Sage', descricao: 'Verde sálvia', primaria: '#f0fdf4', secundaria: '#14532d', destaque: '#86efac' },
  { nome: 'Lavanda', descricao: 'Lilás relaxante', primaria: '#faf5ff', secundaria: '#3b0764', destaque: '#e879f9' },
  { nome: 'Pearl White', descricao: 'Branco perolado', primaria: '#fefefe', secundaria: '#18181b', destaque: '#a8a29e' },
  { nome: 'Coral', descricao: 'Coral vibrante', primaria: '#fff7ed', secundaria: '#1c1917', destaque: '#fb923c' },
  { nome: 'Midnight Rose', descricao: 'Noite rosada', primaria: '#0f0f0f', secundaria: '#fefefe', destaque: '#fb7185' },
]

/**
 * Retorna as paletas de cores baseadas no tipo de negócio
 */
function obterPaletas(tipoNegocio: TipoNegocio | undefined) {
  return ehTipoNegocioFeminino(tipoNegocio) ? PALETAS_NAIL : PALETAS_BARBEARIA
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
  
  return (
    <div className="mb-8">
      {/* Indicador de progresso mobile */}
      <div className="flex items-center gap-2 mb-4 lg:hidden">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalEtapas }).map((_, i) => (
            <div 
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 === etapaAtual 
                  ? 'w-6 bg-zinc-900 dark:bg-white' 
                  : i + 1 < etapaAtual 
                    ? 'w-3 bg-zinc-400 dark:bg-zinc-500' 
                    : 'w-3 bg-zinc-200 dark:bg-zinc-700'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
          {etapaAtual} de {totalEtapas}
        </span>
      </div>

      {/* Cabeçalho principal */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Icone className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
              {etapa.tituloCompleto}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {etapa.tempoEstimado}
            </span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-base">
            {etapa.subtitulo}
          </p>
        </div>
      </div>

      {/* Dicas */}
      <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            Dicas rápidas
          </span>
        </div>
        <ul className="space-y-2">
          {etapa.dicas.map((dica, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {dica}
            </li>
          ))}
        </ul>
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
 * Card de passo com design acolhedor
 */
interface CardPassoProps {
  numero: number
  titulo: string
  descricao: string
  explicacao: string
  link?: string
  acao?: () => void
  textoBotao: string
  icone: React.ElementType
  externo?: boolean
  destaque?: boolean
  delay: number
  concluido?: boolean
}

function CardPasso({ 
  numero, 
  titulo, 
  descricao, 
  explicacao,
  link, 
  acao, 
  textoBotao, 
  icone: Icone, 
  externo, 
  destaque,
  delay,
  concluido
}: CardPassoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <div className={`
        relative overflow-hidden rounded-2xl transition-all duration-300
        ${destaque 
          ? 'bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 text-white shadow-xl shadow-zinc-900/10 dark:shadow-black/20' 
          : 'bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/10'
        }
      `}>
        {/* Gradiente decorativo sutil para o card destaque */}
        {destaque && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        )}
        
        <div className="relative p-6">
          {/* Cabeçalho do card */}
          <div className="flex items-start gap-4 mb-4">
            {/* Indicador de número/passo */}
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
              ${destaque 
                ? 'bg-white/10 text-white' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }
            `}>
              {concluido ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                numero
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold mb-1 ${destaque ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                {titulo}
              </h3>
              <p className={`text-sm ${destaque ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {descricao}
              </p>
            </div>
          </div>
          
          {/* Explicação detalhada para leigos */}
          <div className={`
            mb-5 p-4 rounded-xl text-sm leading-relaxed
            ${destaque 
              ? 'bg-white/5 text-zinc-300' 
              : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
            }
          `}>
            {explicacao}
          </div>
          
          {/* Botão de ação */}
          {link ? (
            <Link
              href={link}
              target={externo ? '_blank' : undefined}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                ${destaque
                  ? 'bg-white text-zinc-900 hover:bg-zinc-100 shadow-lg shadow-white/10'
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'
                }
              `}
            >
              <Icone className="w-4 h-4" />
              {textoBotao}
              {externo && <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-60" />}
            </Link>
          ) : (
            <button
              onClick={acao}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700
              `}
            >
              <Icone className="w-4 h-4" />
              {textoBotao}
            </button>
          )}
        </div>
        
        {/* Badge de destaque - dentro do card para não ser cortado */}
        {destaque && (
          <div className="absolute top-4 right-4 px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-semibold rounded-md shadow-sm">
            Comece aqui
          </div>
        )}
      </div>
    </motion.div>
  )
}

function TelaSucessoConfiguracao({ tenant, dados, totalServicos, totalBarbeiros, tipoNegocio }: TelaSucessoProps) {
  const [linkCopiado, setLinkCopiado] = useState(false)
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

      <main className="max-w-2xl mx-auto px-4 py-10 md:py-16">
        {/* Seção de celebração */}
        <div className="text-center mb-12">
          {/* Ícone animado de sucesso */}
          <div className="flex justify-center mb-6">
            <IconeCheckAnimado />
          </div>
          
          {/* Título celebratório */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
              Parabéns! {nomeNegocio} está pronto
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              {`${possessivoEstabelecimentoCapitalizado} ${estabelecimento} agora tem uma página própria na internet onde ${pronomeClientes} podem agendar horários a qualquer momento.`}
            </p>
          </motion.div>
        </div>

        {/* Card do link - destaque especial */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mb-10"
        >
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200/50 dark:border-emerald-800/30 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                  Seu endereço na internet
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  {`Este é o link que você vai compartilhar com ${pronomeClientes}. O acesso funciona em qualquer celular ou computador.`}
                </p>
                
                {/* Link copiável - responsivo */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">🔗</span>
                    <code className="text-zinc-900 dark:text-white font-medium text-sm truncate">
                      {linkPublico}
                    </code>
                  </div>
                  <motion.button
                    onClick={copiarLink}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex-shrink-0
                      ${linkCopiado 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'
                      }
                    `}
                  >
                    {linkCopiado ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* O que você configurou - resumo visual */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="mb-10"
        >
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">
            O que você configurou
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">{totalServicos}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {totalServicos === 1 ? 'Serviço cadastrado' : 'Serviços cadastrados'}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
              <p className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">{totalBarbeiros}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {totalBarbeiros === 1 ? 'Profissional' : 'Profissionais'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Próximos passos - cards explicativos */}
        <div className="mb-10">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wider"
          >
            Próximos passos
          </motion.h2>
          
          <div className="space-y-4">
            <CardPasso
              numero={1}
              titulo="Acesse seu Painel de Controle"
              descricao="Onde você gerencia tudo do seu negócio"
              explicacao={`No painel você vai ver os agendamentos que ${pronomeClientes} fizerem, controlar os horários disponíveis, ver relatórios de faturamento e muito mais. É como a central de comando ${contracaoEstabelecimento} ${possessivoEstabelecimento} ${estabelecimento}.`}
              link="/admin"
              textoBotao="Entrar no Painel"
              icone={LayoutDashboard}
              destaque={true}
              delay={1.3}
            />
            
            <CardPasso
              numero={2}
              titulo="Veja como ficou sua página"
              descricao={`Teste a experiência que ${pronomeClientes} terão`}
              explicacao={`Clique para abrir sua página pública em uma nova aba. É exatamente isso que ${pronomeClientes} vão ver quando acessarem o link. Você pode simular um agendamento para validar a experiência.`}
              link={`/${tenant.slug}`}
              textoBotao="Ver minha página"
              icone={Eye}
              externo={true}
              delay={1.4}
            />
            
            <CardPasso
              numero={3}
              titulo="Compartilhe nas redes sociais"
              descricao="Divulgue seu link para começar a receber agendamentos"
              explicacao={`Cole o link no seu Instagram, WhatsApp ou onde preferir. Quando ${clienteSingular} clicar, vai direto para sua página de agendamentos.`}
              acao={copiarLink}
              textoBotao={linkCopiado ? "Link copiado!" : "Copiar link"}
              icone={linkCopiado ? Check : Copy}
              delay={1.5}
            />
          </div>
        </div>

        {/* Dicas visuais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.5 }}
          className="mb-10"
        >
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">
            Dicas para aproveitar melhor
          </h2>
          
          <div className="grid gap-4">
            <div className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white mb-1">Configure seus horários de funcionamento</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {`No painel, vá em "Horários" para definir quais dias e horários ${possessivoEstabelecimento} ${estabelecimento} atende. Assim o sistema só mostra horários disponíveis para ${pronomeClientes}.`}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white mb-1">Personalize ainda mais</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Você pode adicionar fotos do seu trabalho, ajustar preços, criar promoções e muito mais. Explore o painel com calma!
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer com suporte */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="text-center pt-8 border-t border-zinc-200 dark:border-zinc-800"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            Ficou com alguma dúvida?
          </p>
          <a 
            href="https://wa.me/5511999999999" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Falar no WhatsApp
          </a>
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
        tipoNegocio={tipoNegocio}
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
                <motion.div key="etapa1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <CabecalhoEtapa etapa={ETAPAS[0]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        {`Nome ${artigoNomeEstabelecimento} ${nomeEstabelecimento} *`}
                      </label>
                      <input
                        type="text"
                        value={dados.nome}
                        onChange={e => setDados({ ...dados, nome: e.target.value })}
                        placeholder={placeholderNomePorTipo[tipoNegocioAtual]}
                        className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all"
                      />
                    </div>
                    <EditorLogo logoUrl={dados.logo_url} tenantId={tenant.id} onLogoChange={(url, iconesPwa) => setDados({ ...dados, logo_url: url, icone_pwa_192: iconesPwa?.icone_192 || '', icone_pwa_512: iconesPwa?.icone_512 || '' })} corPrimaria={dados.cor_primaria} corSecundaria={dados.cor_secundaria} />
                  </div>
                </motion.div>
              )}
              {etapaAtual === 2 && (
                <motion.div key="etapa2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <CabecalhoEtapa etapa={ETAPAS[1]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Telefone</label><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="tel" value={dados.telefone} onChange={e => setDados({ ...dados, telefone: formatarTelefone(e.target.value) })} placeholder="(00) 0000-0000" className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div></div>
                      <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">WhatsApp *</label><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="tel" value={dados.whatsapp} onChange={e => setDados({ ...dados, whatsapp: formatarTelefone(e.target.value) })} placeholder="(00) 00000-0000" className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div><p className="text-xs text-zinc-500 dark:text-zinc-600 mt-1">Usado para agendamentos</p></div>
                    </div>
                    <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">E-mail</label><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="email" value={dados.email} onChange={e => setDados({ ...dados, email: e.target.value })} placeholder={placeholderEmailPorTipo[tipoNegocioAtual]} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div></div>
                    <div><label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Instagram</label><div className="relative"><Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" /><input type="text" value={dados.instagram} onChange={e => setDados({ ...dados, instagram: e.target.value })} placeholder={placeholderInstagramPorTipo[tipoNegocioAtual]} className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 focus:border-zinc-400 dark:focus:border-zinc-700 transition-all" /></div></div>
                  </div>
                </motion.div>
              )}
              {etapaAtual === 3 && (
                <motion.div key="etapa3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <CabecalhoEtapa etapa={ETAPAS[2]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
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
                <motion.div key="etapa4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <CabecalhoEtapa etapa={ETAPAS[3]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PALETAS.map((paleta) => {
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
                <motion.div key="etapa5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <CabecalhoEtapa etapa={ETAPAS[4]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <ServicosMiniGestao tenantId={tenant.id} onTotalChange={setTotalServicos} tipoNegocio={tipoNegocio} />
                </motion.div>
              )}
              {etapaAtual === 6 && (
                <motion.div key="etapa6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <CabecalhoEtapa etapa={ETAPAS[5]} etapaAtual={etapaAtual} totalEtapas={TOTAL_ETAPAS} />
                  <CadastroBarbeirosOnboarding tenantId={tenant.id} onTotalChange={setTotalBarbeiros} tipoNegocio={tipoNegocio} />
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
            <div className="sticky top-8"><PreviewSite dados={dados} totalServicos={totalServicos} totalBarbeiros={totalBarbeiros} tipoNegocio={tipoNegocioAtual} /></div>
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
      </div>
    </div>
  )
}
