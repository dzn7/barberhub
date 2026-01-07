/**
 * Hook para gerenciar terminologia dinâmica baseada no tipo de negócio
 * Adapta textos para "Barbeiro" vs "Nail Designer"
 */

import { useMemo } from 'react';
import { useAutenticacao } from '../stores/autenticacao';

export type TipoNegocio = 'barbearia' | 'nail_designer';

export interface Terminologia {
  profissional: {
    singular: string;
    plural: string;
    artigoSingular: string;
    artigoPlural: string;
  };
  estabelecimento: {
    nome: string;
    artigo: string;
  };
  cores: {
    primaria: string;
    secundaria: string;
    destaque: string;
  };
  icone: string;
  emoji: string;
}

const TERMINOLOGIAS: Record<TipoNegocio, Terminologia> = {
  barbearia: {
    profissional: {
      singular: 'Barbeiro',
      plural: 'Barbeiros',
      artigoSingular: 'o Barbeiro',
      artigoPlural: 'os Barbeiros',
    },
    estabelecimento: {
      nome: 'Barbearia',
      artigo: 'a Barbearia',
    },
    cores: {
      primaria: '#18181b',
      secundaria: '#f4f4f5',
      destaque: '#a1a1aa',
    },
    icone: 'cut-outline',
    emoji: '💈',
  },
  nail_designer: {
    profissional: {
      singular: 'Nail Designer',
      plural: 'Nail Designers',
      artigoSingular: 'a Nail Designer',
      artigoPlural: 'as Nail Designers',
    },
    estabelecimento: {
      nome: 'Estúdio',
      artigo: 'o Estúdio',
    },
    cores: {
      primaria: '#be185d',
      secundaria: '#fdf2f8',
      destaque: '#ec4899',
    },
    icone: 'hand-left-outline',
    emoji: '💅',
  },
};

export interface UseTerminologiaRetorno {
  tipoNegocio: TipoNegocio;
  terminologia: Terminologia;
  profissional: (plural?: boolean, comArtigo?: boolean) => string;
  estabelecimento: (comArtigo?: boolean) => string;
  icone: string;
  emoji: string;
  cores: Terminologia['cores'];
  ehBarbearia: boolean;
  ehNailDesigner: boolean;
}

/**
 * Hook principal para acessar terminologia do negócio
 */
export function useTerminologia(tipoOverride?: TipoNegocio): UseTerminologiaRetorno {
  const { tenant } = useAutenticacao();

  const tipoNegocio = useMemo((): TipoNegocio => {
    if (tipoOverride) return tipoOverride;
    const tipoDoTenant = tenant?.tipo_negocio;
    if (tipoDoTenant === 'barbearia' || tipoDoTenant === 'nail_designer') {
      return tipoDoTenant;
    }
    return 'barbearia';
  }, [tenant?.tipo_negocio, tipoOverride]);

  const terminologia = useMemo(() => {
    return TERMINOLOGIAS[tipoNegocio];
  }, [tipoNegocio]);

  const profissional = useMemo(() => {
    return (plural: boolean = false, comArtigo: boolean = false): string => {
      const termo = terminologia.profissional;
      if (comArtigo) {
        return plural ? termo.artigoPlural : termo.artigoSingular;
      }
      return plural ? termo.plural : termo.singular;
    };
  }, [terminologia]);

  const estabelecimento = useMemo(() => {
    return (comArtigo: boolean = false): string => {
      const termo = terminologia.estabelecimento;
      return comArtigo ? termo.artigo : termo.nome;
    };
  }, [terminologia]);

  return {
    tipoNegocio,
    terminologia,
    profissional,
    estabelecimento,
    icone: terminologia.icone,
    emoji: terminologia.emoji,
    cores: terminologia.cores,
    ehBarbearia: tipoNegocio === 'barbearia',
    ehNailDesigner: tipoNegocio === 'nail_designer',
  };
}

export default useTerminologia;
