/**
 * Contexto de Tema
 * Gerencia modo claro/escuro do aplicativo
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { CORES_CLARO, CORES_ESCURO, CORES_COMPARTILHADAS, TemaType } from '../constants/cores';

interface CoresExtendidas {
  primaria: { DEFAULT: string };
  secundaria: { DEFAULT: string };
  destaque: { DEFAULT: string };
}

interface TemaContextData {
  tema: TemaType;
  alternarTema: () => void;
  definirTema: (tema: TemaType) => void;
  cores: typeof CORES_ESCURO & typeof CORES_COMPARTILHADAS & CoresExtendidas;
  ehEscuro: boolean;
}

const TemaContext = createContext<TemaContextData>({} as TemaContextData);

interface TemaProviderProps {
  children: ReactNode;
}

export function TemaProvider({ children }: TemaProviderProps) {
  const esquemaCores = useColorScheme();
  const [tema, setTema] = useState<TemaType>('escuro');

  // Sincroniza com preferência do sistema na inicialização
  useEffect(() => {
    if (esquemaCores) {
      setTema(esquemaCores === 'dark' ? 'escuro' : 'claro');
    }
  }, []);

  const alternarTema = () => {
    setTema((atual) => (atual === 'escuro' ? 'claro' : 'escuro'));
  };

  const definirTema = (novoTema: TemaType) => {
    setTema(novoTema);
  };

  const zinc = CORES_COMPARTILHADAS.zinc;
  const cores = {
    ...(tema === 'escuro' ? CORES_ESCURO : CORES_CLARO),
    ...CORES_COMPARTILHADAS,
    // Aliases para compatibilidade
    primaria: {
      DEFAULT: tema === 'escuro' ? '#ffffff' : zinc[900],
    },
    secundaria: {
      DEFAULT: zinc[800],
    },
    destaque: {
      DEFAULT: zinc[800],
    },
  };

  const ehEscuro = tema === 'escuro';

  return (
    <TemaContext.Provider
      value={{
        tema,
        alternarTema,
        definirTema,
        cores,
        ehEscuro,
      }}
    >
      {children}
    </TemaContext.Provider>
  );
}

export function useTema() {
  const context = useContext(TemaContext);
  if (!context) {
    throw new Error('useTema deve ser usado dentro de um TemaProvider');
  }
  return context;
}
