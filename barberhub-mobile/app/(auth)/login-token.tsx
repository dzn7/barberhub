/**
 * Tela de Login por Token
 * Login rápido para profissionais via token
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Botao, Input } from '../../src/components/ui';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { CORES } from '../../src/constants/cores';

export default function TelaLoginToken() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { loginComToken, carregando } = useAutenticacao();

  const [token, setToken] = useState(params.token || '');
  const [erro, setErro] = useState('');

  useEffect(() => {
    // Se veio com token via deep link, fazer login automático
    if (params.token) {
      handleLogin();
    }
  }, [params.token]);

  const handleLogin = async () => {
    if (!token.trim()) {
      setErro('Informe o token de acesso');
      return;
    }

    setErro('');
    const resultado = await loginComToken(token.trim());

    if (!resultado.sucesso) {
      setErro(resultado.erro || 'Token inválido ou expirado');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(admin)/dashboard');
  };

  return (
    <LinearGradient
      colors={[CORES.fundo.primario, CORES.secundaria.DEFAULT]}
      style={{ flex: 1, paddingHorizontal: 24, paddingTop: 60 }}
    >
      {/* Header */}
      <Pressable onPress={() => router.back()} style={{ marginBottom: 40 }}>
        <Ionicons name="arrow-back" size={24} color={CORES.texto.primario} />
      </Pressable>

      {/* Ícone */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: CORES.transparente.branco10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="key" size={40} color={CORES.primaria.DEFAULT} />
        </View>
      </View>

      {/* Título */}
      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: CORES.texto.primario,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        Acesso Rápido
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: CORES.texto.secundario,
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        Cole o token de acesso enviado pelo proprietário da barbearia
      </Text>

      {/* Input Token */}
      <Input
        rotulo="Token de Acesso"
        placeholder="Cole seu token aqui"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        iconeEsquerda="key-outline"
        erro={erro}
      />

      {/* Botão */}
      <View style={{ marginTop: 32 }}>
        <Botao
          titulo="Acessar"
          variante="primario"
          tamanho="lg"
          larguraTotal
          carregando={carregando}
          onPress={handleLogin}
        />
      </View>

      {/* Dica */}
      <View
        style={{
          backgroundColor: CORES.transparente.branco10,
          borderRadius: 12,
          padding: 16,
          marginTop: 24,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <Ionicons name="information-circle" size={24} color={CORES.info} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: CORES.texto.primario,
              fontWeight: '600',
              marginBottom: 4,
            }}
          >
            Onde encontro meu token?
          </Text>
          <Text style={{ color: CORES.texto.secundario, fontSize: 14 }}>
            O token foi enviado via WhatsApp quando você foi cadastrado na barbearia.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
