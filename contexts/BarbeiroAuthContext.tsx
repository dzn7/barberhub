'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Interface do Barbeiro autenticado
 */
interface BarbeiroAutenticado {
  id: string
  tenant_id: string
  nome: string
  email: string
  telefone: string
  especialidades: string[] | null
  foto_url: string | null
  comissao_percentual: number
  ativo: boolean
}

/**
 * Interface do Tenant (barbearia)
 */
interface TenantBarbeiro {
  id: string
  slug: string
  nome: string
  tipo_negocio: 'barbearia' | 'nail_designer' | 'lash_designer' | 'cabeleireira'
  logo_url: string | null
  cor_primaria: string
  cor_secundaria: string
  cor_destaque: string
}

/**
 * Interface do contexto de autenticação do barbeiro
 */
interface BarbeiroAuthContextData {
  barbeiro: BarbeiroAutenticado | null
  tenant: TenantBarbeiro | null
  carregando: boolean
  autenticado: boolean
  entrar: (token: string) => Promise<{ sucesso: boolean; erro?: string }>
  sair: () => void
  recarregar: () => Promise<void>
}

const BarbeiroAuthContext = createContext<BarbeiroAuthContextData>({} as BarbeiroAuthContextData)

const STORAGE_KEY = 'barberhub_barbeiro_token'

/**
 * Provider de autenticação para barbeiros
 * Gerencia login via token, sessão e dados do barbeiro
 */
export function BarbeiroAuthProvider({ children }: { children: ReactNode }) {
  const [barbeiro, setBarbeiro] = useState<BarbeiroAutenticado | null>(null)
  const [tenant, setTenant] = useState<TenantBarbeiro | null>(null)
  const [carregando, setCarregando] = useState(true)

  /**
   * Carrega dados do barbeiro a partir do token
   */
  const carregarDadosBarbeiro = useCallback(async (token: string): Promise<boolean> => {
    try {
      // Buscar barbeiro pelo token
      const { data: barbeiroData, error: barbeiroError } = await supabase
        .from('barbeiros')
        .select('*')
        .eq('token_acesso', token)
        .eq('token_ativo', true)
        .eq('ativo', true)
        .single()

      if (barbeiroError || !barbeiroData) {
        console.error('[BarbeiroAuth] Token inválido ou barbeiro não encontrado')
        return false
      }

      // Buscar dados do tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, slug, nome, tipo_negocio, logo_url, cor_primaria, cor_secundaria, cor_destaque')
        .eq('id', barbeiroData.tenant_id)
        .eq('ativo', true)
        .single()

      if (tenantError || !tenantData) {
        console.error('[BarbeiroAuth] Barbearia não encontrada ou inativa')
        return false
      }

      // Atualizar último acesso
      await supabase
        .from('barbeiros')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', barbeiroData.id)

      setBarbeiro(barbeiroData)
      setTenant(tenantData)
      return true
    } catch (error) {
      console.error('[BarbeiroAuth] Erro ao carregar dados:', error)
      return false
    }
  }, [])

  /**
   * Inicialização - verifica se há token salvo
   */
  useEffect(() => {
    const inicializar = async () => {
      try {
        const tokenSalvo = localStorage.getItem(STORAGE_KEY)
        
        if (tokenSalvo) {
          const sucesso = await carregarDadosBarbeiro(tokenSalvo)
          if (!sucesso) {
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (error) {
        console.error('[BarbeiroAuth] Erro na inicialização:', error)
      } finally {
        setCarregando(false)
      }
    }
    
    inicializar()
  }, [carregarDadosBarbeiro])

  /**
   * Função de login com token
   */
  const entrar = async (token: string): Promise<{ sucesso: boolean; erro?: string }> => {
    try {
      setCarregando(true)
      
      const tokenLimpo = token.trim().toUpperCase()
      
      if (!tokenLimpo || tokenLimpo.length < 6) {
        return { sucesso: false, erro: 'Token inválido. Verifique o código informado.' }
      }

      const sucesso = await carregarDadosBarbeiro(tokenLimpo)
      
      if (sucesso) {
        localStorage.setItem(STORAGE_KEY, tokenLimpo)
        return { sucesso: true }
      }
      
      return { sucesso: false, erro: 'Token inválido ou expirado. Entre em contato com o proprietário.' }
    } catch (error) {
      console.error('[BarbeiroAuth] Erro no login:', error)
      return { sucesso: false, erro: 'Erro ao fazer login. Tente novamente.' }
    } finally {
      setCarregando(false)
    }
  }

  /**
   * Função de logout
   */
  const sair = () => {
    localStorage.removeItem(STORAGE_KEY)
    setBarbeiro(null)
    setTenant(null)
  }

  /**
   * Recarrega dados do barbeiro
   */
  const recarregar = async () => {
    const tokenSalvo = localStorage.getItem(STORAGE_KEY)
    if (tokenSalvo) {
      await carregarDadosBarbeiro(tokenSalvo)
    }
  }

  return (
    <BarbeiroAuthContext.Provider value={{
      barbeiro,
      tenant,
      carregando,
      autenticado: !!barbeiro,
      entrar,
      sair,
      recarregar
    }}>
      {children}
    </BarbeiroAuthContext.Provider>
  )
}

/**
 * Hook para usar o contexto de autenticação do barbeiro
 */
export function useBarbeiroAuth() {
  const context = useContext(BarbeiroAuthContext)
  
  if (!context) {
    throw new Error('useBarbeiroAuth deve ser usado dentro de um BarbeiroAuthProvider')
  }
  
  return context
}

export default BarbeiroAuthContext
