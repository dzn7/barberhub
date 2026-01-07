/**
 * Tela inicial - Redirecionamento baseado em autenticação
 */

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAutenticacao } from '../src/stores/autenticacao';
import { CORES } from '../src/constants/cores';

export default function TelaInicial() {
  const router = useRouter();
  const { usuario, carregando, inicializado } = useAutenticacao();

  useEffect(() => {
    if (!inicializado || carregando) return;

    if (usuario) {
      // Usuário autenticado - redirecionar para admin
      router.replace('/(admin)/dashboard');
    } else {
      // Não autenticado - mostrar onboarding ou login
      router.replace('/(auth)/onboarding');
    }
  }, [usuario, carregando, inicializado]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: CORES.fundo.primario,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="large" color={CORES.primaria.DEFAULT} />
    </View>
  );
}
