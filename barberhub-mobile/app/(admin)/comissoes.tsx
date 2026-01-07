import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

import { Card } from '../../src/components/ui/Card';
import { Botao } from '../../src/components/ui/Botao';
import { Modal } from '../../src/components/ui/Modal';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTema } from '../../src/contexts/TemaContext';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';

interface ComissaoCompleta {
  id: string;
  barbeiro_id: string;
  agendamento_id: string | null;
  valor_servico: number;
  percentual_comissao: number;
  valor_comissao: number;
  pago: boolean;
  data_pagamento: string | null;
  mes: number;
  ano: number;
  criado_em: string;
  barbeiros?: { nome: string } | { nome: string }[];
}

const MESES = [
  { valor: 1, nome: 'Janeiro' },
  { valor: 2, nome: 'Fevereiro' },
  { valor: 3, nome: 'Março' },
  { valor: 4, nome: 'Abril' },
  { valor: 5, nome: 'Maio' },
  { valor: 6, nome: 'Junho' },
  { valor: 7, nome: 'Julho' },
  { valor: 8, nome: 'Agosto' },
  { valor: 9, nome: 'Setembro' },
  { valor: 10, nome: 'Outubro' },
  { valor: 11, nome: 'Novembro' },
  { valor: 12, nome: 'Dezembro' },
];

