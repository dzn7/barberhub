'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Trash2, UserX, Mail, Clock, AlertTriangle,
  Loader2, RefreshCw, Building2, ShieldAlert
} from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

interface UsuarioAuth {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  tenant_nome?: string
  tenant_id?: string
}

interface GestaoUsuariosAuthProps {
  onAtualizacao: () => void
}

/**
 * Componente para gestão de usuários do Supabase Auth
 * Permite visualizar e deletar usuários
 */
export function GestaoUsuariosAuth({ onAtualizacao }: GestaoUsuariosAuthProps) {
  const [usuarios, setUsuarios] = useState<UsuarioAuth[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [modalConfirmacao, setModalConfirmacao] = useState<{ aberto: boolean; usuario: UsuarioAuth | null }>({
    aberto: false,
    usuario: null
  })

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true)
    try {
      // Buscar usuários do auth via API administrativa
      const resposta = await fetch('/api/admin/usuarios-auth', {
        headers: { 'x-admin-auth': 'dzndev-1503' }
      })

      if (resposta.ok) {
        const dados = await resposta.json()
        
        // Buscar proprietários para associar tenant
        const { data: proprietarios } = await supabase
          .from('proprietarios')
          .select('user_id, tenant_id, tenants(nome)')

        const usuariosComTenant = dados.usuarios.map((u: any) => {
          const prop = proprietarios?.find((p: any) => p.user_id === u.id)
          const tenantData = Array.isArray(prop?.tenants) ? prop?.tenants[0] : prop?.tenants
          return {
            ...u,
            tenant_nome: tenantData?.nome,
            tenant_id: prop?.tenant_id
          }
        })

        setUsuarios(usuariosComTenant)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarUsuarios()
  }, [carregarUsuarios])

  const excluirUsuario = async (usuario: UsuarioAuth) => {
    setExcluindo(usuario.id)
    try {
      const resposta = await fetch('/api/admin/usuarios-auth', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'dzndev-1503'
        },
        body: JSON.stringify({ userId: usuario.id })
      })

      if (resposta.ok) {
        setUsuarios(prev => prev.filter(u => u.id !== usuario.id))
        setModalConfirmacao({ aberto: false, usuario: null })
        onAtualizacao()
      } else {
        const erro = await resposta.json()
        alert(`Erro ao excluir: ${erro.message}`)
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário')
    } finally {
      setExcluindo(null)
    }
  }

  const usuariosFiltrados = usuarios.filter(u =>
    u.email?.toLowerCase().includes(busca.toLowerCase()) ||
    u.tenant_nome?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Usuários Auth
          </h2>
          <p className="text-sm text-zinc-500">
            {usuarios.length} usuários cadastrados no Supabase Auth
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por email..."
              className="pl-9 pr-4 py-2 w-64 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
          <button
            onClick={carregarUsuarios}
            disabled={carregando}
            className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <UserX className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {usuariosFiltrados.map((usuario) => (
              <div
                key={usuario.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {usuario.email}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      {usuario.tenant_nome && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {usuario.tenant_nome}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Criado {formatDistanceToNow(parseISO(usuario.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {usuario.last_sign_in_at && (
                    <span className="text-xs text-zinc-500 hidden sm:block">
                      Último login: {format(parseISO(usuario.last_sign_in_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  )}
                  <button
                    onClick={() => setModalConfirmacao({ aberto: true, usuario })}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Excluir usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmação */}
      <AnimatePresence>
        {modalConfirmacao.aberto && modalConfirmacao.usuario && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setModalConfirmacao({ aberto: false, usuario: null })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Excluir Usuário Auth</h3>
                  <p className="text-sm text-zinc-500">Esta ação é irreversível</p>
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Você está prestes a excluir o usuário:
                </p>
                <p className="font-medium text-red-900 dark:text-red-100 mt-1">
                  {modalConfirmacao.usuario.email}
                </p>
                {modalConfirmacao.usuario.tenant_nome && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                    Associado à barbearia: {modalConfirmacao.usuario.tenant_nome}
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    O usuário não poderá mais fazer login. Se houver uma barbearia associada,
                    ela continuará existindo mas sem acesso administrativo.
                  </span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModalConfirmacao({ aberto: false, usuario: null })}
                  className="flex-1 px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => excluirUsuario(modalConfirmacao.usuario!)}
                  disabled={excluindo === modalConfirmacao.usuario.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {excluindo === modalConfirmacao.usuario.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
