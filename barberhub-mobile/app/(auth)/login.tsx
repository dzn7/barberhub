/**
 * Tela de Login
 * Design idêntico ao /entrar do site web
 * Paleta Zinc, modo claro/escuro
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../src/services/supabase';
import { useTema } from '../../src/contexts/TemaContext';

export default function TelaLogin() {
  const router = useRouter();
  const { cores, ehEscuro } = useTema();

  const [carregando, setCarregando] = useState(false);
  const [modoLogin, setModoLogin] = useState<'email' | 'token'>('email');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [token, setToken] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async () => {
    setErro('');

    if (modoLogin === 'email') {
      if (!email.trim() || !senha.trim()) {
        setErro('Preencha todos os campos');
        return;
      }

      setCarregando(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: senha,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErro('E-mail ou senha incorretos');
          } else if (error.message.includes('Email not confirmed')) {
            setErro('E-mail não confirmado. Verifique sua caixa de entrada.');
          } else {
            setErro(error.message);
          }
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(admin)/dashboard' as any);
      } catch (e: any) {
        setErro(e.message || 'Erro ao fazer login');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setCarregando(false);
      }
    } else {
      if (!token.trim()) {
        setErro('Informe o token de acesso');
        return;
      }
      // TODO: Implementar login com token
      setErro('Login com token em desenvolvimento');
    }
  };

  const alternarModo = () => {
    setModoLogin(modoLogin === 'email' ? 'token' : 'email');
    setErro('');
  };

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
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: cores.borda.sutil,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 22,
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
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 32,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Título */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: cores.texto.primario,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Entrar no Painel
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: cores.texto.secundario,
              textAlign: 'center',
              marginBottom: 32,
              lineHeight: 22,
            }}
          >
            Acesse sua conta para gerenciar seu negócio
          </Text>

          {/* Card do formulário */}
          <View
            style={{
              backgroundColor: ehEscuro ? 'rgba(255,255,255,0.03)' : cores.fundo.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: cores.borda.sutil,
            }}
          >
            {/* Seletor de modo */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: cores.fundo.terciario,
                borderRadius: 10,
                padding: 4,
                marginBottom: 24,
              }}
            >
              <Pressable
                onPress={() => setModoLogin('email')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    modoLogin === 'email' ? cores.botao.fundo : 'transparent',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: 14,
                    color:
                      modoLogin === 'email'
                        ? cores.botao.texto
                        : cores.texto.secundario,
                  }}
                >
                  Proprietário
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setModoLogin('token')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    modoLogin === 'token' ? cores.botao.fundo : 'transparent',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: 14,
                    color:
                      modoLogin === 'token'
                        ? cores.botao.texto
                        : cores.texto.secundario,
                  }}
                >
                  Profissional
                </Text>
              </Pressable>
            </View>

            {/* Formulário */}
            {modoLogin === 'email' ? (
              <View style={{ gap: 16 }}>
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
                      value={email}
                      onChangeText={setEmail}
                      placeholder="seu@email.com"
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

                {/* Senha */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                    Senha
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
                    <Ionicons name="lock-closed-outline" size={20} color={cores.texto.terciario} />
                    <TextInput
                      value={senha}
                      onChangeText={setSenha}
                      placeholder="Sua senha"
                      placeholderTextColor={cores.texto.terciario}
                      secureTextEntry={!mostrarSenha}
                      style={{
                        flex: 1,
                        paddingVertical: 16,
                        paddingHorizontal: 12,
                        fontSize: 16,
                        color: cores.texto.primario,
                      }}
                    />
                    <Pressable onPress={() => setMostrarSenha(!mostrarSenha)}>
                      <Ionicons
                        name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={cores.texto.terciario}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {/* Token */}
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: cores.texto.secundario }}>
                    Token de Acesso
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
                    <Ionicons name="key-outline" size={20} color={cores.texto.terciario} />
                    <TextInput
                      value={token}
                      onChangeText={setToken}
                      placeholder="Cole seu token aqui"
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
                <Text
                  style={{
                    fontSize: 13,
                    color: cores.texto.terciario,
                    textAlign: 'center',
                  }}
                >
                  O token foi enviado pelo proprietário
                </Text>
              </View>
            )}

            {/* Erro */}
            {erro ? (
              <View
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Ionicons name="alert-circle" size={20} color={cores.erro} />
                <Text style={{ color: cores.erro, flex: 1, fontSize: 14 }}>{erro}</Text>
              </View>
            ) : null}

            {/* Botão Login */}
            <Pressable
              onPress={handleLogin}
              disabled={carregando}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: cores.botao.fundo,
                paddingVertical: 16,
                borderRadius: 12,
                marginTop: 24,
                opacity: carregando ? 0.7 : 1,
              }}
            >
              {carregando ? (
                <ActivityIndicator color={cores.botao.texto} />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color={cores.botao.texto} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: cores.botao.texto }}>
                    Entrar
                  </Text>
                </>
              )}
            </Pressable>

            {/* Esqueci senha */}
            {modoLogin === 'email' && (
              <Pressable style={{ marginTop: 16 }}>
                <Text
                  style={{
                    color: cores.texto.secundario,
                    textAlign: 'center',
                    fontSize: 14,
                  }}
                >
                  Esqueci minha senha
                </Text>
              </Pressable>
            )}
          </View>

          {/* Criar conta */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 32,
              gap: 4,
            }}
          >
            <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>
              Não tem uma conta?
            </Text>
            <Pressable onPress={() => router.push('/(auth)/registro')}>
              <Text
                style={{
                  color: cores.texto.primario,
                  fontWeight: '600',
                  fontSize: 14,
                }}
              >
                Criar conta grátis
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
