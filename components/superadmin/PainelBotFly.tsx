'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Power, RefreshCw, Play, Pause, RotateCcw, Loader2,
  CheckCircle, AlertCircle, Clock, Cpu, HardDrive, Globe,
  Activity, Terminal, ExternalLink, Wifi, WifiOff, Server,
  Zap, AlertTriangle, Info
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Machine {
  id: string
  nome: string
  estado: string
  regiao: string
  ip_privado: string
  criado_em: string
  atualizado_em: string
  config: {
    cpu: string
    cpus: number
    memoria_mb: number
    imagem: string
  }
  imagem: {
    repositorio: string
    tag: string
    digest: string
  }
  eventos: Array<{
    tipo: string
    status: string
    fonte: string
    timestamp: string
  }>
  checks: Array<{
    name: string
    status: string
    output: string
    updated_at: string
  }>
}

interface StatusBot {
  app: {
    nome: string
    status: string
    organizacao: string
    release_atual: {
      status: string
      versao: number
      criado_em: string
    } | null
  }
  status_geral: 'online' | 'offline' | 'iniciando' | 'parando'
  machines: Machine[]
  total_machines: number
  machines_ativas: number
  timestamp: string
}

/**
 * Painel de controle do Bot WhatsApp no Fly.io
 * Permite visualizar status, iniciar, parar e reiniciar o bot
 */
