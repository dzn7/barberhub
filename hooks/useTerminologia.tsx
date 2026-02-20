'use client'

/**
 * Hook para gerenciar terminologia dinâmica baseada no tipo de negócio
 * 
 * Este hook fornece acesso à terminologia correta (barbeiro vs nail designer)
 * baseado no tipo de negócio do tenant atual.
 */

import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  TipoNegocio, 
  Terminologia,
  ehTipoNegocioValido,
  tipoNegocioPadrao,
  ehTipoNegocioFeminino
} from '@/lib/tipos-negocio'
import { 
  obterTerminologia,
  obterCategoriasServicos,
  obterTermoProfissional,
  obterTermoEstabelecimento,
  obterIconePrincipal,
  obterCoresSugeridas
} from '@/lib/configuracoes-negocio'

/**
 * Interface de retorno do hook
 */
export interface UseTerminologiaRetorno {
  // Tipo de negócio atual
  tipoNegocio: TipoNegocio
  
  // Terminologia completa
  terminologia: Terminologia
  
  // Funções auxiliares
  profissional: (plural?: boolean, comArtigo?: boolean) => string
  estabelecimento: (comArtigo?: boolean) => string
  icone: string
  cores: Terminologia['cores']
  categorias: Terminologia['categoriasServicos']
  textos: Terminologia['textos']
  
  // Verifica se é um tipo específico
  ehBarbearia: boolean
  ehNailDesigner: boolean
  ehLashDesigner: boolean
  ehCabeleireira: boolean
  ehSegmentoFeminino: boolean
}

/**
 * Hook principal para acessar terminologia do negócio
 * 
 * @param tipoOverride - Opcional: forçar um tipo específico (útil para páginas públicas)
 * @returns Objeto com terminologia e funções auxiliares
 * 
 * @example
 * const { profissional, estabelecimento, ehBarbearia } = useTerminologia()
 * 
 * // Exibir "Barbeiro" ou "Nail Designer"
 * <span>{profissional()}</span>
 * 
 * // Exibir "os Barbeiros" ou "as Nail Designers"
 * <span>{profissional(true, true)}</span>
 */
export function useTerminologia(tipoOverride?: TipoNegocio): UseTerminologiaRetorno {
  const { tenant } = useAuth()
  
  // Determinar o tipo de negócio
  const tipoNegocio = useMemo(() => {
    // Se foi passado um override, usar ele
    if (tipoOverride && ehTipoNegocioValido(tipoOverride)) {
      return tipoOverride
    }
    
    // Tentar obter do tenant
    const tipoDoTenant = (tenant as any)?.tipo_negocio
    if (tipoDoTenant && ehTipoNegocioValido(tipoDoTenant)) {
      return tipoDoTenant as TipoNegocio
    }
    
    // Fallback para barbearia
    return tipoNegocioPadrao()
  }, [tenant, tipoOverride])
  
  // Obter terminologia completa
  const terminologia = useMemo(() => {
    return obterTerminologia(tipoNegocio)
  }, [tipoNegocio])
  
  // Funções auxiliares memoizadas
  const profissional = useMemo(() => {
    return (plural: boolean = false, comArtigo: boolean = false) => 
      obterTermoProfissional(tipoNegocio, plural, comArtigo)
  }, [tipoNegocio])
  
  const estabelecimento = useMemo(() => {
    return (comArtigo: boolean = false) => 
      obterTermoEstabelecimento(tipoNegocio, comArtigo)
  }, [tipoNegocio])
  
  const icone = useMemo(() => {
    return obterIconePrincipal(tipoNegocio)
  }, [tipoNegocio])
  
  const cores = useMemo(() => {
    return obterCoresSugeridas(tipoNegocio)
  }, [tipoNegocio])
  
  const categorias = useMemo(() => {
    return obterCategoriasServicos(tipoNegocio)
  }, [tipoNegocio])
  
  return {
    tipoNegocio,
    terminologia,
    profissional,
    estabelecimento,
    icone,
    cores,
    categorias,
    textos: terminologia.textos,
    ehBarbearia: tipoNegocio === 'barbearia',
    ehNailDesigner: tipoNegocio === 'nail_designer',
    ehLashDesigner: tipoNegocio === 'lash_designer',
    ehCabeleireira: tipoNegocio === 'cabeleireira',
    ehSegmentoFeminino: ehTipoNegocioFeminino(tipoNegocio)
  }
}

/**
 * Hook simplificado para uso em páginas públicas onde não há contexto de auth
 * 
 * @param tipo - Tipo de negócio a ser usado
 * @returns Objeto com terminologia
 */
export function useTerminologiaPublica(tipo: TipoNegocio): UseTerminologiaRetorno {
  return useTerminologia(tipo)
}

export default useTerminologia
