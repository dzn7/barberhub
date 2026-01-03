import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Servico } from '@/types';

/**
 * Hook customizado para buscar serviços do Supabase
 * Mantém cache local e atualiza em tempo real
 */
export function useServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    buscarServicos();

    // Configurar realtime para atualizações automáticas
    const channel = supabase
      .channel('servicos-publicos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'servicos'
        },
        () => {
          console.log('🔄 Serviços atualizados, recarregando...');
          buscarServicos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const buscarServicos = async () => {
    try {
      setCarregando(true);
      setErro(null);

      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('ordem_exibicao', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar serviços:', error);
        throw error;
      }

      console.log('✅ Serviços carregados:', data?.length || 0);
      setServicos(data || []);
    } catch (err: any) {
      console.error('❌ Erro ao buscar serviços:', err);
      setErro(err.message || 'Erro ao carregar serviços');
      
      // Fallback: usar dados de exemplo apenas em caso de erro
      setServicos([]);
    } finally {
      setCarregando(false);
    }
  };

  return { servicos, carregando, erro, recarregar: buscarServicos };
}
