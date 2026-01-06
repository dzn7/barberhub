'use client'

/**
 * Modal de Pagamento PIX
 * Exibe QR Code e código copia e cola para pagamento
 * 
 * Integrado com Mercado Pago via API routes
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Copy, CheckCircle, Loader2, AlertCircle, 
  QrCode, Clock, RefreshCw, Smartphone
} from 'lucide-react'
import { VALOR_PLANO_MENSAL } from '@/lib/mercado-pago'

/**
 * Props do componente
 */
interface ModalPagamentoPixProps {
  aberto: boolean
  onFechar: () => void
  tenantId: string
  tenantNome: string
  onPagamentoAprovado?: () => void
}

/**
 * Interface para dados do pagamento
 */
interface DadosPagamento {
  pagamentoId: string
  qrCodeBase64: string
  copiaCola: string
  dataExpiracao: string
  valor: number
  status: string
}

/**
 * Formata valor em reais
 */
function formatarValor(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Calcula tempo restante até expiração
 */
function calcularTempoRestante(dataExpiracao: string): string {
  const agora = new Date()
  const expiracao = new Date(dataExpiracao)
  const diffMs = expiracao.getTime() - agora.getTime()
  
  if (diffMs <= 0) return 'Expirado'
  
  const minutos = Math.floor(diffMs / 60000)
  const segundos = Math.floor((diffMs % 60000) / 1000)
  
  return `${minutos}:${segundos.toString().padStart(2, '0')}`
}

/**
 * Componente principal do Modal de Pagamento PIX
 */
export function ModalPagamentoPix({
  aberto,
  onFechar,
  tenantId,
  tenantNome,
  onPagamentoAprovado,
}: ModalPagamentoPixProps) {
  // Estados
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dadosPagamento, setDadosPagamento] = useState<DadosPagamento | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [tempoRestante, setTempoRestante] = useState<string>('')
  const [verificandoStatus, setVerificandoStatus] = useState(false)

  /**
   * Cria novo pagamento PIX
   */
  const criarPagamento = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const resposta = await fetch('/api/pagamentos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          plano: 'basico',
          criadoPor: 'admin',
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro || 'Erro ao gerar PIX')
      }

      setDadosPagamento({
        pagamentoId: dados.pagamentoId,
        qrCodeBase64: dados.qrCodeBase64,
        copiaCola: dados.copiaCola,
        dataExpiracao: dados.dataExpiracao,
        valor: dados.valor || VALOR_PLANO_MENSAL,
        status: 'pendente',
      })

    } catch (erro) {
      console.error('[ModalPix] Erro ao criar pagamento:', erro)
      setErro(erro instanceof Error ? erro.message : 'Erro ao gerar PIX')
    } finally {
      setCarregando(false)
    }
  }, [tenantId])

  /**
   * Verifica status do pagamento
   */
  const verificarStatus = useCallback(async () => {
    if (!dadosPagamento?.pagamentoId) return

    setVerificandoStatus(true)

    try {
      const resposta = await fetch(
        `/api/pagamentos/status?pagamentoId=${dadosPagamento.pagamentoId}`
      )
      const dados = await resposta.json()

      if (dados.status === 'aprovado') {
        setDadosPagamento(prev => prev ? { ...prev, status: 'aprovado' } : null)
        onPagamentoAprovado?.()
      } else if (dados.status === 'expirado') {
        setDadosPagamento(prev => prev ? { ...prev, status: 'expirado' } : null)
      }

    } catch (erro) {
      console.error('[ModalPix] Erro ao verificar status:', erro)
    } finally {
      setVerificandoStatus(false)
    }
  }, [dadosPagamento?.pagamentoId, onPagamentoAprovado])

  /**
   * Copia código PIX para clipboard
   */
  const copiarCodigo = async () => {
    if (!dadosPagamento?.copiaCola) return

    try {
      await navigator.clipboard.writeText(dadosPagamento.copiaCola)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 3000)
    } catch (erro) {
      console.error('[ModalPix] Erro ao copiar:', erro)
    }
  }

  // Criar pagamento ao abrir modal
  useEffect(() => {
    if (aberto && !dadosPagamento) {
      criarPagamento()
    }
  }, [aberto, dadosPagamento, criarPagamento])

  // Atualizar tempo restante
  useEffect(() => {
    if (!dadosPagamento?.dataExpiracao || dadosPagamento.status !== 'pendente') return

    const intervalo = setInterval(() => {
      const tempo = calcularTempoRestante(dadosPagamento.dataExpiracao)
      setTempoRestante(tempo)

      if (tempo === 'Expirado') {
        setDadosPagamento(prev => prev ? { ...prev, status: 'expirado' } : null)
      }
    }, 1000)

    return () => clearInterval(intervalo)
  }, [dadosPagamento?.dataExpiracao, dadosPagamento?.status])

  // Verificar status periodicamente
  useEffect(() => {
    if (!dadosPagamento || dadosPagamento.status !== 'pendente') return

    const intervalo = setInterval(verificarStatus, 5000)
    return () => clearInterval(intervalo)
  }, [dadosPagamento, verificarStatus])

  // Reset ao fechar
  useEffect(() => {
    if (!aberto) {
      setDadosPagamento(null)
      setErro(null)
      setCopiado(false)
    }
  }, [aberto])

  return (
    <AnimatePresence>
      {aberto && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFechar}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 
                       sm:max-w-md sm:w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl z-50 
                       overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-zinc-900 dark:text-white">
                    Pagamento PIX
                  </h2>
                  <p className="text-xs text-zinc-500">{tenantNome}</p>
                </div>
              </div>
              <button
                onClick={onFechar}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Loading */}
              {carregando && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                  <p className="text-sm text-zinc-500">Gerando QR Code PIX...</p>
                </div>
              )}

              {/* Erro */}
              {erro && !carregando && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">{erro}</p>
                  <button
                    onClick={criarPagamento}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* Pagamento Aprovado */}
              {dadosPagamento?.status === 'aprovado' && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Pagamento Aprovado!
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      O plano foi ativado com sucesso
                    </p>
                  </div>
                  <button
                    onClick={onFechar}
                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Pagamento Expirado */}
              {dadosPagamento?.status === 'expirado' && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      PIX Expirado
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      O tempo para pagamento acabou
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDadosPagamento(null)
                      criarPagamento()
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Gerar novo PIX
                  </button>
                </div>
              )}

              {/* QR Code PIX */}
              {dadosPagamento && dadosPagamento.status === 'pendente' && !carregando && (
                <div className="space-y-6">
                  {/* Valor */}
                  <div className="text-center">
                    <p className="text-sm text-zinc-500">Valor a pagar</p>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {formatarValor(dadosPagamento.valor)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Assinatura mensal</p>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-lg">
                      {dadosPagamento.qrCodeBase64 ? (
                        <img
                          src={`data:image/png;base64,${dadosPagamento.qrCodeBase64}`}
                          alt="QR Code PIX"
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 bg-zinc-100 rounded-lg flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-zinc-300" />
                        </div>
                      )}
                    </div>

                    {/* Tempo restante */}
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <Clock className="w-4 h-4" />
                      <span>Expira em {tempoRestante}</span>
                      {verificandoStatus && (
                        <Loader2 className="w-3 h-3 animate-spin ml-1" />
                      )}
                    </div>
                  </div>

                  {/* Instruções */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Como pagar:
                    </p>
                    <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-xs font-medium text-emerald-600">1</span>
                        <span>Abra o app do seu banco</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-xs font-medium text-emerald-600">2</span>
                        <span>Escaneie o QR Code ou copie o código</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-xs font-medium text-emerald-600">3</span>
                        <span>Confirme o pagamento</span>
                      </li>
                    </ol>
                  </div>

                  {/* Botão Copiar */}
                  <button
                    onClick={copiarCodigo}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                      copiado
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90'
                    }`}
                  >
                    {copiado ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Código copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar código PIX
                      </>
                    )}
                  </button>

                  {/* Dica mobile */}
                  <p className="text-xs text-zinc-400 text-center flex items-center justify-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    No celular, copie o código e cole no app do banco
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
