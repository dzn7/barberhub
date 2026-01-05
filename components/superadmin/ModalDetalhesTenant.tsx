'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, Mail, Phone, Globe, MapPin, Calendar,
  Users, Scissors, FileText, DollarSign, Clock, ExternalLink,
  CreditCard, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { Tenant, PLANOS_CONFIG } from './types'

interface ModalDetalhesTenantProps {
  tenant: Tenant | null
  aberto: boolean
  onFechar: () => void
}

interface AgendamentoRecente {
  id: string
  data_hora: string
  status: string
  clientes: { nome: string } | null
  servicos: { nome: string; preco: number } | null
}

/**
 * Modal com detalhes completos do tenant
 */
export function ModalDetalhesTenant({ tenant, aberto, onFechar }: ModalDetalhesTenantProps) {
  const [agendamentosRecentes, setAgendamentosRecentes] = useState<AgendamentoRecente[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (tenant && aberto) {
      carregarAgendamentos()
    }
  }, [tenant, aberto])

  const carregarAgendamentos = async () => {
    if (!tenant) return
    setCarregando(true)
    try {
      const { data } = await supabase
        .from('agendamentos')
        .select('id, data_hora, status, clientes(nome), servicos(nome, preco)')
        .eq('tenant_id', tenant.id)
        .order('data_hora', { ascending: false })
        .limit(5)

      // Normalizar dados do Supabase (relações podem vir como objeto ou array)
      const agendamentosNormalizados = (data || []).map((ag: any) => ({
        id: ag.id,
        data_hora: ag.data_hora,
        status: ag.status,
        clientes: Array.isArray(ag.clientes) ? ag.clientes[0] : ag.clientes,
        servicos: Array.isArray(ag.servicos) ? ag.servicos[0] : ag.servicos
      }))

      setAgendamentosRecentes(agendamentosNormalizados)
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setCarregando(false)
    }
  }

  if (!tenant) return null

  const planoConfig = PLANOS_CONFIG[tenant.plano] || PLANOS_CONFIG.trial
  const diasTrial = tenant.trial_fim ? differenceInDays(new Date(tenant.trial_fim), new Date()) : null

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onFechar}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 p-6">
              <button
                onClick={onFechar}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/10">
                  {tenant.logo_url ? (
                    <Image
                      src={tenant.logo_url}
                      alt={tenant.nome}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-zinc-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{tenant.nome}</h2>
                  <p className="text-zinc-400">/{tenant.slug}</p>
                </div>
                <a
                  href={`/${tenant.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver Site
                </a>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${planoConfig.bg} ${planoConfig.cor}`}>
                  Plano {planoConfig.nome}
                </span>
                {!tenant.ativo && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                    Inativo
                  </span>
                )}
                {tenant.suspenso && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                    Suspenso
                  </span>
                )}
                {diasTrial !== null && tenant.plano === 'trial' && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    diasTrial < 0 ? 'bg-red-500/20 text-red-400' :
                    diasTrial <= 3 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {diasTrial < 0 ? 'Trial Expirado' : `${diasTrial} dias de trial`}
                  </span>
                )}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Estatísticas */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <CardMiniStat icone={Scissors} valor={tenant.total_barbeiros} label="Barbeiros" cor="text-blue-600" />
                <CardMiniStat icone={FileText} valor={tenant.total_servicos} label="Serviços" cor="text-emerald-600" />
                <CardMiniStat icone={Calendar} valor={tenant.total_agendamentos} label="Agendamentos" cor="text-purple-600" />
                <CardMiniStat icone={Users} valor={tenant.total_clientes} label="Clientes" cor="text-amber-600" />
              </div>

              {/* Informações de Contato */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Informações de Contato</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoItem icone={Mail} label="Email" valor={tenant.email} />
                  <InfoItem icone={Phone} label="Telefone" valor={tenant.telefone || tenant.whatsapp || '-'} />
                </div>
              </div>

              {/* Limites do Plano */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Limites do Plano</h3>
                <div className="space-y-3">
                  <BarraProgresso
                    label="Barbeiros"
                    atual={tenant.total_barbeiros}
                    limite={planoConfig.limite_profissionais}
                  />
                  <BarraProgresso
                    label="Serviços"
                    atual={tenant.total_servicos}
                    limite={planoConfig.limite_servicos}
                  />
                  <BarraProgresso
                    label="Agendamentos/mês"
                    atual={tenant.total_agendamentos}
                    limite={planoConfig.limite_agendamentos}
                  />
                </div>
              </div>

              {/* Últimos Agendamentos */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">Últimos Agendamentos</h3>
                {carregando ? (
                  <div className="text-center py-4 text-zinc-500">Carregando...</div>
                ) : agendamentosRecentes.length === 0 ? (
                  <div className="text-center py-4 text-zinc-500">Nenhum agendamento encontrado</div>
                ) : (
                  <div className="space-y-2">
                    {agendamentosRecentes.map((ag) => (
                      <div
                        key={ag.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon status={ag.status} />
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              {ag.clientes?.nome || 'Cliente'}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {ag.servicos?.nome || 'Serviço'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            R$ {(ag.servicos?.preco || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {format(parseISO(ag.data_hora), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Datas */}
              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 flex justify-between">
                <span>Criado em: {format(parseISO(tenant.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                <span>Atualizado: {format(parseISO(tenant.atualizado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CardMiniStat({ icone: Icone, valor, label, cor }: {
  icone: any
  valor: number
  label: string
  cor: string
}) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center">
      <Icone className={`w-5 h-5 mx-auto mb-1 ${cor}`} />
      <p className="text-lg font-bold text-zinc-900 dark:text-white">{valor}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  )
}

function InfoItem({ icone: Icone, label, valor }: { icone: any; label: string; valor: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
        <Icone className="w-4 h-4 text-zinc-500" />
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-white">{valor}</p>
      </div>
    </div>
  )
}

function BarraProgresso({ label, atual, limite }: { label: string; atual: number; limite: number }) {
  const percentual = Math.min((atual / limite) * 100, 100)
  const corBarra = percentual >= 90 ? 'bg-red-500' : percentual >= 70 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="text-zinc-900 dark:text-white font-medium">
          {atual} / {limite >= 999 ? '∞' : limite}
        </span>
      </div>
      <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${corBarra} rounded-full transition-all`}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'concluido':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />
    case 'cancelado':
      return <XCircle className="w-5 h-5 text-red-500" />
    case 'confirmado':
      return <CheckCircle className="w-5 h-5 text-blue-500" />
    default:
      return <Clock className="w-5 h-5 text-amber-500" />
  }
}
