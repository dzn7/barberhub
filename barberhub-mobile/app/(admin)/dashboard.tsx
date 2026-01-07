/**
 * Tela Dashboard
 * Visão geral completa com métricas, gráficos e próximos agendamentos
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, parseISO, subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Card, Avatar, CardMetrica, SeletorPeriodo, obterPeriodo } from '../../src/components/ui';
import type { PeriodoSelecionado } from '../../src/components/ui';
import { GraficoLinhas, GraficoBarras, GraficoPizza } from '../../src/components/graficos';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';
import type { Agendamento } from '../../src/types';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface MetricasDashboard {
  agendamentosHoje: number;
  agendamentosPeriodo: number;
  receitaPeriodo: number;
  despesasPeriodo: number;
  lucroLiquido: number;
  ticketMedio: number;
  atendimentosConcluidos: number;
}

interface DadosGrafico {
  rotulo: string;
  valor: number;
}

interface DadosPorCategoria {
  nome: string;
  valor: number;
  cor: string;
}

export default function TelaDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { usuario, tenant } = useAutenticacao();
  const { profissional, ehNailDesigner } = useTerminologia();
  
  const { cores, tema } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoSelecionado>(obterPeriodo('mes'));
  const [metricas, setMetricas] = useState<MetricasDashboard>({
    agendamentosHoje: 0,
    agendamentosPeriodo: 0,
    receitaPeriodo: 0,
    despesasPeriodo: 0,
    lucroLiquido: 0,
    ticketMedio: 0,
    atendimentosConcluidos: 0,
  });
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Agendamento[]>([]);
  const [dadosGraficoReceita, setDadosGraficoReceita] = useState<DadosGrafico[]>([]);
  const [dadosGraficoProfissionais, setDadosGraficoProfissionais] = useState<DadosPorCategoria[]>([]);
  const [dadosGraficoServicos, setDadosGraficoServicos] = useState<DadosPorCategoria[]>([]);

  const coresProfissionais = useMemo(() => [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ], []);

  const coresServicos = useMemo(() => [
    '#6366f1', '#22c55e', '#eab308', '#f97316', '#a855f7', '#14b8a6', '#f43f5e', '#0ea5e9'
  ], []);

  const carregarDados = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const hoje = new Date();
      const inicioHoje = startOfDay(hoje);
      const fimHoje = endOfDay(hoje);

      // Agendamentos de hoje
      const { count: countHoje } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenant.id)
        .gte('data_hora', inicioHoje.toISOString())
        .lte('data_hora', fimHoje.toISOString())
        .in('status', ['pendente', 'confirmado']);

      // Próximos agendamentos
      const { data: proximos } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes (id, nome, telefone),
          barbeiros (id, nome),
          servicos (id, nome, preco, duracao)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', new Date().toISOString())
        .in('status', ['pendente', 'confirmado'])
        .order('data_hora', { ascending: true })
        .limit(5);

      // Agendamentos do período
      const { count: countPeriodo } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenant.id)
        .gte('data_hora', periodo.dataInicio.toISOString())
        .lte('data_hora', periodo.dataFim.toISOString())
        .in('status', ['pendente', 'confirmado', 'concluido']);

      // Atendimentos concluídos no período
      const { count: countConcluidos } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenant.id)
        .gte('data_hora', periodo.dataInicio.toISOString())
        .lte('data_hora', periodo.dataFim.toISOString())
        .eq('status', 'concluido');

      // Receitas do período
      const { data: receitasPeriodo } = await supabase
        .from('transacoes')
        .select('valor, data')
        .eq('tenant_id', tenant.id)
        .eq('tipo', 'receita')
        .gte('data', format(periodo.dataInicio, 'yyyy-MM-dd'))
        .lte('data', format(periodo.dataFim, 'yyyy-MM-dd'));

      const receitaPeriodo = receitasPeriodo?.reduce((acc, t) => acc + Number(t.valor), 0) || 0;

      // Despesas do período
      const { data: despesasPeriodo } = await supabase
        .from('transacoes')
        .select('valor')
        .eq('tenant_id', tenant.id)
        .eq('tipo', 'despesa')
        .gte('data', format(periodo.dataInicio, 'yyyy-MM-dd'))
        .lte('data', format(periodo.dataFim, 'yyyy-MM-dd'));

      const despesaPeriodo = despesasPeriodo?.reduce((acc, t) => acc + Number(t.valor), 0) || 0;
      const lucroLiquido = receitaPeriodo - despesaPeriodo;
      const totalAtendimentos = countConcluidos || 0;
      const ticketMedio = totalAtendimentos > 0 ? receitaPeriodo / totalAtendimentos : 0;

      setMetricas({
        agendamentosHoje: countHoje || 0,
        agendamentosPeriodo: countPeriodo || 0,
        receitaPeriodo,
        despesasPeriodo: despesaPeriodo,
        lucroLiquido,
        ticketMedio,
        atendimentosConcluidos: totalAtendimentos,
      });

      // Dados para gráfico de receita dos últimos 7 dias
      const ultimos7Dias = eachDayOfInterval({
        start: subDays(hoje, 6),
        end: hoje,
      });

      const dadosReceita: DadosGrafico[] = await Promise.all(
        ultimos7Dias.map(async (dia) => {
          const { data } = await supabase
            .from('transacoes')
            .select('valor')
            .eq('tenant_id', tenant.id)
            .eq('tipo', 'receita')
            .eq('data', format(dia, 'yyyy-MM-dd'));

          const total = data?.reduce((acc, t) => acc + Number(t.valor), 0) || 0;
          return {
            rotulo: format(dia, 'EEE', { locale: ptBR }).charAt(0).toUpperCase() + format(dia, 'EEE', { locale: ptBR }).slice(1, 3),
            valor: total,
          };
        })
      );
      setDadosGraficoReceita(dadosReceita);

      // Dados por profissional
      const { data: agendamentosPorProfissional } = await supabase
        .from('agendamentos')
        .select(`
          barbeiro_id,
          barbeiros (nome),
          servicos (preco)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', periodo.dataInicio.toISOString())
        .lte('data_hora', periodo.dataFim.toISOString())
        .eq('status', 'concluido');

      const agrupamentoProfissionais: { [key: string]: { nome: string; total: number } } = {};
      agendamentosPorProfissional?.forEach((ag: any) => {
        const nome = ag.barbeiros?.nome || 'Sem profissional';
        const preco = ag.servicos?.preco || 0;
        if (!agrupamentoProfissionais[nome]) {
          agrupamentoProfissionais[nome] = { nome, total: 0 };
        }
        agrupamentoProfissionais[nome].total += preco;
      });

      const dadosProfissionais: DadosPorCategoria[] = Object.values(agrupamentoProfissionais)
        .map((p, i) => ({
          nome: p.nome,
          valor: p.total,
          cor: coresProfissionais[i % coresProfissionais.length],
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);
      setDadosGraficoProfissionais(dadosProfissionais);

      // Dados por serviço
      const { data: agendamentosPorServico } = await supabase
        .from('agendamentos')
        .select(`
          servico_id,
          servicos (nome, preco)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', periodo.dataInicio.toISOString())
        .lte('data_hora', periodo.dataFim.toISOString())
        .eq('status', 'concluido');

      const agrupamentoServicos: { [key: string]: { nome: string; total: number } } = {};
      agendamentosPorServico?.forEach((ag: any) => {
        const nome = ag.servicos?.nome || 'Sem serviço';
        const preco = ag.servicos?.preco || 0;
        if (!agrupamentoServicos[nome]) {
          agrupamentoServicos[nome] = { nome, total: 0 };
        }
        agrupamentoServicos[nome].total += preco;
      });

      const dadosServicos: DadosPorCategoria[] = Object.values(agrupamentoServicos)
        .map((s, i) => ({
          nome: s.nome,
          valor: s.total,
          cor: coresServicos[i % coresServicos.length],
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);
      setDadosGraficoServicos(dadosServicos);

      setProximosAgendamentos(proximos || []);
    } catch (erro) {
      console.error('Erro ao carregar dashboard:', erro);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id, periodo, coresProfissionais, coresServicos]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarDados();
  };

  const formatarDataAgendamento = (dataHora: string) => {
    const data = parseISO(dataHora);
    if (isToday(data)) {
      return `Hoje às ${format(data, 'HH:mm')}`;
    }
    if (isTomorrow(data)) {
      return `Amanhã às ${format(data, 'HH:mm')}`;
    }
    return format(data, "EEEE, dd 'às' HH:mm", { locale: ptBR });
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor={cores.primaria.DEFAULT}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 20,
            backgroundColor: cores.fundo.secundario,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>
                Olá, {usuario?.nome?.split(' ')[0] || 'Usuário'}
              </Text>
              <Text
                style={{
                  color: cores.texto.primario,
                  fontSize: 20,
                  fontWeight: '700',
                  marginTop: 4,
                }}
                numberOfLines={1}
              >
                {tenant?.nome || 'Minha Barbearia'}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/(admin)/configuracoes')}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: cores.transparente.branco10,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="notifications-outline" size={22} color={cores.texto.primario} />
            </Pressable>
          </View>
        </View>

        {/* Header com Seletor de Período */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text
              style={{
                color: cores.texto.primario,
                fontSize: 18,
                fontWeight: '600',
              }}
            >
              Resumo
            </Text>
            <SeletorPeriodo
              periodo={periodo}
              onChange={setPeriodo}
              tema={tema}
              opcoes={['hoje', 'semana', 'mes', 'ano', 'geral']}
            />
          </View>

          {/* Métricas Principais */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <CardMetrica
              titulo="Hoje"
              valor={String(metricas.agendamentosHoje)}
              icone="today-outline"
              tema={tema}
              corIcone={cores.info}
            />
            <CardMetrica
              titulo="Receita"
              valor={formatarMoeda(metricas.receitaPeriodo)}
              icone="wallet-outline"
              tema={tema}
              corIcone="#22c55e"
            />
            <CardMetrica
              titulo="Despesas"
              valor={formatarMoeda(metricas.despesasPeriodo)}
              icone="card-outline"
              tema={tema}
              corIcone="#ef4444"
            />
            <CardMetrica
              titulo="Lucro"
              valor={formatarMoeda(metricas.lucroLiquido)}
              icone="trending-up-outline"
              tema={tema}
              corIcone={metricas.lucroLiquido >= 0 ? '#22c55e' : '#ef4444'}
            />
            <CardMetrica
              titulo="Ticket Médio"
              valor={formatarMoeda(metricas.ticketMedio)}
              icone="pricetag-outline"
              tema={tema}
              corIcone="#8b5cf6"
            />
            <CardMetrica
              titulo="Atendimentos"
              valor={String(metricas.atendimentosConcluidos)}
              icone="checkmark-circle-outline"
              tema={tema}
              corIcone="#06b6d4"
            />
          </ScrollView>
        </View>

        {/* Gráfico de Receita */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <GraficoLinhas
            dados={dadosGraficoReceita}
            titulo="Receita dos Últimos 7 Dias"
            subtitulo="Evolução diária da receita"
            tema={tema}
            corLinha="#22c55e"
            prefixo="R$ "
            altura={180}
            largura={LARGURA_TELA - 72}
          />
        </View>

        {/* Gráficos de Pizza */}
        {dadosGraficoProfissionais.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <GraficoPizza
              dados={dadosGraficoProfissionais}
              titulo={`Receita por ${profissional()}`}
              subtitulo={`Top 5 ${profissional(true).toLowerCase()} no período`}
              tema={tema}
              altura={160}
              largura={LARGURA_TELA - 72}
              valorCentral={formatarMoeda(dadosGraficoProfissionais.reduce((acc, d) => acc + d.valor, 0))}
              labelCentral="Total"
            />
          </View>
        )}

        {dadosGraficoServicos.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <GraficoPizza
              dados={dadosGraficoServicos}
              titulo="Receita por Serviço"
              subtitulo="Top 5 serviços mais realizados"
              tema={tema}
              altura={160}
              largura={LARGURA_TELA - 72}
              valorCentral={formatarMoeda(dadosGraficoServicos.reduce((acc, d) => acc + d.valor, 0))}
              labelCentral="Total"
            />
          </View>
        )}

        {/* Próximos Agendamentos */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text
              style={{
                color: cores.texto.primario,
                fontSize: 18,
                fontWeight: '600',
              }}
            >
              Próximos Agendamentos
            </Text>
            <Pressable onPress={() => router.push('/(admin)/agendamentos')}>
              <Text style={{ color: cores.primaria.DEFAULT, fontSize: 14 }}>
                Ver todos
              </Text>
            </Pressable>
          </View>

          {proximosAgendamentos.length === 0 ? (
            <Card variante="sutil">
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="calendar-outline" size={48} color={cores.texto.terciario} />
                <Text
                  style={{
                    color: cores.texto.secundario,
                    marginTop: 12,
                    textAlign: 'center',
                  }}
                >
                  Nenhum agendamento próximo
                </Text>
              </View>
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              {proximosAgendamentos.map((agendamento) => (
                <Card key={agendamento.id} pressionavel onPress={() => {}}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar
                      nome={agendamento.clientes?.nome}
                      tamanho="md"
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: cores.texto.primario,
                          fontSize: 16,
                          fontWeight: '600',
                        }}
                      >
                        {agendamento.clientes?.nome || 'Cliente'}
                      </Text>
                      <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>
                        {agendamento.servicos?.nome}
                      </Text>
                      <Text style={{ color: cores.primaria.DEFAULT, fontSize: 13, marginTop: 2 }}>
                        {formatarDataAgendamento(agendamento.data_hora)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          color: cores.texto.primario,
                          fontSize: 16,
                          fontWeight: '600',
                        }}
                      >
                        {formatarMoeda(agendamento.servicos?.preco || 0)}
                      </Text>
                      <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                        {agendamento.servicos?.duracao} min
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Ações Rápidas */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <Text
            style={{
              color: cores.texto.primario,
              fontSize: 18,
              fontWeight: '600',
              marginBottom: 16,
            }}
          >
            Ações Rápidas
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              style={{
                flex: 1,
                backgroundColor: cores.primaria.DEFAULT,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Ionicons name="add-circle" size={28} color={cores.texto.invertido} />
              <Text
                style={{
                  color: cores.texto.invertido,
                  marginTop: 8,
                  fontWeight: '600',
                }}
              >
                Novo Agendamento
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(admin)/barbeiros')}
              style={{
                flex: 1,
                backgroundColor: cores.fundo.card,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: cores.borda.sutil,
              }}
            >
              <Ionicons name="person-add" size={28} color={cores.primaria.DEFAULT} />
              <Text
                style={{
                  color: cores.texto.primario,
                  marginTop: 8,
                  fontWeight: '600',
                }}
              >
                Novo Profissional
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
