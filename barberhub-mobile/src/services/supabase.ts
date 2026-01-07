/**
 * Cliente Supabase para React Native
 * Configurado para persistência de sessão segura
 */

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { CONFIG } from '../constants/config';

/**
 * Adaptador de storage que funciona em todas as plataformas
 */
const criarArmazenamento = () => {
  // Na web, usar localStorage
  if (Platform.OS === 'web') {
    return {
      getItem: async (chave: string): Promise<string | null> => {
        try {
          return localStorage.getItem(chave);
        } catch {
          return null;
        }
      },
      setItem: async (chave: string, valor: string): Promise<void> => {
        try {
          localStorage.setItem(chave, valor);
        } catch {}
      },
      removeItem: async (chave: string): Promise<void> => {
        try {
          localStorage.removeItem(chave);
        } catch {}
      },
    };
  }

  // Em mobile, usar SecureStore
  const SecureStore = require('expo-secure-store');
  return {
    getItem: async (chave: string): Promise<string | null> => {
      try {
        return await SecureStore.getItemAsync(chave);
      } catch (erro) {
        console.error('Erro ao obter item do SecureStore:', erro);
        return null;
      }
    },
    setItem: async (chave: string, valor: string): Promise<void> => {
      try {
        await SecureStore.setItemAsync(chave, valor);
      } catch (erro) {
        console.error('Erro ao salvar item no SecureStore:', erro);
      }
    },
    removeItem: async (chave: string): Promise<void> => {
      try {
        await SecureStore.deleteItemAsync(chave);
      } catch (erro) {
        console.error('Erro ao remover item do SecureStore:', erro);
      }
    },
  };
};

const armazenamentoSeguro = criarArmazenamento();

/**
 * Cliente Supabase configurado para React Native
 */
export const supabase = createClient(
  CONFIG.api.supabaseUrl,
  CONFIG.api.supabaseAnonKey,
  {
    auth: {
      storage: armazenamentoSeguro,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Verifica se o Supabase está configurado corretamente
 */
export function verificarConfiguracao(): boolean {
  return Boolean(CONFIG.api.supabaseUrl && CONFIG.api.supabaseAnonKey);
}

/**
 * Obtém a URL pública de um arquivo no storage
 */
export function obterUrlPublica(caminho: string, bucket: string = 'uploads'): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(caminho);
  return data.publicUrl;
}
