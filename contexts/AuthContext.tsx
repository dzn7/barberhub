'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Proprietario, Tenant } from '@/lib/types'

interface AuthContextData {
  user: User | null
  session: Session | null
  proprietario: Proprietario | null
  tenant: Tenant | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<{ erro?: string }>
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

  const carregarDadosProprietario = async (userId: string): Promise<boolean> => {
    try {
      console.log('[AuthContext] Buscando proprietário para user_id:', userId)
      
      // Buscar proprietário
      const { data: propData, error: propError } = await supabase
        .from('proprietarios')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (propError) {
        console.error('[AuthContext] Erro ao buscar proprietário:', propError.message, propError.code)
        return false
      }
      
      if (!propData) {
        console.error('[AuthContext] Proprietário não encontrado para user_id:', userId)
        return false
      }

      console.log('[AuthContext] Proprietário encontrado:', propData.id, 'tenant_id:', propData.tenant_id)
      setProprietario(propData)

      // Buscar tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', propData.tenant_id)
        .single()

      if (tenantError) {
        console.error('[AuthContext] Erro ao buscar tenant:', tenantError.message, tenantError.code)
        return false
      }
      
      if (!tenantData) {
        console.error('[AuthContext] Tenant não encontrado para id:', propData.tenant_id)
        return false
      }

      console.log('[AuthContext] Tenant encontrado:', tenantData.nome, 'slug:', tenantData.slug)
      setTenant(tenantData)
      return true
    } catch (error) {
      console.error('[AuthContext] Erro ao carregar dados:', error)
      return false
    }
  }

  useEffect(() => {
    // Verificar sessão existente
    const inicializar = async () => {
      console.log('[AuthContext] Inicializando autenticação...')
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthContext] Erro ao obter sessão:', sessionError.message)
        }
        
        console.log('[AuthContext] Sessão obtida:', session ? 'Sim' : 'Não', session?.user?.email)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('[AuthContext] Usuário autenticado, carregando dados...')
          const sucesso = await carregarDadosProprietario(session.user.id)
          if (!sucesso) {
            console.error('[AuthContext] Falha ao carregar dados do proprietário')
          }
        } else {
          console.log('[AuthContext] Nenhum usuário autenticado')
        }
      } catch (error) {
        console.error('[AuthContext] Erro ao inicializar autenticação:', error)
      } finally {
        console.log('[AuthContext] Inicialização concluída')
        setCarregando(false)
      }
    }
    
    inicializar()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await carregarDadosProprietario(session.user.id)
        } else {
          setProprietario(null)
          setTenant(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const entrar = async (email: string, senha: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) {
        return { erro: error.message }
      }

      return {}
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
