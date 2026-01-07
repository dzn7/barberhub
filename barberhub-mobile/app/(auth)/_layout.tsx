/**
 * Layout para rotas de autenticação
 */

import { Stack } from 'expo-router';
import { CORES } from '../../src/constants/cores';

export default function LayoutAutenticacao() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: CORES.fundo.primario },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="registro" />
      <Stack.Screen name="login-token" />
    </Stack>
  );
}
