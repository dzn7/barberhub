/**
 * Tela de Relatórios
 * Visualização de métricas e gráficos do negócio
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  addMonths,
  eachDayOfInterval,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Card, CardMetrica, SeletorPeriodo, obterPeriodo } from '../../src/components/ui';
import { GraficoBarras, GraficoLinhas, GraficoPizza } from '../../src/components/graficos';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';
import type { PeriodoSelecionado } from '../../src/components/ui';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface MetricasResumo {
  totalAgendamentos: number;
  agendamentosConcluidos: number;
  agendamentosCancelados: number;
  taxaConclusao: number;
  receitaTotal: number;
  ticketMedio: number;
  novosClientes: number;
  clientesRecorrentes: number;
}

interface PontoDados {
  rotulo: string;
  valor: number;
}

export default function TelaRelatorios() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tenant } = useAutenticacao();
  const { profissional } = useTerminologia();
  
  const { cores, tema } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoSelecionado>(obterPeriodo('mes'));
  const [metricas, setMetricas] = useState<MetricasResumo>({
    totalAgendamentos: 0,
    agendamentosConcluidos: 0,
    agendamentosCancelados: 0,
    taxaConclusao: 0,
    receitaTotal: 0,
    ticketMedio: 0,
    novosClientes: 0,
    clientesRecorrentes: 0,
  });
  const [dadosReceitaDiaria, setDadosReceitaDiaria] = useState<PontoDados[]>([]);
  const [dadosPorProfissional, setDadosPorProfissional] = useState<{ nome: string; valor: number; cor: string }[]>([]);
  const [dadosPorServico, setDadosPorServico] = useState<{ nome: string; valor: number; cor: string }[]>([]);

  const carregarDados = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const dataInicio = format(periodo.dataInicio, 'yyyy-MM-dd');
      const dataFim = format(periodo.dataFim, 'yyyy-MM-dd');

      // Buscar agendamentos do período
      const { data: agendamentos, error: erroAgendamentos } = await supabase
        .from('agendamentos')
        .select(`
          *,
          servicos (id, nome, preco),
          barbeiros (id, nome)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', `${dataInicio}T00:00:00`)
        .lte('data_hora', `${dataFim}T23:59:59`);

      if (erroAgendamentos) throw erroAgendamentos;

      // Calcular métricas
      const concluidos = agendamentos?.filter(a => a.status === 'concluido') || [];
      const cancelados = agendamentos?.filter(a => a.status === 'cancelado') || [];
      const total = agendamentos?.length || 0;
      const receitaTotal = concluidos.reduce((acc, a) => acc + (a.servicos?.preco || 0), 0);

      setMetricas({
        totalAgendamentos: total,
        agendamentosConcluidos: concluidos.length,
        agendamentosCancelados: cancelados.length,
        taxaConclusao: total > 0 ? (concluidos.length / total) * 100 : 0,
        receitaTotal,
        ticketMedio: concluidos.length > 0 ? receitaTotal / concluidos.length : 0,
        novosClientes: 0,
        clientesRecorrentes: 0,
      });

      // Calcular receita diária
      const dias = eachDayOfInterval({ start: periodo.dataInicio, end: periodo.dataFim });
      const receitaPorDia: Record<string, number> = {};
      dias.forEach(dia => {
        receitaPorDia[format(dia, 'yyyy-MM-dd')] = 0;
      });
      concluidos.forEach(a => {
        const dia = format(parseISO(a.data_hora), 'yyyy-MM-dd');
        if (receitaPorDia[dia] !== undefined) {
          receitaPorDia[dia] += a.servicos?.preco || 0;
        }
      });

      const diasParaExibir = dias.length > 10 ? dias.filter((_, i) => i % Math.ceil(dias.length / 10) === 0) : dias;
      setDadosReceitaDiaria(
        diasParaExibir.map(d => ({
          rotulo: format(d, 'dd/MM'),
          valor: receitaPorDia[format(d, 'yyyy-MM-dd')] || 0,
        }))
      );

      // Calcular por profissional
      const receitaPorProfissional: Record<string, { nome: string; valor: number }> = {};
      concluidos.forEach(a => {
        const nome = a.barbeiros?.nome || 'Sem profissional';
        if (!receitaPorProfissional[nome]) {
          receitaPorProfissional[nome] = { nome, valor: 0 };
        }
        receitaPorProfissional[nome].valor += a.servicos?.preco || 0;
      });
      
      const coresProfissionais = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      setDadosPorProfissional(
        Object.values(receitaPorProfissional)
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 6)
          .map((p, i) => ({ ...p, cor: coresProfissionais[i % coresProfissionais.length] }))
      );

      // Calcular por serviço
      const receitaPorServico: Record<string, { nome: string; valor: number }> = {};
      concluidos.forEach(a => {
        const nome = a.servicos?.nome || 'Sem serviço';
        if (!receitaPorServico[nome]) {
          receitaPorServico[nome] = { nome, valor: 0 };
        }
        receitaPorServico[nome].valor += a.servicos?.preco || 0;
      });
      
      const coresServicos = ['#6366f1', '#22c55e', '#eab308', '#f43f5e', '#a855f7', '#14b8a6'];
      setDadosPorServico(
        Object.values(receitaPorServico)
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 6)
          .map((s, i) => ({ ...s, cor: coresServicos[i % coresServicos.length] }))
      );

    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id, periodo]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarDados();
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={cores.texto.primario} />
          </Pressable>
          <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '700' }}>
            Relatórios
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor={cores.primaria.DEFAULT}
          />
        }
      >
        {/* Seletor de Período */}
        <SeletorPeriodo
          periodo={periodo}
          onChange={setPeriodo}
          tema={tema}
        />

        {/* Métricas Principais */}
        <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
          Resumo do Período
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ width: (LARGURA_TELA - 52) / 2 }}>
            <CardMetrica
              titulo="Receita Total"
              valor={formatarMoeda(metricas.receitaTotal)}
              icone="cash"
              corIcone={cores.sucesso}
              tema={tema}
            />
          </View>
          <View style={{ width: (LARGURA_TELA - 52) / 2 }}>
            <CardMetrica
              titulo="Ticket Médio"
              valor={formatarMoeda(metricas.ticketMedio)}
              icone="pricetag"
              corIcone={cores.info}
              tema={tema}
            />
          </View>
          <View style={{ width: (LARGURA_TELA - 52) / 2 }}>
            <CardMetrica
              titulo="Agendamentos"
              valor={metricas.totalAgendamentos.toString()}
              icone="calendar"
              corIcone={cores.primaria.DEFAULT}
              tema={tema}
            />
          </View>
          <View style={{ width: (LARGURA_TELA - 52) / 2 }}>
            <CardMetrica
              titulo="Taxa Conclusão"
              valor={`${metricas.taxaConclusao.toFixed(0)}%`}
              icone="checkmark-circle"
              corIcone={metricas.taxaConclusao >= 70 ? cores.sucesso : cores.aviso}
              tema={tema}
            />
          </View>
        </View>

        {/* Gráfico de Receita Diária */}
        {dadosReceitaDiaria.length > 0 && (
          <>
            <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
              Receita Diária
            </Text>
            <GraficoLinhas
              dados={dadosReceitaDiaria}
              altura={200}
              tema={tema}
              formatarValor={(v) => `R$${v}`}
            />
          </>
        )}

        {/* Gráfico por Profissional */}
        {dadosPorProfissional.length > 0 && (
          <>
            <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
              Receita por {profissional()}
            </Text>
            <GraficoPizza
              dados={dadosPorProfissional}
              altura={220}
              tema={tema}
              formatarValor={formatarMoeda}
            />
          </>
        )}

        {/* Gráfico por Serviço */}
        {dadosPorServico.length > 0 && (
          <>
            <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
              Receita por Serviço
            </Text>
            <GraficoPizza
              dados={dadosPorServico}
              altura={220}
              tema={tema}
              formatarValor={formatarMoeda}
            />
          </>
        )}

        {/* Status dos Agendamentos */}
        <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
          Status dos Agendamentos
        </Text>
        <Card>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cores.sucesso }} />
                <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>Concluídos</Text>
              </View>
              <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600' }}>
                {metricas.agendamentosConcluidos}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cores.erro }} />
                <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>Cancelados</Text>
              </View>
              <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600' }}>
                {metricas.agendamentosCancelados}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cores.aviso }} />
                <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>Outros</Text>
              </View>
              <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600' }}>
                {metricas.totalAgendamentos - metricas.agendamentosConcluidos - metricas.agendamentosCancelados}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
