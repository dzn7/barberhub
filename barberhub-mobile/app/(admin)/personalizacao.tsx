/**
 * Tela de Personalização da Barbearia
 * Configuração completa de cores, logo, fontes e aparência
 * Design idêntico ao web admin
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Card, Botao, Input, Modal } from '../../src/components/ui';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';
import { obterPaletas, FONTES_DISPONIVEIS, obterFamiliaFonte, type Paleta, type Fonte } from '../../src/components/personalizacao';
import type { TipoNegocio } from '../../src/types';

const { width: LARGURA_TELA } = Dimensions.get('window');

interface DadosPersonalizacao {
  nome: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  cor_texto: string;
  fonte_principal: string;
  fonte_titulos: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
}

type AbaAtiva = 'paletas' | 'cores' | 'fontes' | 'dados';
type TipoCor = 'primaria' | 'secundaria' | 'destaque';

export default function TelaPersonalizacao() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tenant, atualizarTenant } = useAutenticacao();
  const { estabelecimento, ehNailDesigner } = useTerminologia();
  
  const { cores, tema } = useTema();

  const tipoNegocio = (tenant?.tipo_negocio as TipoNegocio) || 'barbearia';
  const paletas = useMemo(() => obterPaletas(tipoNegocio), [tipoNegocio]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('paletas');
  const [dados, setDados] = useState<DadosPersonalizacao>({
    nome: '',
    logo_url: null,
    cor_primaria: '#18181b',
    cor_secundaria: '#f4f4f5',
    cor_destaque: '#a1a1aa',
    cor_texto: '#fafafa',
    fonte_principal: 'Inter',
    fonte_titulos: 'Inter',
    endereco: '',
    telefone: '',
    whatsapp: '',
    instagram: '',
  });
  const [modalCoresAberto, setModalCoresAberto] = useState(false);
  const [tipoCor, setTipoCor] = useState<TipoCor>('primaria');
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
        logo_url: data.logo_url || null,
        cor_primaria: data.cor_primaria || '#18181b',
        cor_secundaria: data.cor_secundaria || '#f4f4f5',
        cor_destaque: data.cor_destaque || '#a1a1aa',
        cor_texto: data.cor_texto || '#fafafa',
        fonte_principal: data.fonte_principal || 'Inter',
        fonte_titulos: data.fonte_titulos || 'Inter',
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
      
      setDados((prev: DadosPersonalizacao) => ({ ...prev, logo_url: novaUrl }));
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
          logo_url: dados.logo_url,
          cor_primaria: dados.cor_primaria,
          cor_secundaria: dados.cor_secundaria,
          cor_destaque: dados.cor_destaque,
          cor_texto: dados.cor_texto,
          fonte_principal: dados.fonte_principal,
          fonte_titulos: dados.fonte_titulos,
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
          cor_secundaria: dados.cor_secundaria,
          cor_destaque: dados.cor_destaque,
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

  const abrirSeletorCor = (tipo: TipoCor) => {
    setTipoCor(tipo);
    const corAtual = tipo === 'primaria' ? dados.cor_primaria 
      : tipo === 'secundaria' ? dados.cor_secundaria 
      : dados.cor_destaque;
    setCorCustomizada(corAtual);
    setModalCoresAberto(true);
  };

  const aplicarPaleta = (paleta: Paleta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDados((prev: DadosPersonalizacao) => ({
      ...prev,
      cor_primaria: paleta.primaria,
      cor_secundaria: paleta.secundaria,
      cor_destaque: paleta.destaque,
    }));
  };

  const selecionarCor = (cor: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tipoCor === 'primaria') {
      setDados((prev: DadosPersonalizacao) => ({ ...prev, cor_primaria: cor }));
    } else if (tipoCor === 'secundaria') {
      setDados((prev: DadosPersonalizacao) => ({ ...prev, cor_secundaria: cor }));
    } else {
      setDados((prev: DadosPersonalizacao) => ({ ...prev, cor_destaque: cor }));
    }
    setModalCoresAberto(false);
  };

  const selecionarFonte = (tipo: 'principal' | 'titulos', fonte: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tipo === 'principal') {
      setDados((prev: DadosPersonalizacao) => ({ ...prev, fonte_principal: fonte }));
    } else {
      setDados((prev: DadosPersonalizacao) => ({ ...prev, fonte_titulos: fonte }));
    }
  };

  const obterCorAtual = (tipo: TipoCor) => {
    return tipo === 'primaria' ? dados.cor_primaria 
      : tipo === 'secundaria' ? dados.cor_secundaria 
      : dados.cor_destaque;
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

  const abas: { id: AbaAtiva; titulo: string; icone: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'paletas', titulo: 'Paletas', icone: 'color-palette-outline' },
    { id: 'cores', titulo: 'Cores', icone: 'color-fill-outline' },
    { id: 'fontes', titulo: 'Fontes', icone: 'text-outline' },
    { id: 'dados', titulo: 'Dados', icone: 'information-circle-outline' },
  ];

  const ehPaletaSelecionada = (paleta: Paleta) => {
    return dados.cor_primaria === paleta.primaria &&
      dados.cor_secundaria === paleta.secundaria &&
      dados.cor_destaque === paleta.destaque;
  };

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 12,
          backgroundColor: cores.fundo.secundario,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={cores.texto.primario} />
          </Pressable>
          <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '700' }}>
            Personalização
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Abas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {abas.map((aba) => (
            <Pressable
              key={aba.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAbaAtiva(aba.id);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: abaAtiva === aba.id ? cores.primaria.DEFAULT : cores.fundo.terciario,
                borderWidth: 1,
                borderColor: abaAtiva === aba.id ? cores.primaria.DEFAULT : cores.borda.sutil,
              }}
            >
              <Ionicons
                name={aba.icone}
                size={16}
                color={abaAtiva === aba.id ? cores.botao.texto : cores.texto.secundario}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: abaAtiva === aba.id ? cores.botao.texto : cores.texto.secundario,
                }}
              >
                {aba.titulo}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Card - Sempre Visível */}
        <Card style={{ overflow: 'hidden', marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: dados.cor_primaria,
              padding: 20,
              alignItems: 'center',
              marginHorizontal: -16,
              marginTop: -16,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: dados.cor_secundaria,
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
                <Ionicons name="storefront" size={24} color={dados.cor_primaria} />
              )}
            </View>
            <Text style={{ color: dados.cor_texto, fontSize: 16, fontWeight: '700', marginTop: 10 }}>
              {dados.nome || 'Nome do Estabelecimento'}
            </Text>
          </View>
          <View style={{ padding: 16, backgroundColor: dados.cor_secundaria }}>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
              <View style={{ backgroundColor: dados.cor_primaria, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}>
                <Text style={{ color: dados.cor_texto, fontSize: 12, fontWeight: '600' }}>Serviço 1</Text>
              </View>
              <View style={{ backgroundColor: dados.cor_destaque, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}>
                <Text style={{ color: dados.cor_primaria, fontSize: 12, fontWeight: '600' }}>Agendar</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Conteúdo da Aba - Paletas */}
        {abaAtiva === 'paletas' && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
              Paletas de Cores
            </Text>
            <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 16 }}>
              {tipoNegocio === 'nail_designer' 
                ? 'Paletas elegantes para seu estúdio de nail design'
                : 'Paletas profissionais para sua barbearia'}
            </Text>

            <View style={{ gap: 12 }}>
              {paletas.map((paleta) => {
                const selecionada = ehPaletaSelecionada(paleta);
                return (
                  <Pressable
                    key={paleta.nome}
                    onPress={() => aplicarPaleta(paleta)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: selecionada ? cores.primaria.DEFAULT + '15' : cores.fundo.card,
                      borderWidth: 2,
                      borderColor: selecionada ? cores.primaria.DEFAULT : cores.borda.sutil,
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 6, marginRight: 14 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: paleta.primaria, borderWidth: 1, borderColor: cores.borda.sutil }} />
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: paleta.secundaria, borderWidth: 1, borderColor: cores.borda.sutil }} />
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: paleta.destaque, borderWidth: 1, borderColor: cores.borda.sutil }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600' }}>
                        {paleta.nome}
                      </Text>
                      <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                        {paleta.descricao}
                      </Text>
                    </View>
                    {selecionada && (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: cores.primaria.DEFAULT, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Conteúdo da Aba - Cores Individuais */}
        {abaAtiva === 'cores' && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
              Cores Personalizadas
            </Text>
            <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 16 }}>
              Ajuste cada cor individualmente
            </Text>

            <View style={{ gap: 12 }}>
              {/* Cor Primária */}
              <Pressable
                onPress={() => abrirSeletorCor('primaria')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: cores.fundo.card, borderRadius: 12, borderWidth: 1, borderColor: cores.borda.sutil }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dados.cor_primaria }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '500' }}>Cor Primária</Text>
                  <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>{dados.cor_primaria.toUpperCase()} • Fundo principal</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={cores.texto.terciario} />
              </Pressable>

              {/* Cor Secundária */}
              <Pressable
                onPress={() => abrirSeletorCor('secundaria')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: cores.fundo.card, borderRadius: 12, borderWidth: 1, borderColor: cores.borda.sutil }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dados.cor_secundaria }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '500' }}>Cor Secundária</Text>
                  <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>{dados.cor_secundaria.toUpperCase()} • Cards e áreas</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={cores.texto.terciario} />
              </Pressable>

              {/* Cor de Destaque */}
              <Pressable
                onPress={() => abrirSeletorCor('destaque')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: cores.fundo.card, borderRadius: 12, borderWidth: 1, borderColor: cores.borda.sutil }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: dados.cor_destaque }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '500' }}>Cor de Destaque</Text>
                  <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>{dados.cor_destaque.toUpperCase()} • Botões de ação</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={cores.texto.terciario} />
              </Pressable>
            </View>

            {/* Logo */}
            <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 12 }}>
              Logo
            </Text>
            <Pressable onPress={selecionarImagem} disabled={salvando}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: cores.fundo.terciario,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: dados.cor_primaria,
                    overflow: 'hidden',
                  }}
                >
                  {dados.logo_url ? (
                    <Image source={{ uri: dados.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Ionicons name="camera" size={28} color={cores.texto.terciario} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '500' }}>Alterar Logo</Text>
                  <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>Toque para selecionar uma imagem</Text>
                </View>
                <Ionicons name="image-outline" size={24} color={cores.primaria.DEFAULT} />
              </Card>
            </Pressable>
          </Animated.View>
        )}

        {/* Conteúdo da Aba - Fontes */}
        {abaAtiva === 'fontes' && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
              Tipografia
            </Text>
            <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 16 }}>
              Escolha as fontes do seu site
            </Text>

            {/* Fonte Principal */}
            <Text style={{ color: cores.texto.secundario, fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
              Fonte Principal (Textos)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {FONTES_DISPONIVEIS.map((fonte) => {
                const selecionada = dados.fonte_principal === fonte.nome;
                return (
                  <Pressable
                    key={fonte.nome}
                    onPress={() => selecionarFonte('principal', fonte.nome)}
                    style={{
                      width: (LARGURA_TELA - 60) / 2,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: selecionada ? '#18181b' : cores.fundo.card,
                      borderWidth: selecionada ? 2 : 1,
                      borderColor: selecionada ? '#ffffff' : cores.borda.sutil,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        fontFamily: fonte.familia,
                        color: selecionada ? '#ffffff' : cores.texto.primario,
                      }}
                    >
                      {fonte.nome}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        marginTop: 2,
                        color: selecionada ? 'rgba(255,255,255,0.7)' : cores.texto.terciario,
                      }}
                    >
                      {fonte.descricao}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Fonte dos Títulos */}
            <Text style={{ color: cores.texto.secundario, fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
              Fonte de Títulos (Destaques)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {FONTES_DISPONIVEIS.slice(0, 6).map((fonte) => {
                const selecionada = dados.fonte_titulos === fonte.nome;
                return (
                  <Pressable
                    key={fonte.nome}
                    onPress={() => selecionarFonte('titulos', fonte.nome)}
                    style={{
                      width: (LARGURA_TELA - 60) / 2,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: selecionada ? '#18181b' : cores.fundo.card,
                      borderWidth: selecionada ? 2 : 1,
                      borderColor: selecionada ? '#ffffff' : cores.borda.sutil,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        fontFamily: fonte.familia,
                        color: selecionada ? '#ffffff' : cores.texto.primario,
                      }}
                    >
                      {fonte.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Conteúdo da Aba - Dados */}
        {abaAtiva === 'dados' && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={{ color: cores.texto.primario, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
              Dados do {estabelecimento()}
            </Text>
            <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 16 }}>
              Informações de contato e localização
            </Text>

            <Card style={{ gap: 16 }}>
              <Input
                rotulo="Nome"
                placeholder={`Nome do ${estabelecimento()}`}
                value={dados.nome}
                onChangeText={(v: string) => setDados((prev: DadosPersonalizacao) => ({ ...prev, nome: v }))}
              />
              <Input
                rotulo="Endereço"
                placeholder="Rua, número, bairro"
                value={dados.endereco}
                onChangeText={(v: string) => setDados((prev: DadosPersonalizacao) => ({ ...prev, endereco: v }))}
              />
              <Input
                rotulo="Telefone"
                placeholder="(00) 0000-0000"
                value={dados.telefone}
                onChangeText={(v: string) => setDados((prev: DadosPersonalizacao) => ({ ...prev, telefone: v }))}
                keyboardType="phone-pad"
              />
              <Input
                rotulo="WhatsApp"
                placeholder="(00) 00000-0000"
                value={dados.whatsapp}
                onChangeText={(v: string) => setDados((prev: DadosPersonalizacao) => ({ ...prev, whatsapp: v }))}
                keyboardType="phone-pad"
              />
              <Input
                rotulo="Instagram"
                placeholder="@seuperfil"
                value={dados.instagram}
                onChangeText={(v: string) => setDados((prev: DadosPersonalizacao) => ({ ...prev, instagram: v }))}
              />
            </Card>
          </Animated.View>
        )}
      </ScrollView>

      {/* Botão Salvar Fixo */}
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
        titulo={`Cor ${tipoCor === 'primaria' ? 'Primária' : tipoCor === 'secundaria' ? 'Secundária' : 'de Destaque'}`}
        tamanho="grande"
        tema={tema}
      >
        <View style={{ gap: 20 }}>
          {/* Cores das Paletas */}
          <View>
            <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 12 }}>
              Cores das Paletas
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {paletas.map((paleta) => {
                const corPaleta = tipoCor === 'primaria' ? paleta.primaria 
                  : tipoCor === 'secundaria' ? paleta.secundaria 
                  : paleta.destaque;
                const corAtual = obterCorAtual(tipoCor);
                return (
                  <Pressable
                    key={paleta.nome + tipoCor}
                    onPress={() => selecionarCor(corPaleta)}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: corPaleta,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: corAtual === corPaleta ? '#fff' : 'transparent',
                    }}
                  >
                    {corAtual === corPaleta && (
                      <Ionicons name="checkmark" size={24} color="#fff" />
                    )}
                  </Pressable>
                );
              })}
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
                <Text style={{ color: '#fff', fontWeight: '600' }}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
