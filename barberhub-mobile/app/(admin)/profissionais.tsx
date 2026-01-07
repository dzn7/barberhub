/**
 * Tela de Gestão de Profissionais
 * CRUD completo de barbeiros/profissionais
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Card, Modal, ModalConfirmacao, Input, Botao } from '../../src/components/ui';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';

interface Profissional {
  id: string;
  tenant_id: string;
  nome: string;
  telefone: string;
  email: string;
  foto_url: string | null;
  ativo: boolean;
  comissao_percentual: number;
  especialidades: string[];
  created_at: string;
}

interface FormProfissional {
  nome: string;
  telefone: string;
  email: string;
  foto_url: string | null;
  ativo: boolean;
  comissao_percentual: string;
}

export default function TelaProfissionais() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tenant } = useAutenticacao();
  const { profissional } = useTerminologia();
  
  const { cores, tema } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [profissionaisLista, setProfissionaisLista] = useState<Profissional[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [profissionalEditando, setProfissionalEditando] = useState<Profissional | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmacaoExcluir, setConfirmacaoExcluir] = useState(false);
  
  const [form, setForm] = useState<FormProfissional>({
    nome: '',
    telefone: '',
    email: '',
    foto_url: null,
    ativo: true,
    comissao_percentual: '50',
  });

  const carregarProfissionais = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setProfissionaisLista(data || []);
    } catch (erro) {
      console.error('Erro ao carregar profissionais:', erro);
      Alert.alert('Erro', 'Não foi possível carregar os profissionais.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    carregarProfissionais();
  }, [carregarProfissionais]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarProfissionais();
  };

  const abrirModalNovo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfissionalEditando(null);
    setForm({
      nome: '',
      telefone: '',
      email: '',
      foto_url: null,
      ativo: true,
      comissao_percentual: '50',
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (prof: Profissional) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfissionalEditando(prof);
    setForm({
      nome: prof.nome,
      telefone: prof.telefone || '',
      email: prof.email || '',
      foto_url: prof.foto_url,
      ativo: prof.ativo,
      comissao_percentual: (prof.comissao_percentual || 50).toString(),
    });
    setModalAberto(true);
  };

  const selecionarFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      await uploadFoto(resultado.assets[0].uri);
    }
  };

  const uploadFoto = async (uri: string) => {
    if (!tenant?.id) return;

    try {
      const extensao = uri.split('.').pop() || 'jpg';
      const nomeArquivo = `${tenant.id}/profissionais/${Date.now()}.${extensao}`;
      
      const resposta = await fetch(uri);
      const blob = await resposta.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(nomeArquivo, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(nomeArquivo);

      setForm(prev => ({ ...prev, foto_url: urlData.publicUrl }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (erro) {
      console.error('Erro ao fazer upload:', erro);
      Alert.alert('Erro', 'Não foi possível fazer upload da foto.');
    }
  };

  const salvarProfissional = async () => {
    if (!tenant?.id || !form.nome.trim()) {
      Alert.alert('Atenção', 'Nome é obrigatório.');
      return;
    }

    setSalvando(true);
    try {
      const dados = {
        tenant_id: tenant.id,
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        foto_url: form.foto_url,
        ativo: form.ativo,
        comissao_percentual: parseFloat(form.comissao_percentual) || 50,
      };

      if (profissionalEditando) {
        const { error } = await supabase
          .from('barbeiros')
          .update(dados)
          .eq('id', profissionalEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('barbeiros')
          .insert(dados);
        if (error) throw error;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalAberto(false);
      carregarProfissionais();
    } catch (erro) {
      console.error('Erro ao salvar:', erro);
      Alert.alert('Erro', 'Não foi possível salvar o profissional.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirProfissional = async () => {
    if (!profissionalEditando) return;

    try {
      const { error } = await supabase
        .from('barbeiros')
        .delete()
        .eq('id', profissionalEditando.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmacaoExcluir(false);
      setModalAberto(false);
      carregarProfissionais();
    } catch (erro) {
      console.error('Erro ao excluir:', erro);
      Alert.alert('Erro', 'Não foi possível excluir. Verifique se há agendamentos vinculados.');
    }
  };

  const toggleAtivo = async (prof: Profissional) => {
    try {
      const { error } = await supabase
        .from('barbeiros')
        .update({ ativo: !prof.ativo })
        .eq('id', prof.id);

      if (error) throw error;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      carregarProfissionais();
    } catch (erro) {
      console.error('Erro ao alterar status:', erro);
    }
  };

  const renderProfissional = ({ item }: { item: Profissional }) => (
    <Card style={{ marginBottom: 12 }}>
      <Pressable
        onPress={() => abrirModalEditar(item)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: cores.fundo.terciario,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            opacity: item.ativo ? 1 : 0.5,
          }}
        >
          {item.foto_url ? (
            <Image
              source={{ uri: item.foto_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={28} color={cores.texto.terciario} />
          )}
        </View>

        <View style={{ flex: 1, opacity: item.ativo ? 1 : 0.5 }}>
          <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600' }}>
            {item.nome}
          </Text>
          {item.telefone && (
            <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>
              {item.telefone}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: item.ativo ? cores.sucesso + '20' : cores.erro + '20',
              }}
            >
              <Text
                style={{
                  color: item.ativo ? cores.sucesso : cores.erro,
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {item.ativo ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
            <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
              {item.comissao_percentual}% comissão
            </Text>
          </View>
        </View>

        <Switch
          value={item.ativo}
          onValueChange={() => toggleAtivo(item)}
          trackColor={{ false: cores.borda.sutil, true: cores.sucesso + '50' }}
          thumbColor={item.ativo ? cores.sucesso : cores.texto.terciario}
        />
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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={cores.texto.primario} />
        </Pressable>
        <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '700' }}>
          {profissional(true)}
        </Text>
        <Pressable onPress={abrirModalNovo} hitSlop={12}>
          <Ionicons name="add" size={28} color={cores.primaria.DEFAULT} />
        </Pressable>
      </View>

      {/* Lista */}
      <FlatList
        data={profissionaisLista}
        keyExtractor={(item) => item.id}
        renderItem={renderProfissional}
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
              Nenhum {profissional()} cadastrado
            </Text>
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
                Adicionar {profissional()}
              </Text>
            </Pressable>
          </View>
        }
      />

      {/* Modal Criar/Editar */}
      <Modal
        visivel={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={profissionalEditando ? `Editar ${profissional()}` : `Novo ${profissional()}`}
        tamanho="grande"
        tema={tema}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 16 }}>
            {/* Foto */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Pressable onPress={selecionarFoto}>
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: cores.fundo.terciario,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderWidth: 3,
                    borderColor: cores.primaria.DEFAULT,
                  }}
                >
                  {form.foto_url ? (
                    <Image
                      source={{ uri: form.foto_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="camera" size={36} color={cores.texto.terciario} />
                  )}
                </View>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: cores.primaria.DEFAULT,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="pencil" size={16} color="#fff" />
                </View>
              </Pressable>
            </View>

            <Input
              rotulo="Nome *"
              placeholder="Nome completo"
              value={form.nome}
              onChangeText={(v) => setForm(prev => ({ ...prev, nome: v }))}
            />

            <Input
              rotulo="Telefone"
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
              rotulo="Comissão (%)"
              placeholder="50"
              value={form.comissao_percentual}
              onChangeText={(v) => setForm(prev => ({ ...prev, comissao_percentual: v }))}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: cores.texto.primario, fontSize: 15 }}>Ativo</Text>
              <Switch
                value={form.ativo}
                onValueChange={(v) => setForm(prev => ({ ...prev, ativo: v }))}
                trackColor={{ false: cores.borda.sutil, true: cores.sucesso + '50' }}
                thumbColor={form.ativo ? cores.sucesso : cores.texto.terciario}
              />
            </View>

            <Botao
              titulo={salvando ? 'Salvando...' : 'Salvar'}
              variante="primario"
              onPress={salvarProfissional}
              desabilitado={salvando || !form.nome.trim()}
            />

            {profissionalEditando && (
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
                  Excluir {profissional()}
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
        onConfirmar={excluirProfissional}
        titulo={`Excluir ${profissional()}`}
        mensagem={`Deseja realmente excluir "${profissionalEditando?.nome}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        textoCancelar="Cancelar"
        tipo="perigo"
        tema={tema}
      />
    </View>
  );
}
