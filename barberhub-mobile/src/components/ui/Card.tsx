/**
 * Componente Card reutilizável
 * Container com estilo consistente para agrupar conteúdo
 * Design idêntico ao cartao.tsx do web (rounded-lg, border, shadow-sm)
 */

import React from 'react';
import { View, Text, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTema } from '../../contexts/TemaContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PropsCard {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  pressionavel?: boolean;
  variante?: 'padrao' | 'destaque' | 'sutil' | 'elevado';
}

interface PropsCabecalhoCard {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface PropsTituloCard {
  children: React.ReactNode;
  style?: TextStyle;
}

interface PropsDescricaoCard {
  children: React.ReactNode;
  style?: TextStyle;
}

interface PropsConteudoCard {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface PropsRodapeCard {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({
  children,
  style,
  onPress,
  pressionavel = false,
  variante = 'padrao',
}: PropsCard) {
  const { cores } = useTema();
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
      backgroundColor: cores.fundo.card,
      borderColor: cores.borda.sutil,
      borderWidth: 1,
    },
    destaque: {
      backgroundColor: cores.fundo.terciario,
      borderColor: cores.borda.media,
      borderWidth: 1,
    },
    sutil: {
      backgroundColor: cores.fundo.secundario,
      borderColor: 'transparent',
      borderWidth: 0,
    },
    elevado: {
      backgroundColor: cores.fundo.card,
      borderColor: cores.borda.sutil,
      borderWidth: 1,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  }[variante];

  const estiloBase: ViewStyle = {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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

/**
 * Subcomponentes do Card - espelham web cartao.tsx
 */
export function CabecalhoCard({ children, style }: PropsCabecalhoCard) {
  return (
    <View style={[{ gap: 6, marginBottom: 16 }, style]}>
      {children}
    </View>
  );
}

export function TituloCard({ children, style }: PropsTituloCard) {
  const { cores } = useTema();
  return (
    <Text
      style={[{
        fontSize: 18,
        fontWeight: '600',
        color: cores.texto.primario,
        letterSpacing: -0.3,
      }, style]}
    >
      {children}
    </Text>
  );
}

export function DescricaoCard({ children, style }: PropsDescricaoCard) {
  const { cores } = useTema();
  return (
    <Text
      style={[{
        fontSize: 14,
        color: cores.texto.secundario,
        lineHeight: 20,
      }, style]}
    >
      {children}
    </Text>
  );
}

export function ConteudoCard({ children, style }: PropsConteudoCard) {
  return (
    <View style={[{ gap: 12 }, style]}>
      {children}
    </View>
  );
}

export function RodapeCard({ children, style }: PropsRodapeCard) {
  const { cores } = useTema();
  return (
    <View
      style={[{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: cores.borda.sutil,
      }, style]}
    >
      {children}
    </View>
  );
}
