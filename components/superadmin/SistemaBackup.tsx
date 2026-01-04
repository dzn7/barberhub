'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Database, HardDrive, Clock, CheckCircle,
  AlertTriangle, Loader2, FileJson, Archive, RefreshCw
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

interface BackupStatus {
  tabela: string
  registros: number
  status: 'pendente' | 'baixando' | 'concluido' | 'erro'
}

const TABELAS_BACKUP = [
  { nome: 'tenants', label: 'Barbearias' },
  { nome: 'proprietarios', label: 'Proprietários' },
  { nome: 'barbeiros', label: 'Barbeiros' },
  { nome: 'servicos', label: 'Serviços' },
  { nome: 'clientes', label: 'Clientes' },
  { nome: 'agendamentos', label: 'Agendamentos' },
  { nome: 'transacoes', label: 'Transações' },
  { nome: 'comissoes', label: 'Comissões' },
  { nome: 'horarios_disponiveis', label: 'Horários' },
  { nome: 'configuracoes_barbearia', label: 'Configurações' }
]

/**
 * Sistema de backup do banco de dados
 * Permite baixar dados em JSON para backup manual
 */
export function SistemaBackup() {
  const [backupEmAndamento, setBackupEmAndamento] = useState(false)
  const [statusTabelas, setStatusTabelas] = useState<BackupStatus[]>([])
  const [dadosBackup, setDadosBackup] = useState<any>(null)
  const [progresso, setProgresso] = useState(0)
  const [ultimoBackup, setUltimoBackup] = useState<Date | null>(null)

  const iniciarBackup = async () => {
    setBackupEmAndamento(true)
    setDadosBackup(null)
    setProgresso(0)

    const statusInicial = TABELAS_BACKUP.map(t => ({
      tabela: t.nome,
      registros: 0,
      status: 'pendente' as const
    }))
    setStatusTabelas(statusInicial)

    const backup: any = {
      versao: '1.0',
      data_backup: new Date().toISOString(),
      tabelas: {}
    }

    try {
      for (let i = 0; i < TABELAS_BACKUP.length; i++) {
        const tabela = TABELAS_BACKUP[i]

        setStatusTabelas(prev => prev.map(s =>
          s.tabela === tabela.nome ? { ...s, status: 'baixando' } : s
        ))

        const { data, error } = await supabase
          .from(tabela.nome)
          .select('*')
          .limit(10000)

        if (error) {
          setStatusTabelas(prev => prev.map(s =>
            s.tabela === tabela.nome ? { ...s, status: 'erro' } : s
          ))
          console.error(`Erro ao baixar ${tabela.nome}:`, error)
        } else {
          backup.tabelas[tabela.nome] = data || []
          setStatusTabelas(prev => prev.map(s =>
            s.tabela === tabela.nome
              ? { ...s, registros: data?.length || 0, status: 'concluido' }
              : s
          ))
        }

        setProgresso(((i + 1) / TABELAS_BACKUP.length) * 100)
        await new Promise(r => setTimeout(r, 200))
      }

      setDadosBackup(backup)
      setUltimoBackup(new Date())
    } catch (error) {
      console.error('Erro no backup:', error)
    } finally {
      setBackupEmAndamento(false)
    }
  }

  const baixarBackup = () => {
    if (!dadosBackup) return

    const blob = new Blob([JSON.stringify(dadosBackup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barberhub_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const totalRegistros = statusTabelas.reduce((acc, s) => acc + s.registros, 0)
  const tabelasConcluidas = statusTabelas.filter(s => s.status === 'concluido').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Backup do Sistema
          </h2>
          <p className="text-sm text-zinc-500">
            Faça backup dos dados em formato JSON
          </p>
        </div>

        {ultimoBackup && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Clock className="w-4 h-4" />
            Último backup: {format(ultimoBackup, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        )}
      </div>

      {/* Card Principal */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Área de Ação */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
              <Database className="w-8 h-8 text-zinc-600 dark:text-zinc-400" />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                Backup Completo do Banco de Dados
              </h3>
              <p className="text-sm text-zinc-500">
                Inclui todas as tabelas principais: barbearias, barbeiros, clientes,
                agendamentos, transações e configurações.
              </p>
            </div>

            <button
              onClick={iniciarBackup}
              disabled={backupEmAndamento}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {backupEmAndamento ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando Backup...
                </>
              ) : (
                <>
                  <Archive className="w-5 h-5" />
                  Iniciar Backup
                </>
              )}
            </button>
          </div>

          {/* Barra de Progresso */}
          {backupEmAndamento && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-600 dark:text-zinc-400">Progresso</span>
                <span className="text-zinc-900 dark:text-white font-medium">
                  {tabelasConcluidas}/{TABELAS_BACKUP.length} tabelas
                </span>
              </div>
              <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progresso}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Lista de Tabelas */}
        {statusTabelas.length > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Status das Tabelas
              </h4>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {TABELAS_BACKUP.map((tabela) => {
                const status = statusTabelas.find(s => s.tabela === tabela.nome)
                return (
                  <div
                    key={tabela.nome}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon status={status?.status || 'pendente'} />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {tabela.label}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {status?.status === 'concluido' && (
                        <>{status.registros.toLocaleString('pt-BR')} registros</>
                      )}
                      {status?.status === 'baixando' && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {status?.status === 'erro' && (
                        <span className="text-red-500">Erro</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Resumo e Download */}
        {dadosBackup && !backupEmAndamento && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-6 bg-emerald-50 dark:bg-emerald-900/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-emerald-900 dark:text-emerald-100">
                    Backup concluído com sucesso!
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    {totalRegistros.toLocaleString('pt-BR')} registros em {tabelasConcluidas} tabelas
                  </p>
                </div>
              </div>

              <button
                onClick={baixarBackup}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                <Download className="w-5 h-5" />
                Baixar Arquivo JSON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Informações */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Importante sobre backups</p>
            <ul className="space-y-1 text-amber-700 dark:text-amber-300">
              <li>• Backups são exportados em formato JSON para armazenamento local</li>
              <li>• Máximo de 10.000 registros por tabela</li>
              <li>• Imagens e arquivos do R2 não são incluídos</li>
              <li>• Recomendamos fazer backups regularmente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'concluido':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />
    case 'baixando':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    case 'erro':
      return <AlertTriangle className="w-5 h-5 text-red-500" />
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
  }
}
