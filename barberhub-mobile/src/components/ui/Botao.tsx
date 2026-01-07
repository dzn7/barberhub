/**
 * Componente de Botão reutilizável
 * Suporta múltiplas variantes, tamanhos e estados
 */

import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type PressableProps,
  type GestureResponderEvent,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTema } from '../../contexts/TemaContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type VarianteBotao = 'primario' | 'secundario' | 'outline' | 'ghost' | 'perigo';
type TamanhoBotao = 'sm' | 'md' | 'lg';

interface PropsBotao extends Omit<PressableProps, 'style'> {
  titulo: string;
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  carregando?: boolean;
  desabilitado?: boolean;
  iconeEsquerda?: React.ReactNode;
  iconeDireita?: React.ReactNode;
  larguraTotal?: boolean;
  haptico?: boolean;
  style?: ViewStyle;
}

function obterEstilosVariante(variante: VarianteBotao, cores: any): { container: ViewStyle; texto: TextStyle } {
  if (variante === 'primario') {
    return {
      container: {
        backgroundColor: cores.botao.fundo,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 6,
      },
      texto: {
        color: cores.botao.texto,
        fontWeight: '700',
      },
    };
  }

  if (variante === 'secundario') {
    return {
      container: {
        backgroundColor: cores.fundo.terciario,
        borderWidth: 1,
        borderColor: cores.borda.sutil,
      },
      texto: {
        color: cores.texto.primario,
        fontWeight: '600',
      },
    };
  }

  if (variante === 'outline') {
    return {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: cores.borda.media,
      },
      texto: {
        color: cores.texto.primario,
        fontWeight: '600',
      },
    };
  }

  if (variante === 'ghost') {
    return {
      container: {
        backgroundColor: 'transparent',
      },
      texto: {
        color: cores.texto.primario,
        fontWeight: '600',
      },
    };
  }

  return {
    container: {
      backgroundColor: cores.erro,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 6,
    },
    texto: {
      color: '#ffffff',
      fontWeight: '700',
    },
  };
}

const estilosTamanho: Record<TamanhoBotao, { container: ViewStyle; texto: TextStyle }> = {
  sm: {
    container: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      minHeight: 36,
    },
    texto: {
      fontSize: 14,
    },
  },
  md: {
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      minHeight: 44,
    },
    texto: {
      fontSize: 16,
    },
  },
  lg: {
    container: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 16,
      minHeight: 52,
    },
    texto: {
      fontSize: 18,
    },
  },
};

export function Botao({
  titulo,
  variante = 'primario',
  tamanho = 'md',
  carregando = false,
  desabilitado = false,
  iconeEsquerda,
  iconeDireita,
  larguraTotal = false,
  haptico = true,
  style,
  onPress,
  ...props
}: PropsBotao) {
  const { cores } = useTema();
  const escala = useSharedValue(1);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  const handlePressIn = () => {
    escala.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    escala.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = async (event: GestureResponderEvent) => {
    if (haptico && !desabilitado && !carregando) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const estiloVarianteAtual = obterEstilosVariante(variante, cores);
  const estiloTamanhoAtual = estilosTamanho[tamanho];
  const estaDesabilitado = desabilitado || carregando;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={estaDesabilitado}
      style={[
        estiloAnimado,
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: estaDesabilitado ? 0.5 : 1,
          width: larguraTotal ? '100%' : undefined,
        },
        estiloVarianteAtual.container,
        estiloTamanhoAtual.container,
        style,
      ]}
      {...props}
    >
      {carregando ? (
        <ActivityIndicator
          size="small"
          color={estiloVarianteAtual.texto.color as string}
        />
      ) : (
        <>
          {iconeEsquerda}
          <Text
            style={[
              estiloVarianteAtual.texto,
              estiloTamanhoAtual.texto,
            ]}
          >
            {titulo}
          </Text>
          {iconeDireita}
        </>
      )}
    </AnimatedPressable>
  );
}
