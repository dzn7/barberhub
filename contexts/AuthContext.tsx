'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Proprietario, Tenant } from '@/lib/types'

interface AuthContextData {
  user: User | null
  session: Session | null
  proprietario: Proprietario | null
  tenant: Tenant | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<{ erro?: string; sucesso?: boolean }>
  sair: () => Promise<void>
  atualizarTenant: (dados: Partial<Tenant>) => Promise<{ erro?: string }>
  recarregar: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [proprietario, setProprietario] = useState<Proprietario | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Função simplificada para carregar dados do proprietário
  const carregarDadosProprietario = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Buscar proprietário - RLS desabilitado, query simples
      const { data: propData, error: propError } = await supabase
        .from('proprietarios')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (propError || !propData) {
        console.error('[Auth] Erro proprietário:', propError?.message)
        return false
      }

      setProprietario(propData)

      // Buscar tenant - RLS desabilitado, query simples
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', propData.tenant_id)
        .single()

      if (tenantError || !tenantData) {
        console.error('[Auth] Erro tenant:', tenantError?.message)
        return false
      }

      setTenant(tenantData)
      return true
    } catch (error) {
      console.error('[Auth] Erro:', error)
      return false
    }
  }, [])

  // Inicialização simples
  useEffect(() => {
    const inicializar = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setSession(session)
          setUser(session.user)
          await carregarDadosProprietario(session.user.id)
        }
      } catch (error) {
        console.error('[Auth] Erro inicialização:', error)
      } finally {
        setCarregando(false)
      }
    }
    
    inicializar()

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSession(null)
          setProprietario(null)
          setTenant(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [carregarDadosProprietario])

  const entrar = async (email: string, senha: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) {
        return { erro: error.message }
      }

      if (data.user) {
        setSession(data.session)
        setUser(data.user)
        const sucesso = await carregarDadosProprietario(data.user.id)
        return { sucesso }
      }

      return { erro: 'Erro ao fazer login' }
    } catch (error) {
      return { erro: 'Erro ao fazer login' }
    }
  }

  const sair = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProprietario(null)
    setTenant(null)
  }

  const atualizarTenant = async (dados: Partial<Tenant>) => {
    if (!tenant) return { erro: 'Tenant não encontrado' }

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          ...dados,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', tenant.id)

      if (error) {
        return { erro: error.message }
      }

      // Atualizar estado local
      setTenant(prev => prev ? { ...prev, ...dados } : null)
      
      return {}
    } catch (error) {
      return { erro: 'Erro ao atualizar dados' }
    }
  }

  const recarregar = async () => {
    if (user) {
      await carregarDadosProprietario(user.id)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      proprietario,
      tenant,
      carregando,
      entrar,
      sair,
      atualizarTenant,
      recarregar
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  
  return context
}

export default AuthContext
