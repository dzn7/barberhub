/**
 * Tela de Barbeiros/Profissionais
 * Gestão da equipe da barbearia com abas: Profissionais e Comissões
 */

import React, { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  ActivityIndicator,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Botao, Input, Card, Avatar } from '../../src/components/ui';
import { AbaComissoes } from '../../src/components/equipe';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';
import type { Barbeiro } from '../../src/types';

type SubTabEquipe = 'profissionais' | 'comissoes';

const SUBTABS: { id: SubTabEquipe; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'profissionais', label: 'Profissionais', icone: 'people-outline' },
  { id: 'comissoes', label: 'Comissões', icone: 'cash-outline' },
];

function gerarToken(): string {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return token;
}

export default function TelaBarbeiros() {
  const insets = useSafeAreaInsets();
  const { tenant } = useAutenticacao();
  const { profissional, ehNailDesigner } = useTerminologia();
  
  const { cores: CORES } = useTema();

  const [subTabAtiva, setSubTabAtiva] = useState<SubTabEquipe>('profissionais');
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [barbeiroEditando, setBarbeiroEditando] = useState<Barbeiro | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    comissao_percentual: '40',
    ativo: true,
  });
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);

  const carregarBarbeiros = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setBarbeiros(data || []);
    } catch (erro) {
      console.error('Erro ao carregar barbeiros:', erro);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    carregarBarbeiros();
  }, [carregarBarbeiros]);

  const onRefresh = () => {
    setAtualizando(true);
    carregarBarbeiros();
  };

  const abrirModal = (barbeiro?: Barbeiro) => {
    if (barbeiro) {
      setBarbeiroEditando(barbeiro);
      setFormData({
        nome: barbeiro.nome,
        email: barbeiro.email || '',
        telefone: barbeiro.telefone || '',
        comissao_percentual: String(barbeiro.comissao_percentual || 40),
        ativo: barbeiro.ativo,
      });
      setFotoUri(barbeiro.foto_url || null);
    } else {
      setBarbeiroEditando(null);
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        comissao_percentual: '40',
        ativo: true,
      });
      setFotoUri(null);
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setBarbeiroEditando(null);
    setFotoUri(null);
  };

  const selecionarFoto = async () => {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!resultado.canceled && resultado.assets[0]) {
        setFotoUri(resultado.assets[0].uri);
      }
    } catch (erro) {
      console.error('Erro ao selecionar foto:', erro);
    }
  };

  const uploadFoto = async (barbeiroId: string): Promise<string | null> => {
    if (!fotoUri || fotoUri.startsWith('http')) return fotoUri;
    if (!tenant?.id) return null;

    setUploadandoFoto(true);
    try {
      const extensao = fotoUri.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Usar serviço de upload via API (Cloudflare R2)
      const { uploadFotoBarbeiro } = await import('../../src/services/storage');
      const resultado = await uploadFotoBarbeiro(
        {
          uri: fotoUri,
          type: `image/${extensao}`,
          name: `${barbeiroId}.${extensao}`,
        },
        tenant.id,
        barbeiroId
      );

      if (!resultado.sucesso) {
        console.error('Erro no upload:', resultado.erro);
        return null;
      }

      return resultado.url || null;
    } catch (erro) {
      console.error('Erro ao fazer upload:', erro);
      return null;
    } finally {
      setUploadandoFoto(false);
    }
  };

  const salvarBarbeiro = async () => {
    if (!tenant?.id || !formData.nome.trim()) {
      Alert.alert('Atenção', 'O nome é obrigatório.');
      return;
    }
    
    if (!formData.email.trim()) {
      Alert.alert('Atenção', 'O email é obrigatório.');
      return;
    }

    setSalvando(true);
    try {
      let barbeiroId = barbeiroEditando?.id;

      const dadosBarbeiro = {
        tenant_id: tenant.id,
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        telefone: formData.telefone.trim() || null,
        comissao_percentual: parseFloat(formData.comissao_percentual) || 40,
        ativo: formData.ativo,
      };

      if (barbeiroEditando) {
        const { error } = await supabase
          .from('barbeiros')
          .update(dadosBarbeiro)
          .eq('id', barbeiroEditando.id);
        if (error) throw error;
      } else {
        // Gerar token de acesso para novo barbeiro
        const token = gerarToken();
        const { data, error } = await supabase
          .from('barbeiros')
          .insert({
            ...dadosBarbeiro,
            token_acesso: token,
            token_ativo: true,
          })
          .select('id')
          .single();
        if (error) throw error;
        barbeiroId = data?.id;
      }

      // Upload da foto se houver uma nova
      if (barbeiroId && fotoUri && !fotoUri.startsWith('http')) {
        const fotoUrl = await uploadFoto(barbeiroId);
        if (fotoUrl) {
          await supabase
            .from('barbeiros')
            .update({ foto_url: fotoUrl })
            .eq('id', barbeiroId);
        }
      }

      fecharModal();
      carregarBarbeiros();
    } catch (erro) {
      console.error('Erro ao salvar barbeiro:', erro);
      Alert.alert('Erro', 'Não foi possível salvar o profissional.');
    } finally {
      setSalvando(false);
    }
  };

  const copiarToken = async (token: string) => {
    await Clipboard.setStringAsync(token);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Token copiado!', 'O token foi copiado para a área de transferência.');
  };

  const regenerarToken = async (barbeiro: Barbeiro) => {
    const novoToken = gerarToken();
    try {
      const { error } = await supabase
        .from('barbeiros')
        .update({ token_acesso: novoToken, token_ativo: true })
        .eq('id', barbeiro.id);

      if (error) throw error;
      await copiarToken(novoToken);
      carregarBarbeiros();
    } catch (erro) {
      console.error('Erro ao regenerar token:', erro);
    }
  };

  const renderBarbeiro = ({ item }: { item: Barbeiro }) => (
    <Card pressionavel onPress={() => abrirModal(item)} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar
          fonte={item.foto_url}
          nome={item.nome}
          tamanho="lg"
          corFundo={item.ativo ? '#3f3f46' : CORES.texto.terciario}
        />

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                color: item.ativo ? CORES.texto.primario : CORES.texto.terciario,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              {item.nome}
            </Text>
            {item.is_proprietario && (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: '600',
                  }}
                >
                  ADMIN
                </Text>
              </View>
            )}
          </View>
          <Text style={{ color: CORES.texto.secundario, fontSize: 14 }}>
            {item.telefone || item.email || 'Sem contato'}
          </Text>
          <Text style={{ color: CORES.texto.terciario, fontSize: 12, marginTop: 2 }}>
            Comissão: {item.comissao_percentual}% • {item.total_atendimentos} atendimentos
          </Text>
        </View>

        {item.token_acesso && !item.is_proprietario && (
          <Pressable
            onPress={() => copiarToken(item.token_acesso!)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: CORES.info + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="key" size={18} color={CORES.info} />
          </Pressable>
        )}
      </View>

      {item.token_acesso && !item.is_proprietario && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: CORES.borda.sutil,
          }}
        >
          <View>
            <Text style={{ color: CORES.texto.terciario, fontSize: 11 }}>
              Token de acesso
            </Text>
            <Text
              style={{
                color: CORES.texto.secundario,
                fontSize: 14,
                fontFamily: 'monospace',
              }}
            >
              {item.token_acesso}
            </Text>
          </View>
          <Pressable onPress={() => regenerarToken(item)}>
            <Text style={{ color: '#10b981', fontSize: 13 }}>
              Regenerar
            </Text>
          </Pressable>
        </View>
      )}
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: CORES.fundo.primario }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: CORES.fundo.secundario,
          borderBottomWidth: 1,
          borderBottomColor: CORES.borda.sutil,
        }}
      >
        {/* Título e Botão */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: CORES.texto.primario,
              fontSize: 24,
              fontWeight: '700',
            }}
          >
            Equipe
          </Text>

          {subTabAtiva === 'profissionais' && (
            <Pressable
              onPress={() => abrirModal()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: CORES.botao.fundo,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person-add" size={22} color={CORES.botao.texto} />
            </Pressable>
          )}
        </View>

        {/* Subtabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 8 }}
        >
          {SUBTABS.map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSubTabAtiva(tab.id);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: subTabAtiva === tab.id ? CORES.botao.fundo : CORES.fundo.terciario,
                borderWidth: 1,
                borderColor: subTabAtiva === tab.id ? CORES.botao.fundo : CORES.borda.media,
              }}
            >
              <Ionicons
                name={tab.icone}
                size={16}
                color={subTabAtiva === tab.id ? CORES.botao.texto : CORES.texto.secundario}
              />
              <Text
                style={{
                  color: subTabAtiva === tab.id ? CORES.botao.texto : CORES.texto.secundario,
                  fontSize: 13,
                  fontWeight: '500',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Conteúdo baseado na aba */}
      {subTabAtiva === 'profissionais' && (
        <>
          {carregando ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={CORES.primaria.DEFAULT} />
            </View>
          ) : (
            <FlatList
              data={barbeiros}
              keyExtractor={(item) => item.id}
              renderItem={renderBarbeiro}
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={atualizando}
                  onRefresh={onRefresh}
                  tintColor={CORES.primaria.DEFAULT}
                />
              }
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Ionicons name="people-outline" size={64} color={CORES.texto.terciario} />
                  <Text
                    style={{
                      color: CORES.texto.secundario,
                      fontSize: 16,
                      marginTop: 16,
                      textAlign: 'center',
                    }}
                  >
                    Nenhum profissional cadastrado
                  </Text>
                  <Botao
                    titulo="Adicionar Profissional"
                    variante="primario"
                    onPress={() => abrirModal()}
                    style={{ marginTop: 20 }}
                  />
                </View>
              }
            />
          )}
        </>
      )}

      {subTabAtiva === 'comissoes' && tenant?.id && (
        <AbaComissoes tenantId={tenant.id} />
      )}

      {/* Modal */}
      <Modal
        visible={modalAberto}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={fecharModal}
      >
        <View style={{ flex: 1, backgroundColor: CORES.fundo.primario }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: CORES.borda.sutil,
            }}
          >
            <Pressable onPress={fecharModal}>
              <Text style={{ color: CORES.texto.secundario, fontSize: 16 }}>
                Cancelar
              </Text>
            </Pressable>
            <Text
              style={{
                color: CORES.texto.primario,
                fontSize: 18,
                fontWeight: '600',
              }}
            >
              {barbeiroEditando ? 'Editar Profissional' : 'Novo Profissional'}
            </Text>
            <Pressable onPress={salvarBarbeiro} disabled={salvando}>
              <Text
                style={{
                  color: salvando ? CORES.texto.terciario : '#10b981',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Salvar
              </Text>
            </Pressable>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            {/* Seletor de Foto */}
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Pressable onPress={selecionarFoto} style={{ position: 'relative' }}>
                <Avatar
                  fonte={fotoUri}
                  nome={formData.nome || 'Novo'}
                  tamanho="xl"
                  corFundo="#3f3f46"
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: CORES.fundo.primario,
                  }}
                >
                  <Ionicons name="camera" size={16} color="#18181b" />
                </View>
              </Pressable>
              <Text style={{ color: CORES.texto.terciario, fontSize: 12, marginTop: 8 }}>
                Toque para {fotoUri ? 'alterar' : 'adicionar'} foto
              </Text>
            </View>

            <Input
              rotulo="Nome"
              placeholder="Nome completo"
              value={formData.nome}
              onChangeText={(v) => setFormData({ ...formData, nome: v })}
            />
            <Input
              rotulo="Telefone/WhatsApp"
              placeholder="(00) 00000-0000"
              value={formData.telefone}
              onChangeText={(v) => setFormData({ ...formData, telefone: v })}
              keyboardType="phone-pad"
            />
            <Input
              rotulo="Email (opcional)"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChangeText={(v) => setFormData({ ...formData, email: v })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              rotulo="Comissão (%)"
              placeholder="40"
              value={formData.comissao_percentual}
              onChangeText={(v) => setFormData({ ...formData, comissao_percentual: v })}
              keyboardType="numeric"
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: CORES.texto.primario, fontSize: 16 }}>
                Profissional ativo
              </Text>
              <Switch
                value={formData.ativo}
                onValueChange={(v) => setFormData({ ...formData, ativo: v })}
                trackColor={{ false: CORES.borda.sutil, true: '#10b98150' }}
                thumbColor={formData.ativo ? '#10b981' : CORES.texto.terciario}
              />
            </View>

            {!barbeiroEditando && (
              <View
                style={{
                  backgroundColor: CORES.info + '10',
                  padding: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                <Ionicons name="information-circle" size={24} color={CORES.info} />
                <Text style={{ color: CORES.texto.secundario, flex: 1, fontSize: 14 }}>
                  Um token de acesso será gerado automaticamente. Use-o para que o profissional
                  acesse o app.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
