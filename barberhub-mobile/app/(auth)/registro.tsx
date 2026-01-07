/**
 * Tela de Registro
 * Design idêntico ao /registrar do site web
 * Paleta Zinc, modo claro/escuro, step-by-step
 */

import React, { useState, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';

const { width: LARGURA_TELA } = Dimensions.get('window');

type TipoNegocio = 'barbearia' | 'nail_designer';

// Componente de Input - FORA do componente principal para evitar re-render
interface InputCustomizadoProps {
  rotulo: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icone: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  cores: any;
}

const InputCustomizado = React.memo(({
  rotulo,
  placeholder,
  value,
  onChangeText,
  icone,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  cores,
}: InputCustomizadoProps) => {
  if (!cores) return null;
  
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
        {rotulo}
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
        <Ionicons name={icone} size={20} color={cores.texto.terciario} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={cores.texto.terciario}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
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
  );
});

InputCustomizado.displayName = 'InputCustomizado';

interface DadosRegistro {
  tipoNegocio: TipoNegocio;
  nomeEstabelecimento: string;
  nomeProprietario: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
}

export default function TelaRegistro() {
  const router = useRouter();
  const { cores, ehEscuro } = useTema();
  
  const [carregando, setCarregando] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [erro, setErro] = useState('');

  const [dados, setDados] = useState<DadosRegistro>({
    tipoNegocio: 'barbearia',
    nomeEstabelecimento: '',
    nomeProprietario: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
  });

  const ehNailDesigner = dados.tipoNegocio === 'nail_designer';
  const nomeEstabelecimentoLabel = ehNailDesigner ? 'Nome do Estúdio' : 'Nome da Barbearia';
  const placeholderEstabelecimento = ehNailDesigner ? 'Ex: Studio Nails da Maria' : 'Ex: Barbearia do João';

  const atualizarDados = (campo: keyof DadosRegistro, valor: string) => {
    setDados({ ...dados, [campo]: valor });
    setErro('');
  };

  const validarEtapa1 = () => {
    if (!dados.nomeEstabelecimento.trim()) {
      setErro(ehNailDesigner ? 'Informe o nome do estúdio' : 'Informe o nome da barbearia');
      return false;
    }
    if (!dados.nomeProprietario.trim()) {
      setErro('Informe seu nome');
      return false;
    }
    return true;
  };

  const validarEtapa2 = () => {
    if (!dados.email.trim()) {
      setErro('Informe seu email');
      return false;
    }
    if (!dados.email.includes('@')) {
      setErro('Email inválido');
      return false;
    }
    if (!dados.telefone.trim()) {
      setErro('Informe seu telefone');
      return false;
    }
    return true;
  };

  const validarEtapa3 = () => {
    if (dados.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (dados.senha !== dados.confirmarSenha) {
      setErro('As senhas não coincidem');
      return false;
    }
    return true;
  };

  const avancarEtapa = () => {
    setErro('');
    if (etapa === 1 && validarEtapa1()) {
      setEtapa(2);
    } else if (etapa === 2 && validarEtapa2()) {
      setEtapa(3);
    }
  };

  const voltarEtapa = () => {
    if (etapa > 1) {
      setEtapa(etapa - 1);
      setErro('');
    } else {
      router.back();
    }
  };

  const criarSlug = (nome: string): string => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleRegistro = async () => {
    if (!validarEtapa3()) return;

    setCarregando(true);
    setErro('');

    try {
      // 1. Verificar se slug já existe
      const slug = criarSlug(dados.nomeEstabelecimento);
      const { data: slugExiste } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (slugExiste) {
        throw new Error('Este nome já está em uso. Escolha outro nome.');
      }

      // 2. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dados.email.trim().toLowerCase(),
        password: dados.senha,
        options: {
          data: {
            nome: dados.nomeProprietario.trim(),
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este e-mail já está cadastrado. Faça login.');
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // 3. Usar função RPC para criar tenant (igual ao web)
      // A função cria: tenant, proprietário, configurações, serviços e categorias
      const { data: tenantId, error: tenantError } = await supabase.rpc('criar_novo_tenant', {
        p_slug: slug,
        p_nome: dados.nomeEstabelecimento.trim(),
        p_email: dados.email.trim().toLowerCase(),
        p_telefone: dados.telefone.trim(),
        p_user_id: authData.user.id,
        p_tipo_negocio: dados.tipoNegocio,
      });

      if (tenantError) {
        console.error('Erro ao criar tenant:', tenantError);
        throw new Error(
          ehNailDesigner 
            ? 'Erro ao criar estúdio. Tente novamente.' 
            : 'Erro ao criar barbearia. Tente novamente.'
        );
      }

      // 4. Fazer login automático
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: dados.email.trim().toLowerCase(),
        password: dados.senha,
      });

      if (loginError) {
        // Se não conseguir logar automaticamente, redireciona para login
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(auth)/login');
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Sucesso! Redirecionar para login (usuário precisa verificar email)
      router.replace('/(auth)/login' as any);

    } catch (error: any) {
      setErro(error.message || 'Erro ao criar conta');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCarregando(false);
    }
  };

  const renderEtapa = () => {
    switch (etapa) {
      case 1:
        return (
          <View style={{ gap: 20 }}>
            {/* Seleção de tipo de negócio */}
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                Tipo de negócio
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setDados({ ...dados, tipoNegocio: 'barbearia' })}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: dados.tipoNegocio === 'barbearia' 
                      ? (ehEscuro ? '#ffffff' : cores.zinc[900])
                      : cores.borda.sutil,
                    backgroundColor: dados.tipoNegocio === 'barbearia' 
                      ? (ehEscuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.02)') 
                      : cores.fundo.card,
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Image
                    source={require('../../assets/images/barber.png')}
                    style={{ width: 48, height: 48, borderRadius: 8 }}
                    contentFit="cover"
                  />
                  <Text style={{ 
                    color: dados.tipoNegocio === 'barbearia' ? cores.texto.primario : cores.texto.secundario,
                    fontWeight: '600',
                    fontSize: 14,
                  }}>
                    Barbearia
                  </Text>
                  {dados.tipoNegocio === 'barbearia' && (
                    <View style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: ehEscuro ? '#ffffff' : cores.zinc[900],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name="checkmark" size={12} color={ehEscuro ? cores.zinc[900] : '#ffffff'} />
                    </View>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setDados({ ...dados, tipoNegocio: 'nail_designer' })}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: dados.tipoNegocio === 'nail_designer' 
                      ? '#ec4899' 
                      : cores.borda.sutil,
                    backgroundColor: dados.tipoNegocio === 'nail_designer' 
                      ? 'rgba(236, 72, 153, 0.08)' 
                      : cores.fundo.card,
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Image
                    source={require('../../assets/images/naildesign.png')}
                    style={{ width: 48, height: 48, borderRadius: 8 }}
                    contentFit="cover"
                  />
                  <Text style={{ 
                    color: dados.tipoNegocio === 'nail_designer' ? '#ec4899' : cores.texto.secundario,
                    fontWeight: '600',
                    fontSize: 14,
                  }}>
                    Nail Designer
                  </Text>
                  {dados.tipoNegocio === 'nail_designer' && (
                    <View style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#ec4899',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
            <InputCustomizado
              rotulo={nomeEstabelecimentoLabel}
              placeholder={placeholderEstabelecimento}
              value={dados.nomeEstabelecimento}
              onChangeText={(v) => atualizarDados('nomeEstabelecimento', v)}
              icone="business-outline"
              cores={cores}
            />
            <InputCustomizado
              rotulo="Seu Nome"
              placeholder="Nome completo"
              value={dados.nomeProprietario}
              onChangeText={(v) => atualizarDados('nomeProprietario', v)}
              icone="person-outline"
              cores={cores}
            />
          </View>
        );
      case 2:
        return (
          <View style={{ gap: 20 }}>
            <InputCustomizado
              rotulo="Email"
              placeholder="seu@email.com"
              value={dados.email}
              onChangeText={(v) => atualizarDados('email', v)}
              icone="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              cores={cores}
            />
            <InputCustomizado
              rotulo="Telefone/WhatsApp"
              placeholder="(00) 00000-0000"
              value={dados.telefone}
              onChangeText={(v) => atualizarDados('telefone', v)}
              icone="call-outline"
              keyboardType="phone-pad"
              cores={cores}
            />
          </View>
        );
      case 3:
        return (
          <View style={{ gap: 20 }}>
            <InputCustomizado
              rotulo="Senha"
              placeholder="Mínimo 6 caracteres"
              value={dados.senha}
              onChangeText={(v) => atualizarDados('senha', v)}
              icone="lock-closed-outline"
              secureTextEntry
              cores={cores}
            />
            <InputCustomizado
              rotulo="Confirmar Senha"
              placeholder="Repita a senha"
              value={dados.confirmarSenha}
              onChangeText={(v) => atualizarDados('confirmarSenha', v)}
              icone="lock-closed-outline"
              secureTextEntry
              cores={cores}
            />
            
            {/* Resumo - igual ao web */}
            <View
              style={{
                backgroundColor: ehEscuro ? 'rgba(255,255,255,0.03)' : cores.fundo.secundario,
                borderRadius: 12,
                padding: 16,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: cores.texto.secundario,
                  marginBottom: 12,
                }}
              >
                Resumo
              </Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: cores.texto.terciario }}>
                    {ehNailDesigner ? 'Estúdio' : 'Barbearia'}:
                  </Text>
                  <Text style={{ fontSize: 13, color: cores.texto.primario, fontWeight: '500' }}>
                    {dados.nomeEstabelecimento || '-'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: cores.texto.terciario }}>Link:</Text>
                  <Text style={{ fontSize: 13, color: cores.texto.primario, fontWeight: '500' }}>
                    barberhub.online/{criarSlug(dados.nomeEstabelecimento) || '-'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: cores.texto.terciario }}>E-mail:</Text>
                  <Text style={{ fontSize: 13, color: cores.texto.primario, fontWeight: '500' }}>
                    {dados.email || '-'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const titulos = [
    ehNailDesigner ? 'Sobre seu estúdio' : 'Sobre sua barbearia',
    'Seus dados de contato',
    'Crie sua senha',
  ];

  const TOTAL_ETAPAS = 3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      <StatusBar barStyle={ehEscuro ? 'light-content' : 'dark-content'} />
      
      {/* Header - Logo dinâmica igual ao web */}
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
          onPress={voltarEtapa} 
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
        {/* Logo que muda conforme o tema */}
        <Image
          source={
            ehEscuro
              ? require('../../assets/images/logoblack.png')
              : require('../../assets/images/logowhite.png')
          }
          style={{ width: 140, height: 46 }}
          contentFit="contain"
        />
        <View style={{ width: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: cores.texto.terciario, fontWeight: '500' }}>
            {etapa}/{TOTAL_ETAPAS}
          </Text>
        </View>
      </View>

      {/* Barra de progresso */}
      <View style={{ backgroundColor: cores.fundo.secundario, height: 4 }}>
        <View
          style={{
            height: 4,
            width: `${(etapa / TOTAL_ETAPAS) * 100}%`,
            backgroundColor: ehEscuro ? '#fff' : cores.zinc[900],
          }}
        />
      </View>

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
          {/* Título */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: cores.texto.primario,
              marginBottom: 8,
            }}
          >
            {titulos[etapa - 1]}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: cores.texto.secundario,
              marginBottom: 32,
            }}
          >
            Etapa {etapa} de {TOTAL_ETAPAS}
          </Text>

          {/* Formulário */}
          {renderEtapa()}

          {/* Erro */}
          {erro ? (
            <View
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 12,
                padding: 16,
                marginTop: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Ionicons name="alert-circle" size={20} color={cores.erro} />
              <Text style={{ color: cores.erro, flex: 1, fontSize: 14 }}>{erro}</Text>
            </View>
          ) : null}

          {/* Botões */}
          <View style={{ marginTop: 32, gap: 12 }}>
            <Pressable
              onPress={etapa < 3 ? avancarEtapa : handleRegistro}
              disabled={carregando}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: cores.botao.fundo,
                paddingVertical: 16,
                borderRadius: 12,
                opacity: carregando ? 0.7 : 1,
              }}
            >
              {carregando ? (
                <ActivityIndicator color={cores.botao.texto} />
              ) : (
                <>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: cores.botao.texto }}>
                    {etapa < 3 ? 'Continuar' : 'Criar Conta'}
                  </Text>
                  {etapa < 3 && (
                    <Ionicons name="arrow-forward" size={20} color={cores.botao.texto} />
                  )}
                </>
              )}
            </Pressable>
          </View>

          {/* Link login */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 24,
              gap: 4,
            }}
          >
            <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>
              Já tem conta?
            </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={{ color: cores.texto.primario, fontWeight: '600', fontSize: 14 }}>
                Fazer login
              </Text>
            </Pressable>
          </View>

          {/* Benefícios - igual ao web */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 32,
              paddingTop: 24,
              borderTopWidth: 1,
              borderTopColor: cores.borda.sutil,
            }}
          >
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto.primario }}>
                14 dias
              </Text>
              <Text style={{ fontSize: 11, color: cores.texto.terciario, textAlign: 'center' }}>
                Grátis para testar
              </Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto.primario }}>
                Ilimitado
              </Text>
              <Text style={{ fontSize: 11, color: cores.texto.terciario, textAlign: 'center' }}>
                Agendamentos
              </Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto.primario }}>
                Suporte
              </Text>
              <Text style={{ fontSize: 11, color: cores.texto.terciario, textAlign: 'center' }}>
                Via WhatsApp
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
