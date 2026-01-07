/**
 * Layout raiz do aplicativo
 * Configura providers, fontes e navegação global
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useAutenticacao } from '../src/stores/autenticacao';
import { TemaProvider, useTema } from '../src/contexts/TemaContext';

// Previne splash screen de esconder automaticamente
SplashScreen.preventAutoHideAsync();

function ConteudoApp() {
  const { inicializar, inicializado } = useAutenticacao();
  const { cores, ehEscuro } = useTema();

  useEffect(() => {
    inicializar();
  }, []);

  useEffect(() => {
    if (inicializado) {
      SplashScreen.hideAsync();
    }
  }, [inicializado]);

  if (!inicializado) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      <StatusBar style={ehEscuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.fundo.primario },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(admin)" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function LayoutRaiz() {
  return (
    <TemaProvider>
      <ConteudoApp />
    </TemaProvider>
  );
}
