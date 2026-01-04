'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Users,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Lock,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface BarbeiroComToken {
  id: string
  nome: string
  telefone: string
  foto_url: string | null
  token_acesso: string | null
  token_ativo: boolean
  ultimo_acesso: string | null
}

/**
 * Gera token de acesso único
 */
const gerarNovoToken = (): string => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
  }
  return token
}

/**
 * Componente de Guia e Gestão de Acesso dos Barbeiros
 * Exibe informações sobre tokens, links e como os barbeiros acessam o sistema
 */
export function GuiaAcessoBarbeiros() {
  const { tenant } = useAuth()
  const [barbeiros, setBarbeiros] = useState<BarbeiroComToken[]>([])
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState(true)
  const [tokenCopiado, setTokenCopiado] = useState<string | null>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [regenerando, setRegenerando] = useState<string | null>(null)

  const linkAcesso = typeof window !== 'undefined' 
    ? `${window.location.origin}/barbeiro/entrar`
    : '/barbeiro/entrar'

  useEffect(() => {
    if (tenant) {
      carregarBarbeiros()
    }
  }, [tenant])

  const carregarBarbeiros = async () => {
    if (!tenant) return

    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('id, nome, telefone, foto_url, token_acesso, token_ativo, ultimo_acesso')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setBarbeiros(data || [])
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error)
    } finally {
      setCarregando(false)
    }
  }

  const copiarToken = async (token: string, barbeiroId: string) => {
    try {
      await navigator.clipboard.writeText(token)
      setTokenCopiado(barbeiroId)
      setTimeout(() => setTokenCopiado(null), 2000)
    } catch {
      console.error('Erro ao copiar')
    }
  }

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkAcesso)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    } catch {
      console.error('Erro ao copiar')
    }
  }

  const regenerarToken = async (barbeiroId: string) => {
    if (!confirm('Gerar um novo token? O token atual será invalidado.')) return

    setRegenerando(barbeiroId)
    try {
      const novoToken = gerarNovoToken()
      
      const { error } = await supabase
        .from('barbeiros')
        .update({ 
          token_acesso: novoToken,
          token_ativo: true 
        })
        .eq('id', barbeiroId)

      if (error) throw error

      setBarbeiros(prev => prev.map(b => 
        b.id === barbeiroId ? { ...b, token_acesso: novoToken } : b
      ))
    } catch (error) {
      console.error('Erro ao regenerar token:', error)
    } finally {
      setRegenerando(null)
    }
  }

  const formatarData = (data: string | null) => {
    if (!data) return 'Nunca acessou'
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Acesso dos Barbeiros
            </h3>
            <p className="text-sm text-zinc-500">
              Tokens e links para sua equipe acessar o sistema
            </p>
          </div>
        </div>
        {expandido ? (
          <ChevronUp className="w-5 h-5 text-zinc-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-400" />
        )}
      </button>

      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6 border-t border-zinc-200 dark:border-zinc-800 pt-6">
              {/* Como funciona */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Como funciona o acesso dos barbeiros?
                    </p>
                    <ol className="list-decimal list-inside text-blue-700 dark:text-blue-400 space-y-1">
                      <li>Cada barbeiro recebe um <strong>código de 8 caracteres</strong></li>
                      <li>O barbeiro acessa o link de login abaixo</li>
                      <li>Digita o código para entrar no painel dele</li>
                      <li>No painel, ele vê seus agendamentos e comissões</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Link de acesso */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Link de Acesso (envie para os barbeiros)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3">
                    <code className="text-sm text-blue-600 dark:text-blue-400 break-all">
                      {linkAcesso}
                    </code>
                  </div>
                  <button
                    onClick={copiarLink}
                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    {linkCopiado ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Lista de barbeiros e tokens */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Códigos de Acesso
                  </label>
                  <span className="text-xs text-zinc-500">
                    {barbeiros.length} barbeiro(s)
                  </span>
                </div>

                {carregando ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                ) : barbeiros.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                    <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500">Nenhum barbeiro cadastrado</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Cadastre barbeiros na seção Barbeiros para ver os códigos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {barbeiros.map((barbeiro) => (
                      <div
                        key={barbeiro.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                            {barbeiro.foto_url ? (
                              <Image
                                src={barbeiro.foto_url}
                                alt={barbeiro.nome}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                {barbeiro.nome.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">
                              {barbeiro.nome}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Último acesso: {formatarData(barbeiro.ultimo_acesso)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {barbeiro.token_acesso ? (
                            <>
                              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                <Lock className="w-4 h-4 text-zinc-400" />
                                <code className="font-mono font-bold text-zinc-900 dark:text-white tracking-wider">
                                  {barbeiro.token_acesso}
                                </code>
                              </div>
                              <button
                                onClick={() => copiarToken(barbeiro.token_acesso!, barbeiro.id)}
                                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                title="Copiar código"
                              >
                                {tokenCopiado === barbeiro.id ? (
                                  <Check className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => regenerarToken(barbeiro.id)}
                                disabled={regenerando === barbeiro.id}
                                className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                                title="Gerar novo código"
                              >
                                {regenerando === barbeiro.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">Sem código</span>
                              <button
                                onClick={() => regenerarToken(barbeiro.id)}
                                disabled={regenerando === barbeiro.id}
                                className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                              >
                                {regenerando === barbeiro.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Gerar'
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dica */}
              <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Dica para os barbeiros
                    </p>
                    <p>
                      O barbeiro pode salvar o link como atalho na tela inicial do celular 
                      para acesso rápido. O código fica salvo automaticamente após o primeiro acesso.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
