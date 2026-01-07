/**
 * Componente de Input reutilizável
 * Suporta ícones, máscaras e estados de erro
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CORES } from '../../constants/cores';

interface PropsInput extends Omit<TextInputProps, 'style'> {
  rotulo?: string;
  erro?: string;
  iconeEsquerda?: keyof typeof Ionicons.glyphMap;
  iconeDireita?: keyof typeof Ionicons.glyphMap;
  onPressIconeDireita?: () => void;
  containerStyle?: ViewStyle;
  senha?: boolean;
}

export function Input({
  rotulo,
  erro,
  iconeEsquerda,
  iconeDireita,
  onPressIconeDireita,
  containerStyle,
  senha = false,
  onFocus,
  onBlur,
  ...props
}: PropsInput) {
  const [focado, setFocado] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const bordaAnimada = useSharedValue(0);

  const estiloAnimado = useAnimatedStyle(() => ({
    borderColor: withTiming(
      bordaAnimada.value === 1
        ? CORES.primaria.DEFAULT
        : erro
        ? CORES.erro
        : CORES.borda.sutil,
      { duration: 200 }
    ),
  }));

  const handleFocus = (e: any) => {
    setFocado(true);
    bordaAnimada.value = 1;
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocado(false);
    bordaAnimada.value = 0;
    onBlur?.(e);
  };

  const toggleMostrarSenha = () => {
    setMostrarSenha(!mostrarSenha);
  };

  const iconeAtual = senha
    ? mostrarSenha
      ? 'eye-off-outline'
      : 'eye-outline'
    : iconeDireita;

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {rotulo && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: CORES.texto.secundario,
          }}
        >
          {rotulo}
        </Text>
      )}

      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: CORES.fundo.card,
            borderRadius: 12,
            borderWidth: 1,
            paddingHorizontal: 14,
            height: 52,
            gap: 10,
          },
          estiloAnimado,
        ]}
      >
        {iconeEsquerda && (
          <Ionicons
            name={iconeEsquerda}
            size={20}
            color={focado ? CORES.primaria.DEFAULT : CORES.texto.terciario}
          />
        )}

        <TextInput
          style={{
            flex: 1,
            fontSize: 16,
            color: CORES.texto.primario,
          }}
          placeholderTextColor={CORES.texto.terciario}
          secureTextEntry={senha && !mostrarSenha}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {(senha || iconeDireita) && (
          <Pressable onPress={senha ? toggleMostrarSenha : onPressIconeDireita}>
            <Ionicons
              name={iconeAtual}
              size={20}
              color={CORES.texto.terciario}
            />
          </Pressable>
        )}
      </Animated.View>

      {erro && (
        <Text
          style={{
            fontSize: 12,
            color: CORES.erro,
            marginTop: 2,
          }}
        >
          {erro}
        </Text>
      )}
    </View>
  );
}
