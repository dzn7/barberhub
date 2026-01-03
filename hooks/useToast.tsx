'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type TipoToast = 'sucesso' | 'erro' | 'aviso' | 'info'

interface Toast {
  id: string
  tipo: TipoToast
  mensagem: string
}

interface ToastContextData {
  toast: (dados: { tipo: TipoToast; mensagem: string }) => void
  removerToast: (id: string) => void
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

const ICONES = {
  sucesso: CheckCircle,
  erro: XCircle,
  aviso: AlertCircle,
  info: Info,
}

const ESTILOS = {
  sucesso: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  erro: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  aviso: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
}

const ICONE_ESTILOS = {
  sucesso: 'text-green-600 dark:text-green-400',
  erro: 'text-red-600 dark:text-red-400',
  aviso: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ tipo, mensagem }: { tipo: TipoToast; mensagem: string }) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, tipo, mensagem }])

    // Auto-remover após 4 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removerToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, removerToast }}>
      {children}
      
      {/* Container de Toasts */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icone = ICONES[t.tipo]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${ESTILOS[t.tipo]}`}
              >
                <Icone className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICONE_ESTILOS[t.tipo]}`} />
                <p className="flex-1 text-sm font-medium">{t.mensagem}</p>
                <button
                  onClick={() => removerToast(t.id)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider')
  }
  
  return context
}