export default function TelaComissoes() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cores, tema } = useTema();
  const { tenant } = useAutenticacao();
  const { profissional } = useTerminologia();

  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [comissoes, setComissoes] = useState<ComissaoCompleta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<string | null>(null);
  const [modalMesAberto, setModalMesAberto] = useState(false);
  const [modalAnoAberto, setModalAnoAberto] = useState(false);

  const carregarComissoes = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('comissoes')
        .select('*, barbeiros(nome)')
        .eq('tenant_id', tenant.id)
        .eq('mes', mesSelecionado)
        .eq('ano', anoSelecionado)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setComissoes(data || []);
    } catch (erro) {
      console.error('Erro ao carregar comissões:', erro);
      Alert.alert('Erro', 'Não foi possível carregar as comissões.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id, mesSelecionado, anoSelecionado]);

  useEffect(() => {
    carregarComissoes();
  }, [carregarComissoes]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarComissoes();
  };

  const marcarComoPago = async (comissaoId: string) => {
    if (!tenant?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProcessando(comissaoId);

    try {
      const { error } = await supabase
        .from('comissoes')
        .update({
          pago: true,
          data_pagamento: new Date().toISOString().split('T')[0],
        })
        .eq('id', comissaoId)
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      setComissoes((prev) =>
        prev.map((c) =>
          c.id === comissaoId
            ? { ...c, pago: true, data_pagamento: new Date().toISOString().split('T')[0] }
            : c
        )
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Comissão marcada como paga!');
    } catch (erro) {
      console.error('Erro ao marcar como pago:', erro);
      Alert.alert('Erro', 'Não foi possível marcar a comissão como paga.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessando(null);
    }
  };

  const excluirComissao = async (comissaoId: string) => {
    if (!tenant?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setExcluindo(comissaoId);

    try {
      const { error } = await supabase
        .from('comissoes')
        .delete()
        .eq('id', comissaoId)
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      setComissoes((prev) => prev.filter((c) => c.id !== comissaoId));
      setConfirmarExclusao(null);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Comissão excluída!');
    } catch (erro) {
      console.error('Erro ao excluir comissão:', erro);
      Alert.alert('Erro', 'Não foi possível excluir a comissão.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExcluindo(null);
    }
  };

  const getBarbeiroNome = (comissao: ComissaoCompleta) => {
    if (Array.isArray(comissao.barbeiros)) {
      return comissao.barbeiros[0]?.nome || profissional();
    }
    return comissao.barbeiros?.nome || profissional();
  };

  const comissoesPendentes = comissoes.filter((c) => !c.pago);
  const comissoesPagas = comissoes.filter((c) => c.pago);
  const totalPendente = comissoesPendentes.reduce((sum, c) => sum + Number(c.valor_comissao || 0), 0);
  const totalPago = comissoesPagas.reduce((sum, c) => sum + Number(c.valor_comissao || 0), 0);

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo.primario, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={cores.primaria.DEFAULT} />
        <Text style={{ color: cores.texto.secundario, marginTop: 12, fontSize: 14 }}>
          Carregando comissões...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: cores.fundo.secundario,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={cores.texto.primario} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '700' }}>
              Gestão de Comissões
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={cores.primaria.DEFAULT} />
        }
      >
        {/* Cards de Resumo */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>Total Pendente</Text>
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={{ color: cores.texto.primario, fontSize: 24, fontWeight: '700' }}>
              {formatarMoeda(totalPendente)}
            </Text>
            <Text style={{ color: cores.texto.terciario, fontSize: 12, marginTop: 4 }}>
              {comissoesPendentes.length} {comissoesPendentes.length === 1 ? 'comissão' : 'comissões'}
            </Text>
          </Card>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>Total Pago</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
              </View>
              <Text style={{ color: cores.texto.primario, fontSize: 20, fontWeight: '700' }}>
                {formatarMoeda(totalPago)}
              </Text>
              <Text style={{ color: cores.texto.terciario, fontSize: 11, marginTop: 4 }}>
                {comissoesPagas.length} {comissoesPagas.length === 1 ? 'comissão' : 'comissões'}
              </Text>
            </Card>

            <Card style={{ flex: 1, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>Total do Mês</Text>
                <Ionicons name="cash-outline" size={20} color="#3b82f6" />
              </View>
              <Text style={{ color: cores.texto.primario, fontSize: 20, fontWeight: '700' }}>
                {formatarMoeda(totalPendente + totalPago)}
              </Text>
            </Card>
          </View>
        </View>

        {/* Filtros */}
        <Card style={{ padding: 16, marginBottom: 20 }}>
          <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
            Período
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setModalMesAberto(true);
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                backgroundColor: cores.fundo.terciario,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: cores.borda.sutil,
              }}
            >
              <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '500' }}>
                {MESES.find((m) => m.valor === mesSelecionado)?.nome}
              </Text>
              <Ionicons name="chevron-down" size={18} color={cores.texto.terciario} />
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setModalAnoAberto(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: cores.fundo.terciario,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: cores.borda.sutil,
              }}
            >
              <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '500' }}>
                {anoSelecionado}
              </Text>
              <Ionicons name="chevron-down" size={18} color={cores.texto.terciario} />
            </Pressable>
          </View>
        </Card>

        {/* Lista de Comissões */}
        {comissoes.length === 0 ? (
          <Card style={{ padding: 32, alignItems: 'center' }}>
            <Ionicons name="cash-outline" size={48} color={cores.texto.terciario} style={{ opacity: 0.3 }} />
            <Text style={{ color: cores.texto.secundario, fontSize: 15, marginTop: 12, textAlign: 'center' }}>
              Nenhuma comissão registrada em{'\n'}
              {MESES.find((m) => m.valor === mesSelecionado)?.nome} de {anoSelecionado}
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {comissoes.map((comissao) => (
              <Card key={comissao.id} style={{ padding: 16 }}>
                <View style={{ gap: 12 }}>
                  {/* Header do Card */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Ionicons name="person-outline" size={18} color={cores.texto.secundario} />
                      <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {getBarbeiroNome(comissao)}
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: comissao.pago ? '#22c55e15' : '#f59e0b15',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: comissao.pago ? '#22c55e' : '#f59e0b',
                        }}
                      >
                        {comissao.pago ? 'Pago' : 'Pendente'}
                      </Text>
                    </View>
                  </View>

                  {/* Informações */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: cores.texto.terciario, fontSize: 12, marginBottom: 4 }}>
                        Valor Serviço
                      </Text>
                      <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '500' }}>
                        {formatarMoeda(Number(comissao.valor_servico))}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: cores.texto.terciario, fontSize: 12, marginBottom: 4 }}>
                        Percentual
                      </Text>
                      <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '500' }}>
                        {Number(comissao.percentual_comissao)}%
                      </Text>
                    </View>
                  </View>

                  {/* Data */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={14} color={cores.texto.terciario} />
                    <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                      {format(parseISO(comissao.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </Text>
                  </View>

                  {/* Valor da Comissão */}
                  <View
                    style={{
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: cores.borda.sutil,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>Comissão:</Text>
                    <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '700' }}>
                      {formatarMoeda(Number(comissao.valor_comissao))}
                    </Text>
                  </View>

                  {/* Ações */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {!comissao.pago && (
                      <Pressable
                        onPress={() => marcarComoPago(comissao.id)}
                        disabled={processando === comissao.id}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 10,
                          backgroundColor: '#22c55e',
                          borderRadius: 8,
                          opacity: processando === comissao.id ? 0.5 : 1,
                        }}
                      >
                        {processando === comissao.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        )}
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                          Marcar como Pago
                        </Text>
                      </Pressable>
                    )}

                    {confirmarExclusao === comissao.id ? (
                      <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                        <Pressable
                          onPress={() => excluirComissao(comissao.id)}
                          disabled={excluindo === comissao.id}
                          style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 10,
                            backgroundColor: '#ef4444',
                            borderRadius: 8,
                            opacity: excluindo === comissao.id ? 0.5 : 1,
                          }}
                        >
                          {excluindo === comissao.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Confirmar</Text>
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => setConfirmarExclusao(null)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            backgroundColor: cores.fundo.terciario,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ color: cores.texto.primario, fontSize: 13, fontWeight: '600' }}>
                            Cancelar
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setConfirmarExclusao(comissao.id);
                        }}
                        style={{
                          padding: 10,
                          backgroundColor: cores.fundo.terciario,
                          borderRadius: 8,
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </Pressable>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Seletor de Mês */}
      <Modal
        visivel={modalMesAberto}
        onFechar={() => setModalMesAberto(false)}
        titulo="Selecionar Mês"
        tamanho="medio"
        tema={tema}
      >
        <View style={{ gap: 8 }}>
          {MESES.map((mes) => (
            <Pressable
              key={mes.valor}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMesSelecionado(mes.valor);
                setModalMesAberto(false);
              }}
              style={{
                padding: 14,
                backgroundColor: mesSelecionado === mes.valor ? cores.primaria.DEFAULT + '15' : cores.fundo.terciario,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: mesSelecionado === mes.valor ? cores.primaria.DEFAULT : cores.borda.sutil,
              }}
            >
              <Text
                style={{
                  color: mesSelecionado === mes.valor ? cores.primaria.DEFAULT : cores.texto.primario,
                  fontSize: 15,
                  fontWeight: mesSelecionado === mes.valor ? '600' : '400',
                }}
              >
                {mes.nome}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>

      {/* Modal Seletor de Ano */}
      <Modal
        visivel={modalAnoAberto}
        onFechar={() => setModalAnoAberto(false)}
        titulo="Selecionar Ano"
        tamanho="pequeno"
        tema={tema}
      >
        <View style={{ gap: 8 }}>
          {[2024, 2025, 2026, 2027].map((ano) => (
            <Pressable
              key={ano}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAnoSelecionado(ano);
                setModalAnoAberto(false);
              }}
              style={{
                padding: 14,
                backgroundColor: anoSelecionado === ano ? cores.primaria.DEFAULT + '15' : cores.fundo.terciario,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: anoSelecionado === ano ? cores.primaria.DEFAULT : cores.borda.sutil,
              }}
            >
              <Text
                style={{
                  color: anoSelecionado === ano ? cores.primaria.DEFAULT : cores.texto.primario,
                  fontSize: 15,
                  fontWeight: anoSelecionado === ano ? '600' : '400',
                }}
              >
                {ano}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}
