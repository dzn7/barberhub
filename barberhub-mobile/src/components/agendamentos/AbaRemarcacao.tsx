import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Card } from '../ui';
import { supabase } from '../../services/supabase';
import { obterCores, TemaType } from '../../constants/cores';
import type { Agendamento } from '../../types';

type AgendamentoComRelacoes = Agendamento & {
  clientes?: { nome: string; telefone: string | null };
  barbeiros?: { id: string; nome: string };
  servicos?: { id: string; nome: string; preco: number; duracao: number };
};

interface AbaRemarcacaoProps {
  tenantId: string;
  tema?: TemaType;
  onSelecionarAgendamento: (agendamento: AgendamentoComRelacoes) => void;
}

export function AbaRemarcacao({ tenantId, tema = 'escuro', onSelecionarAgendamento }: AbaRemarcacaoProps) {
  const cores = obterCores(tema);

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [agendamentos, setAgendamentos] = useState<AgendamentoComRelacoes[]>([]);

  const carregar = useCallback(async () => {
    try {
      const agora = new Date().toISOString();

      const { data, error } = await supabase
        .from('agendamentos')
        .select(
          `
          *,
          clientes (id, nome, telefone),
          barbeiros (id, nome),
          servicos (id, nome, preco, duracao)
        `
        )
        .eq('tenant_id', tenantId)
        .gte('data_hora', agora)
        .in('status', ['pendente', 'confirmado'])
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos((data || []) as any);
    } catch (erro) {
      console.error('Erro ao carregar agendamentos para remarcação:', erro);
      setAgendamentos([]);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenantId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const onRefresh = () => {
    setAtualizando(true);
    carregar();
  };

  const renderItem = ({ item }: { item: AgendamentoComRelacoes }) => {
    const data = parseISO(item.data_hora);

    return (
      <Card style={{ marginBottom: 12 }}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelecionarAgendamento(item);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: '#27272a',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="time" size={22} color="#a1a1aa" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
              {item.clientes?.nome || 'Cliente'}
            </Text>
            <Text style={{ color: cores.texto.secundario, fontSize: 13 }} numberOfLines={1}>
              {item.servicos?.nome || 'Serviço'} • {format(data, "dd/MM 'às' HH:mm", { locale: ptBR })}
            </Text>
            <Text style={{ color: cores.texto.terciario, fontSize: 12 }} numberOfLines={1}>
              {item.barbeiros?.nome || 'Profissional'}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: cores.texto.primario, fontSize: 12, fontWeight: '700' }}>
              {item.status === 'pendente' ? 'Pendente' : 'Confirmado'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Ionicons name="refresh" size={16} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>Remarcar</Text>
            </View>
          </View>
        </Pressable>
      </Card>
    );
  };

  if (carregando) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator color={cores.primaria.DEFAULT} />
      </View>
    );
  }

  return (
    <FlatList
      data={agendamentos}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={cores.primaria.DEFAULT} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Ionicons name="calendar-outline" size={64} color="#71717a" />
          <Text style={{ color: '#a1a1aa', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
            Nenhum agendamento futuro disponível para remarcação
          </Text>
        </View>
      }
    />
  );
}
