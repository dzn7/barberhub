'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Phone, 
  Calendar,
  Clock,
  Scissors,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { format, addDays, parse, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'
import { schemaNovoAgendamento, validarFormulario, formatarTelefone } from '@/lib/validacoes'

interface Servico {
  id: string
  nome: string
  preco: number
  duracao: number
}

interface Cliente {
  id: string
  nome: string
  telefone: string
}

interface NovoAgendamentoBarbeiroProps {
  onSucesso?: () => void
}

/**
 * Formulário para criar novo agendamento
 * Simplificado para uso do barbeiro
 */
export function NovoAgendamentoBarbeiro({ onSucesso }: NovoAgendamentoBarbeiroProps) {
  const { barbeiro, tenant } = useBarbeiroAuth()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])

  const [formulario, setFormulario] = useState({
    clienteNome: '',
    clienteTelefone: '',
    servicoId: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: ''
  })

  // Gerar datas disponíveis (próximos 30 dias)
  const datasDisponiveis = Array.from({ length: 30 }, (_, i) => {
    const data = addDays(new Date(), i)
    return {
      valor: format(data, 'yyyy-MM-dd'),
      label: format(data, "EEEE, d 'de' MMMM", { locale: ptBR })
    }
  })

  // Gerar horários disponíveis
  const horariosBase = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00'
  ]

  useEffect(() => {
    if (barbeiro && tenant) {
      carregarDados()
    }
  }, [barbeiro, tenant])

  useEffect(() => {
    if (barbeiro && tenant && formulario.data) {
      carregarHorariosOcupados()
    }
  }, [barbeiro, tenant, formulario.data])

  const carregarDados = async () => {
    if (!tenant) return

    try {
      // Carregar serviços
      const { data: servicosData } = await supabase
        .from('servicos')
        .select('id, nome, preco, duracao')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('nome')

      // Carregar clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('nome')

      setServicos(servicosData || [])
      setClientes(clientesData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregando(false)
    }
  }

  const carregarHorariosOcupados = async () => {
    if (!barbeiro || !tenant || !formulario.data) return

    try {
      const dataInicio = new Date(`${formulario.data}T00:00:00`)
      const dataFim = new Date(`${formulario.data}T23:59:59`)

      const { data } = await supabase
        .from('agendamentos')
        .select('data_hora')
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
        .gte('data_hora', dataInicio.toISOString())
        .lte('data_hora', dataFim.toISOString())
        .in('status', ['pendente', 'confirmado'])

      const ocupados = (data || []).map(ag => 
        format(new Date(ag.data_hora), 'HH:mm')
      )
      
      setHorariosOcupados(ocupados)
    } catch (error) {
      console.error('Erro ao carregar horários ocupados:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensagem(null)

    if (!barbeiro || !tenant) {
      setMensagem({ tipo: 'erro', texto: 'Erro de autenticação. Recarregue a página.' })
      return
    }

    // Validar formulário
    const dadosValidacao = {
      clienteNome: formulario.clienteNome,
      clienteTelefone: formulario.clienteTelefone,
      data: formulario.data,
      hora: formulario.hora,
      barbeiroId: barbeiro.id,
      servicoId: formulario.servicoId
    }

    const validacao = validarFormulario(schemaNovoAgendamento, dadosValidacao)
    if (!validacao.sucesso) {
      const primeiroErro = Object.values(validacao.erros)[0]
      setMensagem({ tipo: 'erro', texto: primeiroErro || 'Preencha todos os campos' })
      return
    }

    setProcessando(true)

    try {
      // Verificar ou criar cliente
      let clienteId: string

      const clienteExistente = clientes.find(
        c => c.telefone === formulario.clienteTelefone.replace(/\D/g, '')
      )

      if (clienteExistente) {
        clienteId = clienteExistente.id
      } else {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clientes')
          .insert([{
            tenant_id: tenant.id,
            nome: formulario.clienteNome,
            telefone: formulario.clienteTelefone,
            ativo: true
          }])
          .select()
          .single()

        if (erroCliente) throw erroCliente
        clienteId = novoCliente.id
      }

      // Criar agendamento
      const dataHora = new Date(`${formulario.data}T${formulario.hora}:00`)

      const { error: erroAgendamento } = await supabase
        .from('agendamentos')
        .insert([{
          tenant_id: tenant.id,
          cliente_id: clienteId,
          barbeiro_id: barbeiro.id,
          servico_id: formulario.servicoId,
          data_hora: dataHora.toISOString(),
          status: 'confirmado'
        }])

      if (erroAgendamento) throw erroAgendamento

      setMensagem({ tipo: 'sucesso', texto: 'Agendamento criado com sucesso!' })
      
      // Limpar formulário
      setFormulario({
        clienteNome: '',
        clienteTelefone: '',
        servicoId: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        hora: ''
      })

      // Callback de sucesso
      setTimeout(() => {
        onSucesso?.()
      }, 1500)

    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao criar agendamento. Tente novamente.' })
    } finally {
      setProcessando(false)
    }
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value)
    setFormulario(prev => ({ ...prev, clienteTelefone: valorFormatado }))
  }

  // Verificar se horário está disponível
  const horarioDisponivel = (horario: string) => {
    if (horariosOcupados.includes(horario)) return false
    
    // Verificar se é hoje e se o horário já passou
    if (formulario.data === format(new Date(), 'yyyy-MM-dd')) {
      const agora = new Date()
      const [hora, minuto] = horario.split(':').map(Number)
      const horarioData = new Date()
      horarioData.setHours(hora, minuto, 0)
      
      if (isBefore(horarioData, agora)) return false
    }
    
    return true
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Novo Agendamento
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Crie um novo agendamento para um cliente
        </p>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {mensagem.tipo === 'sucesso' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {mensagem.texto}
        </motion.div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do Cliente */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-zinc-500" />
            Dados do Cliente
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nome do Cliente
              </label>
              <input
                type="text"
                value={formulario.clienteNome}
                onChange={(e) => setFormulario(prev => ({ ...prev, clienteNome: e.target.value }))}
                placeholder="Nome completo"
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                list="clientes-lista"
              />
              <datalist id="clientes-lista">
                {clientes.map(c => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formulario.clienteTelefone}
                onChange={handleTelefoneChange}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* Serviço */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-zinc-500" />
            Serviço
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {servicos.map(servico => (
              <button
                key={servico.id}
                type="button"
                onClick={() => setFormulario(prev => ({ ...prev, servicoId: servico.id }))}
                className={`p-4 rounded-xl border text-left transition-all ${
                  formulario.servicoId === servico.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <p className="font-medium text-zinc-900 dark:text-white truncate">
                  {servico.nome}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(servico.preco)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {servico.duracao} min
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Data e Hora */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-zinc-500" />
            Data e Horário
          </h3>

          <div className="space-y-4">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Data
              </label>
              <select
                value={formulario.data}
                onChange={(e) => setFormulario(prev => ({ ...prev, data: e.target.value, hora: '' }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {datasDisponiveis.map(data => (
                  <option key={data.valor} value={data.valor}>
                    {data.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Horários */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Horário
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {horariosBase.map(horario => {
                  const disponivel = horarioDisponivel(horario)
                  return (
                    <button
                      key={horario}
                      type="button"
                      disabled={!disponivel}
                      onClick={() => setFormulario(prev => ({ ...prev, hora: horario }))}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        formulario.hora === horario
                          ? 'bg-emerald-500 text-white'
                          : disponivel
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed line-through'
                      }`}
                    >
                      {horario}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={processando}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-semibold py-4 rounded-xl transition-colors"
        >
          {processando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Criar Agendamento
            </>
          )}
        </button>
      </form>
    </div>
  )
}
