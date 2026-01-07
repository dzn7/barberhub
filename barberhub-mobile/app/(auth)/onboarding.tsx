/**
 * Tela de Onboarding
 * Design igual ao /configurar do site web
 * Com seleção de tipo de negócio, imagens e modo claro/escuro
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useColorScheme,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useTema } from '../../src/contexts/TemaContext';

type TipoNegocio = 'barbearia' | 'nail_designer';

interface OpcaoTipoNegocio {
  tipo: TipoNegocio;
  titulo: string;
  descricao: string;
  imagem: any;
  cor: string;
}

const OPCOES_TIPO_NEGOCIO: OpcaoTipoNegocio[] = [
  {
    tipo: 'barbearia',
    titulo: 'Barbearia',
    descricao: 'Cortes de cabelo, barba, tratamentos masculinos',
    imagem: require('../../assets/images/barber.png'),
    cor: '#18181b',
  },
  {
    tipo: 'nail_designer',
    titulo: 'Nail Designer',
    descricao: 'Unhas em gel, alongamentos, nail art, manicure',
    imagem: require('../../assets/images/naildesign.png'),
    cor: '#ec4899',
  },
];

const FEATURES = [
  {
    icone: 'calendar-outline' as const,
    titulo: 'Agendamento Online',
    descricao: 'Seus clientes agendam 24h pelo celular',
  },
  {
    icone: 'logo-whatsapp' as const,
    titulo: 'Notificações WhatsApp',
    descricao: 'Lembretes automáticos para seus clientes',
  },
  {
    icone: 'bar-chart-outline' as const,
    titulo: 'Relatórios Financeiros',
    descricao: 'Controle receitas, despesas e comissões',
  },
  {
    icone: 'globe-outline' as const,
    titulo: 'Página Própria',
    descricao: 'Seu negócio na internet em minutos',
  },
];

export default function TelaOnboarding() {
  const router = useRouter();
  const { cores, ehEscuro, alternarTema } = useTema();
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoNegocio | null>(null);

  const irParaLogin = () => {
    router.push('/(auth)/login');
  };

  const irParaRegistro = () => {
    router.push('/(auth)/registro');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      <StatusBar barStyle={ehEscuro ? 'light-content' : 'dark-content'} />
      
      {/* Header com toggle de tema - Logo dinâmica igual ao web */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: cores.borda.sutil,
        }}
      >
        {/* Logo que muda conforme o tema - igual ao web */}
        <Image
          source={
            ehEscuro
              ? require('../../assets/images/logoblack.png')
              : require('../../assets/images/logowhite.png')
          }
          style={{ width: 160, height: 52 }}
          contentFit="contain"
        />
        <Pressable
          onPress={alternarTema}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: cores.fundo.terciario,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: cores.borda.sutil,
          }}
        >
          <Ionicons
            name={ehEscuro ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={cores.texto.primario}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Título principal */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={{ marginBottom: 32 }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: cores.texto.primario,
              textAlign: 'center',
              marginBottom: 12,
              lineHeight: 36,
            }}
          >
            Gerencie seu negócio{'\n'}de forma simples
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: cores.texto.secundario,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            Agendamentos, clientes, finanças e muito mais em um só lugar
          </Text>
        </Animated.View>

        {/* Seleção de tipo de negócio com imagens */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={{ marginBottom: 32 }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: cores.texto.terciario,
              textAlign: 'center',
              marginBottom: 16,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
            }}
          >
            Escolha seu segmento
          </Text>
          <View style={{ gap: 16 }}>
            {OPCOES_TIPO_NEGOCIO.map((opcao) => {
              const selecionado = tipoSelecionado === opcao.tipo;
              const corBorda = selecionado
                ? opcao.cor
                : cores.borda.sutil;
              const corFundo = selecionado
                ? (ehEscuro ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)')
                : cores.fundo.card;

              return (
                <Pressable
                  key={opcao.tipo}
                  onPress={() => setTipoSelecionado(opcao.tipo)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: corBorda,
                    backgroundColor: corFundo,
                    gap: 16,
                  }}
                >
                  {/* Imagem */}
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: cores.fundo.terciario,
                    }}
                  >
                    <Image
                      source={opcao.imagem}
                      style={{ width: 80, height: 80 }}
                      contentFit="cover"
                    />
                  </View>

                  {/* Texto */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '600',
                        color: selecionado ? opcao.cor : cores.texto.primario,
                        marginBottom: 4,
                      }}
                    >
                      {opcao.titulo}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: cores.texto.secundario,
                        lineHeight: 20,
                      }}
                    >
                      {opcao.descricao}
                    </Text>
                  </View>

                  {/* Checkbox */}
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selecionado ? opcao.cor : cores.borda.media,
                      backgroundColor: selecionado ? opcao.cor : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selecionado && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Features */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={{ marginBottom: 32 }}
        >
          <View
            style={{
              backgroundColor: cores.fundo.card,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: cores.borda.sutil,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: cores.texto.terciario,
                marginBottom: 16,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              O que você terá
            </Text>
            <View style={{ gap: 16 }}>
              {FEATURES.map((feature, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: cores.fundo.terciario,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={feature.icone}
                      size={20}
                      color={ehEscuro ? '#fff' : cores.zinc[900]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: cores.texto.primario,
                        marginBottom: 2,
                      }}
                    >
                      {feature.titulo}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: cores.texto.secundario,
                      }}
                    >
                      {feature.descricao}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Botões */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(500)}
          style={{ gap: 12 }}
        >
          {/* Botão Criar Conta */}
          <Pressable
            onPress={irParaRegistro}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: cores.botao.fundo,
              paddingVertical: 16,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: cores.botao.texto,
              }}
            >
              Criar Conta Grátis
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={cores.botao.texto}
            />
          </Pressable>

          {/* Botão Login */}
          <Pressable
            onPress={irParaLogin}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: cores.borda.media,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: cores.texto.primario,
              }}
            >
              Já tenho conta
            </Text>
          </Pressable>
        </Animated.View>

        {/* Trial info */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(500)}
          style={{ marginTop: 24, alignItems: 'center' }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: ehEscuro
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(16, 185, 129, 0.08)',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
            }}
          >
            <Ionicons name="gift-outline" size={18} color={cores.sucesso} />
            <Text
              style={{
                fontSize: 14,
                color: cores.sucesso,
                fontWeight: '500',
              }}
            >
              14 dias grátis para testar
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
