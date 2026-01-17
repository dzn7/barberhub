'use client'

/**
 * Painel de Controle do Bot WhatsApp - Conexão Direta VM
 * Conecta diretamente com a VM do Google Cloud
 * 
 * Funcionalidades:
 * - Status de conexão em tempo real
 * - Exibição de QR Code para leitura
 * - Mensagens recentes do bot
 * - Ações de gerenciamento (reiniciar, desconectar, novo QR)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Power, RefreshCw, Play, Pause, RotateCcw, Loader2,
  CheckCircle, AlertCircle, Clock, Cpu, HardDrive, Globe,
  Activity, Terminal, ExternalLink, Wifi, WifiOff, Server,
  Zap, AlertTriangle, Info, QrCode, MessageSquare, Send,
  XCircle, CheckCircle2, Ban, LogOut, PlugZap, Eye
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import QRCode from 'qrcode'

// URL do proxy API (contorna CORS)
const BOT_API = '/api/bot'

interface StatusBot {
  status: 'online' | 'offline'
  servico: string
  whatsapp: {
    conectado: boolean
    status: string
    numero: string | null
  }
  estatisticas: {
    mensagensMemoria: number
    retryCacheSize: number
  }
  timestamp: string
  uptime: number
  memoria: {
    usada_mb: number
    total_mb: number
  }
}

interface QRCodeData {
  status: 'connected' | 'awaiting_scan' | string
  qrCode?: string
  mensagem?: string
  numero?: string
}

interface MensagemRecente {
  id: string
  tipo: string
  status: string
  data_envio: string
  mensagem: string | null
  erro: string | null
  tenants: {
    nome: string
    slug: string
  } | null
}

interface Estatisticas {
  store: {
    mensagensMemoria: number
    retryCacheSize: number
  }
  notificacoes: {
    enviadas: number
    pendentes: number
    erros: number
  }
  sistema: {
    uptime_segundos: number
    memoria_mb: number
  }
}

/**
 * Painel de controle do Bot WhatsApp na VM Google Cloud
 */
