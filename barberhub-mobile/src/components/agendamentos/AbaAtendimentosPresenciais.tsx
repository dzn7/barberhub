import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { endOfDay, format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Card, Input, Modal } from '../ui';
import { supabase } from '../../services/supabase';
import { obterCores, TemaType } from '../../constants/cores';

type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'transferencia';

interface BarbeiroSimples {
  id: string;
  nome: string;
}

interface ServicoSimples {
  id: string;
  nome: string;
  preco: number;
}

interface AtendimentoPresencial {
  id: string;
  tenant_id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  barbeiro_id: string;
  servico_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  data: string;
  barbeiros?: { nome: string };
  servicos?: { nome: string };
}

interface AbaAtendimentosPresenciaisProps {
  tenantId: string;
  tema?: TemaType;
}

const FORMAS_PAGAMENTO: { id: FormaPagamento; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'dinheiro', label: 'Dinheiro', icone: 'cash' },
  { id: 'pix', label: 'PIX', icone: 'qr-code' },
  { id: 'debito', label: 'Débito', icone: 'card' },
  { id: 'credito', label: 'Crédito', icone: 'card' },
  { id: 'transferencia', label: 'Transferência', icone: 'swap-horizontal' },
];

export function AbaAtendimentosPresenciais({ tenantId, tema = 'escuro' }: AbaAtendimentosPresenciaisProps) {
  const cores = obterCores(tema);

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [barbeiros, setBarbeiros] = useState<BarbeiroSimples[]>([]);
  const [servicos, setServicos] = useState<ServicoSimples[]>([]);
  const [atendimentos, setAtendimentos] = useState<AtendimentoPresencial[]>([]);

  const [modalAberto, setModalAberto] = useState(false);

  const [form, setForm] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    barbeiro_id: '',
    servico_id: '',
    valor: '',
    forma_pagamento: 'dinheiro' as FormaPagamento,
  });

  const carregarDadosBase = useCallback(async () => {
    try {
      const [{ data: barbeirosData, error: erroBarbeiros }, { data: servicosData, error: erroServicos }] = await Promise.all([
        supabase.from('barbeiros').select('id, nome').eq('tenant_id', tenantId).eq('ativo', true).order('nome'),
        supabase.from('servicos').select('id, nome, preco').eq('tenant_id', tenantId).eq('ativo', true).order('ordem_exibicao'),
      ]);

      if (erroBarbeiros) throw erroBarbeiros;
      if (erroServicos) throw erroServicos;

      setBarbeiros((barbeirosData || []) as any);
      setServicos((servicosData || []) as any);

      setForm((prev) => ({
        ...prev,
        barbeiro_id: prev.barbeiro_id || barbeirosData?.[0]?.id || '',
      }));
    } catch (erro) {
      console.error('Erro ao carregar barbeiros/serviços:', erro);
    }
  }, [tenantId]);

  const carregarAtendimentos = useCallback(async () => {
    try {
      const hoje = new Date();
      const inicio = startOfDay(hoje).toISOString();
      const fim = endOfDay(hoje).toISOString();

      const { data, error } = await supabase
        .from('atendimentos_presenciais')
        .select(
          `
          *,
          barbeiros (nome),
          servicos (nome)
        `
        )
        .eq('tenant_id', tenantId)
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: false });

      if (error) throw error;
      setAtendimentos((data || []) as any);
    } catch (erro) {
      console.error('Erro ao carregar atendimentos presenciais:', erro);
      setAtendimentos([]);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenantId]);

  useEffect(() => {
    carregarDadosBase();
    carregarAtendimentos();
  }, [carregarDadosBase, carregarAtendimentos]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarAtendimentos();
  };

  const servicoSelecionado = useMemo(() => servicos.find(s => s.id === form.servico_id) || null, [servicos, form.servico_id]);

  useEffect(() => {
    if (servicoSelecionado && (!form.valor || Number(form.valor) === 0)) {
      setForm(prev => ({ ...prev, valor: String(servicoSelecionado.preco) }));
    }
  }, [servicoSelecionado]);

  const abrirModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!form.cliente_nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome do cliente.');
      return;
    }
    if (!form.barbeiro_id) {
      Alert.alert('Atenção', 'Selecione um profissional.');
      return;
    }
    if (!form.servico_id) {
      Alert.alert('Atenção', 'Selecione um serviço.');
      return;
    }

    const valorNumero = Number(form.valor);
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase
        .from('atendimentos_presenciais')
        .insert({
          tenant_id: tenantId,
          cliente_nome: form.cliente_nome.trim(),
          cliente_telefone: form.cliente_telefone.trim() || null,
          barbeiro_id: form.barbeiro_id,
          servico_id: form.servico_id,
          valor: valorNumero,
          forma_pagamento: form.forma_pagamento,
          data: new Date().toISOString(),
        });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalAberto(false);
      setForm((prev) => ({
        ...prev,
        cliente_nome: '',
        cliente_telefone: '',
        servico_id: '',
        valor: '',
        forma_pagamento: 'dinheiro',
      }));
      carregarAtendimentos();
    } catch (erro) {
      console.error('Erro ao salvar atendimento presencial:', erro);
      Alert.alert('Erro', 'Não foi possível salvar o atendimento presencial.');
    } finally {
      setSalvando(false);
    }
  };

  const renderItem = ({ item }: { item: AtendimentoPresencial }) => (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '700' }}>
              {item.cliente_nome}
            </Text>
            <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>
              {format(parseISO(item.data), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </Text>
          </View>
          <Text style={{ color: cores.sucesso, fontSize: 15, fontWeight: '800' }}>
            R$ {Number(item.valor).toFixed(2)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
            {item.barbeiros?.nome || 'Profissional'} • {item.servicos?.nome || 'Serviço'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="card" size={14} color={cores.texto.terciario} />
            <Text style={{ color: cores.texto.terciario, fontSize: 12, fontWeight: '600' }}>
              {item.forma_pagamento}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );

  if (carregando) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator color={cores.primaria.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
        <Pressable
          onPress={abrirModal}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: '#ffffff',
          }}
        >
          <Ionicons name="add" size={18} color="#18181b" />
          <Text style={{ color: '#18181b', fontSize: 15, fontWeight: '800' }}>
            Novo Atendimento
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={atendimentos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={cores.primaria.DEFAULT} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="people-outline" size={64} color="#71717a" />
            <Text style={{ color: '#a1a1aa', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
              Nenhum atendimento presencial registrado hoje
            </Text>
          </View>
        }
      />

      <Modal
        visivel={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo="Novo Atendimento Presencial"
        tamanho="grande"
        tema={tema}
      >
        <View style={{ gap: 16 }}>
          <Input
            rotulo="Nome do Cliente *"
            placeholder="Nome"
            value={form.cliente_nome}
            onChangeText={(v) => setForm(prev => ({ ...prev, cliente_nome: v }))}
          />
          <Input
            rotulo="Telefone"
            placeholder="(00) 00000-0000"
            value={form.cliente_telefone}
            onChangeText={(v) => setForm(prev => ({ ...prev, cliente_telefone: v }))}
            keyboardType="phone-pad"
          />

          <Text style={{ color: cores.texto.secundario, fontSize: 12, fontWeight: '700' }}>Profissional *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {barbeiros.map((b) => {
              const ativo = form.barbeiro_id === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setForm(prev => ({ ...prev, barbeiro_id: b.id }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: ativo ? '#ffffff' : '#27272a',
                    borderWidth: 1,
                    borderColor: ativo ? '#ffffff' : '#3f3f46',
                  }}
                >
                  <Text style={{ color: ativo ? '#18181b' : '#e4e4e7', fontSize: 13, fontWeight: '700' }}>
                    {b.nome}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: cores.texto.secundario, fontSize: 12, fontWeight: '700' }}>Serviço *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {servicos.map((s) => {
              const ativo = form.servico_id === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setForm(prev => ({ ...prev, servico_id: s.id, valor: String(s.preco) }))}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: ativo ? '#ffffff' : '#27272a',
                    borderWidth: 1,
                    borderColor: ativo ? '#ffffff' : '#3f3f46',
                  }}
                >
                  <Text style={{ color: ativo ? '#18181b' : '#e4e4e7', fontSize: 13, fontWeight: '700' }}>
                    {s.nome}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            rotulo="Valor (R$) *"
            placeholder="0,00"
            value={form.valor}
            onChangeText={(v) => setForm(prev => ({ ...prev, valor: v.replace(',', '.') }))}
            keyboardType="decimal-pad"
          />

          <Text style={{ color: cores.texto.secundario, fontSize: 12, fontWeight: '700' }}>Forma de Pagamento *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {FORMAS_PAGAMENTO.map((f) => {
              const ativo = form.forma_pagamento === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setForm(prev => ({ ...prev, forma_pagamento: f.id }))}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: ativo ? '#ffffff' : '#27272a',
                    borderWidth: 1,
                    borderColor: ativo ? '#ffffff' : '#3f3f46',
                  }}
                >
                  <Ionicons name={f.icone} size={16} color={ativo ? '#18181b' : '#a1a1aa'} />
                  <Text style={{ color: ativo ? '#18181b' : '#e4e4e7', fontSize: 13, fontWeight: '700' }}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={salvar}
            disabled={salvando}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: salvando ? '#3f3f46' : '#ffffff',
              marginTop: 6,
            }}
          >
            {salvando ? (
              <ActivityIndicator color={'#18181b'} />
            ) : (
              <Ionicons name="checkmark" size={18} color={'#18181b'} />
            )}
            <Text style={{ color: '#18181b', fontSize: 15, fontWeight: '800' }}>
              {salvando ? 'Salvando...' : 'Salvar Atendimento'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
