/**
 * Layout do painel administrativo
 * Navegação por tabs na bottom bar
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '../../src/contexts/TemaContext';
import { useTerminologia } from '../../src/hooks/useTerminologia';

export default function LayoutAdmin() {
  const { cores, ehEscuro } = useTema();
  const { profissional, ehNailDesigner } = useTerminologia();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: cores.fundo.secundario,
          borderTopColor: cores.borda.sutil,
          borderTopWidth: 1,
          height: 74,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: cores.texto.primario,
        tabBarInactiveTintColor: cores.texto.terciario,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agendamentos"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="servicos"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cut" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="barbeiros"
        options={{
          title: profissional(true),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ehNailDesigner ? 'hand-left' : 'people'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="clientes" options={{ href: null }} />
      <Tabs.Screen name="financeiro" options={{ href: null }} />
      <Tabs.Screen name="horarios" options={{ href: null }} />
      <Tabs.Screen name="configurar" options={{ href: null }} />
      <Tabs.Screen name="personalizacao" options={{ href: null }} />
      <Tabs.Screen name="profissionais" options={{ href: null }} />
      <Tabs.Screen name="relatorios" options={{ href: null }} />
      <Tabs.Screen name="comissoes" options={{ href: null }} />
    </Tabs>
  );
}
