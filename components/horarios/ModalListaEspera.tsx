'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Bell, 
  Phone, 
  User, 
  Clock, 
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ModalListaEsperaProps {
  aberto: boolean
  onFechar: () => void
  tenantId: string
  barbeiroId: string
  barbeiroNome: string
  dataSelecionada: string
  horarioSelecionado: string
  cores: {
    primaria: string
    secundaria: string
    destaque: string
  }
  nomeEstabelecimento: string
}

type StatusModal = 'formulario' | 'enviando' | 'sucesso' | 'erro'

export function ModalListaEspera({
  aberto,
  onFechar,
  tenantId,
  barbeiroId,
  barbeiroNome,
  dataSelecionada,
  horarioSelecionado,
  cores,
  nomeEstabelecimento
}: ModalListaEsperaProps) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [status, setStatus] = useState<StatusModal>('formulario')
  const [mensagemErro, setMensagemErro] = useState('')

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = formatarTelefone(e.target.value)
    setTelefone(valor)
  }

  const telefoneValido = telefone.replace(/\D/g, '').length >= 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!telefoneValido) {
      setMensagemErro('Informe um telefone válido com DDD')
      return
    }

    setStatus('enviando')
    setMensagemErro('')

    try {
      const { error } = await supabase
        .from('interessados_horarios')
        .insert({
          tenant_id: tenantId,
          barbeiro_id: barbeiroId,
          data: dataSelecionada,
          horario_desejado: horarioSelecionado + ':00',
          telefone: telefone.replace(/\D/g, ''),
          nome: nome || null
        })

      if (error) {
        if (error.code === '23505') {
          setMensagemErro('Você já está na lista de espera para este horário')
          setStatus('erro')
          return
        }
        throw error
      }

      setStatus('sucesso')

      setTimeout(() => {
        resetarFormulario()
        onFechar()
      }, 3000)
    } catch (err: any) {
      console.error('Erro ao cadastrar na lista de espera:', err)
      setMensagemErro(err.message || 'Erro ao cadastrar. Tente novamente.')
      setStatus('erro')
    }
  }

  const resetarFormulario = () => {
    setNome('')
    setTelefone('')
    setStatus('formulario')
    setMensagemErro('')
  }

  const handleFechar = () => {
    resetarFormulario()
    onFechar()
  }

  const dataFormatada = dataSelecionada 
    ? format(parse(dataSelecionada, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : ''

  return (
    <AnimatePresence>
      {aberto && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleFechar}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md"
              style={{
                maxHeight: 'calc(100vh - 80px)',
              }}
            >
            <div 
              className="rounded-2xl border overflow-hidden shadow-2xl max-h-full flex flex-col"
              style={{ 
                backgroundColor: cores.primaria,
                borderColor: cores.destaque + '20'
              }}
            >
              {/* Header */}
              <div 
                className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
                style={{ borderColor: cores.destaque + '20' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: cores.secundaria + '15' }}
                  >
                    <Bell className="w-5 h-5" style={{ color: cores.secundaria }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: cores.secundaria }}>
                      Lista de Espera
                    </h3>
                    <p className="text-xs" style={{ color: cores.destaque }}>
                      Aviso quando liberar
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleFechar}
                  className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                  style={{ 
                    backgroundColor: cores.destaque + '15',
                    color: cores.destaque
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="p-5 overflow-y-auto flex-1">
                <AnimatePresence mode="wait">
                  {status === 'formulario' && (
                    <motion.form
                      key="formulario"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-4"
                    >
                      {/* Informações do Horário */}
                      <div 
                        className="rounded-xl p-4 space-y-2"
                        style={{ backgroundColor: cores.destaque + '10' }}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4" style={{ color: cores.destaque }} />
                          <span className="capitalize" style={{ color: cores.secundaria }}>
                            {dataFormatada}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" style={{ color: cores.destaque }} />
                          <span style={{ color: cores.secundaria }}>
                            {horarioSelecionado} com {barbeiroNome}
                          </span>
                        </div>
                      </div>

                      {/* Campo Nome */}
                      <div>
                        <label 
                          className="block text-sm font-medium mb-2"
                          style={{ color: cores.secundaria }}
                        >
                          Seu nome (opcional)
                        </label>
                        <div className="relative">
                          <User 
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                            style={{ color: cores.destaque }}
                          />
                          <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Como podemos te chamar?"
                            className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2"
                            style={{ 
                              backgroundColor: cores.destaque + '10',
                              borderColor: cores.destaque + '20',
                              color: cores.secundaria,
                              '--tw-ring-color': cores.secundaria + '40'
                            } as any}
                          />
                        </div>
                      </div>

                      {/* Campo Telefone */}
                      <div>
                        <label 
                          className="block text-sm font-medium mb-2"
                          style={{ color: cores.secundaria }}
                        >
                          WhatsApp para aviso *
                        </label>
                        <div className="relative">
                          <Phone 
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                            style={{ color: cores.destaque }}
                          />
                          <input
                            type="tel"
                            value={telefone}
                            onChange={handleTelefoneChange}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            required
                            className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2"
                            style={{ 
                              backgroundColor: cores.destaque + '10',
                              borderColor: cores.destaque + '20',
                              color: cores.secundaria,
                              '--tw-ring-color': cores.secundaria + '40'
                            } as any}
                          />
                        </div>
                      </div>

                      {/* Aviso */}
                      <p className="text-xs text-center" style={{ color: cores.destaque }}>
                        Você receberá uma mensagem no WhatsApp assim que este horário for liberado.
                      </p>

                      {/* Erro */}
                      {mensagemErro && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 rounded-lg"
                          style={{ backgroundColor: '#ef444420' }}
                        >
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-sm text-red-500">{mensagemErro}</p>
                        </motion.div>
                      )}

                      {/* Botão */}
                      <button
                        type="submit"
                        disabled={!telefoneValido}
                        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          backgroundColor: cores.secundaria,
                          color: cores.primaria
                        }}
                      >
                        Entrar na Lista de Espera
                      </button>
                    </motion.form>
                  )}

                  {status === 'enviando' && (
                    <motion.div
                      key="enviando"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-12 text-center"
                    >
                      <Loader2 
                        className="w-12 h-12 mx-auto mb-4 animate-spin"
                        style={{ color: cores.secundaria }}
                      />
                      <p style={{ color: cores.secundaria }}>Cadastrando...</p>
                    </motion.div>
                  )}

                  {status === 'sucesso' && (
                    <motion.div
                      key="sucesso"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-8 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#22c55e20' }}
                      >
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </motion.div>
                      <h4 className="font-semibold mb-2" style={{ color: cores.secundaria }}>
                        Tudo certo!
                      </h4>
                      <p className="text-sm mb-1" style={{ color: cores.destaque }}>
                        Você está na lista de espera.
                      </p>
                      <p className="text-xs" style={{ color: cores.destaque }}>
                        Avisaremos por WhatsApp se o horário liberar.
                      </p>
                    </motion.div>
                  )}

                  {status === 'erro' && (
                    <motion.div
                      key="erro"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-8 text-center"
                    >
                      <div 
                        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#ef444420' }}
                      >
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <h4 className="font-semibold mb-2" style={{ color: cores.secundaria }}>
                        Ops!
                      </h4>
                      <p className="text-sm mb-4" style={{ color: cores.destaque }}>
                        {mensagemErro || 'Ocorreu um erro. Tente novamente.'}
                      </p>
                      <button
                        onClick={() => setStatus('formulario')}
                        className="px-6 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                        style={{ 
                          backgroundColor: cores.secundaria,
                          color: cores.primaria
                        }}
                      >
                        Tentar novamente
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ModalListaEspera
