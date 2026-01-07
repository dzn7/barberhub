/**
 * Tela de Personalização da Barbearia
 * Configuração de cores, logo e aparência
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Card, Botao, Input, Modal } from '../../src/components/ui';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';

const CORES_PREDEFINIDAS = [
  { nome: 'Azul', cor: '#3b82f6' },
  { nome: 'Verde', cor: '#10b981' },
  { nome: 'Roxo', cor: '#8b5cf6' },
  { nome: 'Rosa', cor: '#ec4899' },
  { nome: 'Laranja', cor: '#f97316' },
  { nome: 'Vermelho', cor: '#ef4444' },
  { nome: 'Amarelo', cor: '#eab308' },
  { nome: 'Teal', cor: '#14b8a6' },
  { nome: 'Indigo', cor: '#6366f1' },
  { nome: 'Zinc', cor: '#71717a' },
];

interface DadosBarbearia {
  nome: string;
  descricao: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
}

export default function TelaPersonalizacao() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tenant, atualizarTenant } = useAutenticacao();
  const { estabelecimento } = useTerminologia();
  
  const { cores, tema } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dados, setDados] = useState<DadosBarbearia>({
    nome: '',
    descricao: '',
    logo_url: null,
    cor_primaria: '#3b82f6',
    cor_secundaria: '#1e3a5f',
    endereco: '',
    telefone: '',
    whatsapp: '',
    instagram: '',
  });
  const [modalCoresAberto, setModalCoresAberto] = useState(false);
  const [tipoCor, setTipoCor] = useState<'primaria' | 'secundaria'>('primaria');
  const [corCustomizada, setCorCustomizada] = useState('');

  const carregarDados = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenant.id)
        .single();

      if (error) throw error;

      setDados({
        nome: data.nome || '',
        descricao: data.descricao || '',
        logo_url: data.logo_url || null,
        cor_primaria: data.cor_primaria || '#3b82f6',
        cor_secundaria: data.cor_secundaria || '#1e3a5f',
        endereco: data.endereco || '',
        telefone: data.telefone || '',
        whatsapp: data.whatsapp || '',
        instagram: data.instagram || '',
      });
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const selecionarImagem = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar a logo.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!resultado.canceled && resultado.assets[0]) {
      await uploadImagem(resultado.assets[0].uri);
    }
  };

  const uploadImagem = async (uri: string) => {
    if (!tenant?.id) return;

    try {
      setSalvando(true);
      
      // Usar serviço de upload via API (Cloudflare R2)
      const { uploadLogo } = await import('../../src/services/storage');
      const extensao = uri.split('.').pop()?.toLowerCase() || 'jpg';
      
      const resultado = await uploadLogo(
        {
          uri,
          type: `image/${extensao}`,
          name: `logo.${extensao}`,
        },
        tenant.id
      );

      if (!resultado.sucesso) {
        throw new Error(resultado.erro || 'Erro no upload');
      }

      const novaUrl = `${resultado.url}?t=${Date.now()}`;
      
      setDados(prev => ({ ...prev, logo_url: novaUrl }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (erro: any) {
      console.error('Erro ao fazer upload:', erro);
      Alert.alert('Erro', erro.message || 'Não foi possível fazer upload da imagem.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarDados = async () => {
    if (!tenant?.id) return;

    setSalvando(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          nome: dados.nome.trim(),
          descricao: dados.descricao.trim(),
          logo_url: dados.logo_url,
          cor_primaria: dados.cor_primaria,
          cor_secundaria: dados.cor_secundaria,
          endereco: dados.endereco.trim(),
          telefone: dados.telefone.trim(),
          whatsapp: dados.whatsapp.trim(),
          instagram: dados.instagram.trim(),
        })
        .eq('id', tenant.id);

      if (error) throw error;

      if (atualizarTenant) {
        atualizarTenant({
          ...tenant,
          nome: dados.nome.trim(),
          logo_url: dados.logo_url,
          cor_primaria: dados.cor_primaria,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Dados salvos com sucesso!');
    } catch (erro) {
      console.error('Erro ao salvar:', erro);
      Alert.alert('Erro', 'Não foi possível salvar os dados.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirSeletorCor = (tipo: 'primaria' | 'secundaria') => {
    setTipoCor(tipo);
    setCorCustomizada(tipo === 'primaria' ? dados.cor_primaria : dados.cor_secundaria);
    setModalCoresAberto(true);
  };

  const selecionarCor = (cor: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tipoCor === 'primaria') {
      setDados(prev => ({ ...prev, cor_primaria: cor }));
    } else {
      setDados(prev => ({ ...prev, cor_secundaria: cor }));
    }
    setModalCoresAberto(false);
  };

  const aplicarCorCustomizada = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(corCustomizada)) {
      selecionarCor(corCustomizada);
    } else {
      Alert.alert('Cor inválida', 'Use o formato hexadecimal: #RRGGBB');
    }
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
          Personalização
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Card style={{ alignItems: 'center', padding: 24 }}>
          <Pressable onPress={selecionarImagem} disabled={salvando}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: cores.fundo.terciario,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: dados.cor_primaria,
                overflow: 'hidden',
              }}
            >
              {dados.logo_url ? (
                <Image
                  source={{ uri: dados.logo_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="camera" size={40} color={cores.texto.terciario} />
              )}
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: dados.cor_primaria,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="pencil" size={18} color="#fff" />
            </View>
          </Pressable>
          <Text style={{ color: cores.texto.secundario, fontSize: 14, marginTop: 12 }}>
            Toque para alterar a logo
          </Text>
        </Card>

        {/* Cores */}
        <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
          Cores do {estabelecimento()}
        </Text>
        <Card>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 8 }}>
                Cor Primária
              </Text>
              <Pressable
                onPress={() => abrirSeletorCor('primaria')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: cores.fundo.terciario,
                  borderRadius: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: dados.cor_primaria,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '500' }}>
                    {dados.cor_primaria.toUpperCase()}
                  </Text>
                  <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                    Usada em botões e destaques
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={cores.texto.terciario} />
              </Pressable>
            </View>

            <View>
              <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 8 }}>
                Cor Secundária
              </Text>
              <Pressable
                onPress={() => abrirSeletorCor('secundaria')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: cores.fundo.terciario,
                  borderRadius: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: dados.cor_secundaria,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '500' }}>
                    {dados.cor_secundaria.toUpperCase()}
                  </Text>
                  <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                    Usada em fundos e elementos secundários
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={cores.texto.terciario} />
              </Pressable>
            </View>
          </View>
        </Card>

        {/* Preview */}
        <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
          Prévia
        </Text>
        <Card style={{ overflow: 'hidden' }}>
          <View
            style={{
              backgroundColor: dados.cor_secundaria,
              padding: 20,
              alignItems: 'center',
              marginHorizontal: -16,
              marginTop: -16,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {dados.logo_url ? (
                <Image
                  source={{ uri: dados.logo_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="storefront" size={28} color={dados.cor_primaria} />
              )}
            </View>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 12 }}>
              {dados.nome || 'Nome do Estabelecimento'}
            </Text>
          </View>
          <View style={{ padding: 16, alignItems: 'center' }}>
            <Pressable
              style={{
                backgroundColor: dados.cor_primaria,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Agendar Horário</Text>
            </Pressable>
          </View>
        </Card>

        {/* Dados do Estabelecimento */}
        <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
          Dados do {estabelecimento()}
        </Text>
        <Card style={{ gap: 16 }}>
          <Input
            rotulo="Nome"
            placeholder={`Nome do ${estabelecimento()}`}
            value={dados.nome}
            onChangeText={(v) => setDados(prev => ({ ...prev, nome: v }))}
          />
          <Input
            rotulo="Descrição"
            placeholder="Uma breve descrição"
            value={dados.descricao}
            onChangeText={(v) => setDados(prev => ({ ...prev, descricao: v }))}
            multiline
            numberOfLines={3}
          />
          <Input
            rotulo="Endereço"
            placeholder="Rua, número, bairro"
            value={dados.endereco}
            onChangeText={(v) => setDados(prev => ({ ...prev, endereco: v }))}
          />
          <Input
            rotulo="Telefone"
            placeholder="(00) 0000-0000"
            value={dados.telefone}
            onChangeText={(v) => setDados(prev => ({ ...prev, telefone: v }))}
            keyboardType="phone-pad"
          />
          <Input
            rotulo="WhatsApp"
            placeholder="(00) 00000-0000"
            value={dados.whatsapp}
            onChangeText={(v) => setDados(prev => ({ ...prev, whatsapp: v }))}
            keyboardType="phone-pad"
          />
          <Input
            rotulo="Instagram"
            placeholder="@seuperfil"
            value={dados.instagram}
            onChangeText={(v) => setDados(prev => ({ ...prev, instagram: v }))}
          />
        </Card>
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
          titulo={salvando ? 'Salvando...' : 'Salvar Alterações'}
          variante="primario"
          onPress={salvarDados}
          desabilitado={salvando}
        />
      </View>

      {/* Modal Seletor de Cores */}
      <Modal
        visivel={modalCoresAberto}
        onFechar={() => setModalCoresAberto(false)}
        titulo={`Cor ${tipoCor === 'primaria' ? 'Primária' : 'Secundária'}`}
        tamanho="grande"
        tema={tema}
      >
        <View style={{ gap: 20 }}>
          {/* Cores Predefinidas */}
          <View>
            <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 12 }}>
              Cores Sugeridas
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {CORES_PREDEFINIDAS.map((item) => (
                <Pressable
                  key={item.cor}
                  onPress={() => selecionarCor(item.cor)}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: item.cor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 3,
                    borderColor: (tipoCor === 'primaria' ? dados.cor_primaria : dados.cor_secundaria) === item.cor
                      ? '#fff'
                      : 'transparent',
                  }}
                >
                  {(tipoCor === 'primaria' ? dados.cor_primaria : dados.cor_secundaria) === item.cor && (
                    <Ionicons name="checkmark" size={24} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Cor Customizada */}
          <View>
            <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 12 }}>
              Cor Personalizada
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(corCustomizada) ? corCustomizada : cores.fundo.terciario,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                }}
              />
              <View style={{ flex: 1 }}>
                <TextInput
                  value={corCustomizada}
                  onChangeText={setCorCustomizada}
                  placeholder="#000000"
                  placeholderTextColor={cores.texto.terciario}
                  style={{
                    backgroundColor: cores.fundo.terciario,
                    color: cores.texto.primario,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                    fontSize: 15,
                    textTransform: 'uppercase',
                  }}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
              <Pressable
                onPress={aplicarCorCustomizada}
                style={{
                  backgroundColor: cores.primaria.DEFAULT,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: cores.botao.texto, fontWeight: '600' }}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
