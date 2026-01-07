/**
 * Componente Card reutilizável
 * Container com estilo consistente para agrupar conteúdo
 */

import React from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { CORES } from '../../constants/cores';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PropsCard {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  pressionavel?: boolean;
  variante?: 'padrao' | 'destaque' | 'sutil';
}

export function Card({
  children,
  style,
  onPress,
  pressionavel = false,
  variante = 'padrao',
}: PropsCard) {
  const escala = useSharedValue(1);

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  const handlePressIn = () => {
    if (pressionavel || onPress) {
      escala.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    escala.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const estiloVariante: ViewStyle = {
    padrao: {
      backgroundColor: CORES.fundo.card,
      borderColor: CORES.borda.sutil,
      borderWidth: 1,
    },
    destaque: {
      backgroundColor: CORES.destaque.DEFAULT,
      borderColor: CORES.primaria.DEFAULT,
      borderWidth: 1,
    },
    sutil: {
      backgroundColor: CORES.fundo.secundario,
      borderColor: 'transparent',
      borderWidth: 0,
    },
  }[variante];

  const estiloBase: ViewStyle = {
    borderRadius: 16,
    padding: 16,
    ...estiloVariante,
    ...style,
  };

  if (pressionavel || onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[estiloAnimado, estiloBase]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={estiloBase}>{children}</View>;
}
