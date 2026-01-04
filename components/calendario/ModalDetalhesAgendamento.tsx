'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, User, Phone, Scissors,
  CheckCircle, XCircle, Trash2, X, RefreshCw
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { PortalModal } from '@/components/ui/PortalModal'

const TIMEZONE_BRASILIA = 'America/Sao_Paulo'

const STATUS_CORES = {
  pendente: { bg: 'bg-amber-500', light: 'bg-amber-100 text-amber-800' },
  confirmado: { bg: 'bg-blue-500', light: 'bg-blue-100 text-blue-800' },
  concluido: { bg: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-800' },
  cancelado: { bg: 'bg-zinc-400', light: 'bg-zinc-100 text-zinc-600' }
}

interface Agendamento {
  id: string
  data_hora: string
  status: string
  observacoes?: string
  barbeiro_id: string
  clientes: { nome: string; telefone: string }
  barbeiros: { id: string; nome: string }
  servicos: { nome: string; preco: number; duracao: number }
}

interface ModalDetalhesAgendamentoProps {
  agendamento: Agendamento | null
  aberto: boolean
  onFechar: () => void
  onConcluir: (id: string) => void
  onConfirmar: (id: string) => void
  onCancelar: (id: string) => void
  onExcluir: (id: string) => void
  onRemarcar?: () => void
  mostrarRemarcar?: boolean
}

/**
 * Modal de detalhes do agendamento
 * Componente reutilizável para admin e barbeiro
 */
export function ModalDetalhesAgendamento({
  agendamento,
  aberto,
  onFechar,
  onConcluir,
  onConfirmar,
  onCancelar,
  onExcluir,
  onRemarcar,
  mostrarRemarcar = true
}: ModalDetalhesAgendamentoProps) {
  if (!agendamento) return null

  const statusCores = STATUS_CORES[agendamento.status as keyof typeof STATUS_CORES] || STATUS_CORES.pendente
  const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA)

  const abrirWhatsApp = () => {
    const telefone = agendamento.clientes?.telefone?.replace(/\D/g, '') || ''
    const numeroCompleto = telefone.startsWith('55') ? telefone : `55${telefone}`
    const mensagem = `Olá ${agendamento.clientes?.nome}! Confirmando seu agendamento para ${format(dataBrasilia, "dd/MM 'às' HH:mm")}`
    window.open(`https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  return (
    <PortalModal
      aberto={aberto}
      onFechar={onFechar}
      tamanho="md"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-12 h-12 rounded-xl ${statusCores.bg} flex items-center justify-center`}>
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              {agendamento.clientes?.nome}
            </h3>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusCores.light}`}>
              {agendamento.status}
            </span>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Informações */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <Clock className="w-5 h-5 text-zinc-500" />
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {format(dataBrasilia, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
              <p className="text-xs text-zinc-500">{agendamento.servicos?.duracao} minutos</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <Scissors className="w-5 h-5 text-zinc-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {agendamento.servicos?.nome}
              </p>
              <p className="text-xs text-zinc-500">com {agendamento.barbeiros?.nome}</p>
            </div>
            <span className="text-sm font-bold text-emerald-600">
              R$ {agendamento.servicos?.preco?.toFixed(2)}
            </span>
          </div>

          {agendamento.clientes?.telefone && (
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <Phone className="w-5 h-5 text-zinc-500" />
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {agendamento.clientes.telefone}
              </p>
            </div>
          )}

          {agendamento.observacoes && (
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
              <p className="text-xs text-zinc-500 mb-1">Observações</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {agendamento.observacoes}
              </p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {agendamento.status !== 'concluido' && (
              <button
                onClick={() => onConcluir(agendamento.id)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Concluir
              </button>
            )}
            {agendamento.status === 'pendente' && (
              <button
                onClick={() => onConfirmar(agendamento.id)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar
              </button>
            )}
            {agendamento.clientes?.telefone && (
              <button
                onClick={abrirWhatsApp}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
                WhatsApp
              </button>
            )}
            {mostrarRemarcar && onRemarcar && agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && (
              <button
                onClick={onRemarcar}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-600 hover:bg-zinc-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Remarcar
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {agendamento.status !== 'cancelado' && (
              <button
                onClick={() => onCancelar(agendamento.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </button>
            )}
            <button
              onClick={() => onExcluir(agendamento.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-rose-600 border border-rose-200 dark:border-rose-800 rounded-xl text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>
      </div>
    </PortalModal>
  )
}
