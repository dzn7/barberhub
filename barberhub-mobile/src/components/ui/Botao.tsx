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
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { CORES } from '../../constants/cores';

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

const estilosVariante: Record<VarianteBotao, { container: ViewStyle; texto: TextStyle }> = {
  primario: {
    container: {
      backgroundColor: CORES.primaria.DEFAULT,
    },
    texto: {
      color: CORES.texto.invertido,
      fontWeight: '600',
    },
  },
  secundario: {
    container: {
      backgroundColor: CORES.secundaria.DEFAULT,
    },
    texto: {
      color: CORES.texto.primario,
      fontWeight: '600',
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: CORES.primaria.DEFAULT,
    },
    texto: {
      color: CORES.primaria.DEFAULT,
      fontWeight: '600',
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    texto: {
      color: CORES.primaria.DEFAULT,
      fontWeight: '500',
    },
  },
  perigo: {
    container: {
      backgroundColor: CORES.erro,
    },
    texto: {
      color: CORES.texto.primario,
      fontWeight: '600',
    },
  },
};

const estilosTamanho: Record<TamanhoBotao, { container: ViewStyle; texto: TextStyle }> = {
  sm: {
    container: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    texto: {
      fontSize: 14,
    },
  },
  md: {
    container: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
    },
    texto: {
      fontSize: 16,
    },
  },
  lg: {
    container: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderRadius: 12,
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

  const handlePress = async (event: any) => {
    if (haptico && !desabilitado && !carregando) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const estiloVarianteAtual = estilosVariante[variante];
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
