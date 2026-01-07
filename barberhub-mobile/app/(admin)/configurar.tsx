/**
 * Tela de Configuração Step-by-Step
 * Design idêntico ao /configurar do site web
 * 6 etapas: Identidade, Contato, Localização, Aparência, Serviços, Equipe
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  useColorScheme,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';

type TipoNegocio = 'barbearia' | 'nail_designer';

interface Paleta {
  nome: string;
  descricao: string;
  primaria: string;
  secundaria: string;
  destaque: string;
}

// Paletas para Barbearias
const PALETAS_BARBEARIA: Paleta[] = [
  { nome: 'Obsidian', descricao: 'Elegância clássica', primaria: '#09090b', secundaria: '#fafafa', destaque: '#fafafa' },
  { nome: 'Grafite', descricao: 'Minimalismo moderno', primaria: '#18181b', secundaria: '#f4f4f5', destaque: '#a1a1aa' },
  { nome: 'Midnight', descricao: 'Sofisticação noturna', primaria: '#0c0a09', secundaria: '#fafaf9', destaque: '#a8a29e' },
  { nome: 'Slate', descricao: 'Profissional discreto', primaria: '#0f172a', secundaria: '#f8fafc', destaque: '#94a3b8' },
  { nome: 'Charcoal', descricao: 'Neutro atemporal', primaria: '#171717', secundaria: '#fafafa', destaque: '#d4d4d4' },
  { nome: 'Navy', descricao: 'Azul profundo', primaria: '#0c1929', secundaria: '#f0f9ff', destaque: '#38bdf8' },
  { nome: 'Forest', descricao: 'Verde floresta', primaria: '#052e16', secundaria: '#f0fdf4', destaque: '#4ade80' },
  { nome: 'Wine', descricao: 'Vinho elegante', primaria: '#1c0a0a', secundaria: '#fef2f2', destaque: '#f87171' },
];

// Paletas para Nail Designers
const PALETAS_NAIL: Paleta[] = [
  { nome: 'Nude', descricao: 'Elegância natural', primaria: '#faf5f0', secundaria: '#1c1917', destaque: '#d4a574' },
  { nome: 'Blush', descricao: 'Rosa suave', primaria: '#fdf2f8', secundaria: '#1f1f1f', destaque: '#f9a8d4' },
  { nome: 'Rose Gold', descricao: 'Luxo atemporal', primaria: '#1a1a1a', secundaria: '#fefefe', destaque: '#d4a574' },
  { nome: 'Champagne', descricao: 'Sofisticação leve', primaria: '#fffbeb', secundaria: '#292524', destaque: '#d4a574' },
  { nome: 'Burgundy', descricao: 'Vinho sofisticado', primaria: '#1c0a0a', secundaria: '#fef2f2', destaque: '#be123c' },
  { nome: 'Mauve', descricao: 'Roxo delicado', primaria: '#faf5ff', secundaria: '#1e1033', destaque: '#c084fc' },
  { nome: 'Lavanda', descricao: 'Lilás relaxante', primaria: '#faf5ff', secundaria: '#3b0764', destaque: '#e879f9' },
  { nome: 'Coral', descricao: 'Coral vibrante', primaria: '#fff7ed', secundaria: '#1c1917', destaque: '#fb923c' },
];

interface DadosConfiguracao {
  nome: string;
  logoUrl: string;
  telefone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  endereco: string;
  cidade: string;
  estado: string;
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
}

interface Etapa {
  id: number;
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  descricao: string;
  tituloCompleto: string;
  subtitulo: string;
  dicas: string[];
}

function obterEtapas(tipoNegocio: TipoNegocio | undefined): Etapa[] {
  const ehNail = tipoNegocio === 'nail_designer';
  
  return [
    {
      id: 1,
      titulo: 'Identidade',
      icone: 'storefront-outline',
      descricao: 'Nome e logo',
      tituloCompleto: ehNail ? 'Identidade do seu estúdio' : 'Identidade da sua barbearia',
      subtitulo: 'Vamos começar pelo básico: como seus clientes vão conhecer você',
      dicas: ehNail ? [
        'Use o nome oficial do seu estúdio',
        'A logo aparecerá no site e nos agendamentos',
        'Você pode alterar depois a qualquer momento'
      ] : [
        'Use o nome oficial da sua barbearia',
        'A logo aparecerá no site e nos agendamentos',
        'Você pode alterar depois a qualquer momento'
      ]
    },
    {
      id: 2,
      titulo: 'Contato',
      icone: 'call-outline',
      descricao: 'Telefone e redes',
      tituloCompleto: 'Informações de contato',
      subtitulo: ehNail 
        ? 'Como suas clientes podem entrar em contato com você'
        : 'Como seus clientes podem entrar em contato com você',
      dicas: ehNail ? [
        'O WhatsApp é essencial para notificações',
        'Instagram é fundamental para mostrar seu portfólio',
        'E-mail é usado para comunicações importantes'
      ] : [
        'O WhatsApp é essencial para notificações',
        'Instagram ajuda clientes a conhecerem seu trabalho',
        'E-mail é usado para comunicações importantes'
      ]
    },
    {
      id: 3,
      titulo: 'Localização',
      icone: 'location-outline',
      descricao: 'Endereço',
      tituloCompleto: ehNail ? 'Onde fica seu estúdio' : 'Onde fica sua barbearia',
      subtitulo: ehNail 
        ? 'Ajude suas clientes a te encontrarem facilmente'
        : 'Ajude seus clientes a te encontrarem facilmente',
      dicas: [
        'Endereço completo facilita a navegação GPS',
        'Inclua referências se necessário',
        'Cidade e estado ajudam em buscas locais'
      ]
    },
    {
      id: 4,
      titulo: 'Aparência',
      icone: 'color-palette-outline',
      descricao: 'Cores do site',
      tituloCompleto: 'Aparência do seu site',
      subtitulo: 'Escolha as cores que representam a identidade da sua marca',
      dicas: ehNail ? [
        'Cores suaves transmitem delicadeza',
        'Tons rosados e nude são populares no segmento',
        'Você pode alterar as cores quando quiser'
      ] : [
        'Cores escuras passam sofisticação',
        'Cores claras são mais leves e modernas',
        'Você pode alterar as cores quando quiser'
      ]
    },
    {
      id: 5,
      titulo: 'Serviços',
      icone: ehNail ? 'hand-left-outline' : 'cut-outline',
      descricao: 'Seus serviços',
      tituloCompleto: 'Cadastre seus serviços',
      subtitulo: ehNail 
        ? 'Defina o que seu estúdio oferece, preços e duração'
        : 'Defina o que sua barbearia oferece, preços e duração',
      dicas: ehNail ? [
        'Adicione alongamentos, esmaltações, nail art, etc.',
        'A duração ajuda a organizar a agenda',
        'Você pode editar serviços depois no painel'
      ] : [
        'Adicione nome, preço e duração de cada serviço',
        'A duração ajuda a organizar a agenda',
        'Você pode editar serviços depois no painel'
      ]
    },
    {
      id: 6,
      titulo: 'Equipe',
      icone: 'people-outline',
      descricao: 'Profissionais',
      tituloCompleto: ehNail ? 'Sua equipe de nail designers' : 'Sua equipe de profissionais',
      subtitulo: ehNail 
        ? 'Cadastre as profissionais e gere códigos de acesso'
        : 'Cadastre os barbeiros e gere códigos de acesso',
      dicas: ehNail ? [
        'Cada nail designer recebe um código único',
        'Elas poderão ver apenas seus próprios agendamentos',
        'Você pode gerenciar comissões pelo painel admin'
      ] : [
        'Cada barbeiro recebe um código único de acesso',
        'Eles poderão ver apenas seus próprios agendamentos',
        'Você pode gerenciar comissões pelo painel admin'
      ]
    },
  ];
}

export default function TelaConfigurar() {
  const router = useRouter();
  const { cores, tema, ehEscuro } = useTema();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>('barbearia');
  const [uploadandoLogo, setUploadandoLogo] = useState(false);
  
  const [dados, setDados] = useState<DadosConfiguracao>({
    nome: '',
    logoUrl: '',
    telefone: '',
    whatsapp: '',
    email: '',
    instagram: '',
    endereco: '',
    cidade: '',
    estado: '',
    corPrimaria: '#18181b',
    corSecundaria: '#f4f4f5',
    corDestaque: '#a1a1aa',
  });

  const ETAPAS = obterEtapas(tipoNegocio);
  const TOTAL_ETAPAS = ETAPAS.length;
  const ehNail = tipoNegocio === 'nail_designer';
  const PALETAS = ehNail ? PALETAS_NAIL : PALETAS_BARBEARIA;

  // Carregar dados do tenant
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // Buscar proprietário e tenant
      const { data: proprietario } = await supabase
        .from('proprietarios')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!proprietario?.tenant_id) {
        Alert.alert('Erro', 'Não foi possível encontrar sua barbearia');
        router.replace('/(auth)/login');
        return;
      }

      setTenantId(proprietario.tenant_id);

      // Buscar dados do tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', proprietario.tenant_id)
        .single();

      if (tenant) {
        setTipoNegocio(tenant.tipo_negocio || 'barbearia');
        setDados({
          nome: tenant.nome || '',
          logoUrl: tenant.logo_url || '',
          telefone: tenant.telefone || '',
          whatsapp: tenant.whatsapp || '',
          email: tenant.email || '',
          instagram: tenant.instagram || '',
          endereco: tenant.endereco || '',
          cidade: tenant.cidade || '',
          estado: tenant.estado || '',
          corPrimaria: tenant.cor_primaria || '#18181b',
          corSecundaria: tenant.cor_secundaria || '#f4f4f5',
          corDestaque: tenant.cor_destaque || '#a1a1aa',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setCarregando(false);
    }
  };

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const salvarDadosAtuais = async () => {
    if (!tenantId) return;
    try {
      await supabase
        .from('tenants')
        .update({
          nome: dados.nome,
          logo_url: dados.logoUrl || null,
          telefone: dados.telefone || null,
          whatsapp: dados.whatsapp || null,
          email: dados.email,
          instagram: dados.instagram || null,
          endereco: dados.endereco || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          cor_primaria: dados.corPrimaria,
          cor_secundaria: dados.corSecundaria,
          cor_destaque: dados.corDestaque,
        })
        .eq('id', tenantId);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const avancar = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (etapaAtual < TOTAL_ETAPAS) {
      await salvarDadosAtuais();
      setEtapaAtual(etapaAtual + 1);
    }
  };

  const voltar = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1);
    } else {
      router.back();
    }
  };

  const finalizar = async () => {
    setSalvando(true);
    try {
      await salvarDadosAtuais();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(admin)/dashboard');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as configurações');
    } finally {
      setSalvando(false);
    }
  };

  const selecionarLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar a logo');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!resultado.canceled && resultado.assets[0]) {
        await uploadLogo(resultado.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const uploadLogo = async (uri: string) => {
    if (!tenantId) return;
    
    setUploadandoLogo(true);
    try {
      // Criar FormData
      const formData = new FormData();
      const nomeArquivo = `logo_${tenantId}_${Date.now()}.jpg`;
      
      formData.append('file', {
        uri,
        name: nomeArquivo,
        type: 'image/jpeg',
      } as any);

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(nomeArquivo, formData, {
          contentType: 'multipart/form-data',
        });

      if (error) {
        // Tentar upload de outra forma
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logos')
          .upload(nomeArquivo, blob, {
            contentType: 'image/jpeg',
          });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(nomeArquivo);
          
        setDados({ ...dados, logoUrl: publicUrl });
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(nomeArquivo);
          
        setDados({ ...dados, logoUrl: publicUrl });
      }
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Erro no upload:', error);
      Alert.alert('Erro', 'Não foi possível fazer upload da logo');
    } finally {
      setUploadandoLogo(false);
    }
  };

  const aplicarPaleta = (paleta: Paleta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDados({
      ...dados,
      corPrimaria: paleta.primaria,
      corSecundaria: paleta.secundaria,
      corDestaque: paleta.destaque,
    });
  };

  const renderEtapa = () => {
    const etapa = ETAPAS[etapaAtual - 1];
    
    switch (etapaAtual) {
      case 1:
        return (
          <View style={{ gap: 24 }}>
            {/* Nome */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                {ehNail ? 'Nome do Estúdio *' : 'Nome da Barbearia *'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: cores.fundo.card,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons name="storefront-outline" size={20} color={cores.texto.terciario} />
                <TextInput
                  value={dados.nome}
                  onChangeText={(v) => setDados({ ...dados, nome: v })}
                  placeholder={ehNail ? 'Ex: Studio Nails Premium' : 'Ex: Barbearia Premium'}
                  placeholderTextColor={cores.texto.terciario}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: cores.texto.primario,
                  }}
                />
              </View>
            </View>

            {/* Logo */}
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                {ehNail ? 'Logo do Estúdio' : 'Logo da Barbearia'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 16,
                    backgroundColor: dados.corPrimaria,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: cores.borda.sutil,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {uploadandoLogo ? (
                    <ActivityIndicator color={dados.corSecundaria} />
                  ) : dados.logoUrl ? (
                    <Image
                      source={{ uri: dados.logoUrl }}
                      style={{ width: 96, height: 96 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Ionicons 
                      name="storefront-outline" 
                      size={32} 
                      color={dados.corSecundaria + '50'} 
                    />
                  )}
                </View>
                <View style={{ gap: 8 }}>
                  <Pressable
                    onPress={selecionarLogo}
                    disabled={uploadandoLogo}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: ehEscuro ? cores.zinc[800] : cores.zinc[100],
                      borderRadius: 10,
                    }}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color={cores.texto.primario} />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.primario }}>
                      {dados.logoUrl ? 'Trocar' : 'Enviar'}
                    </Text>
                  </Pressable>
                  {dados.logoUrl && (
                    <Pressable
                      onPress={() => setDados({ ...dados, logoUrl: '' })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={cores.texto.terciario} />
                      <Text style={{ fontSize: 13, color: cores.texto.terciario }}>Remover</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              <Text style={{ fontSize: 12, color: cores.texto.terciario }}>
                JPG, PNG ou WebP • Máximo 5MB
              </Text>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={{ gap: 20 }}>
            {/* Telefone */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                Telefone
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: cores.fundo.card,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons name="call-outline" size={20} color={cores.texto.terciario} />
                <TextInput
                  value={dados.telefone}
                  onChangeText={(v) => setDados({ ...dados, telefone: formatarTelefone(v) })}
                  placeholder="(00) 0000-0000"
                  placeholderTextColor={cores.texto.terciario}
                  keyboardType="phone-pad"
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: cores.texto.primario,
                  }}
                />
              </View>
            </View>

            {/* WhatsApp */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                WhatsApp *
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: cores.fundo.card,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons name="logo-whatsapp" size={20} color={cores.texto.terciario} />
                <TextInput
                  value={dados.whatsapp}
                  onChangeText={(v) => setDados({ ...dados, whatsapp: formatarTelefone(v) })}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={cores.texto.terciario}
                  keyboardType="phone-pad"
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: cores.texto.primario,
                  }}
                />
              </View>
              <Text style={{ fontSize: 12, color: cores.texto.terciario }}>
                Usado para notificações de agendamento
              </Text>
            </View>

            {/* Email */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                E-mail
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: cores.fundo.card,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons name="mail-outline" size={20} color={cores.texto.terciario} />
                <TextInput
                  value={dados.email}
                  onChangeText={(v) => setDados({ ...dados, email: v })}
                  placeholder={ehNail ? 'contato@seuestudio.com' : 'contato@barbearia.com'}
                  placeholderTextColor={cores.texto.terciario}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: cores.texto.primario,
                  }}
                />
              </View>
            </View>

            {/* Instagram */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                Instagram
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: cores.fundo.card,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons name="logo-instagram" size={20} color={cores.texto.terciario} />
                <TextInput
                  value={dados.instagram}
                  onChangeText={(v) => setDados({ ...dados, instagram: v })}
                  placeholder={ehNail ? '@seuestudionails' : '@suabarbearia'}
                  placeholderTextColor={cores.texto.terciario}
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: cores.texto.primario,
                  }}
                />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={{ gap: 20 }}>
            {/* Endereço */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                Endereço completo
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: cores.fundo.card,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons name="location-outline" size={20} color={cores.texto.terciario} />
                <TextInput
                  value={dados.endereco}
                  onChangeText={(v) => setDados({ ...dados, endereco: v })}
                  placeholder="Rua, número, bairro"
                  placeholderTextColor={cores.texto.terciario}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    fontSize: 16,
                    color: cores.texto.primario,
                  }}
                />
              </View>
            </View>

            {/* Cidade e Estado */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 2, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                  Cidade
                </Text>
                <TextInput
                  value={dados.cidade}
                  onChangeText={(v) => setDados({ ...dados, cidade: v })}
                  placeholder="São Paulo"
                  placeholderTextColor={cores.texto.terciario}
                  style={{
                    backgroundColor: cores.fundo.card,
                    borderWidth: 1,
                    borderColor: cores.borda.sutil,
                    borderRadius: 12,
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    fontSize: 16,
                    color: cores.texto.primario,
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                  Estado
                </Text>
                <TextInput
                  value={dados.estado}
                  onChangeText={(v) => setDados({ ...dados, estado: v.toUpperCase() })}
                  placeholder="SP"
                  placeholderTextColor={cores.texto.terciario}
                  maxLength={2}
                  style={{
                    backgroundColor: cores.fundo.card,
                    borderWidth: 1,
                    borderColor: cores.borda.sutil,
                    borderRadius: 12,
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    fontSize: 16,
                    color: cores.texto.primario,
                    textTransform: 'uppercase',
                  }}
                />
              </View>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 14, color: cores.texto.secundario, marginBottom: 8 }}>
              Escolha uma paleta de cores para seu site:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {PALETAS.map((paleta) => {
                const selecionada = dados.corPrimaria === paleta.primaria;
                return (
                  <Pressable
                    key={paleta.nome}
                    onPress={() => aplicarPaleta(paleta)}
                    style={{
                      width: '47%',
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selecionada 
                        ? (ehEscuro ? '#ffffff' : cores.zinc[900])
                        : cores.borda.sutil,
                      backgroundColor: selecionada
                        ? (ehEscuro ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)')
                        : cores.fundo.card,
                    }}
                  >
                    {selecionada && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: ehEscuro ? '#ffffff' : cores.zinc[900],
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="checkmark" size={12} color={ehEscuro ? cores.zinc[900] : '#ffffff'} />
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: paleta.primaria,
                          borderWidth: 1,
                          borderColor: cores.borda.sutil,
                        }}
                      />
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: paleta.secundaria,
                          borderWidth: 1,
                          borderColor: cores.borda.sutil,
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: cores.texto.primario }}>
                      {paleta.nome}
                    </Text>
                    <Text style={{ fontSize: 12, color: cores.texto.terciario, marginTop: 2 }}>
                      {paleta.descricao}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={{ gap: 20 }}>
            <View
              style={{
                padding: 20,
                backgroundColor: ehEscuro ? 'rgba(255,255,255,0.03)' : cores.fundo.secundario,
                borderRadius: 16,
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: ehEscuro ? 'rgba(255,255,255,0.1)' : cores.zinc[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons 
                  name={ehNail ? 'hand-left-outline' : 'cut-outline'} 
                  size={28} 
                  color={cores.texto.secundario} 
                />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: cores.texto.primario, textAlign: 'center' }}>
                Gerencie seus serviços no painel
              </Text>
              <Text style={{ fontSize: 14, color: cores.texto.secundario, textAlign: 'center', lineHeight: 20 }}>
                {ehNail 
                  ? 'Já criamos alguns serviços de exemplo para você. Acesse o painel admin para editar, adicionar ou remover serviços.'
                  : 'Já criamos alguns serviços de exemplo para você. Acesse o painel admin para editar, adicionar ou remover serviços.'
                }
              </Text>
              <Pressable
                onPress={() => router.push('/(admin)/servicos')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  backgroundColor: cores.botao.fundo,
                  borderRadius: 10,
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: cores.botao.texto }}>
                  Gerenciar Serviços
                </Text>
                <Ionicons name="arrow-forward" size={16} color={cores.botao.texto} />
              </Pressable>
            </View>
          </View>
        );

      case 6:
        return (
          <View style={{ gap: 20 }}>
            <View
              style={{
                padding: 20,
                backgroundColor: ehEscuro ? 'rgba(255,255,255,0.03)' : cores.fundo.secundario,
                borderRadius: 16,
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: ehEscuro ? 'rgba(255,255,255,0.1)' : cores.zinc[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="people-outline" size={28} color={cores.texto.secundario} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: cores.texto.primario, textAlign: 'center' }}>
                Cadastre sua equipe no painel
              </Text>
              <Text style={{ fontSize: 14, color: cores.texto.secundario, textAlign: 'center', lineHeight: 20 }}>
                {ehNail 
                  ? 'Adicione as nail designers que trabalham no seu estúdio. Cada uma receberá um código único de acesso.'
                  : 'Adicione os barbeiros que trabalham na sua barbearia. Cada um receberá um código único de acesso.'
                }
              </Text>
              <Pressable
                onPress={() => router.push('/(admin)/barbeiros')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  backgroundColor: cores.botao.fundo,
                  borderRadius: 10,
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: cores.botao.texto }}>
                  {ehNail ? 'Gerenciar Equipe' : 'Gerenciar Barbeiros'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={cores.botao.texto} />
              </Pressable>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (carregando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo.primario, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={cores.texto.primario} />
      </SafeAreaView>
    );
  }

  const etapaAtualObj = ETAPAS[etapaAtual - 1];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      <StatusBar barStyle={ehEscuro ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: cores.borda.sutil,
        }}
      >
        <Pressable
          onPress={voltar}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
          }}
        >
          <Ionicons name="arrow-back" size={24} color={cores.texto.primario} />
        </Pressable>
        <Image
          source={
            ehEscuro
              ? require('../../assets/images/logoblack.png')
              : require('../../assets/images/logowhite.png')
          }
          style={{ width: 140, height: 46 }}
          contentFit="contain"
        />
        <Pressable
          onPress={() => router.push('/(admin)/dashboard')}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 13, color: cores.texto.terciario }}>Pular</Text>
        </Pressable>
      </View>

      {/* Barra de progresso */}
      <View style={{ backgroundColor: cores.fundo.secundario, height: 4 }}>
        <View
          style={{
            height: 4,
            width: `${(etapaAtual / TOTAL_ETAPAS) * 100}%`,
            backgroundColor: ehEscuro ? '#fff' : cores.zinc[900],
          }}
        />
      </View>

      {/* Indicadores de etapas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
        }}
        style={{ borderBottomWidth: 1, borderBottomColor: cores.borda.sutil }}
      >
        {ETAPAS.map((etapa) => {
          const ativa = etapaAtual === etapa.id;
          const completa = etapaAtual > etapa.id;
          return (
            <Pressable
              key={etapa.id}
              onPress={() => etapa.id < etapaAtual && setEtapaAtual(etapa.id)}
              disabled={etapa.id > etapaAtual}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: ativa 
                  ? (ehEscuro ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                  : 'transparent',
                opacity: etapa.id > etapaAtual ? 0.4 : 1,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: ativa
                    ? (ehEscuro ? '#fff' : cores.zinc[900])
                    : completa
                      ? cores.zinc[300]
                      : cores.fundo.terciario,
                }}
              >
                {completa ? (
                  <Ionicons name="checkmark" size={14} color={cores.zinc[700]} />
                ) : (
                  <Ionicons 
                    name={etapa.icone} 
                    size={14} 
                    color={ativa ? (ehEscuro ? cores.zinc[900] : '#fff') : cores.texto.terciario} 
                  />
                )}
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: ativa ? '600' : '400',
                  color: ativa ? cores.texto.primario : cores.texto.secundario,
                }}
              >
                {etapa.titulo}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cabeçalho da etapa */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: ehEscuro ? 'rgba(255,255,255,0.1)' : cores.zinc[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={etapaAtualObj.icone} size={22} color={cores.texto.secundario} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: cores.texto.primario }}>
                  {etapaAtualObj.tituloCompleto}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: cores.texto.secundario, marginLeft: 56 }}>
              {etapaAtualObj.subtitulo}
            </Text>
          </View>

          {/* Dicas */}
          <View
            style={{
              padding: 16,
              backgroundColor: ehEscuro ? 'rgba(255,255,255,0.03)' : cores.fundo.secundario,
              borderRadius: 12,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: cores.borda.sutil,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="information-circle-outline" size={16} color={cores.texto.terciario} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: cores.texto.terciario, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Dicas rápidas
              </Text>
            </View>
            {etapaAtualObj.dicas.map((dica, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 13, color: cores.texto.secundario, flex: 1, lineHeight: 18 }}>
                  {dica}
                </Text>
              </View>
            ))}
          </View>

          {/* Conteúdo da etapa */}
          {renderEtapa()}

          {/* Botões */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
            {etapaAtual > 1 && (
              <Pressable
                onPress={voltar}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: cores.borda.sutil,
                }}
              >
                <Ionicons name="arrow-back" size={18} color={cores.texto.secundario} />
                <Text style={{ fontSize: 15, fontWeight: '500', color: cores.texto.secundario }}>
                  Voltar
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={etapaAtual < TOTAL_ETAPAS ? avancar : finalizar}
              disabled={salvando}
              style={{
                flex: etapaAtual > 1 ? 1 : undefined,
                width: etapaAtual === 1 ? '100%' : undefined,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: cores.botao.fundo,
                paddingVertical: 16,
                borderRadius: 12,
                opacity: salvando ? 0.7 : 1,
              }}
            >
              {salvando ? (
                <ActivityIndicator color={cores.botao.texto} />
              ) : (
                <>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: cores.botao.texto }}>
                    {etapaAtual < TOTAL_ETAPAS ? 'Continuar' : 'Finalizar'}
                  </Text>
                  <Ionicons 
                    name={etapaAtual < TOTAL_ETAPAS ? 'arrow-forward' : 'checkmark'} 
                    size={18} 
                    color={cores.botao.texto} 
                  />
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
