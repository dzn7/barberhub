/**
 * Hook para escutar novos agendamentos em tempo real
 * Usa Supabase Realtime para detectar INSERT na tabela agendamentos
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyNewAgendamento, notifyCancelamento } from '@/lib/push-notifications';

interface Agendamento {
  id: string;
  cliente_id: string;
  barbeiro_id: string;
  servico_id: string;
  data_hora: string;
  status: string;
  observacoes: string | null;
}

interface UseAgendamentosRealtimeOptions {
  enabled?: boolean;
  onNewAgendamento?: (agendamento: any) => void;
  onCancelamento?: (agendamento: any) => void;
  onUpdate?: (agendamento: any) => void;
}

/**
 * Hook para escutar mudanças em tempo real na tabela agendamentos
 */
export function useAgendamentosRealtime(options: UseAgendamentosRealtimeOptions = {}) {
  const {
    enabled = true,
    onNewAgendamento,
    onCancelamento,
    onUpdate,
  } = options;

  const channelRef = useRef<any>(null);
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) {
      console.log('[Realtime] Desabilitado');
      return;
    }

    console.log('[Realtime] Iniciando escuta de agendamentos...');

    // Criar canal Realtime
    const channel = supabase
      .channel('agendamentos-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agendamentos',
        },
        async (payload) => {
          console.log('[Realtime] Novo agendamento detectado:', payload);

          const agendamento = payload.new as Agendamento;

          // Evitar processar o mesmo agendamento múltiplas vezes
          if (processedIds.current.has(agendamento.id)) {
            console.log('[Realtime] Agendamento já processado, ignorando');
            return;
          }
          processedIds.current.add(agendamento.id);

          // Buscar dados completos do agendamento
          const { data: agendamentoCompleto, error } = await supabase
            .from('agendamentos')
            .select(`
              *,
              clientes (nome, telefone),
              barbeiros (nome),
              servicos (nome, preco)
            `)
            .eq('id', agendamento.id)
            .single();

          if (error) {
            console.error('[Realtime] Erro ao buscar agendamento:', error);
            return;
          }

          console.log('[Realtime] Agendamento completo:', agendamentoCompleto);

          // Enviar notificação push
          try {
            await notifyNewAgendamento({
              id: agendamentoCompleto.id,
              cliente_nome: agendamentoCompleto.clientes?.nome || 'Cliente',
              servico_nome: agendamentoCompleto.servicos?.nome || 'Serviço',
              data_hora: agendamentoCompleto.data_hora,
              barbeiro_nome: agendamentoCompleto.barbeiros?.nome,
            });
          } catch (error) {
            console.error('[Realtime] Erro ao enviar notificação:', error);
          }

          // Callback customizado
          if (onNewAgendamento) {
            onNewAgendamento(agendamentoCompleto);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agendamentos',
        },
        async (payload) => {
          console.log('[Realtime] Agendamento atualizado:', payload);

          const agendamentoNovo = payload.new as Agendamento;
          const agendamentoAntigo = payload.old as Agendamento;

          // Detectar cancelamento
          if (
            agendamentoAntigo.status !== 'cancelado' &&
            agendamentoNovo.status === 'cancelado'
          ) {
            console.log('[Realtime] Cancelamento detectado');

            // Buscar dados do agendamento
            const { data: agendamento } = await supabase
              .from('agendamentos')
              .select('*, clientes (nome)')
              .eq('id', agendamentoNovo.id)
              .single();

            if (agendamento) {
              try {
                await notifyCancelamento({
                  id: agendamento.id,
                  cliente_nome: agendamento.clientes?.nome || 'Cliente',
                  data_hora: agendamento.data_hora,
                });
              } catch (error) {
                console.error('[Realtime] Erro ao notificar cancelamento:', error);
              }

              if (onCancelamento) {
                onCancelamento(agendamento);
              }
            }
          }

          // Callback de atualização
          if (onUpdate) {
            onUpdate(agendamentoNovo);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Status da conexão:', status);
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('[Realtime] Desconectando...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      processedIds.current.clear();
    };
  }, [enabled, onNewAgendamento, onCancelamento, onUpdate]);

  return {
    isConnected: channelRef.current?.state === 'joined',
  };
}
