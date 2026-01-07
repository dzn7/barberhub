/**
 * Tela de Gestão de Clientes
 * CRUD completo de clientes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Card, Modal, ModalConfirmacao, Input, Botao } from '../../src/components/ui';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';

interface Cliente {
  id: string;
  tenant_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  created_at: string;
  total_agendamentos?: number;
  ultimo_agendamento?: string;
}

interface FormCliente {
  nome: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  observacoes: string;
}

export default function TelaClientes() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tenant } = useAutenticacao();
  
  const { cores, tema } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState(false);
  
  const [form, setForm] = useState<FormCliente>({
    nome: '',
    telefone: '',
    email: '',
    data_nascimento: '',
    observacoes: '',
  });

  const carregarClientes = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (erro) {
      console.error('Erro ao carregar clientes:', erro);
      Alert.alert('Erro', 'Não foi possível carregar os clientes.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarClientes();
  };

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
    cliente.telefone.includes(busca)
  );

  const abrirModalNovo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setClienteEditando(null);
    setForm({
      nome: '',
      telefone: '',
      email: '',
      data_nascimento: '',
      observacoes: '',
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (cliente: Cliente) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setClienteEditando(cliente);
    setForm({
      nome: cliente.nome,
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      data_nascimento: cliente.data_nascimento || '',
      observacoes: cliente.observacoes || '',
    });
    setModalAberto(true);
  };

  const salvarCliente = async () => {
    if (!tenant?.id || !form.nome.trim() || !form.telefone.trim()) {
      Alert.alert('Atenção', 'Nome e telefone são obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        tenant_id: tenant.id,
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim() || null,
        data_nascimento: form.data_nascimento || null,
        observacoes: form.observacoes.trim() || null,
      };

      if (clienteEditando) {
        const { error } = await supabase
          .from('clientes')
          .update(dados)
          .eq('id', clienteEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert(dados);
        if (error) throw error;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalAberto(false);
      carregarClientes();
    } catch (erro) {
      console.error('Erro ao salvar:', erro);
      Alert.alert('Erro', 'Não foi possível salvar o cliente.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirCliente = async () => {
    if (!clienteEditando) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteEditando.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmacaoExcluir(false);
      setModalAberto(false);
      carregarClientes();
    } catch (erro) {
      console.error('Erro ao excluir:', erro);
      Alert.alert('Erro', 'Não foi possível excluir. Verifique se há agendamentos vinculados.');
    }
  };

  const abrirWhatsApp = (telefone: string) => {
    const numero = telefone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${numero}`);
  };

  const ligarPara = (telefone: string) => {
    Linking.openURL(`tel:${telefone}`);
  };

  const renderCliente = ({ item }: { item: Cliente }) => (
    <Card style={{ marginBottom: 12 }}>
      <Pressable
        onPress={() => abrirModalEditar(item)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: cores.primaria.DEFAULT + '20',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: cores.primaria.DEFAULT, fontSize: 18, fontWeight: '700' }}>
            {item.nome.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600' }}>
            {item.nome}
          </Text>
          <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>
            {item.telefone}
          </Text>
          {item.email && (
            <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
              {item.email}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => abrirWhatsApp(item.telefone)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#25D366' + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </Pressable>
          <Pressable
            onPress={() => ligarPara(item.telefone)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: cores.primaria.DEFAULT + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="call" size={20} color={cores.primaria.DEFAULT} />
          </Pressable>
        </View>
      </Pressable>
    </Card>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={cores.texto.primario} />
          </Pressable>
          <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '700' }}>
            Clientes
          </Text>
          <Pressable onPress={abrirModalNovo} hitSlop={12}>
            <Ionicons name="add" size={28} color={cores.primaria.DEFAULT} />
          </Pressable>
        </View>

        {/* Busca */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cores.fundo.terciario,
            borderRadius: 12,
            paddingHorizontal: 14,
            marginTop: 16,
          }}
        >
          <Ionicons name="search" size={20} color={cores.texto.terciario} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome ou telefone"
            placeholderTextColor={cores.texto.terciario}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              color: cores.texto.primario,
              fontSize: 15,
            }}
          />
          {busca.length > 0 && (
            <Pressable onPress={() => setBusca('')}>
              <Ionicons name="close-circle" size={20} color={cores.texto.terciario} />
            </Pressable>
          )}
        </View>

        {/* Contador */}
        <Text style={{ color: cores.texto.secundario, fontSize: 13, marginTop: 12 }}>
          {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''} encontrado{clientesFiltrados.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Lista */}
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderCliente}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={onRefresh}
            tintColor={cores.primaria.DEFAULT}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="people-outline" size={64} color={cores.texto.terciario} />
            <Text style={{ color: cores.texto.secundario, fontSize: 16, marginTop: 16, textAlign: 'center' }}>
              {busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </Text>
            {!busca && (
              <Pressable
                onPress={abrirModalNovo}
                style={{
                  marginTop: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: cores.primaria.DEFAULT,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Ionicons name="add" size={20} color={cores.botao.texto} />
                <Text style={{ color: cores.botao.texto, fontSize: 15, fontWeight: '600' }}>
                  Adicionar Cliente
                </Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* Modal Criar/Editar */}
      <Modal
        visivel={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
        tamanho="grande"
        tema={tema}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 16 }}>
            <Input
              rotulo="Nome *"
              placeholder="Nome completo"
              value={form.nome}
              onChangeText={(v) => setForm(prev => ({ ...prev, nome: v }))}
            />

            <Input
              rotulo="Telefone *"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChangeText={(v) => setForm(prev => ({ ...prev, telefone: v }))}
              keyboardType="phone-pad"
            />

            <Input
              rotulo="E-mail"
              placeholder="email@exemplo.com"
              value={form.email}
              onChangeText={(v) => setForm(prev => ({ ...prev, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              rotulo="Data de Nascimento"
              placeholder="DD/MM/AAAA"
              value={form.data_nascimento}
              onChangeText={(v) => setForm(prev => ({ ...prev, data_nascimento: v }))}
              keyboardType="numeric"
            />

            <Input
              rotulo="Observações"
              placeholder="Anotações sobre o cliente"
              value={form.observacoes}
              onChangeText={(v) => setForm(prev => ({ ...prev, observacoes: v }))}
              multiline
              numberOfLines={3}
            />

            <Botao
              titulo={salvando ? 'Salvando...' : 'Salvar'}
              variante="primario"
              onPress={salvarCliente}
              desabilitado={salvando || !form.nome.trim() || !form.telefone.trim()}
            />

            {clienteEditando && (
              <Pressable
                onPress={() => setConfirmacaoExcluir(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                }}
              >
                <Ionicons name="trash-outline" size={18} color={cores.erro} />
                <Text style={{ color: cores.erro, fontSize: 14, fontWeight: '500' }}>
                  Excluir Cliente
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </Modal>

      {/* Modal Confirmação Exclusão */}
      <ModalConfirmacao
        visivel={confirmacaoExcluir}
        onFechar={() => setConfirmacaoExcluir(false)}
        onConfirmar={excluirCliente}
        titulo="Excluir Cliente"
        mensagem={`Deseja realmente excluir "${clienteEditando?.nome}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        textoCancelar="Cancelar"
        tipo="perigo"
        tema={tema}
      />
    </View>
  );
}