export function PainelBotFly() {
  const [status, setStatus] = useState<StatusBot | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [executandoAcao, setExecutandoAcao] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)

  const buscarStatus = useCallback(async () => {
    try {
      setErro(null)
      const response = await fetch('/api/admin/fly', {
        headers: { 'x-admin-auth': 'dzndev-1503' }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao buscar status')
      }

      const data = await response.json()
      setStatus(data)
      setUltimaAtualizacao(new Date())
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscarStatus()
    // Atualizar a cada 30 segundos
    const intervalo = setInterval(buscarStatus, 30000)
    return () => clearInterval(intervalo)
  }, [buscarStatus])

  const executarAcao = async (acao: 'start' | 'stop' | 'restart', machineId?: string) => {
    setExecutandoAcao(acao)
    setErro(null)

    try {
      const response = await fetch('/api/admin/fly', {
        method: 'POST',
        headers: {
          'x-admin-auth': 'dzndev-1503',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ acao, machine_id: machineId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao executar ação')
      }

      // Aguardar um pouco e atualizar status
      await new Promise(resolve => setTimeout(resolve, 2000))
      await buscarStatus()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setExecutandoAcao(null)
    }
  }

  const getCorEstado = (estado: string) => {
    switch (estado) {
      case 'started':
      case 'online':
        return 'text-emerald-500'
      case 'stopped':
      case 'offline':
        return 'text-zinc-500'
      case 'starting':
      case 'iniciando':
        return 'text-blue-500'
      case 'stopping':
      case 'parando':
        return 'text-amber-500'
      default:
        return 'text-zinc-400'
    }
  }

  const getBgEstado = (estado: string) => {
    switch (estado) {
      case 'started':
      case 'online':
        return 'bg-emerald-500/10 border-emerald-500/20'
      case 'stopped':
      case 'offline':
        return 'bg-zinc-500/10 border-zinc-500/20'
      case 'starting':
      case 'iniciando':
        return 'bg-blue-500/10 border-blue-500/20'
      case 'stopping':
      case 'parando':
        return 'bg-amber-500/10 border-amber-500/20'
      default:
        return 'bg-zinc-500/10 border-zinc-500/20'
    }
  }

  const getIconeEstado = (estado: string) => {
    switch (estado) {
      case 'started':
      case 'online':
        return <Wifi className="w-5 h-5" />
      case 'stopped':
      case 'offline':
        return <WifiOff className="w-5 h-5" />
      case 'starting':
      case 'iniciando':
      case 'stopping':
      case 'parando':
        return <Loader2 className="w-5 h-5 animate-spin" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getTextoEstado = (estado: string) => {
    switch (estado) {
      case 'started':
      case 'online':
        return 'Online'
      case 'stopped':
      case 'offline':
        return 'Offline'
      case 'starting':
      case 'iniciando':
        return 'Iniciando...'
      case 'stopping':
      case 'parando':
        return 'Parando...'
      default:
        return 'Desconhecido'
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Status Geral */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
              status?.status_geral === 'online' 
                ? 'bg-emerald-500/10 border-emerald-500/20' 
                : 'bg-zinc-500/10 border-zinc-500/20'
            }`}>
              <Bot className={`w-7 h-7 ${
                status?.status_geral === 'online' ? 'text-emerald-500' : 'text-zinc-500'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Bot WhatsApp
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1.5 text-sm font-medium ${getCorEstado(status?.status_geral || 'offline')}`}>
                  {getIconeEstado(status?.status_geral || 'offline')}
                  {getTextoEstado(status?.status_geral || 'offline')}
                </span>
                {ultimaAtualizacao && (
                  <span className="text-xs text-zinc-500">
                    • Atualizado {formatDistanceToNow(ultimaAtualizacao, { addSuffix: true, locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => buscarStatus()}
              disabled={carregando}
              className="p-2.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
              title="Atualizar status"
            >
              <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
            </button>
            
            <a
              href="https://fly.io/apps/bot-barberhub"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard Fly.io</span>
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
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Erro</p>
                  <p className="text-sm text-red-600 dark:text-red-300">{erro}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <button
            onClick={() => executarAcao('start')}
            disabled={executandoAcao !== null || status?.status_geral === 'online'}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              status?.status_geral === 'online'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
            }`}
          >
            {executandoAcao === 'start' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Iniciar
          </button>

          <button
            onClick={() => executarAcao('stop')}
            disabled={executandoAcao !== null || status?.status_geral === 'offline'}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
              status?.status_geral === 'offline'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
            }`}
          >
            {executandoAcao === 'stop' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
            Parar
          </button>

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
        </div>
      </div>

      {/* Info do App */}
      {status?.app && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">App</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{status.app.nome}</p>
            <p className="text-xs text-zinc-500">{status.app.organizacao}</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Server className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Machines</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">
              {status.machines_ativas}/{status.total_machines}
            </p>
            <p className="text-xs text-zinc-500">ativas</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Release</span>
            </div>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">
              v{status.app.release_atual?.versao || '?'}
            </p>
            <p className="text-xs text-zinc-500">{status.app.release_atual?.status || 'N/A'}</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Status</span>
            </div>
            <p className={`text-lg font-bold ${getCorEstado(status.app.status)}`}>
              {status.app.status}
            </p>
            <p className="text-xs text-zinc-500">app status</p>
          </div>
        </div>
      )}

      {/* Lista de Machines */}
      {status?.machines && status.machines.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Machines</h3>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {status.machines.map((machine) => (
              <div key={machine.id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getBgEstado(machine.estado)}`}>
                      {getIconeEstado(machine.estado)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-900 dark:text-white">{machine.nome}</p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getBgEstado(machine.estado)} ${getCorEstado(machine.estado)}`}>
                          {getTextoEstado(machine.estado)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-mono">{machine.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Globe className="w-4 h-4" />
                      <span>{machine.regiao.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <Cpu className="w-4 h-4" />
                      <span>{machine.config.cpus}x {machine.config.cpu}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <HardDrive className="w-4 h-4" />
                      <span>{machine.config.memoria_mb}MB</span>
                    </div>
                  </div>
                </div>

                {/* Eventos Recentes */}
                {machine.eventos && machine.eventos.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-medium text-zinc-500 mb-2">Eventos Recentes</p>
                    <div className="flex flex-wrap gap-2">
                      {machine.eventos.slice(0, 3).map((evento, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            evento.status === 'started' ? 'bg-emerald-500' :
                            evento.status === 'stopped' ? 'bg-zinc-500' :
                            'bg-blue-500'
                          }`} />
                          <span className="text-zinc-600 dark:text-zinc-400">{evento.tipo}</span>
                          <span className="text-zinc-400 dark:text-zinc-600">
                            {formatDistanceToNow(parseISO(evento.timestamp), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dica */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Sobre o Bot</p>
          <p className="text-blue-600 dark:text-blue-300">
            O bot roda no Fly.io na região GRU (São Paulo). Ele é responsável por enviar notificações 
            de agendamentos via WhatsApp. Se o bot estiver offline, as notificações não serão enviadas.
          </p>
        </div>
      </div>
    </div>
  )
}
