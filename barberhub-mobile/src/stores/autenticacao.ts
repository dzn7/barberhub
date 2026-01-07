/**
 * Store de Autenticação com Zustand
 * Gerencia estado de login, sessão e dados do usuário
 */

import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { UsuarioAutenticado, Tenant, Barbeiro, ResultadoLogin } from '../types';

interface EstadoAutenticacao {
  // Estado
  usuario: UsuarioAutenticado | null;
  tenant: Tenant | null;
  barbeiro: Barbeiro | null;
  carregando: boolean;
  inicializado: boolean;

  // Ações
  inicializar: () => Promise<void>;
  loginComToken: (token: string) => Promise<ResultadoLogin>;
  loginComEmail: (email: string, senha: string) => Promise<ResultadoLogin>;
  logout: () => Promise<void>;
  atualizarTenant: (tenant: Partial<Tenant>) => void;
}

export const useAutenticacao = create<EstadoAutenticacao>((set, get) => ({
  usuario: null,
  tenant: null,
  barbeiro: null,
  carregando: true,
  inicializado: false,

  /**
   * Inicializa o estado de autenticação
   * Verifica se há sessão salva
   */
  inicializar: async () => {
    try {
      set({ carregando: true });

      // Verificar sessão existente do Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Buscar dados do proprietário
        const { data: proprietario } = await supabase
          .from('proprietarios')
          .select('*, tenants(*)')
          .eq('user_id', session.user.id)
          .single();

        if (proprietario?.tenants) {
          set({
            usuario: {
              id: session.user.id,
              email: session.user.email || '',
              nome: proprietario.nome,
              tenant_id: proprietario.tenant_id,
              tipo: 'proprietario',
              is_proprietario: true,
            },
            tenant: proprietario.tenants,
          });
        }
      }
    } catch (erro) {
      console.error('Erro ao inicializar autenticação:', erro);
    } finally {
      set({ carregando: false, inicializado: true });
    }
  },

  /**
   * Login com token de acesso do barbeiro
   */
  loginComToken: async (token: string): Promise<ResultadoLogin> => {
    try {
      set({ carregando: true });

      // Buscar barbeiro pelo token
      const { data: barbeiro, error } = await supabase
        .from('barbeiros')
        .select('*, tenants(*)')
        .eq('token_acesso', token)
        .eq('token_ativo', true)
        .eq('ativo', true)
        .single();

      if (error || !barbeiro) {
        return { sucesso: false, erro: 'Token inválido ou expirado' };
      }

      // Atualizar último acesso
      await supabase
        .from('barbeiros')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', barbeiro.id);

      const usuario: UsuarioAutenticado = {
        id: barbeiro.id,
        email: barbeiro.email || '',
        nome: barbeiro.nome,
        tenant_id: barbeiro.tenant_id,
        tipo: barbeiro.is_proprietario ? 'proprietario' : 'barbeiro',
        barbeiro_id: barbeiro.id,
        is_proprietario: barbeiro.is_proprietario,
      };

      set({
        usuario,
        tenant: barbeiro.tenants,
        barbeiro,
      });

      return { sucesso: true, usuario, tenant: barbeiro.tenants };
    } catch (erro) {
      console.error('Erro no login com token:', erro);
      return { sucesso: false, erro: 'Erro ao fazer login' };
    } finally {
      set({ carregando: false });
    }
  },

  /**
   * Login com email e senha (proprietário)
   */
  loginComEmail: async (email: string, senha: string): Promise<ResultadoLogin> => {
    try {
      set({ carregando: true });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        return { sucesso: false, erro: 'Email ou senha incorretos' };
      }

      // Buscar dados do proprietário
      const { data: proprietario } = await supabase
        .from('proprietarios')
        .select('*, tenants(*)')
        .eq('user_id', data.user.id)
        .single();

      if (!proprietario?.tenants) {
        return { sucesso: false, erro: 'Conta não encontrada' };
      }

      const usuario: UsuarioAutenticado = {
        id: data.user.id,
        email: data.user.email || '',
        nome: proprietario.nome,
        tenant_id: proprietario.tenant_id,
        tipo: 'proprietario',
        is_proprietario: true,
      };

      set({
        usuario,
        tenant: proprietario.tenants,
      });

      return { sucesso: true, usuario, tenant: proprietario.tenants };
    } catch (erro) {
      console.error('Erro no login:', erro);
      return { sucesso: false, erro: 'Erro ao fazer login' };
    } finally {
      set({ carregando: false });
    }
  },

  /**
   * Logout do usuário
   */
  logout: async () => {
    try {
      set({ carregando: true });
      await supabase.auth.signOut();
      set({
        usuario: null,
        tenant: null,
        barbeiro: null,
      });
    } catch (erro) {
      console.error('Erro ao fazer logout:', erro);
    } finally {
      set({ carregando: false });
    }
  },

  /**
   * Atualiza dados do tenant localmente
   */
  atualizarTenant: (dadosParciais: Partial<Tenant>) => {
    const { tenant } = get();
    if (tenant) {
      set({ tenant: { ...tenant, ...dadosParciais } });
    }
  },
}));
