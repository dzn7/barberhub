/**
 * Componente SeletorPeriodo
 * Seletor de período interativo com opções pré-definidas e calendário customizado
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  addMonths,
  isSameDay,
  isSameMonth,
  getDaysInMonth,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { obterCores, TemaType } from '../../constants/cores';
import * as Haptics from 'expo-haptics';

export type OpcaoPeriodo = 'hoje' | 'ontem' | 'semana' | 'mes' | 'ano' | 'geral' | 'personalizado';

interface PeriodoSelecionado {
  tipo: OpcaoPeriodo;
  dataInicio: Date;
  dataFim: Date;
  rotulo: string;
}

interface SeletorPeriodoProps {
  periodo: PeriodoSelecionado;
  onChange: (periodo: PeriodoSelecionado) => void;
  tema?: TemaType;
  opcoes?: OpcaoPeriodo[];
}

const OPCOES_PADRAO: { tipo: OpcaoPeriodo; rotulo: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { tipo: 'hoje', rotulo: 'Hoje', icone: 'today-outline' },
  { tipo: 'ontem', rotulo: 'Ontem', icone: 'time-outline' },
  { tipo: 'semana', rotulo: 'Esta Semana', icone: 'calendar-outline' },
  { tipo: 'mes', rotulo: 'Este Mês', icone: 'calendar-number-outline' },
  { tipo: 'ano', rotulo: 'Este Ano', icone: 'calendar-clear-outline' },
  { tipo: 'geral', rotulo: 'Todo Período', icone: 'infinite-outline' },
];

function obterPeriodo(tipo: OpcaoPeriodo, dataPersonalizadaInicio?: Date, dataPersonalizadaFim?: Date): PeriodoSelecionado {
  const hoje = new Date();

  switch (tipo) {
    case 'hoje':
      return {
        tipo: 'hoje',
        dataInicio: startOfDay(hoje),
        dataFim: endOfDay(hoje),
        rotulo: 'Hoje',
      };
    case 'ontem':
      const ontem = subDays(hoje, 1);
      return {
        tipo: 'ontem',
        dataInicio: startOfDay(ontem),
        dataFim: endOfDay(ontem),
        rotulo: 'Ontem',
      };
    case 'semana':
      return {
        tipo: 'semana',
        dataInicio: startOfWeek(hoje, { weekStartsOn: 0 }),
        dataFim: endOfWeek(hoje, { weekStartsOn: 0 }),
        rotulo: 'Esta Semana',
      };
    case 'mes':
      return {
        tipo: 'mes',
        dataInicio: startOfMonth(hoje),
        dataFim: endOfMonth(hoje),
        rotulo: 'Este Mês',
      };
    case 'ano':
      return {
        tipo: 'ano',
        dataInicio: startOfYear(hoje),
        dataFim: endOfYear(hoje),
        rotulo: 'Este Ano',
      };
    case 'geral':
      return {
        tipo: 'geral',
        dataInicio: new Date(2020, 0, 1),
        dataFim: endOfDay(hoje),
        rotulo: 'Todo Período',
      };
    case 'personalizado':
      if (dataPersonalizadaInicio && dataPersonalizadaFim) {
        return {
          tipo: 'personalizado',
          dataInicio: startOfDay(dataPersonalizadaInicio),
          dataFim: endOfDay(dataPersonalizadaFim),
          rotulo: `${format(dataPersonalizadaInicio, 'dd/MM')} - ${format(dataPersonalizadaFim, 'dd/MM')}`,
        };
      }
      return obterPeriodo('mes');
    default:
      return obterPeriodo('mes');
  }
}

export function SeletorPeriodo({
  periodo,
  onChange,
  tema = 'escuro',
  opcoes = ['hoje', 'semana', 'mes', 'ano', 'geral'],
}: SeletorPeriodoProps) {
  const cores = obterCores(tema);
  const insets = useSafeAreaInsets();
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCalendarioAberto, setModalCalendarioAberto] = useState(false);
  const [mesVisualizado, setMesVisualizado] = useState(new Date());
  const [dataInicioTemp, setDataInicioTemp] = useState<Date | null>(null);
  const [dataFimTemp, setDataFimTemp] = useState<Date | null>(null);

  const opcoesVisiveis = useMemo(() => {
    return OPCOES_PADRAO.filter(o => opcoes.includes(o.tipo));
  }, [opcoes]);

  const selecionarPeriodo = (tipo: OpcaoPeriodo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tipo === 'personalizado') {
      setModalAberto(false);
      setModalCalendarioAberto(true);
      setDataInicioTemp(null);
      setDataFimTemp(null);
    } else {
      onChange(obterPeriodo(tipo));
      setModalAberto(false);
    }
  };

  const selecionarDia = (dia: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!dataInicioTemp || (dataInicioTemp && dataFimTemp)) {
      setDataInicioTemp(dia);
      setDataFimTemp(null);
    } else {
      if (dia < dataInicioTemp) {
        setDataFimTemp(dataInicioTemp);
        setDataInicioTemp(dia);
      } else {
        setDataFimTemp(dia);
      }
    }
  };

  const confirmarPeriodoPersonalizado = () => {
    if (dataInicioTemp && dataFimTemp) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onChange(obterPeriodo('personalizado', dataInicioTemp, dataFimTemp));
      setModalCalendarioAberto(false);
    }
  };

  const diasDoMes = useMemo(() => {
    const primeiroDia = startOfMonth(mesVisualizado);
    const ultimoDia = endOfMonth(mesVisualizado);
    const diasNoMes = getDaysInMonth(mesVisualizado);
    const diaInicial = getDay(primeiroDia);

    const dias: (Date | null)[] = [];

    for (let i = 0; i < diaInicial; i++) {
      dias.push(null);
    }

    for (let i = 1; i <= diasNoMes; i++) {
      dias.push(new Date(mesVisualizado.getFullYear(), mesVisualizado.getMonth(), i));
    }

    return dias;
  }, [mesVisualizado]);

  const estaNoPeriodo = (dia: Date) => {
    if (!dataInicioTemp) return false;
    if (!dataFimTemp) return isSameDay(dia, dataInicioTemp);
    return dia >= dataInicioTemp && dia <= dataFimTemp;
  };

  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setModalAberto(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: cores.fundo.terciario,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 10,
          gap: 8,
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={cores.texto.secundario} />
        <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '500' }}>
          {periodo.rotulo}
        </Text>
        <Ionicons name="chevron-down" size={16} color={cores.texto.terciario} />
      </Pressable>

      {/* Modal de Seleção de Período */}
      <Modal
        visible={modalAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalAberto(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setModalAberto(false)}
        >
          <View style={{ flex: 1 }} />
          <View
            style={{
              backgroundColor: cores.fundo.primario,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 8,
              paddingBottom: insets.bottom || 20,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: cores.borda.media,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                color: cores.texto.primario,
                fontSize: 18,
                fontWeight: '700',
                paddingHorizontal: 20,
                marginBottom: 16,
              }}
            >
              Selecionar Período
            </Text>

            <View style={{ paddingHorizontal: 20 }}>
              {opcoesVisiveis.map((opcao) => (
                <Pressable
                  key={opcao.tipo}
                  onPress={() => selecionarPeriodo(opcao.tipo)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: periodo.tipo === opcao.tipo ? cores.fundo.terciario : 'transparent',
                    marginBottom: 4,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: periodo.tipo === opcao.tipo
                        ? cores.primaria.DEFAULT
                        : cores.fundo.terciario,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Ionicons
                      name={opcao.icone}
                      size={20}
                      color={periodo.tipo === opcao.tipo ? cores.botao.texto : cores.texto.secundario}
                    />
                  </View>
                  <Text
                    style={{
                      color: cores.texto.primario,
                      fontSize: 16,
                      flex: 1,
                    }}
                  >
                    {opcao.rotulo}
                  </Text>
                  {periodo.tipo === opcao.tipo && (
                    <Ionicons name="checkmark-circle" size={22} color={cores.sucesso} />
                  )}
                </Pressable>
              ))}

              <Pressable
                onPress={() => selecionarPeriodo('personalizado')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: periodo.tipo === 'personalizado' ? cores.fundo.terciario : 'transparent',
                  marginTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: cores.borda.sutil,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: periodo.tipo === 'personalizado'
                      ? cores.primaria.DEFAULT
                      : cores.fundo.terciario,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Ionicons
                    name="options-outline"
                    size={20}
                    color={periodo.tipo === 'personalizado' ? cores.botao.texto : cores.texto.secundario}
                  />
                </View>
                <Text style={{ color: cores.texto.primario, fontSize: 16, flex: 1 }}>
                  Personalizado
                </Text>
                <Ionicons name="chevron-forward" size={20} color={cores.texto.terciario} />
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de Calendário Personalizado */}
      <Modal
        visible={modalCalendarioAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalCalendarioAberto(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={() => setModalCalendarioAberto(false)}
        >
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: cores.fundo.primario,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 8,
              paddingBottom: insets.bottom || 20,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: cores.borda.media,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            {/* Header do Calendário */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                marginBottom: 16,
              }}
            >
              <Pressable onPress={() => setMesVisualizado(subMonths(mesVisualizado, 1))}>
                <Ionicons name="chevron-back" size={24} color={cores.texto.primario} />
              </Pressable>
              <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '600' }}>
                {format(mesVisualizado, 'MMMM yyyy', { locale: ptBR })}
              </Text>
              <Pressable onPress={() => setMesVisualizado(addMonths(mesVisualizado, 1))}>
                <Ionicons name="chevron-forward" size={24} color={cores.texto.primario} />
              </Pressable>
            </View>

            {/* Dias da Semana */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                <View key={dia} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                    {dia}
                  </Text>
                </View>
              ))}
            </View>

            {/* Grade de Dias */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }}>
              {diasDoMes.map((dia, index) => (
                <Pressable
                  key={index}
                  onPress={() => dia && selecionarDia(dia)}
                  disabled={!dia}
                  style={{
                    width: `${100 / 7}%`,
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {dia && (
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: estaNoPeriodo(dia)
                          ? cores.primaria.DEFAULT
                          : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          color: estaNoPeriodo(dia) ? cores.botao.texto : cores.texto.primario,
                          fontSize: 14,
                          fontWeight: estaNoPeriodo(dia) ? '600' : '400',
                        }}
                      >
                        {dia.getDate()}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Período Selecionado */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 16,
                paddingHorizontal: 20,
                gap: 12,
              }}
            >
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>Início</Text>
                <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '500', marginTop: 4 }}>
                  {dataInicioTemp ? format(dataInicioTemp, 'dd/MM/yyyy') : '--/--/----'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={cores.texto.terciario} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>Fim</Text>
                <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '500', marginTop: 4 }}>
                  {dataFimTemp ? format(dataFimTemp, 'dd/MM/yyyy') : '--/--/----'}
                </Text>
              </View>
            </View>

            {/* Botões */}
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 20,
                marginTop: 20,
                gap: 12,
              }}
            >
              <Pressable
                onPress={() => setModalCalendarioAberto(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: cores.texto.secundario, fontSize: 15, fontWeight: '600' }}>
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmarPeriodoPersonalizado}
                disabled={!dataInicioTemp || !dataFimTemp}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: dataInicioTemp && dataFimTemp
                    ? cores.primaria.DEFAULT
                    : cores.borda.sutil,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: dataInicioTemp && dataFimTemp ? cores.botao.texto : cores.texto.terciario,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  Confirmar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export { obterPeriodo };
export type { PeriodoSelecionado };
export default SeletorPeriodo;
