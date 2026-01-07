/**
 * Componente CalendarioSemanal
 * Calendário visual semanal para agendamentos no mobile
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  parseISO,
  startOfWeek,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  isToday,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { obterCores, TemaType } from '../../constants/cores';
import { DIAS_SEMANA_ABREV, HORARIOS_PADRAO } from '../../services/horariosFuncionamento';
import type { Agendamento as AgendamentoTipo } from '../../types';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface CalendarioSemanalProps {
  agendamentos: AgendamentoTipo[];
  dataBase: Date;
  onMudarData: (data: Date) => void;
  onSelecionarAgendamento: (agendamento: AgendamentoTipo) => void;
  carregando?: boolean;
  tema?: TemaType;
  horaInicio?: number;
  horaFim?: number;
  diasFuncionamento?: string[];
  visualizacao?: TipoVisualizacao;
  onMudarVisualizacao?: (tipo: TipoVisualizacao) => void;
  tamanhoHora?: TamanhoHora;
}

type TipoVisualizacao = 'dia' | '3dias' | 'semana';

type TamanhoHora = 'compacto' | 'normal' | 'expandido';

const TAMANHOS_HORA: Record<TamanhoHora, number> = {
  compacto: 48,
  normal: 64,
  expandido: 80,
};

const LARGURAS_COLUNA_HORA: Record<TamanhoHora, number> = {
  compacto: 48,
  normal: 56,
  expandido: 64,
};

const STATUS_CORES: Record<string, { bg: string; border: string; text: string }> = {
  pendente: { bg: '#fbbf24', border: '#f59e0b', text: '#78350f' },
  confirmado: { bg: '#10b981', border: '#059669', text: '#ffffff' },
  concluido: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
  cancelado: { bg: '#9ca3af', border: '#6b7280', text: '#374151' },
};

export function CalendarioSemanal({
  agendamentos,
  dataBase,
  onMudarData,
  onSelecionarAgendamento,
  carregando = false,
  tema = 'escuro',
  horaInicio = HORARIOS_PADRAO.horaInicio,
  horaFim = HORARIOS_PADRAO.horaFim,
  diasFuncionamento = HORARIOS_PADRAO.diasFuncionamento,
  visualizacao: visualizacaoProp,
  onMudarVisualizacao,
  tamanhoHora = 'normal',
}: CalendarioSemanalProps) {
  const cores = obterCores(tema);
  const scrollRef = useRef<ScrollView>(null);
  const [visualizacaoInterna, setVisualizacaoInterna] = useState<TipoVisualizacao>(visualizacaoProp || 'semana');

  const visualizacao = visualizacaoProp ?? visualizacaoInterna;
  const setVisualizacao = (tipo: TipoVisualizacao) => {
    if (onMudarVisualizacao) {
      onMudarVisualizacao(tipo);
      return;
    }
    setVisualizacaoInterna(tipo);
  };

  const alturaHora = TAMANHOS_HORA[tamanhoHora];
  const larguraColunaHora = LARGURAS_COLUNA_HORA[tamanhoHora];

  const horasDia = useMemo(() => {
    const horas: number[] = [];
    for (let h = horaInicio; h <= horaFim; h++) {
      horas.push(h);
    }
    return horas;
  }, [horaInicio, horaFim]);

  const diasExibidos = useMemo(() => {
    if (visualizacao === 'dia') {
      return [dataBase];
    }
    if (visualizacao === '3dias') {
      return [subDays(dataBase, 1), dataBase, addDays(dataBase, 1)];
    }
    const inicio = startOfWeek(dataBase, { weekStartsOn: 0 });
    const todosDias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));

    const diasFiltrados = todosDias.filter((dia) => {
      const abrev = DIAS_SEMANA_ABREV[dia.getDay()];
      return diasFuncionamento.includes(abrev);
    });

    return diasFiltrados.length > 0 ? diasFiltrados : todosDias;
  }, [dataBase, visualizacao, diasFuncionamento]);

  const larguraColunaDia = useMemo(() => {
    const larguraDisponivel = LARGURA_TELA - larguraColunaHora;
    return larguraDisponivel / diasExibidos.length;
  }, [diasExibidos.length, larguraColunaHora]);

  const agendamentosPorDia = useMemo(() => {
    const grupos: Record<string, AgendamentoTipo[]> = {};
    diasExibidos.forEach(dia => {
      grupos[format(dia, 'yyyy-MM-dd')] = [];
    });
    agendamentos.forEach(ag => {
      const dataAg = parseISO(ag.data_hora);
      const key = format(dataAg, 'yyyy-MM-dd');
      if (grupos[key]) {
        grupos[key].push(ag);
      }
    });
    return grupos;
  }, [agendamentos, diasExibidos]);

  const calcularPosicao = useCallback((dataHora: string, duracao: number) => {
    const data = parseISO(dataHora);
    const hora = data.getHours();
    const minutos = data.getMinutes();
    const top = ((hora - horaInicio) * alturaHora) + ((minutos / 60) * alturaHora);
    const height = Math.max((duracao / 60) * alturaHora, 30);
    return { top, height };
  }, [alturaHora, horaInicio]);

  const navegarAnterior = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (visualizacao === 'dia') {
      onMudarData(subDays(dataBase, 1));
    } else if (visualizacao === '3dias') {
      onMudarData(subDays(dataBase, 3));
    } else {
      onMudarData(subWeeks(dataBase, 1));
    }
  };

  const navegarProximo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (visualizacao === 'dia') {
      onMudarData(addDays(dataBase, 1));
    } else if (visualizacao === '3dias') {
      onMudarData(addDays(dataBase, 3));
    } else {
      onMudarData(addWeeks(dataBase, 1));
    }
  };

  const irParaHoje = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMudarData(new Date());
  };

  const tituloPeriodo = useMemo(() => {
    if (visualizacao === 'dia') {
      return format(dataBase, "EEEE, d 'de' MMMM", { locale: ptBR });
    }
    const inicio = diasExibidos[0];
    const fim = diasExibidos[diasExibidos.length - 1];
    if (inicio.getMonth() === fim.getMonth()) {
      return format(inicio, "MMMM 'de' yyyy", { locale: ptBR });
    }
    return `${format(inicio, 'MMM', { locale: ptBR })} - ${format(fim, "MMM 'de' yyyy", { locale: ptBR })}`;
  }, [dataBase, diasExibidos, visualizacao]);

  useEffect(() => {
    if (scrollRef.current && !carregando) {
      const horaAtual = new Date().getHours();
      const scrollPosition = Math.max(0, (horaAtual - horaInicio - 1) * alturaHora);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: scrollPosition, animated: false });
      }, 100);
    }
  }, [carregando, alturaHora, horaInicio]);

  const renderAgendamento = (ag: AgendamentoTipo, indiceDia: number) => {
    const duracao = ag.servicos?.duracao || 30;
    const { top, height } = calcularPosicao(ag.data_hora, duracao);
    const statusCor = STATUS_CORES[ag.status] || STATUS_CORES.pendente;

    return (
      <Pressable
        key={ag.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelecionarAgendamento(ag);
        }}
        style={{
          position: 'absolute',
          top,
          left: 2,
          right: 2,
          height: height - 2,
          backgroundColor: statusCor.bg,
          borderLeftWidth: 3,
          borderLeftColor: statusCor.border,
          borderRadius: 4,
          padding: 4,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{
            color: statusCor.text,
            fontSize: 11,
            fontWeight: '600',
          }}
          numberOfLines={1}
        >
          {ag.clientes?.nome || 'Cliente'}
        </Text>
        {height > 35 && (
          <Text
            style={{
              color: statusCor.text,
              fontSize: 10,
              opacity: 0.9,
            }}
            numberOfLines={1}
          >
            {ag.servicos?.nome || 'Serviço'}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header com navegação */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: cores.fundo.secundario,
        }}
      >
        <Pressable onPress={navegarAnterior} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={cores.texto.primario} />
        </Pressable>

        <Pressable onPress={irParaHoje}>
          <Text
            style={{
              color: cores.texto.primario,
              fontSize: 16,
              fontWeight: '600',
              textTransform: 'capitalize',
            }}
          >
            {tituloPeriodo}
          </Text>
        </Pressable>

        <Pressable onPress={navegarProximo} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={cores.texto.primario} />
        </Pressable>
      </View>

      {/* Seletor de visualização */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 8,
          gap: 8,
          backgroundColor: cores.fundo.secundario,
        }}
      >
        {(['dia', '3dias', 'semana'] as TipoVisualizacao[]).map((tipo) => (
          <Pressable
            key={tipo}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setVisualizacao(tipo);
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: visualizacao === tipo
                ? cores.primaria.DEFAULT
                : cores.fundo.terciario,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: visualizacao === tipo
                  ? cores.botao.texto
                  : cores.texto.secundario,
                fontSize: 13,
                fontWeight: visualizacao === tipo ? '600' : '400',
              }}
            >
              {tipo === 'dia' ? '1 Dia' : tipo === '3dias' ? '3 Dias' : 'Semana'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Cabeçalho dos dias */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: cores.fundo.secundario,
          borderBottomWidth: 1,
          borderBottomColor: cores.borda.sutil,
        }}
      >
        <View style={{ width: larguraColunaHora }} />
        {diasExibidos.map((dia, index) => {
          const ehHoje = isToday(dia);
          const ehSelecionado = isSameDay(dia, dataBase);
          return (
            <Pressable
              key={index}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onMudarData(dia);
              }}
              style={{
                width: larguraColunaDia,
                alignItems: 'center',
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color: ehHoje ? cores.primaria.DEFAULT : cores.texto.terciario,
                  fontSize: 11,
                  textTransform: 'uppercase',
                }}
              >
                {format(dia, 'EEE', { locale: ptBR })}
              </Text>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: ehHoje
                    ? cores.primaria.DEFAULT
                    : ehSelecionado
                      ? cores.fundo.terciario
                      : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    color: ehHoje
                      ? cores.botao.texto
                      : cores.texto.primario,
                    fontSize: 14,
                    fontWeight: ehHoje || ehSelecionado ? '700' : '400',
                  }}
                >
                  {format(dia, 'd')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Grid do calendário */}
      {carregando ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={cores.primaria.DEFAULT} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: cores.fundo.primario }}
        >
          <View style={{ flexDirection: 'row' }}>
            {/* Coluna de horas */}
            <View style={{ width: larguraColunaHora }}>
              {horasDia.map((hora) => (
                <View
                  key={hora}
                  style={{
                    height: alturaHora,
                    justifyContent: 'flex-start',
                    alignItems: 'flex-end',
                    paddingRight: 8,
                    paddingTop: 2,
                  }}
                >
                  <Text
                    style={{
                      color: cores.texto.terciario,
                      fontSize: 11,
                    }}
                  >
                    {`${hora.toString().padStart(2, '0')}:00`}
                  </Text>
                </View>
              ))}
            </View>

            {/* Colunas dos dias */}
            {diasExibidos.map((dia, indiceDia) => {
              const chave = format(dia, 'yyyy-MM-dd');
              const agendamentosDoDia = agendamentosPorDia[chave] || [];
              const ehHoje = isToday(dia);

              return (
                <View
                  key={indiceDia}
                  style={{
                    width: larguraColunaDia,
                    borderLeftWidth: 1,
                    borderLeftColor: cores.borda.sutil,
                    backgroundColor: ehHoje
                      ? tema === 'escuro'
                        ? 'rgba(59, 130, 246, 0.05)'
                        : 'rgba(59, 130, 246, 0.03)'
                      : 'transparent',
                  }}
                >
                  {/* Linhas de hora */}
                  {horasDia.map((hora) => (
                    <View
                      key={hora}
                      style={{
                        height: alturaHora,
                        borderBottomWidth: 1,
                        borderBottomColor: cores.borda.sutil,
                      }}
                    />
                  ))}

                  {/* Agendamentos */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  >
                    {agendamentosDoDia.map((ag) => renderAgendamento(ag, indiceDia))}
                  </View>

                  {/* Indicador de hora atual */}
                  {ehHoje && (
                    <View
                      style={{
                        position: 'absolute',
                        top: ((new Date().getHours() - horaInicio) * alturaHora) +
                          ((new Date().getMinutes() / 60) * alturaHora),
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: cores.erro,
                        zIndex: 100,
                      }}
                    >
                      <View
                        style={{
                          position: 'absolute',
                          left: -4,
                          top: -4,
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: cores.erro,
                        }}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

export default CalendarioSemanal;
