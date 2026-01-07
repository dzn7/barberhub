/**
 * Tela de Configurações
 * Ajustes gerais da barbearia e conta
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Avatar } from '../../src/components/ui';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { useTema } from '../../src/contexts/TemaContext';

interface ItemConfiguracao {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao?: string;
  corIcone?: string;
  acao?: () => void;
  toggle?: boolean;
  valorToggle?: boolean;
  onToggle?: (valor: boolean) => void;
}

export default function TelaConfiguracoes() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { usuario, tenant, logout } = useAutenticacao();
  const { estabelecimento, profissional } = useTerminologia();
  
  const { cores, ehEscuro, alternarTema } = useTema();

  const [notificacoesAtivas, setNotificacoesAtivas] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const abrirWhatsApp = () => {
    const mensagem = encodeURIComponent(
      `Olá! Sou da barbearia "${tenant?.nome}". Preciso de suporte.`
    );
    Linking.openURL(`https://wa.me/5586998053279?text=${mensagem}`);
  };

  const secoes: { titulo: string; itens: ItemConfiguracao[] }[] = [
    {
      titulo: estabelecimento(),
      itens: [
        {
          icone: 'color-palette',
          titulo: 'Personalização',
          descricao: 'Cores, logo e dados',
          acao: () => router.push('/personalizacao' as any),
        },
        {
          icone: 'time',
          titulo: 'Horário de Funcionamento',
          descricao: 'Dias e horários de atendimento',
          acao: () => router.push('/horarios' as any),
        },
        {
          icone: 'cash',
          titulo: 'Financeiro',
          descricao: 'Receitas, despesas e relatórios',
          acao: () => router.push('/financeiro' as any),
        },
        {
          icone: 'bar-chart',
          titulo: 'Relatórios',
          descricao: 'Métricas e gráficos do negócio',
          acao: () => router.push('/relatorios' as any),
        },
      ],
    },
    {
      titulo: 'Cadastros',
      itens: [
        {
          icone: 'people',
          titulo: profissional(true),
          descricao: 'Gerenciar equipe de profissionais',
          acao: () => router.push('/profissionais' as any),
        },
        {
          icone: 'cut',
          titulo: 'Serviços',
          descricao: 'Gerenciar serviços oferecidos',
          acao: () => router.push('/servicos' as any),
        },
        {
          icone: 'person',
          titulo: 'Clientes',
          descricao: 'Gerenciar base de clientes',
          acao: () => router.push('/clientes' as any),
        },
      ],
    },
    {
      titulo: 'WhatsApp Bot',
      itens: [
        {
          icone: 'logo-whatsapp',
          titulo: 'Configurar Bot',
          descricao: 'Conectar WhatsApp para notificações',
          corIcone: '#25D366',
          acao: () => {},
        },
        {
          icone: 'chatbubbles',
          titulo: 'Templates de Mensagem',
          descricao: 'Personalizar mensagens automáticas',
          acao: () => {},
        },
      ],
    },
    {
      titulo: 'Notificações',
      itens: [
        {
          icone: 'notifications',
          titulo: 'Notificações Push',
          descricao: 'Receber alertas de agendamentos',
          toggle: true,
          valorToggle: notificacoesAtivas,
          onToggle: setNotificacoesAtivas,
        },
      ],
    },
    {
      titulo: 'Aparência',
      itens: [
        {
          icone: ehEscuro ? 'moon' : 'sunny',
          titulo: ehEscuro ? 'Modo Escuro' : 'Modo Claro',
          descricao: ehEscuro ? 'Tema escuro ativado' : 'Tema claro ativado',
          toggle: true,
          valorToggle: ehEscuro,
          onToggle: alternarTema,
        },
      ],
    },
    {
      titulo: 'Suporte',
      itens: [
        {
          icone: 'help-circle',
          titulo: 'Central de Ajuda',
          descricao: 'Dúvidas frequentes',
          acao: () => {},
        },
        {
          icone: 'logo-whatsapp',
          titulo: 'Falar com Suporte',
          descricao: 'Contato via WhatsApp',
          corIcone: '#25D366',
          acao: abrirWhatsApp,
        },
      ],
    },
    {
      titulo: 'Conta',
      itens: [
        {
          icone: 'log-out',
          titulo: 'Sair da Conta',
          corIcone: cores.erro,
          acao: handleLogout,
        },
      ],
    },
  ];

  const renderItem = (item: ItemConfiguracao) => (
    <Pressable
      key={item.titulo}
      onPress={item.acao}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: (item.corIcone || '#ffffff') + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={item.icone}
          size={22}
          color={item.corIcone || '#ffffff'}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: item.corIcone === cores.erro ? cores.erro : cores.texto.primario,
            fontSize: 16,
            fontWeight: '500',
          }}
        >
          {item.titulo}
        </Text>
        {item.descricao && (
          <Text style={{ color: cores.texto.terciario, fontSize: 13 }}>
            {item.descricao}
          </Text>
        )}
      </View>

      {item.toggle ? (
        <Switch
          value={item.valorToggle}
          onValueChange={item.onToggle}
          trackColor={{ false: cores.borda.sutil, true: cores.primaria.DEFAULT + '50' }}
          thumbColor={item.valorToggle ? cores.primaria.DEFAULT : cores.texto.terciario}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={cores.texto.terciario} />
      )}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 24,
            backgroundColor: cores.fundo.secundario,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <Text
            style={{
              color: cores.texto.primario,
              fontSize: 24,
              fontWeight: '700',
              marginBottom: 20,
            }}
          >
            Configurações
          </Text>

          {/* Perfil */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Avatar
              fonte={tenant?.logo_url}
              nome={tenant?.nome || 'Barbearia'}
              tamanho="lg"
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: cores.texto.primario,
                  fontSize: 18,
                  fontWeight: '600',
                }}
              >
                {tenant?.nome || 'Minha Barbearia'}
              </Text>
              <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>
                {usuario?.email}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 4,
                  gap: 4,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: tenant?.ativo ? cores.sucesso : cores.aviso,
                  }}
                />
                <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
                  {tenant?.ativo ? 'Ativo' : 'Período de teste'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Seções */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          {secoes.map((secao) => (
            <View key={secao.titulo} style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: cores.texto.secundario,
                  fontSize: 13,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  marginLeft: 4,
                }}
              >
                {secao.titulo}
              </Text>

              <Card variante="sutil" style={{ padding: 0, overflow: 'hidden' }}>
                {secao.itens.map((item, index) => (
                  <View key={item.titulo}>
                    {renderItem(item)}
                    {index < secao.itens.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: cores.borda.sutil,
                          marginLeft: 70,
                        }}
                      />
                    )}
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </View>

        {/* Versão */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
            BarberHub v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
