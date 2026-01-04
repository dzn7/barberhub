'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ExternalLink, MoreHorizontal, Trash2, UserX, Power,
  CreditCard, Clock, Calendar, Users, Scissors, FileText,
  Building2, Mail, Phone, Globe, ChevronDown
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Tenant, PLANOS_CONFIG } from './types'

interface CardTenantProps {
  tenant: Tenant
  onExcluir: () => void
  onAlterarPlano: (novoPlano: string) => void
  onToggleAtivo: () => void
  onVerDetalhes: () => void
}

/**
 * Card de exibição de tenant/barbearia
 * Design profissional com logo e informações completas
 */
export function CardTenant({
  tenant,
  onExcluir,
  onAlterarPlano,
  onToggleAtivo,
  onVerDetalhes
}: CardTenantProps) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [menuPlanoAberto, setMenuPlanoAberto] = useState(false)

  const statusTrial = getStatusTrial(tenant)
  const planoConfig = PLANOS_CONFIG[tenant.plano] || PLANOS_CONFIG.trial

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden transition-all hover:shadow-lg ${
        !tenant.ativo || tenant.suspenso
          ? 'border-zinc-300 dark:border-zinc-700 opacity-75'
          : 'border-zinc-200 dark:border-zinc-800'
      }`}
    >
      {/* Header com Logo */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
            {tenant.logo_url ? (
              <Image
                src={tenant.logo_url}
                alt={tenant.nome}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-7 h-7 text-zinc-400" />
              </div>
            )}
          </div>

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                  {tenant.nome}
                </h3>
                <p className="text-sm text-zinc-500 truncate">/{tenant.slug}</p>
              </div>

              {/* Menu de Ações */}
              <div className="relative">
                <button
                  onClick={() => setMenuAberto(!menuAberto)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {menuAberto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuAberto(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                      <a
                        href={`/${tenant.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <Globe className="w-4 h-4" />
                        Ver Site
                      </a>
                      <button
                        onClick={() => { onVerDetalhes(); setMenuAberto(false) }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => { onToggleAtivo(); setMenuAberto(false) }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left"
                      >
                        <Power className="w-4 h-4" />
                        {tenant.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
                      <button
                        onClick={() => { onExcluir(); setMenuAberto(false) }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Badge de Plano */}
              <div className="relative">
                <button
                  onClick={() => setMenuPlanoAberto(!menuPlanoAberto)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${planoConfig.bg} ${planoConfig.cor}`}
                >
                  {planoConfig.nome}
                  <ChevronDown className="w-3 h-3" />
                </button>

                {menuPlanoAberto && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuPlanoAberto(false)}
                    />
                    <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                      {Object.entries(PLANOS_CONFIG).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => {
                            onAlterarPlano(key)
                            setMenuPlanoAberto(false)
                          }}
                          className={`flex items-center justify-between px-3 py-2 text-sm w-full text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                            tenant.plano === key ? 'bg-zinc-50 dark:bg-zinc-700/50' : ''
                          }`}
                        >
                          <span className={config.cor}>{config.nome}</span>
                          {config.preco > 0 && (
                            <span className="text-zinc-400 text-xs">
                              R$ {config.preco.toFixed(2)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Badge de Status Trial */}
              {tenant.plano === 'trial' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusTrial.bg} ${statusTrial.cor}`}>
                  {statusTrial.texto}
                </span>
              )}

              {/* Badge de Status */}
              {!tenant.ativo && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                  Inativo
                </span>
              )}
              {tenant.suspenso && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600">
                  Suspenso
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 divide-x divide-zinc-100 dark:divide-zinc-800">
        <EstatisticaMini icone={Scissors} valor={tenant.total_barbeiros} label="Barbeiros" />
        <EstatisticaMini icone={FileText} valor={tenant.total_servicos} label="Serviços" />
        <EstatisticaMini icone={Calendar} valor={tenant.total_agendamentos} label="Agend." />
        <EstatisticaMini icone={Users} valor={tenant.total_clientes} label="Clientes" />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate max-w-[150px]">{tenant.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {formatDistanceToNow(parseISO(tenant.criado_em), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function EstatisticaMini({ icone: Icone, valor, label }: {
  icone: any
  valor: number
  label: string
}) {
  return (
    <div className="py-3 px-2 text-center">
      <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
        <Icone className="w-3.5 h-3.5" />
      </div>
      <p className="text-sm font-bold text-zinc-900 dark:text-white">{valor}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  )
}

function getStatusTrial(tenant: Tenant) {
  if (!tenant.trial_fim) {
    return { texto: 'Sem prazo', cor: 'text-zinc-600', bg: 'bg-zinc-100 dark:bg-zinc-800' }
  }

  const agora = new Date()
  const fimTrial = new Date(tenant.trial_fim)
  const diasRestantes = differenceInDays(fimTrial, agora)

  if (diasRestantes < 0) {
    return { texto: 'Expirado', cor: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
  } else if (diasRestantes === 0) {
    return { texto: 'Expira hoje', cor: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
  } else if (diasRestantes <= 3) {
    return { texto: `${diasRestantes}d restantes`, cor: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' }
  } else {
    return { texto: `${diasRestantes}d restantes`, cor: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' }
  }
}
