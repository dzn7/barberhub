import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, isSameDay, isToday, parseISO, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Modal } from '../ui';
import { supabase } from '../../services/supabase';
import { obterCores, TemaType } from '../../constants/cores';
import { buscarConfiguracaoHorarios, DIAS_SEMANA_ABREV } from '../../services/horariosFuncionamento';
import { gerarTodosHorarios } from '../../services/horarios';
import { enviarRemarcacaoAgendamento } from '../../services/bot';
import type { Agendamento } from '../../types';

type AgendamentoComRelacoes = Agendamento & {
  clientes?: { nome: string; telefone: string | null };
  barbeiros?: { id: string; nome: string };
  servicos?: { id: string; nome: string; preco: number; duracao: number };
};

interface ModalRemarcacaoProps {
  visivel: boolean;
  onFechar: () => void;
  agendamento: AgendamentoComRelacoes | null;
  onSucesso: () => void;
  tema?: TemaType;
}

type HorarioDisponivel = {
  hora: string;
  disponivel: boolean;
};

export function ModalRemarcacao({
  visivel,
  onFechar,
  agendamento,
  onSucesso,
  tema = 'escuro',
}: ModalRemarcacaoProps) {
  const cores = obterCores(tema);

  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('');
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<HorarioDisponivel[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [config, setConfig] = useState<{
    horaInicio: number;
    horaFim: number;
    intervalo: number;
    diasFuncionamento: string[];
    intervaloAlmocoInicio: string | null;
    intervaloAlmocoFim: string | null;
  } | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!visivel || !agendamento?.tenant_id) return;
      const cfg = await buscarConfiguracaoHorarios(agendamento.tenant_id);
      setConfig(cfg);

      // Ponto inicial: data do agendamento (ou hoje se já passou)
      const dataAg = new Date(agendamento.data_hora);
      const hoje = new Date();
      setDataSelecionada(dataAg > hoje ? dataAg : hoje);
      setHorarioSelecionado('');
    };

    carregar();
  }, [visivel, agendamento?.tenant_id, agendamento?.data_hora]);

  const proximosDias = useMemo(() => {
    if (!config) return [] as Date[];

    const dias: Date[] = [];
    let diaAtual = new Date();
    let tentativas = 0;

    while (dias.length < 14 && tentativas < 45) {
      const abrev = DIAS_SEMANA_ABREV[diaAtual.getDay()];
      if (config.diasFuncionamento.includes(abrev)) {
        dias.push(new Date(diaAtual));
      }
      diaAtual = addDays(diaAtual, 1);
      tentativas++;
    }

    return dias;
  }, [config]);

  const buscarHorarios = useCallback(async () => {
    if (!agendamento || !config) return;

    setCarregandoHorarios(true);
    try {
      const inicioDia = new Date(dataSelecionada);
      inicioDia.setHours(0, 0, 0, 0);

      const fimDia = new Date(dataSelecionada);
      fimDia.setHours(23, 59, 59, 999);

      // Agendamentos do barbeiro na data (exceto cancelados e exceto o próprio)
      const { data: agendamentosData, error: erroAgendamentos } = await supabase
        .from('agendamentos')
        .select(
          `
          id,
          data_hora,
          status,
          servicos (duracao)
        `
        )
        .eq('tenant_id', agendamento.tenant_id)
        .eq('barbeiro_id', agendamento.barbeiro_id)
        .gte('data_hora', inicioDia.toISOString())
        .lte('data_hora', fimDia.toISOString())
        .neq('status', 'cancelado');

      if (erroAgendamentos) throw erroAgendamentos;

      // Bloqueios do dia (global ou do barbeiro)
      const dataFormatada = format(dataSelecionada, 'yyyy-MM-dd');
      const { data: bloqueiosData, error: erroBloqueios } = await supabase
        .from('horarios_bloqueados')
        .select('horario_inicio, horario_fim, barbeiro_id')
        .eq('tenant_id', agendamento.tenant_id)
        .eq('data', dataFormatada)
        .or(`barbeiro_id.is.null,barbeiro_id.eq.${agendamento.barbeiro_id}`);

      if (erroBloqueios) throw erroBloqueios;

      const horariosOcupadosAgendamentos = (agendamentosData || [])
        .filter((a: any) => a.id !== agendamento.id)
        .map((a: any) => ({
          horario: format(parseISO(a.data_hora), 'HH:mm'),
          duracao: a.servicos?.duracao || 30,
        }));

      const horariosOcupadosBloqueios = (bloqueiosData || []).map((b: any) => {
        const inicio = (b.horario_inicio as string).toString().slice(0, 5);
        const fim = (b.horario_fim as string).toString().slice(0, 5);

        const [hi, mi] = inicio.split(':').map(Number);
        const [hf, mf] = fim.split(':').map(Number);
        const duracao = Math.max(0, (hf * 60 + mf) - (hi * 60 + mi));

        return { horario: inicio, duracao: duracao || 20 };
      });

      const horariosOcupados = [...horariosOcupadosAgendamentos, ...horariosOcupadosBloqueios];

      const duracaoServico = agendamento.servicos?.duracao || 30;
      const inicio = `${config.horaInicio.toString().padStart(2, '0')}:00`;
      const fim = `${config.horaFim.toString().padStart(2, '0')}:00`;

      const todos = gerarTodosHorarios(
        duracaoServico,
        horariosOcupados,
        {
          inicio,
          fim,
          intervaloAlmocoInicio: config.intervaloAlmocoInicio,
          intervaloAlmocoFim: config.intervaloAlmocoFim,
          intervaloHorarios: config.intervalo || 20,
        },
        format(dataSelecionada, 'yyyy-MM-dd')
      );

      setHorariosDisponiveis(todos.map(h => ({ hora: h.horario, disponivel: h.disponivel })));
    } catch (erro) {
      console.error('Erro ao buscar horários:', erro);
      Alert.alert('Erro', 'Não foi possível carregar os horários disponíveis.');
      setHorariosDisponiveis([]);
    } finally {
      setCarregandoHorarios(false);
    }
  }, [agendamento, config, dataSelecionada]);

  useEffect(() => {
    if (!visivel || !agendamento || !config) return;
    buscarHorarios();
  }, [visivel, agendamento?.id, config, dataSelecionada, buscarHorarios]);

  const remarcar = async () => {
    if (!agendamento) return;
    if (!horarioSelecionado) {
      Alert.alert('Atenção', 'Selecione um horário.');
      return;
    }

    setSalvando(true);
    try {
      const [h, m] = horarioSelecionado.split(':').map(Number);
      const novaDataHora = setMinutes(setHours(new Date(dataSelecionada), h), m);

      const { error: erroUpdate } = await supabase
        .from('agendamentos')
        .update({ data_hora: novaDataHora.toISOString() })
        .eq('id', agendamento.id);

      if (erroUpdate) throw erroUpdate;

      await supabase.from('historico_agendamentos').insert({
        tenant_id: agendamento.tenant_id,
        agendamento_id: agendamento.id,
        data_hora_anterior: agendamento.data_hora,
        data_hora_nova: novaDataHora.toISOString(),
        alterado_por: 'admin',
      });

      await enviarRemarcacaoAgendamento(agendamento.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Agendamento remarcado com sucesso!');
      onSucesso();
      onFechar();
    } catch (erro) {
      console.error('Erro ao remarcar:', erro);
      Alert.alert('Erro', 'Não foi possível remarcar o agendamento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      visivel={visivel}
      onFechar={onFechar}
      titulo="Remarcar Agendamento"
      subtitulo={agendamento ? `${agendamento.clientes?.nome || 'Cliente'} • ${agendamento.servicos?.nome || 'Serviço'}` : undefined}
      tamanho="grande"
      tema={tema}
    >
      {!agendamento ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <Text style={{ color: cores.texto.secundario }}>Selecione um agendamento.</Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Datas */}
          <View style={{ gap: 10 }}>
            <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '600' }}>
              Selecione a Data
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
            >
              {proximosDias.map((dia) => {
                const selecionado = isSameDay(dia, dataSelecionada);
                const hoje = isToday(dia);

                return (
                  <Pressable
                    key={dia.toISOString()}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDataSelecionada(dia);
                      setHorarioSelecionado('');
                    }}
                    style={{
                      width: 74,
                      paddingVertical: 10,
                      borderRadius: 14,
                      alignItems: 'center',
                      backgroundColor: selecionado ? '#ffffff' : '#27272a',
                      borderWidth: 1,
                      borderColor: selecionado ? '#ffffff' : hoje ? '#3b82f6' : '#3f3f46',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: selecionado ? '#18181b' : '#a1a1aa',
                      }}
                    >
                      {format(dia, 'EEE', { locale: ptBR })}
                    </Text>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: selecionado ? '#18181b' : '#ffffff',
                        marginTop: 4,
                      }}
                    >
                      {format(dia, 'dd')}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '600',
                        color: selecionado ? '#27272a' : '#71717a',
                        marginTop: 2,
                        textTransform: 'uppercase',
                      }}
                    >
                      {format(dia, 'MMM', { locale: ptBR })}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Horários */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '600' }}>
                Selecione o Horário
              </Text>
              {!carregandoHorarios && (
                <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                  {horariosDisponiveis.filter(h => h.disponivel).length} disponíveis
                </Text>
              )}
            </View>

            {carregandoHorarios ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color={cores.primaria.DEFAULT} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {horariosDisponiveis.map((h) => {
                  const selecionado = horarioSelecionado === h.hora;
                  const ocupado = !h.disponivel;

                  return (
                    <Pressable
                      key={h.hora}
                      onPress={() => {
                        if (ocupado) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setHorarioSelecionado(h.hora);
                      }}
                      style={{
                        minWidth: 86,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor: ocupado
                          ? 'rgba(239,68,68,0.85)'
                          : selecionado
                            ? '#10b981'
                            : '#27272a',
                        borderWidth: 1,
                        borderColor: ocupado
                          ? 'rgba(239,68,68,0.4)'
                          : selecionado
                            ? '#34d399'
                            : '#3f3f46',
                      }}
                    >
                      <Text
                        style={{
                          color: ocupado ? '#ffffff' : selecionado ? '#ffffff' : '#e4e4e7',
                          fontSize: 13,
                          fontWeight: '700',
                        }}
                      >
                        {h.hora}
                      </Text>
                      {ocupado && (
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 2 }}>
                          Ocupado
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Ação */}
          <Pressable
            onPress={remarcar}
            disabled={salvando || !horarioSelecionado}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: salvando || !horarioSelecionado ? '#3f3f46' : '#ffffff',
              marginTop: 6,
            }}
          >
            {salvando ? (
              <ActivityIndicator color={'#18181b'} />
            ) : (
              <Ionicons name="refresh" size={18} color={'#18181b'} />
            )}
            <Text style={{ color: '#18181b', fontSize: 15, fontWeight: '800' }}>
              {salvando ? 'Remarcando...' : 'Confirmar Remarcação'}
            </Text>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}