export function PainelBotVM() {
  const [status, setStatus] = useState<StatusBot | null>(null)
  const [qrData, setQrData] = useState<QRCodeData | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [mensagens, setMensagens] = useState<MensagemRecente[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [executandoAcao, setExecutandoAcao] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'status' | 'mensagens'>('status')
  
  const intervaloRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Busca status do bot
   */
  const buscarStatus = useCallback(async () => {
    try {
      setErro(null)
      const response = await fetch(`${BOT_API}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Bot offline ou inacessível')
      }

      const data = await response.json()
      setStatus(data)
      setUltimaAtualizacao(new Date())
    } catch (err: any) {
      setErro(err.message || 'Erro ao conectar com o bot')
      setStatus(null)
    } finally {
      setCarregando(false)
    }
  }, [])

  /**
   * Busca QR Code
   */
  const buscarQRCode = useCallback(async () => {
    try {
      const response = await fetch(`${BOT_API}/health/qr`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) return

      const data = await response.json()
      setQrData(data)

      // Se tem QR Code, gerar imagem
      if (data.qrCode && data.status === 'awaiting_scan') {
        const url = await QRCode.toDataURL(data.qrCode, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        setQrImageUrl(url)
      } else {
        setQrImageUrl(null)
      }
    } catch (err) {
      console.error('Erro ao buscar QR:', err)
    }
  }, [])

  /**
   * Busca mensagens recentes
   */
  const buscarMensagens = useCallback(async () => {
    try {
      const response = await fetch(`${BOT_API}/health/mensagens-recentes?limite=15`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) return

      const data = await response.json()
      if (data.sucesso) {
        setMensagens(data.mensagens)
      }
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err)
    }
  }, [])

  /**
   * Busca estatísticas
   */
  const buscarEstatisticas = useCallback(async () => {
    try {
      const response = await fetch(`${BOT_API}/health/estatisticas`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) return

      const data = await response.json()
      if (data.sucesso) {
        setEstatisticas(data)
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err)
    }
  }, [])

  /**
   * Atualiza todos os dados
   */
  const atualizarTudo = useCallback(async () => {
    await Promise.all([
      buscarStatus(),
      buscarQRCode(),
      buscarMensagens(),
      buscarEstatisticas()
    ])
  }, [buscarStatus, buscarQRCode, buscarMensagens, buscarEstatisticas])

  useEffect(() => {
    atualizarTudo()
    
    // Atualizar a cada 5 segundos
    intervaloRef.current = setInterval(atualizarTudo, 5000)
    
    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current)
      }
    }
  }, [atualizarTudo])

  /**
   * Executa ação no bot
   */
  const executarAcao = async (acao: 'restart' | 'disconnect' | 'new-qr') => {
    setExecutandoAcao(acao)
    setErro(null)

    try {
      const response = await fetch(`${BOT_API}/health/${acao}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!data.sucesso) {
        throw new Error(data.erro || data.mensagem || 'Erro ao executar ação')
      }

      // Aguardar e atualizar
      await new Promise(resolve => setTimeout(resolve, 3000))
      await atualizarTudo()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setExecutandoAcao(null)
    }
  }

  const getCorStatus = (conectado: boolean) => {
    return conectado ? 'text-emerald-500' : 'text-red-500'
  }

  const getBgStatus = (conectado: boolean) => {
    return conectado 
      ? 'bg-emerald-500/10 border-emerald-500/20' 
      : 'bg-red-500/10 border-red-500/20'
  }

  const getIconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'confirmacao':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'lembrete':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'cancelamento':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'remarcacao':
        return <RefreshCw className="w-4 h-4 text-amber-500" />
      case 'boas_vindas':
        return <Send className="w-4 h-4 text-purple-500" />
      default:
        return <MessageSquare className="w-4 h-4 text-zinc-500" />
    }
  }

  const formatarUptime = (segundos: number) => {
    const horas = Math.floor(segundos / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    if (horas > 0) {
      return `${horas}h ${minutos}m`
    }
    return `${minutos}m`
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  const botOnline = status?.whatsapp?.conectado || false
  const whatsappStatus = status?.whatsapp?.status || 'disconnected'

  return (
    <div className="space-y-6">
      {/* Header com Status Geral */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${getBgStatus(botOnline)}`}>
              <Bot className={`w-7 h-7 ${getCorStatus(botOnline)}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Bot WhatsApp
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1.5 text-sm font-medium ${getCorStatus(botOnline)}`}>
                  {botOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  {botOnline ? 'Conectado' : whatsappStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
                </span>
                {ultimaAtualizacao && (
                  <span className="text-xs text-zinc-500">
                    • Atualizado {formatDistanceToNow(ultimaAtualizacao, { addSuffix: true, locale: ptBR })}
                  </span>
                )}
              </div>
              {status?.whatsapp?.numero && (
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  {status.whatsapp.numero.split(':')[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => atualizarTudo()}
              disabled={carregando}
              className="p-2.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
            </button>
            
            <a
              href="http://34.151.235.113:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Abrir API</span>
            </a>
          </div>
        </div>

        {/* Erro */}
        <AnimatePresence>
          {erro && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Erro de Conexão</p>
                  <p className="text-sm text-red-600 dark:text-red-300">{erro}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ações de Gerenciamento */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <button
            onClick={() => executarAcao('restart')}
            disabled={executandoAcao !== null}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {executandoAcao === 'restart' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Reiniciar
          </button>

          <button
            onClick={() => executarAcao('new-qr')}
            disabled={executandoAcao !== null || botOnline}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              botOnline
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20'
            }`}
          >
            {executandoAcao === 'new-qr' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4" />
            )}
            Novo QR
          </button>

          <button
            onClick={() => executarAcao('disconnect')}
            disabled={executandoAcao !== null || !botOnline}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              !botOnline
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
            }`}
          >
            {executandoAcao === 'disconnect' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Desconectar
          </button>
        </div>
      </div>

      {/* QR Code */}
      {!botOnline && qrData?.status === 'awaiting_scan' && qrImageUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                Escaneie o QR Code
              </h3>
            </div>
            <p className="text-sm text-zinc-500 mb-6">
              Abra o WhatsApp no seu celular e escaneie o código abaixo
            </p>
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-2xl shadow-lg">
                <img 
                  src={qrImageUrl} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              O QR Code atualiza automaticamente a cada 5 segundos
            </p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setAbaAtiva('status')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            abaAtiva === 'status'
              ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Status & Estatísticas
        </button>
        <button
          onClick={() => setAbaAtiva('mensagens')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            abaAtiva === 'mensagens'
              ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Mensagens Recentes
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <AnimatePresence mode="wait">
        {abaAtiva === 'status' ? (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Cards de Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Uptime</span>
                </div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {status ? formatarUptime(status.uptime) : '-'}
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Memória</span>
                </div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {status ? `${status.memoria.usada_mb}MB` : '-'}
                </p>
                <p className="text-xs text-zinc-500">de {status?.memoria.total_mb || '-'}MB</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Send className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Enviadas</span>
                </div>
                <p className="text-lg font-bold text-emerald-500">
                  {estatisticas?.notificacoes.enviadas || 0}
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Erros</span>
                </div>
                <p className="text-lg font-bold text-red-500">
                  {estatisticas?.notificacoes.erros || 0}
                </p>
              </div>
            </div>

            {/* Info do Sistema */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <h4 className="font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Informações do Sistema
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-500">Servidor</span>
                  <p className="font-medium text-zinc-900 dark:text-white">Google Cloud VM</p>
                </div>
                <div>
                  <span className="text-zinc-500">IP</span>
                  <p className="font-medium text-zinc-900 dark:text-white font-mono">34.151.235.113</p>
                </div>
                <div>
                  <span className="text-zinc-500">Porta</span>
                  <p className="font-medium text-zinc-900 dark:text-white">3001</p>
                </div>
                <div>
                  <span className="text-zinc-500">Região</span>
                  <p className="font-medium text-zinc-900 dark:text-white">South America (São Paulo)</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mensagens"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            {mensagens.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Nenhuma mensagem recente</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-96 overflow-y-auto">
                {mensagens.map((msg) => (
                  <div key={msg.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getIconeTipo(msg.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-zinc-900 dark:text-white capitalize">
                            {msg.tipo.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            msg.status === 'enviada' 
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : msg.status === 'erro'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}>
                            {msg.status}
                          </span>
                        </div>
                        {msg.tenants && (
                          <p className="text-xs text-zinc-500 mb-1">
                            {msg.tenants.nome}
                          </p>
                        )}
                        {msg.erro && (
                          <p className="text-xs text-red-500 truncate">
                            Erro: {msg.erro}
                          </p>
                        )}
                        <p className="text-xs text-zinc-400">
                          {formatDistanceToNow(parseISO(msg.data_envio), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dica */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Sobre o Bot</p>
          <p className="text-blue-600 dark:text-blue-300">
            O bot roda em uma VM do Google Cloud na região de São Paulo. Ele é responsável por enviar 
            notificações de agendamentos, lembretes e confirmações via WhatsApp automaticamente.
          </p>
        </div>
      </div>
    </div>
  )
}
