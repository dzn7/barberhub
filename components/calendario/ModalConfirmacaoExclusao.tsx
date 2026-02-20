'use client'

import { Trash2, Loader2 } from 'lucide-react'

interface ModalConfirmacaoExclusaoProps {
  aberto: boolean
  nomeCliente: string
  processando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/**
 * Modal de confirmação de exclusão de agendamento
 * Componente reutilizável
 */
export function ModalConfirmacaoExclusao({
  aberto,
  nomeCliente,
  processando,
  onConfirmar,
  onCancelar
}: ModalConfirmacaoExclusaoProps) {
  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={() => !processando && onCancelar()}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              Confirmar Exclusão
            </h3>
          </div>

          <p className="text-zinc-600 dark:text-zinc-400">
            Tem certeza que deseja deletar permanentemente o agendamento de{' '}
            <strong className="text-zinc-900 dark:text-white">{nomeCliente}</strong>?
          </p>

          <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300">
              ⚠️ Esta ação não pode ser desfeita. O agendamento será removido permanentemente do sistema.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancelar}
              disabled={processando}
              className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={processando}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Deletar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
