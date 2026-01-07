/**
 * Layout raiz do aplicativo
 * Configura providers, fontes e navegação global
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { OpenSans_400Regular, OpenSans_500Medium, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import { PlayfairDisplay_400Regular, PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Oswald_400Regular, Oswald_500Medium, Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { Raleway_400Regular, Raleway_500Medium, Raleway_600SemiBold, Raleway_700Bold } from '@expo-google-fonts/raleway';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useAutenticacao } from '../src/stores/autenticacao';
import { TemaProvider, useTema } from '../src/contexts/TemaContext';

// Previne splash screen de esconder automaticamente
SplashScreen.preventAutoHideAsync();

function ConteudoApp() {
  const { inicializar, inicializado } = useAutenticacao();
  const { cores, ehEscuro } = useTema();

  const [fontesCarregadas] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    Poppins: Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    Roboto: Roboto_400Regular,
    'Roboto-Medium': Roboto_500Medium,
    'Roboto-Bold': Roboto_700Bold,
    Montserrat: Montserrat_400Regular,
    'Montserrat-Medium': Montserrat_500Medium,
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Bold': Montserrat_700Bold,
    OpenSans: OpenSans_400Regular,
    'OpenSans-Medium': OpenSans_500Medium,
    'OpenSans-SemiBold': OpenSans_600SemiBold,
    'OpenSans-Bold': OpenSans_700Bold,
    PlayfairDisplay: PlayfairDisplay_400Regular,
    'PlayfairDisplay-Medium': PlayfairDisplay_500Medium,
    'PlayfairDisplay-SemiBold': PlayfairDisplay_600SemiBold,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    Oswald: Oswald_400Regular,
    'Oswald-Medium': Oswald_500Medium,
    'Oswald-SemiBold': Oswald_600SemiBold,
    'Oswald-Bold': Oswald_700Bold,
    Lato: Lato_400Regular,
    'Lato-Bold': Lato_700Bold,
    Raleway: Raleway_400Regular,
    'Raleway-Medium': Raleway_500Medium,
    'Raleway-SemiBold': Raleway_600SemiBold,
    'Raleway-Bold': Raleway_700Bold,
    Nunito: Nunito_400Regular,
    'Nunito-Medium': Nunito_500Medium,
    'Nunito-SemiBold': Nunito_600SemiBold,
    'Nunito-Bold': Nunito_700Bold,
  });

  useEffect(() => {
    inicializar();
  }, []);

  useEffect(() => {
    if (inicializado && fontesCarregadas) {
      SplashScreen.hideAsync();
    }
  }, [inicializado, fontesCarregadas]);

  if (!inicializado || !fontesCarregadas) {
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
