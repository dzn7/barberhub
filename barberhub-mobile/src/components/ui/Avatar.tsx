/**
 * Componente Avatar reutilizável
 * Exibe imagem de perfil com fallback para iniciais
 */

import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTema } from '../../contexts/TemaContext';

type TamanhoAvatar = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface PropsAvatar {
  fonte?: string | null;
  nome?: string;
  tamanho?: TamanhoAvatar;
  style?: ViewStyle;
  corFundo?: string;
}

const dimensoes: Record<TamanhoAvatar, number> = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 64,
  xl: 96,
};

const tamanhosFonte: Record<TamanhoAvatar, number> = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 36,
};

function obterIniciais(nome: string): string {
  if (!nome) return '?';
  
  const partes = nome.trim().split(' ').filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  fonte,
  nome = '',
  tamanho = 'md',
  style,
  corFundo,
}: PropsAvatar) {
  const { cores, ehEscuro } = useTema();
  const dimensao = dimensoes[tamanho];
  const tamanhoFonte = tamanhosFonte[tamanho];
  const iniciais = obterIniciais(nome);

  const estiloBase: ViewStyle = {
    width: dimensao,
    height: dimensao,
    borderRadius: dimensao / 2,
    backgroundColor: corFundo || (ehEscuro ? cores.fundo.terciario : cores.fundo.secundario),
    borderWidth: 1,
    borderColor: cores.borda.sutil,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...style,
  };

  if (fonte) {
    return (
      <View style={estiloBase}>
        <Image
          source={{ uri: fonte }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }

  return (
    <View style={estiloBase}>
      <Text
        style={{
          fontSize: tamanhoFonte,
          fontWeight: '600',
          color: cores.texto.primario,
        }}
      >
        {iniciais}
      </Text>
    </View>
  );
}
