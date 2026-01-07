/**
 * Tela de Gestão Financeira
 * Controle completo de receitas, despesas e relatórios financeiros
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Card, SeletorPeriodo, obterPeriodo, Modal, ModalConfirmacao, Botao, Input } from '../../src/components/ui';
import type { PeriodoSelecionado } from '../../src/components/ui';
import { GraficoLinhas, GraficoBarras, GraficoPizza } from '../../src/components/graficos';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface Transacao {
  id: string;
  tenant_id: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  forma_pagamento?: string;
  created_at: string;
}

interface ResumoFinanceiro {
  receitaTotal: number;
  despesaTotal: number;
  lucroLiquido: number;
  ticketMedio: number;
  totalTransacoes: number;
}

interface DadosCategoria {
  nome: string;
  valor: number;
  cor: string;
}

type AbaAtiva = 'resumo' | 'receitas' | 'despesas';

const CATEGORIAS_RECEITA = [
  'Serviços',
  'Produtos',
  'Comissão',
  'Outros',
];

const CATEGORIAS_DESPESA = [
  'Aluguel',
  'Energia',
  'Água',
  'Internet',
  'Produtos',
  'Equipamentos',
  'Salários',
  'Marketing',
  'Manutenção',
  'Impostos',
  'Outros',
];

const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Transferência',
];

export default function TelaFinanceiro() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tenant } = useAutenticacao();
  
  const { cores, tema } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoSelecionado>(obterPeriodo('mes'));
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('resumo');
  
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro>({
    receitaTotal: 0,
    despesaTotal: 0,
    lucroLiquido: 0,
    ticketMedio: 0,
    totalTransacoes: 0,
  });

  const [dadosGraficoReceita, setDadosGraficoReceita] = useState<{ rotulo: string; valor: number }[]>([]);
  const [dadosPorCategoria, setDadosPorCategoria] = useState<DadosCategoria[]>([]);

  // Modal de nova transação
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'receita' | 'despesa'>('receita');
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    categoria: '',
    forma_pagamento: '',
    data: format(new Date(), 'yyyy-MM-dd'),
  });
  const [salvando, setSalvando] = useState(false);

  // Modal de confirmação de exclusão
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState<Transacao | null>(null);

  const coresCategorias = useMemo(() => [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6',
  ], []);

  const carregarDados = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      // Buscar transações do período
      const { data: transacoesData, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('data', format(periodo.dataInicio, 'yyyy-MM-dd'))
        .lte('data', format(periodo.dataFim, 'yyyy-MM-dd'))
        .order('data', { ascending: false });

      if (error) throw error;

      setTransacoes(transacoesData || []);

      // Calcular resumo
      const receitas = transacoesData?.filter(t => t.tipo === 'receita') || [];
      const despesas = transacoesData?.filter(t => t.tipo === 'despesa') || [];

      const receitaTotal = receitas.reduce((acc, t) => acc + Number(t.valor), 0);
      const despesaTotal = despesas.reduce((acc, t) => acc + Number(t.valor), 0);
      const lucroLiquido = receitaTotal - despesaTotal;
      const ticketMedio = receitas.length > 0 ? receitaTotal / receitas.length : 0;

      setResumo({
        receitaTotal,
        despesaTotal,
        lucroLiquido,
        ticketMedio,
        totalTransacoes: transacoesData?.length || 0,
      });

      // Dados para gráfico de evolução
      const transacoesPorDia: { [key: string]: { receita: number; despesa: number } } = {};
      transacoesData?.forEach(t => {
        const dia = t.data;
        if (!transacoesPorDia[dia]) {
          transacoesPorDia[dia] = { receita: 0, despesa: 0 };
        }
        if (t.tipo === 'receita') {
          transacoesPorDia[dia].receita += Number(t.valor);
        } else {
          transacoesPorDia[dia].despesa += Number(t.valor);
        }
      });

      const dadosGrafico = Object.entries(transacoesPorDia)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([data, valores]) => ({
          rotulo: format(parseISO(data), 'dd/MM'),
          valor: valores.receita - valores.despesa,
        }));
      setDadosGraficoReceita(dadosGrafico);

      // Dados por categoria
      const categoriasAgrupadas: { [key: string]: number } = {};
      transacoesData?.forEach(t => {
        const cat = t.categoria || 'Outros';
        if (!categoriasAgrupadas[cat]) {
          categoriasAgrupadas[cat] = 0;
        }
        categoriasAgrupadas[cat] += Number(t.valor);
      });

      const dadosCategorias: DadosCategoria[] = Object.entries(categoriasAgrupadas)
        .map(([nome, valor], i) => ({
          nome,
          valor,
          cor: coresCategorias[i % coresCategorias.length],
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6);
      setDadosPorCategoria(dadosCategorias);

    } catch (erro) {
      console.error('Erro ao carregar dados financeiros:', erro);
      Alert.alert('Erro', 'Não foi possível carregar os dados financeiros.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id, periodo, coresCategorias]);

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

  const abrirModalNovaTransacao = (tipo: 'receita' | 'despesa') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTipoTransacao(tipo);
    setFormData({
      descricao: '',
      valor: '',
      categoria: tipo === 'receita' ? CATEGORIAS_RECEITA[0] : CATEGORIAS_DESPESA[0],
      forma_pagamento: FORMAS_PAGAMENTO[0],
      data: format(new Date(), 'yyyy-MM-dd'),
    });
    setModalAberto(true);
  };

  const salvarTransacao = async () => {
    if (!tenant?.id || !formData.descricao || !formData.valor) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const valorNumerico = parseFloat(formData.valor.replace(',', '.'));
      
      const { error } = await supabase
        .from('transacoes')
        .insert({
          tenant_id: tenant.id,
          tipo: tipoTransacao,
          descricao: formData.descricao.trim(),
          valor: valorNumerico,
          categoria: formData.categoria,
          forma_pagamento: formData.forma_pagamento,
          data: formData.data,
        });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalAberto(false);
      carregarDados();
    } catch (erro) {
      console.error('Erro ao salvar transação:', erro);
      Alert.alert('Erro', 'Não foi possível salvar a transação.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirTransacao = async () => {
    if (!transacaoParaExcluir) return;

    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', transacaoParaExcluir.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTransacaoParaExcluir(null);
      carregarDados();
    } catch (erro) {
      console.error('Erro ao excluir transação:', erro);
      Alert.alert('Erro', 'Não foi possível excluir a transação.');
    }
  };

  const receitas = useMemo(() => transacoes.filter(t => t.tipo === 'receita'), [transacoes]);
  const despesas = useMemo(() => transacoes.filter(t => t.tipo === 'despesa'), [transacoes]);

  const renderTransacao = ({ item }: { item: Transacao }) => {
    const ehReceita = item.tipo === 'receita';
    return (
      <Pressable
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTransacaoParaExcluir(item);
        }}
        style={{
          backgroundColor: cores.fundo.card,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: cores.borda.sutil,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: ehReceita ? '#22c55e20' : '#ef444420',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={ehReceita ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color={ehReceita ? '#22c55e' : '#ef4444'}
            />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: cores.texto.primario,
                fontSize: 15,
                fontWeight: '600',
              }}
              numberOfLines={1}
            >
              {item.descricao}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                {item.categoria}
              </Text>
              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: cores.texto.terciario }} />
              <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                {format(parseISO(item.data), 'dd/MM/yyyy')}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: ehReceita ? '#22c55e' : '#ef4444',
              fontSize: 16,
              fontWeight: '700',
            }}
          >
            {ehReceita ? '+' : '-'} {formatarMoeda(item.valor)}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderResumo = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Cards de Resumo */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: cores.fundo.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: cores.borda.sutil,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#22c55e20',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="trending-up" size={18} color="#22c55e" />
            </View>
            <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>Receitas</Text>
          </View>
          <Text
            style={{
              color: '#22c55e',
              fontSize: 22,
              fontWeight: '700',
              marginTop: 12,
            }}
          >
            {formatarMoeda(resumo.receitaTotal)}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: cores.fundo.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: cores.borda.sutil,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#ef444420',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="trending-down" size={18} color="#ef4444" />
            </View>
            <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>Despesas</Text>
          </View>
          <Text
            style={{
              color: '#ef4444',
              fontSize: 22,
              fontWeight: '700',
              marginTop: 12,
            }}
          >
            {formatarMoeda(resumo.despesaTotal)}
          </Text>
        </View>
      </View>

      {/* Lucro Líquido */}
      <View
        style={{
          backgroundColor: cores.fundo.card,
          borderRadius: 16,
          padding: 20,
          marginTop: 12,
          borderWidth: 1,
          borderColor: cores.borda.sutil,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: cores.texto.terciario, fontSize: 13 }}>Lucro Líquido</Text>
            <Text
              style={{
                color: resumo.lucroLiquido >= 0 ? '#22c55e' : '#ef4444',
                fontSize: 28,
                fontWeight: '700',
                marginTop: 4,
              }}
            >
              {formatarMoeda(resumo.lucroLiquido)}
            </Text>
          </View>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: resumo.lucroLiquido >= 0 ? '#22c55e20' : '#ef444420',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={resumo.lucroLiquido >= 0 ? 'checkmark-circle' : 'alert-circle'}
              size={32}
              color={resumo.lucroLiquido >= 0 ? '#22c55e' : '#ef4444'}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: cores.borda.sutil,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>Ticket Médio</Text>
            <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600', marginTop: 4 }}>
              {formatarMoeda(resumo.ticketMedio)}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>Transações</Text>
            <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600', marginTop: 4 }}>
              {resumo.totalTransacoes}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>Margem</Text>
            <Text
              style={{
                color: resumo.lucroLiquido >= 0 ? '#22c55e' : '#ef4444',
                fontSize: 15,
                fontWeight: '600',
                marginTop: 4,
              }}
            >
              {resumo.receitaTotal > 0
                ? `${((resumo.lucroLiquido / resumo.receitaTotal) * 100).toFixed(1)}%`
                : '0%'}
            </Text>
          </View>
        </View>
      </View>

      {/* Gráfico de Evolução */}
      {dadosGraficoReceita.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <GraficoLinhas
            dados={dadosGraficoReceita}
            titulo="Evolução do Resultado"
            subtitulo="Receitas menos despesas por dia"
            tema={tema}
            corLinha={resumo.lucroLiquido >= 0 ? '#22c55e' : '#ef4444'}
            prefixo="R$ "
            altura={180}
            largura={LARGURA_TELA - 72}
          />
        </View>
      )}

      {/* Gráfico por Categoria */}
      {dadosPorCategoria.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <GraficoPizza
            dados={dadosPorCategoria}
            titulo="Distribuição por Categoria"
            subtitulo="Top 6 categorias no período"
            tema={tema}
            altura={160}
            largura={LARGURA_TELA - 72}
            valorCentral={formatarMoeda(dadosPorCategoria.reduce((acc, d) => acc + d.valor, 0))}
            labelCentral="Total"
          />
        </View>
      )}
    </ScrollView>
  );

  const renderListaTransacoes = (lista: Transacao[]) => (
    <FlatList
      data={lista}
      keyExtractor={(item) => item.id}
      renderItem={renderTransacao}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Ionicons name="receipt-outline" size={64} color={cores.texto.terciario} />
          <Text
            style={{
              color: cores.texto.secundario,
              fontSize: 16,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Nenhuma transação encontrada
          </Text>
        </View>
      }
    />
  );

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={cores.texto.primario} />
          </Pressable>
          <Text
            style={{
              color: cores.texto.primario,
              fontSize: 18,
              fontWeight: '700',
            }}
          >
            Financeiro
          </Text>
          <SeletorPeriodo
            periodo={periodo}
            onChange={setPeriodo}
            tema={tema}
          />
        </View>

        {/* Abas */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 20,
            backgroundColor: cores.fundo.terciario,
            borderRadius: 12,
            padding: 4,
          }}
        >
          {(['resumo', 'receitas', 'despesas'] as AbaAtiva[]).map((aba) => (
            <Pressable
              key={aba}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAbaAtiva(aba);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: abaAtiva === aba ? cores.fundo.primario : 'transparent',
              }}
            >
              <Text
                style={{
                  color: abaAtiva === aba ? cores.texto.primario : cores.texto.terciario,
                  fontSize: 14,
                  fontWeight: abaAtiva === aba ? '600' : '400',
                  textAlign: 'center',
                  textTransform: 'capitalize',
                }}
              >
                {aba}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Conteúdo */}
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {abaAtiva === 'resumo' && renderResumo()}
        {abaAtiva === 'receitas' && renderListaTransacoes(receitas)}
        {abaAtiva === 'despesas' && renderListaTransacoes(despesas)}
      </View>

      {/* Botões de Ação Flutuantes */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          left: 20,
          right: 20,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => abrirModalNovaTransacao('despesa')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#ef4444',
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <Ionicons name="remove-circle" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            Nova Despesa
          </Text>
        </Pressable>

        <Pressable
          onPress={() => abrirModalNovaTransacao('receita')}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#22c55e',
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            Nova Receita
          </Text>
        </Pressable>
      </View>

      {/* Modal Nova Transação */}
      <Modal
        visivel={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={tipoTransacao === 'receita' ? 'Nova Receita' : 'Nova Despesa'}
        tamanho="grande"
        tema={tema}
      >
        <View style={{ gap: 16 }}>
          <Input
            rotulo="Descrição *"
            placeholder="Ex: Corte de cabelo"
            value={formData.descricao}
            onChangeText={(v) => setFormData({ ...formData, descricao: v })}
          />

          <Input
            rotulo="Valor (R$) *"
            placeholder="0,00"
            value={formData.valor}
            onChangeText={(v) => setFormData({ ...formData, valor: v })}
            keyboardType="decimal-pad"
          />

          <View>
            <Text style={{ color: cores.texto.secundario, fontSize: 14, marginBottom: 8 }}>
              Categoria
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(tipoTransacao === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setFormData({ ...formData, categoria: cat })}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: formData.categoria === cat
                        ? cores.primaria.DEFAULT
                        : cores.fundo.terciario,
                    }}
                  >
                    <Text
                      style={{
                        color: formData.categoria === cat
                          ? cores.botao.texto
                          : cores.texto.secundario,
                        fontSize: 13,
                        fontWeight: formData.categoria === cat ? '600' : '400',
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View>
            <Text style={{ color: cores.texto.secundario, fontSize: 14, marginBottom: 8 }}>
              Forma de Pagamento
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FORMAS_PAGAMENTO.map((forma) => (
                  <Pressable
                    key={forma}
                    onPress={() => setFormData({ ...formData, forma_pagamento: forma })}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: formData.forma_pagamento === forma
                        ? cores.primaria.DEFAULT
                        : cores.fundo.terciario,
                    }}
                  >
                    <Text
                      style={{
                        color: formData.forma_pagamento === forma
                          ? cores.botao.texto
                          : cores.texto.secundario,
                        fontSize: 13,
                        fontWeight: formData.forma_pagamento === forma ? '600' : '400',
                      }}
                    >
                      {forma}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <Botao
            titulo={salvando ? 'Salvando...' : 'Salvar Transação'}
            variante="primario"
            onPress={salvarTransacao}
            desabilitado={salvando || !formData.descricao || !formData.valor}
          />
        </View>
      </Modal>

      {/* Modal Confirmação Exclusão */}
      <ModalConfirmacao
        visivel={!!transacaoParaExcluir}
        onFechar={() => setTransacaoParaExcluir(null)}
        titulo="Excluir Transação"
        mensagem={`Deseja realmente excluir "${transacaoParaExcluir?.descricao}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        textoCancelar="Cancelar"
        onConfirmar={excluirTransacao}
        tema={tema}
        tipo="perigo"
      />
    </View>
  );
}
