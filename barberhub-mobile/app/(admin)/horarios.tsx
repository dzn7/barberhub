/**
 * Tela de Horários de Funcionamento
 * Configuração dos dias e horários de atendimento
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Botao, Modal } from '../../src/components/ui';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';

interface HorarioDia {
  ativo: boolean;
  abertura: string;
  fechamento: string;
  intervaloInicio?: string;
  intervaloFim?: string;
}

interface HorariosSemana {
  dom: HorarioDia;
  seg: HorarioDia;
  ter: HorarioDia;
  qua: HorarioDia;
  qui: HorarioDia;
  sex: HorarioDia;
  sab: HorarioDia;
}

const DIAS_SEMANA: { key: keyof HorariosSemana; label: string; abrev: string }[] = [
  { key: 'dom', label: 'Domingo', abrev: 'Dom' },
  { key: 'seg', label: 'Segunda-feira', abrev: 'Seg' },
  { key: 'ter', label: 'Terça-feira', abrev: 'Ter' },
  { key: 'qua', label: 'Quarta-feira', abrev: 'Qua' },
  { key: 'qui', label: 'Quinta-feira', abrev: 'Qui' },
  { key: 'sex', label: 'Sexta-feira', abrev: 'Sex' },
  { key: 'sab', label: 'Sábado', abrev: 'Sáb' },
];

const HORAS_DISPONIVEIS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

const HORARIO_PADRAO: HorarioDia = {
  ativo: true,
  abertura: '08:00',
  fechamento: '18:00',
};

export default function TelaHorarios() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tenant } = useAutenticacao();
  
  const { cores, tema } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [horarios, setHorarios] = useState<HorariosSemana>({
    dom: { ...HORARIO_PADRAO, ativo: false },
    seg: { ...HORARIO_PADRAO },
    ter: { ...HORARIO_PADRAO },
    qua: { ...HORARIO_PADRAO },
    qui: { ...HORARIO_PADRAO },
    sex: { ...HORARIO_PADRAO },
    sab: { ...HORARIO_PADRAO },
  });
  
  const [modalHoraAberto, setModalHoraAberto] = useState(false);
  const [diaEditando, setDiaEditando] = useState<keyof HorariosSemana | null>(null);
  const [tipoHora, setTipoHora] = useState<'abertura' | 'fechamento'>('abertura');

  const carregarHorarios = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('configuracoes_barbearia')
        .select('horario_abertura, horario_fechamento, dias_funcionamento, usar_horarios_personalizados, horarios_personalizados')
        .eq('tenant_id', tenant.id)
        .single();

      if (error) throw error;

      const diasFuncionamento = (data?.dias_funcionamento as unknown as string[]) || [];
      const horarioAberturaBase = (data?.horario_abertura as unknown as string | null)?.toString()?.slice(0, 5) || '08:00';
      const horarioFechamentoBase = (data?.horario_fechamento as unknown as string | null)?.toString()?.slice(0, 5) || '18:00';
      const usarPersonalizados = Boolean(data?.usar_horarios_personalizados);
      const horariosPersonalizados = (data?.horarios_personalizados as any) || null;

      setHorarios(prev => {
        const novos = { ...prev };

        DIAS_SEMANA.forEach(({ key }) => {
          const personalizadoDia = usarPersonalizados ? horariosPersonalizados?.[key] : null;
          const abertura = (personalizadoDia?.abertura as string | undefined)?.toString()?.slice(0, 5) || horarioAberturaBase;
          const fechamento = (personalizadoDia?.fechamento as string | undefined)?.toString()?.slice(0, 5) || horarioFechamentoBase;

          novos[key] = {
            ...novos[key],
            ativo: diasFuncionamento.includes(key),
            abertura,
            fechamento,
          };
        });

        return novos;
      });
    } catch (erro) {
      console.error('Erro ao carregar horários:', erro);
    } finally {
      setCarregando(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    carregarHorarios();
  }, [carregarHorarios]);

  const salvarHorarios = async () => {
    if (!tenant?.id) return;

    setSalvando(true);
    try {
      const dias_funcionamento = DIAS_SEMANA.filter(({ key }) => horarios[key].ativo).map(({ key }) => key);
      const horario_abertura = horarios.seg.abertura;
      const horario_fechamento = horarios.seg.fechamento;

      const horarios_personalizados: Record<string, { abertura: string; fechamento: string }> = {};
      DIAS_SEMANA.forEach(({ key }) => {
        if (!horarios[key].ativo) return;
        const abertura = horarios[key].abertura;
        const fechamento = horarios[key].fechamento;

        const diferenteDoBase = abertura !== horario_abertura || fechamento !== horario_fechamento;
        if (diferenteDoBase) {
          horarios_personalizados[key] = { abertura, fechamento };
        }
      });

      const usar_horarios_personalizados = Object.keys(horarios_personalizados).length > 0;

      const { error } = await supabase
        .from('configuracoes_barbearia')
        .upsert(
          {
            tenant_id: tenant.id,
            dias_funcionamento,
            horario_abertura,
            horario_fechamento,
            usar_horarios_personalizados,
            horarios_personalizados: usar_horarios_personalizados ? horarios_personalizados : null,
          },
          { onConflict: 'tenant_id' }
        );

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Horários salvos com sucesso!');
    } catch (erro) {
      console.error('Erro ao salvar horários:', erro);
      Alert.alert('Erro', 'Não foi possível salvar os horários.');
    } finally {
      setSalvando(false);
    }
  };

  const toggleDia = (dia: keyof HorariosSemana) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia], ativo: !prev[dia].ativo }
    }));
  };

  const abrirSeletorHora = (dia: keyof HorariosSemana, tipo: 'abertura' | 'fechamento') => {
    setDiaEditando(dia);
    setTipoHora(tipo);
    setModalHoraAberto(true);
  };

  const selecionarHora = (hora: string) => {
    if (!diaEditando) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHorarios(prev => ({
      ...prev,
      [diaEditando]: { ...prev[diaEditando], [tipoHora]: hora }
    }));
    setModalHoraAberto(false);
  };

  const copiarParaTodos = (diaOrigem: keyof HorariosSemana) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const horarioOrigem = horarios[diaOrigem];
    
    setHorarios(prev => {
      const novos = { ...prev };
      DIAS_SEMANA.forEach(({ key }) => {
        if (key !== diaOrigem) {
          novos[key] = { ...horarioOrigem };
        }
      });
      return novos;
    });
    
    Alert.alert('Sucesso', 'Horário copiado para todos os dias!');
  };

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo.primario, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={cores.primaria.DEFAULT} />
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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={cores.texto.primario} />
        </Pressable>
        <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '700' }}>
          Horários de Funcionamento
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo Visual */}
        <Card style={{ marginBottom: 20 }}>
          <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 12 }}>
            Dias de funcionamento
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {DIAS_SEMANA.map(({ key, abrev }) => (
              <View
                key={key}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: horarios[key].ativo ? cores.primaria.DEFAULT : cores.fundo.terciario,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: horarios[key].ativo ? cores.botao.texto : cores.texto.terciario,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {abrev.charAt(0)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Lista de Dias */}
        {DIAS_SEMANA.map(({ key, label }) => (
          <Card key={key} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600' }}>
                  {label}
                </Text>
                {horarios[key].ativo && (
                  <Text style={{ color: cores.texto.secundario, fontSize: 13, marginTop: 2 }}>
                    {horarios[key].abertura} às {horarios[key].fechamento}
                  </Text>
                )}
              </View>
              
              <Switch
                value={horarios[key].ativo}
                onValueChange={() => toggleDia(key)}
                trackColor={{ false: cores.borda.sutil, true: cores.primaria.DEFAULT + '50' }}
                thumbColor={horarios[key].ativo ? cores.primaria.DEFAULT : cores.texto.terciario}
              />
            </View>

            {horarios[key].ativo && (
              <View style={{ marginTop: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => abrirSeletorHora(key, 'abertura')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: cores.fundo.terciario,
                      padding: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>Abre às</Text>
                    <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600' }}>
                      {horarios[key].abertura}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => abrirSeletorHora(key, 'fechamento')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: cores.fundo.terciario,
                      padding: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>Fecha às</Text>
                    <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600' }}>
                      {horarios[key].fechamento}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => copiarParaTodos(key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="copy-outline" size={16} color={cores.primaria.DEFAULT} />
                  <Text style={{ color: cores.primaria.DEFAULT, fontSize: 13, fontWeight: '500' }}>
                    Copiar para todos os dias
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      {/* Botão Salvar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: insets.bottom + 20,
          backgroundColor: cores.fundo.primario,
          borderTopWidth: 1,
          borderTopColor: cores.borda.sutil,
        }}
      >
        <Botao
          titulo={salvando ? 'Salvando...' : 'Salvar Horários'}
          variante="primario"
          onPress={salvarHorarios}
          desabilitado={salvando}
        />
      </View>

      {/* Modal Seletor de Hora */}
      <Modal
        visivel={modalHoraAberto}
        onFechar={() => setModalHoraAberto(false)}
        titulo={tipoHora === 'abertura' ? 'Horário de Abertura' : 'Horário de Fechamento'}
        tamanho="grande"
        tema={tema}
      >
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HORAS_DISPONIVEIS.map((hora) => {
              const selecionado = diaEditando && horarios[diaEditando][tipoHora] === hora;
              return (
                <Pressable
                  key={hora}
                  onPress={() => selecionarHora(hora)}
                  style={{
                    width: '23%',
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: selecionado ? cores.primaria.DEFAULT : cores.fundo.terciario,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: selecionado ? cores.botao.texto : cores.texto.primario,
                      fontSize: 15,
                      fontWeight: selecionado ? '600' : '400',
                    }}
                  >
                    {hora}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}
