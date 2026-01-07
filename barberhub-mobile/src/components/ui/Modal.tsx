/**
 * Componente Modal reutilizável
 * Design idêntico ao PortalModal.tsx do web
 * - Backdrop com blur (bg-black/60)
 * - Container central com rounded-2xl
 * - Border sutil e shadow-2xl
 * - Header com título e botão fechar
 */

import React from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../../contexts/TemaContext';
import { obterCores, TemaType } from '../../constants/cores';

const { height: ALTURA_TELA } = Dimensions.get('window');

interface ModalProps {
  visivel: boolean;
  onFechar: () => void;
  titulo?: string;
  subtitulo?: string;
  children: React.ReactNode;
  tema?: TemaType;
  tamanho?: 'pequeno' | 'medio' | 'grande' | 'tela-cheia';
  mostrarFechar?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
}

export function Modal({
  visivel,
  onFechar,
  titulo,
  subtitulo,
  children,
  tema,
  tamanho = 'medio',
  mostrarFechar = true,
  animationType = 'fade',
}: ModalProps) {
  const insets = useSafeAreaInsets();
  const { tema: temaContexto, cores: coresContexto, ehEscuro } = useTema();
  const temaFinal = tema || temaContexto;
  const cores = tema ? obterCores(tema) : coresContexto;

  const porcentagemAltura = {
    pequeno: 0.4,
    medio: 0.6,
    grande: 0.8,
    'tela-cheia': 1,
  }[tamanho] || 0.6;

  const alturaMaxima = ALTURA_TELA * porcentagemAltura;

  const ehTelaCheia = tamanho === 'tela-cheia';

  return (
    <RNModal
      visible={visivel}
      animationType={animationType}
      transparent={!ehTelaCheia}
      onRequestClose={onFechar}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Overlay - estilo web (bg-black/60) */}
        {!ehTelaCheia && (
          <Pressable
            onPress={onFechar}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          />
        )}

        {/* Conteúdo */}
        <View
          style={{
            flex: ehTelaCheia ? 1 : undefined,
            maxHeight: ehTelaCheia ? undefined : alturaMaxima as number,
            marginTop: ehTelaCheia ? 0 : 'auto',
            backgroundColor: ehTelaCheia ? cores.fundo.primario : cores.fundo.card,
            borderTopLeftRadius: ehTelaCheia ? 0 : 24,
            borderTopRightRadius: ehTelaCheia ? 0 : 24,
            borderWidth: ehTelaCheia ? 0 : 1,
            borderColor: ehTelaCheia ? 'transparent' : cores.borda.sutil,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.25,
            shadowRadius: 18,
            elevation: 12,
            paddingTop: ehTelaCheia ? insets.top : 8,
            paddingBottom: insets.bottom || 20,
          }}
        >
          {/* Handle (apenas para modals não tela-cheia) */}
          {!ehTelaCheia && (
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: cores.borda.media,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />
          )}

          {/* Header */}
          {(titulo || mostrarFechar) && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: cores.borda.sutil,
              }}
            >
              <View style={{ flex: 1 }}>
                {titulo && (
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: cores.texto.primario,
                    }}
                  >
                    {titulo}
                  </Text>
                )}
                {subtitulo && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: cores.texto.secundario,
                      marginTop: 4,
                    }}
                  >
                    {subtitulo}
                  </Text>
                )}
              </View>

              {mostrarFechar && (
                <Pressable
                  onPress={onFechar}
                  hitSlop={12}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: ehEscuro ? cores.fundo.terciario : cores.fundo.secundario,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={20} color={cores.texto.terciario} />
                </Pressable>
              )}
            </View>
          )}

          {/* Body */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

/**
 * Modal de Confirmação
 */
interface ModalConfirmacaoProps {
  visivel: boolean;
  onFechar: () => void;
  onConfirmar: () => void;
  titulo: string;
  mensagem: string;
  textoCancelar?: string;
  textoConfirmar?: string;
  tipo?: 'perigo' | 'aviso' | 'info';
  carregando?: boolean;
  tema?: TemaType;
}

export function ModalConfirmacao({
  visivel,
  onFechar,
  onConfirmar,
  titulo,
  mensagem,
  textoCancelar = 'Cancelar',
  textoConfirmar = 'Confirmar',
  tipo = 'info',
  carregando = false,
  tema,
}: ModalConfirmacaoProps) {
  const { tema: temaContexto, cores: coresContexto, ehEscuro } = useTema();
  const temaFinal = tema || temaContexto;
  const cores = tema ? obterCores(tema) : coresContexto;

  const corBotaoConfirmar = {
    perigo: '#ef4444',
    aviso: '#f59e0b',
    info: cores.botao.fundo,
  }[tipo];

  const icone = {
    perigo: 'alert-circle',
    aviso: 'warning',
    info: 'information-circle',
  }[tipo] as keyof typeof Ionicons.glyphMap;

  const corIcone = {
    perigo: '#ef4444',
    aviso: '#f59e0b',
    info: cores.texto.secundario,
  }[tipo];

  return (
    <Modal
      visivel={visivel}
      onFechar={onFechar}
      tamanho="pequeno"
      mostrarFechar={false}
      tema={tema}
    >
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        {/* Ícone */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: tipo === 'perigo' 
              ? 'rgba(239,68,68,0.15)' 
              : tipo === 'aviso' 
                ? 'rgba(245,158,11,0.15)'
                : ehEscuro ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Ionicons name={icone} size={28} color={corIcone} />
        </View>

        {/* Título */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: cores.texto.primario,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {titulo}
        </Text>

        {/* Mensagem */}
        <Text
          style={{
            fontSize: 14,
            color: cores.texto.secundario,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 24,
          }}
        >
          {mensagem}
        </Text>

        {/* Botões */}
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <Pressable
            onPress={onFechar}
            disabled={carregando}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: cores.borda.sutil,
              alignItems: 'center',
              opacity: carregando ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: cores.texto.secundario,
              }}
            >
              {textoCancelar}
            </Text>
          </Pressable>

          <Pressable
            onPress={onConfirmar}
            disabled={carregando}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: corBotaoConfirmar,
              alignItems: 'center',
              opacity: carregando ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: tipo === 'info' ? cores.botao.texto : '#ffffff',
              }}
            >
              {carregando ? 'Aguarde...' : textoConfirmar}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default Modal;
